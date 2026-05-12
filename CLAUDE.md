# CLAUDE.md — own·music

Convenzioni e decisioni chiuse per questo progetto. Leggere prima di proporre modifiche strutturali.

## Cos'è

PWA personale per ascoltare musica. Uso familiare privato, non pubblico, niente auth seria. Architettura "filesystem as database": gli mp3 vivono in `public/music/<genere>/<artista>/<album>/NN-titolo.mp3` e un CLI (`pnpm ingest`) genera `public/library.json` con tutti i metadata e le auto-playlist. Niente DB, niente backend custom, niente servizi esterni.

## Stack

- **Vite + React 18 + TypeScript** (strict)
- **Tailwind CSS 3**
- **lucide-react** per icone
- **music-metadata** (Node) per parsing ID3 nel CLI di ingest
- **HTMLAudioElement** nativo + **Media Session API** per controlli lockscreen
- **localStorage** per favorites (per-device, niente sync)
- **Cloudflare Pages / Vercel** come hosting di file statici

## Decisioni chiuse (non rinegoziare senza ragione forte)

- **Niente servizi esterni.** Storage = filesystem dentro al repo (o LFS in futuro), niente R2/S3/Worker.
- **Niente DB.** `library.json` rigenerato dal CLI. Custom playlist in `public/music/_playlists/*.json`.
- **Stable Track ID = nanoid persistito** in `public/music/_meta/trackids.json`. Se un file viene rinominato, l'ID resta lo stesso (matching tramite hash md5 del primo MB).
- **Naming convention vincolante**: solo `[a-z0-9-]+` per cartelle e nomi file. Il CLI valida e avverte.
- **Schema versionato**: `library.json` ha `schemaVersion: 1`. Bumpare a 2 se cambia la struttura.
- **Lingua UI: italiano.**
- **Tema: dark zinc + accenti emerald** (now-playing, toggle attivi) + **rosa-400** per cuori preferiti.
- **Typography**: Inter (body) / Cormorant Garamond (display serif) / JetBrains Mono (metadata).
- **Cover placeholder**: gradient deterministico via hash del seed (album/playlist/artista). Niente immagini AI generate.

## Architettura

```
src/
  components/   componenti UI presentational (no business logic, no state)
  views/        schermate complete; ricevono props da App.tsx
  state/        custom hooks (usePlayer, useFavorites)
  lib/          types, utils puri, fetch del manifest
```

- `App.tsx` è il root: tiene view+history (mini-router custom), inizializza player+favorites, passa props a tutte le view via un oggetto `ViewProps` condiviso.
- **Tutti i componenti vivono a livello modulo, MAI definiti dentro la function component App.** Definirli dentro causa rimontaggi a ogni render e perdita di stato/eventi (era il bug della prima versione).
- **Hook `usePlayer`** wrappa un singolo `HTMLAudioElement` ref-stable, espone playTrack/togglePlay/skipNext/skipPrev/seek/toggleShuffle/cycleRepeat. Gestisce Media Session API per i metadata su lockscreen.
- **Custom playlist**: oggi sono solo read-only (lette dal manifest). La persistenza CRUD lato app è da implementare (TODO sotto).

## Workflow

1. Sviluppo: `pnpm dev`
2. Aggiungere musica: copia mp3 in `public/music/<genere>/<artista>/<album>/`, lancia `pnpm ingest`.
3. Commit: include `public/music/`, `public/library.json`, e `public/music/_meta/trackids.json` (importante per stabilità ID).
4. Deploy: push su GitHub → Vercel auto-deploya.

## TODO ordinati per priorità

1. **Playlist custom CRUD lato app**: pulsante "aggiungi a playlist" sulla traccia, creazione playlist via UI scrive un JSON in `_playlists/`. In hosting statico non possiamo scrivere su disco direttamente, opzioni:
   - **A**: scrittura in localStorage + bottone "export → scarica JSON" che l'utente mette manualmente in `_playlists/` e commit
   - **B**: serverless function su Vercel che committa via GitHub API
   - **C**: piccolo backend (Cloudflare Worker) con KV
   La A è la più "filesystem-faithful" e zero-infra.
2. **Service Worker per offline + caching mp3** (PWA seria).
3. **Cover art** estratta dai tag ID3 quando presente, fallback su `_cover.jpg` nella cartella album, fallback su gradient.
4. **Coda visibile** come pannello laterale/bottom sheet.
5. **Cronologia ascolti** in IndexedDB.
6. **Smart playlists** (filtri dinamici: "tutto Wu-Tang", "tracce sotto i 3 min", ecc).

## Anti-pattern da evitare

- ❌ Definire componenti dentro `App.tsx` o dentro altre function components → rimontaggi
- ❌ Aggiungere DB / backend / auth complessa → contraddice la filosofia del progetto
- ❌ Servizi esterni (Spotify API, last.fm, ecc) per uso privato familiare → overkill e dipendenze
- ❌ Cover art generate da AI → niente slop
- ❌ Inter ovunque → la combinazione serif/sans/mono è scelta deliberata
