// SoundForge standalone-window fullscreen helper.
// Kept dependency-free so it remains safe in MV3 extension pages.
(() => {
  'use strict';

  const applyState = () => {
    const expanded = !!document.fullscreenElement;
    document.body.classList.toggle('fullscreen-expanded', expanded);
  };

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        document.body.classList.toggle('fullscreen-expanded');
      }
    } catch (error) {
      console.warn('[SoundForge] Fullscreen toggle failed:', error);
      document.body.classList.toggle('fullscreen-expanded');
    }
    applyState();
  }

  window.SoundForgeFullscreen = { toggle: toggleFullscreen, sync: applyState };
  document.addEventListener('fullscreenchange', applyState, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'F11') {
      event.preventDefault();
      toggleFullscreen();
    }
  });
  applyState();
})();
