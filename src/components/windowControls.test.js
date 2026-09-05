import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WindowControls from './windowControls.svelte';

const mocks = vi.hoisted(() => ({
  getCurrentWindow: vi.fn(),
  close: vi.fn(),
  minimize: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: mocks.getCurrentWindow }));
vi.mock('../lib/logger.js', () => ({ logger: { info: mocks.info, error: mocks.error } }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.close.mockResolvedValue(undefined);
  mocks.minimize.mockResolvedValue(undefined);
  mocks.getCurrentWindow.mockReturnValue({ close: mocks.close, minimize: mocks.minimize });
});
afterEach(cleanup);

describe('window controls', () => {
  it.each([
    ['Close window', 'close'],
    ['Minimize window', 'minimize'],
  ])('invokes the native action for %s', async (label, action) => {
    render(WindowControls);
    const button = screen.getByRole('button', { name: label });
    await waitFor(() => expect(button).toBeEnabled());
    await fireEvent.click(button);

    expect(mocks.getCurrentWindow).toHaveBeenCalledOnce();
    expect(mocks[action]).toHaveBeenCalledOnce();
    expect(mocks.info).toHaveBeenCalledWith('window.initialized');
  });

  it.each([
    ['Close window', 'close', 'window.close_failed'],
    ['Minimize window', 'minimize', 'window.minimize_failed'],
  ])('reports a rejected %s action and allows retrying', async (label, action, event) => {
    const failure = new Error('Native window unavailable');
    mocks[action].mockRejectedValueOnce(failure);
    render(WindowControls);
    const button = screen.getByRole('button', { name: label });
    await waitFor(() => expect(button).toBeEnabled());
    await fireEvent.click(button);

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(event, {}, failure));
    await fireEvent.click(button);
    expect(mocks[action]).toHaveBeenCalledTimes(2);
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it('keeps controls disabled when the native window cannot initialize', async () => {
    const failure = new Error('Browser-only runtime');
    mocks.getCurrentWindow.mockImplementation(() => {
      throw failure;
    });
    render(WindowControls);

    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith('window.initialize_failed', {}, failure),
    );
    expect(screen.getByRole('button', { name: 'Close window' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Minimize window' })).toBeDisabled();
    expect(mocks.close).not.toHaveBeenCalled();
    expect(mocks.minimize).not.toHaveBeenCalled();
  });
});
