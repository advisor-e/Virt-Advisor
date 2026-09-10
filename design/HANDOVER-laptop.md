# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-11 (eighteenth session) · Laptop · branch `feat/advisor-progress`

Suite **9,794 green** (476 suites), lint 0, audit PASS. Four commits, all pushed, all in
**PR #82** — not yet merged. Tree clean. Nothing active on this machine.

**4.82 IS BUILT AND CLOSED — the cap on paid AI readings.** 20 per firm in any rolling 24
hours, shared by advisors and managers, spent one line before the model call so a refusal
costs nothing. Seven rulings from Mike, asked one at a time; the reasoning is in
[`server/utils/aiLoadBudget.js`](../server/utils/aiLoadBudget.js) beside the code. **Seen
working live:** both routes refused at the limit with his exact wording, and two refusals
recorded nothing.

🔴 **THE REAL EVENT: IR265 WAS LOADED FOR THE FIRST TIME AND THE FEATURE REFUSED IT.**
Section 3 of the reading prompt told the model that anything leaving it guessing meant refuse
everything — so one pair of rows about Southern Cross Cable capacity on pages 39–40 discarded
all 52 pages. Every gate here passed it. **Fixed:** section 3 now tests legibility only;
entries that cannot be settled are listed with their pages and the rest is read. Brief P8
rewritten. On the next load IR265 **read** — named, dated, and it surfaced **three real
contradictions in IRD's own schedule** (powder dryer buildings pages 14/46, microwave ovens
page 36, the cable entry).

⚠ **BUT IT PROPOSED NO RATES — item 4.91, and the feature still delivers no table.**
`refusedRows` was 0, so the model sent an empty rates list; why is unknown. The reading now
logs what the model OFFERED as well as what we kept, so the next load explains itself instead
of costing another paid reading. **Six readings were spent today; two were wasted because I
restarted the backend without checking it had bound to port 4000.**

**Filed today: 4.88** (a failed load can never be cleared — shut at both ends), **4.89** (a
refusal cannot say why), **4.90** (MAX_CLASSES is 250; IR265 publishes ~2,800 — the same wrong
"156" figure sits in the code comment and the Brief), **4.91**, and **4.92**.

🔴 **4.92 IS THE ONE TO READ. Mike asked for a country's whole schedule stored as a searchable
table, and ruled it LOADS AT THE GLOBAL GROUP MANAGER TIER** — one person per brand covering
every country they operate in, each table tagged by country. It is the likely cure for 4.90
and 4.91. Nothing is built; a spec comes first.

**DESKTOP:** your quiz-builder and 4.87 files were untouched. What changed under you:
`server/utils/depreciationExtract.js`, `depreciationProposals.js`, `aiLoadBudget.js` (new),
`data/ai-prompts.json` (the depreciation-read prompt), `DepreciationDocumentReview.vue`,
`restify-server.js` (two comments), and the depreciation Brief.
