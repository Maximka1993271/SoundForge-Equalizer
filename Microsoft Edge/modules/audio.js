// ============================================
//  AUDIO.JS - SoundForge v3.22.8 Edge 151
//  Microsoft Edge 151.0.4129.59 | Windows 11 25H2
//  Аудио операции
//  ИСПРАВЛЕНО: дублирующийся экспорт initAudioContext
//  ИСПРАВЛЕНО: все экспорты уникальны
//  ИСПРАВЛЕНО: applyPresetWithAnimation правильно обрабатывает isUserPreset
//  ИСПРАВЛЕНО: добавлен импорт PRESET_INFO
//  EDGE OPTIMIZED: без chrome.* прямых вызовов
// ============================================

import { state, dom } from './state.js';
import { setStatus, showLoading, updatePresetInfo, updateGainClass, updateConnectButton } from './ui.js';
import { getSliderGains, saveAllSettings } from './storage.js';
import { PRESETS, PRESET_INFO } from './config.js';
import { t } from './i18n.js';

const edgeAPI = globalThis.browser || globalThis.chrome;
if (!edgeAPI?.runtime) throw new Error('Microsoft Edge extension API unavailable');

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
                edgeAPI.runtime.sendMessage({ 
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
                    edgeAPI.runtime.sendMessage({ 
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
                edgeAPI.runtime.sendMessage({ 
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
                    edgeAPI.runtime.sendMessage({ 
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
        
        if (_audioContext && _audioContext.state !== 'closed') {
            try {
                _audioContext.close();
            } catch (e) {}
            _audioContext = null;
        }
        
        _audioContext = new AudioContextClass({
            latencyHint: 'interactive'
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
        _spectrumUpdateInterval = null;
    }
    
    _spectrumUpdateInterval = setInterval(() => {
        if (!_analyserNode || !_audioContext || _audioContext.state === 'closed') {
            const silentData = new Float32Array(64);
            silentData.isDummy = false;
            state.spectrumData = silentData;
            state.hasAudio = false;
            state.rmsValue = 0;
            return;
        }
        
        try {
            const frequencyData = new Float32Array(_analyserNode.frequencyBinCount);
            const timeDomainData = new Float32Array(_analyserNode.fftSize);
            _analyserNode.getFloatFrequencyData(frequencyData);
            _analyserNode.getFloatTimeDomainData(timeDomainData);

            let hasAudio = false;
            let sumSquares = 0;
            let peak = 0;
            for (let i = 0; i < timeDomainData.length; i++) {
                const sample = Number.isFinite(timeDomainData[i]) ? timeDomainData[i] : 0;
                const abs = Math.abs(sample);
                sumSquares += sample * sample;
                if (abs > peak) peak = abs;
            }
            const rms = Math.sqrt(sumSquares / Math.max(1, timeDomainData.length));
            hasAudio = rms > 0.001 || peak > 0.005;

            const normalized = new Float32Array(64);
            for (let i = 0; i < Math.min(frequencyData.length, 64); i++) {
                const db = frequencyData[i];
                const val = Number.isFinite(db) ? (db + 100) / 100 : 0;
                normalized[i] = Math.max(0, Math.min(1, val));
            }
            
            state.spectrumData = normalized;
            state.spectrumData.isDummy = false;
            state.hasAudio = hasAudio;
            state.rmsValue = Math.max(0, Math.min(1, rms));
            state.peakValue = Math.max(0, Math.min(1, peak));
            
        } catch (e) {
            const silentData = new Float32Array(64);
            silentData.isDummy = false;
            state.spectrumData = silentData;
            state.hasAudio = false;
            state.rmsValue = 0;
        }
    }, 80);
}

function generateDummySpectrum() {
    return new Float32Array(64);
}

// ============================================
//  ОСТАНОВКА ПОЛЛИНГА СПЕКТРА
// ============================================

export function stopSpectrumPolling() {
    if (_spectrumUpdateInterval) {
        clearInterval(_spectrumUpdateInterval);
        _spectrumUpdateInterval = null;
    }
}

// ============================================
//  ПРИМЕНЕНИЕ ПРЕСЕТА С АНИМАЦИЕЙ
// ============================================

export async function applyPresetWithAnimation(name, isUserPreset = false) {
    let preset;
    
    console.log(`🎵 Применяем пресет: "${name}", isUserPreset: ${isUserPreset}`);
    
    if (isUserPreset) {
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
        edgeAPI.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true });
        edgeAPI.runtime.sendMessage({ action: 'setVolume', value: targetVolume / 100, instant: true });
        edgeAPI.runtime.sendMessage({ action: 'setBass', value: targetBass, instant: true });
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
            const presetDesc = isUserPreset ? name : (PRESET_INFO[name]?.desc_ru || name);
            setStatus('ready', '✅ Пресет применен: ' + presetDesc);
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
        edgeAPI.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true });
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
        edgeAPI.runtime.sendMessage({ action: 'disconnect' }, () => {
            showLoading(false);
            if (edgeAPI.runtime.lastError) {
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
        
        edgeAPI.runtime.sendMessage({ action: 'connect' }, () => {
            showLoading(false);
            if (edgeAPI.runtime.lastError) {
                setStatus('disconnected', '⚠️ Ошибка: ' + edgeAPI.runtime.lastError.message);
                return;
            }
            
            setTimeout(() => {
                edgeAPI.runtime.sendMessage({ action: 'getStatus' }, (resp) => {
                    if (resp && resp.status === 'connected') {
                        setStatus('connected', t('status_connected'));
                        applySavedSettings(false);
                    } else {
                        setTimeout(() => {
                            edgeAPI.runtime.sendMessage({ action: 'getStatus' }, (resp2) => {
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
            edgeAPI.runtime.sendMessage({ action: 'updateEQ', gains: gains, instant: true });
            edgeAPI.runtime.sendMessage({ action: 'setVolume', value: 1.0, instant: true });
            edgeAPI.runtime.sendMessage({ action: 'setBass', value: 0, instant: true });
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
    edgeAPI.storage.local.get([
        'sf_eqSettings', 'eqSettings',
        'sf_volumeBoost', 'volumeBoost',
        'sf_bassBoost', 'bassBoost',
        'sf_selectedPreset', 'selectedPreset',
        'sf_savedVolume', 'savedVolume',
        'sf_savedBass', 'savedBass'
    ], (result) => {
        const eqSettings = result.sf_eqSettings ?? result.eqSettings;
        const volumeBoost = result.sf_volumeBoost ?? result.volumeBoost;
        const bassBoost = result.sf_bassBoost ?? result.bassBoost;
        const selectedPreset = result.sf_selectedPreset ?? result.selectedPreset;
        const savedVolume = result.sf_savedVolume ?? result.savedVolume;
        const savedBass = result.sf_savedBass ?? result.savedBass;

        if (savedVolume !== undefined && dom.volumeSlider && dom.volumeDisplay) {
            const vol = Math.min(800, Math.max(0, Number(savedVolume) || 0));
            dom.volumeSlider.value = vol;
            dom.volumeDisplay.textContent = vol + '%';
            edgeAPI.runtime.sendMessage({ action: 'setVolume', value: vol / 100 });
        } else if (volumeBoost !== undefined && dom.volumeSlider && dom.volumeDisplay) {
            const vol = Math.min(800, Math.max(0, Math.round((Number(volumeBoost) || 0) * 100)));
            dom.volumeSlider.value = vol;
            dom.volumeDisplay.textContent = vol + '%';
            edgeAPI.runtime.sendMessage({ action: 'setVolume', value: vol / 100 });
        }

        if (savedBass !== undefined && dom.bassSlider && dom.bassDisplay) {
            const bass = Math.min(12, Math.max(-12, Number(savedBass) || 0));
            dom.bassSlider.value = bass;
            dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';
            edgeAPI.runtime.sendMessage({ action: 'setBass', value: bass });
        } else if (bassBoost !== undefined && dom.bassSlider && dom.bassDisplay) {
            const bass = Math.min(12, Math.max(-12, Number(bassBoost) || 0));
            dom.bassSlider.value = bass;
            dom.bassDisplay.textContent = bass.toFixed(1) + ' dB';
            edgeAPI.runtime.sendMessage({ action: 'setBass', value: bass });
        }

        if (eqSettings) {
            const sliders = dom.eqSliders ? Array.from(dom.eqSliders) : [];
            sliders.forEach((slider) => {
                const freq = slider.dataset.freq;
                if (eqSettings[freq] !== undefined) {
                    const gain = Number(eqSettings[freq]) || 0;
                    slider.value = gain;
                    const valueSpan = slider.parentElement ? slider.parentElement.querySelector('.gain-value') : null;
                    if (valueSpan) {
                        valueSpan.textContent = gain.toFixed(1);
                        updateGainClass(valueSpan, gain);
                    }
                }
            });
            const gains = getSliderGains();
            edgeAPI.runtime.sendMessage({ action: 'updateEQ', gains: gains });
        }

        if (applyPresetToo && selectedPreset && PRESETS[selectedPreset]) {
            if (dom.presetSelect) dom.presetSelect.value = selectedPreset;
            applyPresetEQOnly(selectedPreset);
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