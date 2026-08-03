# Mentor AI Hub — planning stub for the master coding team

**Status: STUB — nothing is built. The Logic Lab Report design is APPROVED.**
Authored 2026-08-04 on Mike's instruction, so the master coding team can plan for this
feature.

> **THE APPROVED ARTEFACT:**
> [`mockups/mentor-logic-lab-report-mockup.html`](mockups/mentor-logic-lab-report-mockup.html)
> — approved by Mike 2026-08-04 (*"i love it, it looks great"*). Open the file; do not
> design from any summary of it (CLAUDE.md → Save the Artefact). Whoever builds it must
> put the build beside this artefact and name every difference before shipping.
>
> Three things the artefact itself declares, binding on the build:
> - **Every number and firm name in it is invented** — it shows the shape, not data.
> - **Every heading, label and sentence is placeholder wording** awaiting Mike's ruling.
>   Nothing is decided copy; wording sign-off is a separate step before build.
> - **The pushed-edit feed is section 1 and the bulk of the page** — Mike's direction,
>   grounded in [`LOGIC-LAB-ACCEPT-AND-PUSH.md`](LOGIC-LAB-ACCEPT-AND-PUSH.md): an
>   accepted idea captures what a firm was trying to achieve, which no count of
>   configuration can. Counts, usage and the per-firm sheet are supporting sections.

Companion documents:
[`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md) (the seven-level role
model and the 8+2 seam files), [`LOGIC-LAB-BUILD-VS-MOCKUP.md`](LOGIC-LAB-BUILD-VS-MOCKUP.md)
(the built Logic-Lab page), [`LOGIC-LAB-ACCEPT-AND-PUSH.md`](LOGIC-LAB-ACCEPT-AND-PUSH.md)
(the accepted-idea log this report feeds on).

---

## 1. What it is, in one paragraph

A page for the **Mentor** (level 1 of the cascade: Mentor → Global → Group → Firm →
Advisor → Business Entity). It is **an exact copy of the Firm Manager Hub as it stands
today**, with one addition: a **Logic Lab Report** tab that reads the Logic-Lab data from
*every* firm's hub — the phrases firms probe, the templates they prefer, which editable
functions get used and how often. **No client data crosses the firm boundary** — the feed
is configuration and counts only, which is what makes this a content question rather than
a privacy one. The Mentor uses the report to revise platform content and the AI engine;
those revisions then **cascade down to every firm** as updated logic tables, domain
support documents and advisory-distinction defaults.

Mike's founding instruction, verbatim, is recorded in
[`LOGIC-LAB-ACCEPT-AND-PUSH.md` §1](LOGIC-LAB-ACCEPT-AND-PUSH.md) ("The mentor page this
feeds — Mike, 2026-08-03").

## 2. The two halves

### Half A — the hub copy (mentor-scoped editing)

The same tab set as `components/FirmManagerHub.vue` today: **Domain Support · Logic
Tables · Logic-Lab · Advisory Staircase · Advisory Distinctions · Quizzes · Adviser
Network · Team Progress · Team Case Studies** (Templates & Videos exists but is hidden).

The difference is **scope, not screens**. Where a Firm Manager's save writes a
firm-layer override (`firm_framework_versions`, keyed `firm_id` + `config_key`), the
Mentor's save writes the **platform baseline** — the top of the merge chain that every
Global/Group/Firm layer inherits and may override. The cascade rule is unchanged:
influence flows down only; the firm keeps the final say on what its advisors see.

Some tabs are firm-population tabs (Team Progress, Team Case Studies, Adviser Network)
and read differently at mentor scope — the master team should plan these as **cross-firm
aggregate or per-firm-selector views**, or defer them; the mentor case-study feed
(`GET /api/mentor/cases`, double opt-in, anonymised) already exists and covers the
case-study need.

### Half B — the Logic Lab Report (the addition, and the point)

A new tab only the Mentor has. It aggregates, across all firms:

- **What firms have** — the counts `server/utils/logicLabSummary.js` already computes
  per-firm (levers, boosts, near-misses, quiz banks). It was deliberately built as pure
  functions over resolved config, stamped with a `schemaVersion`, precisely so a mentor
  route can enumerate firms and call the same functions rather than growing a second
  definition of "what a firm has." See
  [`LOGIC-LAB-BUILD-VS-MOCKUP.md`](LOGIC-LAB-BUILD-VS-MOCKUP.md) → "The mentor rollup.
  Not built."
- **What firms were trying to achieve** — the **accepted-idea log** from the Logic-Lab
  accept feature: the sentence probed, what the engine did with it, the template the
  manager expected, the change they chose. This is the strongest signal for revising
  platform defaults — *"nine firms had to attach Governance Introduction to a
  decision-quality distinction"* is a platform gap, not nine firm gaps.
- **Usage** — which editable functions get used, most-probed phrases, most-preferred
  templates.

**Privacy property (binding):** every field is configuration or a count. No client name,
no advisor name, no session narrative can enter the feed. `logicLabSummary.js` already
holds this property; the report must keep it.

## 3. Where it plugs in (the seams, all existing)

| Seam | Today | For this feature |
|---|---|---|
| `server/middleware/firmAuth.js` → `requireMentorRole` | Gates `/mentor` (case review); `AUTH.mentorRole` = `platform_admin` interim | Gates the Mentor AI Hub page and its routes. Master team points `AUTH.mentorRole` at the real upstream Mentor role — one constant, no route change |
| `config/integration.js` → `AUTH` block | Role constants | Same — add real role constants when the cascade lands |
| `server/utils/logicLabSummary.js` | Per-firm counts, `schemaVersion`-stamped, privacy-clean | The report enumerates firms and calls these same functions — **no second implementation** |
| Accepted-idea log (`LOGIC-LAB-ACCEPT-AND-PUSH.md` §2) | Logged from the first accept commit | The report's richest feed. Already privacy-clean by design |
| `server/utils/firmOverlay.js` | Firm-layer load/merge | Mentor saves write the baseline layer; storage shape is the master team's open decision (parallel tables vs polymorphic scope column — `USER-LEVEL-CASCADE-HANDOVER.md` Part 3) |
| `pages/mentor.vue` + `components/MentorReview.vue` | The existing mentor-only surface (case review) | Either the hub becomes the mentor's landing page with case review as a tab, or a sibling page — **Mike's call, not decided** |

## 4. What the master coding team must decide / provide

1. **Firm enumeration.** "Every firm" is a query this app cannot answer today — firm
   identity arrives per-request from the JWT. The cross-firm report needs an upstream
   list of firm ids (Advisor-e + SQL), scoped correctly once Global/Group tiers exist
   (a Global Manager could conceivably get the same report over their group — not asked
   for, but the shape allows it).
2. **The baseline write path.** Where a Mentor save lands (the storage-scope decision in
   `USER-LEVEL-CASCADE-HANDOVER.md` Part 3) and how it versions — the firm mechanism
   gives history + restore for free and should be mirrored, not bypassed.
3. **The real Mentor role** in the JWT, and pointing `AUTH.mentorRole` at it.
4. **Freshness.** Live aggregation across N firms on page load will not hold at scale;
   plan for a computed/cached rollup (the `schemaVersion` stamp exists so stored
   summaries from different app versions can be told apart).

## 5. Explicitly out of scope

- **No client or advisor data in the report.** Ever. The case-study path (double opt-in
  + anonymiser) is the only sanctioned upward flow of session material, and it is
  separate from this report.
- **No sideways visibility.** No firm sees another firm's configuration — the report is
  mentor-eyes-only.
- **No new editing semantics.** The hub copy edits the baseline through the same
  screens; it does not gain powers a Firm Manager lacks, other than scope.
- **All wording/labels** (tab name, page heading, report copy) are **undecided** — Mike
  rules on wording before build (CLAUDE.md).

## 6. Status

☐ **STUB ONLY.** No code exists for the Mentor AI Hub or the Logic Lab Report. The
per-firm counting (`logicLabSummary.js`) and the mentor auth gate (`requireMentorRole`)
exist and are tested; everything else is planning.
