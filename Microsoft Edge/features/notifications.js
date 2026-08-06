// ============================================
//  NOTIFICATIONS.JS - SoundForge v3.22.8 Edge 151
//  Microsoft Edge 151.0.4129.59 | Windows 11 25H2
//  Уведомления об обновлениях
//  3 языка: RU, UA, EN
//  EDGE OPTIMIZED: обработка ошибок notifications API
// ============================================

var edgeAPI = globalThis.browser || globalThis.chrome;
if (!edgeAPI?.runtime) throw new Error('Microsoft Edge extension API unavailable');

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
  edgeAPI.storage.local.get([STORAGE_KEY], function(result) {
    if (edgeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка проверки обновлений:', edgeAPI.runtime.lastError);
      return;
    }
    
    var lastCheck = result[STORAGE_KEY] || 0;
    var now = Date.now();
    
    if (now - lastCheck < CHECK_INTERVAL) {
      console.log('ℹ️ Проверка обновлений: ожидание');
      return;
    }
    
    edgeAPI.storage.local.set({ [STORAGE_KEY]: now }, function() {
      if (edgeAPI.runtime.lastError) {
        console.warn('⚠️ Ошибка сохранения времени проверки:', edgeAPI.runtime.lastError);
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
  edgeAPI.storage.local.get(['language'], function(result) {
    if (edgeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения языка:', edgeAPI.runtime.lastError);
      return;
    }
    
    var lang = result.language || 'ru';
    var messages = UPDATE_MESSAGES[lang] || UPDATE_MESSAGES.en;
    
    if (typeof edgeAPI === 'undefined' || !edgeAPI.notifications) {
      console.log('📢 ' + messages.title + ': ' + messages.message);
      return;
    }
    
    try {
      edgeAPI.notifications.create({
        type: 'basic',
        iconUrl: 'icons/SoundForge_128x128.png',
        title: messages.title,
        message: messages.message,
        buttons: [{ title: messages.button }],
        priority: 2,
        requireInteraction: true
      }, function(notificationId) {
        if (edgeAPI.runtime.lastError) {
          console.warn('⚠️ Ошибка создания уведомления:', edgeAPI.runtime.lastError);
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

if (!_notificationHandlersInitialized && typeof edgeAPI !== 'undefined' && edgeAPI.notifications) {
  _notificationHandlersInitialized = true;
  var openChangelog = function() {
    edgeAPI.tabs.create({ url: edgeAPI.runtime.getURL('Readme/%D0%A7%D1%82%D0%BE%20%D0%BD%D0%BE%D0%B2%D0%BE%D0%B3%D0%BE.txt') });
  };
  edgeAPI.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
    if (notificationId && buttonIndex === 0) openChangelog();
  });
  edgeAPI.notifications.onClicked.addListener(function(notificationId) {
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