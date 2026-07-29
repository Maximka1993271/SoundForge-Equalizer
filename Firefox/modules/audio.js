// ============================================
//  AUDIO.JS - Аудио операции (v3.22.8)
//  ИСПРАВЛЕНО: дублирующийся экспорт initAudioContext
//  ИСПРАВЛЕНО: все экспорты уникальны
//  ИСПРАВЛЕНО: applyPresetWithAnimation правильно обрабатывает isUserPreset
// ============================================

import { state, dom } from './state.js';
import { setStatus, showLoading, updatePresetInfo, updateGainClass, updateConnectButton } from './ui.js';
import { getSliderGains, saveAllSettings } from './storage.js';
import { PRESETS } from './config.js';
import { t } from './i18n.js';

// ============================================
//  НАСТРОЙКИ АНИМАЦИИ
// ============================================

const ANIMATION = {
  duration: 350,
  steps: 35,
  easing: 'easeInOut',
  minChange: 0.1
};

// ============================================
//  ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ WEB AUDIO API
// ============================================

let _audioContext = null;
let _analyserNode = null;
let _isAudioInitialized = false;
let _spectrumUpdateInterval = null;

// ============================================
//  ФУНКЦИИ ПЛАВНОЙ АНИМАЦИИ
// ============================================

function animateSlider(slider, targetValue, duration = ANIMATION.duration) {
    return new Promise((resolve) => {
        if (!slider) {
            resolve();
            return;
        }
        
        const startValue = parseFloat(slider.value) || 0;
        const diff = targetValue - startValue;
        
        if (Math.abs(diff) < ANIMATION.minChange) {
            slider.value = targetValue;
            const valueSpan = slider.parentElement ? slider.parentElement.querySelector('.gain-value') : null;
            if (valueSpan) {
                valueSpan.textContent = targetValue.toFixed(1);
                updateGainClass(valueSpan, targetValue);
            }
            resolve();
            return;
        }
        
        const steps = Math.min(ANIMATION.steps, Math.max(10, Math.abs(diff) * 4));
        const stepTime = duration / steps;
        let currentStep = 0;
        
        function animateStep() {
            currentStep++;
            const progress = Math.min(1, currentStep / steps);
            
            let easedProgress;
            switch (ANIMATION.easing) {
                case 'easeInOut':
                    easedProgress = progress < 0.5 
                        ? 2 * progress * progress 
                        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    break;
                case 'easeOut':
                    easedProgress = 1 - Math.pow(1 - progress, 3);
                    break;
                case 'easeIn':
                    easedProgress = progress * progress * progress;
                    break;
                default:
                    easedProgress = progress;
            }
            
            const currentValue = startValue + diff * easedProgress;
            slider.value = currentValue;
            
            const valueSpan = slider.parentElement ? slider.parentElement.querySelector('.gain-value') : null;
            if (valueSpan) {
                const displayVal = Math.round(currentValue * 10) / 10;
                valueSpan.textContent = displayVal.toFixed(1);
                updateGainClass(valueSpan, currentValue);
            }
            
            if (currentStep < steps) {
                requestAnimationFrame(animateStep);
            } else {
                slider.value = targetValue;
                const finalSpan = slider.parentElement ? slider.parentElement.querySelector('.gain-value') : null;
                if (finalSpan) {
                    finalSpan.textContent = targetValue.toFixed(1);
                    updateGainClass(finalSpan, targetValue);
                }
                resolve();
            }
        }
        
        animateStep();
    });
}

function animateVolume(targetValue, duration = ANIMATION.duration) {
    return new Promise((resolve) => {
        if (!dom.volumeSlider || !dom.volumeDisplay) {
            resolve();
            return;
        }
        
        const startValue = parseFloat(dom.volumeSlider.value) || 100;
        const diff = targetValue - startValue;
        
        if (Math.abs(diff) < 1) {
            dom.volumeSlider.value = targetValue;
            dom.volumeDisplay.textContent = Math.round(targetValue) + '%';
            resolve();
            return;
        }
        
        const steps = Math.min(ANIMATION.steps, Math.max(10, Math.abs(diff) / 5));
        const stepTime = duration / steps;
        let currentStep = 0;
        
        function animateStep() {
            currentStep++;
            const progress = Math.min(1, currentStep / steps);
            const easedProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const currentValue = startValue + diff * easedProgress;
            dom.volumeSlider.value = currentValue;
            dom.volumeDisplay.textContent = Math.round(currentValue) + '%';
            
            try {
                chrome.runtime.sendMessage({ 
                    action: 'setVolume', 
                    value: currentValue / 100,
                    instant: true 
                });
            } catch (e) {}
            
            if (currentStep < steps) {
                setTimeout(animateStep, stepTime);
            } else {
                dom.volumeSlider.value = targetValue;
                dom.volumeDisplay.textContent = Math.round(targetValue) + '%';
                try {
                    chrome.runtime.sendMessage({ 
                        action: 'setVolume', 
                        value: targetValue / 100 
                    });
                } catch (e) {}
                resolve();
            }
        }
        
        animateStep();
    });
}

function animateBass(targetValue, duration = ANIMATION.duration) {
    return new Promise((resolve) => {
        if (!dom.bassSlider || !dom.bassDisplay) {
            resolve();
            return;
        }
        
        const startValue = parseFloat(dom.bassSlider.value) || 0;
        const diff = targetValue - startValue;
        
        if (Math.abs(diff) < 0.1) {
            dom.bassSlider.value = targetValue;
            dom.bassDisplay.textContent = targetValue.toFixed(1) + ' dB';
            resolve();
            return;
        }
        
        const steps = Math.min(ANIMATION.steps, Math.max(10, Math.abs(diff) * 3));
        const stepTime = duration / steps;
        let currentStep = 0;
        
        function animateStep() {
            currentStep++;
            const progress = Math.min(1, currentStep / steps);
            const easedProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const currentValue = startValue + diff * easedProgress;
            dom.bassSlider.value = currentValue;
            dom.bassDisplay.textContent = currentValue.toFixed(1) + ' dB';
            
            try {
                chrome.runtime.sendMessage({ 
                    action: 'setBass', 
                    value: currentValue,
                    instant: true 
                });
            } catch (e) {}
            
            if (currentStep < steps) {
                setTimeout(animateStep, stepTime);
            } else {
                dom.bassSlider.value = targetValue;
                dom.bassDisplay.textContent = targetValue.toFixed(1) + ' dB';
                try {
                    chrome.runtime.sendMessage({ 
                        action: 'setBass', 
                        value: targetValue 
                    });
                } catch (e) {}
                resolve();
            }
        }
        
        animateStep();
    });
}

// ============================================
//  ИНИЦИАЛИЗАЦИЯ WEB AUDIO API
// ============================================

export function initAudioContext() {
    if (_isAudioInitialized) return true;
    
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn('⚠️ AudioContext не поддерживается');
            return false;
        }
        
        _audioContext = new AudioContextClass({
            latencyHint: 'interactive',
            sampleRate: 48000
        });
        
        if (_audioContext.state === 'suspended') {
            _audioContext.resume().catch(() => {});
        }
        
        _analyserNode = _audioContext.createAnalyser();
        _analyserNode.fftSize = 256;
        _analyserNode.smoothingTimeConstant = 0.8;
        
        _isAudioInitialized = true;
        console.log('✅ AudioContext инициализирован');
        
        startSpectrumPolling();
        return true;
    } catch (e) {
        console.error('❌ Ошибка инициализации AudioContext:', e);
        return false;
    }
}

// ============================================
//  ЗАПИСЬ СПЕКТРА В state.spectrumData
// ============================================

function startSpectrumPolling() {
    if (_spectrumUpdateInterval) {
        clearInterval(_spectrumUpdateInterval);
    }
    
    _spectrumUpdateInterval = setInterval(() => {
        if (!_analyserNode || !_audioContext || _audioContext.state === 'closed') {
            const dummyData = generateDummySpectrum();
            state.spectrumData = dummyData;
            state.spectrumData.isDummy = true;
            return;
        }
        
        try {
            const dataArray = new Float32Array(_analyserNode.frequencyBinCount);
            _analyserNode.getFloatFrequencyData(dataArray);
            
            let hasAudio = false;
            for (let i = 0; i < Math.min(dataArray.length, 16); i++) {
                if (dataArray[i] > -80) {
                    hasAudio = true;
                    break;
                }
            }
            
            const normalized = new Float32Array(64);
            for (let i = 0; i < Math.min(dataArray.length, 64); i++) {
                const val = (dataArray[i] + 100) / 100;
                normalized[i] = Math.max(0, Math.min(1, val));
            }
            
            state.spectrumData = normalized;
            state.spectrumData.isDummy = !hasAudio;
            state.hasAudio = hasAudio;
            
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
            }
            state.rmsValue = Math.sqrt(sum / dataArray.length);
            state.rmsValue = Math.max(0, Math.min(1, (state.rmsValue + 100) / 100));
            
        } catch (e) {
            const dummyData = generateDummySpectrum();
            state.spectrumData = dummyData;
            state.spectrumData.isDummy = true;
        }
    }, 50);
}

function generateDummySpectrum() {
    const time = Date.now() / 1000;
    const dummy = new Float32Array(64);
    for (let i = 0; i < 64; i++) {
        const freq = i / 64;
        const val = Math.sin(time * 1.5 + freq * 8) * 0.2 +
                   Math.sin(time * 2.2 + freq * 15 + 1.2) * 0.15 +
                   Math.sin(time * 0.8 + freq * 4 + 2.5) * 0.1;
        dummy[i] = Math.max(0, Math.min(1, 0.1 + val));
    }
    return dummy;
}

// ============================================
//  ПРИМЕНЕНИЕ ПРЕСЕТА С АНИМАЦИЕЙ - ИСПРАВЛЕНО
// ============================================

export async function applyPresetWithAnimation(name, isUserPreset = false) {
    let preset;
    
    console.log(`🎵 Применяем пресет: "${name}", isUserPreset: ${isUserPreset}`);
    
    if (isUserPreset) {
        // Загрузка из пользовательских пресетов
        try {
            const saved = localStorage.getItem('soundforge_user_presets');
            const userPresets = saved ? JSON.parse(saved) : {};
            preset = userPresets[name];
            if (!preset) {
                console.warn(`⚠️ Пользовательский пресет "${name}" не найден`);
                setStatus('disconnected', '⚠️ Пресет не найден');
                return;
            }
            console.log(`✅ Пользовательский пресет "${name}" загружен`);
        } catch (e) {
            console.error('❌ Ошибка загрузки пользовательского пресета:', e);
            setStatus('disconnected', '⚠️ Ошибка загрузки пресета');
            return;
        }
    } else {
        // Загрузка из стандартных пресетов
        preset = PRESETS[name];
        if (!preset) {
            console.warn(`⚠️ Пресет "${name}" не найден в PRESETS`);
            setStatus('disconnected', '⚠️ Пресет не найден');
            return;
        }
        console.log(`✅ Стандартный пресет "${name}" загружен`);
    }
    
    const wasConnected = state.currentStatus === 'connected' || state.isConnected;
    
    showLoading(true);
    state.currentPreset = name;
    updatePresetInfo(name);
    if (dom.presetSelect) {
        // Для пользовательских пресетов устанавливаем значение с префиксом
        if (isUserPreset) {
            dom.presetSelect.value = 'user_' + name;
        } else {
            dom.presetSelect.value = name;
        }
    }
    
    const targetGains = preset.gains || {};
    const targetVolume = preset.volume || 100;
    const targetBass = preset.bass || 0;
    
    const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
    const sliderPromises = [];
    
    sliders.forEach((slider) => {
        const freq = slider.dataset.freq;
        if (targetGains[freq] !== undefined) {
            const targetValue = targetGains[freq];
            const promise = animateSlider(slider, targetValue);
            sliderPromises.push(promise);
        }
    });
    
    const volumePromise = animateVolume(targetVolume);
    const bassPromise = animateBass(targetBass);
    
    await Promise.all([...sliderPromises, volumePromise, bassPromise]);
    
    const gains = getSliderGains();
    try {
        chrome.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true });
        chrome.runtime.sendMessage({ action: 'setVolume', value: targetVolume / 100, instant: true });
        chrome.runtime.sendMessage({ action: 'setBass', value: targetBass, instant: true });
    } catch (e) {}
    saveAllSettings();
    
    setTimeout(() => {
        import('./visualization.js').then(({ updateEQGraph }) => {
            updateEQGraph();
        }).catch(() => {});
    }, 50);
    
    setTimeout(() => {
        showLoading(false);
        if (wasConnected) {
            setStatus('connected', t('status_connected'));
            updateConnectButton('connected');
        } else {
            setStatus('ready', '✅ Пресет применен: ' + (isUserPreset ? name : (PRESET_INFO[name]?.desc_ru || name)));
        }
        console.log(`✅ Пресет "${name}" применен с плавной анимацией`);
    }, 100);
}

// ============================================
//  ПРИМЕНЕНИЕ ТОЛЬКО НАСТРОЕК EQ (БЕЗ АНИМАЦИИ)
// ============================================

export async function applyPresetEQOnly(name) {
    const preset = PRESETS[name];
    if (!preset) {
        console.warn(`⚠️ Пресет "${name}" не найден`);
        return;
    }
    
    console.log(`🎵 Применяем настройки EQ пресета "${name}"`);
    
    state.currentPreset = name;
    updatePresetInfo(name);
    if (dom.presetSelect) dom.presetSelect.value = name;
    
    const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
    const targetGains = preset.gains || {};
    
    sliders.forEach((slider) => {
        const freq = slider.dataset.freq;
        if (targetGains[freq] !== undefined) {
            const value = targetGains[freq];
            slider.value = value;
            const valueSpan = slider.parentElement ? slider.parentElement.querySelector('.gain-value') : null;
            if (valueSpan) {
                valueSpan.textContent = value.toFixed(1);
                updateGainClass(valueSpan, value);
            }
        }
    });
    
    const gains = getSliderGains();
    try {
        chrome.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true });
    } catch (e) {}
    saveAllSettings();
    
    setTimeout(() => {
        import('./visualization.js').then(({ updateEQGraph }) => {
            updateEQGraph();
        }).catch(() => {});
    }, 50);
}

// ============================================
//  ПОДКЛЮЧЕНИЕ/ОТКЛЮЧЕНИЕ
// ============================================

export function toggleConnection() {
    if (state.isLoading) return;

    if (state.currentStatus === 'connected') {
        showLoading(true);
        setStatus('disconnected', t('status_disconnected'));
        chrome.runtime.sendMessage({ action: 'disconnect' }, () => {
            showLoading(false);
            if (chrome.runtime.lastError) {
                setStatus('disconnected', '⚠️ Ошибка');
                return;
            }
            setStatus('disconnected', t('status_disconnected'));
        });
    } else if (state.currentStatus === 'connecting') {
        // Ничего не делаем
    } else {
        showLoading(true);
        setStatus('connecting', t('status_connecting'));
        
        chrome.runtime.sendMessage({ action: 'connect' }, () => {
            showLoading(false);
            if (chrome.runtime.lastError) {
                setStatus('disconnected', '⚠️ Ошибка: ' + chrome.runtime.lastError.message);
                return;
            }
            
            setTimeout(() => {
                chrome.runtime.sendMessage({ action: 'getStatus' }, (resp) => {
                    if (resp && resp.status === 'connected') {
                        setStatus('connected', t('status_connected'));
                        applySavedSettings(false);
                    } else {
                        setTimeout(() => {
                            chrome.runtime.sendMessage({ action: 'getStatus' }, (resp2) => {
                                if (resp2 && resp2.status === 'connected') {
                                    setStatus('connected', t('status_connected'));
                                    applySavedSettings(false);
                                } else {
                                    setStatus('disconnected', t('status_disconnected'));
                                }
                            });
                        }, 1000);
                    }
                });
            }, 1500);
        });
    }
}

// ============================================
//  СБРОС ВСЕХ НАСТРОЕК
// ============================================

export async function handleReset(onVolumeReset = null) {
    if (state.isLoading) {
        console.log('⏳ Сброс уже выполняется, пропускаем');
        return;
    }
    
    console.log('🔄 СБРОС ВСЕХ НАСТРОЕК: EQ + Громкость + Bass Boost');
    showLoading(true);
    setStatus('reset', '🔄 Сброшено...');
    
    try {
        const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
        const resetPromises = sliders.map((slider) => {
            return animateSlider(slider, 0);
        });
        
        const volumePromise = animateVolume(100);
        const bassPromise = animateBass(0);
        
        await Promise.all([...resetPromises, volumePromise, bassPromise]);
        
        if (onVolumeReset && typeof onVolumeReset === 'function') {
            onVolumeReset(100);
        }
        
        const gains = getSliderGains();
        try {
            chrome.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true });
            chrome.runtime.sendMessage({ action: 'setVolume', value: 1.0, instant: true });
            chrome.runtime.sendMessage({ action: 'setBass', value: 0, instant: true });
        } catch (e) {}
        
        state.currentPreset = 'flat';
        updatePresetInfo('flat');
        if (dom.presetSelect) dom.presetSelect.value = 'flat';
        
        saveAllSettings();
        
        try {
            const { updateEQGraph } = await import('./visualization.js');
            setTimeout(updateEQGraph, 100);
        } catch (e) {}
        
        setTimeout(() => {
            showLoading(false);
            setStatus('ready', '✅ Все настройки сброшены');
            console.log('✅ Сброс выполнен: EQ=0, Громкость=100%, Bass=0');
        }, 300);
        
    } catch (e) {
        console.error('❌ Ошибка при сбросе:', e);
        showLoading(false);
        setStatus('disconnected', '⚠️ Ошибка сброса');
    }
}

// ============================================
//  ПРИМЕНЕНИЕ ПРЕСЕТА (ОСНОВНАЯ ФУНКЦИЯ)
// ============================================

export function applyPreset(name) {
    applyPresetWithAnimation(name, false);
}

// ============================================
//  ПРИМЕНЕНИЕ СОХРАНЕННЫХ НАСТРОЕК
// ============================================

export function applySavedSettings(applyPresetToo = true) {
    chrome.storage.local.get(['eqSettings', 'volumeBoost', 'bassBoost', 'selectedPreset', 'savedVolume', 'savedBass'], (result) => {
        if (result.savedVolume !== undefined && dom.volumeSlider && dom.volumeDisplay) {
            const vol = Math.min(800, Math.max(0, result.savedVolume));
            dom.volumeSlider.value = vol;
            dom.volumeDisplay.textContent = vol + '%';
            chrome.runtime.sendMessage({ action: 'setVolume', value: vol / 100 });
        } else if (result.volumeBoost !== undefined && dom.volumeSlider && dom.volumeDisplay) {
            const vol = Math.round(result.volumeBoost * 100);
            dom.volumeSlider.value = Math.min(800, Math.max(0, vol));
            dom.volumeDisplay.textContent = Math.min(800, Math.max(0, vol)) + '%';
            chrome.runtime.sendMessage({ action: 'setVolume', value: result.volumeBoost });
        }

        if (result.savedBass !== undefined && dom.bassSlider && dom.bassDisplay) {
            const bass = Math.min(12, Math.max(-12, result.savedBass));
            dom.bassSlider.value = bass;
            dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';
            chrome.runtime.sendMessage({ action: 'setBass', value: bass });
        } else if (result.bassBoost !== undefined && dom.bassSlider && dom.bassDisplay) {
            dom.bassSlider.value = result.bassBoost;
            dom.bassDisplay.textContent = result.bassBoost.toFixed(1) + ' dB';
            chrome.runtime.sendMessage({ action: 'setBass', value: result.bassBoost });
        }

        if (result.eqSettings) {
            const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
            sliders.forEach((slider) => {
                const freq = slider.dataset.freq;
                if (result.eqSettings[freq] !== undefined) {
                    slider.value = result.eqSettings[freq];
                    const valueSpan = slider.parentElement ? slider.parentElement.querySelector('.gain-value') : null;
                    if (valueSpan) {
                        valueSpan.textContent = result.eqSettings[freq].toFixed(1);
                        updateGainClass(valueSpan, result.eqSettings[freq]);
                    }
                }
            });
            const gains = getSliderGains();
            chrome.runtime.sendMessage({ action: 'updateEQ', gains: gains });
        }

        if (applyPresetToo && result.selectedPreset && PRESETS[result.selectedPreset]) {
            if (dom.presetSelect) dom.presetSelect.value = result.selectedPreset;
            applyPresetEQOnly(result.selectedPreset);
        }
    });
}

// ============================================
//  ЭКСПОРТ (все экспорты уникальны)
// ============================================

export { 
    animateSlider, 
    animateVolume, 
    animateBass,
    _audioContext as audioContext,
    _analyserNode as analyserNode,
    _isAudioInitialized as isAudioInitialized
};