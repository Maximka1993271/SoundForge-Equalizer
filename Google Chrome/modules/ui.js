// ============================================
//  UI.JS - SoundForge v3.22.8 Chrome 152
//  Google Chrome 152.0.7977.65 | Windows 11 25H2
//  Обновление интерфейса
//  CHROME 152 OPTIMIZED: обработка ошибок в updateSiteInfo
//  CHROME 152 OPTIMIZED: защита connection-state для UI-сообщений
// ============================================

import { state, dom, updateState } from './state.js';
import { t, getCurrentLang } from './i18n.js';
import { PRESETS, PRESET_INFO } from './config.js';

const chromeAPI = globalThis.chrome;
if (!chromeAPI?.runtime) throw new Error('Google Chrome extension API unavailable');

// ============================================
//  СОСТОЯНИЯ ПОДКЛЮЧЕНИЯ (для защиты)
// ============================================

const CONNECTION_STATES = new Set(['connecting', 'connected', 'disconnected', 'error']);

function normalizeStatus(requested, current) {
  if (requested === 'ready' && CONNECTION_STATES.has(current)) return current;
  return requested;
}

// ============================================
//  УСТАНОВКА СТАТУСА (С ЗАЩИТОЙ)
// ============================================

export function setStatus(status, text) {
  // `ready` часто используется для коротких информационных сообщений.
  // Оно не должно заменять реальное состояние подключения.
  const previousStatus = state.currentStatus;
  const preserveConnectionState = status === 'ready' &&
    ['connected', 'connecting', 'disconnected'].includes(previousStatus);
  const effectiveStatus = preserveConnectionState ? previousStatus : status;
  
  if (!preserveConnectionState) updateState({ currentStatus: status });
  
  const dot = dom.statusDot;
  const txt = dom.statusText;
  const btn = dom.connectBtn;

  if (dot) {
    dot.className = 'status-dot';
    if (effectiveStatus === 'connected') dot.classList.add('active');
    else if (effectiveStatus === 'connecting') dot.classList.add('connecting');
    else if (effectiveStatus === 'disconnected') dot.classList.add('inactive');
    else if (effectiveStatus === 'reset') dot.classList.add('reset');
  }
  if (txt) {
    txt.className = 'status-text';
    txt.textContent = text || t('status_ready');
  }
  updateConnectButton(effectiveStatus);
}

// ============================================
//  ОБНОВЛЕНИЕ КНОПКИ ПОДКЛЮЧЕНИЯ
// ============================================

export function updateConnectButton(status) {
  const btn = dom.connectBtn;
  if (!btn) return;
  
  if (status === 'connected') {
    btn.textContent = t('disconnect');
    btn.className = 'btn btn-connect disconnect';
  } else if (status === 'connecting') {
    btn.textContent = t('connecting');
    btn.className = 'btn btn-connect';
    btn.style.opacity = '0.7';
  } else {
    btn.textContent = t('connect');
    btn.className = 'btn btn-connect';
    btn.style.opacity = '1';
  }
}

// ============================================
//  ОБНОВЛЕНИЕ ИНФОРМАЦИИ О ПРЕСЕТЕ
// ============================================

export function updatePresetInfo(name) {
  const el = dom.presetInfoDisplay;
  if (el) {
    if (name === 'custom') {
      el.textContent = '🎛️ ' + t('custom');
    } else if (name && PRESETS[name]) {
      el.textContent = getPresetDisplay(name);
    } else {
      el.textContent = '🎛️ ' + t('preset');
    }
  }
}

// ============================================
//  ПОЛУЧЕНИЕ ОПИСАНИЯ ПРЕСЕТА
// ============================================

export function getPresetDesc(name) {
  const info = PRESET_INFO[name];
  if (!info) return t('preset');
  const lang = getCurrentLang();
  if (lang === 'ru') return info.desc_ru || info.desc_en || t('preset');
  if (lang === 'uk') return info.desc_uk || info.desc_en || info.desc_ru || t('preset');
  return info.desc_en || info.desc_ru || t('preset');
}

// ============================================
//  ПОЛУЧЕНИЕ ОТОБРАЖЕНИЯ ПРЕСЕТА
// ============================================

export function getPresetDisplay(name) {
  const info = PRESET_INFO[name];
  if (!info) return '🎛️ ' + t('preset');
  return info.icon + ' ' + getPresetDesc(name);
}

// ============================================
//  ОБНОВЛЕНИЕ КЛАССА ЗНАЧЕНИЯ GAIN
// ============================================

export function updateGainClass(element, value) {
  const val = parseFloat(value);
  element.className = 'gain-value';
  if (val > 0.1) element.classList.add('positive');
  else if (val < -0.1) element.classList.add('negative');
  else element.classList.add('zero');
}

// ============================================
//  ПОКАЗ ОВЕРЛЕЯ ЗАГРУЗКИ
// ============================================

export function showLoading(show) {
  updateState({ isLoading: show });
  const overlay = dom.loadingOverlay;
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
}

// ============================================
//  ПЕРЕКЛЮЧЕНИЕ ТЕМЫ
// ============================================

export function toggleTheme() {
  state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.currentTheme);
  if (dom.themeToggle) {
    dom.themeToggle.textContent = state.currentTheme === 'dark' ? '🌙' : '☀️';
  }
}

// ============================================
//  РАЗВЕРТЫВАНИЕ/СВЕРТЫВАНИЕ ОКНА
// ============================================

export function toggleExpand() {
  const body = document.body;
  if (body.classList.contains('expanded')) {
    body.classList.remove('expanded');
    body.style.width = '480px';
    body.style.maxHeight = '700px';
    if (dom.expandBtn) dom.expandBtn.textContent = '⬜';
  } else {
    body.classList.add('expanded');
    body.style.width = '100%';
    body.style.maxHeight = '100vh';
    if (dom.expandBtn) dom.expandBtn.textContent = '⬛';
  }
}

// ============================================
//  ОБНОВЛЕНИЕ ИНФОРМАЦИИ О САЙТЕ (CHROME 152 OPTIMIZED)
// ============================================

export function updateSiteInfo() {
  const info = dom.siteInfo;
  if (!info) return;
  
  chromeAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chromeAPI.runtime.lastError) {
      console.warn('⚠️ Ошибка получения вкладки:', chromeAPI.runtime.lastError);
      info.textContent = t('site');
      return;
    }
    
    if (tabs && tabs.length > 0 && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        // Пропускаем системные страницы
        if (url.protocol === 'chrome:' || url.protocol === 'about:') {
          info.textContent = '🔒 ' + t('site');
          return;
        }
        info.textContent = '🌐 ' + url.hostname.replace('www.', '');
      } catch {
        info.textContent = t('site');
      }
    } else {
      info.textContent = t('site');
    }
  });
}

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
  setStatus,
  updateConnectButton,
  updatePresetInfo,
  getPresetDesc,
  getPresetDisplay,
  updateGainClass,
  showLoading,
  toggleTheme,
  toggleExpand,
  updateSiteInfo,
  normalizeStatus,
  CONNECTION_STATES
};