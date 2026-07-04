import { useAuthStore } from '../state/authStore.ts';
import { playUris, playContext } from '../spotify/playbackApi.ts';
import { getDevices } from '../spotify/deviceApi.ts';
import { STREAM_DEVICE_NAME, isStreaming } from './streamService.ts';
import { logDebug } from '../utils/logger.ts';

/**
 * Robust "start playing X" helpers shared by search, recently-played and the
 * library. If there's no active device, Spotify 404s — we then pick an
 * available device and retry targeting it. Returns false only when no device
 * exists anywhere.
 */

async function token(): Promise<string | null> {
  return useAuthStore.getState().getAccessToken();
}

async function withDeviceFallback(
  play: (token: string, deviceId?: string) => Promise<void>,
): Promise<boolean> {
  const t = await token();
  if (!t) return false;

  // When the terminal's own librespot device is up, always play there so audio
  // comes out locally without needing the Spotify app.
  if (isStreaming()) {
    const muse = (await getDevices(t)).find((d) => d.name === STREAM_DEVICE_NAME);
    if (muse) {
      try {
        await play(t, muse.id);
        return true;
      } catch (err) {
        logDebug(`play on MUSE device failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  try {
    await play(t);
    return true;
  } catch {
    const devices = await getDevices(t);
    const target = devices.find((d) => d.isActive) ?? devices[0];
    if (!target) {
      logDebug('play: no devices available');
      return false;
    }
    try {
      await play(t, target.id);
      return true;
    } catch (err) {
      logDebug(`play retry failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}

export function playTrackUri(uri: string): Promise<boolean> {
  return withDeviceFallback((t, deviceId) => playUris(t, [uri], deviceId));
}

export function playContextUri(contextUri: string): Promise<boolean> {
  return withDeviceFallback((t, deviceId) => playContext(t, contextUri, deviceId));
}

/**
 * Plays a track inside its album so playback continues to the next song
 * afterwards (like Spotify), instead of looping the single track. Falls back to
 * the bare track when no album context is available.
 */
export function playTrackInAlbum(trackUri: string, albumUri: string | null): Promise<boolean> {
  if (!albumUri) return playTrackUri(trackUri);
  return withDeviceFallback((t, deviceId) => playContext(t, albumUri, deviceId, trackUri));
}
