import { getData } from "./fetch.js"
import { createTag, writeParagraphs, createList, insertLinkParagraph } from "./tag.js"

async function initPage() {
    // get file data
    let text = await getData("../data/fr.json")

    //append title and h1
    document.head.append(createTag('title', text.meta.title))
    let body = document.body
    body.append(createTag('h1', text.home.h1))

    //append 1st paragraph
    const about = text.about
    let divPresentation = createTag('div')
    body.append(divPresentation)
    divPresentation.append(createTag('h2', about.h2))
    writeParagraphs(divPresentation, about.paragraphs)

    //append 2nd paragraph
    const journey = text.journey
    let divJourney = createTag('div')
    body.append(divJourney)
    divJourney.append(createTag('h2', journey.h2))
    writeParagraphs(divJourney, journey.paragraphs)

    //append 3rd paragraph
    const skills = text.skills
    let ol = createTag('ol')
    let divSkills = createTag('div')
    body.append(divSkills)
    divSkills.append(createTag('h2', skills.h2), createTag('p', skills.intro), ol)
    skills.categories.forEach((keys) => {
        ol.append(createTag('li', keys.title))
        ol.append(createList('ul', keys.items))
        ol.append(createTag('br'))
    })
    divSkills.append(createTag('p', skills.outro))

    //append 4th paragraph
    const projects = text.projects
    let projectsDiv = createTag('div')
    body.append(projectsDiv)
    projectsDiv.append(createTag('h2', projects.h2))
    //personnal projects
    const pers = projects.personal
    projectsDiv.append(createTag('h3', pers.h3))
    pers.list.forEach(elem => {
        projectsDiv.append(createTag('h4', elem.h4, elem.id))
        writeParagraphs(projectsDiv, elem.paragraphs)
        insertLinkParagraph(projectsDiv, elem.linkIntro, elem.links[0])
    })
    //school projects
    const school = projects.school
    projectsDiv.append(
        createTag('h3', school.h3),
        createTag('p', school.intro)
    )
    school.list.forEach(elem => {
        projectsDiv.append(createTag('h4', elem.h4, elem.id))
        writeParagraphs(projectsDiv, elem.paragraphs)
        projectsDiv.append(createList('ul', elem.bonuses))
        projectsDiv.append(createList('ul', elem.requirements))
        projectsDiv.append(createList('ul', elem.states))
        projectsDiv.append(createList('ul', elem.components))
        writeParagraphs(projectsDiv, elem.bonusParagraphs)
        writeParagraphs(projectsDiv, elem.stateParagraphs)
        writeParagraphs(projectsDiv, elem.outroParagraphs)
        writeParagraphs(projectsDiv, elem.componentParagraphs)
        projectsDiv.append(createList('ul', elem.techStack))
        writeParagraphs(projectsDiv, elem.moduleParagraphs)
        projectsDiv.append(createList('ul', elem.myModules))
        if (elem.links) {
            insertLinkParagraph(projectsDiv, elem.linkIntro, elem.links[0])
        }
    })

    // contact me

    let divContact = createTag('div')
    body.append(divContact)
    const contact = text.contact
    divContact.append(
        createTag('h2', contact.h2),
        createTag('p', contact.intro)
    )
    divContact.append(createList('ul', contact.links, (link) => {
        let li = createTag('li')
    li.appendChild(createTag('a', link.label, '', link.href))
    return li
    }))
    console.log(divContact)
    //log struct
    console.log(text)
    
}

initPage()
