# Phase A.4 tranche 1 — Test Plan (Favorites + Recent + Places sidebar)

## Feature under test
- New "Places" sidebar (left column inside Explorer) with three sections:
  - **Home** — clickable shortcut back to the root.
  - **Favorites** — user-pinned folders, add via ★ toggle in address bar, remove via × button on the row.
  - **Recent** — auto-populated with last-visited folders (deduped, capped at 20), clearable via `clear` header button.
- **Address bar star toggle** (`fav-toggle` btn) — toggles currentPath in favorites; icon flips between ☆ and ★.
- **IPC persistence** — favorites/recent stored in `~/.config/@afe/desktop/afe/settings.json`; must survive app restart.

## Fixture
- Root: `/home/ubuntu/afe-test/` (6 visible files + `subproject/` subdir).
- Pre-conditions (verified): `settings.json` has only `root` + `showHidden`; no favorites, no recent.
- App running on dev server, window on desktop.

## Primary flow (recorded)
Single continuous recording covering all assertions. Annotations:
`setup` → navigate to root → confirm empty Favorites list and Recent list containing only root.

### T1 — `It should auto-populate Recent on navigation`
**Action**: Double-click `subproject/` row in the file list.
**Expected**:
- Breadcrumb in address bar now ends in `› subproject`.
- Recent section shows entries ordered `subproject` (top) then `afe-test` (below). Exact count: **2**.
- If broken: Recent would still show only `afe-test` (or be empty). This sequence looks visibly different when `pushRecent` is not wired.
**Filesystem assertion**: `settings.json` contains `"recent": ["/home/ubuntu/afe-test/subproject", "/home/ubuntu/afe-test"]` (in that order).

### T2 — `It should add currentPath to Favorites via address bar star`
**Action**: Click the ☆ button in the address bar (currently inside `subproject/`).
**Expected**:
- Button icon flips from `☆` to `★` (yellow).
- Favorites section count badge changes from empty to `1`; list contains exactly one row labeled `subproject`.
- Toast text: `Added to favorites`.
- If broken: star icon would not change, Favorites would remain empty.
**Filesystem assertion**: `settings.json` contains `"favorites": ["/home/ubuntu/afe-test/subproject"]`.

### T3 — `It should navigate via Places sidebar click`
**Action**: Click the `🏠 Home` row in the Places sidebar.
**Expected**:
- Breadcrumb returns to `afe-test` only (no `subproject` trailing segment).
- File list shows 6 rows + `subproject` folder (7 entries) — i.e. the root listing, not subproject's 1 entry.
- Home row highlights as active; Favorites row `subproject` no longer highlighted.
- If broken: click wouldn't navigate, file list wouldn't change.

### T4 — `It should remove a favorite via the × button`
**Action**: Hover the `subproject` row in Favorites, click the × button.
**Expected**:
- Favorites count badge returns to empty.
- Favorites list renders the empty-state message: `No favorites yet. Star a folder in the address bar.`
- If broken: Favorites would still contain `subproject` after click.
**Filesystem assertion**: `settings.json` has `"favorites": []`.

### T5 — `It should persist favorites + recent across app restart`
**Action**:
1. Re-star the root (`afe-test`) in the address bar (now a favorite).
2. Quit the Electron app (`pkill -f electron`).
3. Relaunch `npm -w @afe/desktop run dev` — wait for window.
**Expected after relaunch**:
- Favorites section shows `afe-test` (count `1`).
- Recent section shows `afe-test` and `subproject` (count `2`, exact order: `afe-test` first since it was the last path visited).
- If broken: both lists would be empty on relaunch (no persistence) or reordered wrong.

### T6 — `It should clear Recent via the clear button` (REGRESSION lightweight)
**Action**: Click the `clear` button on the Recent header.
**Expected**:
- Recent count badge disappears, list shows empty-state: `No recent folders.`
- `settings.json` has `"recent": []`.

## Pass criteria
6/6 assertions must pass exactly as described. Any filesystem mismatch or missing visual change ⇒ fail.

## Adversarial justification
Each assertion pairs a DOM observation with a filesystem check against `settings.json`, so a broken implementation that silently swallows the IPC call (UI appears to update optimistically but JSON unchanged) would still be caught via the filesystem assertion.

## Evidence sources (code)
- Address bar star: `desktop/src/renderer/src/components/AddressBar.tsx:58-67`
- toggleFavorite handler: `desktop/src/renderer/src/App.tsx:71-79`
- pushRecent effect on navigation: `desktop/src/renderer/src/App.tsx:63-69`
- PlacesSidebar component: `desktop/src/renderer/src/components/PlacesSidebar.tsx`
- IPC handlers (add/remove/push/clear): `desktop/src/main/index.ts:127-154`
- Settings schema with favorites/recent: `desktop/src/main/index.ts:24-46`
