// ============================================
//  BACKGROUND.JS - v3.22.8 (ВСЕ САЙТЫ)
//  ГОРЯЧИЕ КЛАВИШИ: Ctrl+Shift+U, Ctrl+Shift+E, Ctrl+Shift+Y, Ctrl+Shift+X
//  ИСПРАВЛЕНО: полная очистка ресурсов
//  ИСПРАВЛЕНО: обработка ошибок storage
//  ИСПРАВЛЕНО: отправка статуса в окно при подключении
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
  _currentPreset: 'flat',
  _tabSessions: {},
  _documentTokens: {},
  _lastSiteByTab: {},
  _storageWriteQueues: {},
  _tabMuteStates: {},
  _tabMuteOps: {},
  _currentEffect: 'spectrum'
};

function getTabSession(tabId) {
  if (!tabId) return null;
  if (!state._tabSessions[tabId]) {
    state._tabSessions[tabId] = {
      connected: false,
      connecting: false,
      injected: false,
      documentToken: 0,
      lastUrl: null,
      lastStatus: 'unknown',
      lastSeen: Date.now(),
      shouldReconnect: false
    };
  }
  return state._tabSessions[tabId];
}

function invalidateTabRuntime(tabId, reason = 'navigation') {
  const session = getTabSession(tabId);
  if (!session) return;
  session.connected = false;
  session.injected = false;
  session.lastStatus = reason;
  session.lastSeen = Date.now();
  session.documentToken += 1;
  state._documentTokens[tabId] = session.documentToken;
  delete state._injectedTabs[tabId];
  delete state._failedTabs[tabId];
  delete state._failureTimestamps[tabId];
}

function markTabInjected(tabId, url = null) {
  const session = getTabSession(tabId);
  if (!session) return;
  session.injected = true;
  session.lastUrl = url || session.lastUrl;
  session.lastSeen = Date.now();
  state._injectedTabs[tabId] = { token: session.documentToken, url: session.lastUrl };
}

function enqueueStorageMutation(storageKey, mutate) {
  const previous = state._storageWriteQueues[storageKey] || Promise.resolve();
  const next = previous.then(() => new Promise((resolve, reject) => {
    chrome.storage.local.get([storageKey], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      let nextValue;
      try {
        nextValue = mutate(result[storageKey]);
      } catch (error) {
        reject(error);
        return;
      }
      chrome.storage.local.set({ [storageKey]: nextValue }, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(nextValue);
      });
    });
  }));
  state._storageWriteQueues[storageKey] = next.catch((error) => {
    console.warn(`[Storage] Mutation failed for ${storageKey}:`, error);
  });
  return next;
}

function enqueueStoragePatch(queueKey, patch) {
  const previous = state._storageWriteQueues[queueKey] || Promise.resolve();
  const next = previous.then(() => new Promise((resolve, reject) => {
    const keys = Object.keys(patch);
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const merged = { ...result, ...patch };
      chrome.storage.local.set(merged, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(merged);
      });
    });
  }));
  state._storageWriteQueues[queueKey] = next.catch((error) => {
    console.warn(`[Storage] Patch failed for ${queueKey}:`, error);
  });
  return next;
}

function enqueueUserPresetsMutation(mutate) {
  const queueKey = 'globalUserPresets';
  const previous = state._storageWriteQueues[queueKey] || Promise.resolve();
  const next = previous.then(() => new Promise((resolve, reject) => {
    chrome.storage.local.get(['userPresets', 'sf_userPresets'], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const existing = (result.sf_userPresets && typeof result.sf_userPresets === 'object')
        ? result.sf_userPresets
        : ((result.userPresets && typeof result.userPresets === 'object') ? result.userPresets : {});
      let nextPresets;
      try {
        nextPresets = mutate({ ...existing });
      } catch (error) {
        reject(error);
        return;
      }
      chrome.storage.local.set({
        userPresets: nextPresets,
        sf_userPresets: nextPresets
      }, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(nextPresets);
      });
    });
  }));
  state._storageWriteQueues[queueKey] = next.catch((error) => {
    console.warn('[Storage] User preset mutation failed:', error);
  });
  return next;
}

// ============================================
//  САЙТОВЫЕ НАСТРОЙКИ / ДОМЕН
// ============================================

function getSiteDomain(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return null;
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function getSiteKey(url) {
  const domain = getSiteDomain(url);
  if (!domain) return null;
  return `site_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function sanitizeSiteSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  const result = {};

  const gains = sanitizeGains(settings.gains);
  if (gains) result.gains = gains;

  if (settings.volume !== undefined) result.volume = clampFiniteNumber(settings.volume, 0, 8, 1);
  if (settings.bass !== undefined) result.bass = clampFiniteNumber(settings.bass, -12, 12, 0);
  if (settings.isEnabled !== undefined) result.isEnabled = !!settings.isEnabled;
  if (settings.autoConnect !== undefined) result.autoConnect = !!settings.autoConnect;
  if (settings.debugMode !== undefined) result.debugMode = !!settings.debugMode;
  if (settings.nightMode !== undefined) result.nightMode = !!settings.nightMode;
  if (settings.powerSaveMode !== undefined) result.powerSaveMode = !!settings.powerSaveMode;

  return result;
}

function saveSiteSettings(url, settings) {
  const domain = getSiteDomain(url);
  const key = getSiteKey(url);
  if (!domain || !key) return Promise.resolve(false);

  const safeSettings = sanitizeSiteSettings(settings);
  return enqueueStorageMutation('siteSettings', (current) => {
    const data = (current && typeof current === 'object' && !Array.isArray(current)) ? { ...current } : {};
    data[key] = {
      settings: safeSettings,
      updated: Date.now(),
      url: String(url).slice(0, 2000),
      domain
    };

    const keys = Object.keys(data);
    if (keys.length > 50) {
      keys
        .sort((a, b) => Number(data[a]?.updated || 0) - Number(data[b]?.updated || 0))
        .slice(0, keys.length - 50)
        .forEach((oldKey) => delete data[oldKey]);
    }
    return data;
  }).then(() => {
    console.log(`💾 Настройки сохранены для сайта: ${domain}`);
    return true;
  }).catch((error) => {
    console.warn(`⚠️ Ошибка сохранения настроек сайта ${domain}:`, error);
    return false;
  });
}

function loadSiteSettings(url) {
  const key = getSiteKey(url);
  if (!key) return Promise.resolve(null);

  return new Promise((resolve) => {
    chrome.storage.local.get(['siteSettings'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка получения siteSettings:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      const data = result.siteSettings;
      const siteData = data && typeof data === 'object' ? data[key] : null;
      resolve(siteData && siteData.settings && typeof siteData.settings === 'object'
        ? sanitizeSiteSettings(siteData.settings)
        : null);
    });
  });
}

function loadInjectSettings(url) {
  return Promise.all([
    loadSiteSettings(url),
    new Promise((resolve) => {
      chrome.storage.local.get([
        'sf_eqSettings', 'eqSettings',
        'sf_volumeBoost', 'volumeBoost',
        'sf_bassBoost', 'bassBoost',
        'sf_userPresets', 'userPresets',
        'sf_nightMode', 'nightMode',
        'sf_powerSaveMode', 'powerSaveMode',
        'sf_debugMode', 'debugMode',
        'soundforgeAutoConnect'
      ], (result) => {
        if (chrome.runtime.lastError) {
          resolve({});
          return;
        }
        resolve({
          gains: result.sf_eqSettings ?? result.eqSettings,
          volume: result.sf_volumeBoost ?? result.volumeBoost,
          bass: result.sf_bassBoost ?? result.bassBoost,
          userPresets: result.sf_userPresets ?? result.userPresets,
          nightMode: result.sf_nightMode ?? result.nightMode,
          powerSaveMode: result.sf_powerSaveMode ?? result.powerSaveMode,
          debugMode: result.sf_debugMode ?? result.debugMode,
          autoConnect: result.soundforgeAutoConnect
        });
      });
    })
  ]).then(([siteSettings, globalSettings]) => ({
    settings: { ...globalSettings, ...(siteSettings || {}) },
    hasSiteSettings: !!siteSettings
  }));
}

function normalizePresetPayload(presetId, source = 'background') {
  const preset = presetId && PRESETS[presetId] ? PRESETS[presetId] : null;
  if (!preset) return null;
  return {
    preset: presetId,
    presetData: { ...preset, gains: { ...(preset.gains || {}) } },
    source
  };
}


const IMPORTABLE_KEYS = new Set([
  'theme', 'eqSettings', 'selectedPreset', 'volumeBoost', 'bassBoost',
  'language', 'savedVolume', 'savedBass', 'userPresets', 'nightMode',
  'powerSaveMode', 'debugMode', 'soundforgeConnected', 'soundforgeAutoConnect',
  'autoDisableOnSiteChange', 'sf_eqSettings', 'sf_selectedPreset',
  'sf_volumeBoost', 'sf_bassBoost', 'sf_userPresets', 'sf_savedVolume',
  'sf_savedBass', 'sf_nightMode', 'sf_powerSaveMode', 'sf_debugMode',
  'sf_isConnected'
]);

const EQ_FREQUENCIES = new Set(['31', '62', '125', '250', '500', '1000', '2000', '4000', '8000', '16000']);

function clampFiniteNumber(value, min, max, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function sanitizeGains(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const gains = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!EQ_FREQUENCIES.has(String(key))) continue;
    gains[key] = clampFiniteNumber(raw, -24, 24, 0);
  }
  return gains;
}

function sanitizeUserPresets(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [name, rawPreset] of Object.entries(value).slice(0, 200)) {
    if (!name || name.length > 100 || !rawPreset || typeof rawPreset !== 'object') continue;
    const gains = sanitizeGains(rawPreset.gains) || {};
    result[name] = {
      gains,
      volume: clampFiniteNumber(rawPreset.volume, 0, 800, 100),
      bass: clampFiniteNumber(rawPreset.bass, -12, 12, 0),
      timestamp: Number.isFinite(Number(rawPreset.timestamp)) ? Number(rawPreset.timestamp) : Date.now()
    };
  }
  return result;
}

function sanitizeImportedSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Неверный формат настроек');
  }

  const settings = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!IMPORTABLE_KEYS.has(key)) continue;
    switch (key) {
      case 'eqSettings':
      case 'sf_eqSettings': {
        const gains = sanitizeGains(value);
        if (gains) settings[key] = gains;
        break;
      }
      case 'volumeBoost':
      case 'sf_volumeBoost':
        settings[key] = clampFiniteNumber(value, 0, 8, 1);
        break;
      case 'bassBoost':
      case 'sf_bassBoost':
        settings[key] = clampFiniteNumber(value, -12, 12, 0);
        break;
      case 'savedVolume':
      case 'sf_savedVolume':
        settings[key] = clampFiniteNumber(value, 0, 800, 100);
        break;
      case 'savedBass':
      case 'sf_savedBass':
        settings[key] = clampFiniteNumber(value, -12, 12, 0);
        break;
      case 'selectedPreset':
      case 'sf_selectedPreset':
        if (typeof value === 'string' && value.length <= 100) settings[key] = value;
        break;
      case 'theme':
        if (['system', 'light', 'dark'].includes(value)) settings[key] = value;
        break;
      case 'language':
        if (['ru', 'uk', 'en'].includes(value)) settings[key] = value;
        break;
      case 'userPresets':
      case 'sf_userPresets':
        settings[key] = sanitizeUserPresets(value);
        break;
      case 'nightMode':
      case 'powerSaveMode':
      case 'debugMode':
      case 'soundforgeConnected':
      case 'soundforgeAutoConnect':
      case 'autoDisableOnSiteChange':
      case 'sf_nightMode':
      case 'sf_powerSaveMode':
      case 'sf_debugMode':
      case 'sf_isConnected':
        if (typeof value === 'boolean') settings[key] = value;
        break;
      default:
        break;
    }
  }
  return settings;
}

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

function restorePersistedConnection(storedUrl, storedSite) {
  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError || !Array.isArray(tabs)) return;

    const candidates = tabs.filter((tab) => (
      tab?.id && tab.url && !isSystemUrl(tab.url) && canInjectScript(tab.url)
    ));

    const exactMatch = storedUrl
      ? candidates.find((tab) => tab.url === storedUrl)
      : null;
    const siteMatch = storedSite
      ? candidates.find((tab) => getSiteDomain(tab.url) === storedSite)
      : null;
    const activeMatch = candidates.find((tab) => tab.active);
    const target = exactMatch || siteMatch || (!storedUrl && !storedSite ? activeMatch : null);

    if (!target?.id) return;

    const session = getTabSession(target.id);
    session.shouldReconnect = true;
    session.lastUrl = target.url;
    state.currentTabId = target.id;
    state._lastSiteByTab[target.id] = getSiteDomain(target.url) || null;

    // Keep global UI state honest until the target tab confirms a real AudioContext.
    state.isConnected = false;
    state.active = false;

    setTimeout(() => {
      injectScriptDirectly(target.id);
      setTimeout(() => {
        const currentSession = getTabSession(target.id);
        if (currentSession?.shouldReconnect) {
          sendMessageToInject(target.id, 'SF_CONNECT');
        }
      }, 1000);
    }, 300);
  });
}

function loadSavedState() {
  chrome.storage.local.get([
    'soundforgeConnected',
    'soundforgeAutoConnect',
    'soundforgeConnectedUrl',
    'soundforgeConnectedSite',
    'nightMode',
    'powerSaveMode',
    'lastSite',
    'settingsHistory',
    'selectedPreset',
    'sf_isConnected',
    'sf_selectedPreset',
    'sf_nightMode',
    'sf_powerSaveMode',
    'sf_connectedUrl',
    'sf_connectedSite'
  ], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка загрузки состояния:', chrome.runtime.lastError);
      return;
    }

    const connectedState = result.soundforgeConnected ?? result.sf_isConnected;
    const selectedPreset = result.sf_selectedPreset ?? result.selectedPreset;
    const nightMode = result.sf_nightMode ?? result.nightMode;
    const powerSaveMode = result.sf_powerSaveMode ?? result.powerSaveMode;
    const connectedUrl = result.sf_connectedUrl ?? result.soundforgeConnectedUrl ?? null;
    const connectedSite = result.sf_connectedSite ?? result.soundforgeConnectedSite ?? null;

    // A persisted boolean is an intent, not proof that the current tab still has
    // a live AudioContext. Real connected state is restored only after SF_PING/
    // statusUpdate confirms the injected runtime.
    state.isConnected = false;
    state.active = false;

    if (connectedState === true) {
      state._autoConnectEnabled = true;
      console.log('✅ Восстановлено намерение подключения; проверяем реальный runtime');
      restorePersistedConnection(connectedUrl, connectedSite);
    } else if (connectedState === false) {
      state._autoConnectEnabled = false;
      console.log('✅ Восстановлено состояние: ОТКЛЮЧЕН');
    }

    if (result.soundforgeAutoConnect === false) {
      state._autoConnectEnabled = false;
    }

    if (nightMode === true) {
      state._nightMode = true;
      state._nightModeStartTime = Date.now();
      console.log('🌙 Восстановлен ночной режим');
    }

    if (powerSaveMode === true) {
      state._powerSaveMode = true;
      console.log('⚡ Восстановлен режим энергосбережения');
    }

    if (result.lastSite) {
      state._lastSite = result.lastSite;
    }

    if (result.settingsHistory) {
      state._history = result.settingsHistory;
    }

    if (selectedPreset) {
      state._currentPreset = selectedPreset;
    }

    setTimeout(() => {
      updateIcon(false);
    }, 500);
  });
}

function saveConnectedState(connected) {
  const session = state.currentTabId ? getTabSession(state.currentTabId) : null;
  const connectedUrl = connected ? (session?.lastUrl || state._lastUrl || null) : null;
  const connectedSite = connected ? (getSiteDomain(connectedUrl || '') || state._lastSite || null) : null;

  const payload = {
    soundforgeConnected: connected,
    soundforgeAutoConnect: state._autoConnectEnabled,
    sf_isConnected: connected,
    soundforgeConnectedUrl: connectedUrl,
    sf_connectedUrl: connectedUrl,
    soundforgeConnectedSite: connectedSite,
    sf_connectedSite: connectedSite
  };

  enqueueStoragePatch('connectionState', payload)
    .then(() => console.log(`💾 Состояние сохранено: ${connected ? 'ПОДКЛЮЧЕН' : 'ОТКЛЮЧЕН'}`))
    .catch((error) => console.warn('⚠️ Ошибка сохранения состояния:', error));
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
    if (chrome.runtime.lastError) {
      callback(null);
      return;
    }

    const activeTab = tabs?.[0];
    const activeSession = activeTab?.id ? getTabSession(activeTab.id) : null;

    // Prefer the actual connected session in the active tab. If the active tab
    // is not connected, do not blindly treat it as the audio owner when another
    // tab already has a live SoundForge session.
    if (activeTab?.id && activeTab.url && canInjectScript(activeTab.url) && activeSession?.connected) {
      callback(activeTab);
      return;
    }

    chrome.tabs.query({}, (allTabs) => {
      if (chrome.runtime.lastError || !Array.isArray(allTabs)) {
        callback(activeTab?.url && canInjectScript(activeTab.url) ? activeTab : null);
        return;
      }

      const currentConnected = state.currentTabId
        ? allTabs.find((tab) => tab.id === state.currentTabId && canInjectScript(tab.url) && getTabSession(tab.id)?.connected)
        : null;
      if (currentConnected) {
        callback(currentConnected);
        return;
      }

      const connectedTab = allTabs.find((tab) => tab.id && canInjectScript(tab.url) && getTabSession(tab.id)?.connected);
      if (connectedTab) {
        callback(connectedTab);
        return;
      }

      if (activeTab?.url && canInjectScript(activeTab.url)) {
        callback(activeTab);
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
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!(window.SoundForgeInject && window._soundforge_loaded)
    }).then((results) => {
      const loaded = results?.[0]?.result === true;
      if (loaded) markTabInjected(tabId);
      else {
        const session = getTabSession(tabId);
        if (session) session.injected = false;
        delete state._injectedTabs[tabId];
      }
      resolve(loaded);
    }).catch(() => {
      const session = getTabSession(tabId);
      if (session) session.injected = false;
      delete state._injectedTabs[tabId];
      resolve(false);
    });
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
            markTabInjected(tabId);
            state._connectionAttempts = 0;
            delete state._injectAttempts[key];
            delete state._failedTabs[tabId];
            delete state._failureTimestamps[tabId];
            
            const session = getTabSession(tabId);
            if (session?.shouldReconnect) {
              setTimeout(() => {
                if (getTabSession(tabId)?.shouldReconnect) {
                  sendMessageToInject(tabId, 'SF_CONNECT');
                }
              }, 500);
            }

            if (tabId === state.currentTabId) {
              safeSendMessage({
                action: 'statusUpdate',
                status: session?.connected ? 'connected' : 'disconnected'
              });
              updateIcon(!!session?.connected);
            }
            
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
      injectScriptDirectly(tabId);
      setTimeout(() => sendMessageToInject(tabId, type, data), 700);
      return;
    }

    chrome.tabs.sendMessage(tabId, { type, data: data || {} }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(`⚠️ Ошибка отправки сообщения ${type}:`, chrome.runtime.lastError.message);
        const session = getTabSession(tabId);
        if (session) session.injected = false;
        delete state._injectedTabs[tabId];
        return;
      }
      if (response?.ok === false) console.warn(`⚠️ Inject отклонил ${type}:`, response.error);
    });
  });
}

// ============================================
//  ПОЛУЧЕНИЕ СПЕКТРА
// ============================================

function getSpectrumFromInject(tabId) {
  if (!tabId || state._failedTabs[tabId]) return;
  chrome.tabs.sendMessage(tabId, { type: 'SF_GET_SPECTRUM', data: {} }, () => {
    if (chrome.runtime.lastError) {
      const session = getTabSession(tabId);
      if (session) session.injected = false;
      delete state._injectedTabs[tabId];
    }
  });
}

// ============================================
//  ГЛОБАЛЬНЫЙ TAB MUTE ДЛЯ 0% ГРОМКОСТИ
// ============================================

function setTabVolumeMute(tabId, shouldMute) {
  if (!tabId) return;

  const opId = (state._tabMuteOps[tabId] || 0) + 1;
  state._tabMuteOps[tabId] = opId;

  if (shouldMute) {
    const record = state._tabMuteStates[tabId] || {
      originalMuted: null,
      active: false
    };
    record.active = true;
    state._tabMuteStates[tabId] = record;

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) return;

      const current = state._tabMuteStates[tabId];
      if (!current) return;
      if (current.originalMuted === null) {
        current.originalMuted = !!tab.mutedInfo?.muted;
      }

      // A newer unmute request already won the race.
      if (state._tabMuteOps[tabId] !== opId || !current.active) return;

      chrome.tabs.update(tabId, { muted: true }, () => {
        if (chrome.runtime.lastError) {
          console.warn(`⚠️ Не удалось заглушить вкладку ${tabId}:`, chrome.runtime.lastError.message);
          return;
        }
        console.log(`🔇 Вкладка ${tabId} полностью заглушена: SoundForge 0%`);
      });
    });
    return;
  }

  const record = state._tabMuteStates[tabId];
  if (!record) return;
  record.active = false;
  delete state._tabMuteStates[tabId];

  // If we never completed the initial tabs.get(), do not overwrite the user's state.
  if (record.originalMuted === null) return;

  const originalMuted = !!record.originalMuted;
  chrome.tabs.update(tabId, { muted: originalMuted }, () => {
    if (chrome.runtime.lastError) {
      console.warn(`⚠️ Не удалось восстановить mute вкладки ${tabId}:`, chrome.runtime.lastError.message);
      return;
    }
    console.log(`🔊 Состояние mute вкладки ${tabId} восстановлено: ${originalMuted ? 'muted' : 'unmuted'}`);
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
      const payload = normalizePresetPayload(nextPresetName, 'hotkey');
      if (payload) sendMessageToInject(tab.id, 'SF_APPLY_PRESET', payload);
    }
  });
  
  notifyWindows({ 
    action: 'presetChanged', 
    preset: nextPresetName,
    source: 'hotkey',
    uiOnly: true
  });
  
  addHistoryEntry('preset_applied', { preset: nextPresetName }, { source: 'hotkey' });
  
  showNotification('🎵 SoundForge', `Пресет: ${nextPresetName}`, 'info');
  
  return nextPresetName;
}

// ============================================
//  ПРОВЕРКА СТАТУСА
// ============================================

function checkRealConnectionStatus(tabId) {
  if (!tabId || state._failedTabs[tabId]) return;

  const session = getTabSession(tabId);
  chrome.tabs.sendMessage(tabId, { type: 'SF_PING', data: {} }, (response) => {
    if (chrome.runtime.lastError) {
      session.injected = false;
      session.connected = false;
      delete state._injectedTabs[tabId];
      if (session.shouldReconnect) {
        setTimeout(() => {
          injectScriptDirectly(tabId);
          setTimeout(() => sendMessageToInject(tabId, 'SF_CONNECT'), 1000);
        }, 500);
      }
      return;
    }

    session.injected = !!response?.ready;
    session.connected = !!response?.active;
    session.lastSeen = Date.now();
    session.lastStatus = session.connected ? 'connected' : 'disconnected';
    if (session.injected) markTabInjected(tabId);

    if (tabId === state.currentTabId) {
      state.isConnected = session.connected;
      state.active = session.connected;
      if (session.connected) {
        saveConnectedState(true);
        updateIcon(true);
      } else if (!session.shouldReconnect) {
        saveConnectedState(false);
        updateIcon(false);
      }
    }
  });
}

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0 && details.url) {
    console.log('🌐 Сайт загружен:', details.url);
    const session = getTabSession(details.tabId);
    const shouldReconnect = !!(session.connected || session.shouldReconnect || (state.currentTabId === details.tabId && state.isConnected));
    invalidateTabRuntime(details.tabId, 'navigation');
    session.shouldReconnect = shouldReconnect;
    session.lastUrl = details.url;
    state._lastUrl = details.url;
    
    if (isSystemUrl(details.url)) {
      return;
    }
    
    const currentSite = getSiteDomain(details.url);
    const previousSite = state._lastSiteByTab[details.tabId] || null;
    const siteChanged = !!(currentSite && previousSite && previousSite !== currentSite);

    state._lastSiteByTab[details.tabId] = currentSite;
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

    loadSiteSettings(details.url).then((settings) => {
      if (settings) {
        if (settings.gains) sendMessageToInject(details.tabId, 'SF_UPDATE_EQ', { gains: settings.gains, instant: true });
        if (settings.volume !== undefined) sendMessageToInject(details.tabId, 'SF_SET_VOLUME', { value: settings.volume });
        if (settings.bass !== undefined) sendMessageToInject(details.tabId, 'SF_SET_BASS', { value: settings.bass });
        if (settings.preset) {
          const payload = settings.presetData ? { preset: settings.preset, presetData: settings.presetData } : normalizePresetPayload(settings.preset, 'site');
          if (payload) sendMessageToInject(details.tabId, 'SF_APPLY_PRESET', payload);
        }
      }

      chrome.storage.local.get(['autoDisableOnSiteChange'], (result) => {
        const autoDisable = chrome.runtime.lastError ? true : result.autoDisableOnSiteChange !== false;
        const tabSession = getTabSession(details.tabId);
        if (siteChanged && autoDisable && shouldReconnect) {
          tabSession.shouldReconnect = false;
          tabSession.connected = false;
          sendMessageToInject(details.tabId, 'SF_DISCONNECT');
          if (state.currentTabId === details.tabId) {
            state.isConnected = false;
            state._autoConnectEnabled = false;
            saveConnectedState(false);
            updateIcon(false);
            safeSendMessage({ action: 'statusUpdate', status: 'disconnected' });
          }
          return;
        }

        if (shouldReconnect && (!siteChanged || !autoDisable)) {
          tabSession.shouldReconnect = true;
          setTimeout(() => {
            injectScriptDirectly(details.tabId);
            setTimeout(() => {
              sendMessageToInject(details.tabId, 'SF_CONNECT');
            }, 1000);
          }, 1000);
        }
      });
    });
    
    setTimeout(() => {
      checkRealConnectionStatus(details.tabId);
    }, 2000);
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0 && details.url) {
    console.log('🔄 SPA навигация:', details.url);
    const session = getTabSession(details.tabId);
    const shouldReconnect = !!(session.connected || session.shouldReconnect || (state.currentTabId === details.tabId && state.isConnected));
    invalidateTabRuntime(details.tabId, 'history_navigation');
    session.shouldReconnect = shouldReconnect;
    state._lastUrl = details.url;
    
    if (isSystemUrl(details.url)) return;
    
    if (state._failedTabs[details.tabId]) {
      delete state._failedTabs[details.tabId];
      delete state._failureTimestamps[details.tabId];
    }
    
    if (shouldReconnect) {
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
      state.currentTabId = tab.id;
      const session = getTabSession(tab.id);
      state.isConnected = !!session.connected;
      state._lastUrl = tab.url;
      
      if (isSystemUrl(tab.url)) return;
      
      if (session.shouldReconnect) {
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
  if (changeInfo.status === 'loading') invalidateTabRuntime(tabId, 'tab_loading');
  if (changeInfo.url) {
    console.log('🔄 URL изменен:', changeInfo.url);
    state._lastUrl = changeInfo.url;
    
    if (isSystemUrl(changeInfo.url)) return;
    
    if (state._failedTabs[tabId]) {
      delete state._failedTabs[tabId];
      delete state._failureTimestamps[tabId];
    }
    
    const session = getTabSession(tabId);
    if (session.shouldReconnect) {
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
  delete state._tabSessions[tabId];
  delete state._documentTokens[tabId];
  delete state._lastSiteByTab[tabId];
  delete state._tabMuteStates[tabId];
  delete state._tabMuteOps[tabId];
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
    
    const session = getTabSession(tabId);
    if (session.connected) {
      session.connected = false;
      session.shouldReconnect = false;
      if (state.currentTabId === tabId) {
        state.isConnected = false;
        state._autoConnectEnabled = false;
        saveConnectedState(false);
        updateIcon(false);
      }
      sendMessageToInject(tabId, 'SF_DISCONNECT');
      safeSendMessage({ action: 'statusUpdate', status: 'disconnected' });
      notifyWindows({ action: 'statusUpdate', status: 'disconnected' });
      showNotification('🔊 SoundForge', 'Эквалайзер выключен', 'info');
    } else {
      session.connected = false;
      session.connecting = true;
      session.shouldReconnect = true;
      state.isConnected = false;
      state._autoConnectEnabled = true;
      state.currentTabId = tabId;
      state.active = false;
      state._isConnecting = true;
      saveConnectedState(true);
      updateIcon(false);
      injectScriptDirectly(tabId);
      setTimeout(() => {
        sendMessageToInject(tabId, 'SF_CONNECT');
      }, 1000);
      safeSendMessage({ action: 'statusUpdate', status: 'disconnected' });
      notifyWindows({ action: 'statusUpdate', status: 'disconnected' });
      showNotification('🔊 SoundForge', 'Подключение эквалайзера...', 'info');
    }
  });
}

function resetAllSettings() {
  chrome.runtime.sendMessage({ action: 'reset', fullReset: true });

  const currentSession = state.currentTabId ? getTabSession(state.currentTabId) : null;
  const wasConnected = !!currentSession?.connected;

  const resetData = {
    eqSettings: {
      31: 0, 62: 0, 125: 0, 250: 0, 500: 0,
      1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0
    },
    sf_eqSettings: {
      31: 0, 62: 0, 125: 0, 250: 0, 500: 0,
      1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0
    },
    volumeBoost: 1,
    sf_volumeBoost: 1,
    savedVolume: 100,
    sf_savedVolume: 100,
    bassBoost: 0,
    sf_bassBoost: 0,
    savedBass: 0,
    sf_savedBass: 0,
    selectedPreset: 'flat',
    sf_selectedPreset: 'flat',
    nightMode: false,
    sf_nightMode: false,
    powerSaveMode: false,
    sf_powerSaveMode: false,
    soundforgeConnected: wasConnected,
    sf_isConnected: wasConnected,
    soundforgeAutoConnect: wasConnected
  };

  enqueueStoragePatch('appSettingsReset', resetData)
    .then(() => {
      state.isConnected = wasConnected;
      state._autoConnectEnabled = wasConnected;
      state._nightMode = false;
      state._powerSaveMode = false;
      state._currentPreset = 'flat';
      if (!wasConnected) state.active = false;
      saveConnectedState(wasConnected);
      updateIcon(wasConnected);
      notifyWindows({ action: 'settingsReset' });
      showNotification('🔄 SoundForge', 'Настройки сброшены без удаления пользовательских данных', 'warning');
    })
    .catch((error) => {
      console.warn('⚠️ Ошибка сброса настроек:', error);
    });
}

// ============================================
//  ИСТОРИЯ
// ============================================

function addHistoryEntry(action, data, metadata = {}) {
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    action,
    data,
    metadata,
    url: metadata.url || '',
    site: metadata.site || state._lastSite || ''
  };
  return enqueueStorageMutation('settingsHistory', (existing) => {
    const history = Array.isArray(existing) ? existing.slice() : [];
    history.push(entry);
    return history.slice(-1000);
  }).then((history) => {
    state._history = history;
    return history;
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
  enqueueStoragePatch('settingsHistory', { settingsHistory: [] })
    .then(() => {
      state._history = [];
      console.log('🗑️ История очищена');
    })
    .catch((error) => console.warn('⚠️ Ошибка очистки истории:', error));
}

// ============================================
//  НОЧНОЙ РЕЖИМ
// ============================================

function toggleNightMode() {
  state._nightMode = !state._nightMode;
  enqueueStoragePatch('globalModes', { nightMode: state._nightMode, sf_nightMode: state._nightMode }).catch((error) => console.warn('⚠️ Ошибка сохранения nightMode:', error));
  
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
  enqueueStoragePatch('globalModes', { powerSaveMode: state._powerSaveMode, sf_powerSaveMode: state._powerSaveMode }).catch((error) => console.warn('⚠️ Ошибка сохранения powerSaveMode:', error));
  
  if (state._powerSaveMode) {
    console.log('⚡ Режим энергосбережения включен');
    showNotification('⚡ SoundForge', 'Режим энергосбережения включен', 'info');
  } else {
    console.log('⚡ Режим энергосбережения выключен');
    showNotification('⚡ SoundForge', 'Режим энергосбережения выключен', 'info');
  }
  
  findActiveTabWithAudio((tab) => {
    if (tab) {
      const interval = state._powerSaveMode ? 5000 : 80;
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
  //  0% = MUTE ВСЕЙ ВКЛАДКИ
  // ============================================
  if (request.action === 'setTabVolumeMute') {
    const tabId = sender?.tab?.id || request.tabId || state.currentTabId;
    setTabVolumeMute(tabId, request.muted === true);
    sendResponse({ status: 'ok', tabId: tabId || null, muted: request.muted === true });
    return true;
  }

  // ============================================
  //  EFFECT SYNC: POPUP <-> WINDOW
  // ============================================
  if (request.action === 'effectChanged' && ['spectrum', 'waves', 'fire', 'neon'].includes(request.effect)) {
    state._currentEffect = request.effect;
    notifyWindows({
      action: 'effectChanged',
      effect: request.effect,
      source: request.source || 'extension'
    });
    sendResponse({ status: 'ok', effect: request.effect });
    return true;
  }

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
    const senderTabId = sender?.tab?.id || null;
    const session = senderTabId ? getTabSession(senderTabId) : null;
    const isCurrentTab = !!senderTabId && senderTabId === state.currentTabId;
    const isActiveSender = sender?.tab?.active === true;

    if (request.status === 'connecting') {
      if (session) {
        session.connecting = true;
        session.lastStatus = 'connecting';
        session.lastSeen = Date.now();
      }
      if (isCurrentTab || isActiveSender || state.currentTabId === null) {
        state.isConnected = false;
        state.active = false;
        state._isConnecting = true;
        updateIcon(false);
      }
      sendResponse({ status: 'received' });
      return true;
    }

    if (request.status === 'connected') {
      if (session) {
        session.connected = true;
        session.connecting = false;
        session.shouldReconnect = true;
        session.lastStatus = 'connected';
        session.lastSeen = Date.now();
        session.lastUrl = sender.tab.url || session.lastUrl;
        markTabInjected(senderTabId, sender.tab.url);
        delete state._failedTabs[senderTabId];
        delete state._failureTimestamps[senderTabId];
      }

      // An inactive tab becoming connected must not steal global state from the
      // active/current tab. Its connection remains isolated in _tabSessions.
      if (isCurrentTab || isActiveSender || state.currentTabId === null) {
        state.currentTabId = senderTabId;
        state.isConnected = true;
        state.active = true;
        state._autoConnectEnabled = true;
        state._isConnecting = false;
        state._connectionAttempts = 0;
        saveConnectedState(true);
        updateIcon(true);
        addHistoryEntry('eq_enabled', {}, { source: 'manual' });
      }
    } else if (request.status === 'disconnected') {
      if (session) {
        session.connected = false;
        session.connecting = false;
        session.lastStatus = 'disconnected';
        session.lastSeen = Date.now();
      }
      if (isCurrentTab || isActiveSender) {
        state.isConnected = false;
        state._isConnecting = false;
        state.active = false;
        saveConnectedState(false);
        updateIcon(false);
      }
    } else if (request.status === 'error') {
      if (session) {
        session.connected = false;
        session.connecting = false;
        session.lastStatus = 'error';
        session.lastSeen = Date.now();
        state._failedTabs[senderTabId] = true;
        state._failureTimestamps[senderTabId] = Date.now();
      }
      if (isCurrentTab || isActiveSender) {
        state.isConnected = false;
        state._isConnecting = false;
        state.active = false;
        updateIcon(false);
      }
    }
    sendResponse({ status: 'received' });
    return true;
  }

  if (request.action === 'getSpectrum') {
    if (state.currentTabId && state.isConnected && !state._failedTabs[state.currentTabId]) {
      getSpectrumFromInject(state.currentTabId);
    } else {
      safeSendMessage({
        action: 'spectrumData',
        spectrum: new Array(64).fill(0),
        hasAudio: false,
        rms: 0,
        peak: 0,
        clipping: false,
        isDummy: false
      });
    }
    sendResponse({ status: 'requested' });
    return true;
  }

  if (request.action === 'spectrumData') {
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'getInjectSettings') {
    const url = typeof request.url === 'string' && request.url ? request.url : sender?.tab?.url;
    loadInjectSettings(url).then((payload) => {
      sendResponse({ status: 'ok', ...payload });
    }).catch((error) => {
      sendResponse({ status: 'error', message: error?.message || 'settings_load_failed', settings: {} });
    });
    return true;
  }

  if (request.action === 'saveInjectSettings') {
    const url = typeof request.url === 'string' && request.url ? request.url : sender?.tab?.url;
    const settings = sanitizeSiteSettings(request.settings);
    saveSiteSettings(url, settings).then((ok) => {
      sendResponse({ status: ok ? 'ok' : 'error' });
    }).catch((error) => {
      sendResponse({ status: 'error', message: error?.message || 'settings_save_failed' });
    });
    return true;
  }

  if (request.action === 'getUserPresets') {
    chrome.storage.local.get(['sf_userPresets', 'userPresets'], (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error', message: chrome.runtime.lastError.message, presets: {} });
        return;
      }
      const presets = (result.sf_userPresets && typeof result.sf_userPresets === 'object')
        ? result.sf_userPresets
        : ((result.userPresets && typeof result.userPresets === 'object') ? result.userPresets : {});
      sendResponse({ status: 'ok', presets });
    });
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
      if (typeof request.data !== 'string' || request.data.length > 2_000_000) {
        throw new Error('Файл настроек слишком большой или некорректный');
      }
      const importData = JSON.parse(request.data);
      if (!importData || typeof importData !== 'object' || !importData.settings || typeof importData.settings !== 'object') {
        throw new Error('Неверный формат данных');
      }

      const safeSettings = sanitizeImportedSettings(importData.settings);
      if (importData.userPresets && typeof importData.userPresets === 'object') {
        const presets = sanitizeUserPresets(importData.userPresets);
        safeSettings.userPresets = presets;
        safeSettings.sf_userPresets = presets;
      }

      const importedPresets = safeSettings.userPresets ?? safeSettings.sf_userPresets;
      const settingsOnly = { ...safeSettings };
      delete settingsOnly.userPresets;
      delete settingsOnly.sf_userPresets;

      const writes = [enqueueStoragePatch('importSettings', settingsOnly)];
      if (importedPresets && typeof importedPresets === 'object') {
        writes.push(enqueueUserPresetsMutation(() => importedPresets));
      }

      Promise.all(writes)
        .then(() => {
          loadSavedState();
          sendResponse({ status: 'ok' });
        })
        .catch((error) => sendResponse({ status: 'error', message: error.message }));
    } catch(e) {
      sendResponse({ status: 'error', message: e.message });
    }
    return true;
  }

  if (request.action === 'settingsSnapshot' && request.settings) {
    let incoming;
    try {
      incoming = sanitizeImportedSettings(request.settings);
    } catch (error) {
      sendResponse({ status: 'error', message: error.message });
      return true;
    }
    const data = {};
    const map = {
      eqSettings: ['eqSettings', 'sf_eqSettings'],
      sf_eqSettings: ['eqSettings', 'sf_eqSettings'],
      volumeBoost: ['volumeBoost', 'sf_volumeBoost'],
      sf_volumeBoost: ['volumeBoost', 'sf_volumeBoost'],
      bassBoost: ['bassBoost', 'sf_bassBoost'],
      sf_bassBoost: ['bassBoost', 'sf_bassBoost'],
      selectedPreset: ['selectedPreset', 'sf_selectedPreset'],
      sf_selectedPreset: ['selectedPreset', 'sf_selectedPreset'],
      theme: ['theme', 'sf_theme'],
      sf_theme: ['theme', 'sf_theme'],
      language: ['language', 'sf_language'],
      sf_language: ['language', 'sf_language'],
      savedVolume: ['savedVolume', 'sf_savedVolume'],
      sf_savedVolume: ['savedVolume', 'sf_savedVolume'],
      savedBass: ['savedBass', 'sf_savedBass'],
      sf_savedBass: ['savedBass', 'sf_savedBass'],
      nightMode: ['nightMode', 'sf_nightMode'],
      sf_nightMode: ['nightMode', 'sf_nightMode'],
      powerSaveMode: ['powerSaveMode', 'sf_powerSaveMode'],
      sf_powerSaveMode: ['powerSaveMode', 'sf_powerSaveMode'],
      debugMode: ['debugMode', 'sf_debugMode'],
      sf_debugMode: ['debugMode', 'sf_debugMode'],
      autoDisableOnSiteChange: ['autoDisableOnSiteChange'],
      soundforgeAutoConnect: ['soundforgeAutoConnect']
    };
    for (const [sourceKey, targets] of Object.entries(map)) {
      if (incoming[sourceKey] !== undefined) {
        for (const targetKey of targets) data[targetKey] = incoming[sourceKey];
      }
    }

    const writeSettings = enqueueStoragePatch('globalSettings', data);
    const writePresets = incoming.userPresets
      ? enqueueUserPresetsMutation(() => incoming.userPresets)
      : Promise.resolve();

    Promise.all([writeSettings, writePresets])
      .then(() => sendResponse({ status: 'ok' }))
      .catch((error) => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

  if (request.action === 'replaceUserPresets' && request.presets && typeof request.presets === 'object') {
    const sanitizedPresets = sanitizeUserPresets(request.presets);
    enqueueUserPresetsMutation(() => sanitizedPresets)
      .then(() => sendResponse({ status: 'ok' }))
      .catch((error) => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

  if (request.action === 'saveUserPreset' && typeof request.name === 'string' && request.name.length <= 100 && request.preset) {
    const sanitizedPreset = sanitizeUserPresets({ [request.name]: request.preset })[request.name];
    if (!sanitizedPreset) {
      sendResponse({ status: 'error', message: 'Некорректный пресет' });
      return true;
    }
    enqueueUserPresetsMutation((existing) => {
      existing[request.name] = sanitizedPreset;
      return existing;
    })
      .then(() => sendResponse({ status: 'ok' }))
      .catch((error) => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

  if (request.action === 'deleteUserPreset' && request.name) {
    enqueueUserPresetsMutation((existing) => {
      delete existing[request.name];
      return existing;
    })
      .then(() => sendResponse({ status: 'ok' }))
      .catch((error) => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

  if (request.action === 'getStatus') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      const tabId = tab?.id || state.currentTabId;
      const session = tabId ? getTabSession(tabId) : null;
      if (tabId) state.currentTabId = tabId;
      if (session) state.isConnected = !!session.connected;
      sendResponse({
        status: session?.connected ? 'connected' : 'disconnected',
        autoConnect: state._autoConnectEnabled,
        nightMode: state._nightMode,
        powerSave: state._powerSaveMode,
        currentPreset: state._currentPreset,
        tabId: tabId || null
      });
    });
    return true;
  }

  if (request.action === 'applyPreset') {
    if (request.preset) {
      state._currentPreset = request.preset;
      const payload = request.presetData
        ? { preset: request.preset, presetData: request.presetData, source: request.source || 'background' }
        : normalizePresetPayload(request.preset, request.source || 'background');
      enqueueStoragePatch('globalSettings', { selectedPreset: request.preset, sf_selectedPreset: request.preset }).catch(() => {});

      const explicitTabId = Number.isFinite(Number(request.targetTabId)) ? Number(request.targetTabId) : null;
      const senderTabId = sender?.tab?.id || null;
      const targetTabId = explicitTabId || senderTabId;

      const applyToTab = (tabId) => {
        if (!tabId || !payload) {
          sendResponse({ status: 'disconnected', message: 'No target audio tab' });
          return;
        }

        const session = getTabSession(tabId);
        // Apply the full preset through one SF_APPLY_PRESET command. This does
        // not call SF_CONNECT/SF_DISCONNECT and therefore keeps the current
        // AudioContext and DSP graph alive.
        sendMessageToInject(tabId, 'SF_APPLY_PRESET', payload);
        notifyWindows({ action: 'presetChanged', preset: request.preset, source: request.source || 'background', tabId, uiOnly: true });
        addHistoryEntry('preset_applied', { preset: request.preset }, { source: request.source || 'background' });
        sendResponse({ status: session?.connected ? 'connected' : 'ok', tabId });
      };

      if (targetTabId) {
        applyToTab(targetTabId);
      } else {
        findActiveTabWithAudio((tab) => {
          if (tab) applyToTab(tab.id);
          else sendResponse({ status: 'disconnected', message: 'No active audio tab' });
        });
      }
    } else {
      sendResponse({ status: 'error', message: 'Missing preset' });
    }
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
          const payload = settings.presetData ? { preset: settings.preset, presetData: settings.presetData } : normalizePresetPayload(settings.preset, 'site');
          if (payload) sendMessageToInject(tab.id, 'SF_APPLY_PRESET', payload);
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

  // ============================================
  //  ALLOWED ACTIONS — ИСПРАВЛЕНО
  // ============================================

  const allowedActions = ['connect', 'disconnect', 'updateEQ', 'reset', 'setVolume', 'setBass', 'reconnect'];

  if (allowedActions.includes(request.action)) {
    const isFromExtension = sender && sender.tab && sender.tab.url && 
      (sender.tab.url.startsWith('chrome-extension://') || sender.tab.url.startsWith('moz-extension://'));
    
    if (isFromExtension) {
      console.log(`🔄 Перенаправляем ${request.action} из окна в активную вкладку с аудио`);
      
      // ДЛЯ CONNECT — ОТПРАВЛЯЕМ СТАТУС В ОКНО СРАЗУ
      if (request.action === 'connect') {
        safeSendMessage({
          action: 'statusUpdate',
          status: 'connecting',
          tabId: sender?.tab?.id || null
        });
      }
      
      findActiveTabWithAudio((tab) => {
        if (!tab) {
          console.log('⛔ Нет доступной вкладки с аудио');
          sendResponse({ status: 'no_tab' });
          if (request.action === 'connect') {
            safeSendMessage({
              action: 'statusUpdate',
              status: 'disconnected',
              tabId: sender?.tab?.id || null
            });
          }
          return;
        }
        
        const tabId = tab.id;
        console.log(`✅ Найдена вкладка: ${tab.url}`);
        
        if (tab.url && isSystemUrl(tab.url)) {
          console.log(`⛔ Пропускаем действие на системной странице: ${tab.url}`);
          sendResponse({ status: 'system_page' });
          if (request.action === 'connect') {
            safeSendMessage({
              action: 'statusUpdate',
              status: 'disconnected',
              tabId: sender?.tab?.id || null
            });
          }
          return;
        }
        
        if (tab.url && tab.url.startsWith('chrome-extension://')) {
          console.log(`⛔ Активная вкладка - страница расширения, пропускаем`);
          sendResponse({ status: 'extension_page' });
          if (request.action === 'connect') {
            safeSendMessage({
              action: 'statusUpdate',
              status: 'disconnected',
              tabId: sender?.tab?.id || null
            });
          }
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

// ============================================
//  ОБРАБОТКА ДЕЙСТВИЙ С ВКЛАДКАМИ
// ============================================

function handleTabAction(request, tabId, sendResponse) {
  if (request.action === 'reconnect') {
    console.log('🔄 Переподключение');
    const session = getTabSession(tabId);
    session.connected = false;
    session.connecting = true;
    session.shouldReconnect = true;
    state.currentTabId = tabId;
    state.isConnected = false;
    state.active = false;
    state._isConnecting = true;
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
    const session = getTabSession(tabId);
    session.connected = false;
    session.connecting = false;
    session.shouldReconnect = false;
    state._isConnecting = false;
    state._connectionAttempts = 0;
    state._isProcessingChange = false;
    delete state._injectedTabs[tabId];
    delete state._failedTabs[tabId];
    delete state._failureTimestamps[tabId];
    sendMessageToInject(tabId, 'SF_DISCONNECT');
    if (state.currentTabId === tabId) {
      state.isConnected = false;
      state._autoConnectEnabled = false;
      state.active = false;
      saveConnectedState(false);
      updateIcon(false);
    }
    safeSendMessage({
      action: 'statusUpdate',
      status: 'disconnected',
      tabId: tabId
    });
    addHistoryEntry('eq_disabled', {}, { source: 'manual' });
    sendResponse({ status: 'disconnected', tabId });
    return;
  }

  if (request.action === 'connect') {
    const session = getTabSession(tabId);
    if (session.connecting) {
      sendResponse({ status: 'connecting', tabId });
      return;
    }
    if (session.connected) {
      sendResponse({ status: 'connected', tabId });
      return;
    }

    console.log('▶ ПОДКЛЮЧЕНИЕ');
    session.connected = false;
    session.connecting = true;
    session.shouldReconnect = true;
    state.isConnected = false;
    state._autoConnectEnabled = true;
    state.currentTabId = tabId;
    state.active = false;
    state._isConnecting = true;
    state._connectionAttempts = 0;
    state._isProcessingChange = false;
    delete state._failedTabs[tabId];
    delete state._failureTimestamps[tabId];

    // ОТПРАВЛЯЕМ СТАТУС CONNECTING В ОКНО (если ещё не отправлено)
    safeSendMessage({
      action: 'statusUpdate',
      status: 'connecting',
      tabId: tabId
    });

    injectScriptDirectly(tabId);
    
    setTimeout(() => {
      sendMessageToInject(tabId, 'SF_CONNECT');
    }, 1500);
    
    setTimeout(() => {
      sendMessageToInject(tabId, 'SF_GET_STATUS');
      getTabSession(tabId).connecting = false;
      state._isConnecting = false;
      
      // ОТПРАВЛЯЕМ РЕЗУЛЬТАТ В ОКНО
      const currentSession = getTabSession(tabId);
      safeSendMessage({
        action: 'statusUpdate',
        status: currentSession.connected ? 'connected' : 'disconnected',
        tabId: tabId
      });
    }, 3000);
    
    sendResponse({ status: 'connecting', tabId });
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
      const session = getTabSession(state.currentTabId);
      if (session?.injected && !state._failedTabs[state.currentTabId]) {
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
      
      const session = getTabSession(tabId);
      if (session.shouldReconnect) {
        injectScriptDirectly(tabId);
        if (!session.injected) {
          setTimeout(() => {
            sendMessageToInject(tabId, 'SF_CONNECT');
          }, 1000);
        }
      }
      
      // Spectrum data is pushed by inject.js; no 50ms executeScript polling.
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
  Object.keys(state._tabSessions).forEach(key => delete state._tabSessions[key]);
  Object.keys(state._documentTokens).forEach(key => delete state._documentTokens[key]);
  Object.keys(state._lastSiteByTab).forEach(key => delete state._lastSiteByTab[key]);
}

startPeriodicChecks();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAll);
}

if (chrome.alarms?.create) {
  chrome.alarms.create('soundforge-night-mode', { periodInMinutes: 10 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm?.name === 'soundforge-night-mode') checkNightModeAuto();
  });
}
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