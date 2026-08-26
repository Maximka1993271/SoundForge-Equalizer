// ============================================
//  NOTIFICATIONS.JS - SoundForge v3.22.8 Chrome 152
//  Google Chrome 152.0.7977.65 | Windows 11 25H2
//  Уведомления об обновлениях
//  3 языка: RU, UA, EN
//  CHROME 152 OPTIMIZED: обработка ошибок notifications API
// ============================================

var chromeAPI = globalThis.chrome;
if (!chromeAPI?.runtime) throw new Error('Google Chrome extension API unavailable');

var VERSION = '3.22.8';
var _notificationHandlersInitialized = false;
var STORAGE_KEY = 'lastUpdateNotification';
var CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Раз в день

var UPDATE_MESSAGES = {
  ru: {
    title: '🎵 SoundForge обновлен!',
    message: 'Версия ' + VERSION + ' доступна. Новые пресеты и улучшения!',
    button: 'Подробнее'
  },
  uk: {
    title: '🎵 SoundForge оновлено!',
    message: 'Версія ' + VERSION + ' доступна. Нові пресети та покращення!',
    button: 'Детальніше'
  },
  en: {
    title: '🎵 SoundForge updated!',
    message: 'Version ' + VERSION + ' available. New presets and improvements!',
    button: 'Learn more'
  }
};

// ============================================
//  ПРОВЕРКА ОБНОВЛЕНИЙ
// ============================================

export function checkForUpdates() {
  chromeAPI.storage.local.get([STORAGE_KEY], function(result) {
    if (chromeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка проверки обновлений:', chromeAPI.runtime.lastError);
      return;
    }
    
    var lastCheck = result[STORAGE_KEY] || 0;
    var now = Date.now();
    
    if (now - lastCheck < CHECK_INTERVAL) {
      console.log('ℹ️ Проверка обновлений: ожидание');
      return;
    }
    
    chromeAPI.storage.local.set({ [STORAGE_KEY]: now }, function() {
      if (chromeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка сохранения времени проверки:', chromeAPI.runtime.lastError);
        return;
      }
      showUpdateNotification();
    });
  });
}

// ============================================
//  ПОКАЗ УВЕДОМЛЕНИЯ
// ============================================

function showUpdateNotification() {
  chromeAPI.storage.local.get(['language'], function(result) {
    if (chromeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения языка:', chromeAPI.runtime.lastError);
      return;
    }
    
    var lang = result.language || 'ru';
    var messages = UPDATE_MESSAGES[lang] || UPDATE_MESSAGES.en;
    
    if (typeof chromeAPI === 'undefined' || !chromeAPI.notifications) {
      console.log('📢 ' + messages.title + ': ' + messages.message);
      return;
    }
    
    try {
      chromeAPI.notifications.create({
        type: 'basic',
        iconUrl: 'icons/SoundForge_128x128.png',
        title: messages.title,
        message: messages.message,
        buttons: [{ title: messages.button }],
        priority: 2,
        requireInteraction: true
      }, function(notificationId) {
        if (chromeAPI.runtime.lastError) {
          console.warn('⚠️ Ошибка создания уведомления:', chromeAPI.runtime.lastError);
        } else {
          console.log('📢 Показано уведомление об обновлении (' + lang + ')');
        }
      });
    } catch (e) {
      console.warn('⚠️ Ошибка показа уведомления:', e);
    }
  });
}

// ============================================
//  ОБРАБОТЧИК КЛИКА ПО УВЕДОМЛЕНИЮ
// ============================================

if (!_notificationHandlersInitialized && typeof chromeAPI !== 'undefined' && chromeAPI.notifications) {
  _notificationHandlersInitialized = true;
  var openChangelog = function() {
    chromeAPI.tabs.create({ url: chromeAPI.runtime.getURL('Readme/%D0%A7%D1%82%D0%BE%20%D0%BD%D0%BE%D0%B2%D0%BE%D0%B3%D0%BE.txt') });
  };
  chromeAPI.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
    if (notificationId && buttonIndex === 0) openChangelog();
  });
  chromeAPI.notifications.onClicked.addListener(function(notificationId) {
    if (notificationId) openChangelog();
  });
}

// ============================================
//  ПРИНУДИТЕЛЬНЫЙ ПОКАЗ УВЕДОМЛЕНИЯ
// ============================================

export function forceShowUpdateNotification() {
  showUpdateNotification();
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  checkForUpdates: checkForUpdates,
  forceShowUpdateNotification: forceShowUpdateNotification,
  VERSION: VERSION
};