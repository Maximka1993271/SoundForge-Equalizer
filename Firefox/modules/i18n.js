// ============================================
//  I18N.JS - Интернационализация (v3.22.8)
//  3 ЯЗЫКА: Русский, Українська, English
//  ПОЛНЫЙ НАБОР ФРАЗ ДЛЯ ИНТЕРФЕЙСА
// ============================================

export const LANGUAGES = {
  ru: {
    name: 'Русский', 
    short: 'RU', 
    flag: '🇷🇺',
    
    // ========== КНОПКИ И СТАТУСЫ ==========
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
    
    // ========== ПРЕСЕТЫ ==========
    preset_applied: '✅ Пресет применен: ',
    preset_applied_reference: '✅ Пресет применен: Reference',
    preset_saved: '💾 Пресет сохранен: ',
    preset_deleted: '🗑️ Пресет удален',
    save_preset: '💾 Сохранить пресет',
    delete_preset: '🗑️ Удалить',
    
    // ========== ЭКСПОРТ/ИМПОРТ ==========
    export: '💾 Экспорт',
    import: '📂 Импорт',
    export_completed: '✅ Экспорт завершен',
    import_completed: '✅ Импорт завершен',
    
    // ========== НАСТРОЙКИ ==========
    volume: '🎚️ Громкость',
    bass: '🔊 Bass Boost',
    compare: '🔀 A/B Сравнение',
    ab_saved: '🔀 Режим A/B: сохранено состояние A',
    
    // ========== НОЧНОЙ РЕЖИМ ==========
    night_mode_on: '🌙 Ночной режим включен',
    night_mode_off: '☀️ Ночной режим выключен',
    
    // ========== ЭНЕРГОСБЕРЕЖЕНИЕ ==========
    power_save_on: '⚡ Энергосбережение включено',
    power_save_off: '⚡ Энергосбережение выключено',
    
    // ========== ИСТОРИЯ ==========
    history_empty: '📜 История пуста',
    history_records: '📜 {count} записей. Последнее: {action}',
    history_last: 'Последнее: {action}',
    
    // ========== СТАТИСТИКА ==========
    stats_total: '📊 Всего: {count} записей',
    stats_top: ' | Топ: {top}',
    
    // ========== СБРОС ==========
    settings_reset: '✅ Все настройки сброшены',
    resetting: '🔄 Сброшено...',
    reset_done: '✅ Сброшено',
    
    // ========== ОБЩИЕ ==========
    author: '✍️ ',
    version: 'v3.22.8',
    bands: ' полос',
    visualization: '📊 Визуализация активна',
    site: '🌐 Загрузка...',
    preset: '🎛️ Настройки',
    custom: '🎛️ Настройки',
    
    // ========== ЭФФЕКТЫ ВИЗУАЛИЗАЦИИ ==========
    effects: {
      spectrum: '📊 Спектр',
      waves: '🌊 Волны',
      fire: '🔥 Огонь',
      neon: '💜 Неон'
    },
    
    // ========== КАТЕГОРИИ ПРЕСЕТОВ ==========
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
      '🔊 Бас/Усиление': '🔊 Бас/Усиление',
      '⚡ MAX BOOST': '⚡ MAX BOOST'
    },
    
    // ========== ПРЕДУПРЕЖДЕНИЯ ГРОМКОСТИ ==========
    volume_warnings: {
      quiet: '🔇 Слишком тихо',
      normal: '🟢 Нормально',
      loud: '🔊 Громко',
      very_loud: '🔊 Очень громко',
      dangerous: '⚠️ Опасно!',
      critical: '🔴 КРИТИЧЕСКИ!',
      maximum: '⚡ МАКСИМУМ!'
    },
    
    // ========== КЛИППИНГ ==========
    clipping: {
      danger: {
        title: '🔴 КЛИППИНГ!',
        message: 'Уменьшите громкость, чтобы избежать искажений'
      },
      critical: {
        title: '🔴🔴 КРИТИЧЕСКИЙ КЛИППИНГ!',
        message: 'СРОЧНО уменьшите громкость! Возможно повреждение динамиков'
      },
      warning: {
        title: '🟡 ВНИМАНИЕ!',
        message: 'Высокий уровень звука. Рекомендуется снизить громкость'
      }
    }
  },
  
  uk: {
    name: 'Українська', 
    short: 'UA', 
    flag: '🇺🇦',
    
    // ========== КНОПКИ И СТАТУСЫ ==========
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
    
    // ========== ПРЕСЕТЫ ==========
    preset_applied: '✅ Пресет застосовано: ',
    preset_applied_reference: '✅ Пресет застосовано: Reference',
    preset_saved: '💾 Пресет збережено: ',
    preset_deleted: '🗑️ Пресет видалено',
    save_preset: '💾 Зберегти пресет',
    delete_preset: '🗑️ Видалити',
    
    // ========== ЭКСПОРТ/ИМПОРТ ==========
    export: '💾 Експорт',
    import: '📂 Імпорт',
    export_completed: '✅ Експорт завершено',
    import_completed: '✅ Імпорт завершено',
    
    // ========== НАСТРОЙКИ ==========
    volume: '🎚️ Гучність',
    bass: '🔊 Bass Boost',
    compare: '🔀 A/B Порівняння',
    ab_saved: '🔀 Режим A/B: збережено стан A',
    
    // ========== НОЧНОЙ РЕЖИМ ==========
    night_mode_on: '🌙 Нічний режим увімкнено',
    night_mode_off: '☀️ Нічний режим вимкнено',
    
    // ========== ЭНЕРГОСБЕРЕЖЕНИЕ ==========
    power_save_on: '⚡ Енергозбереження увімкнено',
    power_save_off: '⚡ Енергозбереження вимкнено',
    
    // ========== ИСТОРИЯ ==========
    history_empty: '📜 Історія порожня',
    history_records: '📜 {count} записів. Останнє: {action}',
    history_last: 'Останнє: {action}',
    
    // ========== СТАТИСТИКА ==========
    stats_total: '📊 Всього: {count} записів',
    stats_top: ' | Топ: {top}',
    
    // ========== СБРОС ==========
    settings_reset: '✅ Всі налаштування скинуто',
    resetting: '🔄 Скинуто...',
    reset_done: '✅ Скинуто',
    
    // ========== ОБЩИЕ ==========
    author: '✍️ ',
    version: 'v3.22.8',
    bands: ' смуг',
    visualization: '📊 Візуалізація активна',
    site: '🌐 Завантаження...',
    preset: '🎛️ Налаштування',
    custom: '🎛️ Налаштування',
    
    // ========== ЭФФЕКТЫ ВИЗУАЛИЗАЦИИ ==========
    effects: {
      spectrum: '📊 Спектр',
      waves: '🌊 Хвилі',
      fire: '🔥 Вогонь',
      neon: '💜 Неон'
    },
    
    // ========== КАТЕГОРИИ ПРЕСЕТОВ ==========
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
      '🔊 Бас/Усиление': '🔊 Бас/Посилення',
      '⚡ MAX BOOST': '⚡ MAX BOOST'
    },
    
    // ========== ПРЕДУПРЕЖДЕНИЯ ГРОМКОСТИ ==========
    volume_warnings: {
      quiet: '🔇 Занадто тихо',
      normal: '🟢 Нормально',
      loud: '🔊 Гучно',
      very_loud: '🔊 Дуже гучно',
      dangerous: '⚠️ Небезпечно!',
      critical: '🔴 КРИТИЧНО!',
      maximum: '⚡ МАКСИМУМ!'
    },
    
    // ========== КЛИППИНГ ==========
    clipping: {
      danger: {
        title: '🔴 КЛІПІНГ!',
        message: 'Зменшіть гучність, щоб уникнути спотворень'
      },
      critical: {
        title: '🔴🔴 КРИТИЧНИЙ КЛІПІНГ!',
        message: 'ТЕРМІНОВО зменшіть гучність! Можливе пошкодження динаміків'
      },
      warning: {
        title: '🟡 УВАГА!',
        message: 'Високий рівень звуку. Рекомендується знизити гучність'
      }
    }
  },
  
  en: {
    name: 'English', 
    short: 'EN', 
    flag: '🇺🇸',
    
    // ========== BUTTONS AND STATUS ==========
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
    
    // ========== PRESETS ==========
    preset_applied: '✅ Preset applied: ',
    preset_applied_reference: '✅ Preset applied: Reference',
    preset_saved: '💾 Preset saved: ',
    preset_deleted: '🗑️ Preset deleted',
    save_preset: '💾 Save preset',
    delete_preset: '🗑️ Delete',
    
    // ========== EXPORT/IMPORT ==========
    export: '💾 Export',
    import: '📂 Import',
    export_completed: '✅ Export completed',
    import_completed: '✅ Import completed',
    
    // ========== SETTINGS ==========
    volume: '🎚️ Volume',
    bass: '🔊 Bass Boost',
    compare: '🔀 A/B Compare',
    ab_saved: '🔀 A/B mode: state A saved',
    
    // ========== NIGHT MODE ==========
    night_mode_on: '🌙 Night mode enabled',
    night_mode_off: '☀️ Night mode disabled',
    
    // ========== POWER SAVE ==========
    power_save_on: '⚡ Power save enabled',
    power_save_off: '⚡ Power save disabled',
    
    // ========== HISTORY ==========
    history_empty: '📜 History is empty',
    history_records: '📜 {count} records. Last: {action}',
    history_last: 'Last: {action}',
    
    // ========== STATISTICS ==========
    stats_total: '📊 Total: {count} records',
    stats_top: ' | Top: {top}',
    
    // ========== RESET ==========
    settings_reset: '✅ All settings reset',
    resetting: '🔄 Resetting...',
    reset_done: '✅ Reset done',
    
    // ========== COMMON ==========
    author: '✍️ ',
    version: 'v3.22.8',
    bands: ' bands',
    visualization: '📊 Visualization active',
    site: '🌐 Loading...',
    preset: '🎛️ Settings',
    custom: '🎛️ Settings',
    
    // ========== VISUALIZATION EFFECTS ==========
    effects: {
      spectrum: '📊 Spectrum',
      waves: '🌊 Waves',
      fire: '🔥 Fire',
      neon: '💜 Neon'
    },
    
    // ========== PRESET CATEGORIES ==========
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
      '🔊 Бас/Усиление': '🔊 Bass/Boost',
      '⚡ MAX BOOST': '⚡ MAX BOOST'
    },
    
    // ========== VOLUME WARNINGS ==========
    volume_warnings: {
      quiet: '🔇 Too quiet',
      normal: '🟢 Normal',
      loud: '🔊 Loud',
      very_loud: '🔊 Very loud',
      dangerous: '⚠️ Dangerous!',
      critical: '🔴 CRITICAL!',
      maximum: '⚡ MAXIMUM!'
    },
    
    // ========== CLIPPING ==========
    clipping: {
      danger: {
        title: '🔴 CLIPPING!',
        message: 'Reduce volume to avoid distortion'
      },
      critical: {
        title: '🔴🔴 CRITICAL CLIPPING!',
        message: 'IMMEDIATELY reduce volume! Possible speaker damage'
      },
      warning: {
        title: '🟡 WARNING!',
        message: 'High sound level. It is recommended to lower the volume'
      }
    }
  }
};

// ============================================
//  СОСТОЯНИЕ ЯЗЫКА
// ============================================

let currentLang = 'ru';

// ============================================
//  ЭКСПОРТ ФУНКЦИЙ
// ============================================

export function setCurrentLang(lang) { 
  if (LANGUAGES[lang]) {
    currentLang = lang;
  }
}

export function getCurrentLang() { 
  return currentLang; 
}

export function detectLanguage() {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('uk')) return 'uk';
  return 'en';
}

// ============================================
//  ОСНОВНАЯ ФУНКЦИЯ ПЕРЕВОДА
// ============================================

export function t(key, params = {}) {
  const lang = LANGUAGES[currentLang];
  if (!lang) return key;
  
  const keys = key.split('.');
  let value = lang;
  for (let i = 0; i < keys.length; i++) {
    if (value && value[keys[i]] !== undefined) {
      value = value[keys[i]];
    } else {
      return key;
    }
  }
  
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    for (const [pkey, pvalue] of Object.entries(params)) {
      value = value.replace(`{${pkey}}`, pvalue);
    }
  }
  
  return value;
}

// ============================================
//  ФУНКЦИИ ДЛЯ РАБОТЫ С ЭФФЕКТАМИ
// ============================================

export function getEffectName(effectId) {
  const effects = t('effects');
  if (typeof effects === 'object' && effects[effectId]) {
    return effects[effectId];
  }
  return effectId;
}

export function getEffectNames() {
  const effects = t('effects');
  if (typeof effects === 'object') {
    return effects;
  }
  return {
    spectrum: '📊 Spectrum',
    waves: '🌊 Waves',
    fire: '🔥 Fire',
    neon: '💜 Neon'
  };
}

// ============================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

export function getVolumeWarning(volume) {
  const warnings = t('volume_warnings');
  
  if (volume === 0 || volume <= 80) {
    return warnings.quiet || '🔇 Too quiet';
  } else if (volume <= 130) {
    return warnings.normal || '🟢 Normal';
  } else if (volume <= 200) {
    return warnings.loud || '🔊 Loud';
  } else if (volume <= 300) {
    return warnings.very_loud || '🔊 Very loud';
  } else if (volume <= 450) {
    return warnings.dangerous || '⚠️ Dangerous!';
  } else if (volume <= 600) {
    return warnings.critical || '🔴 CRITICAL!';
  } else {
    return warnings.maximum || '⚡ MAXIMUM!';
  }
}

export function getClipWarning(level = 'danger') {
  const clipping = t('clipping');
  
  if (level === 'critical') {
    return {
      title: clipping.critical?.title || '🔴🔴 CRITICAL CLIPPING!',
      message: clipping.critical?.message || 'IMMEDIATELY reduce volume!'
    };
  } else if (level === 'warning') {
    return {
      title: clipping.warning?.title || '🟡 WARNING!',
      message: clipping.warning?.message || 'High sound level'
    };
  }
  return {
    title: clipping.danger?.title || '🔴 CLIPPING!',
    message: clipping.danger?.message || 'Reduce volume to avoid distortion'
  };
}

// ============================================
//  НОВЫЕ ФУНКЦИИ ДЛЯ ФОРМАТИРОВАНИЯ СООБЩЕНИЙ
// ============================================

export function formatPresetApplied(presetName) {
  return t('preset_applied') + presetName;
}

export function formatPresetAppliedReference() {
  return t('preset_applied_reference');
}

export function formatExportCompleted() {
  return t('export_completed');
}

export function formatImportCompleted() {
  return t('import_completed');
}

export function formatPresetSaved(presetName) {
  return t('preset_saved') + presetName;
}

export function formatABSaved() {
  return t('ab_saved');
}

export function formatNightModeOn() {
  return t('night_mode_on');
}

export function formatNightModeOff() {
  return t('night_mode_off');
}

export function formatPowerSaveOn() {
  return t('power_save_on');
}

export function formatPowerSaveOff() {
  return t('power_save_off');
}

export function formatHistoryRecords(count, action) {
  return t('history_records', { count, action });
}

export function formatStatsTotal(count, top = '') {
  let result = t('stats_total', { count });
  if (top) {
    result += t('stats_top', { top });
  }
  return result;
}

export function formatSettingsReset() {
  return t('settings_reset');
}

export function formatConnectionError() {
  return t('connection_error');
}

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
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
  formatConnectionError
};