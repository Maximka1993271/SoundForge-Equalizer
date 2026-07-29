// ============================================
//  PRESETS.JS - Работа с пресетами (v3.22.8)
//  ИСПРАВЛЕНО: выбор пресетов из списка
//  ИСПРАВЛЕНО: определение пользовательских пресетов
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
  const userPresets = getUserPresets();

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
  if (Object.keys(userPresets).length > 0) {
    const userOptgroup = document.createElement('optgroup');
    userOptgroup.label = '👤 ' + t('save_preset');

    Object.keys(userPresets).forEach((name) => {
      const option = document.createElement('option');
      option.value = 'user_' + name; // Префикс для пользовательских пресетов
      option.textContent = '💾 ' + name;
      userOptgroup.appendChild(option);
    });

    select.appendChild(userOptgroup);
  }

  // Восстановление выбранного пресета
  if (state.currentPreset && state.currentPreset !== 'custom') {
    // Проверяем, есть ли такой пресет в списке
    const presetExists = presetNames.includes(state.currentPreset) || 
                        Object.keys(userPresets).includes(state.currentPreset);
    if (presetExists) {
      // Для пользовательских пресетов добавляем префикс
      const isUserPreset = Object.keys(userPresets).includes(state.currentPreset);
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

  const presets = getUserPresets();
  
  // Проверка на дубликат
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

  saveUserPresets(presets);
  populatePresetSelect();
  setStatus('ready', '✅ ' + t('save_preset') + ': ' + name);
}

// ============================================
//  ЗАГРУЗКА ПОЛЬЗОВАТЕЛЬСКОГО ПРЕСЕТА
// ============================================

export function loadUserPreset(name) {
  const presets = getUserPresets();
  const preset = presets[name];
  if (!preset) {
    console.warn(`⚠️ Пользовательский пресет "${name}" не найден`);
    setStatus('disconnected', '⚠️ Пресет не найден');
    return;
  }

  // Применяем пользовательский пресет с анимацией
  // Передаем isUserPreset = true
  applyPresetWithAnimation(name, true);
}

// ============================================
//  ОБРАБОТКА ВЫБОРА ПРЕСЕТА ИЗ СПИСКА
// ============================================

export function handlePresetSelect(value) {
  if (!value) {
    // Пустое значение - сброс выбора
    state.currentPreset = 'custom';
    updatePresetInfo('custom');
    return;
  }

  // Проверка: пользовательский пресет или стандартный
  if (value.startsWith('user_')) {
    // Пользовательский пресет
    const userPresetName = value.substring(5); // Убираем префикс 'user_'
    loadUserPreset(userPresetName);
  } else {
    // Стандартный пресет из PRESETS
    if (PRESETS[value]) {
      applyPresetWithAnimation(value, false); // isUserPreset = false
    } else {
      console.warn(`⚠️ Пресет "${value}" не найден в PRESETS`);
      setStatus('disconnected', '⚠️ Пресет не найден');
    }
  }
}

// ============================================
//  A/B СРАВНЕНИЕ
// ============================================

export function toggleABCompare() {
  state.abMode = !state.abMode;
  if (state.abMode) {
    state.abPresetA = {
      gains: getSliderGains(),
      volume: dom.volumeSlider ? parseFloat(dom.volumeSlider.value) / 100 : 1.0,
      bass: dom.bassSlider ? parseFloat(dom.bassSlider.value) : 0
    };
    if (dom.abCompareBtn) {
      dom.abCompareBtn.textContent = '🔀 A';
      dom.abCompareBtn.style.background = '#4CAF50';
      dom.abCompareBtn.style.color = '#fff';
    }
    setStatus('ready', '🔀 Режим A/B: сохранено состояние A');
  } else {
    state.abPresetA = null;
    state.abPresetB = null;
    if (dom.abCompareBtn) {
      dom.abCompareBtn.textContent = t('compare');
      dom.abCompareBtn.style.background = '';
      dom.abCompareBtn.style.color = '';
    }
    setStatus('ready', t('status_ready'));
  }
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

  // Добавляем пользовательские пресеты
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