// ============================================
//  STATS.JS - Статистика использования (v3.22.8)
//  Энергосбережение: снижение частоты обновлений
// ============================================

const CONFIG = {
  storageKey: 'usageStats',
  maxDays: 30,
  powerSaveInterval: 5000, // 5 секунд в эконом-режиме
  normalInterval: 50 // 50 мс в обычном режиме
};

let _powerSaveMode = false;
let _stats = null;

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
    _stats = result[CONFIG.storageKey] || {
      firstUse: Date.now(),
      totalSessions: 0,
      totalTime: 0,
      presetsUsed: {},
      sitesUsed: {},
      dailyStats: {},
      lastUpdate: Date.now()
    };
    saveStats();
  });
}

// ============================================
//  СОХРАНЕНИЕ СТАТИСТИКИ
// ============================================

function saveStats() {
  chrome.storage.local.set({ [CONFIG.storageKey]: _stats });
}

// ============================================
//  НАЧАЛО ОТСЛЕЖИВАНИЯ
// ============================================

function startTracking() {
  const day = getDayKey();
  
  // Инициализация дневной статистики
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
  
  // Счетчик сессий
  _stats.totalSessions++;
  _stats.dailyStats[day].sessions++;
  
  const startTime = Date.now();
  
  // Отслеживаем активность
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const dayKey = getDayKey();
    
    // Обновляем дневную статистику
    if (_stats.dailyStats[dayKey]) {
      _stats.dailyStats[dayKey].time += 1000;
    }
    
    _stats.totalTime += 1000;
    _stats.lastUpdate = Date.now();
    
    saveStats();
  }, 1000);
  
  // Сохраняем интервал для очистки
  window._statsInterval = interval;
}

// ============================================
//  ЗАПИСЬ ИСПОЛЬЗОВАНИЯ ПРЕСЕТА
// ============================================

export function trackPresetUsage(preset) {
  if (!_stats) return;
  
  const day = getDayKey();
  
  // Глобальная статистика
  _stats.presetsUsed[preset] = (_stats.presetsUsed[preset] || 0) + 1;
  
  // Дневная статистика
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
    // Игнорируем
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
  
  chrome.storage.local.set({ powerSaveMode: enabled });
  
  // Уведомляем другие части расширения
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
  _stats = {
    firstUse: Date.now(),
    totalSessions: 0,
    totalTime: 0,
    presetsUsed: {},
    sitesUsed: {},
    dailyStats: {},
    lastUpdate: Date.now()
  };
  saveStats();
  console.log('🗑️ Статистика очищена');
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  initStats,
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