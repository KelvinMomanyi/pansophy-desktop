import { getCurrentWindow } from '@tauri-apps/api/window';
import { writable } from 'svelte/store';

import { logger } from './logger.js';

const LIGHT = 'light';
const DARK = 'dark';

function defaultWindow() {
  return typeof window === 'undefined' ? undefined : window;
}

function defaultDocument() {
  return typeof document === 'undefined' ? undefined : document;
}

function defaultAppWindow(windowObject) {
  if (!windowObject || !('__TAURI_INTERNALS__' in windowObject)) return null;
  try {
    return getCurrentWindow();
  } catch (error) {
    logger.warn('theme.tauri_unavailable', {}, error);
    return null;
  }
}

function isTheme(value) {
  return value === LIGHT || value === DARK;
}

export function createThemeStore(options = {}) {
  const windowObject = options.windowObject ?? defaultWindow();
  const documentObject = options.documentObject ?? defaultDocument();
  const storage = options.storage ?? windowObject?.localStorage;
  const appWindow = options.appWindow ?? defaultAppWindow(windowObject);
  const store = writable(LIGHT);
  let currentTheme = LIGHT;
  let cleanup = () => {};

  function setTheme(value) {
    const nextTheme = isTheme(value) ? value : LIGHT;
    currentTheme = nextTheme;
    documentObject?.documentElement.classList.toggle(DARK, nextTheme === DARK);
    store.set(nextTheme);
    return nextTheme;
  }

  function browserSystemTheme() {
    return windowObject?.matchMedia?.('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  async function systemTheme() {
    if (!appWindow) return browserSystemTheme();
    try {
      const nativeTheme = await appWindow.theme();
      return isTheme(nativeTheme) ? nativeTheme : browserSystemTheme();
    } catch (error) {
      logger.warn('theme.native_read_failed', {}, error);
      return browserSystemTheme();
    }
  }

  async function syncNative(value) {
    if (!appWindow) return;
    try {
      await appWindow.setTheme(value);
    } catch (error) {
      logger.warn('theme.native_sync_failed', { theme: value }, error);
    }
  }

  return {
    subscribe: store.subscribe,

    async toggle() {
      const nextTheme = currentTheme === LIGHT ? DARK : LIGHT;
      storage?.setItem('theme', nextTheme);
      setTheme(nextTheme);
      await syncNative(nextTheme);
      return nextTheme;
    },

    async init() {
      cleanup();
      cleanup = () => {};

      const savedTheme = storage?.getItem('theme');
      const nextTheme = isTheme(savedTheme) ? savedTheme : await systemTheme();
      setTheme(nextTheme);
      await syncNative(nextTheme);

      if (isTheme(savedTheme)) return cleanup;

      if (appWindow?.onThemeChanged) {
        try {
          const unlisten = await appWindow.onThemeChanged(({ payload }) => {
            if (isTheme(payload)) setTheme(payload);
          });
          cleanup = unlisten;
          return cleanup;
        } catch (error) {
          logger.warn('theme.native_listener_failed', {}, error);
        }
      }

      const mediaQuery = windowObject?.matchMedia?.('(prefers-color-scheme: dark)');
      if (mediaQuery?.addEventListener) {
        const handleChange = (event) => setTheme(event.matches ? DARK : LIGHT);
        mediaQuery.addEventListener('change', handleChange);
        cleanup = () => mediaQuery.removeEventListener('change', handleChange);
      }
      return cleanup;
    },

    async resetToSystem() {
      storage?.removeItem('theme');
      const nextTheme = await systemTheme();
      setTheme(nextTheme);
      await syncNative(nextTheme);
      return nextTheme;
    },

    destroy() {
      cleanup();
      cleanup = () => {};
    },
  };
}

export const theme = createThemeStore();
