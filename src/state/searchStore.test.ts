import { test, expect, afterEach } from 'bun:test';
import { useSearchStore } from './searchStore.ts';
import type { TrackResult } from '../spotify/searchTypes.ts';

const mk = (id: string): TrackResult => ({
  id,
  uri: `spotify:track:${id}`,
  title: id,
  artist: 'a',
  album: 'b',
  albumUri: null,
  durationMs: 1000,
});

afterEach(() => {
  useSearchStore.setState({ open: false, mode: 'typing', query: '', results: [], status: 'idle', selected: 0 });
});

test('open/close toggles state and resets to typing', () => {
  useSearchStore.getState().openSearch();
  expect(useSearchStore.getState().open).toBe(true);
  expect(useSearchStore.getState().mode).toBe('typing');
  useSearchStore.getState().closeSearch();
  expect(useSearchStore.getState().open).toBe(false);
});

test('moveSelection clamps within bounds', () => {
  useSearchStore.setState({ results: [mk('1'), mk('2'), mk('3')], selected: 0 });
  const { moveSelection } = useSearchStore.getState();
  moveSelection(-1);
  expect(useSearchStore.getState().selected).toBe(0); // clamped low
  moveSelection(2);
  expect(useSearchStore.getState().selected).toBe(2);
  moveSelection(5);
  expect(useSearchStore.getState().selected).toBe(2); // clamped high
});

test('moveSelection is a no-op with no results', () => {
  useSearchStore.setState({ results: [], selected: 0 });
  useSearchStore.getState().moveSelection(3);
  expect(useSearchStore.getState().selected).toBe(0);
});
