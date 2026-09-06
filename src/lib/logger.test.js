import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogger, logger } from './logger.js';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));

describe('logger', () => {
  beforeEach(() => {
    mocks.invoke.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T12:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('writes structured info events with context', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.info('ocr.completed', { fileName: 'notes.pdf' });

    expect(info).toHaveBeenCalledWith({
      timestamp: '2026-09-03T12:30:00.000Z',
      level: 'info',
      event: 'ocr.completed',
      fileName: 'notes.pdf',
    });
  });

  it('serializes error details without losing event context', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('request failed'), { code: 'NETWORK_ERROR' });

    logger.error('chat.send_failed', { model: 'mistral:7b' }, error);

    expect(output).toHaveBeenCalledWith({
      timestamp: '2026-09-03T12:30:00.000Z',
      level: 'error',
      event: 'chat.send_failed',
      model: 'mistral:7b',
      error: expect.objectContaining({
        name: 'Error',
        message: 'request failed',
        code: 'NETWORK_ERROR',
        stack: expect.any(String),
      }),
    });
  });

  it('normalizes non-error warning values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.warn('chat.health_check_failed', {}, 'offline');

    expect(warn).toHaveBeenCalledWith({
      timestamp: '2026-09-03T12:30:00.000Z',
      level: 'warn',
      event: 'chat.health_check_failed',
      error: { message: 'offline' },
    });
  });
  it('forwards desktop events to the native logging command', async () => {
    vi.stubGlobal('__TAURI_INTERNALS__', {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    await logger.info('ocr.completed', { model: 'mistral:7b' });
    expect(mocks.invoke).toHaveBeenCalledWith('write_log_line', {
      entry: expect.objectContaining({
        level: 'info',
        event: 'ocr.completed',
        model: 'mistral:7b',
      }),
    });
  });

  it('keeps browser-only logging independent of Tauri', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    await logger.info('browser.ready');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('supports a disabled sink and protects reserved event fields', async () => {
    const output = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const log = createLogger({ output, sink: null });
    await log.info('trusted.event', { event: 'spoofed', level: 'error', timestamp: 'fake' });
    expect(output.info).toHaveBeenCalledWith({
      event: 'trusted.event',
      level: 'info',
      timestamp: '2026-09-03T12:30:00.000Z',
    });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it.each(['throw', 'reject'])(
    'contains a sink failure (%s) without recursion',
    async (failure) => {
      const output = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const sink = vi.fn(() => {
        if (failure === 'throw') throw new Error('Disk unavailable');
        return Promise.reject(new Error('Disk unavailable'));
      });
      const log = createLogger({ output, sink });
      await expect(
        log.error('operation.failed', {}, new Error('Failure')),
      ).resolves.toBeUndefined();
      expect(sink).toHaveBeenCalledOnce();
      expect(output.error).toHaveBeenCalledOnce();
      expect(output.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'logging.persistence_failed' }),
      );
    },
  );
});
