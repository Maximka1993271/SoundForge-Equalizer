// ============================================
//  VISUALIZATION-EFFECTS.JS - Эффекты визуализации (v3.22.8)
//  КРАСИВЫЕ ЗВУКОВЫЕ ВОЛНЫ | Огонь | Неон | Спектр
//  Поддержка 3 языков: RU, UA, EN
//  Firefox 153.0esr
// ============================================

import { state } from './state.js';
import { t, getCurrentLang, getEffectName as getI18nEffectName } from './i18n.js';

console.log('🎨 SoundForge Visualization Effects v3.22.8 (Firefox)');

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
    waves: '🌊 Красивые волны',
    fire: '🔥 Огонь',
    neon: '💜 Неон'
  },
  uk: {
    spectrum: '📊 Спектр',
    waves: '🌊 Красиві хвилі',
    fire: '🔥 Вогонь',
    neon: '💜 Неон'
  },
  en: {
    spectrum: '📊 Spectrum',
    waves: '🌊 Beautiful Waves',
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
let _frameCount = 0;
let _waveTime = 0;

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
  } catch (e) {}
  return names[effectId] || effectId;
}

export function getCurrentEffect() {
  return _currentEffect;
}

export function setCurrentEffect(effect) {
  if (Object.values(EFFECTS).includes(effect)) {
    _currentEffect = effect;
    _lastEffectSwitch = Date.now();
    localStorage.setItem('soundforge_effect', effect);
    console.log(`🎨 Эффект изменен: ${effect}`);
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
  } catch (e) {}
}

// ============================================
//  ИНИЦИАЛИЗАЦИЯ ЭФФЕКТОВ
// ============================================

export function initEffects() {
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
//  ИНИЦИАЛИЗАЦИЯ ЧАСТИЦ
// ============================================

function initParticles() {
  _particles = [];
  const count = 120;
  for (let i = 0; i < count; i++) {
    _particles.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 3.5 + 0.5,
      speed: Math.random() * 0.025 + 0.003,
      phase: Math.random() * Math.PI * 2,
      amplitude: Math.random() * 0.35 + 0.05,
      offsetX: (Math.random() - 0.5) * 0.6,
      offsetY: (Math.random() - 0.5) * 0.6,
      waveOffset: Math.random() * 100,
      hue: Math.random() * 60 + 180
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
  const isDark = state.currentTheme === 'dark' || 
                 (state.currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  ctx.clearRect(0, 0, width, height);
  
  switch (_currentEffect) {
    case EFFECTS.WAVES:
      renderBeautifulWaves(ctx, width, height, isDark);
      break;
    case EFFECTS.FIRE:
      renderFire(ctx, width, height, isDark);
      break;
    case EFFECTS.NEON:
      renderNeon(ctx, width, height, isDark);
      break;
    case EFFECTS.SPECTRUM:
    default:
      renderSpectrum(ctx, width, height, isDark);
      break;
  }
  
  _frameCount++;
}

// ============================================
//  ЭФФЕКТ 1: СПЕКТР
// ============================================

function renderSpectrum(ctx, width, height, isDark) {
  const data = _effectSmoothData;
  const barCount = 32;
  const barWidth = width / barCount;
  const maxHeight = height - 4;
  
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
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
//  ЭФФЕКТ 2: КРАСИВЫЕ ЗВУКОВЫЕ ВОЛНЫ (УЛУЧШЕННАЯ ВЕРСИЯ)
// ============================================

function renderBeautifulWaves(ctx, width, height, isDark) {
  const data = _effectSmoothData;
  const centerY = height / 2;
  const time = Date.now() / 1000;
  _waveTime = time;
  
  // --- 1. ФОН С ГРАДИЕНТОМ ---
  const bgGradient = ctx.createRadialGradient(width/2, centerY, 0, width/2, centerY, width/1.5);
  if (isDark) {
    bgGradient.addColorStop(0, 'rgba(5, 15, 35, 0.95)');
    bgGradient.addColorStop(0.4, 'rgba(8, 20, 45, 0.9)');
    bgGradient.addColorStop(0.7, 'rgba(3, 10, 25, 0.92)');
    bgGradient.addColorStop(1, 'rgba(0, 5, 15, 0.95)');
  } else {
    bgGradient.addColorStop(0, 'rgba(235, 248, 255, 0.9)');
    bgGradient.addColorStop(0.4, 'rgba(220, 240, 255, 0.85)');
    bgGradient.addColorStop(0.7, 'rgba(200, 230, 250, 0.88)');
    bgGradient.addColorStop(1, 'rgba(180, 215, 240, 0.9)');
  }
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  // --- 2. СВЕТЯЩИЕСЯ ТОЧКИ В ФОНЕ ---
  const numBgStars = 25;
  for (let s = 0; s < numBgStars; s++) {
    const starX = (s / numBgStars) * width + Math.sin(time * 0.1 + s * 0.8) * 10;
    const starY = centerY + Math.sin(time * 0.15 + s * 0.6) * 20 + Math.sin(s * 0.9) * 8;
    const starSize = 0.5 + Math.sin(time * 0.5 + s * 0.7) * 0.5;
    const starAlpha = 0.03 + Math.sin(time * 0.3 + s * 0.5) * 0.02 + 0.02;
    
    ctx.fillStyle = isDark 
      ? `rgba(100, 200, 255, ${starAlpha})`
      : `rgba(50, 150, 200, ${starAlpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // --- 3. ОСНОВНЫЕ ВОЛНЫ (7 слоёв с разными цветами) ---
  const numWaves = 7;
  const waveColors = isDark ? [
    [180, 220, 255, 0.7],
    [150, 200, 255, 0.6],
    [120, 180, 255, 0.5],
    [90, 160, 255, 0.4],
    [60, 140, 255, 0.35],
    [30, 120, 255, 0.25],
    [0, 100, 255, 0.15]
  ] : [
    [80, 180, 255, 0.6],
    [60, 160, 240, 0.5],
    [40, 140, 220, 0.4],
    [20, 120, 200, 0.3],
    [0, 100, 180, 0.25],
    [0, 80, 160, 0.2],
    [0, 60, 140, 0.15]
  ];
  
  for (let w = 0; w < numWaves; w++) {
    const waveIndex = w / numWaves;
    const baseAmp = 2 + (data[Math.floor(waveIndex * 32)] || 0) * 38;
    const amplitude = baseAmp * (0.7 + waveIndex * 0.6);
    const frequency = 0.01 + waveIndex * 0.008 + 0.005 * Math.sin(time * 0.02 + w);
    const speed = 0.3 + waveIndex * 0.2;
    const phase = time * speed + w * 0.8 + Math.sin(time * 0.05 + w) * 0.2;
    const widthFactor = 1 + (data[Math.floor(waveIndex * 16)] || 0) * 1.8;
    
    const [r, g, b, alphaBase] = waveColors[w % waveColors.length];
    const alpha = alphaBase * (0.5 + (1 - waveIndex / numWaves) * 0.5);
    
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.lineWidth = 1 + (1 - waveIndex / numWaves) * 3;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`;
    ctx.shadowBlur = 6 + (1 - waveIndex / numWaves) * 15;
    
    ctx.beginPath();
    for (let x = 0; x <= width; x += 1.5) {
      const progress = x / width;
      
      // Множество гармоник для сложной формы волны
      const yOffset = 
        Math.sin(progress * Math.PI * 2 * frequency * widthFactor + phase) * amplitude +
        Math.sin(progress * Math.PI * 4 * frequency * widthFactor * 0.6 + phase * 1.4 + 0.3) * amplitude * 0.35 +
        Math.sin(progress * Math.PI * 8 * frequency * widthFactor * 0.35 + phase * 0.7 + 1.2) * amplitude * 0.15 +
        Math.sin(progress * Math.PI * 16 * frequency * widthFactor * 0.2 + phase * 0.3 + 2.5) * amplitude * 0.07;
      
      const yPos = centerY + yOffset + (w - numWaves/2) * 4.5 * (1 + waveIndex * 0.2);
      
      if (x === 0) ctx.moveTo(x, yPos);
      else ctx.lineTo(x, yPos);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  // --- 4. ЗАПОЛНЕННЫЕ ВОЛНЫ (подложка с прозрачностью) ---
  for (let w = 0; w < 4; w++) {
    const waveIndex = w / 4;
    const amplitude = 2 + (data[Math.floor(waveIndex * 32)] || 0) * 22;
    const frequency = 0.015 + waveIndex * 0.006;
    const phase = time * (0.35 + waveIndex * 0.12) + w * 1.2;
    const alpha = 0.02 + (1 - waveIndex / 4) * 0.06;
    
    const hue = 195 + waveIndex * 20;
    ctx.fillStyle = isDark 
      ? `hsla(${hue}, 80%, 60%, ${alpha})`
      : `hsla(${hue}, 70%, 70%, ${alpha * 0.6})`;
    
    ctx.beginPath();
    for (let x = 0; x <= width; x += 1) {
      const progress = x / width;
      const yOffset = 
        Math.sin(progress * Math.PI * 2 * frequency + phase) * amplitude +
        Math.sin(progress * Math.PI * 4 * frequency * 0.5 + phase * 0.7) * amplitude * 0.3;
      const yPos = centerY + yOffset + (w - 1.5) * 5;
      if (x === 0) ctx.moveTo(x, yPos);
      else ctx.lineTo(x, yPos);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }
  
  // --- 5. СВЕТЯЩИЕСЯ ГРЕБНИ ВОЛН (акценты) ---
  const numGlowPoints = 40;
  for (let g = 0; g < numGlowPoints; g++) {
    const progress = g / numGlowPoints;
    const xPos = progress * width;
    const intensity = data[Math.floor(progress * 32)] || 0;
    if (intensity < 0.03) continue;
    
    // Вычисляем положение гребня
    const freqMain = 0.025;
    const phaseMain = time * 0.4;
    const waveY = centerY + 
      Math.sin(progress * Math.PI * 2 * freqMain + phaseMain) * 15 +
      Math.sin(progress * Math.PI * 4 * freqMain * 0.6 + phaseMain * 1.4) * 5 +
      Math.sin(progress * Math.PI * 8 * freqMain * 0.35 + phaseMain * 0.7) * 2;
    
    const glowSize = 2 + intensity * 14;
    const glowAlpha = 0.1 + intensity * 0.35;
    const hue = 190 + intensity * 50 + Math.sin(time * 0.2 + progress * 2) * 10;
    
    const glow = ctx.createRadialGradient(xPos, waveY, 0, xPos, waveY, glowSize);
    glow.addColorStop(0, `hsla(${hue}, 100%, 95%, ${glowAlpha})`);
    glow.addColorStop(0.4, `hsla(${hue}, 100%, 85%, ${glowAlpha * 0.5})`);
    glow.addColorStop(1, `hsla(${hue + 20}, 100%, 80%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(xPos, waveY, glowSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // --- 6. ПАРЯЩИЕ ЧАСТИЦЫ (пена/брызги) ---
  const numParticles = 30 + Math.floor((data[0] || 0) * 40);
  for (let p = 0; p < numParticles; p++) {
    const particle = _particles[p % _particles.length];
    if (!particle) continue;
    
    // Движение частиц вдоль волн
    const progress = (particle.x + Math.sin(time * particle.speed * 0.6 + particle.phase) * 0.35) % 1;
    const xPos = progress * width + particle.offsetX * 15;
    
    // Положение на волне
    const waveY = centerY + 
      Math.sin(progress * Math.PI * 2 * 0.025 + time * 0.4) * 15 +
      Math.sin(progress * Math.PI * 4 * 0.015 + time * 0.6) * 6 +
      Math.sin(progress * Math.PI * 8 * 0.008 + time * 0.2) * 3;
    
    const yOffset = (particle.y - 0.5) * 25 + Math.sin(time * particle.speed + particle.phase) * 5;
    const yPos = waveY + yOffset;
    const size = particle.size * (0.4 + Math.sin(time * 1.8 + particle.phase) * 0.6);
    const alpha = 0.1 + (1 - Math.abs(yOffset) / 25) * 0.5;
    
    const hue2 = 195 + Math.sin(time * 0.2 + p * 0.05) * 25;
    ctx.fillStyle = `hsla(${hue2}, 100%, 95%, ${alpha * 0.7})`;
    ctx.shadowColor = `hsla(${hue2}, 100%, 90%, ${alpha * 0.15})`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(xPos, yPos, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  // --- 7. МЕРЦАЮЩАЯ ЛИНИЯ УРОВНЯ ---
  const level = data[0] || 0;
  if (level > 0.05) {
    const lineY = centerY - level * 25;
    const lineAlpha = 0.05 + level * 0.15;
    const hue3 = 200 + level * 40;
    
    const lineGradient = ctx.createLinearGradient(0, lineY, width, lineY);
    lineGradient.addColorStop(0, `hsla(${hue3}, 100%, 80%, 0)`);
    lineGradient.addColorStop(0.3, `hsla(${hue3}, 100%, 90%, ${lineAlpha})`);
    lineGradient.addColorStop(0.5, `hsla(${hue3 + 10}, 100%, 95%, ${lineAlpha * 1.3})`);
    lineGradient.addColorStop(0.7, `hsla(${hue3}, 100%, 90%, ${lineAlpha})`);
    lineGradient.addColorStop(1, `hsla(${hue3}, 100%, 80%, 0)`);
    
    ctx.fillStyle = lineGradient;
    ctx.shadowColor = `hsla(${hue3}, 100%, 90%, ${lineAlpha * 0.2})`;
    ctx.shadowBlur = 15;
    ctx.fillRect(0, lineY - 1, width, 2);
    ctx.shadowBlur = 0;
  }
  
  // --- 8. ЧАСТОТНЫЕ МЕТКИ ---
  const freqLabels = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];
  const labelStep = width / freqLabels.length;
  ctx.fillStyle = isDark ? 'rgba(150, 220, 255, 0.25)' : 'rgba(50, 150, 200, 0.2)';
  ctx.font = '7px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = isDark ? 'rgba(150, 220, 255, 0.08)' : 'rgba(50, 150, 200, 0.05)';
  ctx.shadowBlur = 3;
  for (let f = 0; f < freqLabels.length; f++) {
    const labelX = (f * labelStep + labelStep / 2);
    ctx.fillText(freqLabels[f], labelX, height - 2);
  }
  ctx.shadowBlur = 0;
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
  for (let p = 0; p < numParticles; p++) {
    const particle = _particles[p % _particles.length];
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