// ============================================
//  STORAGE.JS - Работа с хранилищем (v3.22.8)
//  ИСПРАВЛЕНО: обработка ошибок в exportSettings
// ============================================

import { state, dom } from './state.js';
import { getCurrentLang } from './i18n.js';

export function getUserPresets() {
  try {
    const saved = localStorage.getItem('soundforge_user_presets');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveUserPresets(presets) {
  try {
    localStorage.setItem('soundforge_user_presets', JSON.stringify(presets));
  } catch {}
}

export function saveAllSettings() {
  const gains = getSliderGains();
  const volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
  const bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;
  
  chrome.storage.local.set({
    eqSettings: gains,
    volumeBoost: volume / 100,
    bassBoost: bass,
    selectedPreset: state.currentPreset === 'custom' ? null : state.currentPreset,
    theme: state.currentTheme,
    language: getCurrentLang(),
    savedVolume: volume,
    savedBass: bass
  });
}

export function getSliderGains() {
  const gains = {};
  if (dom.eqSliders) {
    dom.eqSliders.forEach((slider) => {
      gains[slider.dataset.freq] = parseFloat(slider.value);
    });
  }
  return gains;
}

export function loadSettings(callback) {
  chrome.storage.local.get(['theme', 'eqSettings', 'selectedPreset', 'volumeBoost', 'bassBoost', 'language', 'savedVolume', 'savedBass'], (result) => {
    if (callback) callback(result);
  });
}

export function exportSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
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

export function importSettings(data) {
  return new Promise((resolve, reject) => {
    try {
      const importData = JSON.parse(data);
      if (importData.settings) {
        chrome.storage.local.set(importData.settings, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (importData.userPresets) {
            saveUserPresets(importData.userPresets);
          }
          resolve();
        });
      } else {
        reject(new Error('Неверный формат файла'));
      }
    } catch(e) {
      reject(e);
    }
  });
}