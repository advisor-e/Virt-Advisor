# Stage 2 — Due Diligence harvest → DRAFT signal proposal

> **STATUS: DRAFT for Mike's confirmation. Nothing here is wired.** Pre-staged 2026-06-23 so the
> Stage-2 harvest starts from a sourced draft, not cold. Follows the **governance pattern**
> (`governance_too_early`): lift the tree's *judgment* into client-mode **signals** that surface
> the real matching templates. **Mike confirms the correct answer per row before anything is built**
> (memory `design-logic-trees-guide-not-replace`, `feedback-never-invent-firm-ip`). Detection
> patterns below are lifted from the DD tree's own gate language — not invented. Signal *names* and
> template *mappings* are candidates for Mike to confirm/correct.

## What already works (no action needed)

- `due-diligence` **is a detectable client context-domain** (`domains.json` keywords: due diligence, acquisition, acquire, merger, buying a business, purchase a business…).
- Its **domain-support reference (7.7 KB) already injects** when a DD session is detected — so the AI already has the 6-step DD framework as coaching context. ✓
- **13 real DD/acquisition templates exist** in the library (all `Specialist Tools`): Stg. 1 Due Diligence, Key Interviews, Customer Reliance, Supply Chain Review, Location Review, Porter's Revenue, Purchase Assessment Report 3, Business Purchase Assessment 1, Purchase Assessment Model 2, Stock Policies, Business Dating, Advisor Prep.

## The gap

- **Zero DD signals exist.** So in a DD client session the 13 real templates score only on the `Specialist Tools` subSection prior — the engine cannot tell *which* DD risk the advisor is describing, so it cannot surface the *right* DD tool for it.
- The **DD tree itself names no real template** — its terminal nodes point to a generic placeholder *"a due diligence checklist or report template"*. So there is **no template-name to harvest** (unlike valuation); the value is the tree's **6 risk checks**, which must become signals that surface the real templates above.

## DRAFT mapping — DD tree risk check → candidate signal → template it should surface

> Patterns lifted from the tree's gate language. **Signal names + template mappings = Mike to confirm.**

| DD tree check (source node) | Candidate signal | Detection patterns (from the tree) | Candidate template(s) to surface |
|---|---|---|---|
| Revenue concentration (`dd_concentration`) | `dd_revenue_concentration` | "single client >20% of revenue", "one customer", "client concentration", "what happens if that relationship ends" | **Customer Reliance** |
| Human capital / key person (`dd_human`) | `dd_key_person` | "key person dependency", "tied to a single key person", "owner/seller leaving", "relationships tied to one person" | **Key Interviews** |
| Legal / contract risk (`dd_legal`) | `dd_contract_risk` | "Change of Control", "major long-term supplier/customer contracts", "contracts survive a change of ownership" | **Supply Chain Review** *(confirm)* |
| Quality of Earnings (`dd_financial`) | `dd_earnings_quality` | "add-backs", "owner perks", "one-time expenses", "is the profit real/recurring", "QoE" | *(confirm — Purchase Assessment? Stg. 1 DD?)* |
| Working capital (`dd_working_capital`) | `dd_working_capital_risk` | "AR aging 90+ days", "clients slow to pay", "working capital funding gap" | *(confirm — Working Capital Cycle is a learn tree, not a do-the-job template)* |
| Tech stack (`dd_tech`) | `dd_tech_debt` | "legacy software", "paper-based processes", "systems incompatible", "tech debt" | *(confirm — is there a real template? maybe none)* |
| Entry mode (`dd_preassess`) | *(disambiguation, not a signal?)* | buyer full DD vs **quick red-flag screen** vs **seller preparing for incoming DD** | Stg. 1 Due Diligence / Purchase Assessment tools |

## Open questions for Mike (the confirm/correct pass)

1. **Which of the 6 checks are worth harvesting?** Governance shipped one signal (Option A) first — start with the strongest 1–2 (revenue-concentration → Customer Reliance and key-person → Key Interviews look cleanest), or do all six?
2. **Confirm each template mapping** — especially the three marked *(confirm)*; some checks may have no matching real template (then it stays AI-coaching-only via domain-support).
3. **Entry mode** — should "quick red-flag screen" vs "full buyer DD" vs "seller prep" be a disambiguation question or a signal? It changes depth, not just which tool.
4. **Is the domain-support already enough?** DD is a context domain and the 6-step framework already injects as reference. The signals add *template-scoring precision* (surfacing Customer Reliance when concentration is described). Confirm that precision is wanted, vs. leaving DD as coaching-only.

## Method when confirmed (same as governance)

1. Add confirmed signal(s) to `signal-dictionary.json` (patterns scoped to `due-diligence`).
2. Give the target template(s) a `reviewed_signal_map` entry in `content-summaries.json`; rebuild `semantic-profiles.json`.
3. Add `PURPOSE_FALLBACK_KEYWORDS` entries to keep the dictionary↔resolver invariant.
4. Add a `treeContributionHarness` scenario + Mike-confirmed verdict; run `selectionHarness` for regressions.
