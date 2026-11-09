# Changelog

Shoutout follows [semantic versioning](https://semver.org): within a major version, a release never breaks a site that worked with an earlier one. The `credits.json` format has its own version; `"credit": "1.0"` files are read by every release.

## 2.5.0

- **Credit by file.** A credit can list the files it covers (`"files": ["/textures/paper-*.png", "images.unsplash.com/photo-123*"]`), and Shoutout finds every place the page uses them: `<img>` and srcset, `<picture>`, video posters, SVG images, and CSS backgrounds, masks and border images, including `::before` and `::after` layers.
- **Packs.** More than three parts from one credit glow together, with one pop-up at a time; the list says how many and steps through them.
- **Textures.** `"kind": "texture"` isn't lit. Its card shows a swatch and a switch that takes the texture off the page for a moment, so people see the difference it makes.
- **Credit inside image files.** The skill reads IPTC, XMP and Content Credentials (C2PA) from a site's images (`assets/read-image-credits.mjs`) and offers what it finds as options. The site's owner chooses what to credit.

## 2.4.0

- **Maker cards.** Makers can publish a `maker.json`: their name, a line about them, their links, how they'd like to be credited, their works, and whether to be listed. The skill reads a maker's card first, so their own words are the ones that show. The Shoutout site has a "Make your maker card" page that writes it.
- **Discover.** A new page lists makers who publish a card, searchable and filtered by kind (shaders, UI, motion, agent skills, icons, fonts, plugins), with the sites that gave them a shoutout. Makers add themselves with an "Add me to Discover" issue; the list is rebuilt every night into `docs/makers.json`.
- **Leaving out.** A maker can set `"listed": false`, or open a "Leave me out" issue, and their credits are left out of the search and Discover.

## 2.3.0

- **Light and dark.** Shoutout matches the page as it looks. On a light page, the page fades to white, the credited parts keep a soft dark glow, and the pop-ups and list are dark. On a dark page, it fades to near-black with a white glow and white pop-ups, as before. It reads the page's own background, so it follows a site's light/dark switch and the visitor's setting, and changes when they do. `data-theme="light"` or `"dark"` on the script tag fixes it to one.
- **Small icons are easier to see:** a line drawing up to about 96 px is opened up a little, so its thin lines and the space around them show through, not just the lines.
- New `--shoutout-glow` property: how strong the glow is (0 to 1).
- The Shoutout site has an examples page, with one of each kind of credit, and a new recording of it.

## 2.2.0

- **The button says Shoutout,** not Credits, and the list says "All shoutouts". A site that wants other words still sets `data-label` on the script, or uses its own `<button data-shoutout-button>`.

## 2.1.0

- **The list:** with Credits on, an "All credits" square at the top drops down to every credit on the site: the parts on this page, then "Made with" (the tools the site was made with), then "Also" (a font, a library). Hovering a name, or tabbing to it, keeps only that credit's parts lit and opens their pop-ups; everything else goes back under the fade. Clicking a name scrolls to its part. This replaces the one line at the bottom.

## 2.0.0

Flowers is now **Shoutout**: shoutout designers & makers on your website.

- **Renamed** (the breaking change): `flowers.js` is `shoutout.js`, `window.Flowers` is `window.Shoutout`, and every `flowers` name follows: `data-shoutout-button`, `data-shoutout-hover`, `--shoutout-*` properties, the `shoutout:ready` and `shoutout:toggle` events, `#shoutout` links, and the `shoutout` skill. The `credits.json` format is unchanged (`credits.json`, `<link rel="credits">`, `data-credit`), so a site's credits keep working.
- **Apps that change pages without reloading** (Next.js, Astro, Turbo, Framer and others): Shoutout puts itself back when an app replaces the page, keeps its Credits button working when the footer is drawn again, re-reads credits written in the page, and, while Credits is on, lights up the parts of each new page. Tested in real Next.js and Astro apps (`npm run test:apps`).
- A site's own `<button data-shoutout-button>` is answered through one listener, so it works however often an app redraws it.

## 1.0.0

The first numbered release, as Flowers.

- **The glow follows each part's own shape:** SVG outlines with their masks and fills, see-through pictures, see-through `<canvas>` drawings (read twice a second; a WebGL canvas that can't be read glows as its box), CSS `clip-path` circles, ellipses, insets and polygons, background pictures that aren't tiled, and the icons inside a plain wrapper.
- **Parts inside a same-origin `<iframe>`** can be credited and line up with the frame.
- **Parts drawn by code** (an object in a 3D scene) with `Shoutout.area(id, where)`.
- **Tools:** `"role": "tool"` credits something the site was made with (a plugin, a generator, a skill). With nothing tagged it's listed under "Made with".
- **Safer motion replay:** `"replay": "hover"` now only sets `data-shoutout-hover`, so nothing else on a site reacts. The old behaviour, which also sent mouse events, is `"replay": "hover-events"`, and `Shoutout.replaying` is true while those events are sent.
- **Pop-up:** a white square with the title and "by" the maker; on hover it grows smoothly (600 ms) to the maker's bio, or the credit's note.
- **Being found:** `authorLinks` lists a maker's other profiles. The search page and tools share one set of rules (`docs/match.js`): x.com and twitter.com, www., trailing slashes and case on profile sites all count as the same maker, and `@handle` finds a handle on any known site. Sites get listed by opening an "Add my site" issue, with no pull request.
- `Shoutout.version`, `Shoutout.refresh()`, and a `shoutout:ready` event.
- `credits.json` is always re-checked rather than read from a saved copy.
- Tested in Chromium, Firefox and WebKit, and on iPhone and Android sizes with touch.

## 0.1

The first version, as Credit.
