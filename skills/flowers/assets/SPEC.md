# Flowers

Give the makers their flowers. When a website uses someone's shader, UI kit, font or snippet, Flowers shows it: press the Credits button and the page fades to dark, except for the parts made with other people's tools, which glow, each with a small title linking to the original. Hover one and its title opens up to show who made it and a line about them.

The credits themselves are kept in an open, plain format, `credits.json`, described below, so anything can read them, not only Flowers.

## credits.json, version 0.1

A small, open format for listing the tools, code and works a website was built with, and for marking which parts of the page each one made. **Flowers** (`flowers.js`) reads it to give the makers their flowers on the page, but the format doesn't depend on the script: any tool can read it.

## Where it lives

A site publishes its credits in one of these ways. Readers check them in this order:

1. `data-src` on the script tag: `<script src="flowers.js" data-src="/credits.json" defer></script>`
2. In the page: `<script type="application/credits+json">{ … }</script>`, for site builders that can't host extra files
3. A link in the `<head>`: `<link rel="credits" href="/credits.json">`
4. `credits.json` next to the page

The `<link rel="credits">` line is recommended even when the script isn't used, so other tools can find the file.

## The file

```json
{
  "credit": "0.1",
  "site": "The Toronto Society",
  "credits": [
    {
      "id": "banknote-shader",
      "name": "Dollar Bill Texture Shader",
      "author": "Jane Maker",
      "authorUrl": "https://x.com/janemaker",
      "about": "Makes free shaders and textures for Figma.",
      "url": "https://www.figma.com/community/file/1686908159036705400/dollar-bill-texture-shader",
      "license": "Figma Community",
      "kind": "shader",
      "note": "Engraves the angel on the landing page.",
      "selectors": [".seal .angel-light"]
    }
  ]
}
```

| Field | Required | What it is |
|---|---|---|
| `credit` | no | The format version, `"0.1"` |
| `site` | no | The site's name, shown at the top of the list |
| `credits` | yes | The list. A bare array of credits is also accepted |
| `id` | yes | A short name for the credit, used to tag elements (letters, numbers, dashes) |
| `name` | yes | The tool or work's name, as its maker calls it |
| `author` | no | Who made it: a person, a group or a handle |
| `authorUrl` | no | Where the author lives online (`http` or `https` only) |
| `about` | no | A short line about the maker, in their own words: their bio from the profile at `authorUrl`. Up to about 160 characters; the pop-up shows at most three lines |
| `replay` | no | `"hover"` or `"animation"`, for credits that are a motion. While Credits is on, the part plays it by itself, slowly, on a loop (about 1.6 s on, 1.8 s off), so people can see what was used. `"hover"` sends the mouse events a script listens for and sets `data-flowers-hover` on the element; add `[data-flowers-hover]` next to `:hover` in the site's CSS (`.card:hover, .card[data-flowers-hover] { … }`). `"animation"` restarts the element's own CSS or Web animations. Skipped when the visitor has reduced motion on |
| `url` | no | The original: the post, repo, page or file where it was shared (`http` or `https` only) |
| `license` | no | The license or terms, e.g. `MIT`, `CC BY 4.0`, `Figma Community`, `free to use` |
| `kind` | no | What it is: `shader`, `ui` (a UI kit, component or interface tool), `font`, `library`, `image`, `icon`, `animation`, `template`, `code`, `music` and so on |
| `note` | no | How the site used it, in one sentence |
| `selectors` | no | CSS selectors for the parts of the page it made, for sites that can't add attributes to their markup |

Readers ignore fields they don't know, so a site can add its own.

## Marking the page

Tag any element made with a credited tool:

```html
<img src="angel.webp" data-credit="banknote-shader" alt="…">
```

An element made with several tools lists them all, separated by spaces: `data-credit="banknote-shader grain-filter"`. HTML elements, SVG elements and `<canvas>` all work.

Credits that make nothing you can point to (a library, a build tool, a font used everywhere) need no tag. They appear in the list but aren't highlighted.

## The button

**Recommended: at the bottom of the page.** By default `flowers.js` puts a small Credits button centred inside the site's `<footer>`, or at the very end of the page if there's no footer.

Pressing it fades the page to dark, except for the parts made with credited tools. Those glow softly, each with a small white title (the tool's `name`, linking to the original). Hovering one (tapping it on a phone, or tabbing to it) opens the title up to show "Flowers to" the maker's name and their short bio, if there is one. Credits with nothing to point at on the page (a font, a library) are listed in one line at the bottom. Clicking anywhere on the faded page, pressing the button again, or Esc brings the page back.

The pop-up shows only `name`, `author`, `about` and `url`; `replay` drives the motion replay (or `authorUrl` when there's no `url`). The other fields are there for other tools and for anyone reading the file.

To choose the place yourself, mark it with `data-flowers-button`:

- on a `<button>` or `<a>`, that element becomes the Credits button, in the site's own style: `<button data-flowers-button>Credits</button>`
- on anything else, the Credits button is put inside it

To float the button in a corner of the window, set `data-position` on the script tag.

## The script's options

Set as attributes on the `<script>` tag:

| Attribute | Values | Default |
|---|---|---|
| `data-src` | where to find credits.json | see *Where it lives* |
| `data-position` | `bottom` (in the footer), `bottom-right`, `bottom-left`, `top-right`, `top-left` | `bottom` |
| `data-theme` | `auto`, `light`, `dark` | `auto` |
| `data-accent` | the glow colour | white |
| `data-label` | the button's text | `Credits` |
| `data-button` | `none` hides the button, for sites that open Flowers from their own code | shown |

To match a site, set these custom properties anywhere in its CSS (usually `:root`, and again for a dark theme):

| Property | What it sets | Default |
|---|---|---|
| `--flowers-fade-color` | the colour the page fades to | near-black `#0a0a0a` |
| `--flowers-fade` | how far it fades, 0 to 1 | `0.82` |
| `--flowers-accent` | the glow | white |
| `--flowers-bg`, `--flowers-fg` | the button and its text | white and black (dark in dark mode) |
| `--flowers-popup-bg`, `--flowers-popup-fg`, `--flowers-popup-muted` | the hover pop-ups, their text, and the link | white, black, grey |
| `--flowers-font`, `--flowers-radius` | the type, and the rounding of the button | Helvetica, 999px |

From the page's own scripts: `Flowers.open()`, `Flowers.close()`, `Flowers.toggle()`, `Flowers.isOpen`, `Flowers.credits`. The document gets a `flowers:toggle` event each time. A link to `page.html#flowers` opens the page with credits already showing.

## Finding where your work is credited

Because credits are published in an open, predictable place (`<link rel="credits">`, inline, or `/credits.json`), anyone can find where a tool is credited, starting with its maker.

- **Check sites yourself:** `node tools/find.mjs <you> <site> [site …]`. `<you>` is your name, `@handle`, or a link to your profile, tool or repo. A link matches any credit whose `url` or `authorUrl` is that link or inside it, so `x.com/yourname` finds every post of yours that's credited.
- **The open list:** sites that want to be found add their address to `registry/sites.txt` with a pull request. Every night `tools/build-index.mjs` reads each one and writes `docs/index.json`, and the search page `docs/index.html` lets creators search it by name, handle or link. Anyone can read `index.json` and build on it.

To be found reliably, give each credit a `url` (the original) and an `authorUrl` (the maker's profile). Those links are what creators search by.

