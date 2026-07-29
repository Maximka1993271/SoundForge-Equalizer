// ============================================
//  NOTIFICATIONS.JS - Уведомления об обновлениях (v3.22.8)
//  3 языка: RU, UA, EN
//  ИСПРАВЛЕНО: обработка ошибок notifications API
// ============================================

const VERSION = '3.22.8';
const STORAGE_KEY = 'lastUpdateNotification';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Раз в день

const UPDATE_MESSAGES = {
  ru: {
    title: '🎵 SoundForge обновлен!',
    message: `Версия ${VERSION} доступна. Новые пресеты и улучшения!`,
    button: 'Подробнее'
  },
  uk: {
    title: '🎵 SoundForge оновлено!',
    message: `Версія ${VERSION} доступна. Нові пресети та покращення!`,
    button: 'Детальніше'
  },
  en: {
    title: '🎵 SoundForge updated!',
    message: `Version ${VERSION} available. New presets and improvements!`,
    button: 'Learn more'
  }
};

// ============================================
//  ПРОВЕРКА ОБНОВЛЕНИЙ
// ============================================

export function checkForUpdates() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка проверки обновлений:', chrome.runtime.lastError);
      return;
    }
    
    const lastCheck = result[STORAGE_KEY] || 0;
    const now = Date.now();
    
    if (now - lastCheck < CHECK_INTERVAL) {
      console.log('ℹ️ Проверка обновлений: ожидание');
      return;
    }
    
    chrome.storage.local.set({ [STORAGE_KEY]: now }, () => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Ошибка сохранения времени проверки:', chrome.runtime.lastError);
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
  chrome.storage.local.get(['language'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка получения языка:', chrome.runtime.lastError);
      return;
    }
    
    const lang = result.language || 'ru';
    const messages = UPDATE_MESSAGES[lang] || UPDATE_MESSAGES.en;
    
    // Проверяем доступность notifications API
    if (typeof chrome === 'undefined' || !chrome.notifications) {
      console.log(`📢 ${messages.title}: ${messages.message}`);
      return;
    }
    
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/SoundForge.png',
        title: messages.title,
        message: messages.message,
        buttons: [{ title: messages.button }],
        priority: 2,
        requireInteraction: true
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ Ошибка создания уведомления:', chrome.runtime.lastError);
        } else {
          console.log(`📢 Показано уведомление об обновлении (${lang})`);
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

if (typeof chrome !== 'undefined' && chrome.notifications) {
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId && buttonIndex === 0) {
      chrome.tabs.create({
        url: 'https://github.com/yourusername/soundforge/releases'
      });
    }
  });

  chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.runtime.openOptionsPage();
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
  checkForUpdates,
  forceShowUpdateNotification,
  VERSION
};