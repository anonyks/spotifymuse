import { test, expect } from 'bun:test';
import { normalizeSearch, searchResponseSchema } from './searchTypes.ts';

test('normalizes track search results', () => {
  const parsed = searchResponseSchema.parse({
    tracks: {
      items: [
        {
          id: 't1',
          uri: 'spotify:track:t1',
          name: 'Redbone',
          duration_ms: 327_000,
          artists: [{ name: 'Childish Gambino' }],
          album: { name: 'Awaken, My Love!' },
        },
      ],
    },
  });
  const results = normalizeSearch(parsed);
  expect(results).toHaveLength(1);
  expect(results[0]).toEqual({
    id: 't1',
    uri: 'spotify:track:t1',
    title: 'Redbone',
    artist: 'Childish Gambino',
    album: 'Awaken, My Love!',
    albumUri: null,
    durationMs: 327_000,
  });
});

test('missing tracks key yields empty results', () => {
  expect(normalizeSearch(searchResponseSchema.parse({}))).toEqual([]);
});
