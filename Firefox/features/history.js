//  HISTORY.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  История изменений
//  Хранение до 1000 записей
//  FIREFOX 153 OPTIMIZED: обработка ошибок storage
// ============================================

var browserAPI = globalThis.browser;
if (!browserAPI?.runtime) throw new Error('Mozilla Firefox extension API unavailable');

var _historyMutationQueue = Promise.resolve();
var _historyTrackingInitialized = false;

var CONFIG = {
  maxHistoryEntries: 1000,
  storageKey: 'settingsHistory',
  preserveForDays: 30
};

// ============================================
//  ДОБАВЛЕНИЕ ЗАПИСИ В ИСТОРИЮ
// ============================================

export function addHistoryEntry(action, data, metadata) {
  _historyMutationQueue = _historyMutationQueue
    .catch(function() {})
    .then(function() { return addHistoryEntryInternal(action, data, metadata); });
  return _historyMutationQueue;
}

function addHistoryEntryInternal(action, data, metadata) {
  metadata = metadata || {};
  var entry = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    action: action,
    data: data || {},
    metadata: metadata,
    url: metadata.url || '',
    site: metadata.site || ''
  };
  
  return getHistory().then(function(history) {
    history.push(entry);
    
    if (history.length > CONFIG.maxHistoryEntries) {
      history = history.slice(-CONFIG.maxHistoryEntries);
    }
    
    var cutoff = Date.now() - (CONFIG.preserveForDays * 24 * 60 * 60 * 1000);
    history = history.filter(function(h) { return h.timestamp > cutoff; });
    
    return saveHistory(history);
  }).catch(function(e) {
    console.warn('⚠️ Ошибка добавления в историю:', e);
  });
}

// ============================================
//  ПОЛУЧЕНИЕ ИСТОРИИ
// ============================================

export function getHistory() {
  return new Promise(function(resolve) {
    browserAPI.storage.local.get([CONFIG.storageKey], function(result) {
      if (browserAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка получения истории:', browserAPI.runtime.lastError);
        resolve([]);
        return;
      }
      resolve(result[CONFIG.storageKey] || []);
    });
  });
}

// ============================================
//  СОХРАНЕНИЕ ИСТОРИИ
// ============================================

function saveHistory(history) {
  return new Promise(function(resolve) {
  browserAPI.storage.local.set({ [CONFIG.storageKey]: history }, function() {
    if (browserAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка сохранения истории:', browserAPI.runtime.lastError);
    }
    resolve();
  });
  });
}

// ============================================
//  ПОЛУЧЕНИЕ ИСТОРИИ С ФИЛЬТРАМИ
// ============================================

export function getHistoryWithFilters(filters) {
  filters = filters || {};
  return getHistory().then(function(history) {
    var filtered = history;
    
    if (filters.action) {
      filtered = filtered.filter(function(h) { return h.action === filters.action; });
    }
    
    if (filters.site) {
      filtered = filtered.filter(function(h) { return h.site === filters.site; });
    }
    
    if (filters.fromDate) {
      filtered = filtered.filter(function(h) { return h.timestamp >= filters.fromDate; });
    }
    
    if (filters.toDate) {
      filtered = filtered.filter(function(h) { return h.timestamp <= filters.toDate; });
    }
    
    if (filters.limit) {
      filtered = filtered.slice(-filters.limit);
    }
    
    return filtered;
  }).catch(function(e) {
    console.warn('⚠️ Ошибка фильтрации истории:', e);
    return [];
  });
}

// ============================================
//  ПОЛУЧЕНИЕ СТАТИСТИКИ ИСТОРИИ
// ============================================

export function getHistoryStats() {
  return getHistory().then(function(history) {
    var stats = {
      total: history.length,
      byAction: {},
      bySite: {},
      lastWeek: 0,
      lastMonth: 0,
      mostCommonAction: null,
      mostCommonSite: null
    };
    
    var now = Date.now();
    var weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    var monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    history.forEach(function(h) {
      stats.byAction[h.action] = (stats.byAction[h.action] || 0) + 1;
      
      if (h.site) {
        stats.bySite[h.site] = (stats.bySite[h.site] || 0) + 1;
      }
      
      if (h.timestamp >= weekAgo) stats.lastWeek++;
      if (h.timestamp >= monthAgo) stats.lastMonth++;
    });
    
    var maxAction = 0;
    for (var action in stats.byAction) {
      if (stats.byAction[action] > maxAction) {
        maxAction = stats.byAction[action];
        stats.mostCommonAction = action;
      }
    }
    
    var maxSite = 0;
    for (var site in stats.bySite) {
      if (stats.bySite[site] > maxSite) {
        maxSite = stats.bySite[site];
        stats.mostCommonSite = site;
      }
    }
    
    return stats;
  }).catch(function(e) {
    console.warn('⚠️ Ошибка получения статистики истории:', e);
    return {
      total: 0,
      byAction: {},
      bySite: {},
      lastWeek: 0,
      lastMonth: 0,
      mostCommonAction: null,
      mostCommonSite: null
    };
  });
}

// ============================================
//  ОЧИСТКА ИСТОРИИ
// ============================================

export function clearHistory() {
  browserAPI.storage.local.set({ [CONFIG.storageKey]: [] }, function() {
    if (browserAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка очистки истории:', browserAPI.runtime.lastError);
    } else {
      console.log('🗑️ История очищена');
    }
  });
}

// ============================================
//  ЭКСПОРТ ИСТОРИИ В JSON
// ============================================

export function exportHistory() {
  return getHistory().then(function(history) {
    return {
      version: '1.0',
      exported: Date.now(),
      total: history.length,
      history: history
    };
  }).catch(function(e) {
    console.warn('⚠️ Ошибка экспорта истории:', e);
    throw e;
  });
}

// ============================================
//  ИМПОРТ ИСТОРИИ ИЗ JSON
// ============================================

export function importHistory(jsonData) {
  try {
    var data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (!data.history || !Array.isArray(data.history)) {
      throw new Error('Неверный формат данных');
    }
    
    return getHistory().then(function(current) {
      var merged = current.concat(data.history);
      
      merged.sort(function(a, b) { return a.timestamp - b.timestamp; });
      
      var limited = merged.slice(-CONFIG.maxHistoryEntries);
      
      saveHistory(limited);
      console.log('📥 Импортировано ' + data.history.length + ' записей');
      
      return true;
    });
  } catch (e) {
    console.error('❌ Ошибка импорта истории:', e);
    throw e;
  }
}

// ============================================
//  АВТОМАТИЧЕСКОЕ ДОБАВЛЕНИЕ В ИСТОРИЮ
// ============================================

export function initHistoryTracking() {
  if (_historyTrackingInitialized) return;
  _historyTrackingInitialized = true;
  console.log('📜 Инициализация отслеживания истории...');
  
  browserAPI.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace !== 'local') return;
    
    var settingsKeys = [
      'eqSettings', 'volumeBoost', 'bassBoost', 
      'selectedPreset', 'isConnected'
    ];
    
    for (var i = 0; i < settingsKeys.length; i++) {
      var key = settingsKeys[i];
      if (changes[key]) {
        var oldValue = changes[key].oldValue;
        var newValue = changes[key].newValue;
        
        if (oldValue !== newValue) {
          addHistoryEntry('settings_change', {
            key: key,
            oldValue: oldValue,
            newValue: newValue
          }, {
            source: 'storage_change'
          });
        }
      }
    }
  });
  
  browserAPI.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'applyPreset' && request.preset) {
      getCurrentSite().then(function(site) {
        addHistoryEntry('preset_applied', {
          preset: request.preset
        }, {
          source: request.source || 'ui',
          site: site
        });
      });
      sendResponse({ status: 'ok' });
      return true;
    }
    
    if (request.action === 'connect') {
      getCurrentSite().then(function(site) {
        addHistoryEntry('eq_enabled', {}, {
          source: request.source || 'ui',
          site: site
        });
      });
    }
    
    if (request.action === 'disconnect') {
      getCurrentSite().then(function(site) {
        addHistoryEntry('eq_disabled', {}, {
          source: request.source || 'ui',
          site: site
        });
      });
    }
    
    return false;
  });
  
  console.log('✅ Отслеживание истории активировано');
}

function getCurrentSite() {
  return new Promise(function(resolve) {
    browserAPI.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (browserAPI.runtime.lastError || !tabs || tabs.length === 0) {
        resolve('unknown');
        return;
      }
      
      if (tabs[0].url) {
        try {
          var url = new URL(tabs[0].url);
          resolve(url.hostname.replace('www.', ''));
        } catch {
          resolve('unknown');
        }
      } else {
        resolve('unknown');
      }
    });
  });
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  addHistoryEntry: addHistoryEntry,
  getHistory: getHistory,
  getHistoryWithFilters: getHistoryWithFilters,
  getHistoryStats: getHistoryStats,
  clearHistory: clearHistory,
  exportHistory: exportHistory,
  importHistory: importHistory,
  initHistoryTracking: initHistoryTracking,
  CONFIG: CONFIG
};