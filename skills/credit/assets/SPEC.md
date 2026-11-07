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
| `kind` | no | What it is: `shader`, `font`, `library`, `image`, `icon`, `animation`, `template`, `code`, `music` and so on |
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

## The script's options

Set as attributes on the `<script>` tag:

| Attribute | Values | Default |
|---|---|---|
| `data-src` | where to find credits.json | see *Where it lives* |
| `data-position` | `bottom-right`, `bottom-left`, `top-right`, `top-left` | `bottom-right` |
| `data-theme` | `auto`, `light`, `dark` | `auto` |
| `data-accent` | any CSS color, for the highlights and labels | `#ffd84d` |
| `data-on-accent` | the color for text on the accent | `#141414` |
| `data-label` | the button's text | `Credits` |
| `data-button` | `none` hides the button, for sites with their own link | shown |

For full control, set custom properties on the `credit-layer` element in the site's own CSS: `--credit-accent`, `--credit-on-accent`, `--credit-bg`, `--credit-fg`, `--credit-muted`, `--credit-line`, `--credit-dim`, `--credit-font`, `--credit-radius`. The button, panel, outlines and labels can also be styled with `credit-layer::part(button)`, `::part(panel)`, `::part(outline)` and `::part(label)`.

From the page's own scripts: `Credit.open()`, `Credit.close()`, `Credit.toggle()`, `Credit.isOpen`, `Credit.credits`. The document gets a `credit:toggle` event each time. A link to `page.html#credits` opens the page with credits already showing.
