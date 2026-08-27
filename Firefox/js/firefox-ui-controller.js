// ============================================
//  FIREFOX-UI-CONTROLLER.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  UI контроллер для Firefox
//  Общая защита connection state
//  Общая подгонка длинных надписей
//  Segoe UI Variable
//  Нет horizontal overflow
//  FIREFOX 153 OPTIMIZED: Forced Colors и Reduced Motion
// ============================================

(function initSoundForgeFirefoxUI(global) {
  'use strict';

  var CONNECTION_STATES = new Set(['connecting', 'connected', 'disconnected', 'error']);

  /**
   * Нормализация статуса - защита connection state
   * Информационные сообщения (ready) не должны заменять реальные состояния
   */
  function normalizeStatus(requested, current) {
    if (requested === 'ready' && CONNECTION_STATES.has(current)) return current;
    return requested;
  }

  /**
   * Подгонка текста для длинных надписей
   * Предотвращает horizontal overflow в Firefox
   */
  function fitText(root) {
    var scope = root || document;
    var targets = scope.querySelectorAll('button, .status-text, .preset-info, .volume-status, label, .btn, .site-info');
    
    targets.forEach(function(element) {
      element.style.maxWidth = '100%';
      element.style.overflowWrap = 'anywhere';
      element.style.wordBreak = 'break-word';
      
      if (element.scrollWidth > element.clientWidth && element.clientWidth > 0) {
        // Устанавливаем title только если текст обрезан
        var text = element.textContent || element.innerText || '';
        if (text.length > 0) {
          element.title = text.trim();
        }
        element.classList.add('sf-firefox-text-fit');
      } else {
        element.classList.remove('sf-firefox-text-fit');
        // Убираем title если текст помещается
        if (element.title) {
          element.title = '';
        }
      }
    });
  }

  var scheduled = 0;
  
  /**
   * Планирование подгонки текста с debounce
   */
  function scheduleFit(root) {
    cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(function() {
      fitText(root);
    });
  }

  /**
   * Принудительная подгонка текста
   */
  function forceFit(root) {
    fitText(root);
  }

  /**
   * Проверка поддержки Firefox 153 особенностей
   */
  function checkFirefoxSupport() {
    var ua = navigator.userAgent.toLowerCase();
    var isFirefox = ua.indexOf('firefox/') !== -1;
    var isFirefox153 = false;
    
    if (isFirefox) {
      var match = ua.match(/firefox\/(\d+)/);
      if (match && match[1]) {
        var version = parseInt(match[1], 10);
        isFirefox153 = version >= 153;
      }
    }
    
    return {
      isFirefox: isFirefox,
      isFirefox153: isFirefox153,
      supportsVariableFonts: isFirefox && isFirefox153
    };
  }

  /**
   * Применение Firefox-специфичных стилей
   */
  function applyFirefoxStyles() {
    var support = checkFirefoxSupport();
    
    if (support.isFirefox153) {
      // Segoe UI Variable для Firefox 153
      document.documentElement.style.setProperty('--sf-firefox-font', '"Segoe UI Variable Text", "Segoe UI", Arial, sans-serif');
    }
    
    // Forced Colors Mode (Windows High Contrast)
    if (window.matchMedia && window.matchMedia('(forced-colors: active)').matches) {
      document.documentElement.classList.add('sf-forced-colors');
    }
    
    // Reduced Motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('sf-reduced-motion');
    }
  }

  /**
   * Обработчик изменения темы
   */
  function handleThemeChange(theme) {
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    if (theme === 'system') {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.style.colorScheme = prefersDark ? 'dark' : 'light';
    } else {
      root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    }
    
    scheduleFit(document);
  }

  /**
   * Настройка MutationObserver для динамического контента
   */
  function setupMutationObserver() {
    var observer = new MutationObserver(function(mutations) {
      var shouldFit = false;
      
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldFit = true;
        }
        if (mutation.type === 'characterData') {
          shouldFit = true;
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          shouldFit = true;
        }
      });
      
      if (shouldFit) {
        scheduleFit(document);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    return observer;
  }

  // ============================================
  //  ИНИЦИАЛИЗАЦИЯ
  // ============================================

  var observer = null;

  function init() {
    // Применяем Firefox-специфичные стили
    applyFirefoxStyles();
    
    // Подгоняем текст
    fitText(document);
    
    // Настраиваем observer для динамического контента
    observer = setupMutationObserver();
    
    // Слушаем изменения темы через медиа-запросы
    if (window.matchMedia) {
      var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', function() {
        var theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'system') {
          handleThemeChange('system');
        }
      });
      
      // Forced Colors
      var forcedColorsQuery = window.matchMedia('(forced-colors: active)');
      forcedColorsQuery.addEventListener('change', function(e) {
        if (e.matches) {
          document.documentElement.classList.add('sf-forced-colors');
        } else {
          document.documentElement.classList.remove('sf-forced-colors');
        }
      });
      
      // Reduced Motion
      var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      reducedMotionQuery.addEventListener('change', function(e) {
        if (e.matches) {
          document.documentElement.classList.add('sf-reduced-motion');
        } else {
          document.documentElement.classList.remove('sf-reduced-motion');
        }
      });
    }
    
    console.log('✅ Firefox UI Controller v3.22.8 инициализирован');
    console.log('📊 Firefox 153 поддержка:', checkFirefoxSupport().isFirefox153);
  }

  // Запускаем инициализацию при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // ============================================
  //  ПУБЛИЧНЫЙ API
  // ============================================

  global.SoundForgeFirefoxUI = Object.freeze({
    normalizeStatus: normalizeStatus,
    fitText: fitText,
    scheduleFit: scheduleFit,
    forceFit: forceFit,
    handleThemeChange: handleThemeChange,
    checkFirefoxSupport: checkFirefoxSupport,
    applyFirefoxStyles: applyFirefoxStyles
  });

  // Слушаем resize для переподгонки
  global.addEventListener('resize', function() {
    scheduleFit(document);
  }, { passive: true });

  // Слушаем изменения ориентации экрана
  if (window.screen && window.screen.orientation) {
    window.screen.orientation.addEventListener('change', function() {
      setTimeout(function() {
        scheduleFit(document);
      }, 300);
    });
  }

})(globalThis);