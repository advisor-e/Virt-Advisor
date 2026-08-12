# Session Notes — 2026-08-12 · Laptop, Session 48

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,058 green / 297 suites**, lint 0 errors, **65 ahead / 0 behind `master`**, and **pushed**.
>
> ⚠ **The backend was restarted this session and is running from the AI session's process.**
> `npm run go` puts it back under Mike's own window. Nuxt was left untouched.
>
> ⚠ **The dev server still answers on `localhost`, NOT `127.0.0.1`.** Unchanged from sessions 46–47.

---

## 🔴 THE ONE THING TO READ — a fix is not safe until you check what it silently detaches

The apostrophe fault from session 47 was fixed. The fix itself was three lines. **The part that
mattered was not in the plan**: rulings are filed under the normalised name, so changing the
normaliser moved three keys and would have silently un-answered three questions Mike settled on
12 August — `porter s pine`, `de bono s 6 hats`, `deming s theory of volatility`.

**Nothing would have failed.** No test, no gate, no error. Three rows would simply have reappeared on
his queue as unruled — *the exact fault the fix was made to end, arriving by the back door.*

It was caught by measuring the change against the real data **before editing anything**, not by
reasoning about it. The measurement took one script. → [§name-matcher-punctuation-blind](ACTIONS.md#name-matcher-punctuation-blind)

**The working rule:** when a change touches a function whose OUTPUT IS USED AS A KEY, list what is
stored under the old keys before you change it.

---

## What shipped

**`7feb6be` — the apostrophe and the missing space.** Measured against all 291 catalogue records
before and after:

| | Before | After |
|---|---|---|
| Rows on the queue | 88 | **87** — `Porter's & Pine` is the published **Porters & Pine** and is not a row at all |
| "Nothing matches" | 13 | **12** — `Quickfire Diagnosis Template` now offers **Quick Fire Diagnosis** |
| Rulings still attached | 30 | **30** |
| Runtime gate output | 14 whole / 14 partial | **identical, character for character** |

✅ **The safety claim is pinned by a test that re-runs the gate under the OLD normaliser and asserts
equality** — so a future change that makes this stricter fails rather than quietly muting advice.
16 tests; four of them assert that no harm was done rather than that the feature works.

**Mike confirmed it on the screen the same hour** and ruled `Quickfire Diagnosis Template` →
**Quick Fire Diagnosis** (`c192605`), which is the row the fix put in front of him.

---

## ⚠ A recommendation and its opposite are both in the record, on purpose

Mike also ruled `Covid Agenda Programme` → **not a tool**.
[`TEMPLATE-CHECK-THE-LAST-12.md`](TEMPLATE-CHECK-THE-LAST-12.md) §1 argues the opposite — that it is
**Covid Agendas**, whose purpose describes itself as *"a 4 step business recovery plan"* against a
sentence naming four steps (Feasibility, Scenarios, Contingency, Fundamentals).

**His ruling stands and is recorded as given.** It was raised with him once rather than committed
silently, because a record holding a recommendation and its opposite with nothing acknowledging the
difference is worse than either alone. **Do not re-open it.** It is noted here only so a future
session reading the document does not think the screen is wrong.

---

## 🔴 Get Seminar is not a tidy-up — it is advice advisers are not getting

New, and it changes the priority: of the 7 branches naming *"Get Seminar template"*, **1
recommendation is withheld entirely, 6 in part, and 0 reach the adviser intact.**

The gate is right — no record in the 291 has "Seminar", "Speaking" or "Presenting" in its title. What
changed is that `recommendation` became gated (`fdb15ca`) *after* the earlier entries were written,
so nothing in the record said so. → [§get-seminar-silent-in-the-app](ACTIONS.md#get-seminar-silent-in-the-app)

**Still Mike's to reword, toward Public Speaking. Still not a developer's to rule on.**

---

## The approved design — read the artefact, not this note

→ [`mockups/template-check-table-context.html`](mockups/template-check-table-context.html) ·
[§template-check-table-context](ACTIONS.md#template-check-table-context)

Mike asked to merge Template Check onto the Logic Tables page, **saw it drawn that way, and turned
the direction down**: *"keep the logic tables page clean and as-is so it's easier to work with on
logic tables."* The rejected drawing is kept —
[`mockups/logic-tables-rule-in-place.html`](mockups/logic-tables-rule-in-place.html) — so a future
session proposing the same merge finds the answer already there.

Three things are ruled and all three live in the artefact: the direction; **one branch above and one
below** (*"when possible"* — the first and last branch of a table show two rows, and no blank row is
padded in); and the seven labels, *"good as they are."*

🔴 **Anything built uses those words exactly.** The build has NOT started.

**Why it earns its place, in one example:** `Decision Workpaper` has been open since 5 August. The
branch **directly above it** names **FM Board White Paper** and is already ruled to it. The matcher
will never suggest that — the names share no words — and it is right not to guess. Reading the table
finds it; matching cannot.

---

## ☐ Open for Mike

- ☐ **11 rows still saying "Nothing matches"** — 7 are Get Seminar (not rulings), 4 are real.
  Evidence written per row in [`TEMPLATE-CHECK-THE-LAST-12.md`](TEMPLATE-CHECK-THE-LAST-12.md).
  **Only one is genuinely open:** Management Reporting Annual Plan — **Mgt Annual Plan** *or*
  **Annual Board Plan**. They are not the same document.
- ☐ **Get Seminar's 7 lines** — Logic Tables tab, reword toward Public Speaking. Now known to be
  costing live advice.
- ☐ **Build the approved design** (above) — best started fresh, not at the tail of a long session.
- ☐ **The plural `s` — a FOURTH instance of the matcher fault.** Deliberately not an `ACTIONS.md`
  to-do; it is in front of Mike in the evidence file, because a to-do is how it never happens.
- ☐ **Rule the five roll-up labels.** *(Carried 46–47.)*
- ☐ **Decide `advisor_note`**, and **whether `action` and `notes` should be gated** — recommendation
  remains **no**. *(Carried 45–47.)*
- **Decide the mentor +2 / firm +3 tabs.** *(Carried 42–47.)*
- **Ask the master team for the two role values + which group a manager manages.** *(Carried 39–47.)*
- **Reply to Carl about `npm install`.** · **Raise the export gap — ELEVEN tools.** *(Carried.)*
- **65 commits unmerged on this branch.** 🔴 **Mike ruled 2026-08-11: no PR to `master` until the
  task list is clear.** Known and accepted — do not re-raise. The branch **is pushed**.

---

## On conflicts

**Shared files touched this session** — the desktop should merge `master` before going near any:

- [`server/utils/toolNameScan.js`](../server/utils/toolNameScan.js) — `normalise` deletes
  apostrophes; **new `normaliseLegacy`**. 🔴 **A conflict resolved by dropping `normaliseLegacy`
  silently un-answers three of Mike's rulings.** It is read-only and load-bearing; nothing is ever
  written under the legacy key.
- [`server/utils/templateCheck.js`](../server/utils/templateCheck.js) — `findCandidate` gained a
  last-resort space-insensitive pass that runs **only after the whole catalogue has failed**; and
  `legacyFindingKey`. Keep the ordering — moving that pass earlier lets it outrank a real match.
- [`design/ACTIONS.md`](ACTIONS.md) — one row closed, two rows added.
- **New:** `tests/unit/toolNamePunctuation.test.js` · `TEMPLATE-CHECK-THE-LAST-12.md` ·
  two `mockups/*.html`.
- **Changed by Mike, not by code:** `data/dev-template-check-rulings.json` — two new rulings.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went near them.

## Commits

- `7feb6be` — the apostrophe and the missing space, and the three rulings that nearly detached
- `9bba300` — the last 12 rows, and Get Seminar being cut from live advice
- `c192605` — Mike's two rulings, and the merge direction he turned down
- `9e51782` — the table brought into the row, the direction he chose
- `d6267e4` — one branch above and one below
- `08a9e48` — the seven labels approved, recorded in the artefact itself
