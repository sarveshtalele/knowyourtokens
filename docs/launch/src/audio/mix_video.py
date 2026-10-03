"""Mix narration, music and sound effects into a silent screen recording, scene by scene.

    python mix_video.py SEGMENTS_DIR VOICE_DIR MUSIC.wav OUT.mp4 [--sfx WHOOSH.mp3]
    python mix_video.py --timeline VIDEO.mp4 VOICE_DIR 0,4,8.5 MUSIC.wav OUT.mp4 [--sfx WHOOSH.mp3]

VOICE_DIR/lines.tsv ("<scene>\t<text>" per line) is also turned into OUT.srt captions with the exact
timings used in the mix.

Each scene NN-name.mp4 in SEGMENTS_DIR is paired with VOICE_DIR/NN-name.wav. A scene that is shorter
than its line is held on its last frame before the fade-out, so nothing is cut off. The voice starts
0.25 s into the scene, warmed and lifted for clarity; the music sits low and ducks under it (side-chain),
and the whole mix is normalised to the -14 LUFS YouTube target.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

LEAD, TAIL, FADE = 0.25, 0.45, 0.3
# Levels before loudness normalisation: the voice leads, the music sits well under it (and ducks a
# further ~10 dB while someone is speaking).
VOICE, MUSIC = 1.6, 0.11


def dur(p):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(p)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return float(json.loads(out)["format"]["duration"])


# How a few phrases are written for the voice vs. shown in captions.
SPOKEN = [
    ("N P X know your tokens", "npx knowyourtokens"),
    ("N D JSON", "NDJSON"),
    ("two hundred eighty-seven thousand", "287,000"),
    ("two hundred eighty-eight thousand", "288,000"),
    ("three hundred twelve thousand", "312,000"),
    ("Ninety-two percent", "92%"),
]


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def write_srt(path, cues):
    """cues: [(start, duration, text)]; long lines are split by sentence, timed by length."""
    out, n = [], 0
    for start, length, text in cues:
        parts = [p for p in re.split(r"(?<=[.?!:])\s+", text.strip()) if p]
        total = sum(len(p) for p in parts) or 1
        t = start
        for p in parts:
            d = length * len(p) / total
            n += 1
            shown = p
            for said, shown_as in SPOKEN:
                shown = re.sub(re.escape(said), shown_as, shown, flags=re.IGNORECASE)
            out.append(f"{n}\n{srt_time(t)} --> {srt_time(t + d)}\n{shown}\n")
            t += d
    Path(path).write_text("\n".join(out), encoding="utf-8")


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def main(seg_dir, voice_dir, music, out, sfx=None):
    seg_dir, voice_dir, work = Path(seg_dir), Path(voice_dir), Path(out).with_suffix(".work")
    work.mkdir(exist_ok=True)
    vids, voices, starts, cues, t = [], [], [], [], 0.0
    for seg in sorted(seg_dir.glob("*.mp4")):
        vd = dur(seg)
        voice = voice_dir / (seg.stem + ".wav")
        vo = dur(voice) if voice.exists() else 0.0
        target = max(vd, LEAD + vo + TAIL)
        fixed = work / seg.name
        if target > vd + 0.02:
            hold = target - vd
            ff(
                "-i", str(seg), "-filter_complex",
                f"[0:v]trim=0:{vd - FADE:.3f},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={hold:.3f}[a];"
                f"[0:v]trim={vd - FADE:.3f}:{vd:.3f},setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]",
                "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-r", "30", "-pix_fmt", "yuv420p",
                str(fixed),
            )  # fmt: skip
        else:
            fixed = seg
        vids.append(fixed)
        if voice.exists():
            voices.append((voice, t + LEAD))
            lines = voice_dir / "lines.tsv"
            if lines.exists():
                text = dict(row.split("\t", 1) for row in lines.read_text().splitlines() if "\t" in row)
                if seg.stem in text:
                    cues.append((t + LEAD, vo, text[seg.stem]))
        starts.append(t)
        t += dur(fixed)
    total = t

    # picture: join the scenes
    listing = work / "list.txt"
    listing.write_text("".join(f"file '{v.resolve()}'\n" for v in vids))
    picture = work / "picture.mp4"
    ff("-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(picture))
    mix(picture, total, voices, starts, cues, music, out, sfx, work)


def timeline(video, voice_dir, times, music, out, sfx=None):
    """A finished video (e.g. the reel) plus scene start times: line N of lines.tsv starts at times[N]."""
    voice_dir, work = Path(voice_dir), Path(out).with_suffix(".work")
    work.mkdir(exist_ok=True)
    starts = [float(x) for x in times.split(",")]
    rows = [r.split("\t", 1) for r in (voice_dir / "lines.tsv").read_text().splitlines() if "\t" in r]
    voices, cues = [], []
    for (scene, text), at in zip(rows, starts, strict=True):
        wav = voice_dir / f"{scene}.wav"
        voices.append((wav, at + LEAD))
        cues.append((at + LEAD, dur(wav), text))
    mix(Path(video), dur(video), voices, starts, cues, music, out, sfx, work)


def mix(picture, total, voices, starts, cues, music, out, sfx, work):

    # narration: every line placed at its scene's start
    inputs, chains = [], []
    for i, (v, at) in enumerate(voices):
        inputs += ["-i", str(v)]
        ms = int(at * 1000)
        chains.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[v{i}]")
    mixv = "".join(f"[v{i}]" for i in range(len(voices)))
    narration = work / "narration.wav"
    ff(
        *inputs, "-filter_complex",
        ";".join(chains) + f";{mixv}amix=inputs={len(voices)}:normalize=0,apad,atrim=0:{total:.3f}[o]",
        "-map", "[o]", str(narration),
    )  # fmt: skip

    # effects: a soft whoosh into every scene after the first
    fx_inputs, fx_chain, fx_labels = [], [], ""
    if sfx:
        for i, s in enumerate(starts[1:]):
            fx_inputs += ["-i", sfx]
            ms = max(0, int((s - 0.18) * 1000))
            fx_chain.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.14,adelay={ms}|{ms}[f{i}]")
            fx_labels += f"[f{i}]"
    effects = work / "effects.wav"
    if fx_inputs:
        ff(
            *fx_inputs, "-filter_complex",
            ";".join(fx_chain) + f";{fx_labels}amix=inputs={len(fx_chain)}:normalize=0,apad,atrim=0:{total:.3f}[o]",
            "-map", "[o]", str(effects),
        )  # fmt: skip
    else:
        ff("-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={total:.3f}", str(effects))

    # final mix: music ducked under the voice, then loudness-normalised
    ff(
        "-i", str(picture), "-i", str(narration), "-i", str(music), "-i", str(effects),
        "-filter_complex",
        "[1:a]asplit=2[vo][key];"
        f"[2:a]aresample=48000,atrim=0:{total:.3f},afade=t=out:st={max(0, total - 3):.3f}:d=3,volume={MUSIC}[m];"
        "[m][key]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=400[mduck];"
        "[vo]highpass=f=60,lowshelf=f=140:g=2.5,equalizer=f=3000:t=q:w=1:g=2,"
        f"acompressor=threshold=0.08:ratio=3.5:attack=5:release=120,volume={VOICE}[voc];"
        "[voc][mduck][3:a]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]",
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart", "-shortest", str(out),
    )  # fmt: skip
    if cues:
        write_srt(Path(out).with_suffix(".srt"), cues)
    print(f"{out}: {total:.1f}s, {len(voices)} lines")


if __name__ == "__main__":
    args = sys.argv[1:]
    sfx = None
    if "--sfx" in args:
        k = args.index("--sfx")
        sfx = args[k + 1]
        del args[k : k + 2]
    if args and args[0] == "--timeline":  # --timeline VIDEO VOICE_DIR START,START,... MUSIC OUT
        timeline(*args[1:], sfx=sfx)
    else:
        main(*args, sfx=sfx)
