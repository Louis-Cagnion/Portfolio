#!/usr/bin/env node
// Rendu déterministe : Chrome headless piloté en CDP (sans dépendance), une capture par image de t.
// node src/render.mjs --from 0 --to 15 --fps 30 --scale 1 --out cache/frames-v1 [--jpg]
//   sans --jpg : --out <dossier> --name "Teaser v1" [--audio mix.wav] -> MP4 via ffmpeg
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat, mkdir, writeFile, readdir, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(`--${k}`); return i < 0 ? d : a[i + 1]; };
const beats = JSON.parse(await readFile(path.join(root, 'plan/beats.json'), 'utf8'));
const from = Number(opt('from', 0));
const to = Number(opt('to', beats.duration));
const fps = Number(opt('fps', beats.fps));
const scale = Number(opt('scale', 1));
if (![from, to, fps, scale].every(Number.isFinite) || from < 0 || to <= from || fps <= 0 || scale <= 0 || scale > 1) throw Error('plage, fps ou échelle invalides');
const count = Math.ceil((to - from) * fps - 1e-8);
const out = path.resolve(opt('out', 'cache/smoke'));
const jpg = a.includes('--jpg');
const name = String(opt('name', 'Smoke v1'));
const audio = opt('audio');
const dest = path.join(out, `${name}.mp4`);
await mkdir(out, { recursive: true });
if (!jpg && existsSync(dest)) throw Error('sortie existante : choisir une nouvelle version');
if (jpg && (await readdir(out)).some((f) => /^\d{5}\.jpg$/.test(f))) throw Error('dossier d\'images non vide : en choisir un neuf');
if (audio && !existsSync(path.resolve(audio))) throw Error('audio introuvable');

// Serveur statique en boucle locale : /src, /assets, /plan seulement.
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u.split('/').some((s) => s.startsWith('.')) || !['/src/', '/assets/', '/plan/'].some((p) => u.startsWith(p))) throw Error('interdit');
    const f = path.resolve(root, `.${u}`);
    if (!f.startsWith(root + path.sep) || (await stat(f)).isDirectory()) throw Error('interdit');
    res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404); res.end('introuvable'); }
});
await new Promise((r, j) => { server.once('error', j); server.listen(0, '127.0.0.1', r); });
const origin = `http://127.0.0.1:${server.address().port}`;

// Chrome headless dédié (profil temporaire, port CDP choisi par Chrome).
const profile = await mkdtemp(path.join(tmpdir(), 'teaser-chrome-'));
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', '--disable-gpu-vsync', 'about:blank'], { stdio: 'ignore' });
let encoder; let encodeResult; let ws;
const cleanup = async () => {
  try { ws?.close(); } catch {}
  chrome.kill();
  if (encoder && encoder.exitCode === null) encoder.kill();
  await new Promise((r) => server.close(r));
};
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    if (existsSync(portFile)) port = (await readFile(portFile, 'utf8')).split('\n')[0];
    else await new Promise((r) => setTimeout(r, 100));
  }
  if (!port) throw Error('Chrome n\'a pas ouvert son port CDP');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await once(ws, 'open');
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const { ok, ko } = pending.get(msg.id); pending.delete(msg.id); msg.error ? ko(Error(msg.error.message)) : ok(msg.result); }
    else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((x) => x.value).join(' '));
  });
  const send = (method, params = {}) => new Promise((ok, ko) => { const n = ++id; pending.set(n, { ok, ko }); ws.send(JSON.stringify({ id: n, method, params })); });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: scale, mobile: false });
  await send('Page.navigate', { url: `${origin}/src/index.html` });
  for (let i = 0; i < 300; i++) {
    const r = await send('Runtime.evaluate', { expression: 'window.__ready === true', returnByValue: true });
    if (r.result.value) break;
    if (errors.length) throw Error(errors.join('\n'));
    await new Promise((x) => setTimeout(x, 100));
  }
  if (!(await send('Runtime.evaluate', { expression: 'window.__ready === true', returnByValue: true })).result.value) throw Error(`page non prête ${errors.join(' | ')}`);

  if (!jpg) {
    const args = ['-hide_banner', '-loglevel', 'error', '-n', '-f', 'image2pipe', '-framerate', String(fps), '-i', 'pipe:0'];
    if (audio) args.push('-ss', String(from), '-t', String(to - from), '-i', path.resolve(audio));
    args.push('-map', '0:v:0');
    if (audio) args.push('-map', '1:a:0', '-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-frames:v', String(count), '-t', String(count / fps), '-movflags', '+faststart', dest);
    encoder = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    encodeResult = new Promise((ok, ko) => { encoder.once('error', ko); encoder.once('close', (c) => (c === 0 ? ok() : ko(Error(`ffmpeg ${c}`)))); });
    encodeResult.catch(() => {}); encoder.stdin.on('error', () => {});
  }
  for (let i = 0; i < count; i++) {
    const t = from + i / fps;
    const r = await send('Runtime.evaluate', { expression: `window.renderFrame(${t})`, awaitPromise: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    if (errors.length) throw Error(errors.join('\n'));
    const shot = await send('Page.captureScreenshot', jpg ? { format: 'jpeg', quality: 92 } : { format: 'png', optimizeForSpeed: true });
    const bytes = Buffer.from(shot.data, 'base64');
    if (jpg) await writeFile(path.join(out, `${String(i).padStart(5, '0')}.jpg`), bytes);
    else if (!encoder.stdin.write(bytes)) await Promise.race([once(encoder.stdin, 'drain'), encodeResult.then(() => { throw Error('encodeur terminé trop tôt'); })]);
  }
  if (encoder) { encoder.stdin.end(); await encodeResult; }
  console.log(`${count} images à ${fps} fps${jpg ? ' (jpg)' : audio ? ' avec audio' : ' (muet)'}`);
} finally {
  await cleanup();
}
