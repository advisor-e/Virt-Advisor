# Session Notes — 2026-08-05 · Laptop, Session 34

> **Nothing is unsaved.** `feat/advisor-progress` = `origin` at `ddd451a`, tree clean, suite
> **4,607 green / 268 suites**, lint 0 errors, **3 ahead / 0 behind `master`**.
>
> Session opened by merging the desktop's 12 commits (`3d5ae08`) — Logic-Lab "Accept and Push",
> the certificate fix, and the v0.7.0 release cut. **No conflicts**, suite green after.
>
> ⚠ **PR #36's backend restart is STILL outstanding** — carried from yesterday, unchanged.

---

## What the next session most needs to know

**A name that isn't in the export is not a name that doesn't exist.**

Yesterday's P1 said 12 template names in the logic trees "do not exist" and proposed holding them
back. That premise was wrong, and it was wrong because the names were checked against **one file**
— the search export — and never against the documents the trees were built from.

Reading `Logic Tables/*.pdf` settles it. The source tables name the tools in their THEN column —
*"THEN deploy the **Risk Mgt Cover** matrix"*, *"THEN apply the **Ethics Conduct & Effect**
matrix"*, *"THEN initiate the **Directorship Pathway 1** checklist"* — and the trees copied them
faithfully. The logic tables use the working name (a tab, checklist or matrix *inside* a document);
the export publishes the whole document under a different title. Mike confirmed the six that match
nothing at all are real documents.

**Carry this:** before calling content missing, check it against the source it was authored from,
not only against the file that happens to be machine-readable. The repo's own ghost validator
already says this in a comment — *"a ref is valid if in the search JSON **OR** named in the source
PDFs"* — and nobody had applied it to prose names.

---

## What was done

### 1. Merged `origin/master` (`3d5ae08`)

12 commits from the desktop, no conflicts — including in `ACTIONS.md` and `locales/en.json`, where
one was expected. Suite green afterwards. Only `package.json` change was the certificate fix, so no
reinstall was needed.

### 2. The availability gate (`ddd451a`)

`isTemplateName()` and `splitByAvailability()` in
[`logicTrees.js`](../server/utils/logicTrees.js); every template list is filtered inside
`formatNodeForPrompt` before it reaches the AI.

**It changes nothing today** — 291 names emitted, 18 prose placeholders passed through, **0
withheld** — and [`templateAvailabilityGate.test.js`](../tests/unit/templateAvailabilityGate.test.js)
(10 tests) pins that against the real trees. That test is also the announcement mechanism: the day a
tree declares something the catalogue cannot serve, it fails and names it.

**Two decisions inside it worth keeping:**

- **Fail-safe.** An unreadable catalogue turns the gate **off** and logs loudly. Withholding on an
  empty catalogue would strip every template from every recommendation — far worse than the problem
  being solved.
- **`resolveTemplateName` is the wrong tool for this** and was rejected mid-build. It answers
  "*which* page is this?", so it returns `ambiguous` for **Partner Accountability**, **Formal Risk
  Management** and **Capacity, Capability, Opportunity** — real tools listed twice — and `none` for
  the 18 deliberate prose placeholders. Using it would have silently dropped **40** live references.
  The gate uses a title-presence check with the ghost validator's own predicate instead.

### 3. The record corrected

[`TREE-RECOMMENDATION-REVIEW.md`](TREE-RECOMMENDATION-REVIEW.md) — the translation list: 9 names
resolved on near-verbatim evidence, 8 with a candidate needing Mike, 6 with no match anywhere. Its
first draft framed all 27 as "ghosts to hold back"; that draft is **marked wrong at the top of the
file** rather than quietly replaced.

`ACTIONS.md`: the ghost-names P1 premise corrected, two new entries logged
([export gap](ACTIONS.md#export-gap-six-tools),
[two template files](ACTIONS.md#two-template-files-disagree)).

---

## Where the work stopped

**Cleanly, after piece 1 of 4.** Nothing is half-finished in code.

The remaining order **matters** and is not interchangeable:

1. The 6 names into `templates[]` (safe now — the gate holds them back).
2. Reword the ghost check from "hallucination risk" to "declared, not yet available".
3. **Emit `recommendation` LAST.** Doing it earlier pushes unresolved names into live prompts —
   the same trap as the original P1.

**The Get Seminar tree is an exception: delete its 7 lines, do not rename them.** That PDF has no
template column at all; the lines were built by the app layer from the PDF's own filename, and the
real instruction already reaches the AI through `notes`.

**Left for Mike:** 8 candidate mappings need his confirmation (see the review doc), and the
[6-tool export gap](ACTIONS.md#export-gap-six-tools) can only be closed by the master-app team.

**When a new export lands:** `Central Frameworks/` is auto-discovered, but `data/templates.json`
must be refreshed and [`advisoryTemplates.js` L30](../server/collaborate/data/advisoryTemplates.js#L30)
re-pointed by hand, then the backend restarted. None of it is automatic.

## On conflicts

Today touched `server/utils/logicTrees.js`, one new test file, one new design file, and
`design/ACTIONS.md`. **`ACTIONS.md` is where a conflict would land**, as ever.

## Open for Mike

- **Restart the backend** wherever it runs, for PR #36's engine changes. *(Carried from 2026-08-04.)*
- **Raise the 6-tool export gap** with the master-app team — five of the six are in the CA Firm
  Strategy logic table alone.
- **Logic Lab remains the desktop's.** Nothing here went near it.
