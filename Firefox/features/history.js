// ============================================
//  HISTORY.JS - История изменений (v3.22.8)
//  Хранение до 1000 записей
// ============================================

const CONFIG = {
  maxHistoryEntries: 1000,
  storageKey: 'settingsHistory',
  preserveForDays: 30
};

// ============================================
//  ДОБАВЛЕНИЕ ЗАПИСИ В ИСТОРИЮ
// ============================================

export function addHistoryEntry(action, data, metadata = {}) {
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    action: action,
    data: data,
    metadata: metadata,
    url: metadata.url || '',
    site: metadata.site || ''
  };
  
  // Получаем текущую историю
  getHistory().then((history) => {
    history.push(entry);
    
    // Ограничиваем размер
    if (history.length > CONFIG.maxHistoryEntries) {
      // Удаляем старые записи
      history = history.slice(-CONFIG.maxHistoryEntries);
    }
    
    // Удаляем записи старше preserveForDays дней
    const cutoff = Date.now() - (CONFIG.preserveForDays * 24 * 60 * 60 * 1000);
    history = history.filter((h) => h.timestamp > cutoff);
    
    saveHistory(history);
  });
}

// ============================================
//  ПОЛУЧЕНИЕ ИСТОРИИ
// ============================================

export function getHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([CONFIG.storageKey], (result) => {
      resolve(result[CONFIG.storageKey] || []);
    });
  });
}

// ============================================
//  СОХРАНЕНИЕ ИСТОРИИ
// ============================================

function saveHistory(history) {
  chrome.storage.local.set({ [CONFIG.storageKey]: history });
}

// ============================================
//  ПОЛУЧЕНИЕ ИСТОРИИ С ФИЛЬТРАМИ
// ============================================

export async function getHistoryWithFilters(filters = {}) {
  const history = await getHistory();
  
  let filtered = history;
  
  if (filters.action) {
    filtered = filtered.filter((h) => h.action === filters.action);
  }
  
  if (filters.site) {
    filtered = filtered.filter((h) => h.site === filters.site);
  }
  
  if (filters.fromDate) {
    filtered = filtered.filter((h) => h.timestamp >= filters.fromDate);
  }
  
  if (filters.toDate) {
    filtered = filtered.filter((h) => h.timestamp <= filters.toDate);
  }
  
  if (filters.limit) {
    filtered = filtered.slice(-filters.limit);
  }
  
  return filtered;
}

// ============================================
//  ПОЛУЧЕНИЕ СТАТИСТИКИ ИСТОРИИ
// ============================================

export async function getHistoryStats() {
  const history = await getHistory();
  
  const stats = {
    total: history.length,
    byAction: {},
    bySite: {},
    lastWeek: 0,
    lastMonth: 0,
    mostCommonAction: null,
    mostCommonSite: null
  };
  
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  history.forEach((h) => {
    // По действиям
    stats.byAction[h.action] = (stats.byAction[h.action] || 0) + 1;
    
    // По сайтам
    if (h.site) {
      stats.bySite[h.site] = (stats.bySite[h.site] || 0) + 1;
    }
    
    // За последнюю неделю
    if (h.timestamp >= weekAgo) stats.lastWeek++;
    
    // За последний месяц
    if (h.timestamp >= monthAgo) stats.lastMonth++;
  });
  
  // Находим самое частое действие
  let maxAction = 0;
  for (const [action, count] of Object.entries(stats.byAction)) {
    if (count > maxAction) {
      maxAction = count;
      stats.mostCommonAction = action;
    }
  }
  
  // Находим самый частый сайт
  let maxSite = 0;
  for (const [site, count] of Object.entries(stats.bySite)) {
    if (count > maxSite) {
      maxSite = count;
      stats.mostCommonSite = site;
    }
  }
  
  return stats;
}

// ============================================
//  ОЧИСТКА ИСТОРИИ
// ============================================

export function clearHistory() {
  chrome.storage.local.set({ [CONFIG.storageKey]: [] });
  console.log('🗑️ История очищена');
}

// ============================================
//  ЭКСПОРТ ИСТОРИИ В JSON
// ============================================

export async function exportHistory() {
  const history = await getHistory();
  return {
    version: '1.0',
    exported: Date.now(),
    total: history.length,
    history: history
  };
}

// ============================================
//  ИМПОРТ ИСТОРИИ ИЗ JSON
// ============================================

export async function importHistory(jsonData) {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (!data.history || !Array.isArray(data.history)) {
      throw new Error('Неверный формат данных');
    }
    
    const current = await getHistory();
    const merged = [...current, ...data.history];
    
    // Сортируем по времени
    merged.sort((a, b) => a.timestamp - b.timestamp);
    
    // Ограничиваем размер
    const limited = merged.slice(-CONFIG.maxHistoryEntries);
    
    saveHistory(limited);
    console.log(`📥 Импортировано ${data.history.length} записей`);
    
    return true;
  } catch (e) {
    console.error('❌ Ошибка импорта истории:', e);
    return false;
  }
}

// ============================================
//  АВТОМАТИЧЕСКОЕ ДОБАВЛЕНИЕ В ИСТОРИЮ
// ============================================

export function initHistoryTracking() {
  console.log('📜 Инициализация отслеживания истории...');
  
  // Отслеживаем изменения настроек
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;
    
    const settingsKeys = [
      'eqSettings', 'volumeBoost', 'bassBoost', 
      'selectedPreset', 'isConnected'
    ];
    
    for (const key of settingsKeys) {
      if (changes[key]) {
        const oldValue = changes[key].oldValue;
        const newValue = changes[key].newValue;
        
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
  
  // Отслеживаем пресеты
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'applyPreset' && request.preset) {
      addHistoryEntry('preset_applied', {
        preset: request.preset
      }, {
        source: request.source || 'ui',
        site: getCurrentSite()
      });
      sendResponse({ status: 'ok' });
      return true;
    }
    
    if (request.action === 'connect') {
      addHistoryEntry('eq_enabled', {}, {
        source: request.source || 'ui',
        site: getCurrentSite()
      });
    }
    
    if (request.action === 'disconnect') {
      addHistoryEntry('eq_disabled', {}, {
        source: request.source || 'ui',
        site: getCurrentSite()
      });
    }
    
    return false;
  });
  
  console.log('✅ Отслеживание истории активировано');
}

function getCurrentSite() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
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
  addHistoryEntry,
  getHistory,
  getHistoryWithFilters,
  getHistoryStats,
  clearHistory,
  exportHistory,
  importHistory,
  initHistoryTracking,
  CONFIG
};