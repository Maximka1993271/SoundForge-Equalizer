// ============================================
//  HOTKEYS.JS - Горячие клавиши (v3.22.8)
//  Поддержка 3 языков: RU, UA, EN
//  ИСПРАВЛЕНО: обработка ошибок commands.update
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

// ============================================
//  ИНИЦИАЛИЗАЦИЯ ГОРЯЧИХ КЛАВИШ
// ============================================

export function initHotkeys() {
  console.log('⌨️ Инициализация горячих клавиш...');
  
  updateCommandDescriptions();
  
  chrome.commands.onCommand.addListener((command) => {
    console.log(`⌨️ Горячая клавиша: ${command}`);
    handleHotkeyCommand(command);
  });
  
  console.log('✅ Горячие клавиши инициализированы');
}

// ============================================
//  ОБРАБОТЧИК КОМАНД
// ============================================

function handleHotkeyCommand(command) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs || tabs.length === 0) return;
    const tabId = tabs[0].id;
    
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
        console.log(`⚠️ Неизвестная команда: ${command}`);
    }
  });
}

// ============================================
//  ВКЛЮЧЕНИЕ/ВЫКЛЮЧЕНИЕ ЭКВАЛАЙЗЕРА
// ============================================

function toggleEqualizer(tabId) {
  chrome.storage.local.get(['isConnected'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка получения состояния:', chrome.runtime.lastError);
      return;
    }
    
    const isConnected = result.isConnected === true;
    
    if (isConnected) {
      chrome.runtime.sendMessage({ action: 'disconnect' }, () => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ Ошибка отключения:', chrome.runtime.lastError);
          return;
        }
        showNotification(
          '🔊 SoundForge',
          getTranslation('eq_disabled'),
          'info'
        );
        updateIcon(false);
      });
    } else {
      chrome.runtime.sendMessage({ action: 'connect' }, () => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ Ошибка подключения:', chrome.runtime.lastError);
          return;
        }
        showNotification(
          '🔊 SoundForge',
          getTranslation('eq_enabled'),
          'success'
        );
        updateIcon(true);
      });
    }
  });
}

// ============================================
//  СЛЕДУЮЩИЙ ПРЕСЕТ
// ============================================

function nextPreset(tabId) {
  chrome.storage.local.get(['selectedPreset', 'presetHistory'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка получения пресета:', chrome.runtime.lastError);
      return;
    }
    
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
    
    chrome.runtime.sendMessage({ 
      action: 'applyPreset', 
      preset: nextPresetName 
    });
    
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
    
    const presetNames = getPresetNames();
    showNotification(
      '🎵 SoundForge',
      `${getTranslation('preset_changed')}: ${presetNames[nextPresetName] || nextPresetName}`,
      'info'
    );
  });
}

// ============================================
//  СБРОС ВСЕХ НАСТРОЕК
// ============================================

function resetAllSettings(tabId) {
  chrome.runtime.sendMessage({ 
    action: 'reset', 
    fullReset: true 
  });
  
  chrome.storage.local.clear(() => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка очистки storage:', chrome.runtime.lastError);
    }
    showNotification(
      '🔄 SoundForge',
      getTranslation('settings_reset'),
      'warning'
    );
    updateIcon(false);
  });
}

// ============================================
//  ОТКРЫТИЕ ОКНА ЭКВАЛАЙЗЕРА
// ============================================

function openEqualizerWindow() {
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

// ============================================
//  ОБНОВЛЕНИЕ ИКОНКИ РАСШИРЕНИЯ
// ============================================

export function updateIcon(isActive) {
  const iconPath = isActive 
    ? 'icons/SoundForge.png'
    : 'icons/SoundForge-off.png';
  
  chrome.action.setIcon({
    path: {
      16: iconPath,
      48: iconPath,
      128: iconPath
    }
  }, () => {
    if (chrome.runtime.lastError) {
      // Игнорируем ошибку
    }
  });
  
  chrome.action.setBadgeText({
    text: isActive ? '🔊' : ''
  });
  
  if (isActive) {
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  }
}

// ============================================
//  ОБНОВЛЕНИЕ ОПИСАНИЙ КОМАНД
// ============================================

function updateCommandDescriptions() {
  chrome.storage.local.get(['language'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка получения языка:', chrome.runtime.lastError);
      return;
    }
    
    const lang = result.language || 'ru';
    const labels = HOTKEY_LABELS[lang] || HOTKEY_LABELS.en;
    
    const commands = [
      'toggle_eq',
      'next_preset',
      'reset_settings',
      'open_window'
    ];
    
    commands.forEach((cmd) => {
      try {
        chrome.commands.update({
          name: cmd,
          description: labels[cmd] || cmd
        });
      } catch (e) {
        console.warn(`⚠️ Ошибка обновления команды ${cmd}:`, e);
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
//  ПЕРЕВОДЫ ДЛЯ УВЕДОМЛЕНИЙ
// ============================================

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

function getTranslation(key) {
  return new Promise((resolve) => {
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

// ============================================
//  УВЕДОМЛЕНИЯ
// ============================================

function showNotification(title, message, type = 'info') {
  const types = {
    success: { icon: '✅', color: '#4CAF50' },
    info: { icon: 'ℹ️', color: '#2196F3' },
    warning: { icon: '⚠️', color: '#FF9800' },
    error: { icon: '❌', color: '#f44336' }
  };
  
  const info = types[type] || types.info;
  
  try {
    // Проверяем доступность notifications API
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

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  initHotkeys,
  updateIcon,
  handleHotkeyCommand,
  showNotification
};