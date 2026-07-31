// ============================================
//  STATE.JS - Состояние приложения (v3.22.8)
//  НОВОЕ: состояние клиппинга
//  ИСПРАВЛЕНО: добавлены все DOM элементы для Firefox
//  АДАПТИРОВАНО ДЛЯ FIREFOX 153.0esr
// ============================================

// ============================================
//  СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================

export var state = {
  currentStatus: 'ready',
  currentPreset: 'flat',
  currentTheme: 'dark',
  currentLang: 'ru',
  animationFrameId: null,
  spectrumData: new Float32Array(64),
  smoothSpectrum: new Float32Array(32),
  peakValue: -Infinity,
  peakHold: 0,
  hasAudio: false,
  rmsValue: 0,
  abPresetA: null,
  abPresetB: null,
  abMode: false,
  isLoading: false,
  isConnected: false,
  isConnecting: false,
  isClipping: false,
  clipCount: 0,
  lastClipTime: 0,
  currentEffect: 'spectrum',
  _debugMode: false
};

// ============================================
//  DOM ЭЛЕМЕНТЫ
// ============================================

export var dom = {
  // Кнопки
  connectBtn: null,
  resetBtn: null,
  themeToggle: null,
  langToggle: null,
  expandBtn: null,
  exportBtn: null,
  importBtn: null,
  savePresetBtn: null,
  abCompareBtn: null,
  effectBtn: null,
  statsBtn: null,
  historyBtn: null,
  openWindowBtn: null,
  nightModeBtn: null,
  powerSaveBtn: null,
  closeBtn: null,
  
  // Статус
  statusText: null,
  statusDot: null,
  siteInfo: null,
  
  // Слайдеры
  volumeSlider: null,
  volumeDisplay: null,
  bassSlider: null,
  bassDisplay: null,
  eqSliders: null,
  
  // Пресеты
  presetInfoDisplay: null,
  presetSelect: null,
  
  // Canvas
  spectrumCanvas: null,
  eqGraphCanvas: null,
  spectrumCtx: null,
  eqGraphCtx: null,
  
  // VU-метр
  vuFill: null,
  vuPeak: null,
  vuValue: null,
  
  // Метки
  volumeLabel: null,
  bassLabel: null,
  visStatus: null,
  volumeStatus: null,
  
  // Оверлей загрузки
  loadingOverlay: null,
  loadingText: null,
  
  // Индикатор клиппинга
  clipIndicator: null,
  
  // Заголовки
  windowTitle: null,
  pageTitle: null
};

// ============================================
//  ИНИЦИАЛИЗАЦИЯ DOM
// ============================================

export function initDom() {
  // Кнопки
  dom.connectBtn = document.getElementById('connectBtn');
  dom.resetBtn = document.getElementById('resetBtn');
  dom.themeToggle = document.getElementById('themeToggle');
  dom.langToggle = document.getElementById('langToggle');
  dom.expandBtn = document.getElementById('expandBtn');
  dom.exportBtn = document.getElementById('exportBtn');
  dom.importBtn = document.getElementById('importBtn');
  dom.savePresetBtn = document.getElementById('savePresetBtn');
  dom.abCompareBtn = document.getElementById('abCompareBtn');
  dom.effectBtn = document.getElementById('effectBtn');
  dom.statsBtn = document.getElementById('statsBtn');
  dom.historyBtn = document.getElementById('historyBtn');
  dom.openWindowBtn = document.getElementById('openWindowBtn');
  dom.nightModeBtn = document.getElementById('nightModeBtn');
  dom.powerSaveBtn = document.getElementById('powerSaveBtn');
  dom.closeBtn = document.getElementById('closeWindow');
  
  // Статус
  dom.statusText = document.getElementById('statusText');
  dom.statusDot = document.getElementById('statusDot');
  dom.siteInfo = document.getElementById('siteInfo');
  
  // Слайдеры
  dom.volumeSlider = document.getElementById('volumeSlider');
  dom.volumeDisplay = document.getElementById('volumeDisplay');
  dom.bassSlider = document.getElementById('bassSlider');
  dom.bassDisplay = document.getElementById('bassDisplay');
  dom.eqSliders = document.querySelectorAll('#eqContainer input[type="range"]');
  
  // Пресеты
  dom.presetInfoDisplay = document.getElementById('presetInfo');
  dom.presetSelect = document.getElementById('presetSelect');
  
  // Canvas
  dom.spectrumCanvas = document.getElementById('spectrumCanvas');
  dom.eqGraphCanvas = document.getElementById('eqGraphCanvas');
  
  if (dom.spectrumCanvas) {
    dom.spectrumCtx = dom.spectrumCanvas.getContext('2d');
    dom.spectrumCanvas.width = 450;
    dom.spectrumCanvas.height = 70;
  }
  if (dom.eqGraphCanvas) {
    dom.eqGraphCtx = dom.eqGraphCanvas.getContext('2d');
    dom.eqGraphCanvas.width = 450;
    dom.eqGraphCanvas.height = 80;
  }
  
  // VU-метр
  dom.vuFill = document.getElementById('vuFill');
  dom.vuPeak = document.getElementById('vuPeak');
  dom.vuValue = document.getElementById('vuValue');
  
  // Метки
  dom.volumeLabel = document.querySelector('.volume-label');
  dom.bassLabel = document.querySelector('.bass-label');
  dom.visStatus = document.getElementById('visStatus');
  dom.volumeStatus = document.getElementById('volumeStatus');
  
  // Оверлей
  dom.loadingOverlay = document.getElementById('loadingOverlay');
  dom.loadingText = document.getElementById('loadingText');
  
  // Индикатор клиппинга
  dom.clipIndicator = document.getElementById('clipIndicator');
  
  // Заголовки
  dom.windowTitle = document.getElementById('windowTitle');
  dom.pageTitle = document.getElementById('pageTitle');
}

// ============================================
//  ОБНОВЛЕНИЕ СОСТОЯНИЯ
// ============================================

export function updateState(newState) {
  for (var key in newState) {
    if (newState.hasOwnProperty(key)) {
      state[key] = newState[key];
    }
  }
}

// ============================================
//  СБРОС СОСТОЯНИЯ
// ============================================

export function resetState() {
  state.currentStatus = 'ready';
  state.isConnected = false;
  state.currentPreset = 'flat';
  state.isLoading = false;
  state.isClipping = false;
  state.clipCount = 0;
  state.hasAudio = true;
  state.rmsValue = 0;
  state.abMode = false;
  state.abPresetA = null;
  state.abPresetB = null;
  
  for (var i = 0; i < state.spectrumData.length; i++) {
    state.spectrumData[i] = 0;
  }
  for (var j = 0; j < state.smoothSpectrum.length; j++) {
    state.smoothSpectrum[j] = 0;
  }
  state.peakValue = -Infinity;
  state.peakHold = 0;
}

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
  state: state,
  dom: dom,
  initDom: initDom,
  updateState: updateState,
  resetState: resetState
};