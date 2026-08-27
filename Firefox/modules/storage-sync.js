// ============================================
//  STORAGE-SYNC.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  Единая система хранения
//  Версия: 1.0.1
//  Обеспечивает синхронизацию между localStorage и browserAPI.storage
//  FIREFOX 153 OPTIMIZED: обработка ошибок во всех методах
//  FIREFOX 153 OPTIMIZED: fallback при недоступности localStorage
// ============================================

const browserAPI = globalThis.browser;
if (!browserAPI?.runtime) throw new Error('Mozilla Firefox extension API unavailable');

/**
 * Единый менеджер хранилища
 */
class StorageManager {
  constructor() {
    this._cache = new Map();
    this._syncInProgress = false;
    this._flushPromise = null;
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
    // Проверка доступности localStorage
    this._hasLocalStorage = this._checkLocalStorage();

    // Keep the in-page cache synchronized with writes made by the background
    // service worker or another extension page.
    try {
      if (typeof browserAPI !== 'undefined' && browserAPI.storage?.onChanged) {
        browserAPI.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== 'local') return;
          let hasCanonicalChange = false;
          for (const [key, change] of Object.entries(changes || {})) {
            if (!key.startsWith(this._prefix)) continue;
            hasCanonicalChange = true;
            if (change.newValue === undefined) this._cache.delete(key);
            else this._cache.set(key, change.newValue);
            this._notifyListeners(key.substring(this._prefix.length), change.newValue);
          }
          if (hasCanonicalChange && this._hasLocalStorage) {
            try {
              const cacheData = {};
              for (const [key, value] of this._cache) {
                if (key.startsWith(this._prefix)) cacheData[key] = value;
              }
              localStorage.setItem(this._prefix + 'cache_data', JSON.stringify({ data: cacheData, timestamp: Date.now() }));
            } catch {}
          }
        });
      }
    } catch {}
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
      const data = await this._loadFromFirefox();
      
      if (!data || Object.keys(data).length === 0) {
        console.log('[Storage] Настройки не найдены, создаем дефолтные');
        const canonicalDefaults = Object.fromEntries(
          Object.entries(this._defaults).map(([key, value]) => [this._prefix + key, value])
        );
        await this._saveToFirefox(canonicalDefaults);
        await this._updateCache(canonicalDefaults);
      } else {
        await this._updateCache(data);
        console.log('[Storage] Настройки загружены из browserAPI.storage');
      }
      
      await this._syncFromLocalStorage();
      this._lastSync = Date.now();
      console.log('[Storage] Инициализация завершена');
      return this._cache;
    } catch (e) {
      console.error('[Storage] Ошибка инициализации:', e);
      this._initialized = false;
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
   * Обновить локальный кэш без прямой записи в browserAPI.storage.
   * Используется, когда background.js является единым писателем настроек.
   */
  updateCache(settings = {}) {
    if (!settings || typeof settings !== 'object') return;
    for (const [key, value] of Object.entries(settings)) {
      this._cache.set(this._prefix + key, value);
    }
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
      const data = await this._loadFromFirefox();
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
    
    this._scheduleFlush();
    
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
    
    this._scheduleFlush();
    
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
    clearTimeout(this._writeDebounce);
    if (this._flushPromise) await this._flushPromise.catch(() => {});
    this._cache.clear();
    this._pendingWrites.clear();
    await this._clearFirefox();
    await this._clearLocalStorageCache();

    const canonicalDefaults = Object.fromEntries(
      Object.entries(this._defaults).map(([key, value]) => [this._prefix + key, value])
    );
    await this._saveToFirefox(canonicalDefaults);
    await this._updateCache(canonicalDefaults);
    await this._refreshCanonicalBackup();

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

  _loadFromFirefox() {
    return new Promise((resolve) => {
      if (typeof browserAPI !== 'undefined' && browserAPI.storage) {
        browserAPI.storage.local.get(null, (result) => {
          if (browserAPI.runtime.lastError) {
            console.warn('[Storage] Ошибка загрузки из browserAPI.storage:', browserAPI.runtime.lastError);
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

  _saveToFirefox(data) {
    return new Promise((resolve, reject) => {
      if (typeof browserAPI !== 'undefined' && browserAPI.storage) {
        browserAPI.storage.local.set(data, () => {
          if (browserAPI.runtime.lastError) {
            const error = new Error(browserAPI.runtime.lastError.message);
            console.warn('[Storage] Ошибка сохранения в browserAPI.storage:', error);
            reject(error);
            return;
          }
          resolve();
        });
      } else {
        reject(new Error('browserAPI.storage.local недоступен'));
      }
    });
  }

  _clearFirefox() {
    return new Promise((resolve) => {
      if (typeof browserAPI !== 'undefined' && browserAPI.storage) {
        browserAPI.storage.local.clear(() => {
          if (browserAPI.runtime.lastError) {
            console.warn('[Storage] Ошибка очистки browserAPI.storage:', browserAPI.runtime.lastError);
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

  _scheduleFlush() {
    clearTimeout(this._writeDebounce);
    this._writeDebounce = setTimeout(() => {
      this._flushWrites().catch((error) => {
        console.error('[Storage] Ошибка очереди записи:', error);
      });
    }, 100);
  }

  async _flushWrites() {
    if (this._flushPromise) return this._flushPromise;

    this._flushPromise = (async () => {
      this._syncInProgress = true;
      try {
        while (this._pendingWrites.size > 0) {
          const snapshot = new Map(this._pendingWrites);
          const data = Object.fromEntries(snapshot);

          await this._saveToFirefox(data);

          for (const [key, value] of snapshot) {
            if (Object.is(this._pendingWrites.get(key), value)) {
              this._pendingWrites.delete(key);
            }
          }

          this._lastSync = Date.now();
          await this._refreshCanonicalBackup();
        }
      } finally {
        this._syncInProgress = false;
        this._flushPromise = null;
      }
    })();

    return this._flushPromise;
  }

  async _refreshCanonicalBackup() {
    if (!this._hasLocalStorage) return;
    try {
      const canonical = this.getAll();
      localStorage.setItem(this._prefix + 'cache_data', JSON.stringify({
        data: Object.fromEntries(Object.entries(canonical).map(([key, value]) => [this._prefix + key, value])),
        timestamp: Date.now()
      }));
      await this._saveToLocalStorage(canonical, true);
    } catch (error) {
      console.warn('[Storage] Не удалось обновить backup:', error);
    }
  }

  async _saveToLocalStorage(data, isCanonicalSnapshot = false) {
    if (!this._hasLocalStorage) return;
    try {
      const settings = {
        gains: isCanonicalSnapshot ? (data.eqSettings ?? this._defaults.eqSettings) : (data[this._prefix + 'eqSettings'] ?? this._defaults.eqSettings),
        volume: isCanonicalSnapshot ? (data.volumeBoost ?? this._defaults.volumeBoost) : (data[this._prefix + 'volumeBoost'] ?? this._defaults.volumeBoost),
        bass: isCanonicalSnapshot ? (data.bassBoost ?? this._defaults.bassBoost) : (data[this._prefix + 'bassBoost'] ?? this._defaults.bassBoost),
        isEnabled: isCanonicalSnapshot ? (data.isConnected ?? false) : (data[this._prefix + 'isConnected'] ?? false),
        autoConnect: isCanonicalSnapshot ? (data.autoConnect ?? true) : (data[this._prefix + 'autoConnect'] ?? true),
        userPresets: isCanonicalSnapshot ? (data.userPresets ?? {}) : (data[this._prefix + 'userPresets'] ?? {}),
        debugMode: isCanonicalSnapshot ? (data.debugMode ?? false) : (data[this._prefix + 'debugMode'] ?? false),
        nightMode: isCanonicalSnapshot ? (data.nightMode ?? false) : (data[this._prefix + 'nightMode'] ?? false),
        powerSaveMode: isCanonicalSnapshot ? (data.powerSaveMode ?? false) : (data[this._prefix + 'powerSaveMode'] ?? false)
      };
      const serialized = JSON.stringify(settings);
      localStorage.setItem('soundforge_settings_v322', serialized);
      localStorage.setItem('soundforge_cache', JSON.stringify({ timestamp: Date.now(), settings }));
    } catch (e) {
      console.warn('[Storage] Ошибка сохранения legacy backup:', e);
    }
  }

  async _syncFromLocalStorage() {
    if (!this._hasLocalStorage) return;
    try {
      let current = await this._loadFromFirefox();
      const hadFirefoxData = !!current && Object.keys(current).length > 0;

      const oldSettings = localStorage.getItem('soundforge_settings_v322');
      if ((!current || Object.keys(current).length === 0) && oldSettings) {
        const parsed = JSON.parse(oldSettings);
        console.log('[Storage] Перенос настроек из legacy localStorage');

        const migrated = {
          [this._prefix + 'eqSettings']: parsed.gains ?? this._defaults.eqSettings,
          [this._prefix + 'volumeBoost']: parsed.volume ?? this._defaults.volumeBoost,
          [this._prefix + 'bassBoost']: parsed.bass ?? this._defaults.bassBoost,
          [this._prefix + 'isConnected']: parsed.isEnabled ?? false,
          [this._prefix + 'userPresets']: parsed.userPresets ?? {},
          [this._prefix + 'debugMode']: parsed.debugMode ?? false
        };

        await this._saveToFirefox(migrated);
        await this._updateCache(migrated);
        current = { ...migrated };
      }

      const cacheData = localStorage.getItem(this._prefix + 'cache_data');
      if (cacheData) {
        try {
          const parsed = JSON.parse(cacheData);
          if (parsed.timestamp && Date.now() - parsed.timestamp < this._cacheTTL) {
            const canonicalCache = parsed.data || {};
            const sourceWasEmpty = !hadFirefoxData && Object.keys(current || {}).length === 0;
            for (const [key, value] of Object.entries(canonicalCache)) {
              if (sourceWasEmpty || current?.[key] === undefined) {
                this._cache.set(key, value);
              }
            }
          }
        } catch (e) {
          // Игнорируем поврежденный recovery cache
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