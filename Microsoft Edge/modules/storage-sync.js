// ============================================
//  STORAGE-SYNC.JS - Единая система хранения
//  Версия: 1.0.1
//  Обеспечивает синхронизацию между localStorage и chrome.storage
//  ИСПРАВЛЕНО: обработка ошибок во всех методах
//  ИСПРАВЛЕНО: fallback при недоступности localStorage
// ============================================

/**
 * Единый менеджер хранилища
 */
class StorageManager {
  constructor() {
    this._cache = new Map();
    this._syncInProgress = false;
    this._lastSync = null;
    this._pendingWrites = new Map();
    this._writeDebounce = null;
    this._listeners = new Map();
    this._initialized = false;
    this._prefix = 'sf_';
    this._cacheTTL = 5 * 60 * 1000;
    this._defaults = {
      eqSettings: {
        31: 0, 62: 0, 125: 0, 250: 0, 500: 0,
        1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0
      },
      volumeBoost: 1.0,
      savedVolume: 100,
      bassBoost: 0,
      savedBass: 0,
      selectedPreset: 'flat',
      theme: 'system',
      language: 'ru',
      popupExpanded: false,
      isConnected: false,
      debugMode: false,
      userPresets: {},
      settingsVersion: '3.22.8'
    };
    // FIX: Проверка доступности localStorage
    this._hasLocalStorage = this._checkLocalStorage();
  }

  /**
   * Проверка доступности localStorage
   */
  _checkLocalStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('[Storage] localStorage недоступен, используется fallback-кэш');
      return false;
    }
  }

  /**
   * Инициализация хранилища
   */
  async initialize() {
    if (this._initialized) return this._cache;
    this._initialized = true;
    
    console.log('[Storage] Инициализация...');
    
    try {
      const data = await this._loadFromChrome();
      
      if (!data || Object.keys(data).length === 0) {
        console.log('[Storage] Настройки не найдены, создаем дефолтные');
        await this._saveToChrome(this._defaults);
        await this._updateCache(this._defaults);
      } else {
        await this._updateCache(data);
        console.log('[Storage] Настройки загружены из chrome.storage');
      }
      
      await this._syncFromLocalStorage();
      this._lastSync = Date.now();
      console.log('[Storage] Инициализация завершена');
      return this._cache;
    } catch (e) {
      console.error('[Storage] Ошибка инициализации:', e);
      await this._updateCache(this._defaults);
      return this._cache;
    }
  }

  /**
   * Получение всех настроек (синхронно)
   */
  getAll() {
    const result = {};
    for (const [key, value] of this._cache) {
      if (key.startsWith(this._prefix)) {
        const cleanKey = key.substring(this._prefix.length);
        result[cleanKey] = value;
      }
    }
    return result;
  }

  /**
   * Получение настройки по ключу (синхронно)
   */
  get(key, defaultValue = null) {
    const cacheKey = this._prefix + key;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }
    return defaultValue !== null ? defaultValue : this._defaults[key];
  }

  /**
   * Асинхронное получение настройки
   */
  async getAsync(key, defaultValue = null) {
    const cacheKey = this._prefix + key;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }
    
    try {
      const data = await this._loadFromChrome();
      if (data && data[cacheKey] !== undefined) {
        this._cache.set(cacheKey, data[cacheKey]);
        return data[cacheKey];
      }
    } catch (e) {
      // Игнорируем
    }
    
    return defaultValue !== null ? defaultValue : this._defaults[key];
  }

  /**
   * Установка настройки
   */
  async set(key, value) {
    const cacheKey = this._prefix + key;
    this._cache.set(cacheKey, value);
    this._pendingWrites.set(cacheKey, value);
    
    clearTimeout(this._writeDebounce);
    this._writeDebounce = setTimeout(() => {
      this._flushWrites();
    }, 100);
    
    this._notifyListeners(key, value);
    return value;
  }

  /**
   * Массовое обновление настроек
   */
  async setMultiple(settings) {
    for (const [key, value] of Object.entries(settings)) {
      const cacheKey = this._prefix + key;
      this._cache.set(cacheKey, value);
      this._pendingWrites.set(cacheKey, value);
    }
    
    clearTimeout(this._writeDebounce);
    this._writeDebounce = setTimeout(() => {
      this._flushWrites();
    }, 100);
    
    for (const [key, value] of Object.entries(settings)) {
      this._notifyListeners(key, value);
    }
  }

  /**
   * Сброс настроек
   */
  async reset() {
    console.log('[Storage] Сброс настроек к дефолтным');
    this._cache.clear();
    this._pendingWrites.clear();
    
    for (const [key, value] of Object.entries(this._defaults)) {
      const cacheKey = this._prefix + key;
      this._cache.set(cacheKey, value);
      this._pendingWrites.set(cacheKey, value);
    }
    
    await this._flushWrites();
    
    for (const [key, value] of Object.entries(this._defaults)) {
      this._notifyListeners(key, value);
    }
    
    return this.getAll();
  }

  /**
   * Экспорт настроек
   */
  async exportSettings() {
    const data = this.getAll();
    return {
      version: this._defaults.settingsVersion,
      timestamp: Date.now(),
      settings: data,
      userPresets: data.userPresets || {}
    };
  }

  /**
   * Импорт настроек
   */
  async importSettings(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      if (!data.settings) {
        throw new Error('Неверный формат данных');
      }
      
      await this.setMultiple(data.settings);
      
      if (data.userPresets) {
        await this.set('userPresets', data.userPresets);
      }
      
      console.log('[Storage] Импорт настроек выполнен');
      return true;
    } catch (e) {
      console.error('[Storage] Ошибка импорта:', e);
      throw e;
    }
  }

  /**
   * Очистка всех данных
   */
  async clear() {
    console.log('[Storage] Очистка всех данных');
    this._cache.clear();
    this._pendingWrites.clear();
    await this._clearChrome();
    await this._clearLocalStorageCache();
    
    for (const [key, value] of Object.entries(this._defaults)) {
      const cacheKey = this._prefix + key;
      this._cache.set(cacheKey, value);
    }
    
    for (const [key, value] of Object.entries(this._defaults)) {
      this._notifyListeners(key, value);
    }
  }

  /**
   * Подписка на изменения
   */
  on(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);
  }

  /**
   * Отписка от изменений
   */
  off(key, callback) {
    if (this._listeners.has(key)) {
      this._listeners.get(key).delete(callback);
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      cacheSize: this._cache.size,
      pendingWrites: this._pendingWrites.size,
      syncInProgress: this._syncInProgress,
      lastSync: this._lastSync,
      listeners: this._listeners.size,
      initialized: this._initialized,
      hasLocalStorage: this._hasLocalStorage
    };
  }

  // ============================================
  //  ВНУТРЕННИЕ МЕТОДЫ
  // ============================================

  _loadFromChrome() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(null, (result) => {
          if (chrome.runtime.lastError) {
            console.warn('[Storage] Ошибка загрузки из chrome.storage:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  _saveToChrome(data) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            console.warn('[Storage] Ошибка сохранения в chrome.storage:', chrome.runtime.lastError);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  _clearChrome() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            console.warn('[Storage] Ошибка очистки chrome.storage:', chrome.runtime.lastError);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async _updateCache(data) {
    for (const [key, value] of Object.entries(data)) {
      const cacheKey = key.startsWith(this._prefix) ? key : this._prefix + key;
      this._cache.set(cacheKey, value);
    }
    
    if (this._hasLocalStorage) {
      try {
        const cacheData = {};
        for (const [key, value] of this._cache) {
          if (key.startsWith(this._prefix)) {
            cacheData[key] = value;
          }
        }
        localStorage.setItem(this._prefix + 'cache_data', JSON.stringify({
          data: cacheData,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Игнорируем ошибки localStorage
      }
    }
  }

  async _flushWrites() {
    if (this._pendingWrites.size === 0) return;
    if (this._syncInProgress) return;
    
    this._syncInProgress = true;
    
    try {
      const data = {};
      for (const [key, value] of this._pendingWrites) {
        data[key] = value;
      }
      
      await this._saveToChrome(data);
      await this._updateCache(data);
      if (this._hasLocalStorage) {
        await this._saveToLocalStorage(data);
      }
      this._pendingWrites.clear();
      this._lastSync = Date.now();
    } catch (e) {
      console.error('[Storage] Ошибка записи:', e);
    } finally {
      this._syncInProgress = false;
    }
  }

  async _saveToLocalStorage(data) {
    if (!this._hasLocalStorage) return;
    try {
      const settings = {
        gains: data[this._prefix + 'eqSettings'] ?? this._defaults.eqSettings,
        volume: data[this._prefix + 'volumeBoost'] ?? this._defaults.volumeBoost,
        bass: data[this._prefix + 'bassBoost'] ?? this._defaults.bassBoost,
        isEnabled: data[this._prefix + 'isConnected'] ?? false,
        autoConnect: false,
        userPresets: data[this._prefix + 'userPresets'] ?? {},
        debugMode: data[this._prefix + 'debugMode'] ?? false
      };
      
      localStorage.setItem('soundforge_settings_v322', JSON.stringify(settings));
      
      const cacheData = {
        timestamp: Date.now(),
        settings: settings
      };
      localStorage.setItem('soundforge_cache', JSON.stringify(cacheData));
    } catch (e) {
      // Игнорируем ошибки localStorage
    }
  }

  async _syncFromLocalStorage() {
    if (!this._hasLocalStorage) return;
    try {
      const oldSettings = localStorage.getItem('soundforge_settings_v322');
      if (oldSettings) {
        const parsed = JSON.parse(oldSettings);
        const current = await this._loadFromChrome();
        
        if (!current || Object.keys(current).length === 0) {
          console.log('[Storage] Перенос настроек из localStorage');
          
          const migrated = {
            eqSettings: parsed.gains ?? this._defaults.eqSettings,
            volumeBoost: parsed.volume ?? this._defaults.volumeBoost,
            bassBoost: parsed.bass ?? this._defaults.bassBoost,
            isConnected: parsed.isEnabled ?? false,
            userPresets: parsed.userPresets ?? {},
            debugMode: parsed.debugMode ?? false
          };
          
          await this._saveToChrome(migrated);
          await this._updateCache(migrated);
        }
      }
      
      const cacheData = localStorage.getItem(this._prefix + 'cache_data');
      if (cacheData) {
        try {
          const parsed = JSON.parse(cacheData);
          if (parsed.timestamp && Date.now() - parsed.timestamp < this._cacheTTL) {
            for (const [key, value] of Object.entries(parsed.data || {})) {
              this._cache.set(key, value);
            }
          }
        } catch (e) {
          // Игнорируем
        }
      }
    } catch (e) {
      console.warn('[Storage] Ошибка синхронизации из localStorage:', e);
    }
  }

  async _clearLocalStorageCache() {
    if (!this._hasLocalStorage) return;
    try {
      localStorage.removeItem('soundforge_settings_v322');
      localStorage.removeItem('soundforge_cache');
      localStorage.removeItem(this._prefix + 'cache_data');
    } catch (e) {
      // Игнорируем
    }
  }

  _notifyListeners(key, value) {
    if (this._listeners.has(key)) {
      for (const callback of this._listeners.get(key)) {
        try {
          callback(value, key);
        } catch (e) {
          console.error('[Storage] Ошибка в слушателе:', e);
        }
      }
    }
    
    if (this._listeners.has('*')) {
      for (const callback of this._listeners.get('*')) {
        try {
          callback(key, value);
        } catch (e) {
          console.error('[Storage] Ошибка в глобальном слушателе:', e);
        }
      }
    }
  }
}

// ============================================
//  СОЗДАНИЕ ГЛОБАЛЬНОГО ИНСТАНСА
// ============================================

const storage = new StorageManager();

// ============================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

export async function initializeStorage() {
  return storage.initialize();
}

export function onSettingChange(key, callback) {
  storage.on(key, callback);
}

export function offSettingChange(key, callback) {
  storage.off(key, callback);
}

// ============================================
//  ЭКСПОРТ
// ============================================

export { storage };
export default storage;