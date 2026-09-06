import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadDiagnostics } from './diagnostics.js';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

const report = {
  appVersion: '0.1.0',
  ollama: { available: true, modelCount: 0, latencyMs: 2, error: null },
  ocr: { sidecarPresent: false, languageDataPresent: false },
  logDirectory: null,
};

describe('diagnostics boundary', () => {
  it('explains browser-only limitations without invoking Tauri', async () => {
    await expect(loadDiagnostics()).rejects.toMatchObject({ code: 'DESKTOP_REQUIRED' });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('loads the native report and rejects malformed responses', async () => {
    vi.stubGlobal('__TAURI_INTERNALS__', {});
    mocks.invoke.mockResolvedValueOnce(report);
    await expect(loadDiagnostics()).resolves.toEqual(report);
    expect(mocks.invoke).toHaveBeenCalledWith('get_diagnostics');
    for (const value of [
      null,
      {},
      { ...report, ollama: {} },
      { ...report, ocr: {} },
      { ...report, logDirectory: 3 },
    ]) {
      mocks.invoke.mockResolvedValueOnce(value);
      await expect(loadDiagnostics()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
  });
});
