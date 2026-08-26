// ============================================
//  INDEX.JS - SoundForge v3.22.8 Chrome 152
//  Google Chrome 152.0.7977.65 | Windows 11 25H2
//  Точка входа для всех модулей
//  Экспортирует все функции и переменные из модулей
// ============================================

import * as audioModule from './audio.js';
import * as browserCompatModule from './browser-compat.js';
import * as configModule from './config.js';
import * as i18nModule from './i18n.js';
import * as loggerModule from './logger.js';
import * as memoryModule from './memory.js';
import * as presetsModule from './presets.js';
import * as stateModule from './state.js';
import * as storageModule from './storage.js';
import * as storageSyncModule from './storage-sync.js';
import * as uiModule from './ui.js';
import * as visualizationModule from './visualization.js';
import * as visualizationEffectsModule from './visualization-effects.js';

// ============================================
//  АУДИО ОПЕРАЦИИ
// ============================================
export {
  animateSlider,
  animateVolume,
  animateBass,
  audioContext,
  analyserNode,
  isAudioInitialized,
  initAudioContext,
  stopSpectrumPolling,
  applyPresetWithAnimation,
  applyPresetEQOnly,
  toggleConnection,
  handleReset,
  applyPreset,
  applySavedSettings
} from './audio.js';

// ============================================
//  БРАУЗЕРНАЯ СОВМЕСТИМОСТЬ
// ============================================
export {
  Browser,
  browserInfo,
  createCrossBrowserAudioContext,
  captureStreamFromElement,
  checkAPISupport,
  ExtensionAPI,
  extensionAPI,
  CrossBrowserStorage,
  crossBrowserStorage,
  safeRequestAnimationFrame,
  safeCancelAnimationFrame,
  createSafeMutationObserver,
  checkMediaStreamSupport,
  safeCreateObjectURL,
  safeRevokeObjectURL,
  safeConsoleLog,
  safeConsoleWarn,
  safeConsoleError,
  isChrome152,
  getChrome152Info
} from './browser-compat.js';

// ============================================
//  КОНФИГУРАЦИЯ (50 ПРЕСЕТОВ)
// ============================================
export {
  VERSION,
  MODULE_NAME,
  MODULE_VERSION,
  CHROME_TARGET,
  PRESETS,
  PRESET_CATEGORIES,
  PRESET_INFO,
  PRESET_ORDER,
  FREQUENCIES,
  FREQUENCY_LABELS,
  PRESET_STATS,
  validateChrome152Presets
} from './config.js';

// ============================================
//  ИНТЕРНАЦИОНАЛИЗАЦИЯ (3 ЯЗЫКА)
// ============================================
export {
  LANGUAGES,
  setCurrentLang,
  getCurrentLang,
  detectLanguage,
  t,
  getEffectName,
  getEffectNames,
  getVolumeWarning,
  getClipWarning,
  formatPresetApplied,
  formatPresetAppliedReference,
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
  pluralizeRu,
  pluralizeUk,
  getHistoryLabel,
  getStatsLabel
} from './i18n.js';

// ============================================
//  ЛОГИРОВАНИЕ
// ============================================
export {
  LOG_LEVELS,
  createLogger,
  setGlobalLogLevel,
  getGlobalLogLevel,
  getGlobalLogLevelName,
  clearAllLogs
} from './logger.js';

// ============================================
//  УПРАВЛЕНИЕ ПАМЯТЬЮ
// ============================================
export {
  MemoryManager,
  memoryManager,
  registerDOMElement,
  registerObject,
  registerTimer,
  registerAudioNode,
  globalCleanup,
  getMemoryStats
} from './memory.js';

// ============================================
//  РАБОТА С ПРЕСЕТАМИ
// ============================================
export {
  populatePresetSelect,
  saveUserPreset,
  loadUserPreset,
  handlePresetSelect,
  toggleABCompare,
  getPresetList,
  resetABCompareState
} from './presets.js';

// ============================================
//  СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================
export {
  state,
  dom,
  initDom,
  updateState,
  getState,
  getDom
} from './state.js';

// ============================================
//  ХРАНИЛИЩЕ
// ============================================
export {
  getUserPresets,
  saveUserPresets,
  saveAllSettings,
  getSliderGains,
  loadSettings,
  exportSettings,
  importSettings
} from './storage.js';

// ============================================
//  СИНХРОНИЗАЦИЯ ХРАНИЛИЩА
// ============================================
export {
  storage,
  initializeStorage,
  onSettingChange,
  offSettingChange
} from './storage-sync.js';

// ============================================
//  UI ФУНКЦИИ
// ============================================
export {
  setStatus,
  updateConnectButton,
  updatePresetInfo,
  getPresetDesc,
  getPresetDisplay,
  updateGainClass,
  showLoading,
  toggleTheme,
  toggleExpand,
  updateSiteInfo,
  normalizeStatus,
  CONNECTION_STATES
} from './ui.js';

// ============================================
//  ВИЗУАЛИЗАЦИЯ
// ============================================
export {
  updateEQGraph,
  updateSpectrum,
  updateVUMeter,
  visualizationLoop,
  stopVisualization,
  checkClipping,
  showClipIndicator,
  hideClipIndicator,
  setupClipIndicatorDismiss,
  initVisualization,
  resetVisualization,
  CLIP_CONFIG,
  initVisualizationEffects,
  updateEffectButtonLabel,
  syncEffect
} from './visualization.js';

// ============================================
//  ЭФФЕКТЫ ВИЗУАЛИЗАЦИИ
// ============================================
export {
  EFFECTS,
  EFFECT_NAMES,
  getEffectName as getEffectNameFromEffects,
  getCurrentEffect,
  setCurrentEffect,
  loadSavedEffect,
  initEffects,
  renderEffect
} from './visualization-effects.js';

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ (ВСЕ МОДУЛИ)
// ============================================
// Re-export declarations (`export { x } from ...`) do not create local
// bindings. Build the compatibility default export from module namespaces so
// importing modules/index.js cannot fail with ReferenceError.
export default Object.freeze({
  ...audioModule,
  ...browserCompatModule,
  ...configModule,
  ...i18nModule,
  ...loggerModule,
  ...memoryModule,
  ...presetsModule,
  ...stateModule,
  ...storageModule,
  ...storageSyncModule,
  ...uiModule,
  ...visualizationModule,
  ...visualizationEffectsModule
});
