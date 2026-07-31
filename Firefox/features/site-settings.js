// ============================================
//  SITE-SETTINGS.JS - Настройки для каждого сайта (v3.22.8)
//  Автовыключение при смене сайта
// ============================================

// ============================================
//  КОНФИГУРАЦИЯ
// ============================================

const CONFIG = {
  maxHistoryPerSite: 50,
  autoDisableOnSiteChange: true,
  siteSettingsEnabled: true
};

// ============================================
//  ПОЛУЧЕНИЕ ДОМЕНА
// ============================================

export function getSiteDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

export function getSiteKey(url) {
  const domain = getSiteDomain(url);
  if (!domain) return null;
  return 'site_' + domain.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Санитизация настроек сайта
 */
export function sanitizeSiteSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return null;
  }
  
  const result = {};
  
  // Санитизация Gain-ов
  if (settings.gains && typeof settings.gains === 'object') {
    const allowedFreqs = ['31', '62', '125', '250', '500', '1000', '2000', '4000', '8000', '16000'];
    result.gains = {};
    for (const freq of allowedFreqs) {
      if (settings.gains[freq] !== undefined) {
        const value = Number(settings.gains[freq]);
        result.gains[freq] = isNaN(value) ? 0 : Math.max(-12, Math.min(12, value));
      }
    }
  }
  
  // Громкость
  if (settings.volume !== undefined) {
    const volume = Number(settings.volume);
    result.volume = isNaN(volume) ? 1.0 : Math.max(0, Math.min(8.0, volume));
  }
  
  // Бас
  if (settings.bass !== undefined) {
    const bass = Number(settings.bass);
    result.bass = isNaN(bass) ? 0 : Math.max(-12, Math.min(12, bass));
  }
  
  // Пресет
  if (settings.preset && typeof settings.preset === 'string') {
    result.preset = settings.preset;
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

// ============================================
//  СОХРАНЕНИЕ НАСТРОЕК ДЛЯ САЙТА
// ============================================

export async function saveSiteSettings(url, settings) {
  if (!CONFIG.siteSettingsEnabled) return false;
  
  const key = getSiteKey(url);
  if (!key) return false;
  
  const sanitized = sanitizeSiteSettings(settings);
  if (!sanitized) return false;
  
  try {
    const data = await getSiteSettingsData();
    data[key] = {
      settings: sanitized,
      updated: Date.now(),
      url: url,
      domain: getSiteDomain(url)
    };
    
    // Ограничиваем количество сохраненных сайтов
    const keys = Object.keys(data);
    if (keys.length > CONFIG.maxHistoryPerSite) {
      const sorted = keys.sort((a, b) => data[a].updated - data[b].updated);
      const toRemove = sorted.slice(0, keys.length - CONFIG.maxHistoryPerSite);
      toRemove.forEach((k) => delete data[k]);
    }
    
    await chrome.storage.local.set({ siteSettings: data });
    console.log(`💾 Настройки сохранены для сайта: ${key}`);
    return true;
  } catch (e) {
    console.error('❌ Ошибка сохранения настроек сайта:', e);
    return false;
  }
}

// ============================================
//  ЗАГРУЗКА НАСТРОЕК ДЛЯ САЙТА
// ============================================

export async function loadSiteSettings(url) {
  if (!CONFIG.siteSettingsEnabled) return null;
  
  const key = getSiteKey(url);
  if (!key) return null;
  
  try {
    const data = await getSiteSettingsData();
    const siteData = data[key];
    
    if (siteData) {
      console.log(`📥 Загружены настройки для сайта: ${key}`);
      return siteData.settings || null;
    }
    
    return null;
  } catch (e) {
    console.error('❌ Ошибка загрузки настроек сайта:', e);
    return null;
  }
}

// ============================================
//  ПОЛУЧЕНИЕ ВСЕХ НАСТРОЕК САЙТОВ
// ============================================

function getSiteSettingsData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['siteSettings'], (result) => {
      resolve(result.siteSettings || {});
    });
  });
}

// ============================================
//  УДАЛЕНИЕ НАСТРОЕК ДЛЯ САЙТА
// ============================================

export async function deleteSiteSettings(url) {
  const key = getSiteKey(url);
  if (!key) return;
  
  try {
    const data = await getSiteSettingsData();
    delete data[key];
    await chrome.storage.local.set({ siteSettings: data });
    console.log(`🗑️ Настройки удалены для сайта: ${key}`);
  } catch (e) {
    console.error('❌ Ошибка удаления настроек сайта:', e);
  }
}

// ============================================
//  ПОЛУЧЕНИЕ ВСЕХ САЙТОВ С НАСТРОЙКАМИ
// ============================================

export async function getAllSitesWithSettings() {
  try {
    const data = await getSiteSettingsData();
    const sites = [];
    
    for (const [key, value] of Object.entries(data)) {
      sites.push({
        key: key,
        domain: key.replace('site_', ''),
        settings: value.settings,
        updated: value.updated,
        url: value.url
      });
    }
    
    return sites.sort((a, b) => b.updated - a.updated);
  } catch (e) {
    console.error('❌ Ошибка получения списка сайтов:', e);
    return [];
  }
}

// ============================================
//  АВТОВЫКЛЮЧЕНИЕ ПРИ СМЕНЕ САЙТА
// ============================================

export function initAutoDisable() {
  if (!CONFIG.autoDisableOnSiteChange) return;
  
  let lastSite = null;
  let lastTabId = null;
  
  // Отслеживаем активацию вкладок
  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (chrome.runtime.lastError) return;
      if (tab.url) {
        checkSiteChange(tab.url, activeInfo.tabId);
      }
    });
  });
  
  // Отслеживаем обновление вкладок
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ((changeInfo.url || changeInfo.status === 'complete') && tab.active && tab.url) {
      checkSiteChange(tab.url, tabId);
    }
  });
  
  // Отслеживаем навигацию
  chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0 && details.url) {
      checkSiteChange(details.url, details.tabId);
    }
  });
  
  function checkSiteChange(url, tabId) {
    const currentSite = getSiteDomain(url);
    if (!currentSite) return;
    
    if (lastSite && lastSite !== currentSite && lastTabId !== tabId) {
      console.log(`🔄 Смена сайта: ${lastSite} → ${currentSite}`);
      
      // Загружаем настройки для нового сайта
      loadSiteSettings(url).then((settings) => {
        if (settings) {
          console.log(`📥 Применяем настройки для ${currentSite}`);
          applySiteSettings(settings);
        }
      });
      
      // Проверяем, нужно ли отключить
      chrome.storage.local.get(['isConnected', 'autoDisableOnSiteChange'], (result) => {
        const autoDisable = result.autoDisableOnSiteChange !== false;
        const isConnected = result.isConnected === true;
        
        if (autoDisable && isConnected) {
          console.log(`🔇 Автовыключение: смена сайта ${lastSite} → ${currentSite}`);
          chrome.runtime.sendMessage({ action: 'disconnect' });
          
          // Показываем уведомление
          try {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/SoundForge.png',
              title: '🔇 SoundForge',
              message: `Эквалайзер выключен при смене сайта`,
              priority: 1
            });
          } catch (e) {}
        }
      });
    }
    
    lastSite = currentSite;
    lastTabId = tabId;
  }
  
  console.log('🔄 Автовыключение при смене сайта активировано');
}

// ============================================
//  ПРИМЕНЕНИЕ НАСТРОЕК САЙТА
// ============================================

function applySiteSettings(settings) {
  if (!settings) return;
  
  const { gains, volume, bass, preset } = settings;
  
  if (gains && typeof gains === 'object') {
    chrome.runtime.sendMessage({ 
      action: 'updateEQ', 
      gains: gains,
      instant: true 
    });
  }
  
  if (volume !== undefined) {
    chrome.runtime.sendMessage({ 
      action: 'setVolume', 
      value: volume,
      instant: true 
    });
  }
  
  if (bass !== undefined) {
    chrome.runtime.sendMessage({ 
      action: 'setBass', 
      value: bass,
      instant: true 
    });
  }
  
  if (preset) {
    chrome.runtime.sendMessage({ 
      action: 'applyPreset', 
      preset: preset,
      source: 'site_settings'
    });
  }
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  getSiteDomain,
  getSiteKey,
  sanitizeSiteSettings,
  saveSiteSettings,
  loadSiteSettings,
  deleteSiteSettings,
  getAllSitesWithSettings,
  initAutoDisable,
  CONFIG
};