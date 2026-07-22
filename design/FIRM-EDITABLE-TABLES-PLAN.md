# Firm-editable Logic Tables & Domain Support — Build Plan

**Status:** Plan agreed 2026-07-23 (Mike). Nothing built yet — Phase 0 is the next task.
**Branch at time of writing:** `feat/firm-quiz-builder-ui` (11 ahead of `master`, 0 behind).
**Backlog entry:** `ACTIONS.md` → ★ *firm-editable logic tables*.

---

## 1. The point (Mike's words)

> So educators can have a real impact on the AI's recommendations and include their own
> material easily.

This is the firm-authoring story reaching the engine's **decision inputs** — not another
CRUD screen.

### The gap this closes

The words "logic tables" and "domain support" already name **two disconnected things**:

| | Where | Who can change it | Does the AI read it? |
|---|---|---|---|
| **PDFs** | Document Library — the `logic-tables` / `domain-support` upload categories in [`config/integration.js`](../config/integration.js) | any firm, today | **No.** Verified 2026-07-23: `driveService` is reached only by the list/upload/download/delete routes; neither `advisorEngine.js` nor `courseEngine.js` touches Drive at all. |
| **JSON** | [`data/logic_trees.json`](../data/logic_trees.json) (42 trees) + 29 `data/*-domain-support.json` files | a developer with repo access | **Yes** — this is what actually shapes recommendations. |

A firm can upload a logic table today and it changes nothing. This plan joins the two.

---

## 2. Locked decisions

Agreed with Mike 2026-07-23. These are settled; revisit only as an explicit new decision.

### 2.1 Override, with reset

A level **edits the version it inherits**. The inherited version stays underneath, and
**Reset to default** returns to it. A firm's edit affects **its own firm only** — it can
never travel up or sideways.

### 2.2 The cascade

Exactly the model already written in
[`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md) §"The cascade rule".
This feature joins it; it does not invent a second one.

```
Mentor (Mike)            — authors the baseline
  └─ Global Manager      — may override; becomes the default for everyone below
       └─ Group Manager  — may override; becomes the default for firms in that group
            └─ Firm Manager — may override; applies to THEIR FIRM ONLY
                 └─ Advisors  — see what their firm allows
```

### 2.3 "Reset to default" means **reset to what I inherit**

Not "reset to the mentor's file". Today those are the same thing, because a firm inherits
straight from the Mentor. The day a Group layer exists they differ — a firm resetting
should land on **their group's** version, not jump past it to the Mentor's. Designing it
this way now costs nothing; retrofitting it later is a rewrite.

### 2.4 Customisation sticks — upstream changes are offered, never forced (**Option A**)

Chosen by Mike 2026-07-23 over the alternative (upstream edit silently replaces the firm's).

**Scenario.** The Mentor wrote the Profit domain-support table. Firm A's manager edited it.
Three weeks later Firm A's Group Manager edits that same table.

**What happens:** Firm A's advisors **carry on seeing Firm A's version**. The firm manager
sees a badge on that table — *"Your group updated this"* — opens a side-by-side comparison,
and chooses **Adopt the group's version** or **Keep mine**. Nothing changes for their
advisors until the firm decides.

**Why:**
- It matches the locked Advisory Distinctions rule, *"firm customisation wins and sticks"*
  ([`DISTINCTIONS-CASCADE-PLAN.md`](DISTINCTIONS-CASCADE-PLAN.md) §1) — so a firm manager
  learns **one** behaviour across the app, not two contradictory ones.
- It honours the principle that the firm is closest to the advisor and client: content
  must never change under their advisors without the firm choosing it.
- The compare-and-choose screen already exists and is tested (Distinctions Stage E, built
  2026-06-29), so this is largely reuse.

**The honest cost:** a firm that customises and then ignores the badge drifts from its
group's thinking indefinitely. Distinctions already answers this with the *"N updates since
your last visit"* banner — reuse it here.

### 2.5 Ride `firmOverlay`; build no parallel cascade

Global and Group **do not exist in this app yet** (verified 2026-07-23):
[`firmOverlay.js`](../server/utils/firmOverlay.js) loads by firm only,
`firm_framework_versions` is keyed `(firm_id, config_key)`, and `requireManagerRole` knows
two roles. How those tiers get stored is explicitly *the one open decision the master team
must make* ([handover Part 3](USER-LEVEL-CASCADE-HANDOVER.md)) and is still open.

So: **build the firm layer through `firmOverlay`** — seam file #3 on the master team's own
list of eight. When they add Global and Group, this feature inherits the cascade with no
rework. Building our own cascade would be building the thing they are about to build,
differently, and it would have to be torn out.

---

## 3. Phase 0 — Firm-aware content loading ⭐ the gate

Nothing else ships until this is right. It is the only part with a security dimension.

**The problem.** [`domainSupport.js`](../server/utils/domainSupport.js) and
[`logicTrees.js`](../server/utils/logicTrees.js) read from disk into a **process-wide cache
with no firm dimension**. Made firm-aware naively, firm A's edits would be served to firm B.

**The approach.** Keep caching the platform base (it is static). Load the firm overlay
**per request** — one DB read, exactly as the engine already does three times over for
templates, the staircase and distinctions — and merge. No new cache: nothing to leak, and
nothing to grow unbounded in a long-lived Restify process.

**Call sites to thread `firmId` through** (`firmId` is already in scope at every one):

- Domain support — [`advisorEngine.js`](../server/advisorEngine.js) L1865, L2401, L2737;
  plus `detectDomainForSession` / `formatDomainContextForSession` /
  `formatDomainSummaryForDesign` / `detectDomainsForDesign` in
  [`courseEngine.js`](../server/courseEngine.js).
- Logic trees — `advisorEngine.js` L465, L2195, L2323, L2728–2747.

**Acceptance:**
1. A test proves a firm B session **never** contains firm A's override. This is the
   security test and it is not optional.
2. Existing suite green; no behaviour change for a firm with no override.

**A side effect to be deliberate about.** `trigger_keywords` (domain support) and
`entry_triggers` (trees) drive **detection**. A firm editing those changes which domain or
tree fires for their advisors. That is the feature working as intended — but it must be
measurable, so Phase 0 ends by running the [Scenario Lab](../scripts/scenario-lab.js) with
an override in place and recording the delta.

---

## 4. Phase 1 — Document Library brought into line

Pure frontend, no engine risk, and it produces the shared rail Phases 2 and 3 both consume.

- Re-skin from its current `b-menu` + two plain `b-table`s
  ([`FirmManagerHub.vue`](../components/FirmManagerHub.vue) L17–79) to the Quizzes
  rail → panel pattern.
- Reuse `blockTone()` / `BAND_TEXT` from [`brandTokens.js`](../utils/brandTokens.js) —
  colours are already owner-ruled (2026-07-22) and WCAG-measured. Nothing to decide.
- **Fixes the stuck-open rail bug here, once, in the shared component:** a three-state open
  flag (unset / opened / closed) so an explicit close beats the auto-expand — plus the
  missing "a sub-section can be closed again" test. (ACTIONS: *quiz-rail-stuck-open*.)
- **Forces the icon-font decision** — `b-icon` renders nothing app-wide, and this screen's
  Upload / Download / Remove buttons are affected today. (ACTIONS: *no-icon-font*.)
- The library keeps its Drive-backed PDF function and gains a clearer role: **the source
  documents behind the tables**.

---

## 5. Phase 2 — Domain Support editable

The bigger win for the lower risk: flat-ish data, and the place an educator's material most
directly reaches the AI.

**Rail — two groups, never merged.** 29 support files break down as **22 registered
advisory domains** (matching [`data/domains.json`](../data/domains.json)) and **7 `get-*`
files** (marketing, positioning, pricing-proposals, sales, sales-tracker, seminar,
team-problem). The GET material is advisor-facing *selling* content, not client-work
content; mixing them in one list would confuse two different audiences. See memory
`feedback_get_vs_client_logic`.

**Panel.** Overview, each support tool, advisor guidance — each editable, each showing a
**Platform / Your firm** origin tag exactly as the Quizzes panel does.

**Storage.** A new `config_key` via `firmOverlay`, holding a **sparse override** — only the
fields the firm changed. This is what makes §2.4's compare screen possible: drift is
detected per field, so the firm is asked about the one paragraph that changed rather than
the whole document.

**Security (non-negotiable).** Firm-authored text now reaches an AI prompt. It gets the same
`origin`-tagged delimiter fencing the quiz banks got (CB-31 Phase 2), per CLAUDE.md's rule
that user input in prompts is treated as hostile and never concatenated raw.

---

## 6. Phase 3 — Logic Tables editable

Hardest by a distance, and deliberately last: 42 trees of branching nodes carrying
conditions, questions and guidance notes.

Planned in detail only **after** the overlay path is proven twice. One scope question is
flagged now and decided then, with real usage behind us: **can a firm edit tree structure,
or only the guidance and triggers within it?**

---

## 7. Cross-cutting

- **Version history + restore** come free per `config_key` — no new schema.
- **MySQL for Firm Manager is still not provisioned**, so this runs on the dev-file fallback
  like every other Firm Manager feature until it is.
- **Tests:** routes ≥ 90%, validation 100% (valid / missing fields / wrong types /
  not-owned-by-firm / dev-fallback), plus the Phase 0 cross-firm leak test.
- **i18n:** all new copy through `$t()` into `locales/en.json`. No hardcoded English —
  there is an open P1 i18n sweep and this must not add to it.
- **Wording:** every button and label confirmed with Mike before it is written into code.

## 8. What can be copied rather than built

| What | From | Reuse |
|---|---|---|
| Rail → panel layout, search, "show me the gaps" switch, drop-tab accordion, CSS chevron, version-history box, `api()` helper | [`FirmQuizzes.vue`](../components/firm/FirmQuizzes.vue) | near-wholesale |
| Section colours, tints, text-on-band | [`brandTokens.js`](../utils/brandTokens.js) | direct |
| Overlay validate + merge + `origin` tagging | `server/utils/firmQuizzes.js` | same shape, new key |
| Load/save + dev-file fallback | [`firmManager.js`](../server/routes/firmManager.js) L1540–1607 | copy per key |
| "Upstream updated this" compare → Adopt / Keep mine | Distinctions Stage E, `FirmManagerHub.vue` | direct |
| Version history + restore | `firmOverlay` via `configKey` | free |

## 9. Open items (honest)

- The **7 GET files** have no registered domain in `domains.json`. The rail can group them,
  but whether they should also be *registered* is a separate question, not investigated.
- Phase 3 editability scope (§6).
