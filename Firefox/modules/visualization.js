// ============================================
//  VISUALIZATION.JS - v3.22.8 (Firefox)
//  С ПОДДЕРЖКОЙ ЭФФЕКТОВ: Спектр | Волны | Огонь | Неон
//  ПОЛНЫЙ ПЕРЕНОС ИЗ EDGE
// ============================================

import { state, dom } from './state.js';
import { t, getCurrentLang } from './i18n.js';
import { getSliderGains } from './storage.js';

console.log('🟢 SoundForge Visualization v3.22.8 — с эффектами (Firefox)');

// ============================================
//  ГЛОБАЛЬНЫЙ ДОСТУП К ЭФФЕКТАМ
// ============================================

let _effectsLoaded = false;
let _effects = null;
let _effectsInitialized = false;

function getEffects() {
  if (_effects) return _effects;
  if (window.SoundForgeEffects) {
    _effects = window.SoundForgeEffects;
    _effectsLoaded = true;
    return _effects;
  }
  return null;
}

// ============================================
//  КОНФИГУРАЦИЯ КЛИППИНГА
// ============================================

export const CLIP_CONFIG = {
  threshold: 0.85,
  holdTime: 2000,
  peakHistory: 20,
  cooldownTime: 3000,
  enabled: true,
  volumeThreshold: 400,
  levels: {
    warning: 0.70,
    danger: 0.85,
    critical: 0.95
  }
};

let _clipState = {
  isClipping: false,
  lastTrigger: 0,
  history: [],
  timeoutId: null,
  lastVolume: 0,
  warningShown: false,
  smoothRms: 0
};

// ============================================
//  ПЛАВНЫЙ ФИЛЬТР ДЛЯ СПЕКТРА
// ============================================

class SmoothSpectrum {
  constructor(size = 64) {
    this.size = size;
    this.smooth = new Float32Array(size);
    this.peak = new Float32Array(size);
    this.peakHold = new Float32Array(size);
    this.attack = 0.25;
    this.release = 0.08;
    this.peakDecay = 0.96;
    this.minPeakHold = 5;
    this.hasData = false;
    this.lastRealData = new Float32Array(size);
    this.transitionProgress = 1;
    this.dummyPhase = 0;
    
    for (let i = 0; i < size; i++) {
      const val = Math.sin(i * 0.3) * 0.15 + 0.15;
      this.smooth[i] = val;
      this.peak[i] = val;
      this.lastRealData[i] = val;
    }
  }

  generateDummyData(time) {
    this.dummyPhase += 0.015;
    const result = new Float32Array(this.size);
    const amp = 0.30;
    
    for (let i = 0; i < this.size; i++) {
      const pos = i / this.size;
      const wave1 = Math.sin(time * 1.2 + pos * 2.5) * 0.25;
      const wave2 = Math.sin(time * 1.8 + pos * 4.5 + 1.0) * 0.18;
      const wave3 = Math.sin(time * 0.7 + pos * 1.2 + 2.0) * 0.12;
      const wave4 = Math.sin(this.dummyPhase + pos * 6.0) * 0.08;
      
      const bassPulse = Math.sin(time * 0.6) * 0.06 + 0.06;
      const bassBoost = i < 10 ? bassPulse * (1 - i / 10) : 0;
      const highFalloff = i > 40 ? 1 - (i - 40) / 24 : 1;
      
      let value = 0.10 + wave1 + wave2 + wave3 + wave4 + bassBoost;
      value = Math.max(0, Math.min(1, value * amp * highFalloff));
      result[i] = value;
    }
    return result;
  }

  update(data, isDummy = false) {
    const time = Date.now() / 1000;
    
    let hasRealData = false;
    if (data && data.length >= this.size && !isDummy) {
      let sum = 0;
      for (let i = 0; i < Math.min(data.length, 16); i++) {
        sum += data[i] || 0;
      }
      if (sum > 0.05) {
        hasRealData = true;
        this.hasData = true;
        for (let i = 0; i < Math.min(data.length, this.size); i++) {
          this.lastRealData[i] = data[i] || 0;
        }
      }
    }

    let targetData;
    if (hasRealData) {
      targetData = data;
      this.transitionProgress = Math.min(1, this.transitionProgress + 0.05);
    } else if (this.hasData) {
      targetData = this.lastRealData;
      this.transitionProgress = Math.max(0, this.transitionProgress - 0.02);
    } else {
      targetData = this.generateDummyData(time);
      this.transitionProgress = 1;
    }

    for (let i = 0; i < this.size; i++) {
      const target = (targetData[i] || 0) * this.transitionProgress;
      const current = this.smooth[i] || 0;
      
      if (target > current) {
        this.smooth[i] += (target - current) * this.attack;
      } else {
        this.smooth[i] += (target - current) * this.release;
      }
      
      this.smooth[i] = Math.max(0, Math.min(1, this.smooth[i]));
      
      if (this.smooth[i] > this.peak[i]) {
        this.peak[i] = this.smooth[i];
        this.peakHold[i] = this.minPeakHold;
      } else {
        this.peakHold[i] -= 0.1;
        if (this.peakHold[i] <= 0) {
          this.peak[i] *= this.peakDecay;
          if (this.peak[i] < 0.01) {
            this.peak[i] = 0;
          }
        }
      }
    }
    
    return this.smooth;
  }

  getSmooth() {
    return this.smooth;
  }

  getPeaks() {
    return this.peak;
  }
  
  reset() {
    this.transitionProgress = 0;
    this.hasData = false;
    const time = Date.now() / 1000;
    for (let i = 0; i < this.size; i++) {
      const val = Math.sin(time * 0.5 + i * 0.3) * 0.15 + 0.15;
      this.smooth[i] = val;
      this.peak[i] = val * 0.8;
      this.lastRealData[i] = val;
    }
  }
}

const smoothSpectrum = new SmoothSpectrum(64);

// ============================================
//  ПЛАВНЫЙ ФИЛЬТР ДЛЯ VU
// ============================================

let _vuSmooth = 0.15;
let _vuPeakSmooth = 0.15;
let _vuPeakHold = 0;
let _vuHistory = [];
const _vuHistorySize = 10;

function smoothVU(value) {
  _vuHistory.push(value);
  if (_vuHistory.length > _vuHistorySize) {
    _vuHistory.shift();
  }
  
  const sorted = [..._vuHistory].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  _vuSmooth = _vuSmooth * 0.75 + median * 0.25;
  
  if (value > _vuPeakSmooth) {
    _vuPeakSmooth = value;
    _vuPeakHold = 10;
  }
  
  if (_vuPeakHold > 0) {
    _vuPeakHold -= 0.05;
  } else {
    _vuPeakSmooth *= 0.98;
    if (_vuPeakSmooth < 0.001) _vuPeakSmooth = 0;
  }
  
  return {
    smooth: _vuSmooth,
    peak: _vuPeakSmooth,
    hold: _vuPeakHold
  };
}

// ============================================
//  КЛИППИНГ
// ============================================

export function checkClipping(rmsValue) {
  if (!CLIP_CONFIG.enabled) return;
  if (rmsValue === undefined || rmsValue === null) return;
  
  _clipState.smoothRms = _clipState.smoothRms * 0.85 + rmsValue * 0.15;
  const smoothRms = _clipState.smoothRms;
  const now = Date.now();
  
  _clipState.history.push(smoothRms);
  if (_clipState.history.length > CLIP_CONFIG.peakHistory) {
    _clipState.history.shift();
  }
  
  let currentVolume = 100;
  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) {
    const parsed = parseFloat(volumeSlider.value);
    currentVolume = isNaN(parsed) ? 100 : parsed;
  }
  _clipState.lastVolume = currentVolume;
  
  const isExtremeVolume = currentVolume >= CLIP_CONFIG.volumeThreshold;
  const isCriticalRms = smoothRms > CLIP_CONFIG.levels.critical;
  const isHighRms = smoothRms > CLIP_CONFIG.levels.danger;
  const isClippingNow = (isExtremeVolume && isHighRms) || isCriticalRms;
  
  if (isClippingNow) {
    if (now - _clipState.lastTrigger < CLIP_CONFIG.cooldownTime) {
      return;
    }
    
    let level = 'danger';
    let warningText = '';
    
    if (isCriticalRms || currentVolume >= 600) {
      level = 'critical';
      const warning = t('clipping.critical');
      warningText = warning ? `${warning.title}\n${warning.message}` : 'CRITICAL CLIPPING';
    } else if (isHighRms || currentVolume >= 400) {
      level = 'danger';
      const warning = t('clipping.danger');
      warningText = warning ? `${warning.title}\n${warning.message}` : 'DANGER CLIPPING';
    } else {
      level = 'warning';
      const warning = t('clipping.warning');
      warningText = warning ? `${warning.title}\n${warning.message}` : 'WARNING CLIPPING';
    }
    
    showClipIndicator(level, currentVolume, smoothRms, warningText);
    _clipState.lastTrigger = now;
    _clipState.isClipping = true;
    
    console.warn(`🔴 ${warningText} | RMS: ${(smoothRms * 100).toFixed(1)}%, Volume: ${currentVolume}%`);
  }
}

export function showClipIndicator(level = 'danger', volume = 100, rms = 0, warningText = '') {
  const indicator = document.getElementById('clipIndicator');
  if (!indicator) return;
  
  if (_clipState.timeoutId) {
    clearTimeout(_clipState.timeoutId);
    _clipState.timeoutId = null;
  }
  
  const warningObj = t('clipping.' + level);
  let displayText = warningText || (warningObj ? warningObj.title : 'CLIPPING');
  
  if (volume >= 400) {
    displayText += ` (${Math.round(volume)}%)`;
  }
  
  indicator.textContent = displayText;
  indicator.style.display = 'block';
  indicator.style.animation = 'none';
  void indicator.offsetWidth;
  
  if (level === 'critical') {
    indicator.style.animation = 'clipPulse 0.3s ease-in-out 3';
    _clipState.timeoutId = setTimeout(() => {
      hideClipIndicator();
    }, CLIP_CONFIG.holdTime * 2);
  } else if (level === 'warning') {
    indicator.style.animation = 'clipPulse 0.6s ease-in-out 2';
    _clipState.timeoutId = setTimeout(() => {
      hideClipIndicator();
    }, CLIP_CONFIG.holdTime);
  } else {
    indicator.style.animation = 'clipPulse 0.5s ease-in-out';
    _clipState.timeoutId = setTimeout(() => {
      hideClipIndicator();
    }, CLIP_CONFIG.holdTime);
  }
}

export function hideClipIndicator() {
  const indicator = document.getElementById('clipIndicator');
  if (!indicator) return;
  indicator.style.display = 'none';
  _clipState.isClipping = false;
  if (_clipState.timeoutId) {
    clearTimeout(_clipState.timeoutId);
    _clipState.timeoutId = null;
  }
}

export function setupClipIndicatorDismiss() {
  const indicator = document.getElementById('clipIndicator');
  if (!indicator) return;
  indicator.addEventListener('click', () => {
    hideClipIndicator();
  });
}

// ============================================
//  ИНИЦИАЛИЗАЦИЯ ЭФФЕКТОВ
// ============================================

export function initVisualizationEffects() {
  if (_effectsInitialized) return;
  
  const effects = getEffects();
  if (!effects) {
    console.warn('⚠️ SoundForgeEffects не загружены, инициализация отложена');
    setTimeout(() => {
      const effects2 = getEffects();
      if (effects2) {
        effects2.initEffects();
        _effectsInitialized = true;
        setupEffectButton();
        console.log('🎨 Эффекты визуализации активированы (отложенная инициализация)');
      }
    }, 500);
    return;
  }
  
  effects.initEffects();
  _effectsInitialized = true;
  state.currentEffect = effects.getCurrentEffect();
  setupEffectButton();
  
  console.log('🎨 Эффекты визуализации активированы: ' + state.currentEffect);
}

// ============================================
//  КНОПКА ПЕРЕКЛЮЧЕНИЯ ЭФФЕКТОВ
// ============================================

function setupEffectButton() {
  const btn = document.getElementById('effectBtn');
  if (!btn) {
    console.warn('⚠️ Кнопка эффектов не найдена');
    return;
  }
  
  updateEffectButtonLabel();
  
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    cycleEffect();
  });
}

export function updateEffectButtonLabel() {
  const btn = document.getElementById('effectBtn');
  if (!btn) return;
  
  const effects = getEffects();
  if (!effects) {
    btn.textContent = '🎨 ' + (t('effects.spectrum') || 'Спектр');
    return;
  }
  
  const current = effects.getCurrentEffect();
  const name = effects.getEffectName(current) || getEffectNameLocal(current);
  btn.textContent = '🎨 ' + name;
}

function getEffectNameLocal(effectId) {
  const names = {
    spectrum: t('effects.spectrum') || '📊 Спектр',
    waves: t('effects.waves') || '🌊 Волны',
    fire: t('effects.fire') || '🔥 Огонь',
    neon: t('effects.neon') || '💜 Неон'
  };
  return names[effectId] || effectId;
}

function cycleEffect() {
  const effects = getEffects();
  if (!effects) {
    console.warn('⚠️ Эффекты не загружены');
    return;
  }
  
  const next = effects.cycleEffect();
  state.currentEffect = next;
  updateEffectButtonLabel();
  
  console.log('🎨 Эффект изменен: ' + effects.getEffectName(next));
}

// ============================================
//  ОБНОВЛЕНИЕ КНОПКИ ПРИ СМЕНЕ ЯЗЫКА
// ============================================

export function updateEffectButtonLanguage() {
  updateEffectButtonLabel();
}

export function initVisualization() {
  setupClipIndicatorDismiss();
  initVisualizationEffects();
  console.log('🟢 Индикатор клиппинга активирован');
  const effects = getEffects();
  if (effects) {
    console.log('🎨 Эффект: ' + effects.getEffectName(effects.getCurrentEffect()));
  }
}

// ============================================
//  ГРАФИК АЧХ
// ============================================

export function updateEQGraph() {
  const canvas = document.getElementById('eqGraphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const width = canvas.width;
  const height = canvas.height;
  const gains = getSliderGains();
  const freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const isDark = state.currentTheme === 'dark' || 
                 (state.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
  ctx.fillRect(0, 0, width, height);

  const gridColor = isDark ? 'rgba(76, 175, 80, 0.10)' : 'rgba(76, 175, 80, 0.10)';
  const gridColorStrong = isDark ? 'rgba(76, 175, 80, 0.20)' : 'rgba(76, 175, 80, 0.20)';
  
  const margin = { top: 8, bottom: 18, left: 36, right: 36 };
  const graphHeight = height - margin.top - margin.bottom;
  const graphWidth = width - margin.left - margin.right;
  
  for (let h = -2; h <= 2; h++) {
    const yPos = margin.top + graphHeight / 2 - (h / 2) * (graphHeight / 2);
    ctx.strokeStyle = (h === 0) ? gridColorStrong : gridColor;
    ctx.lineWidth = (h === 0) ? 1 : 0.5;
    ctx.setLineDash((h === 0) ? [] : [3, 5]);
    ctx.beginPath();
    ctx.moveTo(margin.left, yPos);
    ctx.lineTo(width - margin.right, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const barCount = 10;
  const barWidth = graphWidth / (barCount - 1);
  for (let v = 1; v < barCount - 1; v++) {
    const xPos = margin.left + v * barWidth;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(xPos, margin.top);
    ctx.lineTo(xPos, margin.top + graphHeight);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '6px Segoe UI, Arial, sans-serif';
  
  const valueLabels = ['+12', '0', '-12'];
  const valuePositions = [0, 0.5, 1];
  
  for (let vl = 0; vl < valueLabels.length; vl++) {
    const valY = margin.top + valuePositions[vl] * graphHeight;
    ctx.fillStyle = isDark ? 'rgba(200,255,200,0.25)' : 'rgba(50,150,50,0.25)';
    ctx.fillText(valueLabels[vl], width - margin.right + 8, valY);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '6px Segoe UI, Arial, sans-serif';
  
  const leftLabels = ['12', '0', '12'];
  for (let vl = 0; vl < leftLabels.length; vl++) {
    const valY = margin.top + valuePositions[vl] * graphHeight;
    ctx.fillStyle = isDark ? 'rgba(200,255,200,0.25)' : 'rgba(50,150,50,0.25)';
    ctx.fillText(leftLabels[vl], margin.left - 22, valY);
  }

  const barWidthGraph = graphWidth / (freqs.length - 1);

  const points = freqs.map((freq, i) => {
    const gain = gains[freq] || 0;
    return {
      x: margin.left + i * barWidthGraph,
      y: margin.top + graphHeight / 2 - (gain / 12) * (graphHeight / 2),
      gain: gain
    };
  });

  ctx.beginPath();
  ctx.moveTo(points[0].x, margin.top + graphHeight);
  points.forEach((p) => { ctx.lineTo(p.x, p.y); });
  ctx.lineTo(points[points.length - 1].x, margin.top + graphHeight);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + graphHeight);
  if (isDark) {
    gradient.addColorStop(0, 'rgba(76, 175, 80, 0.20)');
    gradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.05)');
    gradient.addColorStop(1, 'rgba(76, 175, 80, 0.02)');
  } else {
    gradient.addColorStop(0, 'rgba(76, 175, 80, 0.12)');
    gradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.03)');
    gradient.addColorStop(1, 'rgba(76, 175, 80, 0.01)');
  }
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else {
      const prev = points[i - 1];
      ctx.bezierCurveTo(
        prev.x + (p.x - prev.x) * 0.5, prev.y,
        p.x - (p.x - prev.x) * 0.5, p.y,
        p.x, p.y
      );
    }
  });
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(76, 175, 80, 0.3)';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  points.forEach((p) => {
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
    if (p.gain > 0.1) {
      glow.addColorStop(0, 'rgba(76, 175, 80, 0.5)');
      glow.addColorStop(1, 'rgba(76, 175, 80, 0)');
    } else if (p.gain < -0.1) {
      glow.addColorStop(0, 'rgba(255, 107, 107, 0.4)');
      glow.addColorStop(1, 'rgba(255, 107, 107, 0)');
    } else {
      glow.addColorStop(0, 'rgba(136, 153, 187, 0.3)');
      glow.addColorStop(1, 'rgba(136, 153, 187, 0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = p.gain > 0.1 ? '#4CAF50' : (p.gain < -0.1 ? '#ff6b6b' : '#8899bb');
    ctx.fill();
    
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  const freqLabels = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '6px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,255,200,0.3)' : 'rgba(50,150,50,0.3)';
  
  for (let f = 0; f < freqLabels.length; f++) {
    const labelX = margin.left + f * barWidthGraph;
    let offsetX = 0;
    if (f === 0) offsetX = 6;
    if (f === freqLabels.length - 1) offsetX = -6;
    ctx.fillText(freqLabels[f], labelX + offsetX, height - 16);
  }
}

// ============================================
//  СПЕКТР С ПОДДЕРЖКОЙ ЭФФЕКТОВ
// ============================================

export function updateSpectrum() {
  const canvas = document.getElementById('spectrumCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  let hasData = false;
  let isDummy = false;
  
  if (state.spectrumData && state.spectrumData.length > 0) {
    if (state.spectrumData.isDummy) {
      isDummy = true;
    } else {
      for (let i = 0; i < Math.min(state.spectrumData.length, 16); i++) {
        if (state.spectrumData[i] > 0.01) { 
          hasData = true; 
          break; 
        }
      }
    }
  }

  let processedData;
  if (hasData && !isDummy) {
    processedData = smoothSpectrum.update(state.spectrumData, false);
  } else {
    processedData = smoothSpectrum.update(null, true);
  }

  // Используем эффекты для рендеринга
  const effects = getEffects();
  if (effects && effects.renderEffect) {
    effects.renderEffect(processedData);
  } else {
    // Fallback: стандартный рендеринг
    renderSpectrumFallback(ctx, width, height, processedData);
  }
  
  let maxVal = 0;
  for (let m = 0; m < Math.min(processedData.length, 32); m++) {
    if (processedData[m] > maxVal) maxVal = processedData[m];
  }
  updateVUMeter(maxVal);
}

// Fallback рендеринг (если эффекты не загружены)
function renderSpectrumFallback(ctx, width, height, data) {
  const isDark = state.currentTheme === 'dark' || 
                 (state.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const barCount = 32;
  const barWidth = width / barCount;
  const maxHeight = height - 4;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  ctx.fillRect(0, 0, width, height);

  for (let j = 0; j < barCount; j++) {
    const value = data[j] || 0;
    const barHeight = Math.max(2, value * maxHeight);
    const x = j * barWidth;
    const y = height - barHeight - 2;

    let color;
    if (value > 0.85) color = 'rgba(255, 50, 50, 0.95)';
    else if (value > 0.70) color = 'rgba(255, 150, 50, 0.90)';
    else if (value > 0.50) color = 'rgba(255, 220, 50, 0.85)';
    else if (value > 0.30) color = 'rgba(100, 220, 100, 0.85)';
    else color = 'rgba(50, 200, 50, 0.80)';

    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color.replace('0.95', '0.5').replace('0.90', '0.4').replace('0.85', '0.35').replace('0.80', '0.3'));
    gradient.addColorStop(1, isDark ? 'rgba(76, 175, 80, 0.05)' : 'rgba(76, 175, 80, 0.05)');
    ctx.fillStyle = gradient;
    
    const radius = 2;
    ctx.beginPath();
    ctx.moveTo(x + 1 + radius, y);
    ctx.lineTo(x + barWidth - 2 - radius, y);
    ctx.quadraticCurveTo(x + barWidth - 2, y, x + barWidth - 2, y + radius);
    ctx.lineTo(x + barWidth - 2, height - 2);
    ctx.lineTo(x + 1, height - 2);
    ctx.lineTo(x + 1, y + radius);
    ctx.quadraticCurveTo(x + 1, y, x + 1 + radius, y);
    ctx.fill();
  }
}

// ============================================
//  VU-МЕТР
// ============================================

export function updateVUMeter(value) {
  const vuData = smoothVU(value);
  const percent = Math.min(100, Math.max(0, vuData.smooth * 100));
  
  const fill = document.getElementById('vuFill');
  const peak = document.getElementById('vuPeak');
  const val = document.getElementById('vuValue');

  if (fill) {
    fill.style.width = percent + '%';
    fill.style.transition = 'width 0.08s cubic-bezier(0.4, 0, 0.2, 1)';
  }

  if (percent > 90) {
    if (fill) fill.style.background = 'linear-gradient(90deg, #ff6b6b, #e94560)';
  } else if (percent > 70) {
    if (fill) fill.style.background = 'linear-gradient(90deg, #ffd93d, #ff6b6b)';
  } else if (percent > 40) {
    if (fill) fill.style.background = 'linear-gradient(90deg, #8BC34A, #ffd93d)';
  } else {
    if (fill) fill.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
  }

  if (vuData.hold > 0) {
    const peakPercent = Math.min(100, Math.max(0, vuData.peak * 100));
    if (peak) {
      peak.style.left = peakPercent + '%';
      peak.style.opacity = 1;
      peak.style.transition = 'none';
      peak.style.background = '#4CAF50';
    }
  } else {
    if (peak) {
      peak.style.opacity = 0.2;
      peak.style.transition = 'opacity 0.5s';
      peak.style.background = '#8BC34A';
    }
  }

  const smoothDbValue = vuData.smooth;
  const dB = smoothDbValue > 0.001 ? Math.round(20 * Math.log10(smoothDbValue) * 10) / 10 : -Infinity;
  
  if (val) {
    if (dB <= -60 || !isFinite(dB)) {
      val.textContent = '-∞ dB';
    } else {
      val.textContent = dB.toFixed(1) + ' dB';
      val.style.transition = 'color 0.3s';
    }
    
    if (dB > -6) {
      val.style.color = '#ff6b6b';
    } else if (dB > -12) {
      val.style.color = '#ffd93d';
    } else if (dB > -24) {
      val.style.color = '#8BC34A';
    } else {
      val.style.color = '#4CAF50';
    }
  }
  
  checkClipping(vuData.smooth);
}

// ============================================
//  ОСНОВНОЙ ЦИКЛ
// ============================================

export function visualizationLoop() {
  updateSpectrum();
  updateEQGraph();
  state.animationFrameId = requestAnimationFrame(visualizationLoop);
}

// ============================================
//  СБРОС
// ============================================

export function resetVisualization() {
  smoothSpectrum.reset();
  _vuSmooth = 0.15;
  _vuPeakSmooth = 0.15;
  _vuPeakHold = 0;
  _vuHistory = [];
  console.log('🔄 Визуализация сброшена');
}

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
  updateEQGraph,
  updateSpectrum,
  updateVUMeter,
  visualizationLoop,
  checkClipping,
  showClipIndicator,
  hideClipIndicator,
  setupClipIndicatorDismiss,
  initVisualization,
  resetVisualization,
  CLIP_CONFIG,
  initVisualizationEffects,
  updateEffectButtonLabel
};