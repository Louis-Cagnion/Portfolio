# Portfolio

A developer portfolio set in space: you fly a ship through a developer's journey, browse skills as constellations, zoom into projects as planets and write to the author through a golden record. It is written in plain JavaScript, HTML and CSS, with no framework, no build step and no npm, and it runs in French and English.

🔗 You can access the website here:
https://louis-cagnion.github.io/Portfolio/

## Table of Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Run locally](#run-locally)
- [Access](#access)
- [Use of AI](#use-of-ai)
- [Contributors](#contributors)

---

## How it works

The site is a single page with five sections, shown one at a time over an animated starry sky. Navigation relies on the URL hash (`#home`, `#journey`, `#skills`, `#projects`, `#contact`), so the back button, reloads and direct links work. Changing section triggers a short hyperspace jump.

| Section | What the visitor sees |
| --- | --- |
| Home | The mission, the name, a short pitch, two calls to action, a telemetry panel with the key steps of the career and a "pilot file" with the author's background. |
| Journey | A ship that travels from stop to stop (from Earth to a galaxy) along a path; choosing a stop flies the ship there and shows its story below. |
| Skills | Eight constellations whose stars are skills, each star drawn according to its level (unknown, beginner, intermediate, advanced). A constellation unfolds into a panel with a description and linked projects. |
| Projects | Four star systems, one planet per project (professional, personal, school and the 42 piscine). Zooming into a system shows its projects; a planet opens a side sheet with details and links. |
| Contact | A golden record: its label copies the email address and each groove leads to a network. |

The Skills section links to [Devpedia](https://louis-cagnion.github.io/Devpedia/) for a more detailed view of each technology, and a linked project in a skill panel jumps straight to its planet in the Projects section.

## Features

- **French and English**: every text comes from `data/fr.json` and `data/en.json`; the language switch in the header changes the language and the choice is remembered.
- **Validated content**: each JSON file is checked against a schema at load time, and a missing or invalid field is reported on a loading and error screen with a retry button.
- **Keyboard accessibility**: visible focus, named controls, Enter and Space on stops and arrows, and a project sheet that traps focus and closes with Escape.
- **Reduced motion**: when the system asks for less motion, the sky is a still image, jumps and zooms are immediate and the animation loops stay stopped.
- **Responsive from 320 px to 2560 px**: the section bar becomes a tab bar on narrow screens, and layouts use breakpoints in `em` so they follow the browser font size.
- **Safe rendering**: texts enter the page as text nodes, and the few rich texts (bold, italic, links) go through a whitelist filter, never through raw `innerHTML`.
- **Long words**: a shared observer shrinks a font just enough that no word is cut or overflows.

## Architecture

```
index.html      page shell: header, the five sections, status screen, project sheet
css/            one stylesheet per concern
js/             ES modules
data/           texts of the site, one JSON file per language
assets/         favicon
```

- `css/`: `tokens.css` holds the design tokens (colors, fonts, durations); `layout.css` and `panel.css` style the shell and shared panels; `home.css`, `journey.css`, `skills.css`, `projects.css` and `contact.css` style each section.
- `js/main.js`: entry point; loads the language, mounts the sections, starts the sky, the router and the language switch.
- `js/boot-guard.js`: classic script that shows the error screen if the module graph fails to load.
- `js/core/`: `data.js` loads and caches a language file with a timeout; `schema.js` validates it; `i18n.js` picks the language; `router.js` handles hash navigation and the hyperspace jump; `dom.js` builds HTML and SVG elements and filters rich text; `motion.js` handles reduced motion and the SVG camera; `fit-words.js` caps word widths.
- `js/sections/`: one `mount` per section (`home.js`, `journey.js`, `skills.js`, `projects.js`, `contact.js`), split into helpers for drawing (`*-art.js`), placement (`*-layout.js`) and behavior (for example `skills-focus.js`, `projects-zoom.js`, `journey-ship.js`).
- `js/ui/`: `nav.js` (section bar and tab bar), `starfield.js` (canvas sky), `sheet.js` (project sheet), `status.js` (loading and error screen).
- `data/`: `fr.json` and `en.json` contain all displayed text, with the same structure in both languages.

## Technologies

- JavaScript (ES modules), loaded directly by the browser
- HTML
- CSS (custom properties, media queries)
- SVG for the journey, constellations, systems and golden record
- Canvas for the starry sky
- Google Fonts: Michroma, IBM Plex Sans and IBM Plex Mono

## Run locally

There is nothing to install or build. ES modules do not load from `file://`, so serve the folder with any static server, for example:

```
python3 -m http.server 5500
```

Then open `http://localhost:5500/`.

## Access

The site is published at https://louis-cagnion.github.io/Portfolio/ and works in current desktop and mobile browsers.

## Use of AI

The code, the tests and the documentation texts were written with Claude Code (Anthropic), under the direction and validation of the author. The author uses Claude and design skills to produce modern graphical renderings, like this portfolio, chose the design directions, and reviewed and validated the rendering in the browser. The contents (texts, journey, projects) are the author's own.

## Contributors

- Louis Cagnion
