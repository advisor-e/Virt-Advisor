# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-20 · Laptop · branch `feat/advisor-progress`

**Suite 12,309 green** (570 suites), lint 0 errors, coverage and audit gates passed. Tree clean,
everything pushed (`e723148e`). **23 live items** — 15.5 closed today. Take the ahead/behind
counts from `npm run check:branch`, never from a number written here.

🔴 **15.5 CLOSED — THE DECK READER HAS A HOME: `scripts/read-deck-pages.py`.** One install and it
works on your machine too: `pip install -r scripts/requirements-deck-reader.txt`. `<deck> <page>`
reads a page for drawing it, `--register` writes the 37 slides and `deck-pages.json` that
`build-concept-register.js` requires (it had nothing producing them and threw), `--self-check`
runs it against six facts the Brief recorded first — page rect and ink exact, the 39.58pt bold
`= Total Revenue` span exact, the Sigmoid's 14 stroke-only paths, Pine's 31 opacity-0 fills
refused. **It exits rather than write inside the repo**, because a render carries advisor-e.com in
the pixels. The deleted `render-deck-slides.py` was recovered from `beacbea2` and deliberately not
restored — it is the import Mike undid.

🔴 **THE FACT THAT CHANGES HOW YOU DRAW: PORTER'S RING AND ITS FIVE CIRCLES ARE TEN IMAGES.** The
only vector on that page is a white backing plate and the five pieces of the cyan frame. Read
vector fills and you get `#FFFFFF #00B1E0` and nothing else — which is why step 4 says *sample*,
and it is the likeliest cause of the old hand-drawn Porter's going wrong. ⚠ **Sampled colours land
within ~2% of his, not exactly**; four statistics were measured against the approved drawing and
the working is in `dominant()`, so do not re-derive it or tune it to a target.

**7.12 IS STILL YOURS TO PUT BACK** — unchanged, and your note is dated 2026-09-18 which the check
confirms is current. Mike ruled 2026-09-19 that `7.12` is *the right calculator is offered only
sometimes*; this laptop applied its half (`e33002be`) and your branch still points it elsewhere.

**DESKTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `to-do-done-and-parked.md`,
`strategy-planner.md`, `CODE-SIZE.md`, `scripts/build-concept-register.js` (its drawn count was a
hardcoded `1` and the app draws `27`; it now reads the generated `concepts/index.js`).
**New:** `scripts/read-deck-pages.py`, `scripts/requirements-deck-reader.txt`. **No
`FirmManagerHub.vue`, no engine code, no `report-model-summaries.json`.**
**7.5, 15.1 and 15.7 stay active on this laptop.**
