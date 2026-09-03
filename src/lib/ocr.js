import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import { AppError } from './errors.js';
import { logger } from './logger.js';

const filePickerOptions = {
  multiple: false,
  filters: [
    {
      name: 'Images and PDFs',
      extensions: ['png', 'jpeg', 'jpg', 'pdf', 'webp'],
    },
  ],
};

const extractWithTauri = (imgPath) => invoke('img_to_text', { imgPath });

/**
 * @param {{
 *   selectFile?: (options: typeof filePickerOptions) => Promise<string | null>,
 *   extractText?: (imgPath: string) => Promise<string>,
 *   log?: { info: (...args: unknown[]) => void, error: (...args: unknown[]) => void },
 *   onSelected?: (file: { path: string, name: string }) => void
 * }} [options]
 */
export async function addFile({
  selectFile = open,
  extractText = extractWithTauri,
  log = logger,
  onSelected,
} = {}) {
  const path = await selectFile(filePickerOptions);
  if (!path) return null;

  const currentFile = {
    path,
    name: path.split(/[\\/]/).pop() || path,
  };
  onSelected?.(currentFile);

  try {
    const extractedText = await extractText(path);
    log.info('ocr.completed', { fileName: currentFile.name });
    return { currentFile, extractedText };
  } catch (error) {
    log.error('ocr.failed', { fileName: currentFile.name }, error);
    throw error;
  }
}

export function removeFile() {
  return { currentFile: null, extractedText: '', error: null };
}

/**
 * @param {string} text
 * @param {{
 *   writeText?: (value: string) => Promise<void>,
 *   log?: { info: (...args: unknown[]) => void, error: (...args: unknown[]) => void }
 * }} [options]
 */
export async function copyText(
  text,
  { writeText = (value) => navigator.clipboard.writeText(value), log = logger } = {},
) {
  try {
    await writeText(text);
    log.info('ocr.copied');
  } catch (cause) {
    const error = new AppError('CLIPBOARD_ERROR', 'The extracted text could not be copied.', {
      cause,
    });
    log.error('ocr.copy_failed', {}, error);
    throw error;
  }
}
