/**
 * @param {string} type
 * @param {Object} attributes standard properties (id, className, innerHTML, href...) are set
 *   directly on the element; a `dataset` object is applied key by key as data-* attributes.
 * @returns {Element}
 */
export function createTag(type, attributes = {}) {
    const newElement = document.createElement(type)

    Object.entries(attributes).forEach(([key, value]) => {
        if (value === undefined || value === null)
            return
        if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                newElement.dataset[dataKey] = dataValue
            })
            return
        }
        newElement[key] = value
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

const EMBED_HOST_PATTERNS = [/youtube\.com/, /youtu\.be/, /vimeo\.com/]

/**
 * @param {string} src
 * @returns {boolean} true if src points to a known video-hosting embed (YouTube, Vimeo...)
 *                    rather than a local/direct video file
 */
function isEmbedUrl(src) {
    return EMBED_HOST_PATTERNS.some((pattern) => pattern.test(src))
}

/**
 * Render a gallery of illustrations (images, videos, links) for a project.
 * Entries missing their required src/href are skipped, so this is safe to
 * call with placeholder media arrays that haven't been filled in yet.
 *
 * @param {Element} parentTag
 * @param {Array<{type: 'image'|'video'|'link', src?: string, href?: string,
 *               alt?: string, caption?: string, label?: string}>} mediaList
 */
export function renderMedia(parentTag, mediaList) {
    if (!mediaList || !mediaList.length)
        return
    const gallery = createTag('div', {className: 'media-gallery'})

    mediaList.forEach((item) => {
        if (item.type === 'image' && item.src) {
            const figure = createTag('figure', {className: 'media-item'})
            figure.append(createTag('img', {src: item.src, alt: item.alt || '', loading: 'lazy'}))
            if (item.caption)
                figure.append(createTag('figcaption', {innerHTML: item.caption}))
            gallery.append(figure)
        } else if (item.type === 'video' && item.src) {
            const wrapper = createTag('div', {className: 'media-item media-video'})
            wrapper.append(
                isEmbedUrl(item.src)
                    ? createTag('iframe', {src: item.src, loading: 'lazy', allowFullscreen: true})
                    : createTag('video', {src: item.src, controls: true, poster: item.poster || ''})
            )
            gallery.append(wrapper)
        } else if (item.type === 'link' && item.href) {
            gallery.append(createTag('a', {
                className: 'media-item media-link',
                href: item.href,
                innerHTML: item.label || item.href,
                target: '_blank',
                rel: 'noopener noreferrer',
            }))
        }
    })

    if (gallery.childElementCount)
        parentTag.append(gallery)
}

/**
 * Build a collapsible card using the native <details>/<summary> elements
 * (expand-on-click, keyboard accessible, no JS state management needed).
 *
 * @param {string} summaryHTML content of the always-visible summary/header
 * @param {(body: Element) => void} buildBody callback that appends the
 *        card's collapsible content to the body element it receives
 * @returns {Element}
 */
export function createDetails(summaryHTML, buildBody) {
    const details = createTag('details', {className: 'project-card'})
    details.append(createTag('summary', {innerHTML: summaryHTML}))
    const body = createTag('div', {className: 'project-card-body'})
    buildBody(body)
    details.append(body)
    return details
}