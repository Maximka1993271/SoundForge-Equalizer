// ============================================
//  PRESETS.JS - Работа с пресетами (v3.22.8)
//  ИСПРАВЛЕНО: выбор пресетов из списка
//  ИСПРАВЛЕНО: определение пользовательских пресетов
//  ИСПРАВЛЕНО: обработка ошибок и очистка A/B состояния
// ============================================

import { state, dom } from './state.js';
import { t } from './i18n.js';
import { PRESETS, PRESET_CATEGORIES, PRESET_INFO } from './config.js';
import { getUserPresets, saveUserPresets, getSliderGains, saveAllSettings } from './storage.js';
import { applyPresetEQOnly, applyPresetWithAnimation } from './audio.js';
import { 
  setStatus, 
  updatePresetInfo, 
  getPresetDisplay, 
  getPresetDesc,
  updateGainClass 
} from './ui.js';

// ============================================
//  ЗАПОЛНЕНИЕ СПИСКА ПРЕСЕТОВ
// ============================================

export function populatePresetSelect() {
  const select = dom.presetSelect;
  if (!select) return;

  select.innerHTML = '';

  const categories = {};
  const presetNames = Object.keys(PRESETS);
  let userPresets = {};
  
  // Безопасная загрузка пользовательских пресетов
  try {
    userPresets = getUserPresets();
  } catch (e) {
    console.warn('⚠️ Ошибка загрузки пользовательских пресетов:', e);
    userPresets = {};
  }

  // Группировка стандартных пресетов по категориям
  presetNames.forEach((name) => {
    const category = PRESET_CATEGORIES[name] || '🎧 Специальные';
    if (!categories[category]) categories[category] = [];
    categories[category].push(name);
  });

  // Пустой пункт (настройки)
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = '🎛️ ' + t('custom');
  select.appendChild(emptyOption);

  // Сортировка категорий
  const categoryKeys = Object.keys(categories);
  categoryKeys.sort();

  // Стандартные пресеты по категориям
  categoryKeys.forEach((category) => {
    const optgroup = document.createElement('optgroup');
    const categoryLabel = t('presets.' + category) || category;
    optgroup.label = categoryLabel;

    categories[category].sort((a, b) => {
      return (PRESET_INFO[a]?.icon || '').localeCompare(PRESET_INFO[b]?.icon || '');
    });

    categories[category].forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      const info = PRESET_INFO[name];
      option.textContent = (info ? info.icon + ' ' : '') + getPresetDesc(name);
      optgroup.appendChild(option);
    });

    select.appendChild(optgroup);
  });

  // Пользовательские пресеты
  const userKeys = Object.keys(userPresets);
  if (userKeys.length > 0) {
    const userOptgroup = document.createElement('optgroup');
    userOptgroup.label = '👤 ' + t('save_preset');

    userKeys.forEach((name) => {
      const option = document.createElement('option');
      option.value = 'user_' + name; // Префикс для пользовательских пресетов
      option.textContent = '💾 ' + name;
      userOptgroup.appendChild(option);
    });

    select.appendChild(userOptgroup);
  }

  // Восстановление выбранного пресета
  if (state.currentPreset && state.currentPreset !== 'custom') {
    const presetExists = presetNames.includes(state.currentPreset) || 
                         userKeys.includes(state.currentPreset);
    if (presetExists) {
      const isUserPreset = userKeys.includes(state.currentPreset);
      select.value = isUserPreset ? 'user_' + state.currentPreset : state.currentPreset;
    }
  }
}

// ============================================
//  СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЬСКОГО ПРЕСЕТА
// ============================================

export function saveUserPreset() {
  const name = prompt(t('save_preset') + ':', 'My Preset');
  if (!name) return;

  let presets;
  try {
    presets = getUserPresets();
  } catch (e) {
    console.warn('⚠️ Ошибка загрузки пользовательских пресетов:', e);
    presets = {};
  }
  
  if (presets[name]) {
    if (!confirm(`Пресет "${name}" уже существует. Перезаписать?`)) {
      return;
    }
  }

  const gains = getSliderGains();
  const volume = dom.volumeSlider ? parseFloat(dom.volumeSlider.value) : 100;
  const bass = dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0;

  presets[name] = {
    gains: gains,
    volume: volume,
    bass: bass,
    timestamp: Date.now()
  };

  try {
    saveUserPresets(presets);
    populatePresetSelect();
    setStatus('ready', '✅ ' + t('save_preset') + ': ' + name);
  } catch (e) {
    console.error('❌ Ошибка сохранения пресета:', e);
    setStatus('disconnected', '⚠️ Ошибка сохранения пресета');
  }
}

// ============================================
//  ЗАГРУЗКА ПОЛЬЗОВАТЕЛЬСКОГО ПРЕСЕТА
// ============================================

export function loadUserPreset(name) {
  let presets;
  try {
    presets = getUserPresets();
  } catch (e) {
    console.warn('⚠️ Ошибка загрузки пользовательских пресетов:', e);
    setStatus('disconnected', '⚠️ Ошибка загрузки пресета');
    return;
  }
  
  const preset = presets[name];
  if (!preset) {
    console.warn(`⚠️ Пользовательский пресет "${name}" не найден`);
    setStatus('disconnected', '⚠️ Пресет не найден');
    return;
  }

  // FIX: Очищаем A/B состояние при загрузке пресета
  state.abPresetA = null;
  state.abPresetB = null;
  state.abMode = false;
  state.abActive = null;
  if (dom.abCompareBtn) {
    dom.abCompareBtn.textContent = t('compare');
    dom.abCompareBtn.style.background = '';
    dom.abCompareBtn.style.color = '';
  }

  // Применяем пользовательский пресет с анимацией
  applyPresetWithAnimation(name, true);
}

// ============================================
//  ОБРАБОТКА ВЫБОРА ПРЕСЕТА ИЗ СПИСКА
// ============================================

export function handlePresetSelect(value) {
  if (!value) {
    state.currentPreset = 'custom';
    updatePresetInfo('custom');
    // FIX: Очищаем A/B состояние при выборе custom
    state.abPresetA = null;
    state.abPresetB = null;
    state.abMode = false;
  state.abActive = null;
    if (dom.abCompareBtn) {
      dom.abCompareBtn.textContent = t('compare');
      dom.abCompareBtn.style.background = '';
      dom.abCompareBtn.style.color = '';
    }
    return;
  }

  if (value.startsWith('user_')) {
    const userPresetName = value.substring(5);
    loadUserPreset(userPresetName);
  } else {
    if (PRESETS[value]) {
      // FIX: Очищаем A/B состояние при выборе стандартного пресета
      state.abPresetA = null;
      state.abPresetB = null;
      state.abMode = false;
  state.abActive = null;
      if (dom.abCompareBtn) {
        dom.abCompareBtn.textContent = t('compare');
        dom.abCompareBtn.style.background = '';
        dom.abCompareBtn.style.color = '';
      }
      applyPresetWithAnimation(value, false);
    } else {
      console.warn(`⚠️ Пресет "${value}" не найден в PRESETS`);
      setStatus('disconnected', '⚠️ Пресет не найден');
    }
  }
}

// ============================================
//  A/B СРАВНЕНИЕ
// ============================================

function resetABCompareState() {
  state.abPresetA = null;
  state.abPresetB = null;
  state.abMode = false;
  state.abActive = null;
  if (dom.abCompareBtn) {
    dom.abCompareBtn.textContent = t('compare');
    dom.abCompareBtn.style.background = '';
    dom.abCompareBtn.style.color = '';
  }
}

function updateABCompareButton() {
  if (!dom.abCompareBtn) return;
  if (!state.abPresetA) {
    dom.abCompareBtn.textContent = '🔀 A/B';
    dom.abCompareBtn.style.background = '';
    dom.abCompareBtn.style.color = '';
    return;
  }
  if (!state.abPresetB) {
    dom.abCompareBtn.textContent = '🔀 Save B';
    dom.abCompareBtn.style.background = '#607D8B';
    dom.abCompareBtn.style.color = '#fff';
    return;
  }
  dom.abCompareBtn.textContent = `🔀 ${state.abActive || 'A'}`;
  dom.abCompareBtn.style.background = state.abActive === 'B' ? '#2196F3' : '#4CAF50';
  dom.abCompareBtn.style.color = '#fff';
}

function applyABSnapshot(snapshot, side) {
  if (!snapshot) return;

  const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
  sliders.forEach((slider) => {
    const value = Number(snapshot.gains?.[slider.dataset.freq] ?? 0);
    slider.value = Number.isFinite(value) ? value : 0;
    const valueSpan = slider.parentElement?.querySelector('.gain-value');
    if (valueSpan) {
      valueSpan.textContent = Number(slider.value).toFixed(1);
      updateGainClass(valueSpan, Number(slider.value));
    }
  });

  const volumePercent = Math.max(0, Math.min(800, (Number.isFinite(Number(snapshot.volume)) ? Number(snapshot.volume) : 1) * 100));
  const bass = Math.max(-12, Math.min(12, (Number.isFinite(Number(snapshot.bass)) ? Number(snapshot.bass) : 0)));

  if (dom.volumeSlider) dom.volumeSlider.value = volumePercent;
  if (dom.volumeDisplay) dom.volumeDisplay.textContent = `${volumePercent}%`;
  if (dom.bassSlider) dom.bassSlider.value = bass;
  if (dom.bassDisplay) dom.bassDisplay.textContent = `${bass.toFixed(1)} dB`;

  state.currentPreset = 'custom';
  updatePresetInfo('custom');

  const gains = getSliderGains();
  chrome.runtime.sendMessage({ action: 'updateEQ', gains, instant: true, source: `ab-${side}` });
  chrome.runtime.sendMessage({ action: 'setVolume', value: volumePercent / 100, instant: true, source: `ab-${side}` });
  chrome.runtime.sendMessage({ action: 'setBass', value: bass, instant: true, source: `ab-${side}` });

  setStatus('ready', `🔀 A/B: ${side}`);
}

export function toggleABCompare() {
  // First click: capture A.
  if (!state.abPresetA) {
    state.abPresetA = {
      gains: getSliderGains(),
      volume: dom.volumeSlider ? parseFloat(dom.volumeSlider.value) / 100 : 1.0,
      bass: dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0
    };
    state.abPresetB = null;
    state.abMode = false;
    state.abActive = null;
    updateABCompareButton();
    setStatus('ready', '🔀 A/B: состояние A сохранено. Настройте B и нажмите ещё раз.');
    return;
  }

  // Second click: capture B and immediately return to A.
  if (!state.abPresetB) {
    state.abPresetB = {
      gains: getSliderGains(),
      volume: dom.volumeSlider ? parseFloat(dom.volumeSlider.value) / 100 : 1.0,
      bass: dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0
    };
    state.abMode = true;
    state.abActive = 'A';
    updateABCompareButton();
    applyABSnapshot(state.abPresetA, 'A');
    setStatus('ready', '🔀 A/B готов: нажимайте кнопку для переключения A ↔ B.');
    return;
  }

  // Subsequent clicks: real A/B toggle.
  state.abActive = state.abActive === 'A' ? 'B' : 'A';
  state.abMode = true;
  updateABCompareButton();
  applyABSnapshot(state.abActive === 'A' ? state.abPresetA : state.abPresetB, state.abActive);
}

// ============================================
//  ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ СПИСКА ПРЕСЕТОВ
// ============================================

export function getPresetList() {
  const list = [];
  const presetNames = Object.keys(PRESETS);
  
  presetNames.forEach((name) => {
    const info = PRESET_INFO[name];
    list.push({
      id: name,
      name: name,
      display: (info ? info.icon + ' ' : '') + getPresetDesc(name),
      category: PRESET_CATEGORIES[name] || '🎧 Специальные',
      isUser: false
    });
  });

  try {
    const userPresets = getUserPresets();
    Object.keys(userPresets).forEach((name) => {
      list.push({
        id: 'user_' + name,
        name: name,
        display: '💾 ' + name,
        category: '👤 ' + t('save_preset'),
        isUser: true
      });
    });
  } catch (e) {
    console.warn('⚠️ Ошибка загрузки пользовательских пресетов:', e);
  }

  return list;
}

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
  populatePresetSelect,
  saveUserPreset,
  loadUserPreset,
  handlePresetSelect,
  toggleABCompare,
  getPresetList
};