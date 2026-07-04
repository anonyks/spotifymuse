import { z } from 'zod';

/** Spotify /search (tracks) shapes and the normalized result MUSE uses. */

export interface TrackResult {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  albumUri: string | null;
  durationMs: number;
}

const searchTrackSchema = z.object({
  id: z.string(),
  uri: z.string(),
  name: z.string(),
  duration_ms: z.number(),
  artists: z.array(z.object({ name: z.string() })),
  album: z.object({ name: z.string(), uri: z.string().optional() }),
});

export const searchResponseSchema = z.object({
  tracks: z.object({ items: z.array(searchTrackSchema) }).optional(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

export function normalizeSearch(res: SearchResponse): TrackResult[] {
  const items = res.tracks?.items ?? [];
  return items.map((t) => ({
    id: t.id,
    uri: t.uri,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    albumUri: t.album.uri ?? null,
    durationMs: t.duration_ms,
  }));
}
