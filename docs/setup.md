# Local setup

## Environment variables

Copy `.env.example` to `.env` and set your Last.fm credentials:

| Variable | Where | Description |
| --- | --- | --- |
| `LASTFM_SHARED_SECRET` | Server only | Last.fm API shared secret used to sign `auth.getSession` requests |

The shared secret must not use a `VITE_` or other client-exposed prefix. SolidStart loads `.env` for the server at build and runtime.

## Deploy (Vercel)

Tastebuds is hosted on Vercel. In the project settings, add `LASTFM_SHARED_SECRET` as a server-side environment variable (Production and Preview as needed). The API route reads it via `process.env.LASTFM_SHARED_SECRET` at runtime.

## Last.fm API key

Set your Last.fm API key in `src/config.ts` (this value is public and appears in the login link).

## Run the app

```bash
bun run dev
```
