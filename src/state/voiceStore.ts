import { create } from 'zustand';
import { isVoiceReady, isListening, startListening, stopListening } from '../services/voiceService.ts';
import { parseVoiceCommand, hasWakeWord, type VoiceCommand } from '../services/voiceCommands.ts';
import { searchTracks } from '../services/searchService.ts';
import { playTrackInAlbum } from '../services/playbackControls.ts';
import * as playback from '../services/playbackService.ts';
import { usePlayerStore } from './playerStore.ts';

/**
 * Voice control state. Toggling on starts the offline listen loop; recognized
 * "muse …" commands are dispatched to the existing playback services/stores.
 */

interface VoiceState {
  ready: boolean;
  listening: boolean;
  lastHeard: string;
  feedback: string;

  toggle: () => void;
  stop: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  ready: isVoiceReady(),
  listening: false,
  lastHeard: '',
  feedback: '',

  toggle: () => {
    if (get().listening) {
      stopListening();
      set({ listening: false, feedback: '' });
      return;
    }
    if (!isVoiceReady()) {
      set({ ready: false, feedback: 'voice not set up (see steps.txt)' });
      return;
    }
    const started = startListening((text) => handleTranscript(text, set));
    set({ ready: true, listening: started || isListening(), feedback: 'say "muse, play …"' });
  },

  stop: () => {
    stopListening();
    set({ listening: false });
  },
}));

function handleTranscript(text: string, set: (partial: Partial<VoiceState>) => void): void {
  if (!hasWakeWord(text)) return; // ignore chatter not addressed to MUSE
  set({ lastHeard: text });
  const cmd = parseVoiceCommand(text);
  if (cmd.type === 'none') {
    set({ feedback: 'didn’t catch that — try "muse play <song>"' });
    return;
  }
  void execute(cmd, set);
}

async function execute(cmd: VoiceCommand, set: (partial: Partial<VoiceState>) => void): Promise<void> {
  const player = usePlayerStore.getState();
  try {
    switch (cmd.type) {
      case 'play': {
        set({ feedback: `🔎 "${cmd.query}"…` });
        const results = await searchTracks(cmd.query);
        const top = results[0];
        if (!top) {
          set({ feedback: `no results for "${cmd.query}"` });
          return;
        }
        await playTrackInAlbum(top.uri, top.albumUri);
        setTimeout(() => void player.sync(), 700);
        set({ feedback: `▶ ${top.title} — ${top.artist}` });
        return;
      }
      case 'pause':
        await playback.togglePlayback(true);
        setTimeout(() => void player.sync(), 400);
        set({ feedback: '⏸ paused' });
        return;
      case 'resume':
        await playback.togglePlayback(false);
        setTimeout(() => void player.sync(), 400);
        set({ feedback: '▶ resumed' });
        return;
      case 'next':
        await player.next();
        set({ feedback: '⏭ next' });
        return;
      case 'previous':
        await player.previous();
        set({ feedback: '⏮ previous' });
        return;
      case 'volumeUp':
        await player.adjustVolume(10);
        set({ feedback: '🔊 louder' });
        return;
      case 'volumeDown':
        await player.adjustVolume(-10);
        set({ feedback: '🔉 quieter' });
        return;
      case 'shuffle':
        await player.toggleShuffle();
        set({ feedback: '🔀 shuffle' });
        return;
      case 'none':
        return;
    }
  } catch (err) {
    set({ feedback: `voice error: ${err instanceof Error ? err.message : 'failed'}` });
  }
}
