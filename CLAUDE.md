# CLAUDE.md — own·music

Convenzioni e decisioni chiuse per questo progetto. Leggere prima di proporre modifiche strutturali.

## Cos'è

PWA personale per ascoltare musica. Uso familiare privato, non pubblico, niente auth seria. Architettura "filesystem as database": gli mp3 vivono in `public/music/<genere>/<artista>/<album>/NN-titolo.mp3` e un CLI (`pnpm ingest`) genera `public/library.json` con tutti i metadata e le auto-playlist. Niente DB, niente backend custom, niente servizi esterni.

## Stack

- **Vite + React 18 + TypeScript** (strict)
- **Tailwind CSS 3**
- **lucide-react** per icone
- **music-metadata** (Node) per parsing ID3 nel CLI di ingest
- **Vitest + happy-dom + @testing-library/react** per i test
- **HTMLAudioElement** nativo + **Media Session API** per controlli lockscreen
- **localStorage** per favorites e bozze playlist (per-device, niente sync)
- **Cloudflare Pages / Vercel** come hosting di file statici

## Decisioni chiuse (non rinegoziare senza ragione forte)

- **Niente servizi esterni.** Storage = filesystem dentro al repo (o LFS in futuro), niente R2/S3/Worker.
- **Niente DB.** `library.json` rigenerato dal CLI. Custom playlist sincronizzate in `public/music/_playlists/*.json`.
- **Sorgente di verità per le playlist: il manifest.** Le playlist create dall'app vivono in `localStorage` come bozze finché non vengono esportate in `_playlists/` e committate. Dopo `pnpm ingest` la bozza locale viene rimossa automaticamente (dedup per `id` o per nome normalizzato).
- **Stable Track ID = nanoid persistito** in `public/music/_meta/trackids.json`. Se un file viene rinominato, l'ID resta lo stesso (matching tramite hash md5 del primo MB).
- **Naming convention vincolante**: solo `[a-z0-9-]+` per cartelle e nomi file. Il CLI valida e avverte.
- **Schema versionato**: `library.json` ha `schemaVersion: 1`. Bumpare a 2 se cambia la struttura. Anche `localStorage` per le bozze playlist ha `schemaVersion: 1`.
- **Lingua UI: italiano.**
- **Tema: dark zinc + accenti emerald** (now-playing, toggle attivi) + **rosa-400** per cuori preferiti.
- **Typography**: Inter (body) / Cormorant Garamond (display serif) / JetBrains Mono (metadata).
- **Cover placeholder**: gradient deterministico via hash del seed (album/playlist/artista). Niente immagini AI generate.

## Architettura

```
src/
  components/   componenti UI presentational (no business logic, no state)
  views/        schermate complete; ricevono props da App.tsx
  state/        custom hooks (usePlayer, useFavorites, useCustomPlaylists, useHistory)
  lib/          types, utils puri, fetch del manifest
  test/         setup vitest (clear localStorage tra i test)
```

- `App.tsx` è il root: tiene view+history (mini-router custom), inizializza player+favorites+playlists, passa props a tutte le view via un oggetto `ViewProps` condiviso. Intercetta `popstate` (tasto indietro hardware Android PWA / back browser) con un sentinel `history.pushState` al mount: priorità di chiusura → modal AddToPlaylist → modal CreatePlaylist → FullPlayer → goBack sullo stack di view → uscita dall'app.
- **Tutti i componenti vivono a livello modulo, MAI definiti dentro la function component App.** Definirli dentro causa rimontaggi a ogni render e perdita di stato/eventi (era il bug della prima versione).
- **Hook `usePlayer`** wrappa un singolo `HTMLAudioElement` ref-stable, espone playTrack/togglePlay/skipNext/skipPrev/seek/toggleShuffle/cycleRepeat. Gestisce Media Session API per i metadata su lockscreen.
- **Hook `useCustomPlaylists`** persiste le bozze in `localStorage` (`own-music:drafts`) e dedupa automaticamente verso `library.customPlaylists` per `id` o nome normalizzato.
- **Hook `useHistory`** traccia le ultime 20 tracce riprodotte in `localStorage` (`own-music:history`, schemaVersion 1) con dedup move-to-top. Alimentato da `handlePlay` in `App.tsx`; consumato dalla sezione "Ultime riprodotte" della Home.

## Workflow di sviluppo

1. Sviluppo: `pnpm dev` (o `npm run dev`)
2. Test: `pnpm test` (one-shot) o `pnpm test:watch`
3. Build: `pnpm build` (tsc + vite)
4. Deploy: push su GitHub → Vercel auto-deploya

## Workflow di caricamento musica

> Questo è il pezzo critico. Seguirlo alla lettera per mantenere coerenza, evitare doppioni e cataloghi sporchi.

### Formato file accettato

- **mp3** (preferito, supporto totale lockscreen su iOS/Android), m4a, flac, ogg, opus, wav.
- Bitrate consigliato: **192–320 kbps** per mp3. Sotto i 128 kbps si sente.
- Niente DRM. Niente file con protezione, niente Apple Music protetti, niente Spotify rip dubbi.

### Tassonomia obbligatoria

```
public/music/<genere>/<artista>/<album>/NN-titolo.mp3
```

- **`<genere>`**: macro-categoria (`cantautori-italiani`, `boom-bap`, `jazz`, `elettronica`, …). NON usare il nome di un artista come genere. Cartella unica per famiglia di suoni, non per sotto-sottogenere.
- **`<artista>`**: nome artista normalizzato (es. `lucio-dalla`, `wu-tang-clan`).
- **`<album>`**: nome album normalizzato. Se l'album è eponimo (stesso nome dell'artista), aggiungi l'anno per disambiguare: `lucio-dalla-1979`.
- **`NN-titolo`**: numero traccia 2 cifre + slug titolo. Per singoli usa `01-`.

### Regole di naming (validate dal CLI)

- **Solo `[a-z0-9-]`** in tutti i nomi cartella e file. Niente spazi, niente accenti, niente caratteri speciali, niente maiuscole.
- Trasformazioni standard:
  - "Lucio Dalla" → `lucio-dalla`
  - "L'anno che verrà" → `l-anno-che-verra`
  - "Wu-Tang Clan" → `wu-tang-clan`
  - "Café del Mar" → `cafe-del-mar`

### Tag ID3 obbligatori

I tag ID3 dentro al file MP3 sono **sempre la sorgente preferita** dall'ingest. Il path serve solo da fallback. Quindi prima di committare un file imposta:

- `title` — titolo ufficiale della canzone (con maiuscole, accenti, apostrofi naturali)
- `artist` — nome artista (idem, naturale)
- `album_artist` — uguale a artist (utile per compilation)
- `album` — nome album naturale
- `date` — anno (4 cifre, es. `1979`)
- `genre` — genere leggibile (es. `Cantautori Italiani`)
- `track` — numero traccia (intero)

Come scriverli con `ffmpeg` (preserva l'audio senza re-encode):

```bash
ffmpeg -y -i input.mp3 -c copy \
  -id3v2_version 3 -write_id3v1 1 \
  -metadata title="Titolo Naturale" \
  -metadata artist="Artista" \
  -metadata album_artist="Artista" \
  -metadata album="Album" \
  -metadata date="YYYY" \
  -metadata genre="Genere" \
  -metadata track="N" \
  public/music/<genere>/<artista>/<album>/NN-titolo.mp3
```

### Verifica anti-doppioni e coerenza (checklist prima di committare)

Quando arrivano nuovi file (sopratutto da download di terze parti), **fare sempre questi controlli**:

1. **Coerenza titolo ↔ realtà**: il nome del file e i tag dichiarano davvero quel titolo? Casi tipici:
   - Il file dice "Caro amico ti scrivo" ma la canzone si chiama **"L'anno che verrà"** (è il primo verso).
   - Il file dice "Bohemian" ma è **"Bohemian Rhapsody"** (troncato).
   - Live mascherato da studio o viceversa.
2. **Doppioni nel manifest**: cercare `title`+`artist` esistenti in `public/library.json` prima di aggiungere. Se esiste già, decidere: stessa take? skippare. Versione diversa (live, remix, remaster)? rinominare l'album/aggiungere suffisso al titolo (es. `Attenti al lupo (Live 1995)`).
3. **Album coerente con l'artista**: se due tracce sembrano dello stesso album ma con date diverse, probabilmente una è ristampa/raccolta. Decidere se rinominare uno dei due.
4. **Genere già esistente**: se metti una traccia nuova in un genere, controlla in `library.json > autoPlaylists.byGenre` che esista già — meglio riusare la stessa cartella che spawnarne una quasi-identica.

### Procedura completa

1. Verifica i tag ID3 di partenza:
   ```bash
   node -e "import('music-metadata').then(async({parseFile})=>{const m=await parseFile(process.argv[1],{duration:true});console.log(m.common)})" path/al/file.mp3
   ```
2. Scrivi/correggi i tag ID3 come da template sopra.
3. Sposta il file in `public/music/<genere>/<artista>/<album>/NN-titolo.mp3`.
4. `pnpm ingest` — leggi il report:
   - `+ N aggiunte` → nuove tracce indicizzate
   - `~ N rinominate (ID stabile)` → file spostati ma ID conservato via md5
   - `- N rimosse dalla mappa` → file non più presenti
   - Eventuali warning sul naming → correggi prima di committare
5. Verifica visivamente `public/library.json` (nuove tracce hanno tutti i campi giusti).
6. Commit di tutto: `public/music/`, `public/library.json`, `public/music/_meta/trackids.json`.

## TODO ordinati per priorità

1. ✅ **Playlist custom CRUD lato app** (fatto: bozze locali in localStorage + export JSON).
2. ✅ **Cronologia ascolti** (fatto: `useHistory` in localStorage, ultime 20 tracce, sezione "Ultime riprodotte" in Home). Migrare a IndexedDB solo se serve persistenza più robusta o storia più lunga.
3. **Service Worker per offline + caching mp3** (PWA seria).
4. **Cover art** estratta dai tag ID3 quando presente, fallback su `_cover.jpg` nella cartella album, fallback su gradient.
5. **Coda visibile** come pannello laterale/bottom sheet.
6. **Smart playlists** (filtri dinamici: "tutto Wu-Tang", "tracce sotto i 3 min", ecc).
7. **Git LFS** per gli mp3 quando il repo si avvicina a 1 GB (~200 tracce a 5 MB).

## Anti-pattern da evitare

- ❌ Definire componenti dentro `App.tsx` o dentro altre function components → rimontaggi
- ❌ Aggiungere DB / backend / auth complessa → contraddice la filosofia del progetto
- ❌ Servizi esterni (Spotify API, last.fm, ecc) per uso privato familiare → overkill e dipendenze
- ❌ Cover art generate da AI → niente slop
- ❌ Inter ovunque → la combinazione serif/sans/mono è scelta deliberata
- ❌ Caricare file con tag ID3 mancanti o sbagliati → si producono manifest sporchi e doppioni
- ❌ Usare il nome dell'artista come genere → la cartella genere serve per raggruppare artisti
- ❌ Catalogare un brano con il primo verso invece del titolo ufficiale → casino sui doppioni futuri
