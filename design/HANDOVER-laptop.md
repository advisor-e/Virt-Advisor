# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-08 (sixth session) · Laptop · branch `feat/advisor-progress`

Suite **8,418 green**, lint 0 errors, audit pass. **Four commits, all pushed.** 49 ahead,
0 behind. **PR #69 still open.** Nothing uncommitted.

**Shipped: 4.72 and 4.76, both closed and off the live list** (closures on
[`to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2). 4.72 — a removed
observation point's id was reissued when the removed one was the **highest**; a stored
high-water mark now rides beside the live rows. 4.76 — a global group manager's or group
manager's rewording was badged as Advisor-e's; the tier that last changed a point is now
carried down the cascade. **Live list is 7 items.**

**🔴 DESKTOP — TWO SIGNATURES CHANGED, and they will break a caller you have added.**
`meetingObservations.nextOwnPointId` and `meetingTypes.nextOwnTypeId` now return
**`{ id, seq }`, not a string**, and both take a third argument (the stored mark). Both
also gained a `nextSeq` config key and dev file. Also moved: `meetingObservationsAdvisor.js`,
both meeting routes, `caseStore.js` (comment), `tierChain.js` (comment),
`collaborate/data/repository.js` (comments), `pages/group-manager.vue` (comment),
`locales/collaborate/en.json` (**four cross-org strings reworded**), `.gitignore`.

**🔴 DESKTOP — THE VOCABULARY GUARD IS WIDER NOW AND MAY FAIL YOUR PUSH.**
`tests/unit/tierVocabulary.test.js` gained three patterns: brand/country + "group manager",
+ "tier", + "group". Mike ordered every tier named after a brand or a country deleted —
his tenth demand. If your branch contains any of those phrases it will fail the gate once
you merge `master`. The words alone stay legal; only welding one to a person or a tier is
refused. **Read the FORBIDDEN block before renaming anything.**

**Three things worth knowing:**

1. 🔴 **A guard that is passing is not a guard that works.** The two coined job titles had
   been banned since 2026-09-02 and the file was green the whole time — the pattern missed
   the same words with "group" inserted in the middle, and that near-miss was sitting in an
   approved mockup. **Test the pattern against the thing it is for.** (Writing this note
   failed the widened guard twice, because naming the banned phrases is itself banned
   outside `tierVocabulary.test.js` — which is the rule working, not a nuisance.)
2. **An item's cost estimate is a guess.** 4.76's `touches` warned it needed
   `resolveInheritedRows`, shared by five blocks. Reading the code showed it needed nothing
   of the sort. Read before believing the note.
3. **Both fixes were mutation-verified** — each deliberately broken to confirm the new
   tests fail. Worth the two minutes; 4.72 existed *because* a test looked right and wasn't.

**Open:** **4.80** filed today and is ours — the old name "global manager" survives in ~45
places, **many of them Mike's own quoted words, which stay verbatim**. **4.15, 4.58, 4.66,
4.77, 4.78 and 4.79 wait on Mike**; 4.78 still needs an IRD source before anything is built.

⚠ **Your note is still dated 2026-09-04 while `feat/firm-quiz-builder-ui` committed on
2026-09-08** — 39 ahead of `master`, and now four days further out of sight.
