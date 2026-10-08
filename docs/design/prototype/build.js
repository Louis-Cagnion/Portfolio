const fs = require('fs');
const path = require('path');

const here = __dirname;
const fr = require(path.join(__dirname, '..', '..', '..', 'data', 'fr.json'));
const skills = require(path.join(here, 'skills-draft.json'));
const j = fr.journey.paragraphs;
const a = fr.about.paragraphs;

const steps = [
    { body: 'earth', title: 'Première piscine', when: '2024', t: 0, paragraphs: j.slice(0, 6) },
    { body: 'moon', title: 'Seconde chance', when: '2024', t: 0.12, paragraphs: j.slice(6, 10) },
    { body: 'mars', title: 'Tronc commun', when: 'nov. 2024 à 2026', t: 0.25, paragraphs: j.slice(10, 13) },
    { body: 'asteroids', title: 'Codewars', when: 'pendant le cursus', t: 0.37, paragraphs: j.slice(13, 17) },
    { body: 'station', title: 'Tressol-Chabrier', when: 'depuis juillet 2026', t: 0.5, now: true, paragraphs: j.slice(17, 20) },
    { body: 'saturn', title: 'Alternance RNCP6', when: 'sept. 2026 à 2028', t: 0.66, paragraphs: [a[1]] },
    { body: 'nebula', title: 'RNCP7 IA', when: 'ensuite', t: 0.83, paragraphs: [a[2]] },
    { body: 'galaxy', title: 'Recherche en IA', when: 'horizon', t: 1, paragraphs: [a[3]] },
];

const curated = {
    search_tool: ['Interroger le stock de véhicules du groupe en langage naturel, grâce à un LLM qui construit la requête Elasticsearch.', ['LLM', 'Elasticsearch', 'HMAC', 'PWA']],
    audit_infomediaires: ["Pipeline Python qui vérifie chaque nuit la visibilité des boutiques en ligne du groupe sur les plateformes d'annonces.", ['Python', 'Playwright', 'pytest', 'Azure Pipelines']],
    nps_scores: ["Du classeur trimestriel jusqu'au tableau de bord : pipeline en trois couches et module de back-office.", ['SQL Server', 'Power BI', 'PHP', 'Azure Pipelines']],
    devpedia: ['Encyclopédie du développement logiciel, rendue par un parseur Markdown écrit à la main et traduite en trois langues.', ['JavaScript', 'Markdown', 'API DeepL']],
    minishell: ["Recréer un shell en groupe ; j'y ai pris en charge les opérateurs logiques et les priorités.", ['C', 'Arbres binaires']],
    transcendence: ["Application web complète en équipe ; j'y ai réalisé l'IA adverse et la version 3D du jeu.", ['Frontend', 'Backend', 'Docker', '3D']],
};
const CAT = { professional: 'pro', personal: 'perso', school: 'school' };
const projects = Object.entries(CAT).flatMap(([src, cat]) => fr.projects[src].list.map((p) => {
    const [summary, tags] = curated[p.id] || [p.paragraphs[0].split(/(?<=\.)\s/)[0], []];
    return { id: p.id, cat, title: p.h4, summary, tags, paragraphs: p.paragraphs };
}));

const tpl = fs.readFileSync(path.join(here, 'prototype.template.html'), 'utf8');
fs.writeFileSync(path.join(here, 'prototype.html'), tpl.replace('/*DATA*/', JSON.stringify({ steps, projects, skills, about: a })));
console.log('built', projects.length, 'projects,', skills.length, 'skill groups');
