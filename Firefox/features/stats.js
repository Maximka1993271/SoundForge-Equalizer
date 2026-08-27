//  STATS.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  Статистика использования
//  Энергосбережение: снижение частоты обновлений
//  FIREFOX 153 OPTIMIZED: очистка интервалов и обработка ошибок
// ============================================

var browserAPI = globalThis.browser;
if (!browserAPI?.runtime) throw new Error('Mozilla Firefox extension API unavailable');

var CONFIG = {
  storageKey: 'usageStats',
  maxDays: 30,
  powerSaveInterval: 5000,
  normalInterval: 50
};

var _powerSaveMode = false;
var _stats = null;
var _trackingInterval = null;
var _isTracking = false;

// ============================================
//  ИНИЦИАЛИЗАЦИЯ СТАТИСТИКИ
// ============================================

export async function initStats() {
  if (_isTracking) return;
  await loadStats();
  startTracking();
  console.log('📊 Статистика использования активирована');
}

// ============================================
//  ЗАГРУЗКА СТАТИСТИКИ
// ============================================

function loadStats() {
  return new Promise(function(resolve) {
    browserAPI.storage.local.get([CONFIG.storageKey], function(result) {
    if (browserAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка загрузки статистики:', browserAPI.runtime.lastError);
      _stats = getDefaultStats();
      resolve(_stats);
      return;
    }
    
    _stats = normalizeStats(result[CONFIG.storageKey]);
    saveStats();
    resolve(_stats);
    });
  });
}

function normalizeStats(value) {
  var defaults = getDefaultStats();
  if (!value || typeof value !== 'object') return defaults;
  return {
    ...defaults,
    ...value,
    presetsUsed: value.presetsUsed && typeof value.presetsUsed === 'object' ? value.presetsUsed : {},
    sitesUsed: value.sitesUsed && typeof value.sitesUsed === 'object' ? value.sitesUsed : {},
    dailyStats: value.dailyStats && typeof value.dailyStats === 'object' ? value.dailyStats : {}
  };
}

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
//  СОХРАНЕНИЕ СТАТИСТИКИ
// ============================================

function saveStats() {
  if (!_stats) return;
  
  browserAPI.storage.local.set({ [CONFIG.storageKey]: _stats }, function() {
    if (browserAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка сохранения статистики:', browserAPI.runtime.lastError);
    }
  });
}

// ============================================
//  НАЧАЛО ОТСЛЕЖИВАНИЯ
// ============================================

function startTracking() {
  if (_isTracking) return;
  _isTracking = true;
  
  if (!_stats) _stats = getDefaultStats();
  var day = getDayKey();
  
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
  
  var startTime = Date.now();
  
  if (_trackingInterval) {
    clearInterval(_trackingInterval);
    _trackingInterval = null;
  }
  
  _trackingInterval = setInterval(function() {
    if (!_stats) return;
    var dayKey = getDayKey();
    if (!_stats.dailyStats[dayKey]) {
      _stats.dailyStats[dayKey] = { date: dayKey, sessions: 0, time: 0, presetsUsed: {}, eqChanges: 0, volumeChanges: 0, maxVolume: 0 };
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
  if (_trackingInterval) {
    clearInterval(_trackingInterval);
    _trackingInterval = null;
  }
  _isTracking = false;
  console.log('📊 Отслеживание статистики остановлено');
}

// ============================================
//  ЗАПИСЬ ИСПОЛЬЗОВАНИЯ ПРЕСЕТА
// ============================================

export function trackPresetUsage(preset) {
  if (!_stats) return;
  
  var day = getDayKey();
  
  _stats.presetsUsed[preset] = (_stats.presetsUsed[preset] || 0) + 1;
  
  if (_stats.dailyStats[day]) {
    _stats.dailyStats[day].presetsUsed[preset] = 
      (_stats.dailyStats[day].presetsUsed[preset] || 0) + 1;
  }
  
  saveStats();
}

// ============================================
//  ЗАПИСЬ ИСПОЛЬЗОВАНИЯ САЙТА
// ============================================

export function trackSiteUsage(url) {
  if (!_stats) return;
  
  try {
    var domain = new URL(url).hostname.replace('www.', '');
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
  if (!_stats) return;
  
  var day = getDayKey();
  
  if (_stats.dailyStats[day]) {
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
  return _stats;
}

export function getDailyStats(day) {
  day = day || getDayKey();
  return _stats?.dailyStats[day] || null;
}

export function getTopPresets(limit) {
  limit = limit || 10;
  if (!_stats) return [];
  
  var presets = Object.entries(_stats.presetsUsed || {})
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, limit);
  
  return presets.map(function(item) {
    return { name: item[0], count: item[1] };
  });
}

export function getTopSites(limit) {
  limit = limit || 10;
  if (!_stats) return [];
  
  var sites = Object.entries(_stats.sitesUsed || {})
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, limit);
  
  return sites.map(function(item) {
    return { domain: item[0], count: item[1] };
  });
}

// ============================================
//  РЕЖИМ ЭНЕРГОСБЕРЕЖЕНИЯ
// ============================================

export function setPowerSaveMode(enabled) {
  _powerSaveMode = enabled;
  
  browserAPI.storage.local.set({ powerSaveMode: enabled }, function() {
    if (browserAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка сохранения powerSaveMode:', browserAPI.runtime.lastError);
    }
  });
  
  browserAPI.runtime.sendMessage({
    action: 'powerSaveModeChanged',
    enabled: enabled,
    interval: enabled ? CONFIG.powerSaveInterval : CONFIG.normalInterval
  });
  
  console.log('⚡ Режим энергосбережения:', enabled ? 'ВКЛ' : 'ВЫКЛ');
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
  initStats: initStats,
  stopTracking: stopTracking,
  destroyStats: destroyStats,
  getStats: getStats,
  getDailyStats: getDailyStats,
  getTopPresets: getTopPresets,
  getTopSites: getTopSites,
  trackPresetUsage: trackPresetUsage,
  trackSiteUsage: trackSiteUsage,
  trackChange: trackChange,
  setPowerSaveMode: setPowerSaveMode,
  getPowerSaveMode: getPowerSaveMode,
  clearStats: clearStats,
  CONFIG: CONFIG
};