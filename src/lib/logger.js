import { invoke } from '@tauri-apps/api/core';

/** @param {unknown} error */
function errorFields(error) {
  if (!(error instanceof Error)) return { message: String(error) };
  return {
    name: error.name,
    message: error.message,
    ...(error.stack ? { stack: error.stack } : {}),
    ...('code' in error ? { code: error.code } : {}),
  };
}

async function desktopSink(entry) {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    await invoke('write_log_line', { entry });
  }
}

/**
 * @param {{
 *   output?: Pick<Console, 'info' | 'warn' | 'error'>,
 *   sink?: ((entry: Record<string, unknown>) => unknown) | null
 * }} [options]
 */
export function createLogger({ output = console, sink = desktopSink } = {}) {
  /** @param {'info' | 'warn' | 'error'} level */
  async function write(level, event, context = {}, error = undefined) {
    const entry = {
      ...context,
      timestamp: new Date().toISOString(),
      level,
      event,
      ...(error === undefined ? {} : { error: errorFields(error) }),
    };
    output[level](entry);
    if (!sink) return;
    try {
      await sink(entry);
    } catch {
      // Report a sink failure only to the console, so persistence cannot recurse.
      output.warn({
        timestamp: new Date().toISOString(),
        level: 'warn',
        event: 'logging.persistence_failed',
      });
    }
  }

  return {
    info: (event, context = {}) => write('info', event, context),
    warn: (event, context = {}, error = undefined) => write('warn', event, context, error),
    error: (event, context = {}, error = undefined) => write('error', event, context, error),
  };
}

export const logger = createLogger();
