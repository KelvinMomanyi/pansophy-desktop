<script>
  import { faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
  import { invoke } from '@tauri-apps/api/core';
  import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
  } from '@tauri-apps/plugin-notification';
  import { onMount } from 'svelte';
  import Fa from 'svelte-fa';

  import logo from '../assets/Logo.png';
  import bot from '../assets/BotIt.png';
  import DarkModeToggle from '../components/DarkModeToggle.svelte';
  import { pullModel, streamChat } from '../lib/chatApi.js';
  import { userMessage } from '../lib/errors.js';
  import { logger } from '../lib/logger.js';
  import { addFile, copyText, removeFile } from '../lib/ocr.js';
  import { webSearch } from '../lib/search.js';

  const deepThinkModel = 'deepseek-r1:7b';
  const defaultModel = 'mistral:7b';

  let answers = [];
  let appStatus = {};
  let currentFile = null;
  let deepThinking = false;
  let error = null;
  let extractedText = '';
  let isDownloadModalOpen = false;
  let isProcessing = false;
  let loading = false;
  let modelData = { size: 0, completed: 0 };
  let modelDownloadStatus = '';
  let newContent = '';
  let prompt = '';
  let sources = [];
  let sourcesOpen = false;

  const sendPrompt = async (allowDeepThink = false) => {
    const content = prompt.trim();
    if (loading || !content) return;

    loading = true;
    deepThinking = allowDeepThink;
    error = null;
    prompt = '';
    newContent = '';
    answers = [...answers, { role: 'user', content }];

    try {
      const responseContent = await streamChat({
        model: allowDeepThink ? deepThinkModel : defaultModel,
        messages: [{ role: 'user', content }],
        think: allowDeepThink,
        onToken: (_token, completeContent) => {
          newContent = completeContent;
        },
      });
      answers = [...answers, { role: 'assistant', content: responseContent }];
    } catch (requestError) {
      const message = userMessage(requestError);
      error = message;
      answers = [...answers, { role: 'system', content: message, isError: true }];
      logger.error('chat.send_failed', { deepThink: allowDeepThink }, requestError);
    } finally {
      loading = false;
      deepThinking = false;
      newContent = '';
    }
  };

  const sendDeepThinkPrompt = async () => {
    if (!Reflect.has(appStatus, deepThinkModel)) {
      isDownloadModalOpen = true;
      return;
    }
    await sendPrompt(true);
  };

  const downloadDeepthinkModel = async () => {
    loading = true;
    error = null;
    try {
      await pullModel({
        model: deepThinkModel,
        onProgress: ({ total, completed, status }) => {
          modelData = { size: total, completed };
          modelDownloadStatus = status;
        },
      });

      modelData = { completed: 0, size: 0 };
      modelDownloadStatus = '';
      isDownloadModalOpen = false;
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) permissionGranted = (await requestPermission()) === 'granted';
      if (permissionGranted) {
        sendNotification({
          title: 'Deep-thinking setup complete',
          body: 'The deep-thinking model is ready.',
        });
      }
      appStatus = await invoke('health_check');
    } catch (downloadError) {
      error = userMessage(downloadError);
      logger.error('chat.model_download_failed', { model: deepThinkModel }, downloadError);
    } finally {
      loading = false;
    }
  };

  const handleAddFile = async () => {
    error = null;
    extractedText = '';
    isProcessing = true;
    try {
      const result = await addFile({
        onSelected: (file) => {
          currentFile = file;
        },
      });
      if (result) {
        currentFile = result.currentFile;
        extractedText = result.extractedText;
      }
    } catch (processingError) {
      error = userMessage(processingError);
    } finally {
      isProcessing = false;
    }
  };

  const handleRemoveFile = () => {
    const cleared = removeFile();
    currentFile = cleared.currentFile;
    extractedText = cleared.extractedText;
    error = cleared.error;
  };

  const handleCopyText = async () => {
    try {
      await copyText(extractedText);
    } catch (clipboardError) {
      error = userMessage(clipboardError);
    }
  };

  const handleWebSearch = async () => {
    const query = prompt.trim();
    if (loading || !query) return;

    loading = true;
    error = null;
    prompt = '';
    answers = [...answers, { role: 'user', content: 'Search: ' + query }];

    try {
      const result = await webSearch(query, { model: defaultModel });
      sources = result.sources;
      sourcesOpen = true;
      if (sources.length === 0) {
        answers = [...answers, { role: 'system', content: 'No search results were found.' }];
        return;
      }
      answers = [...answers, { role: 'assistant', content: result.summary }];
    } catch (searchError) {
      const message = userMessage(searchError);
      error = message;
      answers = [...answers, { role: 'system', content: message, isError: true }];
      logger.error('search.failed', { query }, searchError);
    } finally {
      loading = false;
    }
  };

  const handlePromptKeydown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendPrompt();
    }
  };

  onMount(() => {
    invoke('health_check')
      .then((status) => {
        appStatus = status;
      })
      .catch((healthError) => {
        logger.warn('chat.health_check_failed', {}, healthError);
      });
  });
</script>

<div class="flex h-full w-full overflow-hidden pt-10 text-white">
  <aside class="flex w-64 shrink-0 flex-col gap-5 border-r border-white/10 bg-black/15 p-5">
    <div class="flex items-center gap-3">
      <img class="h-10 w-10 rounded-full bg-blue-600 p-1" src={logo} alt="" />
      <div>
        <h1 class="font-poppins text-lg font-semibold">Pansophy</h1>
        <p class="text-xs text-white/55">Local research assistant</p>
      </div>
    </div>

    <button
      type="button"
      class="rounded-xl bg-blue-600 px-4 py-3 text-left text-sm font-medium hover:bg-blue-500"
      on:click={() => {
        answers = [];
        error = null;
        sources = [];
      }}
    >
      New conversation
    </button>

    <div class="mt-auto">
      <DarkModeToggle />
    </div>
  </aside>

  <main class="flex min-w-0 flex-1 flex-col">
    <header class="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div>
        <h2 class="font-poppins text-lg font-semibold">Research chat</h2>
        <p class="text-xs text-white/50">Responses stay on your machine</p>
      </div>
      <button
        type="button"
        class="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        on:click={() => (sourcesOpen = !sourcesOpen)}
        aria-expanded={sourcesOpen}
      >
        Sources ({sources.length})
      </button>
    </header>

    <section
      class="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
      aria-live="polite"
      aria-busy={loading}
    >
      {#if answers.length === 0}
        <div class="m-auto max-w-lg text-center">
          <img class="mx-auto mb-5 h-24 w-24 object-contain" src={bot} alt="" />
          <h2 class="font-poppins text-2xl font-semibold">What would you like to explore?</h2>
          <p class="mt-2 text-sm text-white/55">
            Chat with a local model, search the web, or extract text from an image or PDF.
          </p>
        </div>
      {/if}

      {#each answers as answer, index (index)}
        <article
          class:ml-auto={answer.role === 'user'}
          class:bg-blue-600={answer.role === 'user'}
          class:border-red-400={answer.isError}
          class="max-w-[80%] whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-sm leading-6"
        >
          {answer.content}
        </article>
      {/each}

      {#if loading}
        <article class="max-w-[80%] rounded-2xl border border-white/10 bg-black/35 px-5 py-4">
          <div class="mb-2 flex items-center gap-2 text-xs text-white/50">
            <span class="h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
            {deepThinking ? 'Deep thinking' : 'Working'}
          </div>
          {#if newContent}
            <p class="whitespace-pre-wrap text-sm leading-6">{newContent}</p>
          {/if}
        </article>
      {/if}

      {#if currentFile}
        <article class="rounded-2xl border border-white/10 bg-black/35 p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-medium">{currentFile.name}</p>
              <p class="text-xs text-white/50">
                {isProcessing ? 'Extracting text…' : 'Text extraction complete'}
              </p>
            </div>
            <div class="flex gap-2">
              {#if extractedText}
                <button
                  type="button"
                  class="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
                  on:click={handleCopyText}>Copy</button
                >
              {/if}
              <button
                type="button"
                class="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
                on:click={handleRemoveFile}>Remove</button
              >
            </div>
          </div>
          {#if extractedText}
            <p class="mt-4 max-h-52 overflow-y-auto whitespace-pre-wrap text-sm text-white/75">
              {extractedText}
            </p>
          {/if}
        </article>
      {/if}

      {#if error}
        <p role="alert" class="rounded-xl border border-red-400/50 bg-red-950/40 p-3 text-sm">
          {error}
        </p>
      {/if}
    </section>

    <footer class="border-t border-white/10 p-5">
      <div class="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-black/35 p-3">
        <label for="chat-prompt" class="sr-only">Ask Pansophy</label>
        <textarea
          id="chat-prompt"
          bind:value={prompt}
          on:keydown={handlePromptKeydown}
          rows="3"
          maxlength="100000"
          class="no-scrollbar w-full resize-none bg-transparent p-2 text-sm outline-none placeholder:text-white/35"
          placeholder="Ask me anything"
        ></textarea>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="Extract text from a file"
              class="rounded-full bg-white/10 p-3 hover:bg-white/20"
              on:click={handleAddFile}
            >
              <Fa icon={faPlus} />
            </button>
            <button
              type="button"
              class="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              on:click={sendDeepThinkPrompt}
            >
              Deep thinking
            </button>
            <button
              type="button"
              class="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              on:click={handleWebSearch}
            >
              <Fa icon={faSearch} />
              Search web
            </button>
          </div>
          <button
            type="button"
            aria-label="Send message"
            disabled={loading || !prompt.trim()}
            class="grid h-11 w-11 place-items-center rounded-full bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            on:click={() => sendPrompt()}
          >
            <img class="h-7 w-7 object-contain" src={logo} alt="" />
          </button>
        </div>
      </div>
    </footer>
  </main>

  {#if sourcesOpen}
    <aside
      class="no-scrollbar w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-black/20 p-5"
    >
      <div class="mb-5 flex items-center justify-between">
        <h2 class="font-poppins text-lg font-semibold">Sources</h2>
        <button
          type="button"
          aria-label="Close sources"
          class="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20"
          on:click={() => (sourcesOpen = false)}>×</button
        >
      </div>
      <div class="flex flex-col gap-5">
        {#each sources as source, index (source.link + index)}
          <article class="border-b border-white/10 pb-5">
            <p class="mb-1 text-xs text-white/45">{source.domain}</p>
            <a
              class="font-medium text-blue-300 hover:underline"
              href={source.link}
              target="_blank"
              rel="noreferrer"
            >
              {source.title}
            </a>
            <p class="mt-2 text-sm leading-5 text-white/65">{source.description}</p>
          </article>
        {/each}
      </div>
    </aside>
  {/if}
</div>

{#if isDownloadModalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/65 p-6">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-title"
      class="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 text-white shadow-2xl"
    >
      <img class="mx-auto h-24 w-24 object-contain" src={bot} alt="" />
      <h2 id="download-title" class="mt-3 text-center text-xl font-semibold">
        Enable deep thinking?
      </h2>
      <p class="mt-2 text-center text-sm text-white/60">
        This downloads the {deepThinkModel} model to your local Ollama storage.
      </p>
      {#if modelDownloadStatus}
        <p class="mt-4 text-sm">{modelDownloadStatus}</p>
        <progress class="mt-2 w-full" max={modelData.size || 1} value={modelData.completed}
        ></progress>
      {/if}
      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          on:click={() => (isDownloadModalOpen = false)}
          disabled={loading}>Cancel</button
        >
        <button
          type="button"
          class="rounded-full bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
          on:click={downloadDeepthinkModel}
          disabled={loading}
        >
          {loading ? 'Downloading…' : 'Download'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
