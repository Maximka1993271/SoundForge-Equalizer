// ============================================
//  POPUP.JS - v3.22.8 (РАБОЧАЯ ВЕРСИЯ)
//  РУЧНОЕ ПОДКЛЮЧЕНИЕ | ВСЕ НАСТРОЙКИ СОХРАНЯЮТСЯ
//  50 ПРОФЕССИОНАЛЬНЫХ ПРЕСЕТОВ
//  МОДУЛЬНАЯ АРХИТЕКТУРА
//  ГРОМКОСТЬ: 0% - 800%
//  СОХРАНЕНИЕ СОСТОЯНИЯ ПОДКЛЮЧЕНИЯ
//  ЭФФЕКТЫ ВИЗУАЛИЗАЦИИ: СПЕКТР | ВОЛНЫ | ОГОНЬ | НЕОН
//  3 ЯЗЫКА: RU, UA, EN
//  ПОЛНЫЙ НАБОР ПЕРЕВОДОВ ДЛЯ ВСЕХ СООБЩЕНИЙ
// ============================================

console.log('🎛️ SoundForge Popup v3.22.8 - Единое хранилище (с эффектами)');

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
  formatPresetAppliedReference,
  formatPresetApplied
} from './modules/i18n.js';
import { PRESETS, PRESET_INFO, PRESET_ORDER } from './modules/config.js';
import { 
  setStatus, 
  updateConnectButton, 
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
  syncEffect
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

console.log('🎛️ SoundForge Popup v3.22.8 - Единое хранилище (с эффектами)');

// ============================================
//  ПЕРЕВОДЫ ДЛЯ НОВЫХ КНОПОК
// ============================================

const BUTTON_LABELS = {
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

const ACTION_TRANSLATIONS = {
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
  const lang = getCurrentLang();
  const dict = ACTION_TRANSLATIONS[lang] || ACTION_TRANSLATIONS.en;
  return dict[action] || action;
}

// ============================================
//  УПРАВЛЕНИЕ ТЕМАМИ
// ============================================

function initThemeSelector() {
  const themeSelector = document.getElementById('themeSelector');
  if (!themeSelector) return;

  const themeOptions = themeSelector.querySelectorAll('.theme-option');

  const savedTheme = storage.get('theme', 'system');
  setTheme(savedTheme);
  updateThemeButtons(savedTheme);
  state.currentTheme = savedTheme;

  themeOptions.forEach((btn) => {
    btn.addEventListener('click', function() {
      const theme = this.dataset.theme;
      setTheme(theme);
      updateThemeButtons(theme);
      state.currentTheme = theme;
      storage.set('theme', theme);
      saveAllSettings();
      updateEQGraph();
    });
  });

  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
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
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.style.colorScheme = prefersDark ? 'dark' : 'light';
  } else {
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }
}

function updateThemeButtons(activeTheme) {
  const themeSelector = document.getElementById('themeSelector');
  if (!themeSelector) return;

  const themeOptions = themeSelector.querySelectorAll('.theme-option');
  themeOptions.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === activeTheme);
  });
}

// ============================================
//  УПРАВЛЕНИЕ ЯЗЫКОМ
// ============================================

function initLanguage() {
  const savedLang = storage.get('language', null);
  
  if (savedLang && LANGUAGES[savedLang]) {
    setCurrentLang(savedLang);
  } else {
    const detectedLang = detectLanguage();
    setCurrentLang(detectedLang);
    storage.set('language', detectedLang);
  }
  updateLanguage();
  if (dom.langToggle) {
    dom.langToggle.textContent = LANGUAGES[getCurrentLang()].flag;
  }
  populatePresetSelect();
  
  if (dom.volumeSlider) {
    const currentVolume = parseInt(dom.volumeSlider.value) || 100;
    updateVolumeStatus(currentVolume);
  }
}

function toggleLanguage() {
  const languages = ['ru', 'uk', 'en'];
  const currentIndex = languages.indexOf(getCurrentLang());
  const newLang = languages[(currentIndex + 1) % languages.length];
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
    const currentVolume = parseInt(dom.volumeSlider.value) || 100;
    updateVolumeStatus(currentVolume);
  }
}

function updateLanguage() {
  const lang = getCurrentLang();
  const labels = BUTTON_LABELS[lang] || BUTTON_LABELS.ru;
  
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
  
  const nightBtn = document.getElementById('nightModeBtn');
  if (nightBtn) {
    const isNightOn = nightBtn.dataset.active === 'true';
    nightBtn.textContent = isNightOn ? labels.night_on : labels.night;
  }
  
  const powerBtn = document.getElementById('powerSaveBtn');
  if (powerBtn) {
    const isPowerOn = powerBtn.dataset.active === 'true';
    powerBtn.textContent = isPowerOn ? labels.power_on : labels.power;
  }
  
  const windowBtn = document.getElementById('openWindowBtn');
  if (windowBtn) {
    windowBtn.textContent = labels.window;
  }
  
  const historyBtn = document.getElementById('historyBtn');
  if (historyBtn) {
    historyBtn.textContent = labels.history;
  }
  
  const statsBtn = document.getElementById('statsBtn');
  if (statsBtn) {
    statsBtn.textContent = labels.stats;
  }
  
  const statsSpan = document.querySelector('.stats');
  if (statsSpan) {
    statsSpan.innerHTML = '🎛️ <span id="filterCount">10</span>' + t('bands');
  }
  
  const statusTxt = dom.statusText;
  if (statusTxt) {
    const statusMap = {
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
    const currentVolume = parseInt(dom.volumeSlider.value) || 100;
    updateVolumeStatus(currentVolume);
  }
}

// ============================================
//  СОХРАНЕНИЕ СОСТОЯНИЯ РАЗВЕРНУТОГО ОКНА
// ============================================

function initWindowState() {
  const isExpanded = storage.get('popupExpanded', false);
  const body = document.body;
  const expandBtn = dom.expandBtn;
  
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
  const body = document.body;
  const expandBtn = dom.expandBtn;
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
  
  setTimeout(() => {
    updateEQGraph();
  }, 50);
}

// ============================================
//  ФУНКЦИИ ЭКСПОРТА/ИМПОРТА
// ============================================

async function handleExport() {
  showLoading(true);
  try {
    const exportData = await storage.exportSettings();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soundforge_settings_backup_${new Date().toISOString().slice(0,10)}.json`;
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
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    showLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
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
  const statusEl = document.getElementById('volumeStatus');
  if (!statusEl) return;
  
  const warningText = getVolumeWarning(volume);
  
  let color = '#666';
  let glow = 'none';
  let transform = 'scale(1)';
  let textShadow = 'none';
  
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
    textShadow = `0 0 20px ${color}40`;
    transform = 'scale(1.05)';
  } else if (volume <= 600) {
    color = '#f44336';
    glow = 'glowRed 0.6s ease-in-out infinite';
    textShadow = `0 0 25px ${color}50`;
    transform = 'scale(1.08)';
  } else if (volume <= 750) {
    color = '#d32f2f';
    glow = 'glowRed 0.4s ease-in-out infinite';
    textShadow = `0 0 30px ${color}60`;
    transform = 'scale(1.1)';
  } else {
    color = '#ff1744';
    glow = 'glowRed 0.3s ease-in-out infinite';
    textShadow = `0 0 35px ${color}70`;
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
  chrome.storage.local.get(['soundforgeConnected'], (result) => {
    console.log('📥 Восстановление состояния подключения:', result);
    
    if (result.soundforgeConnected === true) {
      console.log('✅ Восстановлено: ПОДКЛЮЧЕН');
      setStatus('connected', t('status_connected'));
      state.isConnected = true;
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].url) {
          chrome.runtime.sendMessage({ action: 'connect' }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('⚠️ Ошибка подключения:', chrome.runtime.lastError);
            } else {
              console.log('✅ Автоподключение выполнено');
            }
          });
        }
      });
    } else if (result.soundforgeConnected === false) {
      console.log('🔴 Восстановлено: ОТКЛЮЧЕН');
      setStatus('disconnected', t('status_disconnected'));
      state.isConnected = false;
    } else {
      console.log('🔄 Нет сохраненного состояния, проверяем текущий статус');
      chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ Ошибка получения статуса:', chrome.runtime.lastError);
          setStatus('ready', t('status_ready'));
          return;
        }
        
        if (response && response.status === 'connected') {
          console.log('✅ Текущий статус: ПОДКЛЮЧЕН');
          setStatus('connected', t('status_connected'));
          state.isConnected = true;
          chrome.storage.local.set({ soundforgeConnected: true });
        } else {
          console.log('🔴 Текущий статус: ОТКЛЮЧЕН');
          setStatus('ready', t('status_ready'));
          state.isConnected = false;
          chrome.storage.local.set({ soundforgeConnected: false });
        }
      });
    }
  });
}

// ============================================
//  ПРИМЕНЕНИЕ ПРЕСЕТА В POPUP
// ============================================

function syncPresetUIInPopup(name) {
  const userPresets = getUserPresets();
  const isUserPreset = !!userPresets[name];
  const preset = isUserPreset ? userPresets[name] : PRESETS[name];
  if (!preset) {
    console.warn(`⚠️ Пресет "${name}" не найден для синхронизации UI`);
    return false;
  }

  state.currentPreset = name;
  updatePresetInfo(name);
  if (dom.presetSelect) dom.presetSelect.value = isUserPreset ? 'user_' + name : name;

  const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
  const gains = preset.gains || {};
  sliders.forEach((slider) => {
    const freq = slider.dataset.freq;
    if (gains[freq] !== undefined) {
      const value = Number(gains[freq]) || 0;
      slider.value = value;
      const valueSpan = slider.parentElement.querySelector('.gain-value');
      if (valueSpan) {
        valueSpan.textContent = value.toFixed(1);
        valueSpan.className = value > 0.1 ? 'gain-value positive' : (value < -0.1 ? 'gain-value negative' : 'gain-value zero');
      }
    }
  });

  if (dom.volumeSlider && dom.volumeDisplay) {
    const vol = Number.isFinite(Number(preset.volume)) ? Math.min(800, Math.max(0, Number(preset.volume))) : 100;
    dom.volumeSlider.value = vol;
    dom.volumeDisplay.textContent = vol + '%';
    updateVolumeStatus(vol);
  }

  if (dom.bassSlider && dom.bassDisplay) {
    const bass = Number.isFinite(Number(preset.bass)) ? Math.max(-12, Math.min(12, Number(preset.bass))) : 0;
    dom.bassSlider.value = bass;
    dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';
  }

  updateEQGraph();
  return true;
}

function applyPresetInPopup(name) {
  const userPresets = getUserPresets();
  const isUserPreset = !!userPresets[name];
  const preset = isUserPreset ? userPresets[name] : PRESETS[name];
  if (!preset) {
    console.warn(`⚠️ Пресет "${name}" не найден`);
    return;
  }

  console.log(`🎵 Применяем пресет в popup: ${name}`);
  if (!syncPresetUIInPopup(name)) return;

  const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
  const gainsData = {};
  sliders.forEach((slider) => {
    gainsData[slider.dataset.freq] = parseFloat(slider.value) || 0;
  });

  chrome.runtime.sendMessage({
    action: 'applyPreset',
    preset: name,
    presetData: {
      gains: gainsData,
      volume: Number.isFinite(Number(preset.volume)) ? Number(preset.volume) : 100,
      bass: Number.isFinite(Number(preset.bass)) ? Number(preset.bass) : 0
    },
    source: 'popup'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Не удалось применить пресет:', chrome.runtime.lastError.message);
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
//  ПОДКЛЮЧЕНИЕ/ОТКЛЮЧЕНИЕ
// ============================================

function handleConnectDisconnect() {
  if (state.isLoading) return;

  if (state.currentStatus === 'connected' || state.isConnected) {
    showLoading(true);
    setStatus('disconnected', t('status_disconnected'));
    
    chrome.runtime.sendMessage({ action: 'disconnect' }, () => {
      showLoading(false);
      if (chrome.runtime.lastError) {
        setStatus('disconnected', formatConnectionError());
        return;
      }
      
      state.isConnected = false;
      setStatus('disconnected', t('status_disconnected'));
      
      chrome.storage.local.set({ soundforgeConnected: false });
      console.log('💾 Состояние сохранено: ОТКЛЮЧЕН');
      
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'getStatus' }, (resp) => {
          if (resp && resp.status === 'connected') {
            setStatus('connected', t('status_connected'));
            state.isConnected = true;
          } else {
            setStatus('disconnected', t('status_disconnected'));
          }
        });
      }, 500);
    });
  } else if (state.currentStatus === 'connecting') {
    // Ничего не делаем
  } else {
    showLoading(true);
    setStatus('connecting', t('status_connecting'));
    
    chrome.runtime.sendMessage({ action: 'connect' }, () => {
      showLoading(false);
      if (chrome.runtime.lastError) {
        setStatus('disconnected', formatConnectionError());
        return;
      }
      
      state.isConnected = true;
      
      chrome.storage.local.set({ soundforgeConnected: true });
      console.log('💾 Состояние сохранено: ПОДКЛЮЧЕН');
      
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'getStatus' }, (resp) => {
          if (resp && resp.status === 'connected') {
            setStatus('connected', t('status_connected'));
            applySavedSettings(false);
          } else {
            setTimeout(() => {
              chrome.runtime.sendMessage({ action: 'getStatus' }, (resp2) => {
                if (resp2 && resp2.status === 'connected') {
                  setStatus('connected', t('status_connected'));
                  applySavedSettings(false);
                } else {
                  setStatus('disconnected', t('status_disconnected'));
                  state.isConnected = false;
                }
              });
            }, 1000);
          }
        });
      }, 1500);
    });
  }
}

// ============================================
//  ЗАГРУЗКА НАСТРОЕК
// ============================================

async function loadSettingsAndApply() {
  try {
    const settings = storage.getAll();
    
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
  const footer = document.querySelector('.footer');
  if (footer) {
    const hotkeyInfo = document.createElement('span');
    hotkeyInfo.className = 'hotkey-info';
    hotkeyInfo.textContent = '⌨️ Ctrl+Shift+E | Ctrl+Shift+Y | Ctrl+Shift+X | Ctrl+Shift+L';
    hotkeyInfo.style.cssText = `
      font-size: 8px;
      color: #667799;
      opacity: 0.6;
      margin-left: 10px;
    `;
    footer.appendChild(hotkeyInfo);
  }
}

function setupNewFeatureButtons() {
  const lang = getCurrentLang();
  const labels = BUTTON_LABELS[lang] || BUTTON_LABELS.ru;
  
  // === НОЧНОЙ РЕЖИМ ===
  const nightBtn = document.getElementById('nightModeBtn');
  if (nightBtn) {
    nightBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'toggleNightMode' }, (response) => {
        if (response && response.enabled !== undefined) {
          nightBtn.dataset.active = response.enabled ? 'true' : 'false';
          const langNow = getCurrentLang();
          const labelNow = BUTTON_LABELS[langNow] || BUTTON_LABELS.ru;
          nightBtn.textContent = response.enabled ? labelNow.night_on : labelNow.night;
          nightBtn.style.borderColor = response.enabled ? '#4CAF50' : 'rgba(255, 255, 255, 0.06)';
          nightBtn.style.color = response.enabled ? '#4CAF50' : '#8899bb';
          
          const message = response.enabled ? formatNightModeOn() : formatNightModeOff();
          setStatus('ready', message);
        }
      });
    });
  }
  
  // === ЭНЕРГОСБЕРЕЖЕНИЕ ===
  const powerBtn = document.getElementById('powerSaveBtn');
  if (powerBtn) {
    powerBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'togglePowerSave' }, (response) => {
        if (response && response.enabled !== undefined) {
          powerBtn.dataset.active = response.enabled ? 'true' : 'false';
          const langNow = getCurrentLang();
          const labelNow = BUTTON_LABELS[langNow] || BUTTON_LABELS.ru;
          powerBtn.textContent = response.enabled ? labelNow.power_on : labelNow.power;
          powerBtn.style.borderColor = response.enabled ? '#FF9800' : 'rgba(255, 255, 255, 0.06)';
          powerBtn.style.color = response.enabled ? '#FF9800' : '#8899bb';
          
          const message = response.enabled ? formatPowerSaveOn() : formatPowerSaveOff();
          setStatus('ready', message);
        }
      });
    });
  }
  
  // === ОТКРЫТИЕ ОКНА ===
  const windowBtn = document.getElementById('openWindowBtn');
  if (windowBtn) {
    windowBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'open_window' });
    });
  }
  
  // === ИСТОРИЯ (ИСПРАВЛЕННАЯ ВЕРСИЯ) ===
  const historyBtn = document.getElementById('historyBtn');
  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'getHistory' }, (response) => {
        if (response && response.history) {
          const history = response.history;
          const count = history.length;
          
          if (count === 0) {
            setStatus('ready', t('history_empty'));
          } else {
            // Берем последнее действие
            const lastAction = history[history.length - 1];
            const actionName = lastAction.action || 'unknown';
            
            // Переводим название действия
            const translatedAction = getActionTranslation(actionName);
            
            // Форматируем сообщение с иконкой и переводом
            setStatus('ready', formatHistoryRecords(count, translatedAction));
            console.log('📜 История:', history.slice(-10));
          }
        }
      });
    });
  }
  
  // === СТАТИСТИКА (ИСПРАВЛЕННАЯ ВЕРСИЯ) ===
  const statsBtn = document.getElementById('statsBtn');
  if (statsBtn) {
    statsBtn.addEventListener('click', () => {
      chrome.storage.local.get(['settingsHistory'], (result) => {
        const history = result.settingsHistory || [];
        const total = history.length;
        
        if (total === 0) {
          setStatus('ready', t('history_empty'));
          return;
        }
        
        // Собираем статистику по действиям
        const actions = {};
        history.forEach((h) => {
          const actionName = h.action || 'unknown';
          actions[actionName] = (actions[actionName] || 0) + 1;
        });
        
        // Формируем сообщение на текущем языке
        const totalText = t('stats_total', { count: total });
        
        // Формируем топ действий с переводом
        const topActions = Object.entries(actions)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        
        let topText = '';
        if (topActions.length > 0) {
          const topStr = topActions.map(([a, c]) => {
            const translatedName = getActionTranslation(a);
            return `${translatedName}(${c})`;
          }).join(', ');
          topText = t('stats_top', { top: topStr });
        }
        
        const statsText = totalText + topText;
        setStatus('ready', statsText);
      });
    });
  }
}

// ============================================
//  ОБРАБОТЧИК СООБЩЕНИЙ
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Popup получил сообщение:', request.action);
  
  if (request.action === 'spectrumData' && request.spectrum) {
    const data = request.spectrum;
    const len = Math.min(data.length, state.spectrumData.length);
    for (let i = 0; i < len; i++) {
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
    console.log(`🔄 Пресет синхронизирован из background: ${request.preset}`);
    if (syncPresetUIInPopup(request.preset)) {
      setStatus('ready', formatPresetApplied(request.preset));
    }
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (request.action === 'settingsReset') {
    console.log('🔄 Настройки сброшены через горячие клавиши (background)');
    const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
    sliders.forEach((slider) => {
      slider.value = 0;
      const valueSpan = slider.parentElement.querySelector('.gain-value');
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
    if (request.status === 'connected') {
      setStatus('connected', t('status_connected'));
      state.isConnected = true;
      chrome.storage.local.set({ soundforgeConnected: true });
    } else if (request.status === 'disconnected') {
      setStatus('disconnected', t('status_disconnected'));
      state.isConnected = false;
      chrome.storage.local.set({ soundforgeConnected: false });
    } else if (request.status === 'error') {
      setStatus('disconnected', formatConnectionError());
      state.isConnected = false;
      chrome.storage.local.set({ soundforgeConnected: false });
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'nightModeStatus') {
    const nightBtn = document.getElementById('nightModeBtn');
    if (nightBtn) {
      const lang = getCurrentLang();
      const labels = BUTTON_LABELS[lang] || BUTTON_LABELS.ru;
      nightBtn.dataset.active = request.enabled ? 'true' : 'false';
      nightBtn.textContent = request.enabled ? labels.night_on : labels.night;
      nightBtn.style.borderColor = request.enabled ? '#4CAF50' : 'rgba(255, 255, 255, 0.06)';
      nightBtn.style.color = request.enabled ? '#4CAF50' : '#8899bb';
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'powerSaveStatus') {
    const powerBtn = document.getElementById('powerSaveBtn');
    if (powerBtn) {
      const lang = getCurrentLang();
      const labels = BUTTON_LABELS[lang] || BUTTON_LABELS.ru;
      powerBtn.dataset.active = request.enabled ? 'true' : 'false';
      powerBtn.textContent = request.enabled ? labels.power_on : labels.power;
      powerBtn.style.borderColor = request.enabled ? '#FF9800' : 'rgba(255, 255, 255, 0.06)';
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

document.addEventListener('DOMContentLoaded', () => {
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

  onSettingChange('theme', (value) => {
    setTheme(value);
    updateThemeButtons(value);
    updateEQGraph();
  });

  onSettingChange('language', (value) => {
    setCurrentLang(value);
    updateLanguage();
    populatePresetSelect();
    if (dom.volumeSlider) {
      const currentVolume = parseInt(dom.volumeSlider.value) || 100;
      updateVolumeStatus(currentVolume);
    }
  });

  onSettingChange('popupExpanded', (value) => {});

  initWindowState();
  initThemeSelector();
  initLanguage();
  populatePresetSelect();
  
  restoreConnectionState();

  dom.connectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleConnectDisconnect();
  });

  dom.resetBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleReset((volume) => {
      updateVolumeStatus(volume);
    });
    if (dom.volumeSlider) {
      const currentVolume = parseInt(dom.volumeSlider.value) || 100;
      updateVolumeStatus(currentVolume);
    }
  });

  if (dom.presetSelect) {
    dom.presetSelect.addEventListener('change', function() {
      const value = this.value;
      console.log('🔄 Выбран пресет в popup:', value);
      
      if (!value) {
        state.currentPreset = 'custom';
        updatePresetInfo('custom');
        return;
      }
      
      if (value.startsWith('user_')) {
        const userPresetName = value.substring(5);
        const userPresets = getUserPresets();
        const preset = userPresets[userPresetName];
        if (preset) {
          applyPresetInPopup(userPresetName);
        }
      } else if (PRESETS[value]) {
        applyPresetInPopup(value);
      }
    });
  }

  if (dom.eqSliders) {
    dom.eqSliders.forEach((slider) => {
      const valueSpan = slider.parentElement.querySelector('.gain-value');

      slider.addEventListener('input', function() {
        const val = parseFloat(slider.value);
        if (valueSpan) {
          valueSpan.textContent = val.toFixed(1);
          updateGainClass(valueSpan, val);
        }
        updateEQGraph();
        const gains = getSliderGains();
        chrome.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true });
        saveAllSettings();
        state.currentPreset = 'custom';
        updatePresetInfo('custom');
        if (dom.presetSelect) dom.presetSelect.value = '';
      });

      slider.addEventListener('change', function() {
        const gains = getSliderGains();
        chrome.runtime.sendMessage({ action: 'updateEQ', gains: gains });
        saveAllSettings();
        updateEQGraph();
      });
    });
  }

  if (dom.volumeSlider && dom.volumeDisplay) {
    const initialVolume = parseInt(dom.volumeSlider.value) || 100;
    updateVolumeStatus(initialVolume);
    
    dom.volumeSlider.addEventListener('input', function() {
      const val = parseInt(this.value);
      dom.volumeDisplay.textContent = val + '%';
      updateVolumeStatus(val);
      const volumeValue = val / 100;
      chrome.runtime.sendMessage({ 
        action: 'setVolume', 
        value: volumeValue, 
        instant: true 
      });
      saveAllSettings();
      
      if (val === 0) {
        chrome.runtime.sendMessage({ 
          action: 'setVolume', 
          value: 0, 
          instant: true,
          forceMute: true 
        });
      }
    });
    
    dom.volumeSlider.addEventListener('change', function() {
      const val = parseInt(this.value);
      const volumeValue = val / 100;
      chrome.runtime.sendMessage({ action: 'setVolume', value: volumeValue });
      saveAllSettings();
      
      if (val === 0) {
        chrome.runtime.sendMessage({ 
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
      const val = parseFloat(this.value);
      chrome.runtime.sendMessage({ action: 'setBass', value: val, instant: true });
      saveAllSettings();
    });
    dom.bassSlider.addEventListener('change', function() {
      const val = parseFloat(this.value);
      chrome.runtime.sendMessage({ action: 'setBass', value: val });
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
    dom.savePresetBtn.addEventListener('click', () => {
      const name = prompt(t('save_preset') + ':', 'My Preset');
      if (!name) return;

      const presets = getUserPresets();
      
      if (presets[name]) {
        if (!confirm(`Пресет "${name}" уже существует. Перезаписать?`)) {
          return;
        }
      }

      const gains = getSliderGains();
      const volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
      const bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;

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
    dom.abCompareBtn.onclick = () => {
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

  initVisualizationEffects();
  
  visualizationLoop();
  console.log('🔄 Визуализация запущена с эффектами');
  
  initVisualization();

  setTimeout(() => {
    updateSpectrum();
    console.log('📊 Спектр обновлен');
  }, 100);

  setTimeout(() => {
    updateEQGraph();
    console.log('📈 График АЧХ обновлен');
  }, 200);

  // inject.js pushes spectrum snapshots directly; request one initial sample only.
  setTimeout(() => chrome.runtime.sendMessage({ action: 'getSpectrum' }), 250);

  setInterval(() => {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.status === 'connected' && state.currentStatus !== 'connected') {
        setStatus('connected', t('status_connected'));
        state.isConnected = true;
      }
    });
  }, 5000);

  chrome.runtime.sendMessage({ action: 'getUserPresets' });

  setTimeout(() => {
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
      getSettings: () => storage.getAll(),
      getSetting: (key) => storage.get(key),
      setSetting: (key, value) => storage.set(key, value),
      resetSettings: () => storage.reset(),
      exportSettings: () => storage.exportSettings(),
      getStats: () => storage.getStats(),
      getState: () => state,
      getDom: () => dom,
      toggleDebug: () => {
        const debug = !state._debugMode;
        state._debugMode = debug;
        storage.set('debugMode', debug);
        console.log('🐛 Режим отладки:', debug ? 'ВКЛ' : 'ВЫКЛ');
      },
      exportBackup: handleExport,
      importBackup: handleImport,
      connect: () => {
        handleConnectDisconnect();
      },
      disconnect: () => {
        if (state.currentStatus === 'connected' || state.isConnected) {
          handleConnectDisconnect();
        }
      },
      getConnectionState: () => {
        return {
          isConnected: state.isConnected,
          status: state.currentStatus
        };
      },
      applyPreset: applyPresetInPopup,
  syncPresetUI: syncPresetUIInPopup,
      getCurrentPreset: () => state.currentPreset,
      getEffect: () => {
        import('./modules/visualization-effects.js').then(({ getCurrentEffect, getEffectName }) => {
          console.log(`🎨 Текущий эффект: ${getEffectName(getCurrentEffect())}`);
        });
      },
      cycleEffect: () => {
        import('./modules/visualization-effects.js').then(({ setCurrentEffect, getCurrentEffect, getEffectName }) => {
          const effects = ['spectrum', 'waves', 'fire', 'neon'];
          const current = getCurrentEffect();
          const index = effects.indexOf(current);
          const next = effects[(index + 1) % effects.length];
          setCurrentEffect(next);
          updateEffectButtonLabel();
          console.log(`🎨 Эффект изменен: ${getEffectName(next)}`);
        });
      }
    };
    console.log('💡 Доступны команды:');
    console.log('  • SoundForgePopup.getSettings() - получить все настройки');
    console.log('  • SoundForgePopup.getStats() - статистика хранилища');
    console.log('  • SoundForgePopup.exportBackup() - экспорт настроек');
    console.log('  • SoundForgePopup.importBackup() - импорт настроек');
    console.log('  • SoundForgePopup.toggleDebug() - переключить отладку');
    console.log('  • SoundForgePopup.connect() - подключить эквалайзер');
    console.log('  • SoundForgePopup.disconnect() - отключить эквалайзер');
    console.log('  • SoundForgePopup.getConnectionState() - статус подключения');
    console.log('  • SoundForgePopup.applyPreset(name) - применить пресет');
    console.log('  • SoundForgePopup.getCurrentPreset() - текущий пресет');
    console.log('  🎨 SoundForgePopup.cycleEffect() - переключить эффект визуализации');
    console.log('  🎨 SoundForgePopup.getEffect() - показать текущий эффект');
    console.log('⌨️ Горячие клавиши: Ctrl+Shift+E (вкл/выкл), Ctrl+Shift+Y (следующий пресет)');
  }

  console.log('✅ SoundForge Popup v3.22.8 (Единое хранилище + Эффекты) готов!');
  console.log('📊 Всего пресетов: ' + PRESET_ORDER.length);
  console.log('🔘 РУЧНОЕ ПОДКЛЮЧЕНИЕ - нажмите кнопку "Подключить"');
  console.log('🎨 ЭФФЕКТЫ: Спектр | Волны | Огонь | Неон');
  console.log('🎨 ТЕМЫ: Светлая 🌞 / Темная 🌙 / Системная 💻');
  console.log('📌 СОСТОЯНИЕ ОКНА СОХРАНЯЕТСЯ');
  console.log('🔇 ГРОМКОСТЬ: 0% - 800%');
  console.log('🔇 ПОЛНОЕ ОТКЛЮЧЕНИЕ ЗВУКА ПРИ 0%');
  console.log('💾 ЕДИНОЕ ХРАНИЛИЩЕ НАСТРОЕК - АКТИВНО');
  console.log('🎬 ПЛАВНАЯ АНИМАЦИЯ ПРИ СМЕНЕ ПРЕСЕТА - АКТИВНА ✨');
  console.log('🟢 ИНДИКАТОР СОСТОЯНИЯ ГРОМКОСТИ - АКТИВЕН 📊');
  console.log('⌨️ ГОРЯЧИЕ КЛАВИШИ: Ctrl+Shift+E (вкл/выкл), Ctrl+Shift+Y (следующий пресет), Ctrl+Shift+X (сброс), Ctrl+Shift+L (окно)');
  console.log('🌙 НОЧНОЙ РЕЖИМ: АВТОМАТИЧЕСКИ С 22:00 ДО 07:00');
  console.log('⚡ РЕЖИМ ЭНЕРГОСБЕРЕЖЕНИЯ: СНИЖАЕТ ЧАСТОТУ ОБНОВЛЕНИЙ');
  console.log('💾 НАСТРОЙКИ СОХРАНЯЮТСЯ ДЛЯ КАЖДОГО САЙТА');
  console.log('📜 ВЕДЕТСЯ ИСТОРИЯ ИЗМЕНЕНИЙ');
  console.log('🪟 ОТДЕЛЬНОЕ ОКНО ЭКВАЛАЙЗЕРА: Ctrl+Shift+L');
  console.log('🔄 ОБНОВЛЕНИЕ ПРЕСЕТОВ ИЗ BACKGROUND - АКТИВНО (Ctrl+Shift+Y)');
}

// ============================================
//  ЭКСПОРТ
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
  ACTION_TRANSLATIONS
};