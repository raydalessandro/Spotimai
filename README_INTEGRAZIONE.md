# Risonanze — Pacchetto integrazione Spotimai

Pacchetto di **8 tracce loop-safe** per il nuovo genere **"Risonanze"** di Spotimai. Contiene il primo blocco: artista `Binaurali` con 4 use case (Sleep, Focus, Meditation, Recovery), ciascuno in 2 varianti (binaural puro per cuffie / monaural + pad ambient per cuffie o speaker).

## Cosa fare

1. **Copia** la cartella `public/music/risonanze/` dentro `Spotimai/public/music/`.
   Risultato:
   ```
   Spotimai/public/music/
   ├── boom-bap/
   ├── cantautori-internazionali/
   ├── cantautori-italiani/
   └── risonanze/                          ← NUOVO
       └── binaurali/
           ├── deep-sleep-binaural/        01-delta-2hz-binaural.mp3
           ├── deep-sleep-ambient/         01-delta-2hz-ambient.mp3
           ├── calm-focus-binaural/        01-alpha-10hz-binaural.mp3
           ├── calm-focus-ambient/         01-alpha-10hz-ambient.mp3
           ├── meditation-binaural/        01-theta-6hz-binaural.mp3
           ├── meditation-ambient/         01-theta-6hz-ambient.mp3
           ├── recovery-binaural/          01-theta-6hz-recovery-binaural.mp3
           └── recovery-ambient/           01-theta-6hz-recovery-ambient.mp3
   ```

2. **`pnpm ingest`** — il CLI rileverà 8 nuove tracce, nuovo genere `Risonanze`, nuovo artista `Binaurali`, 8 album. Tutti i tag ID3 sono già scritti correttamente. Nessuna modifica all'ingest necessaria.

3. **Commit**: `public/music/risonanze/`, `public/library.json`, `public/music/_meta/trackids.json`.

## Conformità a CLAUDE.md

Tutto rispetta la tassonomia esistente:
- Path: `public/music/<genere>/<artista>/<album>/NN-titolo.mp3` ✓
- Naming `[a-z0-9-]+` per cartelle e file ✓
- Tag ID3 completi (title, artist, album_artist, album, year, genre, track, comment) ✓
- mp3 192 kbps ✓
- Nessun servizio esterno, nessun DB, filesystem-as-database ✓

## La storia dei bollini (UNICA cosa fuori standard)

Le 8 tracce hanno **due modalità d'uso diverse** che vanno comunicate all'utente in UI. Questo è il solo elemento che esce dallo standard attuale dell'app.

### I due tipi di traccia

| Variante | Come funziona | Dove ascoltarla |
|---|---|---|
| **Binaural puro** | Due toni continui diversi a sx e dx (es. 199 Hz / 201 Hz). Il "battimento" emerge SOLO nel cervello dall'integrazione dei due segnali. In speaker mono i due toni si mixano e l'effetto sparisce. | **Solo cuffie** 🎧 |
| **Monaural + pad** | I due toni sono mixati prima nel file: il battimento esiste FISICAMENTE nel segnale audio (l'onda si gonfia/sgonfia a 2/6/10 Hz). Un pad armonico (Re minore / Re maggiore / Sol minore / Mi minore) sopra maschera la pulsazione. | **Cuffie consigliate, ok speaker** 🔉 |

### Tre stati di bollino (per il futuro: copre anche le categorie non in questo pacchetto)

| Bollino | Significato | Quando usarlo |
|---|---|---|
| 🎧 **Solo cuffie** | Effetto richiede separazione stereo dei canali | Album `*-binaural` di questo pacchetto |
| 🔉 **Cuffie consigliate** | Funziona ovunque, in cuffia è meglio | Album `*-ambient` di questo pacchetto |
| 🔊 **Libero** | Nessun vincolo audio | Future categorie (musica 432 Hz, classica, vagal tone) — non incluse in questo pacchetto |

### Due strade per implementare il bollino

**Strada A — Minimale, zero codice** (raccomandata per il primo deploy)
Il bollino è già nel titolo del brano: `"Delta 2 Hz · binaural · 5 min loop"` contiene la parola "binaural" o "ambient". L'utente capisce dal titolo. Zero modifiche al codice, gira subito.

**Strada B — Pulita, schema v2** (per quando avrai feedback e vorrai un badge UI)
Bumpa `library.json` a `schemaVersion: 2` e aggiungi due campi opzionali al type `Track`:
```ts
type Track = {
  id: string
  title: string
  artist: string
  album: string
  genre: string
  duration: number
  path: string
  // NUOVI (opzionali, retrocompatibili)
  frequencyHz?: number          // 2, 6, 10, ...
  headphones?: 'required' | 'recommended' | 'optional'
}
```

Per popolare automaticamente i campi nuovi senza riscrivere i tag mp3, l'ingest può inferirli dal path/album:
```js
// In tools/ingest/ingest.mjs, dentro la funzione che costruisce l'oggetto track:
if (genre === 'risonanze' || genreMeta === 'Risonanze') {
  // Estrai Hz dal titolo o dall'album slug
  const hzMatch = path.match(/(\d+(?:\.\d+)?)-?hz/i)
  if (hzMatch) track.frequencyHz = parseFloat(hzMatch[1])
  
  // Modalità da suffisso album slug
  if (album.toLowerCase().includes('binaural')) {
    track.headphones = 'required'
  } else if (album.toLowerCase().includes('ambient')) {
    track.headphones = 'recommended'
  }
}
```

E nel `TrackRow` componente, un piccolo badge:
```tsx
{track.headphones === 'required' && <Headphones className="w-3 h-3 text-emerald-400" title="Solo cuffie" />}
{track.headphones === 'recommended' && <Headphones className="w-3 h-3 text-zinc-400" title="Cuffie consigliate" />}
```

**Raccomandazione**: parti con strada A. Quando Ray ha testato e vuole UI dedicata, passa a B.

## Dettagli tecnici delle tracce

Tutte le tracce sono **5 minuti**, **44.1 kHz**, **mp3 192 kbps**, **loop matematicamente perfetto**.

### Loop seamless garantito per costruzione

Non c'è crossfade artificiale. Tutte le frequenze (carrier, beat, pad fundamental, LFO degli inviluppi) sono scelte come multipli interi di `1/durata`, così completano un numero intero di cicli in 300 secondi. Con `endpoint=False` in `numpy.linspace`, l'ultimo sample del file è esattamente quello che precederebbe il primo sample del loop successivo → continuità matematica perfetta, zero click.

Verifica: la derivata massima del segnale alla giunzione di loop è ≈ 1.0× rispetto alla derivata nel mezzo della traccia.

### Frequenze per use case

| Use case | Beat (Hz) | Stato cerebrale | Carrier (Hz) | Pad (mood) |
|---|---|---|---|---|
| Deep Sleep | **2** | Delta — sonno profondo | 200 | Re minore (72/108/144) |
| Calm Focus | **10** | Alpha — focus calmo, ansia bassa | 240 | Re maggiore (90/144/180) |
| Meditation | **6** | Theta — meditazione, creatività | 220 | Sol minore (96/144/192) |
| Recovery | **6** | Theta — recupero post-workout | 180 | Mi minore (84/132/168) |

Sleep e Focus/Meditation/Recovery sono separati per use case anche se Meditation e Recovery condividono 6 Hz: contesto d'uso, mood pad e carrier diversi giustificano due "album" distinti.

### Livelli

- Binaural: -9 dBFS per canale (in cuffia si sommano percettivamente a livello comodo)
- Ambient: -6 dBFS picco (musica + battito, headroom standard)

## Cosa NON è in questo pacchetto (per fasi future)

- Versioni più lunghe (es. 10 min) — al momento basta loop di 5 min nell'app
- Album "Calm Focus" / "Meditation" / "Recovery" con varianti di carrier multiple
- Altri artisti dentro `risonanze/`: `frequenza-432/`, `vagal-tone/`, `classica-curata/`
- Cover art per gli album (gradient deterministico via hash funziona già out-of-the-box)

## Note di fonti

L'efficacia clinica delle frequenze scelte è supportata da:
- **Delta 2 Hz / sonno**: meta-analisi multiple, pilot studies con 70% di response rate in 4 settimane
- **Alpha 10 Hz / ansia e focus**: meta-analisi su 22 studi (g=0.45), evidenze anche perioperatorie (SMD = -1.38)
- **Theta 6 Hz / meditazione e recovery**: RCT doppio cieco con aumento parasimpatico HRV post-esercizio

Niente claim medici nei testi UI — è musica per stati, non terapia. Restiamo legalmente e eticamente puliti.
