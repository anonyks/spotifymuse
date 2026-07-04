import { create } from 'zustand';
import * as playback from '../services/playbackService.ts';
import { playTrackInAlbum } from '../services/playbackControls.ts';
import { clamp } from '../utils/format.ts';
import type { NowPlaying, QueueItem, RepeatState } from '../spotify/playbackTypes.ts';
import type { TrackResult } from '../spotify/searchTypes.ts';

/**
 * Playback state for the UI. `progressMs` is interpolated locally via tick()
 * between server syncs, giving a smooth bar without hammering the API.
 * All Spotify calls go through playbackService.
 */

interface PlayerState {
  track: NowPlaying | null;
  queue: QueueItem[];
  recent: TrackResult[];
  recentSelected: number;
  progressMs: number;
  lastTick: number;
  loaded: boolean;

  sync: () => Promise<void>;
  tick: () => void;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  toggleShuffle: () => Promise<void>;
  cycleRepeat: () => Promise<void>;
  adjustVolume: (delta: number) => Promise<void>;
  loadRecent: () => Promise<void>;
  moveRecent: (delta: number) => void;
  playRecent: () => Promise<void>;
}

const RESYNC_DELAY_MS = 400;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  track: null,
  queue: [],
  recent: [],
  recentSelected: 0,
  progressMs: 0,
  lastTick: Date.now(),
  loaded: false,

  sync: async () => {
    const prevId = get().track?.id ?? null;
    const track = await playback.fetchNowPlaying();
    set({
      track,
      progressMs: track?.progressMs ?? 0,
      lastTick: Date.now(),
      loaded: true,
    });
    // Refresh the queue only when the track changes — it's slow-moving.
    if (track && track.id !== prevId) {
      set({ queue: await playback.fetchQueue() });
    }
    // Load recently-played for the "nothing playing" picker.
    if (!track && get().recent.length === 0) {
      set({ recent: await playback.fetchRecent() });
    }
  },

  tick: () => {
    const { track, progressMs, lastTick } = get();
    const now = Date.now();
    if (track?.isPlaying) {
      set({ progressMs: Math.min(progressMs + (now - lastTick), track.durationMs), lastTick: now });
    } else {
      set({ lastTick: now });
    }
  },

  togglePlay: async () => {
    const { track } = get();
    if (!track) return;
    // Optimistic flip for instant feedback; server sync will confirm.
    set({ track: { ...track, isPlaying: !track.isPlaying }, lastTick: Date.now() });
    await playback.togglePlayback(track.isPlaying);
  },

  next: async () => {
    await playback.skipNext();
    setTimeout(() => void get().sync(), RESYNC_DELAY_MS);
  },

  previous: async () => {
    await playback.skipPrevious();
    setTimeout(() => void get().sync(), RESYNC_DELAY_MS);
  },

  toggleShuffle: async () => {
    const { track } = get();
    if (!track) return;
    const shuffle = !track.shuffle;
    set({ track: { ...track, shuffle } });
    await playback.toggleShuffle(shuffle);
  },

  cycleRepeat: async () => {
    const { track } = get();
    if (!track) return;
    const repeat: RepeatState = playback.nextRepeat(track.repeat);
    set({ track: { ...track, repeat } });
    await playback.setRepeatMode(repeat);
  },

  adjustVolume: async (delta) => {
    const { track } = get();
    if (!track) return;
    const volume = clamp(track.volume + delta, 0, 100);
    set({ track: { ...track, volume } }); // optimistic
    await playback.changeVolume(volume);
  },

  loadRecent: async () => {
    set({ recent: await playback.fetchRecent(), recentSelected: 0 });
  },

  moveRecent: (delta) => {
    const { recent, recentSelected } = get();
    if (recent.length === 0) return;
    set({ recentSelected: clamp(recentSelected + delta, 0, recent.length - 1) });
  },

  playRecent: async () => {
    const { recent, recentSelected } = get();
    const track = recent[recentSelected];
    if (!track) return;
    await playTrackInAlbum(track.uri, track.albumUri);
    setTimeout(() => void get().sync(), RESYNC_DELAY_MS);
  },
}));
