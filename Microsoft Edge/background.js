// ============================================
//  BACKGROUND.JS - SoundForge v3.22.8 Edge 151
//  Microsoft Edge 151.0.4129.59 | Windows 11 25H2
//  ГОРЯЧИЕ КЛАВИШИ: Ctrl+Shift+U, Ctrl+Shift+E, Ctrl+Shift+Y, Ctrl+Shift+X
//  ИСПРАВЛЕНО: полная очистка ресурсов
//  ИСПРАВЛЕНО: обработка ошибок storage
//  ИСПРАВЛЕНО: отправка статуса в окно при подключении
//  EDGE OPTIMIZED: без chrome.* прямых вызовов
//  EDGE OPTIMIZED: полный набор иконок (active + off)
// ============================================

const edgeAPI = globalThis.browser || globalThis.chrome;
if (!edgeAPI?.runtime) throw new Error('Microsoft Edge extension API unavailable');

console.log('🎛️ SoundForge Background v3.22.8 Edge 151 запущен');

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
  _spectrumClients: new Set(),
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

function invalidateTabRuntime(tabId, reason) {
  reason = reason || 'navigation';
  var session = getTabSession(tabId);
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

function markTabInjected(tabId, url) {
  url = url || null;
  var session = getTabSession(tabId);
  if (!session) return;
  session.injected = true;
  session.lastUrl = url || session.lastUrl;
  session.lastSeen = Date.now();
  state._injectedTabs[tabId] = { token: session.documentToken, url: session.lastUrl };
}

// ============================================
//  СЕРИАЛИЗОВАННАЯ ЗАПИСЬ В STORAGE (EDGE OPTIMIZED)
// ============================================

function enqueueStorageMutation(storageKey, mutate) {
  var previous = state._storageWriteQueues[storageKey] || Promise.resolve();
  var next = previous.then(function() {
    return new Promise(function(resolve, reject) {
      edgeAPI.storage.local.get([storageKey], function(result) {
        if (edgeAPI.runtime.lastError) {
          reject(new Error(edgeAPI.runtime.lastError.message));
          return;
        }
        var nextValue;
        try {
          nextValue = mutate(result[storageKey]);
        } catch (error) {
          reject(error);
          return;
        }
        edgeAPI.storage.local.set({ [storageKey]: nextValue }, function() {
          if (edgeAPI.runtime.lastError) reject(new Error(edgeAPI.runtime.lastError.message));
          else resolve(nextValue);
        });
      });
    });
  });
  state._storageWriteQueues[storageKey] = next.catch(function(error) {
    console.warn('[Storage] Mutation failed for', storageKey, error);
  });
  return next;
}

function enqueueStoragePatch(queueKey, patch) {
  var previous = state._storageWriteQueues[queueKey] || Promise.resolve();
  var next = previous.then(function() {
    return new Promise(function(resolve, reject) {
      var keys = Object.keys(patch);
      edgeAPI.storage.local.get(keys, function(result) {
        if (edgeAPI.runtime.lastError) {
          reject(new Error(edgeAPI.runtime.lastError.message));
          return;
        }
        var merged = Object.assign({}, result || {}, patch || {});
        edgeAPI.storage.local.set(merged, function() {
          if (edgeAPI.runtime.lastError) reject(new Error(edgeAPI.runtime.lastError.message));
          else resolve(merged);
        });
      });
    });
  });
  state._storageWriteQueues[queueKey] = next.catch(function(error) {
    console.warn('[Storage] Patch failed for', queueKey, error);
  });
  return next;
}

function enqueueUserPresetsMutation(mutate) {
  var queueKey = 'globalUserPresets';
  var previous = state._storageWriteQueues[queueKey] || Promise.resolve();
  var next = previous.then(function() {
    return new Promise(function(resolve, reject) {
      edgeAPI.storage.local.get(['userPresets', 'sf_userPresets'], function(result) {
        if (edgeAPI.runtime.lastError) {
          reject(new Error(edgeAPI.runtime.lastError.message));
          return;
        }
        var existing = (result.sf_userPresets && typeof result.sf_userPresets === 'object')
          ? result.sf_userPresets
          : ((result.userPresets && typeof result.userPresets === 'object') ? result.userPresets : {});
        var nextPresets;
        try {
          nextPresets = mutate(Object.assign({}, existing || {}));
        } catch (error) {
          reject(error);
          return;
        }
        var limitedEntries = Object.entries(nextPresets || {}).slice(-50);
        nextPresets = Object.fromEntries(limitedEntries);
        edgeAPI.storage.local.set({
          userPresets: nextPresets,
          sf_userPresets: nextPresets
        }, function() {
          if (edgeAPI.runtime.lastError) reject(new Error(edgeAPI.runtime.lastError.message));
          else resolve(nextPresets);
        });
      });
    });
  });
  state._storageWriteQueues[queueKey] = next.catch(function(error) {
    console.warn('[Storage] User preset mutation failed:', error);
  });
  return next;
}

// ============================================
//  САЙТОВЫЕ НАСТРОЙКИ / ДОМЕН
// ============================================

function getSiteDomain(url) {
  try {
    var parsed = new URL(url);
    if (!parsed.hostname) return null;
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function getSiteKey(url) {
  var domain = getSiteDomain(url);
  if (!domain) return null;
  return 'site_' + domain.replace(/[^a-zA-Z0-9]/g, '_');
}

function sanitizeSiteSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  var result = {};

  var gains = sanitizeGains(settings.gains);
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
  var domain = getSiteDomain(url);
  var key = getSiteKey(url);
  if (!domain || !key) return Promise.resolve(false);

  var safeSettings = sanitizeSiteSettings(settings);
  return enqueueStorageMutation('siteSettings', function(current) {
    var data = (current && typeof current === 'object' && !Array.isArray(current)) ? Object.assign({}, current) : {};
    data[key] = {
      settings: safeSettings,
      updated: Date.now(),
      url: String(url).slice(0, 2000),
      domain: domain
    };

    var keys = Object.keys(data);
    if (keys.length > 50) {
      keys
        .sort(function(a, b) { return Number(data[a]?.updated || 0) - Number(data[b]?.updated || 0); })
        .slice(0, keys.length - 50)
        .forEach(function(oldKey) { delete data[oldKey]; });
    }
    return data;
  }).then(function() {
    console.log('💾 Настройки сохранены для сайта:', domain);
    return true;
  }).catch(function(error) {
    console.warn('⚠️ Ошибка сохранения настроек сайта', domain, error);
    return false;
  });
}

function loadSiteSettings(url) {
  var key = getSiteKey(url);
  if (!key) return Promise.resolve(null);

  return new Promise(function(resolve) {
    edgeAPI.storage.local.get(['siteSettings'], function(result) {
      if (edgeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка получения siteSettings:', edgeAPI.runtime.lastError);
        resolve(null);
        return;
      }
      var data = result.siteSettings;
      var siteData = data && typeof data === 'object' ? data[key] : null;
      resolve(siteData && siteData.settings && typeof siteData.settings === 'object'
        ? sanitizeSiteSettings(siteData.settings)
        : null);
    });
  });
}

function loadInjectSettings(url) {
  return Promise.all([
    loadSiteSettings(url),
    new Promise(function(resolve) {
      edgeAPI.storage.local.get([
        'sf_eqSettings', 'eqSettings',
        'sf_volumeBoost', 'volumeBoost',
        'sf_bassBoost', 'bassBoost',
        'sf_userPresets', 'userPresets',
        'sf_nightMode', 'nightMode',
        'sf_powerSaveMode', 'powerSaveMode',
        'sf_debugMode', 'debugMode',
        'soundforgeAutoConnect'
      ], function(result) {
        if (edgeAPI.runtime.lastError) {
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
  ]).then(function(results) {
    var siteSettings = results[0];
    var globalSettings = results[1];
    return {
      settings: Object.assign({}, globalSettings || {}, (siteSettings || {})),
      hasSiteSettings: !!siteSettings
    };
  });
}

function normalizePresetPayload(presetId, source) {
  source = source || 'background';
  var preset = presetId && PRESETS[presetId] ? PRESETS[presetId] : null;
  if (!preset) return null;
  return {
    preset: presetId,
    presetData: Object.assign({}, preset, { gains: Object.assign({}, preset.gains || {}) }),
    source: source
  };
}

// ============================================
//  КОНСТАНТЫ И УТИЛИТЫ
// ============================================

var IMPORTABLE_KEYS = new Set([
  'theme', 'eqSettings', 'selectedPreset', 'volumeBoost', 'bassBoost',
  'language', 'savedVolume', 'savedBass', 'userPresets', 'nightMode',
  'powerSaveMode', 'debugMode', 'soundforgeConnected', 'soundforgeAutoConnect',
  'autoDisableOnSiteChange', 'sf_eqSettings', 'sf_selectedPreset',
  'sf_volumeBoost', 'sf_bassBoost', 'sf_userPresets', 'sf_savedVolume',
  'sf_savedBass', 'sf_nightMode', 'sf_powerSaveMode', 'sf_debugMode',
  'sf_isConnected'
]);

var EQ_FREQUENCIES = new Set(['31', '62', '125', '250', '500', '1000', '2000', '4000', '8000', '16000']);

function clampFiniteNumber(value, min, max, fallback) {
  fallback = fallback || 0;
  var num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function sanitizeGains(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  var gains = {};
  for (var key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      if (!EQ_FREQUENCIES.has(String(key))) continue;
      gains[key] = clampFiniteNumber(value[key], -24, 24, 0);
    }
  }
  return gains;
}

function sanitizeUserPresets(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  var result = {};
  var entries = Object.entries(value).slice(0, 200);
  for (var i = 0; i < entries.length; i++) {
    var name = entries[i][0];
    var rawPreset = entries[i][1];
    if (!name || name.length > 100 || !rawPreset || typeof rawPreset !== 'object') continue;
    var gains = sanitizeGains(rawPreset.gains) || {};
    result[name] = {
      gains: gains,
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

  var settings = {};
  for (var key in raw) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      if (!IMPORTABLE_KEYS.has(key)) continue;
      var value = raw[key];
      switch (key) {
        case 'eqSettings':
        case 'sf_eqSettings': {
          var gains = sanitizeGains(value);
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
  edgeAPI.tabs.query({}, function(tabs) {
    if (edgeAPI.runtime.lastError || !Array.isArray(tabs)) return;

    var candidates = tabs.filter(function(tab) {
      return tab && tab.id && tab.url && !isSystemUrl(tab.url) && canInjectScript(tab.url);
    });

    var exactMatch = storedUrl
      ? candidates.find(function(tab) { return tab.url === storedUrl; })
      : null;
    var siteMatch = storedSite
      ? candidates.find(function(tab) { return getSiteDomain(tab.url) === storedSite; })
      : null;
    var activeMatch = candidates.find(function(tab) { return tab.active; });
    var target = exactMatch || siteMatch || (!storedUrl && !storedSite ? activeMatch : null);

    if (!target || !target.id) return;

    var session = getTabSession(target.id);
    session.shouldReconnect = true;
    session.lastUrl = target.url;
    state.currentTabId = target.id;
    state._lastSiteByTab[target.id] = getSiteDomain(target.url) || null;

    state.isConnected = false;
    state.active = false;

    setTimeout(function() {
      injectScriptDirectly(target.id);
      setTimeout(function() {
        var currentSession = getTabSession(target.id);
        if (currentSession && currentSession.shouldReconnect) {
          sendMessageToInject(target.id, 'SF_CONNECT');
        }
      }, 1000);
    }, 300);
  });
}

function loadSavedState() {
  edgeAPI.storage.local.get([
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
  ], function(result) {
    if (edgeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка загрузки состояния:', edgeAPI.runtime.lastError);
      return;
    }

    var connectedState = result.soundforgeConnected ?? result.sf_isConnected;
    var selectedPreset = result.sf_selectedPreset ?? result.selectedPreset;
    var nightMode = result.sf_nightMode ?? result.nightMode;
    var powerSaveMode = result.sf_powerSaveMode ?? result.powerSaveMode;
    var connectedUrl = result.sf_connectedUrl ?? result.soundforgeConnectedUrl ?? null;
    var connectedSite = result.sf_connectedSite ?? result.soundforgeConnectedSite ?? null;

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

    setTimeout(function() {
      updateIcon(false);
    }, 500);
  });
}

function saveConnectedState(connected) {
  var session = state.currentTabId ? getTabSession(state.currentTabId) : null;
  var connectedUrl = connected ? (session && session.lastUrl ? session.lastUrl : state._lastUrl || null) : null;
  var connectedSite = connected ? (getSiteDomain(connectedUrl || '') || state._lastSite || null) : null;

  var payload = {
    soundforgeConnected: connected,
    soundforgeAutoConnect: state._autoConnectEnabled,
    sf_isConnected: connected,
    soundforgeConnectedUrl: connectedUrl,
    sf_connectedUrl: connectedUrl,
    soundforgeConnectedSite: connectedSite,
    sf_connectedSite: connectedSite
  };

  enqueueStoragePatch('connectionState', payload)
    .then(function() { console.log('💾 Состояние сохранено:', connected ? 'ПОДКЛЮЧЕН' : 'ОТКЛЮЧЕН'); })
    .catch(function(error) { console.warn('⚠️ Ошибка сохранения состояния:', error); });
}

loadSavedState();

function safeSendMessage(message) {
  try {
    edgeAPI.runtime.sendMessage(message).catch(function() {});
  } catch {}
}

// ============================================
//  ОБНОВЛЕНИЕ ИКОНКИ (EDGE OPTIMIZED)
//  ПОЛНЫЙ НАБОР: АКТИВНЫЕ И ОТКЛЮЧЕННЫЕ
// ============================================

function updateIcon(isActive) {
  try {
    setTimeout(function() {
      try {
        var iconPath = {
          16: isActive ? 'icons/SoundForge_16x16.png' : 'icons/SoundForge-off_16x16.png',
          48: isActive ? 'icons/SoundForge_48x48.png' : 'icons/SoundForge-off_48x48.png',
          128: isActive ? 'icons/SoundForge_128x128.png' : 'icons/SoundForge-off_128x128.png'
        };
        
        edgeAPI.action.setIcon({ path: iconPath }, function() {
          if (edgeAPI.runtime.lastError) {
            // Fallback: используем основную иконку для всех размеров
            edgeAPI.action.setIcon({
              path: {
                16: 'icons/SoundForge_16x16.png',
                48: 'icons/SoundForge_48x48.png',
                128: 'icons/SoundForge_128x128.png'
              }
            });
          }
        });
      } catch (e) {
        // Игнорируем
      }
    }, 100);
    
    if (isActive) {
      edgeAPI.action.setBadgeText({ text: '🔊' });
      edgeAPI.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      edgeAPI.action.setBadgeText({ text: '⛔' });
      edgeAPI.action.setBadgeBackgroundColor({ color: '#888888' });
    }
  } catch (e) {
    // Игнорируем
  }
}

// ============================================
//  ПРОВЕРКА URL (EDGE OPTIMIZED)
// ============================================

function isSystemUrl(url) {
  if (!url) return true;
  var lowerUrl = url.toLowerCase();
  return lowerUrl.startsWith('chrome://') || 
         lowerUrl.startsWith('edge://') || 
         lowerUrl.startsWith('about:') ||
         lowerUrl.startsWith('devtools://') ||
         lowerUrl === 'about:blank' ||
         lowerUrl === 'about:empty';
}

function canInjectScript(url) {
  if (!url) return false;
  var lowerUrl = url.toLowerCase();
  
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
  var lowerUrl = url.toLowerCase();
  
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
  edgeAPI.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (edgeAPI.runtime.lastError) {
      callback(null);
      return;
    }

    var activeTab = tabs && tabs.length > 0 ? tabs[0] : null;
    var activeSession = activeTab && activeTab.id ? getTabSession(activeTab.id) : null;

    if (activeTab && activeTab.id && activeTab.url && canInjectScript(activeTab.url) && activeSession && activeSession.connected) {
      callback(activeTab);
      return;
    }

    edgeAPI.tabs.query({}, function(allTabs) {
      if (edgeAPI.runtime.lastError || !Array.isArray(allTabs)) {
        callback(activeTab && activeTab.url && canInjectScript(activeTab.url) ? activeTab : null);
        return;
      }

      var currentConnected = state.currentTabId
        ? allTabs.find(function(tab) { return tab.id === state.currentTabId && canInjectScript(tab.url) && getTabSession(tab.id) && getTabSession(tab.id).connected; })
        : null;
      if (currentConnected) {
        callback(currentConnected);
        return;
      }

      var connectedTab = allTabs.find(function(tab) { return tab.id && canInjectScript(tab.url) && getTabSession(tab.id) && getTabSession(tab.id).connected; });
      if (connectedTab) {
        callback(connectedTab);
        return;
      }

      if (activeTab && activeTab.url && canInjectScript(activeTab.url)) {
        callback(activeTab);
        return;
      }

      findBestTab(allTabs, callback);
    });
  });
}

function findBestTab(tabs, callback) {
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    if (tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://')) {
      if (tab.audible === true) {
        callback(tab);
        return;
      }
    }
  }
  
  for (var j = 0; j < tabs.length; j++) {
    var tab2 = tabs[j];
    if (tab2.url && tab2.url.includes('youtube.com') && !tab2.url.startsWith('chrome-extension://')) {
      callback(tab2);
      return;
    }
  }
  
  for (var k = 0; k < tabs.length; k++) {
    var tab3 = tabs[k];
    if (tab3.url && !tab3.url.startsWith('chrome-extension://') && !tab3.url.startsWith('chrome://')) {
      callback(tab3);
      return;
    }
  }
  
  callback(null);
}

// ============================================
//  ВНЕДРЕНИЕ INJECT.JS (EDGE OPTIMIZED)
// ============================================

function isInjectLoaded(tabId) {
  return new Promise(function(resolve) {
    if (!Number.isInteger(tabId)) { resolve(false); return; }
    var settled = false;
    var timer = setTimeout(function() { finish(false); }, 1200);
    
    function finish(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      var session = getTabSession(tabId);
      if (value) markTabInjected(tabId);
      else {
        if (session) session.injected = false;
        delete state._injectedTabs[tabId];
      }
      resolve(value);
    }
    
    try {
      edgeAPI.tabs.sendMessage(tabId, { type: 'SF_PING', data: { source: 'edge151' } }, function(response) {
        if (edgeAPI.runtime.lastError) { finish(false); return; }
        finish(response && (response.ready === true || response.status === 'ready' || response.loaded === true));
      });
    } catch (_) { finish(false); }
  });
}

function injectScriptDirectly(tabId, retryCount) {
  retryCount = retryCount || 0;
  if (!tabId) return;
  
  edgeAPI.tabs.get(tabId, function(tab) {
    if (edgeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения таба', tabId, edgeAPI.runtime.lastError);
      return;
    }
    
    if (!tab || !tab.url || !canInjectScript(tab.url)) {
      console.log('⛔ Пропускаем внедрение:', tab && tab.url ? tab.url : 'unknown');
      return;
    }
    
    doInjectScriptDirectly(tabId, retryCount);
  });
}

function doInjectScriptDirectly(tabId, retryCount) {
  retryCount = retryCount || 0;
  var now = Date.now();
  if (state._failedTabs[tabId]) {
    var lastFailure = state._failureTimestamps[tabId] || 0;
    if (now - lastFailure < 30000) {
      console.log('⏳ Таб', tabId, 'в состоянии ошибки, ожидание 30с');
      return;
    }
    delete state._failedTabs[tabId];
    delete state._failureTimestamps[tabId];
  }
  
  var key = 'tab_' + tabId;
  var MAX_RETRIES = 3;
  var RETRY_DELAY = 2000;

  if (state._injectAttempts[key]) {
    var elapsed = Date.now() - state._injectAttempts[key].startTime;
    if (elapsed < 3000) {
      console.log('⏳ Внедрение уже выполняется (прошло', elapsed, 'мс)');
      return;
    } else {
      console.log('🔄 Сброс зависшей попытки внедрения (таймаут)');
      delete state._injectAttempts[key];
    }
  }

  if (retryCount >= MAX_RETRIES) {
    console.error('❌ Превышен лимит попыток внедрения (', MAX_RETRIES, ') для таба', tabId);
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

  console.log('📝 Внедряем inject.js (попытка', retryCount + 1, '/', MAX_RETRIES, ')');

  isInjectLoaded(tabId).then(function(loaded) {
    if (loaded) {
      console.log('✅ inject.js уже загружен (найден при проверке)');
      delete state._injectAttempts[key];
      return;
    }

    edgeAPI.scripting.executeScript({
      target: { tabId: tabId },
      files: ['inject.js']
    })
    .then(function() {
      console.log('📝 inject.js внедрен, ждем инициализацию...');
      
      var checkCount = 0;
      var maxChecks = 10;
      var checkDelay = 300;

      function checkInjection() {
        checkCount++;
        isInjectLoaded(tabId).then(function(isReady) {
          if (isReady) {
            console.log('✅ SoundForgeInject готов (проверка', checkCount, ')');
            markTabInjected(tabId);
            state._connectionAttempts = 0;
            delete state._injectAttempts[key];
            delete state._failedTabs[tabId];
            delete state._failureTimestamps[tabId];
            
            var session = getTabSession(tabId);
            if (session && session.shouldReconnect) {
              setTimeout(function() {
                var currentSession = getTabSession(tabId);
                if (currentSession && currentSession.shouldReconnect) {
                  sendMessageToInject(tabId, 'SF_CONNECT');
                }
              }, 500);
            }

            if (tabId === state.currentTabId) {
              safeSendMessage({
                action: 'statusUpdate',
                status: session && session.connected ? 'connected' : 'disconnected'
              });
              updateIcon(!!(session && session.connected));
            }
            
          } else if (checkCount < maxChecks) {
            console.log('⏳ Ожидаем инициализацию (проверка', checkCount, '/', maxChecks, ')...');
            setTimeout(checkInjection, checkDelay);
          } else {
            console.warn('⚠️ Не удалось дождаться инициализации после', maxChecks, 'проверок');
            delete state._injectAttempts[key];
            state._failedTabs[tabId] = true;
            state._failureTimestamps[tabId] = Date.now();
            safeSendMessage({ action: 'statusUpdate', status: 'error' });
            setTimeout(function() {
              doInjectScriptDirectly(tabId, retryCount + 1);
            }, RETRY_DELAY);
          }
        })
        .catch(function(err) {
          console.warn('⚠️ Ошибка проверки инъекции:', err.message);
          delete state._injectAttempts[key];
          state._failedTabs[tabId] = true;
          state._failureTimestamps[tabId] = Date.now();
          safeSendMessage({ action: 'statusUpdate', status: 'error' });
          setTimeout(function() {
            doInjectScriptDirectly(tabId, retryCount + 1);
          }, RETRY_DELAY);
        });
      }

      setTimeout(checkInjection, 500);
    })
    .catch(function(err) {
      console.warn('⚠️ Ошибка внедрения:', err.message);
      delete state._injectAttempts[key];
      state._failedTabs[tabId] = true;
      state._failureTimestamps[tabId] = Date.now();
      safeSendMessage({ action: 'statusUpdate', status: 'error' });
      setTimeout(function() {
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
    console.log('⏳ Таб', tabId, 'в состоянии ошибки, пропускаем отправку', type);
    return;
  }
  
  edgeAPI.tabs.get(tabId, function(tab) {
    if (edgeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения таба', tabId, edgeAPI.runtime.lastError);
      return;
    }
    
    if (!tab || !tab.url) {
      console.log('⛔ Нет URL для таба', tabId);
      return;
    }
    
    if (tab.url.startsWith('chrome-extension://')) {
      console.log('⏳ Страница расширения, пропускаем отправку', type);
      return;
    }
    
    if (!canSendMessage(tab.url)) {
      console.log('⛔ Пропускаем отправку', type, 'на:', tab.url);
      return;
    }
    
    doSendMessageToInject(tabId, type, data);
  });
}

function doSendMessageToInject(tabId, type, data) {
  isInjectLoaded(tabId).then(function(loaded) {
    if (!loaded) {
      console.log('⏳ inject.js не загружен, внедряем для отправки', type);
      injectScriptDirectly(tabId);
      setTimeout(function() { sendMessageToInject(tabId, type, data); }, 700);
      return;
    }

    edgeAPI.tabs.sendMessage(tabId, { type: type, data: data || {} }, function(response) {
      if (edgeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка отправки сообщения', type, edgeAPI.runtime.lastError.message);
        var session = getTabSession(tabId);
        if (session) session.injected = false;
        delete state._injectedTabs[tabId];
        return;
      }
      if (response && response.ok === false) console.warn('⚠️ Inject отклонил', type, response.error);
    });
  });
}

// ============================================
//  ПОЛУЧЕНИЕ СПЕКТРА
// ============================================

function getSpectrumFromInject(tabId) {
  if (!tabId || state._failedTabs[tabId]) return;
  edgeAPI.tabs.sendMessage(tabId, { type: 'SF_GET_SPECTRUM', data: {} }, function() {
    if (edgeAPI.runtime.lastError) {
      var session = getTabSession(tabId);
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

  var opId = (state._tabMuteOps[tabId] || 0) + 1;
  state._tabMuteOps[tabId] = opId;

  if (shouldMute) {
    var record = state._tabMuteStates[tabId] || {
      originalMuted: null,
      active: false
    };
    record.active = true;
    state._tabMuteStates[tabId] = record;

    edgeAPI.tabs.get(tabId, function(tab) {
      if (edgeAPI.runtime.lastError || !tab) return;

      var current = state._tabMuteStates[tabId];
      if (!current) return;
      if (current.originalMuted === null) {
        current.originalMuted = !!(tab.mutedInfo && tab.mutedInfo.muted);
      }

      if (state._tabMuteOps[tabId] !== opId || !current.active) return;

      edgeAPI.tabs.update(tabId, { muted: true }, function() {
        if (edgeAPI.runtime.lastError) {
          console.warn('⚠️ Не удалось заглушить вкладку', tabId, edgeAPI.runtime.lastError.message);
          return;
        }
        console.log('🔇 Вкладка', tabId, 'полностью заглушена: SoundForge 0%');
      });
    });
    return;
  }

  var record = state._tabMuteStates[tabId];
  if (!record) return;
  record.active = false;
  delete state._tabMuteStates[tabId];

  if (record.originalMuted === null) return;

  var originalMuted = !!record.originalMuted;
  edgeAPI.tabs.update(tabId, { muted: originalMuted }, function() {
    if (edgeAPI.runtime.lastError) {
      console.warn('⚠️ Не удалось восстановить mute вкладки', tabId, edgeAPI.runtime.lastError.message);
      return;
    }
    console.log('🔊 Состояние mute вкладки', tabId, 'восстановлено:', originalMuted ? 'muted' : 'unmuted');
  });
}

// ============================================
//  ОТПРАВКА УВЕДОМЛЕНИЯ В ОКНО И POPUP
// ============================================

function notifyWindows(message) {
  try {
    edgeAPI.runtime.sendMessage(message);
  } catch (e) {}
}

// ============================================
//  СЛЕДУЮЩИЙ ПРЕСЕТ
// ============================================

function nextPreset() {
  var currentPreset = state._currentPreset || 'flat';
  var currentIndex = ALL_PRESETS_ORDER.indexOf(currentPreset);
  if (currentIndex === -1) currentIndex = 0;
  var nextIndex = (currentIndex + 1) % ALL_PRESETS_ORDER.length;
  var nextPresetName = ALL_PRESETS_ORDER[nextIndex];
  
  console.log('🔄 Следующий пресет:', currentPreset, '→', nextPresetName);
  
  state._currentPreset = nextPresetName;
  edgeAPI.storage.local.set({ selectedPreset: nextPresetName });
  
  findActiveTabWithAudio(function(tab) {
    if (tab) {
      var payload = normalizePresetPayload(nextPresetName, 'hotkey');
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
  
  showNotification('🎵 SoundForge', 'Пресет: ' + nextPresetName, 'info');
  
  return nextPresetName;
}

// ============================================
//  ПРОВЕРКА СТАТУСА
// ============================================

function checkRealConnectionStatus(tabId) {
  if (!tabId || state._failedTabs[tabId]) return;

  var session = getTabSession(tabId);
  edgeAPI.tabs.sendMessage(tabId, { type: 'SF_PING', data: {} }, function(response) {
    if (edgeAPI.runtime.lastError) {
      session.injected = false;
      session.connected = false;
      delete state._injectedTabs[tabId];
      if (session.shouldReconnect) {
        setTimeout(function() {
          injectScriptDirectly(tabId);
          setTimeout(function() { sendMessageToInject(tabId, 'SF_CONNECT'); }, 1000);
        }, 500);
      }
      return;
    }

    session.injected = !!(response && response.ready);
    session.connected = !!(response && response.active);
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

// ============================================
//  NAVIGATION EVENTS (EDGE OPTIMIZED)
// ============================================

edgeAPI.webNavigation.onCompleted.addListener(function(details) {
  if (details.frameId === 0 && details.url) {
    console.log('🌐 Сайт загружен:', details.url);
    var session = getTabSession(details.tabId);
    var shouldReconnect = !!(session.connected || session.shouldReconnect || (state.currentTabId === details.tabId && state.isConnected));
    invalidateTabRuntime(details.tabId, 'navigation');
    session.shouldReconnect = shouldReconnect;
    session.lastUrl = details.url;
    state._lastUrl = details.url;
    
    if (isSystemUrl(details.url)) {
      return;
    }
    
    var currentSite = getSiteDomain(details.url);
    var previousSite = state._lastSiteByTab[details.tabId] || null;
    var siteChanged = !!(currentSite && previousSite && previousSite !== currentSite);

    state._lastSiteByTab[details.tabId] = currentSite;
    state._lastSite = currentSite;
    edgeAPI.storage.local.set({ lastSite: currentSite }, function() {
      if (edgeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка сохранения lastSite:', edgeAPI.runtime.lastError);
      }
    });
    
    if (state._failedTabs[details.tabId]) {
      delete state._failedTabs[details.tabId];
      delete state._failureTimestamps[details.tabId];
    }

    loadSiteSettings(details.url).then(function(settings) {
      if (settings) {
        if (settings.gains) sendMessageToInject(details.tabId, 'SF_UPDATE_EQ', { gains: settings.gains, instant: true });
        if (settings.volume !== undefined) sendMessageToInject(details.tabId, 'SF_SET_VOLUME', { value: settings.volume });
        if (settings.bass !== undefined) sendMessageToInject(details.tabId, 'SF_SET_BASS', { value: settings.bass });
        if (settings.preset) {
          var payload = settings.presetData ? { preset: settings.preset, presetData: settings.presetData } : normalizePresetPayload(settings.preset, 'site');
          if (payload) sendMessageToInject(details.tabId, 'SF_APPLY_PRESET', payload);
        }
      }

      edgeAPI.storage.local.get(['autoDisableOnSiteChange'], function(result) {
        var autoDisable = edgeAPI.runtime.lastError ? true : result.autoDisableOnSiteChange !== false;
        var tabSession = getTabSession(details.tabId);
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
          setTimeout(function() {
            injectScriptDirectly(details.tabId);
            setTimeout(function() {
              sendMessageToInject(details.tabId, 'SF_CONNECT');
            }, 1000);
          }, 1000);
        }
      });
    });
    
    setTimeout(function() {
      checkRealConnectionStatus(details.tabId);
    }, 2000);
  }
});

edgeAPI.webNavigation.onHistoryStateUpdated.addListener(function(details) {
  if (details.frameId === 0 && details.url) {
    console.log('🔄 SPA навигация:', details.url);
    var session = getTabSession(details.tabId);
    var shouldReconnect = !!(session.connected || session.shouldReconnect || (state.currentTabId === details.tabId && state.isConnected));
    invalidateTabRuntime(details.tabId, 'history_navigation');
    session.shouldReconnect = shouldReconnect;
    state._lastUrl = details.url;
    
    if (isSystemUrl(details.url)) return;
    
    if (state._failedTabs[details.tabId]) {
      delete state._failedTabs[details.tabId];
      delete state._failureTimestamps[details.tabId];
    }
    
    if (shouldReconnect) {
      setTimeout(function() {
        injectScriptDirectly(details.tabId);
        setTimeout(function() {
          sendMessageToInject(details.tabId, 'SF_RECONNECT');
        }, 1000);
      }, 1000);
    }
  }
});

edgeAPI.tabs.onActivated.addListener(function(activeInfo) {
  edgeAPI.tabs.get(activeInfo.tabId, function(tab) {
    if (edgeAPI.runtime.lastError) return;
    if (tab && tab.url) {
      console.log('🌐 Вкладка активирована:', tab.url);
      state.currentTabId = tab.id;
      var session = getTabSession(tab.id);
      state.isConnected = !!(session && session.connected);
      state._lastUrl = tab.url;
      
      if (isSystemUrl(tab.url)) return;
      
      if (session && session.shouldReconnect) {
        setTimeout(function() {
          injectScriptDirectly(tab.id);
          setTimeout(function() {
            sendMessageToInject(tab.id, 'SF_CONNECT');
          }, 1000);
        }, 500);
      }
      
      setTimeout(function() {
        checkRealConnectionStatus(tab.id);
      }, 1000);
    }
  });
});

edgeAPI.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading') invalidateTabRuntime(tabId, 'tab_loading');
  if (changeInfo.url) {
    console.log('🔄 URL изменен:', changeInfo.url);
    state._lastUrl = changeInfo.url;
    
    if (isSystemUrl(changeInfo.url)) return;
    
    if (state._failedTabs[tabId]) {
      delete state._failedTabs[tabId];
      delete state._failureTimestamps[tabId];
    }
    
    var session = getTabSession(tabId);
    if (session && session.shouldReconnect) {
      setTimeout(function() {
        injectScriptDirectly(tabId);
        setTimeout(function() {
          sendMessageToInject(tabId, 'SF_CONNECT');
        }, 1000);
      }, 1000);
    }
  }
});

edgeAPI.tabs.onRemoved.addListener(function(tabId) {
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

edgeAPI.windows.onCreated.addListener(function(window) {
  if (window.type === 'popup' && window.url && window.url.includes('window.html')) {
    state._windowId = window.id;
    console.log('🪟 Окно открыто, ID:', window.id);
  }
});

edgeAPI.windows.onRemoved.addListener(function(windowId) {
  if (windowId === state._windowId) {
    state._windowId = null;
    console.log('🪟 Окно закрыто');
  }
});

// ============================================
//  ГОРЯЧИЕ КЛАВИШИ (4 команды) (EDGE OPTIMIZED)
// ============================================

edgeAPI.commands.onCommand.addListener(function(command) {
  console.log('⌨️ Горячая клавиша:', command);
  
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
      console.log('⚠️ Неизвестная команда:', command);
  }
});

function toggleEqualizer() {
  findActiveTabWithAudio(function(tab) {
    if (!tab) {
      console.log('⛔ Нет доступной вкладки с аудио');
      return;
    }
    var tabId = tab.id;
    
    var session = getTabSession(tabId);
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
      setTimeout(function() {
        sendMessageToInject(tabId, 'SF_CONNECT');
      }, 1000);
      safeSendMessage({ action: 'statusUpdate', status: 'disconnected' });
      notifyWindows({ action: 'statusUpdate', status: 'disconnected' });
      showNotification('🔊 SoundForge', 'Подключение эквалайзера...', 'info');
    }
  });
}

function resetAllSettings() {
  edgeAPI.runtime.sendMessage({ action: 'reset', fullReset: true });

  var currentSession = state.currentTabId ? getTabSession(state.currentTabId) : null;
  var wasConnected = !!(currentSession && currentSession.connected);

  var resetData = {
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
    .then(function() {
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
    .catch(function(error) {
      console.warn('⚠️ Ошибка сброса настроек:', error);
    });
}

// ============================================
//  ИСТОРИЯ
// ============================================

function addHistoryEntry(action, data, metadata) {
  metadata = metadata || {};
  var entry = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    action: action,
    data: data || {},
    metadata: metadata,
    url: metadata.url || '',
    site: metadata.site || state._lastSite || ''
  };
  return enqueueStorageMutation('settingsHistory', function(existing) {
    var history = Array.isArray(existing) ? existing.slice() : [];
    history.push(entry);
    return history.slice(-1000);
  }).then(function(history) {
    state._history = history;
    return history;
  });
}

function getHistory() {
  return new Promise(function(resolve) {
    edgeAPI.storage.local.get(['settingsHistory'], function(result) {
      if (edgeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка получения settingsHistory:', edgeAPI.runtime.lastError);
        resolve([]);
        return;
      }
      resolve(result.settingsHistory || []);
    });
  });
}

function clearHistory() {
  enqueueStoragePatch('settingsHistory', { settingsHistory: [] })
    .then(function() {
      state._history = [];
      console.log('🗑️ История очищена');
    })
    .catch(function(error) { console.warn('⚠️ Ошибка очистки истории:', error); });
}

// ============================================
//  НОЧНОЙ РЕЖИМ
// ============================================

function toggleNightMode() {
  state._nightMode = !state._nightMode;
  enqueueStoragePatch('globalModes', { nightMode: state._nightMode, sf_nightMode: state._nightMode }).catch(function(error) { console.warn('⚠️ Ошибка сохранения nightMode:', error); });
  
  if (state._nightMode) {
    state._nightModeStartTime = Date.now();
    console.log('🌙 Ночной режим включен');
    showNotification('🌙 SoundForge', 'Ночной режим включен', 'info');
  } else {
    state._nightModeStartTime = null;
    console.log('☀️ Ночной режим выключен');
    showNotification('☀️ SoundForge', 'Ночной режим выключен', 'info');
  }
  
  findActiveTabWithAudio(function(tab) {
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
  enqueueStoragePatch('globalModes', { powerSaveMode: state._powerSaveMode, sf_powerSaveMode: state._powerSaveMode }).catch(function(error) { console.warn('⚠️ Ошибка сохранения powerSaveMode:', error); });
  
  if (state._powerSaveMode) {
    console.log('⚡ Режим энергосбережения включен');
    showNotification('⚡ SoundForge', 'Режим энергосбережения включен', 'info');
  } else {
    console.log('⚡ Режим энергосбережения выключен');
    showNotification('⚡ SoundForge', 'Режим энергосбережения выключен', 'info');
  }
  
  findActiveTabWithAudio(function(tab) {
    if (tab) {
      var interval = state._powerSaveMode ? 5000 : 80;
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
//  УВЕДОМЛЕНИЯ (EDGE OPTIMIZED)
// ============================================

function showNotification(title, message, type) {
  type = type || 'info';
  try {
    edgeAPI.notifications.create({
      type: 'basic',
      iconUrl: 'icons/SoundForge_128x128.png',
      title: title,
      message: message,
      priority: 1
    }, function(notificationId) {
      if (edgeAPI.runtime.lastError) {}
    });
  } catch (e) {
    console.log('📢', title, ':', message);
  }
}

// ============================================
//  ПРОВЕРКА НОЧНОГО РЕЖИМА (АВТО)
// ============================================

function checkNightModeAuto() {
  var now = new Date();
  var hours = now.getHours();
  var isNight = hours >= 22 || hours < 7;
  
  try {
    edgeAPI.storage.local.get(['nightModeAuto'], function(result) {
      if (edgeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка получения nightModeAuto:', edgeAPI.runtime.lastError);
        return;
      }
      
      var autoMode = result.nightModeAuto !== false;
      
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
//  ОБРАБОТЧИК СООБЩЕНИЙ (EDGE OPTIMIZED)
// ============================================

edgeAPI.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action !== 'spectrumData') {
    console.log('📨 Получено сообщение:', request.action);
  }

  if (request.action === 'registerSpectrumListener') {
    var clientId = String(request.clientId || request.source || 'ui');
    state._spectrumClients.add(clientId);
    if (state.currentTabId) sendMessageToInject(state.currentTabId, 'SF_SET_SPECTRUM_ACTIVE', { enabled: true });
    sendResponse({ status: 'ok', listeners: state._spectrumClients.size });
    return true;
  }

  if (request.action === 'unregisterSpectrumListener') {
    var clientId = String(request.clientId || request.source || 'ui');
    state._spectrumClients.delete(clientId);
    if (state._spectrumClients.size === 0 && state.currentTabId) {
      sendMessageToInject(state.currentTabId, 'SF_SET_SPECTRUM_ACTIVE', { enabled: false });
    }
    sendResponse({ status: 'ok', listeners: state._spectrumClients.size });
    return true;
  }

  // ============================================
  //  0% = MUTE ВСЕЙ ВКЛАДКИ
  // ============================================
  if (request.action === 'setTabVolumeMute') {
    var tabId = (sender && sender.tab && sender.tab.id) || request.tabId || state.currentTabId;
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
    edgeAPI.windows.getCurrent({}, function(win) {
      if (edgeAPI.runtime.lastError) {
        sendResponse({ status: 'error', message: edgeAPI.runtime.lastError.message });
        return;
      }
      edgeAPI.windows.update(win.id, {
        width: request.width,
        height: request.height,
        left: request.left || 0,
        top: request.top || 0
      }, function() {
        if (edgeAPI.runtime.lastError) {
          sendResponse({ status: 'error', message: edgeAPI.runtime.lastError.message });
        } else {
          sendResponse({ status: 'ok' });
        }
      });
    });
    return true;
  }
  
  if (request.action === 'open_window') {
    console.log('🪟 Открываем окно эквалайзера');
    edgeAPI.windows.create({
      url: edgeAPI.runtime.getURL('window.html'),
      type: 'popup',
      width: 560,
      height: 820,
      focused: true
    }, function(window) {
      if (edgeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка открытия окна:', edgeAPI.runtime.lastError);
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
    var enabled = toggleNightMode();
    sendResponse({ status: 'ok', enabled: enabled });
    return true;
  }
  
  if (request.action === 'getNightMode') {
    sendResponse({ enabled: state._nightMode });
    return true;
  }
  
  if (request.action === 'togglePowerSave') {
    console.log('⚡ Переключение энергосбережения');
    var enabled = togglePowerSave();
    sendResponse({ status: 'ok', enabled: enabled });
    return true;
  }
  
  if (request.action === 'getPowerSave') {
    sendResponse({ enabled: state._powerSaveMode });
    return true;
  }
  
  if (request.action === 'getHistory') {
    getHistory().then(function(history) {
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
    getHistory().then(function(history) {
      var stats = {
        total: history.length,
        actions: {}
      };
      history.forEach(function(h) {
        stats.actions[h.action] = (stats.actions[h.action] || 0) + 1;
      });
      sendResponse({ status: 'ok', stats: stats });
    });
    return true;
  }
  
  if (request.action === 'statusUpdate') {
    console.log('🔄 Статус обновлен:', request.status);
    var senderTabId = (sender && sender.tab && sender.tab.id) || null;
    var session = senderTabId ? getTabSession(senderTabId) : null;
    var isCurrentTab = !!senderTabId && senderTabId === state.currentTabId;
    var isActiveSender = !!(sender && sender.tab && sender.tab.active === true);

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
        session.lastUrl = (sender && sender.tab && sender.tab.url) || session.lastUrl;
        markTabInjected(senderTabId, sender && sender.tab && sender.tab.url);
        delete state._failedTabs[senderTabId];
        delete state._failureTimestamps[senderTabId];
      }

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
    var url = typeof request.url === 'string' && request.url ? request.url : (sender && sender.tab && sender.tab.url);
    loadInjectSettings(url).then(function(payload) {
      sendResponse({ status: 'ok' });
    }).catch(function(error) {
      sendResponse({ status: 'error', message: error && error.message ? error.message : 'settings_load_failed', settings: {} });
    });
    return true;
  }

  if (request.action === 'saveInjectSettings') {
    var url = typeof request.url === 'string' && request.url ? request.url : (sender && sender.tab && sender.tab.url);
    var settings = sanitizeSiteSettings(request.settings);
    saveSiteSettings(url, settings).then(function(ok) {
      sendResponse({ status: ok ? 'ok' : 'error' });
    }).catch(function(error) {
      sendResponse({ status: 'error', message: error && error.message ? error.message : 'settings_save_failed' });
    });
    return true;
  }

  if (request.action === 'getUserPresets') {
    edgeAPI.storage.local.get(['sf_userPresets', 'userPresets'], function(result) {
      if (edgeAPI.runtime.lastError) {
        sendResponse({ status: 'error', message: edgeAPI.runtime.lastError.message, presets: {} });
        return;
      }
      var presets = (result.sf_userPresets && typeof result.sf_userPresets === 'object')
        ? result.sf_userPresets
        : ((result.userPresets && typeof result.userPresets === 'object') ? result.userPresets : {});
      sendResponse({ status: 'ok', presets: presets });
    });
    return true;
  }

  if (request.action === 'exportSettings') {
    edgeAPI.storage.local.get(null, function(data) {
      if (edgeAPI.runtime.lastError) {
        sendResponse({ status: 'error', message: edgeAPI.runtime.lastError.message });
        return;
      }
      var exportData = {
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
      if (typeof request.data !== 'string' || request.data.length > 2000000) {
        throw new Error('Файл настроек слишком большой или некорректный');
      }
      var importData = JSON.parse(request.data);
      if (!importData || typeof importData !== 'object' || !importData.settings || typeof importData.settings !== 'object') {
        throw new Error('Неверный формат данных');
      }

      var safeSettings = sanitizeImportedSettings(importData.settings);
      if (importData.userPresets && typeof importData.userPresets === 'object') {
        var presets = sanitizeUserPresets(importData.userPresets);
        safeSettings.userPresets = presets;
        safeSettings.sf_userPresets = presets;
      }

      var importedPresets = safeSettings.userPresets || safeSettings.sf_userPresets;
      var settingsOnly = Object.assign({}, safeSettings);
      delete settingsOnly.userPresets;
      delete settingsOnly.sf_userPresets;

      var writes = [enqueueStoragePatch('importSettings', settingsOnly)];
      if (importedPresets && typeof importedPresets === 'object') {
        writes.push(enqueueUserPresetsMutation(function() { return importedPresets; }));
      }

      Promise.all(writes)
        .then(function() {
          loadSavedState();
          sendResponse({ status: 'ok' });
        })
        .catch(function(error) { sendResponse({ status: 'error', message: error.message }); });
    } catch(e) {
      sendResponse({ status: 'error', message: e.message });
    }
    return true;
  }

  if (request.action === 'settingsSnapshot' && request.settings) {
    var incoming;
    try {
      incoming = sanitizeImportedSettings(request.settings);
    } catch (error) {
      sendResponse({ status: 'error', message: error.message });
      return true;
    }
    var data = {};
    var map = {
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
    for (var mapKey in map) {
      if (Object.prototype.hasOwnProperty.call(map, mapKey)) {
        var targets = map[mapKey];
        if (incoming[mapKey] !== undefined) {
          for (var t = 0; t < targets.length; t++) {
            data[targets[t]] = incoming[mapKey];
          }
        }
      }
    }

    var writeSettings = enqueueStoragePatch('globalSettings', data);
    var writePresets = incoming.userPresets
      ? enqueueUserPresetsMutation(function() { return incoming.userPresets; })
      : Promise.resolve();

    Promise.all([writeSettings, writePresets])
      .then(function() { sendResponse({ status: 'ok' }); })
      .catch(function(error) { sendResponse({ status: 'error', message: error.message }); });
    return true;
  }

  if (request.action === 'replaceUserPresets' && request.presets && typeof request.presets === 'object') {
    var sanitizedPresets = sanitizeUserPresets(request.presets);
    enqueueUserPresetsMutation(function() { return sanitizedPresets; })
      .then(function() { sendResponse({ status: 'ok' }); })
      .catch(function(error) { sendResponse({ status: 'error', message: error.message }); });
    return true;
  }

  if (request.action === 'saveUserPreset' && typeof request.name === 'string' && request.name.length <= 100 && request.preset) {
    var sanitizedPreset = sanitizeUserPresets({ [request.name]: request.preset })[request.name];
    if (!sanitizedPreset) {
      sendResponse({ status: 'error', message: 'Некорректный пресет' });
      return true;
    }
    enqueueUserPresetsMutation(function(existing) {
      existing[request.name] = sanitizedPreset;
      return existing;
    })
      .then(function() { sendResponse({ status: 'ok' }); })
      .catch(function(error) { sendResponse({ status: 'error', message: error.message }); });
    return true;
  }

  if (request.action === 'deleteUserPreset' && request.name) {
    enqueueUserPresetsMutation(function(existing) {
      delete existing[request.name];
      return existing;
    })
      .then(function() { sendResponse({ status: 'ok' }); })
      .catch(function(error) { sendResponse({ status: 'error', message: error.message }); });
    return true;
  }

  if (request.action === 'getStatus') {
    var hasExplicitTabId = request.targetTabId !== null && request.targetTabId !== undefined && request.targetTabId !== '';
    var explicitTabId = hasExplicitTabId && Number.isInteger(Number(request.targetTabId)) && Number(request.targetTabId) > 0
      ? Number(request.targetTabId)
      : null;
    var senderUrlForStatus = (sender && sender.url) || (sender && sender.tab && sender.tab.url) || '';
    var senderIsExtensionPage = senderUrlForStatus.startsWith('chrome-extension://') ||
      senderUrlForStatus.startsWith('edge-extension://') ||
      senderUrlForStatus.startsWith('moz-extension://');
    var senderTabId = !senderIsExtensionPage && sender && sender.tab && sender.tab.id ? sender.tab.id : null;

    function respondForTab(tabId) {
      var session = tabId ? getTabSession(tabId) : null;
      if (tabId) state.currentTabId = tabId;
      if (session) state.isConnected = !!session.connected;
      sendResponse({
        status: session && session.connected ? 'connected' : (session && session.connecting ? 'connecting' : 'disconnected'),
        autoConnect: state._autoConnectEnabled,
        nightMode: state._nightMode,
        powerSave: state._powerSaveMode,
        currentPreset: state._currentPreset,
        tabId: tabId || null
      });
    }

    function fallbackToAudioTab() {
      findActiveTabWithAudio(function(tab) { respondForTab(tab && tab.id ? tab.id : null); });
    }

    var knownTabId = explicitTabId || senderTabId || state.currentTabId || null;
    if (!knownTabId) {
      fallbackToAudioTab();
    } else {
      edgeAPI.tabs.get(knownTabId, function(tab) {
        if (edgeAPI.runtime.lastError || !tab || !tab.url || !canSendMessage(tab.url) || isSystemUrl(tab.url) ||
            tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge-extension://') || tab.url.startsWith('moz-extension://')) {
          if (state.currentTabId === knownTabId) state.currentTabId = null;
          fallbackToAudioTab();
          return;
        }
        respondForTab(knownTabId);
      });
    }
    return true;
  }

  if (request.action === 'applyPreset') {
    if (request.preset) {
      state._currentPreset = request.preset;
      var payload = request.presetData
        ? { preset: request.preset, presetData: request.presetData, source: request.source || 'background' }
        : normalizePresetPayload(request.preset, request.source || 'background');
      enqueueStoragePatch('globalSettings', { selectedPreset: request.preset, sf_selectedPreset: request.preset }).catch(function() {});

      var explicitTabId = Number.isFinite(Number(request.targetTabId)) ? Number(request.targetTabId) : null;
      var senderTabId = (sender && sender.tab && sender.tab.id) || null;
      var targetTabId = explicitTabId || senderTabId;

      function applyToTab(tabId) {
        if (!tabId || !payload) {
          sendResponse({ status: 'disconnected', message: 'No target audio tab' });
          return;
        }

        var session = getTabSession(tabId);
        sendMessageToInject(tabId, 'SF_APPLY_PRESET', payload);
        notifyWindows({ action: 'presetChanged', preset: request.preset, source: request.source || 'background', tabId: tabId, uiOnly: true });
        addHistoryEntry('preset_applied', { preset: request.preset }, { source: request.source || 'background' });
        sendResponse({ status: session && session.connected ? 'connected' : 'ok', tabId: tabId });
      }

      if (targetTabId) {
        applyToTab(targetTabId);
      } else {
        findActiveTabWithAudio(function(tab) {
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
    var settings = request.settings;
    findActiveTabWithAudio(function(tab) {
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
          var payload = settings.presetData ? { preset: settings.preset, presetData: settings.presetData } : normalizePresetPayload(settings.preset, 'site');
          if (payload) sendMessageToInject(tab.id, 'SF_APPLY_PRESET', payload);
        }
      }
    });
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'saveSiteSettings') {
    findActiveTabWithAudio(function(tab) {
      if (tab && tab.url) {
        saveSiteSettings(tab.url, request.settings);
      }
    });
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'getSiteSettings') {
    findActiveTabWithAudio(function(tab) {
      if (tab && tab.url) {
        loadSiteSettings(tab.url).then(function(settings) {
          sendResponse({ settings: settings });
        });
      } else {
        sendResponse({ settings: null });
      }
    });
    return true;
  }

  // ============================================
  //  ALLOWED ACTIONS
  // ============================================

  var allowedActions = ['connect', 'disconnect', 'updateEQ', 'reset', 'setVolume', 'setBass', 'reconnect'];

  if (allowedActions.includes(request.action)) {
    var senderUrl = (sender && sender.url) || (sender && sender.tab && sender.tab.url) || '';
    var isFromExtension = senderUrl.startsWith('chrome-extension://') ||
      senderUrl.startsWith('edge-extension://') ||
      senderUrl.startsWith('moz-extension://');
    var hasExplicitTargetTabId = request.targetTabId !== null && request.targetTabId !== undefined && request.targetTabId !== '';
    var explicitTargetTabId = hasExplicitTargetTabId && Number.isInteger(Number(request.targetTabId)) && Number(request.targetTabId) > 0
      ? Number(request.targetTabId)
      : null;

    // Standalone window must keep using the audio tab it was bound to.
    // Do not resolve the active tab inside the extension window itself.
    if (explicitTargetTabId) {
      edgeAPI.tabs.get(explicitTargetTabId, function(tab) {
        var invalidTarget = edgeAPI.runtime.lastError || !tab || !tab.url || !canSendMessage(tab.url) || isSystemUrl(tab.url) ||
          tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge-extension://') || tab.url.startsWith('moz-extension://');
        if (invalidTarget) {
          // A standalone window can retain a stale id after its audio tab was closed,
          // or an older build could have stored the id of window.html itself.
          // Recover by resolving a real audio/content tab instead of permanently failing.
          if (isFromExtension) {
            findActiveTabWithAudio(function(fallbackTab) {
              if (!fallbackTab || !fallbackTab.id) {
                sendResponse({ status: 'no_tab', tabId: null });
                return;
              }
              handleTabAction(request, fallbackTab.id, sendResponse);
            });
          } else {
            sendResponse({ status: 'no_tab', tabId: null });
          }
          return;
        }
        handleTabAction(request, explicitTargetTabId, sendResponse);
      });
      return true;
    }
    
    if (isFromExtension) {
      console.log('🔄 Перенаправляем', request.action, 'из окна в активную вкладку с аудио');
      
      findActiveTabWithAudio(function(tab) {
        if (!tab) {
          console.log('⛔ Нет доступной вкладки с аудио');
          sendResponse({ status: 'no_tab' });
          if (request.action === 'connect') {
            safeSendMessage({
              action: 'statusUpdate',
              status: 'disconnected',
              tabId: null
            });
          }
          return;
        }
        
        var tabId = tab.id;
        console.log('✅ Найдена вкладка:', tab.url);
        
        if (tab.url && isSystemUrl(tab.url)) {
          console.log('⛔ Пропускаем действие на системной странице:', tab.url);
          sendResponse({ status: 'system_page' });
          if (request.action === 'connect') {
            safeSendMessage({
              action: 'statusUpdate',
              status: 'disconnected',
              tabId: null
            });
          }
          return;
        }
        
        if (tab.url && tab.url.startsWith('chrome-extension://')) {
          console.log('⛔ Активная вкладка - страница расширения, пропускаем');
          sendResponse({ status: 'extension_page' });
          if (request.action === 'connect') {
            safeSendMessage({
              action: 'statusUpdate',
              status: 'disconnected',
              tabId: null
            });
          }
          return;
        }
        
        handleTabAction(request, tabId, sendResponse);
      });
      return true;
    }
    
    edgeAPI.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (edgeAPI.runtime.lastError || !tabs || tabs.length === 0) {
        sendResponse({ status: 'no_tab' });
        return;
      }

      var tabId = tabs[0].id;
      
      edgeAPI.tabs.get(tabId, function(tab) {
        if (edgeAPI.runtime.lastError) {
          sendResponse({ status: 'error' });
          return;
        }
        
        if (tab && tab.url && isSystemUrl(tab.url)) {
          console.log('⛔ Пропускаем действие на системной странице:', tab.url);
          sendResponse({ status: 'system_page' });
          return;
        }
        
        if (tab && tab.url && tab.url.startsWith('chrome-extension://')) {
          console.log('⛔ Активная вкладка - страница расширения, пропускаем');
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
    var session = getTabSession(tabId);
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
    setTimeout(function() {
      sendMessageToInject(tabId, 'SF_RECONNECT');
    }, 1000);
    setTimeout(function() { sendMessageToInject(tabId, 'SF_GET_STATUS'); }, 2000);
    sendResponse({ status: 'reconnecting' });
    return;
  }

  if (request.action === 'disconnect') {
    console.log('⏹ ОТКЛЮЧЕНИЕ');
    var session = getTabSession(tabId);
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
    sendResponse({ status: 'disconnected', tabId: tabId });
    return;
  }

  if (request.action === 'connect') {
    var session = getTabSession(tabId);
    if (session.connecting) {
      sendResponse({ status: 'connecting', tabId: tabId });
      return;
    }
    if (session.connected) {
      sendResponse({ status: 'connected', tabId: tabId });
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

    safeSendMessage({
      action: 'statusUpdate',
      status: 'connecting',
      tabId: tabId
    });

    injectScriptDirectly(tabId);
    
    setTimeout(function() {
      sendMessageToInject(tabId, 'SF_CONNECT');
    }, 1500);
    
    setTimeout(function() {
      // Ask for status first, then allow the inject -> runtime statusUpdate round-trip
      // to complete before declaring the attempt disconnected.
      sendMessageToInject(tabId, 'SF_GET_STATUS');
      setTimeout(function() {
        var currentSession = getTabSession(tabId);
        currentSession.connecting = false;
        state._isConnecting = false;
        safeSendMessage({
          action: 'statusUpdate',
          status: currentSession.connected ? 'connected' : 'disconnected',
          tabId: tabId
        });
      }, 500);
    }, 3000);
    
    sendResponse({ status: 'connecting', tabId: tabId });
    return;
  }

  var actionMap = {
    'updateEQ': 'SF_UPDATE_EQ',
    'reset': 'SF_RESET',
    'setVolume': 'SF_SET_VOLUME',
    'setBass': 'SF_SET_BASS'
  };

  var type = actionMap[request.action];
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
  
  var interval = state._powerSaveMode ? 5000 : 3000;
  
  state._statusCheckInterval = setInterval(function() {
    if (state.currentTabId && state.isConnected && !state._isConnecting) {
      var session = getTabSession(state.currentTabId);
      if (session && session.injected && !state._failedTabs[state.currentTabId]) {
        sendMessageToInject(state.currentTabId, 'SF_GET_STATUS');
      }
    }
  }, 10000);
  
  state._activeTabInterval = setInterval(function() {
    findActiveTabWithAudio(function(tab) {
      if (!tab || !tab.id) return;
      var tabId = tab.id;
      
      if (state._failedTabs[tabId]) {
        return;
      }
      
      var session = getTabSession(tabId);
      if (session && session.shouldReconnect) {
        injectScriptDirectly(tabId);
        if (!session.injected) {
          setTimeout(function() {
            sendMessageToInject(tabId, 'SF_CONNECT');
          }, 1000);
        }
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
  
  Object.keys(state._injectAttempts).forEach(function(key) { delete state._injectAttempts[key]; });
  Object.keys(state._injectedTabs).forEach(function(key) { delete state._injectedTabs[key]; });
  Object.keys(state._failedTabs).forEach(function(key) { delete state._failedTabs[key]; });
  Object.keys(state._failureTimestamps).forEach(function(key) { delete state._failureTimestamps[key]; });
  Object.keys(state._tabSessions).forEach(function(key) { delete state._tabSessions[key]; });
  Object.keys(state._documentTokens).forEach(function(key) { delete state._documentTokens[key]; });
  Object.keys(state._lastSiteByTab).forEach(function(key) { delete state._lastSiteByTab[key]; });
}

startPeriodicChecks();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAll);
}

if (edgeAPI.alarms && edgeAPI.alarms.create) {
  edgeAPI.alarms.create('soundforge-night-mode', { periodInMinutes: 10 });
  edgeAPI.alarms.onAlarm.addListener(function(alarm) {
    if (alarm && alarm.name === 'soundforge-night-mode') checkNightModeAuto();
  });
}
setTimeout(checkNightModeAuto, 5000);

console.log('✅ SoundForge Background v3.22.8 Edge 151 готов!');
console.log('⌨️ Горячие клавиши:');
console.log('   Ctrl+Shift+U - активация расширения');
console.log('   Ctrl+Shift+E - включить/выключить эквалайзер');
console.log('   Ctrl+Shift+Y - следующий пресет');
console.log('   Ctrl+Shift+X - сброс всех настроек');
console.log('🌙 Ночной режим: автоматически с 22:00 до 07:00');
console.log('⚡ Режим энергосбережения: снижает частоту обновлений');
console.log('💾 Настройки сохраняются для каждого сайта');
console.log('📜 Ведется история изменений');