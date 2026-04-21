# Phase A.3 — File Operations — Test Plan

## What changed
Commit [`9b35ffc`](https://github.com/Foxy9795/ai-file-explorer/pull/1/commits/9b35ffc):
- Main-process IPC: `newFile`, `newFolder`, `rename`, `trash`, `copyPaths`, `movePaths`, `pathExists`, `revealInOS`
- Toolbar: ➕ Folder, ➕ File, ✏️ Rename, 🗑 Delete, ✂ Cut, ⧉ Copy, 📋 Paste
- Right-click context menu on rows and empty area
- Keyboard: F2 (rename), Delete, Ctrl+C / X / V, Ctrl+N, Ctrl+Shift+N
- Inline rename with auto-select of stem
- OS drag-and-drop import
- Cut-visual (dimmed rows) + toast notifications

## Fixture
`/home/ubuntu/afe-test/` — 6 visible files + 1 hidden + 1 subfolder (`subproject/`)

## Test flows (adversarial — each step would visibly diverge if broken)

### Test 1 — Create folder via toolbar + inline rename + disk persistence
1. Click **➕ Folder** toolbar button.
2. **Expected**: A new row appears named `New Folder` with an inline input auto-focused. Entry count for root goes from 7 → 8 (with hidden off, 6 → 7 visible, since original was 6 regular + subproject).
3. Type `Archive` (replacing full text). Press **Enter**.
4. **Expected**:
   - Row now reads `Archive`.
   - `ls /home/ubuntu/afe-test/` shows `Archive/` as a real directory; `New Folder` does NOT appear on disk.
5. **Fail conditions**: no new row appears; rename input missing; disk shows `New Folder` instead of `Archive`; error toast.

### Test 2 — Create file via Ctrl+N + unique-name collision
1. With root as cwd, press **Ctrl+N**.
2. **Expected**: new row `New File.txt` appears with rename input focused. Press Escape to cancel rename (keeps name as-is).
3. Press **Ctrl+N** again (without renaming the first).
4. **Expected**: A second row appears named `New File (2).txt`. Two rows visible: `New File.txt` and `New File (2).txt`.
5. `ls /home/ubuntu/afe-test/` shows both files. Both files are 0 bytes.
6. **Fail conditions**: second Ctrl+N errors out (EEXIST), produces same name, or creates file with wrong unique-suffix pattern.

### Test 3 — F2 rename of existing file + collision guard
1. Single-click `recipe.txt` to select.
2. Press **F2**.
3. **Expected**: Inline rename input appears for `recipe.txt`. Stem `recipe` is selected (extension `.txt` not selected — we verify by typing replacement text).
4. Type `notes.md` and press **Enter** (collision — `notes.md` already exists in the fixture).
5. **Expected**: Red error toast: `Rename failed: A file named "notes.md" already exists`. Row still reads `recipe.txt`. `ls` confirms recipe.txt unchanged.
6. **Fail conditions**: silent overwrite of notes.md; no toast; file renamed anyway.

### Test 4 — Copy → paste into subfolder (copyPaths + uniquePath)
1. Select `meeting.md`. Press **Ctrl+C**.
2. **Expected**: green toast `Copied 1 item(s)`. Row does NOT dim (copy ≠ cut).
3. Double-click `subproject/` to enter it. Entry count inside = 1 (the stub file already there).
4. Press **Ctrl+V**.
5. **Expected**: green toast `Pasted 1 item(s)`. Subproject count = 2. `meeting.md` is now listed inside `subproject/`. `/home/ubuntu/afe-test/meeting.md` STILL exists (copy, not move).
6. Paste AGAIN (Ctrl+V).
7. **Expected**: second copy arrives as `meeting (2).md`. Count = 3.
8. **Fail conditions**: source file disappears from root (implies move instead of copy); second paste errors with EEXIST; wrong unique name.

### Test 5 — Cut → paste (move) with visual feedback
1. Back to root (click root breadcrumb or press Backspace).
2. Select `Archive` (the folder created in Test 1). Press **Ctrl+X**.
3. **Expected**: yellow/green toast `Cut 1 item(s)`. The `Archive` row VISIBLY dims (opacity ~0.55).
4. Enter `subproject/`. Press **Ctrl+V**.
5. **Expected**: toast `Moved 1 item(s)`. Archive now inside subproject. Back at root: `Archive` is GONE from the list. `ls /home/ubuntu/afe-test/` no longer shows `Archive`. `ls /home/ubuntu/afe-test/subproject/Archive` exists.
6. **Fail conditions**: `Archive` still in root (copy instead of move); no dim styling; error toast; folder lost.

### Test 6 — Delete to OS trash via Delete key
1. Back in root, select `New File.txt` (from Test 2).
2. Press **Delete** key.
3. **Expected**: green toast `Moved 1 item(s) to trash`. Row disappears from list. `ls /home/ubuntu/afe-test/` no longer shows `New File.txt`. `ls ~/.local/share/Trash/files/` now contains `New File.txt` (proof it went to trash, not `rm -rf`'d).
4. **Fail conditions**: file silently deleted but not in trash; still on disk; error toast.

## Pass criteria
6/6 flows pass. Each failure must be called out as a bug in the report, not hand-waved.
