# Course Builder Improvement Plan

> **Status:** APPROVED as a plan by Mike 2026-07-15 (drafted from the 2026-07-15
> course-builder logic review). Each individual fix inside a phase still follows the
> 5-step protocol — proof shown, change proposed, Mike's yes received — before any code
> is touched.
>
> **Item register:** every CB-xx ID below is a row in the consolidated table
> **"COURSE BUILDER — consolidated outstanding actions (logged 2026-07-15)"** in
> [`ACTIONS.md`](ACTIONS.md). That table is the master status record; this document is
> the sequencing and rationale. Close items in both places together (mirrored rows also
> have an original line elsewhere in ACTIONS.md — close all copies).

---

## Ground rules for the whole plan

**Where the work happens.** Work continues on the current branch
(`feat/business-performance-report`), exactly as the 2026-07-10 bug-sweep fixes did.
Reason: that branch already contains the course security fixes (the `firmAuth` login
guard, the 256 KB body-size cap) that this work builds on — branching off `master` would
reintroduce conflicts with them. Trade-off accepted: the branch mixes course fixes with
report work, but that precedent is set (2026-07-10 sweep) and everything lands together
at the next merge.

**How each fix ships.** One item at a time: show the broken behaviour, propose the exact
change, wait for Mike's yes, fix, add tests, run the full suite, then commit. Push to
GitHub at each phase boundary.

**Wording checkpoint.** Any new on-screen text (error messages, labels, the "ungraded"
wording in Phase 1) is confirmed with Mike before it goes into code.

---

## Phase 1 — Protect the advisor's work and the honesty of scores

*Small, contained fixes — about one session.*

> **✅ PHASE 1 COMPLETE 2026-07-15, pushed to GitHub.** CB-01 `03f45e3` ·
> CB-03 `e713f28` (new `utils/quizScoring.js` + 11 tests) · CB-10 `55780ff` ·
> CB-05 `a949c16`. Every commit gated: 939 tests green, lint clean, audit-gate
> pass. Bonus: first-ever tests on the design handler
> (`tests/unit/courseDesignRevision.test.js`, 6) — CB-13 down payment.

| Item | What changes |
| --- | --- |
| CB-01 | Keep the approved outline as a fallback, so a failed revision can never leave the advisor with nothing. (`server/courseEngine.js` L234–238) |
| CB-03 | A grading failure records **"ungraded"** instead of inventing a 75% pass; ungraded answers are excluded from averages, certificates, and the team dashboard. (`components/CourseBuilder.vue` L1166–1170) |
| CB-10 | A design-phase AI failure shows a proper "please try again" message instead of an empty speech bubble — aligning with the session handler's existing behaviour. (`server/courseEngine.js` L189–194) |
| CB-05 | One-line security fix: block images in course chat (`_md.disable(['image'])`), matching the main chat's locked markdown pipeline. (`components/CourseBuilder.vue` L400) |

**Why first:** the cheapest fixes with the highest trust payoff — no advisor loses work,
no score is ever fabricated, and the known image-injection channel is closed.

## Phase 2 — Content integrity and quiz quality

*About one session.*

> **✅ PHASE 2 COMPLETE 2026-07-15, pushed to GitHub.** CB-02 `cba5585` (new
> `server/utils/outlineResources.js`) · CB-08 `773de46` (validator 100%
> coverage held) · CB-04 `6bb9e82` · CB-12 `92559e7` (new
> `server/utils/quizOverrides.js`; overrides file had no live entries — no
> migration). Every commit gated: 968 tests green, lint clean, audit-gate
> pass. Suite has grown 927→968 across Phases 1–2.

| Item | What changes |
| --- | --- |
| CB-02 | Every resource name in an AI-generated outline is checked against the real template library before the outline is accepted — hallucinated names are rejected (never-invent-the-firm's-IP rule). |
| CB-08 | The outline shape-checker (`validateCourseOutline`) is deepened — focus text, objectives, minutes, session ids, session count, intensity — so half-formed outlines can't render with blanks. Done together with CB-02: same function. |
| CB-04 | The quiz grader receives the same capped session summary the question-writer gets, so answers are graded against what was actually taught, not GPT-4o's general knowledge. |
| CB-12 | Hand-written quiz overrides (`data/course-quizzes.json`) are re-keyed on something stable instead of AI-written session titles, so they actually fire. |

Tests here follow the strictest house standard — AI-output validation functions get
full coverage (valid, malformed, missing fields, wrong types).

## Phase 3 — Security hardening batch

*About one session. These already sit in the 2026-07-10 sweep list; batching keeps the
engine changes reviewable together.*

> **✅ PHASE 3 COMPLETE 2026-07-15, pushed to GitHub.** CB-09 + CB-14 `e64f812`
> (fencing extended to quiz prompts + advisorProfile; new
> `tests/unit/courseSession.test.js`) · CB-15 `56dc793` (handler removed —
> both stated reasons stale) · CB-18 `b8ef0ed` (no automated tests possible —
> browser-bound; added to the CB-19 live click-through checklist) · CB-20
> `1887fbc`. Every commit gated: 972 tests green, lint clean, audit-gate
> pass. Mirrored sweep lines updated (two are half-fixes: advisorEngine
> `languageName` and VirtualAdvisor `initClientSession` halves remain open).

| Item | What changes |
| --- | --- |
| CB-09 | Fence the four collected interview answers with `fenceUntrusted()` before they enter the outline prompt. |
| CB-14 | Fence the client-controlled `sessionContext` interpolated into the session system prompt (mirrors sweep item). |
| CB-15 | Remove/narrow the global `unhandledRejection` swallow so it stops hiding unrelated crashes. |
| CB-18 | Abort stale SSE streams in `CourseBuilder.vue` so an old response can't land in a fresh conversation. |
| CB-20 | Add the client-disconnect cleanup to `server-middleware/course.js` that `advisor.js` already has. |

## Phase 4 — The interview experience

*The one genuine design job — one to two sessions.*

| Item | What changes |
| --- | --- |
| CB-06 | Teach the 3-question interview to recognise a non-answer ("what do you mean?") and re-ask instead of storing it, and to skip questions the advisor already answered in their opening message (the unused `skip` hook was built for exactly this). |
| CB-11 | Trace and clear the dead design-pipeline logic (`multiGoalDetected` unused, `goalsSecondary` never written, ignored `conversationHistory`) in the same pass — same pipeline. Trace-before-removing rule applies. |

This phase needs Mike's input on question/re-ask wording before coding.

> **✅ PHASE 4 COMPLETE 2026-07-15, pushed to GitHub.** CB-06 + CB-11 `f0909f2`
> (design + all three re-ask wordings approved by Mike; new
> `server/utils/designInterview.js` — clarification detection capped at one
> re-ask, conservative opening-message pre-fill; dead code trace-verified and
> cleared incl. the unused `q.skip` hook). 23 new tests
> (`designInterview.test.js` + `courseDesignInterview.test.js` end-to-end).
> Gate: **1,004 tests green** (suite has grown 927→1,004 across Phases 1–4),
> lint clean, audit-gate pass.

## Phase 5 — Test coverage back-fill

*About one session.*

Every phase above ships tests for what it touches; CB-13 then fills the remaining gaps
(interview state machine, outline handling, quiz handlers) so the course engine meets
the ≥90% backend-route target instead of today's near-zero. Relates to the open jest
coverage-gate item in ACTIONS.md.

---

## Mike's decisions (no code until ruled)

1. **CB-07 — the "Firm-wide" sharing button.** It cannot work until server storage
   exists (courses are localStorage-only). Recommendation: **hide it** for now (honest,
   zero effort) rather than label it "coming soon" (keeps the promise visible but
   invites questions that can't yet be answered). ⏳ Awaiting ruling.
2. **CB-16 / CB-17 — real persistence** (courses + progress into MySQL). Stays parked
   with the existing Firm-Manager-MySQL persistence item — gated on the master team's
   database work; this plan cannot unblock it.
3. **CB-19 — verify item.** One live click-through of a course completion with both
   servers running, then close (the localhost cause was fixed 2026-07-10 by the
   apiProxy work, `6040abf`).

## Deliberately not in this plan

- **CB-21** (locale translations) and **CB-24** (JSDoc) ride the already-gated cleanup
  pass (`design/CLEANUP-PASS-PLAN.md`).
- **CB-23** (splitting the 2,152-line `CourseBuilder.vue`) and **CB-22** (0%-score
  display bug) stay in the general P3 backlog — pulling them in here would balloon the
  scope for little advisor-visible gain.
