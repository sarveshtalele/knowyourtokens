"""Original background music for the launch videos, synthesized from scratch (no samples, no licences).

    python docs/launch/src/audio/make_music.py OUT.wav SECONDS

An upbeat 112 BPM light-electronic bed: C - G - Am - F, with a soft pad, a plucked arpeggio, sub bass,
four-on-the-floor kick with side-chain ducking, off-beat hats and a light clap. It builds in over
the first bars and fades out at the end, so any length works for a video.
"""

import sys

import numpy as np
import soundfile as sf

SR = 48000
BPM = 112
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)

# C - G - Am - F, as MIDI notes (pad voicing, bass root)
CHORDS = [
    ([60, 64, 67, 71], 36),  # Cmaj7
    ([59, 62, 67, 74], 43),  # G/B
    ([60, 64, 69, 72], 45),  # Am
    ([60, 65, 69, 72], 41),  # F
]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r):
    """Attack/decay/sustain/release envelope over n samples (times in seconds)."""
    t = np.arange(n) / SR
    e = np.ones(n) * s
    e = np.where(t < a, t / max(a, 1e-4), e)
    dm = (t >= a) & (t < a + d)
    e[dm] = 1 - (1 - s) * (t[dm] - a) / max(d, 1e-4)
    rel = t > (n / SR - r)
    e[rel] *= np.clip((n / SR - t[rel]) / max(r, 1e-4), 0, 1)
    return e


def soft_saw(f, t, harmonics=8):
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        out += np.sin(2 * np.pi * f * k * t) / k * (0.85**k)
    return out


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # small inputs only (per note)
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def add(buf, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    j = min(len(buf), i + len(sig))
    if i >= len(buf) or j <= i:
        return
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    buf[i:j, 0] += sig[: j - i] * gain * left
    buf[i:j, 1] += sig[: j - i] * gain * right


def main(out, seconds):
    n = int(seconds * SR)
    pad = np.zeros((n, 2))
    music = np.zeros((n, 2))
    drums = np.zeros((n, 2))
    kick_env = np.zeros(n)

    bars = int(np.ceil(seconds / BAR))
    for b in range(bars):
        t0 = b * BAR
        notes, root = CHORDS[b % 4]
        intensity = min(1.0, 0.35 + b * 0.16)  # builds over the first few bars

        # pad: detuned soft saws, slow attack, gently filtered
        ln = int(BAR * SR) + int(0.4 * SR)
        t = np.arange(ln) / SR
        e = env_adsr(ln, 0.35, 0.6, 0.75, 0.5)
        for k, m in enumerate(notes):
            v = sum(soft_saw(hz(m) * d, t, 6) for d in (0.996, 1.0, 1.004)) / 3
            add(pad, t0, v * e, 0.075, pan=(-0.6, -0.2, 0.2, 0.6)[k])

        # plucked arpeggio in 8ths, an octave up
        arp = [
            notes[0] + 12,
            notes[1] + 12,
            notes[2] + 12,
            notes[3] + 12,
            notes[2] + 12,
            notes[1] + 12,
            notes[2],
            notes[3],
        ]
        for s in range(8):
            ln = int(0.42 * SR)
            t = np.arange(ln) / SR
            f = hz(arp[s])
            tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
            tone *= np.exp(-t * 9) * (1 - np.exp(-t * 400))
            add(music, t0 + s * BEAT / 2, tone, 0.17 * intensity, pan=0.35 if s % 2 else -0.35)

        # sub bass: root on every beat, short and round
        for s in range(4):
            ln = int(BEAT * 0.9 * SR)
            t = np.arange(ln) / SR
            f = hz(root)
            tone = np.tanh(1.6 * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)))
            tone *= env_adsr(ln, 0.01, 0.15, 0.7, 0.08)
            add(music, t0 + s * BEAT, tone, 0.085 * intensity)

        if b >= 2:  # drums enter on bar 3
            for s in range(4):
                bt = t0 + s * BEAT
                # kick: pitch-dropping sine
                ln = int(0.32 * SR)
                t = np.arange(ln) / SR
                freq = 45 + 85 * np.exp(-t * 28)
                phase = 2 * np.pi * np.cumsum(freq) / SR
                k = np.sin(phase) * np.exp(-t * 11)
                add(drums, bt, k, 0.28)
                i = int(bt * SR)
                j = min(n, i + ln)
                if j > i:
                    kick_env[i:j] = np.maximum(kick_env[i:j], np.exp(-t[: j - i] * 7))
                # off-beat hat: bright, very short noise
                ln = int(0.06 * SR)
                t = np.arange(ln) / SR
                hat = rng.standard_normal(ln)
                hat = hat - np.concatenate(([0], hat[:-1]))  # crude high-pass
                add(drums, bt + BEAT / 2, hat * np.exp(-t * 70), 0.04, pan=0.25)
                # light clap on 2 and 4
                if s in (1, 3) and b >= 4:
                    ln = int(0.18 * SR)
                    t = np.arange(ln) / SR
                    cl = rng.standard_normal(ln)
                    cl = lowpass(cl - np.concatenate(([0], cl[:-1])), 5000)
                    add(drums, bt, cl * np.exp(-t * 22), 0.12)

    # side-chain: pad, arp and bass dip under each kick
    duck = 1 - 0.55 * kick_env
    mix = (pad + music) * duck[:, None] + drums

    # master: gentle saturation, fades, normalise
    mix = np.tanh(mix * 1.2) / 1.2
    fade_in = np.clip(np.arange(n) / (1.5 * SR), 0, 1)
    fade_out = np.clip((n - np.arange(n)) / (3.0 * SR), 0, 1)
    mix *= (fade_in * fade_out)[:, None]
    mix /= np.max(np.abs(mix)) + 1e-9
    sf.write(out, (mix * 0.89).astype(np.float32), SR, subtype="PCM_16")


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]))
