import { spotifyGet, spotifyRequest } from './client.ts';
import {
  normalizePlayer,
  normalizeQueue,
  playerResponseSchema,
  queueResponseSchema,
  type NowPlaying,
  type QueueItem,
  type RepeatState,
} from './playbackTypes.ts';

/**
 * Typed Spotify playback endpoints. Each takes an access token; token
 * acquisition/refresh is the caller's concern (playbackService).
 */

export async function getNowPlaying(token: string): Promise<NowPlaying | null> {
  const raw = await spotifyGet<unknown>(token, '/me/player');
  if (raw === null) return null;
  const parsed = playerResponseSchema.safeParse(raw);
  return parsed.success ? normalizePlayer(parsed.data) : null;
}

export async function getQueue(token: string): Promise<QueueItem[]> {
  const raw = await spotifyGet<unknown>(token, '/me/player/queue');
  if (raw === null) return [];
  const parsed = queueResponseSchema.safeParse(raw);
  return parsed.success ? normalizeQueue(parsed.data) : [];
}

export async function play(token: string): Promise<void> {
  await spotifyRequest(token, '/me/player/play', { method: 'PUT' });
}

/**
 * Start playback of specific track URIs (used by search). Optionally targets a
 * device. Throws on failure (e.g. 404 no active device) so callers can recover.
 */
export async function playUris(token: string, uris: string[], deviceId?: string): Promise<void> {
  const res = await spotifyRequest(token, '/me/player/play', {
    method: 'PUT',
    body: { uris },
    ...(deviceId ? { query: { device_id: deviceId } } : {}),
  });
  if (!res.ok) throw new Error(`play failed (${res.status})`);
}

/**
 * Start playback of a context (playlist/album/artist) URI, optionally starting
 * at a specific track (offset) so playback continues through the context after.
 */
export async function playContext(
  token: string,
  contextUri: string,
  deviceId?: string,
  offsetUri?: string,
): Promise<void> {
  const res = await spotifyRequest(token, '/me/player/play', {
    method: 'PUT',
    body: {
      context_uri: contextUri,
      ...(offsetUri ? { offset: { uri: offsetUri } } : {}),
    },
    ...(deviceId ? { query: { device_id: deviceId } } : {}),
  });
  if (!res.ok) throw new Error(`play failed (${res.status})`);
}

export async function pause(token: string): Promise<void> {
  await spotifyRequest(token, '/me/player/pause', { method: 'PUT' });
}

export async function next(token: string): Promise<void> {
  await spotifyRequest(token, '/me/player/next', { method: 'POST' });
}

export async function previous(token: string): Promise<void> {
  await spotifyRequest(token, '/me/player/previous', { method: 'POST' });
}

export async function seek(token: string, positionMs: number): Promise<void> {
  await spotifyRequest(token, '/me/player/seek', {
    method: 'PUT',
    query: { position_ms: Math.max(0, Math.round(positionMs)) },
  });
}

export async function setVolume(token: string, percent: number): Promise<void> {
  await spotifyRequest(token, '/me/player/volume', {
    method: 'PUT',
    query: { volume_percent: Math.max(0, Math.min(100, Math.round(percent))) },
  });
}

export async function setShuffle(token: string, state: boolean): Promise<void> {
  await spotifyRequest(token, '/me/player/shuffle', { method: 'PUT', query: { state } });
}

export async function setRepeat(token: string, state: RepeatState): Promise<void> {
  await spotifyRequest(token, '/me/player/repeat', { method: 'PUT', query: { state } });
}
