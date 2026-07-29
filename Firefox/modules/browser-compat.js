// ============================================
//  BROWSER-COMPAT.JS - Кроссбраузерная совместимость
//  Версия: 2.0.0
//  Полная поддержка Firefox 153.0esr
// ============================================

/**
 * Определение браузера
 */
export const Browser = {
  UNKNOWN: 'unknown',
  EDGE: 'edge',
  CHROME: 'chrome',
  FIREFOX: 'firefox',
  OPERA: 'opera',
  SAFARI: 'safari',
  BRAVE: 'brave',
  VIVALDI: 'vivaldi'
};

/**
 * Информация о браузере
 */
class BrowserInfo {
  constructor() {
    this._detect();
  }

  _detect() {
    const ua = navigator.userAgent.toLowerCase();
    const vendor = navigator.vendor || '';

    // Определение браузера
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

    // Дополнительная информация
    this.isChromium = this.name === Browser.CHROME || 
                     this.name === Browser.EDGE || 
                     this.name === Browser.OPERA || 
                     this.name === Browser.BRAVE || 
                     this.name === Browser.VIVALDI;
    this.isFirefox = this.name === Browser.FIREFOX;
    this.isSafari = this.name === Browser.SAFARI;
    this.isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
    this.isDesktop = !this.isMobile;
    
    // Версия в виде числа
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

// Создаем глобальный экземпляр
export const browserInfo = new BrowserInfo();

// ============================================
//  УНИВЕРСАЛЬНЫЙ API (Chrome / Firefox / Edge)
// ============================================

export class UniversalAPI {
  constructor() {
    // Определяем доступный API
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

  isAvailable() {
    return !!this._api;
  }

  isFirefox() {
    return this._isFirefox;
  }

  isChrome() {
    return this._isChrome;
  }

  getType() {
    return this._type;
  }

  get api() {
    return this._api;
  }

  // ============================================
  //  RUNTIME
  // ============================================

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

  // ============================================
  //  STORAGE
  // ============================================

  storageGet(keys = null) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.storage.local.get(keys)
            .then(resolve)
            .catch(reject);
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
          this._api.storage.local.set(data)
            .then(resolve)
            .catch(reject);
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
          this._api.storage.local.remove(keys)
            .then(resolve)
            .catch(reject);
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
          this._api.storage.local.clear()
            .then(resolve)
            .catch(reject);
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

  // ============================================
  //  TABS
  // ============================================

  tabsQuery(queryInfo) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.tabs.query(queryInfo)
            .then(resolve)
            .catch(reject);
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
          this._api.tabs.get(tabId)
            .then(resolve)
            .catch(reject);
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

  // ============================================
  //  SCRIPTING (Firefox использует tabs.executeScript)
  // ============================================

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

  // ============================================
  //  WEB NAVIGATION
  // ============================================

  onWebNavigationCompleted(callback) {
    if (!this._api) return;
    this._api.webNavigation.onCompleted.addListener(callback);
  }

  onWebNavigationHistoryStateUpdated(callback) {
    if (!this._api) return;
    this._api.webNavigation.onHistoryStateUpdated.addListener(callback);
  }

  // ============================================
  //  NOTIFICATIONS
  // ============================================

  notificationsCreate(options) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.notifications.create(options)
            .then(resolve)
            .catch(reject);
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

  // ============================================
  //  COMMANDS
  // ============================================

  onCommand(callback) {
    if (!this._api) return;
    this._api.commands.onCommand.addListener(callback);
  }

  // ============================================
  //  WINDOWS
  // ============================================

  windowsCreate(createData) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API not available'));
        return;
      }

      try {
        if (this._isFirefox) {
          this._api.windows.create(createData)
            .then(resolve)
            .catch(reject);
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
          this._api.windows.update(windowId, updateInfo)
            .then(resolve)
            .catch(reject);
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
          this._api.windows.getCurrent()
            .then(resolve)
            .catch(reject);
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

  // ============================================
  //  ACTION (Browser Action)
  // ============================================

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

  // ============================================
  //  ALARMS
  // ============================================

  alarmsCreate(name, alarmInfo) {
    if (!this._api) return;

    try {
      if (this._isFirefox) {
        this._api.alarms.create(name, alarmInfo);
      } else {
        this._api.alarms.create(name, alarmInfo);
      }
    } catch (e) {}
  }

  onAlarm(callback) {
    if (!this._api) return;
    this._api.alarms.onAlarm.addListener(callback);
  }

  // ============================================
  //  RUNTIME GET URL
  // ============================================

  getURL(path) {
    if (!this._api) return path;
    return this._api.runtime.getURL(path);
  }
}

// Создаем глобальный экземпляр
export const universalAPI = new UniversalAPI();

// ============================================
//  ПОЛИФИЛЛЫ ДЛЯ FIREFOX (chrome.* эмуляция)
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
//  КРОССБРАУЗЕРНЫЙ AudioContext
// ============================================

export function createCrossBrowserAudioContext(options = {}) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  
  if (!AudioContextClass) {
    console.error('[Compat] AudioContext не поддерживается в этом браузере');
    return null;
  }

  try {
    const context = new AudioContextClass({
      latencyHint: options.latencyHint || 'interactive',
      sampleRate: options.sampleRate || 48000
    });
    
    if (browserInfo.isFirefox && context.state === 'suspended') {
      console.log('[Compat] Firefox: AudioContext в состоянии suspended');
    }
    
    return context;
  } catch (e) {
    console.error('[Compat] Ошибка создания AudioContext:', e);
    return null;
  }
}

// ============================================
//  КРОССБРАУЗЕРНЫЙ captureStream
// ============================================

export function captureStreamFromElement(element) {
  if (!element) {
    console.error('[Compat] Элемент не передан');
    return null;
  }

  if (typeof element.captureStream === 'function') {
    try {
      const stream = element.captureStream();
      if (stream && stream.getAudioTracks().length > 0) {
        return stream;
      }
    } catch (e) {
      console.warn('[Compat] Ошибка captureStream:', e.message);
    }
  }

  if (typeof element.mozCaptureStream === 'function') {
    try {
      const stream = element.mozCaptureStream();
      if (stream && stream.getAudioTracks().length > 0) {
        console.log('[Compat] Используется mozCaptureStream (Firefox)');
        return stream;
      }
    } catch (e) {
      console.warn('[Compat] Ошибка mozCaptureStream:', e.message);
    }
  }

  if (typeof element.webkitCaptureStream === 'function') {
    try {
      const stream = element.webkitCaptureStream();
      if (stream && stream.getAudioTracks().length > 0) {
        console.log('[Compat] Используется webkitCaptureStream (Safari)');
        return stream;
      }
    } catch (e) {
      console.warn('[Compat] Ошибка webkitCaptureStream:', e.message);
    }
  }

  console.error('[Compat] Не удалось получить аудио-поток из элемента');
  return null;
}

// ============================================
//  КРОССБРАУЗЕРНАЯ ПРОВЕРКА ПОДДЕРЖКИ
// ============================================

export function checkAPISupport() {
  const support = {
    audioContext: !!(window.AudioContext || window.webkitAudioContext),
    captureStream: false,
    mozCaptureStream: false,
    webkitCaptureStream: false,
    chromeAPI: !!(typeof chrome !== 'undefined' && chrome.runtime),
    browserAPI: !!(typeof browser !== 'undefined' && browser.runtime),
    storage: !!window.localStorage,
    webAudio: false,
    canvas: !!window.CanvasRenderingContext2D,
    requestAnimationFrame: !!window.requestAnimationFrame,
    mutationObserver: !!window.MutationObserver,
    promises: !!window.Promise,
    fetch: !!window.fetch
  };

  try {
    const video = document.createElement('video');
    support.captureStream = typeof video.captureStream === 'function';
    support.mozCaptureStream = typeof video.mozCaptureStream === 'function';
    support.webkitCaptureStream = typeof video.webkitCaptureStream === 'function';
  } catch (e) {}

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    support.webAudio = true;
    ctx.close();
  } catch (e) {
    support.webAudio = false;
  }

  return support;
}

// ============================================
//  КРОССБРАУЗЕРНЫЙ localStorage
// ============================================

export class CrossBrowserStorage {
  constructor() {
    this._available = this._checkAvailability();
    this._fallback = {};
  }

  _checkAvailability() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('[Compat] localStorage недоступен, используем fallback');
      return false;
    }
  }

  setItem(key, value) {
    if (this._available) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn('[Compat] Ошибка записи в localStorage:', e);
        this._fallback[key] = value;
        return false;
      }
    } else {
      this._fallback[key] = value;
      return true;
    }
  }

  getItem(key) {
    if (this._available) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('[Compat] Ошибка чтения из localStorage:', e);
        return this._fallback[key] || null;
      }
    } else {
      return this._fallback[key] || null;
    }
  }

  removeItem(key) {
    if (this._available) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.warn('[Compat] Ошибка удаления из localStorage:', e);
        delete this._fallback[key];
        return false;
      }
    } else {
      delete this._fallback[key];
      return true;
    }
  }

  clear() {
    if (this._available) {
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        console.warn('[Compat] Ошибка очистки localStorage:', e);
        this._fallback = {};
        return false;
      }
    } else {
      this._fallback = {};
      return true;
    }
  }

  get length() {
    if (this._available) {
      try {
        return localStorage.length;
      } catch (e) {
        return Object.keys(this._fallback).length;
      }
    } else {
      return Object.keys(this._fallback).length;
    }
  }
}

export const crossBrowserStorage = new CrossBrowserStorage();

// ============================================
//  КРОССБРАУЗЕРНЫЙ RAF
// ============================================

export function safeRequestAnimationFrame(callback) {
  const raf = window.requestAnimationFrame || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame || 
              window.msRequestAnimationFrame;

  if (raf) {
    return raf.call(window, callback);
  } else {
    return setTimeout(callback, 16);
  }
}

export function safeCancelAnimationFrame(id) {
  const caf = window.cancelAnimationFrame || 
              window.webkitCancelAnimationFrame || 
              window.mozCancelAnimationFrame || 
              window.msCancelAnimationFrame;

  if (caf) {
    caf.call(window, id);
  } else {
    clearTimeout(id);
  }
}

// ============================================
//  КРОССБРАУЗЕРНЫЙ MutationObserver
// ============================================

export function createSafeMutationObserver(callback) {
  const Observer = window.MutationObserver || 
                    window.webkitMutationObserver || 
                    window.MozMutationObserver;

  if (!Observer) {
    console.warn('[Compat] MutationObserver не поддерживается');
    return null;
  }

  try {
    return new Observer(callback);
  } catch (e) {
    console.error('[Compat] Ошибка создания MutationObserver:', e);
    return null;
  }
}

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
  Browser,
  browserInfo,
  UniversalAPI,
  universalAPI,
  createCrossBrowserAudioContext,
  captureStreamFromElement,
  checkAPISupport,
  CrossBrowserStorage,
  crossBrowserStorage,
  safeRequestAnimationFrame,
  safeCancelAnimationFrame,
  createSafeMutationObserver
};