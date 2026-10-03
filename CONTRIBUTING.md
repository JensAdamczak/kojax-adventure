# Contributing

## Source layout

| Location | Purpose |
| --- | --- |
| `src/campaign/text.js` | Level names, introductions, help, menus, and accessibility text |
| `src/campaign/levels.js` | Terrain, entrance/exit positions, objects, and skill unlocks |
| `src/campaign/engine.js` | Movement, hazards, bridges, and win conditions |
| `src/campaign/input.js`, `score.js` | Controls and scoring |
| `src/campaign/campaign.js` | Loading, dialogs, and progression |
| `src/campaign/view.js`, `campaign.css` | Canvas rendering and interface styling |
| `public/` | Artwork and other static assets copied into the release |
| `tests/` | Input, rules, UI, and rendering tests |
| `scripts/` | Build and release validation |
| `dist/` | Generated output; do not edit or commit |

## Edit and verify

```sh
npm ci
npm test
npm run format:check
npm run build
npm run check:release
npm start
```

Use `npm run format` to format source. If a preview is already running, rebuild and reload after edits. The build uses esbuild to bundle and minify JavaScript/CSS, with hashed filenames and no source maps. Build tools do not run in the player's browser.

### Game text

Edit `src/campaign/text.js`. `levelText` holds each level's name, story, and lesson; `text` holds shared menus, help, messages, and labels. Preserve keys and placeholders such as `{level}` and `{count}`. Values are plain text, not HTML.

Run `node --check src/campaign/text.js` to catch syntax errors. Intentional wording changes also require reviewing the UI snapshot in `tests/fixtures/campaign-copy.json`. Rebuild and check the relevant screens at desktop and phone sizes.

### Level data

Coordinates are `[column, row]`, starting at zero in the top-left. Each level defines `start`, `end`, and a terrain mask. Safe cells are decoded into `ground` once; their order has no gameplay meaning. Objects are separate, and fallen bridges are runtime state.

The hexadecimal terrain mask uses bit `row * size + column` for safe ground. Use `BigInt` for mask operations because later grids exceed JavaScript's ordinary bitwise integer width. This is a compact data format, not encryption.

### Assets and behavior

Keep assets under `public/` and reference them with relative URLs so deployment under a repository subpath works. Register runtime-selected assets in `scripts/check-release.mjs` to include them in validation. Preserve license notices for any third-party additions.

Check keyboard/touch controls, hazards, restart, browser saves, and reduced-motion behavior when changing gameplay. Test Firefox, Safari, and phone-sized layouts. Avoid blocking movement on network requests or adding work to the rendering loop without measuring its cost.

## Pull requests

Describe the behavior changed and how you verified it. CI runs formatting checks, tests, the build, and release validation. No private tools or credentials are required to develop or build the game.
