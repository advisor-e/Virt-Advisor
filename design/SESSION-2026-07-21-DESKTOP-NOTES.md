# Session Notes — 2026-07-21 · Desktop (Course Builder)

> Branch `feat/course-builder-v3` — **14 ahead of `master`, 0 behind**, everything
> committed and pushed. Full suite **1,453 green / 98 suites**, lint clean, on Node 14.15.
> Not proposed for merge yet. The laptop's own 2026-07-21 notes are in
> [`SESSION-2026-07-21-NOTES.md`](SESSION-2026-07-21-NOTES.md) — that work is already
> merged into `master` and pulled in here.

## What shipped today (4 commits, all pushed)

1. **`fe861fa` — quiz folder synced with disk.** Mike renamed/replaced the source PDFs
   mid-session. `E.O.Y Meeting.pdf` → `E.O.Y Meeting Quiz.pdf` (byte-identical rename);
   `General Section Quiz.pdf` and `Lite Fundamentals Quiz.pdf` added; `General Quiz 1.pdf`
   and `Working Capital Cycle quiz.pdf` removed on Mike's instruction ("if it's in the
   folder I want it, if not delete it"). Both deleted PDFs remain recoverable from
   `54cdd17` / `c3e7d63`, and the **questions** transcribed from them are untouched in
   `data/course-quizzes.json`.

2. **`08884d8` — CB-34 pt 2: quiz banks bind by resolved page, orphans are loud.**
   `findQuizBank` used plain string matching, so a bank key one word off matched nothing
   and returned null — the firm's questions silently replaced by AI-invented ones. Bank
   keys and session resources now meet on the canonical page title via
   `resolveTemplateName`; an unresolvable key is logged by name with its closest titles
   (`[quizBanks] ORPHAN BANK`, once per key per process). Exact matching still runs first.
   The AI-written session *title* is deliberately excluded from the tolerant pass.
   **Why it mattered now:** the repo's own banks are held to exact titles by the
   `quizBankKeys` locking test, but a firm-authored bank (CB-31) is saved at runtime with
   no such gate.

3. **`73f8015` — CB-31 Phase 0: both outstanding quiz PDFs transcribed (90 questions).**
   Lite Fundamentals → 6 banks × 10 (Planning Session, Data Session, Lite Marketing,
   Sales Session, People Session, Process Session). Growth Fundamentals Framework →
   Growth Framework × 20 + Lite Fundamentals × 10. Every entry was compared field-by-field
   against the PDF text **by script, not eyeballed**. Banks 6 → 14, entries 64 → 154.
   Only two deviations, both Mike-approved: the symbol lost in extraction in the Quick
   Position and R.O.A formulas is "÷", and one `--` set as an em dash.

4. **`8231135` — CB-31 Phase 2: the firm quiz store, plus a security fix.** New
   `server/utils/firmQuizzes.js` + `GET/POST /api/firm-manager/quizzes` behind `fmGuard`.
   No new schema — rides `firm_framework_versions` under `config_key 'quiz-banks'`, so
   version history and restore work through the existing generic routes. The stored
   overlay is rebuilt field-by-field from validated values (unknown fields dropped,
   prototype keys refused, sizes capped); every key must resolve to a real page; a bank is
   replaced **wholesale**, never entry-by-entry. Also lands the approved mockup at
   `design/mockups/firm-quiz-builder-mockup.html`.

## Rulings Mike gave today

- **A firm MAY edit the platform's own quiz questions** — stored as an overlay, the base
  is never touched, so "back to the original" always works. (Closes §7 decision 3 of the
  Firm Quiz Builder plan; §7 decision 1 was already ruled.)
- **"The 9 Growth Stages" and "Growth Fundamentals Framework Philosophy" both belong to
  the Growth Framework page**, so they merge into one 20-question bank.
- **The Firm Quiz Builder plan was already approved on 2026-07-21** — its own header still
  says "DRAFT for review", which is stale and misled this session for several messages.
  Worth correcting when the doc is next touched.
- The Quizzes-tab **layout is approved as the basis to build on**; fine-tuning later.
  Every label in the mockup is still a proposal awaiting Mike's wording.

## Security note the other machine should know

Quiz bank text used to sit **outside** the untrusted-input fence, deliberately, because it
was repo data. Phase 2 changes that premise: a manager can now type questions into a
browser form, and a "question" can be phrased as an instruction to the model. Merged banks
therefore carry `origin`, and `courseEngine` fences `origin==='firm'` text at **both** AI
touch-points — quiz generation and the grader's marking guide. Platform banks stay
unfenced so the tuned CB-29/CB-30 prompt behaviour is unchanged. Two wiring tripwires fail
the suite if that fencing is ever dropped.

## Open / next

- **Phase 3 — the Quizzes tab screen** is the next task, built to the approved mockup.
  Biggest piece so far: it lands inside `FirmManagerHub.vue` (~1,300 lines) and every
  on-screen label needs Mike's wording first.
- **CB-36 (new, needs Mike)** — "Revealing the Growth Curve Freehand" (10 questions,
  Q21–30 of the Growth Fundamentals Framework quiz) matches no page in the master export.
  The resolver refused rather than guess, so those ten are **deliberately not
  transcribed**. Candidates: *Growth Curve Checklist* or *Growth Framework*. ~10 minutes
  to finish once named — the extraction and verifier are already proven.
- **Provenance tidy** — the E.O.Y bank's `source` still names `E.O.Y Meeting.pdf`, the
  filename from before today's rename. Logged in `ACTIONS.md`.
- Phases 1 and 4 of the plan remain: the seed/locking-test tidy, and pointing the course
  engine at the firm-overlaid banks.

## Housekeeping

- Nothing left uncommitted or unpushed. No servers were started this session.
- No deployment happened; `master` is unchanged by this branch.
