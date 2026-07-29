// ============================================
//  STATE.JS - Состояние приложения (v3.22.8)
//  Экспорты: state, dom, initDom, updateState
//  ИСПРАВЛЕНО: инициализация DOM элементов
// ============================================

// ============================================
//  СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================

export const state = {
  // Статус подключения
  currentStatus: 'ready',
  isConnected: false,
  
  // Текущий пресет и тема
  currentPreset: 'flat',
  currentTheme: 'dark',
  currentLang: 'ru',
  
  // Анимация
  animationFrameId: null,
  
  // Данные спектра
  spectrumData: new Float32Array(64),
  smoothSpectrum: new Float32Array(32),
  peakValue: -Infinity,
  peakHold: 0,
  hasAudio: true,
  rmsValue: 0,
  
  // A/B сравнение
  abPresetA: null,
  abPresetB: null,
  abMode: false,
  
  // Состояние загрузки
  isLoading: false,
  
  // Клиппинг
  isClipping: false,
  clipCount: 0,
  lastClipTime: 0,
  
  // Эффект визуализации
  currentEffect: 'spectrum',
  
  // Режим отладки
  _debugMode: false
};

// ============================================
//  DOM ЭЛЕМЕНТЫ
// ============================================

export const dom = {
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
  
  // Оверлей загрузки
  loadingOverlay: null,
  
  // Индикатор клиппинга
  clipIndicator: null
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
  
  // Оверлей
  dom.loadingOverlay = document.getElementById('loadingOverlay');
  
  // Индикатор клиппинга
  dom.clipIndicator = document.getElementById('clipIndicator');
}

// ============================================
//  ОБНОВЛЕНИЕ СОСТОЯНИЯ
// ============================================

export function updateState(newState) {
  Object.assign(state, newState);
}

// ============================================
//  ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

export function getState() {
  return state;
}

export function getDom() {
  return dom;
}

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
  state,
  dom,
  initDom,
  updateState,
  getState,
  getDom
};