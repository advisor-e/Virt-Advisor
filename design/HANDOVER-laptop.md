# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-17 · Laptop · branch `feat/advisor-progress`

**Five commits, all pushed** (`2ab31be9` … `46e0872f`). Suite **12,074 green**, lint 0, audit
gate pass. **0 behind `master`, 15 ahead.** **No code was written today** — 15.1 stays active
on this laptop, 7.5 likewise, still blocked on `FirmManagerHub.vue`.

🔴 **MIKE REDIRECTED 15.1's DESIGN. Read [`PLANNING-TEMPLATE-CENSUS.md`](PLANNING-TEMPLATE-CENSUS.md)
before the Brief, and the Brief before anything else.** Design from the OUTPUT: an advisor ticks
concepts and gets one seamless plan, each concept shown **as it appears in his slides**. The four
built steps stand; the shape ahead of them does not.

**This machine could not open a PDF until today.** Every design decision before 2026-09-17 was
made from second-hand summaries, which is how five capture shapes and a count of 45 got written
down. `pymupdf`, `python-pptx`, `python-docx` and `openpyxl` are now installed (user-level
Python, nothing to do with the app's stack).

**Measured, not assumed:** 51 concepts in scope, from five documents' own menus · **21 teaching
forms, 9 capture forms** — a concept is taught in one form and captured in another, and nothing
is ever filled in as a ring, a staircase or a curve · `Pivot.pdf` is the **acceptance test**,
being a deck Mike assembled by hand out of Orientation 2 and Sales & Marketing.

**In the repo now:** `design/planning-templates/` — his twelve decks, two workbooks, and 21
fill-in tables in their original Word/PowerPoint/Excel. The Enneagram table is deliberately
excluded on licence grounds; the census says why.

**DESKTOP — shared files I changed:** none. Only `design/` documents and
`design/features/to-do-items.json` (15.1's note). **Nothing in `components/FirmManagerHub.vue`,
`server/advisorEngine.js`, or anything else 7.2 owns.**
