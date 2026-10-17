# Bande son : lit plan/beats.json (voix off + repères) ; nappe et effets procéduraux (graine fixe),
# voix posées à leur voiceStart. Usage : python3 -I src/make_audio.py <bed.wav> <mix.wav>
import json, math, random, struct, subprocess, sys, wave
SR = 48000
B = json.load(open('plan/beats.json'))
DUR = B['duration']; CUES = B['cues']; SCN = B['scenes']
N = int(DUR * SR)
L = [0.0] * N; R = [0.0] * N
rng = random.Random(7)
BED = 0.55  # effets sous la voix ; les sauts tombent dans les silences de la voix

def add(t0, samples, gain=1.0, pan=0.0, bed=True):
    g = gain * (BED if bed else 1.0)
    i0 = int(t0 * SR); gl = g * (1 - max(pan, 0)); gr = g * (1 + min(pan, 0))
    for k, v in enumerate(samples):
        i = i0 + k
        if 0 <= i < N:
            L[i] += v * gl; R[i] += v * gr

def tone(freq, dur, decay, amp, partials=((1, 1.0),), attack=0.003):
    n = int(dur * SR); a = max(1, int(attack * SR))
    return [amp * min(1.0, k / a) * math.exp(-k / SR / decay) * sum(w * math.sin(2 * math.pi * freq * m * k / SR) for m, w in partials) for k in range(n)]

def noise_lp(dur, fc_of, amp_of):
    n = int(dur * SR); y = 0.0; out = []
    for k in range(n):
        p = k / n
        y += (1 - math.exp(-2 * math.pi * fc_of(p) / SR)) * (rng.uniform(-1, 1) - y)
        out.append(y * amp_of(p))
    return out

# nappe
for i in range(N):
    t = i / SR
    v = 0.05 * BED * (0.7 + 0.3 * math.sin(2 * math.pi * t / 7.0)) * (math.sin(2 * math.pi * 55 * t) + 0.6 * math.sin(2 * math.pi * 82.4 * t + 0.4))
    L[i] += v; R[i] += v * 0.96

def thrust(t0, t1, amp):
    add(t0, noise_lp(t1 - t0, lambda p: 260 + 120 * math.sin(p * 6.28), lambda p: amp * min(1, p * 12, (1 - p) * 8)))
thrust(0.3, B['warps'][0] - 0.2, 0.09)
for d, a in zip(B['journey']['depart'], B['journey']['arrive']):
    thrust(d, a, 0.12)
thrust(SCN['contact']['start'] + 0.4, DUR - 1.6, 0.05)

# sauts : montée, impact, queue (pleine échelle : ils tombent dans les silences de la voix)
for T in B['warps']:
    lead = 0.5
    add(T - lead, noise_lp(lead, lambda p: 250 + 5500 * p ** 2, lambda p: 0.34 * p ** 2.2), 1.0, -0.15, bed=False)
    add(T - lead, [0.10 * (k / (lead * SR)) ** 2 * math.sin(2 * math.pi * (90 + 700 * (k / (lead * SR)) ** 2.5) * k / SR) for k in range(int(lead * SR))], bed=False)
    add(T, [0.55 * math.exp(-(k / SR) * 4.2) * math.sin(2 * math.pi * (38 + 60 * math.exp(-(k / SR) * 9)) * k / SR) for k in range(int(0.9 * SR))], bed=False)
    add(T, noise_lp(0.7, lambda p: 4200 * (1 - p) + 300, lambda p: 0.30 * (1 - p) ** 1.6), 1.0, 0.12, bed=False)
    add(T + 0.02, tone(1320, 0.8, 0.22, 0.05, ((1, 1), (2.01, .35))), 1.0, 0.25, bed=False)

# accueil : nom, télémétrie, boutons
H = CUES['home']
add(H['name'] + 0.05, tone(110, 0.5, 0.14, 0.16, ((1, 1), (2, .3))))
for i in range(5):
    add(H['pitch'] + 1.3 + i * 0.95 + 0.06, tone(2300 + 90 * i, 0.07, 0.018, 0.075), 1.0, 0.3)
add(H['ctas'] + 0.05, tone(1500, 0.09, 0.03, 0.06))

# parcours : un ping par escale (pentatonique ascendante), voyant « now » en plus
for t, f in zip(CUES['journey']['stops'], [523.3, 587.3, 740.0, 880.0, 1174.7]):
    add(t + 0.05, tone(f, 0.9, 0.28, 0.11, ((1, 1), (2, .25), (3.01, .08))), 1.0, (f - 700) / 1200)
add(CUES['journey']['stops'][2] + 0.05, tone(1760, 0.5, 0.12, 0.03))

# compétences, projets
for gi, t in enumerate(CUES['skills']['clusters']):
    add(t + 0.1, tone(1046.5 * (1.125 ** gi), 0.5, 0.16, 0.06, ((1, 1), (2, .2))), 1.0, -0.3 + gi * 0.2)
add(CUES['skills']['c'] + 0.1, tone(1318.5, 0.9, 0.3, 0.09, ((1, 1), (2, .3))))
for si, t in enumerate(CUES['projects']['systems']):
    add(t + 0.1, tone(392 * (1.2 ** si), 0.7, 0.22, 0.07, ((1, 1), (2, .3), (3.01, .1))), 1.0, -0.3 + si * 0.2)

# contact : accord chaud, ticks des canaux, pluck de l'adresse
c0 = SCN['contact']['start']
for f, g in ((220, .6), (329.6, .5), (440, .45), (554.4, .32)):
    n = int(8 * SR)
    add(c0 + 0.1, [0.09 * g * min(1, (k / SR) / 1.2) * math.exp(-max(0, k / SR - 2.5) / 3.0) * (math.sin(2 * math.pi * f * k / SR) + 0.25 * math.sin(2 * math.pi * f * 2 * k / SR)) for k in range(n)], 1.0, (f - 400) / 900)
for i, t in enumerate(CUES['contact']['chips']):
    add(t + 0.05, tone(1800 + 150 * i, 0.08, 0.02, 0.06), 1.0, 0.2)
add(CUES['contact']['site'] + 0.05, tone(880, 1.0, 0.3, 0.10, ((1, 1), (2, .4), (3.01, .15))))
add(CUES['contact']['site'] + 0.05, tone(1318.5, 1.0, 0.3, 0.07, ((1, 1), (2, .3))))

fo = B['fadeOutStart']
for i in range(N):
    t = i / SR
    g = min(1.0, t / 0.35) * (1.0 if t < fo else max(0.0, 1 - (t - fo) / (DUR - fo)))
    L[i] *= g; R[i] *= g
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<hh', int(max(-1, min(1, l)) * 32767), int(max(-1, min(1, r)) * 32767)) for l, r in zip(L, R)))

# voix : un clip par section, posé à voiceStart, puis mixage avec la nappe
cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', sys.argv[1]]
for s in SCN.values(): cmd += ['-i', s['voiceFile']]
chains = [f"[{k+1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(s['voiceStart']*1000)}|{int(s['voiceStart']*1000)}[v{k}]" for k, s in enumerate(SCN.values())]
mix = ''.join(f'[v{k}]' for k in range(len(SCN)))
fc = ';'.join(chains) + f";{mix}amix=inputs={len(SCN)}:normalize=0[voice];[0:a][voice]amix=inputs=2:normalize=0,atrim=0:{DUR},"
fc += f"afade=t=out:st={fo}:d={DUR - fo},acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5:LRA=9[out]"
cmd += ['-filter_complex', fc, '-map', '[out]', '-ar', '48000', sys.argv[2]]
subprocess.run(cmd, check=True)
print('ok')
