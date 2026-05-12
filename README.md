# own·music

Music player privato self-hosted. Filesystem-as-database, zero servizi esterni, deploy su Vercel.

## Avvio rapido

```bash
pnpm install     # o npm install
pnpm dev         # dev server su http://localhost:5173
```

## Aggiungere musica

1. Metti gli MP3 in `public/music/` seguendo la convenzione:
   ```
   public/music/<genere>/<artista>/<album>/NN-titolo.mp3
   ```
   Esempio:
   ```
   public/music/boom-bap/ray/demo/01-35.mp3
   ```
   Solo lettere minuscole, numeri e trattini. Niente spazi, niente accenti.

2. Rigenera l'indice:
   ```bash
   pnpm ingest
   ```

3. Refresh dell'app. Le auto-playlist per genere/artista/album si creano da sole.

## Deploy su Vercel

1. `git init && git add . && git commit -m "init"`
2. Push su GitHub
3. Su Vercel: "Import Project" → seleziona il repo → deploy
4. Framework preset: **Vite**. Tutto il resto è default.

Ogni volta che aggiungi musica:
- aggiungi gli mp3 in `public/music/...`
- `pnpm ingest`
- commit + push
- Vercel ridepoya automaticamente

## Struttura

```
public/
  music/                   # i tuoi file audio + playlist
    boom-bap/ray/demo/
    _playlists/            # playlist custom (file json)
    _meta/trackids.json    # mappa stabile path↔id (auto-gestita)
  library.json             # manifest generato da `pnpm ingest`
src/
  components/              # UI riusabili (Cover, TrackRow, Player, ...)
  views/                   # schermate (Home, Browse, List, Search, Playlists)
  state/                   # hook: usePlayer, useFavorites
  lib/                     # types, utils, library loader
tools/
  ingest/ingest.mjs        # CLI che genera library.json
```

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- HTMLAudioElement + Media Session API (lockscreen controls native)
- PWA-ready (manifest + icon, installabile su iOS/Android)
- Zero database, zero backend
