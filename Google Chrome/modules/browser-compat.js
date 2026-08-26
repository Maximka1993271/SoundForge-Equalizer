// ============================================
//  BROWSER-COMPAT.JS - SoundForge v3.22.8 Chrome 152
//  Google Chrome 152.0.7977.65 | Windows 11 25H2
//  Кроссбраузерная совместимость
//  Версия: 1.0.0
//  Обеспечивает работу во всех браузерах
//  CHROME 152 OPTIMIZED: детекция Chrome 152
// ============================================

/**
 * Определение браузера
 */
export const Browser = {
  UNKNOWN: 'unknown',
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
    if (ua.includes('opr/') || ua.includes('opera')) {
      this.name = Browser.OPERA;
      this.version = this._extractVersion(ua, 'opr/');
    } else if (ua.includes('brave')) {
      this.name = Browser.BRAVE;
      this.version = this._extractVersion(ua, 'chrome/');
    } else if (ua.includes('vivaldi')) {
      this.name = Browser.VIVALDI;
      this.version = this._extractVersion(ua, 'vivaldi/');
    } else if (ua.includes('firefox')) {
      this.name = Browser.FIREFOX;
      this.version = this._extractVersion(ua, 'firefox/');
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
                     this.name === Browser.OPERA || 
                     this.name === Browser.BRAVE || 
                     this.name === Browser.VIVALDI;
    this.isFirefox = this.name === Browser.FIREFOX;
    this.isSafari = this.name === Browser.SAFARI;
    this.isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
    this.isDesktop = !this.isMobile;
    
    // Версия в виде числа
    this.versionNumber = parseFloat(this.version);
    
    // Проверка Chrome 152
    this.isChrome152 = this.name === Browser.CHROME && this.versionNumber >= 152;
  }

  _extractVersion(ua, marker) {
    const index = ua.indexOf(marker);
    if (index === -1) return '0';
    const start = index + marker.length;
    const end = ua.indexOf('.', start);
    if (end === -1) return ua.substring(start);
    return ua.substring(start, end);
  }

  /**
   * Проверка минимальной версии
   */
  isMinVersion(major, minor = 0) {
    const parts = this.version.split('.');
    const verMajor = parseInt(parts[0]) || 0;
    const verMinor = parseInt(parts[1]) || 0;
    
    if (verMajor > major) return true;
    if (verMajor === major && verMinor >= minor) return true;
    return false;
  }

  /**
   * Получение информации для отладки
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      versionNumber: this.versionNumber,
      isChromium: this.isChromium,
      isFirefox: this.isFirefox,
      isSafari: this.isSafari,
      isChrome: this.name === Browser.CHROME,
      isChrome152: this.isChrome152,
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
    chromeAPI: !!globalThis.chrome?.runtime,
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

  // Chrome 152 specific
  support.isChrome152 = browserInfo.isChrome152;

  return support;
}

// ============================================
//  КРОССБРАУЗЕРНЫЙ API (CHROME 152 OPTIMIZED)
// ============================================

/**
 * Универсальный доступ к расширению API
 */
export class ExtensionAPI {
  constructor() {
    this._useChrome = !!globalThis.chrome?.runtime;
    this._api = null;
    
    if (this._useChrome) {
      this._api = globalThis.chrome;
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
        // Chrome/Chromium используют колбэк
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
//  CHROME 152 СПЕЦИФИЧНЫЕ УТИЛИТЫ
// ============================================

/**
 * Проверка, является ли браузер Chrome 152
 */
export function isChrome152() {
  return browserInfo.isChrome152;
}

/**
 * Получение информации о Chrome 152
 */
export function getChrome152Info() {
  return {
    isChrome: browserInfo.name === Browser.CHROME,
    version: browserInfo.version,
    versionNumber: browserInfo.versionNumber,
    isChrome152: browserInfo.isChrome152,
    isMinVersion: browserInfo.isMinVersion(152, 0)
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
  isChrome152,
  getChrome152Info
};