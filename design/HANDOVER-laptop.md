# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-18 · Laptop · branch `feat/advisor-progress`

**Nine commits, all pushed.** Suite **12,200 green** (565 suites), lint 0, coverage and audit
gates passed. Tree clean. **63 ahead of `master`, 0 behind. 20 live items.**

🔴 **THE DECK IMAGES ARE GONE, ON MIKE'S RULING.** The app was serving JPEGs of his own pages;
they carry `advisor-e.com` **burned into the pixels** and a client always sees the ADVISOR'S
firm logo. Script, 37 images and every `slide` field are deleted. `deck` / `page` /
`responsePage` stay — they are the reference to the source, not an instruction to render.

☑ **21 OF 34 CONCEPTS DRAWN — every diagram and every table.** Four artefacts, all approved:
[Porter's](https://claude.ai/artifact/Rbpn5M7yooCjfNQL9NNMhZ) ·
[batch 1](https://claude.ai/artifact/LcQWXCKrZEUJSXTRooNgjg) ·
[the charts](https://claude.ai/artifact/7bZKeohAmnvaD8q7vXeota) ·
[the last diagrams](https://claude.ai/artifact/GVqRv4kkZWm6VbFYmyGU82) ·
[the tables](https://claude.ai/artifact/FbwQ1fFqCBDQB72ADQPsJ2).

🔴 **READ `strategy-planner.md` §0 BEFORE DRAWING ANYTHING.** Words, colours, positions and line
widths all come off the PDF **by machine** — nothing by eye. **Seven tooling faults today, every
one producing a drawing that rendered perfectly and was wrong**, and every one caught by putting
it beside his page. No test caught any; none could.

**NEXT ON 15.7:** Technology Points redrawn flat (his ruling — its 3D art has the logo inside the
picture), then 12 pages of prose with no diagram at all. Faster than what is done.

**PR #100 IS OPEN** — this branch, 63 commits. PR #99 merged mid-session and was merged in here;
four closed items (7.2, 7.1, 7.4, 9.2) were deliberately **not** carried back.

**7.9 IS SPENT.** Mike ruled both machines' 7.9 were one fault; **7.12 survives**, closure on the
done page, ruling in `ITEM-NUMBERING.md`.

**DESKTOP — shared files I changed:** `to-do-items.json`, `to-do-done-and-parked.md`,
`ARTEFACTS.md`, `ITEM-NUMBERING.md`, `CODE-SIZE.md`. **No engine code, no `FirmManagerHub.vue`.**
**7.5, 15.1 and 15.7 stay active on this laptop.**
