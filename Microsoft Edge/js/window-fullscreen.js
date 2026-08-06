(function() {
  'use strict';

  /**
   * Применение состояния fullscreen
   */
  function applyState() {
    var isFullscreen = !!document.fullscreenElement;
    document.body.classList.toggle('fullscreen-expanded', isFullscreen);
  }

  /**
   * Переключение полноэкранного режима
   */
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        // Fallback: просто добавляем класс
        document.body.classList.toggle('fullscreen-expanded');
      }
    } catch (error) {
      console.warn('[SoundForge] Fullscreen toggle failed:', error);
      // Fallback при ошибке
      document.body.classList.toggle('fullscreen-expanded');
    }
    applyState();
  }

  /**
   * Вход в полноэкранный режим
   */
  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          document.body.classList.add('fullscreen-expanded');
        }
      }
    } catch (error) {
      console.warn('[SoundForge] Enter fullscreen failed:', error);
      document.body.classList.add('fullscreen-expanded');
    }
    applyState();
  }

  /**
   * Выход из полноэкранного режима
   */
  async function exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        document.body.classList.remove('fullscreen-expanded');
      }
    } catch (error) {
      console.warn('[SoundForge] Exit fullscreen failed:', error);
      document.body.classList.remove('fullscreen-expanded');
    }
    applyState();
  }

  /**
   * Проверка, находится ли окно в полноэкранном режиме
   */
  function isFullscreen() {
    return !!document.fullscreenElement || document.body.classList.contains('fullscreen-expanded');
  }

  /**
   * Настройка кнопки развернуть
   */
  function setupExpandButton() {
    var expandBtn = document.getElementById('expandToggle');
    if (!expandBtn) {
      // Ищем кнопку с классом expand-toggle или по data-атрибуту
      expandBtn = document.querySelector('.expand-toggle, [data-fullscreen-toggle]');
    }
    
    if (expandBtn) {
      expandBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleFullscreen();
      });
      
      // Обновляем иконку при изменении состояния
      document.addEventListener('fullscreenchange', function() {
        var isFs = !!document.fullscreenElement;
        expandBtn.textContent = isFs ? '⬛' : '⬜';
        expandBtn.setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Enter fullscreen');
      });
      
      // Устанавливаем начальную иконку
      expandBtn.textContent = document.fullscreenElement ? '⬛' : '⬜';
    }
  }

  /**
   * Настройка горячих клавиш
   */
  function setupHotkeys() {
    document.addEventListener('keydown', function(event) {
      // F11 - полноэкранный режим
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      }
      
      // Ctrl+Shift+F - альтернативный способ
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        toggleFullscreen();
      }
    });
  }

  /**
   * Синхронизация состояния при загрузке
   */
  function syncState() {
    // Проверяем, не был ли уже установлен fullscreen
    if (document.fullscreenElement) {
      document.body.classList.add('fullscreen-expanded');
    }
    applyState();
  }

  // ============================================
  //  CSS КЛАССЫ ДЛЯ FULLSCREEN
  // ============================================

  function injectFullscreenStyles() {
    var style = document.createElement('style');
    style.textContent = `
      body.fullscreen-expanded {
        width: 100% !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
        overflow-y: auto !important;
        padding: 20px !important;
      }
      
      body.fullscreen-expanded #spectrumCanvas {
        height: 120px !important;
      }
      
      body.fullscreen-expanded #eqGraphCanvas {
        height: 140px !important;
      }
      
      body.fullscreen-expanded .eq-graph-container {
        height: 180px !important;
      }
      
      body.fullscreen-expanded .eq-container {
        max-height: none !important;
      }
      
      body.fullscreen-expanded .visualization-container {
        padding: 12px 15px !important;
      }
      
      body.fullscreen-expanded .eq-graph-container {
        padding: 12px 10px 14px 22px !important;
      }
      
      body.fullscreen-expanded .slider-row {
        padding: 4px 6px !important;
      }
      
      body.fullscreen-expanded .slider-row .freq-label {
        font-size: 12px !important;
        min-width: 40px !important;
      }
      
      body.fullscreen-expanded .slider-row .gain-value {
        font-size: 13px !important;
        min-width: 36px !important;
      }
      
      body.fullscreen-expanded input[type="range"] {
        height: 6px !important;
      }
      
      body.fullscreen-expanded input[type="range"]::-webkit-slider-thumb {
        width: 18px !important;
        height: 18px !important;
      }
      
      body.fullscreen-expanded .extra-controls {
        padding: 12px 8px !important;
      }
      
      body.fullscreen-expanded .extra-control label {
        font-size: 10px !important;
      }
      
      body.fullscreen-expanded .extra-control .value-display {
        font-size: 12px !important;
      }
      
      body.fullscreen-expanded .preset-info {
        font-size: 12px !important;
        padding: 6px 14px !important;
      }
      
      body.fullscreen-expanded .preset-selector select {
        font-size: 13px !important;
        padding: 9px 40px 9px 16px !important;
      }
      
      body.fullscreen-expanded .extra-buttons .btn {
        padding: 5px 14px !important;
        font-size: 12px !important;
      }
      
      body.fullscreen-expanded .footer {
        padding-top: 14px !important;
        margin-top: 8px !important;
      }
      
      body.fullscreen-expanded .footer .author,
      body.fullscreen-expanded .footer .stats,
      body.fullscreen-expanded .footer .version {
        font-size: 12px !important;
      }
      
      body.fullscreen-expanded .volume-status {
        font-size: 9px !important;
        padding: 2px 10px !important;
      }
      
      body.fullscreen-expanded .status-bar {
        padding: 10px 16px !important;
      }
      
      body.fullscreen-expanded .header h1 {
        font-size: 26px !important;
      }
      
      body.fullscreen-expanded .lang-toggle,
      body.fullscreen-expanded .expand-toggle {
        width: 36px !important;
        height: 36px !important;
        font-size: 18px !important;
      }
      
      body.fullscreen-expanded .theme-option {
        width: 34px !important;
        height: 34px !important;
        font-size: 16px !important;
      }
      
      body.fullscreen-expanded .vu-meter {
        height: 18px !important;
      }
      
      body.fullscreen-expanded .vu-peak {
        height: 24px !important;
        top: -3px !important;
        width: 4px !important;
      }
      
      body.fullscreen-expanded .vu-value {
        font-size: 12px !important;
        min-width: 60px !important;
      }
      
      @media (max-width: 600px) {
        body.fullscreen-expanded #spectrumCanvas {
          height: 80px !important;
        }
        
        body.fullscreen-expanded #eqGraphCanvas {
          height: 90px !important;
        }
        
        body.fullscreen-expanded .eq-graph-container {
          height: 130px !important;
        }
        
        body.fullscreen-expanded .header h1 {
          font-size: 20px !important;
        }
        
        body.fullscreen-expanded .lang-toggle,
        body.fullscreen-expanded .expand-toggle {
          width: 30px !important;
          height: 30px !important;
          font-size: 14px !important;
        }
        
        body.fullscreen-expanded .theme-option {
          width: 28px !important;
          height: 28px !important;
          font-size: 13px !important;
        }
        
        body.fullscreen-expanded .btn {
          padding: 4px 12px !important;
          font-size: 11px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  //  ИНИЦИАЛИЗАЦИЯ
  // ============================================

  function init() {
    // Инъекция стилей
    injectFullscreenStyles();
    
    // Синхронизация состояния
    syncState();
    
    // Настройка кнопки
    setupExpandButton();
    
    // Настройка горячих клавиш
    setupHotkeys();
    
    // Слушаем изменения fullscreen
    document.addEventListener('fullscreenchange', applyState, { passive: true });
    document.addEventListener('webkitfullscreenchange', applyState, { passive: true });
    document.addEventListener('mozfullscreenchange', applyState, { passive: true });
    document.addEventListener('MSFullscreenChange', applyState, { passive: true });
    
    console.log('🪟 Fullscreen helper v3.22.8 инициализирован');
    console.log('⌨️ Нажмите F11 для переключения полноэкранного режима');
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

  window.SoundForgeFullscreen = {
    toggle: toggleFullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
    isFullscreen: isFullscreen,
    sync: applyState
  };

})();