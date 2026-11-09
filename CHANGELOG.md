# Changelog

Shoutout follows [semantic versioning](https://semver.org): within a major version, a release never breaks a site that worked with an earlier one. The `credits.json` format has its own version; `"credit": "1.0"` files are read by every release.

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
