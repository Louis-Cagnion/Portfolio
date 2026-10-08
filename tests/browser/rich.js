/* setRich(el, html, field) de js/core/dom.js : liste blanche <strong>, <em>, <a href> en
https: ou mailto: ; tout le reste en texte, avec console.error qui nomme le champ. */
import { ROOT } from './harness.js';
import { test } from './runner.js';

const FIELD = 'projects.systems[1].projects[2].blocks[0].html';
const ALLOWED_TAGS = new Set(['STRONG', 'EM', 'A']);

/** Éléments hors liste blanche ou attributs interdits : chaque fuite nommée. */
function leaks(el) {
  const problems = [];
  for (const node of el.querySelectorAll('*')) {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      problems.push(`élément <${node.localName}> créé`);
      continue;
    }
    for (const attr of node.attributes) {
      const okHref = node.tagName === 'A' && attr.name === 'href' &&
        /^(https:|mailto:)/.test(attr.value);
      if (!okHref) problems.push(`<${node.localName} ${attr.name}="${attr.value}"> rendu`);
    }
    if (node.tagName === 'A' && !node.hasAttribute('href')) {
      problems.push('<a> sans href rendu');
    }
  }
  return problems;
}

/** Appelle setRich avec console.error espionnée ; rend { el, errors }. */
function render(setRich, html, field = FIELD, initial = '') {
  const el = document.createElement('div');
  el.textContent = initial;
  const errors = [];
  const original = console.error;
  console.error = (...args) => { errors.push(args.map((a) => String(a?.message ?? a))); };
  try {
    setRich(el, html, field);
  } finally {
    console.error = original;
  }
  return { el, errors };
}

const fieldNamed = (errors, field) =>
  errors.some((args) => args.some((arg) => arg.includes(field)));

const ALLOWED = [
  ['<strong> et <em>', 'Texte <strong>gras</strong> et <em>italique</em>.',
    { text: 'Texte gras et italique.', tags: { strong: 'gras', em: 'italique' } }],
  ['<a href="https:...">', 'Voir <a href="https://example.com/page">le site</a>.',
    { text: 'Voir le site.', href: 'https://example.com/page' }],
  ['<a href="mailto:...">', '<a href="mailto:louis@example.com">écrire</a>',
    { text: 'écrire', href: 'mailto:louis@example.com' }],
  ['balises imbriquées', '<strong>tout <em>imbriqué</em></strong>',
    { text: 'tout imbriqué', tags: { strong: 'tout imbriqué', em: 'imbriqué' } }],
  ['texte sans balise', 'Aucune balise ici', { text: 'Aucune balise ici' }],
];

const REJECTED = [
  ['<script>', 'Avant <script>alert(1)</script> après', '<script>'],
  ['<img onerror>', '<img src="x" onerror="alert(1)">', 'onerror'],
  ['<a href="javascript:...">', '<a href="javascript:alert(1)">piège</a>', 'javascript:'],
  ['<a href="JAVASCRIPT:..."> en majuscules', '<a href="JAVASCRIPT:alert(1)">x</a>',
    'JAVASCRIPT:'],
  ['<a href=" javascript:..."> avec espace', '<a href=" javascript:alert(1)">x</a>',
    'javascript:'],
  ['<a href="http:...">', '<a href="http://example.com">non chiffré</a>',
    'http://example.com'],
  ['<a> avec onclick en plus', '<a href="https://example.com" onclick="alert(1)">x</a>',
    'onclick'],
  ['<a> avec target en plus', '<a href="https://example.com" target="_blank">x</a>', 'target'],
  ['<strong class>', '<strong class="x">gras</strong>', 'class'],
  ['<em style>', '<em style="color:red">rouge</em>', 'style'],
  ['<a> sans href', '<a>sans lien</a>', '<a>'],
  ['<iframe>', '<iframe src="https://example.com"></iframe>', '<iframe'],
  ['<svg onload>', '<svg onload="alert(1)"></svg>', '<svg'],
  ['balise permise mêlée à <script>', '<strong>ok</strong> <script>x()</script>', '<script>'],
];

/** Groupe « setRich » (sans largeur ni langue). */
export async function runRich() {
  const ctx = { group: 'setRich', section: null };
  let mod = null;
  let loadError = null;
  try {
    mod = await import(new URL('js/core/dom.js', ROOT).href);
    if (typeof mod.setRich !== 'function') loadError = 'js/core/dom.js n\'exporte pas setRich';
  } catch (error) {
    loadError = `import de js/core/dom.js impossible : ${error.message}`;
  }
  const guard = (fn) => () => (loadError ? [loadError] : fn(mod.setRich));

  for (const [name, html, expected] of ALLOWED) {
    await test(ctx, `autorisé : ${name}`, guard((setRich) => {
      const { el, errors } = render(setRich, html);
      const problems = leaks(el);
      if (el.textContent !== expected.text) {
        problems.push(`texte « ${el.textContent} » au lieu de « ${expected.text} »`);
      }
      for (const [tag, text] of Object.entries(expected.tags || {})) {
        const node = el.querySelector(tag);
        if (!node) problems.push(`<${tag}> non rendu`);
        else if (node.textContent !== text) {
          problems.push(`<${tag}> contient « ${node.textContent} »`);
        }
      }
      if (expected.href) {
        const link = el.querySelector('a');
        if (!link) problems.push('<a> non rendu');
        else if (link.getAttribute('href') !== expected.href) {
          problems.push(`href « ${link.getAttribute('href')} » au lieu de ` +
            `« ${expected.href} »`);
        }
      }
      if (errors.length) {
        problems.push(`console.error appelée à tort : ${errors[0].join(' ')}`);
      }
      return problems;
    }));
  }

  for (const [name, html, literal] of REJECTED) {
    await test(ctx, `refusé, rendu en texte : ${name}`, guard((setRich) => {
      const { el, errors } = render(setRich, html);
      const problems = leaks(el);
      if (!el.textContent.includes(literal)) {
        problems.push(`« ${literal} » absent du texte affiché « ${el.textContent} »`);
      }
      if (!errors.length) problems.push('aucun console.error');
      else if (!fieldNamed(errors, FIELD)) {
        problems.push(`console.error ne nomme pas le champ ${FIELD} : ${errors[0].join(' ')}`);
      }
      return problems;
    }));
  }

  await test(ctx, 'balise non fermée : aucune exception, texte conservé', guard((setRich) => {
    const { el } = render(setRich, 'Début <strong>sans fin');
    return [...leaks(el), ...(el.textContent.includes('sans fin') ? [] : ['texte perdu'])];
  }));
  await test(ctx, 'remplace le contenu précédent (changement de langue)', guard((setRich) => {
    const { el } = render(setRich, '<em>nouveau</em>', FIELD, 'ancien contenu');
    return el.textContent === 'nouveau' ? [] : [`contenu « ${el.textContent} »`];
  }));
  await test(ctx, 'temps linéaire (20 000 à 80 000 caractères)', guard((setRich) => {
    const sizes = [20000, 40000, 80000];
    const unit = 'du <strong>texte</strong> et <a href="https://example.com">un lien</a> ';
    const times = sizes.map((size) => {
      const html = unit.repeat(Math.ceil(size / unit.length));
      let best = Infinity;
      for (let run = 0; run < 3; run++) {
        const start = performance.now();
        render(setRich, html);
        best = Math.min(best, performance.now() - start);
      }
      return best;
    });
    const detail = sizes.map((n, i) => `${n} : ${times[i].toFixed(1)} ms`).join(', ');
    const linear = times[2] <= Math.max(times[0] * 8, 30);
    return linear ? [] : [`croissance non linéaire (${detail})`];
  }));
}
