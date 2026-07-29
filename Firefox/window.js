// ============================================
//  WINDOW.JS - v3.22.8 (FIREFOX 153.0esr)
//  Standalone Window — БЕЗ FULLSCREEN
//  FULL LOCALIZATION: RU, UA, EN
//  HOTKEYS: Ctrl+Shift+E, Ctrl+Shift+Y, Ctrl+Shift+X
// ============================================

(function() {
  'use strict';

  console.log('🪟 SoundForge Window v3.22.8 (Firefox) — БЕЗ FULLSCREEN');

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
  //  API DETECTION И БЕЗОПАСНАЯ ОТПРАВКА
  // ============================================

  var api = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : 
            (typeof browser !== 'undefined' && browser.runtime) ? browser : null;

  if (!api) {
    console.warn('⚠️ Extension API not available');
  }

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

  function safeStorageGet(keys, callback) {
    try {
      if (api && api.storage && api.storage.local) {
        api.storage.local.get(keys, function(result) {
          if (api.runtime && api.runtime.lastError) {
            if (typeof callback === 'function') callback({});
            return;
          }
          if (typeof callback === 'function') callback(result || {});
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
      if (api && api.storage && api.storage.local) {
        api.storage.local.set(data, function() {
          if (api.runtime && api.runtime.lastError) {
            // Игнорируем
          }
          if (typeof callback === 'function') callback();
        });
      } else {
        if (typeof callback === 'function') callback();
      }
    } catch (e) {
      if (typeof callback === 'function') callback();
    }
  }

  // ============================================
  //  50 PRESETS (БЕЗ ИЗМЕНЕНИЙ)
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
    headphones: { gains: { 31: 1.0, 62: 1.5, 125: 1.5, 250: 1.0, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: 1.5, 8000: 2.0, 16000: 1.5 }, volume: 100, bass: 1.5 },
    car: { gains: { 31: 3.5, 62: 4.5, 125: 3.5, 250: 1.5, 500: 0, 1000: 0.5, 2000: 1.5, 4000: 2.0, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 4.5 },
    night: { gains: { 31: -1.0, 62: -0.5, 125: 0, 250: 0.5, 500: 1.0, 1000: 0.5, 2000: 0, 4000: -0.5, 8000: -1.0, 16000: -1.5 }, volume: 100, bass: -0.5 },
    bassboost: { gains: { 31: 6.0, 62: 7.0, 125: 5.0, 250: 2.5, 500: 0, 1000: 0.5, 2000: 0.5, 4000: 0.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 7.0 },
    jazz: { gains: { 31: 1.0, 62: 1.5, 125: 2.0, 250: 1.5, 500: 1.0, 1000: 1.5, 2000: 2.0, 4000: 1.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 1.5 },
    hiphop: { gains: { 31: 4.5, 62: 5.5, 125: 4.0, 250: 2.0, 500: -0.5, 1000: 1.0, 2000: 2.0, 4000: 2.5, 8000: 3.5, 16000: 3.0 }, volume: 100, bass: 5.5 },
    soul: { gains: { 31: 2.5, 62: 3.0, 125: 2.5, 250: 2.0, 500: 1.5, 1000: 2.0, 2000: 1.5, 4000: 1.0, 8000: 0.5, 16000: 0 }, volume: 100, bass: 3.0 },
    blues: { gains: { 31: 1.5, 62: 2.0, 125: 2.0, 250: 1.5, 500: 1.0, 1000: 1.5, 2000: 2.0, 4000: 1.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 2.0 },
    reggae: { gains: { 31: 3.5, 62: 4.0, 125: 3.5, 250: 2.0, 500: 0.5, 1000: 1.0, 2000: 1.5, 4000: 2.0, 8000: 2.5, 16000: 2.0 }, volume: 100, bass: 4.0 },
    sunset: { gains: { 31: 0.5, 62: 1.0, 125: 1.0, 250: 0.5, 500: 0, 1000: 0.5, 2000: 0.5, 4000: 0.5, 8000: 0, 16000: -0.5 }, volume: 100, bass: 1.0 },
    chill: { gains: { 31: 1.0, 62: 1.5, 125: 1.5, 250: 1.0, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: 1.0, 8000: 0.5, 16000: 0 }, volume: 100, bass: 1.5 },
    lofi: { gains: { 31: 1.0, 62: 1.5, 125: 1.0, 250: 0.5, 500: 0, 1000: -0.5, 2000: -1.5, 4000: -2.5, 8000: -3.5, 16000: -4.5 }, volume: 100, bass: 1.5 },
    pop: { gains: { 31: 1.0, 62: 1.5, 125: 1.5, 250: 1.0, 500: 1.5, 1000: 2.5, 2000: 3.0, 4000: 2.5, 8000: 2.0, 16000: 1.5 }, volume: 100, bass: 1.5 },
    kpop: { gains: { 31: 2.5, 62: 3.0, 125: 2.5, 250: 1.5, 500: 1.0, 1000: 2.0, 2000: 3.0, 4000: 3.5, 8000: 4.0, 16000: 3.5 }, volume: 100, bass: 3.0 },
    world: { gains: { 31: 1.5, 62: 2.0, 125: 2.0, 250: 1.5, 500: 1.0, 1000: 2.0, 2000: 2.0, 4000: 1.5, 8000: 1.0, 16000: 0.5 }, volume: 100, bass: 2.0 },
    ambient: { gains: { 31: 0.5, 62: 1.0, 125: 1.5, 250: 1.5, 500: 1.5, 1000: 2.0, 2000: 2.5, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 1.0 },
    clarity: { gains: { 31: -1.5, 62: -0.5, 125: 0, 250: 0.5, 500: 1.0, 1000: 2.5, 2000: 4.0, 4000: 4.5, 8000: 3.5, 16000: 2.5 }, volume: 100, bass: -0.5 },
    wave: { gains: { 31: 5.5, 62: 6.5, 125: 4.5, 250: 1.5, 500: -1.5, 1000: -0.5, 2000: 0.5, 4000: 2.0, 8000: 3.5, 16000: 4.0 }, volume: 100, bass: 6.5 },
    phonk: { gains: { 31: 7.0, 62: 8.0, 125: 5.5, 250: 2.0, 500: -2.5, 1000: -1.5, 2000: 0, 4000: 2.0, 8000: 4.5, 16000: 5.0 }, volume: 100, bass: 8.0 },
    logitech: { gains: { 31: 3.0, 62: 3.5, 125: 2.5, 250: 1.5, 500: 0.5, 1000: 1.0, 2000: 2.0, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 3.5 },
    maxboost: { gains: { 31: 4.0, 62: 5.0, 125: 3.5, 250: 2.0, 500: 1.0, 1000: 1.0, 2000: 2.0, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 5.0 },
    gaming: { gains: { 31: 2.0, 62: 2.5, 125: 2.0, 250: 1.0, 500: 0.5, 1000: 1.5, 2000: 3.0, 4000: 4.0, 8000: 4.5, 16000: 3.5 }, volume: 100, bass: 2.5 },
    movie: { gains: { 31: 3.5, 62: 4.0, 125: 3.5, 250: 2.0, 500: 1.0, 1000: 1.5, 2000: 2.0, 4000: 2.5, 8000: 3.0, 16000: 2.5 }, volume: 100, bass: 4.0 },
    fps: { gains: { 31: -1.0, 62: -0.5, 125: 0, 250: 0.5, 500: 1.5, 1000: 3.0, 2000: 4.5, 4000: 5.5, 8000: 5.0, 16000: 4.0 }, volume: 100, bass: -0.5 },
    hifi: { gains: { 31: 0.5, 62: 1.0, 125: 1.0, 250: 0.5, 500: 0.5, 1000: 0.5, 2000: 1.0, 4000: 1.5, 8000: 2.0, 16000: 1.5 }, volume: 100, bass: 1.0 },
    studio: { gains: { 31: 0, 62: 0.5, 125: 0.5, 250: 0.5, 500: 0.5, 1000: 0.5, 2000: 0.5, 4000: 0.5, 8000: 0.5, 16000: 0.5 }, volume: 100, bass: 0.5 },
    premium: { gains: { 31: 1.5, 62: 2.0, 125: 1.5, 250: 1.0, 500: 0.5, 1000: 1.0, 2000: 1.5, 4000: 2.0, 8000: 2.5, 16000: 2.0 }, volume: 100, bass: 2.0 },
    master: { gains: { 31: 1.0, 62: 1.5, 125: 1.0, 250: 0.5, 500: 0.5, 1000: 1.0, 2000: 1.5, 4000: 2.0, 8000: 2.5, 16000: 2.0 }, volume: 100, bass: 1.5 }
  };

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
    headphones: { icon: '🎧', desc_ru: 'Наушники', desc_en: 'Headphones', desc_uk: 'Навушники' },
    car: { icon: '🚗', desc_ru: 'Авто', desc_en: 'Car', desc_uk: 'Авто' },
    night: { icon: '🌙', desc_ru: 'Ночной', desc_en: 'Night', desc_uk: 'Нічний' },
    bassboost: { icon: '🔊', desc_ru: 'Макс. Бас', desc_en: 'Max Bass', desc_uk: 'Макс. Бас' },
    jazz: { icon: '🎷', desc_ru: 'Джаз', desc_en: 'Jazz', desc_uk: 'Джаз' },
    hiphop: { icon: '🎤', desc_ru: 'Хип-хоп', desc_en: 'Hip-Hop', desc_uk: 'Хіп-хоп' },
    soul: { icon: '🎵', desc_ru: 'Соул', desc_en: 'Soul', desc_uk: 'Соул' },
    blues: { icon: '🎸', desc_ru: 'Блюз', desc_en: 'Blues', desc_uk: 'Блюз' },
    reggae: { icon: '🌴', desc_ru: 'Регги', desc_en: 'Reggae', desc_uk: 'Реггі' },
    sunset: { icon: '🌅', desc_ru: 'Закат', desc_en: 'Sunset', desc_uk: 'Захід' },
    chill: { icon: '☁️', desc_ru: 'Чилл', desc_en: 'Chill', desc_uk: 'Чілл' },
    lofi: { icon: '🎧', desc_ru: 'Lo-Fi', desc_en: 'Lo-Fi', desc_uk: 'Lo-Fi' },
    pop: { icon: '🎵', desc_ru: 'Поп', desc_en: 'Pop', desc_uk: 'Поп' },
    kpop: { icon: '🎵', desc_ru: 'K-Pop', desc_en: 'K-Pop', desc_uk: 'K-Pop' },
    world: { icon: '🌍', desc_ru: 'World', desc_en: 'World', desc_uk: 'World' },
    ambient: { icon: '🕊️', desc_ru: 'Эмбиент', desc_en: 'Ambient', desc_uk: 'Ембієнт' },
    clarity: { icon: '🎯', desc_ru: 'Четкость', desc_en: 'Clarity', desc_uk: 'Чіткість' },
    wave: { icon: '🌊', desc_ru: 'Wave', desc_en: 'Wave', desc_uk: 'Wave' },
    phonk: { icon: '🔥', desc_ru: 'Phonk', desc_en: 'Phonk', desc_uk: 'Phonk' },
    logitech: { icon: '🎧', desc_ru: 'Logitech G321', desc_en: 'Logitech G321', desc_uk: 'Logitech G321' },
    maxboost: { icon: '⚡', desc_ru: 'MAX BOOST', desc_en: 'MAX BOOST', desc_uk: 'MAX BOOST' },
    gaming: { icon: '🎮', desc_ru: 'Игры', desc_en: 'Gaming', desc_uk: 'Ігри' },
    movie: { icon: '🎬', desc_ru: 'Кино', desc_en: 'Movie', desc_uk: 'Кіно' },
    fps: { icon: '🎯', desc_ru: 'FPS', desc_en: 'FPS', desc_uk: 'FPS' },
    hifi: { icon: '✨', desc_ru: 'Hi-Fi', desc_en: 'Hi-Fi', desc_uk: 'Hi-Fi' },
    studio: { icon: '💎', desc_ru: 'Студия', desc_en: 'Studio', desc_uk: 'Студія' },
    premium: { icon: '🌟', desc_ru: 'Премиум', desc_en: 'Premium', desc_uk: 'Преміум' },
    master: { icon: '🎵', desc_ru: 'Мастер', desc_en: 'Master', desc_uk: 'Майстер' }
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
  //  TRANSLATIONS (БЕЗ ИЗМЕНЕНИЙ)
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
  //  ПЕРЕВОДЫ ДЛЯ ДЕЙСТВИЙ В СТАТИСТИКЕ
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
    lastClipTime: 0
  };

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
  //  UI FUNCTIONS (БЕЗ FULLSCREEN)
  // ============================================

  function setStatus(status, text) {
    windowState.currentStatus = status;
    var dot = dom.statusDot;
    var txt = dom.statusText;

    if (dot) {
      dot.className = 'status-dot';
      if (status === 'connected') dot.classList.add('active');
      else if (status === 'connecting') dot.classList.add('connecting');
      else if (status === 'disconnected') dot.classList.add('inactive');
      else if (status === 'reset') dot.classList.add('reset');
    }
    if (txt) {
      txt.className = 'status-text';
      txt.textContent = text || t('status_ready');
    }
    updateConnectButton(status);
  }

  function updateConnectButton(status) {
    var btn = dom.connectBtn;
    if (!btn) return;
    
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
            if (tab.audible === true && tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
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
            if (tab2.active && tab2.url && !tab2.url.startsWith('chrome-extension://') && !tab2.url.startsWith('chrome://') && !tab2.url.startsWith('about:')) {
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
            if (tab3.url && !tab3.url.startsWith('chrome-extension://') && !tab3.url.startsWith('chrome://') && !tab3.url.startsWith('about:')) {
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
  //  VISUALIZATION (БЕЗ FULLSCREEN)
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
      var time = Date.now() / 1000;
      var dummy = new Float32Array(64);
      for (var di = 0; di < 64; di++) {
        dummy[di] = (Math.sin(time * 1.5 + di * 0.2) * 0.2 + 0.2) * 0.5;
      }
      processedData = dummy;
    }
    
    renderSpectrum(ctx, width, height, processedData);
    
    var maxVal = 0;
    for (var m = 0; m < Math.min(processedData.length, 32); m++) {
      if (processedData[m] > maxVal) maxVal = processedData[m];
    }
    updateVUMeterWindow(maxVal);
  }

  function renderSpectrum(ctx, width, height, data) {
    ctx.clearRect(0, 0, width, height);
    var isDark = windowState.currentTheme === 'dark' || 
                 (windowState.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    ctx.fillRect(0, 0, width, height);
    
    var barCount = 32;
    var barWidth = width / barCount;
    var maxHeight = height - 4;
    
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
  //  AUDIO FUNCTIONS (БЕЗ ИЗМЕНЕНИЙ)
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

  function applyPreset(name) {
    var preset = PRESETS[name];
    if (!preset) return;
    
    console.log('🎵 Applying preset in window: ' + name);
    
    windowState.currentPreset = name;
    updatePresetInfo(name);
    if (dom.presetSelect) dom.presetSelect.value = name;

    var sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
    var gains = preset.gains || {};

    sliders.forEach(function(slider) {
      var freq = slider.dataset.freq;
      if (gains[freq] !== undefined) {
        var value = gains[freq];
        slider.value = value;
        var valueSpan = slider.parentElement.querySelector('.gain-value');
        if (valueSpan) {
          valueSpan.textContent = value.toFixed(1);
          valueSpan.className = 'gain-value ' + (value > 0.1 ? 'positive' : value < -0.1 ? 'negative' : 'zero');
        }
      }
    });

    if (dom.volumeSlider && dom.volumeDisplay) {
      var vol = preset.volume || 100;
      dom.volumeSlider.value = Math.min(800, Math.max(0, vol));
      dom.volumeDisplay.textContent = Math.min(800, Math.max(0, vol)) + '%';
      updateVolumeStatus(vol);
    }

    if (dom.bassSlider && dom.bassDisplay) {
      var bass = preset.bass || 0;
      dom.bassSlider.value = Math.max(-12, Math.min(12, bass));
      dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';
    }

    var gainsData = getSliderGains();
    
    safeSendMessage({ 
      action: 'updateEQ', 
      gains: gainsData, 
      instant: true,
      source: 'window'
    });
    safeSendMessage({ 
      action: 'setVolume', 
      value: (preset.volume || 100) / 100, 
      instant: true 
    });
    safeSendMessage({ 
      action: 'setBass', 
      value: preset.bass || 0, 
      instant: true 
    });
    
    saveAllSettings();
    updateEQGraphWindow();
    setStatus('ready', t('preset_applied') + getPresetDesc(name));
  }

  function saveAllSettings() {
    var gains = getSliderGains();
    var volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
    var bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;
    
    safeStorageSet({
      eqSettings: gains,
      volumeBoost: volume / 100,
      bassBoost: bass,
      selectedPreset: windowState.currentPreset === 'custom' ? null : windowState.currentPreset,
      theme: windowState.currentTheme,
      language: currentLang,
      savedVolume: volume,
      savedBass: bass
    });
  }

  function handleReset() {
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
    var allPresets = Object.keys(PRESETS);
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
  //  CONNECT/DISCONNECT (БЕЗ ИЗМЕНЕНИЙ)
  // ============================================

  function handleConnectDisconnect() {
    if (windowState.isLoading || windowState.isConnecting) return;
    if (!api) {
      setStatus('disconnected', t('connection_error'));
      return;
    }

    if (windowState.currentStatus === 'connected' || windowState.isConnected) {
      showLoading(true);
      setStatus('disconnected', t('status_disconnected'));
      windowState.isConnecting = true;
      safeSendMessage({ action: 'disconnect' }, function() {
        showLoading(false);
        windowState.isConnecting = false;
        windowState.isConnected = false;
        windowState.currentStatus = 'disconnected';
        setStatus('disconnected', t('status_disconnected'));
      });
    } else {
      showLoading(true);
      setStatus('connecting', t('status_connecting'));
      windowState.isConnecting = true;
      windowState.currentStatus = 'connecting';
      safeSendMessage({ action: 'connect' }, function() {
        showLoading(false);
        setTimeout(function() {
          safeSendMessage({ action: 'getStatus' }, function(resp) {
            windowState.isConnecting = false;
            if (resp && resp.status === 'connected') {
              windowState.isConnected = true;
              windowState.currentStatus = 'connected';
              setStatus('connected', t('status_connected'));
              applySavedSettings(false);
            } else {
              setTimeout(function() {
                safeSendMessage({ action: 'getStatus' }, function(resp2) {
                  if (resp2 && resp2.status === 'connected') {
                    windowState.isConnected = true;
                    windowState.currentStatus = 'connected';
                    setStatus('connected', t('status_connected'));
                    applySavedSettings(false);
                  } else {
                    windowState.isConnected = false;
                    windowState.currentStatus = 'disconnected';
                    setStatus('disconnected', t('status_disconnected'));
                  }
                });
              }, 1000);
            }
          });
        }, 1500);
      });
    }
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
      
      updateSiteInfo();
    });
  }

  // ============================================
  //  THEMES (БЕЗ ИЗМЕНЕНИЙ)
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
  //  LANGUAGE (БЕЗ ИЗМЕНЕНИЙ)
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
    populatePresetSelect();
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
  //  PRESETS (БЕЗ ИЗМЕНЕНИЙ)
  // ============================================

  function populatePresetSelect() {
    var select = dom.presetSelect;
    if (!select) return;
    select.innerHTML = '';

    var categories = {};
    var presetNames = Object.keys(PRESETS);

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
      var saved = localStorage.getItem('soundforge_user_presets');
      var userPresets = saved ? JSON.parse(saved) : {};
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
  //  MESSAGE HANDLER (БЕЗ ИЗМЕНЕНИЙ)
  // ============================================

  function setupMessageListener() {
    if (!api) return;
    try {
      api.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (sender && sender.url && sender.url.includes('window.html')) {
          sendResponse({ status: 'ignored' });
          return true;
        }
        
        if (request.action === 'spectrumData' && request.spectrum) {
          var data = request.spectrum;
          var len = Math.min(data.length, windowState.spectrumData.length);
          for (var i = 0; i < len; i++) {
            windowState.spectrumData[i] = data[i] || 0;
          }
          updateSpectrumWindow();
          sendResponse({ status: 'ok' });
          return true;
        }
        
        if (request.action === 'statusUpdate') {
          if (request.status === 'connected') {
            windowState.isConnected = true;
            windowState.currentStatus = 'connected';
            setStatus('connected', t('status_connected'));
            applySavedSettings(false);
          } else if (request.status === 'disconnected') {
            windowState.isConnected = false;
            windowState.currentStatus = 'disconnected';
            setStatus('disconnected', t('status_disconnected'));
          }
          sendResponse({ status: 'ok' });
          return true;
        }
        
        if (request.action === 'presetChanged' && request.preset) {
          console.log('🔄 Preset changed via hotkey: ' + request.preset);
          if (PRESETS[request.preset]) {
            applyPreset(request.preset);
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
        
        return false;
      });
    } catch(e) {
      console.warn('⚠️ Ошибка настройки слушателя:', e);
    }
  }

  // ============================================
  //  HOTKEYS (БЕЗ FULLSCREEN)
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
  //  NEW FEATURE BUTTONS (БЕЗ ИЗМЕНЕНИЙ)
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
          var presets = JSON.parse(localStorage.getItem('soundforge_user_presets') || '{}');
          var gains = getSliderGains();
          var volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
          var bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;
          
          presets[name] = { gains: gains, volume: volume, bass: bass, timestamp: Date.now() };
          localStorage.setItem('soundforge_user_presets', JSON.stringify(presets));
          
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
      abBtn.addEventListener('click', function() {
        setStatus('ready', t('ab_saved'));
      });
    }

    var openWindowBtn = dom.openWindowBtn;
    if (openWindowBtn) {
      openWindowBtn.addEventListener('click', function() {
        safeSendMessage({ action: 'open_window' });
      });
    }
  }

  // ============================================
  //  EXPORT / IMPORT (БЕЗ ИЗМЕНЕНИЙ)
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
    applySavedSettings(true);
    populatePresetSelect();
    
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
            var saved = localStorage.getItem('soundforge_user_presets');
            var userPresets = saved ? JSON.parse(saved) : {};
            if (userPresets[userPresetName]) {
              var preset = userPresets[userPresetName];
              var tempPreset = {
                gains: preset.gains || {},
                volume: preset.volume || 100,
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
                var vol3 = tempPreset.volume || 100;
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
              safeSendMessage({ action: 'updateEQ', gains: gainsData2, instant: true });
              safeSendMessage({ action: 'setVolume', value: (tempPreset.volume || 100) / 100, instant: true });
              safeSendMessage({ action: 'setBass', value: tempPreset.bass || 0, instant: true });
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
    
    setInterval(function() {
      safeSendMessage({ action: 'getSpectrum' });
    }, 50);
    setInterval(updateSiteInfo, 3000);
    
    console.log('✅ SoundForge Window ready (Firefox) — БЕЗ FULLSCREEN');
    console.log('📊 Loaded ' + Object.keys(PRESETS).length + ' presets');
    console.log('⌨️ Hotkeys in window:');
    console.log('   Ctrl+Shift+E - Toggle ON/OFF');
    console.log('   Ctrl+Shift+Y - Next preset');
    console.log('   Ctrl+Shift+X - Reset all settings');
    console.log('   Escape - Close window');
    console.log('📜 History and Stats buttons support 3 languages (RU, UA, EN)');
    console.log('🪟 FULLSCREEN КНОПКА УДАЛЕНА ПОЛНОСТЬЮ');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();