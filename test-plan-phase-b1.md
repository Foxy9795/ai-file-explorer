# Phase B.1 — Rich previews test plan

## What changed
Preview pane now dispatches on file extension to 4 specialized renderers:
- **Markdown** (`.md`) — rendered HTML (headings, lists, bold) via `marked`
- **Code** (`.js`, `.json`, `.ts`, …) — syntax-highlighted via `highlight.js` (github-dark theme)
- **Image** (`.png`, `.jpg`, …) — real rendered image via base64 data URL over new `readBinaryBase64` IPC
- **Text** (`.txt`, `.log`, …) — plain monospace (unchanged fallback)

Informed by: `desktop/src/renderer/src/components/FilePreview.tsx`, `desktop/src/main/index.ts:348-356` (new `readBinaryBase64` handler), `desktop/src/renderer/src/styles.css` (+~120 lines `.preview-*`).

## Fixtures (already on disk in `/home/ubuntu/afe-test/`)
- `notes.md` — starts with `Project Alpha notes. Shipped March 2024.` (no real markdown syntax — weak test), so we'll **select `meeting.md`** which starts with `# Meeting notes` (actual heading).
- `config.json` — JSON object, expected tokens colored (string values green, keys yellow, numbers blue per github-dark)
- `demo.js` — JS with `import`, `function`, template literal — expected keywords colored
- `photo.png` — 70-byte PNG

## Test cases (one recorded run, 4 adversarial assertions)

### T1 — Markdown renders, does not show raw `#`
1. Launch app → `/home/ubuntu/afe-test/` loads.
2. Click `👁 Preview` button to open preview pane.
3. Single-click `meeting.md`.
4. **Assertion**: Preview pane shows a **large heading** reading "Meeting notes" — rendered as an `<h1>` (big font, bottom border per CSS). Raw `#` character must NOT be visible anywhere.
   - **Broken-impl look-alike check**: if markdown rendering is broken, the text `# Meeting notes` would appear literally with a `#` character. We'll verify via screenshot that the leading `#` is absent.

### T2 — Code syntax highlighting produces colored tokens
1. With preview pane open, single-click `demo.js`.
2. **Assertion**: Preview shows the code with **multiple distinct colors**:
   - `import`, `function`, `const`, `return`, `export`, `default` rendered in one color (keyword — pink/red in github-dark)
   - String literal `` `Hello, ${name}!` `` rendered in a different color (string — light blue/green)
   - Line comment `// Sample code...` in a third color (comment — grey, italic)
   - **Broken-impl look-alike check**: If highlight.js isn't running (CSS missing / lang not detected), all text would be a single monochrome color. Screenshot must show at least 3 distinguishable colors.
3. Single-click `config.json`.
4. **Assertion**: JSON keys (`"name"`, `"version"`, …) colored differently from string values (`"ai-file-explorer"`, …). Numbers (`25000000`, `true`) colored differently from strings.

### T3 — Image preview shows actual pixels, not binary garbage
1. Single-click `photo.png`.
2. **Assertion**: Preview pane displays:
   - A rendered **image** element (not raw text / not "PNG\x89..." binary dump)
   - A metadata line somewhere near it showing filename `photo.png` and byte size `70 B` (per `formatBytes` helper)
   - Checkerboard transparent background visible around / behind the image
3. **Broken-impl look-alike check**: If `readBinaryBase64` IPC isn't wired, the preview would show a text-fallback with mojibake bytes or an error. Screenshot must show an actual `<img>`.

### T4 — Regression: text files still preview as plain monospace
1. Single-click `recipe.txt`.
2. **Assertion**: Preview pane shows the contents as **plain pre-wrapped monospace text**, no syntax coloring, no HTML rendering. This confirms extension dispatch correctly routes non-code, non-md, non-image files through `TextPreview`.

## Done when
- All 4 assertions pass on one continuous recording
- One GitHub PR comment posted on PR #1 with recording link + screenshot grid
