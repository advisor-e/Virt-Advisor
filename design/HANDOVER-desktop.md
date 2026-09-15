# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-15 · Desktop · branch `feat/firm-quiz-builder-ui`

**Six commits, all pushed** (`d9edc83a` → `9b7d81fa`). Suite **11,167 green** (527 suites),
lint 0, coverage and audit gates passed. `npm run build` succeeds. Nine live items.
**4.97 is 50 of 67 — US1 to US7 COMPLETE, US8 half done.** `activeOn` still names this machine.

🔴 **I TOLD MIKE SOMETHING UNTRUE AND IT CAME FROM THE TASK LIST.** I said every pooled row
had a blank primary issue; it had been fixed the day before. Auditing found **twelve tasks
(T007–T018) built and never ticked** — the count said 36 when it was 40. The rule is now at the
head of Phase 2: **tick the task in the same change as the code, and where a list and the code
disagree, the code wins.**

**THREE THINGS PROVED BY RUNNING IT, NOT BY THE SUITE** — the pattern keeps earning its place:
reach read *2 of 3* against real MySQL; the server **refused to boot** with a sharing firm and
no pool secret (exit 1, message naming the count and no firm id); the out-of-sample bench showed
both states, including its honest refusal on a one-month pool.

⚠ **NEXT JOB IS SPELLED OUT IN THREE PLACES** (spec Phase 10, the item note, the test's header):
route **`advisorEngine.js` (10 sites) and `courseEngine.js` (4)** through the AI seam — the last
two of eight files. **Mike's privacy ruling is already recorded so it is not re-argued:** the
advisor conversation is **personal** and never falls back until a chosen provider's written terms
have been read. Left because **6 of those 14 calls stream** and a broken stream half-works — it
needs the app driven afterwards, not just the suite. **Nothing is half-converted:** the seam is
additive, so an unrouted file calls OpenAI exactly as before.

**Also found, not fixed (nobody asked):** the bench script prints `−undefined` in its "Live:"
line — it reads `a.holdBack`, renamed to `size` in US2. Cosmetic, in a dev script.

**LAPTOP:** your note is dated 2026-09-13 while your branch had a commit on 2026-09-15 — two days
stale, flagged again. You are 52 ahead / 3 behind master. Shared files I touched:
`server/routes/cases.js`, `server/routes/meetingReview.js`, `server/routes/economicAnalysis.js`,
`server/routes/nextStepsDraft.js`, `locales/en.json`, `config/` untouched. Merge `master` first.
