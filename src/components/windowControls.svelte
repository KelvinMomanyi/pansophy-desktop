<script>
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { logger } from '../lib/logger.js';

  let appWindow;
  let isReady = false;

  onMount(async () => {
    try {
      appWindow = getCurrentWindow();
      isReady = true;
      logger.info('window.initialized');
    } catch (error) {
      logger.error('window.initialize_failed', {}, error);
    }
  });

  async function minimizeWindow() {
    if (!isReady || !appWindow) return;
    try {
      await appWindow.minimize();
    } catch (error) {
      logger.error('window.minimize_failed', {}, error);
    }
  }

  async function closeWindow() {
    if (!isReady || !appWindow) return;
    try {
      await appWindow.close();
    } catch (error) {
      logger.error('window.close_failed', {}, error);
    }
  }
</script>

<div class="title-bar" data-tauri-drag-region>
  <div class="window-controls">
    <button
      type="button"
      aria-label="Close window"
      class="control-btn close"
      on:click={closeWindow}
      disabled={!isReady}
    >
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>
    <button
      type="button"
      aria-label="Minimize window"
      class="control-btn minimize"
      on:click={minimizeWindow}
      disabled={!isReady}
    >
      <svg width="12" height="12" viewBox="0 0 12 12">
        <rect x="2" y="5" width="8" height="2" fill="currentColor" />
      </svg>
    </button>
  </div>
  <div class="title-content" data-tauri-drag-region>
    <span class="app-title"></span>
  </div>
</div>

<style>
  .title-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 1000;
    user-select: none;
  }

  .title-content {
    flex: 1;
    display: flex;
    align-items: center;
    padding-left: 16px;
    height: 100%;
  }

  .app-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .window-controls {
    display: flex;
    height: 100%;
    gap: 2px;
    justify-content: space-around;
    padding-left: 10px;
    margin-top: 15px;
  }

  .control-btn {
    width: 18px;
    height: 40%;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.8);
    transition: all 0.2s;
  }

  .control-btn.close {
    background-color: rgba(255, 96, 96, 0.2);
    border-radius: 50%;
    padding: auto;
  }

  .control-btn.minimize {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    padding: auto;
  }

  .control-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.6);
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-btn.close:hover:not(:disabled) {
    background: rgba(255, 96, 96, 0.7);
    color: white;
  }
</style>
