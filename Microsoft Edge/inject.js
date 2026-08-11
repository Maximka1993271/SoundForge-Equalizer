// ============================================
//  INJECT.JS - SoundForge v3.22.8 Edge 151
//  Microsoft Edge 151.0.4129.59 | Windows 11 25H2
//  АВТОМАТИЧЕСКОЕ ПОДКЛЮЧЕНИЕ
//  ЖЕСТКОЕ ОТКЛЮЧЕНИЕ ЗВУКА ПРИ 0%
//  ПОДДЕРЖКА ГРОМКОСТИ ДО 800%
//  EDGE OPTIMIZED: без chrome.* прямых вызовов
//  EDGE OPTIMIZED: файловая инъекция через SF_PING
// ============================================

(function() {
  'use strict';

  const edgeAPI = globalThis.browser || globalThis.chrome;

  if (window._soundforge_loaded && window.SoundForgeInject) {
    if (window._soundforge_pending && window._soundforge_pending.length > 0) {
      const pending = window._soundforge_pending.slice();
      window._soundforge_pending = [];
      pending.forEach((msg) => {
        try { window.SoundForgeInject.handleMessage(msg.type, msg.data); } catch {}
      });
    }
    return;
  }

  window._soundforge_loaded = true;
  console.log('🎵 SoundForge v3.22.8 Edge 151 загружен');

  const FREQUENCIES = [
    { key: '31', freq: 31, Q: 1.0 },
    { key: '62', freq: 62, Q: 1.0 },
    { key: '125', freq: 125, Q: 1.0 },
    { key: '250', freq: 250, Q: 1.0 },
    { key: '500', freq: 500, Q: 1.0 },
    { key: '1000', freq: 1000, Q: 1.0 },
    { key: '2000', freq: 2000, Q: 1.0 },
    { key: '4000', freq: 4000, Q: 1.0 },
    { key: '8000', freq: 8000, Q: 1.0 },
    { key: '16000', freq: 16000, Q: 1.0 }
  ];

  const state = {
    context: null,
    source: null,
    filters: {},
    gainNode: null,
    compressor: null,
    limiter: null,
    bassNode: null,
    volumeNode: null,
    isActive: false,
    currentElement: null,
    isYouTube: false,
    isEnabled: false,
    autoConnect: false,
    settings: { gains: {}, volume: 1.0, bass: 0 },
    _initialized: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3,
    mediaStream: null,
    _cleanupTimeout: null,
    _connectTimer: null,
    _isConnected: false,
    _originalMuted: false,
    _originalVolume: 1.0,
    _lastVideoId: null,
    analyser: null,
    _spectrumData: new Float32Array(64),
    _timeDomainData: new Float32Array(256),
    _spectrumInterval: null,
    _isConnecting: false,
    _statusSent: false,
    _connectAttempts: 0,
    _maxConnectAttempts: 5,
    _savedGains: null,
    _savedVolume: null,
    _savedBass: null,
    _videoChangeTimeout: null,
    _isVideoChange: false,
    _isProcessingChange: false,
    _observerActive: false,
    _lastElementId: null,
    _processingObservation: false,
    _lastChangeTime: 0,
    _isRestoring: false,
    _settingsRestored: false,
    _reconnectTimer: null,
    _contextRestoreAttempts: 0,
    _maxContextRestoreAttempts: 5,
    _workletNode: null,
    _workletLoaded: false,
    _fadeGain: null,
    _isFading: false,
    _userPresets: {},
    _memoryCleanupInterval: null,
    _debugMode: false,
    _retryCount: 0,
    _maxRetries: 5,
    _isRetrying: false,
    _audioElement: null,
    _manualConnectRequested: false,
    _storageKey: 'soundforge_settings_v322',
    _findElementAttempts: 0,
    _maxFindElementAttempts: 10,
    _isMuted: false,
    _restorationInProgress: false,
    _lastRestoreAttempt: 0,
    _restoreCooldown: 5000,
    _contextCheckInterval: null,
    _isRecreating: false,
    _chainValid: false,
    _registeredObjects: [],
    _browser: 'edge151',
    _isFirefox: false,
    _isSafari: false,
    _isChromium: true,
    _hardMute: false,
    _lastVolumeValue: 1.0,
    _rafId: null,
    _observer: null,
    _mutexLock: false,
    _initDone: false,
    _hardMuteNode: null,
    _nightMode: false,
    _powerSaveMode: false,
    _lifecycleToken: 0,
    _retryTimer: null,
    _settingsReady: false,
    _settingsReadyPromise: null,
    _pendingConnectUntilSettingsReady: false,
    _pendingConnectIsAutomatic: false,
    _autoConnectSuppressed: false,
    _tabHardMuteRequested: false,
    _spectrumRequested: false,
    _edgeResumeArmed: false
  };

  FREQUENCIES.forEach((item) => { state.settings.gains[item.key] = 0; });

  function log(message, level = 'info', data = null) {
    const levels = { error: '❌', warn: '⚠️', info: 'ℹ️', debug: '🐛', trace: '🔍' };
    const prefix = `[SoundForge] ${levels[level] || 'ℹ️'}`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  function safeSendMessage(message) {
    try {
      if (edgeAPI && edgeAPI.runtime && edgeAPI.runtime.sendMessage) {
        edgeAPI.runtime.sendMessage(message).catch(() => {});
      }
    } catch {}
  }

  function applyLoadedSettings(parsed) {
    if (!parsed || typeof parsed !== 'object') return;
    if (parsed.gains && typeof parsed.gains === 'object') {
      Object.keys(parsed.gains).forEach((key) => {
        if (state.settings.gains[key] !== undefined) state.settings.gains[key] = Math.max(-12, Math.min(12, Number(parsed.gains[key]) || 0));
      });
    }
    if (parsed.volume !== undefined) state.settings.volume = Math.max(0, Math.min(8, Number(parsed.volume) || 0));
    if (parsed.bass !== undefined) state.settings.bass = Math.max(-12, Math.min(12, Number(parsed.bass) || 0));
    if (parsed.isEnabled !== undefined) state.isEnabled = !!parsed.isEnabled;
    if (parsed.autoConnect !== undefined) {
      state.autoConnect = !!parsed.autoConnect;
      state._autoConnectSuppressed = (parsed.autoConnect === false);
    }
    if (parsed.userPresets && typeof parsed.userPresets === 'object') state._userPresets = parsed.userPresets;
    if (parsed.debugMode !== undefined) state._debugMode = !!parsed.debugMode;
    if (parsed.nightMode !== undefined) state._nightMode = !!parsed.nightMode;
    if (parsed.powerSaveMode !== undefined) state._powerSaveMode = !!parsed.powerSaveMode;
    state._settingsRestored = true;
    state._lastVolumeValue = state.settings.volume;
  }

  function requestRuntimeMessage(message) {
    return new Promise((resolve) => {
      try {
        if (typeof edgeAPI === 'undefined' || !edgeAPI.runtime?.sendMessage) {
          resolve(null);
          return;
        }
        edgeAPI.runtime.sendMessage(message, (response) => {
          if (edgeAPI.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function buildPersistedSettings() {
    return {
      gains: { ...state.settings.gains },
      volume: state.settings.volume,
      bass: state.settings.bass,
      isEnabled: state.isEnabled,
      autoConnect: state.autoConnect,
      debugMode: state._debugMode,
      nightMode: state._nightMode,
      powerSaveMode: state._powerSaveMode
    };
  }

  function saveSettings() {
    const settings = buildPersistedSettings();
    requestRuntimeMessage({
      action: 'saveInjectSettings',
      url: location.href,
      settings
    }).then((response) => {
      if (response?.status === 'error') {
        log('Ошибка сохранения настроек сайта', 'warn', response.message || response.status);
      }
    }).catch(() => {});
  }

  async function loadSettings() {
    state._settingsReadyPromise = (async () => {
      let loaded = false;

      try {
        const response = await requestRuntimeMessage({
          action: 'getInjectSettings',
          url: location.href
        });
        if (response?.status === 'ok' && response.settings) {
          applyLoadedSettings(response.settings);
          loaded = true;
        }
      } catch (error) {
        log('Ошибка загрузки настроек через background', 'warn', error);
      }

      if (!loaded) {
        try {
          const saved = localStorage.getItem(state._storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            applyLoadedSettings(parsed || {});
            if (parsed && Object.keys(parsed).length) {
              saveSettings();
            }
            loaded = true;
          }
        } catch (error) {
          log('Ошибка миграции старых настроек', 'debug', error);
        }
      }

      if (!loaded) {
        applyLoadedSettings({});
      }

      state._settingsReady = true;
      if (state._pendingConnectUntilSettingsReady) {
        state._pendingConnectUntilSettingsReady = false;
        handleConnect(state._pendingConnectIsAutomatic);
      }
    })();

    return state._settingsReadyPromise;
  }

  loadSettings();

  function findAudioElements() {
    try {
      const elements = [];
      const selectors = [
        'video',
        'audio',
        'video.html5-main-video',
        'video.video-stream',
        '#movie_player video',
        '#player-container video',
        '#player video',
        'video#player_uid',
        'video#movie_player',
        'video#player',
        'video#video-player',
        'video.ytp-videoplayer-background'
      ];
      
      for (const selector of selectors) {
        try {
          const els = document.querySelectorAll(selector);
          for (const el of els) {
            if (el && typeof el.duration !== 'undefined') {
              if (el.readyState >= 1 || el.src || el.currentSrc || el.duration > 0) {
                elements.push(el);
              }
            }
          }
        } catch {}
      }

      if (elements.length === 0) {
        try {
          const allVideos = document.getElementsByTagName('video');
          for (const el of allVideos) {
            if (el && typeof el.duration !== 'undefined') {
              if (el.readyState >= 1 || el.src || el.duration > 0) {
                elements.push(el);
              }
            }
          }
        } catch {}
      }

      if (elements.length === 0) {
        try {
          const allAudios = document.getElementsByTagName('audio');
          for (const el of allAudios) {
            if (el && typeof el.duration !== 'undefined') {
              if (el.readyState >= 1 || el.src || el.duration > 0) {
                elements.push(el);
              }
            }
          }
        } catch {}
      }

      elements.sort((a, b) => {
        const aIsMain = a.id === 'movie_player' || a.classList.contains('html5-main-video');
        const bIsMain = b.id === 'movie_player' || b.classList.contains('html5-main-video');
        if (aIsMain && !bIsMain) return -1;
        if (!aIsMain && bIsMain) return 1;
        return 0;
      });

      return elements;
    } catch (e) {
      return [];
    }
  }

  // ============================================
  //  AUDIOCONTEXT ДЛЯ EDGE AUTOPLAY POLICY
  // ============================================

  function ensureAudioContextRunning() {
    const context = state.context;
    if (!context || context.state === 'closed') return Promise.resolve(false);
    if (context.state === 'running') return Promise.resolve(true);

    return context.resume().then(() => context.state === 'running').catch(() => {
      if (!state._edgeResumeArmed) {
        state._edgeResumeArmed = true;
        const resumeFromGesture = () => {
          state._edgeResumeArmed = false;
          const active = state.context;
          if (active && active.state === 'suspended') active.resume().catch(() => {});
        };
        document.addEventListener('pointerdown', resumeFromGesture, { once: true, capture: true });
        document.addEventListener('keydown', resumeFromGesture, { once: true, capture: true });
        document.addEventListener('touchstart', resumeFromGesture, { once: true, capture: true, passive: true });
      }
      return false;
    });
  }

  function createAudioContext() {
    try {
      if (state.context) {
        try {
          if (state.context.state !== 'closed') {
            state.context.close();
          }
        } catch {}
        state.context = null;
      }
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        log('AudioContext не поддерживается', 'error');
        return null;
      }
      
      const context = new AudioContextClass({
        latencyHint: 'interactive'
      });
      
      state.context = context;
      ensureAudioContextRunning();
      state._chainValid = false;
      return context;
    } catch (e) {
      log('Ошибка создания AudioContext', 'error', e);
      return null;
    }
  }

  // ============================================
  //  НОВАЯ DSP-ЦЕПОЧКА С MASTER GAIN И SAFETY LIMITER
  //  Media Source → Bass Boost → 10× EQ → Compressor → Master Gain → Hard Mute → Safety Limiter → Fade Gain → Analyser → Output
  // ============================================

  function connectAudio(element) {
    if (state._mutexLock) return false;
    if (state._isConnecting) return false;
    if (state.isActive && state._isConnected) return true;
    if (state._connectAttempts >= state._maxConnectAttempts) return false;

    state._mutexLock = true;
    
    try {
      if (!element || !element.captureStream) {
        state._mutexLock = false;
        return false;
      }

      state._isConnecting = true;
      state._connectAttempts++;
      state._audioElement = element;
      state._originalMuted = !!element.muted;
      state._originalVolume = Number.isFinite(element.volume) ? element.volume : 1.0;
      element.muted = true;

      let stream = null;
      try {
        stream = element.captureStream();
        if (!stream || stream.getAudioTracks().length === 0) {
          throw new Error('Нет аудио дорожек');
        }
      } catch(e) {
        element.muted = state._originalMuted;
        state._isConnecting = false;
        state._mutexLock = false;
        return false;
      }

      const context = createAudioContext();
      if (!context) {
        element.muted = state._originalMuted;
        state._isConnecting = false;
        state._mutexLock = false;
        return false;
      }

      const source = context.createMediaStreamSource(stream);
      state.source = source;
      state.mediaStream = stream;

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      state.analyser = analyser;
      state._timeDomainData = new Float32Array(analyser.fftSize);

      // DSP chain: Source → Bass → 10-band EQ → Compressor → Master Gain → Hard Mute → Safety Limiter → Fade → Analyser → Output
      const bassNode = context.createBiquadFilter();
      bassNode.type = 'lowshelf';
      bassNode.frequency.value = 100;
      bassNode.gain.value = Math.max(-12, Math.min(12, state.settings.bass));
      state.bassNode = bassNode;

      let previousNode = bassNode;
      const filters = {};
      FREQUENCIES.forEach((item) => {
        const filter = context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = item.freq;
        filter.Q.value = item.Q;
        filter.gain.value = Math.max(-12, Math.min(12, state.settings.gains[item.key] || 0));
        previousNode.connect(filter);
        previousNode = filter;
        filters[item.key] = filter;
      });
      state.filters = filters;

      // Dynamics Compressor for dynamic control
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      state.compressor = compressor;

      // Master gain is AFTER compressor so 0–800% changes final loudness
      const gainNode = context.createGain();
      let volumeValue = Math.max(0, Math.min(8.0, state.settings.volume));
      if (state._nightMode) {
        volumeValue = volumeValue * 0.3;
      }
      gainNode.gain.value = volumeValue;
      state.gainNode = gainNode;

      const hardMuteNode = context.createGain();
      hardMuteNode.gain.value = volumeValue === 0 ? 0 : 1.0;
      state._hardMuteNode = hardMuteNode;

      // Safety Limiter after master gain (true peak protection)
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -1;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.12;
      state.limiter = limiter;

      const fadeGain = context.createGain();
      fadeGain.gain.value = 1.0;
      state.fadeGain = fadeGain;

      // Connect the full chain
      source.connect(bassNode);
      previousNode.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(hardMuteNode);
      hardMuteNode.connect(limiter);
      limiter.connect(fadeGain);
      fadeGain.connect(analyser);
      analyser.connect(context.destination);

      state.currentElement = element;
      state._lastElementId = element.id || element.src || Math.random().toString(36);
      state.isActive = true;
      state._isConnected = true;
      state._isConnecting = false;
      state._statusSent = false;
      state._isVideoChange = false;
      state._isProcessingChange = false;
      state._connectAttempts = 0;
      state._isRestoring = false;
      state._contextRestoreAttempts = 0;
      state._retryCount = 0;
      state._isRetrying = false;
      state._manualConnectRequested = true;
      state._findElementAttempts = 0;
      state._chainValid = true;
      state._mutexLock = false;
      observeChanges();

      // Apply master volume settings immediately
      applySettingsInternal();

      if (state.settings.volume === 0) {
        state._hardMute = true;
        state._isMuted = true;
        state._tabHardMuteRequested = true;
        safeSendMessage({ action: 'setTabVolumeMute', muted: true });
        
        if (state.gainNode) {
          state.gainNode.gain.value = 0;
        }
        if (state._hardMuteNode) {
          state._hardMuteNode.gain.value = 0;
        }
        if (state.fadeGain) {
          state.fadeGain.gain.value = 0;
        }
        if (state.currentElement) {
          state.currentElement.muted = true;
        }
        if (state._audioElement) {
          state._audioElement.muted = true;
        }
        
        log('🔇 ЖЕСТКОЕ ОТКЛЮЧЕНИЕ ЗВУКА (0%)', 'info');
      }

      setTimeout(() => {
        if (!state._statusSent) {
          state._statusSent = true;
          safeSendMessage({ action: 'statusUpdate', status: 'connected' });
        }
      }, 500);

      startSpectrumUpdates();
      startContextMonitoring();
      
      state._memoryCleanupInterval = setInterval(() => {
        if (state.isActive && state.context) {
          if (state.context.state !== 'running') {
            restoreAudioContext();
          }
        }
      }, 30000);
      
      log('✅ SoundForge подключен', 'info');
      state._mutexLock = false;
      return true;

    } catch (e) {
      log('Критическая ошибка подключения', 'error', e);
      if (element) { try { element.muted = state._originalMuted || false; } catch {} }
      state._isConnecting = false;
      state._mutexLock = false;
      return false;
    }
  }

  // ============================================
  //  ПРИМЕНЕНИЕ НАСТРОЕК
  // ============================================

  function applySettings(instant) {
    if (!state.isActive) return;
    try {
      applySettingsInternal();
      saveSettings();
    } catch (e) {
      log('Ошибка применения настроек', 'error', e);
    }
  }

  function applySettingsInternal() {
    try {
      Object.keys(state.settings.gains).forEach((key) => {
        if (state.filters[key]) {
          state.filters[key].gain.value = Math.max(-12, Math.min(12, Number(state.settings.gains[key]) || 0));
        }
      });
      
      if (state.bassNode) {
        const bassValue = Math.max(-12, Math.min(12, state.settings.bass));
        state.bassNode.gain.value = bassValue;
      }
      
      let volumeValue = Math.max(0, Math.min(8.0, state.settings.volume));
      if (state._nightMode) {
        volumeValue = volumeValue * 0.3;
      }
      state._lastVolumeValue = volumeValue;
      
      if (state.gainNode) {
        state.gainNode.gain.value = volumeValue;
      }
      
      const isMute = volumeValue === 0;
      if (state._hardMuteNode) {
        state._hardMuteNode.gain.value = isMute ? 0 : 1.0;
      }
      if (state.fadeGain) {
        state.fadeGain.gain.value = isMute ? 0 : 1.0;
      }
      
      if (isMute) {
        state._hardMute = true;
        state._isMuted = true;
        if (!state._tabHardMuteRequested) {
          state._tabHardMuteRequested = true;
          safeSendMessage({ action: 'setTabVolumeMute', muted: true });
        }
        if (state.currentElement) {
          state.currentElement.muted = true;
        }
        if (state._audioElement) {
          state._audioElement.muted = true;
        }
        log('🔇 ЖЕСТКОЕ ОТКЛЮЧЕНИЕ: все узлы обнулены (0%)', 'info');
      } else {
        state._hardMute = false;
        state._isMuted = false;
        if (state._tabHardMuteRequested) {
          state._tabHardMuteRequested = false;
          safeSendMessage({ action: 'setTabVolumeMute', muted: false });
        }
        // Keep native media muted while Web Audio graph is active
        if (state.currentElement) {
          state.currentElement.muted = true;
        }
        if (state._audioElement) {
          state._audioElement.muted = true;
        }
        
        log('🔊 Звук восстановлен:', (volumeValue * 100).toFixed(0) + '%', 'debug');
      }
      
    } catch (e) {
      log('Ошибка в applySettingsInternal', 'error', e);
      throw e;
    }
  }

  // ============================================
  //  ВАЛИДАЦИЯ И ВОССТАНОВЛЕНИЕ АУДИО-ЦЕПОЧКИ
  // ============================================

  function validateAudioChain() {
    if (!state.context || state.context.state === 'closed') return false;
    if (!state.source || !state.gainNode || !state.bassNode || !state.compressor || !state.limiter || !state.analyser) return false;
    if (state.context.state !== 'running') return false;
    if (!state.currentElement) return false;
    state._chainValid = true;
    return true;
  }

  function recreateAudioChain() {
    if (state._isRecreating) return false;
    state._isRecreating = true;
    
    try {
      const savedSettings = {
        gains: { ...state.settings.gains },
        volume: state.settings.volume,
        bass: state.settings.bass
      };
      
      fullCleanup(true);
      
      const elements = findAudioElements();
      if (!elements || elements.length === 0) {
        state._isRecreating = false;
        return false;
      }
      
      const element = elements[0];
      state.settings.gains = savedSettings.gains;
      state.settings.volume = savedSettings.volume;
      state.settings.bass = savedSettings.bass;
      
      const result = connectAudio(element);
      state._isRecreating = false;
      return result;
      
    } catch (e) {
      log('Ошибка пересоздания', 'error', e);
      state._isRecreating = false;
      return false;
    }
  }

  function restoreAudioContext() {
    if (state._restorationInProgress) return false;
    
    const now = Date.now();
    if (now - state._lastRestoreAttempt < state._restoreCooldown) return false;
    
    state._lastRestoreAttempt = now;
    state._restorationInProgress = true;
    
    try {
      if (!state.context || state.context.state === 'closed') {
        const result = recreateAudioChain();
        state._restorationInProgress = false;
        return result;
      }
      
      if (state.context.state === 'suspended') {
        try {
          state.context.resume().then(() => {
            state._contextRestoreAttempts = 0;
            state._restorationInProgress = false;
            if (!validateAudioChain()) recreateAudioChain();
          }).catch(() => {
            state._restorationInProgress = false;
            recreateAudioChain();
          });
          return true;
        } catch (e) {
          state._restorationInProgress = false;
          return recreateAudioChain();
        }
      }
      
      if (!validateAudioChain()) {
        const result = recreateAudioChain();
        state._restorationInProgress = false;
        return result;
      }
      
      try {
        applySettingsInternal();
      } catch (e) {
        state._restorationInProgress = false;
        return recreateAudioChain();
      }
      
      state._contextRestoreAttempts = 0;
      state._chainValid = true;
      state._restorationInProgress = false;
      return true;
      
    } catch (e) {
      log('Ошибка восстановления', 'error', e);
      state._restorationInProgress = false;
      
      if (state._contextRestoreAttempts < state._maxContextRestoreAttempts) {
        state._contextRestoreAttempts++;
        return recreateAudioChain();
      }
      
      return false;
    }
  }

  function startContextMonitoring() {
    if (state._contextCheckInterval) {
      clearInterval(state._contextCheckInterval);
      state._contextCheckInterval = null;
    }
    
    const interval = state._powerSaveMode ? 5000 : 3000;
    
    state._contextCheckInterval = setInterval(() => {
      if (!state.isActive || !state._manualConnectRequested) return;
      
      if (state.context) {
        const stateName = state.context.state;
        if (stateName === 'closed' || stateName === 'suspended') {
          restoreAudioContext();
        } else if (stateName === 'running' && !state._chainValid) {
          restoreAudioContext();
        }
      } else if (state.isActive) {
        restoreAudioContext();
      }
    }, interval);
  }

  function stopContextMonitoring() {
    if (state._contextCheckInterval) {
      clearInterval(state._contextCheckInterval);
      state._contextCheckInterval = null;
    }
  }

  // ============================================
  //  СПЕКТР (DEMAND-DRIVEN)
  // ============================================

  function startSpectrumUpdates() {
    if (!state._spectrumRequested) {
      if (state._spectrumInterval) clearInterval(state._spectrumInterval);
      state._spectrumInterval = null;
      return;
    }
    if (state._spectrumInterval) {
      clearInterval(state._spectrumInterval);
      state._spectrumInterval = null;
    }
    const interval = state._powerSaveMode ? 500 : 80;
    state._spectrumInterval = setInterval(() => { updateSpectrumData(); }, interval);
  }

  function updateSpectrumData() {
    if (!state.isActive || !state.analyser) {
      safeSendMessage({
        action: 'spectrumData',
        spectrum: new Array(64).fill(0),
        hasAudio: false,
        rms: 0,
        peak: 0,
        clipping: false
      });
      return;
    }
    try {
      const frequencyData = new Float32Array(state.analyser.frequencyBinCount);
      state.analyser.getFloatFrequencyData(frequencyData);
      if (!state._timeDomainData || state._timeDomainData.length !== state.analyser.fftSize) {
        state._timeDomainData = new Float32Array(state.analyser.fftSize);
      }
      state.analyser.getFloatTimeDomainData(state._timeDomainData);

      const { rms, peak, clipping } = calculateTimeDomainMetrics(state._timeDomainData);
      const hasAudio = rms > 0.001 || peak > 0.005;
      const normalized = new Float32Array(64);
      const minDb = state.analyser.minDecibels;
      const maxDb = state.analyser.maxDecibels;
      const range = Math.max(1, maxDb - minDb);
      for (let i = 0; i < Math.min(64, frequencyData.length); i++) {
        const db = frequencyData[i];
        normalized[i] = Number.isFinite(db) ? Math.max(0, Math.min(1, (db - minDb) / range)) : 0;
      }
      state._spectrumData = normalized;
      safeSendMessage({
        action: 'spectrumData',
        spectrum: Array.from(normalized),
        hasAudio,
        rms,
        peak,
        clipping,
        isDummy: false
      });
    } catch (error) {
      safeSendMessage({
        action: 'spectrumData',
        spectrum: new Array(64).fill(0),
        hasAudio: false,
        rms: 0,
        peak: 0,
        clipping: false,
        error: error?.message || 'spectrum_read_failed'
      });
    }
  }

  function calculateTimeDomainMetrics(data) {
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = Number.isFinite(data[i]) ? data[i] : 0;
      const abs = Math.abs(sample);
      sumSquares += sample * sample;
      if (abs > peak) peak = abs;
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, data.length));
    return { rms: Math.max(0, Math.min(1, rms)), peak: Math.max(0, Math.min(1, peak)), clipping: peak >= 0.99 };
  }

  function getSpectrumData() {
    if (!state.isActive || !state.analyser) return new Float32Array(64).fill(0);
    try {
      const dataArray = new Float32Array(state.analyser.frequencyBinCount);
      state.analyser.getFloatFrequencyData(dataArray);
      const normalized = new Float32Array(64);
      const minDb = state.analyser.minDecibels;
      const maxDb = state.analyser.maxDecibels;
      const range = Math.max(1, maxDb - minDb);
      for (let i = 0; i < Math.min(dataArray.length, 64); i++) {
        const db = dataArray[i];
        normalized[i] = Number.isFinite(db) ? Math.max(0, Math.min(1, (db - minDb) / range)) : 0;
      }
      return normalized;
    } catch { return new Float32Array(64).fill(0); }
  }

  // ============================================
  //  ПОЛНАЯ ОЧИСТКА РЕСУРСОВ
  // ============================================

  function fullCleanup(keepSettings) {
    log('Полная очистка', 'debug', { keepSettings });
    
    if (state._cleanupTimeout) {
      clearTimeout(state._cleanupTimeout);
      state._cleanupTimeout = null;
    }
    if (state._connectTimer) {
      clearTimeout(state._connectTimer);
      state._connectTimer = null;
    }
    if (state._videoChangeTimeout) {
      clearTimeout(state._videoChangeTimeout);
      state._videoChangeTimeout = null;
    }
    if (state._spectrumInterval) {
      clearInterval(state._spectrumInterval);
      state._spectrumInterval = null;
    }
    if (state._reconnectTimer) {
      clearInterval(state._reconnectTimer);
      state._reconnectTimer = null;
    }
    if (state._retryTimer) {
      clearTimeout(state._retryTimer);
      state._retryTimer = null;
    }
    if (state._memoryCleanupInterval) {
      clearInterval(state._memoryCleanupInterval);
      state._memoryCleanupInterval = null;
    }
    if (state._contextCheckInterval) {
      clearInterval(state._contextCheckInterval);
      state._contextCheckInterval = null;
    }
    
    if (state._observer) {
      try {
        state._observer.disconnect();
        state._observer = null;
        state._observerActive = false;
      } catch {}
    }
    
    if (state._rafId) {
      try {
        cancelAnimationFrame(state._rafId);
        state._rafId = null;
      } catch {}
    }

    try {
      if (state.currentElement) {
        try { state.currentElement.muted = state._originalMuted; } catch {}
        try { state.currentElement.volume = state._originalVolume; } catch {}
      }
      if (state.mediaStream) {
        try { state.mediaStream.getTracks().forEach((track) => { try { track.stop(); } catch {} }); } catch {}
        state.mediaStream = null;
      }
      if (state.source) {
        try { state.source.disconnect(); } catch {}
        state.source = null;
      }
      Object.keys(state.filters).forEach((key) => {
        try { state.filters[key].disconnect(); } catch {}
      });
      state.filters = {};
      
      const nodes = ['volumeNode', 'bassNode', 'compressor', 'limiter', 'gainNode', 'fadeGain', 'workletNode', '_hardMuteNode'];
      nodes.forEach((name) => {
        if (state[name]) {
          try { state[name].disconnect(); } catch {}
          state[name] = null;
        }
      });
      
      if (state.context && state.context.state !== 'closed') {
        try { state.context.close(); } catch {}
        state.context = null;
      }

      if (state.analyser) {
        try { state.analyser.disconnect(); } catch {}
        state.analyser = null;
      }

      state.isActive = false;
      state._isConnected = false;
      state.currentElement = null;
      state._audioElement = null;
      state._originalMuted = false;
      state._originalVolume = 1.0;
      state._timeDomainData = null;
      state._isConnecting = false;
      state._statusSent = false;
      state._isProcessingChange = false;
      state._isRestoring = false;
      state._contextRestoreAttempts = 0;
      state._isFading = false;
      state._retryCount = 0;
      state._isRetrying = false;
      state._findElementAttempts = 0;
      state._isMuted = false;
      state._chainValid = false;
      state._restorationInProgress = false;
      state._isRecreating = false;
      state._hardMute = false;
      state._hardMuteNode = null;
      state._mutexLock = false;
      state._observerActive = false;
      state._lifecycleToken++;
      state._tabHardMuteRequested = false;
      safeSendMessage({ action: 'setTabVolumeMute', muted: false });

    } catch (e) {
      log('Ошибка при очистке', 'error', e);
    }
  }

  function saveCurrentSettings() {
    state._savedGains = Object.assign({}, state.settings.gains);
    state._savedVolume = state.settings.volume;
    state._savedBass = state.settings.bass;
  }

  function restoreSettings() {
    if (state._savedGains) {
      Object.keys(state._savedGains).forEach((key) => {
        if (state.settings.gains[key] !== undefined) state.settings.gains[key] = state._savedGains[key];
      });
    }
    if (state._savedVolume !== undefined) state.settings.volume = state._savedVolume;
    if (state._savedBass !== undefined) state.settings.bass = state._savedBass;
    applySettings(true);
    saveSettings();
  }

  // ============================================
  //  ПОДКЛЮЧЕНИЕ / ОТКЛЮЧЕНИЕ
  // ============================================

  function handleConnect(isAutomatic) {
    if (!state._settingsReady) {
      state._pendingConnectUntilSettingsReady = true;
      state._pendingConnectIsAutomatic = !!isAutomatic;
      if (state._settingsReadyPromise) state._settingsReadyPromise.catch(() => {});
      return;
    }

    if (isAutomatic && state._autoConnectSuppressed) {
      log('🔇 Автоподключение пропущено: ранее было отключено пользователем на этом сайте/глобально', 'info');
      return;
    }

    log('🔗 РУЧНОЕ ПОДКЛЮЧЕНИЕ (Microsoft Edge 151)', 'info');
    if (state.context) ensureAudioContextRunning();
    
    if (state.isActive && state._isConnected) {
      safeSendMessage({ action: 'statusUpdate', status: 'connected' });
      return;
    }
    
    state.isEnabled = true;
    state.autoConnect = false;
    state.reconnectAttempts = 0;
    state._isConnected = false;
    state._isConnecting = false;
    state._statusSent = false;
    state._connectAttempts = 0;
    state._isVideoChange = false;
    state._isProcessingChange = false;
    state._savedGains = null;
    state._savedVolume = null;
    state._savedBass = null;
    state._lastElementId = null;
    state._settingsRestored = false;
    state._contextRestoreAttempts = 0;
    state._retryCount = 0;
    state._isRetrying = false;
    state._manualConnectRequested = true;
    state._lifecycleToken++;
    state._findElementAttempts = 0;
    state._isMuted = false;
    state._chainValid = false;
    state._hardMute = false;
    state._mutexLock = false;
    state._tabHardMuteRequested = false;
    saveSettings();
    
    tryConnectWithRetry();
  }

  function tryConnectWithRetry() {
    const token = state._lifecycleToken;
    const elements = findAudioElements();

    if (elements && elements.length > 0) {
      const element = elements[0];
      state._findElementAttempts = 0;
      clearTimeout(state._retryTimer);
      state._retryTimer = setTimeout(() => {
        if (token !== state._lifecycleToken || !state._manualConnectRequested) return;
        if (state.isActive) {
          fullCleanup(true);
          state._retryTimer = setTimeout(() => {
            if (token === state._lifecycleToken && state._manualConnectRequested) connectAudio(element);
          }, 300);
        } else {
          connectAudio(element);
        }
      }, 300);
    } else {
      state._findElementAttempts++;
      if (state._findElementAttempts < state._maxFindElementAttempts) {
        clearTimeout(state._retryTimer);
        state._retryTimer = setTimeout(() => {
          if (token === state._lifecycleToken && state._manualConnectRequested) tryConnectWithRetry();
        }, 500);
      } else {
        safeSendMessage({ action: 'statusUpdate', status: 'error' });
        state._isConnecting = false;
        state._findElementAttempts = 0;
        state._mutexLock = false;
      }
    }
  }

  function handleDisconnect() {
    log('⏹ РУЧНОЕ ОТКЛЮЧЕНИЕ', 'info');
    
    state.isEnabled = false;
    state.autoConnect = false;
    state.reconnectAttempts = state.maxReconnectAttempts;
    state._isConnected = false;
    state._isConnecting = false;
    state._statusSent = false;
    state._connectAttempts = 0;
    state._isVideoChange = false;
    state._isProcessingChange = false;
    state._savedGains = null;
    state._savedVolume = null;
    state._savedBass = null;
    state._lastElementId = null;
    state._settingsRestored = false;
    state._contextRestoreAttempts = 0;
    state._retryCount = 0;
    state._isRetrying = false;
    state._manualConnectRequested = false;
    state._lifecycleToken++;
    clearTimeout(state._retryTimer);
    state._retryTimer = null;
    state._findElementAttempts = 0;
    state._isMuted = false;
    state._chainValid = false;
    state._hardMute = false;
    state._mutexLock = false;
    state._tabHardMuteRequested = false;
    safeSendMessage({ action: 'setTabVolumeMute', muted: false });
    
    stopContextMonitoring();
    fullCleanup(false);
    saveSettings();
    safeSendMessage({ action: 'statusUpdate', status: 'disconnected' });
    log('✅ Отключение выполнено', 'info');
  }

  function handleVideoChange() {
    if (state._isProcessingChange) return;
    if (Date.now() - state._lastChangeTime < 2000) return;
    if (!state._manualConnectRequested) return;
    
    state._lastChangeTime = Date.now();
    state._isProcessingChange = true;
    
    saveCurrentSettings();
    state._isVideoChange = true;
    fullCleanup(true);
    state._connectAttempts = 0;
    state._isConnecting = false;
    state._settingsRestored = false;
    state._contextRestoreAttempts = 0;
    state._retryCount = 0;
    state._isRetrying = false;
    state._findElementAttempts = 0;
    state._isMuted = false;
    state._chainValid = false;
    state._hardMute = false;
    state._mutexLock = false;
    state._tabHardMuteRequested = false;
    safeSendMessage({ action: 'setTabVolumeMute', muted: false });
    
    state._videoChangeTimeout = setTimeout(() => {
      const elements = findAudioElements();
      if (elements && elements.length > 0 && state._manualConnectRequested) {
        const element = elements[0];
        state._connectAttempts = 0;
        state._isConnecting = false;
        state._isProcessingChange = false;
        connectAudio(element);
      } else {
        state._isProcessingChange = false;
      }
    }, 1500);
  }

  // ============================================
  //  НОЧНОЙ РЕЖИМ
  // ============================================

  function setNightMode(enabled) {
    state._nightMode = enabled;
    saveSettings();
    
    if (enabled) {
      log('🌙 Ночной режим включен (громкость снижена на 70%)', 'info');
    } else {
      log('☀️ Ночной режим выключен', 'info');
    }
    
    applySettingsInternal();
    
    safeSendMessage({ 
      action: 'nightModeStatus', 
      enabled: state._nightMode
    });
  }

  function toggleNightMode() {
    setNightMode(!state._nightMode);
    return state._nightMode;
  }

  // ============================================
  //  ЭНЕРГОСБЕРЕЖЕНИЕ
  // ============================================

  function setPowerSaveMode(enabled) {
    state._powerSaveMode = enabled;
    saveSettings();
    
    if (enabled) {
      log('⚡ Режим энергосбережения ВКЛЮЧЕН', 'info');
      if (state._spectrumInterval) {
        clearInterval(state._spectrumInterval);
        state._spectrumInterval = setInterval(() => { updateSpectrumData(); }, 500);
      }
      if (state._contextCheckInterval) {
        clearInterval(state._contextCheckInterval);
        state._contextCheckInterval = setInterval(() => {
          if (!state.isActive || !state._manualConnectRequested) return;
          if (state.context && state.context.state !== 'running') {
            restoreAudioContext();
          }
        }, 5000);
      }
    } else {
      log('⚡ Режим энергосбережения ВЫКЛЮЧЕН', 'info');
      if (state._spectrumInterval) {
        clearInterval(state._spectrumInterval);
        state._spectrumInterval = setInterval(() => { updateSpectrumData(); }, 80);
      }
      if (state._contextCheckInterval) {
        clearInterval(state._contextCheckInterval);
        state._contextCheckInterval = setInterval(() => {
          if (!state.isActive || !state._manualConnectRequested) return;
          if (state.context && state.context.state !== 'running') {
            restoreAudioContext();
          }
        }, 3000);
      }
    }
    
    safeSendMessage({ 
      action: 'powerSaveStatus', 
      enabled: state._powerSaveMode 
    });
  }

  function togglePowerSave() {
    setPowerSaveMode(!state._powerSaveMode);
    return state._powerSaveMode;
  }

  // ============================================
  //  ОБРАБОТЧИК СООБЩЕНИЙ
  // ============================================

  function handleMessage(type, data) {
    switch (type) {
      case 'SF_SET_SPECTRUM_ACTIVE':
        state._spectrumRequested = data?.enabled === true;
        if (state._spectrumRequested && state.isActive) startSpectrumUpdates();
        else if (state._spectrumInterval) { clearInterval(state._spectrumInterval); state._spectrumInterval = null; }
        break;
      case 'SF_CONNECT': handleConnect(); break;
      case 'SF_DISCONNECT': handleDisconnect(); break;
      case 'SF_RECONNECT':
        if (state._manualConnectRequested) {
          if (state.isActive) { saveCurrentSettings(); fullCleanup(true); }
          state.reconnectAttempts = 0;
          state._isConnecting = false;
          state._statusSent = false;
          state._connectAttempts = 0;
          state._isVideoChange = false;
          state._isProcessingChange = false;
          state._lastElementId = null;
          state._settingsRestored = false;
          state._contextRestoreAttempts = 0;
          state._retryCount = 0;
          state._isRetrying = false;
          state._findElementAttempts = 0;
          state._isMuted = false;
          state._chainValid = false;
          state._hardMute = false;
          state._mutexLock = false;
          state._tabHardMuteRequested = false;
          safeSendMessage({ action: 'setTabVolumeMute', muted: false });
          state._lifecycleToken++;
          observeChanges();
          const reconnectToken = state._lifecycleToken;
          setTimeout(() => { if (reconnectToken === state._lifecycleToken && state._manualConnectRequested) handleConnect(); }, 500);
        }
        break;
      case 'SF_SYNC_SETTINGS':
        if (data) {
          if (data.gains) Object.keys(data.gains).forEach((key) => { if (state.settings.gains[key] !== undefined) state.settings.gains[key] = Number(data.gains[key]) || 0; });
          if (data.volume !== undefined) state.settings.volume = Math.max(0, Math.min(8, Number(data.volume) || 0));
          if (data.bass !== undefined) state.settings.bass = Math.max(-12, Math.min(12, Number(data.bass) || 0));
          if (data.userPresets) state._userPresets = data.userPresets;
          if (data.nightMode !== undefined) state._nightMode = !!data.nightMode;
          if (data.powerSaveMode !== undefined) state._powerSaveMode = !!data.powerSaveMode;
          if (data.debugMode !== undefined) state._debugMode = !!data.debugMode;
          if (state.isActive) applySettings(true);
        }
        break;
      case 'SF_APPLY_SITE_SETTINGS':
        if (data) {
          if (data.gains) Object.keys(data.gains).forEach((key) => { if (state.settings.gains[key] !== undefined) state.settings.gains[key] = Number(data.gains[key]) || 0; });
          if (data.volume !== undefined) state.settings.volume = Math.max(0, Math.min(8, Number(data.volume) || 0));
          if (data.bass !== undefined) state.settings.bass = Math.max(-12, Math.min(12, Number(data.bass) || 0));
          if (state.isActive) applySettings(true);
        }
        break;
      case 'SF_UPDATE_EQ':
        if (data && data.gains) {
          Object.keys(data.gains).forEach((key) => {
            if (state.settings.gains[key] !== undefined) state.settings.gains[key] = data.gains[key];
          });
          applySettings(data.instant || false);
          saveSettings();
        }
        break;
      case 'SF_RESET':
        FREQUENCIES.forEach((item) => { state.settings.gains[item.key] = 0; });
        state.settings.volume = 1.0;
        state.settings.bass = 0;
        applySettings(true);
        saveSettings();
        break;
      case 'SF_SET_VOLUME':
        if (data && data.value !== undefined) {
          const volumeValue = Math.max(0, Math.min(8.0, Number(data.value) || 0));
          state.settings.volume = volumeValue;
          state._lastVolumeValue = volumeValue;
          if (state.isActive) {
            applySettingsInternal();
          }
          saveSettings();
        }
        break;
      case 'SF_SET_BASS':
        if (data && data.value !== undefined) {
          state.settings.bass = Math.max(-12, Math.min(12, data.value));
          if (state.bassNode) {
            state.bassNode.gain.value = state.settings.bass;
          }
          saveSettings();
        }
        break;
      case 'SF_GET_STATUS':
        safeSendMessage({ action: 'statusUpdate', status: state.isActive ? 'connected' : 'disconnected' });
        break;
      case 'SF_GET_SPECTRUM':
        updateSpectrumData();
        break;
      case 'SF_SAVE_USER_PRESET':
        if (data && data.name) {
          state._userPresets[data.name] = {
            gains: Object.assign({}, state.settings.gains),
            volume: state.settings.volume,
            bass: state.settings.bass,
            timestamp: Date.now()
          };
          saveSettings();
          safeSendMessage({ action: 'userPresetsUpdated', presets: state._userPresets });
        }
        break;
      case 'SF_DELETE_USER_PRESET':
        if (data && data.name && state._userPresets[data.name]) {
          delete state._userPresets[data.name];
          saveSettings();
          safeSendMessage({ action: 'userPresetsUpdated', presets: state._userPresets });
        }
        break;
      case 'SF_GET_USER_PRESETS':
        safeSendMessage({ action: 'userPresetsUpdated', presets: state._userPresets });
        break;
      case 'SF_TOGGLE_DEBUG':
        state._debugMode = !state._debugMode;
        saveSettings();
        log('🐛 Режим отладки:', state._debugMode ? 'ВКЛ' : 'ВЫКЛ', 'info');
        break;
      case 'SF_APPLY_PRESET':
        if (data && data.preset) {
          const wasActive = state.isActive;
          const wasConnected = state._isConnected;
          const activeContext = state.context;
          const preset = data.settings || data.presetData;
          if (preset && preset.gains) {
            Object.keys(state.settings.gains).forEach((key) => {
              if (preset.gains[key] !== undefined) state.settings.gains[key] = Number(preset.gains[key]) || 0;
            });
            if (preset.volume !== undefined) state.settings.volume = Math.max(0, Math.min(8, Number(preset.volume) / 100));
            if (preset.bass !== undefined) state.settings.bass = Math.max(-12, Math.min(12, Number(preset.bass) || 0));
            state._hardMute = state.settings.volume === 0;
            state._isMuted = state._hardMute;
            applySettings(true);
            saveSettings();
          }
          if (wasActive) state.isActive = true;
          if (wasConnected) state._isConnected = true;
          if (activeContext && state.context !== activeContext) {
            log('⚠️ AudioContext changed unexpectedly during preset apply', 'warn');
          }
          state._userPresets = data.userPresets || state._userPresets;
          state.currentPreset = data.preset;
          log('🎵 Применён пресет без отключения:', data.preset, 'info');
          safeSendMessage({ action: 'presetApplied', preset: data.preset });
        }
        break;
      case 'SF_SET_NIGHT_MODE':
        if (data && data.enabled !== undefined) {
          setNightMode(data.enabled);
        }
        break;
      case 'SF_TOGGLE_NIGHT_MODE':
        toggleNightMode();
        break;
      case 'SF_GET_NIGHT_MODE':
        safeSendMessage({ 
          action: 'nightModeStatus', 
          enabled: state._nightMode 
        });
        break;
      case 'SF_SET_POWER_SAVE':
        if (data && data.enabled !== undefined) {
          setPowerSaveMode(data.enabled);
        }
        break;
      case 'SF_TOGGLE_POWER_SAVE':
        togglePowerSave();
        break;
      case 'SF_GET_POWER_SAVE':
        safeSendMessage({ 
          action: 'powerSaveStatus', 
          enabled: state._powerSaveMode 
        });
        break;
      default: break;
    }
  }

  // ============================================
  //  RUNTIME MESSAGE LISTENER (EDGE OPTIMIZED)
  // ============================================

  if (typeof edgeAPI !== 'undefined' && edgeAPI.runtime?.onMessage) {
    edgeAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (!message) return;
        if (message.type === 'SF_PING') {
          sendResponse({ ready: true, active: state.isActive, version: '3.22.8' });
          return;
        }
        if (message.type === 'SF_GET_SPECTRUM') {
          updateSpectrumData();
          sendResponse({ ok: true, active: state.isActive });
          return;
        }
        if (message.type === 'SF_GET_STATUS') {
          sendResponse({
            ok: true,
            active: state.isActive,
            connected: state._isConnected,
            chainValid: state._chainValid
          });
          safeSendMessage({ action: 'statusUpdate', status: state.isActive ? 'connected' : 'disconnected' });
          return;
        }
        if (message.type) {
          handleMessage(message.type, message.data || {});
          sendResponse({ ok: true });
        }
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || 'message_failed' });
      }
      return true;
    });
  }

  // ============================================
  //  ПУБЛИЧНЫЙ API
  // ============================================

  window.SoundForgeInject = {
    handleMessage: handleMessage,
    getState: function() {
      return {
        isActive: state.isActive,
        analyser: state.analyser,
        settings: state.settings,
        isYouTube: false,
        _isConnected: state._isConnected,
        _manualConnectRequested: state._manualConnectRequested,
        _isMuted: state._isMuted,
        _chainValid: state._chainValid,
        _hardMute: state._hardMute,
        _nightMode: state._nightMode,
        _powerSaveMode: state._powerSaveMode,
        rms: calculateTimeDomainMetrics(state._timeDomainData || new Float32Array(0)).rms,
        peak: calculateTimeDomainMetrics(state._timeDomainData || new Float32Array(0)).peak
      };
    },
    getSpectrumData: getSpectrumData,
    restoreContext: restoreAudioContext,
    validateChain: validateAudioChain,
    setNightMode: setNightMode,
    toggleNightMode: toggleNightMode,
    setPowerSave: setPowerSaveMode,
    togglePowerSave: togglePowerSave,
    _initialized: true,
    _version: '3.22.8'
  };

  if (window._soundforge_pending) {
    const pendingMessages = window._soundforge_pending.slice();
    window._soundforge_pending = [];
    pendingMessages.forEach((msg) => {
      handleMessage(msg.type, msg.data);
    });
  }

  // ============================================
  //  MUTATION OBSERVER ДЛЯ ОТСЛЕЖИВАНИЯ ИЗМЕНЕНИЙ
  // ============================================

  function observeChanges() {
    if (state._observerActive) return;
    state._observerActive = true;

    state._observer = new MutationObserver(() => {
      if (state._processingObservation) return;
      if (state._isProcessingChange || state._isConnecting) return;
      if (!state.isEnabled || !state._manualConnectRequested) return;
      if (Date.now() - state._lastChangeTime < 1000) return;
      
      state._processingObservation = true;
      
      try {
        const elements = findAudioElements();
        if (elements && elements.length > 0) {
          const currentElement = elements[0];
          const elementId = currentElement.id || currentElement.src || '';
          
          if (state.isActive && state._lastElementId !== null && state._lastElementId !== elementId) {
            state._processingObservation = false;
            if (!state._isVideoChange && state._manualConnectRequested) {
              handleVideoChange();
            }
            return;
          }
        }
      } catch {}
      
      state._processingObservation = false;
    });

    state._observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'data-testid', 'class', 'srcset']
    });
  }

  // ============================================
  //  ИНИЦИАЛИЗАЦИЯ
  // ============================================

  function init() {
    if (state._initDone) return;
    state._initDone = true;
    
    log('✅ SoundForge v3.22.8 Edge 151 инициализирован', 'info');
    observeChanges();
    
    safeSendMessage({ 
      action: 'statusUpdate', 
      status: 'ready',
      version: '3.22.8'
    });
    
    log('🔘 АВТОПОДКЛЮЧЕНИЕ АКТИВНО', 'info');
    log('🔇 ГРОМКОСТЬ: 0% - 800%', 'info');
    log('🔇 0% = ПОЛНАЯ ТИШИНА, 800% = МАКСИМУМ', 'info');
    log('🌐 РАБОТАЕТ НА ВСЕХ САЙТАХ', 'info');
    
    setTimeout(() => {
      log('🔄 АВТОПОДКЛЮЧЕНИЕ...', 'info');
      handleConnect(true);
    }, 1000);
  }

  if (document.readyState === 'complete') {
    setTimeout(init, 500);
  } else {
    window.addEventListener('load', () => { setTimeout(init, 500); }, { once: true });
  }

  log('✅✅✅ SoundForge v3.22.8 Edge 151 загружен ✅✅✅', 'info');

})();