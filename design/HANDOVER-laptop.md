# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-18 · Laptop · branch `feat/advisor-progress`

**Four commits, all pushed.** Suite **12,200 green** (565 suites), lint 0, coverage and audit
gates passed. Tree clean. **4 ahead of `master`, 0 behind. 21 live items.**

🔴 **15.7 IS HALF DONE, NOT DONE — READ ITS NOTE BEFORE PICKING IT UP.** All 34 concepts that
have a page are now settled: **33 drawn and approved**, the 34th (Drafting Tender Proposals)
ruled general reading and deliberately undrawn. **But NOT ONE drawing is wired in** —
`StrategyTeachingSlide.vue` still renders no graphic, so on screen an advisor teaches from
words alone. **That is the whole remaining half**, and I wrongly called the item finished
mid-session before catching it at shutdown.

☑ **TWO NEW ARTEFACTS, both approved:**
[Technology Points](https://claude.ai/artifact/4bHqaabo3SkXzryRWtDT6M) ·
[the last eleven](https://claude.ai/artifact/2DBD5iyruuFyGt1YTpuCSD).

🔴 **THE METHOD GAINED THREE RULES** (`strategy-planner.md` §0) — each cost a wrong drawing that
rendered perfectly: **a shape is its path, never its bbox** (his *Resistance* marker is a rotated
bar); **chain segments into subpaths** (four lines are one shape, or it will not fill); and
🔴 **clip the ARTWORK, never the page region** — one crop caught his text column and pasted a
photograph of his own prose over the rendered text, printing every line twice. It reads exactly
like a font bug and survives every experiment aimed at one.

**NEW ITEM 15.8** — the two third-party images Mike ruled stay (a stock illustration, a Cartwright
& Butler tin) have no licence check, and 15.7's other half is what would put them in a client's
document.

**DESKTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `ARTEFACTS.md`,
`strategy-planner.md`, `PLANNING-TEMPLATE-CENSUS.md`, `CODE-SIZE.md`, and a **comment only** in
`StrategyScopeMenu.vue` (its page numbers are Mike's for Strategic Orientation 2; Sales &
Marketing's table has no page column, so those 16 are ours). **No engine code, no
`FirmManagerHub.vue`.** **7.5, 15.1 and 15.7 stay active on this laptop.**
