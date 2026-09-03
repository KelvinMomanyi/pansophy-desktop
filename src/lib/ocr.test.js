import { describe, expect, it, vi } from 'vitest';

import { addFile, copyText, removeFile } from './ocr.js';

function createLog() {
  return { info: vi.fn(), error: vi.fn() };
}

describe('OCR workflow', () => {
  it('opens supported files and returns extracted text', async () => {
    const selectFile = vi.fn().mockResolvedValue('C:\\notes\\scan.PNG');
    const extractText = vi.fn().mockResolvedValue('A useful note');
    const log = createLog();
    const onSelected = vi.fn();

    await expect(addFile({ selectFile, extractText, log, onSelected })).resolves.toEqual({
      currentFile: { path: 'C:\\notes\\scan.PNG', name: 'scan.PNG' },
      extractedText: 'A useful note',
    });
    expect(selectFile).toHaveBeenCalledWith({
      multiple: false,
      filters: [
        {
          name: 'Images and PDFs',
          extensions: ['png', 'jpeg', 'jpg', 'pdf', 'webp'],
        },
      ],
    });
    expect(extractText).toHaveBeenCalledWith('C:\\notes\\scan.PNG');
    expect(onSelected).toHaveBeenCalledWith({
      path: 'C:\\notes\\scan.PNG',
      name: 'scan.PNG',
    });
    expect(log.info).toHaveBeenCalledWith('ocr.completed', { fileName: 'scan.PNG' });
  });

  it('does nothing when file selection is cancelled', async () => {
    const extractText = vi.fn();

    await expect(
      addFile({ selectFile: vi.fn().mockResolvedValue(null), extractText }),
    ).resolves.toBeNull();
    expect(extractText).not.toHaveBeenCalled();
  });

  it('logs extraction failures with the selected file', async () => {
    const failure = new Error('OCR unavailable');
    const log = createLog();

    await expect(
      addFile({
        selectFile: vi.fn().mockResolvedValue('/tmp/page.pdf'),
        extractText: vi.fn().mockRejectedValue(failure),
        log,
      }),
    ).rejects.toBe(failure);
    expect(log.error).toHaveBeenCalledWith('ocr.failed', { fileName: 'page.pdf' }, failure);
  });

  it('returns the cleared file state', () => {
    expect(removeFile()).toEqual({ currentFile: null, extractedText: '', error: null });
  });

  it('copies extracted text and emits a completion event', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const log = createLog();

    await copyText('Copied note', { writeText, log });

    expect(writeText).toHaveBeenCalledWith('Copied note');
    expect(log.info).toHaveBeenCalledWith('ocr.copied');
  });

  it('normalizes clipboard failures for the UI', async () => {
    const cause = new Error('permission denied');
    const log = createLog();

    await expect(
      copyText('Private note', {
        writeText: vi.fn().mockRejectedValue(cause),
        log,
      }),
    ).rejects.toMatchObject({
      code: 'CLIPBOARD_ERROR',
      message: 'The extracted text could not be copied.',
      cause,
    });
    expect(log.error).toHaveBeenCalledWith(
      'ocr.copy_failed',
      {},
      expect.objectContaining({ code: 'CLIPBOARD_ERROR' }),
    );
  });
});
