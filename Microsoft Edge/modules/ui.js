// ============================================
//  UI.JS - Обновление интерфейса (v3.22.8)
//  ИСПРАВЛЕНО: обработка ошибок в updateSiteInfo
// ============================================

import { state, dom, updateState } from './state.js';
import { t, getCurrentLang } from './i18n.js';
import { PRESETS, PRESET_INFO } from './config.js';

export function setStatus(status, text) {
  updateState({ currentStatus: status });
  const dot = dom.statusDot;
  const txt = dom.statusText;
  const btn = dom.connectBtn;

  if (dot) {
    dot.className = 'status-dot';
    if (status === 'connected') dot.classList.add('active');
    else if (status === 'connecting') dot.classList.add('connecting');
    else if (status === 'disconnected') dot.classList.add('inactive');
    else if (status === 'reset') dot.classList.add('reset');
  }
  if (txt) {
    txt.className = 'status-text';
    txt.textContent = text || t('status_ready');
  }
  updateConnectButton(status);
}

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

export function getPresetDesc(name) {
  const info = PRESET_INFO[name];
  if (!info) return t('preset');
  const lang = getCurrentLang();
  if (lang === 'ru') return info.desc_ru || info.desc_en || t('preset');
  if (lang === 'uk') return info.desc_uk || info.desc_en || info.desc_ru || t('preset');
  return info.desc_en || info.desc_ru || t('preset');
}

export function getPresetDisplay(name) {
  const info = PRESET_INFO[name];
  if (!info) return '🎛️ ' + t('preset');
  return info.icon + ' ' + getPresetDesc(name);
}

export function updateGainClass(element, value) {
  const val = parseFloat(value);
  element.className = 'gain-value';
  if (val > 0.1) element.classList.add('positive');
  else if (val < -0.1) element.classList.add('negative');
  else element.classList.add('zero');
}

export function showLoading(show) {
  updateState({ isLoading: show });
  const overlay = dom.loadingOverlay;
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
}

export function toggleTheme() {
  state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.currentTheme);
  if (dom.themeToggle) {
    dom.themeToggle.textContent = state.currentTheme === 'dark' ? '🌙' : '☀️';
  }
}

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

export function updateSiteInfo() {
  const info = dom.siteInfo;
  if (!info) return;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // FIX: Проверяем ошибку chrome.runtime.lastError
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Ошибка получения вкладки:', chrome.runtime.lastError);
      info.textContent = t('site');
      return;
    }
    
    if (tabs && tabs.length > 0 && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        // Пропускаем системные страницы
        if (url.protocol === 'chrome:' || url.protocol === 'about:' || url.protocol === 'edge:') {
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