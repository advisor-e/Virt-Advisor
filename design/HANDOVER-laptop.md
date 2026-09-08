# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-09 (eighth session) · Laptop · branch `feat/advisor-progress`

Suite **8,503 green** (430 suites), lint 0 errors, audit pass. **Ten commits, all pushed.**
10 ahead, 0 behind — `origin/master` was merged in first (PR #69, no content).

**4.78 RENAMED TO DEPRECIATION RATES** on Mike's ruling — IR265 is a depreciation schedule
published *by* the tax office, not tax rules. 11 files moved with `git mv`; the separate
**Property Tax Rules** feature is untouched and must stay that way.

**Slices 1 and 2 built** (`d8621e9`, `af54bcb`): the store with the four-tier cascade and a
per-rate origin, six routes, and the **Depreciation Rates** tab at all four manager tiers.
**Nothing has ever read a document.**

**The feature has no open questions.** Every ruling is in
[`features/depreciation-rates-history.md`](features/depreciation-rates-history.md); five
drawings, all approved. **Next is slice 3** — upload, the AI reading the PDF (ruled: sent to
the model, never extracted locally), and the proposed-rates table.

**Open for Mike:** 4.15, 4.58, 4.66 · and **whether 4.77 closes into 4.78** — its asset model
is now 4.78's dated purchase list. Not ours to decide; it is on 4.77's note.

🔴 **NEW: 4.81 — the forecast's tax rate and GST rate are New Zealand's, hardcoded, for every
country.** Filed at Mike's insistence at the very end of the session: this session had recorded
it as a gap he *had not asked for*, and he had — *"accurate per country"*, 2026-09-08. **Finding
that IR265 was a depreciation schedule justified renaming the feature, not shrinking his
request to match the document.** It rides everything 4.78 built, so it is small. Needs a
drawing first.

⚠ **Known deviation:** the new tab's strings are hardcoded English, like four of its five
siblings, against the i18n standard. Named in the component header.

**DESKTOP:** you were active today — `feat/firm-quiz-builder-ui`, 43 ahead. Nothing of yours
was touched. We share one Handbook link and each overwrite the other; ours was published last
tonight.
