# Test Plan — AI File Explorer PR #1

Desktop Electron app (`AI File Explorer`) backed by local Ollama
(`llama3.2:1b` chat, `nomic-embed-text` embeddings). This plan tests the
primary end-to-end flow and five AI features. Every assertion is
designed to fail visibly if the corresponding code path is broken.

## Fixture

`/tmp/afe-test/` contains 4 files intentionally chosen so each AI
feature has a *right* answer and multiple *wrong* answers the model
could give if retrieval/generation were broken:

- `invoice-march-2024.txt` — Invoice `INV-2024-0312`, March 12 2024,
  Acme Robotics, `$4,820.00`, Project Alpha milestone 2.
- `meeting.md` — Weekly sync 2024-03-14. Decision: **"Launch Project
  Alpha on March 20."**
- `notes.md` — Project Alpha notes. "Shipped March 2024." Refers to
  invoice `INV-2024-0312`, biggest customer Acme Robotics.
- `recipe.txt` — Chocolate chip cookies. 375 °F, 11 min. No mention of
  invoices, Project Alpha, or Acme.

## Adversarial rationale (why these tests distinguish broken from working)

If the Electron main process cannot load `@afe/core` (the bug I just
fixed): app crashes at startup, window never renders — Test 1 fails.

If IPC is wired wrong: the AI panel shows `empty` placeholders forever
after clicking a button — Tests 2–6 fail.

If the embedding store was never written to: Search/Chat return "No
matches" / hallucinate — Tests 2 and 3 fail.

If search uses lexical match (not embeddings): "invoice from march"
would also retrieve `recipe.txt` because "from" is common; but a
working embedding search ranks `invoice-march-2024.txt` first with a
score noticeably higher than recipe. Test 2 checks this.

If the chat RAG ignores retrieved chunks and just hallucinates: the
answer won't cite `meeting.md` or `notes.md` in the `[1]` / `[2]`
Sources block — Test 3 checks both the text AND the source list.

If summarize/tag just echo the filename: they won't mention
cookies/baking for `recipe.txt` — Tests 4 and 5 check specific content.

If `similar` uses a wrong centroid (e.g. the query file itself gets
included): result would be empty or rank `recipe.txt` over
`notes.md`. Test 6 checks `notes.md` is ranked first.

---

## Setup note (bypass GTK file chooser)

Electron's GTK folder-picker on this VM refuses to commit the selection
(Open button stays disabled even after highlighting the target
directory). To avoid testing through a broken third-party dialog, I
pre-seed the persisted root by writing:

```
/home/ubuntu/.config/Electron/afe/settings.json = {"root": "/home/ubuntu/afe-test"}
```

and relaunching Electron. On startup, `main/index.ts:84-92` calls
`readSettings()` and then `openStore(settings.root)` **before** the
window is created, and `App.tsx:14-21` fetches `window.afe.getRoot()`
on mount. So the app boots with the folder already selected. The file
chooser UI itself is out of scope for this test (it is a stock
Electron `dialog.showOpenDialog` call).

## Test 1 — App launches and shows the correct shell

**UI path:** with `settings.json` pre-seeded, run
`DISPLAY=:0 node_modules/.bin/electron desktop/out/main/index.js`.

**Assertions (all must hold):**
- A window titled **"AI File Explorer"** appears.
- Topbar contains the brand text **"AI File Explorer"**, a button
  labeled **"Open folder…"**, a button labeled **"Index folder"**, the
  text **"No folder selected"** (before selecting), and the provider
  label **"ollama:llama3.2:1b"**.
- The right pane has exactly 5 tabs in this order:
  **SEARCH, CHAT, SUMMARY, TAG, SIMILAR**.

Evidence file paths: `desktop/src/main/index.ts:63` (title),
`desktop/src/renderer/src/App.tsx:55-69` (topbar),
`desktop/src/renderer/src/components/AIPanel.tsx:19-35` (tabs).

---

## Test 2 — Natural-language Search

**Setup:** click **"Open folder…"**, pick `/tmp/afe-test`, click
**"Index folder"**, wait for the progress bar to reach 100% (onscreen
spinner in the "Index folder" button disappears, progress bar hides).

**UI path:** click the **SEARCH** tab → type `invoice from march` →
press Enter (or click **Search**).

**Assertions:**
- Within ~10 s the result list renders at least one hit.
- The **top** hit's path shortens to `.../tmp/afe-test/invoice-march-2024.txt`
  (ends with `invoice-march-2024.txt`).
- The top hit's score (rendered with `toFixed(3)` at `HitRow.tsx:15`)
  is **≥ 0.40** and **strictly greater** than the score on the same
  list next to `recipe.txt`.
- The snippet under the top hit contains the substring
  **"INVOICE"** or **"Acme Robotics"**.
- Below, `recipe.txt` either does not appear in the top 2 results or
  appears with a visibly lower score.

Would-fail-if-broken: lexical search or broken embeddings would rank
`recipe.txt` (shares "from") at or near the top.

---

## Test 3 — Chat with folder (RAG with citations)

**UI path:** click the **CHAT** tab → type
`When was Project Alpha launched and who is the biggest customer?`
→ press Enter.

**Assertions:**
- An `assistant` message appears within ~30 s.
- The answer text contains both **"March"** and
  **"Acme Robotics"** (case-insensitive match).
- A **Sources** block under the assistant message renders at least one
  row in the exact format `[N] /absolute/path` (see
  `ChatTab.tsx:46-50`).
- At least one source path ends in **`notes.md`** or **`meeting.md`**
  (both contain the answer).
- No source path ends in **`recipe.txt`** (unrelated file).

Would-fail-if-broken: a non-RAG answer would either hallucinate, omit
the Sources block entirely, or cite the wrong files.

---

## Test 4 — File summary

**UI path:** single-click `recipe.txt` in the left file tree → click
the **SUMMARY** tab → click **"Summarize file"**.

**Assertions:**
- Within ~20 s the `Summarizing…` spinner is replaced by a summary
  block styled with `whiteSpace: 'pre-wrap'` (see
  `SummaryTab.tsx:37-41`).
- The summary text contains at least one of these substrings
  (case-insensitive): **"cookie"**, **"bake"**, **"flour"**,
  **"375"**, or **"chocolate"**.
- The summary does **not** contain the word **"invoice"** or
  **"Project Alpha"** (those belong to other files).

Would-fail-if-broken: reading the wrong file or reusing a stale cached
summary from another file would produce invoice/Project Alpha content.

---

## Test 5 — Smart tagging

**UI path:** with `recipe.txt` still selected, click the **TAG** tab →
click **"Suggest tags"**.

**Assertions:**
- Within ~15 s, one or more `#`-prefixed chips render (see
  `TagTab.tsx:38-44`).
- **At least one** tag contains one of: `cookie`, `cook`, `bake`,
  `dessert`, `recipe`, `food`, `snack` (case-insensitive).
- **No** tag contains `invoice`, `alpha`, or `acme`.

Would-fail-if-broken: the model receiving the wrong file content or a
broken tag-parsing step would produce unrelated tags.

---

## Test 6 — Similar files

**UI path:** single-click `invoice-march-2024.txt` in the tree → click
the **SIMILAR** tab → click **"Find similar"**.

**Assertions:**
- Within ~15 s the list renders at least one hit.
- The **top** result's path ends in **`notes.md`** (they share
  "Project Alpha", "Acme Robotics", and the invoice number
  `INV-2024-0312`).
- `invoice-march-2024.txt` (the query file itself) does **not** appear
  in the result list.
- The top score is **> 0.5**.

Would-fail-if-broken: `similar.ts` including the query file in its own
results would show the invoice at the top with score 1.000. A broken
centroid would rank `recipe.txt` first.

---

## Acceptance

All six tests must pass for the PR to be considered ready to merge.
Any failure is reported inline in the PR comment with a screenshot
and the observed value.
