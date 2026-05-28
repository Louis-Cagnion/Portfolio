/**
 * @param {string} type
 * @param {Object} attributes
 * @returns {Element}
 */
export function createTag(type, attributes = {}) {
    const newElement = document.createElement(type)

    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            newElement[key] = value
        }
    })
    return newElement
}

/**
 * @param {string} listTag
 * @param {object} items
 * @param {Function} func util function that makes you able to modify each
 *                        item before adding them to the list, an li tag must be returned
 * 
 * @returns {Element}
 */
export function createTagList(listTag, items, func = null) {
    if (items === undefined || !items || !items.length)
        return document.createDocumentFragment()
    const l = createTag(listTag === 'ul' ? 'ul' : 'ol')
    items.forEach(item => {
        const li = (func !== null ? func(item) : createTag('li', {innerHTML: item}))
        l.append(li)
    })
    return l
}

/**
 * @param {string} parentTag 
 * @param {Object.<string>} pList
 *  
 * @returns {Element}
 */
export function writeParagraphs(parentTag, pList) {
    if (!pList || !pList.length)
        return
    pList.forEach(p => {
        parentTag.append(createTag('p', {innerHTML: p}))
    })
}

/**
 * Create a paragraph, insert a link at the end and append it to parentTag
 * 
 * @param {Element} parentTag 
 * @param {string} intro 
 * @param {object} linkParams contains label and href
 */
export function insertLinkParagraph(parentTag, intro, linkParams) {
    if (!linkParams || !linkParams.label || !linkParams.href)
        return
    const p = createTag('p', {innerHTML: intro + ' '})
    const link = createTag('a', {innerHTML: linkParams.label, href: linkParams.href})
    p.appendChild(link)
    parentTag.append(p)
}