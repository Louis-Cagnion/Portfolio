# Récapitulatif du 09/10/2026 (session moniteur, Windows)

S3 revue, corrigée et poussée ; tests rouges de S4 committés (9d9001f) ; réalisation de S4 arrêtée sur demande de Louis juste avant le rapport de l'agent, son travail est resté non committé sur la machine Windows. Le prochain pas est en tête de `todo.md` ; le lanceur headless de la suite navigateur est en annexe.

## Journal

- Démarrage : fetch OK, `redesign/space` à jour ; dépôt des commandes tiré (2 commits), puis deux règles ajoutées à /best-practice et poussées : valeur d'un brief relue dans le document du projet même si elle vient d'une consigne générale ; en JS, un dernier argument qui est un bloc s'ouvre sur la ligne de l'appel (choix de Louis).
- Revue S3 (analyst-opus-high) : À CORRIGER, un point IMPORTANT (une exception hors `LocaleError` laissait le chargement tourner sans fin) et sept MINEURS.
- Corrections mineures (fixer-opus-high) : description sur une ligne, pastille remesurée à `fonts.ready`, Ctrl+clic sur la marque laissé au navigateur, mise en forme de S3 et de `tests/`. Commit e3f24c5.
- Décisions de Louis reportées dans `plan.md` et la checklist : cause `ui.errors.unexpected` (« L'intrication quantique a tenté de se faire avec les particules d'une autre ligne temporelle. Réessaie. »), « Mission : … » et « Entraînement continu » ; `langchange` retiré du plan (doublon de `update()`).
- Point IMPORTANT : tests rouges (tester-opus-high, e2d88c0), puis correction (fixer-opus-high, 32e7b1f) : erreur `unexpected` partout, barre et onglets rejouables sans doublon, codes de `LocaleError` listés une fois dans `data.js`. Vérifié : Node 234/255 (rouges = `skills-layout`), navigateur 511/511, page d'erreur et Réessayer cliqués dans Chrome.
- S4 : tests rouges (tester-opus-high, 9d9001f) : Node 266, 32 rouges (11 `router.js` absent) ; navigateur 540, 26 rouges, tous dans le groupe « Saut ». Contrat DOM fixé par le moniteur en tête de `tests/browser/warp.js`.
- S4 réalisée par builder-opus-high, arrêtée avant son rapport ; son dernier message annonçait Node 245/266 et une ligne trop longue en cours de correction.

## Brief de S4 (pour le relancer si le travail Windows est perdu)

- Sources : contrat de `tests/browser/warp.js` et `tests/unit/router.test.mjs` ; ligne S4, Principes et Architecture de `plan.md` (« pas de temps plafonné » = pas de temps `dt` plafonné à 50 ms) ; checklist sections 1, 6, 7, 9 ; `docs/design/README.md` ligne « Transition » ; maquette, ciel (lignes ~489-528) et `show()` (lignes ~533-581).
- `js/core/router.js` importable sous Node sans DOM ; `jumpDirection` pure.
- La maquette déplace les rubriques dans `#warpStage`, ce qui fait perdre le focus : focus sur le titre d'arrivée et sections remises dans `main` à la fin du saut.
- Seconde demande pendant un saut, mouvement réduit suivi en direct, `#dossier` depuis une autre rubrique (non testé, à décider), aucune rubrique invisible après une exception.

## Annexe : lanceur headless de la suite navigateur

À copier dans un fichier `.mjs` hors du dépôt, serveur statique lancé à la racine (port 5501 sous Windows, 5510 sous Linux) : `node run-browser-suite.mjs http://127.0.0.1:5510/tests/browser/ resultat.json 900`. Résultat attendu une fois S4 finie : 540 réussites, 0 échec.

```js
/*
Joue tests/browser/ dans un Chrome headless (CDP) et écrit le bilan.
Usage : node run-browser-suite.mjs <url> <fichier-json> [délai max en s]
*/
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, outFile, maxSeconds = '600'] = process.argv.slice(2);
if (!url || !outFile) {
  console.error('usage : node run-browser-suite.mjs <url> <fichier-json> [délai max en s]');
  process.exit(2);
}
const CHROME = process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/google-chrome';
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'suite-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--window-size=1400,1000',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = Date.now() + Number(maxSeconds) * 1000;

async function pageSocketUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Chrome pas encore prêt */ }
    await sleep(200);
  }
  throw new Error(`Chrome injoignable sur le port ${PORT}`);
}

let nextId = 0;
const pending = new Map();
const ws = new WebSocket(await pageSocketUrl());
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = () => reject(new Error('connexion CDP impossible'));
});
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
const send = (method, params = {}) => new Promise((resolve) => {
  const id = ++nextId;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const reply = await send('Runtime.evaluate', { expression, returnByValue: true });
  return reply.result?.result?.value;
};

let status = 'timeout';
let results = null;
try {
  await send('Page.navigate', { url });
  while (Date.now() < deadline) {
    await sleep(2000);
    results = await evaluate('window.__results ?? null');
    if (results?.done) {
      status = 'done';
      break;
    }
  }
  if (status === 'timeout') results = await evaluate('window.__results ?? null');
} finally {
  writeFileSync(outFile, JSON.stringify({ status, results }, null, 1));
  ws.close();
  chrome.kill();
}
console.log(status, results ? `passed=${results.passed} failed=${results.failed}` : 'aucun résultat');
```
