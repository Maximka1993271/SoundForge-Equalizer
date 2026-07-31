// ============================================
//  MEMORY.JS - Управление памятью
//  Версия: 2.0.0
//  Chrome MV3 + Firefox MV2
// ============================================

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
  }

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

  touch(id) {
    const ref = this._references.get(id);
    if (ref) {
      ref.lastAccess = Date.now();
    }
  }

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

  addCleanup(fn) {
    if (this._isDestroyed) return;
    if (typeof fn === 'function') {
      this._cleanupFunctions.add(fn);
    }
  }

  removeCleanup(fn) {
    this._cleanupFunctions.delete(fn);
  }

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

  _checkForLeaks() {
    if (this._isDestroyed) return;
    
    const now = Date.now();
    const oldThreshold = 60000;
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

  _requestGC() {
    try {
      if (typeof window !== 'undefined' && window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
          console.log('[MemoryManager] GC вызван через window.gc()');
          return;
        } catch (e) {}
      }

      try {
        let tempArray = new Array(100000);
        tempArray.fill(0);
        tempArray = null;
      } catch (e) {}
    } catch (e) {}
  }

  getStats() {
    const stats = {
      ...this._stats,
      registeredObjects: this._references.size,
      cleanupFunctions: this._cleanupFunctions.size,
      isCleaning: this._isCleaning,
      isDestroyed: this._isDestroyed,
      memoryInfo: null
    };

    if (typeof performance !== 'undefined' && performance.memory) {
      stats.memoryInfo = {
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }

    return stats;
  }

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

  stopMonitoring() {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = null;
      console.log('[MemoryManager] Мониторинг остановлен');
    }
  }

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

export const memoryManager = new MemoryManager();

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
        } catch (e) {}
      }
    }
  };

  memoryManager.register(id, obj, cleanupFn || defaultCleanup);
}

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

export function globalCleanup() {
  memoryManager.fullCleanup();
}

export function getMemoryStats() {
  return memoryManager.getStats();
}

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