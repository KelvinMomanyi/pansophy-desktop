import { describe, expect, it, vi } from 'vitest';

import { AppError } from './errors.js';
import { pullModel, resolveApiBaseUrl, streamChat } from './chatApi.js';

function streamResponse(chunks, status = 200) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
    { status },
  );
}

describe('chat API', () => {
  it('accepts HTTP only for loopback URLs', () => {
    expect(resolveApiBaseUrl('http://localhost:11500/')).toBe('http://localhost:11500');
    expect(() => resolveApiBaseUrl('http://example.com')).toThrow(AppError);
    expect(resolveApiBaseUrl('https://ai.example.com')).toBe('https://ai.example.com');
  });

  it('parses tokens split across arbitrary network chunks', async () => {
    const fetchImpl = vi.fn(async () =>
      streamResponse(['{"message":{"content":"hel', 'lo"}}\n{"message":{"content":"!"}}\n']),
    );
    const onToken = vi.fn();

    const content = await streamChat({
      model: 'mistral:7b',
      messages: [{ role: 'user', content: 'Say hello' }],
      fetchImpl,
      onToken,
    });

    expect(content).toBe('hello!');
    expect(onToken).toHaveBeenLastCalledWith('!', 'hello!');
  });

  it('rejects malformed stream payloads', async () => {
    await expect(
      streamChat({
        model: 'mistral:7b',
        messages: [{ role: 'user', content: 'Hello' }],
        fetchImpl: async () => streamResponse(['not-json\n']),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('reports validated model download progress', async () => {
    const onProgress = vi.fn();
    await pullModel({
      model: 'deepseek-r1:7b',
      fetchImpl: async () => streamResponse(['{"status":"pulling","total":100,"completed":25}\n']),
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith({
      status: 'pulling',
      total: 100,
      completed: 25,
    });
  });
});
