import { test, expect } from 'bun:test';
import { parseVoiceCommand, hasWakeWord } from './voiceCommands.ts';

test('requires the wake word', () => {
  expect(parseVoiceCommand('play bohemian rhapsody')).toEqual({ type: 'none' });
  expect(hasWakeWord('play something')).toBe(false);
  expect(hasWakeWord('Muse, play something')).toBe(true);
});

test('parses "muse play <song>" (with punctuation and casing)', () => {
  expect(parseVoiceCommand('Muse, play Bohemian Rhapsody by Queen')).toEqual({
    type: 'play',
    query: 'bohemian rhapsody by queen',
  });
});

test('handles Whisper gluing "play" to the word', () => {
  expect(parseVoiceCommand('muse playbohemian rhapsody')).toEqual({
    type: 'play',
    query: 'bohemian rhapsody',
  });
});

test('accepts wake-word homophones', () => {
  expect(parseVoiceCommand('mews next')).toEqual({ type: 'next' });
  expect(parseVoiceCommand('moose pause')).toEqual({ type: 'pause' });
});

test('parses transport + volume + shuffle intents', () => {
  expect(parseVoiceCommand('muse pause')).toEqual({ type: 'pause' });
  expect(parseVoiceCommand('muse skip')).toEqual({ type: 'next' });
  expect(parseVoiceCommand('muse go back')).toEqual({ type: 'previous' });
  expect(parseVoiceCommand('muse turn it up')).toEqual({ type: 'volumeUp' });
  expect(parseVoiceCommand('muse quieter')).toEqual({ type: 'volumeDown' });
  expect(parseVoiceCommand('muse shuffle')).toEqual({ type: 'shuffle' });
  expect(parseVoiceCommand('muse resume')).toEqual({ type: 'resume' });
});

test('song titles containing command words still play', () => {
  expect(parseVoiceCommand('muse play back in black')).toEqual({ type: 'play', query: 'back in black' });
  expect(parseVoiceCommand('muse play stop by the beatles')).toEqual({
    type: 'play',
    query: 'stop by the beatles',
  });
});

test('bare "play" resumes', () => {
  expect(parseVoiceCommand('muse play')).toEqual({ type: 'resume' });
});

test('wake word with no command is none', () => {
  expect(parseVoiceCommand('muse')).toEqual({ type: 'none' });
  expect(parseVoiceCommand('muse hello there')).toEqual({ type: 'none' });
});
