# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-21 · Desktop · branch `feat/firm-quiz-builder-ui`

**Two commits, both pushed, and a PR to `master` opened.** Suite **12,341 green** (570 suites),
lint 0, coverage and audit gates passed at push. Tree clean. **26 live items.**

🔴 **7.12 IS THE LAPTOP'S; THIS MACHINE'S JOB IS NOW 7.13.** The merge of `origin/master` did
**not** clear the duplicate `check:branch` had been warning about — **it produced it**. Both
machines had filed different work under 7.12, this branch's copy won the merge, and
`tests/unit/itemIdentity.test.js` — which came across in that same merge — caught it on the first
run. **Mike had already ruled on it** in [`ITEM-NUMBERING.md`](ITEM-NUMBERING.md) §2026-09-19:
7.12 is **restored**, not renumbered, and the later-filed job takes the free number. Applied as
ruled, not re-decided. ⚠ **Do not "fix" this again from the laptop** — both machines fixing it
independently is how it started.

🔴 **ITEM 17 — THE SALES TRACKER, FILED AND SURVEYED.** Mike asked for a merge plan, then said to
file it. **Brief: [`features/sales-tracker.md`](features/sales-tracker.md)**, with a history page
and an index row — a feature page without its companion is **dropped from the Handbook silently**
(`tests/unit/newFeature.test.js`). The app is `E:/Visual Code Projects/sales-tracker-nuxt-clean`,
origin `advisor-e/sales-tracker-nuxt`, and the two are **in step**. Someone had already converted
it off TypeScript, down from Nuxt 3 to Nuxt 2, into Pug and Buefy — **that is what "clean" means**,
and the screens are genuinely on our stack.

**THE IMPACT TEST IS HALF ANSWERED AND THE BRIEF SAYS SO.** Mike ruled it serves the firm's **own
advisors**, not their clients. **The measurement is NOT named, so no design begins.**

⚠ **THREE BLOCKERS, ALL READ FROM THE SOURCE, NOT FROM ITS DOCS:** Prisma across 33 files; all 36
API files inside Nuxt `serverMiddleware`; the `openai` SDK. Zero tests. `.nvmrc` says Node 20.
🔴 **Its own `CLAUDE.md` still describes the old Nuxt 3 app — never trust it, read the source.**
**Recommended NOT to absorb wholesale — pipeline and COI only.**

**MIKE ASKED TWICE TODAY WHY SOMETHING WAS MISSING** — the Sales Tracker from the Handbook, and
7.13 from the laptop's list. **Both had the same cause and neither was a fault:** this branch was
9 commits ahead of `master`, and both the Handbook and the other machine read from `master`. The
PR is the fix. **This is item 14.3's territory and `/startup` step 6's whole reason for existing.**

⛔ **AND A CORRECTION MADE HERE, SO IT IS NOT REPEATED.** This session was about to leave the
laptop a note telling it to open a PR for its 7 pushed commits. **That was wrong and it was not
done.** The laptop's own handover says its day's work sits on a local-only side branch that
**Mike has ruled nothing on — "parked for him, not pending merge"**. Its 7 pushed commits are
ordinary finished work and are clean, but **whether they go to `master` is Mike's call, never a
nudge written into the other machine's note.** A sentence one session writes becoming the next
session's orders is the failure `CLAUDE.md` names again and again.

**LAPTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `advisory-engine.md`,
`features/README.md`, and the two new `sales-tracker` pages. **No `activeOn` is set on this
machine.** Your 7.5, 15.1 and 15.7 are untouched.

**NEXT:** **7.13** is unclaimed and ready to build from the written steps in `advisory-engine.md`
§4. **15.6 needs Mike** — eight concepts name a response form the app cannot find. **17 needs
Mike's score and, before any design, the measurement.**
