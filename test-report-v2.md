# Test 3 re-verification — search lexical rerank (commit `d1167fe`)

**PR:** https://github.com/Foxy9795/ai-file-explorer/pull/1
**Scope:** Only Test 3 (search ranking strictness). Tests 1, 2, 4, 5, 6, 7 are unchanged by this commit and were recorded passing in the previous session — not re-run.

## Summary

Indexed the 4-file fixture in Electron and searched `invoice from march`. Results now rank as expected:

| Rank | File | Score |
| ---- | ---- | ----- |
| 1 | `invoice-march-2024.txt` | **0.725** |
| 2 | `notes.md` | 0.628 |
| 3 | `meeting.md` | 0.477 |
| 4 | `recipe.txt` | 0.320 |

![GUI search results](https://app.devin.ai/attachments/73ed115b-fe6e-4e85-9cdb-5fa5fec3462b/screenshot_7922506e18024c6db0f3565d3b4443c1.png)

## Assertions

- **Top result is `invoice-march-2024.txt`** — passed
- **Top score ≥ 0.70** — passed (0.725)
- **Top minus rank-2 gap ≥ 0.05** — passed (0.725 − 0.628 = 0.097)
- **`recipe.txt` ranks last with score < 0.40** — passed (0.320)

## Environment notes

- `better-sqlite3` had to be rebuilt against Electron's ABI 130 again because the earlier CLI cross-check left it compiled for Node ABI 127. First launch crashed with `Failed to open store for persisted root: ERR_DLOPEN_FAILED` / `NODE_MODULE_VERSION 127`. Re-ran `electron-rebuild -v 33.4.11 -f -w better-sqlite3 --only better-sqlite3` and the app booted cleanly. This is a dev-machine quirk (test harness flips between Node and Electron), not a product bug — the `postinstall` hook in `package.json` handles it for real installs.
- GTK folder-picker is still broken on this VM; bypassed by pre-seeding `~/.config/Electron/afe/settings.json` with `{"root":"/home/ubuntu/afe-test"}`. Same workaround as the previous session.

## Cross-reference — CLI produced the same ranking

Against the same fixture, the CLI (built from the same `core/` package) prints:

```
[0.725] invoice-march-2024.txt
[0.628] notes.md
[0.477] meeting.md
[0.320] recipe.txt
```

GUI matches, so both the Electron IPC path and the pure Node path go through the same reranker.

## Recording

https://app.devin.ai/attachments/367b3343-ff45-4498-99b4-9607ab61d5c7/rec-14052d2f-0762-4da1-8dfe-c2a17a9a5365-edited.mp4
