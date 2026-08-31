# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-31 · Laptop · branch `feat/advisor-progress`

Suite **6,482 green**, lint 0 errors, nothing uncommitted. **Five commits, all pushed.**

### 1. The handover file you are reading was split in two — and it is on `master`

`design/HANDOVER.md` became `HANDOVER-laptop.md` + `HANDOVER-desktop.md` (PR #48, merged).
It was "one file, replaced each session", which silently overwrote one machine's note when
both worked the same day. Each machine now writes only its own and reads both at startup.
**All five reference sites moved in the same commit**, so no session can follow a stale
pointer. `HANDOVER-desktop.md` is still awaiting its first real entry.

### 2. The Volatility Report is built and live at `/volatility`

Eleventh model in the Model Library, 17th screen in `npm run visual`. Four commits:
mockup → model+test → screen → month picker. Ported from
`design/report-source-models/Volatility Report.xlsx`; **every golden expectation cites its
cell**, and all three dial scores match exactly (77.73 / 85.12 / 95.13).

> 🔴 **Three findings pinned in the code — do not "tidy" any of them away.**
> **(a)** The workbook uses the **POPULATION** standard deviation (`STDEV.P`, ÷n). Sample
> would give 23,052 against 22,071 and put every band ~£1,000 out while looking perfectly
> plausible. **(b)** A window is the **most recent** n months, not the first n. **(c)** The
> rev counter is `(2 × SD) ÷ average × 100`; its green/orange/red boundaries (**50** and
> **75**) were **measured** by decoding the arc of the three gauge PNGs embedded in the
> workbook — they are recoverable from nothing else, so the test that pins them is load-bearing.

**Mutation testing earned its place.** Breaking the model five ways outside the repo caught
three; **two passed everything** — a month sitting exactly on a band boundary, and a month
beyond the third deviation (the sample never produces one). Both now covered.

### 3. ⚠ The file intake cannot feed a monthly model — I got this wrong first

I told Mike the existing Xero/CSV/XLSX intake would serve this report. **It will not.** It
reads **annual** figures and *deliberately refuses* a by-month export (`MULTI_PERIOD_COLUMNS`,
`xeroReportParser.js`). Hence typed entry, and hence **item 4.54** for the upload — its own
change, at the 100% bar, because it takes untrusted files. Recorded in the Report Models Brief
so nobody else discovers it the hard way.

### 4. Two documents were corrected on Mike's ruling

`REPORT-VISUAL-STANDARD.md` and `ADDING-A-REPORT.md` (three places) claimed a card carries a
**3px cyan top edge**. **No shipped screen has ever drawn one.** Mike ruled consistency wins —
the documents were wrong, not the nine screens. The `--rs-card-top` token remains, read by nothing.

### Open, and none of it blocks you

**4.15** (Mike — 23 template names) · **4.50** (needs a database, so UAT) · **4.54** (the
by-month upload, ours, unstarted). Nothing here touches Course Builder.

### 🖥 If you are the desktop

`data/course-quizzes.json` is **shared** — `courseEngine.js` reads it and so does the hub's
Quizzes tab via `firmManager.js`. Whichever machine is in Course Builder, the other should
stay off that tab. Everything else in the two areas is cleanly separated. Also: all four
manager tiers render **one** 2,202-line `FirmManagerHub.vue`, so "the hubs" is one machine's
job — individual tab components are safely separable, the tier matrix is not.
