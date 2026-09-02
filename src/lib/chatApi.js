import { AppError, toAppError } from './errors.js';
import { logger } from './logger.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:11500';
const DEFAULT_TIMEOUT_MS = 120_000;
const MODEL_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/;
const VALID_ROLES = new Set(['assistant', 'system', 'user']);

export function resolveApiBaseUrl(value = import.meta.env.VITE_OLLAMA_API_URL) {
  let parsed;
  try {
    parsed = new URL(value || DEFAULT_BASE_URL);
  } catch (error) {
    throw new AppError('INVALID_CONFIG', 'VITE_OLLAMA_API_URL must be a valid URL.', {
      cause: error,
    });
  }

  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
    throw new AppError(
      'INVALID_CONFIG',
      'The AI service URL must use HTTPS, except for a loopback address.',
    );
  }
  return parsed.toString().replace(/\/$/, '');
}

function validateModel(model) {
  if (typeof model !== 'string' || !MODEL_PATTERN.test(model)) {
    throw new AppError('INVALID_REQUEST', 'A valid model name is required.');
  }
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
    throw new AppError('INVALID_REQUEST', 'Between 1 and 100 chat messages are required.');
  }
  for (const message of messages) {
    if (
      !message ||
      !VALID_ROLES.has(message.role) ||
      typeof message.content !== 'string' ||
      message.content.trim().length === 0 ||
      message.content.length > 100_000
    ) {
      throw new AppError('INVALID_REQUEST', 'A chat message has an invalid role or content.');
    }
  }
}

async function consumeNdjson(response, onValue) {
  if (!response.body) {
    throw new AppError('INVALID_RESPONSE', 'The AI service returned an empty response.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseLine = (line) => {
    if (!line.trim()) return;
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new AppError('INVALID_RESPONSE', 'The AI service returned malformed JSON.', {
        cause: error,
        details: { line: line.slice(0, 200) },
      });
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new AppError('INVALID_RESPONSE', 'The AI service returned an invalid payload.');
    }
    onValue(value);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    lines.forEach(parseLine);
    if (done) break;
  }
  parseLine(buffer);
}

async function postStream(path, payload, options, onValue) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new AppError('INVALID_CONFIG', 'No Fetch implementation is available.');
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);

  try {
    const response = await fetchImpl(resolveApiBaseUrl(options.baseUrl) + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new AppError('API_ERROR', 'The AI service returned HTTP ' + response.status + '.', {
        status: response.status,
        retryable: response.status >= 500,
      });
    }
    await consumeNdjson(response, onValue);
  } catch (error) {
    if (error instanceof AppError) throw error;
    const appError = controller.signal.aborted
      ? new AppError('REQUEST_TIMEOUT', 'The AI service request was cancelled or timed out.', {
          cause: error,
          retryable: true,
        })
      : new AppError('NETWORK_ERROR', 'Could not reach the local AI service.', {
          cause: error,
          retryable: true,
        });
    logger.error('ollama.request_failed', { path }, appError);
    throw appError;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function streamChat({
  model,
  messages,
  think = false,
  onToken = /** @type {(token: string, content: string) => void} */ (() => {}),
  ...options
}) {
  validateModel(model);
  validateMessages(messages);
  let content = '';

  await postStream(
    '/api/chat',
    { model, messages, stream: true, think: Boolean(think) },
    options,
    (value) => {
      if (value.error) {
        throw new AppError('API_ERROR', String(value.error));
      }
      const token = value.message?.content;
      if (token !== undefined && typeof token !== 'string') {
        throw new AppError('INVALID_RESPONSE', 'A chat token was not text.');
      }
      if (token) {
        content += token;
        onToken(token, content);
      }
    },
  );
  return content;
}

export async function pullModel({
  model,
  onProgress = /** @type {(progress: { total: number, completed: number, status: string }) => void} */ (
    () => {}
  ),
  ...options
}) {
  validateModel(model);
  await postStream('/api/pull', { model, stream: true }, options, (value) => {
    if (value.error) throw new AppError('API_ERROR', String(value.error));
    const total = typeof value.total === 'number' ? value.total : 0;
    const completed = typeof value.completed === 'number' ? value.completed : 0;
    const status = typeof value.status === 'string' ? value.status : '';
    onProgress({ total, completed, status });
  });
}

export function normalizeChatError(error) {
  return toAppError(error, 'CHAT_ERROR');
}
