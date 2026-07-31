// ============================================
//  WINDOW-FULLSCREEN.JS - Fullscreen support for window
//  v3.22.8 (Chrome MV3)
// ============================================

(function() {
  'use strict';

  console.log('🪟 SoundForge Window Fullscreen v3.22.8');

  // ============================================
  //  СОСТОЯНИЕ
  // ============================================

  let _isFullscreen = false;
  let _expandBtn = null;
  let _body = null;

  // ============================================
  //  ИНИЦИАЛИЗАЦИЯ
  // ============================================

  function initFullscreen() {
    _body = document.body;
    _expandBtn = document.querySelector('.expand-toggle');

    if (!_expandBtn) {
      console.warn('⚠️ Кнопка expand-toggle не найдена');
      return;
    }

    // Проверяем сохраненное состояние
    chrome.storage.local.get(['popupExpanded'], (result) => {
      if (result.popupExpanded === true) {
        toggleFullscreen();
      }
    });

    // Добавляем обработчик
    _expandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
    });

    // Обработчик Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _isFullscreen) {
        toggleFullscreen();
      }
    });

    // Обработчик изменения полноэкранного режима
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && _isFullscreen) {
        _isFullscreen = false;
        updateButtonState();
        chrome.storage.local.set({ popupExpanded: false });
      }
    });

    console.log('✅ Fullscreen поддержка инициализирована');
  }

  // ============================================
  //  ПЕРЕКЛЮЧЕНИЕ FULLSCREEN
  // ============================================

  function toggleFullscreen() {
    if (_isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  function enterFullscreen() {
    try {
      const elem = document.documentElement;
      
      if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => {
          _isFullscreen = true;
          updateButtonState();
          chrome.storage.local.set({ popupExpanded: true });
          _body.classList.add('fullscreen-expanded');
          console.log('🪟 Fullscreen включен');
        }).catch((err) => {
          console.warn('⚠️ Ошибка fullscreen:', err);
          // Fallback: просто растягиваем окно
          fallbackExpand();
        });
      } else {
        fallbackExpand();
      }
    } catch (e) {
      console.warn('⚠️ Ошибка fullscreen:', e);
      fallbackExpand();
    }
  }

  function exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
          _isFullscreen = false;
          updateButtonState();
          chrome.storage.local.set({ popupExpanded: false });
          _body.classList.remove('fullscreen-expanded');
          console.log('🪟 Fullscreen выключен');
        }).catch((err) => {
          console.warn('⚠️ Ошибка выхода из fullscreen:', err);
          fallbackCollapse();
        });
      } else {
        fallbackCollapse();
      }
    } catch (e) {
      console.warn('⚠️ Ошибка выхода из fullscreen:', e);
      fallbackCollapse();
    }
  }

  // ============================================
  //  FALLBACK (если fullscreen API недоступен)
  // ============================================

  function fallbackExpand() {
    _isFullscreen = true;
    updateButtonState();
    chrome.storage.local.set({ popupExpanded: true });
    _body.classList.add('fullscreen-expanded');
    _body.style.width = '100%';
    _body.style.maxHeight = '100vh';
    _body.style.borderRadius = '0';
    console.log('🪟 Fallback: окно развернуто');
  }

  function fallbackCollapse() {
    _isFullscreen = false;
    updateButtonState();
    chrome.storage.local.set({ popupExpanded: false });
    _body.classList.remove('fullscreen-expanded');
    _body.style.width = '';
    _body.style.maxHeight = '';
    _body.style.borderRadius = '';
    console.log('🪟 Fallback: окно свернуто');
  }

  // ============================================
  //  ОБНОВЛЕНИЕ КНОПКИ
  // ============================================

  function updateButtonState() {
    if (!_expandBtn) return;
    
    if (_isFullscreen) {
      _expandBtn.textContent = '⬛';
      _expandBtn.style.color = '#4CAF50';
      _expandBtn.title = 'Выйти из полноэкранного режима';
    } else {
      _expandBtn.textContent = '⬜';
      _expandBtn.style.color = '';
      _expandBtn.title = 'Развернуть на весь экран';
    }
  }

  // ============================================
  //  ДОПОЛНИТЕЛЬНЫЕ СТИЛИ ДЛЯ FULLSCREEN
  // ============================================

  function addFullscreenStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .fullscreen-expanded .header h1 {
        font-size: 28px !important;
      }
      .fullscreen-expanded .status-bar {
        padding: 12px 20px !important;
        margin-bottom: 16px !important;
      }
      .fullscreen-expanded .btn {
        padding: 8px 20px !important;
        font-size: 14px !important;
      }
      .fullscreen-expanded .slider-row {
        padding: 6px 10px !important;
      }
      .fullscreen-expanded .slider-row .freq-label {
        font-size: 14px !important;
        min-width: 50px !important;
      }
      .fullscreen-expanded .slider-row .gain-value {
        font-size: 16px !important;
        min-width: 40px !important;
      }
      .fullscreen-expanded .extra-controls {
        padding: 16px 12px !important;
      }
      .fullscreen-expanded .extra-control label {
        font-size: 14px !important;
      }
      .fullscreen-expanded .extra-control .value-display {
        font-size: 16px !important;
      }
      .fullscreen-expanded .preset-selector select {
        font-size: 16px !important;
        padding: 12px 40px 12px 16px !important;
      }
      .fullscreen-expanded .footer .author,
      .fullscreen-expanded .footer .stats,
      .fullscreen-expanded .footer .version {
        font-size: 14px !important;
      }
      .fullscreen-expanded .extra-buttons .btn {
        padding: 8px 16px !important;
        font-size: 14px !important;
      }
      .fullscreen-expanded .preset-info {
        font-size: 16px !important;
        padding: 8px 16px !important;
      }
      .fullscreen-expanded #spectrumCanvas {
        height: 120px !important;
      }
      .fullscreen-expanded #eqGraphCanvas {
        height: 140px !important;
      }
      .fullscreen-expanded .eq-graph-container {
        height: 180px !important;
      }
      .fullscreen-expanded .eq-graph-left-values {
        font-size: 12px !important;
        height: 110px !important;
      }
      .fullscreen-expanded .eq-graph-right-values {
        font-size: 12px !important;
        gap: 14px !important;
      }
      .fullscreen-expanded .eq-graph-labels {
        font-size: 12px !important;
      }
      .fullscreen-expanded .freq-labels {
        font-size: 11px !important;
        padding: 0 60px 0 60px !important;
      }
      .fullscreen-expanded .spectrum-labels {
        font-size: 11px !important;
      }
      .fullscreen-expanded .volume-status {
        font-size: 12px !important;
        padding: 4px 14px !important;
      }
      .fullscreen-expanded .vu-meter {
        height: 20px !important;
      }
      .fullscreen-expanded .vu-peak {
        height: 26px !important;
        top: -3px !important;
        width: 4px !important;
      }
      .fullscreen-expanded .vu-value {
        font-size: 16px !important;
        min-width: 70px !important;
      }
      .fullscreen-expanded .lang-toggle,
      .fullscreen-expanded .expand-toggle,
      .fullscreen-expanded .close-window {
        width: 40px !important;
        height: 40px !important;
        font-size: 20px !important;
      }
      .fullscreen-expanded .theme-option {
        width: 40px !important;
        height: 40px !important;
        font-size: 18px !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  //  ЗАПУСК
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      addFullscreenStyles();
      initFullscreen();
    });
  } else {
    addFullscreenStyles();
    initFullscreen();
  }

  // Экспортируем функции для использования из window.js
  window.SoundForgeFullscreen = {
    toggleFullscreen,
    isFullscreen: () => _isFullscreen,
    updateButtonState
  };

  console.log('✅ Window Fullscreen модуль загружен');

})();