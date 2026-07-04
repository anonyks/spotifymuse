/** Parses a speech transcript into a MUSE voice command. Pure + testable. */

export type VoiceCommand =
  | { type: 'play'; query: string }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'volumeUp' }
  | { type: 'volumeDown' }
  | { type: 'shuffle' }
  | { type: 'none' };

// "muse" and homophones Whisper commonly produces for it (e.g. "news", "mews").
const WAKE = /\b(muse|mews|moose|muice|muze|muse's|news|mus)\b/;

function normalize(transcript: string): string {
  return transcript.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True if the utterance addressed MUSE (contains the wake word). */
export function hasWakeWord(transcript: string): boolean {
  return WAKE.test(normalize(transcript));
}

export function parseVoiceCommand(transcript: string): VoiceCommand {
  const text = normalize(transcript);
  const wake = text.match(WAKE);
  if (!wake) return { type: 'none' };

  const rest = text.slice((wake.index ?? 0) + wake[0].length).trim();
  if (!rest) return { type: 'none' };

  // Check "play <song>" first — song titles can contain command words like
  // "back" (e.g. "play back in black"). Transport words never contain "play".
  // Allow a missing space (Whisper sometimes glues "play" to the next word).
  const play = rest.match(/\bplay\s*(.+)/);
  if (play && play[1] && play[1].trim().length > 0) {
    return { type: 'play', query: play[1].trim() };
  }

  if (/\b(pause|stop|halt)\b/.test(rest)) return { type: 'pause' };
  if (/\b(next|skip|forward)\b/.test(rest)) return { type: 'next' };
  if (/\b(previous|back|prev|last song)\b/.test(rest)) return { type: 'previous' };
  if (/\bshuffle\b/.test(rest)) return { type: 'shuffle' };
  if (/(volume up|louder|turn (it )?up|increase)/.test(rest)) return { type: 'volumeUp' };
  if (/(volume down|quieter|softer|turn (it )?down|decrease)/.test(rest)) return { type: 'volumeDown' };
  // Bare "play"/"resume" (the "play <song>" case already returned above).
  if (/\b(resume|play|continue|unpause)\b/.test(rest)) return { type: 'resume' };

  return { type: 'none' };
}
