// ============================================
//  STATS.JS - Статистика использования (v3.22.8)
//  ИСПРАВЛЕНО: инициализация _stats
//  ИСПРАВЛЕНО: обработка ошибок
// ============================================

const CONFIG = {
  storageKey: 'usageStats',
  maxDays: 30,
  powerSaveInterval: 5000,
  normalInterval: 50
};

let _powerSaveMode = false;
let _stats = null;
let _statsInterval = null;
let _isTracking = false;

// ============================================
//  ПОЛУЧЕНИЕ ДЕФОЛТНОЙ СТАТИСТИКИ
// ============================================

function getDefaultStats() {
  return {
    firstUse: Date.now(),
    totalSessions: 0,
    totalTime: 0,
    presetsUsed: {},
    sitesUsed: {},
    dailyStats: {},
    lastUpdate: Date.now()
  };
}

// ============================================
//  ИНИЦИАЛИЗАЦИЯ СТАТИСТИКИ
// ============================================

export function initStats() {
  loadStats();
  startTracking();
  console.log('📊 Статистика использования активирована');
}

// ============================================
//  ЗАГРУЗКА СТАТИСТИКИ
// ============================================

function loadStats() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    _stats = getDefaultStats();
    return;
  }
  
  chrome.storage.local.get([CONFIG.storageKey], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка загрузки статистики:', chrome.runtime.lastError);
      _stats = getDefaultStats();
      return;
    }
    
    _stats = result[CONFIG.storageKey] || getDefaultStats();
    
    // Убеждаемся, что все поля существуют
    if (!_stats.dailyStats) _stats.dailyStats = {};
    if (!_stats.presetsUsed) _stats.presetsUsed = {};
    if (!_stats.sitesUsed) _stats.sitesUsed = {};
    
    saveStats();
  });
}

// ============================================
//  СОХРАНЕНИЕ СТАТИСТИКИ
// ============================================

function saveStats() {
  if (!_stats) {
    _stats = getDefaultStats();
  }
  
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  
  chrome.storage.local.set({ [CONFIG.storageKey]: _stats }, () => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка сохранения статистики:', chrome.runtime.lastError);
    }
  });
}

// ============================================
//  НАЧАЛО ОТСЛЕЖИВАНИЯ
// ============================================

function startTracking() {
  if (_isTracking) return;
  if (!_stats) {
    _stats = getDefaultStats();
  }
  
  _isTracking = true;
  
  const day = getDayKey();
  
  if (!_stats.dailyStats[day]) {
    _stats.dailyStats[day] = {
      date: day,
      sessions: 0,
      time: 0,
      presetsUsed: {},
      eqChanges: 0,
      volumeChanges: 0,
      maxVolume: 0
    };
  }
  
  _stats.totalSessions++;
  _stats.dailyStats[day].sessions++;
  
  const startTime = Date.now();
  
  if (_statsInterval) {
    clearInterval(_statsInterval);
    _statsInterval = null;
  }
  
  _statsInterval = setInterval(() => {
    if (!_stats) {
      _stats = getDefaultStats();
    }
    
    const dayKey = getDayKey();
    
    if (!_stats.dailyStats[dayKey]) {
      _stats.dailyStats[dayKey] = {
        date: dayKey,
        sessions: 0,
        time: 0,
        presetsUsed: {},
        eqChanges: 0,
        volumeChanges: 0,
        maxVolume: 0
      };
    }
    
    _stats.dailyStats[dayKey].time += 1000;
    _stats.totalTime += 1000;
    _stats.lastUpdate = Date.now();
    
    saveStats();
  }, 1000);
}

// ============================================
//  ОСТАНОВКА ОТСЛЕЖИВАНИЯ
// ============================================

export function stopTracking() {
  if (_statsInterval) {
    clearInterval(_statsInterval);
    _statsInterval = null;
  }
  _isTracking = false;
  console.log('📊 Отслеживание статистики остановлено');
}

// ============================================
//  ЗАПИСЬ ИСПОЛЬЗОВАНИЯ ПРЕСЕТА
// ============================================

export function trackPresetUsage(preset) {
  if (!_stats) {
    _stats = getDefaultStats();
  }
  
  const day = getDayKey();
  
  if (!_stats.presetsUsed) _stats.presetsUsed = {};
  _stats.presetsUsed[preset] = (_stats.presetsUsed[preset] || 0) + 1;
  
  if (!_stats.dailyStats[day]) {
    _stats.dailyStats[day] = {
      date: day,
      sessions: 0,
      time: 0,
      presetsUsed: {},
      eqChanges: 0,
      volumeChanges: 0,
      maxVolume: 0
    };
  }
  
  if (!_stats.dailyStats[day].presetsUsed) {
    _stats.dailyStats[day].presetsUsed = {};
  }
  _stats.dailyStats[day].presetsUsed[preset] = 
    (_stats.dailyStats[day].presetsUsed[preset] || 0) + 1;
  
  saveStats();
}

// ============================================
//  ЗАПИСЬ ИСПОЛЬЗОВАНИЯ САЙТА
// ============================================

export function trackSiteUsage(url) {
  if (!_stats) {
    _stats = getDefaultStats();
  }
  
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    if (!_stats.sitesUsed) _stats.sitesUsed = {};
    _stats.sitesUsed[domain] = (_stats.sitesUsed[domain] || 0) + 1;
    saveStats();
  } catch (e) {
    // Игнорируем ошибки парсинга URL
  }
}

// ============================================
//  ЗАПИСЬ ИЗМЕНЕНИЙ
// ============================================

export function trackChange(type, value) {
  if (!_stats) {
    _stats = getDefaultStats();
  }
  
  const day = getDayKey();
  
  if (!_stats.dailyStats[day]) {
    _stats.dailyStats[day] = {
      date: day,
      sessions: 0,
      time: 0,
      presetsUsed: {},
      eqChanges: 0,
      volumeChanges: 0,
      maxVolume: 0
    };
  }
  
  if (type === 'eq') {
    _stats.dailyStats[day].eqChanges++;
  } else if (type === 'volume') {
    _stats.dailyStats[day].volumeChanges++;
    if (value > _stats.dailyStats[day].maxVolume) {
      _stats.dailyStats[day].maxVolume = value;
    }
  }
  saveStats();
}

// ============================================
//  ПОЛУЧЕНИЕ КЛЮЧА ДНЯ
// ============================================

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================
//  ПОЛУЧЕНИЕ СТАТИСТИКИ
// ============================================

export function getStats() {
  if (!_stats) {
    _stats = getDefaultStats();
  }
  return _stats;
}

export function getDailyStats(day = null) {
  if (!_stats) {
    _stats = getDefaultStats();
  }
  if (!day) day = getDayKey();
  return _stats.dailyStats[day] || null;
}

export function getTopPresets(limit = 10) {
  if (!_stats) {
    _stats = getDefaultStats();
  }
  
  const presets = Object.entries(_stats.presetsUsed || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return presets.map(([name, count]) => ({ name, count }));
}

export function getTopSites(limit = 10) {
  if (!_stats) {
    _stats = getDefaultStats();
  }
  
  const sites = Object.entries(_stats.sitesUsed || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return sites.map(([domain, count]) => ({ domain, count }));
}

// ============================================
//  РЕЖИМ ЭНЕРГОСБЕРЕЖЕНИЯ
// ============================================

export function setPowerSaveMode(enabled) {
  _powerSaveMode = enabled;
  
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ powerSaveMode: enabled }, () => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка сохранения powerSaveMode:', chrome.runtime.lastError);
      }
    });
  }
  
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({
      action: 'powerSaveModeChanged',
      enabled: enabled,
      interval: enabled ? CONFIG.powerSaveInterval : CONFIG.normalInterval
    });
  }
  
  // Обновляем интервал отслеживания
  if (_statsInterval) {
    clearInterval(_statsInterval);
    const interval = enabled ? CONFIG.powerSaveInterval : 1000;
    _statsInterval = setInterval(() => {
      if (!_stats) {
        _stats = getDefaultStats();
      }
      const dayKey = getDayKey();
      if (!_stats.dailyStats[dayKey]) {
        _stats.dailyStats[dayKey] = {
          date: dayKey,
          sessions: 0,
          time: 0,
          presetsUsed: {},
          eqChanges: 0,
          volumeChanges: 0,
          maxVolume: 0
        };
      }
      _stats.dailyStats[dayKey].time += interval;
      _stats.totalTime += interval;
      _stats.lastUpdate = Date.now();
      saveStats();
    }, interval);
  }
  
  console.log(`⚡ Режим энергосбережения: ${enabled ? 'ВКЛ' : 'ВЫКЛ'}`);
}

export function getPowerSaveMode() {
  return _powerSaveMode;
}

// ============================================
//  ОЧИСТКА СТАТИСТИКИ
// ============================================

export function clearStats() {
  _stats = getDefaultStats();
  saveStats();
  console.log('🗑️ Статистика очищена');
}

// ============================================
//  ПОЛНАЯ ОСТАНОВКА
// ============================================

export function destroyStats() {
  stopTracking();
  _stats = null;
  console.log('📊 Статистика уничтожена');
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  initStats,
  stopTracking,
  destroyStats,
  getStats,
  getDailyStats,
  getTopPresets,
  getTopSites,
  trackPresetUsage,
  trackSiteUsage,
  trackChange,
  setPowerSaveMode,
  getPowerSaveMode,
  clearStats,
  CONFIG
};