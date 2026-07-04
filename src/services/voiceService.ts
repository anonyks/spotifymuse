import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONFIG_DIR } from '../config/paths.ts';
import { logDebug } from '../utils/logger.ts';

/**
 * Always-listening voice engine. Uses `sox`/`rec` to capture one spoken
 * utterance at a time (starts on sound, stops on silence) and `whisper-cli`
 * (offline, free) to transcribe it. Fully local — no cloud, no API keys.
 */

const BIN_DIRS = ['/opt/homebrew/bin', '/usr/local/bin'];
const MODELS_DIR = join(CONFIG_DIR, 'models');

// Prefer the most accurate model that's installed (small.en is the sweet spot
// of accuracy vs. speed; base/tiny are fallbacks, medium is higher accuracy).
const MODEL_PREFERENCE = [
  'ggml-small.en.bin',
  'ggml-medium.en.bin',
  'ggml-base.en.bin',
  'ggml-tiny.en.bin',
];

// Priming prompt — biases Whisper toward the command vocabulary. This alone
// fixes the wake word (without it "muse" is often heard as "news"/"mews").
const PROMPT =
  'Voice commands for a music player. Muse, play, pause, resume, next, ' +
  'previous, back, shuffle, volume up, volume down.';

function resolveBin(name: string): string | null {
  for (const dir of BIN_DIRS) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function resolveModel(): string | null {
  for (const name of MODEL_PREFERENCE) {
    const p = join(MODELS_DIR, name);
    if (existsSync(p)) return p;
  }
  return null;
}

export function isVoiceReady(): boolean {
  return resolveBin('rec') !== null && resolveBin('whisper-cli') !== null && resolveModel() !== null;
}

let listening = false;
let recProc: ChildProcess | null = null;

export function isListening(): boolean {
  return listening;
}

export function startListening(onTranscript: (text: string) => void): boolean {
  if (!isVoiceReady() || listening) return listening;
  listening = true;
  void loop(onTranscript);
  return true;
}

export function stopListening(): void {
  listening = false;
  if (recProc) {
    recProc.kill('SIGKILL');
    recProc = null;
  }
}

async function loop(onTranscript: (text: string) => void): Promise<void> {
  const rec = resolveBin('rec');
  const whisper = resolveBin('whisper-cli');
  if (!rec || !whisper) return;

  while (listening) {
    try {
      const wav = await capture(rec);
      if (!listening) {
        await safeUnlink(wav);
        break;
      }
      const text = await transcribe(whisper, wav);
      await safeUnlink(wav);
      if (text && listening) onTranscript(text);
    } catch (err) {
      logDebug(`voice loop: ${err instanceof Error ? err.message : String(err)}`);
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}

/** Record a single utterance: begins on sound, ends after ~1.2s silence, capped at 8s. */
function capture(rec: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wav = join(tmpdir(), `muse-voice-${Date.now()}.wav`);
    recProc = spawn(
      rec,
      ['-q', '-c', '1', '-r', '16000', '-b', '16', wav,
        'silence', '1', '0.1', '2%', '1', '1.2', '2%', 'trim', '0', '8'],
      { stdio: 'ignore' },
    );
    recProc.on('exit', () => {
      recProc = null;
      resolve(wav);
    });
    recProc.on('error', (err) => {
      recProc = null;
      reject(err);
    });
  });
}

function transcribe(whisper: string, wav: string): Promise<string> {
  return new Promise((resolve) => {
    const model = resolveModel();
    if (!model) {
      resolve('');
      return;
    }
    let out = '';
    const p = spawn(
      whisper,
      ['-m', model, '-f', wav, '-nt', '-np', '-t', '4', '-bs', '5', '--prompt', PROMPT],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('exit', () => resolve(out.trim()));
    p.on('error', () => resolve(''));
  });
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    /* already gone */
  }
}
