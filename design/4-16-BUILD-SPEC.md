# 4.16 — the settled spec. Next session builds from this.

> **Two sessions went into getting this design right. Nothing here is open.** Read this file, then
> build. Do not re-derive the analysis; it is recorded in §6 so it does not have to be run again.
>
> **Item:** 4.16 — [`features/to-do.md`](features/to-do.md) §6.
> **Page purposes:** [`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md) — read this first if you are
> unsure which page a piece of content belongs on.
> **Rejected route, and why:** [`COACHING-REFERENCE-DOMAIN-ROWS.md`](COACHING-REFERENCE-DOMAIN-ROWS.md).

---

## 1. What 4.16 actually is, after the analysis

The sweep found **102 authored fields reaching no prompt**. That number stands as a *measurement* but
it is **not a work list**: about 55 of them are duplicates of content the AI already receives by
another route. The real list is below.

| # | Work | Count | Page | Status |
|---|---|---|---|---|
| A | Retire `diagnostic_entry` where the logic tree already covers it | ~55 | — | **No screen. No prompt. Delete-or-dormant.** |
| B | The branches no tree covers | ~10 | Logic Tables | Real |
| C | `stage_entry_question` + `flat_branches` reach the prompt | 15 | Logic Tables | Real |
| D | Engagement-type authored fields reach the prompt, and get a screen | 18 | **none exists** | Real |
| E | Staircase `selectorPrompt` reaches the prompt from data, not a hardcoded string | 1 | Advisory Staircase | Real |
| F | The 12 method guides get a screen | 12 | Domain Support | Real |
| G | `get-team-problem`'s `if_then_logic` — check against its tree first, then treat as B or A | 6 | Logic Tables | Check first |

**Separately found, not part of 4.16 and not a wiring fault:**
🔴 **`org-capacity-planner` has no logic tree at all.** Every other domain carrying diagnostic-entry
branches has one. This is missing routing, not missing plumbing. Raise it with Mike as its own item.

---

## 2. 🔴 The rule that decides where anything goes

**Ask what question the content answers.** Not what file it is in, and not what the page is called.

| The question | The page |
|---|---|
| *How do I run this, step by step?* | **Domain Support** |
| *Which template, in which scenario, rather than another?* | **Logic Tables** |
| *Which tool fits this client?* (flat menu, recommendation time) | **Coaching Reference** |
| *How deep is this relationship?* | **Advisory Staircase** |
| *What did the advisor just mean?* | **Advisory Distinctions** |
| *Does the adviser know this?* | **Quizzes** |
| *What kind of work is this?* | **no page — this is item D** |

Verified against the code, not the Briefs — see [`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md) §1.

---

## 3. The cascade — binding on every item above

🔴 **Ruled by Mike, 2026-08-16:** *"as this app seeks to empower educators at the global group
manager, group manager and firm manager levels also — each respective hub page needs to link to AI so
their changes work in practice so the cascade rules need apply here also."*

- **Every item builds tier-agnostic**, through the existing overlay mechanism. Nothing is written
  mentor-only unless Mike has ruled that specific thing mentor-only.
- **The reference implementation is `coachingConfig.loadResolvedCoaching`** — the only resolver in the
  codebase that asks `parentScopeOf`. Copy that shape. A second way of doing inheritance is how the
  two drift apart.
- **The two middle tiers cannot be exercised yet and that is not ours.** `roles.js` issues no
  `global_group_manager` or `group_manager`, and no firm→brand/country membership data exists, so
  `parentScopeOf` returns the platform scope and the chain stays mentor → firm. It **fails toward
  today's behaviour, never toward a guess.** Both are question 5 of
  [`MASTER-TEAM-INTEGRATION-EMAIL.md`](MASTER-TEAM-INTEGRATION-EMAIL.md). Build now; it lights up when
  they deliver.

---

## 4. Item-by-item build notes

### A · Retire the covered `diagnostic_entry` branches — ~55

**Do not build a screen for these and do not wire them to a prompt.** They are a 2-to-6 line index of
routing the logic tree already carries at higher resolution — and the tree names the actual templates
while the branch does not. Surfacing them would put two versions of the same routing in front of two
different editors.

⚠ **Confirm before deleting anything.** The §6 comparison is a reading of node *names*, not a proven
text-by-text equivalence. Per domain, put the branch text beside the tree node text and confirm, then
propose the deletion to Mike. **Deleting authored content is his call, never ours.**

### B · The ~10 branches no tree covers

| Domain | Branches | Why not covered |
|---|---|---|
| `org-capacity-planner` | 3 | no tree exists |
| `conflict` | 3 | its tree is a 6-stage delivery sequence; 0 nodes name templates |
| `forecasting` | 1 — `progression_guide` | tree is `cashflow`; no matching node |
| `data-systems` | 1 — `has_data_but_cannot_interpret` | tree is `financial_systems_review`, which builds systems rather than interprets data |
| `strategy` | 1 — `revenue_model_always_required` | a standing rule, not a branch |
| `org-board-pack` | 1 — `thought_leadership` | no matching node |

These are genuine routing. They belong in the **logic tree**, as nodes, on the **Logic Tables** page —
not in a second field. Where no tree exists (`org-capacity-planner`), that is §1's separate item.

### C · `stage_entry_question` and `flat_branches` — 15

13 `stage_entry_question` across learn trees, 2 `flat_branches` on `public_speaking`. Neither appears
anywhere in `logicTrees.js` and neither is rendered by any component. Emit them, and put them on the
Logic Tables tab beside the branch rows that tab already edits.

### D · Engagement types — 18, and the only one with no page

`data/engagement-types.json` holds 3 types × 6 authored fields — `advisorDefinition`,
`deliveryGuidance`, `driver`, `clientRequirement`, `advisorPosition`, `deliveryImperative`. **None
reach the prompt.** In their place, `advisorEngine.js` (~line 2836) emits `ENGAGEMENT_CONTEXT_E`, a
hardcoded three-line paraphrase.

⚠ **The Advisory Staircase is explicitly NOT the home for this.** `advisory-staircase.json` says so in
its own `purpose`: *"Sets the complexity ceiling ONLY — independent of engagement type."*

🔴 **This needs a page decided before it can be built.** It is the one genuinely homeless item.

### E · Staircase `selectorPrompt` — 1

Authored in `advisory-staircase.json`, and duplicated as a hardcoded string in `advisorEngine.js`
(~lines 1502 and 2165). Read it from the data so a firm's edit takes effect. The page exists.

### F · The 12 method guides — 12

`trial-fit-reference.json`, `cautious-reveal-reference.json`, `eoy-reference.json`,
`facilitation-reference.json`, `conflict-meeting-reference.json`,
`capacity-capability-opportunity-reference.json`, `heald-matrix-reference.json`,
`demings-volatility-reference.json`, `dashboard-discussions-reference.json`,
`growth-curve-reveal-reference.json`, `ratio-analysis-reference.json`,
`working-capital-cycle-reference.json`.

All read by the AI today. **None on any screen at any tier.** They answer *how do I run this session*,
which is Domain Support's question — so they are misfiled, not homeless. No new page.

---

## 5. What must NOT be done

- 🔴 **Do not author routing text for the "ten empty domains".** They are not empty. `eoy`, `profit`
  and `staff` each have a live logic tree (`eoy_meeting`, `profitability_feasibility` 27 nodes,
  `staff_performance` 24 nodes), and all seven Get-the-Job domains have one too. An earlier plan had
  us writing ten sets of advisory text that would have duplicated Mike's own work.
- 🔴 **Do not put the 65 branches on the Coaching Reference page.** That instruction was given and
  then overtaken by the evidence — see [`COACHING-REFERENCE-DOMAIN-ROWS.md`](COACHING-REFERENCE-DOMAIN-ROWS.md).
- 🔴 **Do not trust a Brief over the code.** Two sessions were spent partly because
  `design/features/` was paraphrased instead of the formatters being opened. A Brief is a claim.

---

## 6. The evidence, so nobody runs this again

**Domain Support is the step-by-step.** `formatMaterialLines()` in
[`../server/utils/domainSupport.js`](../server/utils/domainSupport.js) renders each material as
`**How to use it:**` followed by numbered steps. **187 of 194 materials carry ordered steps — 1,118
steps in total.**

**Logic Tables are the IF-THEN template selector.** Every node in all 42 trees carries `condition`,
`action`, `templates[]` and `branches[] → next_node`. Sampled verbatim from `governance`:

```
"condition": "Primary concern is leadership style or culture alignment"
"action":    "Explore the fit between leadership style and business strategy."
"templates": [ "Leadership Review" ]
```

**Coaching Reference is a flat selection menu**, not coaching. Its own code:
*"the template-selection guidance injected into the Phase 3 prompt"* and *"it is the menu the AI picks
a template FROM"* ([`../server/utils/coaching.js`](../server/utils/coaching.js) lines 4 and 176). Five
of its six fields choose a tool; only `deliveryNotes` says how to run one. **It is also the only
content page in the hub with no Brief** — nobody ever wrote down what it is for.

**The 65 vs the trees.** Every domain carrying diagnostic-entry branches was laid beside its tree.
Representative matches:

| Domain | Branch | Tree node already covering it |
|---|---|---|
| valuation | `seller_seeking_valuation` | Branch 1 — Seller: What Is My Business Worth? |
| succession | `urgent_or_unexpected_departure` | Branch 3 — Emergency Succession: Sudden Departure Plan |
| risk | `building_framework_from_scratch` | Branch 1 — Building a Risk Framework from Scratch |
| governance | `decision_quality` | Branch 3: Decision Quality & Process |
| stock-purchasing | `bulk_vs_exotic` | Stock Categorisation — Exotic vs Bulk vs Standard |
| sales-marketing | `pricing_or_margin_concern` | Branch 2: Profit Left Over / Pricing Strategy: Value Based |

The trees hold 19, 24, 27 nodes where the diagnostic entry holds 3.

⚠ **Stated honestly: this is a reading of node names, not a test.** It is sound enough to plan from
and not sound enough to delete from — hence the confirm step in §A.
