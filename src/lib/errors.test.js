import { describe, expect, it } from 'vitest';

import { AppError, toAppError, userMessage } from './errors.js';

describe('AppError', () => {
  it('retains structured error metadata', () => {
    const cause = new Error('connection refused');
    const error = new AppError('NETWORK_ERROR', 'Service unavailable', {
      cause,
      status: 503,
      retryable: true,
      details: { service: 'ollama' },
    });

    expect(error).toMatchObject({
      name: 'AppError',
      code: 'NETWORK_ERROR',
      message: 'Service unavailable',
      cause,
      status: 503,
      retryable: true,
      details: { service: 'ollama' },
    });
  });
});

describe('toAppError', () => {
  it('does not wrap an existing AppError', () => {
    const error = new AppError('INVALID_RESPONSE', 'Malformed response');

    expect(toAppError(error)).toBe(error);
  });

  it('normalizes native errors while retaining the cause', () => {
    const cause = new TypeError('fetch failed');

    expect(toAppError(cause, 'NETWORK_ERROR')).toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'fetch failed',
      cause,
      retryable: false,
      details: {},
    });
  });

  it('normalizes non-error values into readable messages', () => {
    expect(toAppError({ reason: 'offline' }, 'NETWORK_ERROR')).toMatchObject({
      code: 'NETWORK_ERROR',
      message: '[object Object]',
    });
  });
});

describe('userMessage', () => {
  it('maps internal error codes to actionable messages', () => {
    expect(userMessage(new AppError('NETWORK_ERROR', 'socket failed'))).toContain(
      'local AI service',
    );
    expect(userMessage(new AppError('INVALID_RESPONSE', 'bad JSON'))).toContain('invalid response');
  });

  it('keeps safe messages for unrecognized errors', () => {
    expect(userMessage(new Error('Please retry later.'))).toBe('Please retry later.');
  });
});
