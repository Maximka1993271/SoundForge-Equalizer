//  HOTKEYS.JS - SoundForge v3.22.8 Chrome 152
//  Google Chrome 152.0.7977.65 | Windows 11 25H2
//  Горячие клавиши
//  Поддержка 3 языков: RU, UA, EN
//  CHROME 152 OPTIMIZED: обработка ошибок commands.update
// ============================================

var chromeAPI = globalThis.chrome;
if (!chromeAPI?.runtime) throw new Error('Google Chrome extension API unavailable');

var _hotkeysInitialized = false;

var HOTKEY_LABELS = {
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

// ============================================
//  ИНИЦИАЛИЗАЦИЯ ГОРЯЧИХ КЛАВИШ
// ============================================

export function initHotkeys() {
  if (_hotkeysInitialized) return;
  _hotkeysInitialized = true;
  console.log('⌨️ Инициализация горячих клавиш...');
  
  updateCommandDescriptions();
  
  chromeAPI.commands.onCommand.addListener(function(command) {
    console.log('⌨️ Горячая клавиша:', command);
    handleHotkeyCommand(command);
  });
  
  console.log('✅ Горячие клавиши инициализированы');
}

// ============================================
//  ОБРАБОТЧИК КОМАНД
// ============================================

function handleHotkeyCommand(command) {
  chromeAPI.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (chromeAPI.runtime.lastError || !tabs || tabs.length === 0) return;
    var tabId = tabs[0].id;
    
    switch (command) {
      case 'toggle_eq':
        toggleEqualizer(tabId);
        break;
        
      case 'next_preset':
        nextPreset(tabId);
        break;
        
      case 'reset_settings':
        resetAllSettings(tabId);
        break;
        
      case 'open_window':
        openEqualizerWindow();
        break;
        
      default:
        console.log('⚠️ Неизвестная команда:', command);
    }
  });
}

// ============================================
//  ВКЛЮЧЕНИЕ/ВЫКЛЮЧЕНИЕ ЭКВАЛАЙЗЕРА
// ============================================

function toggleEqualizer(tabId) {
  chromeAPI.runtime.sendMessage({ action: 'getStatus', targetTabId: tabId }, function(statusResponse) {
    if (chromeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения состояния:', chromeAPI.runtime.lastError);
      return;
    }
    var isConnected = statusResponse && statusResponse.status === 'connected';
    var action = isConnected ? 'disconnect' : 'connect';
    chromeAPI.runtime.sendMessage({ action: action, targetTabId: tabId, source: 'hotkey' }, function(response) {
      if (chromeAPI.runtime.lastError || !response || response.status === 'error') {
        console.warn('⚠️ Ошибка команды ' + action + ':', chromeAPI.runtime.lastError || response);
        return;
      }
      var connected = action === 'connect';
      showNotification('🔊 SoundForge', getTranslationSync(connected ? 'eq_enabled' : 'eq_disabled'), connected ? 'success' : 'info');
      updateIcon(connected);
    });
  });
}

// ============================================
//  СЛЕДУЮЩИЙ ПРЕСЕТ
// ============================================

function nextPreset(tabId) {
  chromeAPI.storage.local.get(['selectedPreset', 'presetHistory'], function(result) {
    if (chromeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения пресета:', chromeAPI.runtime.lastError);
      return;
    }
    
    var currentPreset = result.selectedPreset || 'flat';
    var history = result.presetHistory || [];
    
    var allPresets = [
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
    
    var currentIndex = allPresets.indexOf(currentPreset);
    if (currentIndex === -1) currentIndex = 0;
    
    var nextIndex = (currentIndex + 1) % allPresets.length;
    var nextPresetName = allPresets[nextIndex];
    
    chromeAPI.runtime.sendMessage({ 
      action: 'applyPreset', 
      preset: nextPresetName,
      targetTabId: tabId,
      source: 'hotkey' 
    });
    
    var newHistory = history.concat([{
      preset: nextPresetName,
      timestamp: Date.now(),
      action: 'hotkey'
    }]);
    if (newHistory.length > 100) newHistory.shift();
    
    chromeAPI.storage.local.set({
      selectedPreset: nextPresetName,
      presetHistory: newHistory
    });
    
    var presetNames = getPresetNames();
    showNotification(
      '🎵 SoundForge',
      getTranslationSync('preset_changed') + ': ' + (presetNames[nextPresetName] || nextPresetName),
      'info'
    );
  });
}

// ============================================
//  СБРОС ВСЕХ НАСТРОЕК
// ============================================

function resetAllSettings(tabId) {
  chromeAPI.runtime.sendMessage({ action: 'reset', fullReset: true, targetTabId: tabId, source: 'hotkey' }, function(response) {
    if (chromeAPI.runtime.lastError || !response || response.status === 'error') {
      console.warn('⚠️ Ошибка сброса:', chromeAPI.runtime.lastError || response);
      return;
    }
    showNotification('🔄 SoundForge', getTranslationSync('settings_reset'), 'warning');
    updateIcon(false);
  });
}

// ============================================
//  ОТКРЫТИЕ ОКНА ЭКВАЛАЙЗЕРА
// ============================================

function openEqualizerWindow() {
  chromeAPI.windows.create({
    url: chromeAPI.runtime.getURL('window.html'),
    type: 'popup',
    width: 560,
    height: 820,
    top: 100,
    left: 100
  }, function(window) {
    if (chromeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка открытия окна:', chromeAPI.runtime.lastError);
    } else {
      console.log('🪟 Окно эквалайзера открыто');
    }
  });
}

// ============================================
//  ОБНОВЛЕНИЕ ИКОНКИ РАСШИРЕНИЯ
// ============================================

export function updateIcon(isActive) {
  var iconPath = isActive 
    ? 'icons/SoundForge_128x128.png'
    : 'icons/SoundForge-off_128x128.png';
  
  chromeAPI.action.setIcon({
    path: {
      16: iconPath,
      48: iconPath,
      128: iconPath
    }
  }, function() {
    if (chromeAPI.runtime.lastError) {
      // Игнорируем ошибку
    }
  });
  
  chromeAPI.action.setBadgeText({
    text: isActive ? '🔊' : ''
  });
  
  if (isActive) {
    chromeAPI.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  }
}

// ============================================
//  ОБНОВЛЕНИЕ ОПИСАНИЙ КОМАНД
// ============================================

function updateCommandDescriptions() {
  chromeAPI.storage.local.get(['language'], function(result) {
    if (chromeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения языка:', chromeAPI.runtime.lastError);
      return;
    }
    
    var lang = result.language || 'ru';
    var labels = HOTKEY_LABELS[lang] || HOTKEY_LABELS.en;
    
    var commands = [
      'toggle_eq',
      'next_preset',
      'reset_settings',
      'open_window'
    ];
    
    commands.forEach(function(cmd) {
      try {
        chromeAPI.commands.update({
          name: cmd,
          description: labels[cmd] || cmd
        });
      } catch (e) {
        console.warn('⚠️ Ошибка обновления команды', cmd, ':', e);
      }
    });
  });
}

// ============================================
//  ПОЛУЧЕНИЕ НАЗВАНИЙ ПРЕСЕТОВ
// ============================================

function getPresetNames() {
  return {
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
}

// ============================================
//  ПЕРЕВОДЫ ДЛЯ УВЕДОМЛЕНИЙ (СИНХРОННЫЙ ВАРИАНТ)
// ============================================

var TRANSLATIONS = {
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

function getTranslationSync(key) {
  try {
    var lang = localStorage.getItem('soundforge_language') || 'ru';
    var dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return dict[key] || key;
  } catch (e) {
    return key;
  }
}

// ============================================
//  УВЕДОМЛЕНИЯ
// ============================================

function showNotification(title, message, type) {
  type = type || 'info';
  var types = {
    success: { icon: '✅', color: '#4CAF50' },
    info: { icon: 'ℹ️', color: '#2196F3' },
    warning: { icon: '⚠️', color: '#FF9800' },
    error: { icon: '❌', color: '#f44336' }
  };
  
  var info = types[type] || types.info;
  
  try {
    if (typeof chromeAPI !== 'undefined' && chromeAPI.notifications) {
      chromeAPI.notifications.create({
        type: 'basic',
        iconUrl: 'icons/SoundForge_128x128.png',
        title: title,
        message: message,
        priority: 1
      }, function(notificationId) {
        if (chromeAPI.runtime.lastError) {
          console.log(info.icon + ' ' + title + ': ' + message);
        }
      });
    } else {
      console.log(info.icon + ' ' + title + ': ' + message);
    }
  } catch (e) {
    console.log(info.icon + ' ' + title + ': ' + message);
  }
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  initHotkeys: initHotkeys,
  updateIcon: updateIcon,
  handleHotkeyCommand: handleHotkeyCommand,
  showNotification: showNotification
};