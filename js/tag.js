/**
 * @param {string} type tag type
 * @param {string} inner body
 * @param {string} id tag ID
 * @param {string} href link ref
 * 
 * @returns {Element}
 */
export function createTag(type, inner = '', id = '', href = '') {
    const newElement = document.createElement(type)
    newElement.innerHTML = inner
    if (id)
        newElement.id = id
    if (type === 'a')
        newElement.href = href
    return newElement
}

/**
 * @param {string} listTag
 * @param {object} items
 * @param {Function} func util function that makes you able to modify each item before adding them to the list, an li tag must be returned
 * 
 * @returns {Element}
 */
export function createTagList(listTag, items, func = null) {
    if (items === undefined || !items || !items.length)
        return document.createDocumentFragment()
    const l = createTag(listTag === 'ul' ? 'ul' : 'ol')
    items.forEach(item => {
        const li = (func !== null ? func(item) : createTag('li', item))
        l.append(li)
    })
    return l
}

/**
 * @param {string} parentTag 
 * @param {object} pList
 *  
 * @returns {Element}
 */
export function writeParagraphs(parentTag, pList) {
    if (!pList || !pList.length)
        return
    pList.forEach(p => {
        parentTag.append(createTag('p', p))
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
    const p = createTag('p', intro + ' ')
    const link = createTag('a', linkParams.label, '', linkParams.href)
    p.appendChild(link)
    parentTag.append(p)
}