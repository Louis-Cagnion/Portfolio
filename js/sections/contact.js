/*
Contact : disque d'or dont l'étiquette copie l'adresse e-mail et dont chaque sillon mène à un
réseau ; sur téléphone, le disque est verrouillé puis s'ouvre sur sa moitié haute.
Structure et comportement de la maquette ;
dessin dans contact-disc.js, styles dans css/contact.css.
*/
import { BREAKPOINTS, el } from '../core/dom.js';
import { ease, lerp, reduced, scrollBehavior } from '../core/motion.js';
import { format } from '../core/i18n.js';
import { buildDisc, FULL_BOX, HALF_BOX } from './contact-disc.js';

const REVERT_MS = 2200; // retour de l'invite après une copie réussie
const TWEEN_MS = 700; // ouverture et fermeture du disque
const TOUCH = ['touch', 'pen'];
const ARROW = '←';

/**
 * @brief Monte la rubrique Contact : structure construite une fois, textes remplis par update.
 *
 * @param {HTMLElement} root section.view#contact
 *
 * @returns {(content: object) => void} update(content) : textes d'une langue
 */
export function mount(root) {
  let c = null; // données `contact` de la langue affichée
  let mail = '';
  const state = {
    shown: -1, // sillon montré (survol, focus ou premier toucher)
    armed: -1, // sillon retenu par un premier toucher
    pointer: 'mouse',
    copy: 'idle', // idle | ok | fail
    voice: { kind: 'none', k: 0 }, // ce que l'annonce dit, retraduit à la bascule de langue
    open: false,
    box: FULL_BOX.slice(),
    run: 0,
    timer: 0,
  };
  const title = el('h2', { tabindex: '-1' });
  const question = el('h3');
  const message = el('p');
  const status = el('p', { class: 'rec-status', role: 'status' });
  const hint = el('button', { type: 'button', class: 'rec-hint' });
  let art = null;
  const phone = matchMedia(BREAKPOINTS.phoneDisc);

  const voiceText = () => {
    const { kind, k } = state.voice;
    const named = () => c && format(c.groove, { n: k + 1, name: c.channels[k].name });
    if (kind === 'groove') return named();
    if (kind === 'armed') return `${named()}. ${c.armed}`;
    if (kind === 'focus') return c.copyFocus;
    if (kind === 'ok') return c.copiedStatus;
    if (kind === 'fail') return format(c.copyFailed, { mail });
    return '';
  };
  const say = (kind, k = 0) => {
    state.voice = { kind, k };
    status.textContent = voiceText();
  };
  const engraving = () => ({ idle: c.copyHint, ok: c.copied, fail: c.copyFailedHint });
  const renderCore = () => {
    art.coreText.textContent = engraving()[state.copy];
  };
  const preview = (k) => {
    art.grooves.forEach((groove, i) => {
      groove.track.classList.toggle('lit', i === k);
      groove.name.classList.toggle('on', i === k);
    });
    state.shown = k;
  };
  const disarm = () => {
    state.armed = -1;
    preview(-1);
    say('none');
  };
  const setBox = (box) => {
    state.box = box;
    art.disc.setAttribute('viewBox', box.map((n) => n.toFixed(1)).join(' '));
  };
  const tween = (to, done) => {
    const token = ++state.run;
    const from = state.box.slice();
    const start = performance.now();
    const span = reduced() ? 0 : TWEEN_MS;
    const step = () => {
      if (token !== state.run) return;
      const t = span ? Math.min(1, (performance.now() - start) / span) : 1;
      setBox(from.map((a, i) => lerp(a, to[i], ease(t))));
      if (t < 1) requestAnimationFrame(step);
      else done?.();
    };
    step();
  };
  const syncDisc = () => {
    art.disc.classList.toggle('locked', phone.matches && !state.open);
    hint.textContent = state.open ? `${ARROW} ${c.backHint}` : c.tapHint;
  };
  const openDisc = () => {
    if (state.open || !phone.matches) return;
    state.open = true;
    disarm();
    art.disc.classList.add('open');
    syncDisc();
    art.disc.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    tween(HALF_BOX);
  };
  const closeDisc = () => {
    if (!state.open) return;
    state.open = false;
    syncDisc();
    tween(FULL_BOX, () => {
      if (!state.open) art.disc.classList.remove('open');
    });
  };

  const copyMail = async () => {
    disarm();
    let ok = true;
    try {
      await navigator.clipboard.writeText(mail);
    } catch {
      ok = false;
    }
    state.copy = ok ? 'ok' : 'fail';
    art.label.classList.add('hot');
    art.coreName.classList.add('on');
    say(ok ? 'ok' : 'fail');
    renderCore();
    clearTimeout(state.timer);
    state.timer = 0;
    if (ok) state.timer = setTimeout(revertCore, REVERT_MS);
  };
  const revertCore = () => {
    state.timer = 0;
    state.copy = 'idle';
    renderCore();
    const over = art.core.matches(':hover, :focus-visible');
    say(over ? 'focus' : 'none');
    art.label.classList.toggle('hot', over);
    art.coreName.classList.toggle('on', over);
  };

  const wireGroove = (groove, k) => {
    const { link } = groove;
    for (const type of ['mouseenter', 'focus']) {
      link.addEventListener(type, () => {
        preview(k);
        say(state.armed === k ? 'armed' : 'groove', k);
      });
    }
    for (const type of ['mouseleave', 'blur']) {
      link.addEventListener(type, () => {
        if (state.shown !== k || state.armed === k) return;
        preview(state.armed);
        if (state.armed >= 0) say('armed', state.armed);
        else say('none');
      });
    }
    // Sans survol, le premier toucher montre où mène le sillon, le second le suit.
    link.addEventListener('click', (event) => {
      const touch = TOUCH.includes(state.pointer);
      if (state.open || !touch || state.armed === k) {
        state.armed = -1;
        say('groove', k);
        return;
      }
      event.preventDefault();
      state.armed = k;
      preview(k);
      say('armed', k);
    });
  };
  const wireCore = () => {
    const { core, coreName } = art;
    for (const type of ['mouseenter', 'focus']) {
      core.addEventListener(type, () => {
        preview(-1);
        art.label.classList.add('hot');
        coreName.classList.add('on');
        if (state.copy === 'idle') say('focus');
      });
    }
    for (const type of ['mouseleave', 'blur']) {
      core.addEventListener(type, () => {
        if (state.timer) return;
        state.copy = 'idle';
        art.label.classList.remove('hot');
        coreName.classList.remove('on');
        renderCore();
        say('none');
      });
    }
    core.addEventListener('click', copyMail);
    core.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      copyMail();
    });
  };
  const wireDisc = () => {
    const { disc } = art;
    art.grooves.forEach(wireGroove);
    wireCore();
    disc.addEventListener('pointerdown', (event) => {
      state.pointer = event.pointerType;
    });
    disc.addEventListener('keydown', () => {
      state.pointer = 'keyboard';
    });
    disc.addEventListener('click', () => {
      if (disc.classList.contains('locked')) openDisc();
    });
    hint.addEventListener('click', () => (state.open ? closeDisc() : openDisc()));
    document.addEventListener('pointerdown', (event) => {
      if (state.armed >= 0 && !disc.contains(event.target)) disarm();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.open && root.classList.contains('on')) closeDisc();
    });
    phone.addEventListener('change', () => {
      if (!phone.matches && state.open) {
        state.open = false;
        state.run++;
        setBox(FULL_BOX.slice());
        disc.classList.remove('open');
      }
      syncDisc();
    });
  };

  return (content) => {
    // Une bascule de langue clôt l'échec : la gravure revient à l'invite, l'annonce reste.
    if (c && c !== content.contact && state.copy === 'fail') state.copy = 'idle';
    c = content.contact;
    if (!art) {
      mail = c.channels[0].href.replace('mailto:', '');
      art = buildDisc(c.channels);
      wireDisc();
      const wrap = el(
        'div',
        { class: 'record-wrap' },
        art.disc,
        el('section', { class: 'msg' }, question, message),
        status,
        hint,
      );
      root.append(title, wrap);
    }
    title.textContent = c.title;
    question.textContent = c.question;
    message.textContent = c.message;
    art.disc.setAttribute('aria-label', c.discLabel);
    art.core.setAttribute('aria-label', c.copyLabel);
    art.grooves.forEach((groove, k) => {
      const { name } = c.channels[k];
      groove.link.setAttribute('aria-label', format(c.groove, { n: k + 1, name }));
      groove.text.textContent = name.toUpperCase();
    });
    renderCore();
    syncDisc();
    status.textContent = voiceText();
  };
}
