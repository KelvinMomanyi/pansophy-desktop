import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Chat from './Chat.svelte';

const mocks = vi.hoisted(() => ({
  addFile: vi.fn(),
  copyText: vi.fn(),
  invoke: vi.fn(),
  isPermissionGranted: vi.fn(),
  loggerError: vi.fn(),
  pullModel: vi.fn(),
  removeFile: vi.fn(),
  sendNotification: vi.fn(),
  streamChat: vi.fn(),
  userMessage: vi.fn(),
  webSearch: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: mocks.isPermissionGranted,
  requestPermission: vi.fn(),
  sendNotification: mocks.sendNotification,
}));
vi.mock('../lib/chatApi.js', () => ({
  pullModel: mocks.pullModel,
  streamChat: mocks.streamChat,
}));
vi.mock('../lib/errors.js', () => ({ userMessage: mocks.userMessage }));
vi.mock('../lib/logger.js', () => ({
  logger: { error: mocks.loggerError, warn: vi.fn() },
}));
vi.mock('../lib/ocr.js', () => ({
  addFile: mocks.addFile,
  copyText: mocks.copyText,
  removeFile: mocks.removeFile,
}));
vi.mock('../lib/search.js', () => ({ webSearch: mocks.webSearch }));

describe('Chat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isPermissionGranted.mockResolvedValue(true);
    mocks.removeFile.mockReturnValue({ currentFile: null, extractedText: '', error: null });
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
  it('streams partial output, blocks duplicate sends, and restores the composer', async () => {
    const response = Promise.withResolvers();
    mocks.streamChat.mockReturnValueOnce(response.promise);
    render(Chat);
    const prompt = screen.getByLabelText('Ask Pansophy');
    const send = screen.getByRole('button', { name: 'Send message' });

    await fireEvent.input(prompt, { target: { value: '  Explain streaming  ' } });
    await fireEvent.click(send);
    expect(prompt).toHaveValue('');
    expect(send).toBeDisabled();
    expect(screen.getByText('Explain streaming')).toBeInTheDocument();

    mocks.streamChat.mock.calls[0][0].onToken('partial', 'A partial answer');
    expect(await screen.findByText('A partial answer')).toBeInTheDocument();
    await fireEvent.input(prompt, { target: { value: 'Next question' } });
    await fireEvent.keyDown(prompt, { key: 'Enter' });
    expect(mocks.streamChat).toHaveBeenCalledOnce();

    response.resolve('A complete answer');
    const answer = await screen.findByText('A complete answer');
    expect(answer.closest('section')).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByText('A partial answer')).not.toBeInTheDocument();
    expect(send).toBeEnabled();
    expect(prompt).toHaveValue('Next question');
  });

  it('ignores blank prompts and Shift+Enter, and submits on Enter', async () => {
    mocks.streamChat.mockResolvedValue('Keyboard answer');
    render(Chat);
    const prompt = screen.getByLabelText('Ask Pansophy');

    await fireEvent.input(prompt, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    await fireEvent.keyDown(prompt, { key: 'Enter' });
    expect(mocks.streamChat).not.toHaveBeenCalled();

    await fireEvent.input(prompt, { target: { value: 'Keyboard question' } });
    await fireEvent.keyDown(prompt, { key: 'Enter', shiftKey: true });
    expect(mocks.streamChat).not.toHaveBeenCalled();
    await fireEvent.keyDown(prompt, { key: 'Enter' });
    expect(await screen.findByText('Keyboard answer')).toBeInTheDocument();
    expect(mocks.streamChat).toHaveBeenCalledOnce();
  });

  it('clears the error and accepts a new prompt after a failed request', async () => {
    mocks.streamChat.mockRejectedValueOnce(new Error('Request failed'));
    mocks.streamChat.mockResolvedValueOnce('Recovered answer');
    render(Chat);
    const prompt = screen.getByLabelText('Ask Pansophy');
    const send = screen.getByRole('button', { name: 'Send message' });

    await fireEvent.input(prompt, { target: { value: 'First attempt' } });
    await fireEvent.click(send);
    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed');

    await fireEvent.input(prompt, { target: { value: 'Try again' } });
    await fireEvent.click(send);
    expect(await screen.findByText('Recovered answer')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.streamChat).toHaveBeenCalledTimes(2);
  });

  it('downloads the deep-thinking model with progress and then uses it', async () => {
    const download = Promise.withResolvers();
    mocks.pullModel.mockReturnValueOnce(download.promise);
    mocks.invoke.mockResolvedValueOnce({}).mockResolvedValueOnce({ 'deepseek-r1:7b': {} });
    mocks.streamChat.mockResolvedValue('A considered answer');
    render(Chat);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('health_check'));

    await fireEvent.input(screen.getByLabelText('Ask Pansophy'), {
      target: { value: 'Consider this carefully' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Deep thinking' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Enable deep thinking?');
    expect(mocks.streamChat).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(mocks.pullModel).toHaveBeenCalledWith({
      model: 'deepseek-r1:7b',
      onProgress: expect.any(Function),
    });
    mocks.pullModel.mock.calls[0][0].onProgress({
      total: 100,
      completed: 40,
      status: 'Downloading model',
    });
    expect(await screen.findByRole('progressbar')).toHaveAttribute('value', '40');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    download.resolve(undefined);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled());
    expect(mocks.sendNotification).toHaveBeenCalledWith({
      title: 'Deep-thinking setup complete',
      body: 'The deep-thinking model is ready.',
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Deep thinking' }));
    expect(await screen.findByText('A considered answer')).toBeInTheDocument();
    expect(mocks.streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'deepseek-r1:7b',
        think: true,
        messages: [{ role: 'user', content: 'Consider this carefully' }],
      }),
    );
  });

  it('shows research sources and clears them when starting a new conversation', async () => {
    mocks.webSearch.mockResolvedValue({
      summary: 'Research summary',
      sources: [
        {
          title: 'Research source',
          link: 'https://example.com/research',
          domain: 'example.com',
          description: 'Supporting evidence',
        },
      ],
    });
    render(Chat);

    await fireEvent.input(screen.getByLabelText('Ask Pansophy'), {
      target: { value: '  Local inference  ' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Search web' }));
    expect(await screen.findByText('Research summary')).toBeInTheDocument();
    expect(mocks.webSearch).toHaveBeenCalledWith('Local inference', { model: 'mistral:7b' });
    expect(screen.getByRole('link', { name: 'Research source' })).toHaveAttribute(
      'href',
      'https://example.com/research',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Close sources' }));
    expect(screen.queryByRole('link', { name: 'Research source' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Sources (1)' }));
    expect(screen.getByText('Supporting evidence')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    expect(screen.queryByText('Research summary')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Research source' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sources (0)' })).toBeInTheDocument();
  });

  it('displays extracted file text and supports copying and removing it', async () => {
    mocks.addFile.mockResolvedValue({
      currentFile: { name: 'scan.png' },
      extractedText: 'Extracted notes',
    });
    render(Chat);

    await fireEvent.click(screen.getByRole('button', { name: 'Extract text from a file' }));
    expect(await screen.findByText('scan.png')).toBeInTheDocument();
    expect(screen.getByText('Extracted notes')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(mocks.copyText).toHaveBeenCalledWith('Extracted notes');
    await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(mocks.removeFile).toHaveBeenCalledOnce();
    expect(screen.queryByText('scan.png')).not.toBeInTheDocument();
    expect(screen.queryByText('Extracted notes')).not.toBeInTheDocument();
  });
});
