// Tableau des résultats (construit avec textContent seulement) et window.__results.

const COLUMNS = ['Statut', 'Groupe', 'Cas', 'Largeur', 'Langue', 'Rubrique', 'Détail'];

function cell(row, text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  row.append(td);
}

function table(container, caption) {
  const tableEl = document.createElement('table');
  const cap = document.createElement('caption');
  cap.textContent = caption;
  const head = document.createElement('tr');
  for (const name of COLUMNS) {
    const th = document.createElement('th');
    th.textContent = name;
    head.append(th);
  }
  const thead = document.createElement('thead');
  thead.append(head);
  const tbody = document.createElement('tbody');
  tableEl.append(cap, thead, tbody);
  container.append(tableEl);
  return tbody;
}

/** Case « Afficher seulement les échecs » : masque les lignes réussies. */
function bindFailureFilter() {
  const toggle = document.getElementById('onlyFailures');
  toggle?.addEventListener('change', () => {
    document.body.classList.toggle('only-failures', toggle.checked);
  });
}

/** Crée le rapport : `add(résultat)`, `exception(entrée)`, `finish()`. */
export function createReport(root = document.getElementById('report')) {
  bindFailureFilter();
  const results = { done: false, passed: 0, failed: 0, failures: [], exceptions: [],
    startedAt: new Date().toISOString(), durationMs: 0 };
  window.__results = results;
  const start = performance.now();
  const summary = document.getElementById('summary');
  const exceptionsBody = table(document.getElementById('exceptions'),
    'Exceptions (non bloquantes) : exemptées ou à trancher par Louis');
  const body = table(root, 'Résultats');

  const refresh = () => {
    results.durationMs = Math.round(performance.now() - start);
    const state = results.done ? 'Terminé' : 'En cours';
    summary.textContent = `${state} : ${results.passed} réussi(s), ${results.failed} ` +
      `échoué(s), ${results.exceptions.length} exception(s) non bloquante(s), ` +
      `${(results.durationMs / 1000).toFixed(1)} s`;
    summary.className = results.failed ? 'fail' : results.done ? 'pass' : '';
  };

  const row = (tbody, status, entry) => {
    const tr = document.createElement('tr');
    tr.className = status === 'réussi' ? 'pass' : status === 'échoué' ? 'fail' : 'note';
    cell(tr, status);
    cell(tr, entry.group);
    cell(tr, entry.name);
    cell(tr, entry.width ? `${entry.width} px` : '');
    cell(tr, entry.lang || '');
    cell(tr, entry.section ? `#${entry.section}` : '');
    cell(tr, entry.detail || '', 'detail');
    tbody.append(tr);
  };

  return {
    add(entry) {
      const ok = entry.problems.length === 0;
      const detail = entry.problems.join(' ; ');
      const flat = { group: entry.group, name: entry.name, width: entry.width ?? null,
        lang: entry.lang ?? null, section: entry.section ?? null };
      if (ok) results.passed += 1;
      else {
        results.failed += 1;
        results.failures.push({ ...flat, detail, problems: entry.problems });
      }
      row(body, ok ? 'réussi' : 'échoué', { ...flat, detail });
      refresh();
    },
    exception(entry) {
      results.exceptions.push(entry);
      row(exceptionsBody, entry.note, entry);
      refresh();
    },
    finish() {
      results.done = true;
      refresh();
    },
  };
}
