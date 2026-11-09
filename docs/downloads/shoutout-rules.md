<!-- Shoutout 2.0.0: rules for coding agents. Add this to your project's AGENTS.md, CLAUDE.md or Cursor rules. Built from https://github.com/gentlycarved-arch/shoutout -->

When the user shares a link to someone else's tool or work that they're using on the site, mentions a tool they made the site with, or asks to credit, audit or update credits, follow these instructions.

# Shoutout

Shoutout adds a small **Credits** button to the bottom of any website. Pressing it fades the page away except for the parts made with someone else's work (a shader behind an image effect, a UI kit's components, a hover from someone's skill), which glow in their own shape, each with a small title linking to the original and "by" its maker; hovering one grows it to show their bio.

- `shoutout.js`: the script, version 2.0.0: download it from https://raw.githubusercontent.com/gentlycarved-arch/shoutout/main/shoutout.js (its version is on its first line)
- `credits.json`: the list of credits (format in the spec (https://github.com/gentlycarved-arch/shoutout/blob/main/SPEC.md))
- `data-credit="id"` on the elements each one made

Do this quietly as part of the work. The user shouldn't have to ask twice or fill anything in by hand.

## When the user shares something they're using

1. **Read the link** to fill in the entry: the tool's own name, the maker's name or handle, the maker's page, and the license or terms. Get these from the page itself, the repo's LICENSE and README, or the post. If a page needs a browser to show its content (Figma Community, many social sites), open it in a browser rather than giving up. Never invent an author or license. If the page can't be read or doesn't say, leave the field out and tell the user what's missing in one line.
   - **The maker's other profiles (`authorLinks`):** when the maker's page links to their other profiles (X, GitHub, Instagram, their own site), list them, so the maker finds the credit whichever one they search by.
   - **The maker's bio (`about`):** open the maker's profile and copy their own bio, word for word, trimmed to about 160 characters at a sentence or phrase break. Where to look, in order: GitHub (`https://api.github.com/users/<name>` gives `bio`); their own website (the `<meta name="description">` or the first line of their about page); their X, Instagram, Bluesky, Dribbble or Figma profile, if it can be read. Never write or polish a bio yourself, and never paste in someone else's description of them. If no bio can be read, leave `about` out and say so in one line.
2. **Is it a part or a tool?**
   - **A part** (the default): something on the page was made with it: a shader on an image, a UI kit's components, an icon set, a font, a hover effect.
   - **A tool** (`"role": "tool"`): something the site was *made with*: a Figma plugin, a generator, an app, an AI skill, a converter. If the tool made specific things on the page (pictures it engraved, a pattern it generated), tag those too; otherwise it's listed under "Made with".
3. **Set up Shoutout if the site doesn't have it yet** (no `shoutout.js` in the project):
   - copy `shoutout.js` (https://raw.githubusercontent.com/gentlycarved-arch/shoutout/main/shoutout.js) into the site's static folder (where its other scripts live)
   - create `credits.json` at the site root with `"credit": "1.0"`
   - in every page's `<head>`, add `<link rel="credits" href="/credits.json">` (relative path if the site opens from files)
   - before `</body>` on every page, add `<script src="…/shoutout.js" defer></script>`
   - the button goes at the bottom of the page (recommended, and the default: centred in the site's `<footer>`). If the site's footer has its own links, add `<button data-shoutout-button>Credits</button>` there styled like those links, so it looks like part of the site. Only put it elsewhere if the user asks
   - match the site: if it has a light and dark theme or a clear accent color, set `data-accent`, or set `--shoutout-*` properties on `:root` in the site's CSS for each theme (see the spec (https://github.com/gentlycarved-arch/shoutout/blob/main/SPEC.md))
   - if the site's builder can't serve extra files (Webflow, Squarespace embed, a single HTML file), put the credits inline in `<script type="application/credits+json">` and load `shoutout.js` from wherever it can be hosted
   - for React, Vue, Svelte or Astro, put `shoutout.js` in `public/` and the tags in the root layout, add `data-credit` as an ordinary attribute in components, and call `Shoutout.refresh()` after a route change
4. **If what was used is a motion** (a hover effect, a transition, an animation from someone's snippet, skill or library), add `replay` so Credits plays it slowly while it's on:
   - a CSS hover: `"replay": "hover"`, and add `[data-shoutout-hover]` next to the effect's `:hover` selector in the site's CSS, e.g. `.card:hover, .card[data-shoutout-hover] { … }`. This is the safe one: nothing else on the site reacts.
   - a hover driven by a script: `"replay": "hover-events"`, but only after checking what those mouse events do on that element. If they also open a menu, play media, track analytics or change anything beyond the effect, use `"hover"` and add the attribute selector instead, or leave `replay` out.
   - an animation: `"replay": "animation"`.
5. **Add the entry** to `credits.json` with a short, unique `id` (e.g. `banknote-shader`) and a one-sentence `note` saying how the site uses it.
6. **Tag what it made**: add `data-credit="id"` to each element the tool produced or renders into (`<img>`, `<canvas>`, `<svg>`, `<video>`, an SVG `<image>`, a section). If an element uses several, separate the ids with spaces. If the markup is generated and can't take attributes, use `selectors` in the entry. Parts inside a same-origin `<iframe>` can be tagged in the frame's own page. Things with nothing to point at (a library, a font used everywhere, a build tool) get an entry and no tag.
   - **Something drawn by code with no element of its own** (an object in a three.js or WebGL scene, a region of a canvas): add a `Shoutout.area(id, () => ({ x, y, width, height, radius }))` call in the page's script, inside a `shoutout:ready` listener, returning where it is on screen from the scene's own projection, or `null` when it's hidden. See the spec (https://github.com/gentlycarved-arch/shoutout/blob/main/SPEC.md).
   - The glow follows each part's shape (SVG outlines, see-through pictures and canvases, CSS `clip-path`). If a part glows as a box but has a clear shape, giving it a `clip-path` that matches is a good fix.
7. **Check the license.** If it asks for more than a credit (MIT and similar want their license text kept with the code; CC BY wants credit in a set form; some forbid commercial use), tell the user in one line what it asks for. Shoutout gives the credit; it doesn't satisfy a license by itself.
8. **Tell the user** in one line what was credited and where, e.g. "Credited the Dollar Bill Texture Shader by Praveen Kumar on the landing angel."

Keep tags up to date as the site changes: when you add an element made with something already in `credits.json`, tag it; when you remove the last element using a credit, ask whether to keep the entry in the list.

## Updating Shoutout

When the user asks to update Shoutout, or when you're working in a site whose `shoutout.js` is older than `shoutout.js` (https://raw.githubusercontent.com/gentlycarved-arch/shoutout/main/shoutout.js) (compare the version on the first line): copy `shoutout.js` (https://raw.githubusercontent.com/gentlycarved-arch/shoutout/main/shoutout.js) over the site's copy, note the version change in one line, and mention anything from the spec (https://github.com/gentlycarved-arch/shoutout/blob/main/SPEC.md) worth using (for example, `role` or `authorLinks`). Within 1.x nothing on the site needs to change. A site loading Shoutout from the CDN at `@1` updates by itself.

## Getting listed, so makers can find their shoutouts

When the site is live, offer once to add it to the open list, so makers searching "See your shoutouts" find it. It's the user's call: never open the issue for them. Give them this link with their address filled in:

`https://github.com/gentlycarved-arch/shoutout/issues/new?template=add-site.yml&url=<their site's address>`

## Auditing a site

When asked to set up or check credits on an existing site, look for things made by others:

- links and comments in the code naming a source (`// from …`, `// based on …`, `// shader by …`, URLs to CodePen, Shadertoy, GitHub, Figma Community, X/Twitter)
- `package.json` dependencies, `<script>` and `<link>` tags loading from CDNs, font files and `@font-face`, Google Fonts links
- license headers in vendored files, and the README's own thanks or sources
- the git log, for commits mentioning a source
- tools the site was made with that the README or commits mention (generators, plugins, skills)

List what you found and what you'd add, and add it once the user agrees. Don't credit the site's own work or standard browser features.

## Rules

- Never fabricate an author, bio, link or license, and never credit someone for something they didn't make.
- Links in `credits.json` must be `http` or `https`.
- Keep the user's own design: don't restyle the site, only the Shoutout layer.
- Don't remove existing credits written elsewhere (a footer, an About page). Shoutout adds to them.
