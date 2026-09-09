# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-09 (tenth session) · Laptop · branch `feat/advisor-progress`

Suite **8,722 green** (433 suites), lint 0 errors, audit gate clean. **One commit,
`d0b5095`, pushed.** 15 ahead, 0 behind — started level with `origin/master`, so nothing
was merged in.

**4.78 SLICE 3b IS BUILT, AND THE MANAGER'S SIDE IS NOW COMPLETE.** A manager loads a
schedule, sees the documents this level holds, confirms or changes which published class
each of the six categories takes its rate from, corrects any figure, reads what the
document did not cover, and approves or rejects. Two components:
`FirmDepreciationRates.vue` (the tab, the list, the upload) and the new
`DepreciationDocumentReview.vue` (one document under review).

🔴 **APPROVE STAYS SHUT UNTIL EVERY MATCHED CLASS IS CONFIRMED** — Mike's P10 ruling. It is
the whole point of the class-match step; do not "helpfully" enable it.

🔴 **THE READING WAS EXTENDED, WITH MIKE'S YES BEFORE ANY CODE.** The picker in the approved
class-match drawing needs the document's OTHER published classes, and slice 3a asked the
model only for the six. The prompt gained **section 6** (renumbering `never` to 7 and
`output` to 8), and every class clears the same bar as a proposed rate — a class that
cannot carry a rate and a page is never offered, because a class a manager picks is written
straight to the approved table.

**Every difference from the two approved drawings is named in
`depreciation-rates-history.md` §5** — eight of them, with the reason for each. That file is
where to check the build against the artefacts, not this note.

**60 new tests.** The rate seam is the one to respect: **typed as a percentage, stored as a
decimal, converted in `setPercent` and nowhere else.** 500 is refused, never clamped.

⚠ **THIS SCREEN HAS NOT BEEN OPENED IN A BROWSER.** Every path is proven against stubs. The
Economic Analysis threw up nine live faults that green tests had all missed, so treat the
first real run as the real test. It needs a key, a real IR265 and a manager — UAT's, not
this machine's.

**Next on 4.78:** the advisor's half entirely (the screen they load a document from), the
forecast's country field, and the dated purchase list. **4.78 stays flagged active on the
laptop** — the item is unfinished and this machine has built all of it.

⚠ **Known deviation, unchanged:** both Depreciation Rates components hardcode English like
four of their five sibling tabs, against the i18n standard. Named in each component header.

**Open for Mike:** 4.15, 4.58, 4.66 · **whether 4.77 closes into 4.78** (still not ours to
decide) · and **4.81**, the hardcoded NZ tax and GST rates, which needs a drawing before any
build and rides everything 4.78 has now built.

**DESKTOP:** 🔴 **your note is stale — it is dated 2026-09-04 and describes 5 commits; your
branch is 46 ahead with a commit from today.** Nothing of yours was touched here. Nothing
this session went near quiz screens.
