# Virt Advisor — Engine Defects: Analysis, Fixes, and the Client Knowledge Base

**Date:** 14 July 2026 (status updated end of day)
**Raised by:** Mike Barnes (product owner)
**Status:** ⚠️ **SUPERSEDED IN PART — READ THE STATUS UPDATE BELOW FIRST.** The morning
version of this document proposed patches for your review. Since then, with the product
owner's per-change approval throughout, **everything described here has been BUILT, TESTED
and COMMITTED** on branch **`feat/client-knowledge-base`** — the code you receive is working
and benchmarked, not a proposal. The original analysis is preserved below because the
evidence and reasoning still stand; where it says "no code has been changed", that was true
this morning and is no longer.

---

## STATUS UPDATE — end of day, 14 July 2026

### The branch: `feat/client-knowledge-base` (off `master`), 12 commits

| Commit | What it is |
|---|---|
| `135de20` | R5 Stage 1 — client register + case→client link (data layer + **the migration file for you to run**) |
| `c821ce8` | R5 Stage 2 — `/api/clients` routes (list, create with "did you mean…?", rename) |
| `b384262` | R5 Stage 3 — "Who is this session for?" intake step (approved copy verbatim) |
| `b0769c3` | R5 Stage 4 — the engine reads the client's history back (fenced, PII-safe, traced) |
| `4c9330f` | R5 Stage 5 — scoring consumes history (Option A hold-back: discouraged, never banned, always visible) |
| `bcde179` | R5 Stage 5b — per-template outcomes (used / half-used / landed chips; server-validated) |
| `9222d99` | R5 Stage 5c — session-start catch-up card (deterministic taps, no AI parsing) |
| `fd4df72` | **Bugs 1–4 fixed** + two recurrences caught in live retesting (see below) |
| `dd5023c` | Budget notice UI (approved copy, code-authored) + approved save-prompt copy + client picker at scale |
| `2c9519c` | Capital-raising signal vocabulary (dictionary v1.5.0 + profile keywords) |
| `232aae4` | Scenario Lab re-baselined — **no regressions** (100% content-driven held; distress precision 75→80%) |
| `68eb5fe` | Observation-intake fabrication fixed (system-only AI call → user-turn anchor + role guard) |

### Verification

- Test suite **647 → 745**, all passing at every commit (pre-commit gate: lint + full suite + audit).
- `nuxt build` green at every frontend change; ESLint zero errors throughout.
- **Scenario Lab** (the project's 51-case cross-domain bench) re-run in AI mode against the
  2026-06-25 baseline: no regressions; ~8 cases changed their top pick and in every one the
  old winner had been riding a FALSE industry boost (the bench's own industries — "a services
  business", "a professional firm" — were leaking descriptor words into industry matching).
- All of it live-tested by the product owner in the test environment during the day; his
  retests personally caught two recurrences that are now fixed and test-locked.

### Two recurrences the live retests exposed (fixed in `fd4df72`)

1. **"6 or 7 meetings" was silently clamped** to 6 with no message — the in-range/stray-figure
   guard swallowed a genuine hedged upper bound. Now: a plausible above-ceiling hedge top
   (≤ 2×MEETING_MAX) is honoured as the STATED count and the cap message fires; implausible
   figures ("they've got 40 staff") are still never promoted.
2. **"car sales a car yard" made "sales" the client's industry** and title-boosted six
   sales-titled templates over a raising-capital engagement — Bug 1's class, one list short.
   `INDUSTRY_STOPWORDS` (commerce-generic words, industry matcher only) closes it; genuine
   industry words (scaffolding, building, financial) still match.

### A third defect found and fixed the same day (`68eb5fe`)

The observation-intake sometimes had the AI **write the advisor's observation itself**,
first-person, naming the session's real templates — a "never invent" breach. Root cause: the
intake's opening AI call was SYSTEM-ONLY (no user message), and the model intermittently
role-collapsed and answered its own questionnaire. Fixed with a user-turn anchor + an
ask-never-answer role guard; a test makes any system-only intake call a permanent failure.

### What remains for the master team

1. **Run the migration** — `config/db-migration-client-knowledge-base.sql` (one file:
   `va_clients` + `client_id` + `template_outcomes`). Never executed by the dev environment;
   dev-tested via the JSON fallback. **Do not back-fill `client_id` from titles** (§5e).
2. **Correct `design/virt-advisor-system-design.md:271`** — it still asserts "Capped at 3
   total"; that line must go or the cap will be reborn from the spec.
3. **Record the mentor no-cascade ruling** (§5c) in the registry/system design so nobody
   "fixes" it as a privacy leak.
4. **The capital-raising content gap — a decision, not code.** The engine now correctly
   routes and HEARS capital-raising language (dictionary v1.5.0; the product owner's live
   sentences extract, verified verbatim). But after scanning every template's content with
   the approved vocabulary, exactly ONE template carries the signal (EBITDA, weight 1). The
   library has no genuine capital-raising tools; 153 templates (incl. Loan Estimator) also
   have no content summaries at all, so the profiler cannot see them. Either new content
   upstream in Advisor-e, or summaries for the finance-adjacent tools — the engine cannot
   recommend what does not exist, and (per the standing principle below) should say so
   rather than improvise.
5. **Known nuance for future benchmarking:** the AI distinction layer's boost values wobble
   between identical runs (+10 vs +5) — model non-determinism, worth knowing when reading
   Scenario Lab diffs.

*The original morning analysis follows — evidence and reasoning unchanged; its inline
patches are superseded by the commits above.*

---

## Summary

An advisor ran a session for a **scaffolding client in financial distress** — they had spent working capital on tools and equipment to scale, the market growth did not arrive, and the business is now top-heavy on fixed costs and debt servicing. The advisor committed to **3–4 meetings at 60 minutes** and described the domain accurately.

They received **two** template recommendations. One was a **Business Insurance Model** — irrelevant to a business struggling with a fixed-cost base. The template that actually addressed the problem, **Working Capital Cycle**, was excluded.

Four independent defects combined to produce this outcome. Three are bugs; the fourth is a rule in the code that the product owner did not authorise.

**The common thread, and the reason we consider this urgent: every one of these defects quietly gives the advisor LESS than they asked for, and none of them raise a flag.** The advisor has no way to know anything was discarded.

| # | Defect | Effect in this session |
|---|---|---|
| 1 | Industry keywords are not stop-word filtered | "business" treated as the client's industry → insurance template displaced the right one by 1 point |
| 2 | Duplicate template title consumes a meeting slot | 3 slots → 2 cards; the third was silently lost |
| 3 | Meeting count above 6 is discarded and read as "no answer" | "12 meetings" would yield **1** template — fewer than saying "two" |
| 4 | Hard cap of 3 templates (unauthorised) | The advisor's stated meeting count could not be honoured above 3 |

Affected files: `server/utils/templateResolver.js`, `server/advisorEngine.js`.

**Plus one feature request — Recommendation 5**, which is *not* a bug and is scoped separately: closing the case-study feedback loop, so that what happened in the last engagement informs the next one. It is included here because the fix to Bug 3 makes a promise to the advisor ("come back and tell me how it went") that the system cannot currently keep.

### The product owner's ruling on the meeting cap (14 July 2026)

The cap **stays at six meetings** — but for a stated reason, and it must now say so out loud. A recommendation is a set of specific templates for the specific issues raised in this session; it is **not** a long-term annual meeting plan. Beyond six meetings the advisor should return with the client's real progress and re-plan from there.

**The cap was never the defect. The silence was.** Every fix in this document follows from that distinction.

---

## Bug 1 — The client's industry is not stop-word filtered

### Symptom

The advisor entered the industry as **"Vanoss scaffolding business"**. The word **"business"** was then treated as the client's industry. Every template with "business" in its title or tags received an industry-relevance boost it had not earned.

From the decision trace the advisor was shown:

| Template | Score | |
|---|---|---|
| Business Insurance Model | **28** | won a display slot |
| Working Capital Cycle | **27** | *"matches the area"* — excluded |

**Business Insurance Model** took `industry:title_match` (**+8**) purely because the word *Business* appears in its title. It then beat **Working Capital Cycle** — the only template the engine itself flagged as matching the problem area — by a single point. Remove the false boost and the ranking inverts.

(The same fault gave **Quick Fire Diagnosis** a spurious `industry:tag_match` (+4), because its tags include "Business distress vs" and "Business model vs".)

### Cause

`server/utils/templateResolver.js`, ~line 199. Industry keywords are filtered on length alone:

```js
const _industryKeywords = industry
  ? industry.toLowerCase().split(/[\s—\-,/&]+/).filter(w => w.length > 3)
  : []
```

`"Vanoss scaffolding business"` → `["vanoss", "scaffolding", "business"]`.

**The codebase already contains the remedy.** `server/utils/stop-words.js` holds a shared stop-word set that includes `'business'`, and both `templates.js` (search) and `summaries.js` already filter against it. The resolver's industry matcher is the one place that was never wired to it.

### Proposed fix

Add the existing shared import at the top of `templateResolver.js`:

```js
const { STOP_WORDS } = require('./stop-words')
```

Then replace the keyword extraction:

```js
// Reuse the SHARED stop-word set (templates.js / summaries.js already do). Without
// it, generic words in a free-text industry answer are treated as the industry
// itself: "Vanoss scaffolding business" made "business" an industry keyword, and
// every template with "business" in its title/tags took a false +8 / +4 boost.
// Live session 2026-07-14: "Business Insurance Model" (28) displaced
// "Working Capital Cycle" (27) on that boost alone.
const _industryKeywords = industry
  ? industry.toLowerCase()
    .split(/[\s—\-,/&]+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  : []
```

### Risk

**Low.** It narrows industry matching only, and only for words the codebase already classifies as noise (`business`, `client`, `clients`, `advisor`, `template`). Genuine industry words — "scaffolding", "hospitality", "cafe" — are unaffected. No new list to maintain.

---

## Bug 2 — A duplicate template title silently consumes a meeting slot

### Symptom

The advisor's three template slots were filled with:

1. Quick Fire Diagnosis (39)
2. **Quick Fire Diagnosis (35)** — the same template again
3. Business Insurance Model (28)

The visible duplicate was removed later in the pipeline, but **its slot was not given back**. The advisor received 2 cards against a budget of 3. Working Capital Cycle, next in rank, never took the vacated slot.

### Cause

`server/utils/templateResolver.js`, ~line 527. The budget is taken off the ranked list with no distinctness check:

```js
const budget = (typeof templateBudget === 'number' && templateBudget >= 0) ? templateBudget : 1
const selected = ranked.slice(0, budget)
```

De-duplication happens **later**, in `buildDisplaySet` (~line 614), which drops the repeated title but cannot restore the slot. **The budget is spent before the dedup runs.**

### Note for your side — the source data

`data/templates.json` in the repo contains only **one** Quick Fire Diagnosis record, so the duplicate appears to originate in the **live firm's template export**. That is worth investigating separately.

However, we recommend the fix below regardless, because it makes the engine safe against *any* duplicate title in *any* firm's library — rather than chasing one bad record and leaving the trap armed for the next one.

### Proposed fix

```js
const budget = (typeof templateBudget === 'number' && templateBudget >= 0) ? templateBudget : 1

// Budget slots must be spent on DISTINCT templates. A library can hold two records
// with the same title (different page IDs) — ranked.slice() lets both take a slot,
// and buildDisplaySet's title-dedup then drops the second WITHOUT returning its
// slot, so the advisor silently gets fewer cards than their meetings allow.
// Live session 2026-07-14: budget 3 → only 2 cards; "Quick Fire Diagnosis" took two
// slots and "Working Capital Cycle" never surfaced. Dedup BEFORE the slice so every
// slot yields a distinct card.
const _seenTitles = new Set()
const _distinctRanked = []
for (const t of ranked) {
  const key = (t.title || '').trim().toLowerCase()
  if (key && _seenTitles.has(key)) { continue }
  if (key) { _seenTitles.add(key) }
  _distinctRanked.push(t)
}
const selected = _distinctRanked.slice(0, budget)
```

Two related suggestions:

- The **diverse-candidate pool** immediately below this should also iterate `_distinctRanked` rather than `ranked` — duplicates otherwise consume candidate slots handed to the AI.
- We suggest **leaving `scoringLog` reading from `ranked`** (unchanged), so the duplicate stays visible in the decision trace. It is a genuine data-quality signal a firm manager should see, not something to hide.

### Risk

**Low.** Behaviour is identical for any library with no duplicate titles. The existing dedup in `buildDisplaySet` remains as a harmless second guard.

---

## Bug 3 — A meeting count above the ceiling is discarded and read as "no answer"

### Symptom

An advisor who commits to **12 meetings** receives **1 template** — fewer than if they had said "two". Verified by running the parser directly:

| Advisor answer | Parsed as | Templates |
|---|---|---|
| "3 to 4 meetings" | 4 | 3 |
| "6 meetings" | 6 | 3 |
| **"12 meetings"** | **null** | **1** |
| "10 meetings" | null | 1 |
| "7 meetings" | null | 1 |
| "two" | 2 | 2 |

### Cause

`server/advisorEngine.js`, ~line 718. `parseMeetingCount` filters numbers to 1–6 and returns `null` if nothing survives:

```js
.filter(n => Number.isInteger(n) && n >= 1 && n <= 6)
if (nums.length === 0) { return null }
```

That `null` is **the same value returned when the advisor never answered the question at all.** It then reaches the budget line (~1903), where `(meetingNum || 1)` collapses a twelve-meeting engagement into a one-meeting engagement.

The AI is additionally handed a label reading *"1 meeting @ 60 mins = 1 template"*, so it writes a one-meeting plan, unaware of the advisor's actual commitment. **Nothing warns the advisor.**

The 1–6 guard itself is sound — its documented purpose is to stop a stray figure ("they've got 40 staff") being read as a meeting count. The defect is what happens when the guard rejects **every** number: a *rejected* answer becomes indistinguishable from an *absent* one.

### Proposed fix

Replace the single filter with two buckets, so in-range numbers keep priority (preserving the stray-figure guard) and an out-of-range figure is **clamped rather than thrown away**:

```js
// Meeting counts are clamped, not discarded. The range guard exists to stop a stray
// figure ("they've got 40 staff") being read as a meeting count — but when it rejects
// EVERY number, the answer becomes indistinguishable from no answer at all, and the
// budget line's (meetingNum || 1) silently collapses the engagement to ONE meeting.
// Live: "12 meetings" → 1 template, fewer than saying "two".
// In-range numbers always win (the stray-figure guard is intact); an out-of-range
// figure is used ONLY when no in-range number was given, clamped to the ceiling.
const parsed = tokens
  .map(tok => map[tok] || parseInt(tok, 10))
  .filter(n => Number.isInteger(n) && n >= 1)

const inRange = parsed.filter(n => n <= MEETING_MAX)
const aboveRange = parsed.filter(n => n > MEETING_MAX)

if (inRange.length === 0) {
  // A real commitment above the ceiling ("12 meetings"). Clamp to the ceiling
  // rather than dropping it — never silently reduce the advisor's engagement.
  return aboveRange.length > 0 ? MEETING_MAX : null
}

const hedged = /\b(to|or|maybe|possibly|perhaps|ideally|even|up\s+to)\b/.test(t)
return hedged ? Math.max(...inRange) : inRange[0]
```

`MEETING_MAX` becomes a named module-level constant, set by the product owner:

```js
// The most meetings the system will plan for in ONE engagement. Set by the product
// owner (Mike Barnes, 2026-07-14) at SIX — a deliberate product decision, not a
// technical limit: a recommendation is a set of specific templates for the specific
// issues raised today, NOT a long-term annual meeting plan. Beyond six meetings the
// right move is for the advisor to return with the client's actual progress and
// re-plan from where they really got to.
// A stated count above this is CLAMPED and EXPLAINED to the advisor (see below) —
// it is never silently discarded, which was the reported defect.
const MEETING_MAX = 6
```

### Effect (with `MEETING_MAX = 6`)

| Advisor's answer | Before | After | Advisor is told? |
|---|---|---|---|
| "12 meetings" | **1 template** (silently) | 6 — clamped | **Yes** — cap message |
| "20 meetings over the year" | **1 template** (silently) | 6 — clamped | **Yes** — cap message |
| "3 to 4 meetings" | 3 templates | 4 | No message needed |
| "3 to 4 meetings, they have 40 staff" | 3 | 4 — in-range wins, stray-figure guard intact | No message needed |
| "whatever works for them" | 1 | 1 (genuine non-answer, unchanged) | — |

The headline: **"12 meetings" no longer produces fewer templates than "two".** It produces six, and the advisor is told why it is six.

### The ceiling value — DECIDED, and it must now EXPLAIN ITSELF

The ceiling stays at **6 meetings** — but this is now an *authorised product decision with a stated rationale*, where before it was an unexplained filter that silently destroyed the advisor's answer.

**Mike Barnes, 14 July 2026:**

> A recommendation is a set of **specific templates for the specific issues raised in this session** — it is not a long-term annual meeting plan. Six meetings is the sensible planning horizon. Beyond that, the advisor should come back, tell us how the client actually responded to the first six, and re-plan from where the client really got to — not from where we guessed they would be a year out.

**This is the crucial difference from the current behaviour.** The cap is not the problem. The *silence* was the problem. An advisor who says "12 meetings" must be told that six are being planned, and why — not handed one template and left to assume the system understood them.

### Advisor-facing messages — APPROVED WORDING (do not paraphrase)

The following copy is approved by the product owner. Please implement it verbatim. If the team believes any of it needs to change, that is a conversation with Mike, not an editorial decision.

**1. Framing line — shown on EVERY recommendation:**

> These are specific templates for the issues you've described today — not a long-term meeting plan.

**2. Cap explanation — shown ONLY when the advisor's stated meeting count exceeds `MEETING_MAX`** (i.e. only when something is actually being reduced, so it never becomes noise):

> You mentioned {N} meetings — I've planned the first 6. Work through these, then come back and tell me how the client responded. We'll build the next stage from where they actually get to, rather than guessing it all now.

`{N}` is the advisor's *stated* count — the real number they gave, before clamping. This requires the parser to preserve it (see below).

**3. Case-study nudge — shown when the recommendation is delivered:**

> Save this as a case study. When you return, I can see which templates you used and how they landed — and pick up from there.

Message 3 is not a courtesy. It is the input to Recommendation 5 (the case-study feedback loop) — without a saved case, the advisor's *next* session has nothing to build on, and the promise made in message 2 cannot be kept.

### Implementation notes for these messages

**Preserve the stated count.** Message 2 needs the number the advisor actually said. `parseMeetingCount` currently returns a single clamped integer, so the original figure is lost. We suggest it return both — e.g. `{ count, stated, clamped }` — or that the caller retain the raw parse. The engine already has the raw answer in `state.advisorMeetingCount` if a lighter touch is preferred.

**Emit them deterministically — not through the AI.** These messages should be produced in **code** and rendered by the UI, not inserted into the AI prompt and left to the model to relay. Two reasons: the model will paraphrase approved copy (it has already been observed inventing advisor attributes in this same session — see Bug 1's fallout), and the engineering standard for this system is explicit that *code makes macro-decisions, AI writes copy only*. A structural statement about how much the system is planning and why is a macro-decision. We suggest they travel with the decision trace on the existing SSE stream (alongside `type: 'trace'`) as a `budgetNotice` object, and are rendered by the front end.

**The number-word map.** The parser's map stops at `six: 6`, and the token regex only recognises `one…six` plus digits. With the ceiling at 6 this is *mostly* adequate — but a spoken **"twelve meetings"** still parses to `null` and collapses to 1 template, which is the original bug in a different costume. We recommend extending the number-word map through at least twelve so that a spelled-out over-cap answer is **clamped and explained** rather than silently lost. This matters precisely because voice input is where the original café `"too"` → 2 defect came from.

### Residual risk (stated honestly)

If an advisor answers the meeting question with *only* a large unrelated figure and no meeting count ("depends on their 40 staff"), this clamps to the ceiling instead of returning `null`. We judge that acceptable — the question explicitly asks for a meeting count, and the failure mode is now "too generous" rather than "silently minimal".

The more correct long-term behaviour is to return a distinct **"unusable answer"** state and **re-prompt the advisor**. We recommend that as a follow-up. This patch is deliberately minimal and backwards-compatible.

### Tests

`tests/unit/meetingCount.test.js` — we checked: **no existing test asserts that a number above 6 returns `null`**, so this change does not break the current suite. Suggested additions:

```js
test('a count above the ceiling is CLAMPED, never discarded', () => {
  expect(parseMeetingCount('12 meetings')).toBe(6)   // was 1 — the reported bug
  expect(parseMeetingCount('10 meetings')).toBe(6)
  expect(parseMeetingCount('7 meetings')).toBe(6)
  expect(parseMeetingCount('20 meetings over the year')).toBe(6)
})

test('an in-range count still wins over a stray large figure', () => {
  expect(parseMeetingCount('3 to 4 meetings, they have 40 staff')).toBe(4)
})

test('spelled-out counts above six are not lost (voice input)', () => {
  expect(parseMeetingCount('twelve meetings')).toBe(6)  // clamped, not null
  expect(parseMeetingCount('ten meetings')).toBe(6)
})
```

The last test will **fail** against the current number-word map (which stops at `six`) — it is included deliberately, to force the map extension described above. Without it, a *spoken* "twelve meetings" still collapses to one template: the reported bug, surviving in a different costume.

**Also required:** a test asserting the advisor is actually **told** when the clamp fires. The regression we are fixing is not merely the wrong number — it is the *silence*. A fix that clamps correctly but says nothing has not fixed the reported defect.

---

## Bug 4 — The hard cap of 3 templates was never authorised

### The product owner's position

Mike's instruction was that template selection should have **consideration for cause + core + downstream**, and that the engine should be **guided by the largest number of meetings the advisor provides**. He did **not** ask for a hard stop at 3 templates.

### What we found

The cap lives in exactly **one line** of the codebase — `server/advisorEngine.js`, ~line 1902:

```js
// Template budget = meetings × templates per session, capped at 3 (Cause + Core + Downstream)
const templateBudget = Math.min((meetingNum || 1) * templatesPerSession, 3)
```

Git blame: committed **15 June 2026** (`72d9e5c`).

It is asserted in exactly **one document** — `design/virt-advisor-system-design.md`, line 271:

> | Template budget | Session length × meetings | 30 mins = 0 templates. 60/90 mins = 1. 120 mins = 2. **Capped at 3 total.** |

Git blame: **4 June 2026** (`1dba6b1`) — eleven days *before* the code.

**The justification appears nowhere else in the repository.** We grepped every file — code, design docs, specs, workshop notes — for "Cause + Core + Downstream". It occurs exactly once: in the code comment defending the cap. It is in no design document, no specification, and no recorded requirement.

The chain of custody is therefore: an unattributed line in a design doc → a hard-coded `Math.min` → a rationale written at the point of coding. **At no point does it trace back to an instruction from the product owner.**

*In fairness we cannot rule out a verbal discussion that left no artifact. What we can say is that nothing in the repository records the requirement, and the stated reason for it exists only in the comment defending it.*

### The rule that IS authorised is half-implemented

"Guided by the largest number provided" **is** in the code — in `parseMeetingCount`, which explicitly takes the upper bound of a range (~line 705):

> *"For a range ('two to three') the upper bound is taken so capacity covers all sessions."*

That is why "3 to 4 meetings" correctly parsed as **4**. But the faithfully-captured largest number is then destroyed twice on the way to the advisor: once by the `Math.min(..., 3)` cap, and once by the 1–6 filter of Bug 3. The engine reads the advisor's number correctly and then throws it away.

### Proposed fix

Remove the hard ceiling. The budget becomes what the design intended — *meetings × templates-per-session* — with cause/core/downstream as a **shaping guide for the AI narrative**, not a numeric ceiling in code.

```js
// Template budget = meetings × templates per session.
// NO hard ceiling: the budget follows the engagement the advisor actually committed
// to (product owner's rule — "guided by the largest number provided"). The former
// Math.min(..., 3) capped every engagement at 3 templates regardless of the meetings
// booked; it was never an authorised requirement (see 2026-07-14 review) and it
// silently discarded the advisor's stated capacity.
// "Cause + Core + Downstream" remains the intended SHAPE of a recommendation set —
// it is guidance for the narrative, not a numeric limit on the count.
const templateBudget = (meetingNum || 1) * templatesPerSession
const tier1Capacity = templateBudget
```

### Consequences the team must weigh (we are flagging these deliberately, not hiding them)

1. **Narrative length and latency.** The AI writes a full recommendation block per template. A 10-template budget produces a very long Phase-3 stream. The engineering standard requires page-render backend responses within 2000 ms. **This needs measuring before release.** If it breaches, the correct answer is a job-ID + poll pattern, **not** a silent cap.

2. **Supply may be lower than budget.** `resolveTemplates` takes `ranked.slice(0, budget)`; if only 5 templates score above zero, the advisor gets 5, not 10. That is honest and correct — but see point 3.

3. **The advisor must be TOLD when they get fewer than they asked for.** This is the whole theme of this report. If the budget is 10 and only 5 templates genuinely fit, the advisor should see a clear statement to that effect — not simply five cards and no explanation. **We recommend a visible note in the recommendation whenever `selected.length < templateBudget`, stating how many were requested, how many genuinely matched, and why.** Silence is what caused this entire investigation.

4. **`MEETING_MAX` (Bug 3) becomes the real ceiling — and it is a modest one.** Once the `Math.min(..., 3)` is gone, the meeting-count ceiling is the only thing bounding the budget. With `MEETING_MAX = 6` (the product owner's decision) the arithmetic is:

   | Session length | Templates/session | Max budget at 6 meetings |
   |---|---|---|
   | 30 mins | 0 | 0 |
   | 60 / 90 mins | 1 | **6** |
   | 120 mins | 2 | **12** |

   So the realistic worst case is **6 templates** (and 12 only for an advisor booking six two-hour sessions). This is a meaningful increase on the current maximum of 3 — an advisor committing six meetings now receives six templates rather than three — but it is nowhere near a runaway. **Latency should still be measured** (consequence 1), but the risk is materially smaller than an uncapped budget would have been.

   **A note the team should hold on to:** if a maximum ever does need to be imposed for technical reasons, it must be **visible** — tell the advisor how many meetings they committed to, how many templates matched, and why the remainder are not shown. A silent cap is precisely the defect this whole report is about. Do not reintroduce one.

5. **The design document must be corrected.** `design/virt-advisor-system-design.md:271` still asserts "Capped at 3 total." If the cap is removed, that line is now wrong and must be updated in the same change — otherwise the next developer will re-introduce it from the spec.

### Risk

**Medium — the highest of the four.** This changes the volume of output the system produces, and it interacts with AI latency and cost. We recommend it is merged with Bugs 1–3 but measured carefully (see verification below).

---

## Recommendation 5 — Close the case-study feedback loop (NEW FEATURE, not a bug fix)

**Please read this section differently from the four above.** Bugs 1–4 are defects with patches attached. This is a **feature request** with a design. We are labelling it explicitly so it is scoped and estimated honestly, rather than mistaken for a small patch bundled in with the fixes.

### Why it belongs in this document

The cap message approved above makes a **promise** to the advisor:

> *"Work through these, then come back and tell me how the client responded. We'll build the next stage from where they actually get to."*

**The system currently cannot keep that promise.** If the advisor returns, the engine has no memory of the previous engagement whatsoever. It will start from a blank sheet and may well recommend the same templates over again. Shipping the cap message without this feature would mean the system says something untrue to the advisor — which is precisely the class of failure this report exists to eliminate.

### What we found (verified in code)

The good news is substantial. **`server/advisorEngine.js` contains zero references to case studies** — but the data the loop needs is *already being captured and stored*.

A saved case (`caseStore.js`, `rowToCase`) already holds:

```js
templates: parseJSON(row.templates, []),   // which templates were recommended
domain, staircaseStep, growthStage,        // the client's position at the time
decisionTrace: parseJSON(...),             // WHY the engine chose them
review: {
  wentWell: row.review_went_well,          // what worked
  wentLess: row.review_went_less,          // what did not
  changesRecommended: row.review_changes_recommended
}
```

Every ingredient the product owner asked for — which templates were given, what went well, what went less well — **is already in the database.** The capture is built, the storage is built, the review questions are built and asked.

**Nothing ever reads any of it back into a recommendation.** `caseStore` is required by `routes/cases.js` and `routes/mentor.js` only — the review and mentor screens. As far as the recommendation engine is concerned, case studies are a **write-only archive**. The loop is open at exactly one end.

### THE BLOCKER — cases cannot currently be linked to a client

`va_case_studies` (see `caseStore.create`) stores: `id, advisor_id, firm_id, title, mode, visibility, domain, staircase_step, growth_stage, fin_mgt_theme, templates, summary, transcript, decision_trace, feedback_pending`.

**There is no client identifier.** The only thing tying a case to a client is the free-text `title`. That is not a reliable key — an advisor may title the same client's cases "Vanoss scaffolding", "Vanoss", and "Dave's scaffolding co" across three sessions.

So the question *"what did we recommend for THIS client last time, and how did it go?"* **cannot currently be answered at all.** Everything in this feature depends on solving it.

**This has now been designed with the product owner (14 July 2026). The design is below — the team does not need to solve it.**

---

### 5a. The client identifier — DESIGNED, ready to build

#### The rule: the name is the LABEL, not the KEY

The advisor is asked for the **name of the business** (or client) at the start of a session, and is told plainly that this is what builds that client's history. That much is the product owner's decision and is settled.

But the **typed name must not be the database key.** If it is, three ordinary events silently destroy a client's history:

- **Typos and variants** — "Vanoss Scaffolding", "Vanoss scaffolding Ltd", "Vanoss", "Vanos". Each creates a *brand-new client with an empty history*, and the advisor is never told why the system has forgotten them. Voice input makes this materially worse, and this codebase already has a documented voice-transcription defect in its history (the café `"too"` → 2 bug).
- **Renaming** — the client rebrands, or the advisor tidies up the spelling. Key on the name and every case that client ever had is orphaned.
- **It fails silently** — which is the exact defect class this entire report exists to eliminate.

**Therefore:**

| Concept | Implementation |
|---|---|
| **Client identity** | A stable generated ID (`client_id`, UUID — `generateId()` already exists in `caseStore.js`). The advisor never sees it. |
| **Client name** | A display label (`client_name`). Freely editable. Changing it does **not** touch history. |
| **Case → client link** | New `client_id` column on `va_case_studies`, indexed. |

#### After the first session, they PICK — they do not retype

This is the part that actually eliminates the duplicate-client problem, and it is not more work than doing it badly.

- **First time with a client:** the advisor types the business name. A new client record is created.
- **Every time after:** the advisor is shown **their existing client list** and selects. *You cannot mistype something you never retype.*
- **When typing a new name:** a fuzzy check against existing clients catches near-misses before a duplicate is created — *"Did you mean **Vanoss Scaffolding**?"*

#### Where the question goes — BEFORE the 14, not inside them

The 14 questions are **diagnostic** — they are about the client's situation. *"Who is this for?"* is **housekeeping**. Folding it into the 14 would dilute them and make the intake feel like a form again, which is precisely what the conversational-intake redesign was built to eliminate.

It sits as a short session-setup step ahead of the 14.

#### It must be skippable

An advisor doing a quick one-off must be able to decline to name the client and still get a full session. They simply get no knowledge base for it. **A hard gate on a housekeeping question would be a bad trade** — the 14 are the floor of the intake, and this is not one of them.

#### Scope: the client record is FIRM-level; the case content is NOT

A subtle but essential distinction, and getting it wrong produces either duplicate clients or a privacy breach:

- **The client list belongs to the FIRM.** Every advisor at the firm sees and selects from the same list of clients. Otherwise Advisor B — unable to see Advisor A's private cases — would create a *second* "Vanoss Scaffolding", and the firm would hold the same client twice.
- **What an advisor can READ about that client is governed by the existing visibility model** (see 5b). Sharing a client's *name* is not sharing their *case*.

---

### 5b. Access — REUSE the existing visibility model. Do not invent a new one.

**This is the most important engineering instruction in this section.** The permission model this feature needs **already exists, is already built, and is already correct.** We verified it in code.

The rule for the knowledge base is simply:

> **A client's history is built from the cases the advisor can already see.**

Reuse the `WHERE` clause that is already live in `caseStore.listForAdvisor` (line 138):

```sql
WHERE advisor_id = ? OR (firm_id = ? AND visibility = 'shared')
```

Own cases at any visibility, plus the firm's shared cases. Nothing new is required.

**What this gives the product for free, verified in code (14 July 2026):**

| Behaviour | Verified |
|---|---|
| Two states only: `private` / `shared` | `VISIBILITIES` (`caseStore.js:56`) |
| Defaults to **private** (fails safe) | `safeVisibility()` (`:73`) |
| Only the **owning advisor** can change it | `UPDATE ... WHERE id = ? AND advisor_id = ?` (`:335`) |
| The toggle is genuinely **two-way** | same statement — sets either value |
| Flipping to `shared` makes it **immediately visible** to colleagues | `listForAdvisor` (`:138`) — no copy, no export step |
| Identity comes from the verified JWT, never the request body | `routes/cases.js` — this is what closed the legacy IDOR |

**The consequence, which is exactly what the product owner wants:** a private case informs only that advisor's future sessions with the client. The moment they share it, it begins informing their colleagues' sessions with that client too. **Sharing a case IS the act of contributing to the firm's knowledge** — the AI learning from it is the natural consequence, not a separate decision or a new permission.

Note this means firm knowledge of a client is **fragmented by default** (private is the default). An advisor picking up a colleague's client may start with a blank history until that colleague shares. This is **accepted and intended** — it is the advisor's call, and the existing toggle makes correcting it a one-click conversation between colleagues.

---

### 5c. The mentor/group escalation — CONFIRMED CORRECT. DO NOT "FIX" THIS.

**⚠️ Read this before touching anything to do with mentor sharing. The current behaviour looks like a bug and is not one.**

**The behaviour, verified in code:**

- `listSharedWithMentor` selects `WHERE mentor_shared = 1` (`caseStore.js:242`) — it **never reads `visibility`**.
- Therefore, when an advisor flips a case from `shared` back to `private`, the case **disappears from colleagues' lists but the anonymised mentor copy remains in place.**
- `withdrawFromMentor` (`:394`) is scoped to the **firm** (`WHERE id = ? AND firm_id = ?`) — it is a **manager** action, not an advisor one.

**This is deliberate. The product owner's ruling (14 July 2026):**

> A case pushed up from firm manager to group manager or mentor is **anonymised**. A case shared from advisor to firm manager or firm-wide is **not**. So if an advisor pulls a case back from firm-wide to private, it does **not** need to be automatically retracted from the mentor — because what went up was anonymised. If the firm feels strongly, the manager can withdraw it, but that is a **human conversation between the advisor and the firm manager**, not an automatic cascade. **We do not want code that retracts from the mentor when an advisor changes their mind.**

**Why we are stressing this:** to an engineer or an automated security review with no context, "the advisor un-shared it but the upstream copy survives" reads as a privacy leak to be closed. **Closing it would quietly gut the mentor learning pool** — the anonymised, cross-firm evidence base that improves the platform for everyone. The two axes are independent **by design**:

| Axis | Contains | Who controls it | Cascades? |
|---|---|---|---|
| `visibility` (`private` / `shared`) | The **raw** case — real client text | The **owning advisor** | No |
| `mentor_shared` | An **anonymised** copy — no advisor identity, no raw client text (`rowToMentorCase`, `:200`) | The **firm manager** (approval) | No |

**Required action: none in code.** Required action in *documentation*: record this ruling in the registry/system design so it is never "corrected".

*(One honest note for the advisor-facing copy: un-sharing is not a recall. A colleague who has already read a case has read it. That is inherent to any sharing model, not a flaw — but it should be stated plainly wherever the toggle is described to advisors.)*

---

### 5d. Proposed engine design (once the client link exists)

### Proposed design (once the client link exists)

**Stage 1 — Retrieve.** At session start, load the advisor's prior cases for this client:

```js
// caseStore.js — new
async function listForClient (advisorId, firmId, clientRef) { ... }
```

Access must be scoped to the advisor who owns the cases (or firm-shared cases where the firm's visibility model permits). **This is a direct IDOR risk** — an advisor must never see another advisor's client history through this route. The existing ownership guards in `cases.js` are the model to follow.

**Stage 2 — Build a prior-engagement summary.** Reduce the retrieved cases to a compact structure the engine can reason about:

```js
{
  templatesDelivered: [ { title, page, deliveredAt, outcome: 'well' | 'less_well' | 'unknown' } ],
  whatWentWell:   [ '...' ],   // advisor's own words
  whatWentLess:   [ '...' ],
  changesRecommended: [ '...' ],
  lastDomain, lastStaircaseStep, lastGrowthStage,
  sessionsToDate: n
}
```

**Stage 3 — Feed it into selection.** This is the substance of the feature. We propose three distinct effects, and we want the team to challenge them:

1. **Do not re-serve what has already been delivered and worked.** A template previously given whose review says it went well should be **suppressed** from the new selection — the client has had it. (It should still be *visible* to the advisor as "already covered", not silently vanished.)

2. **A template that went badly is a signal, not a repeat.** If a template was delivered and the review says it went less well, do **not** simply re-recommend it. The correct reading is that the underlying issue is unresolved *and the chosen approach did not land*. That should raise the priority of the underlying problem while steering to a **different** tool for it. This is the subtlest part of the design and deserves the team's scrutiny.

3. **`wentLess` and `changesRecommended` are fresh problem signals.** The advisor's own words about what did not work are exactly the free-text the existing signal extraction (`problemSignals.js`) is built to read. Feed them in as inputs to the current session's signal set.

**Stage 4 — Tell the AI, and tell the advisor.** The narrative should reference the progress explicitly ("last time you ran the Quick Fire Diagnosis; you noted the client struggled with X"), so the advisor sees the system *remembering*, which is the entire point of the nudge in message 3.

**Stage 5 — Record it in the trace.** The decision trace must state which prior cases informed the recommendation. A firm manager reviewing a case needs to see that the engine leaned on history, and which history. This is the same auditability standard the existing trace already meets.

### Privacy and safety — must be designed in, not bolted on

- **Review text is the advisor's words about a real client.** It is PII-bearing free text. The house rule that internal DB IDs and PII are stripped before anything reaches the LLM applies here in full.
- **Prior-case text is untrusted input to a prompt.** It must be wrapped in explicit delimiters on the backend (the existing `fenceUntrusted` treatment), never concatenated raw into a prompt string.
- **Cross-advisor leakage is the primary risk.** Scope every read by owner. A client history surfacing in the wrong advisor's session would be a serious breach, and it is exactly the failure mode the previous `cases.js` IDOR fix addressed.

### 5e. Schema — the concrete change

A `va_clients` table (firm-scoped), and one indexed column on the existing case table:

```sql
-- The client record. Firm-scoped: every advisor at the firm selects from ONE list,
-- so the same client is never created twice. The NAME is a label, not a key —
-- editing it must never orphan a case.
CREATE TABLE va_clients (
  id          VARCHAR(64)  NOT NULL,          -- generated UUID; the advisor never sees it
  firm_id     VARCHAR(64)  NOT NULL,
  name        VARCHAR(255) NOT NULL,          -- display label; freely editable
  name_key    VARCHAR(255) NOT NULL,          -- normalised (lowercased, punctuation/spacing
                                              -- stripped) — used ONLY for duplicate detection
                                              -- and the "did you mean…?" check, never as the key
  created_by  VARCHAR(64)  NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_firm_namekey (firm_id, name_key)    -- fuzzy/duplicate lookup within the firm
);

-- Link the case to the client. NULLable: naming a client is skippable (see 5a),
-- and every existing case predates this feature.
ALTER TABLE va_case_studies
  ADD COLUMN client_id VARCHAR(64) NULL,
  ADD KEY idx_client (client_id);
```

**On existing cases:** `client_id` is `NULL` for every case saved before this ships. They simply do not contribute to any client's history. **Do not attempt to back-fill by matching on the free-text `title`** — that is precisely the unreliable key this design exists to avoid, and a wrong match would attach one client's history to another client. Leave them unlinked; the knowledge base builds from here forward.

**New `caseStore` query** — note it reuses the existing visibility boundary verbatim:

```js
/**
 * The cases that inform THIS client's knowledge base, for THIS advisor.
 * Access boundary is identical to listForAdvisor: the advisor's own cases (any
 * visibility) plus the firm's shared ones. Sharing a case is what contributes it
 * to a colleague's knowledge of the client — see 5b.
 * @param {string} advisorId - from the verified JWT, never the request body
 * @param {string} firmId    - from the verified JWT
 * @param {string} clientId
 * @returns {Promise<object[]>}
 */
async function listForClient (advisorId, firmId, clientId) {
  const [rows] = await db.execute(
    `SELECT * FROM va_case_studies
      WHERE client_id = ?
        AND (advisor_id = ? OR (firm_id = ? AND visibility = 'shared'))
      ORDER BY created_at DESC
      LIMIT 50`,
    [clientId, advisorId, firmId]
  )
  return rows.map(rowToCase)
}
```

---

### 5f. Advisor-facing wording — APPROVED (do not paraphrase)

Approved by the product owner, 14 July 2026. Implement verbatim. If the team believes it needs to change, that is a conversation with Mike — not an editorial decision.

**The client-name step (shown before the 14, when the client is new or unnamed):**

> **Who is this session for?**
>
> Give me the business name. I'll use it to keep this client's history together — so next time you come back, I can see what we recommended, what worked, and what didn't, and build on it rather than starting again. You can skip this if you'd rather not save it.

**On subsequent sessions** the advisor is shown their existing client list and selects from it (see 5a) — they are **not** asked to retype the name. The question above is for a client the advisor has not worked with before, or one they chose not to name.

Note what this copy commits the system to: *"I can see what we recommended, what worked, and what didn't, and build on it."* That is a direct promise, and it is only true once the engine actually reads the case history back (5d). See the sequencing note at the end of this section.

---

### Honest scoping

This is **not** a small change, and we do not want it estimated as one. It touches:

| Area | Work |
|---|---|
| Schema | `va_clients` table + `client_id` on `va_case_studies` (5e) |
| Intake | Client-select / client-name step ahead of the 14, with fuzzy duplicate check (5a) |
| `caseStore` | `listForClient` — new, but reuses the existing access boundary (5e) |
| `advisorEngine` | Retrieval, prior-engagement summary, signal injection, prompt context (5d) |
| `templateResolver` | Suppression of already-delivered templates; re-prioritisation on `wentLess` (5d) |
| Decision trace | Record which prior cases informed the recommendation (5d) |
| Front end | Client picker; the three approved messages; the visibility toggle already exists |

The suppression rules in 5d will need tuning against the **Scenario Lab**, and **rule 2 in particular** — *"a template that went badly is a signal, not a repeat"* — is a genuine judgement call. We recommend the product owner signs that one off with real cases in front of him rather than it being settled in code review.

**What is NOT needed, and must not be built:**

- **No new permission model.** 5b — the visibility model already exists and is correct.
- **No mentor retraction cascade.** 5c — the product owner has explicitly ruled against it.
- **No back-fill of historic cases.** 5e — matching on free-text titles would corrupt client histories.

**Sequencing recommendation:** ship Bugs 1–4 first. They are contained, they are defects, and they materially improve the advice given today. Recommendation 5 follows as its own piece of work.

**One dependency between them, and it matters:** the cap message approved in Bug 3 tells the advisor *"come back and tell me how the client responded."* Until Recommendation 5 exists, **the system cannot keep that promise** — a returning advisor gets a blank sheet and may be handed the same templates again. Either build the loop before that message ships, or soften the wording with the product owner's approval until it can be honoured. **Do not ship a promise the engine cannot keep** — that is the same category of failure as the four defects above, merely a more articulate one.

---

## Recommended verification before release

1. **Scenario Lab** (`scripts/scenario-lab.js`) — run before and after. Confirm no template that legitimately relied on an industry-word match regresses (Bug 1), and that template counts move as expected (Bugs 3 and 4).
2. **Re-run the live scaffolding case.** The expected outcome after the fixes: Quick Fire Diagnosis appears once, **Working Capital Cycle** appears, Business Insurance Model does not, and the advisor receives one template per committed meeting.
3. **Measure Phase-3 latency at the new maximum budget** (Bug 4, consequence 1) against the 2000 ms standard.
4. **Existing suite** — Bugs 1–3 are expected to be non-breaking; Bug 4 may require updating any test that asserts a maximum budget of 3.

---

## The pattern worth fixing, beyond these four defects

All four defects share one shape: **the engine reduces what the advisor receives, and never says so.**

- A false keyword match displaces the right template — silently.
- A duplicate record eats a meeting slot — silently.
- A meeting count above the ceiling is discarded — silently.
- A hard cap overrides the advisor's stated engagement — silently.

An advisor cannot correct what they cannot see. Note that the fix for Bug 3 does **not** remove the cap — the product owner has kept it at six, for a good product reason. What it removes is the *silence*. The cap now explains itself, and the explanation makes the product's actual logic visible to the advisor: this is targeted advice for a specific problem, and the way to get more is to come back with real progress.

We would ask the team to adopt this as a standing principle for the engine:

> **Whenever the system delivers less than the advisor asked for, it must say so, and say why.**

Every one of these four bugs would have been caught in its first session had that principle been in place. Recommendation 5 is what makes the principle honest — it is the difference between telling an advisor to come back with progress, and actually being able to use that progress when they do.

---

*Prepared 14 July 2026; status updated end of day. Everything in this document — the four
fixes, Recommendation 5 in full, and three further defects found and fixed during live
retesting — is built, tested (745/745) and committed on branch `feat/client-knowledge-base`,
with the product owner's per-change approval throughout and all advisor-facing wording his,
verbatim. See the STATUS UPDATE at the top for the commit map, the Scenario Lab verdict, and
the items that remain the master team's: the migration, two documentation corrections, and
the capital-raising content decision.*
