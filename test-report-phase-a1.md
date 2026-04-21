# Phase A.1 Explorer Shell — Test Report

**Device:** Linux VM (Electron 33.4.11, Node 22.12.0)
**Branch:** `devin/1776684978-initial-implementation` @ commit `1f3b42b`
**Fixture:** `/home/ubuntu/afe-test/` — 5 files + `subproject/` + `photo.png` (1×1 red)
**Recording:** attached inline
**Devin session:** https://app.devin.ai/sessions/a767b1a64f33408a843a8720501cb972

## Escalation

One **real bug** was caught and fixed during the first dry run:

> Double-clicking a folder previously left `selected` pointing at the folder path. The preview pane would then call `readFile` on a directory and display:
> `(cannot preview file: EISDIR: illegal operation on a directory, read)`

Root cause: `onOpen` in `App.tsx` navigated but did not clear selection. Fix: clear `selected` whenever the current path changes (Back/Forward/Up/navigateTo). See commit [`1f3b42b`](https://github.com/Foxy9795/ai-file-explorer/pull/1/commits/1f3b42b). All subsequent assertions below are against the fixed build.

## Results

| # | Test | Result |
|---|------|--------|
| 1 | Shell renders with nav rail, address bar, and 6 fixture entries (folder first) | passed |
| 2 | Double-click `subproject/` → breadcrumb `afe-test › subproject`, list shows only `plan.md`, preview cleared | passed |
| 3 | ← Back returns to 6 entries, Back greys out, Forward enables | passed |
| 4 | ⊞ Grid view replaces rows with tiled cards and drops column headers | passed |
| 5 | ▣ Gallery renders `photo.png` as an actual red pixel thumbnail (not the 🖼 emoji) | passed |
| 6 | Typing `rec` in the Filter box live-narrows to 1 entry (`recipe.txt`) | passed |
| 7 | Clicking the Name column header flips to ▼ and reverses file order; `subproject/` stays on top (folders-first) | passed |
| 8 | ✨ nav-rail button opens the AI panel (SEARCH/CHAT/SUMMARY/TAG/SIMILAR); clicking again hides it | passed |
| 9 | Clicking ⚙ Settings swaps the workspace to a "Coming in Phase F" placeholder | passed |

## Evidence

### 🟢 Initial shell

![Phase A.1 initial render](https://app.devin.ai/attachments/fd585912-1680-4bbc-be6a-abe13b3cace5/screenshot_a48ce2cd4cb541f4ada7f588bbd9a448.png)

Nav rail on the left (Explorer / Favorites / Recent / Settings + ✨ AI at bottom), address bar with disabled Back/Forward, editable breadcrumb "🏠 afe-test", 6 entries in list view with `subproject/` first, empty preview pane.

### Navigation

| Step 2 — into `subproject/` | Step 3 — Back to parent |
|---|---|
| ![Inside subproject](https://app.devin.ai/attachments/00d6d76a-f05d-4a44-a699-e926d81087b9/screenshot_adcb3e5f16bb41e2bf44fa317db8e963.png) | ![Back to root](https://app.devin.ai/attachments/6b11e7b8-72a7-4da9-b87c-1a1b15680fad/screenshot_f77d782395694846a3878f5a992a6b3e.png) |
| Crumb now `afe-test › subproject`, list = `plan.md`, preview correctly blank (no EISDIR) | 6 entries restored; sort already reversed for step 7 — `subproject` still on top despite Z→A order below |

### View modes

| Step 4 — ⊞ Grid | Step 5 — ▣ Gallery (real PNG thumbnail) |
|---|---|
| ![Grid view](https://app.devin.ai/attachments/7f8355c4-faff-4783-a0c6-982d47140741/screenshot_a9afb4ffa742402ca88e368e39fd3c6a.png) | ![Gallery view](https://app.devin.ai/attachments/8f5eee6f-3dfc-4b05-b92d-32e2912308d1/screenshot_c9276cc20ffc411fb2a49fe46068dc54.png) |
| Tiled icons, column headers gone | `photo.png` renders as solid red pixel scaled up — proves `file://` thumbnail is real, not an emoji fallback |

### Filter + AI panel + Settings

| Step 6 — Filter `rec` | Step 8 — ✨ AI panel open |
|---|---|
| ![Filter](https://app.devin.ai/attachments/54ba8cde-911c-4714-b0c1-193bdf0bbb52/screenshot_349e27010fe8451d8e6dfa09794deb8a.png) | ![AI panel](https://app.devin.ai/attachments/30ad6b30-c8b2-4d2a-a257-6a6a223f1666/screenshot_fb64fea5af40422ba004357bd4693b78.png) |
| Exactly 1 entry `recipe.txt` remains | SEARCH/CHAT/SUMMARY/TAG/SIMILAR tabs visible in the new toggleable pane |

![Settings placeholder](https://app.devin.ai/attachments/5de7c619-51da-4d69-8f84-a56a049298d3/screenshot_ebaa3aa5e76546df9b9202e95267bde3.png)

Settings section = big 🛠 placeholder with Phase-F hint, as specified.

## Out of scope (deferred to later tranches)

- File operations (new/rename/delete/cut/copy/paste) — **A.3**
- Real Favorites / Recent — **A.4**
- Rich previews (syntax-highlighted code, PDF, archive, markdown render) — **Phase B**
- Editable-path bar Enter/Escape — regression only; not adversarial-tested this round
- User has not yet tested on Windows — Windows build unverified from this Linux run
