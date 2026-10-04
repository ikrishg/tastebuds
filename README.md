# Tastebuds

SolidStart app that signs in with Last.fm, reads your recent listening history, and uses AI to generate a short “music vibe” title and rating.

**Live:** [tastebuds.krishg.com](https://tastebuds.krishg.com)

The earlier Spotify-based version lives in [spotbuds](https://github.com/ikrishg/spotbuds).

## Stack

- SolidJS / SolidStart (Vinxi)
- TypeScript
- Bun

## Run locally

```bash
git clone https://github.com/ikrishg/tastebuds.git
cd tastebuds
bun install
```

Add your Last.fm API key and shared secret in `src/config.ts`, then:

```bash
bun run dev
```
