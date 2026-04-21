# Phase A.4 tranche 2 — Test Plan (Split view)

## Feature under test
- New toolbar button `⇿ Split` (App.tsx:549) toggles a second pane on/off.
- When on, the explorer body grid goes from `1fr` → `1fr 1fr` (+`360px` if preview is open).
- Secondary pane (SecondaryPane.tsx) has its own independent state: path, back/forward history, selected, filter, sort.
- Compact bar: its own AddressBar (back/forward/up/breadcrumb) + ⇄ swap + × close.
- Swap (⇄) exchanges primary's and secondary's paths (bumps `splitKey` to fully remount secondary's internal state).

## Fixture
- Root: `/home/ubuntu/afe-test/` (root has `subproject/` + 6 files). `subproject/` contains `Archive/` (folder), `meeting.md`, `plan.md` — i.e. 3 entries, identifiable via the distinct `plan.md` file that does NOT exist in the root.

## Primary flow (single recorded run)

### T1 — `It should add a second pane on split toggle`
**Action**: Click `⇿ Split` in the main toolbar while the primary pane is in the root.
**Expected**:
- The toolbar button gains the `active` class (highlighted).
- A second file list appears to the right of the primary, showing the SAME 7 entries as the primary (initial seed = primary's current path).
- Preview pane is no longer visible if it was previously open OR layout shows all three columns — verify by counting visible columns.
- If broken: no second pane appears, or the layout doesn't split.

### T2 — `It should navigate independently in each pane`
**Action**: In the **secondary** pane, double-click `subproject/` row.
**Expected**:
- Secondary breadcrumb updates to `afe-test › subproject`.
- Secondary file list shows exactly 3 entries: `Archive`, `meeting.md`, `plan.md`. The presence of `plan.md` (which is NOT in the root) uniquely proves independent navigation.
- Primary pane breadcrumb still reads `afe-test`; primary file list still shows 7 entries.
- If broken: both panes would navigate together (shared state) OR the secondary wouldn't respond to double-click.

### T3 — `It should swap pane paths via the ⇄ button`
**Action**: Click the ⇄ swap button in the secondary pane's bar.
**Expected**:
- Primary breadcrumb becomes `afe-test › subproject`; primary file list now shows 3 entries including `plan.md`.
- Secondary breadcrumb becomes `afe-test`; secondary file list shows 7 entries including `invoice-march-2024.txt`.
- If broken: nothing swaps, or only one side changes, or paths are duplicated.

### T4 — `It should close the split view via the × button`
**Action**: Click the × close button in the secondary pane's bar.
**Expected**:
- Secondary pane disappears; primary expands to full width.
- Toolbar `⇿ Split` button loses `active` class.
- Primary file list + breadcrumb remain pointing at `subproject` (preserved from T3 state, proving state wasn't reset on close).
- If broken: pane remains, or close also resets primary path.

## Regression lightweight
### R1 — `It should preserve Favorites sidebar across split toggle`
Open split → verify Favorites count unchanged → close split → verify Favorites count still unchanged. Must remain `1` (`afe-test` from prior test run).

## Pass criteria
4/4 primary + 1/1 regression must pass with concrete visible differences (entry count 7 vs 3, unique filename `plan.md` as identifier).

## Adversarial justification
Each test uses a **specific entry count** (7 vs 3) and a **unique filename** (`plan.md`) as identifiers. If split view was broken (panes shared state, or navigation didn't fire, or swap was a no-op), these counts and filenames would not appear in the expected pane.

## Evidence sources (code)
- Split toggle button: `desktop/src/renderer/src/App.tsx:549-563`
- Grid layout change: `desktop/src/renderer/src/styles.css:320-326`
- SecondaryPane navigation state: `desktop/src/renderer/src/components/SecondaryPane.tsx:20-74`
- Swap handler: `desktop/src/renderer/src/App.tsx` (onSwap callback, bumps splitKey + seeds secondary with current primary)
