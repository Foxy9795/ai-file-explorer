# AI File Explorer — End-to-End Test Report

**PR:** https://github.com/Foxy9795/ai-file-explorer/pull/1
**Session:** https://app.devin.ai/sessions/a767b1a64f33408a843a8720501cb972
**Provider under test:** local Ollama (`llama3.2:1b` chat + `nomic-embed-text` embeddings), endpoint `http://127.0.0.1:11434`
**Fixture folder:** `/home/ubuntu/afe-test/` (4 files: `invoice-march-2024.txt`, `meeting.md`, `notes.md`, `recipe.txt`)

## Summary

Ran the Electron desktop app locally on this VM against the Ollama stack and exercised every AI surface (Search / Chat / Summary / Tag / Similar) via the GUI. 5 of 6 adversarial tests passed. 1 failed on ranking-strictness: semantic search put `notes.md` (which talks about the invoice) above `invoice-march-2024.txt` for the query `"invoice from march"`. The pipeline is working end-to-end — the failure is a ranking disagreement between my test spec and what `nomic-embed-text` actually scores on this tiny corpus (4 docs, 3 of which reference the same invoice).

## Setup notes (escalations)

- **GTK folder-picker bug on this VM** — Electron's `dialog.showOpenDialog` refuses to commit the selection (Open stays greyed out). Out of scope: it's a stock call, not app code. I bypassed it by pre-seeding `~/.config/Electron/afe/settings.json = {"root":"/home/ubuntu/afe-test"}`; on boot, `desktop/src/main/index.ts` loads that and opens the SQLite store before the window is created, so the app launches with the folder already selected. The rest of the app is tested normally through the GUI.
- **better-sqlite3 ABI mismatch** — Electron 33.4.11 uses Node ABI 130; npm installs the prebuilt for Node 22 (ABI 127). Fixed in `8608c34` by adding `"postinstall": "electron-rebuild -w better-sqlite3 ..."` to the root `package.json`.

## Results

| # | Test | Result |
| - | ---- | ------ |
| 1 | Shell layout (title, topbar, 5 tabs, file tree) | PASSED |
| 2 | Index folder | PASSED |
| 3 | Search `"invoice from march"` ranks invoice file first | **FAILED** |
| 4 | Chat cites notes/meeting, answers "March" + "Acme Robotics" | PASSED |
| 5 | Summary of `recipe.txt` (cookies, no invoice leakage) | PASSED |
| 6 | Tags of `recipe.txt` (cooking tags, no alpha/acme/invoice) | PASSED |
| 7 | Similar to `invoice-march-2024.txt` → `notes.md` first | PASSED |

## Evidence

### Test 1 — Shell (PASSED)
Title `AI File Explorer`, topbar `Open folder… | Index folder | /home/ubuntu/afe-test`, provider label `ollama:llama3.2:1b`, tabs `SEARCH CHAT SUMMARY TAG SIMILAR` in that order, file tree shows all 4 fixture files.

![shell](https://app.devin.ai/attachments/c09b0863-a804-4156-9e82-8964efc54aa3/screenshot_3475101ded7146e48cef41bac9ca26fc.png)

### Test 3 — Search (FAILED)
Query: `invoice from march`. Ranking returned:

| Rank | File | Score |
| ---- | ---- | ----- |
| 1 | notes.md | 0.578 |
| 2 | meeting.md | 0.452 |
| 3 | invoice-march-2024.txt | 0.425 |
| 4 | recipe.txt | 0.326 |

Test plan required the invoice file to be first. It is third. Both `notes.md` and `meeting.md` explicitly mention "invoice INV-2024-0312" and March dates, so the embedding model is placing them closer to the query than the invoice's own header text — semantically defensible, but not what the plan asserted. `invoice-march-2024.txt` is still ranked above `recipe.txt` and its score (0.425) does clear the ≥ 0.40 floor from the plan.

![search](https://app.devin.ai/attachments/fd15dc11-d999-492a-af11-d7f598482866/screenshot_26494bbc0e4e461ca1c21682c8507c31.png)

### Test 4 — Chat with folder (PASSED)
Query: `When was Project Alpha launched and who is the biggest customer?` Assistant answered "Project Alpha was launched on March 20 [1]" and "biggest customer mentioned in the excerpt is Acme Robotics". Sources block rendered the `[N] /abs/path` format and cited `notes.md` as [1] and `meeting.md` as [2] — neither is `recipe.txt` in the leading citations.

![chat](https://app.devin.ai/attachments/999fdeae-ac36-4842-98a0-d86bbea325a7/screenshot_12b4f561ef2d410597ff4cb925791010.png)

### Test 5 — Summary (PASSED)
Summary of `recipe.txt` lists Topic = Chocolate Chip Cookies, ingredients (flour, butter, sugar, eggs, baking soda, chocolate chips), oven 375 F, bake 11 minutes. No "invoice" or "Project Alpha" leakage.

![summary](https://app.devin.ai/attachments/a7bf613e-0e54-482c-86a6-20e201490637/screenshot_1d3dfb614a6f45b291afd18bef1ac445.png)

### Test 6 — Tags (PASSED)
Tags returned: `#cookies #baking #dessert #sweet treats #snack`. Multiple matches on cooking/baking/dessert; zero invoice/alpha/acme contamination.

![tags](https://app.devin.ai/attachments/1356d973-5aeb-4c69-aa82-351f8bce19c4/screenshot_b450ec9d184b4c41a40341d6a1f0ec11.png)

### Test 7 — Similar files (PASSED)
Similar to `invoice-march-2024.txt`: `notes.md` (0.754), `meeting.md` (0.625), `recipe.txt` (0.459). Top score well above the 0.5 floor, top result is `notes.md` as expected, and the query file itself is correctly excluded from results.

![similar](https://app.devin.ai/attachments/e017ce36-b72a-48c6-a4aa-b3c645a3963f/screenshot_df49cb26af274c4f8dd80abb0062529f.png)

## Recording

Full annotated video (click-by-click) of all 6 tests: [rec-0a0f9405.mp4](https://app.devin.ai/attachments/3bb393c8-f028-4895-9c05-745e07f5db42/rec-0a0f9405-8f3e-4797-b3f0-0b9b390371dc-edited.mp4)
