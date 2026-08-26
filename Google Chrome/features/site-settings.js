//  SITE-SETTINGS.JS - SoundForge v3.22.8 Chrome 152
//  Google Chrome 152.0.7977.65 | Windows 11 25H2
//  Настройки для каждого сайта
//  Автовыключение при смене сайта
//  CHROME 152 OPTIMIZED: обработка ошибок storage и URL
// ============================================

var chromeAPI = globalThis.chrome;
if (!chromeAPI?.runtime) throw new Error('Google Chrome extension API unavailable');

var _siteSettingsMutationQueue = Promise.resolve();
var _autoDisableInitialized = false;

var CONFIG = {
  maxHistoryPerSite: 50,
  autoDisableOnSiteChange: true,
  siteSettingsEnabled: true
};

// ============================================
//  ПОЛУЧЕНИЕ ДОМЕНА
// ============================================

export function getSiteDomain(url) {
  try {
    var parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

export function getSiteKey(url) {
  var domain = getSiteDomain(url);
  if (!domain) return null;
  return 'site_' + domain.replace(/[^a-zA-Z0-9]/g, '_');
}


function sanitizeSiteSettings(settings) {
  if (!settings || typeof settings !== 'object') return {};
  var safe = {};
  if (settings.gains && typeof settings.gains === 'object') {
    safe.gains = {};
    Object.keys(settings.gains).slice(0, 10).forEach(function(freq) {
      var value = Number(settings.gains[freq]);
      if (Number.isFinite(value)) safe.gains[freq] = Math.max(-12, Math.min(12, value));
    });
  }
  if (Number.isFinite(Number(settings.volume))) safe.volume = Math.max(0, Math.min(800, Number(settings.volume)));
  if (Number.isFinite(Number(settings.bass))) safe.bass = Math.max(-12, Math.min(12, Number(settings.bass)));
  if (typeof settings.preset === 'string' && settings.preset.length <= 100) safe.preset = settings.preset;
  return safe;
}

function enqueueSiteSettingsMutation(mutate) {
  _siteSettingsMutationQueue = _siteSettingsMutationQueue.catch(function() {}).then(function() {
    return getSiteSettingsData().then(function(data) {
      var next = data && typeof data === 'object' ? { ...data } : {};
      mutate(next);
      return new Promise(function(resolve) {
        chromeAPI.storage.local.set({ siteSettings: next }, function() {
          if (chromeAPI.runtime.lastError) console.warn('⚠️ Ошибка записи siteSettings:', chromeAPI.runtime.lastError);
          resolve(next);
        });
      });
    });
  });
  return _siteSettingsMutationQueue;
}
// ============================================
//  СОХРАНЕНИЕ НАСТРОЕК ДЛЯ САЙТА
// ============================================

export function saveSiteSettings(url, settings) {
  if (!CONFIG.siteSettingsEnabled) return Promise.resolve();
  var key = getSiteKey(url);
  if (!key) return Promise.resolve();
  var safeSettings = sanitizeSiteSettings(settings);
  return enqueueSiteSettingsMutation(function(data) {
    data[key] = { settings: safeSettings, updated: Date.now(), url: url };
    var keys = Object.keys(data);
    if (keys.length > CONFIG.maxHistoryPerSite) {
      keys.sort(function(a, b) { return (data[a].updated || 0) - (data[b].updated || 0); })
        .slice(0, keys.length - CONFIG.maxHistoryPerSite)
        .forEach(function(k) { delete data[k]; });
    }
  });
}

// ============================================
//  ЗАГРУЗКА НАСТРОЕК ДЛЯ САЙТА
// ============================================

export function loadSiteSettings(url) {
  if (!CONFIG.siteSettingsEnabled) return Promise.resolve(null);
  
  var key = getSiteKey(url);
  if (!key) return Promise.resolve(null);
  
  return getSiteSettingsData().then(function(data) {
    var siteData = data[key];
    
    if (siteData) {
      console.log('📥 Загружены настройки для сайта:', key);
      return siteData.settings;
    }
    
    return null;
  }).catch(function(e) {
    console.error('❌ Ошибка загрузки настроек сайта:', e);
    return null;
  });
}

// ============================================
//  ПОЛУЧЕНИЕ ВСЕХ НАСТРОЕК САЙТОВ
// ============================================

function getSiteSettingsData() {
  return new Promise(function(resolve) {
    chromeAPI.storage.local.get(['siteSettings'], function(result) {
      if (chromeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка получения siteSettings:', chromeAPI.runtime.lastError);
        resolve({});
        return;
      }
      resolve(result.siteSettings || {});
    });
  });
}

// ============================================
//  УДАЛЕНИЕ НАСТРОЕК ДЛЯ САЙТА
// ============================================

export function deleteSiteSettings(url) {
  var key = getSiteKey(url);
  if (!key) return Promise.resolve();
  return enqueueSiteSettingsMutation(function(data) { delete data[key]; });
}

// ============================================
//  ПОЛУЧЕНИЕ ВСЕХ САЙТОВ С НАСТРОЙКАМИ
// ============================================

export function getAllSitesWithSettings() {
  return getSiteSettingsData().then(function(data) {
    var sites = [];
    
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        var value = data[key];
        sites.push({
          key: key,
          domain: key.replace('site_', ''),
          settings: value.settings,
          updated: value.updated,
          url: value.url
        });
      }
    }
    
    return sites.sort(function(a, b) { return b.updated - a.updated; });
  }).catch(function(e) {
    console.error('❌ Ошибка получения списка сайтов:', e);
    return [];
  });
}

// ============================================
//  АВТОВЫКЛЮЧЕНИЕ ПРИ СМЕНЕ САЙТА
// ============================================

export function initAutoDisable() {
  if (!CONFIG.autoDisableOnSiteChange || _autoDisableInitialized) return;
  _autoDisableInitialized = true;
  
  var lastSite = null;
  
  chromeAPI.tabs.onActivated.addListener(function(activeInfo) {
    chromeAPI.tabs.get(activeInfo.tabId, function(tab) {
      if (chromeAPI.runtime.lastError) return;
      if (tab && tab.url) {
        checkSiteChange(tab.url);
      }
    });
  });
  
  chromeAPI.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url || changeInfo.status === 'complete') {
      if (tab.active && tab.url) {
        checkSiteChange(tab.url);
      }
    }
  });
  
  chromeAPI.webNavigation.onCompleted.addListener(function(details) {
    if (details.frameId === 0 && details.url) {
      checkSiteChange(details.url);
    }
  });
  
  function checkSiteChange(url) {
    var currentSite = getSiteDomain(url);
    if (!currentSite) return;
    
    if (lastSite && lastSite !== currentSite) {
      console.log('🔄 Смена сайта:', lastSite, '→', currentSite);
      
      loadSiteSettings(url).then(function(settings) {
        if (settings) {
          console.log('📥 Применяем настройки для', currentSite);
          applySiteSettings(settings);
        }
      }).catch(function() {});
      
      chromeAPI.storage.local.get(['isConnected', 'autoDisableOnSiteChange'], function(result) {
        if (chromeAPI.runtime.lastError) return;
        
        var autoDisable = result.autoDisableOnSiteChange !== false;
        var isConnected = result.isConnected === true;
        
        if (autoDisable && isConnected) {
          console.log('🔇 Автовыключение: смена сайта', lastSite, '→', currentSite);
          chromeAPI.runtime.sendMessage({ action: 'disconnect' });
          
          try {
            if (typeof chromeAPI !== 'undefined' && chromeAPI.notifications) {
              chromeAPI.notifications.create({
                type: 'basic',
                iconUrl: 'icons/SoundForge_128x128.png',
                title: '🔇 SoundForge',
                message: 'Эквалайзер выключен при смене сайта',
                priority: 1
              });
            }
          } catch (e) {}
        }
      });
    }
    
    lastSite = currentSite;
  }
  
  console.log('🔄 Автовыключение при смене сайта активировано');
}

// ============================================
//  ПРИМЕНЕНИЕ НАСТРОЕК САЙТА
// ============================================

function applySiteSettings(settings) {
  if (!settings) return;
  
  var gains = settings.gains;
  var volume = settings.volume;
  var bass = settings.bass;
  var preset = settings.preset;
  
  if (gains) {
    chromeAPI.runtime.sendMessage({ 
      action: 'updateEQ', 
      gains: gains,
      instant: true 
    });
  }
  
  if (volume !== undefined) {
    chromeAPI.runtime.sendMessage({ 
      action: 'setVolume', 
      value: volume 
    });
  }
  
  if (bass !== undefined) {
    chromeAPI.runtime.sendMessage({ 
      action: 'setBass', 
      value: bass 
    });
  }
  
  if (preset) {
    chromeAPI.runtime.sendMessage({ 
      action: 'applyPreset', 
      preset: preset 
    });
  }
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  getSiteDomain: getSiteDomain,
  getSiteKey: getSiteKey,
  saveSiteSettings: saveSiteSettings,
  loadSiteSettings: loadSiteSettings,
  deleteSiteSettings: deleteSiteSettings,
  getAllSitesWithSettings: getAllSitesWithSettings,
  initAutoDisable: initAutoDisable,
  CONFIG: CONFIG
};