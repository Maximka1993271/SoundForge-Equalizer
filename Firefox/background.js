// ============================================
//  BACKGROUND.JS - v3.22.8 (FIREFOX 153.0esr)
//  ПОЛНЫЙ КОД БЕЗ importScripts()
// ============================================

// ============================================
//  BROWSER-COMPAT (ВСТРОЕННЫЙ КОД)
// ============================================

const Browser = {
  UNKNOWN: 'unknown',
  EDGE: 'edge',
  CHROME: 'chrome',
  FIREFOX: 'firefox',
  OPERA: 'opera',
  SAFARI: 'safari',
  BRAVE: 'brave',
  VIVALDI: 'vivaldi'
};

class BrowserInfo {
  constructor() {
    this._detect();
  }

  _detect() {
    const ua = navigator.userAgent.toLowerCase();
    const vendor = navigator.vendor || '';

    if (ua.includes('firefox') || ua.includes('fxios')) {
      this.name = Browser.FIREFOX;
      this.version = this._extractVersion(ua, 'firefox/');
    } else if (ua.includes('edg/')) {
      this.name = Browser.EDGE;
      this.version = this._extractVersion(ua, 'edg/');
    } else if (ua.includes('opr/') || ua.includes('opera')) {
      this.name = Browser.OPERA;
      this.version = this._extractVersion(ua, 'opr/');
    } else if (ua.includes('brave')) {
      this.name = Browser.BRAVE;
      this.version = this._extractVersion(ua, 'chrome/');
    } else if (ua.includes('vivaldi')) {
      this.name = Browser.VIVALDI;
      this.version = this._extractVersion(ua, 'vivaldi/');
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      this.name = Browser.SAFARI;
      this.version = this._extractVersion(ua, 'version/');
    } else if (ua.includes('chrome') || vendor.includes('Google')) {
      this.name = Browser.CHROME;
      this.version = this._extractVersion(ua, 'chrome/');
    } else {
      this.name = Browser.UNKNOWN;
      this.version = '0';
    }

    this.isChromium = this.name === Browser.CHROME || 
                     this.name === Browser.EDGE || 
                     this.name === Browser.OPERA || 
                     this.name === Browser.BRAVE || 
                     this.name === Browser.VIVALDI;
    this.isFirefox = this.name === Browser.FIREFOX;
    this.isSafari = this.name === Browser.SAFARI;
    this.isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
    this.isDesktop = !this.isMobile;
    this.versionNumber = parseFloat(this.version);
  }

  _extractVersion(ua, marker) {
    const index = ua.indexOf(marker);
    if (index === -1) return '0';
    const start = index + marker.length;
    const end = ua.indexOf('.', start);
    if (end === -1) return ua.substring(start);
    return ua.substring(start, end);
  }

  isMinVersion(major, minor = 0) {
    const parts = this.version.split('.');
    const verMajor = parseInt(parts[0]) || 0;
    const verMinor = parseInt(parts[1]) || 0;
    if (verMajor > major) return true;
    if (verMajor === major && verMinor >= minor) return true;
    return false;
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      versionNumber: this.versionNumber,
      isChromium: this.isChromium,
      isFirefox: this.isFirefox,
      isSafari: this.isSafari,
      isMobile: this.isMobile,
      isDesktop: this.isDesktop,
      userAgent: navigator.userAgent
    };
  }
}

const browserInfo = new BrowserInfo();

// ============================================
//  УНИВЕРСАЛЬНЫЙ API
// ============================================

class UniversalAPI {
  constructor() {
    if (typeof browser !== 'undefined' && browser.runtime) {
      this._api = browser;
      this._type = 'browser';
      this._isFirefox = true;
      this._isChrome = false;
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
      this._api = chrome;
      this._type = 'chrome';
      this._isFirefox = false;
      this._isChrome = true;
    } else {
      this._api = null;
      this._type = 'none';
      this._isFirefox = false;
      this._isChrome = false;
    }
  }

  isAvailable() { return !!this._api; }
  isFirefox() { return this._isFirefox; }
  isChrome() { return this._isChrome; }
  getType() { return this._type; }
  get api() { return this._api; }

  sendMessage(message, callback = null) {
    if (!this._api) {
      if (callback) callback(null);
      return Promise.reject(new Error('API not available'));
    }

    try {
      if (this._isFirefox) {
        const promise = this._api.runtime.sendMessage(message);
        if (callback) {
          promise.then(callback).catch(() => callback(null));
        }
        return promise;
      } else {
        return new Promise((resolve, reject) => {
          this._api.runtime.sendMessage(message, (response) => {
            if (this._api.runtime.lastError) {
              const err = this._api.runtime.lastError;
              if (callback) callback(null);
              reject(err);
            } else {
              if (callback) callback(response);
              resolve(response);
            }
          });
        });
      }
    } catch (e) {
      if (callback) callback(null);
      return Promise.reject(e);
    }
  }

  onMessage(callback) {
    if (!this._api) return;
    this._api.runtime.onMessage.addListener(callback);
  }

  storageGet(keys = null) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.storage.local.get(keys).then(resolve).catch(reject);
        } else {
          this._api.storage.local.get(keys, (result) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  storageSet(data) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.storage.local.set(data).then(resolve).catch(reject);
        } else {
          this._api.storage.local.set(data, () => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve();
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  storageRemove(keys) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.storage.local.remove(keys).then(resolve).catch(reject);
        } else {
          this._api.storage.local.remove(keys, () => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve();
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  storageClear() {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.storage.local.clear().then(resolve).catch(reject);
        } else {
          this._api.storage.local.clear(() => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve();
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  onStorageChanged(callback) {
    if (!this._api) return;
    this._api.storage.onChanged.addListener(callback);
  }

  tabsQuery(queryInfo) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.tabs.query(queryInfo).then(resolve).catch(reject);
        } else {
          this._api.tabs.query(queryInfo, (tabs) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(tabs);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  tabsGet(tabId) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.tabs.get(tabId).then(resolve).catch(reject);
        } else {
          this._api.tabs.get(tabId, (tab) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(tab);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  executeScript(tabId, files) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.tabs.executeScript(tabId, { file: files[0] })
            .then(resolve)
            .catch(reject);
        } else {
          this._api.scripting.executeScript({
            target: { tabId: tabId },
            files: files
          }, (results) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(results);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  executeScriptFunction(tabId, func, args = []) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          const code = `(${func.toString()}).apply(null, ${JSON.stringify(args)})`;
          this._api.tabs.executeScript(tabId, { code: code })
            .then(resolve)
            .catch(reject);
        } else {
          this._api.scripting.executeScript({
            target: { tabId: tabId },
            func: func,
            args: args
          }, (results) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(results);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  onWebNavigationCompleted(callback) {
    if (!this._api) return;
    this._api.webNavigation.onCompleted.addListener(callback);
  }

  onWebNavigationHistoryStateUpdated(callback) {
    if (!this._api) return;
    this._api.webNavigation.onHistoryStateUpdated.addListener(callback);
  }

  notificationsCreate(options) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.notifications.create(options).then(resolve).catch(reject);
        } else {
          this._api.notifications.create(options, (notificationId) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(notificationId);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  onNotificationClicked(callback) {
    if (!this._api) return;
    this._api.notifications.onClicked.addListener(callback);
  }

  onNotificationButtonClicked(callback) {
    if (!this._api) return;
    this._api.notifications.onButtonClicked.addListener(callback);
  }

  onCommand(callback) {
    if (!this._api) return;
    this._api.commands.onCommand.addListener(callback);
  }

  windowsCreate(createData) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.windows.create(createData).then(resolve).catch(reject);
        } else {
          this._api.windows.create(createData, (window) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(window);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  windowsUpdate(windowId, updateInfo) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.windows.update(windowId, updateInfo).then(resolve).catch(reject);
        } else {
          this._api.windows.update(windowId, updateInfo, (window) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(window);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  windowsGetCurrent() {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.windows.getCurrent().then(resolve).catch(reject);
        } else {
          this._api.windows.getCurrent((window) => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve(window);
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  setIcon(details) {
    if (!this._api) return Promise.reject(new Error('API not available'));

    try {
      if (this._isFirefox) {
        return this._api.browserAction.setIcon(details);
      } else {
        return new Promise((resolve, reject) => {
          this._api.action.setIcon(details, () => {
            if (this._api.runtime.lastError) {
              reject(this._api.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  setBadgeText(details) {
    if (!this._api) return;

    try {
      if (this._isFirefox) {
        this._api.browserAction.setBadgeText(details);
      } else {
        this._api.action.setBadgeText(details);
      }
    } catch (e) {}
  }

  setBadgeBackgroundColor(details) {
    if (!this._api) return;

    try {
      if (this._isFirefox) {
        this._api.browserAction.setBadgeBackgroundColor(details);
      } else {
        this._api.action.setBadgeBackgroundColor(details);
      }
    } catch (e) {}
  }

  alarmsCreate(name, alarmInfo) {
    if (!this._api) return;
    try {
      this._api.alarms.create(name, alarmInfo);
    } catch (e) {}
  }

  onAlarm(callback) {
    if (!this._api) return;
    this._api.alarms.onAlarm.addListener(callback);
  }

  getURL(path) {
    if (!this._api) return path;
    return this._api.runtime.getURL(path);
  }
}

const api = new UniversalAPI();

console.log('🎛️ SoundForge Background v3.22.8 (Firefox) запущен');

// ============================================
//  ПОЛИФИЛЛЫ ДЛЯ FIREFOX
// ============================================

if (typeof chrome === 'undefined' && typeof browser !== 'undefined') {
  window.chrome = {
    runtime: {
      sendMessage: (message, callback) => {
        browser.runtime.sendMessage(message).then(callback).catch(() => callback(null));
      },
      onMessage: {
        addListener: (callback) => browser.runtime.onMessage.addListener(callback)
      },
      lastError: null,
      getURL: (path) => browser.runtime.getURL(path)
    },
    storage: {
      local: {
        get: (keys, callback) => {
          browser.storage.local.get(keys).then(result => callback(result)).catch(() => callback({}));
        },
        set: (data, callback) => {
          browser.storage.local.set(data).then(callback).catch(callback);
        },
        remove: (keys, callback) => {
          browser.storage.local.remove(keys).then(callback).catch(callback);
        },
        clear: (callback) => {
          browser.storage.local.clear().then(callback).catch(callback);
        }
      },
      onChanged: {
        addListener: (callback) => browser.storage.onChanged.addListener(callback)
      }
    },
    tabs: {
      query: (queryInfo, callback) => {
        browser.tabs.query(queryInfo).then(callback).catch(() => callback([]));
      },
      get: (tabId, callback) => {
        browser.tabs.get(tabId).then(callback).catch(() => callback(null));
      },
      executeScript: (tabId, details, callback) => {
        if (details.file) {
          browser.tabs.executeScript(tabId, { file: details.file }).then(callback).catch(callback);
        } else if (details.code) {
          browser.tabs.executeScript(tabId, { code: details.code }).then(callback).catch(callback);
        }
      },
      onActivated: {
        addListener: (callback) => browser.tabs.onActivated.addListener(callback)
      },
      onUpdated: {
        addListener: (callback) => browser.tabs.onUpdated.addListener(callback)
      },
      onRemoved: {
        addListener: (callback) => browser.tabs.onRemoved.addListener(callback)
      }
    },
    scripting: {
      executeScript: (details, callback) => {
        const tabId = details.target.tabId;
        if (details.files && details.files.length > 0) {
          browser.tabs.executeScript(tabId, { file: details.files[0] }).then(callback).catch(callback);
        } else if (details.func) {
          const code = `(${details.func.toString()}).apply(null, ${JSON.stringify(details.args || [])})`;
          browser.tabs.executeScript(tabId, { code: code }).then(callback).catch(callback);
        }
      }
    },
    webNavigation: {
      onCompleted: {
        addListener: (callback) => browser.webNavigation.onCompleted.addListener(callback)
      },
      onHistoryStateUpdated: {
        addListener: (callback) => browser.webNavigation.onHistoryStateUpdated.addListener(callback)
      }
    },
    notifications: {
      create: (options, callback) => {
        browser.notifications.create(options).then(callback).catch(callback);
      },
      onClicked: {
        addListener: (callback) => browser.notifications.onClicked.addListener(callback)
      },
      onButtonClicked: {
        addListener: (callback) => browser.notifications.onButtonClicked.addListener(callback)
      }
    },
    commands: {
      onCommand: {
        addListener: (callback) => browser.commands.onCommand.addListener(callback)
      }
    },
    windows: {
      create: (createData, callback) => {
        browser.windows.create(createData).then(callback).catch(callback);
      },
      update: (windowId, updateInfo, callback) => {
        browser.windows.update(windowId, updateInfo).then(callback).catch(callback);
      },
      getCurrent: (callback) => {
        browser.windows.getCurrent().then(callback).catch(callback);
      },
      onCreated: {
        addListener: (callback) => browser.windows.onCreated.addListener(callback)
      },
      onRemoved: {
        addListener: (callback) => browser.windows.onRemoved.addListener(callback)
      }
    },
    action: {
      setIcon: (details, callback) => {
        browser.browserAction.setIcon(details).then(callback).catch(callback);
      },
      setBadgeText: (details) => {
        browser.browserAction.setBadgeText(details);
      },
      setBadgeBackgroundColor: (details) => {
        browser.browserAction.setBadgeBackgroundColor(details);
      }
    },
    alarms: {
      create: (name, alarmInfo) => {
        browser.alarms.create(name, alarmInfo);
      },
      onAlarm: {
        addListener: (callback) => browser.alarms.onAlarm.addListener(callback)
      }
    }
  };
}

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
//  ВСЕ ПРЕСЕТЫ
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
  api.storageGet(['soundforgeConnected', 'soundforgeAutoConnect', 'nightMode', 'powerSaveMode', 'lastSite', 'settingsHistory', 'selectedPreset'])
    .then((result) => {
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
    })
    .catch(() => {});
}

function saveConnectedState(connected) {
  api.storageSet({ 
    soundforgeConnected: connected,
    soundforgeAutoConnect: state._autoConnectEnabled
  }).catch(() => {});
}

loadSavedState();

function safeSendMessage(message) {
  try {
    api.sendMessage(message).catch(() => {});
  } catch {}
}

// ============================================
//  ОБНОВЛЕНИЕ ИКОНКИ
// ============================================

function updateIcon(isActive) {
  try {
    const iconPath = isActive ? 'icons/SoundForge.png' : 'icons/SoundForge.png';
    
    setTimeout(() => {
      try {
        api.setIcon({
          path: {
            16: iconPath,
            48: iconPath,
            128: iconPath
          }
        }).catch(() => {});
      } catch (e) {}
    }, 100);
    
    if (isActive) {
      api.setBadgeText({ text: '🔊' });
      api.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      api.setBadgeText({ text: '⛔' });
      api.setBadgeBackgroundColor({ color: '#888888' });
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
  
  if (lowerUrl.startsWith('chrome-extension://') || lowerUrl.startsWith('moz-extension://')) {
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
  
  if (lowerUrl.startsWith('moz-extension://')) {
    return false;
  }
  
  return true;
}

// ============================================
//  ПОИСК ВКЛАДКИ С АУДИО
// ============================================

function findActiveTabWithAudio(callback) {
  api.tabsQuery({ active: true, currentWindow: true })
    .then((tabs) => {
      if (!tabs || tabs.length === 0) {
        api.tabsQuery({}).then((allTabs) => {
          findBestTab(allTabs, callback);
        }).catch(() => callback(null));
        return;
      }
      
      const tab = tabs[0];
      if (tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://')) {
        callback(tab);
        return;
      }
      
      api.tabsQuery({}).then((allTabs) => {
        findBestTab(allTabs, callback);
      }).catch(() => callback(null));
    })
    .catch(() => callback(null));
}

function findBestTab(tabs, callback) {
  for (const tab of tabs) {
    if (tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://')) {
      if (tab.audible === true) {
        callback(tab);
        return;
      }
    }
  }
  
  for (const tab of tabs) {
    if (tab.url && tab.url.includes('youtube.com') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('moz-extension://')) {
      callback(tab);
      return;
    }
  }
  
  for (const tab of tabs) {
    if (tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://')) {
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
    
    api.executeScriptFunction(tabId, () => {
      if (window.SoundForgeInject) return true;
      if (window._soundforge_loaded) return true;
      return false;
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
  
  api.tabsGet(tabId)
    .then((tab) => {
      if (!tab || !tab.url || !canInjectScript(tab.url)) {
        console.log(`⛔ Пропускаем внедрение: ${tab?.url || 'unknown'}`);
        return;
      }
      doInjectScriptDirectly(tabId, retryCount);
    })
    .catch(() => {});
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

    api.executeScript(tabId, ['inject.js'])
      .then(() => {
        console.log(`📝 inject.js внедрен, ждем инициализацию...`);
        
        let checkCount = 0;
        const maxChecks = 10;
        const checkDelay = 300;

        function checkInjection() {
          checkCount++;
          
          api.executeScriptFunction(tabId, () => {
            return !!(window.SoundForgeInject || window._soundforge_loaded);
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
  
  api.tabsGet(tabId)
    .then((tab) => {
      if (!tab || !tab.url) {
        console.log(`⛔ Нет URL для таба ${tabId}`);
        return;
      }
      
      if (tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
        console.log(`⏳ Страница расширения, пропускаем отправку ${type}`);
        return;
      }
      
      if (!canSendMessage(tab.url)) {
        console.log(`⛔ Пропускаем отправку ${type} на: ${tab.url}`);
        return;
      }
      
      doSendMessageToInject(tabId, type, data);
    })
    .catch(() => {});
}

function doSendMessageToInject(tabId, type, data) {
  isInjectLoaded(tabId).then((loaded) => {
    if (!loaded) {
      console.log(`⏳ inject.js не загружен, внедряем для отправки ${type}`);
      api.tabsGet(tabId).then((tab) => {
        if (tab && tab.url && canInjectScript(tab.url)) {
          injectScriptDirectly(tabId);
          setTimeout(() => {
            sendMessageToInject(tabId, type, data);
          }, 2000);
        }
      }).catch(() => {});
      return;
    }
    
    api.executeScriptFunction(tabId, (msgType, msgData) => {
      if (window.SoundForgeInject) {
        window.SoundForgeInject.handleMessage(msgType, msgData);
        return true;
      }
      if (!window._soundforge_pending) window._soundforge_pending = [];
      window._soundforge_pending.push({ type: msgType, data: msgData });
      return false;
    }, [type, data || {}])
    .catch((err) => {
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
  
  api.executeScriptFunction(tabId, () => {
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
    api.sendMessage(message).catch(() => {});
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
  api.storageSet({ selectedPreset: nextPresetName }).catch(() => {});
  
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
  
  api.executeScriptFunction(tabId, () => {
    if (window.SoundForgeInject) {
      const s = window.SoundForgeInject.getState();
      return s && s.isActive;
    }
    return false;
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
  
  api.storageGet(['siteSettings'])
    .then((result) => {
      const data = result.siteSettings || {};
      data[key] = {
        settings: settings,
        updated: Date.now(),
        url: url,
        domain: domain
      };
      api.storageSet({ siteSettings: data }).catch(() => {});
    })
    .catch(() => {});
}

function loadSiteSettings(url) {
  const domain = getSiteDomain(url);
  if (!domain) return Promise.resolve(null);
  
  const key = 'site_' + domain.replace(/[^a-zA-Z0-9]/g, '_');
  
  return api.storageGet(['siteSettings'])
    .then((result) => {
      const data = result.siteSettings || {};
      const siteData = data[key];
      if (siteData) {
        console.log(`📥 Загружены настройки для сайта: ${domain}`);
        return siteData.settings;
      }
      return null;
    })
    .catch(() => null);
}

// ============================================
//  СОБЫТИЯ БРАУЗЕРА
// ============================================

api.onWebNavigationCompleted((details) => {
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
          api.sendMessage({
            action: 'applySiteSettings',
            settings: settings
          }).catch(() => {});
        }
      });
      
      api.storageGet(['autoDisableOnSiteChange'])
        .then((result) => {
          const autoDisable = result.autoDisableOnSiteChange !== false;
          if (autoDisable && state.isConnected) {
            console.log(`🔇 Автовыключение: смена сайта ${state._lastSite} → ${currentSite}`);
            state.isConnected = false;
            state._autoConnectEnabled = false;
            saveConnectedState(false);
            updateIcon(false);
            safeSendMessage({ action: 'statusUpdate', status: 'disconnected' });
            
            try {
              api.notificationsCreate({
                type: 'basic',
                iconUrl: 'icons/SoundForge.png',
                title: '🔇 SoundForge',
                message: 'Эквалайзер выключен при смене сайта',
                priority: 1
              }).catch(() => {});
            } catch (e) {}
          }
        })
        .catch(() => {});
    }
    
    state._lastSite = currentSite;
    api.storageSet({ lastSite: currentSite }).catch(() => {});
    
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

api.onWebNavigationHistoryStateUpdated((details) => {
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

// ============================================
//  СОБЫТИЯ ВКЛАДОК
// ============================================

api.tabsQuery({ active: true, currentWindow: true })
  .then(() => {
    api._api.tabs.onActivated.addListener((activeInfo) => {
      api.tabsGet(activeInfo.tabId)
        .then((tab) => {
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
        })
        .catch(() => {});
    });

    api._api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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

    api._api.tabs.onRemoved.addListener((tabId) => {
      if (tabId === state.currentTabId) {
        console.log('🔴 Вкладка закрыта');
        state.currentTabId = null;
        delete state._injectedTabs[tabId];
        delete state._failedTabs[tabId];
        delete state._failureTimestamps[tabId];
      }
    });
  })
  .catch(() => {});

// ============================================
//  СОБЫТИЯ ОКОН
// ============================================

api._api.windows.onCreated.addListener((window) => {
  if (window.type === 'popup' && window.url && window.url.includes('window.html')) {
    state._windowId = window.id;
    console.log('🪟 Окно открыто, ID:', window.id);
  }
});

api._api.windows.onRemoved.addListener((windowId) => {
  if (windowId === state._windowId) {
    state._windowId = null;
    console.log('🪟 Окно закрыто');
  }
});

// ============================================
//  ГОРЯЧИЕ КЛАВИШИ
// ============================================

api.onCommand((command) => {
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
  api.sendMessage({ action: 'reset', fullReset: true }).catch(() => {});
  api.storageClear()
    .then(() => {
      state.isConnected = false;
      state._autoConnectEnabled = false;
      state._nightMode = false;
      state._powerSaveMode = false;
      state._currentPreset = 'flat';
      saveConnectedState(false);
      updateIcon(false);
      notifyWindows({ action: 'settingsReset' });
      showNotification('🔄 SoundForge', 'Все настройки сброшены', 'warning');
    })
    .catch(() => {});
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
  
  api.storageGet(['settingsHistory'])
    .then((result) => {
      let history = result.settingsHistory || [];
      history.push(entry);
      if (history.length > 1000) {
        history = history.slice(-1000);
      }
      state._history = history;
      api.storageSet({ settingsHistory: history }).catch(() => {});
    })
    .catch(() => {});
}

function getHistory() {
  return api.storageGet(['settingsHistory'])
    .then((result) => result.settingsHistory || [])
    .catch(() => []);
}

function clearHistory() {
  api.storageSet({ settingsHistory: [] })
    .then(() => {
      state._history = [];
      console.log('🗑️ История очищена');
    })
    .catch(() => {});
}

// ============================================
//  НОЧНОЙ РЕЖИМ
// ============================================

function toggleNightMode() {
  state._nightMode = !state._nightMode;
  api.storageSet({ nightMode: state._nightMode }).catch(() => {});
  
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
  api.storageSet({ powerSaveMode: state._powerSaveMode }).catch(() => {});
  
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
    api.notificationsCreate({
      type: 'basic',
      iconUrl: 'icons/SoundForge.png',
      title: title,
      message: message,
      priority: 1
    }).catch(() => {});
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
    api.storageGet(['nightModeAuto'])
      .then((result) => {
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
      })
      .catch(() => {});
  } catch (e) {
    console.warn('⚠️ Ошибка в checkNightModeAuto:', e);
  }
}

// ============================================
//  ОБРАБОТЧИК СООБЩЕНИЙ
// ============================================

api.onMessage((request, sender, sendResponse) => {
  console.log('📨 Получено сообщение:', request.action);

  if (request.action === 'resize_window') {
    console.log('🪟 Resizing window:', request.width, 'x', request.height);
    api.windowsGetCurrent()
      .then((win) => {
        return api.windowsUpdate(win.id, {
          width: request.width,
          height: request.height,
          left: request.left || 0,
          top: request.top || 0
        });
      })
      .then(() => {
        sendResponse({ status: 'ok' });
      })
      .catch((err) => {
        sendResponse({ status: 'error', message: err.message });
      });
    return true;
  }
  
  if (request.action === 'open_window') {
    console.log('🪟 Открываем окно эквалайзера');
    api.windowsCreate({
      url: api.getURL('window.html'),
      type: 'popup',
      width: 500,
      height: 750,
      top: 100,
      left: 100
    })
    .then((window) => {
      console.log('🪟 Окно эквалайзера открыто');
      state._windowId = window.id;
      sendResponse({ status: 'ok' });
    })
    .catch((err) => {
      console.warn('⚠️ Ошибка открытия окна:', err);
      sendResponse({ status: 'error', message: err.message });
    });
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
    api.storageGet(null)
      .then((data) => {
        const exportData = {
          version: '3.22.8',
          timestamp: Date.now(),
          settings: data
        };
        sendResponse({ status: 'ok', data: JSON.stringify(exportData) });
      })
      .catch((err) => {
        sendResponse({ status: 'error', message: err.message });
      });
    return true;
  }

  if (request.action === 'importSettings') {
    try {
      const importData = JSON.parse(request.data);
      if (importData.settings) {
        api.storageSet(importData.settings)
          .then(() => {
            loadSavedState();
            sendResponse({ status: 'ok' });
          })
          .catch((err) => {
            sendResponse({ status: 'error', message: err.message });
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
      api.storageSet({ selectedPreset: request.preset }).catch(() => {});
      
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
    const isFromExtension = sender && sender.tab && sender.tab.url && 
      (sender.tab.url.startsWith('chrome-extension://') || sender.tab.url.startsWith('moz-extension://'));
    
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
        
        if (tab.url && (tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://'))) {
          console.log(`⛔ Активная вкладка - страница расширения, пропускаем`);
          sendResponse({ status: 'extension_page' });
          return;
        }
        
        handleTabAction(request, tabId, sendResponse);
      });
      return true;
    }
    
    api.tabsQuery({ active: true, currentWindow: true })
      .then((tabs) => {
        if (!tabs || tabs.length === 0) {
          sendResponse({ status: 'no_tab' });
          return;
        }

        const tabId = tabs[0].id;
        
        api.tabsGet(tabId)
          .then((tab) => {
            if (tab && tab.url && isSystemUrl(tab.url)) {
              console.log(`⛔ Пропускаем действие на системной странице: ${tab.url}`);
              sendResponse({ status: 'system_page' });
              return;
            }
            
            if (tab && tab.url && (tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://'))) {
              console.log(`⛔ Активная вкладка - страница расширения, пропускаем`);
              sendResponse({ status: 'extension_page' });
              return;
            }
            
            handleTabAction(request, tabId, sendResponse);
          })
          .catch(() => sendResponse({ status: 'error' }));
      })
      .catch(() => sendResponse({ status: 'error' }));
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

console.log('✅ SoundForge Background v3.22.8 (Firefox) готов!');
console.log('⌨️ Горячие клавиши:');
console.log('   Ctrl+Shift+U - активация расширения');
console.log('   Ctrl+Shift+E - включить/выключить эквалайзер');
console.log('   Ctrl+Shift+Y - следующий пресет');
console.log('   Ctrl+Shift+X - сброс всех настроек');
console.log('🌙 Ночной режим: автоматически с 22:00 до 07:00');
console.log('⚡ Режим энергосбережения: снижает частоту обновлений');
console.log('💾 Настройки сохраняются для каждого сайта');
console.log('📜 Ведется история изменений');
console.log('🦊 Работает в Firefox 153.0esr!');