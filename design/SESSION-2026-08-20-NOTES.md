# Session Notes — 2026-08-20 · Laptop, Session 74

> **Branch `feat/advisor-progress`.** Suite **320 suites / 5,764 tests green**, lint 0 errors.
> The drop from 325 / 5,876 is five deleted suites, not lost coverage.
>
> ✅ **Item 4.24 closed** — the Coaching Reference is folded into the logic trees and gone, tab
> and all.
> ✅ **A new master-template export applied** — one template renamed at source by Mike.
> ✅ **Mike's Coping with Adversity material is now in Domain Support in full.**

---

## 🔴 FIRST TASK NEXT SESSION

**Item 4.19 — finish the property model: properties 2 to 5, the apportionment, and the
consolidated report.** Mike asked for this explicitly at the start of session 74: *"finish 4.24
then lets get 4.19 finished at last."* Unblocked since 4.20 closed on 2026-08-18.

---

## What shipped

### 1. Item 4.24 — the Coaching Reference, read then removed

**The reading came first and it is the only reason this was safe.** All fifteen rows were read
against the logic tree covering the same ground *before* anything was touched.

**Seven rows had nothing the trees do not already say better.** `demings_volatility` already
carries causality vs correlation vs coincidence. `financial_systems_review` has the Chart of
Accounts. `ratio_analysis` Stage 2 is literally *"When Data Is Less Relevant"* and Stage 3 is
Common Size. And `client_planning` / `client_sales` **name** Planning Outcomes Review, Porter's &
Pine, Blue Ocean and Customer Journey outright, with the routing rule attached.

**Seven pieces were unique and were moved:**

| What moved | Destination |
|---|---|
| Free-draw best, presentation next, watch the video and rehearse | `reveal_growth_curve` Stage 4 |
| *Two bites at the cherry* — why both the Global and Local references get used | `eoy_meeting` Stage 3 |
| *"A big tax bill but nothing in the bank"* — the client's own words | `working_capital_cycle` Stage 1 **+ triggers** |
| Walk the customer's journey, the mini decisions, incremental not drastic | `client_planning` Branch 2a |
| *Shifts the burden of proof back onto the client's business model* | `trial_fit` Stage 1 |
| The **7 Cash Drivers** template — named in no tree at all | `dashboard_discussions` Stage 4 **+ triggers** |
| Easy liquidity; wealth inside vs outside the business | `cashflow`, Loan Estimator branch |

🔴 **Two went in as TRIGGER WORDS, not only as notes.** A note reaches the model once the tree is
already open. A client saying *"why have I got a big tax bill and no cash?"* now **opens** it.
Notes alone would have been half the fix — the same shape of failure this project keeps finding.

**Then the removal, on Mike's instruction — *"remove the tab"*.** Fifteen rows, the
`## Coaching Reference` prompt block at **both** build sites, seven routes, the 362-line
firm-editable cascade, the Hub tab, six dead source files and three gitignored dev files. Five test
suites deleted, three trimmed.

✅ **The firm's promoted case observations are untouched** — different key, different loader, still
FENCED. `coachingPromptFields.test.js` was **rewritten rather than deleted** to keep guarding that
fence, and now asserts the adviser's text sits *inside* it: a fence opening and closing around
nothing would have passed the old shape of that test.

### 2. A new master export, and the template that was renamed at source

Mike re-exported `search_content_20260820053246.json`. Diffed against the live catalogue it changes
**exactly one template of 291**:

| | Before | After |
|---|---|---|
| Title | Client pre Meeting | **Coping With Adversity** |
| Topic | **Covid 19** | Personality Traits |
| Where | Do the Job → General Tools | Do the Job → Specialist Tools |
| Growth | hidden | visible at **Breakeven** |

The export went into `Central Frameworks/` (the loader takes the newest by timestamp; the file is
gitignored) and `data/templates.json` was re-mirrored. Two generated artefacts followed:
`design/CONTENT-ROUTING.md` and two ranking snapshots where the renamed template correctly left
"General Tools".

⚠ **Mike put the file in a different clone of this project** — `C:\Documents\Visual Code
Projects\Virt Advisor`, on `feat/client-knowledge-base`, last commit 14 July, whose git store
reports *"bad tree object HEAD"*. Nothing there is live. **Worth telling him again if a file goes
missing.**

### 3. Coping with Adversity — the material Mike wrote, finally complete

The people-power domain-support material **"Coping with Covid"** is renamed **"Coping with
Adversity"** and enriched from Mike's source deck with the two things that existed nowhere in the
app: the **three-styles table** (what Intensity, Competency and Positive Outlook each look like,
when it is time to change focus, and the Tips n Tricks) and the **"catch ourselves early"**
principle — that doing so avoids serious relationship, self-esteem and poor judgement damage.

Authored into `summary`, `who_when` and `steps` **only**, because those are the four fields
`domainSupport.js` actually emits. A fifth field would have been the 4.16 fault repeated in the
same week it was closed.

🔴 **Its id still says `covid`, and that is correct.** `domainSupportRowIds.test.js` locks ids
against retitling — *"an id is assigned once and never changes… do not tidy an id to match a new
name"* — because a firm's decisions about a row are keyed to it.

---

## 🔴 Three mistakes worth more than the work

**1. A name lookup is not an existence check.** Row 15 was reported to Mike as matching no template
in the 291-template catalogue and having no home anywhere. Both were false. The search had been run
on the row's own stale title, *"Covid 19 Client Pre-Meeting"*; the template was there under a
different name, and the material was **already in Domain Support**. It took Mike producing the
source deck to find out. `COACHING-REFERENCE-EVIDENCE.md` §2 carried the same inference and has
been corrected in place rather than quietly fixed.

**2. Two frameworks can share a vocabulary and not be the same framework.** Folding that row into
the **Heald Matrix** was proposed on the grounds that it "already names three coping styles". It
does — **Assertion, Withdrawal, Dutiful**, the *Hornevian* triad: how a person pursues what they
want. Mike's deck teaches **Intensity, Competency, Positive Outlook**, the *Harmonic* triad: how a
person copes when they **don't get it**. Same tradition, different axis. The merge would have
silently replaced one framework with another, and only reading the deck stopped it.

**3. A finding is not evidence that the finder wasn't looking.** Session 73's notes carried
*"Mike has not sat down with the Property Tax Rules tab"* for a fourth time — while §2 of the same
file recorded a live defect **he found by opening it**. He corrected it on 2026-08-20. The line is
fixed in place with his own words. **Finding the defect WAS the review.**

---

## The rules earned, and where they live

**Not in this note.** A rule left in a session note is a rule nobody finds.

- [`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2 — the full 4.24
  account: what was read, what moved where, and what the evidence page got wrong.
- [`COACHING-REFERENCE-EVIDENCE.md`](COACHING-REFERENCE-EVIDENCE.md) §7 — marked DONE, with its own
  §2 error named on the page that made it.
- [`features/coaching-reference.md`](features/coaching-reference.md) — headed **THIS FEATURE NO
  LONGER EXISTS**, kept as the record rather than deleted.
- [`HUB-NAVIGATION-GROUPING.md`](HUB-NAVIGATION-GROUPING.md) §2 — the approved counts left **as
  approved**, with the change recorded beside them. Live counts measured off the rendered screen:
  firm 3/10, mentor 3/11, group and global 4/12.
- [`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md) — the row struck through, and *why* the page's own
  description condemned it.
- [`features/firm-manager-hub.md`](features/firm-manager-hub.md) — six unconditional tabs, not
  seven.

---

## ⚠ Open for Mike

- **4.19 is next, by his own instruction.** Nothing blocks it.
- **The old clone at `C:\Documents\Visual Code Projects\Virt Advisor`** is stale and its git store
  is damaged. Not urgent, but it will keep catching files he means for this repo.
