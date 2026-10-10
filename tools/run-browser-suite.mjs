/*
Joue tests/browser/ dans un Chrome headless (CDP, port choisi par Chrome), écrit le bilan.
Usage : node tools/run-browser-suite.mjs <url> <fichier-json> [délai max en s]
Code de sortie 1 si un cas échoue ou si la suite n'aboutit pas dans le délai.
*/
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, outFile, maxSeconds = '600'] = process.argv.slice(2);
if (!url || !outFile) {
  console.error(
    'usage : node tools/run-browser-suite.mjs <url> <fichier-json> [délai max en s]',
  );
  process.exit(2);
}
const CHROME = process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/google-chrome';
const profile = mkdtempSync(join(tmpdir(), 'suite-chrome-'));
const portFile = join(profile, 'DevToolsActivePort');
const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--window-size=1400,1000',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });
chrome.on('error', (error) => {
  console.error(`Chrome non lancé (${CHROME}) : ${error.message}`);
  process.exit(2);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = Date.now() + Number(maxSeconds) * 1000;

/* Port écrit par Chrome en première ligne de DevToolsActivePort (--remote-debugging-port=0),
   ce qui permet de lancer plusieurs suites en même temps. */
async function pageSocketUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const port = readFileSync(portFile, 'utf8').split('\n')[0].trim();
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Chrome pas encore prêt */ }
    await sleep(200);
  }
  throw new Error(`Chrome injoignable en 10 s : ${portFile} absent ou port fermé`);
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
console.log(
  status,
  results ? `passed=${results.passed} failed=${results.failed}` : 'aucun résultat',
);
process.exitCode = status === 'done' && results.failed === 0 ? 0 : 1;
