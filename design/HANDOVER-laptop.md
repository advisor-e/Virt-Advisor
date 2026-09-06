# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-07 · Laptop · branch `feat/advisor-progress`

Suite **8,059 green** (415 suites), lint **0 errors**. Five commits, each through the full
gate. Everything pushed. Nothing uncommitted.

### 4.66 — nine live faults, and the green tests caught none of them

Ran it end to end in a real browser for the first time. That is the whole story of today:
everything below was invisible to 8,000 passing tests.

- 🔴 **The citation guard refused HALF of all live runs, and was wrong every time.** It read
  the digits inside a source's web address (`/dmsdocument/10808`) as a restated figure, so a
  §4 returning to a source used earlier — which §3 of the prompt *asks* for — lost the whole
  document. **2 refusals in 4 runs before, 0 in 3 after.**
- 🔴 **The research date was missing from the client's printed pack entirely.** `$d()` returns
  an empty string when the format it is asked for does not exist, and none was ever configured.
  It printed "Run 1 · researched · 13 sources". It is on the PDF from 2026-09-06; nobody saw it.
- **The date sent to the model was UTC** — yesterday, for an advisor at UTC+12.
- **English dates printed US-ordered** while the same pack's prose was day-first.

**Mike ruled the assessment date onto a field of its own** (step 5, defaults to today, echoed
in the send box). Both wordings his. Proven live: a chosen 31 August 2026 came back as the date
the research was assessed from.

### 🔴 DESKTOP — read this before you touch dates or i18n

- **`plugins/i18n.js` changed and `utils/dateLocale.js` is new, and both are SHARED.**
  `$d(date, 'long')` alone now returns the American order — call
  `$d(d, 'long', intlLocaleFor(this.$i18n.locale))`. There are only three call sites, all in 4.66.
- **Your branch is 4 ahead of master with a `4.67` I cannot see.** I filed **4.69**, skipping it,
  rather than risk the collision that renumbered 4.56 and 4.62.
- **Your handover is still dated 2026-09-04** though you committed twice today.

### Next

**4.69 filed** (score 2, ours): a **future** assessment date may leave the research unsourced —
30 November was refused after one search, 31 August ran normally. **Seen once: reproduce before
touching anything**, and do not bound the field first; the fix may be a sentence in the prompt.

**4.66 stays `activeOn` this laptop** — built and pushed, but 4.69 sits in the same files.
**Nine live items.**
