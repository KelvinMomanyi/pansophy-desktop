<script>
  import { loadDiagnostics } from '../lib/diagnostics.js';
  import { userMessage } from '../lib/errors.js';

  export let load = loadDiagnostics;
  let open = false;
  let busy = false;
  let error = '';
  /** @type {import('../lib/diagnostics.js').Diagnostics | null} */
  let report = null;

  async function refresh() {
    if (busy) return;
    busy = true;
    error = '';
    try {
      report = await load();
    } catch (failure) {
      report = null;
      error = userMessage(failure);
    } finally {
      busy = false;
    }
  }
</script>

<div class="text-sm">
  <button
    type="button"
    class="w-full rounded-lg bg-white/10 px-3 py-2 text-left hover:bg-white/20"
    aria-expanded={open}
    on:click={() => {
      open = !open;
      if (open) refresh();
    }}>Diagnostics</button
  >
  {#if open}
    <section
      aria-label="Service diagnostics"
      aria-busy={busy}
      class="mt-3 space-y-3 rounded-lg border border-white/15 p-3"
    >
      <h2 class="font-semibold">Local services</h2>
      <div aria-live="polite">
        {#if busy}
          <p>Checking services...</p>
        {:else if error}
          <p role="alert">{error}</p>
        {:else if report}
          <p>Ollama: {report.ollama.available ? 'Connected' : 'Unavailable'}</p>
          <p>Models installed: {report.ollama.modelCount}</p>
          <p>Check time: {report.ollama.latencyMs} ms</p>
          <p>Tesseract: {report.ocr.sidecarPresent ? 'Found' : 'Missing'}</p>
          <p>English OCR data: {report.ocr.languageDataPresent ? 'Found' : 'Missing'}</p>
          {#if !report.ollama.available}
            <p class="mt-2 text-white/65">Start Ollama or check your service configuration.</p>
          {/if}
          {#if report.logDirectory}
            <p class="mt-2 break-all text-xs text-white/65">Logs: {report.logDirectory}</p>
          {/if}
          <p class="mt-2 text-xs text-white/50">Pansophy {report.appVersion}</p>
        {/if}
      </div>
      <button
        type="button"
        disabled={busy}
        class="rounded bg-white/10 px-3 py-1 disabled:opacity-50"
        on:click={refresh}
      >
        Refresh diagnostics
      </button>
    </section>
  {/if}
</div>
