# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-26 · Laptop · branch `feat/advisor-progress`

Suite **6,507 green**, lint 0 errors. Branch **60 ahead, 0 behind** `master`. Nothing
uncommitted. Three commits: `06966c6`, `c1a4eb8`, and this one.

🔴 **4.50's blocker was false, and had been for a month.** It said this machine has no
OpenAI key. [`.env`](../.env) has held a live one since 30 July, dotenv loads it at
[`restify-server.js:50`](../server/restify-server.js#L50), and the backend prints
`OPENAI_API_KEY present=true` on boot. Nobody had looked. **Check the claim, not the note.**

**The check was run** — three full conversations, 17 API calls, 77,605 tokens. **Two of its
three checks pass and are closed.** The reply streams token by token (435/1,094/792 chunks),
and no marker text ever reaches the screen — 2,321 chunks, every partial prefix tested. Not a
vacuous pass: one run demonstrably *did* produce a marker, provable because its declared order
differs from the deterministic prose-scan order. **The third check needs MySQL, not OpenAI** —
all three sessions completed and *none* was recorded (`ECONNREFUSED 127.0.0.1:3306`, no error
raised). So it needs UAT. ⚠ **"Team Dashboard" is not a screen** — it is the Team tab, fed by
`/api/activity/team`. The words survive only in two code comments
([`tierLookup.js:88`](../server/utils/tierLookup.js#L88) and this test's header), left alone
deliberately.

**4.53 filed** — the AI writes the marker only *sometimes*: confirmed present once, absent
once, one run genuinely indeterminate. That is not a measured rate and the item says so. When
it is absent the engine silently falls back to the prose scan the marker was built to replace,
and nothing anywhere records which path ran. **Waiting on Mike to rank.**

**Fixed and verified live:** the two *buffered* AI paths never stripped the marker — the
ordinary reply (`_mainBuffer`) and the post-recommendation follow-up (`_postBuffer`), both
carrying `client.txt` §11. Unlike Phase 3, a leak there prints whole and stays. Proven from
code, never seen to fire. ⚠ **Mike approved fixing one path; both were fixed** — same bug,
stated in the commit rather than folded in.

⚠ **Stopping the backend leaves an orphan.** Killing `npm run backend` through the task runner
kills the wrapper, not node: port 4000 stays held, the next start fails `EADDRINUSE`, and the
conversation silently runs the **old code**. It nearly produced a clean-looking verification of
an unfixed build. Clear the port before trusting a restart.

**Waiting on Mike:** **4.15** (23 template names) · **4.53** (rank
it). **4.50** now waits on UAT, not on us.

**Unchanged:** `npm install` still needs npm 8.19.4 on Node 14.15 — [`../.npmrc`](../.npmrc).
