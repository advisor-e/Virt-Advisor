# Session Notes — 2026-08-18 · Laptop, Session 71

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,857 green / 325
> suites**, audit gate PASS, `21 ahead / 0 behind` `origin/master`.
>
> ✅ **Item 4.20 is CLOSED. Phase 1 of the property model is complete — maths, route,
> screen, and the tax rules cascading from the group.**
>
> 🔴 **But the Hub tab it shipped has NO approved artefact, and Mike has not seen it.**

---

## 🔴 FIRST TASK NEXT SESSION

**Open the Property Tax Rules tab on the running app, with Mike.** `npm run go`, then the
Firm Manager Hub → **Property Tax Rules**.

This is not polish and it is not a to-do item — it is the one thing standing between
"built and tested" and "done". The tab was built with no mockup and shown to nobody. Its
*wording* is Mike's own rulings (§8 Q5 and Q6), so nothing on it is invented; its
**layout** — inherited / changed / resolved, three ways, with version history — was never
put to anyone.

⚠ **Do not draw a mockup of it now.** A drawing copied from a finished build can only
agree with what it was copied from. That is the Save-the-Artefact failure wearing the
rule's own clothes. The remedy is Mike looking at the real screen. Full reasoning:
[`MULTIPLE-PROPERTY-ASSESSMENT.md`](MULTIPLE-PROPERTY-ASSESSMENT.md) §10.

**After that, 4.19 is unblocked** — properties 2 to 5, the apportionment and the
consolidated report. It holds none of Phase 1's mathematical difficulty.

---

## What happened

**One commit: `1feefa2`** — 12 files, 1,156 insertions, 34 new tests.

### 1. The session opened on unsaved work

`/startup` found a dirty tree with nine files in it and **no session note explaining
them** — the Property Tax Rules build, finished but never committed. The last note
(session 69) ends at a clean tree, and two commits plus this work landed after it.

⚠ **The lesson is not "commit more often", it is that the earlier session ended without
`/shutdown`.** Everything in the tree turned out to be good work; nobody could have known
that without reading all nine files.

🔴 **Running its own two test files showed 34 passing and that was NOT enough.** The full
suite found **4 failures in two other suites**, both caused by the new tab. A subset of
tests answers a subset of the question — the commit gate is what actually knows.

### 2. Two guards objected, and both were right

| Guard | What it wanted |
| --- | --- |
| `mentorHubScope.component.test.js` | The new tab **named** as a tier exception, not absorbed |
| `contentRoutingReport.test.js` | `design/CONTENT-ROUTING.md` regenerated for the new data file |

The first is the interesting one. It guards the claim that *a person who knows the firm
screen recognises the mentor screen*, and the exception list is now **three**. Property
Tax Rules carries its own written reason, because it is the first exception that is **not**
"a manager's view of their own advisers by name" — it is a country's tax settings.

🔴 **The first fix was wrong and the test caught it. The list is in TAB ORDER**, not the
order exceptions were ruled on, so appending the name failed. That is now a written trap
at [`features/firm-manager-hub.md`](features/firm-manager-hub.md) §4.

### 3. An approved artefact had drifted from the code

`MULTIPLE-PROPERTY-ASSESSMENT.md` §9 still said, in bold, that the tax cascade *"has not
been started"* — about work that was finished. Corrected with the old sentence quoted
rather than overwritten.

⚠ **No test compares a design document to the code**, and nothing would have caught this.
It was found only because `/shutdown` re-read the file.

### 4. `.gitignore` was missing a dev file

`data/dev-property-tax-rules.json` had no ignore line where all thirty of its siblings do.
Nothing had broken — the file is only written when a rule is saved with no database. **It
is keyed by SCOPE rather than by firm**, so leaking it would put one machine's whole tier
chain into the repository, not one firm's row.

---

## The rules earned, and where they now live

**Not in this note.** A rule left in a session note is a rule nobody finds.

- [`features/tier-cascade.md`](features/tier-cascade.md) §4 — property tax rules as **the
  sixth block, and the first that is SETTINGS rather than ROWS**. It uses `deepMerge`, not
  `resolveInheritedRows`, and the reason is written out: there is nothing to switch off and
  nothing to add, so the row mechanism would need a synthetic id per field and an
  off-switch that means nothing.
- [`features/firm-manager-hub.md`](features/firm-manager-hub.md) §4 — the tab matrix, the
  mentor's exclusion and the option Mike turned down, and the tab-order trap.

---

## 🖥 FOR THE DESKTOP

⚠ **Four shared files moved. If your branch touches any of them, the merge needs a look.**

| File | What changed |
| --- | --- |
| [`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue) | One new `b-tab-item`, one import, one `TAB_TIERS` entry |
| [`server/restify-server.js`](../server/restify-server.js) | One `require`, four route lines — all appended |
| [`.gitignore`](../.gitignore) | One new block, five lines |
| [`design/CONTENT-ROUTING.md`](CONTENT-ROUTING.md) | **Generated — do not hand-merge.** Run `npm run routing` |

✅ **Nothing here can conflict with a Course Builder build.** `logic-lab` untouched.

**New files:** `server/utils/propertyTaxRules.js`, `server/routes/propertyTaxRules.js`,
`components/firm/FirmPropertyTaxRules.vue`, `data/property-tax-rules.json`,
`tests/unit/propertyTaxRules.test.js`, and this note.
**Also touched:** `components/MultiplePropertyAssessment.vue`,
`tests/unit/hubTabTiers.test.js`, `tests/unit/mentorHubScope.component.test.js`,
`design/MULTIPLE-PROPERTY-ASSESSMENT.md`, `design/features/to-do.md` +
`to-do-items.json` + `to-do-done-and-parked.md`, `design/features/tier-cascade.md`,
`design/features/firm-manager-hub.md`, `design/ACTIONS.md`.

---

## ☐ Open for Mike

1. 🔴 **Open the Property Tax Rules tab** — see the top of this note. One look, not a
   working session.
2. **Send the release email** — [`RELEASE-v0.9.0-EMAIL.md`](RELEASE-v0.9.0-EMAIL.md), still
   not sent. Sending it as written also closes item **3.5**. 🔺 **carried from session 67.**
3. **Where the engagement types live** — the only part of 4.16 still open. 🔺 **carried
   seven sessions.**
4. **4.22 · whether purchase costs are non-deductible in year 1** — one sentence, blocks
   nothing. It needs an accountant's answer, not a developer's.
5. **Whether a firm may REMOVE an inherited diagnostic situation.** Carried from session 65.
6. **The "Ceiling history" button** — covers two settings, names one. Carried from session 64.
7. **4.12 · where the corrected handover lives** — carried **thirteen** sessions.
8. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried
   **thirteen** sessions.
9. **The template picker on a firm's own coaching entry** — carried from session 60.

⚠ **Items 7 and 8 have now been carried for thirteen sessions each.** Neither needs a
working session.

---

## Housekeeping

- **The live list is TEN.** 4.20 moved to
  [`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2 with its
  evidence. **Two items need Mike** (4.16, 4.22).
- **4.19's row was rewritten, not just unticked.** It said *"DEPENDS ON PHASE 1 — do not
  start this first"*; it now says Phase 1 is complete and carries the warning not to repeat
  the missing-artefact fault when Phase 2 puts anything on a screen.
- **The tab-count claim in `firm-manager-hub.md` was NOT updated to "13 tabs".** The tab is
  conditional on tier, so no single number is now true for every hub, and inventing one
  would be worse than the matrix that is there.
- 🔴 **The group tier still cannot be exercised by a real login**, and this feature is where
  that bites hardest: a group is normally a country, and country is exactly what the chain
  cannot resolve. No role value produces `group_manager`; `firms` has no country column. It
  falls back to the platform scope and the shipped New Zealand defaults — today's behaviour,
  never a guess. **The evidence behind the group tier is tests against a seeded membership
  map, which is weaker than a live screen and is stated as one** in the module header.
- **The dev servers were not started this session.** Nothing was built that needed looking
  at — but see the first task, which is precisely that.
