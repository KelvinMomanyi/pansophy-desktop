import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger.js';

describe('logger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T12:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
});
