/*
Validation pure du JSON d'une langue (schéma de docs/design/plan.md, section Schéma des
données). Chaque nœud du schéma est une fonction (valeur, chemin, fautes) qui ajoute à
`fautes` le chemin de tout champ absent, vide ou mal typé ; rien n'est jamais levé.
*/

const LEVELS = ['advanced', 'intermediate', 'beginner', 'unknown'];
const HREF = /^(?:https:\/\/|mailto:)\S+$/;
const OPTIONAL = Symbol('optional');

const isRecord = (value) => value !== null && typeof value === 'object' &&
  !Array.isArray(value);
const child = (path, key) => (path ? `${path}.${key}` : key);

/**
 * @brief Texte non vide (ni espaces seuls), qui respecte `pattern` s'il est donné.
 *
 * @param {RegExp} [pattern] forme exigée du texte
 *
 * @returns {Function} nœud de schéma
 */
const text = (pattern) => (value, path, faults) => {
  const ok = typeof value === 'string' && value.trim() !== '' &&
    (!pattern || pattern.test(value));
  if (!ok) faults.push(path);
};

/**
 * @brief Valeur acceptée par `test`.
 *
 * @param {(value: unknown) => boolean} test prédicat de la valeur
 *
 * @returns {Function} nœud de schéma
 */
const value = (test) => (candidate, path, faults) => {
  if (!test(candidate)) faults.push(path);
};

const flag = value((v) => typeof v === 'boolean');
const ratio = value((v) => Number.isFinite(v) && v >= 0 && v <= 1);
const level = value((v) => LEVELS.includes(v));
const anyRecord = value(isRecord);

/**
 * @brief Tableau dont chaque élément suit `item`.
 *
 * @param {Function} item nœud de schéma d'un élément
 * @param {{ empty?: boolean }} [options] empty : tableau vide admis
 *
 * @returns {Function} nœud de schéma
 */
const list = (item, { empty = false } = {}) => (candidate, path, faults) => {
  if (!Array.isArray(candidate) || (!empty && candidate.length === 0)) {
    faults.push(path);
    return;
  }
  candidate.forEach((entry, index) => item(entry, `${path}[${index}]`, faults));
};

/**
 * @brief Champ facultatif : peut manquer, mais suit `node` s'il est présent (null compris).
 *
 * @param {Function} node nœud de schéma du champ
 *
 * @returns {Function} nœud marqué facultatif
 */
const optional = (node) => Object.assign((...args) => node(...args), { [OPTIONAL]: true });

/**
 * @brief Objet dont chaque champ de `fields` suit son nœud ; les clés inconnues sont ignorées.
 *
 * À la racine (chemin vide), une valeur qui n'est pas un objet nomme chaque champ attendu.
 *
 * @param {Record<string, Function>} fields nœud de schéma par clé
 *
 * @returns {Function} nœud de schéma
 */
const record = (fields) => (candidate, path, faults) => {
  if (!isRecord(candidate)) {
    if (path) faults.push(path);
    else faults.push(...Object.keys(fields).filter((key) => !fields[key][OPTIONAL]));
    return;
  }
  for (const [key, node] of Object.entries(fields)) {
    if (Object.hasOwn(candidate, key)) node(candidate[key], child(path, key), faults);
    else if (!node[OPTIONAL]) faults.push(child(path, key));
  }
};

/**
 * @brief Objet dont le champ `type` choisit les autres champs parmi `variants`.
 *
 * @param {Record<string, Record<string, Function>>} variants champs par valeur de `type`
 *
 * @returns {Function} nœud de schéma
 */
const tagged = (variants) => (candidate, path, faults) => {
  if (!isRecord(candidate)) {
    faults.push(path);
    return;
  }
  const fields = Object.hasOwn(variants, candidate.type) ? variants[candidate.type] : null;
  if (!fields) faults.push(child(path, 'type'));
  else record(fields)(candidate, path, faults);
};

const html = text();
const label = text();
const id = text();
const link = record({ intro: label, label, href: text(HREF) });
const byLevel = record({
  advanced: label,
  intermediate: label,
  beginner: label,
  unknown: label,
});

const LOCALE = record({
  meta: record({ lang: id, title: label, description: label }),
  ui: record({
    nav: record({
      home: label,
      journey: label,
      skills: label,
      projects: label,
      contact: label,
    }),
    language: label,
    sections: label,
    loading: label,
    close: label,
    errors: record({
      title: label,
      network: label,
      timeout: label,
      http: label,
      json: label,
      schema: label,
      retry: label,
      langSwitch: label,
    }),
  }),
  home: record({
    mission: label,
    name: label,
    pitch: label,
    ctas: record({ projects: label, contact: label }),
    telemetry: record({
      title: label,
      rows: list(record({ label, value: label, live: optional(flag) })),
    }),
    dossier: record({
      kicker: label,
      title: label,
      entries: list(record({ label, html })),
    }),
  }),
  journey: record({
    title: label,
    lede: record({ pointer: label, arrows: label }),
    counter: label,
    prev: label,
    next: label,
    stopsLabel: label,
    stops: list(record({
      id,
      body: id,
      at: ratio,
      now: optional(flag),
      title: label,
      when: label,
      paragraphs: list(html),
    })),
  }),
  skills: record({
    title: label,
    lede: label,
    hint: label,
    back: label,
    explore: label,
    chipsLabel: label,
    prev: label,
    next: label,
    related: label,
    legend: label,
    levels: byLevel,
    bodies: byLevel,
    link,
    groups: list(record({
      id,
      title: label,
      short: label,
      items: list(record({
        id,
        name: label,
        level,
        projects: optional(list(id, { empty: true })),
        description: label,
      })),
    })),
  }),
  projects: record({
    title: label,
    lede: label,
    back: label,
    count: label,
    approach: label,
    systemOf: label,
    listLabel: label,
    systems: list(record({
      id,
      name: label,
      intro: label,
      projects: list(record({
        id,
        title: label,
        summary: label,
        tags: optional(list(label, { empty: true })),
        blocks: list(tagged({
          text: { type: id, html },
          list: { type: id, items: list(html) },
        })),
        links: optional(list(link, { empty: true })),
        media: optional(list(anyRecord, { empty: true })),
      })),
    })),
  }),
  contact: record({
    title: label,
    question: label,
    message: label,
    discLabel: label,
    copyHint: label,
    copied: label,
    copiedStatus: label,
    copyFailed: label,
    groove: label,
    armed: label,
    tapHint: label,
    backHint: label,
    channels: list(record({ id, name: label, href: text(HREF) })),
  }),
});

/**
 * @brief Chemins des champs non conformes au schéma d'une langue.
 *
 * validateLocale(data) -> ['home.telemetry.rows[2].label', 'journey.title']
 *
 * @param {unknown} data JSON analysé d'une langue (n'importe quelle valeur)
 *
 * @returns {string[]} chemins fautifs dans l'ordre du schéma, sans doublon ; [] si conforme
 */
export function validateLocale(data) {
  const faults = [];
  LOCALE(data, '', faults);
  return faults;
}
