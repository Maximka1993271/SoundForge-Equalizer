// ============================================
//  NOTIFICATIONS.JS - Уведомления об обновлениях (v3.22.8)
//  3 языка: RU, UA, EN
//  ИСПРАВЛЕНО: Firefox не поддерживает "buttons"
//  ИСПРАВЛЕНО: синтаксическая ошибка
// ============================================

(function() {
  'use strict';

  const VERSION = '3.22.8';
  const STORAGE_KEY = 'lastUpdateNotification';
  const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

  const UPDATE_MESSAGES = {
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
  //  ПРОВЕРКА БРАУЗЕРА
  // ============================================

  function isFirefox() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;
  }

  // ============================================
  //  ПОКАЗ УВЕДОМЛЕНИЯ
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
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        var options = {
          type: 'basic',
          iconUrl: 'icons/SoundForge.png',
          title: title,
          message: message,
          priority: 1
        };
        
        // Firefox НЕ поддерживает buttons
        if (!isFirefox()) {
          options.buttons = [{ title: 'OK' }];
        }
        
        chrome.notifications.create(options, function(notificationId) {
          if (chrome.runtime && chrome.runtime.lastError) {
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
  //  ПРОВЕРКА ОБНОВЛЕНИЙ
  // ============================================

  function checkForUpdates() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    
    chrome.storage.local.get([STORAGE_KEY], function(result) {
      if (chrome.runtime.lastError) return;
      
      var lastCheck = result[STORAGE_KEY] || 0;
      var now = Date.now();
      
      if (now - lastCheck < CHECK_INTERVAL) {
        console.log('ℹ️ Проверка обновлений: ожидание');
        return;
      }
      
      chrome.storage.local.set({ [STORAGE_KEY]: now }, function() {
        if (chrome.runtime.lastError) return;
        showUpdateNotification();
      });
    });
  }

  // ============================================
  //  ПОКАЗ УВЕДОМЛЕНИЯ ОБ ОБНОВЛЕНИИ
  // ============================================

  function showUpdateNotification() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    
    chrome.storage.local.get(['language'], function(result) {
      if (chrome.runtime.lastError) return;
      
      var lang = result.language || 'ru';
      var messages = UPDATE_MESSAGES[lang] || UPDATE_MESSAGES.en;
      
      try {
        if (typeof chrome !== 'undefined' && chrome.notifications) {
          var options = {
            type: 'basic',
            iconUrl: 'icons/SoundForge.png',
            title: messages.title,
            message: messages.message,
            priority: 2,
            requireInteraction: true
          };
          
          // Firefox НЕ поддерживает buttons
          if (!isFirefox()) {
            options.buttons = [{ title: messages.button }];
          }
          
          chrome.notifications.create(options, function(notificationId) {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.log('📢 ' + messages.title + ': ' + messages.message);
            }
          });
          
          console.log('📢 Показано уведомление об обновлении (' + lang + ')');
        } else {
          console.log('📢 ' + messages.title + ': ' + messages.message);
        }
      } catch (e) {
        console.warn('⚠️ Ошибка показа уведомления:', e);
      }
    });
  }

  // ============================================
  //  ОБРАБОТЧИКИ УВЕДОМЛЕНИЙ
  // ============================================

  if (typeof chrome !== 'undefined' && chrome.notifications) {
    // Firefox не поддерживает onButtonClicked
    if (chrome.notifications.onButtonClicked) {
      chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
        if (notificationId && buttonIndex === 0) {
          chrome.tabs.create({
            url: 'https://github.com/yourusername/soundforge/releases'
          });
        }
      });
    }

    chrome.notifications.onClicked.addListener(function(notificationId) {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.openOptionsPage();
      }
    });
  }

  // ============================================
  //  ПРИНУДИТЕЛЬНЫЙ ПОКАЗ УВЕДОМЛЕНИЯ
  // ============================================

  function forceShowUpdateNotification() {
    showUpdateNotification();
  }

  // ============================================
  //  ЭКСПОРТ
  // ============================================

  window.SoundForgeNotifications = {
    showNotification: showNotification,
    checkForUpdates: checkForUpdates,
    forceShowUpdateNotification: forceShowUpdateNotification,
    VERSION: VERSION
  };

  // Экспорт для модулей
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      showNotification: showNotification,
      checkForUpdates: checkForUpdates,
      forceShowUpdateNotification: forceShowUpdateNotification,
      VERSION: VERSION
    };
  }

})();