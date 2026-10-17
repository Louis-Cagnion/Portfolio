# Teaser du portfolio : sources pour la v3

Vidéos : `../videos/portfolio-teaser-en-v1.mp4` (15 s, sans voix), `../videos/portfolio-teaser-en-v2.mp4` (61,6 s, voix Piper ryan-high).
Voix choisies par Louis : `bm_lewis` et `af_heart` (Kokoro), échantillons dans `../audio/voix-choisies/`. Choix final à faire.

## Reprendre pour la v3
1. Texte : éditer `plan/script.json` (`say` = ce que lit la voix, noms français en phonétique ; `show` = référence).
2. Voix : environnement et modèles non copiés (lourds, régénérables) :
   - `python3 -m venv .venv-tts && .venv-tts/bin/pip install piper-tts kokoro-onnx soundfile`
   - modèles Kokoro dans `~/.cache/motion-video-director/models/kokoro/` (kokoro-v1.0.onnx, voices-v1.0.bin), déjà présents sur cette machine
   - Kokoro exige l'espeak du système : `PHONEMIZER_ESPEAK_LIBRARY=/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1` et `EspeakConfig(data_path='/usr/lib/x86_64-linux-gnu/espeak-ng-data')`
   - générer un clip par section dans `assets/vo/<n>-<id>.wav` (les clips de la v2 sont dans `../audio/voix-off-v2/`, à copier dans `assets/vo/` pour rejouer la v2) (ex. `k.create(texte, voice='bm_lewis', speed=0.95, lang='en-gb')`)
3. Calage : `python3 -I src/build_beats.py` (durées réelles, repères par phrase ; échoue si deux escales sont trop proches)
4. Son : `python3 -I src/make_audio.py cache/bed.wav cache/mix.wav`
5. Rendu (Chrome headless, sans Playwright) : `node src/render.mjs --from 0 --to <duration de plan/beats.json> --fps 30 --scale 1 --out renders/final --name "Portfolio Teaser v3" --audio cache/mix.wav`
   Planche de contrôle : rendu `--jpg` basse définition, puis `python3 -I src/sheet.py`.

`assets/portfolio/` est un instantané de journey-art.js, dom.js et tokens.css du dépôt Portfolio (le dépôt n'est pas requis pour rendre). `plan/beats-v1-15s.json` = repères de la v1.
Non copiés : `.venv-tts`, `cache/`, `renders/` (régénérables).
