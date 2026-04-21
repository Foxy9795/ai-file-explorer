# Phase A.1 — Explorer Shell Test Plan

## What changed (user-visible)

The Electron app's old three-pane layout (file tree | preview | AI panel) has been replaced with a full **Windows Explorer-style shell**:

- **Left nav rail** (56px) — Explorer / Favorites / Recent / Settings + AI toggle at bottom
- **Address bar** — Back / Forward / Up buttons, clickable breadcrumbs, editable path input
- **Main file list** — List / Grid / Gallery view toggle, filter-as-you-type, sortable columns
- **Preview pane** — toggleable 360px right pane (old middle pane)
- **AI panel** — now toggleable (was always visible before); hidden by default

Evidence:
- `App.tsx:152-253` — new shell structure (nav rail + workspace + ai-pane grid)
- `NavRail.tsx:10-15` — 4 sections + AI toggle (not the old AI tabs)
- `AddressBar.tsx:44-93` — back/forward/up + breadcrumbs + editable path
- `FileList.tsx` — list/grid/gallery view switch + sort + filter
- `main/index.ts:126-169` — new IPC: stat, parentDir, pathSep, joinPath; enhanced listDir with size/mtime

## Fixture

`/home/ubuntu/afe-test/` (pre-set as persisted root):
- `invoice-march-2024.txt`
- `meeting.md`
- `notes.md`
- `photo.png` (1×1 PNG — tests gallery thumbnail rendering)
- `recipe.txt`
- `subproject/` ← one subfolder containing `plan.md` (tests navigation)

## Primary end-to-end flow

One recording covering navigation + view modes + filter + AI toggle. Each step has a concrete expected value that differs from what a broken implementation would produce.

### Step 1 — Initial render shows new shell
- **Action:** Launch Electron.
- **Expected:** Left nav rail visible with four icon buttons (📁 Explorer, ⭐ Favorites, 🕘 Recent, ⚙ Settings) and ✨ AI at bottom. Topbar shows "AI File Explorer" + Open folder… + Index folder. Address bar present below topbar. File list shows exactly **6 entries** (5 files + `subproject/`), folder sorted first (folders-first rule).
- **Fail if:** the old 3-pane layout is visible, nav rail missing, or entry count ≠ 6.

### Step 2 — Navigate into a subfolder via double-click
- **Action:** Double-click `subproject` row.
- **Expected:**
  - Address bar now shows **two breadcrumbs**: `afe-test › subproject`.
  - File list shows **exactly 1 entry**: `plan.md`.
  - Back button (←) is now **enabled** (not greyed out).
- **Fail if:** still shows 6 entries, or breadcrumb didn't change, or Back stays disabled.

### Step 3 — Back button returns to parent
- **Action:** Click the ← Back button.
- **Expected:**
  - File list returns to **6 entries** (the fixture root).
  - Forward button (→) is now **enabled**.
  - Back button is now **disabled** again (history empty).
- **Fail if:** list still shows just `plan.md`, or Forward stays disabled.

### Step 4 — Crumb click navigates directly
- **Action:** Double-click `subproject` again, then click the **`afe-test`** crumb in the breadcrumb bar.
- **Expected:** File list returns to 6 entries (root). Confirms crumbs are clickable, not decorative.
- **Fail if:** clicking the crumb does nothing.

### Step 5 — View mode switches to Grid
- **Action:** Click the ⊞ (grid) button in the explorer toolbar.
- **Expected:** File list renders as **tiled cards** instead of rows. Each entry shows a large icon above its name. Column headers (Name/Size/Type/Modified) **disappear**. `subproject` still appears first.
- **Fail if:** still looks like rows, or columns still visible.

### Step 6 — View mode switches to Gallery, PNG becomes an inline thumbnail
- **Action:** Click the ▣ (gallery) button.
- **Expected:** `photo.png` renders as an **actual image thumbnail** (solid red 1×1 scaled up, not a 🖼 emoji). Other entries render as icons since they aren't images.
- **Fail if:** photo.png still shows the generic image emoji instead of the rendered pixel.

### Step 7 — Filter as you type narrows the list
- **Action:** Switch back to ☰ list view. In the Filter… box, type `rec`.
- **Expected:** File list shows **exactly 1 entry** (`recipe.txt`). Case-insensitive substring match; `meeting.md`, `notes.md`, `invoice-march-2024.txt`, `photo.png`, and `subproject/` all disappear.
- **Fail if:** any other entry remains, or the list doesn't update until Enter is pressed.

### Step 8 — Column sort reverses order
- **Action:** Clear the filter. Click the **Name** column header.
- **Expected:** A ▼ arrow appears next to "Name" and the files re-sort descending (z→a). `recipe.txt` / `photo.png` / `notes.md` etc. order flips vs. the default. Note: folders-first rule is preserved — `subproject/` is still on top, but the non-folder files below it reverse order.
- **Fail if:** no arrow indicator appears, or the row order doesn't change.

### Step 9 — AI panel toggles via nav rail ✨ button
- **Action:** Click the ✨ AI button at the bottom of the left nav rail.
- **Expected:** A **420px right-side panel** appears with the SEARCH / CHAT / SUMMARY / TAG / SIMILAR tabs. Click ✨ again → panel **disappears**.
- **Fail if:** panel doesn't appear, or stays visible when clicked again.

### Step 10 — Settings section shows "Coming soon" placeholder
- **Action:** Click ⚙ Settings in the nav rail.
- **Expected:** The file list / address bar is replaced by a **big placeholder** containing the text "Settings" and a hint mentioning "Phase F". Confirms section routing works.
- **Fail if:** file list is still shown, or section doesn't change.

---

## Out of scope for A.1 (not tested here)

- New/rename/delete/cut/copy/paste file operations → Phase A.3
- Favorites / Recent working (not just placeholder) → Phase A.4
- Rich previews (code syntax, PDF, archive) → Phase B
- Editable-path typing → regression only, not adversarial-tested this round
