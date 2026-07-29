// ============================================
//  NOTIFICATIONS.JS - Уведомления об обновлениях (v3.22.8)
//  3 языка: RU, UA, EN
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
    const lastCheck = result[STORAGE_KEY] || 0;
    const now = Date.now();
    
    // Проверяем только если прошло больше CHECK_INTERVAL
    if (now - lastCheck < CHECK_INTERVAL) {
      console.log('ℹ️ Проверка обновлений: ожидание');
      return;
    }
    
    // Сохраняем время проверки
    chrome.storage.local.set({ [STORAGE_KEY]: now });
    
    // Показываем уведомление о новой версии
    showUpdateNotification();
  });
}

// ============================================
//  ПОКАЗ УВЕДОМЛЕНИЯ
// ============================================

function showUpdateNotification() {
  chrome.storage.local.get(['language'], (result) => {
    const lang = result.language || 'ru';
    const messages = UPDATE_MESSAGES[lang] || UPDATE_MESSAGES.en;
    
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/SoundForge.png',
        title: messages.title,
        message: messages.message,
        buttons: [{ title: messages.button }],
        priority: 2,
        requireInteraction: true
      });
      
      console.log(`📢 Показано уведомление об обновлении (${lang})`);
    } catch (e) {
      console.warn('⚠️ Ошибка показа уведомления:', e);
    }
  });
}

// ============================================
//  ОБРАБОТЧИК КЛИКА ПО УВЕДОМЛЕНИЮ
// ============================================

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId && buttonIndex === 0) {
    // Открываем страницу с информацией об обновлении
    chrome.tabs.create({
      url: 'https://github.com/yourusername/soundforge/releases'
    });
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  // Открываем настройки
  chrome.runtime.openOptionsPage();
});

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