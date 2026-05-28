import { createTagList, insertLinkParagraph, writeParagraphs } from "./tag.js";

export const renderProjects = {
    "fract-ol": (tag, elem) => {
        tag.append(createTagList('ul', elem.bonuses))
    },
    "minishell": (tag, elem) => {
        tag.append(createTagList('ul', elem.requirements))
        writeParagraphs(tag, elem.bonusParagraphs)
    },
    "philosophers": (tag, elem) => {
        tag.append(createTagList('ul', elem.states))
        writeParagraphs(tag, elem.stateParagraphs)
    },
    "cub3d": (tag, elem) => {
        tag.append(createTagList('ul', elem.bonuses))
        writeParagraphs(tag, elem.outroParagraphs)
    },
    "inception": (tag, elem) => {
        tag.append(createTagList('ul', elem.bonuses))
        writeParagraphs(tag, elem.outroParagraphs)
    },
    "webserv": (tag, elem) => {
        tag.append(createTagList('ul', elem.requirements))
        writeParagraphs(tag, elem.outroParagraphs)
    },
    "transcendence": (tag, elem) => {
        tag.append(createTagList('ul', elem.components))
        writeParagraphs(tag, elem.componentParagraphs)
        tag.append(createTagList('ul', elem.techStack))
        writeParagraphs(tag, elem.moduleParagraphs)
        tag.append(createTagList('ul', elem.myModules))
        insertLinkParagraph(tag, elem.linkIntro, elem.links[0])
    }
}