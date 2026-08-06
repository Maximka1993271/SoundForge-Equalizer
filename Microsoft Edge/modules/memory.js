// ============================================
//  MEMORY.JS - SoundForge v3.22.8 Edge 151
//  Microsoft Edge 151.0.4129.59 | Windows 11 25H2
//  Управление памятью
//  Версия: 1.0.0
//  EDGE OPTIMIZED: очистка мониторинга при уничтожении
//  EDGE OPTIMIZED: обработка ошибок storage
// ============================================

/**
 * Менеджер памяти для SoundForge
 * Обеспечивает правильное управление ресурсами
 */
export class MemoryManager {
  constructor() {
    this._references = new Map();
    this._cleanupFunctions = new Set();
    this._isCleaning = false;
    this._stats = {
      totalCleanups: 0,
      lastCleanup: null,
      memoryFreed: 0
    };
    this._monitoringInterval = null;
    this._isDestroyed = false;
    this._edgeMemoryAPI = null;
    
    // Проверка поддержки memory API в Edge
    this._checkMemoryAPI();
  }

  /**
   * Проверка поддержки performance.memory в Edge
   */
  _checkMemoryAPI() {
    try {
      if (typeof performance !== 'undefined' && performance.memory) {
        this._edgeMemoryAPI = performance.memory;
      }
    } catch (e) {
      // Игнорируем
    }
  }

  /**
   * Регистрация объекта для управления памятью
   */
  register(id, obj, cleanupFn = null) {
    if (this._isDestroyed) {
      console.warn('[MemoryManager] Менеджер уничтожен, регистрация невозможна');
      return;
    }
    
    if (!id) {
      console.warn('[MemoryManager] Попытка регистрации без ID');
      return;
    }

    if (this._references.has(id)) {
      this._references.delete(id);
    }

    this._references.set(id, {
      object: obj,
      cleanupFn: cleanupFn,
      registered: Date.now(),
      lastAccess: Date.now()
    });

    if (this._references.size > 100) {
      this._checkForLeaks();
    }
  }

  /**
   * Обновление времени последнего доступа
   */
  touch(id) {
    const ref = this._references.get(id);
    if (ref) {
      ref.lastAccess = Date.now();
    }
  }

  /**
   * Удаление объекта из управления
   */
  unregister(id) {
    if (this._isDestroyed) return false;
    
    if (this._references.has(id)) {
      const ref = this._references.get(id);
      if (ref.cleanupFn) {
        try {
          ref.cleanupFn(ref.object);
        } catch (e) {
          console.warn(`[MemoryManager] Ошибка очистки ${id}:`, e);
        }
      }
      this._references.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Добавление функции очистки
   */
  addCleanup(fn) {
    if (this._isDestroyed) return;
    if (typeof fn === 'function') {
      this._cleanupFunctions.add(fn);
    }
  }

  /**
   * Удаление функции очистки
   */
  removeCleanup(fn) {
    this._cleanupFunctions.delete(fn);
  }

  /**
   * Очистка конкретного объекта
   */
  cleanup(id) {
    if (this._isCleaning || this._isDestroyed) return;
    this._isCleaning = true;

    try {
      const ref = this._references.get(id);
      if (ref && ref.cleanupFn) {
        ref.cleanupFn(ref.object);
        this._references.delete(id);
        this._stats.totalCleanups++;
        this._stats.memoryFreed++;
      }
    } catch (e) {
      console.warn(`[MemoryManager] Ошибка очистки ${id}:`, e);
    } finally {
      this._isCleaning = false;
    }
  }

  /**
   * Проверка на утечки памяти
   */
  _checkForLeaks() {
    if (this._isDestroyed) return;
    
    const now = Date.now();
    const oldThreshold = 60000; // 1 минута
    let cleaned = 0;

    for (const [id, ref] of this._references) {
      if (now - ref.lastAccess > oldThreshold) {
        this.cleanup(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[MemoryManager] Очищено ${cleaned} объектов (старые)`);
    }
  }

  /**
   * Полная очистка всех ресурсов
   */
  fullCleanup() {
    if (this._isCleaning || this._isDestroyed) return;
    this._isCleaning = true;

    console.log('[MemoryManager] Начало полной очистки');

    try {
      let cleanedCount = 0;
      for (const [id, ref] of this._references) {
        try {
          if (ref.cleanupFn) {
            ref.cleanupFn(ref.object);
          }
          cleanedCount++;
        } catch (e) {
          console.warn(`[MemoryManager] Ошибка очистки ${id}:`, e);
        }
      }
      this._references.clear();
      this._stats.totalCleanups += cleanedCount;
      this._stats.memoryFreed += cleanedCount;

      for (const fn of this._cleanupFunctions) {
        try {
          fn();
        } catch (e) {
          console.warn('[MemoryManager] Ошибка в функции очистки:', e);
        }
      }
      this._cleanupFunctions.clear();

      console.log(`[MemoryManager] Очищено ${cleanedCount} объектов`);

      this._requestGC();

    } catch (e) {
      console.error('[MemoryManager] Ошибка при очистке:', e);
    } finally {
      this._isCleaning = false;
      this._stats.lastCleanup = Date.now();
    }
  }

  /**
   * Безопасный запрос сборки мусора (Edge/Chromium)
   */
  _requestGC() {
    try {
      // Edge/Chromium: window.gc() может быть доступен с флагом
      if (typeof window !== 'undefined' && window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
          console.log('[MemoryManager] GC вызван через window.gc()');
          return;
        } catch (e) {
          // Игнорируем
        }
      }

      // Альтернативный способ: создание и очистка большого массива
      try {
        let tempArray = new Array(100000);
        tempArray.fill(0);
        tempArray = null;
      } catch (e) {
        // Игнорируем
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }

  /**
   * Получение статистики памяти
   */
  getStats() {
    const stats = {
      ...this._stats,
      registeredObjects: this._references.size,
      cleanupFunctions: this._cleanupFunctions.size,
      isCleaning: this._isCleaning,
      isDestroyed: this._isDestroyed,
      memoryInfo: null
    };

    if (this._edgeMemoryAPI) {
      stats.memoryInfo = {
        totalJSHeapSize: this._edgeMemoryAPI.totalJSHeapSize,
        usedJSHeapSize: this._edgeMemoryAPI.usedJSHeapSize,
        jsHeapSizeLimit: this._edgeMemoryAPI.jsHeapSizeLimit
      };
    } else if (typeof performance !== 'undefined' && performance.memory) {
      stats.memoryInfo = {
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }

    return stats;
  }

  /**
   * Получение списка зарегистрированных объектов
   */
  getRegisteredObjects() {
    const objects = [];
    for (const [id, ref] of this._references) {
      objects.push({
        id: id,
        registered: ref.registered,
        lastAccess: ref.lastAccess,
        age: Date.now() - ref.registered,
        hasCleanup: !!ref.cleanupFn
      });
    }
    return objects;
  }

  /**
   * Периодическая проверка памяти
   */
  startMonitoring(interval = 30000) {
    if (this._isDestroyed) {
      console.warn('[MemoryManager] Менеджер уничтожен, мониторинг невозможен');
      return;
    }
    
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = null;
    }

    this._monitoringInterval = setInterval(() => {
      if (this._isDestroyed) {
        clearInterval(this._monitoringInterval);
        this._monitoringInterval = null;
        return;
      }
      
      this._checkForLeaks();

      if (this._references.size > 50) {
        console.warn(`[MemoryManager] Внимание: ${this._references.size} зарегистрированных объектов`);
      }

      const stats = this.getStats();
      if (stats.memoryInfo) {
        const used = Math.round(stats.memoryInfo.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(stats.memoryInfo.totalJSHeapSize / 1024 / 1024);
        console.log(`[MemoryManager] Память: ${used}MB / ${total}MB`);
      }

      if (this._references.size > 150) {
        console.warn('[MemoryManager] Слишком много объектов, очистка...');
        this.fullCleanup();
      }

    }, interval);

    console.log(`[MemoryManager] Мониторинг запущен (интервал: ${interval/1000}с)`);
  }

  /**
   * Остановка мониторинга
   */
  stopMonitoring() {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = null;
      console.log('[MemoryManager] Мониторинг остановлен');
    }
  }

  /**
   * Ручной вызов для освобождения памяти
   */
  freeMemory() {
    if (this._isDestroyed) return { cleaned: 0, remaining: 0, stats: null };
    
    console.log('[MemoryManager] Ручной вызов освобождения памяти');
    
    const now = Date.now();
    const oldThreshold = 30000;
    let cleaned = 0;

    for (const [id, ref] of this._references) {
      if (now - ref.lastAccess > oldThreshold) {
        this.cleanup(id);
        cleaned++;
      }
    }

    this._requestGC();

    return {
      cleaned: cleaned,
      remaining: this._references.size,
      stats: this.getStats()
    };
  }

  /**
   * Полная очистка и сброс
   */
  destroy() {
    if (this._isDestroyed) return;
    
    this.stopMonitoring();
    this.fullCleanup();
    this._references.clear();
    this._cleanupFunctions.clear();
    this._isDestroyed = true;
    this._stats = {
      totalCleanups: 0,
      lastCleanup: null,
      memoryFreed: 0
    };
    console.log('[MemoryManager] Менеджер памяти уничтожен');
  }
}

// ============================================
//  СОЗДАНИЕ ГЛОБАЛЬНОГО ИНСТАНСА
// ============================================

export const memoryManager = new MemoryManager();

// ============================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Регистрация DOM элемента для управления памятью
 */
export function registerDOMElement(element, id, cleanupFn = null) {
  if (!element || !id) return;

  const defaultCleanup = (el) => {
    try {
      if (el._listeners) {
        for (const [event, listener] of el._listeners) {
          el.removeEventListener(event, listener);
        }
        delete el._listeners;
      }
      
      if (el.parentNode) {
        try { el.parentNode.removeChild(el); } catch {}
      }
      
      if (el.tagName === 'CANVAS') {
        const ctx = el.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, el.width, el.height);
        }
      }
    } catch (e) {
      console.warn(`[MemoryManager] Ошибка очистки DOM элемента ${id}:`, e);
    }
  };

  memoryManager.register(id, element, cleanupFn || defaultCleanup);
}

/**
 * Регистрация объекта для управления памятью
 */
export function registerObject(id, obj, cleanupFn = null) {
  const defaultCleanup = (o) => {
    if (o && typeof o === 'object') {
      for (const key of Object.keys(o)) {
        try {
          if (typeof o[key] === 'function') {
            o[key] = null;
          } else if (o[key] && typeof o[key] === 'object') {
            for (const subKey of Object.keys(o[key])) {
              o[key][subKey] = null;
            }
            o[key] = null;
          } else {
            o[key] = null;
          }
        } catch (e) {
          // Игнорируем
        }
      }
    }
  };

  memoryManager.register(id, obj, cleanupFn || defaultCleanup);
}

/**
 * Регистрация таймера
 */
export function registerTimer(id, timer, cleanupFn = null) {
  const defaultCleanup = (t) => {
    try {
      if (typeof t === 'number') {
        clearTimeout(t);
        clearInterval(t);
      } else if (t && typeof t === 'object') {
        if (t._timeoutId) clearTimeout(t._timeoutId);
        if (t._intervalId) clearInterval(t._intervalId);
        if (t.clear) t.clear();
        if (t.stop) t.stop();
      }
    } catch (e) {
      console.warn(`[MemoryManager] Ошибка очистки таймера ${id}:`, e);
    }
  };

  memoryManager.register(id, timer, cleanupFn || defaultCleanup);
}

/**
 * Регистрация Web Audio узла
 */
export function registerAudioNode(id, node, context, cleanupFn = null) {
  const defaultCleanup = (n) => {
    try {
      if (n && typeof n.disconnect === 'function') {
        try { n.disconnect(); } catch {}
      }
      if (n && typeof n.close === 'function') {
        try { n.close(); } catch {}
      }
      if (context && context.state !== 'closed') {
        try { context.close(); } catch {}
      }
    } catch (e) {
      console.warn(`[MemoryManager] Ошибка очистки аудио-узла ${id}:`, e);
    }
  };

  memoryManager.register(id, node, cleanupFn || defaultCleanup);
}

/**
 * Глобальная очистка
 */
export function globalCleanup() {
  memoryManager.fullCleanup();
}

/**
 * Получение статистики памяти
 */
export function getMemoryStats() {
  return memoryManager.getStats();
}

// ============================================
//  АВТОМАТИЧЕСКАЯ ОЧИСТКА ПРИ ЗАКРЫТИИ
// ============================================

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    console.log('[MemoryManager] Очистка перед закрытием');
    memoryManager.fullCleanup();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      memoryManager._checkForLeaks();
    }
  });
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  MemoryManager,
  memoryManager,
  registerDOMElement,
  registerObject,
  registerTimer,
  registerAudioNode,
  globalCleanup,
  getMemoryStats
};