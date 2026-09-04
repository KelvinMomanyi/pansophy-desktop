import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Chat from './Chat.svelte';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  loggerError: vi.fn(),
  streamChat: vi.fn(),
  userMessage: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));
vi.mock('../lib/chatApi.js', () => ({
  pullModel: vi.fn(),
  streamChat: mocks.streamChat,
}));
vi.mock('../lib/errors.js', () => ({ userMessage: mocks.userMessage }));
vi.mock('../lib/logger.js', () => ({
  logger: { error: mocks.loggerError, warn: vi.fn() },
}));
vi.mock('../lib/ocr.js', () => ({
  addFile: vi.fn(),
  copyText: vi.fn(),
  removeFile: vi.fn(),
}));
vi.mock('../lib/search.js', () => ({ webSearch: vi.fn() }));

describe('Chat', () => {
  beforeEach(() => {
    mocks.invoke.mockResolvedValue({});
    mocks.userMessage.mockImplementation((error) => error.message);
  });

  afterEach(() => {
    cleanup();
  });

  it('appends the user prompt and assistant response', async () => {
    mocks.streamChat.mockResolvedValue('A local answer');
    render(Chat);

    await fireEvent.input(screen.getByLabelText('Ask Pansophy'), {
      target: { value: 'Explain local inference' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Explain local inference')).toBeInTheDocument();
    expect(await screen.findByText('A local answer')).toBeInTheDocument();
    expect(mocks.streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mistral:7b',
        messages: [{ role: 'user', content: 'Explain local inference' }],
        think: false,
        onToken: expect.any(Function),
      }),
    );
  });

  it('maps request failures to a user-facing error', async () => {
    const requestError = new Error('connection refused');
    mocks.streamChat.mockRejectedValue(requestError);
    mocks.userMessage.mockReturnValue('The local model is unavailable.');
    render(Chat);

    await fireEvent.input(screen.getByLabelText('Ask Pansophy'), {
      target: { value: 'Are you there?' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(mocks.userMessage).toHaveBeenCalledWith(requestError));
    expect(await screen.findByRole('alert')).toHaveTextContent('The local model is unavailable.');
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'chat.send_failed',
      { deepThink: false },
      requestError,
    );
  });
});
