/* Plafonnement général des textes (groupe « Plafonnement »), première famille : le module
js/core/fit-words.js sur des éléments synthétiques de la page du banc. Le site entier se joue
dans fit-words.js. */
import {
  FIT_MARGIN_PX,
  FIT_TARGETS,
  MAX_REFITS,
  MAX_ROUNDS,
  fitWords,
} from '../../js/core/fit-words.js';
import { test } from './runner.js';

const GROUP = 'Plafonnement';
const TOL = 0.5; // px : arrondis
export const NATURAL_PX = 16;
export const LONG_WORD = 'Anticonstitutionnellement';
export const LOOP_FRAMES = 40; // images jouées par un cas de boucle : bien plus que MAX_REFITS
/* Ajustements d'une alternance à deux mises en page : une fois chacune, puis les retours. */
export const ALTERNATION_REFITS = MAX_REFITS + 2;
const CONVERGENCE_CALLS = 80; // appels du cas convergent : 0,8 puissance 80 vaut 2e-8
const CONVERGENCE_TOL = 0.15; // px : plancher au centième, arrondis du rendu

/** Largeur d'une ligne de `text` sans coupe, dans la police calculée de `el`. */
export function widthOf(text, el) {
  const doc = el.ownerDocument;
  const style = doc.defaultView.getComputedStyle(el);
  const probe = doc.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;' +
    `font:${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily};` +
    `letter-spacing:${style.letterSpacing}`;
  probe.textContent = text;
  doc.body.append(probe);
  const { width } = probe.getBoundingClientRect();
  probe.remove();
  return width;
}

/** Boîte de `width` px (police de 16 px) portant un paragraphe `text` ; `done()` la retire. */
function sandbox(width, text, font = `${NATURAL_PX}px/1.3 sans-serif`) {
  const box = document.createElement('div');
  box.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;width:${width}px;` +
    `font:${font}`;
  const p = document.createElement('p');
  p.textContent = text;
  box.append(p);
  document.body.append(box);
  return { box, p, done: () => box.remove() };
}

/** Joue `run({ box, p })` (synchrone ou non) dans une boîte synthétique, retirée ensuite. */
function inSandbox(width, text, run, font) {
  return async () => {
    const { box, p, done } = sandbox(width, text, font);
    try {
      return await run({ box, p });
    } finally {
      done();
    }
  };
}

export const sizeOf = (el) => (
  parseFloat(el.ownerDocument.defaultView.getComputedStyle(el).fontSize)
);
export const nextFrame = (win) => new Promise((resolve) => win.requestAnimationFrame(resolve));

/**
 * Problèmes si `word`, mesuré dans la police de `el`, dépasse `limit` px, si `styled` n'a pas
 * de font-size en ligne ou si la police n'est pas à `ratio` fois la naturelle.
 */
function wordProblems({ styled, el = styled, word, limit, ratio }) {
  const problems = [];
  if (!styled.style.fontSize) problems.push('aucun font-size en ligne posé');
  const width = widthOf(word, el);
  if (width > limit + TOL) problems.push(`mot de ${width.toFixed(1)} px dans ${limit} px`);
  if (ratio !== undefined && Math.abs(sizeOf(styled) / NATURAL_PX - ratio) > 0.01)
    problems.push(
      `police à ${(sizeOf(styled) / NATURAL_PX).toFixed(3)} au lieu de ${ratio.toFixed(3)}`,
    );
  return problems;
}

/** Largeur de `text` à la taille naturelle (16 px). */
function naturalWidth(text) {
  const { p, done } = sandbox(1000, text);
  const width = widthOf(text, p);
  done();
  return width;
}

const noInline = (el) => (
  el.style.fontSize ? [`font-size en ligne : ${el.style.fontSize}`] : []
);

/** Problème si le mot `word` de `el` (sa police) dépasse le contenu de `box`. */
export function insideProblems(el, word, box) {
  const style = box.ownerDocument.defaultView.getComputedStyle(box);
  const room = box.clientWidth - parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
  const width = widthOf(word, el);
  return width > room + TOL
    ? [`mot de ${width.toFixed(1)} px dans ${room.toFixed(1)} px`] : [];
}

/** Cas de la mesure : { name, width, text, run({ box, p }) }. */
function measureCases() {
  const wide = naturalWidth(LONG_WORD);
  const pieceWidth = (...texts) => Math.ceil(Math.max(...texts.map(naturalWidth))) + 1;
  const hyphenRoom = pieceWidth('Alternance-', 'RNCP6');
  const softRoom = pieceWidth('Anticonsti-', 'tutionnellement');
  const glued = 'Alternance\u00A0RNCP6';
  return [
    {
      name: 'mot trop large : il tient, police réduite du bon ratio',
      width: 100,
      text: LONG_WORD,
      run: ({ p }) => {
        fitWords([p]);
        return wordProblems({ styled: p, word: LONG_WORD, limit: 100, ratio: 100 / wide });
      },
    },
    {
      name: 'mot qui tient : aucun style en ligne',
      width: 100,
      text: 'Court mot',
      run: ({ p }) => {
        fitWords([p]);
        return p.hasAttribute('style') ? [`style en ligne : ${p.getAttribute('style')}`] : [];
      },
    },
    {
      name: 'élargir la boîte rend la taille naturelle',
      width: 100,
      text: LONG_WORD,
      run: ({ box, p }) => {
        fitWords([p]);
        box.style.width = `${Math.ceil(wide) + 10}px`;
        fitWords([p]);
        return noInline(p);
      },
    },
    {
      name: 'aucun plancher : une boîte très étroite garde le mot entier',
      width: 20,
      text: LONG_WORD,
      run: ({ p }) => {
        fitWords([p]);
        return wordProblems({ styled: p, word: LONG_WORD, limit: 20, ratio: 20 / wide });
      },
    },
    {
      name: 'jamais au-dessus de la taille naturelle : un plafond posé est retiré',
      width: 100,
      text: LONG_WORD,
      run: ({ box, p }) => {
        fitWords([p]);
        const problems = p.style.fontSize ? [] : ['aucun plafond posé à 16 px'];
        box.style.fontSize = '6px';
        fitWords([p]);
        return [...problems, ...noInline(p)];
      },
    },
    {
      name: 'idempotence : un second appel ne touche pas au DOM',
      width: 100,
      text: LONG_WORD,
      run: ({ box, p }) => {
        const watcher = new MutationObserver(() => {});
        watcher.observe(box, { attributes: true, childList: true, subtree: true });
        fitWords([p]);
        const first = p.style.fontSize;
        watcher.takeRecords();
        const measured = fitWords([p]);
        const records = watcher.takeRecords().length;
        watcher.disconnect();
        const problems = records ? [`${records} mutation(s) au second appel`] : [];
        if (measured) problems.push(`${measured} élément(s) remesuré(s) au second appel`);
        if (!first || p.style.fontSize !== first)
          problems.push('taille changée au second appel');
        return problems;
      },
    },
    {
      name: 'texte réécrit : le nouveau mot est mesuré',
      width: 100,
      text: LONG_WORD,
      run: ({ p }) => {
        fitWords([p]);
        const longer = `${LONG_WORD}${LONG_WORD}`;
        p.textContent = longer;
        fitWords([p]);
        const problems = wordProblems({
          styled: p,
          word: longer,
          limit: 100,
          ratio: 100 / naturalWidth(longer),
        });
        p.textContent = 'ok';
        fitWords([p]);
        return [...problems, ...noInline(p)];
      },
    },
    {
      name: 'un tiret permet de couper : aucun style en ligne',
      width: hyphenRoom,
      text: 'Alternance-RNCP6',
      run: ({ p }) => {
        fitWords([p]);
        return noInline(p);
      },
    },
    {
      name: 'une césure douce permet de couper : aucun style en ligne',
      width: softRoom,
      text: 'Anticonsti\u00ADtutionnellement',
      run: ({ p }) => {
        fitWords([p]);
        return noInline(p);
      },
    },
    {
      name: 'l\'espace insécable ne coupe pas : le groupe entier tient',
      width: hyphenRoom,
      text: glued,
      run: ({ p }) => {
        fitWords([p]);
        return wordProblems({
          styled: p,
          word: glued,
          limit: hyphenRoom,
          ratio: hyphenRoom / naturalWidth(glued),
        });
      },
    },
    {
      name: 'seul le plus long morceau compte',
      width: hyphenRoom,
      text: `Alternance-${LONG_WORD}`,
      run: ({ p }) => {
        fitWords([p]);
        return wordProblems({ styled: p, word: LONG_WORD, limit: hyphenRoom });
      },
    },
    {
      name: 'chaque nœud est mesuré dans sa propre police',
      width: 100,
      text: 'texte ',
      run: ({ p }) => {
        const code = document.createElement('code');
        code.style.fontFamily = 'monospace';
        code.textContent = 'mmmmmmmmmmmmmmmmmmmm';
        p.append(code);
        fitWords([p]);
        return wordProblems({ styled: p, el: code, word: code.textContent, limit: 100 });
      },
    },
    {
      name: 'élément en ligne : la place de son bloc',
      width: 100,
      text: '',
      run: ({ p }) => {
        const span = document.createElement('span');
        span.textContent = LONG_WORD;
        p.append(span);
        fitWords([span]);
        return wordProblems({ styled: span, word: LONG_WORD, limit: 100 });
      },
    },
    {
      name: 'flex en ligne : la place des voisins du texte',
      width: 400,
      text: '',
      run: ({ p }) => {
        p.style.cssText = `display:flex;gap:12px;width:${Math.ceil(wide) + 10}px`;
        const dot = document.createElement('i');
        dot.style.cssText = 'display:block;flex:none;width:8px';
        p.append(dot, LONG_WORD);
        fitWords([p]);
        const range = document.createRange();
        range.selectNodeContents(p.lastChild);
        const outside = range.getBoundingClientRect().right > p.getBoundingClientRect().right;
        return outside ? ['le mot sort de la boîte'] : [];
      },
    },
    {
      name: 'bouton aussi large que son mot : plafonné par son parent',
      width: 100,
      text: '',
      run: ({ p }) => {
        p.style.cssText = 'display:flex;flex-wrap:wrap';
        const button = document.createElement('button');
        button.style.cssText = 'padding:0 10px;border:0;font:inherit';
        button.textContent = LONG_WORD;
        p.append(button);
        fitWords([button]);
        return wordProblems({ styled: button, word: LONG_WORD, limit: 80 });
      },
    },
    {
      name: 'élément masqué : laissé tel quel',
      width: 100,
      text: LONG_WORD,
      run: ({ p }) => {
        p.style.display = 'none';
        fitWords([p]);
        return noInline(p);
      },
    },
  ];
}

/**
 * Cas où la place dépend du mot ou de la police posée, et cas de boucle :
 * { name, width, text, run({ box, p }) }.
 */
function feedbackCases() {
  return [
    {
      /* Comme #status : un élément de grille centré, de largeur min(…, 100% - marges), dont
      le plus long mot (`break-word` ne le réduit pas) élargit la piste au-delà de la page. */
      name: 'piste de grille élargie par le mot : il tient dans la place visible',
      width: 160,
      text: LONG_WORD,
      run: ({ box, p }) => {
        box.style.cssText += ';display:grid;place-items:center;overflow:hidden';
        const panel = document.createElement('div');
        panel.style.cssText = 'box-sizing:border-box;width:min(34rem, 100% - 32px);' +
          'padding:10px';
        p.style.cssText = 'margin:0;overflow-wrap:break-word';
        box.append(panel);
        panel.append(p);
        fitWords([p]);
        const room = Math.floor(160 - 32 - 20);
        return [
          ...wordProblems({ styled: p, word: LONG_WORD, limit: room }),
          ...insideProblems(p, LONG_WORD, box),
        ];
      },
    },
    {
      /* Une boîte qui rétrécit quand la police baisse (max-width en em) : la mesure se fait
      à la taille naturelle, un appel suffit et le suivant ne remesure rien. */
      name: `place qui suit la police : au plus ${MAX_ROUNDS} tours, puis plus rien à mesurer`,
      width: 100,
      text: LONG_WORD,
      run: ({ p }) => {
        p.style.cssText = 'display:inline-block;max-width:6em';
        const measured = fitWords([p]);
        const problems = measured > MAX_ROUNDS ? [`${measured} mesures pour un élément`] : [];
        const again = fitWords([p]);
        if (again) problems.push(`${again} mesure(s) au second appel`);
        return problems;
      },
    },
    {
      /* Largeur = A + B * taille, de sorte que chaque ajustement déplace encore la place : la
      taille converge vers le point fixe 16 * (A - marge) / (mot - 16 * B) en plus de
      MAX_REFITS ajustements, sans retour à une mise en page vue : elle ne s'arrête pas. */
      name: 'place qui change un peu à chaque taille : la taille converge vers la juste',
      width: 100,
      text: LONG_WORD,
      run: ({ box, p }) => {
        const word = naturalWidth(LONG_WORD);
        const base = 0.1 * word + FIT_MARGIN_PX;
        const slope = 0.05 * word;
        const react = () => {
          box.style.width = `${base + slope * sizeOf(p)}px`;
        };
        const expected = (NATURAL_PX * (base - FIT_MARGIN_PX)) / (word - NATURAL_PX * slope);
        react();
        for (let call = 0; call < CONVERGENCE_CALLS; call++) {
          fitWords([p]);
          react();
        }
        const problems = fitWords([p]) ? ['la taille bouge encore après la convergence'] : [];
        const size = sizeOf(p);
        if (Math.abs(size - expected) > CONVERGENCE_TOL)
          problems.push(`police à ${size.toFixed(2)} px au lieu de ${expected.toFixed(2)}`);
        return [...problems, ...insideProblems(p, LONG_WORD, box)];
      },
    },
    {
      /* La place réagit à la police posée : large si le texte est plafonné, étroite sinon.
      Sans garde, plafond et taille naturelle alterneraient à chaque image. */
      name: `place qui réagit à la police : au plus ${MAX_REFITS} retours, puis le plus ` +
        'petit gardé',
      width: 100,
      text: LONG_WORD,
      run: async ({ box, p }) => {
        let refits = 0; // appels qui ont écrit : un rappel de l'observateur par appel
        const wide = `${Math.ceil(naturalWidth(LONG_WORD)) + 10}px`;
        const react = () => {
          box.style.width = sizeOf(p) < NATURAL_PX ? wide : '100px';
        };
        const watcher = new MutationObserver(() => { refits += 1; });
        watcher.observe(p, { attributes: true, attributeFilter: ['style'] });
        try {
          for (let frame = 0; frame < LOOP_FRAMES; frame++) {
            fitWords([p]);
            react();
            await nextFrame(window);
          }
        } finally {
          watcher.disconnect();
        }
        const problems = refits > ALTERNATION_REFITS
          ? [`${refits} ajustements en ${LOOP_FRAMES} images`] : [];
        if (!p.style.fontSize) problems.push('la plus petite taille n\'est pas gardée');
        return [...problems, ...insideProblems(p, LONG_WORD, box)];
      },
    },
  ];
}

/** Cas du module, puis liste des cibles. */
export async function runModuleCases() {
  const ctx = { group: GROUP, section: null };
  for (const { name, width, text, run } of [...measureCases(), ...feedbackCases()])
    await test(ctx, name, inSandbox(width, text, run));
  await test(ctx, 'FIT_TARGETS : sélecteurs CSS valides', () => {
    const problems = FIT_TARGETS.length ? [] : ['liste vide'];
    for (const selector of FIT_TARGETS)
      try {
        document.querySelector(selector);
      } catch (error) {
        problems.push(`${selector} : ${error.message}`);
      }
    return problems;
  });
}
