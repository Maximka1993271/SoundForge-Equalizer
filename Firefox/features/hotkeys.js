// ============================================
//  HOTKEYS.JS - Горячие клавиши (v3.22.8)
//  Поддержка 3 языков: RU, UA, EN
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
  
  // Устанавливаем дескрипции команд
  updateCommandDescriptions();
  
  // Обработчик команд
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
    if (!tabs || tabs.length === 0) return;
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
  // Проверяем текущее состояние
  chrome.storage.local.get(['isConnected'], (result) => {
    const isConnected = result.isConnected === true;
    
    if (isConnected) {
      // Отключаем
      chrome.runtime.sendMessage({ action: 'disconnect' }, () => {
        showNotification(
          '🔊 SoundForge',
          getTranslation('eq_disabled'),
          'info'
        );
        updateIcon(false);
      });
    } else {
      // Включаем
      chrome.runtime.sendMessage({ action: 'connect' }, () => {
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
    const currentPreset = result.selectedPreset || 'flat';
    const history = result.presetHistory || [];
    
    // Все пресеты в порядке
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
    
    // Применяем пресет
    chrome.runtime.sendMessage({ 
      action: 'applyPreset', 
      preset: nextPresetName 
    });
    
    // Сохраняем историю
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
    console.log('🪟 Окно эквалайзера открыто');
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
        // Игнорируем ошибки
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
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/SoundForge.png',
      title: title,
      message: message,
      priority: 1
    });
  } catch (e) {
    // Fallback: просто логируем
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