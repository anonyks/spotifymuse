#!/usr/bin/env bash
# Quick check that mic capture + offline speech-to-text work on this machine.
# Usage:  bash voice-check.sh
set -euo pipefail

MODELS="$HOME/.config/muse/models"
MODEL="$MODELS/ggml-small.en.bin"
[ -f "$MODEL" ] || MODEL="$MODELS/ggml-base.en.bin"
PROMPT="Voice commands for a music player. Muse, play, pause, resume, next, previous, back, shuffle, volume up, volume down."
WAV="$(mktemp -t muse-voice).wav"
SECONDS_TO_RECORD=5

command -v rec >/dev/null || { echo "✗ sox/rec missing — run: brew install sox"; exit 1; }
command -v whisper-cli >/dev/null || { echo "✗ whisper missing — run: brew install whisper-cpp"; exit 1; }
[ -f "$MODEL" ] || { echo "✗ model missing at $MODEL"; exit 1; }

echo ""
echo "🎤  Recording for ${SECONDS_TO_RECORD}s — speak now."
echo "    Try:  \"muse play bohemian rhapsody\""
echo ""
rec -q -c 1 -r 16000 -b 16 "$WAV" trim 0 "$SECONDS_TO_RECORD"

echo "⏳  Transcribing (offline)…"
echo ""
echo "────────────────────────────────────────"
whisper-cli -m "$MODEL" -f "$WAV" -nt -np -bs 5 --prompt "$PROMPT" 2>/dev/null | sed 's/^[[:space:]]*//'
echo "────────────────────────────────────────"
echo ""
echo "☝️  If that matches what you said, voice control will work."
rm -f "$WAV"
