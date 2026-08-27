// ============================================
//  BROWSER-COMPAT.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  Кроссбраузерная совместимость
//  Версия: 1.0.0
//  Обеспечивает работу во всех браузерах
//  FIREFOX 153 OPTIMIZED: детекция Firefox 153
// ============================================

/**
 * Определение браузера
 */
export const Browser = {
  UNKNOWN: 'unknown',
  FIREFOX: 'firefox'
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

    if (ua.includes('firefox')) {
      this.name = Browser.FIREFOX;
      this.version = this._extractVersion(ua, 'firefox/');
    } else {
      this.name = Browser.UNKNOWN;
      this.version = '0';
    }

    this.isFirefox = this.name === Browser.FIREFOX;
    this.isSafari = false;
    this.isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
    this.isDesktop = !this.isMobile;
    this.versionNumber = parseFloat(this.version);
    this.isFirefox153 = this.name === Browser.FIREFOX && this.isMinVersion(153, 1);
  }

  _extractVersion(ua, marker) {
    const index = ua.indexOf(marker);
    if (index === -1) return '0';
    const start = index + marker.length;
    const match = ua.substring(start).match(/^\d+(?:\.\d+){0,3}/);
    return match ? match[0] : '0';
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
      isFirefox: this.isFirefox,
      isSafari: this.isSafari,
      isFirefox153: this.isFirefox153,
      isMobile: this.isMobile,
      isDesktop: this.isDesktop,
      userAgent: navigator.userAgent
    };
  }
}

// Создаем глобальный экземпляр
export const browserInfo = new BrowserInfo();

// ============================================
//  ПОЛИФИЛЛЫ И FALLBACK-МЕХАНИЗМЫ
// ============================================

/**
 * Кроссбраузерный AudioContext
 */
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

    
    return context;
  } catch (e) {
    console.error('[Compat] Ошибка создания AudioContext:', e);
    return null;
  }
}

/**
 * Кроссбраузерный captureStream
 */
export function captureStreamFromElement(element) {
  if (!element) {
    console.error('[Compat] Элемент не передан');
    return null;
  }

  // Способ 1: Стандартный captureStream
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

  // Способ 2: mozCaptureStream (Firefox)
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

  // Способ 3: webkitCaptureStream (Safari)
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

  // Способ 4: Альтернативный подход через MediaStream (экспериментальный)
  try {
    if (element.srcObject) {
      const stream = element.srcObject;
      if (stream && stream.getAudioTracks().length > 0) {
        console.log('[Compat] Используется srcObject как источник');
        return stream;
      }
    }
  } catch (e) {
    // Игнорируем
  }

  console.error('[Compat] Не удалось получить аудио-поток из элемента');
  return null;
}

/**
 * Кроссбраузерная проверка поддержки API
 */
export function checkAPISupport() {
  const support = {
    audioContext: !!(window.AudioContext || window.webkitAudioContext),
    captureStream: false,
    mozCaptureStream: false,
    webkitCaptureStream: false,
    firefoxAPI: !!globalThis.browser?.runtime,
    storage: !!window.localStorage,
    webAudio: false,
    canvas: !!window.CanvasRenderingContext2D,
    requestAnimationFrame: !!window.requestAnimationFrame,
    mutationObserver: !!window.MutationObserver,
    promises: !!window.Promise,
    fetch: !!window.fetch
  };

  // Проверяем captureStream
  try {
    const video = document.createElement('video');
    support.captureStream = typeof video.captureStream === 'function';
    support.mozCaptureStream = typeof video.mozCaptureStream === 'function';
    support.webkitCaptureStream = typeof video.webkitCaptureStream === 'function';
  } catch (e) {
    // Игнорируем
  }

  // Проверяем Web Audio
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    support.webAudio = true;
    ctx.close();
  } catch (e) {
    support.webAudio = false;
  }

  // Firefox 153 specific
  support.isFirefox153 = browserInfo.isFirefox153;

  return support;
}

// ============================================
//  КРОССБРАУЗЕРНЫЙ API (FIREFOX 153 OPTIMIZED)
// ============================================

/**
 * Универсальный доступ к расширению API
 */
export class ExtensionAPI {
  constructor() {
    this._useFirefox = !!globalThis.browser?.runtime;
    this._api = null;
    
    if (this._useFirefox) {
      this._api = globalThis.browser;
    } else {
      console.warn('[Compat] API расширения не доступно');
    }
  }

  /**
   * Проверка доступности API
   */
  isAvailable() {
    return !!this._api;
  }

  /**
   * Отправка сообщения
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API не доступно'));
        return;
      }

      try {
        // Firefox используют колбэк
        this._api.runtime.sendMessage(message, (response) => {
          if (this._api.runtime.lastError) {
            reject(this._api.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Сохранение в storage
   */
  storageSet(data) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API не доступно'));
        return;
      }

      try {
        this._api.storage.local.set(data, () => {
          if (this._api.runtime && this._api.runtime.lastError) {
            reject(this._api.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Получение из storage
   */
  storageGet(keys = null) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API не доступно'));
        return;
      }

      try {
        this._api.storage.local.get(keys, (result) => {
          if (this._api.runtime && this._api.runtime.lastError) {
            reject(this._api.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Очистка storage
   */
  storageClear() {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API не доступно'));
        return;
      }

      try {
        this._api.storage.local.clear(() => {
          if (this._api.runtime && this._api.runtime.lastError) {
            reject(this._api.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Получение текущей вкладки
   */
  getCurrentTab() {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API не доступно'));
        return;
      }

      try {
        this._api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (this._api.runtime && this._api.runtime.lastError) {
            reject(this._api.runtime.lastError);
          } else {
            resolve(tabs);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Выполнение скрипта на странице
   */
  executeScript(tabId, script) {
    return new Promise((resolve, reject) => {
      if (!this._api) {
        reject(new Error('API не доступно'));
        return;
      }

      try {
        const options = {
          target: { tabId: tabId },
          files: Array.isArray(script) ? script : [script]
        };

        this._api.scripting.executeScript(options, (results) => {
          if (this._api.runtime && this._api.runtime.lastError) {
            reject(this._api.runtime.lastError);
          } else {
            resolve(results);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}

// Создаем глобальный экземпляр
export const extensionAPI = new ExtensionAPI();

// ============================================
//  КРОССБРАУЗЕРНЫЙ localStorage
// ============================================

/**
 * Безопасная работа с localStorage
 */
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

/**
 * Кроссбраузерный requestAnimationFrame
 */
export function safeRequestAnimationFrame(callback) {
  const raf = window.requestAnimationFrame || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame || 
              window.msRequestAnimationFrame;

  if (raf) {
    return raf.call(window, callback);
  } else {
    // Fallback через setTimeout
    return setTimeout(callback, 16);
  }
}

/**
 * Кроссбраузерный cancelAnimationFrame
 */
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

/**
 * Безопасное создание MutationObserver
 */
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
//  КРОССБРАУЗЕРНЫЙ MediaStream
// ============================================

/**
 * Проверка поддержки MediaStream API
 */
export function checkMediaStreamSupport() {
  const support = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    captureStream: false,
    audioContext: !!(window.AudioContext || window.webkitAudioContext)
  };

  try {
    const video = document.createElement('video');
    support.captureStream = typeof video.captureStream === 'function' ||
                            typeof video.mozCaptureStream === 'function' ||
                            typeof video.webkitCaptureStream === 'function';
  } catch (e) {
    support.captureStream = false;
  }

  return support;
}

// ============================================
//  КРОССБРАУЗЕРНЫЙ URL API
// ============================================

/**
 * Безопасное создание URL
 */
export function safeCreateObjectURL(blob) {
  const url = window.URL || window.webkitURL || window.mozURL;
  if (!url) {
    console.warn('[Compat] URL API не поддерживается');
    return null;
  }
  
  try {
    return url.createObjectURL(blob);
  } catch (e) {
    console.error('[Compat] Ошибка создания ObjectURL:', e);
    return null;
  }
}

/**
 * Безопасное освобождение URL
 */
export function safeRevokeObjectURL(url) {
  const urlAPI = window.URL || window.webkitURL || window.mozURL;
  if (!urlAPI) return;
  
  try {
    urlAPI.revokeObjectURL(url);
  } catch (e) {
    // Игнорируем
  }
}

// ============================================
//  КРОССБРАУЗЕРНЫЙ Console
// ============================================

/**
 * Безопасный вывод в консоль
 */
export function safeConsoleLog(...args) {
  try {
    if (console && console.log) {
      console.log(...args);
    }
  } catch (e) {
    // Игнорируем
  }
}

export function safeConsoleWarn(...args) {
  try {
    if (console && console.warn) {
      console.warn(...args);
    }
  } catch (e) {
    // Игнорируем
  }
}

export function safeConsoleError(...args) {
  try {
    if (console && console.error) {
      console.error(...args);
    }
  } catch (e) {
    // Игнорируем
  }
}

// ============================================
//  FIREFOX 153 СПЕЦИФИЧНЫЕ УТИЛИТЫ
// ============================================

/**
 * Проверка, является ли браузер Firefox 153
 */
export function isFirefox153() {
  return browserInfo.isFirefox153;
}

/**
 * Получение информации о Firefox 153
 */
export function getFirefox153Info() {
  return {
    isFirefox: browserInfo.name === Browser.FIREFOX,
    version: browserInfo.version,
    versionNumber: browserInfo.versionNumber,
    isFirefox153: browserInfo.isFirefox153,
    isMinVersion: browserInfo.isMinVersion(153, 1)
  };
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  Browser,
  browserInfo,
  createCrossBrowserAudioContext,
  captureStreamFromElement,
  checkAPISupport,
  ExtensionAPI,
  extensionAPI,
  CrossBrowserStorage,
  crossBrowserStorage,
  safeRequestAnimationFrame,
  safeCancelAnimationFrame,
  createSafeMutationObserver,
  checkMediaStreamSupport,
  safeCreateObjectURL,
  safeRevokeObjectURL,
  safeConsoleLog,
  safeConsoleWarn,
  safeConsoleError,
  isFirefox153,
  getFirefox153Info
};