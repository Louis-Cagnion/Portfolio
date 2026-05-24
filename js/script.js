import { fetchData } from "./fetch.js"
import { createTag, writeParagraphs, createTagList, insertLinkParagraph } from "./tag.js"

async function initPage() {
    // get file data
    const text = await fetchData("../data/fr.json")

    //append title and h1
    document.head.append(createTag('title', text.meta.title))
    const body = document.body
    body.append(createTag('h1', text.home.h1))

    //append 1st paragraph
    const about = text.about
    const divPresentation = createTag('div')
    body.append(divPresentation)
    divPresentation.append(createTag('h2', about.h2))
    writeParagraphs(divPresentation, about.paragraphs)

    //append 2nd paragraph
    const journey = text.journey
    const divJourney = createTag('div')
    body.append(divJourney)
    divJourney.append(createTag('h2', journey.h2))
    writeParagraphs(divJourney, journey.paragraphs)

    //append 3rd paragraph
    const skills = text.skills
    const ol = createTag('ol')
    const divSkills = createTag('div')
    body.append(divSkills)
    divSkills.append(createTag('h2', skills.h2), createTag('p', skills.intro), ol)
    skills.categories.forEach((keys) => {
        ol.append(createTag('li', keys.title))
        ol.append(createTagList('ul', keys.items))
        ol.append(createTag('br'))
    })
    divSkills.append(createTag('p', skills.outro))

    //append 4th paragraph
    const projects = text.projects
    const projectsDiv = createTag('div')
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
        switch (elem.h4) {
            case "Fract-ol":
                projectsDiv.append(createTagList('ul', elem.bonuses))
                break;
            case "Minishell":
                projectsDiv.append(createTagList('ul', elem.requirements))
                writeParagraphs(projectsDiv, elem.bonusParagraphs)
                break;
            case "Philosophers":
                projectsDiv.append(createTagList('ul', elem.states))
                writeParagraphs(projectsDiv, elem.stateParagraphs)
                break;
            case "Cub3D" || "Inception":
                projectsDiv.append(createTagList('ul', elem.bonuses))
                writeParagraphs(projectsDiv, elem.outroParagraphs)
                break;
            case "Webserv":
                projectsDiv.append(createTagList('ul', elem.requirements))
                writeParagraphs(projectsDiv, elem.outroParagraphs)
                break;
            case "Transcendence":
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
        createTag('h2', contact.h2),
        createTag('p', contact.intro)
    )
    divContact.append(createTagList('ul', contact.links, (link) => {
        const li = createTag('li')
    li.appendChild(createTag('a', link.label, '', link.href))
    return li
    }))
}

initPage()