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

---

## 8. Second harvest SHIPPED — the soft-hint mechanism is now LIVE (the tie-breaker bucket)

The "+3 soft hint" the harness only *modelled* is now a real engine mechanism — so the **whole tie-breaker bucket** (`client_planning`, `staff_performance`, `profitability_feasibility`, `risk_management`, `stock_purchasing`) pays off through **one wiring**, no per-tree work. And valuation moves from *stranded* (proven only in the harness) to a **real production result**.

- **Finding that drove it:** the valuation commit (`279742b`) touched zero production code; the live `resolveTemplates` had no tree boost (only `walkLogicTree` as a zero-candidate fallback). So valuation's "MET" was a what-if. Governance, by contrast, was a real *signal* harvest (asserts Pass A, engine-only).
- **What's wired:**
  - `server/utils/templateResolver.js` — new `treeHintNames` option applies a weak **+3** (`tree_hint:+3`, owned constant `TREE_HINT_BOOST`), mirroring `distinctionBoosts`, forwarded through both passes in `resolveTemplatesWithOutlier`. Too weak to overrule a strong industry (+8) or semantic match — guide, not replace.
  - `server/advisorEngine.js` — before resolving, detect the conversation's content tree(s) and **walk each to the situation-specific templates** (`walkLogicTree`; learn-mode trees excluded via `mode !== 'learn'`); pass those names in. Reuses the exact detect+walk the dead-end fallback already used — no new tree machinery.
  - `tests/unit/treeContributionHarness.test.js` — Pass B now runs through the *real* resolver option (not a hand-rolled +3), so the valuation verdict proves the **wired** engine. Design correction noted in-session: valuation's win is inherently hint-based, so (unlike governance) it must assert the hint path — but that path is now production, not a model.
- **Safety:** 487 tests pass, lint clean, `selectionHarness` cross-domain net clean. Only change is the valuation Pass-B snapshot: two more Sale-side tools (EBITDA, Business Sale Assessment 1) promoted over a buy-side tool — correct sell-direction sharpening.
- **Still open:** a live valuation-session eyeball (the mechanism is deterministic-proven; live keyword *detection* is the existing `detectLogicTrees` behaviour). The **needs-signal bucket** (`client_sales`, `systems`, `succession`, `quickfire`) is unaffected by this — each still needs a real authored signal, governance-style.

Commit: `327f592` — soft-hint mechanism + harness retarget + docs.

---

## 9. Live eyeball → bigger finding: the app is FIVE modes, and "Get the Job" IP was orphaned

A live valuation sell-session was run. Result: it classified as **`succession`**, not `valuation`, so no Sale tool surfaced. Root cause = **domain keyword gaps** (valuation scored 0: "asking price" isn't a valuation keyword; "business is worth" ≠ "business worth"; "sell the business" is succession-only). Mike's ruling: **the Advisory Distinctions layer sorts that, not keyword patching.** The soft-hint sits *downstream* of domain classification — it can't rescue a wrong lane (and correctly didn't, being a weak +3). Logged but not patched.

The session pivoted to a structural question — **are the trees hooked up across ALL modes?** Facts straightened from `design/virt-advisor-system-design.md`:

- **Five modes** (not just the client guide): Client ("I have a client situation"), Discover ("find a template"), **Learn ("learn more")**, **Plan ("plan ahead")**, **Course ("build a course")** + the invisible client→learn deep-dive (§4).
- The 14 learn-mode trees are the **backbone of Learn mode + the deep-dive** — already wired (`buildLearnReferenceText`), not a side-channel. My earlier "their own path, not my concern" was wrong.

**The real find — 8 trees mis-counted as "empty" were full of orphaned IP:**
- **A second, undocumented schema:** `type:"flat_if_then"` stores rules in a top-level `branches[]`, not `nodes[]`. **No code has ever read it** (`flat_if_then` = 0 commits in all history). The audit measured `nodes`/`templates` → read them as empty.
- They are `section:"get-the-job"` (advisor business-development) and were **never tagged `mode:'learn'`**, so the Learn consumer skipped them.
- **Origin:** commit `fbcc3ff` (2026-05-06) bulk-imported 7 trees + 7 domain-support files + PDFs; the consuming code was never written. The design doc's "Learn mode: built and working" (§13b) masked it.

**Stage 1 SHIPPED (this session, uncommitted — pending Mike's live check):**
- `formatFlatBranch` in `logicTrees.js` renders the flat schema; 7 Get-the-Job trees tagged `mode:'learn'`. All 7 now produce real Learn-mode reference.
- **Boundary fix (Mike's category-error catch):** Get-the-Job "sales/marketing/pricing" = the advisor selling THEIR services — opposite of the client meaning. New `isClientDeliveryLearnTree()` gates the client/discover **deep-dive** to client-delivery trees only (excludes `get-the-job` + `get-organised`). This also **closed a pre-existing leak** — `sales_process` + `public_speaking` were already `get-the-job`+`mode:learn` and could surface in client sessions. `get_seminar`→`get-the-job`, `org_leadership`→`get-organised` tagged.
- 505 tests pass (`learnReferenceWiring.test.js` locks it + the boundary), lint clean.

**Remaining:** Stage 2 `due_diligence` (client context-domain → harvest to signals); Stage 3 domain-support reachability; `org_leadership` true home (Firm Manager/Plan?). See ACTIONS.md.

**Why it sat ~7 weeks (post-mortem):** data shipped ahead of code (no `flat_if_then` consumer), it looked done on paper (§13b), and every audit measured the wrong field so it read as "empty" and got written off. Lesson: a data import ships with its consumer or a logged task; audits must read **every** schema in a file.

**NOTE the design doc is NOT fully accurate** and should be treated with that caution: §2.4/Principle 7 ("trees emit *signals*") is design *intent* the as-built trees don't meet (they emit template names + coaching text — the harvest closes this); §13b "Learn mode built and working" was true for the original trees but masked the Get-the-Job gap. **(Both now corrected in the design doc, 2026-06-23 — §2.4 carries an "as-built" note, §13b a correction note.)**

---

## 10. Learn-mode "wrong section" handling — reverse of the invisible swap (SHIPPED)

Live-testing the Get-the-Job wiring surfaced a separate, pre-existing gap: an advisor picked **"I'm interested in learning more"** but described a **live client situation** (cafe owner wants to sell, needs a valuation). The system stayed in Learn-mode framing and never flagged the mismatch — a thinner answer than the client diagnosis would give. Domain root-cause (valuation→succession misclass) is **Advisory Distinctions' job, not keyword patching** (Mike).

**Mike's fix direction (the reverse of the §4 client→learn swap):** don't bounce them to the client tool / make them restart and lose context. Recognise it, state it transparently, and **continue in place, expanding into the how-to**.

**Shipped (prompt-level, the right home for AI behaviour/copy):** new rule in `data/prompts/learn.txt` — when the advisor describes a live client situation, the AI gives the right resources, adds a confirmed transparent statement ("…this sounds like a live client situation rather than a skill you're developing… you don't need to switch or start over; I can keep helping right here. Would you like me to walk you through how to actually use these with your client?"), and on "yes" expands into step-by-step how-to coaching with full context. Also refined the conflicting `learn.txt:120` clause that used to say "direct them to the main tool" (the restart behaviour Mike rejected). Wording Mike-confirmed before writing (per `feedback_wording`). Scope = Learn mode (Discover/Plan could follow).

**Live-verified:** the cafe-sell session now leads with the statement, stays in place across turns, and on "yes" drafted a client outreach email + next steps — context preserved. All 3 templates it named are real (no fabrication; Learn mode has no ghost-name guard). Prompts are **cached at startup** → backend restart required to load prompt edits.

**Note:** prompt-level behaviour has no deterministic unit test (it's AI copy) — same as every other mode rule in `learn.txt`; verified by live session.

## Commits this session
1. `327f592` — soft-hint mechanism + harness retarget (pushed earlier).
2. (this commit) — Get-the-Job Learn wiring + `isClientDeliveryLearnTree` boundary + Learn-mode mode-mismatch rule + design-doc corrections + notes.
