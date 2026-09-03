import { invoke } from '@tauri-apps/api/core';

import { streamChat } from './chatApi.js';

const searchWithTauri = (query) => invoke('web_search', { search: query });

export function normalizeSearchResults(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((result) => result && typeof result === 'object')
    .map((result) => ({
      title: typeof result.title === 'string' ? result.title : 'Untitled result',
      description: typeof result.description === 'string' ? result.description : '',
      link: typeof result.link === 'string' ? result.link : '',
      domain: typeof result.domain === 'string' ? result.domain : '',
    }))
    .filter((result) => result.link.startsWith('https://'));
}

export async function webSearch(
  query,
  { search = searchWithTauri, summarize = streamChat, model = 'mistral:7b' } = {},
) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return { sources: [], summary: null };

  const sources = normalizeSearchResults(await search(trimmedQuery));
  if (sources.length === 0) return { sources, summary: null };

  const sourceText = sources
    .map((result, index) => index + 1 + '. ' + result.title + ': ' + result.description)
    .join('\n');
  const summary = await summarize({
    model,
    messages: [
      {
        role: 'user',
        content:
          'Summarize the search results for "' +
          trimmedQuery +
          '". Highlight the key information.\n\n' +
          sourceText,
      },
    ],
  });

  return { sources, summary };
}
