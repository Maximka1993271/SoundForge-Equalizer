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

// ============================================
//  СОХРАНЕНИЕ НАСТРОЕК ДЛЯ САЙТА
// ============================================

export async function saveSiteSettings(url, settings) {
  if (!CONFIG.siteSettingsEnabled) return;
  
  const key = getSiteKey(url);
  if (!key) return;
  
  try {
    const data = await getSiteSettingsData();
    data[key] = {
      settings: settings,
      updated: Date.now(),
      url: url
    };
    
    // Ограничиваем историю
    const keys = Object.keys(data);
    if (keys.length > CONFIG.maxHistoryPerSite) {
      // Удаляем самые старые
      const sorted = keys.sort((a, b) => data[a].updated - data[b].updated);
      const toRemove = sorted.slice(0, keys.length - CONFIG.maxHistoryPerSite);
      toRemove.forEach((k) => delete data[k]);
    }
    
    chrome.storage.local.set({ siteSettings: data });
    console.log(`💾 Настройки сохранены для сайта: ${key}`);
    
  } catch (e) {
    console.error('❌ Ошибка сохранения настроек сайта:', e);
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
      return siteData.settings;
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
    chrome.storage.local.set({ siteSettings: data });
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
  
  // Отслеживаем активацию вкладок
  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (chrome.runtime.lastError) return;
      if (tab.url) {
        checkSiteChange(tab.url);
      }
    });
  });
  
  // Отслеживаем обновление вкладок
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      if (tab.active && tab.url) {
        checkSiteChange(tab.url);
      }
    }
  });
  
  // Отслеживаем навигацию
  chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0 && details.url) {
      checkSiteChange(details.url);
    }
  });
  
  function checkSiteChange(url) {
    const currentSite = getSiteDomain(url);
    
    if (currentSite && lastSite && lastSite !== currentSite) {
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
  }
  
  console.log('🔄 Автовыключение при смене сайта активировано');
}

// ============================================
//  ПРИМЕНЕНИЕ НАСТРОЕК САЙТА
// ============================================

function applySiteSettings(settings) {
  if (!settings) return;
  
  const { gains, volume, bass, preset } = settings;
  
  if (gains) {
    chrome.runtime.sendMessage({ 
      action: 'updateEQ', 
      gains: gains,
      instant: true 
    });
  }
  
  if (volume !== undefined) {
    chrome.runtime.sendMessage({ 
      action: 'setVolume', 
      value: volume 
    });
  }
  
  if (bass !== undefined) {
    chrome.runtime.sendMessage({ 
      action: 'setBass', 
      value: bass 
    });
  }
  
  if (preset) {
    chrome.runtime.sendMessage({ 
      action: 'applyPreset', 
      preset: preset 
    });
  }
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  getSiteDomain,
  getSiteKey,
  saveSiteSettings,
  loadSiteSettings,
  deleteSiteSettings,
  getAllSitesWithSettings,
  initAutoDisable,
  CONFIG
};