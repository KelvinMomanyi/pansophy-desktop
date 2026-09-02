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

function write(level, event, context = {}, error) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
    ...(error === undefined ? {} : { error: errorFields(error) }),
  };

  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (event, context) => write('info', event, context),
  warn: (event, context, error) => write('warn', event, context, error),
  error: (event, context, error) => write('error', event, context, error),
};
