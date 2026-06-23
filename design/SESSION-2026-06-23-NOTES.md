# Session Notes — 2026-06-23

**Theme:** The 28 dormant logic trees — measure their worth, and start harvesting their judgment into the engine.

Branch: `feat/tree-contribution-harness` (pushed; NOT merged to `master`).

---

## 1. The question

"Tell me about the 28 dormant trees" → are they worth keeping/wiring, and how?

## 2. What we established (with evidence, not opinion)

- **The trees moved from "fully parked" to "fallback-only."** The 28 non-learn trees are now a rarely-hit fallback in the recommendation path (`walkLogicTree`, used only when the deterministic resolver returns 0 candidates). 5 of them are empty `get_*` shells; 2 are hollow.
- **Design principle LOCKED (Mike):** logic trees **guide the AI's understanding, they don't replace it.** Template names age fast; the reasoning / process-of-elimination doesn't. The named templates are a **soft hint** (weak prior), never an override. Matches system-design Principle 7. Memory: `design-logic-trees-guide-not-replace`.
- **The trees and the signal engine are strong in OPPOSITE places.** The signal dictionary has real coverage in profit/sales/cashflow/staff; it is near-blind in the specialist domains (valuation 0 signals, risk 0, due-diligence 0, governance 1). The trees are richest exactly there. So in half the domains the trees are the only structured diagnosis the system has.

## 3. The measurement harness

`tests/unit/treeContributionHarness.test.js` — drives the REAL resolver (deterministic, no AI), two passes:
- **Pass A** — engine today (signals only).
- **Pass B** — tree-assisted (a soft `+3` boost on the templates the tree names; models "the names give SOME indication").

Snapshot net + Mike-confirmed VERDICT assertions (nothing self-grades — Mike states the correct answer).

**Proven:**
- **Valuation** — the engine is blind to sell-vs-buy (ties all specialist tools, even leads with the *purchase* side). The tree's soft hint breaks the tie toward the **Sale** tools. Verdict MET (live).
- **Governance** — the soft hint is NOT enough for the tree's crown jewel (the readiness gate). That judgment needs a real **signal**, not a name boost. → became the first harvest build (§5).

**Lesson:** the trees' value is the *judgment* (distinctions, gates), not the template lists. Harvest judgment into signals; names are a tie-breaker only.

## 4. Triage + name trace

- `scripts/triageTrees.js` swept all 19 content trees → needs-signal / tie-breaker / redundant / firm-facing buckets (see ACTIONS.md).
- **Name-rot hypothesis DISPROVEN by tracing before editing.** All **93** unique template names the trees reference are real, current `templates.json` titles (0 stale, 0 typos). The triage's "not in pool" was a measurement artifact (each tree scored only against its own domain's run; cross-domain tools legitimately don't surface there). The earlier "valuation EBITDA mismatch" was false — it exists, just scored low. **No `logic_trees.json` edit made.** One small real finding: 20 of 93 references point at `get-organised`/`get-the-job` templates — 15 are the firm tree `fm_coach_culture` (confirms it's a firm-surface tree).

## 5. First harvest SHIPPED — `governance_too_early` (Option A)

The governance gate ("too early for governance — fix foundational management first") is now a live signal.

- **New signal** in `signal-dictionary.json` — detection patterns lifted verbatim from the tree's gate (no clear objectives / accepts failure / hides mistakes), scoped to `governance`. Name chosen by Mike (`governance_too_early`, mirrors the tree's "Too Early For Governance").
- **People vs. Process** carries it via `reviewed_signal_map` (strength 4) in `content-summaries.json`, rebuilt into `semantic-profiles.json` (the human-approved profile channel). Diff was clean — only that one template changed.
- **Result:** with the signal active the **engine itself surfaces People vs. Process at the top** (9 vs board tools 6–7.5), no tree hint. Harness verdict flipped `.skip` → live.
- `PURPOSE_FALLBACK_KEYWORDS` entry added to keep the dictionary↔resolver invariant.
- **Option A only** (surface the foundational tool). **Option B** (also hold BACK formal governance tools when unready — the gate's fuller intent) is a deliberate later step.

**Deferred + logged:** **Productive Habits** (the gate's other tool) has NO content summary, so it can't be profiled without authoring content — which we must not fabricate (never invent firm IP). Logged in ACTIONS.md; joins once its summary exists.

**Tests:** 487 pass. One `selectionHarness` snapshot updated intentionally — People vs. Process's now-richer 3-signal profile drops it one display slot in an unrelated staff-scenario tie via the `profileRichness` tiebreak (score unchanged 22, selected set unchanged).

## 6. Commits (branch `feat/tree-contribution-harness`)

1. `279742b` — tree-contribution harness (valuation MET, governance tracked).
2. `15fb3d7` — `governance_too_early` signal (the first harvest).
3. (this notes/docs commit).

## 7. Next

- Continue the programme one tree at a time (Mike confirms the correct answer per domain): the cheap tie-breaker wins (`staff_performance`, `stock_purchasing`, `client_planning`…) and the other needs-signal trees (`client_sales`, `systems`, `succession`).
- **Governance Option B** (hold back board tools when unready) when chosen.
- **Productive Habits** content summary (Mike's team) → then wire to `governance_too_early`.
- Firm-facing trees (`fm_coach_culture`, `org_*`) → measure on the firm/learning surface, not the client engine.
- The 5 empty `get_*` shells + 2 hollow trees + `due_diligence` (reaches 0 real templates) → retire/build candidates.
