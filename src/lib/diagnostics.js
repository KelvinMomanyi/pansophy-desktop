import { invoke } from '@tauri-apps/api/core';

import { AppError } from './errors.js';

/**
 * @typedef {{
 * appVersion: string,
 * ollama: { available: boolean, modelCount: number, latencyMs: number, error: {code: string, message: string} | null },
 * ocr: { sidecarPresent: boolean, languageDataPresent: boolean },
 * logDirectory: string | null
 * }} Diagnostics
 */

/** @returns {Promise<Diagnostics>} */
export async function loadDiagnostics() {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    throw new AppError('DESKTOP_REQUIRED', 'Open the desktop app to check local services.');
  }
  const report = /** @type {Diagnostics} */ (await invoke('get_diagnostics'));
  if (
    !report ||
    typeof report.appVersion !== 'string' ||
    typeof report.ollama?.available !== 'boolean' ||
    !Number.isFinite(report.ollama.modelCount) ||
    report.ollama.modelCount < 0 ||
    !Number.isFinite(report.ollama.latencyMs) ||
    report.ollama.latencyMs < 0 ||
    typeof report.ocr?.sidecarPresent !== 'boolean' ||
    typeof report.ocr.languageDataPresent !== 'boolean' ||
    !(report.logDirectory === null || typeof report.logDirectory === 'string')
  ) {
    throw new AppError(
      'INVALID_RESPONSE',
      'The desktop app returned an invalid diagnostics report.',
    );
  }
  return report;
}
