---
name: credit
description: Give the makers their flowers: credit the makers of free tools, code and works used on a website (shaders, fonts, libraries, icons, images, templates, snippets) with a Credits button that highlights the parts they made. Use whenever the user shares a link to someone else's tool or work and uses it on a site (e.g. "use this shader from @someone", a GitHub repo, a Figma Community file, a CodePen, a font page, a tweet), when they say "credit this", "add credits" or "who made what", or when asked to set up or audit credits. Also use when building a page with a credited tool already listed in the site's credits.json, so new elements get tagged.
---

# Flowers

Flowers (as in "give them their flowers") adds a small **Credits** button to the bottom of any website. Pressing it fades the page away except for the parts made with someone else's tools (a shader behind an image effect, a UI kit's components), which glow, each with a small title linking to the original; hovering one opens it up to show the maker and their bio.

- `flowers.js`: the script (bundled in this skill at `assets/flowers.js`)
- `credits.json`: the list of credits (format in `assets/SPEC.md`)
- `data-credit="id"` on the elements each tool made

Do this quietly as part of the work. The user shouldn't have to ask twice or fill anything in by hand.

## When the user shares a tool or work they're using

1. **Read the link** to fill in the entry: the tool's own name, the maker's name or handle, the maker's page, and the license or terms. Get these from the page itself, the repo's LICENSE and README, or the post. Never invent an author or license. If the page can't be read or doesn't say, leave the field out and tell the user what's missing in one line.
   **The maker's bio (`about`):** open the maker's profile and copy their own bio, word for word, trimmed to about 160 characters at a sentence or phrase break. Where to look, in order:
   - GitHub: `https://api.github.com/users/<name>` gives `bio`
   - their own website: the `<meta name="description">` or the first line of their about page
   - X/Twitter, Instagram, Bluesky, Dribbble or Figma profile, if the page can be read (X often can't be)
   Never write or polish a bio yourself, and never paste in someone else's description of them. If no bio can be read, leave `about` out and say so in one line, so the user can paste the maker's bio if they want it there.
2. **Set up Flowers if the site doesn't have it yet** (no `flowers.js` in the project):
   - copy `assets/flowers.js` into the site's static folder (where its other scripts live)
   - create `credits.json` at the site root
   - in every page's `<head>`, add `<link rel="credits" href="/credits.json">` (relative path if the site opens from files)
   - before `</body>` on every page, add `<script src="…/flowers.js" defer></script>`
   - the button goes at the bottom of the page (recommended, and the default: centred in the site's `<footer>`). If the site's footer has its own links, add `<button data-flowers-button>Credits</button>` there styled like those links, so it looks like part of the site. Only put it elsewhere if the user asks
   - match the site: if it has a light and dark theme or a clear accent color, set `data-accent` / `data-on-accent`, or set `--flowers-*` properties on `:root` in the site's CSS for each theme (see `assets/SPEC.md`)
   - if the site's builder can't serve extra files (Webflow, Squarespace embed, a single HTML file), put the credits inline in `<script type="application/credits+json">` and load `flowers.js` from wherever it can be hosted
   - for React, Vue, Svelte or Astro, put `flowers.js` in `public/` and the tags in the root layout, and add `data-credit` as an ordinary attribute in components
3. **Add the entry** to `credits.json` with a short, unique `id` (e.g. `banknote-shader`) and a one-sentence `note` saying how the site uses it.
4. **Tag what it made**: add `data-credit="id"` to each element the tool produced or renders into (`<img>`, `<canvas>`, `<video>`, an SVG `<image>`, a section). If an element uses several, separate the ids with spaces. If the markup is generated and can't take attributes, use `selectors` in the entry. Things with nothing to point at (a library, a font used everywhere, a build tool) get an entry and no tag.
5. **Tell the user** in one line what was credited and where, e.g. "Credited the Dollar Bill Texture Shader (by …) on the landing angel."

Keep tags up to date as the site changes: when you add an element made with a tool already in `credits.json`, tag it; when you remove the last element using a credit, ask whether to keep the entry in the list.

## Auditing a site

When asked to set up or check credits on an existing site, look for things made by others:

- links and comments in the code naming a source (`// from …`, `// based on …`, `// shader by …`, URLs to CodePen, Shadertoy, GitHub, Figma Community, X/Twitter)
- `package.json` dependencies, `<script>` and `<link>` tags loading from CDNs, font files and `@font-face`, Google Fonts links
- license headers in vendored files, and the README's own thanks or sources
- the git log, for commits mentioning a source

List what you found and what you'd add, and add it once the user agrees. Don't credit the site's own work or standard browser features.

## Rules

- Never fabricate an author, link or license, and never credit someone for something they didn't make.
- Links in `credits.json` must be `http` or `https`.
- Keep the user's own design: don't restyle the site, only the Flowers layer.
- Don't remove existing credits written elsewhere (a footer, an About page). Flowers adds to them.
