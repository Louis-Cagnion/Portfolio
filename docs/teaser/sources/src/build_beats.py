# Calcule plan/beats.json à partir des clips de voix off (durées réelles) : python3 -I src/build_beats.py
# Les repères visuels sont posés à la position (proportionnelle aux caractères) de la phrase dans la parole.
import json, re, subprocess
script = json.load(open('plan/script.json'))
ids = [s['id'] for s in script['sections']]
LEAD, TAIL, END_HOLD, FIRST_VOICE = 0.85, 1.1, 2.4, 0.8
def speech_span(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'silencedetect=n=-42dB:d=0.12', '-f', 'null', '-'], capture_output=True, text=True).stderr
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]))
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    s = ends[0] if ends and starts and starts[0] < 0.05 else 0.0
    e = starts[-1] if starts and starts[-1] > dur - 0.6 else dur
    return dur, s, e
clips = {}
for i, sid in enumerate(ids, 1):
    clips[sid] = speech_span(f'assets/vo/{i}-{sid}.wav')
say = {s['id']: s['say'] for s in script['sections']}
scenes, warps, t = {}, [], 0.0
for k, sid in enumerate(ids):
    dur, s, e = clips[sid]
    start = 0.0 if k == 0 else warps[-1]
    vstart = FIRST_VOICE if k == 0 else start + LEAD
    scenes[sid] = {'start': start, 'voiceFile': f'assets/vo/{k+1}-{sid}.wav', 'voiceStart': vstart,
                   'speechStart': vstart + s, 'speechEnd': vstart + e, 'clip': dur}
    if k < len(ids) - 1:
        warps.append(round(vstart + e + TAIL, 3))
duration = round(scenes[ids[-1]]['speechEnd'] + END_HOLD, 3)
def cue(sid, phrase, last=False, lead=0.2):
    txt = say[sid].lower()
    i = txt.rfind(phrase.lower()) if last else txt.find(phrase.lower())
    assert i >= 0, (sid, phrase)
    sc = scenes[sid]
    return round(sc['speechStart'] + (i / len(txt)) * (sc['speechEnd'] - sc['speechStart']) - lead, 3)
H, J, S, P, C = [scenes[x] for x in ids]
cues = {
  'home': {'name': cue('home', 'Louis'), 'pitch': cue('home', 'a Tech'), 'mission': cue('home', 'His mission'),
           'telemetry': cue('home', 'from the forty-two'), 'ctas': round(H['speechEnd'] - 0.6, 3)},
  'journey': {'stops': [cue('journey', 'first pee-seen'), cue('journey', 'common core'), cue('journey', 'Groupe Tressol'),
                        cue('journey', 'level seven'), cue('journey', 'research on')]},
  'skills': {'clusters': [cue('skills', 'grouped in')], 'legend': cue('skills', 'the larger'), 'c': cue('skills', 'C is his')},
  'projects': {'systems': [cue('projects', 'his work at'), cue('projects', 'his personal'), cue('projects', 'school projects'), cue('projects', 'the pee-seen', last=True)]},
  'contact': {'chips': [cue('contact', 'email'), cue('contact', 'LinkedIn'), cue('contact', 'GitHub'), cue('contact', 'Code Wars')],
              'site': cue('contact', 'portfolio at'), 'sign': None},
}
cues['skills']['clusters'] = [round(cues['skills']['clusters'][0] + 0.5 * g, 3) for g in range(4)]
cues['contact']['sign'] = round(cues['contact']['site'] + 0.9, 3)
st = cues['journey']['stops']
TRAVEL = 1.1
J_arrive = [st[i] for i in range(1, 5)]
J_depart = [round(a - TRAVEL, 3) for a in J_arrive]
for i in range(1, 4):
    assert J_depart[i] > J_arrive[i - 1] + 0.1, ('escales trop proches', i, J_depart[i], J_arrive[i - 1])
assert J_depart[0] > st[0], ('départ avant la première escale', J_depart[0], st[0])
beats = json.load(open('plan/beats-v1-15s.json'))
beats.update({'duration': duration, 'warps': warps, 'scenes': scenes, 'cues': cues,
              'journey': {'depart': J_depart, 'arrive': J_arrive}, 'fadeOutStart': round(duration - 0.8, 3)})
json.dump(beats, open('plan/beats.json', 'w'), indent=1)
print('duree', duration, 'warps', warps)
for k, v in cues.items(): print(k, v)
