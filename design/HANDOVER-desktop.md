# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-16 · Desktop · branch `feat/firm-quiz-builder-ui`

**Six commits, all pushed** (`68f3d881` … `6d2933ea`). Suite **11,930 green** (556 suites),
lint 0, `npm run build` succeeds. **Fifteen live items. 7.2 is 63 of 67** — `activeOn` KEPT,
the four remaining tasks are in hand here.

🔴 **READ `CLAUDE.md` → THE IMPACT TEST BEFORE SCOPING ANYTHING.** New binding rule, Mike's
words: state the problem or gain, **the measurement, named before the work**, and what
already does the job — or the work does not start. It came from him asking what US9 actually
bought after it shipped. Measured: authoring three profiles moved the 51-case lab **5.6 →
5.7**, the engine already picked a content-driven top recommendation in **51 of 51** with
none authored, and the tool given a profile appeared **less** often (22 → 19). Not a licence
to re-argue work he has asked for — report once, at scoping.

**US9 SHIPPED IN FULL**, on two rulings the same day: read-only first, then authoring once he
was told plainly it changes what advisors are recommended with no test able to judge a
weight. Template Profiles is live on the Mentor Hub; the engine reads authored profiles over
the compiled file and **falls back to compiled if the store fails**.

⚠ **MERGED `origin/master` IN — 84 commits.** This branch was 0 behind at startup and went
behind mid-session when the laptop's PRs #94/#95 landed. No code conflicted; four record
files did, all resolved keeping both sides. **The desktop's 7.5 is now 7.10** per Mike's
ruling — the laptop took 7.5 the same day.

⚠ **Item 9.2 fired again**, third time: `--help` is not a recognised lab flag, so it was read
as a case filter, ran 0 cases and overwrote the real 51-session report. Restored from git.
The item already carries this; nothing new to file.

**The AI-ON lab needs the Avast root**, not `.env`'s digicert bundle — export it to
`NODE_EXTRA_CA_CERTS` or every OpenAI call fails *"unable to verify the first certificate"*.

🔴 **`v0.13.0` CUT AND PUSHED** — 197 commits, PRs #96/#97/#98, tag on `9b44cbd7`, ledger row
written and backfilled. **The master team needs ONE NEW TABLE, `advisor_model_choices`; no
`npm install`.** Verified on the tag commit itself: backend starts and mounts every route,
11,930 green, build exit 0.

**BOTH BRANCHES WERE BROUGHT LEVEL WITH `master` AFTER THE TAG**, on Mike's instruction —
including the laptop's, from here, which is the one time this machine writes the other's
branch. It was 115 behind with a conflict waiting in the generated `CODE-SIZE.md`; `master`
was merged INTO it, never the reverse, and its two commits are untouched. Its handover
carries a dated block saying so.

**LAPTOP:** shared files I touched — `locales/en.json`, `server/restify-server.js`,
`server/advisorEngine.js`, `server/utils/outcomeBench.js`, `components/FirmManagerHub.vue`.
The bench gained an optional trailing `profileMap` argument; every existing caller omits it
and behaves exactly as before. ⚠ **You were right and I repeated the error:** your note is
NOT stale — I read the copy frozen in my own working tree at the last merge. **Read the other
machine's handover from its branch (`npm run check:branch`), never from the working tree.**
