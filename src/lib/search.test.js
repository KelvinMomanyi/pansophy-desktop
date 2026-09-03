import { describe, expect, it, vi } from 'vitest';

import { normalizeSearchResults, webSearch } from './search.js';

describe('normalizeSearchResults', () => {
  it('rejects malformed payloads and unsafe links', () => {
    expect(normalizeSearchResults(null)).toEqual([]);
    expect(
      normalizeSearchResults([
        null,
        'invalid',
        { title: 'Unsafe', link: 'http://example.com' },
        { title: 'Missing link' },
      ]),
    ).toEqual([]);
  });

  it('normalizes optional fields on HTTPS results', () => {
    expect(
      normalizeSearchResults([
        { link: 'https://example.com/article' },
        {
          title: 'Pansophy',
          description: 'Local-first research',
          link: 'https://pansophy.example',
          domain: 'pansophy.example',
        },
      ]),
    ).toEqual([
      {
        title: 'Untitled result',
        description: '',
        link: 'https://example.com/article',
        domain: '',
      },
      {
        title: 'Pansophy',
        description: 'Local-first research',
        link: 'https://pansophy.example',
        domain: 'pansophy.example',
      },
    ]);
  });
});

describe('webSearch', () => {
  it('does not call dependencies for an empty query', async () => {
    const search = vi.fn();

    await expect(webSearch('  ', { search })).resolves.toEqual({
      sources: [],
      summary: null,
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('returns no summary when the provider has no safe results', async () => {
    const search = vi.fn().mockResolvedValue([{ link: 'http://unsafe.example' }]);
    const summarize = vi.fn();

    await expect(webSearch('  tauri  ', { search, summarize })).resolves.toEqual({
      sources: [],
      summary: null,
    });
    expect(search).toHaveBeenCalledWith('tauri');
    expect(summarize).not.toHaveBeenCalled();
  });

  it('summarizes normalized search results with the selected model', async () => {
    const source = {
      title: 'Tauri',
      description: 'Build smaller desktop applications.',
      link: 'https://tauri.app',
      domain: 'tauri.app',
    };
    const summarize = vi.fn().mockResolvedValue('Tauri builds desktop apps.');

    await expect(
      webSearch('desktop apps', {
        search: vi.fn().mockResolvedValue([source]),
        summarize,
        model: 'research:latest',
      }),
    ).resolves.toEqual({
      sources: [source],
      summary: 'Tauri builds desktop apps.',
    });
    expect(summarize).toHaveBeenCalledWith({
      model: 'research:latest',
      messages: [
        {
          role: 'user',
          content:
            'Summarize the search results for "desktop apps". Highlight the key information.\n\n' +
            '1. Tauri: Build smaller desktop applications.',
        },
      ],
    });
  });
});
