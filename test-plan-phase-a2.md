# Phase A.2 Test Plan — Keyboard navigation + Hidden-files toggle

## What changed (user-visible)

1. **Keyboard shortcuts** for explorer:
   - `ArrowDown` / `ArrowUp` / `Home` / `End` — move selection in the file list
   - `Enter` — open the selected entry (folder = navigate in; file = preview)
   - `Alt+ArrowLeft` / `Alt+ArrowRight` — history back / forward
   - `Alt+ArrowUp` or `Backspace` (when not typing in a text field) — go up one folder
   - `F5` — refresh the listing
2. **Hidden files toggle** in the explorer toolbar — button labeled `👁‍🗨 Hidden`. When active, dotfiles (names starting with `.`) appear in the listing. Setting is persisted to `settings.json`.

Evidence in code:
- Global key listener: `desktop/src/renderer/src/App.tsx` lines 125-163
- Arrow/Enter/Home/End inside list: `desktop/src/renderer/src/components/FileList.tsx` lines 82-106
- Hidden toggle + refresh buttons: `desktop/src/renderer/src/App.tsx` lines 246-260
- IPC: `afe:getShowHidden` / `afe:setShowHidden` in `desktop/src/main/index.ts` lines 113-118; filter applied at line 138

## Fixture (pre-set)

`/home/ubuntu/afe-test/` (already persisted as app root):

- `invoice-march-2024.txt`
- `meeting.md`
- `notes.md`
- `photo.png`
- `recipe.txt`
- `subproject/` (folder, containing `plan.md`)
- `.secret.txt` — **hidden** (added for A.2)

Expected visible entries:
- Hidden OFF: **6** items (1 folder + 5 files, no `.secret.txt`)
- Hidden ON: **7** items (the above + `.secret.txt`)

## Adversarial tests (primary end-to-end flow, one recording)

Each step lists the exact action, expected observable, and why a broken implementation would show a *different* observable.

### Test 1 — Arrow-key selection moves through list
- **Precondition:** App on `/home/ubuntu/afe-test/`, list view, filter empty, no selection, Hidden OFF, sort `name asc` → row order: `subproject/`, `invoice-march-2024.txt`, `meeting.md`, `notes.md`, `photo.png`, `recipe.txt`.
- **Action:** Click anywhere on the file list body (not on a row) to focus it, then press `ArrowDown`, `ArrowDown`, `ArrowDown`.
- **PASS:** After three presses, the highlighted row is `meeting.md` (3rd entry). Address bar is unchanged. The preview pane shows `meeting.md` content.
- **FAIL (if broken):** Selection stays on row 0, or moves to wrong row, or opens the folder.

### Test 2 — `Enter` opens the selected folder
- **Precondition:** Continuation of Test 1. First press `Home` to select row 0 (`subproject/`).
- **Action:** Press `Enter`.
- **PASS:** Breadcrumb updates to `… › afe-test › subproject`; the body shows exactly one entry (`plan.md`); Back button becomes enabled.
- **FAIL:** No navigation; or preview pane shows `EISDIR`; or wrong folder opens.

### Test 3 — `Alt+ArrowLeft` (history back) and `Alt+ArrowRight` (forward)
- **Precondition:** Continuation of Test 2 (inside `subproject/`).
- **Action:** Press `Alt+ArrowLeft`.
- **PASS:** Back to `afe-test/` parent; body shows **6** entries; Back button disables; Forward enables.
- **Action (cont.):** Press `Alt+ArrowRight`.
- **PASS:** Returns to `subproject/`; body shows **1** entry.
- **FAIL:** Either shortcut selects an item in the list instead of navigating (would indicate Alt modifier not being honored), or entry count is wrong.

### Test 4 — `Backspace` goes up (and does NOT type into filter)
- **Precondition:** Continuation of Test 3, in `subproject/`, nothing focused in the filter input.
- **Action (A):** Press `Backspace`.
- **PASS:** Navigates back to `afe-test/`; body shows **6** entries.
- **Action (B):** Click the `Filter…` text input, type `note`, then press `Backspace` twice.
- **PASS:** Filter text becomes `no`, body narrows to only entries whose name contains `no` (i.e., `notes.md`); the app does **not** navigate up to a different folder.
- **FAIL:** If Backspace in the filter fires a navigation — we'd see the breadcrumb change or the entry list flip to the parent.

### Test 5 — Hidden toggle shows/hides dotfile and persists
- **Precondition:** Clear the filter (delete characters). Breadcrumb at `afe-test/`. Hidden toggle OFF. Sort name-asc. Body shows **6** entries. The file `.secret.txt` is NOT visible.
- **Action (A):** Click the `👁‍🗨 Hidden` toolbar button.
- **PASS:** Button becomes highlighted (accent background). Body refreshes to **7** entries. `.secret.txt` appears between `subproject/` and `invoice-march-2024.txt` (dotfile sorts before other text files in name ascending: folders first, then `.secret.txt`, then alphabetical files).
- **Action (B):** Click the button again.
- **PASS:** Button returns to inactive style. `.secret.txt` disappears. Body back to **6** entries.
- **Action (C):** Click toggle again (ON), then close the app and relaunch it.
- **PASS:** On relaunch, `.secret.txt` is still visible (7 entries) without needing to click the toggle again — i.e. setting persisted.
- **FAIL:** Entry count unchanged after toggle; or the setting resets after relaunch (counts 6 instead of 7).

### Test 6 (regression — quick) — `F5` reloads current folder
- **Precondition:** Creating a new file `/home/ubuntu/afe-test/temp-a2-test.txt` from a separate terminal *after* the folder is already loaded. Current folder = `afe-test/`, Hidden ON from Test 5, entry count = 7 before new file creation (or 8 after because new file exists but listing is stale).
- **Action:** In the app, press `F5`.
- **PASS:** Body count increases to **8** (adds `temp-a2-test.txt`) without any other interaction.
- **FAIL:** Count stays at 7 (listing not refreshed).
- **Cleanup:** delete `temp-a2-test.txt` afterward.

## Out of scope

- Any A.3 features (file ops). Creating `temp-a2-test.txt` for Test 6 is done from the shell, not through the UI.
- Any AI features (Search/Chat/Summary/Tag/Similar).
- Windows-specific behavior (keyboard layout, file attrib hidden). Testing on the Linux VM; Alt+Arrow keys work identically on both platforms.

## Recording

One continuous recording covering Tests 1→6 with annotations for each test_start and assertion result.
