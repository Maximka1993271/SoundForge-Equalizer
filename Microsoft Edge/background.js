// ============================================
//  BACKGROUND.JS - v3.22.8 (ВСЕ САЙТЫ)
//  ГОРЯЧИЕ КЛАВИШИ: Ctrl+Shift+U, Ctrl+Shift+E, Ctrl+Shift+Y, Ctrl+Shift+X
//  ИСПРАВЛЕНО: полная очистка ресурсов
//  ИСПРАВЛЕНО: обработка ошибок storage
// ============================================

console.log('🎛️ SoundForge Background v3.22.8 запущен (ВСЕ САЙТЫ)');

// ============================================
//  СОСТОЯНИЕ
// ============================================

const state = {
  isConnected: false,
  currentTabId: null,
  active: false,
  _isConnecting: false,
  _injectAttempts: {},
  _injectedTabs: {},
  _statusCheckInterval: null,
  _reconnectTimeout: null,
  _connectionAttempts: 0,
  _maxAttempts: 5,
  _lastUrl: null,
  _isProcessingChange: false,
  _debugMode: false,
  _exportData: null,
  _pendingMessages: {},
  _activeTabInterval: null,
  _spectrumInterval: null,
  _reconnectTimer: null,
  _cleanupTimer: null,
  _injectRetryCount: {},
  _autoConnectEnabled: true,
  _failedTabs: {},
  _failureTimestamps: {},
  _nightMode: false,
  _nightModeStartTime: null,
  _lastSite: null,
  _powerSaveMode: false,
  _statsInterval: null,
  _history: [],
  _iconSet: false,
  _windowId: null,
  _currentPreset: 'flat'
};

// ============================================
//  ВСЕ ПРЕСЕТЫ В ПОРЯДКЕ ДЛЯ ГОРЯЧИХ КЛАВИШ
// ============================================

const ALL_PRESETS_ORDER = [
  'flat', 'natural', 'universal', 'balanced',
  'club', 'dance', 'edm', 'synthwave', 'deephouse',
  'rock', 'metal', 'hardrock', 'grunge',
  'vocal', 'podcast', 'speech', 'rap',
  'acoustic', 'piano', 'orchestra', 'classical',
  'headphones', 'car', 'night', 'bassboost',
  'jazz', 'hiphop', 'soul', 'blues', 'reggae',
  'sunset', 'chill', 'lofi', 'pop', 'kpop',
  'world', 'ambient', 'festival', 'clarity',
  'wave', 'phonk', 'logitech', 'maxboost',
  'gaming', 'movie', 'fps',
  'hifi', 'studio', 'premium', 'master'
];

// ============================================
//  ЗАГРУЗКА СОХРАНЕННОГО СОСТОЯНИЯ
// ============================================

function loadSavedState() {
  chrome.storage.local.get([
    'soundforgeConnected',
    'soundforgeAutoConnect',
    'nightMode',
    'powerSaveMode',
    'lastSite',
    'settingsHistory',
    'selectedPreset'
  ], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка загрузки состояния:', chrome.runtime.lastError);
      return;
    }
    
    if (result.soundforgeConnected === true) {
      state.isConnected = true;
      state._autoConnectEnabled = true;
      console.log('✅ Восстановлено состояние: ПОДКЛЮЧЕН');
    } else if (result.soundforgeConnected === false) {
      state.isConnected = false;
      state._autoConnectEnabled = false;
      console.log('✅ Восстановлено состояние: ОТКЛЮЧЕН');
    }
    
    if (result.soundforgeAutoConnect === false) {
      state._autoConnectEnabled = false;
    }
    
    if (result.nightMode === true) {
      state._nightMode = true;
      state._nightModeStartTime = Date.now();
      console.log('🌙 Восстановлен ночной режим');
    }
    
    if (result.powerSaveMode === true) {
      state._powerSaveMode = true;
      console.log('⚡ Восстановлен режим энергосбережения');
    }
    
    if (result.lastSite) {
      state._lastSite = result.lastSite;
    }
    
    if (result.settingsHistory) {
      state._history = result.settingsHistory;
    }
    
    if (result.selectedPreset) {
      state._currentPreset = result.selectedPreset;
    }
    
    setTimeout(() => {
      updateIcon(state.isConnected);
    }, 500);
  });
}

function saveConnectedState(connected) {
  chrome.storage.local.set({ 
    soundforgeConnected: connected,
    soundforgeAutoConnect: state._autoConnectEnabled
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка сохранения состояния:', chrome.runtime.lastError);
    } else {
      console.log(`💾 Состояние сохранено: ${connected ? 'ПОДКЛЮЧЕН' : 'ОТКЛЮЧЕН'}`);
    }
  });
}

loadSavedState();

function safeSendMessage(message) {
  try {
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch {}
}

// ============================================
//  ОБНОВЛЕНИЕ ИКОНКИ
// ============================================

function updateIcon(isActive) {
  try {
    const iconPath = isActive 
      ? 'icons/SoundForge.png' 
      : 'icons/SoundForge.png';
    
    setTimeout(() => {
      try {
        chrome.action.setIcon({
          path: {
            16: iconPath,
            48: iconPath,
            128: iconPath
          }
        }, () => {
          if (chrome.runtime.lastError) {}
        });
      } catch (e) {}
    }, 100);
    
    if (isActive) {
      chrome.action.setBadgeText({ text: '🔊' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ text: '⛔' });
      chrome.action.setBadgeBackgroundColor({ color: '#888888' });
    }
  } catch (e) {}
}

// ============================================
//  ПРОВЕРКА URL
// ============================================

function isSystemUrl(url) {
  if (!url) return true;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.startsWith('chrome://') || 
         lowerUrl.startsWith('edge://') || 
         lowerUrl.startsWith('about:') ||
         lowerUrl.startsWith('devtools://') ||
         lowerUrl === 'about:blank' ||
         lowerUrl === 'about:empty';
}

function canInjectScript(url) {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.startsWith('chrome://') || 
      lowerUrl.startsWith('edge://') || 
      lowerUrl.startsWith('about:') ||
      lowerUrl.startsWith('devtools://')) {
    return false;
  }
  
  if (lowerUrl.startsWith('chrome-extension://')) {
    return false;
  }
  
  return true;
}

function canSendMessage(url) {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.startsWith('chrome://') || 
      lowerUrl.startsWith('edge://') || 
      lowerUrl.startsWith('about:') ||
      lowerUrl.startsWith('devtools://')) {
    return false;
  }
  
  return true;
}

// ============================================
//  ПОИСК ВКЛАДКИ С АУДИО
// ============================================

function findActiveTabWithAudio(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
      chrome.tabs.query({}, (allTabs) => {
        if (chrome.runtime.lastError) {
          callback(null);
          return;
        }
        findBestTab(allTabs, callback);
      });
      return;
    }
    
    const tab = tabs[0];
    if (tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://')) {
      callback(tab);
      return;
    }
    
    chrome.tabs.query({}, (allTabs) => {
      if (chrome.runtime.lastError) {
        callback(null);
        return;
      }
      findBestTab(allTabs, callback);
    });
  });
}

function findBestTab(tabs, callback) {
  for (const tab of tabs) {
    if (tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://')) {
      if (tab.audible === true) {
        callback(tab);
        return;
      }
    }
  }
  
  for (const tab of tabs) {
    if (tab.url && tab.url.includes('youtube.com') && !tab.url.startsWith('chrome-extension://')) {
      callback(tab);
      return;
    }
  }
  
  for (const tab of tabs) {
    if (tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://')) {
      callback(tab);
      return;
    }
  }
  
  callback(null);
}

// ============================================
//  ВНЕДРЕНИЕ INJECT.JS
// ============================================

function isInjectLoaded(tabId) {
  return new Promise((resolve) => {
    if (!tabId) { resolve(false); return; }
    if (state._injectedTabs[tabId]) { resolve(true); return; }
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        if (window.SoundForgeInject) return true;
        if (window._soundforge_loaded) return true;
        return false;
      }
    })
    .then((results) => {
      const loaded = results && results[0] && results[0].result === true;
      if (loaded) {
        state._injectedTabs[tabId] = true;
        delete state._failedTabs[tabId];
        delete state._failureTimestamps[tabId];
      }
      resolve(loaded);
    })
    .catch(() => resolve(false));
  });
}

function injectScriptDirectly(tabId, retryCount = 0) {
  if (!tabId) return;
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn(`⚠️ Ошибка получения таба ${tabId}:`, chrome.runtime.lastError);
      return;
    }
    
    if (!tab || !tab.url || !canInjectScript(tab.url)) {
      console.log(`⛔ Пропускаем внедрение: ${tab?.url || 'unknown'}`);
      return;
    }
    
    doInjectScriptDirectly(tabId, retryCount);
  });
}

function doInjectScriptDirectly(tabId, retryCount = 0) {
  const now = Date.now();
  if (state._failedTabs[tabId]) {
    const lastFailure = state._failureTimestamps[tabId] || 0;
    if (now - lastFailure < 30000) {
      console.log(`⏳ Таб ${tabId} в состоянии ошибки, ожидание 30с`);
      return;
    }
    delete state._failedTabs[tabId];
    delete state._failureTimestamps[tabId];
  }
  
  const key = 'tab_' + tabId;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  if (state._injectedTabs[tabId]) {
    console.log('✅ inject.js уже загружен (кеш)');
    return;
  }

  if (state._injectAttempts[key]) {
    const elapsed = Date.now() - state._injectAttempts[key].startTime;
    if (elapsed < 3000) {
      console.log(`⏳ Внедрение уже выполняется (прошло ${elapsed}мс)`);
      return;
    } else {
      console.log('🔄 Сброс зависшей попытки внедрения (таймаут)');
      delete state._injectAttempts[key];
    }
  }

  if (retryCount >= MAX_RETRIES) {
    console.error(`❌ Превышен лимит попыток внедрения (${MAX_RETRIES}) для таба ${tabId}`);
    delete state._injectAttempts[key];
    state._failedTabs[tabId] = true;
    state._failureTimestamps[tabId] = Date.now();
    safeSendMessage({ action: 'statusUpdate', status: 'error' });
    return;
  }

  state._injectAttempts[key] = {
    active: true,
    startTime: Date.now(),
    retryCount: retryCount
  };

  console.log(`📝 Внедряем inject.js (попытка ${retryCount + 1}/${MAX_RETRIES})`);

  isInjectLoaded(tabId).then((loaded) => {
    if (loaded) {
      console.log('✅ inject.js уже загружен (найден при проверке)');
      delete state._injectAttempts[key];
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['inject.js']
    })
    .then(() => {
      console.log(`📝 inject.js внедрен, ждем инициализацию...`);
      
      let checkCount = 0;
      const maxChecks = 10;
      const checkDelay = 300;

      function checkInjection() {
        checkCount++;
        
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            return !!(window.SoundForgeInject || window._soundforge_loaded);
          }
        })
        .then((results) => {
          const isReady = results && results[0] && results[0].result === true;
          
          if (isReady) {
            console.log(`✅ SoundForgeInject готов (проверка ${checkCount})`);
            state._injectedTabs[tabId] = true;
            state._connectionAttempts = 0;
            delete state._injectAttempts[key];
            delete state._failedTabs[tabId];
            delete state._failureTimestamps[tabId];
            
            if (state._autoConnectEnabled && state.isConnected) {
              setTimeout(() => {
                sendMessageToInject(tabId, 'SF_CONNECT');
              }, 500);
            }
            
            safeSendMessage({
              action: 'statusUpdate',
              status: state.isConnected ? 'connected' : 'disconnected'
            });
            
            updateIcon(state.isConnected);
            
          } else if (checkCount < maxChecks) {
            console.log(`⏳ Ожидаем инициализацию (проверка ${checkCount}/${maxChecks})...`);
            setTimeout(checkInjection, checkDelay);
          } else {
            console.warn(`⚠️ Не удалось дождаться инициализации после ${maxChecks} проверок`);
            delete state._injectAttempts[key];
            state._failedTabs[tabId] = true;
            state._failureTimestamps[tabId] = Date.now();
            safeSendMessage({ action: 'statusUpdate', status: 'error' });
            setTimeout(() => {
              doInjectScriptDirectly(tabId, retryCount + 1);
            }, RETRY_DELAY);
          }
        })
        .catch((err) => {
          console.warn(`⚠️ Ошибка проверки инъекции: ${err.message}`);
          delete state._injectAttempts[key];
          state._failedTabs[tabId] = true;
          state._failureTimestamps[tabId] = Date.now();
          safeSendMessage({ action: 'statusUpdate', status: 'error' });
          setTimeout(() => {
            doInjectScriptDirectly(tabId, retryCount + 1);
          }, RETRY_DELAY);
        });
      }

      setTimeout(checkInjection, 500);
    })
    .catch((err) => {
      console.warn(`⚠️ Ошибка внедрения: ${err.message}`);
      delete state._injectAttempts[key];
      state._failedTabs[tabId] = true;
      state._failureTimestamps[tabId] = Date.now();
      safeSendMessage({ action: 'statusUpdate', status: 'error' });
      setTimeout(() => {
        doInjectScriptDirectly(tabId, retryCount + 1);
      }, RETRY_DELAY);
    });
  });
}

// ============================================
//  ОТПРАВКА СООБЩЕНИЙ В INJECT
// ============================================

function sendMessageToInject(tabId, type, data) {
  if (!tabId) return;
  
  if (state._failedTabs[tabId]) {
    console.log(`⏳ Таб ${tabId} в состоянии ошибки, пропускаем отправку ${type}`);
    return;
  }
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn(`⚠️ Ошибка получения таба ${tabId}:`, chrome.runtime.lastError);
      return;
    }
    
    if (!tab || !tab.url) {
      console.log(`⛔ Нет URL для таба ${tabId}`);
      return;
    }
    
    if (tab.url.startsWith('chrome-extension://')) {
      console.log(`⏳ Страница расширения, пропускаем отправку ${type}`);
      return;
    }
    
    if (!canSendMessage(tab.url)) {
      console.log(`⛔ Пропускаем отправку ${type} на: ${tab.url}`);
      return;
    }
    
    doSendMessageToInject(tabId, type, data);
  });
}

function doSendMessageToInject(tabId, type, data) {
  isInjectLoaded(tabId).then((loaded) => {
    if (!loaded) {
      console.log(`⏳ inject.js не загружен, внедряем для отправки ${type}`);
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) return;
        if (tab && tab.url && canInjectScript(tab.url)) {
          injectScriptDirectly(tabId);
          setTimeout(() => {
            sendMessageToInject(tabId, type, data);
          }, 2000);
        }
      });
      return;
    }
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (msgType, msgData) => {
        if (window.SoundForgeInject) {
          window.SoundForgeInject.handleMessage(msgType, msgData);
          return true;
        }
        if (!window._soundforge_pending) window._soundforge_pending = [];
        window._soundforge_pending.push({ type: msgType, data: msgData });
        return false;
      },
      args: [type, data || {}]
    }).catch((err) => {
      console.warn(`⚠️ Ошибка отправки сообщения ${type}:`, err);
    });
  });
}

// ============================================
//  ПОЛУЧЕНИЕ СПЕКТРА
// ============================================

function getSpectrumFromInject(tabId) {
  if (!tabId) return;
  
  if (state._failedTabs[tabId]) {
    const time = Date.now() / 1000;
    const dummySpectrum = new Array(64).fill(0);
    for (let i = 0; i < 32; i++) {
      dummySpectrum[i] = (Math.sin(time * 2 + i * 0.4) * 0.3 + 0.5) * 0.3;
    }
    safeSendMessage({
      action: 'spectrumData',
      spectrum: dummySpectrum,
      hasAudio: true,
      isDummy: true
    });
    return;
  }
  
  if (!state._injectedTabs[tabId]) {
    const time = Date.now() / 1000;
    const dummySpectrum = new Array(64).fill(0);
    for (let i = 0; i < 32; i++) {
      dummySpectrum[i] = (Math.sin(time * 2 + i * 0.4) * 0.3 + 0.5) * 0.3;
    }
    safeSendMessage({
      action: 'spectrumData',
      spectrum: dummySpectrum,
      hasAudio: true,
      isDummy: true
    });
    return;
  }
  
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      if (window.SoundForgeInject) {
        const s = window.SoundForgeInject.getState();
        if (s && s.isActive && s.analyser) {
          const dataArray = new Float32Array(s.analyser.frequencyBinCount);
          s.analyser.getFloatFrequencyData(dataArray);
          const normalized = new Float32Array(64);
          const len = Math.min(dataArray.length, 64);
          for (let i = 0; i < len; i++) {
            const val = (dataArray[i] + 100) / 100;
            normalized[i] = Math.max(0, Math.min(1, val));
          }
          return Array.from(normalized);
        }
      }
      return null;
    }
  })
  .then((results) => {
    if (results && results[0] && results[0].result) {
      safeSendMessage({
        action: 'spectrumData',
        spectrum: results[0].result,
        hasAudio: true
      });
    } else {
      const time = Date.now() / 1000;
      const dummySpectrum = new Array(64).fill(0);
      for (let i = 0; i < 32; i++) {
        dummySpectrum[i] = (Math.sin(time * 2 + i * 0.4) * 0.3 + 0.5) * 0.3;
      }
      safeSendMessage({
        action: 'spectrumData',
        spectrum: dummySpectrum,
        hasAudio: true,
        isDummy: true
      });
    }
  })
  .catch(() => {
    const time = Date.now() / 1000;
    const dummySpectrum = new Array(64).fill(0);
    for (let i = 0; i < 32; i++) {
      dummySpectrum[i] = (Math.sin(time * 2 + i * 0.4) * 0.3 + 0.5) * 0.3;
    }
    safeSendMessage({
      action: 'spectrumData',
      spectrum: dummySpectrum,
      hasAudio: true,
      isDummy: true
    });
  });
}

// ============================================
//  ОТПРАВКА УВЕДОМЛЕНИЯ В ОКНО И POPUP
// ============================================

function notifyWindows(message) {
  try {
    chrome.runtime.sendMessage(message);
  } catch (e) {}
}

// ============================================
//  СЛЕДУЮЩИЙ ПРЕСЕТ
// ============================================

function nextPreset() {
  const currentPreset = state._currentPreset || 'flat';
  let currentIndex = ALL_PRESETS_ORDER.indexOf(currentPreset);
  if (currentIndex === -1) currentIndex = 0;
  const nextIndex = (currentIndex + 1) % ALL_PRESETS_ORDER.length;
  const nextPresetName = ALL_PRESETS_ORDER[nextIndex];
  
  console.log(`🔄 Следующий пресет: ${currentPreset} → ${nextPresetName}`);
  
  state._currentPreset = nextPresetName;
  chrome.storage.local.set({ selectedPreset: nextPresetName });
  
  findActiveTabWithAudio((tab) => {
    if (tab) {
      sendMessageToInject(tab.id, 'SF_APPLY_PRESET', { preset: nextPresetName, source: 'hotkey' });
    }
  });
  
  notifyWindows({ 
    action: 'presetChanged', 
    preset: nextPresetName,
    source: 'hotkey'
  });
  
  addHistoryEntry('preset_applied', { preset: nextPresetName }, { source: 'hotkey' });
  
  showNotification('🎵 SoundForge', `Пресет: ${nextPresetName}`, 'info');
  
  return nextPresetName;
}

// ============================================
//  ПРОВЕРКА СТАТУСА
// ============================================

function checkRealConnectionStatus(tabId) {
  if (!tabId) return;
  
  if (state._failedTabs[tabId]) {
    console.log(`⏳ Таб ${tabId} в состоянии ошибки, пропускаем проверку`);
    return;
  }
  
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      if (window.SoundForgeInject) {
        const s = window.SoundForgeInject.getState();
        return s && s.isActive;
      }
      return false;
    }
  })
  .then((results) => {
    if (results && results[0] && results[0].result === true) {
      console.log('✅ Реальное состояние: ПОДКЛЮЧЕН');
      state.isConnected = true;
      state.currentTabId = tabId;
      state.active = true;
      state._injectedTabs[tabId] = true;
      delete state._failedTabs[tabId];
      delete state._failureTimestamps[tabId];
      saveConnectedState(true);
      updateIcon(true);
      safeSendMessage({
        action: 'statusUpdate',
        status: 'connected'
      });
    } else {
      if (state._autoConnectEnabled && state.isConnected) {
        console.log('🔄 Пробуем подключиться к вкладке:', tabId);
        setTimeout(() => {
          injectScriptDirectly(tabId);
          setTimeout(() => {
            sendMessageToInject(tabId, 'SF_CONNECT');
          }, 1000);
        }, 500);
      }
    }
  })
  .catch(() => {
    if (state._autoConnectEnabled && state.isConnected) {
      console.log('🔄 Пробуем подключиться (ошибка):', tabId);
      setTimeout(() => {
        injectScriptDirectly(tabId);
        setTimeout(() => {
          sendMessageToInject(tabId, 'SF_CONNECT');
        }, 1000);
      }, 500);
    }
  });
}

// ============================================
//  ПОЛУЧЕНИЕ ДОМЕНА САЙТА
// ============================================

function getSiteDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

function saveSiteSettings(url, settings) {
  const domain = getSiteDomain(url);
  if (!domain) return;
  
  const key = 'site_' + domain.replace(/[^a-zA-Z0-9]/g, '_');
  
  chrome.storage.local.get(['siteSettings'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка получения siteSettings:', chrome.runtime.lastError);
      return;
    }
    const data = result.siteSettings || {};
    data[key] = {
      settings: settings,
      updated: Date.now(),
      url: url,
      domain: domain
    };
    chrome.storage.local.set({ siteSettings: data }, () => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка сохранения siteSettings:', chrome.runtime.lastError);
      } else {
        console.log(`💾 Настройки сохранены для сайта: ${domain}`);
      }
    });
  });
}

function loadSiteSettings(url) {
  const domain = getSiteDomain(url);
  if (!domain) return Promise.resolve(null);
  
  const key = 'site_' + domain.replace(/[^a-zA-Z0-9]/g, '_');
  
  return new Promise((resolve) => {
    chrome.storage.local.get(['siteSettings'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка получения siteSettings:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      const data = result.siteSettings || {};
      const siteData = data[key];
      if (siteData) {
        console.log(`📥 Загружены настройки для сайта: ${domain}`);
        resolve(siteData.settings);
      } else {
        resolve(null);
      }
    });
  });
}

// ============================================
//  СОБЫТИЯ БРАУЗЕРА
// ============================================

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0 && details.url) {
    console.log('🌐 Сайт загружен:', details.url);
    state._lastUrl = details.url;
    
    if (isSystemUrl(details.url)) {
      return;
    }
    
    const currentSite = getSiteDomain(details.url);
    if (currentSite && state._lastSite && state._lastSite !== currentSite) {
      console.log(`🔄 Смена сайта: ${state._lastSite} → ${currentSite}`);
      
      loadSiteSettings(details.url).then((settings) => {
        if (settings) {
          console.log(`📥 Применяем настройки для ${currentSite}`);
          chrome.runtime.sendMessage({
            action: 'applySiteSettings',
            settings: settings
          });
        }
      });
      
      chrome.storage.local.get(['autoDisableOnSiteChange'], (result) => {
        if (chrome.runtime.lastError) return;
        const autoDisable = result.autoDisableOnSiteChange !== false;
        if (autoDisable && state.isConnected) {
          console.log(`🔇 Автовыключение: смена сайта ${state._lastSite} → ${currentSite}`);
          state.isConnected = false;
          state._autoConnectEnabled = false;
          saveConnectedState(false);
          updateIcon(false);
          safeSendMessage({ action: 'statusUpdate', status: 'disconnected' });
          
          try {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/SoundForge.png',
              title: '🔇 SoundForge',
              message: 'Эквалайзер выключен при смене сайта',
              priority: 1
            });
          } catch (e) {}
        }
      });
    }
    
    state._lastSite = currentSite;
    chrome.storage.local.set({ lastSite: currentSite }, () => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка сохранения lastSite:', chrome.runtime.lastError);
      }
    });
    
    if (state._failedTabs[details.tabId]) {
      delete state._failedTabs[details.tabId];
      delete state._failureTimestamps[details.tabId];
    }
    
    if (state.isConnected && state._autoConnectEnabled) {
      setTimeout(() => {
        injectScriptDirectly(details.tabId);
        setTimeout(() => {
          sendMessageToInject(details.tabId, 'SF_CONNECT');
        }, 1000);
      }, 1000);
    }
    
    setTimeout(() => {
      checkRealConnectionStatus(details.tabId);
    }, 2000);
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0 && details.url) {
    console.log('🔄 SPA навигация:', details.url);
    state._lastUrl = details.url;
    
    if (isSystemUrl(details.url)) return;
    
    if (state._failedTabs[details.tabId]) {
      delete state._failedTabs[details.tabId];
      delete state._failureTimestamps[details.tabId];
    }
    
    if (state.isConnected && state._autoConnectEnabled) {
      setTimeout(() => {
        injectScriptDirectly(details.tabId);
        setTimeout(() => {
          sendMessageToInject(details.tabId, 'SF_RECONNECT');
        }, 1000);
      }, 1000);
    }
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    if (tab && tab.url) {
      console.log('🌐 Вкладка активирована:', tab.url);
      state._lastUrl = tab.url;
      
      if (isSystemUrl(tab.url)) return;
      
      if (state.isConnected && state._autoConnectEnabled) {
        setTimeout(() => {
          injectScriptDirectly(tab.id);
          setTimeout(() => {
            sendMessageToInject(tab.id, 'SF_CONNECT');
          }, 1000);
        }, 500);
      }
      
      setTimeout(() => {
        checkRealConnectionStatus(tab.id);
      }, 1000);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    console.log('🔄 URL изменен:', changeInfo.url);
    state._lastUrl = changeInfo.url;
    
    if (isSystemUrl(changeInfo.url)) return;
    
    if (state._failedTabs[tabId]) {
      delete state._failedTabs[tabId];
      delete state._failureTimestamps[tabId];
    }
    
    if (state.isConnected && state._autoConnectEnabled) {
      setTimeout(() => {
        injectScriptDirectly(tabId);
        setTimeout(() => {
          sendMessageToInject(tabId, 'SF_CONNECT');
        }, 1000);
      }, 1000);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === state.currentTabId) {
    console.log('🔴 Вкладка закрыта');
    state.currentTabId = null;
    delete state._injectedTabs[tabId];
    delete state._failedTabs[tabId];
    delete state._failureTimestamps[tabId];
  }
});

// ============================================
//  СОХРАНЕНИЕ ID ОКНА
// ============================================

chrome.windows.onCreated.addListener((window) => {
  if (window.type === 'popup' && window.url && window.url.includes('window.html')) {
    state._windowId = window.id;
    console.log('🪟 Окно открыто, ID:', window.id);
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === state._windowId) {
    state._windowId = null;
    console.log('🪟 Окно закрыто');
  }
});

// ============================================
//  ГОРЯЧИЕ КЛАВИШИ (4 команды)
// ============================================

chrome.commands.onCommand.addListener((command) => {
  console.log(`⌨️ Горячая клавиша: ${command}`);
  
  switch (command) {
    case 'toggle_eq':
      toggleEqualizer();
      break;
    case 'next_preset':
      nextPreset();
      break;
    case 'reset_settings':
      resetAllSettings();
      break;
    default:
      console.log(`⚠️ Неизвестная команда: ${command}`);
  }
});

function toggleEqualizer() {
  findActiveTabWithAudio((tab) => {
    if (!tab) {
      console.log('⛔ Нет доступной вкладки с аудио');
      return;
    }
    const tabId = tab.id;
    
    if (state.isConnected) {
      state.isConnected = false;
      state._autoConnectEnabled = false;
      saveConnectedState(false);
      updateIcon(false);
      sendMessageToInject(tabId, 'SF_DISCONNECT');
      safeSendMessage({ action: 'statusUpdate', status: 'disconnected' });
      notifyWindows({ action: 'statusUpdate', status: 'disconnected' });
      showNotification('🔊 SoundForge', 'Эквалайзер выключен', 'info');
    } else {
      state.isConnected = true;
      state._autoConnectEnabled = true;
      state.currentTabId = tabId;
      state.active = true;
      saveConnectedState(true);
      updateIcon(true);
      injectScriptDirectly(tabId);
      setTimeout(() => {
        sendMessageToInject(tabId, 'SF_CONNECT');
      }, 1000);
      safeSendMessage({ action: 'statusUpdate', status: 'connected' });
      notifyWindows({ action: 'statusUpdate', status: 'connected' });
      showNotification('🔊 SoundForge', 'Эквалайзер включен', 'success');
    }
  });
}

function resetAllSettings() {
  chrome.runtime.sendMessage({ action: 'reset', fullReset: true });
  chrome.storage.local.clear(() => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка очистки storage:', chrome.runtime.lastError);
    }
    state.isConnected = false;
    state._autoConnectEnabled = false;
    state._nightMode = false;
    state._powerSaveMode = false;
    state._currentPreset = 'flat';
    saveConnectedState(false);
    updateIcon(false);
    notifyWindows({ action: 'settingsReset' });
    showNotification('🔄 SoundForge', 'Все настройки сброшены', 'warning');
  });
}

// ============================================
//  ИСТОРИЯ
// ============================================

function addHistoryEntry(action, data, metadata = {}) {
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    action: action,
    data: data,
    metadata: metadata,
    url: metadata.url || '',
    site: metadata.site || state._lastSite || ''
  };
  
  chrome.storage.local.get(['settingsHistory'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка получения settingsHistory:', chrome.runtime.lastError);
      return;
    }
    let history = result.settingsHistory || [];
    history.push(entry);
    if (history.length > 1000) {
      history = history.slice(-1000);
    }
    state._history = history;
    chrome.storage.local.set({ settingsHistory: history }, () => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка сохранения settingsHistory:', chrome.runtime.lastError);
      }
    });
  });
}

function getHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settingsHistory'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка получения settingsHistory:', chrome.runtime.lastError);
        resolve([]);
        return;
      }
      resolve(result.settingsHistory || []);
    });
  });
}

function clearHistory() {
  chrome.storage.local.set({ settingsHistory: [] }, () => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка очистки истории:', chrome.runtime.lastError);
    } else {
      state._history = [];
      console.log('🗑️ История очищена');
    }
  });
}

// ============================================
//  НОЧНОЙ РЕЖИМ
// ============================================

function toggleNightMode() {
  state._nightMode = !state._nightMode;
  chrome.storage.local.set({ nightMode: state._nightMode }, () => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка сохранения nightMode:', chrome.runtime.lastError);
    }
  });
  
  if (state._nightMode) {
    state._nightModeStartTime = Date.now();
    console.log('🌙 Ночной режим включен');
    showNotification('🌙 SoundForge', 'Ночной режим включен', 'info');
  } else {
    state._nightModeStartTime = null;
    console.log('☀️ Ночной режим выключен');
    showNotification('☀️ SoundForge', 'Ночной режим выключен', 'info');
  }
  
  findActiveTabWithAudio((tab) => {
    if (tab) {
      sendMessageToInject(tab.id, 'SF_SET_NIGHT_MODE', { enabled: state._nightMode });
    }
  });
  
  addHistoryEntry('night_mode_toggle', { enabled: state._nightMode });
  
  return state._nightMode;
}

function getNightMode() {
  return state._nightMode;
}

// ============================================
//  ЭНЕРГОСБЕРЕЖЕНИЕ
// ============================================

function togglePowerSave() {
  state._powerSaveMode = !state._powerSaveMode;
  chrome.storage.local.set({ powerSaveMode: state._powerSaveMode }, () => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка сохранения powerSaveMode:', chrome.runtime.lastError);
    }
  });
  
  if (state._powerSaveMode) {
    console.log('⚡ Режим энергосбережения включен');
    showNotification('⚡ SoundForge', 'Режим энергосбережения включен', 'info');
  } else {
    console.log('⚡ Режим энергосбережения выключен');
    showNotification('⚡ SoundForge', 'Режим энергосбережения выключен', 'info');
  }
  
  findActiveTabWithAudio((tab) => {
    if (tab) {
      const interval = state._powerSaveMode ? 5000 : 50;
      sendMessageToInject(tab.id, 'SF_SET_POWER_SAVE', { 
        enabled: state._powerSaveMode,
        interval: interval 
      });
    }
  });
  
  addHistoryEntry('power_save_toggle', { enabled: state._powerSaveMode });
  
  return state._powerSaveMode;
}

function getPowerSave() {
  return state._powerSaveMode;
}

// ============================================
//  УВЕДОМЛЕНИЯ
// ============================================

function showNotification(title, message, type = 'info') {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/SoundForge.png',
      title: title,
      message: message,
      priority: 1
    }, (notificationId) => {
      if (chrome.runtime.lastError) {}
    });
  } catch (e) {
    console.log(`📢 ${title}: ${message}`);
  }
}

// ============================================
//  ПРОВЕРКА НОЧНОГО РЕЖИМА (АВТО)
// ============================================

function checkNightModeAuto() {
  const now = new Date();
  const hours = now.getHours();
  const isNight = hours >= 22 || hours < 7;
  
  try {
    chrome.storage.local.get(['nightModeAuto'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка получения nightModeAuto:', chrome.runtime.lastError);
        return;
      }
      
      const autoMode = result.nightModeAuto !== false;
      
      if (autoMode) {
        if (isNight && !state._nightMode) {
          console.log('🌙 Автоматическое включение ночного режима');
          toggleNightMode();
        } else if (!isNight && state._nightMode) {
          console.log('☀️ Автоматическое выключение ночного режима');
          toggleNightMode();
        }
      }
    });
  } catch (e) {
    console.warn('⚠️ Ошибка в checkNightModeAuto:', e);
  }
}

// ============================================
//  ОБРАБОТЧИК СООБЩЕНИЙ
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Получено сообщение:', request.action);

  // ============================================
  //  FULLSCREEN: RESIZE WINDOW (Edge/Chromium)
  // ============================================
  if (request.action === 'resize_window') {
    console.log('🪟 Resizing window:', request.width, 'x', request.height);
    chrome.windows.getCurrent({}, (win) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
        return;
      }
      chrome.windows.update(win.id, {
        width: request.width,
        height: request.height,
        left: request.left || 0,
        top: request.top || 0
      }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
        } else {
          sendResponse({ status: 'ok' });
        }
      });
    });
    return true;
  }
  
  if (request.action === 'open_window') {
    console.log('🪟 Открываем окно эквалайзера');
    chrome.windows.create({
      url: chrome.runtime.getURL('window.html'),
      type: 'popup',
      width: 500,
      height: 750,
      top: 100,
      left: 100
    }, (window) => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка открытия окна:', chrome.runtime.lastError);
      } else {
        console.log('🪟 Окно эквалайзера открыто');
        state._windowId = window.id;
      }
    });
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (request.action === 'toggleNightMode') {
    console.log('🌙 Переключение ночного режима');
    const enabled = toggleNightMode();
    sendResponse({ status: 'ok', enabled: enabled });
    return true;
  }
  
  if (request.action === 'getNightMode') {
    sendResponse({ enabled: state._nightMode });
    return true;
  }
  
  if (request.action === 'togglePowerSave') {
    console.log('⚡ Переключение энергосбережения');
    const enabled = togglePowerSave();
    sendResponse({ status: 'ok', enabled: enabled });
    return true;
  }
  
  if (request.action === 'getPowerSave') {
    sendResponse({ enabled: state._powerSaveMode });
    return true;
  }
  
  if (request.action === 'getHistory') {
    getHistory().then((history) => {
      sendResponse({ status: 'ok', history: history });
    });
    return true;
  }
  
  if (request.action === 'clearHistory') {
    clearHistory();
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (request.action === 'getStats') {
    getHistory().then((history) => {
      const stats = {
        total: history.length,
        actions: {}
      };
      history.forEach((h) => {
        stats.actions[h.action] = (stats.actions[h.action] || 0) + 1;
      });
      sendResponse({ status: 'ok', stats: stats });
    });
    return true;
  }
  
  if (request.action === 'statusUpdate') {
    console.log('🔄 Статус обновлен:', request.status);
    if (request.status === 'connected') {
      state.isConnected = true;
      state._autoConnectEnabled = true;
      state._isConnecting = false;
      state._connectionAttempts = 0;
      if (sender && sender.tab) {
        state.currentTabId = sender.tab.id;
        state.active = true;
        state._injectedTabs[sender.tab.id] = true;
        delete state._failedTabs[sender.tab.id];
        delete state._failureTimestamps[sender.tab.id];
      }
      saveConnectedState(true);
      updateIcon(true);
    } else if (request.status === 'disconnected') {
      state.isConnected = false;
      state._isConnecting = false;
      saveConnectedState(false);
      updateIcon(false);
    } else if (request.status === 'error') {
      if (sender && sender.tab) {
        state._failedTabs[sender.tab.id] = true;
        state._failureTimestamps[sender.tab.id] = Date.now();
      }
    }
    sendResponse({ status: 'received' });
    return true;
  }

  if (request.action === 'getSpectrum') {
    if (state.currentTabId && state.isConnected && !state._failedTabs[state.currentTabId]) {
      getSpectrumFromInject(state.currentTabId);
    } else {
      const time = Date.now() / 1000;
      const dummySpectrum = new Array(64).fill(0);
      for (let i = 0; i < 32; i++) {
        dummySpectrum[i] = (Math.sin(time * 2 + i * 0.4) * 0.3 + 0.5) * 0.3;
      }
      safeSendMessage({
        action: 'spectrumData',
        spectrum: dummySpectrum,
        hasAudio: true,
        isDummy: true
      });
    }
    sendResponse({ status: 'requested' });
    return true;
  }

  if (request.action === 'spectrumData') {
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'exportSettings') {
    chrome.storage.local.get(null, (data) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
        return;
      }
      const exportData = {
        version: '3.22.8',
        timestamp: Date.now(),
        settings: data
      };
      sendResponse({ status: 'ok', data: JSON.stringify(exportData) });
    });
    return true;
  }

  if (request.action === 'importSettings') {
    try {
      const importData = JSON.parse(request.data);
      if (importData.settings) {
        chrome.storage.local.set(importData.settings, () => {
          if (chrome.runtime.lastError) {
            sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
            return;
          }
          loadSavedState();
          sendResponse({ status: 'ok' });
        });
      } else {
        sendResponse({ status: 'error', message: 'Неверный формат данных' });
      }
    } catch(e) {
      sendResponse({ status: 'error', message: e.message });
    }
    return true;
  }

  if (request.action === 'getStatus') {
    sendResponse({ 
      status: state.isConnected ? 'connected' : 'disconnected',
      autoConnect: state._autoConnectEnabled,
      nightMode: state._nightMode,
      powerSave: state._powerSaveMode,
      currentPreset: state._currentPreset
    });
    return true;
  }

  if (request.action === 'applyPreset') {
    if (request.preset) {
      state._currentPreset = request.preset;
      chrome.storage.local.set({ selectedPreset: request.preset });
      
      findActiveTabWithAudio((tab) => {
        if (tab) {
          sendMessageToInject(tab.id, 'SF_APPLY_PRESET', { 
            preset: request.preset,
            source: request.source || 'background'
          });
        }
      });
      
      notifyWindows({ 
        action: 'presetChanged', 
        preset: request.preset,
        source: request.source || 'background'
      });
      
      addHistoryEntry('preset_applied', { preset: request.preset }, { source: request.source || 'background' });
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'applySiteSettings' && request.settings) {
    const settings = request.settings;
    findActiveTabWithAudio((tab) => {
      if (tab) {
        if (settings.gains) {
          sendMessageToInject(tab.id, 'SF_UPDATE_EQ', { gains: settings.gains, instant: true });
        }
        if (settings.volume !== undefined) {
          sendMessageToInject(tab.id, 'SF_SET_VOLUME', { value: settings.volume });
        }
        if (settings.bass !== undefined) {
          sendMessageToInject(tab.id, 'SF_SET_BASS', { value: settings.bass });
        }
        if (settings.preset) {
          sendMessageToInject(tab.id, 'SF_APPLY_PRESET', { preset: settings.preset });
        }
      }
    });
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'saveSiteSettings') {
    findActiveTabWithAudio((tab) => {
      if (tab && tab.url) {
        saveSiteSettings(tab.url, request.settings);
      }
    });
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'getSiteSettings') {
    findActiveTabWithAudio((tab) => {
      if (tab && tab.url) {
        loadSiteSettings(tab.url).then((settings) => {
          sendResponse({ settings: settings });
        });
      } else {
        sendResponse({ settings: null });
      }
    });
    return true;
  }

  const allowedActions = ['connect', 'disconnect', 'updateEQ', 'reset', 'setVolume', 'setBass', 'reconnect'];

  if (allowedActions.includes(request.action)) {
    const isFromExtension = sender && sender.tab && sender.tab.url && sender.tab.url.startsWith('chrome-extension://');
    
    if (isFromExtension) {
      console.log(`🔄 Перенаправляем ${request.action} из окна в активную вкладку с аудио`);
      
      findActiveTabWithAudio((tab) => {
        if (!tab) {
          console.log('⛔ Нет доступной вкладки с аудио');
          sendResponse({ status: 'no_tab' });
          return;
        }
        
        const tabId = tab.id;
        console.log(`✅ Найдена вкладка: ${tab.url}`);
        
        if (tab.url && isSystemUrl(tab.url)) {
          console.log(`⛔ Пропускаем действие на системной странице: ${tab.url}`);
          sendResponse({ status: 'system_page' });
          return;
        }
        
        if (tab.url && tab.url.startsWith('chrome-extension://')) {
          console.log(`⛔ Активная вкладка - страница расширения, пропускаем`);
          sendResponse({ status: 'extension_page' });
          return;
        }
        
        handleTabAction(request, tabId, sendResponse);
      });
      return true;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        sendResponse({ status: 'no_tab' });
        return;
      }

      const tabId = tabs[0].id;
      
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          sendResponse({ status: 'error' });
          return;
        }
        
        if (tab && tab.url && isSystemUrl(tab.url)) {
          console.log(`⛔ Пропускаем действие на системной странице: ${tab.url}`);
          sendResponse({ status: 'system_page' });
          return;
        }
        
        if (tab && tab.url && tab.url.startsWith('chrome-extension://')) {
          console.log(`⛔ Активная вкладка - страница расширения, пропускаем`);
          sendResponse({ status: 'extension_page' });
          return;
        }
        
        handleTabAction(request, tabId, sendResponse);
      });
    });
    return true;
  }

  sendResponse({ status: 'unknown' });
});

function handleTabAction(request, tabId, sendResponse) {
  if (request.action === 'reconnect') {
    console.log('🔄 Переподключение');
    state._isConnecting = false;
    state._injectedTabs[tabId] = false;
    state._connectionAttempts = 0;
    state._isProcessingChange = false;
    delete state._failedTabs[tabId];
    delete state._failureTimestamps[tabId];
    injectScriptDirectly(tabId);
    setTimeout(() => {
      sendMessageToInject(tabId, 'SF_RECONNECT');
    }, 1000);
    setTimeout(() => sendMessageToInject(tabId, 'SF_GET_STATUS'), 2000);
    sendResponse({ status: 'reconnecting' });
    return;
  }

  if (request.action === 'disconnect') {
    console.log('⏹ ОТКЛЮЧЕНИЕ');
    state.isConnected = false;
    state._autoConnectEnabled = false;
    state.currentTabId = null;
    state.active = false;
    state._isConnecting = false;
    state._connectionAttempts = 0;
    state._isProcessingChange = false;
    delete state._injectedTabs[tabId];
    delete state._failedTabs[tabId];
    delete state._failureTimestamps[tabId];
    sendMessageToInject(tabId, 'SF_DISCONNECT');
    saveConnectedState(false);
    updateIcon(false);
    safeSendMessage({
      action: 'statusUpdate',
      status: 'disconnected'
    });
    addHistoryEntry('eq_disabled', {}, { source: 'manual' });
    sendResponse({ status: 'disconnected' });
    return;
  }

  if (request.action === 'connect') {
    if (state._isConnecting) {
      sendResponse({ status: 'connecting' });
      return;
    }
    if (state.isConnected) {
      sendResponse({ status: 'connected' });
      return;
    }

    console.log('▶ ПОДКЛЮЧЕНИЕ');
    state.isConnected = true;
    state._autoConnectEnabled = true;
    state.currentTabId = tabId;
    state.active = true;
    state._isConnecting = true;
    state._connectionAttempts = 0;
    state._isProcessingChange = false;
    delete state._failedTabs[tabId];
    delete state._failureTimestamps[tabId];

    injectScriptDirectly(tabId);
    
    setTimeout(() => {
      sendMessageToInject(tabId, 'SF_CONNECT');
    }, 1500);
    
    setTimeout(() => {
      sendMessageToInject(tabId, 'SF_GET_STATUS');
      state._isConnecting = false;
    }, 3000);
    
    saveConnectedState(true);
    updateIcon(true);
    addHistoryEntry('eq_enabled', {}, { source: 'manual' });
    sendResponse({ status: 'connected' });
    return;
  }

  const actionMap = {
    'updateEQ': 'SF_UPDATE_EQ',
    'reset': 'SF_RESET',
    'setVolume': 'SF_SET_VOLUME',
    'setBass': 'SF_SET_BASS'
  };

  const type = actionMap[request.action];
  if (type) {
    sendMessageToInject(tabId, type, request);
    sendResponse({ status: 'ok' });
    return;
  }

  sendResponse({ status: 'unknown' });
}

// ============================================
//  ПЕРИОДИЧЕСКИЕ ПРОВЕРКИ
// ============================================

function startPeriodicChecks() {
  if (state._statusCheckInterval) {
    clearInterval(state._statusCheckInterval);
    state._statusCheckInterval = null;
  }
  
  if (state._activeTabInterval) {
    clearInterval(state._activeTabInterval);
    state._activeTabInterval = null;
  }
  
  const interval = state._powerSaveMode ? 5000 : 3000;
  
  state._statusCheckInterval = setInterval(() => {
    if (state.currentTabId && state.isConnected && !state._isConnecting) {
      if (state._injectedTabs[state.currentTabId] && !state._failedTabs[state.currentTabId]) {
        sendMessageToInject(state.currentTabId, 'SF_GET_STATUS');
      }
    }
  }, 10000);
  
  state._activeTabInterval = setInterval(() => {
    findActiveTabWithAudio((tab) => {
      if (!tab || !tab.id) return;
      const tabId = tab.id;
      
      if (state._failedTabs[tabId]) {
        return;
      }
      
      if (state.isConnected && state._autoConnectEnabled) {
        injectScriptDirectly(tabId);
        if (!state._injectedTabs[tabId]) {
          setTimeout(() => {
            sendMessageToInject(tabId, 'SF_CONNECT');
          }, 1000);
        }
      }
      
      if (state.isConnected) {
        getSpectrumFromInject(tabId);
      }
    });
  }, interval);
}

function cleanupAll() {
  console.log('🧹 Очистка всех ресурсов background');
  
  if (state._statusCheckInterval) {
    clearInterval(state._statusCheckInterval);
    state._statusCheckInterval = null;
  }
  
  if (state._activeTabInterval) {
    clearInterval(state._activeTabInterval);
    state._activeTabInterval = null;
  }
  
  if (state._reconnectTimer) {
    clearTimeout(state._reconnectTimer);
    state._reconnectTimer = null;
  }
  
  if (state._cleanupTimer) {
    clearTimeout(state._cleanupTimer);
    state._cleanupTimer = null;
  }
  
  Object.keys(state._injectAttempts).forEach(key => delete state._injectAttempts[key]);
  Object.keys(state._injectedTabs).forEach(key => delete state._injectedTabs[key]);
  Object.keys(state._failedTabs).forEach(key => delete state._failedTabs[key]);
  Object.keys(state._failureTimestamps).forEach(key => delete state._failureTimestamps[key]);
}

startPeriodicChecks();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAll);
}

setInterval(checkNightModeAuto, 600000);
setTimeout(checkNightModeAuto, 5000);

console.log('✅ SoundForge Background v3.22.8 готов (ВСЕ САЙТЫ, СОХРАНЕНИЕ СОСТОЯНИЯ)!');
console.log('⌨️ Горячие клавиши:');
console.log('   Ctrl+Shift+U - активация расширения');
console.log('   Ctrl+Shift+E - включить/выключить эквалайзер');
console.log('   Ctrl+Shift+Y - следующий пресет');
console.log('   Ctrl+Shift+X - сброс всех настроек');
console.log('🌙 Ночной режим: автоматически с 22:00 до 07:00');
console.log('⚡ Режим энергосбережения: снижает частоту обновлений');
console.log('💾 Настройки сохраняются для каждого сайта');
console.log('📜 Ведется история изменений');