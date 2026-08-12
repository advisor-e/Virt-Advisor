# Session Notes — 2026-08-12 · Laptop, Session 49

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,088 green / 299 suites**, lint 0 errors, **68 ahead / 0 behind `master`**, and **pushed**.
>
> ⚠ **Both dev servers were restarted this session, at Mike's explicit instruction, and are
> running from the AI session's process.** `npm run go` puts them back under his own window.
>
> ⚠ **The dev server still answers on `localhost`, NOT `127.0.0.1`.** Unchanged from sessions 46–48.

---

## 🔴 THE ONE THING TO READ — a feature is not delivered until someone can REACH it

The approved design was built, tested, committed, and proven live against the running backend.
Mike then said: ***"that version doesn't have the page at all."*** He was right, and so was every
check that had been run.

[`pages/index.vue`](../pages/index.vue) redirects `/` to `/advisor`. **No screen in this app links
to `/mentor`.** The address has to be typed, and the demo instruction given to him —
*"Mentor Hub → Template Check"* — did not contain it. Three messages were spent on a screen that
had been working the whole time.

**The working rule:** *"the data is correct"* and *"you can reach it"* are two different claims.
When handing a screen to someone, give the URL, not the path through a menu.
→ [§no-route-to-the-mentor-hub](ACTIONS.md#no-route-to-the-mentor-hub)

**Where it lives:** **http://localhost:3000/mentor** → the tab strip → **Template Check**.
Auto-signs in as the mentor on localhost; nothing to log into.

---

## What shipped — `741fb7a`

**The approved design, built.** Every Template Check row now opens out onto the evidence it is
judged from. Two artefacts, one panel:
[`mockups/template-check-table-context.html`](mockups/template-check-table-context.html) and
[`mockups/template-check-evidence-row.html`](mockups/template-check-evidence-row.html).
**Open the artefacts, not this note.**

| Part | What it shows |
|---|---|
| **What the logic table says** | The sentence, with the name marked. A formal list entry has no sentence, so it names the branches asking for the document instead |
| **Where it sits in the table** | The branch with one above and one below. **Nothing padded** at the first or last branch |
| **What the app can open** / **Weaker matches** | Every candidate with its purpose text and section path, not just the one suggestion |

**All seven approved labels are used exactly**, through `locales/en.json`. **Six deviations from the
artefacts are named in [ACTIONS.md](ACTIONS.md#template-check-table-context)** — the two visible ones
being that a row opens on a chevron rather than being permanently open, and that the four buttons stay
in their column.

**The safety half.** `findCandidate` now reads from the ranked list, and a test asserts it returns
exactly what it returned before — on the real catalogue, row by row. **A weak match can never become a
suggestion**; that is the 2026-08-04 failure, and it has its own test.

30 new tests (20 backend, 10 component).

---

## It was used within the hour, and it changed an answer

Mike ruled **4 new rows and re-confirmed 2** on the new screen — 61 rulings to 65.

⚠ **One of them contradicts this repo's own recommendation, and his ruling stands.**
`Lite Fundamentals Data` → **Lite Fundamentals**. `ACTIONS.md` argued for **Lite Data** (the record
about *interpreting data*, against a *poor cash management* branch). He ruled it with **both records
and their full descriptions on screen** — exactly what the panel was built to put there. The entry is
annotated, not rewritten, so the record holds both and says which is which. **Do not re-open it.**

---

## ☐ Open for Mike

- ☐ **Management Reporting Annual Plan** — **Mgt Annual Plan** *or* **Annual Board Plan**. The panel now
  shows both side by side with their descriptions. Still the one genuinely open row.
- ☐ **Get Seminar's 7 lines** — Logic Tables tab, reword toward Public Speaking. **1 recommendation
  withheld entirely, 6 in part, 0 reaching the adviser intact.** Not tidying. *(Carried 48.)*
- ☐ **The plural `s` — a FOURTH instance of the matcher fault.** In the evidence file, not a to-do.
- ☐ **Rule the five roll-up labels.** *(Carried 46–48.)*
- ☐ **Decide `advisor_note`**, and whether `action` and `notes` should be gated. *(Carried 45–48.)*
- **Decide the mentor +2 / firm +3 tabs.** *(Carried 42–48.)*
- **Ask the master team for the two role values + which group a manager manages.** *(Carried 39–48.)*
- **Reply to Carl about `npm install`.** · **Raise the export gap — ELEVEN tools.** *(Carried.)*
- **68 commits unmerged on this branch.** 🔴 **Mike ruled 2026-08-11: no PR to `master` until the task
  list is clear.** Known and accepted — do not re-raise. The branch **is pushed**.

---

## On conflicts

**Shared files touched this session** — the desktop should merge `master` before going near any:

- [`server/utils/templateCheck.js`](../server/utils/templateCheck.js) — `findCandidate` is now a wrapper
  over `rankCandidates`; new `scoreRow`, `looseCandidate`, `sentenceWith`, `branchesNaming`,
  `neighboursOf`, `attachNeighbourState`. 🔴 **`normaliseLegacy` and `legacyFindingKey` are still
  load-bearing** — dropping either in a merge silently un-answers three of Mike's rulings (session 48).
- [`components/mentor/MentorTemplateCheck.vue`](../components/mentor/MentorTemplateCheck.vue) — gained
  `detailed` / `detail-key` and one `#detail` slot. Nothing else in it changed.
- [`locales/en.json`](../locales/en.json) — new `templateCheck.evidence.*` block. English only, as the
  rest of this screen is.
- [`design/ACTIONS.md`](ACTIONS.md) — two rows closed, one added, one annotated.
- **New:** `components/mentor/TemplateCheckEvidence.vue` · `tests/unit/templateCheckEvidence.test.js` ·
  `tests/unit/templateCheckEvidence.component.test.js`.
- **Changed by Mike, not by code:** `data/dev-template-check-rulings.json` — six rulings.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went near them.

## Commits

- `741fb7a` — the answer was one row up, and now the row can see it
