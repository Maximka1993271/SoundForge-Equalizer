import {
  initEffects as initSharedEffects,
  renderEffect as renderSharedEffect,
  setCurrentEffect as setSharedEffect,
  getCurrentEffect as getSharedEffect,
  loadSavedEffect as loadSharedEffect,
  getEffectName as getSharedEffectName
} from './modules/visualization-effects.js';
import { state as sharedAppState } from './modules/state.js';

// ============================================
//  WINDOW.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  Standalone Window
//  FULL LOCALIZATION: RU, UA, EN
//  HOTKEYS: Ctrl+Shift+E, Ctrl+Shift+Y, Ctrl+Shift+X
//  ЭФФЕКТЫ ВИЗУАЛИЗАЦИИ: СПЕКТР | ВОЛНЫ | ОГОНЬ | НЕОН
//  FIREFOX 153 OPTIMIZED: безопасная отправка сообщений
//  FIREFOX 153 OPTIMIZED: подключение к аудио (доверяем background)
//  FIREFOX 153 OPTIMIZED: кнопка эффектов
//  ИСПРАВЛЕНО: защита connection state
//  ИСПРАВЛЕНО: панель не дергается при смене эффекта/пресета
// ============================================

(function() {
  'use strict';

  console.log('🪟 SoundForge Window v3.22.8 Firefox 153');

  // ============================================
  //  ПОЛИФИЛЛЫ
  // ============================================

  if (typeof Object.assign !== 'function') {
    Object.assign = function(target) {
      if (target === null || target === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource !== null && nextSource !== undefined) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }

  if (typeof Array.from !== 'function') {
    Array.from = function(arrayLike) {
      var result = [];
      for (var i = 0; i < arrayLike.length; i++) {
        result.push(arrayLike[i]);
      }
      return result;
    };
  }

  // ============================================
  //  API DETECTION (FIREFOX 153 OPTIMIZED)
  // ============================================

  var api = (typeof browser !== 'undefined' && browser.runtime) ? browser : null;

  if (!api) {
    console.warn('⚠️ Extension API not available');
  }

  // ============================================
  //  CONNECTION STATE GUARD (ЗАЩИТА)
  // ============================================

  var CONNECTION_STATES = ['connected', 'connecting', 'disconnected', 'error'];

  function isConnectionState(status) {
    return CONNECTION_STATES.indexOf(status) !== -1;
  }

  // ============================================
  //  БЕЗОПАСНАЯ ОТПРАВКА СООБЩЕНИЙ
  // ============================================

  function safeSendMessage(message, callback) {
    try {
      if (api && api.runtime && api.runtime.sendMessage) {
        api.runtime.sendMessage(message, function(response) {
          if (api.runtime && api.runtime.lastError) {
            // Игнорируем ошибки отправки
          }
          if (typeof callback === 'function') {
            try {
              callback(response);
            } catch (e) {}
          }
        });
      } else {
        if (typeof callback === 'function') {
          try { callback(null); } catch (e) {}
        }
      }
    } catch (e) {
      if (typeof callback === 'function') {
        try { callback(null); } catch (e) {}
      }
    }
  }

  var CANONICAL_STORAGE_KEYS = {
    eqSettings: 'sf_eqSettings',
    volumeBoost: 'sf_volumeBoost',
    bassBoost: 'sf_bassBoost',
    selectedPreset: 'sf_selectedPreset',
    theme: 'sf_theme',
    language: 'sf_language',
    savedVolume: 'sf_savedVolume',
    savedBass: 'sf_savedBass'
  };

  var windowUserPresets = {};

  function safeStorageGet(keys, callback) {
    try {
      if (api && api.storage && api.storage.local) {
        var requested = Array.isArray(keys) ? keys : [keys];
        var storageKeys = requested.slice();
        requested.forEach(function(key) {
          if (CANONICAL_STORAGE_KEYS[key]) storageKeys.push(CANONICAL_STORAGE_KEYS[key]);
        });
        api.storage.local.get(storageKeys, function(result) {
          if (api.runtime && api.runtime.lastError) {
            if (typeof callback === 'function') callback({});
            return;
          }
          var normalized = Object.assign({}, result || {});
          requested.forEach(function(key) {
            var canonicalKey = CANONICAL_STORAGE_KEYS[key];
            if (canonicalKey && result && result[canonicalKey] !== undefined) {
              normalized[key] = result[canonicalKey];
            }
          });
          if (typeof callback === 'function') callback(normalized);
        });
      } else {
        if (typeof callback === 'function') callback({});
      }
    } catch (e) {
      if (typeof callback === 'function') callback({});
    }
  }

  function safeStorageSet(data, callback) {
    try {
      var payload = Object.assign({}, data || {});

      if (api && api.runtime && api.runtime.sendMessage) {
        api.runtime.sendMessage({ action: 'settingsSnapshot', settings: payload }, function(response) {
          if (api.runtime && api.runtime.lastError) {
            console.warn('[SoundForge Window] Ошибка сохранения через background:', api.runtime.lastError.message);
            if (api.storage && api.storage.local) {
              var fallbackPayload = Object.assign({}, payload);
              Object.keys(payload).forEach(function(key) {
                var canonicalKey = CANONICAL_STORAGE_KEYS[key];
                if (canonicalKey) fallbackPayload[canonicalKey] = payload[key];
              });
              api.storage.local.set(fallbackPayload, function() {
                if (typeof callback === 'function') callback();
              });
              return;
            }
          }
          if (response && response.status === 'error') {
            console.warn('[SoundForge Window] Ошибка сохранения:', response.message);
          }
          if (typeof callback === 'function') callback();
        });
        return;
      }

      if (api && api.storage && api.storage.local) {
        var fallbackPayload = Object.assign({}, payload);
        Object.keys(payload).forEach(function(key) {
          var canonicalKey = CANONICAL_STORAGE_KEYS[key];
          if (canonicalKey) fallbackPayload[canonicalKey] = payload[key];
        });
        api.storage.local.set(fallbackPayload, function() {
          if (typeof callback === 'function') callback();
        });
        return;
      }

      if (typeof callback === 'function') callback();
    } catch (e) {
      if (typeof callback === 'function') callback();
    }
  }

  // ============================================
  //  50 PRESETS (CANONICAL ORDER)
  // ============================================

  var PRESETS = {
    flat: { gains: { 31: 0, 62: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0 }, volume: 100, bass: 0 },
    natural: { gains: { 31: 0.5, 62: 1.0, 125: 1.5, 250: 1.0, 500: 0.5, 1000: 0, 2000: 0.5, 4000: 1.0, 8000: 1.5, 16000: 1.0 }, volume: 100, bass: 1.0 },
    universal: { gains: { 31: 1.5, 62: 2.0, 125: 2.0, 250: 1.5, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: 1.5, 8000: 2.0, 16000: 1.5 }, volume: 100, bass: 2.0 },
    balanced: { gains: { 31: 1.0, 62: 1.5, 125: 1.5, 250: 1.0, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: 1.0, 8000: 1.5, 16000: 1.0 }, volume: 100, bass: 1.5 },
    club: { gains: { 31: 4.0, 62: 5.0, 125: 4.0, 250: 2.0, 500: -0.5, 1000: 0.5, 2000: 1.5, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 5.0 },
    dance: { gains: { 31: 3.5, 62: 4.5, 125: 3.5, 250: 1.5, 500: 0, 1000: 1.0, 2000: 2.0, 4000: 3.0, 8000: 3.5, 16000: 3.0 }, volume: 100, bass: 4.5 },
    edm: { gains: { 31: 4.5, 62: 5.5, 125: 4.0, 250: 1.5, 500: -1.0, 1000: 0.5, 2000: 2.5, 4000: 3.5, 8000: 4.0, 16000: 3.5 }, volume: 100, bass: 5.5 },
    synthwave: { gains: { 31: 2.5, 62: 3.5, 125: 3.0, 250: 1.5, 500: -0.5, 1000: 1.0, 2000: 2.0, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 3.5 },
    deephouse: { gains: { 31: 3.5, 62: 4.5, 125: 3.5, 250: 1.5, 500: 0, 1000: 0.5, 2000: 1.5, 4000: 2.0, 8000: 2.5, 16000: 2.0 }, volume: 100, bass: 4.5 },
    festival: { gains: { 31: 5.0, 62: 6.0, 125: 5.0, 250: 2.5, 500: 0.5, 1000: 1.0, 2000: 2.5, 4000: 3.5, 8000: 4.5, 16000: 4.0 }, volume: 100, bass: 6.0 },
    rock: { gains: { 31: 2.5, 62: 3.0, 125: 2.5, 250: 1.0, 500: -0.5, 1000: 1.0, 2000: 2.5, 4000: 3.5, 8000: 4.0, 16000: 3.0 }, volume: 100, bass: 3.0 },
    metal: { gains: { 31: 3.5, 62: 4.0, 125: 3.0, 250: 0.5, 500: -2.0, 1000: 0.5, 2000: 3.0, 4000: 4.5, 8000: 5.0, 16000: 4.0 }, volume: 100, bass: 4.0 },
    hardrock: { gains: { 31: 3.0, 62: 3.5, 125: 2.5, 250: 1.0, 500: -1.0, 1000: 1.0, 2000: 3.0, 4000: 4.0, 8000: 4.5, 16000: 3.5 }, volume: 100, bass: 3.5 },
    grunge: { gains: { 31: 2.0, 62: 2.5, 125: 2.0, 250: 1.0, 500: -0.5, 1000: 0.5, 2000: 2.0, 4000: 3.0, 8000: 3.0, 16000: 2.0 }, volume: 100, bass: 2.5 },
    vocal: { gains: { 31: -3.0, 62: -1.5, 125: -0.5, 250: 1.0, 500: 2.0, 1000: 3.5, 2000: 3.0, 4000: 2.0, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: -1.5 },
    podcast: { gains: { 31: -4.0, 62: -2.5, 125: -1.0, 250: 1.0, 500: 2.5, 1000: 4.0, 2000: 3.5, 4000: 2.5, 8000: 1.0, 16000: 0 }, volume: 100, bass: -2.5 },
    speech: { gains: { 31: -5.0, 62: -3.5, 125: -1.5, 250: 0.5, 500: 2.5, 1000: 4.5, 2000: 4.0, 4000: 3.0, 8000: 1.0, 16000: 0 }, volume: 100, bass: -3.5 },
    rap: { gains: { 31: 3.5, 62: 4.0, 125: 2.5, 250: 1.0, 500: -0.5, 1000: 1.0, 2000: 2.0, 4000: 3.0, 8000: 3.5, 16000: 2.5 }, volume: 100, bass: 4.0 },
    acoustic: { gains: { 31: 0, 62: 0.5, 125: 1.0, 250: 1.5, 500: 2.0, 1000: 2.5, 2000: 2.0, 4000: 1.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 0.5 },
    piano: { gains: { 31: -1.0, 62: -0.5, 125: 0, 250: 1.0, 500: 2.0, 1000: 3.0, 2000: 3.5, 4000: 2.5, 8000: 2.0, 16000: 1.5 }, volume: 100, bass: -0.5 },
    orchestra: { gains: { 31: 0.5, 62: 1.0, 125: 1.0, 250: 1.5, 500: 1.5, 1000: 2.0, 2000: 2.0, 4000: 1.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 1.0 },
    classical: { gains: { 31: 0, 62: 0.5, 125: 0.5, 250: 0.5, 500: 1.0, 1000: 1.5, 2000: 1.5, 4000: 1.0, 8000: 0.5, 16000: 0.5 }, volume: 100, bass: 0.5 },
    jazz: { gains: { 31: 1.0, 62: 1.5, 125: 2.0, 250: 1.5, 500: 1.0, 1000: 1.5, 2000: 2.0, 4000: 1.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 1.5 },
    headphones: { gains: { 31: 1.0, 62: 1.5, 125: 1.5, 250: 1.0, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: 1.5, 8000: 2.0, 16000: 1.5 }, volume: 100, bass: 1.5 },
    car: { gains: { 31: 3.5, 62: 4.5, 125: 3.5, 250: 1.5, 500: 0, 1000: 0.5, 2000: 1.5, 4000: 2.0, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 4.5 },
    night: { gains: { 31: -1.0, 62: -0.5, 125: 0, 250: 0.5, 500: 1.0, 1000: 0.5, 2000: 0, 4000: -0.5, 8000: -1.0, 16000: -1.5 }, volume: 100, bass: -0.5 },
    bassboost: { gains: { 31: 6.0, 62: 7.0, 125: 5.0, 250: 2.5, 500: 0, 1000: 0.5, 2000: 0.5, 4000: 0.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 7.0 },
    pop: { gains: { 31: 1.0, 62: 1.5, 125: 1.5, 250: 1.0, 500: 1.5, 1000: 2.5, 2000: 3.0, 4000: 2.5, 8000: 2.0, 16000: 1.5 }, volume: 100, bass: 1.5 },
    kpop: { gains: { 31: 2.5, 62: 3.0, 125: 2.5, 250: 1.5, 500: 1.0, 1000: 2.0, 2000: 3.0, 4000: 3.5, 8000: 4.0, 16000: 3.5 }, volume: 100, bass: 3.0 },
    world: { gains: { 31: 1.5, 62: 2.0, 125: 2.0, 250: 1.5, 500: 1.0, 1000: 2.0, 2000: 2.0, 4000: 1.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 2.0 },
    ambient: { gains: { 31: 0.5, 62: 1.0, 125: 1.5, 250: 1.5, 500: 1.5, 1000: 2.0, 2000: 2.5, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 1.0 },
    wave: { gains: { 31: 5.5, 62: 6.5, 125: 4.5, 250: 1.5, 500: -1.5, 1000: -0.5, 2000: 0.5, 4000: 2.0, 8000: 3.5, 16000: 4.0 }, volume: 100, bass: 6.5 },
    phonk: { gains: { 31: 7.0, 62: 8.0, 125: 5.5, 250: 2.0, 500: -2.5, 1000: -1.5, 2000: 0, 4000: 2.0, 8000: 4.5, 16000: 5.0 }, volume: 100, bass: 8.0 },
    hiphop: { gains: { 31: 4.5, 62: 5.5, 125: 4.0, 250: 2.0, 500: -0.5, 1000: 1.0, 2000: 2.0, 4000: 2.5, 8000: 3.5, 16000: 3.0 }, volume: 100, bass: 5.5 },
    soul: { gains: { 31: 2.5, 62: 3.0, 125: 2.5, 250: 2.0, 500: 1.5, 1000: 2.0, 2000: 1.5, 4000: 1.0, 8000: 0.5, 16000: 0 }, volume: 100, bass: 3.0 },
    blues: { gains: { 31: 1.5, 62: 2.0, 125: 2.0, 250: 1.5, 500: 1.0, 1000: 1.5, 2000: 2.0, 4000: 1.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 2.0 },
    reggae: { gains: { 31: 3.5, 62: 4.0, 125: 3.5, 250: 2.0, 500: 0.5, 1000: 1.0, 2000: 1.5, 4000: 2.0, 8000: 2.5, 16000: 2.0 }, volume: 100, bass: 4.0 },
    chill: { gains: { 31: 1.0, 62: 1.5, 125: 1.5, 250: 1.0, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: 1.0, 8000: 0.5, 16000: 0 }, volume: 100, bass: 1.5 },
    lofi: { gains: { 31: 1.0, 62: 1.5, 125: 1.0, 250: 0.5, 500: 0, 1000: -0.5, 2000: -1.5, 4000: -2.5, 8000: -3.5, 16000: -4.5 }, volume: 100, bass: 1.5 },
    sunset: { gains: { 31: 0.5, 62: 1.0, 125: 1.0, 250: 0.5, 500: 0, 1000: 0.5, 2000: 0.5, 4000: 0.5, 8000: 0, 16000: -0.5 }, volume: 100, bass: 1.0 },
    logitech: { gains: { 31: 3.0, 62: 3.5, 125: 2.5, 250: 1.5, 500: 0.5, 1000: 1.0, 2000: 2.0, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 3.5 },
    maxboost: { gains: { 31: 4.0, 62: 5.0, 125: 3.5, 250: 2.0, 500: 1.0, 1000: 1.0, 2000: 2.0, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 5.0 },
    gaming: { gains: { 31: 2.0, 62: 2.5, 125: 2.0, 250: 1.0, 500: 0.5, 1000: 1.5, 2000: 3.0, 4000: 4.0, 8000: 4.5, 16000: 3.5 }, volume: 100, bass: 2.5 },
    movie: { gains: { 31: 3.5, 62: 4.0, 125: 3.5, 250: 2.0, 500: 1.0, 1000: 1.5, 2000: 2.0, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 4.0 },
    fps: { gains: { 31: -1.0, 62: -0.5, 125: 0, 250: 0.5, 500: 1.5, 1000: 3.0, 2000: 4.5, 4000: 5.5, 8000: 5.0, 16000: 4.0 }, volume: 100, bass: -0.5 },
    hifi: { gains: { 31: 0.5, 62: 1.0, 125: 1.0, 250: 0.5, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: 1.5, 8000: 2.0, 16000: 1.5 }, volume: 100, bass: 1.0 },
    studio: { gains: { 31: 0, 62: 0.5, 125: 0.5, 250: 0.5, 500: 0.5, 1000: 0.5, 2000: 0.5, 4000: 0.5, 8000: 0.5, 16000: 0.5 }, volume: 100, bass: 0.5 },
    premium: { gains: { 31: 1.5, 62: 2.0, 125: 1.5, 250: 1.0, 500: 0.5, 1000: 1.0, 2000: 1.5, 4000: 2.0, 8000: 2.5, 16000: 2.0 }, volume: 100, bass: 2.0 },
    master: { gains: { 31: 1.0, 62: 1.5, 125: 1.0, 250: 0.5, 500: 0.5, 1000: 1.0, 2000: 1.5, 4000: 2.0, 8000: 2.5, 16000: 2.0 }, volume: 100, bass: 1.5 },
    clarity: { gains: { 31: -1.5, 62: -0.5, 125: 0, 250: 0.5, 500: 1.0, 1000: 2.5, 2000: 4.0, 4000: 4.5, 8000: 3.5, 16000: 2.5 }, volume: 100, bass: -0.5 }
  };

  var PRESET_ORDER = [
    'flat', 'natural', 'universal', 'balanced', 'club', 'dance', 'edm', 'synthwave', 'deephouse', 'festival', 'rock', 'metal', 'hardrock', 'grunge', 'vocal', 'podcast', 'speech', 'rap', 'acoustic', 'piano', 'orchestra', 'classical', 'jazz', 'headphones', 'car', 'night', 'bassboost', 'pop', 'kpop', 'world', 'ambient', 'wave', 'phonk', 'hiphop', 'soul', 'blues', 'reggae', 'chill', 'lofi', 'sunset', 'logitech', 'maxboost', 'gaming', 'movie', 'fps', 'hifi', 'studio', 'premium', 'master', 'clarity'
  ];

  // ============================================
  //  PRESET INFO
  // ============================================

  var PRESET_INFO = {
    flat: { icon: '🎯', desc_ru: 'Reference', desc_en: 'Reference', desc_uk: 'Reference' },
    natural: { icon: '🌿', desc_ru: 'Естественный', desc_en: 'Natural', desc_uk: 'Природний' },
    universal: { icon: '🎵', desc_ru: 'Универсальный', desc_en: 'Universal', desc_uk: 'Універсальний' },
    balanced: { icon: '⚖️', desc_ru: 'Сбалансированный', desc_en: 'Balanced', desc_uk: 'Збалансований' },
    club: { icon: '🪩', desc_ru: 'Клуб', desc_en: 'Club', desc_uk: 'Клуб' },
    dance: { icon: '💃', desc_ru: 'Танцы', desc_en: 'Dance', desc_uk: 'Танці' },
    edm: { icon: '🔊', desc_ru: 'EDM', desc_en: 'EDM', desc_uk: 'EDM' },
    synthwave: { icon: '🎹', desc_ru: 'Синтвейв', desc_en: 'Synthwave', desc_uk: 'Синтвейв' },
    deephouse: { icon: '🎧', desc_ru: 'Deep House', desc_en: 'Deep House', desc_uk: 'Deep House' },
    festival: { icon: '🔥', desc_ru: 'Фестиваль', desc_en: 'Festival', desc_uk: 'Фестиваль' },
    rock: { icon: '🤘', desc_ru: 'Рок', desc_en: 'Rock', desc_uk: 'Рок' },
    metal: { icon: '🔥', desc_ru: 'Метал', desc_en: 'Metal', desc_uk: 'Метал' },
    hardrock: { icon: '🎸', desc_ru: 'Хард-рок', desc_en: 'Hard Rock', desc_uk: 'Хард-рок' },
    grunge: { icon: '🎸', desc_ru: 'Гранж', desc_en: 'Grunge', desc_uk: 'Гранж' },
    vocal: { icon: '🎙️', desc_ru: 'Вокал', desc_en: 'Vocal', desc_uk: 'Вокал' },
    podcast: { icon: '🎤', desc_ru: 'Подкаст', desc_en: 'Podcast', desc_uk: 'Подкаст' },
    speech: { icon: '🎙️', desc_ru: 'Речь', desc_en: 'Speech', desc_uk: 'Мова' },
    rap: { icon: '🎤', desc_ru: 'Рэп', desc_en: 'Rap', desc_uk: 'Реп' },
    acoustic: { icon: '🎸', desc_ru: 'Акустика', desc_en: 'Acoustic', desc_uk: 'Акустика' },
    piano: { icon: '🎹', desc_ru: 'Фортепиано', desc_en: 'Piano', desc_uk: 'Фортепіано' },
    orchestra: { icon: '🎻', desc_ru: 'Оркестр', desc_en: 'Orchestra', desc_uk: 'Оркестр' },
    classical: { icon: '🎻', desc_ru: 'Классика', desc_en: 'Classical', desc_uk: 'Класика' },
    jazz: { icon: '🎷', desc_ru: 'Джаз', desc_en: 'Jazz', desc_uk: 'Джаз' },
    headphones: { icon: '🎧', desc_ru: 'Наушники', desc_en: 'Headphones', desc_uk: 'Навушники' },
    car: { icon: '🚗', desc_ru: 'Авто', desc_en: 'Car', desc_uk: 'Авто' },
    night: { icon: '🌙', desc_ru: 'Ночной', desc_en: 'Night', desc_uk: 'Нічний' },
    bassboost: { icon: '🔊', desc_ru: 'Макс. Бас', desc_en: 'Max Bass', desc_uk: 'Макс. Бас' },
    pop: { icon: '🎵', desc_ru: 'Поп', desc_en: 'Pop', desc_uk: 'Поп' },
    kpop: { icon: '🎵', desc_ru: 'K-Pop', desc_en: 'K-Pop', desc_uk: 'K-Pop' },
    world: { icon: '🌍', desc_ru: 'World', desc_en: 'World', desc_uk: 'World' },
    ambient: { icon: '🕊️', desc_ru: 'Эмбиент', desc_en: 'Ambient', desc_uk: 'Ембієнт' },
    wave: { icon: '🌊', desc_ru: 'Wave', desc_en: 'Wave', desc_uk: 'Wave' },
    phonk: { icon: '🔥', desc_ru: 'Phonk', desc_en: 'Phonk', desc_uk: 'Phonk' },
    hiphop: { icon: '🎤', desc_ru: 'Хип-хоп', desc_en: 'Hip-Hop', desc_uk: 'Хіп-хоп' },
    soul: { icon: '🎵', desc_ru: 'Соул', desc_en: 'Soul', desc_uk: 'Соул' },
    blues: { icon: '🎸', desc_ru: 'Блюз', desc_en: 'Blues', desc_uk: 'Блюз' },
    reggae: { icon: '🌴', desc_ru: 'Регги', desc_en: 'Reggae', desc_uk: 'Реггі' },
    chill: { icon: '☁️', desc_ru: 'Чилл', desc_en: 'Chill', desc_uk: 'Чілл' },
    lofi: { icon: '🎧', desc_ru: 'Lo-Fi', desc_en: 'Lo-Fi', desc_uk: 'Lo-Fi' },
    sunset: { icon: '🌅', desc_ru: 'Закат', desc_en: 'Sunset', desc_uk: 'Захід' },
    logitech: { icon: '🎧', desc_ru: 'Logitech G321', desc_en: 'Logitech G321', desc_uk: 'Logitech G321' },
    maxboost: { icon: '⚡', desc_ru: 'MAX BOOST', desc_en: 'MAX BOOST', desc_uk: 'MAX BOOST' },
    gaming: { icon: '🎮', desc_ru: 'Игры', desc_en: 'Gaming', desc_uk: 'Ігри' },
    movie: { icon: '🎬', desc_ru: 'Кино', desc_en: 'Movie', desc_uk: 'Кіно' },
    fps: { icon: '🎯', desc_ru: 'FPS', desc_en: 'FPS', desc_uk: 'FPS' },
    hifi: { icon: '✨', desc_ru: 'Hi-Fi', desc_en: 'Hi-Fi', desc_uk: 'Hi-Fi' },
    studio: { icon: '💎', desc_ru: 'Студия', desc_en: 'Studio', desc_uk: 'Студія' },
    premium: { icon: '🌟', desc_ru: 'Премиум', desc_en: 'Premium', desc_uk: 'Преміум' },
    master: { icon: '🎵', desc_ru: 'Мастер', desc_en: 'Master', desc_uk: 'Майстер' },
    clarity: { icon: '🎯', desc_ru: 'Четкость', desc_en: 'Clarity', desc_uk: 'Чіткість' }
  };

  var PRESET_CATEGORIES = {
    'flat': '🎵 Main', 'natural': '🎵 Main', 'universal': '🎵 Main', 'balanced': '🎵 Main',
    'club': '🎶 Electronic', 'dance': '🎶 Electronic', 'edm': '🎶 Electronic', 'synthwave': '🎶 Electronic', 'deephouse': '🎶 Electronic',
    'rock': '🎸 Rock/Metal', 'metal': '🎸 Rock/Metal', 'hardrock': '🎸 Rock/Metal', 'grunge': '🎸 Rock/Metal',
    'vocal': '🎤 Vocal/Podcast', 'podcast': '🎤 Vocal/Podcast', 'speech': '🎤 Vocal/Podcast', 'rap': '🎤 Vocal/Podcast',
    'acoustic': '🎻 Acoustic/Classical', 'piano': '🎻 Acoustic/Classical', 'orchestra': '🎻 Acoustic/Classical', 'classical': '🎻 Acoustic/Classical',
    'jazz': '🎻 Acoustic/Classical',
    'headphones': '🎧 Special', 'car': '🎧 Special', 'night': '🎧 Special', 'bassboost': '🎧 Special',
    'hiphop': '🎧 Special', 'soul': '🎧 Special', 'blues': '🎧 Special', 'reggae': '🎧 Special',
    'sunset': '🎧 Special', 'chill': '🎧 Special', 'lofi': '🎧 Special', 'pop': '🎧 Special',
    'kpop': '🎧 Special', 'world': '🎧 Special', 'ambient': '🎧 Special', 'clarity': '🎧 Special',
    'wave': '🌊 Wave/Phonk', 'phonk': '🌊 Wave/Phonk',
    'logitech': '⚡ MAX BOOST', 'maxboost': '⚡ MAX BOOST',
    'gaming': '🎮 Gaming/Movie', 'movie': '🎮 Gaming/Movie', 'fps': '🎮 Gaming/Movie',
    'hifi': '🌟 Premium', 'studio': '🌟 Premium', 'premium': '🌟 Premium', 'master': '🌟 Premium'
  };

  // ============================================
  //  TRANSLATIONS - ПОЛНЫЕ ПЕРЕВОДЫ
  // ============================================

  var LANGUAGES = {
    ru: {
      name: 'Русский', flag: '🇷🇺',
      loading: '⏳ Загрузка...',
      connect: '▶ Подключить',
      disconnect: '⏹ Отключить',
      connecting: '⏳...',
      reset: '↺ Сброс',
      status_ready: '✅ Готов',
      status_connected: '🔊 Подключен',
      status_disconnected: '⛔ Отключен',
      status_connecting: '⏳ Подключение...',
      status_reset: '🔄 Сброшено...',
      status_error: '❌ Ошибка',
      connection_error: '⚠️ Ошибка подключения',
      volume: '🎚️ Громкость',
      bass: '🔊 Bass Boost',
      export: '💾 Экспорт',
      import: '📂 Импорт',
      save_preset: '💾 Сохранить пресет',
      compare: '🔀 A/B Сравнение',
      bands: ' полос',
      visualization: '📊 Визуализация активна',
      preset: '🎛️ Настройки',
      custom: '🎛️ Настройки',
      preset_applied: '✅ Пресет применен: ',
      preset_applied_reference: '✅ Пресет применен: Reference',
      reset_done: '✅ Сброшено',
      resetting: '🔄 Сброшено...',
      error: '⚠️ Ошибка',
      import_done: '✅ Импорт завершен',
      export_done: '✅ Экспорт завершен',
      invalid_format: '⚠️ Неверный формат',
      volume_quiet: '🔇 Тихо',
      volume_normal: '🟢 Нормально',
      volume_loud: '🔊 Громко',
      volume_very_loud: '🔊 Очень громко',
      volume_dangerous: '⚠️ Опасно!',
      volume_critical: '🔴 КРИТИЧЕСКИ!',
      volume_maximum: '⚡ МАКСИМУМ!',
      history_empty: '📜 История пуста',
      history_records: '📜 {count} записей. Последнее: {action}',
      stats_total: '📊 Всего: {count} записей',
      stats_top: ' | Топ: {top}',
      window_title: '🔊 SoundForge',
      tab_title: 'SoundForge EQ — Отдельное окно',
      night: '🌙 Ночной',
      night_on: '🌙 Ночной ON',
      power: '⚡ Эконом',
      power_on: '⚡ Эконом ON',
      history: '📜 История',
      stats: '📊 Статистика',
      effect: '🎨 Эффект',
      spectrum: '📊 Спектр',
      waves: '🌊 Волны',
      fire: '🔥 Огонь',
      neon: '💜 Неон',
      export_completed: '✅ Экспорт завершен',
      import_completed: '✅ Импорт завершен',
      preset_saved: '💾 Пресет сохранен: ',
      ab_saved: '🔀 Режим A/B: сохранено состояние A',
      night_mode_on: '🌙 Ночной режим включен',
      night_mode_off: '☀️ Ночной режим выключен',
      power_save_on: '⚡ Энергосбережение включено',
      power_save_off: '⚡ Энергосбережение выключено',
      settings_reset: '✅ Все настройки сброшены'
    },
    uk: {
      name: 'Українська', flag: '🇺🇦',
      loading: '⏳ Завантаження...',
      connect: '▶ Підключити',
      disconnect: '⏹ Відключити',
      connecting: '⏳...',
      reset: '↺ Скинути',
      status_ready: '✅ Готово',
      status_connected: '🔊 Підключено',
      status_disconnected: '⛔ Відключено',
      status_connecting: '⏳ Підключення...',
      status_reset: '🔄 Скинуто...',
      status_error: '❌ Помилка',
      connection_error: '⚠️ Помилка підключення',
      volume: '🎚️ Гучність',
      bass: '🔊 Bass Boost',
      export: '💾 Експорт',
      import: '📂 Імпорт',
      save_preset: '💾 Зберегти пресет',
      compare: '🔀 A/B Порівняння',
      bands: ' смуг',
      visualization: '📊 Візуалізація активна',
      preset: '🎛️ Налаштування',
      custom: '🎛️ Налаштування',
      preset_applied: '✅ Пресет застосовано: ',
      preset_applied_reference: '✅ Пресет застосовано: Reference',
      reset_done: '✅ Скинуто',
      resetting: '🔄 Скинуто...',
      error: '⚠️ Помилка',
      import_done: '✅ Імпорт завершено',
      export_done: '✅ Експорт завершено',
      invalid_format: '⚠️ Невірний формат',
      volume_quiet: '🔇 Тихо',
      volume_normal: '🟢 Нормально',
      volume_loud: '🔊 Гучно',
      volume_very_loud: '🔊 Дуже гучно',
      volume_dangerous: '⚠️ Небезпечно!',
      volume_critical: '🔴 КРИТИЧНО!',
      volume_maximum: '⚡ МАКСИМУМ!',
      history_empty: '📜 Історія порожня',
      history_records: '📜 {count} записів. Останнє: {action}',
      stats_total: '📊 Всього: {count} записів',
      stats_top: ' | Топ: {top}',
      window_title: '🔊 SoundForge',
      tab_title: 'SoundForge EQ — Окреме вікно',
      night: '🌙 Нічний',
      night_on: '🌙 Нічний ON',
      power: '⚡ Економ',
      power_on: '⚡ Економ ON',
      history: '📜 Історія',
      stats: '📊 Статистика',
      effect: '🎨 Ефект',
      spectrum: '📊 Спектр',
      waves: '🌊 Хвилі',
      fire: '🔥 Вогонь',
      neon: '💜 Неон',
      export_completed: '✅ Експорт завершено',
      import_completed: '✅ Імпорт завершено',
      preset_saved: '💾 Пресет збережено: ',
      ab_saved: '🔀 Режим A/B: збережено стан A',
      night_mode_on: '🌙 Нічний режим увімкнено',
      night_mode_off: '☀️ Нічний режим вимкнено',
      power_save_on: '⚡ Енергозбереження увімкнено',
      power_save_off: '⚡ Енергозбереження вимкнено',
      settings_reset: '✅ Всі налаштування скинуто'
    },
    en: {
      name: 'English', flag: '🇺🇸',
      loading: '⏳ Loading...',
      connect: '▶ Connect',
      disconnect: '⏹ Disconnect',
      connecting: '⏳...',
      reset: '↺ Reset',
      status_ready: '✅ Ready',
      status_connected: '🔊 Connected',
      status_disconnected: '⛔ Disconnected',
      status_connecting: '⏳ Connecting...',
      status_reset: '🔄 Resetting...',
      status_error: '❌ Error',
      connection_error: '⚠️ Connection error',
      volume: '🎚️ Volume',
      bass: '🔊 Bass Boost',
      export: '💾 Export',
      import: '📂 Import',
      save_preset: '💾 Save Preset',
      compare: '🔀 A/B Compare',
      bands: ' bands',
      visualization: '📊 Visualization active',
      preset: '🎛️ Settings',
      custom: '🎛️ Settings',
      preset_applied: '✅ Preset applied: ',
      preset_applied_reference: '✅ Preset applied: Reference',
      reset_done: '✅ Reset done',
      resetting: '🔄 Resetting...',
      error: '⚠️ Error',
      import_done: '✅ Import completed',
      export_done: '✅ Export completed',
      invalid_format: '⚠️ Invalid format',
      volume_quiet: '🔇 Quiet',
      volume_normal: '🟢 Normal',
      volume_loud: '🔊 Loud',
      volume_very_loud: '🔊 Very loud',
      volume_dangerous: '⚠️ Dangerous!',
      volume_critical: '🔴 CRITICAL!',
      volume_maximum: '⚡ MAXIMUM!',
      history_empty: '📜 History is empty',
      history_records: '📜 {count} records. Last: {action}',
      stats_total: '📊 Total: {count} records',
      stats_top: ' | Top: {top}',
      window_title: '🔊 SoundForge',
      tab_title: 'SoundForge EQ — Standalone Window',
      night: '🌙 Night',
      night_on: '🌙 Night ON',
      power: '⚡ Power Save',
      power_on: '⚡ Power Save ON',
      history: '📜 History',
      stats: '📊 Stats',
      effect: '🎨 Effect',
      spectrum: '📊 Spectrum',
      waves: '🌊 Waves',
      fire: '🔥 Fire',
      neon: '💜 Neon',
      export_completed: '✅ Export completed',
      import_completed: '✅ Import completed',
      preset_saved: '💾 Preset saved: ',
      ab_saved: '🔀 A/B mode: state A saved',
      night_mode_on: '🌙 Night mode enabled',
      night_mode_off: '☀️ Night mode disabled',
      power_save_on: '⚡ Power save enabled',
      power_save_off: '⚡ Power save disabled',
      settings_reset: '✅ All settings reset'
    }
  };

  var currentLang = 'ru';

  function t(key, params) {
    params = params || {};
    var lang = LANGUAGES[currentLang] || LANGUAGES.en;
    var keys = key.split('.');
    var value = lang;
    for (var i = 0; i < keys.length; i++) {
      if (value && value[keys[i]] !== undefined) {
        value = value[keys[i]];
      } else {
        return key;
      }
    }
    if (typeof value === 'string') {
      for (var pkey in params) {
        if (params.hasOwnProperty(pkey)) {
          value = value.replace('{' + pkey + '}', params[pkey]);
        }
      }
    }
    return value;
  }

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
    var dict = ACTION_TRANSLATIONS[currentLang] || ACTION_TRANSLATIONS.en;
    return dict[action] || action;
  }

  function getPresetDesc(name) {
    var info = PRESET_INFO[name];
    if (!info) return t('preset');
    var lang = currentLang;
    if (lang === 'ru') return info.desc_ru || info.desc_en || t('preset');
    if (lang === 'uk') return info.desc_uk || info.desc_en || info.desc_ru || t('preset');
    return info.desc_en || info.desc_ru || t('preset');
  }

  // ============================================
  //  ЭФФЕКТЫ ВИЗУАЛИЗАЦИИ
  // ============================================

  var EFFECTS = {
    SPECTRUM: 'spectrum',
    WAVES: 'waves',
    FIRE: 'fire',
    NEON: 'neon'
  };

  var _currentEffect = 'spectrum';
  var _effectSmoothData = new Float32Array(64);
  var _particles = [];
  var _neonGlow = 0;

  function getEffectNameLocal(effectId) {
    // Effect labels must follow the standalone window's current language.
    // The shared visualization module does not own window.js's currentLang,
    // so using getSharedEffectName() here could leave the button in Russian
    // after switching the standalone window to English/Ukrainian.
    var key = String(effectId || 'spectrum');
    var translated = t(key);
    if (translated && translated !== key) return translated;
    try {
      return getSharedEffectName(key);
    } catch (e) {
      return key;
    }
  }

  function initEffectParticles() {
    _particles = [];
    for (var i = 0; i < 80; i++) {
      _particles.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function renderEffectInWindow(ctx, width, height, isDark, data) {
    var currentEffect = _currentEffect || 'spectrum';
    
    if (data && data.length > 0) {
      for (var i = 0; i < Math.min(data.length, 64); i++) {
        var target = data[i] || 0;
        _effectSmoothData[i] = _effectSmoothData[i] * 0.7 + target * 0.3;
      }
    }
    
    ctx.clearRect(0, 0, width, height);
    
    switch (currentEffect) {
      case 'waves':
        renderWavesEffect(ctx, width, height, isDark);
        break;
      case 'fire':
        renderFireEffect(ctx, width, height, isDark);
        break;
      case 'neon':
        renderNeonEffect(ctx, width, height, isDark);
        break;
      default:
        renderSpectrumEffect(ctx, width, height, isDark);
        break;
    }
  }

  function renderSpectrumEffect(ctx, width, height, isDark) {
    var data = _effectSmoothData;
    var barCount = 32;
    var barWidth = width / barCount;
    var maxHeight = height - 4;
    
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    ctx.fillRect(0, 0, width, height);
    
    for (var j = 0; j < barCount; j++) {
      var value = data[j] || 0;
      var barHeight = Math.max(2, value * maxHeight);
      var x = j * barWidth;
      var y = height - barHeight - 2;
      
      var color;
      if (value > 0.85) color = 'rgba(255, 50, 50, 0.95)';
      else if (value > 0.70) color = 'rgba(255, 150, 50, 0.90)';
      else if (value > 0.50) color = 'rgba(255, 220, 50, 0.85)';
      else if (value > 0.30) color = 'rgba(100, 220, 100, 0.85)';
      else color = 'rgba(50, 200, 50, 0.80)';
      
      var gradient = ctx.createLinearGradient(0, y, 0, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color.replace('0.95', '0.5').replace('0.90', '0.4').replace('0.85', '0.35').replace('0.80', '0.3'));
      gradient.addColorStop(1, isDark ? 'rgba(76, 175, 80, 0.05)' : 'rgba(76, 175, 80, 0.05)');
      ctx.fillStyle = gradient;
      
      var radius = 2;
      ctx.beginPath();
      ctx.moveTo(x + 1 + radius, y);
      ctx.lineTo(x + barWidth - 2 - radius, y);
      ctx.quadraticCurveTo(x + barWidth - 2, y, x + barWidth - 2, y + radius);
      ctx.lineTo(x + barWidth - 2, height - 2);
      ctx.lineTo(x + 1, height - 2);
      ctx.lineTo(x + 1, y + radius);
      ctx.quadraticCurveTo(x + 1, y, x + 1 + radius, y);
      ctx.fill();
    }
    
    var freqLabels = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
    var labelStep = barCount / freqLabels.length;
    ctx.fillStyle = isDark ? 'rgba(200,255,200,0.5)' : 'rgba(50,150,50,0.5)';
    ctx.font = '8px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    for (var f = 0; f < freqLabels.length; f++) {
      var labelX = (f * labelStep + labelStep / 2) * barWidth;
      ctx.fillText(freqLabels[f], labelX, height - 1);
    }
  }

  function renderWavesEffect(ctx, width, height, isDark) {
    var data = _effectSmoothData;
    var centerY = height / 2;
    var time = Date.now() / 1000;
    
    var gradient = ctx.createRadialGradient(width/2, centerY, 0, width/2, centerY, width/2);
    if (isDark) {
      gradient.addColorStop(0, 'rgba(10, 30, 20, 0.9)');
      gradient.addColorStop(1, 'rgba(0, 10, 5, 0.95)');
    } else {
      gradient.addColorStop(0, 'rgba(230, 250, 240, 0.9)');
      gradient.addColorStop(1, 'rgba(200, 230, 220, 0.95)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    var numWaves = 5;
    for (var w = 0; w < numWaves; w++) {
      var waveIndex = w / numWaves;
      var amplitude = 5 + (data[Math.floor(waveIndex * 32)] || 0) * 25;
      var frequency = 0.02 + waveIndex * 0.015;
      var phase = time * (0.5 + waveIndex * 0.3);
      var alpha = 0.3 + (1 - waveIndex / numWaves) * 0.5;
      var widthFactor = 1 + (data[Math.floor(waveIndex * 16)] || 0) * 2;
      
      var color;
      if (w === 0) color = 'rgba(76, 175, 80, ' + alpha + ')';
      else if (w === 1) color = 'rgba(100, 200, 100, ' + (alpha * 0.9) + ')';
      else if (w === 2) color = 'rgba(50, 150, 80, ' + (alpha * 0.8) + ')';
      else if (w === 3) color = 'rgba(30, 200, 150, ' + (alpha * 0.7) + ')';
      else color = 'rgba(150, 255, 200, ' + (alpha * 0.5) + ')';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 + (1 - waveIndex / numWaves) * 1.5;
      ctx.shadowColor = isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)';
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      for (var x = 0; x <= width; x += 1) {
        var progress = x / width;
        var yOffset = Math.sin(progress * Math.PI * 2 * frequency * widthFactor + phase) * amplitude;
        var yPos = centerY + yOffset + (w - numWaves/2) * 8;
        if (x === 0) ctx.moveTo(x, yPos);
        else ctx.lineTo(x, yPos);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function renderFireEffect(ctx, width, height, isDark) {
    var data = _effectSmoothData;
    var time = Date.now() / 1000;
    
    var intensity = (data[0] || 0) * 0.5 + (data[1] || 0) * 0.3 + (data[2] || 0) * 0.2;
    var flicker = Math.sin(time * 3) * 0.05 + Math.sin(time * 7.5) * 0.03 + 0.08;
    var fireIntensity = Math.max(0.1, intensity + flicker);
    
    var bgGradient = ctx.createRadialGradient(width/2, height, 0, width/2, height, height);
    if (isDark) {
      bgGradient.addColorStop(0, 'rgba(10, 5, 5, 0.95)');
      bgGradient.addColorStop(0.5, 'rgba(20, 8, 5, 0.9)');
      bgGradient.addColorStop(1, 'rgba(5, 2, 2, 0.95)');
    } else {
      bgGradient.addColorStop(0, 'rgba(250, 240, 235, 0.9)');
      bgGradient.addColorStop(0.5, 'rgba(240, 225, 220, 0.85)');
      bgGradient.addColorStop(1, 'rgba(230, 215, 210, 0.9)');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    var numFlames = 12 + Math.floor(fireIntensity * 20);
    var flameHeight = 20 + fireIntensity * 40;
    
    for (var f = 0; f < numFlames; f++) {
      var xPos = (f / numFlames) * width + Math.sin(time * 2 + f * 0.7) * 8;
      var heightVar = flameHeight * (0.6 + Math.sin(time * 1.5 + f * 1.1) * 0.4);
      var widthVar = 6 + fireIntensity * 12 + Math.sin(time * 3 + f * 0.9) * 3;
      var alpha = 0.2 + (1 - f / numFlames) * 0.6;
      var offset = Math.sin(time * 2.5 + f * 0.5) * 4;
      
      var flameGrad = ctx.createRadialGradient(
        xPos + offset, height - heightVar * 0.3, 0,
        xPos + offset, height - heightVar * 0.3, widthVar * 1.5
      );
      
      var flameAlpha = Math.min(1, alpha * fireIntensity * 1.5);
      
      if (f % 3 === 0) {
        flameGrad.addColorStop(0, 'rgba(255, 200, 50, ' + (flameAlpha * 0.9) + ')');
        flameGrad.addColorStop(0.3, 'rgba(255, 150, 30, ' + (flameAlpha * 0.7) + ')');
        flameGrad.addColorStop(0.6, 'rgba(255, 80, 20, ' + (flameAlpha * 0.5) + ')');
        flameGrad.addColorStop(1, 'rgba(150, 30, 10, ' + (flameAlpha * 0.2) + ')');
      } else if (f % 3 === 1) {
        flameGrad.addColorStop(0, 'rgba(255, 220, 100, ' + (flameAlpha * 0.8) + ')');
        flameGrad.addColorStop(0.3, 'rgba(255, 180, 60, ' + (flameAlpha * 0.6) + ')');
        flameGrad.addColorStop(0.6, 'rgba(255, 100, 30, ' + (flameAlpha * 0.4) + ')');
        flameGrad.addColorStop(1, 'rgba(180, 50, 20, ' + (flameAlpha * 0.15) + ')');
      } else {
        flameGrad.addColorStop(0, 'rgba(255, 180, 80, ' + (flameAlpha * 0.7) + ')');
        flameGrad.addColorStop(0.3, 'rgba(255, 130, 50, ' + (flameAlpha * 0.5) + ')');
        flameGrad.addColorStop(0.6, 'rgba(200, 60, 30, ' + (flameAlpha * 0.35) + ')');
        flameGrad.addColorStop(1, 'rgba(100, 20, 10, ' + (flameAlpha * 0.1) + ')');
      }
      
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      var bottomY = height - 2;
      var topY = bottomY - heightVar;
      
      ctx.moveTo(xPos + offset - widthVar/2, bottomY);
      ctx.quadraticCurveTo(
        xPos + offset - widthVar/2 - Math.sin(time * 4 + f) * 3,
        bottomY - heightVar * 0.4,
        xPos + offset - Math.sin(time * 2 + f * 0.7) * 5,
        topY + Math.sin(time * 5 + f * 0.3) * 2
      );
      ctx.quadraticCurveTo(
        xPos + offset + widthVar/2 + Math.sin(time * 4 + f + 1) * 3,
        bottomY - heightVar * 0.4,
        xPos + offset + widthVar/2,
        bottomY
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  function renderNeonEffect(ctx, width, height, isDark) {
    var data = _effectSmoothData;
    var time = Date.now() / 1000;
    _neonGlow = 0.5 + Math.sin(time * 0.5) * 0.3;
    
    var bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
    if (isDark) {
      bgGradient.addColorStop(0, 'rgba(20, 10, 30, 0.95)');
      bgGradient.addColorStop(0.5, 'rgba(10, 5, 20, 0.9)');
      bgGradient.addColorStop(1, 'rgba(5, 2, 10, 0.95)');
    } else {
      bgGradient.addColorStop(0, 'rgba(240, 235, 250, 0.9)');
      bgGradient.addColorStop(0.5, 'rgba(230, 220, 245, 0.85)');
      bgGradient.addColorStop(1, 'rgba(220, 210, 240, 0.9)');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    var barCount = 32;
    var barWidth = width / barCount;
    var maxHeight = height - 4;
    
    for (var j = 0; j < barCount; j++) {
      var value = data[j] || 0;
      var barHeight = Math.max(2, value * maxHeight);
      var x = j * barWidth;
      var y = height - barHeight - 2;
      
      var glowSize = 6 + value * 15;
      var glowGrad = ctx.createRadialGradient(
        x + barWidth/2, y + barHeight/2, 0,
        x + barWidth/2, y + barHeight/2, glowSize
      );
      
      var hue = 220 + value * 60 + Math.sin(time * 0.3 + j * 0.05) * 10;
      var neonAlpha = 0.1 + value * 0.4;
      glowGrad.addColorStop(0, 'hsla(' + hue + ', 100%, 70%, ' + neonAlpha + ')');
      glowGrad.addColorStop(0.5, 'hsla(' + (hue + 20) + ', 100%, 60%, ' + (neonAlpha * 0.4) + ')');
      glowGrad.addColorStop(1, 'hsla(' + (hue + 40) + ', 100%, 50%, 0)');
      
      ctx.fillStyle = glowGrad;
      ctx.fillRect(x - glowSize/2, y - glowSize/2, barWidth + glowSize, barHeight + glowSize);
    }
    
    for (var j2 = 0; j2 < barCount; j2++) {
      var value2 = data[j2] || 0;
      var barHeight2 = Math.max(2, value2 * maxHeight);
      var x2 = j2 * barWidth;
      var y2 = height - barHeight2 - 2;
      
      var hue2 = 220 + value2 * 60 + Math.sin(time * 0.3 + j2 * 0.05) * 10;
      
      var gradient = ctx.createLinearGradient(0, y2, 0, height);
      gradient.addColorStop(0, 'hsla(' + hue2 + ', 100%, 80%, ' + (0.6 + value2 * 0.4) + ')');
      gradient.addColorStop(0.3, 'hsla(' + (hue2 + 10) + ', 100%, 70%, ' + (0.4 + value2 * 0.3) + ')');
      gradient.addColorStop(0.7, 'hsla(' + (hue2 + 20) + ', 100%, 60%, ' + (0.2 + value2 * 0.2) + ')');
      gradient.addColorStop(1, 'hsla(' + (hue2 + 30) + ', 100%, 50%, ' + (0.05 + value2 * 0.1) + ')');
      ctx.fillStyle = gradient;
      
      var radius = 2;
      ctx.beginPath();
      ctx.moveTo(x2 + 1 + radius, y2);
      ctx.lineTo(x2 + barWidth - 2 - radius, y2);
      ctx.quadraticCurveTo(x2 + barWidth - 2, y2, x2 + barWidth - 2, y2 + radius);
      ctx.lineTo(x2 + barWidth - 2, height - 2);
      ctx.lineTo(x2 + 1, height - 2);
      ctx.lineTo(x2 + 1, y2 + radius);
      ctx.quadraticCurveTo(x2 + 1, y2, x2 + 1 + radius, y2);
      ctx.fill();
      
      ctx.shadowColor = 'hsla(' + hue2 + ', 100%, 70%, ' + (0.2 + value2 * 0.5) + ')';
      ctx.shadowBlur = 4 + value2 * 8;
      ctx.strokeStyle = 'hsla(' + hue2 + ', 100%, 80%, ' + (0.1 + value2 * 0.3) + ')';
      ctx.lineWidth = 1;
      ctx.strokeRect(x2 + 1, y2, barWidth - 2, barHeight2);
      ctx.shadowBlur = 0;
    }
  }

  function cycleEffectInWindow() {
    var effects = ['spectrum', 'waves', 'fire', 'neon'];
    var current = getSharedEffect() || _currentEffect || 'spectrum';
    var currentIndex = effects.indexOf(current);
    var nextEffect = effects[(currentIndex + 1) % effects.length];

    setSharedEffect(nextEffect);
    _currentEffect = nextEffect;

    updateEffectButtonLabelInWindow();
    try { updateSpectrumWindow(); } catch (e) { console.warn('⚠️ Effect redraw failed:', e); }

    safeSendMessage({
      action: 'effectChanged',
      effect: nextEffect,
      source: 'window'
    });

    var name = getEffectNameLocal(nextEffect);
    setStatus('ready', '🎨 ' + name);
    console.log('🎨 Эффект изменен в окне: ' + name);
  }

  function updateEffectButtonLabelInWindow() {
    var btn = document.getElementById('effectBtn');
    if (!btn) return;
    _currentEffect = getSharedEffect() || _currentEffect || 'spectrum';
    var name = getEffectNameLocal(_currentEffect);
    btn.textContent = '🎨 ' + name;
    btn.dataset.effect = _currentEffect;
    btn.setAttribute('aria-label', 'Visualization effect: ' + name);
  }

  function loadWindowEffect() {
    try {
      loadSharedEffect();
      _currentEffect = getSharedEffect() || 'spectrum';
    } catch (e) {
      _currentEffect = 'spectrum';
      setSharedEffect(_currentEffect);
    }
  }


  // ============================================
  //  STATE
  // ============================================

  var windowState = {
    isConnected: false,
    currentStatus: 'ready',
    currentPreset: 'flat',
    currentTheme: 'dark',
    currentLang: 'ru',
    spectrumData: new Float32Array(64),
    isLoading: false,
    isConnecting: false,
    isClipping: false,
    clipCount: 0,
    lastClipTime: 0,
    userPresets: {},
    hasAudio: false,
    rmsValue: 0,
    peakValue: 0,
    abPresetA: null,
    abPresetB: null,
    abMode: false,
    abActive: null,
    targetTabId: null
  };
  var _lastWindowSettingsSnapshot = null;

  var dom = {};

  // ============================================
  //  DOM INIT
  // ============================================

  function initDom() {
    dom.connectBtn = document.getElementById('connectBtn');
    dom.resetBtn = document.getElementById('resetBtn');
    dom.statusText = document.getElementById('statusText');
    dom.statusDot = document.getElementById('statusDot');
    dom.siteInfo = document.getElementById('siteInfo');
    dom.volumeSlider = document.getElementById('volumeSlider');
    dom.volumeDisplay = document.getElementById('volumeDisplay');
    dom.bassSlider = document.getElementById('bassSlider');
    dom.bassDisplay = document.getElementById('bassDisplay');
    dom.eqSliders = document.querySelectorAll('#eqContainer input[type="range"]');
    dom.presetInfoDisplay = document.getElementById('presetInfo');
    dom.presetSelect = document.getElementById('presetSelect');
    dom.langToggle = document.getElementById('langToggle');
    dom.themeSelector = document.getElementById('themeSelector');
    dom.spectrumCanvas = document.getElementById('spectrumCanvas');
    dom.eqGraphCanvas = document.getElementById('eqGraphCanvas');
    dom.vuFill = document.getElementById('vuFill');
    dom.vuPeak = document.getElementById('vuPeak');
    dom.vuValue = document.getElementById('vuValue');
    dom.volumeLabel = document.querySelector('.volume-label');
    dom.bassLabel = document.querySelector('.bass-label');
    dom.visStatus = document.getElementById('visStatus');
    dom.exportBtn = document.getElementById('exportBtn');
    dom.importBtn = document.getElementById('importBtn');
    dom.savePresetBtn = document.getElementById('savePresetBtn');
    dom.abCompareBtn = document.getElementById('abCompareBtn');
    dom.loadingOverlay = document.getElementById('loadingOverlay');
    dom.loadingText = document.getElementById('loadingText');
    dom.closeBtn = document.getElementById('closeWindow');
    dom.volumeStatus = document.getElementById('volumeStatus');
    dom.windowTitle = document.getElementById('windowTitle');
    dom.pageTitle = document.getElementById('pageTitle');
    dom.effectBtn = document.getElementById('effectBtn');
    dom.historyBtn = document.getElementById('historyBtn');
    dom.statsBtn = document.getElementById('statsBtn');
    dom.nightModeBtn = document.getElementById('nightModeBtn');
    dom.powerSaveBtn = document.getElementById('powerSaveBtn');
    dom.openWindowBtn = document.getElementById('openWindowBtn');

    if (dom.spectrumCanvas) {
      dom.spectrumCtx = dom.spectrumCanvas.getContext('2d');
      dom.spectrumCanvas.width = 500;
      dom.spectrumCanvas.height = 80;
    }
    if (dom.eqGraphCanvas) {
      dom.eqGraphCtx = dom.eqGraphCanvas.getContext('2d');
      dom.eqGraphCanvas.width = 500;
      dom.eqGraphCanvas.height = 90;
    }
  }

  // ============================================
  //  UI FUNCTIONS (С ЗАЩИТОЙ CONNECTION STATE)
  // ============================================

  function setStatus(status, text) {
    // Защита: информационные сообщения (ready) не должны менять состояние подключения
    var isCurrentConnection = isConnectionState(windowState.currentStatus);
    
    // Если пришло информационное сообщение (ready) и текущий статус - состояние подключения
    // - НЕ МЕНЯЕМ состояние, только текст
    if (status === 'ready' && isCurrentConnection) {
      var txt = dom.statusText;
      if (txt) {
        txt.textContent = text || '✅ ' + windowState.currentStatus;
      }
      return;
    }
    
    // Для реальных состояний - обновляем
    if (isConnectionState(status)) {
      windowState.currentStatus = status;
    } else {
      windowState.currentStatus = status;
    }
    
    var dot = dom.statusDot;
    var txt = dom.statusText;

    if (dot) {
      dot.className = 'status-dot';
      if (windowState.currentStatus === 'connected') dot.classList.add('active');
      else if (windowState.currentStatus === 'connecting') dot.classList.add('connecting');
      else if (windowState.currentStatus === 'disconnected') dot.classList.add('inactive');
      else if (windowState.currentStatus === 'reset') dot.classList.add('reset');
    }
    if (txt) {
      txt.className = 'status-text';
      txt.textContent = text || t('status_ready');
    }
    updateConnectButton(windowState.currentStatus);
  }

  function updateConnectButton(status) {
    var btn = dom.connectBtn;
    if (!btn) return;
    
    // НЕ МЕНЯЕМ КНОПКУ ДЛЯ ИНФОРМАЦИОННЫХ СООБЩЕНИЙ
    if (!isConnectionState(status)) {
      return;
    }
    
    if (status === 'connected') {
      btn.textContent = t('disconnect');
      btn.className = 'btn btn-connect disconnect';
    } else if (status === 'connecting') {
      btn.textContent = t('connecting');
      btn.className = 'btn btn-connect';
      btn.style.opacity = '0.7';
    } else {
      btn.textContent = t('connect');
      btn.className = 'btn btn-connect';
      btn.style.opacity = '1';
    }
  }

  function showLoading(show) {
    windowState.isLoading = show;
    var overlay = dom.loadingOverlay;
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  function updatePresetInfo(name) {
    var el = dom.presetInfoDisplay;
    if (!el) return;
    if (!name || name === 'custom') {
      el.textContent = '🎛️ ' + t('custom');
      return;
    }
    var info = PRESET_INFO[name];
    el.textContent = info ? info.icon + ' ' + getPresetDesc(name) : '🎛️ ' + name;
  }

  function updateVolumeStatus(volume) {
    var statusEl = dom.volumeStatus;
    if (!statusEl) return;
    
    var warningText = getVolumeStatusText(volume);
    var color = getVolumeColor(volume);
    
    statusEl.textContent = warningText;
    statusEl.style.color = color;
    statusEl.style.fontWeight = '700';
    statusEl.style.transition = 'all 0.3s ease';
  }

  function getVolumeStatusText(volume) {
    if (volume === 0 || volume <= 80) return t('volume_quiet');
    if (volume <= 130) return t('volume_normal');
    if (volume <= 200) return t('volume_loud');
    if (volume <= 300) return t('volume_very_loud');
    if (volume <= 450) return t('volume_dangerous');
    if (volume <= 600) return t('volume_critical');
    return t('volume_maximum');
  }

  function getVolumeColor(volume) {
    if (volume === 0 || volume <= 80) return '#666';
    if (volume <= 130) return '#4CAF50';
    if (volume <= 200) return '#8BC34A';
    if (volume <= 300) return '#FFC107';
    if (volume <= 450) return '#FF9800';
    if (volume <= 600) return '#f44336';
    return '#ff1744';
  }

  function updateSiteInfo() {
    var info = dom.siteInfo;
    if (!info) return;
    
    if (api) {
      try {
        api.tabs.query({}, function(allTabs) {
          if (api.runtime && api.runtime.lastError) {
            info.textContent = '🌐 ' + t('loading');
            return;
          }
          if (!allTabs) {
            info.textContent = '🌐 ' + t('loading');
            return;
          }
          
          for (var i = 0; i < allTabs.length; i++) {
            var tab = allTabs[i];
            if (tab.audible === true && tab.url && !tab.url.startsWith('moz-extension://') && !tab.url.startsWith('about:')) {
              try {
                var url = new URL(tab.url);
                var hostname = url.hostname.replace('www.', '');
                info.textContent = '🌐 ' + hostname;
                return;
              } catch(e) {}
            }
          }
          
          for (var j = 0; j < allTabs.length; j++) {
            var tab2 = allTabs[j];
            if (tab2.active && tab2.url && !tab2.url.startsWith('moz-extension://') && !tab2.url.startsWith('about:')) {
              try {
                var url2 = new URL(tab2.url);
                var hostname2 = url2.hostname.replace('www.', '');
                info.textContent = '🌐 ' + hostname2;
                return;
              } catch(e) {}
            }
          }
          
          for (var k = 0; k < allTabs.length; k++) {
            var tab3 = allTabs[k];
            if (tab3.url && !tab3.url.startsWith('moz-extension://') && !tab3.url.startsWith('about:')) {
              try {
                var url3 = new URL(tab3.url);
                var hostname3 = url3.hostname.replace('www.', '');
                info.textContent = '🌐 ' + hostname3;
                return;
              } catch(e) {}
            }
          }
          
          info.textContent = '🌐 ' + t('loading');
        });
      } catch(e) {
        info.textContent = '🌐 ' + t('loading');
      }
    } else {
      info.textContent = '🌐 ' + t('loading');
    }
  }

  // ============================================
  //  VISUALIZATION
  // ============================================

  var _vuSmooth = 0.15;
  var _vuPeakSmooth = 0.15;
  var _vuPeakHold = 0;
  var _vuHistory = [];

  function smoothVU(value) {
    _vuHistory.push(value);
    if (_vuHistory.length > 10) _vuHistory.shift();
    
    var sorted = _vuHistory.slice().sort(function(a, b) { return a - b; });
    var median = sorted[Math.floor(sorted.length / 2)];
    
    _vuSmooth = _vuSmooth * 0.75 + median * 0.25;
    
    if (value > _vuPeakSmooth) {
      _vuPeakSmooth = value;
      _vuPeakHold = 10;
    }
    
    if (_vuPeakHold > 0) {
      _vuPeakHold -= 0.05;
    } else {
      _vuPeakSmooth *= 0.98;
      if (_vuPeakSmooth < 0.001) _vuPeakSmooth = 0;
    }
    
    return {
      smooth: _vuSmooth,
      peak: _vuPeakSmooth,
      hold: _vuPeakHold
    };
  }

  function updateSpectrumWindow() {
    var canvas = dom.spectrumCanvas;
    if (!canvas) return;
    var ctx = dom.spectrumCtx;
    if (!ctx) return;
    
    var width = canvas.width;
    var height = canvas.height;
    var isDark = windowState.currentTheme === 'dark' || 
                 (windowState.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    var hasData = false;
    var isDummy = false;
    
    if (windowState.spectrumData && windowState.spectrumData.length > 0) {
      if (windowState.spectrumData.isDummy) {
        isDummy = true;
      } else {
        for (var i = 0; i < Math.min(windowState.spectrumData.length, 16); i++) {
          if (windowState.spectrumData[i] > 0.01) { 
            hasData = true; 
            break; 
          }
        }
      }
    }

    var processedData;
    if (hasData && !isDummy) {
      processedData = windowState.spectrumData;
    } else {
      processedData = new Float32Array(64);
      windowState.hasAudio = false;
      windowState.rmsValue = 0;
      windowState.peakValue = 0;
      windowState.isClipping = false;
    }
    
    sharedAppState.currentTheme = windowState.currentTheme;
    renderSharedEffect(processedData);
    
    var maxVal = 0;
    for (var m = 0; m < Math.min(processedData.length, 32); m++) {
      if (processedData[m] > maxVal) maxVal = processedData[m];
    }
    updateVUMeterWindow(maxVal);
  }

  function updateVUMeterWindow(value) {
    var vuData = smoothVU(value);
    var percent = Math.min(100, Math.max(0, vuData.smooth * 100));
    
    var fill = dom.vuFill;
    var peak = dom.vuPeak;
    var val = dom.vuValue;

    if (fill) {
      fill.style.width = percent + '%';
      fill.style.transition = 'width 0.08s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    if (percent > 90) {
      if (fill) fill.style.background = 'linear-gradient(90deg, #ff6b6b, #e94560)';
    } else if (percent > 70) {
      if (fill) fill.style.background = 'linear-gradient(90deg, #ffd93d, #ff6b6b)';
    } else if (percent > 40) {
      if (fill) fill.style.background = 'linear-gradient(90deg, #8BC34A, #ffd93d)';
    } else {
      if (fill) fill.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
    }

    if (vuData.hold > 0) {
      var peakPercent = Math.min(100, Math.max(0, vuData.peak * 100));
      if (peak) {
        peak.style.left = peakPercent + '%';
        peak.style.opacity = 1;
        peak.style.transition = 'none';
        peak.style.background = '#4CAF50';
      }
    } else {
      if (peak) {
        peak.style.opacity = 0.2;
        peak.style.transition = 'opacity 0.5s';
        peak.style.background = '#8BC34A';
      }
    }

    var smoothDbValue = vuData.smooth;
    var dB = smoothDbValue > 0.001 ? Math.round(20 * Math.log10(smoothDbValue) * 10) / 10 : -Infinity;
    
    if (val) {
      if (dB <= -60 || !isFinite(dB)) {
        val.textContent = '-∞ dB';
      } else {
        val.textContent = dB.toFixed(1) + ' dB';
      }
      
      if (dB > -6) {
        val.style.color = '#ff6b6b';
      } else if (dB > -12) {
        val.style.color = '#ffd93d';
      } else if (dB > -24) {
        val.style.color = '#8BC34A';
      } else {
        val.style.color = '#4CAF50';
      }
    }
  }

  function updateEQGraphWindow() {
    var canvas = dom.eqGraphCanvas;
    if (!canvas) return;
    var ctx = dom.eqGraphCtx;
    if (!ctx) return;
    
    var width = canvas.width;
    var height = canvas.height;
    var gains = getSliderGains();
    var freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    var isDark = windowState.currentTheme === 'dark' || 
                 (windowState.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
    ctx.fillRect(0, 0, width, height);

    var margin = { top: 10, bottom: 20, left: 44, right: 44 };
    var graphHeight = height - margin.top - margin.bottom;
    var graphWidth = width - margin.left - margin.right;
    
    var gridColor = isDark ? 'rgba(76, 175, 80, 0.10)' : 'rgba(76, 175, 80, 0.10)';
    var gridColorStrong = isDark ? 'rgba(76, 175, 80, 0.20)' : 'rgba(76, 175, 80, 0.20)';

    for (var h = -2; h <= 2; h++) {
      var yPos = margin.top + graphHeight / 2 - (h / 2) * (graphHeight / 2);
      ctx.strokeStyle = (h === 0) ? gridColorStrong : gridColor;
      ctx.lineWidth = (h === 0) ? 1 : 0.5;
      ctx.setLineDash((h === 0) ? [] : [3, 5]);
      ctx.beginPath();
      ctx.moveTo(margin.left, yPos);
      ctx.lineTo(width - margin.right, yPos);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    var barCount = 10;
    var barWidth = graphWidth / (barCount - 1);
    for (var v = 1; v < barCount - 1; v++) {
      var xPos = margin.left + v * barWidth;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(xPos, margin.top);
      ctx.lineTo(xPos, margin.top + graphHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '7px Segoe UI, Arial, sans-serif';
    var valueLabels = ['+12', '0', '-12'];
    var valuePositions = [0, 0.5, 1];
    for (var vl = 0; vl < valueLabels.length; vl++) {
      var valY = margin.top + valuePositions[vl] * graphHeight;
      ctx.fillStyle = isDark ? 'rgba(200,255,200,0.25)' : 'rgba(50,150,50,0.25)';
      ctx.fillText(valueLabels[vl], width - margin.right + 6, valY);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '7px Segoe UI, Arial, sans-serif';
    var leftLabels = ['12', '0', '12'];
    for (var ll = 0; ll < leftLabels.length; ll++) {
      var llY = margin.top + valuePositions[ll] * graphHeight;
      ctx.fillStyle = isDark ? 'rgba(200,255,200,0.25)' : 'rgba(50,150,50,0.25)';
      ctx.fillText(leftLabels[ll], margin.left - 20, llY);
    }

    var points = [];
    for (var i = 0; i < freqs.length; i++) {
      var gain = gains[freqs[i]] || 0;
      points.push({
        x: margin.left + i * barWidth,
        y: margin.top + graphHeight / 2 - (gain / 12) * (graphHeight / 2),
        gain: gain
      });
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, margin.top + graphHeight);
    for (var pi = 0; pi < points.length; pi++) {
      ctx.lineTo(points[pi].x, points[pi].y);
    }
    ctx.lineTo(points[points.length - 1].x, margin.top + graphHeight);
    ctx.closePath();

    var gradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + graphHeight);
    if (isDark) {
      gradient.addColorStop(0, 'rgba(76, 175, 80, 0.20)');
      gradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.05)');
      gradient.addColorStop(1, 'rgba(76, 175, 80, 0.02)');
    } else {
      gradient.addColorStop(0, 'rgba(76, 175, 80, 0.12)');
      gradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.03)');
      gradient.addColorStop(1, 'rgba(76, 175, 80, 0.01)');
    }
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    for (var pi2 = 0; pi2 < points.length; pi2++) {
      if (pi2 === 0) ctx.moveTo(points[pi2].x, points[pi2].y);
      else {
        var prev = points[pi2 - 1];
        var curr = points[pi2];
        ctx.bezierCurveTo(
          prev.x + (curr.x - prev.x) * 0.5, prev.y,
          curr.x - (curr.x - prev.x) * 0.5, curr.y,
          curr.x, curr.y
        );
      }
    }
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(76, 175, 80, 0.3)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (var pt = 0; pt < points.length; pt++) {
      var p = points[pt];
      var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
      if (p.gain > 0.1) {
        glow.addColorStop(0, 'rgba(76, 175, 80, 0.5)');
        glow.addColorStop(1, 'rgba(76, 175, 80, 0)');
      } else if (p.gain < -0.1) {
        glow.addColorStop(0, 'rgba(255, 107, 107, 0.4)');
        glow.addColorStop(1, 'rgba(255, 107, 107, 0)');
      } else {
        glow.addColorStop(0, 'rgba(136, 153, 187, 0.3)');
        glow.addColorStop(1, 'rgba(136, 153, 187, 0)');
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.gain > 0.1 ? '#4CAF50' : (p.gain < -0.1 ? '#ff6b6b' : '#8899bb');
      ctx.fill();
      
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    var freqLabelsGraph = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '7px Segoe UI, Arial, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(200,255,200,0.3)' : 'rgba(50,150,50,0.3)';
    for (var fl = 0; fl < freqLabelsGraph.length; fl++) {
      var labelX2 = margin.left + fl * barWidth;
      var offsetX = 0;
      if (fl === 0) offsetX = 8;
      if (fl === freqLabelsGraph.length - 1) offsetX = -8;
      ctx.fillText(freqLabelsGraph[fl], labelX2 + offsetX, height - 18);
    }
  }

  function visualizationLoopWindow() {
    updateSpectrumWindow();
    updateEQGraphWindow();
    windowState.animationFrameId = requestAnimationFrame(visualizationLoopWindow);
  }

  // ============================================
  //  AUDIO FUNCTIONS
  // ============================================

  function getSliderGains() {
    var gains = {};
    if (dom.eqSliders) {
      var sliders = Array.from(dom.eqSliders);
      for (var i = 0; i < sliders.length; i++) {
        gains[sliders[i].dataset.freq] = parseFloat(sliders[i].value);
      }
    }
    return gains;
  }

  function syncPresetUIInWindow(name) {
    var preset = PRESETS[name];
    if (!preset) return false;

    windowState.currentPreset = name;
    updatePresetInfo(name);
    if (dom.presetSelect) dom.presetSelect.value = name;

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
          valueSpan.className = 'gain-value ' + (value > 0.1 ? 'positive' : value < -0.1 ? 'negative' : 'zero');
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

    updateEQGraphWindow();
    return true;
  }

  function applyPreset(name) {
    resetABCompareInWindow();
    var preset = PRESETS[name];
    if (!preset) return;

    console.log('🎵 Applying preset in window: ' + name);
    if (!syncPresetUIInWindow(name)) return;

    var gainsData = getSliderGains();
    safeSendMessage({
      action: 'applyPreset',
      preset: name,
      presetData: {
        gains: gainsData,
        volume: Number.isFinite(Number(preset.volume)) ? Number(preset.volume) : 100,
        bass: Number.isFinite(Number(preset.bass)) ? Number(preset.bass) : 0
      },
      source: 'window',
      targetTabId: windowState.targetTabId || null
    });

    saveAllSettings();
    setStatus('ready', t('preset_applied') + getPresetDesc(name));
  }

  function saveAllSettings() {
    var gains = getSliderGains();
    var volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
    var bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;
    var settings = {
      eqSettings: gains,
      volumeBoost: volume / 100,
      bassBoost: bass,
      selectedPreset: windowState.currentPreset === 'custom' ? null : windowState.currentPreset,
      theme: windowState.currentTheme,
      language: currentLang,
      savedVolume: volume,
      savedBass: bass
    };
    var previous = _lastWindowSettingsSnapshot || {};
    var patch = {};
    Object.keys(settings).forEach(function(key) {
      if (JSON.stringify(previous[key]) !== JSON.stringify(settings[key])) {
        patch[key] = settings[key];
      }
    });
    _lastWindowSettingsSnapshot = JSON.parse(JSON.stringify(settings));
    if (Object.keys(patch).length > 0) safeStorageSet(patch);
  }

  function handleReset() {
    resetABCompareInWindow();
    console.log('🔄 Reset all settings from window');
    
    applyPreset('flat');
    
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
    
    windowState.currentPreset = 'flat';
    updatePresetInfo('flat');
    if (dom.presetSelect) dom.presetSelect.value = 'flat';
    
    var gainsData = getSliderGains();
    safeSendMessage({ 
      action: 'updateEQ', 
      gains: gainsData, 
      instant: true,
      source: 'window_reset'
    });
    safeSendMessage({ 
      action: 'setVolume', 
      value: 1.0, 
      instant: true 
    });
    safeSendMessage({ 
      action: 'setBass', 
      value: 0, 
      instant: true 
    });
    
    saveAllSettings();
    updateEQGraphWindow();
    setStatus('reset', t('resetting'));
    setTimeout(function() { 
      setStatus('ready', t('settings_reset')); 
    }, 500);
    console.log('✅ All settings reset');
  }

  function nextPreset() {
    var allPresets = PRESET_ORDER.slice();
    var currentPreset = windowState.currentPreset || 'flat';
    var currentIndex = allPresets.indexOf(currentPreset);
    if (currentIndex === -1) currentIndex = 0;
    var nextIndex = (currentIndex + 1) % allPresets.length;
    var nextPresetName = allPresets[nextIndex];
    
    console.log('🔄 Next preset: ' + currentPreset + ' → ' + nextPresetName);
    applyPreset(nextPresetName);
    setStatus('ready', t('preset_applied') + getPresetDesc(nextPresetName));
  }

  // ============================================
  //  CONNECT/DISCONNECT (FIREFOX 153 OPTIMIZED)
  // ============================================

  function handleConnectDisconnect() {
    if (windowState.isLoading || windowState.isConnecting) return;
    if (!api) {
      setStatus('disconnected', t('connection_error'));
      return;
    }

    if (windowState.currentStatus === 'connected' || windowState.isConnected) {
      showLoading(true);
      windowState.isConnecting = true;

      safeSendMessage({
        action: 'disconnect',
        targetTabId: windowState.targetTabId
      }, function(response) {
        showLoading(false);
        windowState.isConnecting = false;
        windowState.isConnected = false;
        windowState.currentStatus = 'disconnected';

        if (response && response.tabId != null) {
          windowState.targetTabId = response.tabId;
        }

        setStatus('disconnected', t('status_disconnected'));
        safeStorageSet({ soundforgeConnected: false });
        console.log('🔴 Окно отключено', windowState.targetTabId);
      });
      return;
    }

    showLoading(true);
    setStatus('connecting', t('status_connecting'));
    windowState.isConnecting = true;
    windowState.currentStatus = 'connecting';

    safeSendMessage({
      action: 'connect',
      targetTabId: windowState.targetTabId
    }, function(response) {
      if (response && response.tabId != null) {
        windowState.targetTabId = response.tabId;
        console.log('🎯 Окно привязано к вкладке:', response.tabId);
      }

      if (response && response.status === 'connected') {
        showLoading(false);
        windowState.isConnecting = false;
        windowState.isConnected = true;
        windowState.currentStatus = 'connected';
        setStatus('connected', t('status_connected'));
        applySavedSettings(false);
        safeStorageSet({ soundforgeConnected: true });
        console.log('✅ Окно подключено: background подтвердил уже активное соединение');
        return;
      }

      if (response && ['no_tab', 'system_page', 'extension_page', 'error'].indexOf(response.status) !== -1) {
        showLoading(false);
        windowState.isConnecting = false;
        windowState.isConnected = false;
        windowState.currentStatus = 'disconnected';
        setStatus('disconnected', t('connection_error'));
        console.warn('❌ Окно: подключение отклонено:', response.status);
        return;
      }

      console.log('⏳ Окно: connect отправлен, ждём statusUpdate');

      setTimeout(function() {
        if (!windowState.isConnecting) return;

        safeSendMessage({
          action: 'getStatus',
          targetTabId: windowState.targetTabId
        }, function(resp) {
          if (resp && resp.tabId != null) {
            windowState.targetTabId = resp.tabId;
          }

          if (resp && resp.status === 'connected') {
            windowState.isConnected = true;
            windowState.currentStatus = 'connected';
            windowState.isConnecting = false;
            showLoading(false);
            setStatus('connected', t('status_connected'));
            applySavedSettings(false);
            safeStorageSet({ soundforgeConnected: true });
            console.log('✅ Окно подключено (fallback getStatus)');
          } else if (resp && resp.status === 'connecting') {
            console.log('⏳ Окно: background всё ещё подключается');
          } else {
            windowState.isConnected = false;
            windowState.currentStatus = 'disconnected';
            windowState.isConnecting = false;
            showLoading(false);
            setStatus('disconnected', t('status_disconnected'));
            console.log('❌ Окно НЕ подключено после fallback проверки');
          }
        });
      }, 3500);
    });
  }

  function applySavedSettings(applyPresetToo) {
    applyPresetToo = applyPresetToo !== undefined ? applyPresetToo : true;
    if (!api) {
      console.warn('⚠️ API не доступен, пропускаем загрузку настроек');
      return;
    }
    
    safeStorageGet(['theme', 'language', 'selectedPreset', 'eqSettings', 'volumeBoost', 'bassBoost', 'savedVolume', 'savedBass'], function(result) {
      if (!result || Object.keys(result).length === 0) {
        return;
      }
      
      if (result.theme) {
        setTheme(result.theme);
        updateThemeButtons(result.theme);
        windowState.currentTheme = result.theme;
      }
      if (result.language) {
        currentLang = result.language;
        windowState.currentLang = result.language;
        updateLanguage();
      }
      
      if (result.savedVolume !== undefined && dom.volumeSlider && dom.volumeDisplay) {
        var vol = Math.min(800, Math.max(0, result.savedVolume));
        dom.volumeSlider.value = vol;
        dom.volumeDisplay.textContent = vol + '%';
        updateVolumeStatus(vol);
        safeSendMessage({ action: 'setVolume', value: vol / 100 });
      } else if (result.volumeBoost !== undefined && dom.volumeSlider && dom.volumeDisplay) {
        var vol2 = Math.round(result.volumeBoost * 100);
        dom.volumeSlider.value = Math.min(800, Math.max(0, vol2));
        dom.volumeDisplay.textContent = Math.min(800, Math.max(0, vol2)) + '%';
        updateVolumeStatus(vol2);
        safeSendMessage({ action: 'setVolume', value: result.volumeBoost });
      }

      if (result.savedBass !== undefined && dom.bassSlider && dom.bassDisplay) {
        var bass = Math.min(12, Math.max(-12, result.savedBass));
        dom.bassSlider.value = bass;
        dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';
        safeSendMessage({ action: 'setBass', value: bass });
      } else if (result.bassBoost !== undefined && dom.bassSlider && dom.bassDisplay) {
        dom.bassSlider.value = result.bassBoost;
        dom.bassDisplay.textContent = result.bassBoost.toFixed(1) + ' dB';
        safeSendMessage({ action: 'setBass', value: result.bassBoost });
      }

      if (result.eqSettings) {
        var sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
        sliders.forEach(function(slider) {
          var freq = slider.dataset.freq;
          if (result.eqSettings[freq] !== undefined) {
            slider.value = result.eqSettings[freq];
            var valueSpan = slider.parentElement.querySelector('.gain-value');
            if (valueSpan) {
              valueSpan.textContent = result.eqSettings[freq].toFixed(1);
              valueSpan.className = 'gain-value ' + (result.eqSettings[freq] > 0.1 ? 'positive' : result.eqSettings[freq] < -0.1 ? 'negative' : 'zero');
            }
          }
        });
        var gains = getSliderGains();
        safeSendMessage({ action: 'updateEQ', gains: gains });
      }

      if (applyPresetToo && result.selectedPreset && PRESETS[result.selectedPreset]) {
        if (dom.presetSelect) dom.presetSelect.value = result.selectedPreset;
        windowState.currentPreset = result.selectedPreset;
        applyPreset(result.selectedPreset);
      }

      _lastWindowSettingsSnapshot = JSON.parse(JSON.stringify({
        eqSettings: result.eqSettings || getSliderGains(),
        volumeBoost: result.volumeBoost,
        bassBoost: result.bassBoost,
        selectedPreset: result.selectedPreset || (windowState.currentPreset === 'custom' ? null : windowState.currentPreset),
        theme: result.theme || windowState.currentTheme,
        language: result.language || currentLang,
        savedVolume: result.savedVolume,
        savedBass: result.savedBass
      }));
      updateSiteInfo();
    });
  }

  // ============================================
  //  THEMES
  // ============================================

  function initThemeSelector() {
    var themeSelector = dom.themeSelector;
    if (!themeSelector) return;
    var themeOptions = themeSelector.querySelectorAll('.theme-option');

    safeStorageGet(['theme'], function(result) {
      var savedTheme = result.theme || 'system';
      setTheme(savedTheme);
      updateThemeButtons(savedTheme);
      windowState.currentTheme = savedTheme;
    });

    for (var ti = 0; ti < themeOptions.length; ti++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var theme = this.dataset.theme;
          setTheme(theme);
          updateThemeButtons(theme);
          windowState.currentTheme = theme;
          safeStorageSet({ theme: theme });
          updateEQGraphWindow();
        });
      })(themeOptions[ti]);
    }

    if (window.matchMedia) {
      var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', function() {
        if (windowState.currentTheme === 'system') setTheme('system');
      });
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    windowState.currentTheme = theme;
    document.documentElement.style.colorScheme = theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
  }

  function updateThemeButtons(activeTheme) {
    var themeSelector = dom.themeSelector;
    if (!themeSelector) return;
    var options = themeSelector.querySelectorAll('.theme-option');
    for (var i = 0; i < options.length; i++) {
      options[i].classList.toggle('active', options[i].dataset.theme === activeTheme);
    }
  }

  // ============================================
  //  LANGUAGE
  // ============================================

  function initLanguage() {
    safeStorageGet(['language'], function(result) {
      var savedLang = result.language || 'ru';
      currentLang = savedLang;
      updateLanguage();
      if (dom.langToggle) {
        dom.langToggle.textContent = LANGUAGES[savedLang]?.flag || '🌐';
      }
      if (dom.loadingText) dom.loadingText.textContent = t('loading');
    });
  }

  function toggleLanguage() {
    var languages = ['ru', 'uk', 'en'];
    var currentIndex = languages.indexOf(currentLang);
    var newLang = languages[(currentIndex + 1) % languages.length];
    currentLang = newLang;
    safeStorageSet({ language: newLang });
    updateLanguage();
    loadUserPresets().then(function() { populatePresetSelect(); });
    if (dom.loadingText) dom.loadingText.textContent = t('loading');
  }

  function updateLanguage() {
    var lang = currentLang;
    
    if (dom.langToggle) {
      dom.langToggle.textContent = LANGUAGES[lang]?.flag || '🌐';
    }
    
    if (dom.loadingText) {
      dom.loadingText.textContent = t('loading');
    }
    
    if (dom.pageTitle) {
      dom.pageTitle.textContent = t('tab_title');
    }
    
    if (dom.windowTitle) {
      dom.windowTitle.textContent = t('window_title');
    }
    
    if (dom.connectBtn) {
      if (windowState.currentStatus === 'connected') {
        dom.connectBtn.textContent = t('disconnect');
        dom.connectBtn.className = 'btn btn-connect disconnect';
      } else if (windowState.currentStatus === 'connecting') {
        dom.connectBtn.textContent = t('connecting');
        dom.connectBtn.className = 'btn btn-connect';
        dom.connectBtn.style.opacity = '0.7';
      } else {
        dom.connectBtn.textContent = t('connect');
        dom.connectBtn.className = 'btn btn-connect';
        dom.connectBtn.style.opacity = '1';
      }
    }
    
    if (dom.resetBtn) dom.resetBtn.textContent = t('reset');
    if (dom.exportBtn) dom.exportBtn.textContent = t('export');
    if (dom.importBtn) dom.importBtn.textContent = t('import');
    if (dom.savePresetBtn) dom.savePresetBtn.textContent = t('save_preset');
    if (dom.abCompareBtn) dom.abCompareBtn.textContent = t('compare');
    if (dom.volumeLabel) dom.volumeLabel.textContent = t('volume');
    if (dom.bassLabel) dom.bassLabel.textContent = t('bass');
    if (dom.visStatus) dom.visStatus.textContent = t('visualization');
    
    updateEffectButtonLabelInWindow();
    
    var nightBtn = dom.nightModeBtn;
    if (nightBtn) {
      var isNightOn = nightBtn.dataset.active === 'true';
      nightBtn.textContent = isNightOn ? t('night_on') : t('night');
    }
    
    var powerBtn = dom.powerSaveBtn;
    if (powerBtn) {
      var isPowerOn = powerBtn.dataset.active === 'true';
      powerBtn.textContent = isPowerOn ? t('power_on') : t('power');
    }
    
    var historyBtn = dom.historyBtn;
    if (historyBtn) {
      historyBtn.textContent = t('history');
    }
    
    var statsBtn = dom.statsBtn;
    if (statsBtn) {
      statsBtn.textContent = t('stats');
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
      if (statusMap[windowState.currentStatus]) {
        statusTxt.textContent = t(statusMap[windowState.currentStatus]);
      }
    }
    
    updatePresetInfo(windowState.currentPreset);
    updateSiteInfo();
    
    if (dom.volumeSlider) {
      var currentVolume = parseInt(dom.volumeSlider.value) || 100;
      updateVolumeStatus(currentVolume);
    }
  }

  // ============================================
  //  PRESETS
  // ============================================

  function loadUserPresets() {
    return new Promise(function(resolve) {
      try {
        if (api && api.runtime && api.runtime.sendMessage) {
          safeSendMessage({ action: 'getUserPresets' }, function(response) {
            if (response && response.status === 'ok' && response.presets) {
              windowState.userPresets = response.presets;
            }
            resolve(windowState.userPresets);
          });
        } else {
          resolve(windowState.userPresets);
        }
      } catch (e) { resolve(windowState.userPresets); }
    });
  }

  function populatePresetSelect() {
    var select = dom.presetSelect;
    if (!select) return;
    select.innerHTML = '';

    var categories = {};
    var presetNames = PRESET_ORDER.slice();

    presetNames.forEach(function(name) {
      var category = PRESET_CATEGORIES[name] || '🎧 Special';
      if (!categories[category]) categories[category] = [];
      categories[category].push(name);
    });

    var emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '🎛️ ' + t('custom');
    select.appendChild(emptyOption);

    var categoryKeys = Object.keys(categories);
    categoryKeys.sort();

    categoryKeys.forEach(function(category) {
      var optgroup = document.createElement('optgroup');
      optgroup.label = category;

      categories[category].forEach(function(name) {
        var option = document.createElement('option');
        option.value = name;
        var info = PRESET_INFO[name];
        option.textContent = (info ? info.icon + ' ' : '') + getPresetDesc(name);
        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });

    try {
      var userPresets = windowState.userPresets || {};
      var userKeys = Object.keys(userPresets);
      if (userKeys.length > 0) {
        var userOptgroup = document.createElement('optgroup');
        userOptgroup.label = '👤 ' + t('save_preset');
        userKeys.forEach(function(name) {
          var option = document.createElement('option');
          option.value = 'user_' + name;
          option.textContent = '💾 ' + name;
          userOptgroup.appendChild(option);
        });
        select.appendChild(userOptgroup);
      }
    } catch(e) {}

    if (windowState.currentPreset && PRESETS[windowState.currentPreset]) {
      select.value = windowState.currentPreset;
    }
  }

  // ============================================
  //  MESSAGE HANDLER (FIREFOX 153 OPTIMIZED)
  // ============================================

  function setupMessageListener() {
    if (!api) return;
    try {
      api.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (sender && sender.url && sender.url.includes('window.html')) {
          sendResponse({ status: 'ignored' });
          return true;
        }
        
        if (request.action === 'userPresetsUpdated' && request.presets) {
          windowState.userPresets = request.presets;
          populatePresetSelect();
          sendResponse({ status: 'ok' });
          return true;
        }

        if (request.action === 'spectrumData' && request.spectrum) {
          var data = request.spectrum;
          var len = Math.min(data.length, windowState.spectrumData.length);
          for (var i = 0; i < len; i++) {
            windowState.spectrumData[i] = data[i] || 0;
          }
          windowState.hasAudio = request.hasAudio === true;
          windowState.rmsValue = Math.max(0, Math.min(1, Number(request.rms) || 0));
          windowState.peakValue = Math.max(0, Math.min(1, Number(request.peak) || 0));
          windowState.isClipping = request.clipping === true;
          updateSpectrumWindow();
          sendResponse({ status: 'ok' });
          return true;
        }
        
        if (request.action === 'statusUpdate') {
          console.log('📨 Окно получило statusUpdate:', request.status, 'tabId:', request.tabId);

          var matchesTargetTab = (
            request.tabId == null ||
            windowState.targetTabId == null ||
            Number(request.tabId) === Number(windowState.targetTabId)
          );

          if (matchesTargetTab) {
            if (request.tabId != null) {
              windowState.targetTabId = request.tabId;
            }

            if (request.status === 'connected') {
              windowState.isConnected = true;
              windowState.currentStatus = 'connected';
              windowState.isConnecting = false;
              showLoading(false);
              setStatus('connected', t('status_connected'));
              applySavedSettings(false);
              safeStorageSet({ soundforgeConnected: true });
              console.log('✅ Окно подключено (через statusUpdate)');
            } else if (request.status === 'disconnected') {
              windowState.isConnected = false;
              windowState.currentStatus = 'disconnected';
              windowState.isConnecting = false;
              showLoading(false);
              setStatus('disconnected', t('status_disconnected'));
              safeStorageSet({ soundforgeConnected: false });
              console.log('🔴 Окно отключено (через statusUpdate)');
            } else if (request.status === 'connecting') {
              windowState.currentStatus = 'connecting';
              windowState.isConnecting = true;
              setStatus('connecting', t('status_connecting'));
              console.log('⏳ Окно: подключение вкладки', windowState.targetTabId);
            } else if (request.status === 'error') {
              windowState.isConnected = false;
              windowState.currentStatus = 'disconnected';
              windowState.isConnecting = false;
              showLoading(false);
              setStatus('disconnected', t('connection_error'));
              console.warn('❌ Окно: ошибка подключения');
            }
          } else {
            console.log('⏳ Окно: игнорируем statusUpdate для другой вкладки:', request.tabId);
          }

          sendResponse({ status: 'ok' });
          return true;
        }

        if (request.action === 'presetChanged'  && request.preset) {
          console.log('🔄 Preset synchronized from background: ' + request.preset);
          if (request.tabId != null) {
            windowState.targetTabId = request.tabId;
          }
          if (syncPresetUIInWindow(request.preset)) {
            setStatus('ready', t('preset_applied') + getPresetDesc(request.preset));
          }
          sendResponse({ status: 'ok' });
          return true;
        }
        
        if (request.action === 'settingsReset') {
          console.log('🔄 Settings reset via hotkey');
          handleReset();
          sendResponse({ status: 'ok' });
          return true;
        }

        if (request.action === 'effectChanged' && request.effect) {
          setSharedEffect(request.effect);
          _currentEffect = getSharedEffect();
          updateEffectButtonLabelInWindow();
          if (dom.effectBtn) {
            dom.effectBtn.dataset.effect = _currentEffect;
            dom.effectBtn.setAttribute('aria-label', 'Visualization effect: ' + getEffectNameLocal(_currentEffect));
          }
          try { updateSpectrumWindow(); } catch (e) {}
          sendResponse({ status: 'ok' });
          return true;
        }
        
        return false;
      });
    } catch(e) {
      console.warn('⚠️ Ошибка настройки слушателя:', e);
    }
  }

  // ============================================
  //  HOTKEYS
  // ============================================

  function setupWindowHotkeys() {
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'е' || e.key === 'Е')) {
        e.preventDefault();
        console.log('⌨️ Ctrl+Shift+E - Toggle equalizer');
        handleConnectDisconnect();
      }
      
      if (e.ctrlKey && e.shiftKey && (e.key === 'Y' || e.key === 'у' || e.key === 'У')) {
        e.preventDefault();
        console.log('⌨️ Ctrl+Shift+Y - Next preset');
        nextPreset();
      }
      
      if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'х' || e.key === 'Х')) {
        e.preventDefault();
        console.log('⌨️ Ctrl+Shift+X - Reset settings');
        handleReset();
      }
      
      if (e.key === 'Escape') {
        window.close();
      }
    });
  }

  // ============================================
  //  A/B COMPARE
  // ============================================

  function resetABCompareInWindow() {
    windowState.abPresetA = null;
    windowState.abPresetB = null;
    windowState.abMode = false;
    windowState.abActive = null;
    if (dom.abCompareBtn) {
      dom.abCompareBtn.textContent = t('compare');
      dom.abCompareBtn.style.background = '';
      dom.abCompareBtn.style.color = '';
    }
  }

  function updateABCompareButtonInWindow() {
    if (!dom.abCompareBtn) return;
    if (!windowState.abPresetA) {
      dom.abCompareBtn.textContent = '🔀 A/B';
      dom.abCompareBtn.style.background = '';
      dom.abCompareBtn.style.color = '';
    } else if (!windowState.abPresetB) {
      dom.abCompareBtn.textContent = '🔀 Save B';
      dom.abCompareBtn.style.background = '#607D8B';
      dom.abCompareBtn.style.color = '#fff';
    } else {
      dom.abCompareBtn.textContent = '🔀 ' + (windowState.abActive || 'A');
      dom.abCompareBtn.style.background = windowState.abActive === 'B' ? '#2196F3' : '#4CAF50';
      dom.abCompareBtn.style.color = '#fff';
    }
  }

  function captureABSnapshotInWindow() {
    return {
      gains: getSliderGains(),
      volume: dom.volumeSlider ? parseFloat(dom.volumeSlider.value) / 100 : 1.0,
      bass: dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0
    };
  }

  function applyABSnapshotInWindow(snapshot, side) {
    if (!snapshot) return;

    var sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
    sliders.forEach(function(slider) {
      var value = Number(snapshot.gains && snapshot.gains[slider.dataset.freq] !== undefined ? snapshot.gains[slider.dataset.freq] : 0);
      slider.value = Number.isFinite(value) ? value : 0;
      var valueSpan = slider.parentElement.querySelector('.gain-value');
      if (valueSpan) {
        valueSpan.textContent = Number(slider.value).toFixed(1);
        valueSpan.className = 'gain-value ' + (Number(slider.value) > 0.1 ? 'positive' : Number(slider.value) < -0.1 ? 'negative' : 'zero');
      }
    });

    var volumePercent = Math.max(0, Math.min(800, (Number.isFinite(Number(snapshot.volume)) ? Number(snapshot.volume) : 1) * 100));
    var bass = Math.max(-12, Math.min(12, (Number.isFinite(Number(snapshot.bass)) ? Number(snapshot.bass) : 0)));
    if (dom.volumeSlider) dom.volumeSlider.value = volumePercent;
    if (dom.volumeDisplay) dom.volumeDisplay.textContent = volumePercent + '%';
    if (dom.bassSlider) dom.bassSlider.value = bass;
    if (dom.bassDisplay) dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';

    windowState.currentPreset = 'custom';
    updatePresetInfo('custom');

    var gains = getSliderGains();
    safeSendMessage({ action: 'updateEQ', gains: gains, instant: true, source: 'window-ab-' + side });
    safeSendMessage({ action: 'setVolume', value: volumePercent / 100, instant: true, source: 'window-ab-' + side });
    safeSendMessage({ action: 'setBass', value: bass, instant: true, source: 'window-ab-' + side });

    updateEQGraphWindow();
    setStatus('ready', '🔀 A/B: ' + side);
  }

  function toggleABCompareInWindow() {
    if (!windowState.abPresetA) {
      windowState.abPresetA = captureABSnapshotInWindow();
      windowState.abPresetB = null;
      windowState.abMode = false;
      windowState.abActive = null;
      updateABCompareButtonInWindow();
      setStatus('ready', '🔀 A/B: состояние A сохранено. Настройте B и нажмите ещё раз.');
      return;
    }

    if (!windowState.abPresetB) {
      windowState.abPresetB = captureABSnapshotInWindow();
      windowState.abMode = true;
      windowState.abActive = 'A';
      updateABCompareButtonInWindow();
      applyABSnapshotInWindow(windowState.abPresetA, 'A');
      setStatus('ready', '🔀 A/B готов: нажимайте кнопку для переключения A ↔ B.');
      return;
    }

    windowState.abActive = windowState.abActive === 'A' ? 'B' : 'A';
    windowState.abMode = true;
    updateABCompareButtonInWindow();
    applyABSnapshotInWindow(windowState.abActive === 'A' ? windowState.abPresetA : windowState.abPresetB, windowState.abActive);
  }

  // ============================================
  //  NEW FEATURE BUTTONS
  // ============================================

  function setupNewFeatureButtons() {
    var historyBtn = dom.historyBtn;
    if (historyBtn) {
      historyBtn.addEventListener('click', function() {
        safeSendMessage({ action: 'getHistory' }, function(response) {
          if (!response || !response.history) {
            setStatus('ready', t('history_empty'));
            return;
          }
          
          var history = response.history || [];
          var count = history.length;
          
          if (count === 0) {
            setStatus('ready', t('history_empty'));
          } else {
            var lastAction = history[history.length - 1];
            var actionName = lastAction.action || 'unknown';
            var translatedAction = getActionTranslation(actionName);
            var message = t('history_records', { count: count, action: translatedAction });
            setStatus('ready', message);
            console.log('📜 История:', history.slice(-10));
          }
        });
      });
    }

    var statsBtn = dom.statsBtn;
    if (statsBtn) {
      statsBtn.addEventListener('click', function() {
        safeStorageGet(['settingsHistory'], function(result) {
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

    var nightBtn = dom.nightModeBtn;
    if (nightBtn) {
      nightBtn.addEventListener('click', function() {
        safeSendMessage({ action: 'toggleNightMode' }, function(response) {
          if (response && response.enabled !== undefined) {
            nightBtn.dataset.active = response.enabled ? 'true' : 'false';
            nightBtn.textContent = response.enabled ? t('night_on') : t('night');
            nightBtn.style.borderColor = response.enabled ? '#4CAF50' : 'rgba(255, 255, 255, 0.06)';
            nightBtn.style.color = response.enabled ? '#4CAF50' : '#8899bb';
            
            var message = response.enabled ? t('night_mode_on') : t('night_mode_off');
            setStatus('ready', message);
          }
        });
      });
    }

    var powerBtn = dom.powerSaveBtn;
    if (powerBtn) {
      powerBtn.addEventListener('click', function() {
        safeSendMessage({ action: 'togglePowerSave' }, function(response) {
          if (response && response.enabled !== undefined) {
            powerBtn.dataset.active = response.enabled ? 'true' : 'false';
            powerBtn.textContent = response.enabled ? t('power_on') : t('power');
            powerBtn.style.borderColor = response.enabled ? '#FF9800' : 'rgba(255, 255, 255, 0.06)';
            powerBtn.style.color = response.enabled ? '#FF9800' : '#8899bb';
            
            var message = response.enabled ? t('power_save_on') : t('power_save_off');
            setStatus('ready', message);
          }
        });
      });
    }

    var exportBtn = dom.exportBtn;
    if (exportBtn) {
      exportBtn.addEventListener('click', handleExport);
    }

    var importBtn = dom.importBtn;
    if (importBtn) {
      importBtn.addEventListener('click', handleImport);
    }

    var savePresetBtn = dom.savePresetBtn;
    if (savePresetBtn) {
      savePresetBtn.addEventListener('click', function() {
        var name = prompt(t('save_preset') + ':', 'My Preset');
        if (!name) return;

        try {
          var presets = Object.assign({}, windowState.userPresets || {});
          var gains = getSliderGains();
          var volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
          var bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;
          
          presets[name] = { gains: gains, volume: volume, bass: bass, timestamp: Date.now() };
          windowState.userPresets = presets;
          safeSendMessage({ action: 'saveUserPreset', name: name, preset: presets[name] });
          
          setStatus('ready', t('preset_saved') + name);
          populatePresetSelect();
        } catch(e) {
          console.error('Error saving preset:', e);
          setStatus('disconnected', t('error'));
        }
      });
    }

    var abBtn = dom.abCompareBtn;
    if (abBtn) {
      abBtn.onclick = function() {
        toggleABCompareInWindow();
      };
    }

    var openWindowBtn = dom.openWindowBtn;
    if (openWindowBtn) {
      openWindowBtn.addEventListener('click', function() {
        safeSendMessage({ action: 'open_window' });
      });
    }

    if (dom.effectBtn) {
      dom.effectBtn.onclick = function(e) {
        if (e) e.preventDefault();
        cycleEffectInWindow();
      };
      dom.effectBtn.onkeydown = function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cycleEffectInWindow();
        }
      };
      dom.effectBtn.dataset.effect = _currentEffect;
      dom.effectBtn.setAttribute('aria-label', 'Visualization effect: ' + getEffectNameLocal(_currentEffect));
    }

    if (dom.abCompareBtn) {
      dom.abCompareBtn.onclick = function() {
        toggleABCompareInWindow();
      };
    }
  }

  // ============================================
  //  EXPORT / IMPORT
  // ============================================

  function handleExport() {
    setStatus('ready', t('export_done'));
    safeSendMessage({ action: 'exportSettings' }, function(response) {
      if (response && response.status === 'ok' && response.data) {
        try {
          var blob = new Blob([response.data], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'soundforge_settings_backup_' + new Date().toISOString().slice(0,10) + '.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setStatus('ready', t('export_completed'));
        } catch(e) {
          setStatus('disconnected', t('error'));
        }
      } else {
        setStatus('disconnected', t('error'));
      }
    });
  }

  function handleImport() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = ev.target.result;
          safeSendMessage({ action: 'importSettings', data: data }, function(response) {
            if (response && response.status === 'ok') {
              setStatus('ready', t('import_completed'));
              applySavedSettings(true);
              populatePresetSelect();
              updateEQGraphWindow();
            } else {
              setStatus('disconnected', t('invalid_format'));
            }
          });
        } catch(e) {
          setStatus('disconnected', t('invalid_format'));
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }

  // ============================================
  //  INIT
  // ============================================

  function init() {
    console.log('📄 DOM loaded');
    initDom();
    
    windowState.isConnected = false;
    windowState.currentStatus = 'disconnected';
    setStatus('disconnected', t('status_disconnected'));
    console.log('🔴 Окно: начальный статус ОТКЛЮЧЕН');
    
    initSharedEffects();
    loadWindowEffect();
    sharedAppState.currentTheme = windowState.currentTheme;
    updateEffectButtonLabelInWindow();
    
    applySavedSettings(true);
    loadUserPresets().then(function() { populatePresetSelect(); });
    
    if (dom.connectBtn) dom.connectBtn.addEventListener('click', handleConnectDisconnect);
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', handleReset);
    if (dom.closeBtn) dom.closeBtn.addEventListener('click', function() { window.close(); });
    
    if (dom.presetSelect) {
      dom.presetSelect.addEventListener('change', function() {
        var value = this.value;
        if (!value) {
          windowState.currentPreset = 'custom';
          updatePresetInfo('custom');
          return;
        }
        if (value.startsWith('user_')) {
          var userPresetName = value.substring(5);
          try {
            var userPresets = windowState.userPresets || {};
            if (userPresets[userPresetName]) {
              var preset = userPresets[userPresetName];
              var tempPreset = {
                gains: preset.gains || {},
                volume: Number.isFinite(Number(preset.volume)) ? Number(preset.volume) : 100,
                bass: preset.bass || 0
              };
              windowState.currentPreset = userPresetName;
              updatePresetInfo(userPresetName);
              var sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
              var gains2 = tempPreset.gains || {};
              sliders.forEach(function(slider) {
                var freq = slider.dataset.freq;
                if (gains2[freq] !== undefined) {
                  var val2 = gains2[freq];
                  slider.value = val2;
                  var valueSpan2 = slider.parentElement.querySelector('.gain-value');
                  if (valueSpan2) {
                    valueSpan2.textContent = val2.toFixed(1);
                    valueSpan2.className = 'gain-value ' + (val2 > 0.1 ? 'positive' : val2 < -0.1 ? 'negative' : 'zero');
                  }
                }
              });
              if (dom.volumeSlider && dom.volumeDisplay) {
                var vol3 = Number.isFinite(Number(tempPreset.volume)) ? Number(tempPreset.volume) : 100;
                dom.volumeSlider.value = Math.min(800, Math.max(0, vol3));
                dom.volumeDisplay.textContent = Math.min(800, Math.max(0, vol3)) + '%';
                updateVolumeStatus(vol3);
              }
              if (dom.bassSlider && dom.bassDisplay) {
                var bass2 = tempPreset.bass || 0;
                dom.bassSlider.value = Math.max(-12, Math.min(12, bass2));
                dom.bassDisplay.textContent = bass2.toFixed(1) + ' dB';
              }
              var gainsData2 = getSliderGains();
              safeSendMessage({
                action: 'applyPreset',
                preset: userPresetName,
                presetData: {
                  gains: gainsData2,
                  volume: Number.isFinite(Number(tempPreset.volume)) ? Number(tempPreset.volume) : 100,
                  bass: Number.isFinite(Number(tempPreset.bass)) ? Number(tempPreset.bass) : 0
                },
                source: 'window-user',
                targetTabId: windowState.targetTabId || null
              });
              saveAllSettings();
              updateEQGraphWindow();
              setStatus('ready', t('preset_applied') + userPresetName);
            }
          } catch(e) {
            console.error('Error loading user preset:', e);
          }
        } else if (PRESETS[value]) {
          applyPreset(value);
        }
      });
    }
    
    if (dom.eqSliders) {
      var slidersList = Array.from(dom.eqSliders);
      slidersList.forEach(function(slider) {
        var valueSpan = slider.parentElement.querySelector('.gain-value');
        slider.addEventListener('input', function() {
          var val = parseFloat(slider.value);
          if (valueSpan) {
            valueSpan.textContent = val.toFixed(1);
            valueSpan.className = 'gain-value ' + (val > 0.1 ? 'positive' : val < -0.1 ? 'negative' : 'zero');
          }
          updateEQGraphWindow();
          var gains = getSliderGains();
          safeSendMessage({ action: 'updateEQ', gains: gains, instant: true });
          windowState.currentPreset = 'custom';
          updatePresetInfo('custom');
          if (dom.presetSelect) dom.presetSelect.value = '';
        });
        slider.addEventListener('change', function() {
          var gains = getSliderGains();
          safeSendMessage({ action: 'updateEQ', gains: gains });
          saveAllSettings();
          updateEQGraphWindow();
        });
      });
    }
    
    if (dom.volumeSlider && dom.volumeDisplay) {
      dom.volumeSlider.addEventListener('input', function() {
        var val = parseInt(this.value);
        dom.volumeDisplay.textContent = val + '%';
        updateVolumeStatus(val);
        safeSendMessage({ action: 'setVolume', value: val / 100, instant: true });
      });
      dom.volumeSlider.addEventListener('change', function() {
        safeSendMessage({ action: 'setVolume', value: parseInt(this.value) / 100 });
        saveAllSettings();
      });
    }
    
    if (dom.bassSlider && dom.bassDisplay) {
      dom.bassSlider.addEventListener('input', function() {
        var val = parseFloat(this.value);
        dom.bassDisplay.textContent = val.toFixed(1) + ' dB';
        safeSendMessage({ action: 'setBass', value: val, instant: true });
      });
      dom.bassSlider.addEventListener('change', function() {
        safeSendMessage({ action: 'setBass', value: parseFloat(this.value) });
        saveAllSettings();
      });
    }
    
    if (dom.langToggle) dom.langToggle.addEventListener('click', toggleLanguage);
    initThemeSelector();
    initLanguage();
    setupMessageListener();
    setupNewFeatureButtons();
    
    visualizationLoopWindow();
    setupWindowHotkeys();
    
    setTimeout(function() {
      safeSendMessage({ action: 'getSpectrum' });
    }, 250);
    setInterval(updateSiteInfo, 3000);
    
    console.log('✅ SoundForge Window Firefox 153 ready');
    console.log('📊 Loaded ' + PRESET_ORDER.length + ' presets');
    console.log('🎨 Effects: Spectrum | Waves | Fire | Neon');
    console.log('⌨️ Hotkeys in window:');
    console.log('   Ctrl+Shift+E - Toggle ON/OFF');
    console.log('   Ctrl+Shift+Y - Next preset');
    console.log('   Ctrl+Shift+X - Reset all settings');
    console.log('   Escape - Close window');
    console.log('📜 History and Stats buttons support 3 languages (RU, UA, EN)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();