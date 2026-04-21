# Phase A.4 Tranche 2 — Split view — Test Report

**Result: 5/5 passed** (after catching & fixing a real swap bug)

## Summary
- Split toggle, independent navigation, path swap, close-and-preserve, and favorites regression all pass.
- **1 bug caught during first test run** → fixed in [`eb482c6`](https://github.com/Foxy9795/ai-file-explorer/pull/1/commits/eb482c6): `onSwap` used the stale parent `secondaryPath` (initial seed only). Fixed by having `SecondaryPane` pass its live internal `path` to `onSwap(path)` at click time.

## Results

| Test | Result |
|---|---|
| T1: split toggle adds a second pane with same 7 entries | passed |
| T2: secondary navigates independently to subproject (3 entries incl. plan.md) while primary stays at root (7) | passed |
| T3: ⇄ swap exchanges paths — primary → subproject (3), secondary → afe-test (7) | passed (after fix) |
| T4: × close removes secondary and preserves primary state at subproject | passed |
| R1 (Regression): Favorites count unchanged through split flow | passed |

## Evidence

### T1 — Split toggle
![T1 split adds second pane](https://app.devin.ai/attachments/af6f00cc-cce2-4279-ae95-e91177dc58fa/screenshot_063ece7fe6c648c1aeced7e7ddb1309c.png)
Primary left (7 entries) + secondary right (7 entries, same path as primary). Split button highlighted.

### T2 — Independent navigation
![T2 secondary navigates to subproject](https://app.devin.ai/attachments/2ac3e6e7-0d49-4502-9ac3-3c333bfbfdf8/screenshot_37be58e50914408f9172227421a5a451.png)
Secondary breadcrumb: `afe-test › subproject`, 3 entries (Archive, meeting.md, plan.md). Primary unchanged at 7 entries. `plan.md` is the unique identifier that only exists in subproject, not root.

### T3 — Swap
![T3 swap exchanges paths](https://app.devin.ai/attachments/8ac44959-2317-4cdd-86f7-d734ce5dbfc7/screenshot_b93e32c1e452417191f780f866a5a4bf.png)
After clicking ⇄: primary becomes `afe-test › subproject` (3 entries), secondary becomes `afe-test` (7 entries). Exactly mirrored.

### T4 — Close
![T4 close preserves primary](https://app.devin.ai/attachments/bb777cca-9577-4ed1-8120-b97e4007809b/screenshot_48eaa06cec614a91a192dc951d272f6c.png)
Secondary pane gone. Primary retains post-swap state (Archive, meeting.md, plan.md). Split button no longer highlighted. Preview pane returns.

## Bug caught (resolved)
- **First attempt**: clicking ⇄ left both panes at `afe-test`. Root cause: parent-held `secondaryPath` was only the initial seed; SecondaryPane navigated internally without reporting back.
- **Fix**: `SecondaryPane` now passes its current path to `onSwap(path)`; App reads that value, sets secondary to primary's current path, and navigates primary to the value received.
- **Verification**: re-ran same flow — swap now correctly exchanges paths (T3 screenshot above).

## Recording
https://app.devin.ai/attachments/29a5276f-578c-47eb-aef1-c56f01aec4d0/rec-a4d0d41c-d372-41bc-b811-7ad20d1ac110-edited.mp4

## Commits covered
- `ebffb68` — split view implementation (SecondaryPane + swap UI)
- `eb482c6` — fix: swap reads secondary's current path via callback
