# credits.json, version 0.1

A small, open format for listing the tools, code and works a website was built with, and for marking which parts of the page each one made. `credit.js` reads it to draw the Credits button and highlights, but the format doesn't depend on the script: any tool can read it.

## Where it lives

A site publishes its credits in one of these ways. Readers check them in this order:

1. `data-src` on the script tag: `<script src="credit.js" data-src="/credits.json" defer></script>`
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

**Recommended: at the bottom of the page.** By default `credit.js` puts its Credits button centred inside the site's `<footer>`, or at the very end of the page if there's no footer. Pressing it fades the whole page to its own background colour, except for the parts made with credited tools, which stay clear with a label naming the tool and its maker. A bar of every credit opens at the bottom, in pills, with a card above it for the chosen one: what it is, its license, Show on page and Open original. Pressing it again, the ×, or Esc brings the page back.

To choose the place yourself, mark it with `data-credit-button`:

- on a `<button>` or `<a>`, that element becomes the Credits button, in the site's own style: `<button data-credit-button>Credits</button>`
- on anything else (a `<div>`, a footer column), Credit's own button is put inside it

To float the button in a corner of the window, set `data-position` on the script tag.

## The script's options

Set as attributes on the `<script>` tag:

| Attribute | Values | Default |
|---|---|---|
| `data-src` | where to find credits.json | see *Where it lives* |
| `data-position` | `bottom` (in the footer), `bottom-right`, `bottom-left`, `top-right`, `top-left` | `bottom` |
| `data-theme` | `auto`, `light`, `dark` | `auto` |
| `data-accent` | any CSS color, for the outlines and the active marker | `#0b6cff` |
| `data-on-accent` | the color for text on the accent | `#ffffff` |
| `data-label` | the button's text | `Credits` |
| `data-button` | `none` hides the button, for sites that open Credits from their own code | shown |

For full control, set these custom properties anywhere in the site's CSS (usually `:root`, and again for a dark theme):

| Property | What it sets | Default |
|---|---|---|
| `--credit-fade-color` | the colour the page fades to | the page's background |
| `--credit-fade` | how far it fades, 0 to 1 | `0.9` |
| `--credit-accent`, `--credit-on-accent` | outlines, check badges, the active marker and the Open button, and their text | blue, white |
| `--credit-bg` | the card and the labels | white (dark in dark mode) |
| `--credit-tray`, `--credit-chip`, `--credit-chip-active` | the pill trays, their pills, and the chosen pill | light greys |
| `--credit-fg`, `--credit-muted`, `--credit-line`, `--credit-shadow` | text, quieter text, hairlines and shadows | |
| `--credit-font`, `--credit-radius`, `--credit-card-radius` | the type, pill rounding and card rounding | system sans, 999px, 28px |

The button, list, outlines and labels can also be styled with `credit-button::part(button)`, `credit-layer::part(panel)`, `::part(outline)` and `::part(label)`.

From the page's own scripts: `Credit.open()`, `Credit.close()`, `Credit.toggle()`, `Credit.isOpen`, `Credit.credits`. The document gets a `credit:toggle` event each time. A link to `page.html#credits` opens the page with credits already showing.
