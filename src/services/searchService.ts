import { useAuthStore } from '../state/authStore.ts';
import { searchTracks as apiSearch } from '../spotify/searchApi.ts';
import { playTrackInAlbum } from './playbackControls.ts';
import { logDebug } from '../utils/logger.ts';
import type { TrackResult } from '../spotify/searchTypes.ts';

/** Search + play orchestration. Resolves a valid token, then calls the API. */

async function token(): Promise<string | null> {
  return useAuthStore.getState().getAccessToken();
}

export async function searchTracks(query: string): Promise<TrackResult[]> {
  const t = await token();
  if (!t) throw new Error('Not connected — reconnect and try again.');
  try {
    return await apiSearch(t, query);
  } catch (err) {
    logDebug(`search failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err; // surfaced to the search page so the real reason is visible
  }
}

/** Plays a track within its album so playback continues afterwards. */
export function playTrack(track: TrackResult): Promise<boolean> {
  return playTrackInAlbum(track.uri, track.albumUri);
}

export type { TrackResult };
