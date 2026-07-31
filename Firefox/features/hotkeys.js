// ============================================
//  HOTKEYS.JS - Горячие клавиши (v3.22.8)
//  Chrome MV3 + Firefox MV2
// ============================================

const HOTKEY_LABELS = {
  ru: {
    toggle_eq: 'Включить/выключить эквалайзер (Ctrl+Shift+E)',
    next_preset: 'Следующий пресет (Ctrl+Shift+Y)',
    reset_settings: 'Сбросить все настройки (Ctrl+Shift+X)',
    open_window: 'Открыть эквалайзер в окне (Ctrl+Shift+W)'
  },
  uk: {
    toggle_eq: 'Увімкнути/вимкнути еквалайзер (Ctrl+Shift+E)',
    next_preset: 'Наступний пресет (Ctrl+Shift+Y)',
    reset_settings: 'Скинути всі налаштування (Ctrl+Shift+X)',
    open_window: 'Відкрити еквалайзер у вікні (Ctrl+Shift+W)'
  },
  en: {
    toggle_eq: 'Toggle equalizer (Ctrl+Shift+E)',
    next_preset: 'Next preset (Ctrl+Shift+Y)',
    reset_settings: 'Reset all settings (Ctrl+Shift+X)',
    open_window: 'Open equalizer in window (Ctrl+Shift+W)'
  }
};

const TRANSLATIONS = {
  ru: {
    eq_enabled: '🔊 Эквалайзер включен',
    eq_disabled: '🔇 Эквалайзер выключен',
    preset_changed: '🎵 Пресет изменен',
    settings_reset: '🔄 Все настройки сброшены'
  },
  uk: {
    eq_enabled: '🔊 Еквалайзер увімкнено',
    eq_disabled: '🔇 Еквалайзер вимкнено',
    preset_changed: '🎵 Пресет змінено',
    settings_reset: '🔄 Всі налаштування скинуто'
  },
  en: {
    eq_enabled: '🔊 Equalizer enabled',
    eq_disabled: '🔇 Equalizer disabled',
    preset_changed: '🎵 Preset changed',
    settings_reset: '🔄 All settings reset'
  }
};

const PRESET_NAMES = {
  flat: 'Reference',
  natural: 'Естественный',
  universal: 'Универсальный',
  balanced: 'Сбалансированный',
  club: 'Клуб',
  dance: 'Танцы',
  edm: 'EDM',
  synthwave: 'Синтвейв',
  deephouse: 'Deep House',
  rock: 'Рок',
  metal: 'Метал',
  hardrock: 'Хард-рок',
  grunge: 'Гранж',
  vocal: 'Вокал',
  podcast: 'Подкаст',
  speech: 'Речь',
  rap: 'Рэп',
  acoustic: 'Акустика',
  piano: 'Фортепиано',
  orchestra: 'Оркестр',
  classical: 'Классика',
  headphones: 'Наушники',
  car: 'Авто',
  night: 'Ночной',
  bassboost: 'Макс. Бас',
  jazz: 'Джаз',
  hiphop: 'Хип-хоп',
  soul: 'Соул',
  blues: 'Блюз',
  reggae: 'Регги',
  sunset: 'Закат',
  chill: 'Чилл',
  lofi: 'Lo-Fi',
  pop: 'Поп',
  kpop: 'K-Pop',
  world: 'World',
  ambient: 'Эмбиент',
  festival: 'Фестиваль',
  clarity: 'Четкость',
  wave: 'Wave/Phonk',
  phonk: 'Phonk/Drift',
  logitech: 'Logitech G321',
  maxboost: 'MAX BOOST ⚡',
  gaming: 'Игры',
  movie: 'Кино',
  fps: 'FPS',
  hifi: 'Hi-Fi',
  studio: 'Студия',
  premium: 'Премиум',
  master: 'Мастер'
};

export function initHotkeys() {
  console.log('⌨️ Инициализация горячих клавиш...');
  
  updateCommandDescriptions();
  
  if (typeof chrome !== 'undefined' && chrome.commands) {
    chrome.commands.onCommand.addListener((command) => {
      console.log(`⌨️ Горячая клавиша: ${command}`);
      handleHotkeyCommand(command);
    });
  }
  
  console.log('✅ Горячие клавиши инициализированы');
}

function handleHotkeyCommand(command) {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) return;
      
      switch (command) {
        case 'toggle_eq':
          toggleEqualizer();
          break;
        case 'next_preset':
          nextPreset();
          break;
        case 'reset_settings':
          resetAllSettings();
          break;
        case 'open_window':
          openEqualizerWindow();
          break;
        default:
          console.log(`⚠️ Неизвестная команда: ${command}`);
      }
    });
  }
}

function toggleEqualizer() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  
  chrome.storage.local.get(['isConnected'], (result) => {
    if (chrome.runtime.lastError) return;
    
    const isConnected = result.isConnected === true;
    
    if (isConnected) {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'disconnect' }, () => {
          if (chrome.runtime.lastError) return;
          showNotificationLocal(
            '🔊 SoundForge',
            getTranslationLocal('eq_disabled'),
            'info'
          );
          updateIconLocal(false);
        });
      }
    } else {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'connect' }, () => {
          if (chrome.runtime.lastError) return;
          showNotificationLocal(
            '🔊 SoundForge',
            getTranslationLocal('eq_enabled'),
            'success'
          );
          updateIconLocal(true);
        });
      }
    }
  });
}

const ALL_PRESETS_ORDER = [
  "flat",
  "natural",
  "universal",
  "balanced",
  "club",
  "dance",
  "edm",
  "synthwave",
  "deephouse",
  "festival",
  "rock",
  "metal",
  "hardrock",
  "grunge",
  "vocal",
  "podcast",
  "speech",
  "rap",
  "acoustic",
  "piano",
  "orchestra",
  "classical",
  "jazz",
  "headphones",
  "car",
  "night",
  "bassboost",
  "pop",
  "kpop",
  "world",
  "ambient",
  "wave",
  "phonk",
  "hiphop",
  "soul",
  "blues",
  "reggae",
  "chill",
  "lofi",
  "sunset",
  "logitech",
  "maxboost",
  "gaming",
  "movie",
  "fps",
  "hifi",
  "studio",
  "premium",
  "master",
  "clarity"
];

function nextPreset() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  
  chrome.storage.local.get(['selectedPreset', 'presetHistory'], (result) => {
    if (chrome.runtime.lastError) return;
    
    const currentPreset = result.selectedPreset || 'flat';
    const history = result.presetHistory || [];
    
    const allPresets = [
      'flat', 'natural', 'universal', 'balanced',
      'club', 'dance', 'edm', 'synthwave', 'deephouse',
      'rock', 'metal', 'hardrock', 'grunge',
      'vocal', 'podcast', 'speech', 'rap',
      'acoustic', 'piano', 'orchestra', 'classical',
      'headphones', 'car', 'night', 'bassboost',
      'jazz', 'hiphop', 'soul', 'blues', 'reggae',
      'sunset', 'chill', 'lofi', 'pop', 'kpop',
      'world', 'ambient', 'festival', 'clarity',
      'wave', 'phonk', 'logitech', 'maxboost',
      'gaming', 'movie', 'fps',
      'hifi', 'studio', 'premium', 'master'
    ];
    
    let currentIndex = allPresets.indexOf(currentPreset);
    if (currentIndex === -1) currentIndex = 0;
    
    const nextIndex = (currentIndex + 1) % allPresets.length;
    const nextPresetName = allPresets[nextIndex];
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ 
        action: 'applyPreset', 
        preset: nextPresetName 
      });
    }
    
    const newHistory = [...history, {
      preset: nextPresetName,
      timestamp: Date.now(),
      action: 'hotkey'
    }];
    if (newHistory.length > 100) newHistory.shift();
    
    chrome.storage.local.set({
      selectedPreset: nextPresetName,
      presetHistory: newHistory
    });
    
    const presetName = PRESET_NAMES[nextPresetName] || nextPresetName;
    showNotificationLocal(
      '🎵 SoundForge',
      `${getTranslationLocal('preset_changed')}: ${presetName}`,
      'info'
    );
  });
}

function resetAllSettings() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ 
      action: 'reset', 
      fullReset: true 
    });
  }
  
  const soundForgeKeys = [
    'eqSettings', 'volumeBoost', 'bassBoost', 'selectedPreset', 'theme', 'language',
    'savedVolume', 'savedBass', 'userPresets', 'siteSettings', 'settingsHistory',
    'soundforgeConnected', 'soundforgeAutoConnect', 'connectedTabs', 'autoConnectTabs',
    'nightMode', 'powerSaveMode', 'lastSite', 'nightModeAuto', 'autoDisableOnSiteChange',
    'presetHistory', 'isConnected'
  ];
  
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.remove(soundForgeKeys, function() {
      if (chrome.runtime.lastError) return;
      showNotificationLocal(
        '🔄 SoundForge',
        getTranslationLocal('settings_reset'),
        'warning'
      );
      updateIconLocal(false);
    });
  }
}

function openEqualizerWindow() {
  if (typeof chrome === 'undefined' || !chrome.windows) return;
  
  chrome.windows.create({
    url: chrome.runtime.getURL('window.html'),
    type: 'popup',
    width: 500,
    height: 750,
    top: 100,
    left: 100
  }, (window) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка открытия окна:', chrome.runtime.lastError);
    } else {
      console.log('🪟 Окно эквалайзера открыто');
    }
  });
}

function updateIconLocal(isActive) {
  if (typeof chrome === 'undefined') return;
  
  const iconPath = isActive 
    ? 'icons/SoundForge.png'
    : 'icons/SoundForge-off.png';
  
  try {
    if (chrome.action) {
      chrome.action.setIcon({
        path: {
          16: iconPath,
          48: iconPath,
          128: iconPath
        }
      });
      chrome.action.setBadgeText({ text: isActive ? '🔊' : '' });
      if (isActive) {
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      }
    } else if (chrome.browserAction) {
      chrome.browserAction.setIcon({
        path: {
          16: iconPath,
          48: iconPath,
          128: iconPath
        }
      });
      chrome.browserAction.setBadgeText({ text: isActive ? '🔊' : '' });
      if (isActive) {
        chrome.browserAction.setBadgeBackgroundColor({ color: '#4CAF50' });
      }
    }
  } catch (e) {
    console.warn('⚠️ Ошибка обновления иконки:', e);
  }
}

function updateCommandDescriptions() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  
  chrome.storage.local.get(['language'], (result) => {
    if (chrome.runtime.lastError) return;
    
    const lang = result.language || 'ru';
    const labels = HOTKEY_LABELS[lang] || HOTKEY_LABELS.en;
    
    const commands = ['toggle_eq', 'next_preset', 'reset_settings', 'open_window'];
    
    commands.forEach((cmd) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.commands && chrome.commands.update) {
          chrome.commands.update({
            name: cmd,
            description: labels[cmd] || cmd
          });
        }
      } catch (e) {}
    });
  });
}

function getTranslationLocal(key) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve(key);
      return;
    }
    chrome.storage.local.get(['language'], (result) => {
      if (chrome.runtime.lastError) {
        resolve(key);
        return;
      }
      const lang = result.language || 'ru';
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
      resolve(dict[key] || key);
    });
  });
}

function showNotificationLocal(title, message, type = 'info') {
  const types = {
    success: { icon: '✅', color: '#4CAF50' },
    info: { icon: 'ℹ️', color: '#2196F3' },
    warning: { icon: '⚠️', color: '#FF9800' },
    error: { icon: '❌', color: '#f44336' }
  };
  
  const info = types[type] || types.info;
  
  try {
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/SoundForge.png',
        title: title,
        message: message,
        priority: 1
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.log(`${info.icon} ${title}: ${message}`);
        }
      });
    } else {
      console.log(`${info.icon} ${title}: ${message}`);
    }
  } catch (e) {
    console.log(`${info.icon} ${title}: ${message}`);
  }
}

export default {
  initHotkeys,
  updateIconLocal,
  handleHotkeyCommand,
  showNotificationLocal,
  updateCommandDescriptions
};