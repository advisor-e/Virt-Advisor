---
name: add-a-report
description: >-
  Use when adding a new report/model screen to the Model Library, or when reworking an existing
  one's headline, sliders, badges or failure behaviour. A report is not one file — it spans a
  backend maths model, a golden test, a Restify route, the catalogue, a page, a screen component,
  and an explicit entry in the consistency guard. Trigger for "add a report", "new model screen",
  "build the X report", "port the X workbook", "wire up a report". Keywords: reportModelCatalogue,
  reportRecompute, currencyMixin, ReportHeader, HeroStrip, HeroFigure, SliderField, StaleBanner,
  ProvenanceBadge, modelClass, golden test, reportHeadlineConsistency.
---

# Add a report

**The 8 steps live in [`design/ADDING-A-REPORT.md`](../../../design/ADDING-A-REPORT.md). Read it
first and follow it — it is the source of truth for the *what*.** This skill is the *how*: the
order to work in, the traps that have actually cost time, and the governance around each step. Do
not restate the 8 steps here or in chat; the two would drift and one of them would start lying.

Governance (CLAUDE.md, absolute): **one change at a time, Mike's explicit approval before each.**
Approval for the report does not carry from step to step. Ask about every user-facing label and
heading before writing it — never invent wording.

## Order of work, and why this order

Build **backend → outward**, proving each layer before the next depends on it:

1. **Model + golden test together** (steps 1–2). Never model-then-test-later: a test written
   afterwards tends to encode what the code does rather than what the workbook says, which is how a
   faithful-looking port hides a wrong figure. Every expected number carries its source cell
   reference in a comment.
2. **Route + registration** (steps 3–4), so the numbers are reachable.
3. **Catalogue row** (step 5) — settle `modelClass` *before* building the screen, because it decides
   whether the "Illustrative" badge is allowed. Getting it wrong tells an advisor, in front of their
   client, that the client's real accounts are dummy data.
4. **Page + screen** (steps 6–7) — assembly only.
5. **The consistency guard** (step 8) — the one step nothing will remind you about.

## The traps, all of them earned

- **Step 8 fails silently.** `tests/unit/reportHeadlineConsistency.component.test.js` holds an
  explicit `SCREENS` list. A new report is unprotected until it is added, and skipping it produces
  no error — just a screen free to drift. Treat this as part of "done", not as cleanup.
- **Don't build a second version of an existing block.** If the new report seems to need its own
  headline, banner, slider or failure style, that is a **design decision for Mike**, not something
  the report decides for itself. Owner ruling 2026-07-22: every model in this section looks the
  same. Phase 3 spent a day undoing exactly this drift across six screens, and the exclusions were
  defensible one screen at a time and wrong in aggregate.
- **`error` from `reportRecompute` is a boolean flag, not a message.** Rendering it printed the
  literal word "true" at advisors on Eight Levers for a day.
- **Delete the local `money()` you were about to write.** `currencyMixin` formats in the firm's
  currency and the reader's language; a private formatter re-hardcodes `$`/en-US.
- **Green tests are not evidence.** Twice on this feature a defect shipped with a passing test
  because the test exercised a state the app cannot produce. Mutation-verify anything load-bearing:
  revert the fix on a copy **outside the repo** and confirm the test actually fails.
- **A stale response can overwrite a fresh one.** `reportRecompute` already handles this. Do not
  hand-roll a debounce or a request guard alongside it.
- **Calc routes are anonymous by design** — numbers in, numbers out. Only **file intake** routes
  carry `firmAuth`, because they accept uploads. Don't "helpfully" add auth to a calc route.

## Verify before calling it done

Work the checklist at the end of `ADDING-A-REPORT.md` literally, then:

- `npm test` — green (the two guards must pass, not be skipped: a report with no entry in
  `reportBadgeClass.component.test.js`'s route map is a **failure**, by design).
- `npm run lint` — clean.
- The screen viewed in the running app. **Mike owns the dev server** — never start, restart or
  build against it (WORKING-AGREEMENT: *The running application — who owns it*). Ask him to look.

Component tests are available and do work — `tests/helpers/mountComponent.js` is the shared entry
point. There is no excuse for a screen with no test.

## Record & commit

Add the report's line to `design/ACTIONS.md` (no silent parking), and record the deployment row if
it ships anywhere beyond this machine. Commit the report as its own unit; push when asked.

## References
- `design/ADDING-A-REPORT.md` (the 8 steps) · `design/REPORT-SCAFFOLDING-PLAN.md` (why the blocks
  exist) · `design/MODEL-CLASSIFICATION.md` (`modelClass`).
- Blocks: `components/base/` (`ReportHeader`, `HeroStrip`, `HeroFigure`, `SliderField`,
  `StaleBanner`, `ProvenanceBadge`, `SampleNotice`) · `mixins/reportRecompute.js` ·
  `mixins/currencyMixin.js`.
- Companion skill: `single-source-wiring` (if the new report duplicates existing config or content).
