import { z } from 'zod';
import { spotifyGet } from './client.ts';
import type { TrackResult } from './searchTypes.ts';

/** Recently played tracks (GET /me/player/recently-played). */

const recentTrackSchema = z.object({
  id: z.string().nullable(),
  uri: z.string(),
  name: z.string(),
  duration_ms: z.number(),
  artists: z.array(z.object({ name: z.string() })),
  album: z.object({ name: z.string(), uri: z.string().optional() }),
});

const recentResponseSchema = z.object({
  items: z.array(z.object({ track: recentTrackSchema.nullable() })).default([]),
});

/** Latest distinct tracks, most-recent first. `limit` is omitted (same 400 quirk as search). */
export async function getRecentlyPlayed(token: string): Promise<TrackResult[]> {
  const raw = await spotifyGet<unknown>(token, '/me/player/recently-played');
  if (raw === null) return [];
  const parsed = recentResponseSchema.safeParse(raw);
  if (!parsed.success) return [];

  const seen = new Set<string>();
  const out: TrackResult[] = [];
  for (const { track } of parsed.data.items) {
    if (!track || seen.has(track.uri)) continue;
    seen.add(track.uri);
    out.push({
      id: track.id ?? track.uri,
      uri: track.uri,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      albumUri: track.album.uri ?? null,
      durationMs: track.duration_ms,
    });
  }
  return out;
}
