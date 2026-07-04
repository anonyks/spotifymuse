import React, { useEffect } from 'react';
import { useApp, useInput } from 'ink';
import { ThemeProvider } from '../components/ThemeProvider.tsx';
import { Layout } from '../components/Layout.tsx';
import { AuthScreen } from '../components/AuthScreen.tsx';
import { PlayerScreen } from '../components/PlayerScreen.tsx';
import { SearchOverlay } from '../components/SearchOverlay.tsx';
import { DeviceOverlay } from '../components/DeviceOverlay.tsx';
import { LibraryOverlay } from '../components/LibraryOverlay.tsx';
import type { KeyHint } from '../components/Footer.tsx';
import { useAuthStore } from '../state/authStore.ts';
import { usePlayerStore } from '../state/playerStore.ts';
import { useSearchStore } from '../state/searchStore.ts';
import { useDeviceStore } from '../state/deviceStore.ts';
import { useLibraryStore } from '../state/libraryStore.ts';
import { useStreamStore } from '../state/streamStore.ts';
import { useVoiceStore } from '../state/voiceStore.ts';
import { getTheme, DEFAULT_THEME } from '../themes/index.ts';

/**
 * Root component. Owns top-level key handling and the active theme, and routes
 * between the auth and player screens. Screen logic lives in stores/services.
 */

const STATUS_LABEL: Record<string, string> = {
  loading: 'loading…',
  'needs-client-id': 'setup required',
  disconnected: 'not connected',
  authorizing: 'authorizing…',
  authenticated: 'connected',
  error: 'error',
};

const AUTH_HINTS: KeyHint[] = [
  { key: '↵', label: 'connect' },
  { key: 'q', label: 'quit' },
];

const PLAYER_HINTS: KeyHint[] = [
  { key: 'space', label: 'play/pause' },
  { key: 'n/b', label: 'next/prev' },
  { key: '+/-', label: 'volume' },
  { key: '/', label: 'search' },
  { key: 'l', label: 'library' },
  { key: 'v', label: 'voice' },
  { key: 'd', label: 'device' },
  { key: 'q', label: 'quit' },
];

const LIBRARY_HINTS: KeyHint[] = [
  { key: 'j/k', label: 'move' },
  { key: '↵', label: 'play playlist' },
  { key: 'esc', label: 'close' },
];

const SEARCH_HINTS: KeyHint[] = [
  { key: 'type', label: 'query' },
  { key: '↵', label: 'search / play' },
  { key: 'j/k', label: 'move' },
  { key: 'esc', label: 'close' },
];

const DEVICE_HINTS: KeyHint[] = [
  { key: 'j/k', label: 'move' },
  { key: '↵', label: 'switch device' },
  { key: 'esc', label: 'close' },
];

export function App(): React.JSX.Element {
  const { exit } = useApp();
  const theme = getTheme(DEFAULT_THEME);

  const status = useAuthStore((s) => s.status);
  const init = useAuthStore((s) => s.init);
  const connect = useAuthStore((s) => s.connect);

  // Select stable action refs only, so root never re-renders on progress ticks.
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const nextTrack = usePlayerStore((s) => s.next);
  const prevTrack = usePlayerStore((s) => s.previous);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const adjustVolume = usePlayerStore((s) => s.adjustVolume);

  const searchOpen = useSearchStore((s) => s.open);
  const openSearch = useSearchStore((s) => s.openSearch);
  const deviceOpen = useDeviceStore((s) => s.open);
  const openDevices = useDeviceStore((s) => s.openDevices);
  const libraryOpen = useLibraryStore((s) => s.open);
  const openLibrary = useLibraryStore((s) => s.openLibrary);
  const hasTrack = usePlayerStore((s) => s.track !== null);

  const streamRunning = useStreamStore((s) => s.running);
  const streamInstalled = useStreamStore((s) => s.installed);
  const startStream = useStreamStore((s) => s.start);
  const stopStream = useStreamStore((s) => s.stop);

  const voiceListening = useVoiceStore((s) => s.listening);
  const voiceFeedback = useVoiceStore((s) => s.feedback);
  const toggleVoice = useVoiceStore((s) => s.toggle);
  const stopVoice = useVoiceStore((s) => s.stop);

  useEffect(() => {
    void init();
  }, [init]);

  // Once connected, bring up the local librespot device so audio plays here.
  useEffect(() => {
    if (status === 'authenticated') void startStream();
  }, [status, startStream]);

  const quit = (): void => {
    stopVoice();
    stopStream();
    exit();
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      quit();
      return;
    }
    if (status === 'needs-client-id') return; // text input owns the keyboard
    if (searchOpen || deviceOpen || libraryOpen) return; // an overlay owns the keyboard

    if (input === 'q') {
      quit();
      return;
    }

    if (status === 'authenticated') {
      // Global entries first so they work even on the recently-played screen.
      if (input === '/') {
        openSearch();
        return;
      }
      if (input === 'l') {
        void openLibrary();
        return;
      }
      if (input === 'd') {
        void openDevices();
        return;
      }
      if (input === 'v') {
        toggleVoice();
        return;
      }
      // With nothing playing, the recently-played list owns navigation keys.
      if (!hasTrack) return;

      if (input === ' ' || input === 'p') void togglePlay();
      else if (input === 'n' || key.rightArrow) void nextTrack();
      else if (input === 'b' || key.leftArrow) void prevTrack();
      else if (input === '+' || input === '=' || key.upArrow) void adjustVolume(10);
      else if (input === '-' || input === '_' || key.downArrow) void adjustVolume(-10);
      else if (input === 's') void toggleShuffle();
      else if (input === 'r') void cycleRepeat();
      return;
    }

    if (key.return && (status === 'disconnected' || status === 'error')) {
      void connect();
    }
  });

  const authed = status === 'authenticated';
  const overlayHints = searchOpen
    ? SEARCH_HINTS
    : deviceOpen
      ? DEVICE_HINTS
      : libraryOpen
        ? LIBRARY_HINTS
        : PLAYER_HINTS;

  const body = !authed ? (
    <AuthScreen />
  ) : searchOpen ? (
    <SearchOverlay />
  ) : deviceOpen ? (
    <DeviceOverlay />
  ) : libraryOpen ? (
    <LibraryOverlay />
  ) : (
    <PlayerScreen />
  );

  const statusLabel = !authed
    ? (STATUS_LABEL[status] ?? status)
    : voiceListening
      ? `🎤 ${voiceFeedback || 'listening…'}`
      : streamRunning
        ? '🔊 playing here'
        : streamInstalled
          ? 'connected'
          : 'connected · brew install librespot to play here';

  return (
    <ThemeProvider theme={theme}>
      <Layout status={statusLabel} hints={authed ? overlayHints : AUTH_HINTS}>
        {body}
      </Layout>
    </ThemeProvider>
  );
}
