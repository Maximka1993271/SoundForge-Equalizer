// ============================================
//  VISUALIZATION-EFFECTS.JS - SoundForge v3.22.8 Chrome 152
//  Google Chrome 152.0.7977.65 | Windows 11 25H2
//  Звуковые волны | Огонь | Неон
//  Поддержка 3 языков: RU, UA, EN
//  CHROME 152 OPTIMIZED: очистка ресурсов при переключении эффектов
//  CHROME 152 OPTIMIZED: проверка canvas перед рисованием
//  ИСПРАВЛЕНО: конфликт имен state
// ============================================

import { state as appState } from './state.js';
import { t, getCurrentLang, getEffectName as getI18nEffectName } from './i18n.js';

console.log('🎨 SoundForge Visualization Effects v3.22.8 Chrome 152');

// ============================================
//  ЭФФЕКТЫ ВИЗУАЛИЗАЦИИ
// ============================================

export const EFFECTS = {
  SPECTRUM: 'spectrum',
  WAVES: 'waves',
  FIRE: 'fire',
  NEON: 'neon'
};

export const EFFECT_NAMES = {
  ru: {
    spectrum: '📊 Спектр',
    waves: '🌊 Волны',
    fire: '🔥 Огонь',
    neon: '💜 Неон'
  },
  uk: {
    spectrum: '📊 Спектр',
    waves: '🌊 Хвилі',
    fire: '🔥 Вогонь',
    neon: '💜 Неон'
  },
  en: {
    spectrum: '📊 Spectrum',
    waves: '🌊 Waves',
    fire: '🔥 Fire',
    neon: '💜 Neon'
  }
};

let _currentEffect = EFFECTS.SPECTRUM;
let _effectCanvas = null;
let _effectCtx = null;
let _particles = [];
let _fireData = [];
let _wavePhase = 0;
let _neonGlow = 0;
let _lastEffectSwitch = 0;
let _effectSmoothData = new Float32Array(64);
let _effectsInitialized = false;

// ============================================
//  ПОЛУЧЕНИЕ НАЗВАНИЯ ЭФФЕКТА
// ============================================

export function getEffectName(effectId) {
  const lang = getCurrentLang();
  const names = EFFECT_NAMES[lang] || EFFECT_NAMES.en;
  try {
    const i18nName = getI18nEffectName(effectId);
    if (i18nName && i18nName !== effectId) {
      return i18nName;
    }
  } catch (e) {
    // Игнорируем
  }
  return names[effectId] || effectId;
}

export function getCurrentEffect() {
  return _currentEffect;
}

export function setCurrentEffect(effect) {
  if (Object.values(EFFECTS).includes(effect)) {
    _currentEffect = effect;
    _lastEffectSwitch = Date.now();
    try {
      localStorage.setItem('soundforge_effect', effect);
    } catch (e) {}
    console.log(`🎨 Эффект изменен: ${effect}`);
    // Очищаем частицы при смене эффекта
    _particles = [];
    return true;
  }
  return false;
}

// ============================================
//  ЗАГРУЗКА СОХРАНЕННОГО ЭФФЕКТА
// ============================================

export function loadSavedEffect() {
  try {
    const saved = localStorage.getItem('soundforge_effect');
    if (saved && Object.values(EFFECTS).includes(saved)) {
      _currentEffect = saved;
      console.log(`📥 Загружен эффект: ${_currentEffect}`);
    }
  } catch (e) {
    // Игнорируем
  }
}

// ============================================
//  ИНИЦИАЛИЗАЦИЯ ЭФФЕКТОВ
// ============================================

export function initEffects() {
  if (_effectsInitialized) return;
  _effectsInitialized = true;
  
  loadSavedEffect();
  
  const canvas = document.getElementById('spectrumCanvas');
  if (canvas) {
    _effectCanvas = canvas;
    _effectCtx = canvas.getContext('2d');
    _effectCanvas.width = 450;
    _effectCanvas.height = 70;
  } else {
    console.warn('⚠️ Canvas спектра не найден');
  }
  
  initFireData();
  initParticles();
  
  console.log(`🎨 Эффекты инициализированы: ${_currentEffect}`);
}

// ============================================
//  ИНИЦИАЛИЗАЦИЯ ДАННЫХ ДЛЯ ОГНЯ
// ============================================

function initFireData() {
  const width = _effectCanvas ? _effectCanvas.width : 450;
  const height = _effectCanvas ? _effectCanvas.height : 70;
  _fireData = [];
  for (let i = 0; i < width; i++) {
    _fireData[i] = [];
    for (let j = 0; j < height; j++) {
      _fireData[i][j] = 0;
    }
  }
}

// ============================================
//  ИНИЦИАЛИЗАЦИЯ ЧАСТИЦ ДЛЯ ВОЛН И НЕОНА
// ============================================

function initParticles() {
  _particles = [];
  const count = 80;
  for (let i = 0; i < count; i++) {
    _particles.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2,
      amplitude: Math.random() * 0.3 + 0.1
    });
  }
}

// ============================================
//  ОСНОВНАЯ ФУНКЦИЯ ОТРИСОВКИ
// ============================================

export function renderEffect(spectrumData) {
  if (!_effectCanvas || !_effectCtx) {
    const canvas = document.getElementById('spectrumCanvas');
    if (canvas) {
      _effectCanvas = canvas;
      _effectCtx = canvas.getContext('2d');
      _effectCanvas.width = 450;
      _effectCanvas.height = 70;
      initFireData();
      initParticles();
    }
    if (!_effectCanvas || !_effectCtx) return;
  }
  
  if (spectrumData && spectrumData.length > 0) {
    for (let i = 0; i < Math.min(spectrumData.length, 64); i++) {
      const target = spectrumData[i] || 0;
      _effectSmoothData[i] = _effectSmoothData[i] * 0.7 + target * 0.3;
    }
  }
  
  const ctx = _effectCtx;
  const width = _effectCanvas.width;
  const height = _effectCanvas.height;
  const isDark = appState.currentTheme === 'dark' || 
                 (appState.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  ctx.clearRect(0, 0, width, height);
  
  switch (_currentEffect) {
    case EFFECTS.WAVES:
      renderWaves(ctx, width, height, isDark);
      break;
    case EFFECTS.FIRE:
      renderFire(ctx, width, height, isDark);
      break;
    case EFFECTS.NEON:
      renderNeon(ctx, width, height, isDark);
      break;
    case EFFECTS.SPECTRUM:
    default:
      renderSpectrumEffect(ctx, width, height, isDark);
      break;
  }
}

// ============================================
//  ЭФФЕКТ 1: СПЕКТР (СТАНДАРТНЫЙ)
// ============================================

function renderSpectrumEffect(ctx, width, height, isDark) {
  const data = _effectSmoothData;
  const barCount = 32;
  const barWidth = width / barCount;
  const maxHeight = height - 4;
  
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = isDark ? 'rgba(76, 175, 80, 0.08)' : 'rgba(76, 175, 80, 0.08)';
  ctx.lineWidth = 0.5;
  for (let h = 0; h <= 4; h++) {
    const yPos = height - 2 - (h / 4) * (height - 4);
    ctx.beginPath();
    ctx.moveTo(0, yPos);
    ctx.lineTo(width, yPos);
    ctx.stroke();
  }
  
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
  
  const freqLabels = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
  const labelStep = barCount / freqLabels.length;
  ctx.fillStyle = isDark ? 'rgba(200,255,200,0.5)' : 'rgba(50,150,50,0.5)';
  ctx.font = '8px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  for (let f = 0; f < freqLabels.length; f++) {
    const labelX = (f * labelStep + labelStep / 2) * barWidth;
    ctx.fillText(freqLabels[f], labelX, height - 1);
  }
}

// ============================================
//  ЭФФЕКТ 2: ЗВУКОВЫЕ ВОЛНЫ
// ============================================

function renderWaves(ctx, width, height, isDark) {
  const data = _effectSmoothData;
  const centerY = height / 2;
  
  const gradient = ctx.createRadialGradient(width/2, centerY, 0, width/2, centerY, width/2);
  if (isDark) {
    gradient.addColorStop(0, 'rgba(10, 30, 20, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 10, 5, 0.95)');
  } else {
    gradient.addColorStop(0, 'rgba(230, 250, 240, 0.9)');
    gradient.addColorStop(1, 'rgba(200, 230, 220, 0.95)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = isDark ? 'rgba(76, 175, 80, 0.05)' : 'rgba(76, 175, 80, 0.05)';
  ctx.lineWidth = 0.5;
  for (let h = 0; h <= 4; h++) {
    const yPos = (h / 4) * height;
    ctx.beginPath();
    ctx.moveTo(0, yPos);
    ctx.lineTo(width, yPos);
    ctx.stroke();
  }
  
  const numWaves = 5;
  const time = Date.now() / 1000;
  
  for (let w = 0; w < numWaves; w++) {
    const waveIndex = w / numWaves;
    const amplitude = 5 + (data[Math.floor(waveIndex * 32)] || 0) * 25;
    const frequency = 0.02 + waveIndex * 0.015;
    const phase = time * (0.5 + waveIndex * 0.3);
    const alpha = 0.3 + (1 - waveIndex / numWaves) * 0.5;
    const widthFactor = 1 + (data[Math.floor(waveIndex * 16)] || 0) * 2;
    
    let color;
    if (w === 0) color = `rgba(76, 175, 80, ${alpha})`;
    else if (w === 1) color = `rgba(100, 200, 100, ${alpha * 0.9})`;
    else if (w === 2) color = `rgba(50, 150, 80, ${alpha * 0.8})`;
    else if (w === 3) color = `rgba(30, 200, 150, ${alpha * 0.7})`;
    else color = `rgba(150, 255, 200, ${alpha * 0.5})`;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 + (1 - waveIndex / numWaves) * 1.5;
    ctx.shadowColor = isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    for (let x = 0; x <= width; x += 1) {
      const progress = x / width;
      const yOffset = Math.sin(progress * Math.PI * 2 * frequency * widthFactor + phase) * amplitude;
      const yPos = centerY + yOffset + (w - numWaves/2) * 8;
      if (x === 0) ctx.moveTo(x, yPos);
      else ctx.lineTo(x, yPos);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? 0 : width;
    const amplitude2 = 3 + (data[Math.floor(s * 31)] || 0) * 15;
    const time2 = time * (0.7 + s * 0.3);
    ctx.strokeStyle = isDark ? 'rgba(100, 255, 150, 0.15)' : 'rgba(50, 150, 80, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= height; y += 2) {
      const progress = y / height;
      const xOffset = Math.sin(progress * Math.PI * 4 + time2) * amplitude2;
      const xPos = side + xOffset * (s === 0 ? 1 : -1);
      if (y === 0) ctx.moveTo(xPos, y);
      else ctx.lineTo(xPos, y);
    }
    ctx.stroke();
  }
  
  const freqLabels = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
  const labelStep = width / freqLabels.length;
  ctx.fillStyle = isDark ? 'rgba(200,255,200,0.3)' : 'rgba(50,150,50,0.3)';
  ctx.font = '7px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  for (let f = 0; f < freqLabels.length; f++) {
    const labelX = (f * labelStep + labelStep / 2);
    ctx.fillText(freqLabels[f], labelX, height - 2);
  }
}

// ============================================
//  ЭФФЕКТ 3: ОГОНЬ
// ============================================

function renderFire(ctx, width, height, isDark) {
  const data = _effectSmoothData;
  const time = Date.now() / 1000;
  
  const intensity = (data[0] || 0) * 0.5 + (data[1] || 0) * 0.3 + (data[2] || 0) * 0.2;
  const flicker = Math.sin(time * 3) * 0.05 + Math.sin(time * 7.5) * 0.03 + 0.08;
  const fireIntensity = Math.max(0.1, intensity + flicker);
  
  const bgGradient = ctx.createRadialGradient(width/2, height, 0, width/2, height, height);
  if (isDark) {
    bgGradient.addColorStop(0, 'rgba(10, 5, 5, 0.95)');
    bgGradient.addColorStop(0.5, 'rgba(20, 8, 5, 0.9)');
    bgGradient.addColorStop(1, 'rgba(5, 2, 2, 0.95)');
  } else {
    bgGradient.addColorStop(0, 'rgba(250, 240, 235, 0.9)');
    bgGradient.addColorStop(0.5, 'rgba(240, 225, 220, 0.85)');
    bgGradient.addColorStop(1, 'rgba(230, 215, 210, 0.9)');
  }
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  const numFlames = 12 + Math.floor(fireIntensity * 20);
  const flameHeight = 20 + fireIntensity * 40;
  
  for (let f = 0; f < numFlames; f++) {
    const xPos = (f / numFlames) * width + Math.sin(time * 2 + f * 0.7) * 8;
    const heightVar = flameHeight * (0.6 + Math.sin(time * 1.5 + f * 1.1) * 0.4);
    const widthVar = 6 + fireIntensity * 12 + Math.sin(time * 3 + f * 0.9) * 3;
    const alpha = 0.2 + (1 - f / numFlames) * 0.6;
    const offset = Math.sin(time * 2.5 + f * 0.5) * 4;
    
    const flameGrad = ctx.createRadialGradient(
      xPos + offset, height - heightVar * 0.3, 0,
      xPos + offset, height - heightVar * 0.3, widthVar * 1.5
    );
    
    const flameAlpha = Math.min(1, alpha * fireIntensity * 1.5);
    const colorIntensity = Math.min(1, fireIntensity * 1.2);
    
    if (f % 3 === 0) {
      flameGrad.addColorStop(0, `rgba(255, 200, 50, ${flameAlpha * 0.9})`);
      flameGrad.addColorStop(0.3, `rgba(255, 150, 30, ${flameAlpha * 0.7})`);
      flameGrad.addColorStop(0.6, `rgba(255, 80, 20, ${flameAlpha * 0.5})`);
      flameGrad.addColorStop(1, `rgba(150, 30, 10, ${flameAlpha * 0.2})`);
    } else if (f % 3 === 1) {
      flameGrad.addColorStop(0, `rgba(255, 220, 100, ${flameAlpha * 0.8})`);
      flameGrad.addColorStop(0.3, `rgba(255, 180, 60, ${flameAlpha * 0.6})`);
      flameGrad.addColorStop(0.6, `rgba(255, 100, 30, ${flameAlpha * 0.4})`);
      flameGrad.addColorStop(1, `rgba(180, 50, 20, ${flameAlpha * 0.15})`);
    } else {
      flameGrad.addColorStop(0, `rgba(255, 180, 80, ${flameAlpha * 0.7})`);
      flameGrad.addColorStop(0.3, `rgba(255, 130, 50, ${flameAlpha * 0.5})`);
      flameGrad.addColorStop(0.6, `rgba(200, 60, 30, ${flameAlpha * 0.35})`);
      flameGrad.addColorStop(1, `rgba(100, 20, 10, ${flameAlpha * 0.1})`);
    }
    
    ctx.fillStyle = flameGrad;
    
    ctx.beginPath();
    const bottomY = height - 2;
    const topY = bottomY - heightVar;
    
    ctx.moveTo(xPos + offset - widthVar/2, bottomY);
    ctx.quadraticCurveTo(
      xPos + offset - widthVar/2 - Math.sin(time * 4 + f) * 3,
      bottomY - heightVar * 0.4,
      xPos + offset - Math.sin(time * 2 + f * 0.7) * 5,
      topY + Math.sin(time * 5 + f * 0.3) * 2
    );
    ctx.quadraticCurveTo(
      xPos + offset + widthVar/2 + Math.sin(time * 4 + f + 1) * 3,
      bottomY - heightVar * 0.4,
      xPos + offset + widthVar/2,
      bottomY
    );
    ctx.closePath();
    ctx.fill();
  }
  
  const numSparks = Math.floor(3 + fireIntensity * 12);
  for (let s = 0; s < numSparks; s++) {
    const sparkX = Math.sin(time * 1.7 + s * 2.3) * width * 0.4 + width/2;
    const sparkY = height - 5 - Math.abs(Math.sin(time * 3.2 + s * 1.1)) * (15 + fireIntensity * 30);
    const sparkSize = 1 + Math.sin(time * 5 + s * 0.7) * 0.5 + 0.5;
    const sparkAlpha = 0.3 + Math.sin(time * 4 + s * 1.5) * 0.3 + 0.3;
    
    const sparkColors = [
      `rgba(255, 200, 50, ${sparkAlpha * 0.8})`,
      `rgba(255, 150, 30, ${sparkAlpha * 0.6})`,
      `rgba(255, 100, 50, ${sparkAlpha * 0.5})`,
      `rgba(255, 255, 200, ${sparkAlpha * 0.9})`
    ];
    const colorIndex = Math.floor(Math.random() * sparkColors.length);
    
    ctx.fillStyle = sparkColors[colorIndex];
    ctx.shadowColor = 'rgba(255, 150, 50, 0.3)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, sparkSize * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  const smokeAlpha = Math.min(0.2, fireIntensity * 0.15);
  for (let d = 0; d < 8; d++) {
    const smokeX = (d / 8) * width + Math.sin(time * 0.5 + d * 0.8) * 15;
    const smokeY = 5 + Math.sin(time * 0.3 + d * 0.5) * 5;
    const smokeSize = 10 + Math.sin(time * 0.7 + d * 0.6) * 5;
    ctx.fillStyle = isDark 
      ? `rgba(50, 40, 30, ${smokeAlpha * 0.3})`
      : `rgba(200, 180, 170, ${smokeAlpha * 0.2})`;
    ctx.beginPath();
    ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const freqLabels = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
  const labelStep = width / freqLabels.length;
  ctx.fillStyle = isDark ? 'rgba(255, 200, 150, 0.3)' : 'rgba(150, 80, 50, 0.3)';
  ctx.font = '7px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  for (let f = 0; f < freqLabels.length; f++) {
    const labelX = (f * labelStep + labelStep / 2);
    ctx.fillText(freqLabels[f], labelX, height - 2);
  }
}

// ============================================
//  ЭФФЕКТ 4: НЕОН
// ============================================

function renderNeon(ctx, width, height, isDark) {
  const data = _effectSmoothData;
  const time = Date.now() / 1000;
  _neonGlow = 0.5 + Math.sin(time * 0.5) * 0.3;
  
  const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
  if (isDark) {
    bgGradient.addColorStop(0, 'rgba(20, 10, 30, 0.95)');
    bgGradient.addColorStop(0.5, 'rgba(10, 5, 20, 0.9)');
    bgGradient.addColorStop(1, 'rgba(5, 2, 10, 0.95)');
  } else {
    bgGradient.addColorStop(0, 'rgba(240, 235, 250, 0.9)');
    bgGradient.addColorStop(0.5, 'rgba(230, 220, 245, 0.85)');
    bgGradient.addColorStop(1, 'rgba(220, 210, 240, 0.9)');
  }
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = isDark 
    ? `rgba(150, 100, 255, ${0.05 + _neonGlow * 0.05})`
    : `rgba(150, 100, 255, ${0.05 + _neonGlow * 0.03})`;
  ctx.lineWidth = 0.5;
  for (let h = 0; h <= 4; h++) {
    const yPos = (h / 4) * height;
    ctx.beginPath();
    ctx.moveTo(0, yPos);
    ctx.lineTo(width, yPos);
    ctx.stroke();
  }
  for (let v = 0; v <= 8; v++) {
    const xPos = (v / 8) * width;
    ctx.beginPath();
    ctx.moveTo(xPos, 0);
    ctx.lineTo(xPos, height);
    ctx.stroke();
  }
  
  const barCount = 32;
  const barWidth = width / barCount;
  const maxHeight = height - 4;
  
  for (let j = 0; j < barCount; j++) {
    const value = data[j] || 0;
    const barHeight = Math.max(2, value * maxHeight);
    const x = j * barWidth;
    const y = height - barHeight - 2;
    
    const glowSize = 6 + value * 15;
    const glowGrad = ctx.createRadialGradient(
      x + barWidth/2, y + barHeight/2, 0,
      x + barWidth/2, y + barHeight/2, glowSize
    );
    
    const hue = 220 + value * 60 + Math.sin(time * 0.3 + j * 0.05) * 10;
    const neonAlpha = 0.1 + value * 0.4;
    glowGrad.addColorStop(0, `hsla(${hue}, 100%, 70%, ${neonAlpha})`);
    glowGrad.addColorStop(0.5, `hsla(${hue + 20}, 100%, 60%, ${neonAlpha * 0.4})`);
    glowGrad.addColorStop(1, `hsla(${hue + 40}, 100%, 50%, 0)`);
    
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x - glowSize/2, y - glowSize/2, barWidth + glowSize, barHeight + glowSize);
  }
  
  for (let j = 0; j < barCount; j++) {
    const value = data[j] || 0;
    const barHeight = Math.max(2, value * maxHeight);
    const x = j * barWidth;
    const y = height - barHeight - 2;
    
    const hue = 220 + value * 60 + Math.sin(time * 0.3 + j * 0.05) * 10;
    
    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${0.6 + value * 0.4})`);
    gradient.addColorStop(0.3, `hsla(${hue + 10}, 100%, 70%, ${0.4 + value * 0.3})`);
    gradient.addColorStop(0.7, `hsla(${hue + 20}, 100%, 60%, ${0.2 + value * 0.2})`);
    gradient.addColorStop(1, `hsla(${hue + 30}, 100%, 50%, ${0.05 + value * 0.1})`);
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
    
    ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${0.2 + value * 0.5})`;
    ctx.shadowBlur = 4 + value * 8;
    ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${0.1 + value * 0.3})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y, barWidth - 2, barHeight);
    ctx.shadowBlur = 0;
  }
  
  const numParticles = 40 + Math.floor(_neonGlow * 20);
  if (_particles.length === 0) {
    initParticles();
  }
  for (let p = 0; p < Math.min(numParticles, _particles.length); p++) {
    const particle = _particles[p] || _particles[0];
    if (!particle) continue;
    
    const xPos = (particle.x + Math.sin(time * particle.speed + particle.phase) * 0.2) * width;
    const yPos = (particle.y + Math.cos(time * particle.speed * 0.7 + particle.phase * 0.5) * 0.2) * height;
    const size = particle.size * (0.5 + Math.sin(time * 2 + particle.phase) * 0.5);
    const alpha = 0.2 + Math.sin(time * 1.5 + particle.phase) * 0.2 + 0.3;
    
    const hue2 = 240 + Math.sin(time * 0.5 + p * 0.1) * 30;
    ctx.fillStyle = `hsla(${hue2}, 100%, 70%, ${alpha * 0.5})`;
    ctx.shadowColor = `hsla(${hue2}, 100%, 70%, ${alpha * 0.3})`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(xPos, yPos, size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  const freqLabels = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
  const labelStep = width / freqLabels.length;
  ctx.fillStyle = isDark 
    ? `rgba(150, 100, 255, ${0.3 + _neonGlow * 0.2})`
    : `rgba(100, 50, 200, ${0.2 + _neonGlow * 0.15})`;
  ctx.font = '7px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = isDark ? 'rgba(150, 100, 255, 0.2)' : 'rgba(100, 50, 200, 0.15)';
  ctx.shadowBlur = 4;
  for (let f = 0; f < freqLabels.length; f++) {
    const labelX = (f * labelStep + labelStep / 2);
    ctx.fillText(freqLabels[f], labelX, height - 2);
  }
  ctx.shadowBlur = 0;
}

// ============================================
//  ЭКСПОРТ
// ============================================

export default {
  EFFECTS,
  EFFECT_NAMES,
  getEffectName,
  getCurrentEffect,
  setCurrentEffect,
  loadSavedEffect,
  initEffects,
  renderEffect
};