// ============================================
//  VISUALIZATION.JS - SoundForge v3.22.8 Firefox 153
//  Mozilla Firefox 153.1.0 ESR | Windows 11 25H2
//  Визуализация спектра, VU-метр, график АЧХ, эффекты
// ============================================

import { state as appState } from './state.js';
import { t } from './i18n.js';
import { getSliderGains } from './storage.js';
import { 
  getCurrentEffect, 
  setCurrentEffect, 
  initEffects, 
  renderEffect,
  getEffectName
} from './visualization-effects.js';

console.log('🟢 SoundForge Visualization v3.22.8 Firefox 153');

// ============================================
//  ПЕРЕМЕННЫЕ СОСТОЯНИЯ
// ============================================

var _effectsInitialized = false;
var _animationFrameId = null;
var _isRunning = false;

// ============================================
//  ИНИЦИАЛИЗАЦИЯ ЭФФЕКТОВ
// ============================================

function initVisualizationEffects() {
  if (_effectsInitialized) return;
  _effectsInitialized = true;
  
  initEffects();
  appState.currentEffect = getCurrentEffect();
  setupEffectButton();
  
  console.log('🎨 Эффекты визуализации активированы:', appState.currentEffect);
}

function setupEffectButton() {
  var btn = document.getElementById('effectBtn');
  if (!btn) return;
  
  updateEffectButtonLabel();
  
  btn.addEventListener('click', function() {
    cycleEffect();
  });
}

function updateEffectButtonLabel() {
  var btn = document.getElementById('effectBtn');
  if (!btn) return;
  
  var current = getCurrentEffect();
  var name = getEffectName(current);
  btn.textContent = '🎨 ' + name;
}

function cycleEffect() {
  var effects = ['spectrum', 'waves', 'fire', 'neon'];
  var current = getCurrentEffect();
  var currentIndex = effects.indexOf(current);
  var nextIndex = (currentIndex + 1) % effects.length;
  var nextEffect = effects[nextIndex];
  
  setCurrentEffect(nextEffect);
  appState.currentEffect = nextEffect;
  updateEffectButtonLabel();
  
  try {
    var browserAPI = globalThis.browser;
    browserAPI.runtime.sendMessage({
      action: 'effectChanged',
      effect: nextEffect,
      source: 'popup'
    });
  } catch (e) {}
  
  console.log('🎨 Эффект изменен:', getEffectName(nextEffect));
  updateSpectrum();
}

function syncEffect(effect) {
  var effects = ['spectrum', 'waves', 'fire', 'neon'];
  if (!effects.includes(effect)) return false;
  
  var changed = setCurrentEffect(effect);
  if (changed) {
    appState.currentEffect = effect;
    updateEffectButtonLabel();
    updateSpectrum();
    console.log('🔄 Эффект синхронизирован:', getEffectName(effect));
  }
  return changed;
}

// ============================================
//  ПЛАВНЫЙ ФИЛЬТР ДЛЯ СПЕКТРА
// ============================================

function SmoothSpectrum(size) {
  size = size || 64;
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
  
  for (var i = 0; i < size; i++) {
    this.smooth[i] = 0;
    this.peak[i] = 0;
    this.lastRealData[i] = 0;
  }
}

SmoothSpectrum.prototype.update = function(data) {
  var hasRealData = false;
  if (data && data.length >= this.size) {
    var sum = 0;
    for (var i = 0; i < Math.min(data.length, 16); i++) {
      sum += data[i] || 0;
    }
    if (sum > 0.05) {
      hasRealData = true;
      this.hasData = true;
      for (var j = 0; j < Math.min(data.length, this.size); j++) {
        this.lastRealData[j] = data[j] || 0;
      }
    }
  }

  var targetData;
  if (hasRealData) {
    targetData = data;
    this.transitionProgress = Math.min(1, this.transitionProgress + 0.05);
  } else if (this.hasData) {
    targetData = this.lastRealData;
    this.transitionProgress = Math.max(0, this.transitionProgress - 0.02);
  } else {
    targetData = new Float32Array(this.size);
    this.transitionProgress = 1;
  }

  for (var k = 0; k < this.size; k++) {
    var target = (targetData[k] || 0) * this.transitionProgress;
    var current = this.smooth[k] || 0;
    
    if (target > current) {
      this.smooth[k] += (target - current) * this.attack;
    } else {
      this.smooth[k] += (target - current) * this.release;
    }
    
    this.smooth[k] = Math.max(0, Math.min(1, this.smooth[k]));
    
    if (this.smooth[k] > this.peak[k]) {
      this.peak[k] = this.smooth[k];
      this.peakHold[k] = this.minPeakHold;
    } else {
      this.peakHold[k] -= 0.1;
      if (this.peakHold[k] <= 0) {
        this.peak[k] *= this.peakDecay;
        if (this.peak[k] < 0.01) {
          this.peak[k] = 0;
        }
      }
    }
  }
  
  return this.smooth;
};

SmoothSpectrum.prototype.reset = function() {
  this.transitionProgress = 0;
  this.hasData = false;
  for (var i = 0; i < this.size; i++) {
    this.smooth[i] = 0;
    this.peak[i] = 0;
    this.lastRealData[i] = 0;
  }
};

var smoothSpectrum = new SmoothSpectrum(64);

// ============================================
//  КОНФИГУРАЦИЯ КЛИППИНГА
// ============================================

var CLIP_CONFIG = {
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

var _clipState = {
  isClipping: false,
  lastTrigger: 0,
  history: [],
  timeoutId: null,
  lastVolume: 0,
  warningShown: false,
  smoothRms: 0
};

// ============================================
//  VU-МЕТР (ПЛАВНЫЙ ФИЛЬТР)
// ============================================

var _vuSmooth = 0;
var _vuPeakSmooth = 0;
var _vuPeakHold = 0;
var _vuHistory = [];

function smoothVU(value) {
  _vuHistory.push(value);
  if (_vuHistory.length > 10) _vuHistory.shift();
  
  var sorted = _vuHistory.slice().sort(function(a, b) { return a - b; });
  var median = sorted[Math.floor(sorted.length / 2)];
  
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
//  ОБНОВЛЕНИЕ СПЕКТРА
// ============================================

function updateSpectrum() {
  var canvas = document.getElementById('spectrumCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  var hasData = false;
  if (appState.spectrumData && appState.spectrumData.length > 0) {
    for (var i = 0; i < Math.min(appState.spectrumData.length, 16); i++) {
      if (appState.spectrumData[i] > 0.01) {
        hasData = true;
        break;
      }
    }
  }

  var processedData;
  if (hasData) {
    processedData = smoothSpectrum.update(appState.spectrumData);
  } else {
    processedData = smoothSpectrum.update(null);
  }

  renderEffect(processedData);
  
  var vuValue = appState.hasAudio
    ? Math.max(0, Math.min(1, Math.max(appState.rmsValue || 0, (appState.peakValue || 0) * 0.5)))
    : 0;
  updateVUMeter(vuValue);
}

// ============================================
//  VU-МЕТР
// ============================================

function updateVUMeter(value) {
  value = value || 0;
  var vuData = smoothVU(value);
  var percent = Math.min(100, Math.max(0, vuData.smooth * 100));
  
  var fill = document.getElementById('vuFill');
  var peak = document.getElementById('vuPeak');
  var val = document.getElementById('vuValue');

  if (fill) {
    fill.style.width = percent + '%';
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
    var peakPercent = Math.min(100, Math.max(0, vuData.peak * 100));
    if (peak) {
      peak.style.left = peakPercent + '%';
      peak.style.opacity = 1;
    }
  } else {
    if (peak) {
      peak.style.opacity = 0.2;
    }
  }

  var smoothDbValue = vuData.smooth;
  var dB = smoothDbValue > 0.001 ? Math.round(20 * Math.log10(smoothDbValue) * 10) / 10 : -Infinity;
  
  if (val) {
    if (dB <= -60 || !isFinite(dB)) {
      val.textContent = '-∞ dB';
    } else {
      val.textContent = dB.toFixed(1) + ' dB';
    }
  }
}

// ============================================
//  ГРАФИК АЧХ
// ============================================

function updateEQGraph() {
  var canvas = document.getElementById('eqGraphCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  var width = canvas.width;
  var height = canvas.height;
  var gains = getSliderGains();
  var freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  var isDark = appState.currentTheme === 'dark' || 
               (appState.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
  ctx.fillRect(0, 0, width, height);

  var margin = { top: 8, bottom: 18, left: 36, right: 36 };
  var graphHeight = height - margin.top - margin.bottom;
  var graphWidth = width - margin.left - margin.right;
  
  var gridColor = isDark ? 'rgba(76, 175, 80, 0.10)' : 'rgba(76, 175, 80, 0.10)';
  var gridColorStrong = isDark ? 'rgba(76, 175, 80, 0.20)' : 'rgba(76, 175, 80, 0.20)';
  
  for (var h = -2; h <= 2; h++) {
    var yPos = margin.top + graphHeight / 2 - (h / 2) * (graphHeight / 2);
    ctx.strokeStyle = (h === 0) ? gridColorStrong : gridColor;
    ctx.lineWidth = (h === 0) ? 1 : 0.5;
    ctx.setLineDash((h === 0) ? [] : [3, 5]);
    ctx.beginPath();
    ctx.moveTo(margin.left, yPos);
    ctx.lineTo(width - margin.right, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  var barCount = 10;
  var barWidth = graphWidth / (barCount - 1);
  for (var v = 1; v < barCount - 1; v++) {
    var xPos = margin.left + v * barWidth;
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
  
  var valueLabels = ['+12', '0', '-12'];
  var valuePositions = [0, 0.5, 1];
  
  for (var vl = 0; vl < valueLabels.length; vl++) {
    var valY = margin.top + valuePositions[vl] * graphHeight;
    ctx.fillStyle = isDark ? 'rgba(200,255,200,0.25)' : 'rgba(50,150,50,0.25)';
    ctx.fillText(valueLabels[vl], width - margin.right + 8, valY);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '6px Segoe UI, Arial, sans-serif';
  
  var leftLabels = ['12', '0', '12'];
  for (var vl2 = 0; vl2 < leftLabels.length; vl2++) {
    var valY2 = margin.top + valuePositions[vl2] * graphHeight;
    ctx.fillStyle = isDark ? 'rgba(200,255,200,0.25)' : 'rgba(50,150,50,0.25)';
    ctx.fillText(leftLabels[vl2], margin.left - 22, valY2);
  }

  var points = [];
  for (var fi = 0; fi < freqs.length; fi++) {
    var gain = gains[freqs[fi]] || 0;
    points.push({
      x: margin.left + fi * barWidth,
      y: margin.top + graphHeight / 2 - (gain / 12) * (graphHeight / 2),
      gain: gain
    });
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, margin.top + graphHeight);
  for (var pi = 0; pi < points.length; pi++) {
    ctx.lineTo(points[pi].x, points[pi].y);
  }
  ctx.lineTo(points[points.length - 1].x, margin.top + graphHeight);
  ctx.closePath();

  var gradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + graphHeight);
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
  for (var pi2 = 0; pi2 < points.length; pi2++) {
    if (pi2 === 0) {
      ctx.moveTo(points[pi2].x, points[pi2].y);
    } else {
      var prev = points[pi2 - 1];
      var curr = points[pi2];
      ctx.bezierCurveTo(
        prev.x + (curr.x - prev.x) * 0.5, prev.y,
        curr.x - (curr.x - prev.x) * 0.5, curr.y,
        curr.x, curr.y
      );
    }
  }
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(76, 175, 80, 0.3)';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (var pt = 0; pt < points.length; pt++) {
    var p = points[pt];
    var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
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
  }

  var freqLabels = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '6px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,255,200,0.3)' : 'rgba(50,150,50,0.3)';
  
  for (var fl = 0; fl < freqLabels.length; fl++) {
    var labelX = margin.left + fl * barWidth;
    var offsetX = 0;
    if (fl === 0) offsetX = 6;
    if (fl === freqLabels.length - 1) offsetX = -6;
    ctx.fillText(freqLabels[fl], labelX + offsetX, height - 16);
  }
}

// ============================================
//  КЛИППИНГ
// ============================================

function checkClipping(rmsValue, peakValue, clipping) {
  rmsValue = rmsValue || 0;
  peakValue = peakValue || 0;
  clipping = clipping === true;
  
  if (!CLIP_CONFIG.enabled) return;
  
  _clipState.smoothRms = _clipState.smoothRms * 0.85 + rmsValue * 0.15;
  var smoothRms = _clipState.smoothRms;
  var now = Date.now();
  
  _clipState.history.push(smoothRms);
  if (_clipState.history.length > CLIP_CONFIG.peakHistory) {
    _clipState.history.shift();
  }
  
  var currentVolume = 100;
  var volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) {
    var parsed = parseFloat(volumeSlider.value);
    currentVolume = isNaN(parsed) ? 100 : parsed;
  }
  _clipState.lastVolume = currentVolume;
  
  var isExtremeVolume = currentVolume >= CLIP_CONFIG.volumeThreshold;
  var isCriticalRms = smoothRms > CLIP_CONFIG.levels.critical;
  var isHighRms = smoothRms > CLIP_CONFIG.levels.danger;
  var isPeakClipping = peakValue >= 0.99 || clipping === true;
  var isClippingNow = isPeakClipping || (isExtremeVolume && isHighRms) || isCriticalRms;
  
  if (isClippingNow) {
    if (now - _clipState.lastTrigger < CLIP_CONFIG.cooldownTime) {
      return;
    }
    
    var level = 'danger';
    var warningText = '';
    
    if (isPeakClipping || isCriticalRms || currentVolume >= 600) {
      level = 'critical';
      var warning = t('clipping.critical');
      warningText = warning ? warning.title + '\n' + warning.message : 'CRITICAL CLIPPING';
    } else if (isHighRms || currentVolume >= 400) {
      level = 'danger';
      var warning2 = t('clipping.danger');
      warningText = warning2 ? warning2.title + '\n' + warning2.message : 'DANGER CLIPPING';
    } else {
      level = 'warning';
      var warning3 = t('clipping.warning');
      warningText = warning3 ? warning3.title + '\n' + warning3.message : 'WARNING CLIPPING';
    }
    
    showClipIndicator(level, currentVolume, smoothRms, warningText);
    _clipState.lastTrigger = now;
    _clipState.isClipping = true;
    
    console.warn('🔴', warningText, '| RMS:', (smoothRms * 100).toFixed(1) + '%', 'Volume:', currentVolume + '%');
  }
}

function showClipIndicator(level, volume, rms, warningText) {
  level = level || 'danger';
  volume = volume || 100;
  rms = rms || 0;
  warningText = warningText || '';
  
  var indicator = document.getElementById('clipIndicator');
  if (!indicator) return;
  
  if (_clipState.timeoutId) {
    clearTimeout(_clipState.timeoutId);
    _clipState.timeoutId = null;
  }
  
  var warningObj = t('clipping.' + level);
  var displayText = warningText || (warningObj ? warningObj.title : 'CLIPPING');
  
  if (volume >= 400) {
    displayText += ' (' + Math.round(volume) + '%)';
  }
  
  indicator.textContent = displayText;
  indicator.style.display = 'block';
  indicator.style.animation = 'none';
  void indicator.offsetWidth;
  
  if (level === 'critical') {
    indicator.style.animation = 'clipPulse 0.3s ease-in-out 3';
    _clipState.timeoutId = setTimeout(function() {
      hideClipIndicator();
    }, CLIP_CONFIG.holdTime * 2);
  } else if (level === 'warning') {
    indicator.style.animation = 'clipPulse 0.6s ease-in-out 2';
    _clipState.timeoutId = setTimeout(function() {
      hideClipIndicator();
    }, CLIP_CONFIG.holdTime);
  } else {
    indicator.style.animation = 'clipPulse 0.5s ease-in-out';
    _clipState.timeoutId = setTimeout(function() {
      hideClipIndicator();
    }, CLIP_CONFIG.holdTime);
  }
}

function hideClipIndicator() {
  var indicator = document.getElementById('clipIndicator');
  if (!indicator) return;
  indicator.style.display = 'none';
  _clipState.isClipping = false;
  if (_clipState.timeoutId) {
    clearTimeout(_clipState.timeoutId);
    _clipState.timeoutId = null;
  }
}

function setupClipIndicatorDismiss() {
  var indicator = document.getElementById('clipIndicator');
  if (!indicator) return;
  indicator.addEventListener('click', function() {
    hideClipIndicator();
  });
}

function initVisualization() {
  setupClipIndicatorDismiss();
  initVisualizationEffects();
  console.log('🟢 Индикатор клиппинга активирован');
  console.log('🎨 Эффект:', getEffectName(getCurrentEffect()));
}

// ============================================
//  ОСНОВНОЙ ЦИКЛ
// ============================================

function visualizationLoop() {
  if (_isRunning) return;
  _isRunning = true;
  
  function loop() {
    updateSpectrum();
    updateEQGraph();
    _animationFrameId = requestAnimationFrame(loop);
  }
  
  loop();
}

function stopVisualization() {
  _isRunning = false;
  if (_animationFrameId) {
    cancelAnimationFrame(_animationFrameId);
    _animationFrameId = null;
  }
}

function resetVisualization() {
  smoothSpectrum.reset();
  _vuSmooth = 0;
  _vuPeakSmooth = 0;
  _vuPeakHold = 0;
  _vuHistory = [];
  appState.rmsValue = 0;
  appState.peakValue = 0;
  appState.isClipping = false;
  appState.hasAudio = false;
  console.log('🔄 Визуализация сброшена');
}

// ============================================
//  ЕДИНЫЙ БЛОК ЭКСПОРТА (БЕЗ ДУБЛИРОВАНИЯ)
// ============================================

export {
  CLIP_CONFIG,
  initVisualizationEffects,
  updateEffectButtonLabel,
  syncEffect,
  updateSpectrum,
  updateVUMeter,
  updateEQGraph,
  checkClipping,
  showClipIndicator,
  hideClipIndicator,
  setupClipIndicatorDismiss,
  initVisualization,
  visualizationLoop,
  stopVisualization,
  resetVisualization
};