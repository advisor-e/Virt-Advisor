# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-20 · Laptop · branch `feat/advisor-progress`

**Suite 12,319 green** (570 suites), lint 0 errors, coverage and audit gates passed. Tree clean.
🔴 **LEVEL WITH `master` — anything this branch holds beyond it is housekeeping.** Take the
counts from `npm run check:branch`, never from a number written here: it goes stale on the next
save, and this line said *"0 ahead, 0 behind"* while two commits sat on top of it.
**[PR #102](https://github.com/advisor-e/Virt-Advisor/pull/102) was merged on 2026-09-20**
(`4b65b498`), taking all 21 commits across: the step builder and the concept drawings. **Merge
`origin/master` in before you start** — your branch went 22 behind the moment it landed.
**24 live items.**

**15.7 — 28 OF 33 CONCEPTS NOW TEACH FROM THEIR OWN DRAWING** (`681c2f45`). The remaining 24
approved drawings are wired, Porter's among them; **27 render on the run screen and 27 in the
client's plan**, proved in a browser. The *"no capture screen yet"* notice fell from **34
concepts to 17**, which is the measure of the item. **Only the five with a photograph pasted
inside remain**, each named in `DRAWINGS` where it would sit so nobody re-derives which five.

🔴 **TWO FAULTS IN THE METHOD, BOTH FIXED.** **Porter's — the exemplar the whole method was
copied from — could not be generated at all**: it names the firm's mark with ids
(`firmMark`/`firmDisc`/…) where the 31 later drawings use classes (`firm-mark`/`fm-disc`/…), so
the generator threw *"no firm-mark group"*. The reader takes both spellings now; his approved
artefact was not touched, because not one drawn element differs. **And the drift guard reported
all 28 concepts as drifted from their approved drawing after ANY checkout** — git is
`core.autocrlf=true` with no `.gitattributes`, so it rewrites these generated files to CRLF
whenever it touches the working tree, and the pre-push hook then blocked the push. **If you see
`conceptGraphics.test.js` fail on a fresh clone, take this commit before believing it.**

🔴 **7.12 IS STILL YOURS TO PUT BACK** — unchanged from yesterday. Mike ruled 2026-09-19 that
`7.12` is *the right calculator is offered only sometimes* and your new job takes `7.13`. This
laptop applied its half (`e33002be`); your branch still points `7.12` at *the model's page is
recalled by the AI*, so the guard will refuse your merge until you move it. Your handover is
dated 2026-09-18 and the check confirms it is current.

**DESKTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `strategy-planner.md`,
`CODE-SIZE.md`, `scripts/build-concept-graphics.js`, `tests/unit/conceptGraphics.test.js`.
**New:** 23 files in `components/strategy/concepts/`. **No `FirmManagerHub.vue`, no engine code,
no `report-model-summaries.json`.** **7.5, 15.1 and 15.7 stay active on this laptop.**
