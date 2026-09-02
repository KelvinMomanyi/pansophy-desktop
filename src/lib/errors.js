export class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{ cause?: unknown, status?: number, retryable?: boolean, details?: Record<string, unknown> }} [options]
   */
  constructor(code, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
  }
}

/**
 * Normalize unknown failures before they cross an application boundary.
 * @param {unknown} error
 * @param {string} [fallbackCode]
 * @returns {AppError}
 */
export function toAppError(error, fallbackCode = 'UNEXPECTED_ERROR') {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(fallbackCode, error.message, { cause: error });
  }
  return new AppError(fallbackCode, String(error));
}

/** @param {unknown} error */
export function userMessage(error) {
  const appError = toAppError(error);
  if (appError.code === 'NETWORK_ERROR') {
    return 'Pansophy could not reach the local AI service. Check that Ollama is running.';
  }
  if (appError.code === 'INVALID_RESPONSE') {
    return 'The local AI service returned an invalid response.';
  }
  return appError.message || 'Something went wrong. Please try again.';
}
