# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-17 · Desktop · branch `feat/firm-quiz-builder-ui`

**Three commits, all pushed** (`8760ef96`, `991c7c14`, `679eea18`). Suite **11,928 green**
(558 suites), lint 0 errors, coverage and audit gates passed. Tree clean. **19 ahead of
`master`, 0 behind. Twelve live items — 14.3 filed today.**

**7.9's root cause was NOT what its note said, and the real one was bigger.** SIX model
names are also template titles, not the three assumed — and **Lease vs Buy**, **High-Level
Budget** and **Dashboard Reports** differ from the library's own spelling by ONE character
(a full stop, a hyphen, a plural). `isKnownTemplate` compares exactly, so the 7.7 guard
flagged **genuine template recommendations as calculators**, telling the AI the advisor
would find nothing in Advisor-e. It hit **28 of 38** live bench calls. `nearestTemplateTitle`
now answers it from the catalogue, and `tests/unit/nameCollisions.test.js` **recomputes** the
set — a seventh collision fails the build rather than being found in conversation.

**The miscount was itself the fault.** The code header said "two", every later note copied
it, nobody re-derived it. That is why the fix is a test that computes, not a corrected
sentence.

🔴 **READ `CLAUDE.md`'s new diagnostic block before touching this area.** Four verified
commands to run BEFORE theorising when the AI "can't find" a document or model, plus:
**`searchWords` never reaches the AI** (Model Guide filter only, item 4.36 — a session got
this backwards today), and **a bench that omits the template list measures nothing** — it
leaves the AI inventing names to fill "Best match", and a morning was spent reporting that
harness artefact as a defect.

**7.9 is `activeOn` DESKTOP.** Root cause fixed; calculators-not-offered is partly open.
Measured 12 of 19 reliably offered, 0 invented names. **8 Levers is NOT a defect** — the AI
finds the template *8 Profit Levers*, answers well, and stops; the machinery is correct.

⚠ **LAPTOP — I touched `data/report-model-summaries.json`, which is under your 7.5.** One
`searchWords` array on 8 Levers only (Mike's own phrase); no names, routes or summaries.
Expect a possible conflict there and keep both sides.

⚠ **The live Handbook is YOUR working-tree preview** (47 pages, banner: *"a preview, not the
shared page"*). **Mike ruled it stays** — it shows Strategy Planner, which master has not yet.
Nothing is at risk; that Brief is committed on your branch. **Filed as item 14.3:** the
`--working-tree` flag is fine, but nothing stops a preview reaching the shared URL, and the
guard belongs in the startup publish step. Your branch is current — 43 ahead, note dated
today, read from the OTHER BRANCHES box.
