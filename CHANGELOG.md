# Changelog

Flowers follows [semantic versioning](https://semver.org): 1.x releases never break a site that works with 1.0, and `"credit": "1.0"` files are read by every 1.x.

## 1.0.0

The first numbered release.

- **The glow follows each part's own shape:** SVG outlines with their masks and fills, see-through pictures, see-through `<canvas>` drawings (read twice a second; a WebGL canvas that can't be read glows as its box), CSS `clip-path` circles, ellipses, insets and polygons, background pictures that aren't tiled, and the icons inside a plain wrapper.
- **Parts inside a same-origin `<iframe>`** can be credited and line up with the frame.
- **Parts drawn by code** (an object in a 3D scene) with `Flowers.area(id, where)`.
- **Tools:** `"role": "tool"` credits something the site was made with (a plugin, a generator, a skill). With nothing tagged it's listed under "Made with".
- **Safer motion replay:** `"replay": "hover"` now only sets `data-flowers-hover`, so nothing else on a site reacts. The old behaviour, which also sent mouse events, is `"replay": "hover-events"`, and `Flowers.replaying` is true while those events are sent.
- **Pop-up:** a white square with the title and "by" the maker; on hover it grows smoothly (600 ms) to the maker's bio, or the credit's note.
- **Being found:** `authorLinks` lists a maker's other profiles. The search page and tools share one set of rules (`docs/match.js`): x.com and twitter.com, www., trailing slashes and case on profile sites all count as the same maker, and `@handle` finds a handle on any known site. Sites get listed by opening an "Add my site" issue, with no pull request.
- `Flowers.version`, `Flowers.refresh()`, and a `flowers:ready` event.
- `credits.json` is always re-checked rather than read from a saved copy.
- Tested in Chromium, Firefox and WebKit, and on iPhone and Android sizes with touch.

## 0.1

The first version, as Credit.
