# Test plan v2 — verify search lexical rerank (commit d1167fe)

**PR:** https://github.com/Foxy9795/ai-file-explorer/pull/1
**What changed:** `core/src/search.ts` now adds a small additive boost (`+0.25 * filename-token-match + 0.05 * snippet-token-match`) on top of the embedding cosine score, to fix Test 3 which previously ranked `notes.md` (0.578) above `invoice-march-2024.txt` (0.425) for the query `invoice from march`.

**Scope:** Only Test 3 is re-verified. Tests 1, 2, 4, 5, 6, 7 are unchanged by this commit (same embeddings, same store, same chat/summary/tag/similar code paths) and were recorded passing in the previous session — no point re-recording them.

## Test 3 (v2) — Search ranking under new rerank

**Setup state (pre-existing, not executed as part of the test):**
- `/home/ubuntu/.config/Electron/afe/settings.json = {"root":"/home/ubuntu/afe-test"}`
- `/home/ubuntu/afe-test/` contains the 4-file fixture
- Electron's better-sqlite3 binding rebuilt for ABI 130 (done by `electron-rebuild` as part of commit d1167fe's postinstall path)
- Index is deleted (`~/.config/Electron/afe/indexes/*`) before the app launches so Index folder produces fresh embeddings against the new code

**Steps (in the app):**
1. Launch `DISPLAY=:0 node_modules/.bin/electron desktop/out/main/index.js`
2. Click **Index folder**. Wait for progress bar to clear.
3. On the SEARCH tab, type `invoice from march` into the input and click **Search**.

**Pass/fail criteria (all four must hold):**

| # | Expected | If broken this would look like |
| - | -------- | ----------------------------- |
| a | Top result path ends in `invoice-march-2024.txt` | Still notes.md on top (old behavior — lexical boost missing) |
| b | Top score ≥ 0.70 (was 0.425 pre-fix) | Score in the 0.4–0.5 band = boost not applied |
| c | invoice-march-2024.txt score > notes.md score by ≥ 0.05 | Rank 1 and rank 2 nearly tied = boost too small |
| d | recipe.txt ranks last with score < 0.40 | Unrelated file jumped = filename match logic misfires |

Grounded in code: `core/src/search.ts:53-59` adds `lex` to each hit's score before `hits.sort`. `lexicalBoost()` at `core/src/search.ts:65-74` computes the +0.25/+0.05 terms using non-stopword token overlap against `file.name` and `snippet`.

**Cross-reference (not part of the GUI test, already captured):**
CLI reproduced the same ranking out-of-band:
```
[0.725] invoice-march-2024.txt
[0.628] notes.md
[0.477] meeting.md
[0.320] recipe.txt
```
GUI is expected to match (same core lib, same store code path).

## Out of scope

- Tests 1, 2, 4, 5, 6, 7 (unchanged by this diff, covered by previous recording)
- GTK folder-picker (still broken on this VM, out of scope; bypassed via settings.json pre-seed)
- CLI re-verification (already done in shell before the commit; will not re-run)
