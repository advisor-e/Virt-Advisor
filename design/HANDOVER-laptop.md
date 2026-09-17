# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-18 · Laptop · branch `feat/advisor-progress`

**Four commits, all pushed.** Suite **12,173 green** (563 suites), lint 0, coverage and audit
gates passed. Tree clean. **54 ahead of `master`, 0 behind. 22 live items — 15.5 and 15.6 filed
today. 15.1 and 7.5 stay active on this laptop.**

🔴 **WE CAN READ HIS DECKS — PyMuPDF is installed here.** Any page of any deck in
`C:\Documents\Visual Code Projects\Strategy Planner` renders in seconds. **Look at the page
before drawing or claiming anything.** The old note that "the deck PDFs are NOT a source" is
about machine-reading his *curved text* and is still true; it was never a reason not to LOOK.

☑ **STAGE 4 BUILT, AND IT DELETED ITSELF.** Twenty-one hand-drawn teaching forms became one
rendering job: the app now shows **his own slides** (`scripts/render-deck-slides.py` →
`static/planning-slides/`, 37 committed images). **0 of 52 concepts had a correct graphic; 34 do
now**, and the client's plan document has pictures for the first time. 🔴 **NEVER REDRAW A
CONCEPT** — the one that was hand-drawn put three of Porter's four forces in the wrong place
under a comment claiming it had been copied.

☑ **THE CONCEPT REGISTER** — his 52 concepts each beside their slide, page and response form,
editable. [The register](https://claude.ai/artifact/DUzBW3SRo5nFUEWsJqxV9c) ·
`node scripts/build-concept-register.js --images <dir>`.

☐ **HIS PARTIAL PASS IS IN `design/concept-register-corrections.json`, `applied: false`.** He
stopped after Strategic Orientation 2; Sales & Marketing and Organisational Review are untouched.
**Ask before applying any of it** — that is item **15.6**.

⚠ **Response tables drawn ON A SLIDE were invisible to the app** — the reader only opened
workbooks. Four Mike named are wired (SO2 p24 answers both Integration concepts, p34, p37, p41);
seventeen more are suggestions awaiting his pass.

**NEXT ON 15.1: the advisor still cannot name his own steps**, so the plan prints one step.

**DESKTOP — shared files I changed:** none of yours. `data/strategy-frameworks.json`,
`server/utils/strategyFrameworks.js`, `server/routes/strategyPlanner.js`, the four
`components/strategy/` files and `pages/strategy-planner.vue`. **Nothing in `FirmManagerHub.vue`
or anything else 7.2 or 7.9 owns.**
