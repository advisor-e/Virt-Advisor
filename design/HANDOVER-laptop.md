# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

> 🔴 **ADDED BY THE DESKTOP, 2026-09-16, ON MIKE'S INSTRUCTION — READ THIS FIRST, THEN THE
> SESSION NOTE BELOW.** This is the only time the desktop writes in this file; it did so
> because the alternative was you opening to a 115-commit merge and a conflict.
>
> **`v0.13.0` WAS CUT AND PUSHED** — 197 commits, PRs #96/#97/#98, tag on `9b44cbd7`.
> `master` moved a long way after your session ended.
>
> ✅ **YOUR BRANCH IS ALREADY LEVEL WITH `master`** — the desktop merged it in for you and
> pushed. **Nothing of yours was overwritten:** `master` was merged INTO your branch, never
> the reverse, and your two commits are untouched. The one conflict was `CODE-SIZE.md`,
> which is generated — resolved by running `npm run handbook`, not by choosing a side.
> Verified after merging: **11,930 tests green / 556 suites.**
>
> **So at your next startup: `git pull` and begin.** No catching up, no conflict.
>
> ⚠ **Your handover below is from before all this and its first line is now wrong** — it
> says 0 ahead / 0 behind, which was true when you wrote it. Everything else in it stands.
>
> **What the desktop did that touches you:** Template Profiles (a new Mentor Hub tab),
> the engine reading authored profiles, and a new binding rule in `CLAUDE.md` — **THE
> IMPACT TEST**: state the problem or gain and the measurement *before* any design, or the
> work does not start. Read it before scoping anything.

## 2026-09-16 (second session) · Laptop · branch `feat/advisor-progress`

Suite **11,180 green** (525 suites), lint 0, coverage and audit gates passed. Tree clean.
**0 ahead, 0 behind `master`.**

**THE 81-COMMIT BACKLOG IS MERGED** — PR #94 (`b9b6ac2d`), PR #95 (`efd6ac1f`). Nothing had
reached `master` since 13 September, and that one fact caused both of today's faults.

🔴 **DESKTOP — YOU MERGED `master` (`90580cf3`) WHILE WE WORKED, SO YOU ALREADY HOLD BOTH OF
THESE.** Nothing to catch up on; act on them.

**1. Your `7.5` becomes `7.10`** — Mike's ruling, recorded in
[`ITEM-NUMBERING.md`](ITEM-NUMBERING.md) §4. Both machines filed a 7.5 a day apart. Ours keeps
the number on cost alone: it is quoted in fifteen-plus files, yours in `semanticProfiles.js`
and its test. **You apply it** — the item is on your branch and we never edit it.
`npm run check:branch` names the clash every session until you do.

**2. Our handover was never missing.** Your note says we left none for five sessions; there are
twelve commits to this file in three days, three of them today. You were reading the copy
frozen in your own working tree at the 13 September merge. `branch-survey.js` reads it from our
branch instead, and you now have it — `npm run check:branch` will date this note correctly.

**The number check answers the right question now.** It reported the free *parent* while, since
Mike's 2026-09-15 ruling, almost every new job takes a *decimal* — which is why it printed
"highest in use 14.2 / 14.1" the morning 7.5 collided. It now prints the next free decimal of
every open subject across all branches, flags any number naming two different jobs, and never
offers a closed `2.x`/`3.x`/`4.x` number.

**Shared files I changed:** `scripts/ref-ceiling.js` and its test, `design/ITEM-NUMBERING.md`,
`design/CODE-SIZE.md`. **7.5's `activeOn` stays on the laptop**, still blocked on
`FirmManagerHub.vue`, which is 9.1's and yours.
