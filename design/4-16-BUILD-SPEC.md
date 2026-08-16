# 4.16 — the settled spec, for the next session to build from

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

> 🔴 **§1 AND §4 A ARE SUPERSEDED — 2026-08-16, session 65.** The "~55 are duplicates" claim was
> tested text-by-text, as §4 A itself demanded, and **it does not hold**. Nothing is retired; all 65
> branches are real, unreached content, and A and B are one job on **Domain Support** (Mike's ruling,
> same day). The evidence, the method and its limits are in
> [`DOMAIN-DIAGNOSTIC-BRANCHES.md`](DOMAIN-DIAGNOSTIC-BRANCHES.md) §1. **Read that before acting on
> anything below about A or B.**

| # | Work | Count | Page | Status |
|---|---|---|---|---|
| A | ~~Retire `diagnostic_entry` where the logic tree already covers it~~ | ~~55~~ | — | 🔴 **CANCELLED 2026-08-16 — the claim failed its own test. Merged into B.** |
| B | Every `diagnostic_entry` branch reaches the prompt, and gets a screen | **65** + 26 entry questions | **Domain Support** | ✅ **DONE 2026-08-16** |
| C | `stage_entry_question` + `flat_branches` reach the prompt | 15 | Logic Tables | ✅ **DONE 2026-08-16** (`95e96ec`) |
| D | Engagement-type authored fields reach the prompt, and get a screen | 18 | **none exists** | Real — 🔴 waits on Mike |
| E | Staircase `selectorPrompt` reaches the prompt from data, not a hardcoded string | 1 | Advisory Staircase | ✅ **DONE 2026-08-16** (`5873c06`) |
| F | The 12 method guides get a screen | 12 | Domain Support | Real |
| G | `get-team-problem`'s `if_then_logic` — check against its tree first, then treat as B or A | 6 | Logic Tables | ✅ **CLOSED 2026-08-16 — proved a true duplicate, no work needed** |

**G is the only genuine duplicate the whole sweep found.** Its six `if_then_logic` rules are the six
branches of the `get_team_problem` table — same conditions, same actions, same order, lightly
reworded. The AI already receives every one of them by that route. That it IS a duplicate, while the
65 are not, is why the check mattered rather than the intuition.

✅ **`org-capacity-planner` having no logic tree is CORRECT, and is not an item.** Ruled by Mike,
2026-08-16: *"there is no capacity planner logic — it is a single model used for firms to plan and has
a tutorial video attached."* With one model there is no competing-template decision to route, so there
is nothing for a tree to do. **Do not file this and do not build a tree for it.**

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
| `org-capacity-planner` | 3 | ✅ **not routing at all — see below** |
| `conflict` | 3 | its tree is a 6-stage delivery sequence; 0 nodes name templates |
| `forecasting` | 1 — `progression_guide` | tree is `cashflow`; no matching node |
| `data-systems` | 1 — `has_data_but_cannot_interpret` | tree is `financial_systems_review`, which builds systems rather than interprets data |
| `strategy` | 1 — `revenue_model_always_required` | a standing rule, not a branch |
| `org-board-pack` | 1 — `thought_leadership` | no matching node |

Most of these are genuine routing. They belong in the **logic tree**, as nodes, on the **Logic Tables**
page — not in a second field.

🔴 **`org-capacity-planner`'s 3 are the exception, and they are Domain Support content.** Mike ruled
there is no capacity-planner logic — one model, with a tutorial video. Read against that, the three
branches are not a choice between templates at all, they are a **sequence** across the domain's own
three materials:

> *"Run the base capacity model first… This baseline is the prerequisite for any other capacity
> planning work — scenario modelling is meaningless without an accurate starting position."*
> Then *"Once the baseline is established, build the scenario version models."* Then, only if the base
> model shows uneven load, the client trimming analysis.

Base Capacity → Scenario Versioning → Client Trimming, in that order. That answers *how do I run this,
step by step*, so it belongs with Domain Support's ordered steps — **not on Logic Tables, and not as a
tree.** It is the one place in all 65 where a `diagnostic_entry` holds sequence rather than routing,
which is worth knowing before assuming the field means the same thing everywhere.

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
