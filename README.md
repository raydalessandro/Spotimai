# own·music

Music player privato self-hosted. Filesystem-as-database, zero servizi esterni, deploy su Vercel.

## Avvio rapido

```bash
pnpm install        # o npm install
pnpm dev            # dev server su http://localhost:5173
pnpm test           # vitest one-shot
pnpm build          # tsc + vite build, output in dist/
pnpm ingest         # rigenera public/library.json scansionando public/music/
```

## Aggiungere musica (procedura ordinata)

### 1. Verifica il file di partenza

Apri i tag ID3 con `music-metadata` (Node) o `ffprobe` (FFmpeg). Verifica:

- Bitrate ≥ 192 kbps (sotto si sente)
- Niente DRM, niente protezioni
- Titolo, artista, album sono **realmente** quelli giusti (vedi sezione anti-doppioni)

### 2. Scegli la collocazione

Struttura vincolante:

```
public/music/<genere>/<artista>/<album>/NN-titolo.mp3
```

Esempi:

```
public/music/cantautori-italiani/lucio-dalla/lucio-dalla-1979/01-l-anno-che-verra.mp3
public/music/cantautori-italiani/lucio-dalla/cambio/01-attenti-al-lupo.mp3
public/music/boom-bap/ray/demo/01-35.mp3
```

Regole:

- **Solo `[a-z0-9-]`** in cartelle e file. Niente spazi, niente accenti, niente maiuscole, niente apostrofi.
  - `Lucio Dalla` → `lucio-dalla`
  - `L'anno che verrà` → `l-anno-che-verra`
  - `Café del Mar` → `cafe-del-mar`
- **Album eponimo**: se l'album si chiama come l'artista, aggiungi l'anno (`lucio-dalla-1979`).
- **Singolo**: usa `01-` come prefisso.
- **Genere**: macro-categoria, non micro. Mai usare il nome di un artista come genere.

### 3. Scrivi i tag ID3 nel file

I tag ID3 dentro al file sono la sorgente preferita dall'ingest. Il path è solo fallback. Usa `ffmpeg` per scriverli senza re-encode:

```bash
ffmpeg -y -i input.mp3 -c copy \
  -id3v2_version 3 -write_id3v1 1 \
  -metadata title="Titolo Naturale" \
  -metadata artist="Artista Naturale" \
  -metadata album_artist="Artista Naturale" \
  -metadata album="Album Naturale" \
  -metadata date="YYYY" \
  -metadata genre="Genere Leggibile" \
  -metadata track="N" \
  public/music/<genere>/<artista>/<album>/NN-titolo.mp3
```

Campi che mettiamo sempre: `title`, `artist`, `album_artist`, `album`, `date` (anno), `genre`, `track`.

### 4. Lancia l'ingest

```bash
pnpm ingest
```

Output atteso:

```
🎵  own-music ingest
Trovati N file audio
── Report ──
✓ N tracce indicizzate
+ X aggiunte
~ X rinominate (ID stabile)
✓ N generi, N artisti, N album
✓ N playlist custom
→ public/library.json
→ public/music/_meta/trackids.json
```

Controlla i warning. Se appaiono nomi non-slug, **fixali** prima di committare.

### 5. Commit & push

```bash
git add public/music public/library.json public/music/_meta/trackids.json
git commit -m "music: <artista> — <album/canzone>"
git push
```

Vercel ridepoya automatico. `public/music/_meta/trackids.json` è critico — non escluderlo dal commit, è la mappa stabile path↔ID che evita di rigenerare gli ID quando rinomini un file.

## Anti-doppioni: la checklist

Quando arrivano file da terze parti il rischio principale è il **titolo sbagliato**. Esempi:

| File presente | Titolo reale |
|---|---|
| "Caro amico ti scrivo" | "L'anno che verrà" (è il primo verso) |
| "Bohemian" | "Bohemian Rhapsody" (troncato) |
| "Imagine (Live)" | versione live di "Imagine" — va in un album diverso |

Prima di catalogare:

1. Apri `public/library.json` e cerca `title` + `artist` per vedere se esiste già.
2. Se esiste ma è una versione diversa (live, remix, remaster), **rinomina l'album** o aggiungi suffisso al titolo (es. `Attenti al lupo (Live 1995)`).
3. Se il titolo è palesemente un verso anziché il vero titolo, **correggilo** prima di indicizzare.
4. Riusa generi/artisti esistenti: se in `library.json` c'è già `Cantautori Italiani`, non spawnare `cantautore-italiano` o `cantautori`.

## Playlist custom

L'app gestisce due tipi di playlist:

- **Sincronizzate** — vivono in `public/music/_playlists/*.json`, vengono lette dall'ingest e mostrate a tutti gli utenti uguali.
- **Bozze locali** — create dall'app via "+ Nuova playlist" o "Aggiungi a playlist" dal player/track row. Persistono in `localStorage`.

Per promuovere una bozza a playlist sincronizzata:

1. Aprila in "Playlist" → bottone download → scarichi `<slug>.json`.
2. Metti il file in `public/music/_playlists/`.
3. `pnpm ingest`.
4. Al refresh la bozza sparisce (dedup automatico per `id` o per nome normalizzato) e appare nella sezione "Sincronizzate".

## Deploy su Vercel

1. Push su GitHub.
2. Su Vercel: "Import Project" → seleziona il repo → deploy.
3. Framework preset: **Vite**. Root: **root del repo**. Build/output sono già in `vercel.json`.

Ogni `git push` ridepoya in automatico.

## Capacità con questa architettura

Con mp3 tra 3 e 5 MB:

| Tracce | Repo size | Stato |
|---|---|---|
| 100 | ~400 MB | ✅ tranquillo |
| 200 | ~800 MB | ✅ ok |
| 250 | ~1 GB | ⚠ warning GitHub |
| 500 | ~2 GB | ⚠ clone/push lenti |
| 1000+ | ~4 GB | ❌ serve Git LFS |

Sopra le ~200–250 tracce considera Git LFS per gli `.mp3`.

## Struttura del repo

```
public/
  music/                   # i tuoi file audio + playlist
    <genere>/<artista>/<album>/NN-titolo.mp3
    _playlists/            # playlist custom sincronizzate (file json)
    _meta/trackids.json    # mappa stabile path↔id (auto-gestita)
  library.json             # manifest generato da `pnpm ingest`
src/
  components/              # UI riusabili (Cover, TrackRow, Player, …)
  views/                   # schermate (Home, Browse, List, Search, Playlists)
  state/                   # hook: usePlayer, useFavorites, useCustomPlaylists
  lib/                     # types, utils, library loader
  test/                    # setup vitest
tools/
  ingest/ingest.mjs        # CLI che genera library.json
```

## Stack

- Vite + React 18 + TypeScript (strict)
- Tailwind CSS 3
- HTMLAudioElement + Media Session API (lockscreen native su iOS/Android)
- Vitest + happy-dom + @testing-library/react
- PWA-ready (manifest + icon, installabile)
- Zero database, zero backend, zero servizi esterni
