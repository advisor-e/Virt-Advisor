# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-18 · Laptop · branch `feat/advisor-progress`

**Three commits, all pushed.** Suite **12,168 green** (563 suites), lint 0, coverage and
audit gates passed. Tree clean. **51 ahead of `master`, 0 behind. 15.1 and 7.5 stay active
on this laptop.**

☑ **THE CONCEPT REGISTER — Mike's own table, built on his instruction.** All 52 concepts,
each beside the slide it comes from in his decks, with the page and the response form open
to correction. [The register](https://claude.ai/artifact/DUzBW3SRo5nFUEWsJqxV9c) · rebuilt with
`node scripts/build-concept-register.js --images <dir>`

🔴 **WE CAN READ HIS DECKS. PyMuPDF is installed on this machine** and renders any page of
any deck in `C:\Documents\Visual Code Projects\Strategy Planner`. **Look at the page before
drawing anything.** The standing note that "the deck PDFs are NOT a source" is about
machine-reading his *curved text*, and it is still true — it was never a reason not to LOOK.

☐ **HIS CORRECTIONS ARE IN `design/concept-register-corrections.json`, NOT APPLIED.**
Seventeen of them, and he stopped partway — Sales & Marketing and Organisational Review are
untouched. **Ask him before applying any of it; he has not finished deciding.**

🔴 **PORTER'S IS DRAWN WRONG AND IS STILL WRONG.** Against his own slide (Strategic
Orientation 2 **p13**): **three of the four forces are in the wrong position** — his order is
Customers top, Suppliers right, Substitutes bottom, New Entrants left. His ring and his four
colours are missing, our inward arrows are invented, and two of his bold statements are
absent. `StrategyTeachingSlide.vue` says the diagram was *"COPIED, NOT REDRAWN"* — it was
redrawn. **The assembled plan document draws no graphic at all**, where the approved drawing
puts one on p5. Fixing both is the agreed next step and needs his go-ahead.

⚠ **A WHOLE CATEGORY WAS INVISIBLE: response tables drawn ON A SLIDE.** The reader only ever
opened the workbooks. 34 such pages now found across the 157 deck pages, and 21 concepts carry
a suggested response page in the register. **8 of the 19 existing pairings name a form the app
does not hold**, five of them near-misses on a name that was typed rather than picked.

⚠ **THE SCAN TOOLS ARE NOT IN THIS REPOSITORY.** `render-slides.py` and `read-deck-pages.py`
live in the session scratchpad and need Python, which this project does not otherwise use.
`build-concept-register.js` is committed and depends on what they produce, so **the register
rebuilds on this laptop and nowhere else.** Mike ruled 2026-09-18: leave it until the register
has been worked through, then decide where it lives.

⛔ **The Enneagram employment-questions workbook is NOT coming in — his word, asked directly.**
Recorded in the Brief. Do not raise it as a gap.

**DESKTOP — shared files I changed:** none. Two new scripts, two records, and the Brief's
Strategy Planner page. **Nothing in `FirmManagerHub.vue` or anything else 7.2 or 7.9 owns.**
