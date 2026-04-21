# Phase A.2 Test Report — Keyboard navigation + Hidden-files toggle

**Result:** 6/6 primary assertions **passed**. No regressions found.

**How tested:** Ran the Electron dev build (`npm -w @afe/desktop run dev`) on the Linux VM against fixture `/home/ubuntu/afe-test/` (6 regular files + 1 hidden `.secret.txt`). One continuous recording covering Tests 1–6 with structured annotations, plus on-disk verification of the persisted settings file.

**Recording:** https://app.devin.ai/attachments/b4604c91-eca1-4de4-952b-8d81c40f4274/rec-f60d6eb7-fa91-4923-8d33-5ffc62774863-edited.mp4

---

## Escalations

- **None.** All tests passed. Hidden-files persistence survives an app relaunch (verified by kill + re-spawn of the main process, not just React state reset).

### Minor (non-blocking) observations
- Selecting a folder with `Home`/arrow keys causes the preview pane to display `(cannot preview file: EISDIR: illegal operation on a directory, read)`. This is a graceful error string — not a crash — but the pane should ideally render a folder-specific placeholder (e.g. "Select a file to preview"). Candidate for a small follow-up in A.3 or A.4.
- Dev-mode Electron uses `~/.config/@afe/desktop/` as `userData` (derived from `package.json` `name: "@afe/desktop"`). On this VM an older `~/.config/Electron/afe/settings.json` existed from the A.1 session, so the first dev launch of A.2 had no persisted root and showed the empty state. The correct new file (`~/.config/@afe/desktop/afe/settings.json`) was populated by a normal `setRoot` call and auto-loaded on relaunch — behavior is correct, just easy to get confused by the stale file. Not a user-visible bug.

---

## Assertions

| # | Test | Result |
|---|------|--------|
| 1 | `ArrowDown` x3 from empty selection selects `meeting.md` (row 3); preview pane shows its content | **passed** |
| 2 | `Enter` on `subproject/` navigates in: breadcrumb → `afe-test › subproject`, body count 6 → 1 | **passed** |
| 3 | `Alt+ArrowLeft` returns to `afe-test/` (6 entries); `Alt+ArrowRight` re-enters `subproject/` (1 entry) | **passed** |
| 4 | `Backspace` in list goes up; `Backspace` while typing in filter input only deletes characters (no navigation) | **passed** |
| 5 | Hidden toggle: OFF=6, ON=7 (with `.secret.txt` between `subproject/` and `invoice-march-2024.txt`), setting persists after main-process restart | **passed** |
| 6 | `F5` reloads directory listing: picks up a file created out-of-band, count 7 → 8 | **passed** |

---

## Evidence (inline screenshots)

### Test 1 — Arrow keys select row 3 (`meeting.md`) and preview shows its content
![Test 1](https://app.devin.ai/attachments/e61ecf68-0752-4f77-aee5-ac52987dfbbe/screenshot_a5896f08c6b6427194064cb86b8bc3e4.png)

### Test 2 — `Enter` opens `subproject/` (1 entry, breadcrumb updated)
![Test 2](https://app.devin.ai/attachments/8d8f09af-953c-465a-a83e-7d573ccf7b0b/screenshot_8d17528b3a7a41c9975865fc5fef25b9.png)

### Test 4 — `Backspace` inside filter input decrements text, does NOT navigate
Filter text shows `no`, list narrows to `notes.md`, breadcrumb is still `afe-test`.
![Test 4](https://app.devin.ai/attachments/f95b1527-1827-458a-9eb1-0dfa0ce60ef5/screenshot_fa2ccb2798c543348a6fc28fff7af497.png)

### Test 5 — Hidden toggle ON reveals `.secret.txt` (7 entries)
![Test 5 ON](https://app.devin.ai/attachments/3b9875a3-734b-4b5b-bd41-9a07ec7ae146/screenshot_4d883723f70b45b1b3156eca8a4bddff.png)

### Test 5 — After full relaunch (main process killed + re-spawned), hidden dotfile still visible
Auto-loaded root + auto-applied `showHidden: true` without any user interaction. Disk confirmed `settings.json` contains `{"root":"/home/ubuntu/afe-test","showHidden":true}`.
![Test 5 persistence](https://app.devin.ai/attachments/4c190005-f70c-470a-a1a2-71b40848c66f/screenshot_91768675a33341e883f1b003e4b8c677.png)

### Test 6 — `F5` picks up out-of-band file (`temp-a2-test.txt`, 7 → 8 entries)
![Test 6](https://app.devin.ai/attachments/57a2c72f-4a3e-4ab0-84f4-80930eca132f/screenshot_062fa4e54c584cc7acd23709c61956ac.png)

---

## Notes

- No Windows re-verification performed; tested on Linux. Alt+Arrow / Backspace / F5 are platform-agnostic in Electron, but user should smoke-test on Windows by running `git pull && npm -w @afe/desktop run dev` on the branch.
- `temp-a2-test.txt` was deleted after Test 6; fixture is clean.
