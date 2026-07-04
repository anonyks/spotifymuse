# MUSE

A beautiful **Spotify client that runs entirely in your terminal** — real
album art, synced lyrics, search, playlists, and local playback (no Spotify app
required).

Built with TypeScript + [Bun](https://bun.sh) + [Ink](https://github.com/vadimdemedes/ink).

```
▸ MUSE v0.1.0                                        🔊 playing here
 ▓▓▓▓▓▓▓        Blinding Lights
 ▓ cover ▓      The Weeknd
 ▓▓▓▓▓▓▓        After Hours
                ━━━━━━━━━━●───────────────────  1:18 / 3:20
                ⤮ shuffle  ▶ playing  ↻ repeat all   vol ▮▮▮▮▮▮▮▮▯▯
╭ QUEUE · up next ───────────╮ ╭ LYRICS · synced ─────────────╮
│  1 Save Your Tears · …     │ │ I've been on my own …        │  ← current line
╰────────────────────────────╯ ╰──────────────────────────────╯
```

## Features

- 🎨 **Real album art** rendered as truecolor half-blocks (cached)
- 🎤 **Synced lyrics** (via [LRCLIB](https://lrclib.net)) that follow playback
- 🔎 **Search** tracks and play instantly
- 📚 **Library** — browse and play your playlists
- ⏭ **Queue** view of what's coming up
- 🔊 **Local playback** — the terminal becomes a Spotify Connect device via
  [librespot](https://github.com/librespot-org/librespot); no Spotify app needed
- 🎛 **Device switching**, volume, shuffle, repeat, a visualizer, and 8 themes
- 🔐 **PKCE OAuth** (no client secret) with encrypted, machine-local token storage

## Requirements

- macOS, [Bun](https://bun.sh), and **Spotify Premium**
- Optional (for terminal playback): [`librespot`](https://github.com/librespot-org/librespot) — `brew install librespot`

## Setup

```bash
bun install
cp .env.example .env          # add your Spotify Client ID (or MUSE will prompt)
brew install librespot        # optional: play audio in the terminal
chmod +x muse-start && sudo ln -s $PWD/muse-start /usr/local/bin/muse
```

Create a Spotify app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
(no secret needed — MUSE uses PKCE) and add this redirect URI **exactly**:

```
http://127.0.0.1:8888/callback
```

> Use the literal IP `127.0.0.1`, **not** `localhost` — Spotify rejects the word.

## Run

```bash
muse        # press Enter to connect, approve in the browser
```

The `muse` command automatically:
- Checks if Spotify or librespot is running
- Starts librespot if neither is active
- Launches the MUSE interface

## Controls

| Key       | Action            |     | Key   | Action           |
|-----------|-------------------|-----|-------|------------------|
| `space`   | play / pause      |     | `/`   | search           |
| `n` / `b` | next / previous   |     | `l`   | library          |
| `+` / `-` | volume            |     | `d`   | switch device    |
| `s`       | shuffle           |     | `r`   | repeat           |
| `j` / `k` | move in lists     |     | `q`   | quit             |

## Development

```bash
bun run typecheck   # strict TypeScript
bun test            # unit + render tests
```

## License

MIT — personal project. Not affiliated with Spotify.
