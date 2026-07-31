import { fetchData } from "./fetch.js"
import { renderProjects } from "./projects.js"
import { createTag, writeParagraphs, createTagList, insertLinkParagraph, renderMedia, createDetails } from "./tag.js"

const commonPath = "./data/"
const frPath = `${commonPath}fr.json`
const enPath = `${commonPath}en.json`
const languages = ['FR', 'EN']
const SECTION_IDS = ['home', 'journey', 'skills', 'projects', 'contact']

let curPath = frPath
let activeSection = sectionFromHash()

/** @returns {string} the section id from location.hash, or the first section if invalid/absent */
function sectionFromHash() {
    const id = location.hash.slice(1)
    return SECTION_IDS.includes(id) ? id : SECTION_IDS[0]
}

/**
 * Show the requested section and hide the others, updating the nav's active state.
 * @param {string} id
 */
function showSection(id) {
    activeSection = SECTION_IDS.includes(id) ? id : SECTION_IDS[0]

    document.querySelectorAll('.page-section').forEach((section) => {
        section.hidden = section.dataset.section !== activeSection
    })
    document.querySelectorAll('#sectionNav button').forEach((button) => {
        const isActive = button.dataset.section === activeSection
        button.classList.toggle('active', isActive)
        button.setAttribute('aria-current', isActive ? 'page' : 'false')
    })
}

function buildLanguageSelect(winTitle) {
    const wrapper = createTag('div', {id: 'languageSelect'})
    wrapper.append(createTag('p', {innerHTML: winTitle}))

    const select = createTag('select', {id: 'languagePicker'})
    languages.forEach((label, i) => {
        select.append(createTag('option', {innerHTML: label, value: String(i + 1)}))
    })
    select.value = curPath === frPath ? '1' : '2'
    select.addEventListener('change', () => {
        curPath = curPath === frPath ? enPath : frPath
        initPage(curPath)
    })

    wrapper.append(select)
    return wrapper
}

function buildNav(navLabels) {
    const nav = createTag('nav', {id: 'sectionNav'})
    SECTION_IDS.forEach((id) => {
        const button = createTag('button', {type: 'button', innerHTML: navLabels[id], dataset: {section: id}})
        button.addEventListener('click', () => {
            location.hash = id
            showSection(id)
        })
        nav.append(button)
    })
    return nav
}

function buildSection(id) {
    return createTag('section', {className: 'page-section', dataset: {section: id}})
}

function buildHomeSection(about) {
    const section = buildSection('home')
    section.append(createTag('h2', {innerHTML: about.h2}))
    writeParagraphs(section, about.paragraphs)
    return section
}

function buildJourneySection(journey) {
    const section = buildSection('journey')
    section.append(createTag('h2', {innerHTML: journey.h2}))
    writeParagraphs(section, journey.paragraphs)
    return section
}

function buildSkillsSection(skills) {
    const section = buildSection('skills')
    const ol = createTag('ol')
    section.append(
        createTag('h2', {innerHTML: skills.h2}),
        createTag('p', {innerHTML: skills.intro}),
        ol
    )
    skills.categories.forEach((category) => {
        ol.append(createTag('li', {innerHTML: category.title}))
        ol.append(createTagList('ul', category.items))
    })
    section.append(createTag('p', {innerHTML: skills.outro}))
    return section
}

/**
 * A single project, collapsed by default (native <details>/<summary>) so the
 * projects section doesn't dump every project's full write-up on screen at once.
 * @param {object} elem project entry from the JSON data
 * @param {Function} [extraRenderer] project-specific renderer from renderProjects
 */
function buildProjectCard(elem, extraRenderer) {
    return createDetails(elem.h4, (body) => {
        writeParagraphs(body, elem.paragraphs)
        if (extraRenderer)
            extraRenderer(body, elem)
        if (elem.links && elem.links.length)
            insertLinkParagraph(body, elem.linkIntro, elem.links[0])
        renderMedia(body, elem.media)
    })
}

function buildProjectsSection(projects) {
    const section = buildSection('projects')
    section.append(createTag('h2', {innerHTML: projects.h2}))

    const personal = projects.personal
    section.append(createTag('h3', {innerHTML: personal.h3}))
    personal.list.forEach((elem) => section.append(buildProjectCard(elem)))

    const school = projects.school
    section.append(
        createTag('h3', {innerHTML: school.h3}),
        createTag('p', {innerHTML: school.intro})
    )
    school.list.forEach((elem) => section.append(buildProjectCard(elem, renderProjects[elem.id])))

    return section
}

function buildContactSection(contact) {
    const section = buildSection('contact')
    section.append(
        createTag('h2', {innerHTML: contact.h2}),
        createTag('p', {innerHTML: contact.intro})
    )
    section.append(createTagList('ul', contact.links, (link) => {
        const li = createTag('li')
        li.append(createTag('a', {innerHTML: link.label, href: link.href}))
        return li
    }))
    return section
}

async function initPage(path = curPath) {
    const text = await fetchData(path)
    curPath = path
    document.documentElement.lang = curPath === frPath ? 'fr' : 'en'
    document.body.innerHTML = ''
    document.head.querySelector('title')?.remove()
    document.head.append(createTag('title', {innerHTML: text.meta.title}))

    const hero = createTag('div', {className: 'hero'})
    if (text.home.photo)
        hero.append(createTag('img', {className: 'avatar', src: text.home.photo, alt: ''}))
    hero.append(createTag('h1', {innerHTML: text.home.h1}))

    const header = createTag('header', {id: 'siteHeader'})
    header.append(hero, buildLanguageSelect(text.language))
    document.body.append(header, buildNav(text.nav))

    const main = createTag('main', {id: 'sectionsContainer'})
    main.append(
        buildHomeSection(text.about),
        buildJourneySection(text.journey),
        buildSkillsSection(text.skills),
        buildProjectsSection(text.projects),
        buildContactSection(text.contact)
    )
    document.body.append(main)

    showSection(activeSection)
}

window.addEventListener('hashchange', () => showSection(sectionFromHash()))

initPage()
