// ============================================
//  STORAGE.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  Работа с хранилищем
//  FIREFOX 153 OPTIMIZED: обработка ошибок в exportSettings
//  FIREFOX 153 OPTIMIZED: единое хранилище через storage-sync
// ============================================

import { state, dom } from './state.js';
import { getCurrentLang } from './i18n.js';
import { storage } from './storage-sync.js';

const browserAPI = globalThis.browser;
if (!browserAPI?.runtime) throw new Error('Mozilla Firefox extension API unavailable');

const CANONICAL_KEYS = {
  eqSettings: 'sf_eqSettings',
  volumeBoost: 'sf_volumeBoost',
  bassBoost: 'sf_bassBoost',
  selectedPreset: 'sf_selectedPreset',
  theme: 'sf_theme',
  language: 'sf_language',
  savedVolume: 'sf_savedVolume',
  savedBass: 'sf_savedBass',
  userPresets: 'sf_userPresets'
};

let _lastUserPresetsSnapshot = null;
let _lastSettingsSnapshot = null;

// ============================================
//  ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЬСКИХ ПРЕСЕТОВ
// ============================================

export function getUserPresets() {
  try {
    if (storage.getStats().initialized) {
      const canonicalFromFirefox = storage.get('userPresets', null);
      if (canonicalFromFirefox && typeof canonicalFromFirefox === 'object') {
        _lastUserPresetsSnapshot = { ...canonicalFromFirefox };
        try {
          const serialized = JSON.stringify(canonicalFromFirefox);
          localStorage.setItem('soundforge_user_presets_canonical', serialized);
          localStorage.setItem('soundforge_user_presets', serialized);
        } catch {}
        return canonicalFromFirefox;
      }
    }

    const canonical = localStorage.getItem('soundforge_user_presets_canonical');
    if (canonical) {
      const parsed = JSON.parse(canonical);
      _lastUserPresetsSnapshot = { ...parsed };
      return parsed;
    }
    const legacy = localStorage.getItem('soundforge_user_presets');
    const parsed = legacy ? JSON.parse(legacy) : {};
    _lastUserPresetsSnapshot = { ...parsed };
    return parsed;
  } catch {
    _lastUserPresetsSnapshot = {};
    return {};
  }
}

function sendPresetMutation(action, payload) {
  try {
    const maybePromise = browserAPI.runtime.sendMessage({ action, ...payload });
    if (maybePromise?.catch) maybePromise.catch(() => {});
  } catch {}
}

// ============================================
//  СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЬСКИХ ПРЕСЕТОВ
// ============================================

export function saveUserPresets(presets) {
  try {
    const normalized = presets || {};
    const previous = _lastUserPresetsSnapshot || getUserPresets();
    const serialized = JSON.stringify(normalized);
    localStorage.setItem('soundforge_user_presets_canonical', serialized);
    localStorage.setItem('soundforge_user_presets', serialized);

    for (const [name, preset] of Object.entries(normalized)) {
      if (JSON.stringify(previous[name]) !== JSON.stringify(preset)) {
        sendPresetMutation('saveUserPreset', { name, preset });
      }
    }
    for (const name of Object.keys(previous)) {
      if (!Object.prototype.hasOwnProperty.call(normalized, name)) {
        sendPresetMutation('deleteUserPreset', { name });
      }
    }

    _lastUserPresetsSnapshot = { ...normalized };
  } catch (error) {
    console.warn('[Storage] Не удалось сохранить пользовательские пресеты:', error);
  }
}

// ============================================
//  СОХРАНЕНИЕ ВСЕХ НАСТРОЕК
// ============================================

export function saveAllSettings() {
  const gains = getSliderGains();
  const volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
  const bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;
  const selectedPreset = state.currentPreset === 'custom' ? null : state.currentPreset;
  const settings = {
    eqSettings: gains,
    volumeBoost: volume / 100,
    bassBoost: bass,
    selectedPreset,
    theme: state.currentTheme,
    language: getCurrentLang(),
    savedVolume: volume,
    savedBass: bass
  };

  const previous = _lastSettingsSnapshot || {};
  const patch = {};
  for (const [key, value] of Object.entries(settings)) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(value)) {
      patch[key] = value;
    }
  }

  _lastSettingsSnapshot = JSON.parse(JSON.stringify(settings));
  if (Object.keys(patch).length === 0) return;

  storage.updateCache(patch);

  const fallback = () => {
    storage.setMultiple(patch).catch((fallbackError) => {
      console.warn('[Storage] Ошибка fallback-сохранения настроек:', fallbackError);
    });
  };

  try {
    browserAPI.runtime.sendMessage({ action: 'settingsSnapshot', settings: patch }, (response) => {
      if (browserAPI.runtime.lastError || !response || response.status !== 'ok') {
        fallback();
      }
    });
  } catch (error) {
    fallback();
  }
}

// ============================================
//  ПОЛУЧЕНИЕ НАСТРОЕК СЛАЙДЕРОВ
// ============================================

export function getSliderGains() {
  const gains = {};
  if (dom.eqSliders) {
    dom.eqSliders.forEach((slider) => {
      gains[slider.dataset.freq] = parseFloat(slider.value);
    });
  }
  return gains;
}

// ============================================
//  ЗАГРУЗКА НАСТРОЕК
// ============================================

export function loadSettings(callback) {
  const keys = [
    ...Object.values(CANONICAL_KEYS),
    'theme', 'eqSettings', 'selectedPreset', 'volumeBoost', 'bassBoost',
    'language', 'savedVolume', 'savedBass'
  ];
  browserAPI.storage.local.get(keys, (result) => {
    if (browserAPI.runtime.lastError) {
      console.warn('[Storage] Ошибка загрузки настроек:', browserAPI.runtime.lastError);
      callback?.({});
      return;
    }
    const normalized = {
      ...result,
      theme: result[CANONICAL_KEYS.theme] ?? result.theme,
      eqSettings: result[CANONICAL_KEYS.eqSettings] ?? result.eqSettings,
      selectedPreset: result[CANONICAL_KEYS.selectedPreset] ?? result.selectedPreset,
      volumeBoost: result[CANONICAL_KEYS.volumeBoost] ?? result.volumeBoost,
      bassBoost: result[CANONICAL_KEYS.bassBoost] ?? result.bassBoost,
      language: result[CANONICAL_KEYS.language] ?? result.language,
      savedVolume: result[CANONICAL_KEYS.savedVolume] ?? result.savedVolume,
      savedBass: result[CANONICAL_KEYS.savedBass] ?? result.savedBass
    };
    _lastSettingsSnapshot = JSON.parse(JSON.stringify({
      eqSettings: normalized.eqSettings,
      volumeBoost: normalized.volumeBoost,
      bassBoost: normalized.bassBoost,
      selectedPreset: normalized.selectedPreset,
      theme: normalized.theme,
      language: normalized.language,
      savedVolume: normalized.savedVolume,
      savedBass: normalized.savedBass
    }));
    callback?.(normalized);
  });
}

// ============================================
//  ЭКСПОРТ НАСТРОЕК
// ============================================

export function exportSettings() {
  return new Promise((resolve, reject) => {
    browserAPI.storage.local.get(null, (data) => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
        return;
      }
      const presets = getUserPresets();
      const exportData = {
        version: '3.22.8',
        timestamp: Date.now(),
        settings: data,
        userPresets: presets
      };
      resolve(exportData);
    });
  });
}

// ============================================
//  ИМПОРТ НАСТРОЕК
// ============================================

export function importSettings(data) {
  return new Promise((resolve, reject) => {
    try {
      const importData = typeof data === 'string' ? JSON.parse(data) : data;
      if (!importData || typeof importData !== 'object' || !importData.settings || typeof importData.settings !== 'object') {
        throw new Error('Неверный формат файла: отсутствует объект settings');
      }

      const allowedKeys = new Set([
        'theme', 'eqSettings', 'selectedPreset', 'volumeBoost', 'bassBoost',
        'language', 'savedVolume', 'savedBass', 'userPresets',
        ...Object.values(CANONICAL_KEYS)
      ]);
      const safeSettings = Object.fromEntries(
        Object.entries(importData.settings).filter(([key]) => allowedKeys.has(key))
      );
      if (importData.userPresets && typeof importData.userPresets === 'object') {
        safeSettings.userPresets = importData.userPresets;
      }

      browserAPI.runtime.sendMessage({ action: 'settingsSnapshot', settings: safeSettings }, (response) => {
        if (browserAPI.runtime.lastError) {
          reject(new Error(browserAPI.runtime.lastError.message));
          return;
        }
        if (!response || response.status !== 'ok') {
          reject(new Error(response?.message || 'Не удалось импортировать настройки'));
          return;
        }
        storage.updateCache(safeSettings);
        _lastSettingsSnapshot = JSON.parse(JSON.stringify({
          eqSettings: safeSettings.eqSettings ?? safeSettings.sf_eqSettings,
          volumeBoost: safeSettings.volumeBoost ?? safeSettings.sf_volumeBoost,
          bassBoost: safeSettings.bassBoost ?? safeSettings.sf_bassBoost,
          selectedPreset: safeSettings.selectedPreset ?? safeSettings.sf_selectedPreset,
          theme: safeSettings.theme ?? safeSettings.sf_theme,
          language: safeSettings.language ?? safeSettings.sf_language,
          savedVolume: safeSettings.savedVolume ?? safeSettings.sf_savedVolume,
          savedBass: safeSettings.savedBass ?? safeSettings.sf_savedBass
        }));
        if (safeSettings.userPresets) {
          saveUserPresets(safeSettings.userPresets);
        }
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}