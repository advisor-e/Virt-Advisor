# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-17 · Laptop · branch `feat/advisor-progress`

**Two commits, both pushed** (`efdfd5bc`, `40507a45`). Suite **12,158 green**, lint 0,
coverage and audit gates passed. Tree clean. **47 ahead of `master`, 0 behind. 15.1 and 7.5
stay active on this laptop.**

☑ **STAGES 2 AND 3 BUILT.** Capture reads Mike's own Word/Excel/PowerPoint fill-in workbooks
(`npm run capture-tables`) — **16 of 52 concepts reach a real table where 2 did**. A concept
can be **visited twice**: Porter's observations, then his responses against what the client
actually said. Screen 4 is now the assembled document from his approved drawing.

🔴 **OPEN THE APPROVED ARTEFACT BEFORE BUILDING ANYTHING ON THIS FEATURE.** Four of today's
five rejections came from not doing it: a Porter's diagram invented from scratch when
`strategy-plan-output.html` p5 has one *drawn at fidelity*; four boxes when
`strategy-planner.html` screen 2c has five with his own prompts; a sixth box no one asked
for; and a PDF-reading extractor for content his data already held. **The deck PDFs are NOT
a source — his decks curve their labels, so machine reading returns fragments.** That reader
is deleted; do not rebuild it.

☐ **NEXT ON 15.1: the advisor cannot name his own steps.** The drawing has him naming five
and dragging ticked concepts into them (Porter's into two, step 5 empty). Everything scoped
currently prints in one step.

⚠ **TWELVE LOCALE LABELS ON THE PLAN DOCUMENT ARE OURS, NOT HIS** — *Session plan*,
*Discussion points*, *Action points*, *not filled in*. Flagged to him at shutdown, unanswered.
Two others were **deleted** today on his word: *"What this does in the room"* and *"Who and
when"*, both AI inventions from the 2026-09-16 build.

**DESKTOP — shared files I changed:** `locales/en.json`, `data/strategy-frameworks.json`
(Porter's sixth field removed), `server/utils/strategyFrameworks.js` (`hasField` now accepts a
concept id; a framework prefers its concept's own summary over the material's),
`server/restify-server.js` (one route mount), `server/routes/strategyPlanner.js`,
`package.json`. **Nothing in `FirmManagerHub.vue` or anything else 7.2 owns.**
