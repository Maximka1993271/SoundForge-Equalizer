// ============================================
//  POPUP.JS - v3.22.8 (FIREFOX 153.0esr)
//  ПОЛНАЯ ЛОКАЛИЗАЦИЯ: RU, UA, EN
//  ВСЕ КНОПКИ И СООБЩЕНИЯ ПЕРЕВЕДЕНЫ
//  РУЧНОЕ ПОДКЛЮЧЕНИЕ | ВСЕ НАСТРОЙКИ СОХРАНЯЮТСЯ
//  50 ПРОФЕССИОНАЛЬНЫХ ПРЕСЕТОВ
//  ГРОМКОСТЬ: 0% - 800%
//  ЭФФЕКТЫ ВИЗУАЛИЗАЦИИ: СПЕКТР | ВОЛНЫ | ОГОНЬ | НЕОН
//  ИСПРАВЛЕНО: КНОПКА ЭФФЕКТОВ РАБОТАЕТ В FIREFOX
//  ИСПРАВЛЕНО: СТАТИСТИКА ПОКАЗЫВАЕТ ТЕКУЩИЕ ЗНАЧЕНИЯ GAIN
// ============================================

(function() {
  'use strict';

  console.log('🎛️ SoundForge Popup v3.22.8 (Firefox 153.0esr)');

  // ============================================
  //  ПОЛИФИЛЛЫ ДЛЯ FIREFOX
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
  //  ОПРЕДЕЛЕНИЕ API (Firefox использует browser)
  // ============================================

  var api = (typeof browser !== 'undefined' && browser.runtime) ? browser : 
            (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : null;

  if (!api) {
    console.error('❌ API расширения не доступно');
  }

  // ============================================
  //  50 ПРЕСЕТОВ
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
  //  ИНФОРМАЦИЯ О ПРЕСЕТАХ
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
    'flat': '🎵 Основные', 'natural': '🎵 Основные', 'universal': '🎵 Основные', 'balanced': '🎵 Основные',
    'club': '🎶 Электронные', 'dance': '🎶 Электронные', 'edm': '🎶 Электронные', 'synthwave': '🎶 Электронные', 'deephouse': '🎶 Электронные',
    'rock': '🎸 Рок/Метал', 'metal': '🎸 Рок/Метал', 'hardrock': '🎸 Рок/Метал', 'grunge': '🎸 Рок/Метал',
    'vocal': '🎤 Вокал/Подкасты', 'podcast': '🎤 Вокал/Подкасты', 'speech': '🎤 Вокал/Подкасты', 'rap': '🎤 Вокал/Подкасты',
    'acoustic': '🎻 Акустика/Классика', 'piano': '🎻 Акустика/Классика', 'orchestra': '🎻 Акустика/Классика', 'classical': '🎻 Акустика/Классика',
    'jazz': '🎻 Акустика/Классика',
    'headphones': '🎧 Специальные', 'car': '🎧 Специальные', 'night': '🎧 Специальные', 'bassboost': '🎧 Специальные',
    'hiphop': '🎧 Специальные', 'soul': '🎧 Специальные', 'blues': '🎧 Специальные', 'reggae': '🎧 Специальные',
    'sunset': '🎧 Специальные', 'chill': '🎧 Специальные', 'lofi': '🎧 Специальные', 'pop': '🎧 Специальные',
    'kpop': '🎧 Специальные', 'world': '🎧 Специальные', 'ambient': '🎧 Специальные', 'clarity': '🎧 Специальные',
    'wave': '🌊 Wave/Phonk', 'phonk': '🌊 Wave/Phonk',
    'logitech': '⚡ MAX BOOST', 'maxboost': '⚡ MAX BOOST',
    'gaming': '🎮 Игры/Кино', 'movie': '🎮 Игры/Кино', 'fps': '🎮 Игры/Кино',
    'hifi': '🌟 Премиум', 'studio': '🌟 Премиум', 'premium': '🌟 Премиум', 'master': '🌟 Премиум'
  };

  // ============================================
  //  ПОЛНЫЕ ПЕРЕВОДЫ НА 3 ЯЗЫКА
  // ============================================

  var LANGUAGES = {
    ru: {
      name: 'Русский',
      flag: '🇷🇺',
      connect: '▶ Подключить',
      disconnect: '⏹ Отключить',
      connecting: '⏳...',
      reset: '↺ Сброс',
      export: '💾 Экспорт',
      import: '📂 Импорт',
      save_preset: '💾 Сохранить пресет',
      compare: '🔀 A/B Сравнение',
      status_ready: '✅ Готов',
      status_connected: '🔊 Подключен',
      status_disconnected: '⛔ Отключен',
      status_connecting: '⏳ Подключение...',
      status_reset: '🔄 Сброшено...',
      status_error: '⚠️ Ошибка',
      volume: '🎚️ Громкость',
      bass: '🔊 Bass Boost',
      bands: ' полос',
      visualization: '📊 Визуализация активна',
      preset: '🎛️ Настройки',
      custom: '🎛️ Настройки',
      effects: {
        spectrum: '📊 Спектр',
        waves: '🌊 Волны',
        fire: '🔥 Огонь',
        neon: '💜 Неон'
      },
      night: '🌙 Ночной',
      night_on: '🌙 Ночной ON',
      power: '⚡ Эконом',
      power_on: '⚡ Эконом ON',
      window: '🪟 Окно',
      history: '📜 История',
      stats: '📊 Статистика',
      effect: '🎨 Эффект',
      night_on_msg: '🌙 Ночной режим включен',
      night_off_msg: '☀️ Ночной режим выключен',
      power_on_msg: '⚡ Энергосбережение включено',
      power_off_msg: '⚡ Энергосбережение выключено',
      preset_applied: '✅ Пресет применен: ',
      preset_saved: '✅ Пресет сохранен: ',
      export_done: '✅ Экспорт завершен',
      import_done: '✅ Импорт завершен',
      invalid_format: '⚠️ Неверный формат',
      error: '⚠️ Ошибка',
      reset_done: '✅ Все настройки сброшены',
      compare_mode: '🔀 Режим A/B сравнения',
      history_empty: '📜 История пуста',
      volume_warnings: {
        quiet: '🔇 Слишком тихо',
        normal: '🟢 Нормально',
        loud: '🔊 Громко',
        very_loud: '🔊 Очень громко',
        dangerous: '⚠️ Опасно!',
        critical: '🔴 КРИТИЧЕСКИ!',
        maximum: '⚡ МАКСИМУМ!'
      },
      presets: {
        '🎵 Основные': '🎵 Основные',
        '🎶 Электронные': '🎶 Электронные',
        '🎸 Рок/Метал': '🎸 Рок/Метал',
        '🎤 Вокал/Подкасты': '🎤 Вокал/Подкасты',
        '🎻 Акустика/Классика': '🎻 Акустика/Классика',
        '🎧 Специальные': '🎧 Специальные',
        '🎮 Игры/Кино': '🎮 Игры/Кино',
        '🌟 Премиум': '🌟 Премиум',
        '🌊 Wave/Phonk': '🌊 Wave/Phonk',
        '⚡ MAX BOOST': '⚡ MAX BOOST',
        '👤 Сохранить пресет': '👤 Сохранить пресет'
      },
      stats_label: '📊 Статистика: ',
      stats_separator: ' | ',
      stats_freq: 'Hz',
      history_separator: ' | ',
      history_actions_join: ', ',
      actions: {
        eq_enabled: 'eq_enabled',
        eq_disabled: 'eq_disabled',
        eq_change: 'eq_change',
        volume_change: 'volume_change',
        bass_change: 'bass_change',
        preset_applied: 'preset_applied',
        night_mode_toggle: 'night_mode_toggle',
        power_save_toggle: 'power_save_toggle',
        settings_change: 'settings_change',
        settings_reset: 'settings_reset'
      }
    },
    uk: {
      name: 'Українська',
      flag: '🇺🇦',
      connect: '▶ Підключити',
      disconnect: '⏹ Відключити',
      connecting: '⏳...',
      reset: '↺ Скинути',
      export: '💾 Експорт',
      import: '📂 Імпорт',
      save_preset: '💾 Зберегти пресет',
      compare: '🔀 A/B Порівняння',
      status_ready: '✅ Готово',
      status_connected: '🔊 Підключено',
      status_disconnected: '⛔ Відключено',
      status_connecting: '⏳ Підключення...',
      status_reset: '🔄 Скинуто...',
      status_error: '⚠️ Помилка',
      volume: '🎚️ Гучність',
      bass: '🔊 Bass Boost',
      bands: ' смуг',
      visualization: '📊 Візуалізація активна',
      preset: '🎛️ Налаштування',
      custom: '🎛️ Налаштування',
      effects: {
        spectrum: '📊 Спектр',
        waves: '🌊 Хвилі',
        fire: '🔥 Вогонь',
        neon: '💜 Неон'
      },
      night: '🌙 Нічний',
      night_on: '🌙 Нічний ON',
      power: '⚡ Економ',
      power_on: '⚡ Економ ON',
      window: '🪟 Вікно',
      history: '📜 Історія',
      stats: '📊 Статистика',
      effect: '🎨 Ефект',
      night_on_msg: '🌙 Нічний режим увімкнено',
      night_off_msg: '☀️ Нічний режим вимкнено',
      power_on_msg: '⚡ Енергозбереження увімкнено',
      power_off_msg: '⚡ Енергозбереження вимкнено',
      preset_applied: '✅ Пресет застосовано: ',
      preset_saved: '✅ Пресет збережено: ',
      export_done: '✅ Експорт завершено',
      import_done: '✅ Імпорт завершено',
      invalid_format: '⚠️ Невірний формат',
      error: '⚠️ Помилка',
      reset_done: '✅ Всі налаштування скинуто',
      compare_mode: '🔀 Режим A/B порівняння',
      history_empty: '📜 Історія порожня',
      volume_warnings: {
        quiet: '🔇 Занадто тихо',
        normal: '🟢 Нормально',
        loud: '🔊 Гучно',
        very_loud: '🔊 Дуже гучно',
        dangerous: '⚠️ Небезпечно!',
        critical: '🔴 КРИТИЧНО!',
        maximum: '⚡ МАКСИМУМ!'
      },
      presets: {
        '🎵 Основные': '🎵 Основні',
        '🎶 Электронные': '🎶 Електронні',
        '🎸 Рок/Метал': '🎸 Рок/Метал',
        '🎤 Вокал/Подкасты': '🎤 Вокал/Подкасти',
        '🎻 Акустика/Классика': '🎻 Акустика/Класика',
        '🎧 Специальные': '🎧 Спеціальні',
        '🎮 Игры/Кино': '🎮 Ігри/Кіно',
        '🌟 Премиум': '🌟 Преміум',
        '🌊 Wave/Phonk': '🌊 Wave/Phonk',
        '⚡ MAX BOOST': '⚡ MAX BOOST',
        '👤 Сохранить пресет': '👤 Зберегти пресет'
      },
      stats_label: '📊 Статистика: ',
      stats_separator: ' | ',
      stats_freq: 'Гц',
      history_separator: ' | ',
      history_actions_join: ', ',
      actions: {
        eq_enabled: 'eq_enabled',
        eq_disabled: 'eq_disabled',
        eq_change: 'eq_change',
        volume_change: 'volume_change',
        bass_change: 'bass_change',
        preset_applied: 'preset_applied',
        night_mode_toggle: 'night_mode_toggle',
        power_save_toggle: 'power_save_toggle',
        settings_change: 'settings_change',
        settings_reset: 'settings_reset'
      }
    },
    en: {
      name: 'English',
      flag: '🇺🇸',
      connect: '▶ Connect',
      disconnect: '⏹ Disconnect',
      connecting: '⏳...',
      reset: '↺ Reset',
      export: '💾 Export',
      import: '📂 Import',
      save_preset: '💾 Save preset',
      compare: '🔀 A/B Compare',
      status_ready: '✅ Ready',
      status_connected: '🔊 Connected',
      status_disconnected: '⛔ Disconnected',
      status_connecting: '⏳ Connecting...',
      status_reset: '🔄 Resetting...',
      status_error: '⚠️ Error',
      volume: '🎚️ Volume',
      bass: '🔊 Bass Boost',
      bands: ' bands',
      visualization: '📊 Visualization active',
      preset: '🎛️ Settings',
      custom: '🎛️ Settings',
      effects: {
        spectrum: '📊 Spectrum',
        waves: '🌊 Waves',
        fire: '🔥 Fire',
        neon: '💜 Neon'
      },
      night: '🌙 Night',
      night_on: '🌙 Night ON',
      power: '⚡ Power Save',
      power_on: '⚡ Power Save ON',
      window: '🪟 Window',
      history: '📜 History',
      stats: '📊 Stats',
      effect: '🎨 Effect',
      night_on_msg: '🌙 Night mode enabled',
      night_off_msg: '☀️ Night mode disabled',
      power_on_msg: '⚡ Power save enabled',
      power_off_msg: '⚡ Power save disabled',
      preset_applied: '✅ Preset applied: ',
      preset_saved: '✅ Preset saved: ',
      export_done: '✅ Export completed',
      import_done: '✅ Import completed',
      invalid_format: '⚠️ Invalid format',
      error: '⚠️ Error',
      reset_done: '✅ All settings reset',
      compare_mode: '🔀 A/B Compare mode',
      history_empty: '📜 History is empty',
      volume_warnings: {
        quiet: '🔇 Too quiet',
        normal: '🟢 Normal',
        loud: '🔊 Loud',
        very_loud: '🔊 Very loud',
        dangerous: '⚠️ Dangerous!',
        critical: '🔴 CRITICAL!',
        maximum: '⚡ MAXIMUM!'
      },
      presets: {
        '🎵 Основные': '🎵 Main',
        '🎶 Электронные': '🎶 Electronic',
        '🎸 Рок/Метал': '🎸 Rock/Metal',
        '🎤 Вокал/Подкасты': '🎤 Vocal/Podcast',
        '🎻 Акустика/Классика': '🎻 Acoustic/Classic',
        '🎧 Специальные': '🎧 Special',
        '🎮 Игры/Кино': '🎮 Gaming/Movie',
        '🌟 Премиум': '🌟 Premium',
        '🌊 Wave/Phonk': '🌊 Wave/Phonk',
        '⚡ MAX BOOST': '⚡ MAX BOOST',
        '👤 Сохранить пресет': '👤 Save preset'
      },
      stats_label: '📊 Statistics: ',
      stats_separator: ' | ',
      stats_freq: 'Hz',
      history_separator: ' | ',
      history_actions_join: ', ',
      actions: {
        eq_enabled: 'eq_enabled',
        eq_disabled: 'eq_disabled',
        eq_change: 'eq_change',
        volume_change: 'volume_change',
        bass_change: 'bass_change',
        preset_applied: 'preset_applied',
        night_mode_toggle: 'night_mode_toggle',
        power_save_toggle: 'power_save_toggle',
        settings_change: 'settings_change',
        settings_reset: 'settings_reset'
      }
    }
  };

  // ============================================
  //  СОСТОЯНИЕ
  // ============================================

  var state = {
    currentStatus: 'ready',
    currentPreset: 'flat',
    currentTheme: 'dark',
    currentLang: 'ru',
    animationFrameId: null,
    spectrumData: new Float32Array(64),
    smoothSpectrum: new Float32Array(32),
    peakValue: -Infinity,
    peakHold: 0,
    hasAudio: true,
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
    _debugMode: false,
    currentEffect: 'spectrum'
  };

  var dom = {};

  // ============================================
  //  ТЕКУЩИЙ ЯЗЫК
  // ============================================

  var currentLang = 'ru';

  function getCurrentLang() { return currentLang; }

  function setCurrentLang(lang) {
    if (LANGUAGES[lang]) {
      currentLang = lang;
    }
  }

  // ============================================
  //  ФУНКЦИЯ ПЕРЕВОДА
  // ============================================

  function t(key, params) {
    params = params || {};
    var lang = LANGUAGES[currentLang] || LANGUAGES.ru;
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
  //  ФУНКЦИИ ДЛЯ СКЛОНЕНИЙ И СТАТИСТИКИ
  // ============================================

  function pluralizeRu(count, one, few, many) {
    var n = Math.abs(count);
    if (n % 10 === 1 && n % 100 !== 11) return one;
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
    return many;
  }

  function pluralizeUk(count, one, few, many) {
    var n = Math.abs(count);
    if (n % 10 === 1 && n % 100 !== 11) return one;
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
    return many;
  }

  function getHistoryLabel(count) {
    if (count === 0) {
      return t('history_empty');
    }
    var lang = getCurrentLang();
    if (lang === 'ru') {
      var word = pluralizeRu(count, 'запись', 'записи', 'записей');
      return '📜 Всего: ' + count + ' ' + word;
    }
    if (lang === 'uk') {
      var word = pluralizeUk(count, 'запис', 'записи', 'записів');
      return '📜 Всього: ' + count + ' ' + word;
    }
    return '📜 Total: ' + count + ' records';
  }

  function getStatsLabel() {
    return t('stats_label');
  }

  function getStatsSeparator() {
    return t('stats_separator');
  }

  function getFreqUnit() {
    return t('stats_freq');
  }

  function getHistorySeparator() {
    return t('history_separator');
  }

  function getHistoryActionsJoin() {
    return t('history_actions_join');
  }

  // ============================================
  //  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================

  function getVolumeStatusText(volume) {
    var warnings = t('volume_warnings');
    if (volume === 0 || volume <= 80) return warnings.quiet || '🔇 Слишком тихо';
    if (volume <= 130) return warnings.normal || '🟢 Нормально';
    if (volume <= 200) return warnings.loud || '🔊 Громко';
    if (volume <= 300) return warnings.very_loud || '🔊 Очень громко';
    if (volume <= 450) return warnings.dangerous || '⚠️ Опасно!';
    if (volume <= 600) return warnings.critical || '🔴 КРИТИЧЕСКИ!';
    return warnings.maximum || '⚡ МАКСИМУМ!';
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

  function getPresetDesc(name) {
    var info = PRESET_INFO[name];
    if (!info) return name;
    var lang = getCurrentLang();
    if (lang === 'ru') return info.desc_ru || info.desc_en || name;
    if (lang === 'uk') return info.desc_uk || info.desc_en || info.desc_ru || name;
    return info.desc_en || info.desc_ru || name;
  }

  function getPresetDisplay(name) {
    var info = PRESET_INFO[name];
    if (!info) return '🎛️ ' + t('preset');
    return info.icon + ' ' + getPresetDesc(name);
  }

  function updateGainClass(element, value) {
    var val = parseFloat(value);
    element.className = 'gain-value';
    if (val > 0.1) element.classList.add('positive');
    else if (val < -0.1) element.classList.add('negative');
    else element.classList.add('zero');
  }

  // ============================================
  //  DOM ИНИЦИАЛИЗАЦИЯ
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
    dom.expandBtn = document.getElementById('expandBtn');
    dom.volumeStatus = document.getElementById('volumeStatus');
    dom.clipIndicator = document.getElementById('clipIndicator');
    dom.effectBtn = document.getElementById('effectBtn');
    dom.openWindowBtn = document.getElementById('openWindowBtn');
    dom.historyBtn = document.getElementById('historyBtn');
    dom.statsBtn = document.getElementById('statsBtn');

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
  }

  // ============================================
  //  UI ФУНКЦИИ
  // ============================================

  function setStatus(status, text) {
    state.currentStatus = status;
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
    statusEl.textContent = getVolumeStatusText(volume);
    statusEl.style.color = getVolumeColor(volume);
  }

  function showLoading(show) {
    state.isLoading = show;
    var overlay = dom.loadingOverlay;
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  function updateSiteInfo() {
    var info = dom.siteInfo;
    if (!info) return;
    
    if (api) {
      api.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (api.runtime.lastError || !tabs || tabs.length === 0) {
          info.textContent = '🌐 ' + t('loading');
          return;
        }
        try {
          var url = new URL(tabs[0].url);
          info.textContent = '🌐 ' + url.hostname.replace('www.', '');
        } catch(e) {
          info.textContent = '🌐 ' + t('loading');
        }
      });
    } else {
      info.textContent = '🌐 ' + t('loading');
    }
  }

  // ============================================
  //  ОБНОВЛЕНИЕ ЯЗЫКА ВСЕХ ЭЛЕМЕНТОВ
  // ============================================

  function updateLanguage() {
    var lang = getCurrentLang();
    
    if (dom.langToggle) {
      dom.langToggle.textContent = LANGUAGES[lang]?.flag || '🌐';
    }
    
    if (dom.loadingText) {
      dom.loadingText.textContent = 'Загрузка...';
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
    
    if (dom.resetBtn) dom.resetBtn.textContent = t('reset');
    if (dom.exportBtn) dom.exportBtn.textContent = t('export');
    if (dom.importBtn) dom.importBtn.textContent = t('import');
    if (dom.savePresetBtn) dom.savePresetBtn.textContent = t('save_preset');
    if (dom.abCompareBtn) dom.abCompareBtn.textContent = t('compare');
    if (dom.volumeLabel) dom.volumeLabel.textContent = t('volume');
    if (dom.bassLabel) dom.bassLabel.textContent = t('bass');
    if (dom.visStatus) dom.visStatus.textContent = t('visualization');
    if (dom.openWindowBtn) dom.openWindowBtn.textContent = t('window');
    if (dom.historyBtn) dom.historyBtn.textContent = t('history');
    if (dom.statsBtn) dom.statsBtn.textContent = t('stats');
    
    // Обновляем кнопку эффектов
    updateEffectButtonLabel();
    
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
    updateSiteInfo();
    
    if (dom.volumeSlider) {
      var currentVolume = parseInt(dom.volumeSlider.value) || 100;
      updateVolumeStatus(currentVolume);
    }
    
    updateExtraButtons();
    populatePresetSelect();
  }

  // ============================================
  //  КНОПКА ЭФФЕКТОВ - ИСПРАВЛЕНО ДЛЯ FIREFOX
  // ============================================

  function getEffectNameLocal(effectId) {
    var names = {
      spectrum: t('effects.spectrum') || '📊 Спектр',
      waves: t('effects.waves') || '🌊 Волны',
      fire: t('effects.fire') || '🔥 Огонь',
      neon: t('effects.neon') || '💜 Неон'
    };
    return names[effectId] || effectId;
  }

  function updateEffectButtonLabel() {
    var btn = dom.effectBtn;
    if (!btn) return;
    var name = getEffectNameLocal(state.currentEffect);
    btn.textContent = '🎨 ' + name;
  }

  function cycleEffect() {
    var effects = ['spectrum', 'waves', 'fire', 'neon'];
    var currentIndex = effects.indexOf(state.currentEffect);
    var nextIndex = (currentIndex + 1) % effects.length;
    var nextEffect = effects[nextIndex];
    
    state.currentEffect = nextEffect;
    
    try {
      localStorage.setItem('soundforge_effect', nextEffect);
    } catch (e) {}
    
    updateEffectButtonLabel();
    updateSpectrum();
    
    if (api) {
      api.runtime.sendMessage({ 
        action: 'effectChanged', 
        effect: nextEffect 
      }).catch(function() {});
    }
    
    setStatus('ready', '🎨 ' + getEffectNameLocal(nextEffect));
    console.log('🎨 Эффект изменен в попапе: ' + getEffectNameLocal(nextEffect));
  }

  function initEffectButton() {
    var btn = dom.effectBtn;
    if (!btn) return;
    
    try {
      var saved = localStorage.getItem('soundforge_effect');
      if (saved && ['spectrum', 'waves', 'fire', 'neon'].indexOf(saved) !== -1) {
        state.currentEffect = saved;
      }
    } catch (e) {}
    
    updateEffectButtonLabel();
    
    // ВАЖНО: Для Firefox используем addEventListener вместо onclick
    btn.removeEventListener('click', cycleEffect);
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      cycleEffect();
    });
  }

  // ============================================
  //  РЕНДЕРИНГ ЭФФЕКТОВ В ПОПАПЕ
  // ============================================

  var _effectSmoothData = new Float32Array(64);

  function renderEffectInPopup(ctx, width, height, isDark, data) {
    var currentEffect = state.currentEffect || 'spectrum';
    
    if (data && data.length > 0) {
      for (var i = 0; i < Math.min(data.length, 64); i++) {
        var target = data[i] || 0;
        _effectSmoothData[i] = _effectSmoothData[i] * 0.7 + target * 0.3;
      }
    } else {
      var time = Date.now() / 1000;
      for (var i = 0; i < 64; i++) {
        var val = Math.sin(time * 1.5 + i * 0.2) * 0.2 + 0.2;
        _effectSmoothData[i] = _effectSmoothData[i] * 0.7 + val * 0.3;
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
    var neonGlow = 0.5 + Math.sin(time * 0.5) * 0.3;
    
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

  // ============================================
  //  СПЕКТР С ПОДДЕРЖКОЙ ЭФФЕКТОВ
  // ============================================

  function updateSpectrum() {
    var canvas = dom.spectrumCanvas;
    if (!canvas) return;
    var ctx = dom.spectrumCtx;
    if (!ctx) return;
    
    var width = canvas.width;
    var height = canvas.height;
    var isDark = state.currentTheme === 'dark' || 
                 (state.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    var hasData = false;
    var isDummy = false;
    
    if (state.spectrumData && state.spectrumData.length > 0) {
      if (state.spectrumData.isDummy) {
        isDummy = true;
      } else {
        for (var i = 0; i < Math.min(state.spectrumData.length, 16); i++) {
          if (state.spectrumData[i] > 0.01) { 
            hasData = true; 
            break; 
          }
        }
      }
    }

    var processedData;
    if (hasData && !isDummy) {
      processedData = state.spectrumData;
    } else {
      var time = Date.now() / 1000;
      var dummy = new Float32Array(64);
      for (var di = 0; di < 64; di++) {
        dummy[di] = (Math.sin(time * 1.5 + di * 0.2) * 0.2 + 0.2) * 0.5;
      }
      processedData = dummy;
    }
    
    renderEffectInPopup(ctx, width, height, isDark, processedData);
    
    var maxVal = 0;
    for (var m = 0; m < Math.min(processedData.length, 32); m++) {
      if (processedData[m] > maxVal) maxVal = processedData[m];
    }
    updateVUMeter(maxVal);
  }

  // ============================================
  //  VU-МЕТР
  // ============================================

  var _vuSmooth = 0.15;
  var _vuPeakSmooth = 0.15;
  var _vuPeakHold = 0;
  var _vuHistory = [];
  var _vuHistorySize = 10;

  function smoothVU(value) {
    _vuHistory.push(value);
    if (_vuHistory.length > _vuHistorySize) {
      _vuHistory.shift();
    }
    
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

  function updateVUMeter(value) {
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
        val.style.transition = 'color 0.3s';
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

  // ============================================
  //  ГРАФИК АЧХ
  // ============================================

  function updateEQGraph() {
    var canvas = dom.eqGraphCanvas;
    if (!canvas) return;
    var ctx = dom.eqGraphCtx;
    if (!ctx) return;
    
    var width = canvas.width;
    var height = canvas.height;
    var gains = getSliderGains();
    var freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    var isDark = state.currentTheme === 'dark' || 
                 (state.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
    ctx.fillRect(0, 0, width, height);

    var margin = { top: 8, bottom: 18, left: 36, right: 36 };
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
    ctx.font = '6px Segoe UI, Arial, sans-serif';
    var valueLabels = ['+12', '0', '-12'];
    var valuePositions = [0, 0.5, 1];
    for (var vl = 0; vl < valueLabels.length; vl++) {
      var valY = margin.top + valuePositions[vl] * graphHeight;
      ctx.fillStyle = isDark ? 'rgba(200,255,200,0.25)' : 'rgba(50,150,50,0.25)';
      ctx.fillText(valueLabels[vl], width - margin.right + 8, valY);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '6px Segoe UI, Arial, sans-serif';
    var leftLabels = ['12', '0', '12'];
    for (var ll = 0; ll < leftLabels.length; ll++) {
      var llY = margin.top + valuePositions[ll] * graphHeight;
      ctx.fillStyle = isDark ? 'rgba(200,255,200,0.25)' : 'rgba(50,150,50,0.25)';
      ctx.fillText(leftLabels[ll], margin.left - 22, llY);
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
    ctx.font = '6px Segoe UI, Arial, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(200,255,200,0.3)' : 'rgba(50,150,50,0.3)';
    for (var fl = 0; fl < freqLabelsGraph.length; fl++) {
      var labelX2 = margin.left + fl * barWidth;
      var offsetX = 0;
      if (fl === 0) offsetX = 6;
      if (fl === freqLabelsGraph.length - 1) offsetX = -6;
      ctx.fillText(freqLabelsGraph[fl], labelX2 + offsetX, height - 16);
    }
  }

  function visualizationLoop() {
    updateSpectrum();
    updateEQGraph();
    state.animationFrameId = requestAnimationFrame(visualizationLoop);
  }

  // ============================================
  //  АУДИО ФУНКЦИИ
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
    
    console.log('🎵 Применяем пресет: ' + name);
    
    state.currentPreset = name;
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
          updateGainClass(valueSpan, value);
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
    
    if (api) {
      api.runtime.sendMessage({ 
        action: 'updateEQ', 
        gains: gainsData, 
        instant: true,
        source: 'popup'
      }).catch(function() {});
      api.runtime.sendMessage({ 
        action: 'setVolume', 
        value: (preset.volume || 100) / 100, 
        instant: true 
      }).catch(function() {});
      api.runtime.sendMessage({ 
        action: 'setBass', 
        value: preset.bass || 0, 
        instant: true 
      }).catch(function() {});
    }
    
    saveAllSettings();
    updateEQGraph();
    setStatus('ready', t('preset_applied') + (PRESET_INFO[name]?.desc_ru || name));
  }

  function applySavedSettings(applyPresetToo) {
    applyPresetToo = applyPresetToo !== undefined ? applyPresetToo : true;
    if (!api) return;
    
    api.storage.local.get(['eqSettings', 'volumeBoost', 'bassBoost', 'selectedPreset', 'savedVolume', 'savedBass'], function(result) {
      if (api.runtime.lastError) return;
      
      if (result.savedVolume !== undefined && dom.volumeSlider && dom.volumeDisplay) {
        var vol = Math.min(800, Math.max(0, result.savedVolume));
        dom.volumeSlider.value = vol;
        dom.volumeDisplay.textContent = vol + '%';
        updateVolumeStatus(vol);
        api.runtime.sendMessage({ action: 'setVolume', value: vol / 100 }).catch(function() {});
      } else if (result.volumeBoost !== undefined && dom.volumeSlider && dom.volumeDisplay) {
        var vol2 = Math.round(result.volumeBoost * 100);
        dom.volumeSlider.value = Math.min(800, Math.max(0, vol2));
        dom.volumeDisplay.textContent = Math.min(800, Math.max(0, vol2)) + '%';
        updateVolumeStatus(vol2);
        api.runtime.sendMessage({ action: 'setVolume', value: result.volumeBoost }).catch(function() {});
      }

      if (result.savedBass !== undefined && dom.bassSlider && dom.bassDisplay) {
        var bass = Math.min(12, Math.max(-12, result.savedBass));
        dom.bassSlider.value = bass;
        dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';
        api.runtime.sendMessage({ action: 'setBass', value: bass }).catch(function() {});
      } else if (result.bassBoost !== undefined && dom.bassSlider && dom.bassDisplay) {
        dom.bassSlider.value = result.bassBoost;
        dom.bassDisplay.textContent = result.bassBoost.toFixed(1) + ' dB';
        api.runtime.sendMessage({ action: 'setBass', value: result.bassBoost }).catch(function() {});
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
              updateGainClass(valueSpan, result.eqSettings[freq]);
            }
          }
        });
        var gains = getSliderGains();
        api.runtime.sendMessage({ action: 'updateEQ', gains: gains }).catch(function() {});
      }

      if (applyPresetToo && result.selectedPreset && PRESETS[result.selectedPreset]) {
        if (dom.presetSelect) dom.presetSelect.value = result.selectedPreset;
        applyPreset(result.selectedPreset);
      }
    });
  }

  function saveAllSettings() {
    var gains = getSliderGains();
    var volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
    var bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;
    
    if (!api) return;
    api.storage.local.set({
      eqSettings: gains,
      volumeBoost: volume / 100,
      bassBoost: bass,
      selectedPreset: state.currentPreset === 'custom' ? null : state.currentPreset,
      theme: state.currentTheme,
      language: getCurrentLang(),
      savedVolume: volume,
      savedBass: bass
    }).catch(function() {});
  }

  function handleReset() {
    console.log('🔄 СБРОС ВСЕХ НАСТРОЕК');
    showLoading(true);
    setStatus('reset', t('status_reset'));
    
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
    
    var gains = getSliderGains();
    if (api) {
      api.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true, source: 'popup_reset' }).catch(function() {});
      api.runtime.sendMessage({ action: 'setVolume', value: 1.0, instant: true }).catch(function() {});
      api.runtime.sendMessage({ action: 'setBass', value: 0, instant: true }).catch(function() {});
    }
    
    saveAllSettings();
    updateEQGraph();
    
    setTimeout(function() {
      showLoading(false);
      setStatus('ready', t('reset_done'));
      console.log('✅ Сброс выполнен: EQ=0, Громкость=100%, Bass=0');
    }, 300);
  }

  // ============================================
  //  ПОДКЛЮЧЕНИЕ/ОТКЛЮЧЕНИЕ
  // ============================================

  function handleConnectDisconnect() {
    if (state.isLoading || state.isConnecting) return;
    if (!api) {
      setStatus('disconnected', t('error'));
      return;
    }

    if (state.currentStatus === 'connected' || state.isConnected) {
      showLoading(true);
      setStatus('disconnected', t('status_disconnected'));
      state.isConnecting = true;
      api.runtime.sendMessage({ action: 'disconnect' }).then(function(response) {
        showLoading(false);
        state.isConnecting = false;
        state.isConnected = false;
        state.currentStatus = 'disconnected';
        setStatus('disconnected', t('status_disconnected'));
        api.storage.local.set({ soundforgeConnected: false }).catch(function() {});
      }).catch(function() {
        showLoading(false);
        state.isConnecting = false;
        setStatus('disconnected', t('error'));
      });
    } else {
      showLoading(true);
      setStatus('connecting', t('status_connecting'));
      state.isConnecting = true;
      state.currentStatus = 'connecting';
      api.runtime.sendMessage({ action: 'connect' }).then(function(response) {
        showLoading(false);
        setTimeout(function() {
          api.runtime.sendMessage({ action: 'getStatus' }).then(function(resp) {
            state.isConnecting = false;
            if (resp && resp.status === 'connected') {
              state.isConnected = true;
              state.currentStatus = 'connected';
              setStatus('connected', t('status_connected'));
              applySavedSettings(false);
              api.storage.local.set({ soundforgeConnected: true }).catch(function() {});
            } else {
              setTimeout(function() {
                api.runtime.sendMessage({ action: 'getStatus' }).then(function(resp2) {
                  if (resp2 && resp2.status === 'connected') {
                    state.isConnected = true;
                    state.currentStatus = 'connected';
                    setStatus('connected', t('status_connected'));
                    applySavedSettings(false);
                    api.storage.local.set({ soundforgeConnected: true }).catch(function() {});
                  } else {
                    state.isConnected = false;
                    state.currentStatus = 'disconnected';
                    setStatus('disconnected', t('status_disconnected'));
                    api.storage.local.set({ soundforgeConnected: false }).catch(function() {});
                  }
                }).catch(function() {
                  state.isConnecting = false;
                  state.isConnected = false;
                  state.currentStatus = 'disconnected';
                  setStatus('disconnected', t('status_disconnected'));
                });
              }, 1000);
            }
          }).catch(function() {
            state.isConnecting = false;
            state.isConnected = false;
            state.currentStatus = 'disconnected';
            setStatus('disconnected', t('status_disconnected'));
          });
        }, 1500);
      }).catch(function() {
        showLoading(false);
        state.isConnecting = false;
        setStatus('disconnected', t('error'));
      });
    }
  }

  // ============================================
  //  ЭКСПОРТ/ИМПОРТ
  // ============================================

  function handleExport() {
    if (!api) {
      setStatus('disconnected', t('error'));
      return;
    }
    showLoading(true);
    api.storage.local.get(null).then(function(data) {
      var exportData = {
        version: '3.22.8',
        timestamp: Date.now(),
        settings: data
      };
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
      setStatus('ready', t('export_done'));
    }).catch(function() {
      showLoading(false);
      setStatus('disconnected', t('error'));
    });
  }

  function handleImport() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;

      showLoading(true);
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (data.settings) {
            if (api) {
              api.storage.local.set(data.settings).then(function() {
                showLoading(false);
                setStatus('ready', t('import_done'));
                applySavedSettings(true);
                populatePresetSelect();
                updateEQGraph();
              }).catch(function() {
                showLoading(false);
                setStatus('disconnected', t('error'));
              });
            }
          } else {
            showLoading(false);
            setStatus('disconnected', t('invalid_format'));
          }
        } catch(err) {
          showLoading(false);
          setStatus('disconnected', t('error'));
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  // ============================================
  //  ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ
  // ============================================

  function restoreConnectionState() {
    if (!api) return;
    api.storage.local.get(['soundforgeConnected']).then(function(result) {
      console.log('📥 Восстановление состояния подключения:', result);
      
      if (result.soundforgeConnected === true) {
        console.log('✅ Восстановлено: ПОДКЛЮЧЕН');
        setStatus('connected', t('status_connected'));
        state.isConnected = true;
        applySavedSettings(false);
      } else if (result.soundforgeConnected === false) {
        console.log('🔴 Восстановлено: ОТКЛЮЧЕН');
        setStatus('disconnected', t('status_disconnected'));
        state.isConnected = false;
      } else {
        console.log('🔄 Нет сохраненного состояния, проверяем текущий статус');
        api.runtime.sendMessage({ action: 'getStatus' }).then(function(response) {
          if (response && response.status === 'connected') {
            setStatus('connected', t('status_connected'));
            state.isConnected = true;
            applySavedSettings(false);
            api.storage.local.set({ soundforgeConnected: true }).catch(function() {});
          } else {
            setStatus('ready', t('status_ready'));
            state.isConnected = false;
            api.storage.local.set({ soundforgeConnected: false }).catch(function() {});
          }
        }).catch(function() {
          setStatus('ready', t('status_ready'));
        });
      }
    }).catch(function() {
      setStatus('ready', t('status_ready'));
    });
  }

  // ============================================
  //  ОБРАБОТЧИК СООБЩЕНИЙ
  // ============================================

  function setupMessageListener() {
    if (!api) return;
    api.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      console.log('📨 Popup получил сообщение:', request.action);
      
      if (request.action === 'spectrumData' && request.spectrum) {
        var data = request.spectrum;
        var len = Math.min(data.length, state.spectrumData.length);
        for (var i = 0; i < len; i++) {
          state.spectrumData[i] = data[i] || 0;
        }
        if (request.rms !== undefined) {
          state.rmsValue = request.rms;
        }
        state.hasAudio = true;
        updateSpectrum();
        sendResponse({ status: 'ok' });
        return true;
      }
      
      if (request.action === 'presetChanged' && request.preset) {
        console.log('🔄 Пресет изменен через горячие клавиши: ' + request.preset);
        if (PRESETS[request.preset]) {
          applyPreset(request.preset);
          setStatus('ready', t('preset_applied') + (PRESET_INFO[request.preset]?.desc_ru || request.preset));
        }
        sendResponse({ status: 'ok' });
        return true;
      }
      
      if (request.action === 'settingsReset') {
        console.log('🔄 Настройки сброшены через горячие клавиши');
        handleReset();
        sendResponse({ status: 'ok' });
        return true;
      }
      
      if (request.action === 'statusUpdate') {
        if (request.status === 'connected') {
          setStatus('connected', t('status_connected'));
          state.isConnected = true;
          if (api) api.storage.local.set({ soundforgeConnected: true }).catch(function() {});
          applySavedSettings(false);
        } else if (request.status === 'disconnected') {
          setStatus('disconnected', t('status_disconnected'));
          state.isConnected = false;
          if (api) api.storage.local.set({ soundforgeConnected: false }).catch(function() {});
        } else if (request.status === 'error') {
          setStatus('disconnected', t('status_error'));
          state.isConnected = false;
          if (api) api.storage.local.set({ soundforgeConnected: false }).catch(function() {});
        }
        sendResponse({ status: 'ok' });
        return true;
      }
      
      if (request.action === 'nightModeStatus') {
        extraButtonsState.nightActive = request.enabled;
        updateExtraButtons();
        sendResponse({ status: 'ok' });
        return true;
      }
      
      if (request.action === 'powerSaveStatus') {
        extraButtonsState.powerActive = request.enabled;
        updateExtraButtons();
        sendResponse({ status: 'ok' });
        return true;
      }

      if (request.action === 'effectChanged' && request.effect) {
        state.currentEffect = request.effect;
        updateEffectButtonLabel();
        updateSpectrum();
        sendResponse({ status: 'ok' });
        return true;
      }
      
      return false;
    });
  }

  // ============================================
  //  КНОПКА СТАТИСТИКА
  // ============================================

  function setupStatsButton() {
    if (!dom.statsBtn) return;
    
    dom.statsBtn.addEventListener('click', function() {
      var gains = getSliderGains();
      var freqs = ['31', '62', '125', '250', '500', '1000', '2000', '4000', '8000', '16000'];
      
      var label = getStatsLabel();
      var separator = getStatsSeparator();
      var freqUnit = getFreqUnit();
      
      var statsText = label;
      var parts = [];
      for (var f = 0; f < freqs.length; f++) {
        var freq = freqs[f];
        var value = gains[freq] || 0;
        parts.push(freq + freqUnit + ': ' + value.toFixed(1));
      }
      statsText += parts.join(separator);
      
      setStatus('ready', statsText);
      console.log('📊 Текущие настройки эквалайзера:', gains);
    });
  }

  // ============================================
  //  КНОПКА ИСТОРИЯ - С ПОДДЕРЖКОЙ 3 ЯЗЫКОВ
  // ============================================

  function setupHistoryButton() {
    if (!dom.historyBtn) return;
    
    dom.historyBtn.addEventListener('click', function() {
      if (!api) {
        setStatus('disconnected', t('error'));
        return;
      }
      
      api.storage.local.get(['settingsHistory']).then(function(result) {
        var history = result.settingsHistory || [];
        var count = history.length;
        
        if (count === 0) {
          setStatus('ready', t('history_empty'));
          return;
        }
        
        var actions = {};
        for (var i = 0; i < history.length; i++) {
          var action = history[i].action;
          actions[action] = (actions[action] || 0) + 1;
        }
        
        var label = getHistoryLabel(count);
        var separator = getHistorySeparator();
        var join = getHistoryActionsJoin();
        
        var historyText = label;
        var actionParts = [];
        for (var actionKey in actions) {
          if (actions.hasOwnProperty(actionKey)) {
            var translatedAction = t('actions.' + actionKey) || actionKey;
            actionParts.push(translatedAction + '(' + actions[actionKey] + ')');
          }
        }
        historyText += separator + actionParts.join(join);
        
        setStatus('ready', historyText);
        console.log('📜 История:', history.slice(-10));
      }).catch(function() {
        setStatus('disconnected', t('error'));
      });
    });
  }

  // ============================================
  //  ДОПОЛНИТЕЛЬНЫЕ КНОПКИ
  // ============================================

  var extraButtonsState = {
    nightActive: false,
    powerActive: false
  };

  function getButtonLabels() {
    var lang = getCurrentLang();
    var labels = {
      ru: { night: '🌙 Ночной', night_on: '🌙 Ночной ON', power: '⚡ Эконом', power_on: '⚡ Эконом ON', window: '🪟 Окно', history: '📜 История', stats: '📊 Статистика' },
      uk: { night: '🌙 Нічний', night_on: '🌙 Нічний ON', power: '⚡ Економ', power_on: '⚡ Економ ON', window: '🪟 Вікно', history: '📜 Історія', stats: '📊 Статистика' },
      en: { night: '🌙 Night', night_on: '🌙 Night ON', power: '⚡ Power Save', power_on: '⚡ Power Save ON', window: '🪟 Window', history: '📜 History', stats: '📊 Stats' }
    };
    return labels[lang] || labels.ru;
  }

  function updateExtraButtons() {
    var labels = getButtonLabels();
    
    var nightBtn = document.querySelector('.btn-night-mode');
    if (nightBtn) {
      nightBtn.textContent = extraButtonsState.nightActive ? labels.night_on : labels.night;
      nightBtn.style.borderColor = extraButtonsState.nightActive ? '#4CAF50' : 'rgba(255,255,255,0.06)';
      nightBtn.style.color = extraButtonsState.nightActive ? '#4CAF50' : '#8899bb';
    }
    
    var powerBtn = document.querySelector('.btn-power-save');
    if (powerBtn) {
      powerBtn.textContent = extraButtonsState.powerActive ? labels.power_on : labels.power;
      powerBtn.style.borderColor = extraButtonsState.powerActive ? '#FF9800' : 'rgba(255,255,255,0.06)';
      powerBtn.style.color = extraButtonsState.powerActive ? '#FF9800' : '#8899bb';
    }
  }

  function addNewFeatureButtons() {
    var extraButtons = document.querySelector('.extra-buttons');
    if (!extraButtons) return;
    
    var labels = getButtonLabels();
    
    // Кнопка Ночной режим
    var nightBtn = document.createElement('button');
    nightBtn.className = 'btn btn-night-mode';
    nightBtn.dataset.active = 'false';
    nightBtn.textContent = labels.night;
    nightBtn.style.cssText = 'padding:3px 10px;font-size:10px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:#8899bb;cursor:pointer;transition:all 0.3s';
    nightBtn.addEventListener('click', function() {
      if (!api) return;
      api.runtime.sendMessage({ action: 'toggleNightMode' }).then(function(response) {
        if (response && response.enabled !== undefined) {
          extraButtonsState.nightActive = response.enabled;
          var labels2 = getButtonLabels();
          nightBtn.dataset.active = response.enabled ? 'true' : 'false';
          nightBtn.textContent = response.enabled ? labels2.night_on : labels2.night;
          nightBtn.style.borderColor = response.enabled ? '#4CAF50' : 'rgba(255,255,255,0.06)';
          nightBtn.style.color = response.enabled ? '#4CAF50' : '#8899bb';
          setStatus('ready', response.enabled ? t('night_on_msg') : t('night_off_msg'));
        }
      }).catch(function() {});
    });
    
    // Кнопка Энергосбережение
    var powerBtn = document.createElement('button');
    powerBtn.className = 'btn btn-power-save';
    powerBtn.dataset.active = 'false';
    powerBtn.textContent = labels.power;
    powerBtn.style.cssText = 'padding:3px 10px;font-size:10px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:#8899bb;cursor:pointer;transition:all 0.3s';
    powerBtn.addEventListener('click', function() {
      if (!api) return;
      api.runtime.sendMessage({ action: 'togglePowerSave' }).then(function(response) {
        if (response && response.enabled !== undefined) {
          extraButtonsState.powerActive = response.enabled;
          var labels2 = getButtonLabels();
          powerBtn.dataset.active = response.enabled ? 'true' : 'false';
          powerBtn.textContent = response.enabled ? labels2.power_on : labels2.power;
          powerBtn.style.borderColor = response.enabled ? '#FF9800' : 'rgba(255,255,255,0.06)';
          powerBtn.style.color = response.enabled ? '#FF9800' : '#8899bb';
          setStatus('ready', response.enabled ? t('power_on_msg') : t('power_off_msg'));
        }
      }).catch(function() {});
    });
    
    extraButtons.appendChild(nightBtn);
    extraButtons.appendChild(powerBtn);
    
    window._nightBtn = nightBtn;
    window._powerBtn = powerBtn;
  }

  function addHotkeyInfo() {
    var footer = document.querySelector('.footer');
    if (footer) {
      var hotkeyInfo = document.createElement('span');
      hotkeyInfo.className = 'hotkey-info';
      hotkeyInfo.textContent = '⌨️ Ctrl+Shift+E | Ctrl+Shift+Y | Ctrl+Shift+X | Ctrl+Shift+F';
      hotkeyInfo.style.cssText = 'font-size:8px;color:#667799;opacity:0.6;margin-left:10px';
      footer.appendChild(hotkeyInfo);
    }
  }

  // ============================================
  //  ТЕМЫ
  // ============================================

  function initThemeSelector() {
    var themeSelector = dom.themeSelector;
    if (!themeSelector) return;
    var themeOptions = themeSelector.querySelectorAll('.theme-option');

    if (api) {
      api.storage.local.get(['theme']).then(function(result) {
        var savedTheme = result.theme || 'system';
        setTheme(savedTheme);
        updateThemeButtons(savedTheme);
        state.currentTheme = savedTheme;
      }).catch(function() {});
    }

    for (var ti = 0; ti < themeOptions.length; ti++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var theme = this.dataset.theme;
          setTheme(theme);
          updateThemeButtons(theme);
          state.currentTheme = theme;
          if (api) {
            api.storage.local.set({ theme: theme }).catch(function() {});
          }
          updateEQGraph();
        });
      })(themeOptions[ti]);
    }

    if (window.matchMedia) {
      var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', function() {
        if (state.currentTheme === 'system') setTheme('system');
      });
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.currentTheme = theme;
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
  //  ЯЗЫК
  // ============================================

  function initLanguage() {
    if (api) {
      api.storage.local.get(['language']).then(function(result) {
        var savedLang = result.language || 'ru';
        setCurrentLang(savedLang);
        updateLanguage();
        if (dom.langToggle) {
          dom.langToggle.textContent = LANGUAGES[savedLang]?.flag || '🌐';
        }
        if (dom.loadingText) dom.loadingText.textContent = 'Загрузка...';
      }).catch(function() {});
    }
  }

  function toggleLanguage() {
    var languages = ['ru', 'uk', 'en'];
    var currentIndex = languages.indexOf(getCurrentLang());
    var newLang = languages[(currentIndex + 1) % languages.length];
    setCurrentLang(newLang);
    if (api) {
      api.storage.local.set({ language: newLang }).catch(function() {});
    }
    updateLanguage();
    if (dom.loadingText) dom.loadingText.textContent = 'Загрузка...';
  }

  // ============================================
  //  ПРЕСЕТЫ
  // ============================================

  function populatePresetSelect() {
    var select = dom.presetSelect;
    if (!select) return;
    select.innerHTML = '';

    var categories = {};
    var presetNames = Object.keys(PRESETS);

    presetNames.forEach(function(name) {
      var category = PRESET_CATEGORIES[name] || '🎧 Специальные';
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
      var translatedCategory = t('presets.' + category) || category;
      optgroup.label = translatedCategory;

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
        userOptgroup.label = t('presets.👤 Сохранить пресет') || '👤 ' + t('save_preset');
        userKeys.forEach(function(name) {
          var option = document.createElement('option');
          option.value = 'user_' + name;
          option.textContent = '💾 ' + name;
          userOptgroup.appendChild(option);
        });
        select.appendChild(userOptgroup);
      }
    } catch(e) {}

    if (state.currentPreset && PRESETS[state.currentPreset]) {
      select.value = state.currentPreset;
    }
  }

  // ============================================
  //  ИНИЦИАЛИЗАЦИЯ
  // ============================================

  function init() {
    console.log('📄 DOM загружен, инициализация...');
    initDom();

    if (!dom.connectBtn) {
      console.error('❌ Кнопка "Подключить" не найдена!');
      return;
    }

    console.log('✅ Все элементы найдены');

    initThemeSelector();
    initLanguage();
    populatePresetSelect();
    restoreConnectionState();
    setupMessageListener();

    // Кнопка подключения
    dom.connectBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleConnectDisconnect();
    });

    // Кнопка сброса
    dom.resetBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleReset();
    });

    // ИНИЦИАЛИЗАЦИЯ КНОПКИ ЭФФЕКТОВ (ИСПРАВЛЕНО ДЛЯ FIREFOX)
    initEffectButton();

    // Кнопка открытия окна
    if (dom.openWindowBtn) {
      dom.openWindowBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!api) return;
        api.runtime.sendMessage({ action: 'open_window' }).catch(function() {});
      });
    }

    // КНОПКА ИСТОРИЯ
    setupHistoryButton();

    // КНОПКА СТАТИСТИКА
    setupStatsButton();

    // Выбор пресета
    if (dom.presetSelect) {
      dom.presetSelect.addEventListener('change', function() {
        var value = this.value;
        console.log('🔄 Выбран пресет:', value);
        
        if (!value) {
          state.currentPreset = 'custom';
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
              state.currentPreset = userPresetName;
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
                    updateGainClass(valueSpan2, val2);
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
              if (api) {
                api.runtime.sendMessage({ action: 'updateEQ', gains: gainsData2, instant: true }).catch(function() {});
                api.runtime.sendMessage({ action: 'setVolume', value: (tempPreset.volume || 100) / 100, instant: true }).catch(function() {});
                api.runtime.sendMessage({ action: 'setBass', value: tempPreset.bass || 0, instant: true }).catch(function() {});
              }
              saveAllSettings();
              updateEQGraph();
              setStatus('ready', t('preset_applied') + userPresetName);
            }
          } catch(e) {
            console.error('Ошибка загрузки пользовательского пресета:', e);
          }
        } else if (PRESETS[value]) {
          applyPreset(value);
        }
      });
    }

    // Слайдеры EQ
    if (dom.eqSliders) {
      var slidersList = Array.from(dom.eqSliders);
      slidersList.forEach(function(slider) {
        var valueSpan = slider.parentElement.querySelector('.gain-value');

        slider.addEventListener('input', function() {
          var val = parseFloat(slider.value);
          if (valueSpan) {
            valueSpan.textContent = val.toFixed(1);
            updateGainClass(valueSpan, val);
          }
          updateEQGraph();
          var gains = getSliderGains();
          if (api) {
            api.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true }).catch(function() {});
          }
          saveAllSettings();
          state.currentPreset = 'custom';
          updatePresetInfo('custom');
          if (dom.presetSelect) dom.presetSelect.value = '';
        });

        slider.addEventListener('change', function() {
          var gains = getSliderGains();
          if (api) {
            api.runtime.sendMessage({ action: 'updateEQ', gains: gains }).catch(function() {});
          }
          saveAllSettings();
          updateEQGraph();
        });
      });
    }

    // Громкость
    if (dom.volumeSlider && dom.volumeDisplay) {
      var initialVolume = parseInt(dom.volumeSlider.value) || 100;
      updateVolumeStatus(initialVolume);
      
      dom.volumeSlider.addEventListener('input', function() {
        var val = parseInt(this.value);
        dom.volumeDisplay.textContent = val + '%';
        updateVolumeStatus(val);
        var volumeValue = val / 100;
        if (api) {
          api.runtime.sendMessage({ action: 'setVolume', value: volumeValue, instant: true }).catch(function() {});
        }
        saveAllSettings();
      });
      
      dom.volumeSlider.addEventListener('change', function() {
        var val = parseInt(this.value);
        if (api) {
          api.runtime.sendMessage({ action: 'setVolume', value: val / 100 }).catch(function() {});
        }
        saveAllSettings();
      });
    }

    // Bass Boost
    if (dom.bassSlider && dom.bassDisplay) {
      dom.bassSlider.addEventListener('input', function() {
        dom.bassDisplay.textContent = parseFloat(this.value).toFixed(1) + ' dB';
        var val = parseFloat(this.value);
        if (api) {
          api.runtime.sendMessage({ action: 'setBass', value: val, instant: true }).catch(function() {});
        }
        saveAllSettings();
      });
      dom.bassSlider.addEventListener('change', function() {
        var val = parseFloat(this.value);
        if (api) {
          api.runtime.sendMessage({ action: 'setBass', value: val }).catch(function() {});
        }
        saveAllSettings();
      });
    }

    // Переключение языка
    if (dom.langToggle) {
      dom.langToggle.addEventListener('click', function() {
        toggleLanguage();
      });
    }

    // Экспорт
    if (dom.exportBtn) {
      dom.exportBtn.addEventListener('click', handleExport);
    }

    // Импорт
    if (dom.importBtn) {
      dom.importBtn.addEventListener('click', handleImport);
    }

    // Сохранить пресет
    if (dom.savePresetBtn) {
      dom.savePresetBtn.addEventListener('click', function() {
        var name = prompt(t('save_preset') + ':', 'My Preset');
        if (name) {
          var gains = getSliderGains();
          var volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
          var bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;
          try {
            var presets = JSON.parse(localStorage.getItem('soundforge_user_presets') || '{}');
            presets[name] = { gains: gains, volume: volume, bass: bass, timestamp: Date.now() };
            localStorage.setItem('soundforge_user_presets', JSON.stringify(presets));
            setStatus('ready', t('preset_saved') + name);
            populatePresetSelect();
          } catch(e) {
            console.error('Ошибка сохранения пресета:', e);
            setStatus('disconnected', t('error'));
          }
        }
      });
    }

    // A/B сравнение
    if (dom.abCompareBtn) {
      dom.abCompareBtn.addEventListener('click', function() {
        setStatus('ready', t('compare_mode'));
      });
    }

    // Развернуть окно
    if (dom.expandBtn) {
      dom.expandBtn.addEventListener('click', function() {
        var body = document.body;
        if (body.classList.contains('expanded')) {
          body.classList.remove('expanded');
          body.style.width = '480px';
          body.style.maxHeight = '700px';
          dom.expandBtn.textContent = '⬜';
        } else {
          body.classList.add('expanded');
          body.style.width = '100%';
          body.style.maxHeight = '100vh';
          dom.expandBtn.textContent = '⬛';
        }
        setTimeout(updateEQGraph, 100);
      });
    }

    // Загрузка настроек
    applySavedSettings(true);
    updateSiteInfo();
    updateEQGraph();
    updateLanguage();

    // Визуализация
    visualizationLoop();
    console.log('🔄 Визуализация запущена');

    // Запрос спектра
    if (api) {
      setInterval(function() {
        api.runtime.sendMessage({ action: 'getSpectrum' }).catch(function() {});
      }, 50);

      setInterval(function() {
        api.runtime.sendMessage({ action: 'getStatus' }).then(function(response) {
          if (response && response.status === 'connected' && state.currentStatus !== 'connected') {
            setStatus('connected', t('status_connected'));
            state.isConnected = true;
            applySavedSettings(false);
          }
        }).catch(function() {});
      }, 5000);
    }

    // Добавляем кнопки и информацию
    addNewFeatureButtons();
    addHotkeyInfo();

    console.log('✅ SoundForge Popup v3.22.8 (Firefox 153.0esr) готов!');
    console.log('📊 Всего пресетов: ' + Object.keys(PRESETS).length);
    console.log('🌍 Языки: RU, UA, EN с правильными склонениями');
    console.log('🎨 Эффекты: Спектр | Волны | Огонь | Неон');
    console.log('📊 СТАТИСТИКА: показывает текущие значения GAIN на частотах');
    console.log('📜 ИСТОРИЯ: показывает список действий с количеством');
    console.log('⌨️ Горячие клавиши: Ctrl+Shift+E, Ctrl+Shift+Y, Ctrl+Shift+X, Ctrl+Shift+F');
    console.log('🌙 Ночной режим: автоматически с 22:00 до 07:00');
    console.log('⚡ Режим энергосбережения: снижает частоту обновлений');
  }

  // Запуск после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();