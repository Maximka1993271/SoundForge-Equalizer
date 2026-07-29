// ============================================
//  STATS.JS - Статистика использования (v3.22.8)
//  Энергосбережение: снижение частоты обновлений
//  ИСПРАВЛЕНО: очистка интервалов и обработка ошибок
// ============================================

const CONFIG = {
  storageKey: 'usageStats',
  maxDays: 30,
  powerSaveInterval: 5000,
  normalInterval: 50
};

let _powerSaveMode = false;
let _stats = null;
let _trackingInterval = null;
let _isTracking = false;

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
  chrome.storage.local.get([CONFIG.storageKey], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка загрузки статистики:', chrome.runtime.lastError);
      _stats = getDefaultStats();
      return;
    }
    
    _stats = result[CONFIG.storageKey] || getDefaultStats();
    saveStats();
  });
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
  
  if (_trackingInterval) {
    clearInterval(_trackingInterval);
    _trackingInterval = null;
  }
  
  _trackingInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const dayKey = getDayKey();
    
    if (_stats.dailyStats[dayKey]) {
      _stats.dailyStats[dayKey].time += 1000;
    }
    
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
  
  const day = getDayKey();
  
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
    const domain = new URL(url).hostname.replace('www.', '');
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
  
  const day = getDayKey();
  
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

export function getDailyStats(day = null) {
  if (!day) day = getDayKey();
  return _stats?.dailyStats[day] || null;
}

export function getTopPresets(limit = 10) {
  if (!_stats) return [];
  
  const presets = Object.entries(_stats.presetsUsed || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return presets.map(([name, count]) => ({ name, count }));
}

export function getTopSites(limit = 10) {
  if (!_stats) return [];
  
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
  
  chrome.storage.local.set({ powerSaveMode: enabled }, () => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка сохранения powerSaveMode:', chrome.runtime.lastError);
    }
  });
  
  chrome.runtime.sendMessage({
    action: 'powerSaveModeChanged',
    enabled: enabled,
    interval: enabled ? CONFIG.powerSaveInterval : CONFIG.normalInterval
  });
  
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