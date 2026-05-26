import { fetchData } from "./fetch.js"
import { createTag, writeParagraphs, createTagList, insertLinkParagraph } from "./tag.js"

const commonPath = "./data/"
const frPath = `${commonPath}fr.json`
const enPath = `${commonPath}en.json`
const languages = [
    'FR',
    'EN'
]
let lIndex = 0
let curpath = frPath

function createLanguageList (winTitle) {
    const winLanguage = createTag('div', {id: 'languageSelect'})
    winLanguage.append(createTag('p', {innerHTML: 'languageSelect'}))
    const select = createTag('select', {id: 'languageSelect', value:'Languages'})
    let i = 1
    languages.forEach(l => {
        select.append(createTag('option', {innerHTML: l, value: `${i}`}))
        i++
    })
    select.value = curpath === frPath ? '1' : '2'
    winLanguage.append(select)
    document.body.append(winLanguage)
    select.addEventListener('change', (e) => {
        if (e.target.value === languages[lIndex])
            return
        lIndex = (lIndex + 1) % 2
        curpath = curpath === frPath ? enPath : frPath
        initPage(curpath)
    })
}

async function initPage(path = frPath) {
    // get file data
    const text = await fetchData(path)
    document.body.innerHTML = ''
    createLanguageList(text.language)

    //append title and h1
    document.head.append(createTag('title', {innerHTML: text.meta.title}))
    const body = document.body
    const header = createTag('div', {id: 'header'})
    header.append(document.getElementById('languageSelect'))
    header.append(createTag('h1', {innerHTML: text.home.h1}))
    body.prepend(header)

    //append 1st paragraph
    const about = text.about
    const divPresentation = createTag('div')
    body.append(divPresentation)
    divPresentation.append(createTag('h2', {innerHTML: about.h2}))
    writeParagraphs(divPresentation, about.paragraphs)

    //append 2nd paragraph
    const journey = text.journey
    const divJourney = createTag('div')
    body.append(divJourney)
    divJourney.append(createTag('h2', {innerHTML: journey.h2}))
    writeParagraphs(divJourney, journey.paragraphs)

    //append 3rd paragraph
    const skills = text.skills
    const ol = createTag('ol')
    const divSkills = createTag('div')
    body.append(divSkills)
    divSkills.append(
        createTag('h2', {innerHTML: skills.h2}),
        createTag('p', {innerHTML: skills.intro}),
        ol
    )
    skills.categories.forEach((keys) => {
        ol.append(createTag('li', {innerHTML: keys.title}))
        ol.append(createTagList('ul', keys.items))
        ol.append(createTag('br'))
    })
    divSkills.append(createTag('p', {innerHTML: skills.outro}))

    //append 4th paragraph
    const projects = text.projects
    const projectsDiv = createTag('div')
    body.append(projectsDiv)
    projectsDiv.append(createTag('h2', {innerHTML: projects.h2}))
    //personnal projects
    const pers = projects.personal
    projectsDiv.append(createTag('h3', {innerHTML: pers.h3}))
    pers.list.forEach(elem => {
        projectsDiv.append(createTag('h4', {innerHTML: elem.h4, id: elem.id}))
        writeParagraphs(projectsDiv, elem.paragraphs)
        insertLinkParagraph(projectsDiv, elem.linkIntro, elem.links[0])
    })
    //school projects
    const school = projects.school
    projectsDiv.append(
        createTag('h3', {innerHTML: school.h3}),
        createTag('p', {innerHTML: school.intro})
    )
    school.list.forEach(elem => {
        projectsDiv.append(createTag('h4', {innerHTML: elem.h4, id: elem.id}))
        writeParagraphs(projectsDiv, elem.paragraphs)
        switch (elem.id) {
            case "fract-ol":
                projectsDiv.append(createTagList('ul', elem.bonuses))
                break;
            case "minishell":
                projectsDiv.append(createTagList('ul', elem.requirements))
                writeParagraphs(projectsDiv, elem.bonusParagraphs)
                break;
            case "philosophers":
                projectsDiv.append(createTagList('ul', elem.states))
                writeParagraphs(projectsDiv, elem.stateParagraphs)
                break;
            case "cub3d":
            case "inception":
                projectsDiv.append(createTagList('ul', elem.bonuses))
                writeParagraphs(projectsDiv, elem.outroParagraphs)
                break;
            case "webserv":
                projectsDiv.append(createTagList('ul', elem.requirements))
                writeParagraphs(projectsDiv, elem.outroParagraphs)
                break;
            case "transcendence":
                projectsDiv.append(createTagList('ul', elem.components))
                writeParagraphs(projectsDiv, elem.componentParagraphs)
                projectsDiv.append(createTagList('ul', elem.techStack))
                writeParagraphs(projectsDiv, elem.moduleParagraphs)
                projectsDiv.append(createTagList('ul', elem.myModules))
                insertLinkParagraph(projectsDiv, elem.linkIntro, elem.links[0])
                break;
        }
    })

    // contact me
    const divContact = createTag('div')
    body.append(divContact)
    const contact = text.contact
    divContact.append(
        createTag('h2', {innerHTML: contact.h2}),
        createTag('p', {innerHTML: contact.intro})
    )
    divContact.append(createTagList('ul', contact.links, (link) => {
        const li = createTag('li')
        li.appendChild(createTag('a', {innerHTML: link.label, href: link.href}))
        return li
    }))
}

initPage()