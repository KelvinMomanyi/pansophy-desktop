import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Diagnostics from './Diagnostics.svelte';
import { AppError } from '../lib/errors.js';

afterEach(cleanup);
const ready = {
  appVersion: '0.1.0',
  ollama: { available: true, modelCount: 2, latencyMs: 12, error: null },
  ocr: { sidecarPresent: true, languageDataPresent: true },
  logDirectory: 'local/logs',
};

describe('diagnostics panel', () => {
  it('loads on demand, displays independent service checks, and refreshes', async () => {
    const load = vi.fn().mockResolvedValue(ready);
    render(Diagnostics, { load });
    expect(load).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
    await screen.findByText('Ollama: Connected');
    expect(screen.getByText('Models installed: 2')).toBeInTheDocument();
    expect(screen.getByText('Tesseract: Found')).toBeInTheDocument();
    expect(screen.getByText('Logs: local/logs')).toBeInTheDocument();
    load.mockResolvedValue({
      ...ready,
      ollama: { ...ready.ollama, available: false, modelCount: 0 },
      ocr: { sidecarPresent: false, languageDataPresent: false },
      logDirectory: null,
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh diagnostics' }));
    await screen.findByText('Ollama: Unavailable');
    expect(screen.getByText('Tesseract: Missing')).toBeInTheDocument();
    expect(screen.getByText('English OCR data: Missing')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
    expect(screen.queryByRole('region', { name: 'Service diagnostics' })).not.toBeInTheDocument();
  });

  it('prevents duplicate requests while a check is pending', async () => {
    /** @type {(report: typeof ready) => void} */
    let finish = () => {
      throw new Error('Diagnostics request did not start');
    };
    const load = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(Diagnostics, { load });
    await fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
    expect(screen.getByRole('button', { name: 'Refresh diagnostics' })).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
    expect(load).toHaveBeenCalledOnce();
    finish(ready);
    await screen.findByText('Ollama: Connected');
  });

  it('shows recoverable errors and allows another check', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new AppError('DESKTOP_REQUIRED', 'Open the desktop app.'))
      .mockResolvedValue(ready);
    render(Diagnostics, { load });
    await fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Open the desktop app.');
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh diagnostics' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await screen.findByText('Ollama: Connected');
  });
});
