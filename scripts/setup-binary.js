import { execFileSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { arch, platform } from 'node:process';

const extension = platform === 'win32' ? '.exe' : '';
const binaryDirectory = 'src-tauri/binaries';
const binaries = ['ollama', 'tesseract'];

function inferredTargetTriple() {
  const targets = {
    'darwin-arm64': 'aarch64-apple-darwin',
    'darwin-x64': 'x86_64-apple-darwin',
    'linux-arm64': 'aarch64-unknown-linux-gnu',
    'linux-x64': 'x86_64-unknown-linux-gnu',
    'win32-arm64': 'aarch64-pc-windows-msvc',
    'win32-x64': 'x86_64-pc-windows-msvc',
  };
  return targets[platform + '-' + arch];
}

function rustTargetTriple() {
  try {
    const rustInfo = execFileSync('rustc', ['-vV'], { encoding: 'utf8' });
    return /^host: (\S+)$/m.exec(rustInfo)?.[1];
  } catch {
    return inferredTargetTriple();
  }
}

const targetTriple = rustTargetTriple();
if (!targetTriple) {
  throw new Error('Could not determine a supported Rust target triple for this platform.');
}

for (const name of binaries) {
  const source = binaryDirectory + '/' + name + extension;
  const destination = binaryDirectory + '/' + name + '-' + targetTriple + extension;

  if (existsSync(destination)) {
    console.info(destination + ' is ready.');
    continue;
  }
  if (!existsSync(source)) {
    throw new Error(
      'Missing ' + source + '. Add the sidecar binary before running the Tauri application.',
    );
  }
  renameSync(source, destination);
  console.info('Prepared ' + destination + '.');
}
