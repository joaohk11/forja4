# FORJA — Volleyball Coaching App

A professional volleyball coaching platform built with React + Vite (frontend) and Express (backend).

## Architecture

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router v6
- **Backend**: Express server (port 3000) — proxies AI requests securely
- **Data storage**: localStorage (primary, client-side)
- **AI**: Google Gemini API, proxied through the Express server

## Running the App

```
npm run dev
```

This starts both the Express server (port 3000) and the Vite dev server (port 5000) in parallel.

## Key Files

- `server/index.ts` — Express server with `/api/gemini` and `/api/ai-coach` routes
- `src/lib/context.tsx` — Global app state (React Context) backed by localStorage
- `src/lib/store.ts` — localStorage read/write helpers
- `src/lib/ai.ts` — Client-side AI helper (calls `/api/gemini`)
- `src/pages/` — All page components
- `src/services/` — Service layer (Supabase-optional, gracefully no-ops when not configured)

## Environment Variables / Secrets

- `GEMINI_API_KEY` — Required for the FORJA AI coach feature (Gemini API key from https://aistudio.google.com/apikey)

## Cloud Backup (Optional)

The Backup page supports optional Supabase cloud backup. Users can provide their own Supabase project URL and anon key directly in the UI — no server-side config needed.

## Notes

- All app data lives in the browser's localStorage; no server-side database is used for core data
- The Express server only handles AI proxying (keeps the API key server-side and secure)
- Supabase integration is fully optional and user-configurable in the UI
