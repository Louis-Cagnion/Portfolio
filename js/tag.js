/**
 * @param {string} type //tag type
 * @param {string} inner //body
 * @param {string} id //tag ID
 * @param {string} href //link ref
 * 
 * @returns {Element}
 */
export function createTag(type, inner = '', id = '', href = '') {
    let newElement = document.createElement(type)
    newElement.innerHTML = inner
    if (id)
        newElement.id = id
    if (type === 'a')
        newElement.href = href
    return newElement
}

/**
 * @param {string} tagType //list tag type 
 * @param {object} items
 * 
 * @returns {Element}
 */
export function createList (tagType, items, func = null) {
    if (items === undefined || !items || !items.length)
        return document.createDocumentFragment()
    let l = createTag(tagType === 'ul' ? 'ul' : 'ol')
    items.forEach(item => {
        let li = func !== null ? func(item) : createTag('li', item)
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
 * @param {Element} parentTag 
 * @param {string} intro 
 * @param {object} links //contains label and href
 */
export function insertLinkParagraph(parentTag, intro, links) {
    if (!links || !links.label || !links.href)
        return
    let p = createTag('p', intro + ' ')
    const link = createTag('a', links.label, '', links.href)
    p.appendChild(link)
    parentTag.append(p)
}