# Pansophy Desktop

Pansophy is a local-first desktop research assistant built with Svelte 5 and Tauri 2. It
combines streamed conversations with a bundled Ollama service, DuckDuckGo Lite search, and
Tesseract/PDF text extraction.

## Prerequisites

- Node.js 24 and npm 11
- The stable Rust toolchain and the platform prerequisites from the Tauri 2 setup guide
- Windows x64 for the sidecar binaries currently committed in `src-tauri/binaries`

The UI can be developed on other operating systems, but a native bundle needs matching Ollama
and Tesseract sidecars named with that platform's Rust target triple.

## Fresh-clone setup

```powershell
git clone <repository-url>
cd pansophy-desktop
Copy-Item .env.example .env
npm ci
npm run setup:binaries
npm run tauri:dev
```

`setup:binaries` does not download executables. It verifies the committed sidecars and, when a
generic binary is supplied, renames it to the target-triple filename required by Tauri. The
Windows x64 Ollama and Tesseract sidecars are already in the repository.

On startup, the native application checks `PANSOPHY_OLLAMA_PORT` (11500 by default). It reuses an
Ollama service already listening there or starts the bundled sidecar. The frontend connects to
the same service through `VITE_OLLAMA_API_URL`.

## One-command Docker startup

With Docker Engine and Compose installed, start the browser build, Ollama, and the default model:

```sh
docker compose up --build
```

Open <http://localhost:8080>. The first run downloads `mistral:7b` into the persistent
`ollama-data` volume before the app starts. Set `PANSOPHY_WEB_PORT` to publish a different
port. Stop the stack with `docker compose down`.

The containerized browser build supports local chat and model downloads. Search, OCR, native
window controls, and desktop notifications remain Tauri features and require `npm run tauri:dev`.

## Commands

| Command                                           | Purpose                                |
| ------------------------------------------------- | -------------------------------------- |
| `npm run tauri:dev`                               | Start the complete desktop application |
| `npm run dev`                                     | Start only the browser UI              |
| `npm run build`                                   | Build the browser assets               |
| `npm run check`                                   | Run Svelte/JavaScript diagnostics      |
| `npm run lint`                                    | Run ESLint                             |
| `npm run format:check`                            | Check Prettier formatting              |
| `npm test`                                        | Run the Vitest suite once              |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run native unit tests                  |
| `docker compose up --build`                       | Start the browser app and Ollama stack |

## Configuration

Copy `.env.example` to `.env` for local overrides:

- `VITE_OLLAMA_API_URL`: browser-visible Ollama base URL. Plain HTTP is accepted only for loopback
  addresses; remote services must use HTTPS.
- `PANSOPHY_OLLAMA_PORT`: port used by the native health check and bundled sidecar.
- `PANSOPHY_OLLAMA_URL`: optional full base URL for a local stub or managed Ollama service. When
  set, the native application uses that URL and does not launch the bundled Ollama sidecar.

Do not commit `.env`. No secret is required for the bundled local services.

## Architecture

```text
src/routes and src/components  Svelte presentation and interaction
src/lib/chatApi.js             validated Ollama HTTP/NDJSON boundary
src/lib/errors.js              normalized application errors
src/lib/logger.js              structured console events and optional native persistence
src/lib/themeStore.js          theme state and native synchronization
src-tauri/src/desktop.rs       Tauri commands and sidecar lifecycle
src-tauri/src/utils.rs         DuckDuckGo response parsing
```

The browser layer never parses Ollama streams inside a component. Native commands return
serializable `{ code, message }` errors so the UI receives predictable failures.

### Runtime logs

Debug and release desktop builds persist JSON lines through the existing Tauri logging plugin.
The file is `pansophy.log` inside Tauri's `app_log_dir()`: on Windows,
`%LOCALAPPDATA%\com.pansophy.desktop\logs`. The file appends across sessions and is replaced
when it reaches approximately 2 MB. Browser-only runs log to the console.

`write_log_line` validates frontend event names and levels and retains only model, deep-thinking,
and error name/code metadata. Prompt/query text, document contents, filenames, raw frontend error
messages, and stacks are omitted from the persistent frontend record. Native error messages remain
local in the same log. `createLogger({ sink: null })` disables persistence for a custom logger;
a sink failure falls back to the console without interrupting the operation.

### Diagnostics

Open **Diagnostics** in the chat sidebar to check Ollama connectivity, installed model count,
check duration, Tesseract availability, English OCR data, and the local log directory. Refresh
runs a new check without starting a sidecar. The `get_diagnostics` Tauri command returns these
independent results even when Ollama is unavailable. No telemetry is sent to a third party.

The native services live in `health.rs`, `utils.rs`, `ocr.rs`, and `diagnostics.rs`.
`desktop.rs` owns Tauri setup and process adapters. Search requests time out after 15 seconds
and accept up to 2 MB of results. OCR accepts files up to 25 MB, limits output to 4 MB, and stops
Tesseract after two minutes. Health requests time out after five seconds.

New bundled Ollama downloads use `app_local_data_dir()/models`, which is writable in installed
builds. Existing models under the old resources directory are not moved automatically; use
`PANSOPHY_OLLAMA_URL` for an existing managed service or copy models into the new directory.
If the configured port belongs to another service, startup fails instead of silently switching
to a port the frontend does not use.

## Tests and CI

Vitest and Testing Library cover stores, Svelte interaction, and API stream parsing. Rust unit
tests cover text cleanup, URL parsing, and command input validation. `.github/workflows/ci.yml`
runs linting, Svelte diagnostics, frontend tests/build, Rust formatting, `cargo check`, and Rust
tests on every push and pull request.

Run the portable Rust suite on Windows, Linux, or macOS:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --locked --no-default-features
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --no-default-features --all-targets -- -D warnings
```

Only the Rust toolchain and its platform compiler/linker are required. Disabling the default
`desktop` feature skips the Tauri build script, GUI dependencies, and sidecar bundling.
Tests use loopback HTTP fixtures, temporary files, and an injected OCR runner; they never launch
Ollama or Tesseract or contact DuckDuckGo. The default Cargo command still validates the full
desktop integration and requires the matching platform sidecars and Tauri prerequisites.
CI retains the complete Windows desktop checks and adds portable service tests on all three OSes.

Frontend coverage includes unimported application files and enforces **80% statements/lines**
and **75% branches/functions**. Run `npm test -- --coverage`; reports are written to `coverage/`.

To enforce CI before merging, enable branch protection for the default branch and require:

- `Frontend quality`
- `Rust quality`
- All three `Rust services` jobs

## Troubleshooting

- **Run frontend tests without Tauri:** run `npm test` (or `npm test -- --coverage`) directly.
  Vitest uses browser mocks and does not start the Tauri runtime, Ollama, or DuckDuckGo requests.
- **The AI service is unavailable:** confirm port 11500 is free or set both variables in `.env`
  and your shell to the same alternative port.
- **A sidecar is missing:** obtain the correct Ollama/Tesseract executable, place it in
  `src-tauri/binaries`, and run `npm run setup:binaries`.
- **The browser-only UI reports Tauri errors:** use `npm run tauri:dev` for search, OCR, window
  controls, and notifications; those features require the native runtime.
