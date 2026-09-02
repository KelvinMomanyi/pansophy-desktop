# Pansophy Desktop

Pansophy is a local-first desktop research assistant built with Svelte 5 and Tauri 2. It
combines streamed conversations with a bundled Ollama service, DuckDuckGo Lite search, and
Tesseract/PDF text extraction.

## Prerequisites

- Node.js 24 and npm 11 (Node 20.19+ also works with Vite 7)
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

## Configuration

Copy `.env.example` to `.env` for local overrides:

- `VITE_OLLAMA_API_URL`: browser-visible Ollama base URL. Plain HTTP is accepted only for loopback
  addresses; remote services must use HTTPS.
- `PANSOPHY_OLLAMA_PORT`: port used by the native health check and bundled sidecar.

Do not commit `.env`. No secret is required for the bundled local services.

## Architecture

```text
src/routes and src/components  Svelte presentation and interaction
src/lib/chatApi.js             validated Ollama HTTP/NDJSON boundary
src/lib/errors.js              normalized application errors
src/lib/logger.js              structured browser log events
src/lib/themeStore.js          theme state and native synchronization
src-tauri/src/lib.rs           validated Tauri commands and sidecar lifecycle
src-tauri/src/utils.rs         DuckDuckGo response parsing
```

The browser layer never parses Ollama streams inside a component. Native commands return
serializable `{ code, message }` errors so the UI receives predictable failures.

## Tests and CI

Vitest and Testing Library cover stores, Svelte interaction, and API stream parsing. Rust unit
tests cover text cleanup, URL parsing, and command input validation. `.github/workflows/ci.yml`
runs linting, Svelte diagnostics, frontend tests/build, Rust formatting, `cargo check`, and Rust
tests on every push and pull request.

To enforce CI before merging, enable branch protection for the default branch and require:

- `Frontend quality`
- `Rust quality`

## Troubleshooting

- **The AI service is unavailable:** confirm port 11500 is free or set both variables in `.env`
  and your shell to the same alternative port.
- **A sidecar is missing:** obtain the correct Ollama/Tesseract executable, place it in
  `src-tauri/binaries`, and run `npm run setup:binaries`.
- **The browser-only UI reports Tauri errors:** use `npm run tauri:dev` for search, OCR, window
  controls, and notifications; those features require the native runtime.
