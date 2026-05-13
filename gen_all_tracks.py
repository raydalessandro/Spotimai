"""
Genera 8 tracce loop-safe per Spotimai / Risonanze / Binaurali.

4 frequenze × 2 varianti (binaural puro + ambient monaural):
- Delta 2 Hz   → Deep Sleep
- Alpha 10 Hz  → Calm Focus
- Theta 6 Hz   → Meditation
- Theta 6 Hz   → Recovery (stessa frequenza, mood ambient diverso)

Tutte le tracce sono 5 min (300s), loop-perfect per costruzione matematica
(tutte le frequenze completano un numero intero di cicli in DUR).

Output: WAV stereo 44.1 kHz 16-bit. Encoding mp3 separato via ffmpeg.
"""
import numpy as np
from scipy.io import wavfile
from pathlib import Path

SR = 44100
DUR = 5 * 60  # 300s
N = int(SR * DUR)
t = np.linspace(0, DUR, N, endpoint=False)

OUT = Path('/home/claude/wav_out')
OUT.mkdir(exist_ok=True)


def to_int16(arr):
    return (np.clip(arr, -1.0, 1.0) * 32767).astype(np.int16)


def norm_dbfs(x, target_db):
    peak = np.max(np.abs(x))
    return x * (10 ** (target_db / 20.0) / peak) if peak > 0 else x


def make_binaural(beat_hz, carrier_hz=200.0, target_db=-9.0):
    """
    Binaural puro: due toni separati, nessuna pulsazione fisica.
    Funziona SOLO in cuffia. Beat emerge dall'integrazione cerebrale.
    """
    f_low = carrier_hz - beat_hz / 2.0
    f_high = carrier_hz + beat_hz / 2.0
    left = norm_dbfs(np.sin(2 * np.pi * f_low * t), target_db)
    right = norm_dbfs(np.sin(2 * np.pi * f_high * t), target_db)
    return np.column_stack([left, right])


def make_ambient(beat_hz, carrier_hz, pad_fundamentals, pad_mix=0.7, beat_mix=0.25,
                 target_db=-6.0, env_cycles=(3, 5, 2)):
    """
    Monaural beat + pad ambient.
    Funziona in cuffia E in speaker. Pad maschera il battito fisico.
    
    pad_fundamentals: tuple (f1, f2, f3) - frequenze del pad armonico
                      DEVONO completare cicli interi in DUR per loop-safety
    env_cycles: numero di cicli LFO per i tre inviluppi (deve essere intero)
    """
    # Battimento monaural
    f_low = carrier_hz - beat_hz / 2.0
    f_high = carrier_hz + beat_hz / 2.0
    beat = (np.sin(2 * np.pi * f_low * t) + np.sin(2 * np.pi * f_high * t)) / 2.0
    
    # Pad: 3 voci con seconda armonica per timbro caldo
    f1, f2, f3 = pad_fundamentals
    v1 = np.sin(2*np.pi*f1*t) + 0.3*np.sin(2*np.pi*f1*2*t)
    v2 = np.sin(2*np.pi*f2*t) + 0.2*np.sin(2*np.pi*f2*2*t)
    v3 = 0.5 * np.sin(2*np.pi*f3*t)
    
    # Inviluppi LFO loop-safe
    c1, c2, c3 = env_cycles
    e1 = 0.5 + 0.5 * np.sin(2*np.pi*(c1/DUR)*t)
    e2 = 0.5 + 0.5 * np.sin(2*np.pi*(c2/DUR)*t + np.pi)
    e3 = 0.5 + 0.5 * np.sin(2*np.pi*(c3/DUR)*t + np.pi/2)
    
    pad = v1*e1 + v2*e2*0.7 + v3*e3*0.6
    
    mix = pad_mix * pad + beat_mix * beat
    mix = norm_dbfs(mix, target_db)
    
    return np.column_stack([mix, mix])  # monaural = stesso a L e R


# ============================================================
# Definizione delle 8 tracce
# Pad fundamentals scelti come moltipli interi di (1/DUR) -> loop-safe
# Mood pad diversi per use case:
#   - Sleep:      Re minore   (72, 108, 144)   = scuro, basso, avvolgente
#   - Focus:      Re maggiore (90, 144, 180)   = chiaro, neutro, non sonnolento
#   - Meditation: Sol minore  (96, 144, 192)   = aperto, contemplativo
#   - Recovery:   Mi minore   (84, 132, 168)   = caldo, organico, decompressivo
# Tutti i valori sono moltipli di 1/300 = 0.00333Hz, quindi tutti loop-safe
# ============================================================

tracks = [
    # SLEEP (Delta 2 Hz)
    {
        'fname': '01-delta-2hz-binaural.mp3',
        'data': make_binaural(beat_hz=2.0, carrier_hz=200.0),
        'title': 'Delta 2 Hz · binaural · 5 min loop',
        'album': 'Deep Sleep Binaural',
        'comment': 'Binaural beat 2 Hz (199L/201R). Solo cuffie. Loop-safe.',
    },
    {
        'fname': '01-delta-2hz-ambient.mp3',
        'data': make_ambient(beat_hz=2.0, carrier_hz=200.0,
                             pad_fundamentals=(72.0, 108.0, 144.0)),
        'title': 'Delta 2 Hz · ambient · 5 min loop',
        'album': 'Deep Sleep Ambient',
        'comment': 'Monaural beat 2 Hz + pad Re minore. Cuffie consigliate, ok speaker. Loop-safe.',
    },
    # FOCUS (Alpha 10 Hz)
    {
        'fname': '01-alpha-10hz-binaural.mp3',
        'data': make_binaural(beat_hz=10.0, carrier_hz=240.0),
        'title': 'Alpha 10 Hz · binaural · 5 min loop',
        'album': 'Calm Focus Binaural',
        'comment': 'Binaural beat 10 Hz (235L/245R). Solo cuffie. Loop-safe.',
    },
    {
        'fname': '01-alpha-10hz-ambient.mp3',
        'data': make_ambient(beat_hz=10.0, carrier_hz=240.0,
                             pad_fundamentals=(90.0, 144.0, 180.0)),
        'title': 'Alpha 10 Hz · ambient · 5 min loop',
        'album': 'Calm Focus Ambient',
        'comment': 'Monaural beat 10 Hz + pad Re maggiore. Cuffie consigliate, ok speaker. Loop-safe.',
    },
    # MEDITATION (Theta 6 Hz)
    {
        'fname': '01-theta-6hz-binaural.mp3',
        'data': make_binaural(beat_hz=6.0, carrier_hz=220.0),
        'title': 'Theta 6 Hz · binaural · 5 min loop',
        'album': 'Meditation Binaural',
        'comment': 'Binaural beat 6 Hz (217L/223R). Solo cuffie. Loop-safe.',
    },
    {
        'fname': '01-theta-6hz-ambient.mp3',
        'data': make_ambient(beat_hz=6.0, carrier_hz=220.0,
                             pad_fundamentals=(96.0, 144.0, 192.0)),
        'title': 'Theta 6 Hz · ambient · 5 min loop',
        'album': 'Meditation Ambient',
        'comment': 'Monaural beat 6 Hz + pad Sol minore. Cuffie consigliate, ok speaker. Loop-safe.',
    },
    # RECOVERY (Theta 6 Hz, mood diverso)
    {
        'fname': '01-theta-6hz-recovery-binaural.mp3',
        'data': make_binaural(beat_hz=6.0, carrier_hz=180.0),  # carrier diverso per timbro
        'title': 'Theta 6 Hz · recovery · binaural · 5 min loop',
        'album': 'Recovery Binaural',
        'comment': 'Binaural beat 6 Hz post-workout (177L/183R). Solo cuffie. Loop-safe.',
    },
    {
        'fname': '01-theta-6hz-recovery-ambient.mp3',
        'data': make_ambient(beat_hz=6.0, carrier_hz=180.0,
                             pad_fundamentals=(84.0, 132.0, 168.0),  # Mi minore caldo
                             env_cycles=(2, 3, 5)),  # evoluzione diversa per varietà
        'title': 'Theta 6 Hz · recovery · ambient · 5 min loop',
        'album': 'Recovery Ambient',
        'comment': 'Monaural beat 6 Hz + pad Mi minore. Recovery post-workout. Cuffie consigliate, ok speaker. Loop-safe.',
    },
]

# Salvo tutti i WAV
for track in tracks:
    wav_path = OUT / track['fname'].replace('.mp3', '.wav')
    wavfile.write(str(wav_path), SR, to_int16(track['data']))

# Verifica loop su tutte
print("=== Verifica loop seamless su tutte le tracce ===")
all_ok = True
for track in tracks:
    wav_path = OUT / track['fname'].replace('.mp3', '.wav')
    _, data = wavfile.read(str(wav_path))
    looped = np.concatenate([data, data])
    n = len(data)
    junction = looped[n-100:n+100, 0].astype(np.float64)
    middle = data[n//2-100:n//2+100, 0].astype(np.float64)
    ratio = np.max(np.abs(np.diff(junction))) / np.max(np.abs(np.diff(middle)))
    status = "✓" if ratio < 1.5 else "✗"
    if ratio >= 1.5:
        all_ok = False
    print(f"  {status} {track['fname']:42s} ratio={ratio:.3f}")

print(f"\n{'✓ TUTTE LE TRACCE LOOP-PERFECT' if all_ok else '✗ ERRORE LOOP'}")
print(f"Generate {len(tracks)} tracce in {OUT}")

# Salvo anche metadata per encoding ffmpeg
import json
meta_path = OUT / 'metadata.json'
with open(meta_path, 'w') as f:
    json.dump([{k: v for k, v in t.items() if k != 'data'} for t in tracks], f, indent=2, ensure_ascii=False)
print(f"Metadata: {meta_path}")
