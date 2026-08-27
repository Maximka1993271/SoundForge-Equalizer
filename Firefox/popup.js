// ============================================
//  POPUP.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  ИСПРАВЛЕНО: защита connection state
//  ИСПРАВЛЕНО: дублирующие экспорты
// ============================================

console.log('🎛️ SoundForge Popup v3.22.8 Firefox 153');

// Per-popup binding prevents status updates from unrelated tabs.
var popupTargetTabId = null;
var spectrumClientId = 'popup_' + Date.now() + '_' + Math.random().toString(36).slice(2);
var popupStatusInterval = null;
var popupConnectWatchdog = null;

function clearPopupConnectWatchdog() {
  if (popupConnectWatchdog) {
    clearTimeout(popupConnectWatchdog);
    popupConnectWatchdog = null;
  }
}

function finishPopupConnectionLoading() {
  clearPopupConnectWatchdog();
  showLoading(false);
}


// ============================================
//  ИМПОРТЫ МОДУЛЕЙ
// ============================================

import { state, dom, initDom, updateState } from './modules/state.js';
import { 
  LANGUAGES, 
  detectLanguage, 
  setCurrentLang, 
  getCurrentLang, 
  t, 
  getVolumeWarning,
  formatExportCompleted,
  formatImportCompleted,
  formatPresetSaved,
  formatABSaved,
  formatNightModeOn,
  formatNightModeOff,
  formatPowerSaveOn,
  formatPowerSaveOff,
  formatHistoryRecords,
  formatStatsTotal,
  formatSettingsReset,
  formatConnectionError,
  formatPresetApplied,
  formatPresetAppliedReference
} from './modules/i18n.js';
import { PRESETS, PRESET_INFO, PRESET_ORDER } from './modules/config.js';
import { 
  setStatus as originalSetStatus,
  updateConnectButton as originalUpdateConnectButton,
  updatePresetInfo, 
  updateGainClass, 
  showLoading, 
  toggleTheme, 
  toggleExpand, 
  updateSiteInfo, 
  getPresetDisplay,
  getPresetDesc
} from './modules/ui.js';
import { 
  toggleConnection, 
  handleReset, 
  applyPreset, 
  applyPresetEQOnly, 
  applySavedSettings,
  applyPresetWithAnimation
} from './modules/audio.js';
import { 
  updateEQGraph, 
  updateSpectrum, 
  visualizationLoop, 
  updateVUMeter,
  initVisualization,
  resetVisualization,
  initVisualizationEffects,
  updateEffectButtonLabel,
  syncEffect,
  stopVisualization
} from './modules/visualization.js';
import { 
  getUserPresets, 
  saveUserPresets, 
  saveAllSettings, 
  getSliderGains,
  loadSettings, 
  exportSettings, 
  importSettings 
} from './modules/storage.js';
import { 
  populatePresetSelect, 
  saveUserPreset, 
  loadUserPreset, 
  toggleABCompare,
  handlePresetSelect 
} from './modules/presets.js';
import { storage, initializeStorage, onSettingChange } from './modules/storage-sync.js';

console.log('🎛️ SoundForge Popup v3.22.8 Firefox 153 - Единое хранилище (с эффектами)');

// ============================================
//  ПЕРЕВОДЫ ДЛЯ НОВЫХ КНОПОК
// ============================================

var BUTTON_LABELS = {
  ru: {
    night: '🌙 Ночной',
    night_on: '🌙 Ночной ON',
    power: '⚡ Эконом',
    power_on: '⚡ Эконом ON',
    window: '🪟 Окно',
    history: '📜 История',
    stats: '📊 Статистика',
    effect: '🎨 Эффект'
  },
  uk: {
    night: '🌙 Нічний',
    night_on: '🌙 Нічний ON',
    power: '⚡ Економ',
    power_on: '⚡ Економ ON',
    window: '🪟 Вікно',
    history: '📜 Історія',
    stats: '📊 Статистика',
    effect: '🎨 Ефект'
  },
  en: {
    night: '🌙 Night',
    night_on: '🌙 Night ON',
    power: '⚡ Power Save',
    power_on: '⚡ Power Save ON',
    window: '🪟 Window',
    history: '📜 History',
    stats: '📊 Stats',
    effect: '🎨 Effect'
  }
};

// ============================================
//  ПЕРЕВОДЫ ДЛЯ ДЕЙСТВИЙ В СТАТИСТИКЕ И ИСТОРИИ
// ============================================

var ACTION_TRANSLATIONS = {
  ru: {
    'night_mode_toggle': 'Ночной режим',
    'eq_enabled': 'Вкл. EQ',
    'eq_disabled': 'Выкл. EQ',
    'preset_applied': 'Пресет',
    'settings_change': 'Настройки',
    'power_save_toggle': 'Энергосбережение',
    'unknown': 'Действие'
  },
  uk: {
    'night_mode_toggle': 'Нічний режим',
    'eq_enabled': 'Увімк. EQ',
    'eq_disabled': 'Вимк. EQ',
    'preset_applied': 'Пресет',
    'settings_change': 'Налаштування',
    'power_save_toggle': 'Енергозбереження',
    'unknown': 'Дія'
  },
  en: {
    'night_mode_toggle': 'Night mode',
    'eq_enabled': 'EQ ON',
    'eq_disabled': 'EQ OFF',
    'preset_applied': 'Preset',
    'settings_change': 'Settings',
    'power_save_toggle': 'Power save',
    'unknown': 'Action'
  }
};

function getActionTranslation(action) {
  var lang = getCurrentLang();
  var dict = ACTION_TRANSLATIONS[lang] || ACTION_TRANSLATIONS.en;
  return dict[action] || action;
}

// ============================================
//  CONNECTION STATE GUARD (ЗАЩИТА)
// ============================================

var CONNECTION_STATES = ['connected', 'connecting', 'disconnected', 'error'];

function isConnectionState(status) {
  return CONNECTION_STATES.indexOf(status) !== -1;
}

// ============================================
//  ПЕРЕОПРЕДЕЛЕНИЕ setStatus С ЗАЩИТОЙ
// ============================================

// Переопределяем setStatus с защитой
function setStatus(status, text) {
  var currentStatus = state.currentStatus;
  var isCurrentConnection = isConnectionState(currentStatus);
  
  // ИНФОРМАЦИОННЫЕ СООБЩЕНИЯ НЕ МЕНЯЮТ СОСТОЯНИЕ ПОДКЛЮЧЕНИЯ
  if (status === 'ready' && isCurrentConnection) {
    // Меняем только текст, НЕ меняем состояние
    var txt = dom.statusText;
    if (txt) {
      txt.textContent = text || t('status_ready');
    }
    return;
  }
  
  // Для реальных состояний - вызываем оригинальную функцию
  originalSetStatus(status, text);
}

// Переопределяем updateConnectButton с защитой
function updateConnectButton(status) {
  // НЕ МЕНЯЕМ КНОПКУ ДЛЯ ИНФОРМАЦИОННЫХ СООБЩЕНИЙ
  if (!isConnectionState(status)) {
    return;
  }
  originalUpdateConnectButton(status);
}

// ============================================
//  УПРАВЛЕНИЕ ТЕМАМИ
// ============================================

function initThemeSelector() {
  var themeSelector = document.getElementById('themeSelector');
  if (!themeSelector) return;

  var themeOptions = themeSelector.querySelectorAll('.theme-option');

  var savedTheme = storage.get('theme', 'system');
  setTheme(savedTheme);
  updateThemeButtons(savedTheme);
  state.currentTheme = savedTheme;

  themeOptions.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var theme = this.dataset.theme;
      setTheme(theme);
      updateThemeButtons(theme);
      state.currentTheme = theme;
      storage.set('theme', theme);
      saveAllSettings();
      updateEQGraph();
    });
  });

  if (window.matchMedia) {
    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function() {
      if (state.currentTheme === 'system') {
        setTheme('system');
      }
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.currentTheme = theme;

  if (theme === 'system') {
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.style.colorScheme = prefersDark ? 'dark' : 'light';
  } else {
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }
}

function updateThemeButtons(activeTheme) {
  var themeSelector = document.getElementById('themeSelector');
  if (!themeSelector) return;

  var themeOptions = themeSelector.querySelectorAll('.theme-option');
  themeOptions.forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.theme === activeTheme);
  });
}

// ============================================
//  УПРАВЛЕНИЕ ЯЗЫКОМ
// ============================================

function initLanguage() {
  var savedLang = storage.get('language', null);
  
  if (savedLang && LANGUAGES[savedLang]) {
    setCurrentLang(savedLang);
  } else {
    var detectedLang = detectLanguage();
    setCurrentLang(detectedLang);
    storage.set('language', detectedLang);
  }
  updateLanguage();
  if (dom.langToggle) {
    dom.langToggle.textContent = LANGUAGES[getCurrentLang()].flag;
  }
  populatePresetSelect();
  
  if (dom.volumeSlider) {
    var currentVolume = parseInt(dom.volumeSlider.value);
    if (!Number.isFinite(currentVolume)) currentVolume = 100;
    updateVolumeStatus(currentVolume);
  }
}

function toggleLanguage() {
  var languages = ['ru', 'uk', 'en'];
  var currentIndex = languages.indexOf(getCurrentLang());
  var newLang = languages[(currentIndex + 1) % languages.length];
  setCurrentLang(newLang);
  storage.set('language', newLang);
  saveAllSettings();
  updateLanguage();
  updatePresetInfo(state.currentPreset);
  updateConnectButton(state.currentStatus);
  if (dom.langToggle) {
    dom.langToggle.textContent = LANGUAGES[getCurrentLang()].flag;
  }
  populatePresetSelect();
  
  updateEffectButtonLabel();
  
  if (dom.volumeSlider) {
    var currentVolume = parseInt(dom.volumeSlider.value);
    if (!Number.isFinite(currentVolume)) currentVolume = 100;
    updateVolumeStatus(currentVolume);
  }
}

function updateLanguage() {
  var lang = getCurrentLang();
  var labels = BUTTON_LABELS[lang] || BUTTON_LABELS.ru;
  
  if (dom.langToggle) {
    dom.langToggle.textContent = LANGUAGES[lang].flag;
  }
  
  if (dom.connectBtn) {
    if (state.currentStatus === 'connected') {
      dom.connectBtn.textContent = t('disconnect');
      dom.connectBtn.className = 'btn btn-connect disconnect';
    } else if (state.currentStatus === 'connecting') {
      dom.connectBtn.textContent = t('connecting');
      dom.connectBtn.className = 'btn btn-connect';
      dom.connectBtn.style.opacity = '0.7';
    } else {
      dom.connectBtn.textContent = t('connect');
      dom.connectBtn.className = 'btn btn-connect';
      dom.connectBtn.style.opacity = '1';
    }
  }
  
  if (dom.resetBtn) {
    dom.resetBtn.textContent = t('reset');
  }
  
  if (dom.exportBtn) {
    dom.exportBtn.textContent = t('export');
  }
  
  if (dom.importBtn) {
    dom.importBtn.textContent = t('import');
  }
  
  if (dom.savePresetBtn) {
    dom.savePresetBtn.textContent = t('save_preset');
  }
  
  if (dom.abCompareBtn) {
    dom.abCompareBtn.textContent = t('compare');
  }
  
  if (dom.volumeLabel) dom.volumeLabel.textContent = t('volume');
  if (dom.bassLabel) dom.bassLabel.textContent = t('bass');
  if (dom.visStatus) dom.visStatus.textContent = t('visualization');
  
  updateEffectButtonLabel();
  
  var nightBtn = document.getElementById('nightModeBtn');
  if (nightBtn) {
    var isNightOn = nightBtn.dataset.active === 'true';
    nightBtn.textContent = isNightOn ? labels.night_on : labels.night;
  }
  
  var powerBtn = document.getElementById('powerSaveBtn');
  if (powerBtn) {
    var isPowerOn = powerBtn.dataset.active === 'true';
    powerBtn.textContent = isPowerOn ? labels.power_on : labels.power;
  }
  
  var windowBtn = document.getElementById('openWindowBtn');
  if (windowBtn) {
    windowBtn.textContent = labels.window;
  }
  
  var historyBtn = document.getElementById('historyBtn');
  if (historyBtn) {
    historyBtn.textContent = labels.history;
  }
  
  var statsBtn = document.getElementById('statsBtn');
  if (statsBtn) {
    statsBtn.textContent = labels.stats;
  }
  
  var statsSpan = document.querySelector('.stats');
  if (statsSpan) {
    statsSpan.innerHTML = '🎛️ <span id="filterCount">10</span>' + t('bands');
  }
  
  var statusTxt = dom.statusText;
  if (statusTxt) {
    var statusMap = {
      'ready': 'status_ready',
      'connected': 'status_connected',
      'disconnected': 'status_disconnected',
      'connecting': 'status_connecting',
      'reset': 'status_reset'
    };
    if (statusMap[state.currentStatus]) {
      statusTxt.textContent = t(statusMap[state.currentStatus]);
    }
  }
  
  updatePresetInfo(state.currentPreset);
  
  if (dom.volumeSlider) {
    var currentVolume = parseInt(dom.volumeSlider.value);
    if (!Number.isFinite(currentVolume)) currentVolume = 100;
    updateVolumeStatus(currentVolume);
  }
}

// ============================================
//  СОХРАНЕНИЕ СОСТОЯНИЯ РАЗВЕРНУТОГО ОКНА
// ============================================

function initWindowState() {
  var isExpanded = storage.get('popupExpanded', false);
  var body = document.body;
  var expandBtn = dom.expandBtn;
  
  if (isExpanded) {
    body.classList.add('expanded');
    body.style.width = '100%';
    body.style.maxHeight = '100vh';
    if (expandBtn) expandBtn.textContent = '⬛';
  } else {
    body.classList.remove('expanded');
    body.style.width = '480px';
    body.style.maxHeight = '700px';
    if (expandBtn) expandBtn.textContent = '⬜';
  }
}

function handleExpandToggle() {
  var body = document.body;
  var expandBtn = dom.expandBtn;
  if (!expandBtn) return;
  
  if (body.classList.contains('expanded')) {
    body.classList.remove('expanded');
    body.style.width = '480px';
    body.style.maxHeight = '700px';
    expandBtn.textContent = '⬜';
    storage.set('popupExpanded', false);
  } else {
    body.classList.add('expanded');
    body.style.width = '100%';
    body.style.maxHeight = '100vh';
    expandBtn.textContent = '⬛';
    storage.set('popupExpanded', true);
  }
  
  setTimeout(function() {
    updateEQGraph();
  }, 50);
}

// ============================================
//  ФУНКЦИИ ЭКСПОРТА/ИМПОРТА
// ============================================

async function handleExport() {
  showLoading(true);
  try {
    var exportData = await storage.exportSettings();
    var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'soundforge_settings_backup_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showLoading(false);
    setStatus('ready', formatExportCompleted());
  } catch (err) {
    showLoading(false);
    setStatus('disconnected', '⚠️ ' + err.message);
    console.error('❌ Ошибка экспорта:', err);
  }
}

function handleImport() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;

    showLoading(true);
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        await storage.importSettings(ev.target.result);
        showLoading(false);
        setStatus('ready', formatImportCompleted());
        await loadSettingsAndApply();
        populatePresetSelect();
        updateEQGraph();
      } catch (err) {
        showLoading(false);
        setStatus('disconnected', '⚠️ ' + err.message);
        console.error('❌ Ошибка импорта:', err);
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

// ============================================
//  ИНДИКАТОР СОСТОЯНИЯ ГРОМКОСТИ
// ============================================

function updateVolumeStatus(volume) {
  var statusEl = document.getElementById('volumeStatus');
  if (!statusEl) return;
  
  var warningText = getVolumeWarning(volume);
  
  var color = '#666';
  var glow = 'none';
  var transform = 'scale(1)';
  var textShadow = 'none';
  
  if (volume === 0) {
    color = '#666';
    glow = 'none';
  } else if (volume <= 80) {
    color = '#4CAF50';
    glow = 'glowGreen 2s ease-in-out infinite';
  } else if (volume <= 130) {
    color = '#4CAF50';
    glow = 'glowGreen 2s ease-in-out infinite';
  } else if (volume <= 200) {
    color = '#8BC34A';
    glow = 'glowGreen 1.5s ease-in-out infinite';
  } else if (volume <= 300) {
    color = '#FFC107';
    glow = 'glowYellow 1s ease-in-out infinite';
  } else if (volume <= 450) {
    color = '#FF9800';
    glow = 'glowOrange 0.8s ease-in-out infinite';
    textShadow = '0 0 20px ' + color + '40';
    transform = 'scale(1.05)';
  } else if (volume <= 600) {
    color = '#f44336';
    glow = 'glowRed 0.6s ease-in-out infinite';
    textShadow = '0 0 25px ' + color + '50';
    transform = 'scale(1.08)';
  } else if (volume <= 750) {
    color = '#d32f2f';
    glow = 'glowRed 0.4s ease-in-out infinite';
    textShadow = '0 0 30px ' + color + '60';
    transform = 'scale(1.1)';
  } else {
    color = '#ff1744';
    glow = 'glowRed 0.3s ease-in-out infinite';
    textShadow = '0 0 35px ' + color + '70';
    transform = 'scale(1.12)';
  }
  
  statusEl.textContent = warningText;
  statusEl.style.color = color;
  statusEl.style.fontWeight = '700';
  statusEl.style.transition = 'all 0.3s ease';
  statusEl.style.animation = glow;
  statusEl.style.textShadow = textShadow;
  statusEl.style.transform = transform;
}

// ============================================
//  ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ПОДКЛЮЧЕНИЯ
// ============================================

function restoreConnectionState() {
  var browserAPI = globalThis.browser;

  // Runtime per-tab state is the source of truth. A persisted global flag can
  // belong to another tab or survive a service-worker restart.
  browserAPI.runtime.sendMessage({ action: 'getStatus' }, function(response) {
    if (browserAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения статуса:', browserAPI.runtime.lastError.message);
      state.isConnected = false;
      setStatus('disconnected', t('status_disconnected'));
      return;
    }

    if (response && response.tabId != null) popupTargetTabId = Number(response.tabId);
    var status = response && response.status ? response.status : 'disconnected';
    if (status === 'connected') {
      state.isConnected = true;
      setStatus('connected', t('status_connected'));
    } else if (status === 'connecting') {
      state.isConnected = false;
      setStatus('connecting', t('status_connecting'));
    } else {
      state.isConnected = false;
      setStatus('disconnected', t('status_disconnected'));
    }
  });
}

// ============================================
//  ПРИМЕНЕНИЕ ПРЕСЕТА В POPUP
// ============================================

function syncPresetUIInPopup(name) {
  var userPresets = getUserPresets();
  var isUserPreset = !!userPresets[name];
  var preset = isUserPreset ? userPresets[name] : PRESETS[name];
  if (!preset) {
    console.warn('⚠️ Пресет "' + name + '" не найден для синхронизации UI');
    return false;
  }

  state.currentPreset = name;
  updatePresetInfo(name);
  if (dom.presetSelect) dom.presetSelect.value = isUserPreset ? 'user_' + name : name;

  var sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
  var gains = preset.gains || {};
  sliders.forEach(function(slider) {
    var freq = slider.dataset.freq;
    if (gains[freq] !== undefined) {
      var value = Number(gains[freq]) || 0;
      slider.value = value;
      var valueSpan = slider.parentElement.querySelector('.gain-value');
      if (valueSpan) {
        valueSpan.textContent = value.toFixed(1);
        valueSpan.className = value > 0.1 ? 'gain-value positive' : (value < -0.1 ? 'gain-value negative' : 'gain-value zero');
      }
    }
  });

  if (dom.volumeSlider && dom.volumeDisplay) {
    var vol = Number.isFinite(Number(preset.volume)) ? Math.min(800, Math.max(0, Number(preset.volume))) : 100;
    dom.volumeSlider.value = vol;
    dom.volumeDisplay.textContent = vol + '%';
    updateVolumeStatus(vol);
  }

  if (dom.bassSlider && dom.bassDisplay) {
    var bass = Number.isFinite(Number(preset.bass)) ? Math.max(-12, Math.min(12, Number(preset.bass))) : 0;
    dom.bassSlider.value = bass;
    dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';
  }

  updateEQGraph();
  return true;
}

function applyPresetInPopup(name) {
  var userPresets = getUserPresets();
  var isUserPreset = !!userPresets[name];
  var preset = isUserPreset ? userPresets[name] : PRESETS[name];
  if (!preset) {
    console.warn('⚠️ Пресет "' + name + '" не найден');
    return;
  }

  console.log('🎵 Применяем пресет в popup:', name);
  if (!syncPresetUIInPopup(name)) return;

  var sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
  var gainsData = {};
  sliders.forEach(function(slider) {
    gainsData[slider.dataset.freq] = parseFloat(slider.value) || 0;
  });

  var browserAPI = globalThis.browser;
  browserAPI.runtime.sendMessage({
    action: 'applyPreset',
    preset: name,
    presetData: {
      gains: gainsData,
      volume: Number.isFinite(Number(preset.volume)) ? Number(preset.volume) : 100,
      bass: Number.isFinite(Number(preset.bass)) ? Number(preset.bass) : 0
    },
    source: 'popup'
  }, function(response) {
    if (browserAPI.runtime.lastError) {
      console.warn('⚠️ Не удалось применить пресет:', browserAPI.runtime.lastError.message);
      return;
    }
    if (response && response.status === 'disconnected') {
      console.warn('⚠️ Пресет сохранён, но аудиовкладка сейчас отключена');
    }
  });

  saveAllSettings();
  setStatus('ready', formatPresetApplied(name));
}

// ============================================
//  ПОДКЛЮЧЕНИЕ/ОТКЛЮЧЕНИЕ (FIREFOX 153 OPTIMIZED)
// ============================================

function handleConnectDisconnect() {
  var browserAPI = globalThis.browser;
  if (state.isLoading || state.currentStatus === 'connecting') return;

  var disconnecting = state.currentStatus === 'connected' || state.isConnected;
  showLoading(true);

  if (disconnecting) {
    browserAPI.runtime.sendMessage({ action: 'disconnect', targetTabId: popupTargetTabId }, function(response) {
      finishPopupConnectionLoading();
      if (response && response.tabId != null) popupTargetTabId = Number(response.tabId);
      if (browserAPI.runtime.lastError || !response || response.status !== 'disconnected') {
        setStatus('error', formatConnectionError());
        return;
      }
      state.isConnected = false;
      setStatus('disconnected', t('status_disconnected'));
    });
    return;
  }

  state.isConnected = false;
  setStatus('connecting', t('status_connecting'));
  browserAPI.runtime.sendMessage({ action: 'connect', targetTabId: popupTargetTabId }, function(response) {
    if (response && response.tabId != null) popupTargetTabId = Number(response.tabId);
    if (browserAPI.runtime.lastError || !response) {
      finishPopupConnectionLoading();
      state.isConnected = false;
      setStatus('error', formatConnectionError());
      return;
    }

    if (response.status === 'connected') {
      finishPopupConnectionLoading();
      state.isConnected = true;
      setStatus('connected', t('status_connected'));
      applySavedSettings(false);
      return;
    }

    if (response.status === 'connecting') {
      // Final state normally arrives through statusUpdate. A watchdog prevents
      // the modal overlay from trapping the popup if a runtime message is lost.
      clearPopupConnectWatchdog();
      popupConnectWatchdog = setTimeout(function() {
        browserAPI.runtime.sendMessage({ action: 'getStatus', targetTabId: popupTargetTabId }, function(statusResponse) {
          finishPopupConnectionLoading();
          if (browserAPI.runtime.lastError || !statusResponse) {
            state.isConnected = false;
            setStatus('error', formatConnectionError());
            return;
          }
          if (statusResponse.tabId != null) popupTargetTabId = Number(statusResponse.tabId);
          if (statusResponse.status === 'connected') {
            state.isConnected = true;
            setStatus('connected', t('status_connected'));
            applySavedSettings(false);
          } else if (statusResponse.status === 'connecting') {
            state.isConnected = false;
            setStatus('connecting', t('status_connecting'));
          } else {
            state.isConnected = false;
            setStatus('disconnected', t('status_disconnected'));
          }
        });
      }, 6000);
      return;
    }

    finishPopupConnectionLoading();
    state.isConnected = false;
    setStatus('disconnected', t('status_disconnected'));
  });
}

// ============================================
//  ЗАГРУЗКА НАСТРОЕК
// ============================================

async function loadSettingsAndApply() {
  try {
    var settings = storage.getAll();
    
    console.log('📥 Загрузка настроек из единого хранилища', settings);

    if (settings.theme) {
      state.currentTheme = settings.theme;
      setTheme(settings.theme);
      updateThemeButtons(settings.theme);
    }

    if (settings.language) {
      setCurrentLang(settings.language);
      if (dom.langToggle) {
        dom.langToggle.textContent = LANGUAGES[settings.language].flag;
      }
      updateLanguage();
    }

    applySavedSettings(true);
    
    if (settings.selectedPreset && PRESETS[settings.selectedPreset]) {
      state.currentPreset = settings.selectedPreset;
      if (dom.presetSelect) dom.presetSelect.value = settings.selectedPreset;
      updatePresetInfo(settings.selectedPreset);
      applyPresetInPopup(settings.selectedPreset);
    }

    console.log('✅ Настройки успешно загружены из единого хранилища');
  } catch (e) {
    console.error('❌ Ошибка загрузки настроек:', e);
  }
}

// ============================================
//  НОВЫЕ ФУНКЦИИ ДЛЯ КНОПОК
// ============================================

function addHotkeyInfo() {
  var footer = document.querySelector('.footer');
  if (footer) {
    var hotkeyInfo = document.createElement('span');
    hotkeyInfo.className = 'hotkey-info';
    hotkeyInfo.textContent = '⌨️ Ctrl+Shift+E | Ctrl+Shift+Y | Ctrl+Shift+X | Ctrl+Shift+L';
    hotkeyInfo.style.cssText = 'font-size:8px;color:#667799;opacity:0.6;margin-left:10px;';
    footer.appendChild(hotkeyInfo);
  }
}

function setupNewFeatureButtons() {
  var browserAPI = globalThis.browser;
  var lang = getCurrentLang();
  var labels = BUTTON_LABELS[lang] || BUTTON_LABELS.ru;
  
  // === НОЧНОЙ РЕЖИМ ===
  var nightBtn = document.getElementById('nightModeBtn');
  if (nightBtn) {
    nightBtn.addEventListener('click', function() {
      browserAPI.runtime.sendMessage({ action: 'toggleNightMode' }, function(response) {
        if (response && response.enabled !== undefined) {
          nightBtn.dataset.active = response.enabled ? 'true' : 'false';
          var langNow = getCurrentLang();
          var labelNow = BUTTON_LABELS[langNow] || BUTTON_LABELS.ru;
          nightBtn.textContent = response.enabled ? labelNow.night_on : labelNow.night;
          nightBtn.style.borderColor = response.enabled ? '#4CAF50' : 'rgba(255,255,255,0.06)';
          nightBtn.style.color = response.enabled ? '#4CAF50' : '#8899bb';
          
          var message = response.enabled ? formatNightModeOn() : formatNightModeOff();
          setStatus('ready', message);
        }
      });
    });
  }
  
  // === ЭНЕРГОСБЕРЕЖЕНИЕ ===
  var powerBtn = document.getElementById('powerSaveBtn');
  if (powerBtn) {
    powerBtn.addEventListener('click', function() {
      browserAPI.runtime.sendMessage({ action: 'togglePowerSave' }, function(response) {
        if (response && response.enabled !== undefined) {
          powerBtn.dataset.active = response.enabled ? 'true' : 'false';
          var langNow = getCurrentLang();
          var labelNow = BUTTON_LABELS[langNow] || BUTTON_LABELS.ru;
          powerBtn.textContent = response.enabled ? labelNow.power_on : labelNow.power;
          powerBtn.style.borderColor = response.enabled ? '#FF9800' : 'rgba(255,255,255,0.06)';
          powerBtn.style.color = response.enabled ? '#FF9800' : '#8899bb';
          
          var message = response.enabled ? formatPowerSaveOn() : formatPowerSaveOff();
          setStatus('ready', message);
        }
      });
    });
  }
  
  // === ОТКРЫТИЕ ОКНА ===
  var windowBtn = document.getElementById('openWindowBtn');
  if (windowBtn) {
    windowBtn.addEventListener('click', function() {
      browserAPI.runtime.sendMessage({ action: 'open_window' });
    });
  }
  
  // === ИСТОРИЯ ===
  var historyBtn = document.getElementById('historyBtn');
  if (historyBtn) {
    historyBtn.addEventListener('click', function() {
      browserAPI.runtime.sendMessage({ action: 'getHistory' }, function(response) {
        if (response && response.history) {
          var history = response.history;
          var count = history.length;
          
          if (count === 0) {
            setStatus('ready', t('history_empty'));
          } else {
            var lastAction = history[history.length - 1];
            var actionName = lastAction.action || 'unknown';
            var translatedAction = getActionTranslation(actionName);
            setStatus('ready', formatHistoryRecords(count, translatedAction));
            console.log('📜 История:', history.slice(-10));
          }
        }
      });
    });
  }
  
  // === СТАТИСТИКА ===
  var statsBtn = document.getElementById('statsBtn');
  if (statsBtn) {
    statsBtn.addEventListener('click', function() {
      browserAPI.storage.local.get(['settingsHistory'], function(result) {
        var history = result.settingsHistory || [];
        var total = history.length;
        
        if (total === 0) {
          setStatus('ready', t('history_empty'));
          return;
        }
        
        var actions = {};
        history.forEach(function(h) {
          var actionName = h.action || 'unknown';
          actions[actionName] = (actions[actionName] || 0) + 1;
        });
        
        var totalText = t('stats_total', { count: total });
        
        var topActions = Object.entries(actions)
          .sort(function(a, b) { return b[1] - a[1]; })
          .slice(0, 3);
        
        var topText = '';
        if (topActions.length > 0) {
          var topStr = topActions.map(function(item) {
            var translatedName = getActionTranslation(item[0]);
            return translatedName + '(' + item[1] + ')';
          }).join(', ');
          topText = t('stats_top', { top: topStr });
        }
        
        var statsText = totalText + topText;
        setStatus('ready', statsText);
      });
    });
  }
}

// ============================================
//  ОБРАБОТЧИК СООБЩЕНИЙ (FIREFOX 153 OPTIMIZED)
// ============================================

var browserAPI = globalThis.browser;
browserAPI.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('📨 Popup получил сообщение:', request.action);
  
  if (request.action === 'spectrumData' && request.spectrum) {
    var data = request.spectrum;
    var len = Math.min(data.length, state.spectrumData.length);
    for (var i = 0; i < len; i++) {
      state.spectrumData[i] = data[i] || 0;
    }
    if (request.rms !== undefined) {
      state.rmsValue = Math.max(0, Math.min(1, Number(request.rms) || 0));
    }
    if (request.peak !== undefined) {
      state.peakValue = Math.max(0, Math.min(1, Number(request.peak) || 0));
    }
    state.isClipping = request.clipping === true;
    state.hasAudio = request.hasAudio === true;
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (request.action === 'presetChanged' && request.preset) {
    console.log('🔄 Пресет синхронизирован из background:', request.preset);
    if (syncPresetUIInPopup(request.preset)) {
      setStatus('ready', formatPresetApplied(request.preset));
    }
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (request.action === 'settingsReset') {
    console.log('🔄 Настройки сброшены через горячие клавиши (background)');
    var sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
    sliders.forEach(function(slider) {
      slider.value = 0;
      var valueSpan = slider.parentElement.querySelector('.gain-value');
      if (valueSpan) {
        valueSpan.textContent = '0.0';
        valueSpan.className = 'gain-value zero';
      }
    });
    if (dom.volumeSlider && dom.volumeDisplay) {
      dom.volumeSlider.value = 100;
      dom.volumeDisplay.textContent = '100%';
      updateVolumeStatus(100);
    }
    if (dom.bassSlider && dom.bassDisplay) {
      dom.bassSlider.value = 0;
      dom.bassDisplay.textContent = '0.0 dB';
    }
    state.currentPreset = 'flat';
    updatePresetInfo('flat');
    if (dom.presetSelect) dom.presetSelect.value = 'flat';
    saveAllSettings();
    updateEQGraph();
    setStatus('ready', formatSettingsReset());
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (request.action === 'effectChanged' && request.effect) {
    try {
      syncEffect(request.effect);
      console.log('🎨 Popup синхронизировал эффект:', request.effect);
    } catch (e) {
      console.warn('⚠️ Не удалось синхронизировать эффект в Popup:', e);
    }
    sendResponse({ status: 'ok', effect: request.effect });
    return true;
  }
  
  if (request.action === 'userPresetsUpdated' && request.presets) {
    saveUserPresets(request.presets);
    populatePresetSelect();
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (request.action === 'statusUpdate') {
    // Ignore broadcasts from other audio tabs once this popup is bound.
    if (request.tabId != null && popupTargetTabId != null && Number(request.tabId) !== Number(popupTargetTabId)) {
      sendResponse({ status: 'ignored', reason: 'different_tab' });
      return true;
    }
    if (request.tabId != null) popupTargetTabId = Number(request.tabId);
    if (request.status === 'connected') {
      finishPopupConnectionLoading();
      setStatus('connected', t('status_connected'));
      state.isConnected = true;
      browserAPI.storage.local.set({ soundforgeConnected: true });
    } else if (request.status === 'disconnected') {
      finishPopupConnectionLoading();
      setStatus('disconnected', t('status_disconnected'));
      state.isConnected = false;
      browserAPI.storage.local.set({ soundforgeConnected: false });
    } else if (request.status === 'error') {
      finishPopupConnectionLoading();
      setStatus('disconnected', formatConnectionError());
      state.isConnected = false;
      browserAPI.storage.local.set({ soundforgeConnected: false });
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'nightModeStatus') {
    var nightBtn = document.getElementById('nightModeBtn');
    if (nightBtn) {
      var lang = getCurrentLang();
      var labels = BUTTON_LABELS[lang] || BUTTON_LABELS.ru;
      nightBtn.dataset.active = request.enabled ? 'true' : 'false';
      nightBtn.textContent = request.enabled ? labels.night_on : labels.night;
      nightBtn.style.borderColor = request.enabled ? '#4CAF50' : 'rgba(255,255,255,0.06)';
      nightBtn.style.color = request.enabled ? '#4CAF50' : '#8899bb';
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'powerSaveStatus') {
    var powerBtn = document.getElementById('powerSaveBtn');
    if (powerBtn) {
      var lang = getCurrentLang();
      var labels = BUTTON_LABELS[lang] || BUTTON_LABELS.ru;
      powerBtn.dataset.active = request.enabled ? 'true' : 'false';
      powerBtn.textContent = request.enabled ? labels.power_on : labels.power;
      powerBtn.style.borderColor = request.enabled ? '#FF9800' : 'rgba(255,255,255,0.06)';
      powerBtn.style.color = request.enabled ? '#FF9800' : '#8899bb';
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'storageStats') {
    sendResponse({ status: 'ok', stats: storage.getStats() });
    return true;
  }
  
  return false;
});

// ============================================
//  ИНИЦИАЛИЗАЦИЯ POPUP
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM загружен, инициализация...');
  initPopup();
});

async function initPopup() {
  console.log('🔧 initPopup вызван');

  initDom();

  if (!dom.connectBtn) {
    console.error('❌ Кнопка "Подключить" не найдена!');
    return;
  }

  console.log('✅ Все элементы найдены');

  try {
    await initializeStorage();
    console.log('✅ Единое хранилище инициализировано');
  } catch (e) {
    console.error('❌ Ошибка инициализации хранилища:', e);
  }

  onSettingChange('theme', function(value) {
    setTheme(value);
    updateThemeButtons(value);
    updateEQGraph();
  });

  onSettingChange('language', function(value) {
    setCurrentLang(value);
    updateLanguage();
    populatePresetSelect();
    if (dom.volumeSlider) {
      var currentVolume = parseInt(dom.volumeSlider.value);
    if (!Number.isFinite(currentVolume)) currentVolume = 100;
      updateVolumeStatus(currentVolume);
    }
  });

  onSettingChange('popupExpanded', function(value) {});

  initWindowState();
  initThemeSelector();
  initLanguage();
  populatePresetSelect();
  
  restoreConnectionState();

  dom.connectBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleConnectDisconnect();
  });

  dom.resetBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    await handleReset(function(volume) {
      updateVolumeStatus(volume);
    });
    if (dom.volumeSlider) {
      var currentVolume = parseInt(dom.volumeSlider.value);
    if (!Number.isFinite(currentVolume)) currentVolume = 100;
      updateVolumeStatus(currentVolume);
    }
  });

  if (dom.presetSelect) {
    dom.presetSelect.addEventListener('change', function() {
      var value = this.value;
      console.log('🔄 Выбран пресет в popup:', value);
      
      if (!value) {
        state.currentPreset = 'custom';
        updatePresetInfo('custom');
        return;
      }
      
      if (value.startsWith('user_')) {
        var userPresetName = value.substring(5);
        var userPresets = getUserPresets();
        var preset = userPresets[userPresetName];
        if (preset) {
          applyPresetInPopup(userPresetName);
        }
      } else if (PRESETS[value]) {
        applyPresetInPopup(value);
      }
    });
  }

  if (dom.eqSliders) {
    dom.eqSliders.forEach(function(slider) {
      var valueSpan = slider.parentElement.querySelector('.gain-value');

      slider.addEventListener('input', function() {
        var val = parseFloat(slider.value);
        if (valueSpan) {
          valueSpan.textContent = val.toFixed(1);
          updateGainClass(valueSpan, val);
        }
        updateEQGraph();
        var gains = getSliderGains();
        browserAPI.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true });
        saveAllSettings();
        state.currentPreset = 'custom';
        updatePresetInfo('custom');
        if (dom.presetSelect) dom.presetSelect.value = '';
      });

      slider.addEventListener('change', function() {
        var gains = getSliderGains();
        browserAPI.runtime.sendMessage({ action: 'updateEQ', gains: gains });
        saveAllSettings();
        updateEQGraph();
      });
    });
  }

  if (dom.volumeSlider && dom.volumeDisplay) {
    var initialVolume = parseInt(dom.volumeSlider.value);
    if (!Number.isFinite(initialVolume)) initialVolume = 100;
    updateVolumeStatus(initialVolume);
    
    dom.volumeSlider.addEventListener('input', function() {
      var val = parseInt(this.value);
      dom.volumeDisplay.textContent = val + '%';
      updateVolumeStatus(val);
      var volumeValue = val / 100;
      browserAPI.runtime.sendMessage({ 
        action: 'setVolume', 
        value: volumeValue, 
        instant: true 
      });
      saveAllSettings();
      
      if (val === 0) {
        browserAPI.runtime.sendMessage({ 
          action: 'setVolume', 
          value: 0, 
          instant: true,
          forceMute: true 
        });
      }
    });
    
    dom.volumeSlider.addEventListener('change', function() {
      var val = parseInt(this.value);
      var volumeValue = val / 100;
      browserAPI.runtime.sendMessage({ action: 'setVolume', value: volumeValue });
      saveAllSettings();
      
      if (val === 0) {
        browserAPI.runtime.sendMessage({ 
          action: 'setVolume', 
          value: 0,
          forceMute: true 
        });
      }
    });
  }

  if (dom.bassSlider && dom.bassDisplay) {
    dom.bassSlider.addEventListener('input', function() {
      dom.bassDisplay.textContent = parseFloat(this.value).toFixed(1) + ' dB';
      var val = parseFloat(this.value);
      browserAPI.runtime.sendMessage({ action: 'setBass', value: val, instant: true });
      saveAllSettings();
    });
    dom.bassSlider.addEventListener('change', function() {
      var val = parseFloat(this.value);
      browserAPI.runtime.sendMessage({ action: 'setBass', value: val });
      saveAllSettings();
    });
  }

  if (dom.langToggle) {
    dom.langToggle.addEventListener('click', function() {
      toggleLanguage();
    });
  }

  if (dom.exportBtn) {
    dom.exportBtn.addEventListener('click', handleExport);
  }

  if (dom.importBtn) {
    dom.importBtn.addEventListener('click', handleImport);
  }

  if (dom.savePresetBtn) {
    dom.savePresetBtn.addEventListener('click', function() {
      var name = prompt(t('save_preset') + ':', 'My Preset');
      if (!name) return;

      var presets = getUserPresets();
      
      if (presets[name]) {
        if (!confirm('Пресет "' + name + '" уже существует. Перезаписать?')) {
          return;
        }
      }

      var gains = getSliderGains();
      var volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
      var bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;

      presets[name] = {
        gains: gains,
        volume: volume,
        bass: bass,
        timestamp: Date.now()
      };

      saveUserPresets(presets);
      populatePresetSelect();
      setStatus('ready', formatPresetSaved(name));
    });
  }

  if (dom.abCompareBtn) {
    dom.abCompareBtn.onclick = function() {
      try {
        toggleABCompare();
      } catch (e) {
        console.error('❌ A/B compare error:', e);
        setStatus('disconnected', t('error'));
      }
    };
  }

  if (dom.expandBtn) {
    dom.expandBtn.addEventListener('click', function() {
      handleExpandToggle();
    });
  }

  await loadSettingsAndApply();
  
  updateSiteInfo();
  updateEQGraph();
  updateLanguage();

  // ============================================
  //  ИНИЦИАЛИЗАЦИЯ ВИЗУАЛИЗАЦИИ
  // ============================================
  
  initVisualizationEffects();
  console.log('🎨 Эффекты визуализации инициализированы');
  
  initVisualization();
  console.log('🟢 Визуализация инициализирована');
  
  visualizationLoop();
  console.log('🔄 Цикл визуализации запущен');
  
  setTimeout(function() {
    updateSpectrum();
    console.log('📊 Спектр обновлен');
  }, 100);

  setTimeout(function() {
    updateEQGraph();
    console.log('📈 График АЧХ обновлен');
  }, 200);

  // ============================================
  //  РЕГИСТРАЦИЯ СЛУШАТЕЛЯ СПЕКТРА
  // ============================================
  
  try {
    browserAPI.runtime.sendMessage({ 
      action: 'registerSpectrumListener', 
      clientId: spectrumClientId 
    }, function(response) {
      if (response && response.status === 'ok') {
        console.log('✅ Popup зарегистрирован как слушатель спектра');
      }
    });
  } catch (e) {
    console.warn('⚠️ Не удалось зарегистрировать слушатель спектра:', e);
  }

  setTimeout(function() {
    browserAPI.runtime.sendMessage({ action: 'getSpectrum' });
    console.log('📊 Запрошен спектр');
  }, 250);

  popupStatusInterval = setInterval(function() {
    browserAPI.runtime.sendMessage({ action: 'getStatus', targetTabId: popupTargetTabId }, function(response) {
      if (browserAPI.runtime.lastError) return;
      if (!response || !response.status) return;
      if (response.tabId != null) popupTargetTabId = Number(response.tabId);
      if (response.status === 'connected' && state.currentStatus !== 'connected') {
        state.isConnected = true;
        setStatus('connected', t('status_connected'));
      } else if (response.status === 'connecting' && state.currentStatus !== 'connecting') {
        state.isConnected = false;
        setStatus('connecting', t('status_connecting'));
      } else if (response.status === 'disconnected' && state.currentStatus !== 'disconnected') {
        state.isConnected = false;
        setStatus('disconnected', t('status_disconnected'));
      }
    });
  }, 5000);

  browserAPI.runtime.sendMessage({ action: 'getUserPresets' });

  setTimeout(function() {
    if (!state.hasAudio) {
      state.spectrumData.fill(0);
      state.rmsValue = 0;
      state.peakValue = 0;
      state.isClipping = false;
      updateSpectrum();
    }
  }, 3000);

  setupNewFeatureButtons();
  addHotkeyInfo();

  if (typeof window !== 'undefined') {
    window.SoundForgePopup = {
      getSettings: function() { return storage.getAll(); },
      getSetting: function(key) { return storage.get(key); },
      setSetting: function(key, value) { storage.set(key, value); },
      resetSettings: function() { return storage.reset(); },
      exportSettings: function() { return storage.exportSettings(); },
      getStats: function() { return storage.getStats(); },
      getState: function() { return state; },
      getDom: function() { return dom; },
      toggleDebug: function() {
        var debug = !state._debugMode;
        state._debugMode = debug;
        storage.set('debugMode', debug);
        console.log('🐛 Режим отладки:', debug ? 'ВКЛ' : 'ВЫКЛ');
      },
      exportBackup: handleExport,
      importBackup: handleImport,
      connect: function() { handleConnectDisconnect(); },
      disconnect: function() {
        if (state.currentStatus === 'connected' || state.isConnected) {
          handleConnectDisconnect();
        }
      },
      getConnectionState: function() {
        return {
          isConnected: state.isConnected,
          status: state.currentStatus
        };
      },
      applyPreset: applyPresetInPopup,
      syncPresetUI: syncPresetUIInPopup,
      getCurrentPreset: function() { return state.currentPreset; }
    };
    console.log('💡 Доступны команды: SoundForgePopup.*');
  }

  console.log('✅ SoundForge Popup v3.22.8 Firefox 153 готов!');
  console.log('📊 Всего пресетов:', PRESET_ORDER.length);
}

// ============================================
//  ЭКСПОРТ ТОЛЬКО НУЖНЫХ ФУНКЦИЙ
// ============================================

export {
  initThemeSelector,
  setTheme,
  updateThemeButtons,
  initLanguage,
  toggleLanguage,
  updateLanguage,
  initWindowState,
  handleExpandToggle,
  loadSettingsAndApply,
  handleExport,
  handleImport,
  updateVolumeStatus,
  restoreConnectionState,
  handleConnectDisconnect,
  applyPresetInPopup,
  BUTTON_LABELS,
  getActionTranslation,
  ACTION_TRANSLATIONS,
  // Экспортируем наши переопределенные функции
  setStatus,
  updateConnectButton
};

// Release background spectrum demand when the popup is closed.
function cleanupPopupRuntime() {
  clearPopupConnectWatchdog();
  showLoading(false);
  if (popupStatusInterval) {
    clearInterval(popupStatusInterval);
    popupStatusInterval = null;
  }
  try {
    browserAPI.runtime.sendMessage({ action: 'unregisterSpectrumListener', clientId: spectrumClientId }, function() {
      void browserAPI.runtime.lastError;
    });
  } catch (_) {}
}
window.addEventListener('pagehide', cleanupPopupRuntime, { once: true });
