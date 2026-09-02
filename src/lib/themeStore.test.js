import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createThemeStore } from './themeStore.js';

function dependencies({ systemDark = false, savedTheme = null } = {}) {
  const classList = { toggle: vi.fn() };
  const storage = {
    getItem: vi.fn(() => savedTheme),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const mediaQuery = {
    matches: systemDark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  return {
    classList,
    mediaQuery,
    storage,
    options: {
      documentObject: { documentElement: { classList } },
      windowObject: { matchMedia: vi.fn(() => mediaQuery) },
      storage,
      appWindow: null,
    },
  };
}

describe('theme store', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('initializes from a saved preference', async () => {
    const { options, classList } = dependencies({ savedTheme: 'dark' });
    const store = createThemeStore(options);

    await store.init();

    expect(get(store)).toBe('dark');
    expect(classList.toggle).toHaveBeenCalledWith('dark', true);
  });

  it('toggles and persists the next theme', async () => {
    const { options, storage } = dependencies();
    const store = createThemeStore(options);
    await store.init();

    await expect(store.toggle()).resolves.toBe('dark');

    expect(get(store)).toBe('dark');
    expect(storage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('resets to the current system preference', async () => {
    const { options, storage } = dependencies({ systemDark: true, savedTheme: 'light' });
    const store = createThemeStore(options);
    await store.init();

    await expect(store.resetToSystem()).resolves.toBe('dark');

    expect(get(store)).toBe('dark');
    expect(storage.removeItem).toHaveBeenCalledWith('theme');
  });
});
