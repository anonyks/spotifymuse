import { create } from 'zustand';
import * as search from '../services/searchService.ts';
import type { TrackResult } from '../spotify/searchTypes.ts';
import { clamp } from '../utils/format.ts';

/**
 * Search page state: a typing → browsing focus flow (inspired by
 * spotify-player). All Spotify calls go through searchService.
 */

export type SearchStatus = 'idle' | 'searching' | 'done' | 'empty';
export type SearchMode = 'typing' | 'browsing';

interface SearchState {
  open: boolean;
  mode: SearchMode;
  query: string;
  results: TrackResult[];
  status: SearchStatus;
  selected: number;
  notice: string | null;

  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (q: string) => void;
  setMode: (m: SearchMode) => void;
  runSearch: () => Promise<void>;
  moveSelection: (delta: number) => void;
  playSelected: () => Promise<boolean>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  open: false,
  mode: 'typing',
  query: '',
  results: [],
  status: 'idle',
  selected: 0,
  notice: null,

  openSearch: () => set({ open: true, mode: 'typing', notice: null }),
  closeSearch: () => set({ open: false, mode: 'typing', notice: null }),
  setQuery: (query) => set({ query }),
  setMode: (mode) => set({ mode }),

  runSearch: async () => {
    const query = get().query.trim();
    if (!query) return;
    set({ status: 'searching', results: [], selected: 0, notice: null });
    try {
      const results = await search.searchTracks(query);
      set({
        results,
        status: results.length ? 'done' : 'empty',
        selected: 0,
        mode: results.length ? 'browsing' : 'typing',
      });
    } catch (err) {
      set({
        status: 'empty',
        results: [],
        mode: 'typing',
        notice: err instanceof Error ? err.message : 'Search failed',
      });
    }
  },

  moveSelection: (delta) => {
    const { results, selected } = get();
    if (results.length === 0) return;
    set({ selected: clamp(selected + delta, 0, results.length - 1) });
  },

  playSelected: async () => {
    const { results, selected } = get();
    const track = results[selected];
    if (!track) return false;
    const ok = await search.playTrack(track);
    if (ok) {
      set({ open: false, mode: 'typing', notice: null });
      return true;
    }
    set({ notice: 'No active device — press d to pick a speaker, then try again.' });
    return false;
  },
}));
