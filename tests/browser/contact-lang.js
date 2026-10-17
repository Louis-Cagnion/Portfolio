/* Contact (S9) : cas de bascule de langue, FR vers EN et retour, annonce de copie comprise.
   Joués par runContact de contact.js ; sondes et constantes dans contact-probe.js. */
import { click } from './harness.js';
import { noForeignText, switchTo } from './language.js';
import {
  check,
  collect,
  contactData,
  copy,
  failedText,
  grooveText,
  openContact,
  parts,
  PHONE_MAX,
  textOf,
  waitAnnounce,
} from './contact-probe.js';

// ---------- Langue ----------

/** Problèmes de textes de la rubrique par rapport aux données `c` d'une langue. */
function textProblems(c, p) {
  const [problems, eq] = collect();
  eq('h2', textOf(p.h2), c.title);
  eq('h3', textOf(p.msg.querySelector('h3')), c.question);
  eq('message', textOf(p.msg.querySelector('p')), c.message);
  eq('aria-label du disque', p.disc.getAttribute('aria-label'), c.discLabel);
  p.links.forEach((a, k) => {
    eq(`aria-label du sillon ${k + 1}`, a.getAttribute('aria-label'), grooveText(c, k));
    eq(`nom gravé ${k + 1}`, textOf(p.names[k]), c.channels[k].name.toUpperCase());
  });
  return problems;
}

async function switchTests(ctx, width, fr, en) {
  const site = await openContact(width);
  try {
    const phone = width <= PHONE_MAX;
    const toEn = 'bascule FR vers EN : textes, libellés, noms gravés, aide';
    await check(ctx, toEn, site, async (p) => {
      if (phone) click(site, p.disc);
      await switchTo(site, 'en');
      const q = parts(site);
      const problems = textProblems(en, q);
      if (textOf(q.coreText) !== en.copyHint)
        problems.push(`gravure « ${textOf(q.coreText)} » au lieu de « ${en.copyHint} »`);
      if (phone && !textOf(q.hint).includes(en.backHint))
        problems.push(`aide ouverte « ${textOf(q.hint)} » sans « ${en.backHint} »`);
      problems.push(...(await noForeignText(site, 'en')));
      return problems;
    });
    await check(ctx, 'bascule EN vers FR : tout revient, aide cohérente', site, async () => {
      await switchTo(site, 'fr');
      const q = parts(site);
      const problems = textProblems(fr, q);
      problems.push(...(await noForeignText(site, 'fr')));
      if (phone) {
        const open = q.disc.classList.contains('open');
        const expected = open ? fr.backHint : fr.tapHint;
        if (!textOf(q.hint).includes(expected))
          problems.push(`aide « ${textOf(q.hint)} » incohérente avec l'état`);
      }
      return problems;
    });
  } finally {
    site.close();
  }
}

async function announceSwitchTests(ctx, width, fr, en) {
  for (const mode of ['ok', 'reject']) {
    const site = await openContact(width, { mode });
    const ok = mode === 'ok';
    const name = `bascule pendant une annonce (copie ${ok ? 'réussie' : 'en échec'})`;
    try {
      await check(ctx, name, site, async (p) => {
        const problems = [];
        copy(site, p);
        await waitAnnounce(site, 'annonce', () => textOf(p.status) !== '');
        await switchTo(site, 'en');
        const q = parts(site);
        const said = textOf(q.status);
        const frText = ok ? fr.copiedStatus : failedText(fr);
        const enText = ok ? en.copiedStatus : failedText(en);
        if (said !== '' && said !== enText)
          problems.push(`annonce « ${said} » après bascule : ni vide ni « ${enText} »`);
        if (said === frText) problems.push('annonce restée en français');
        const engraved = textOf(q.coreText);
        if (![en.copied, en.copyHint].includes(engraved))
          problems.push(`gravure « ${engraved} » ni EN copié ni EN invite`);
        problems.push(...(await noForeignText(site, 'en')));
        site.clip.mode = 'ok';
        copy(site, q);
        await waitAnnounce(site, 'annonce EN', () => textOf(q.status) === en.copiedStatus);
        const back = () => !textOf(q.status) && textOf(q.coreText) === en.copyHint;
        await waitAnnounce(site, 'retour EN', back);
        return problems;
      });
    } finally {
      site.close();
    }
  }
}

export async function languageTests(ctx, width) {
  const fr = await contactData('fr');
  const en = await contactData('en');
  await switchTests(ctx, width, fr, en);
  await announceSwitchTests(ctx, width, fr, en);
}
