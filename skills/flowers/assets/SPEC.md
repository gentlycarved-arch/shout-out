# Flowers

Give the makers their flowers. When a website uses someone's shader, UI kit, font, snippet or tool, Flowers shows it: press the Credits button and the page fades to dark, except for the parts made with other people's work, which glow in their own shape, each with a small title linking to the original and "by" its maker. Hover one and it grows to show a line about them.

The credits themselves are kept in an open, plain format, `credits.json`, described below, so anything can read them, not only Flowers.

## credits.json, version 1.0

A small, open format for listing the tools, code and works a website was built with, and for marking which parts of the page each one made. **Flowers** (`flowers.js`) reads it to give the makers their flowers on the page, but the format doesn't depend on the script: any tool can read it.

## Where it lives

A site publishes its credits in one of these ways. Readers check them in this order:

1. `data-src` on the script tag: `<script src="flowers.js" data-src="/credits.json" defer></script>`
2. In the page: `<script type="application/credits+json">{ … }</script>`, for site builders that can't host extra files
3. A link in the `<head>`: `<link rel="credits" href="/credits.json">`
4. `credits.json` next to the page

The `<link rel="credits">` line is recommended even when the script isn't used, so other tools can find the file. Flowers always checks for the latest copy of the file rather than a saved one.

## The file

```json
{
  "credit": "1.0",
  "site": "The Toronto Society",
  "credits": [
    {
      "id": "banknote-shader",
      "name": "Dollar Bill Texture Shader",
      "author": "Praveen Kumar",
      "authorUrl": "https://www.figma.com/@praveenisomer",
      "authorLinks": ["https://x.com/example"],
      "about": "Makes free shaders and textures for Figma.",
      "url": "https://www.figma.com/community/file/1686908159036705400/dollar-bill-texture-shader",
      "license": "Figma Community",
      "kind": "shader",
      "note": "Engraves the angel on the landing page.",
      "selectors": [".seal .angel-light"]
    },
    {
      "id": "engraver",
      "name": "Banknote Engraver",
      "author": "Someone",
      "url": "https://example.com/engraver",
      "role": "tool",
      "note": "Used to engrave the pictures before they went on the site."
    }
  ]
}
```

| Field | Required | What it is |
|---|---|---|
| `credit` | no | The format version, `"1.0"` (see *Versions*) |
| `site` | no | The site's name |
| `credits` | yes | The list. A bare array of credits is also accepted |
| `id` | yes | A short name for the credit, used to tag elements (letters, numbers, dashes) |
| `name` | yes | The tool or work's name, as its maker calls it |
| `author` | no | Who made it: a person, a group or a handle |
| `authorUrl` | no | The maker's main profile (`http` or `https` only) |
| `authorLinks` | no | The maker's other profiles, so they're found whichever one they search by: `["https://x.com/…", "https://github.com/…"]` |
| `about` | no | A short line about the maker, in their own words: their bio from their profile. Up to about 160 characters; the pop-up shows at most three lines |
| `url` | no | The original: the post, repo, page or file where it was shared (`http` or `https` only) |
| `role` | no | `"part"` (the default): something on the page was made with it. `"tool"`: a tool the site was made with, such as a plugin, a generator, an app or an AI skill. A tool can still tag the parts it made; with nothing tagged it's listed under "Made with" |
| `replay` | no | For a credit that's a motion: `"hover"`, `"hover-events"` or `"animation"` (see *Motion*) |
| `license` | no | The license or terms, e.g. `MIT`, `CC BY 4.0`, `Figma Community`, `free to use` |
| `kind` | no | What it is: `shader`, `ui`, `font`, `library`, `image`, `icon`, `animation`, `motion`, `plugin`, `skill`, `template`, `code`, `music` and so on |
| `note` | no | How the site used it, in one sentence. Shown on hover when there's no `about` |
| `selectors` | no | CSS selectors for the parts of the page it made, for sites that can't add attributes to their markup |

Readers ignore fields they don't know, so a site can add its own.

**Credit isn't a license.** Some free work asks for more than a credit, such as keeping an MIT license file with the code, or crediting a CC BY work in a particular way. Flowers gives the credit; it doesn't check the license.

## Marking the page

Tag any element made with a credited tool:

```html
<img src="angel.webp" data-credit="banknote-shader" alt="…">
```

An element made with several tools lists them all, separated by spaces: `data-credit="banknote-shader grain-filter"`. Elements inside a same-origin `<iframe>` can be tagged too, and line up with the frame. A cross-origin `<iframe>` can only be credited as a whole.

### The glow follows the part's own shape

| Part | Its shape |
|---|---|
| An element inside an `<svg>` | its own outline, with its masks, clips and fills |
| An `<svg>`, an `<img>`, a background picture that isn't tiled | its see-through edges |
| A `<canvas>` | its see-through edges, read twice a second; a WebGL canvas that can't be read glows as its box |
| An element with a CSS `clip-path` of `circle()`, `ellipse()`, `inset()` or `polygon()` | that shape |
| A wrapper with no fill or border of its own | the icons, pictures and canvases inside it |
| Anything else | its box, with its own rounded corners |

### Parts drawn by code

Something with no element of its own, like an object in a 3D or WebGL scene, is given to Flowers by the page's script: a function that returns where it is on screen each frame, or `null` while it's hidden.

```js
document.addEventListener('flowers:ready', () => {
  Flowers.area('chair-model', () => {
    const p = projectToScreen(chair);              // your scene's own maths
    return p.visible ? { x: p.x - 60, y: p.y - 40, width: 120, height: 80, radius: 12 } : null;
  });
});
```

It can also return an element, whose box is used. `Flowers.area` returns a function that removes the area again.

## Motion

A credit that's a motion (a hover effect, a transition, an animation) can play by itself, slowly, on a loop while Credits is on, about 1.6 s on and 1.8 s off, so people can see what was used. It never runs when the visitor has reduced motion on.

| `replay` | What happens | Use it when |
|---|---|---|
| `"hover"` | sets `data-flowers-hover` on the part. Nothing else happens, so no menu opens, no video starts and no analytics fire | the effect is CSS: add `[data-flowers-hover]` next to `:hover`, e.g. `.card:hover, .card[data-flowers-hover] { … }` |
| `"hover-events"` | also sends the mouse events a script listens for (`mouseenter`, `pointerover` and so on) | the effect is driven by a script, and those events do nothing but the effect. `Flowers.replaying` is `true` while they're sent, so a script can ignore them: `if (window.Flowers?.replaying) return;` |
| `"animation"` | restarts the part's own CSS or Web animations | the part has an animation that has already finished or is easy to miss |

## The button

**Recommended: at the bottom of the page.** By default `flowers.js` puts a small Credits button centred inside the site's `<footer>`, or at the very end of the page if there's no footer.

Pressing it fades the page to dark, except for the credited parts. Those glow in their own shape, each with a small white square just below it: the tool's `name` (linking to the original) and, under it, "by" the maker. Hovering one (tapping it on a phone, or tabbing to it) grows it, smoothly, to show the maker's bio, or the credit's `note` when there's no bio. Credits with nothing to point at are listed in one line at the bottom: the tools the site was made with under "Made with", then anything else (a font, a library) under "Also". Clicking anywhere on the faded page, pressing the button again, or Esc brings the page back.

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
| `--flowers-popup-bg`, `--flowers-popup-fg`, `--flowers-popup-muted` | the pop-ups, their text, and the maker line | white, black, grey |
| `--flowers-font`, `--flowers-radius` | the type, and the rounding of the button | Helvetica, 999px |

From the page's own scripts:

| | |
|---|---|
| `Flowers.open()`, `Flowers.close()`, `Flowers.toggle()` | turn Credits on and off |
| `Flowers.refresh()` | after the page changes (a new route, parts added or removed) |
| `Flowers.area(id, where)` | a part drawn by code (see above) |
| `Flowers.isOpen`, `Flowers.credits`, `Flowers.version`, `Flowers.replaying` | what's going on |
| `flowers:ready`, `flowers:toggle` | events on `document` |

A link to `page.html#flowers` opens the page with credits already showing.

## Versions

Flowers follows [semantic versioning](https://semver.org). `Flowers.version` says which one a page has, and the first line of `flowers.js` says it too.

- **Copy the file** into your site (the simplest; nothing outside your site is involved). To update, copy the new one over it. The skill does this for you when you ask it to update Flowers.
- **Or load it from a CDN**, once the repository is public, either pinned to one version or following the latest 1.x:

```html
<!-- one version, never changes -->
<script src="https://cdn.jsdelivr.net/gh/gentlycarved-arch/flowers@v1.0.0/flowers.js" defer></script>
<!-- the latest 1.x: fixes arrive by themselves, nothing breaks -->
<script src="https://cdn.jsdelivr.net/gh/gentlycarved-arch/flowers@1/flowers.js" defer></script>
```

The format follows the same rule. `"credit": "1.0"` files are read by every 1.x Flowers; new fields arrive in 1.1, 1.2 and so on, and older readers ignore them. Anything that would change what an existing field means waits for 2.0. Files that say `"0.1"` are read as 1.0. Changes are listed in `CHANGELOG.md`.

## Finding where your work is credited

Because credits are published in an open, predictable place (`<link rel="credits">`, inline, or `/credits.json`), anyone can find where a tool is credited, starting with its maker.

- **The search page,** `docs/find.html` ("See your flowers"), searches every listed site by name, @handle or link.
- **A maker is the same person across their links.** x.com and twitter.com, www. or not, a trailing slash or not, upper or lower case on profile sites, and every profile in `authorLinks` all count. Searching `@handle` finds that handle on any site Flowers knows: X, Figma, GitHub, Instagram, Threads, Bluesky, Dribbble, Behance, CodePen, LinkedIn, YouTube, TikTok and more. The rules live in one file, `docs/match.js`, shared by the search page and the tools.
- **Getting listed:** a site opens an "Add my site" issue with its address (the search page links to it). It's checked for credits, added to `registry/sites.txt`, and the issue is closed, without a pull request. Every night `tools/build-index.mjs` reads each listed site and writes `docs/index.json`, which anyone can read and build on.
- **Check sites yourself:** `node tools/find.mjs <you> <site> [site …]`.

To be found reliably, give each credit a `url` (the original), an `authorUrl` (the maker's main profile) and, when you know them, the maker's other profiles in `authorLinks`.
