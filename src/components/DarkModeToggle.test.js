import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { beforeEach, expect, it } from 'vitest';

import { theme } from '../lib/themeStore.js';
import DarkModeToggle from './DarkModeToggle.svelte';

beforeEach(async () => {
  localStorage.clear();
  await theme.resetToSystem();
});

it('flips the theme store when the switch is clicked', async () => {
  localStorage.setItem('theme', 'light');
  render(DarkModeToggle);
  const toggle = screen.getByRole('switch', { name: 'Dark mode' });

  expect(get(theme)).toBe('light');
  await fireEvent.click(toggle);

  expect(get(theme)).toBe('dark');
  expect(toggle).toHaveAttribute('aria-checked', 'true');
});
