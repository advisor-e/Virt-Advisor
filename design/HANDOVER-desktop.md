# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Desktop · branch `feat/firm-quiz-builder-ui`

**ITEM 17 IS COMPLETE AND MERGED — [PR #109](https://github.com/advisor-e/Virt-Advisor/pull/109).**
Clean, pushed, 0 behind. Suite **13,342 green** (600 suites) — **after merging your PR #108 in**.
Nothing is in hand on this machine; `activeOn` is clear. **Your 7.5 and 15.1 untouched.**

⚠ **YOUR 20 COMMITS CAME ACROSS AT MY SHUTDOWN and the list conflicted — resolved by keeping BOTH
sides.** We both appended to `to-do-items.json` today: my `13.4` against your `15.13/15.14/15.15`.
All four survive, 34 items, refs verified unique. `to-do.md` and `CODE-SIZE.md` also conflicted and
were **regenerated from source**, not hand-merged. **Handbook republished** from the master that
now holds your work — it refused my first attempt because you had published yours minutes earlier.

Stage 5's screen was built, then stage 6 **skipped on Mike's ruling** and stage 7 found **already
done** — stages 2–5 had absorbed all three of its parts. Closure in `to-do-done-and-parked.md` §2.

### 🔴 LANGUAGES — I had this BACKWARDS, and so did a session before me

**The app translates into all 28 languages.** Only `en.json` is authored; any unshipped language is
POSTed to `/api/translate/locale`, translated once and cached per browser. **The eight static locale
files are a partial HEAD START, not the supported list** — their emptiness is expected, not a
backlog. I told Mike the opposite and it went into a ruling's stated reason before I caught it.

Because that folder has now been misread twice, the fix is three surfaces, not a paragraph:
`localisation-and-currency.md` **§1a**, a new **`locales/README.md`** where the misreading actually
happens, and **`tests/unit/languagePolicy.test.js`** (5 tests, mutation-verified). **Stage 6's
ruling is unaffected and better supported** — it would have been a *second* translation system.

### NEW 13.4 — a client-level currency, on Mike's ruling

*"currency is selected at firm manager level and cascades down to the client level model library
but at client level … the currency can again be edited by the advisor."* Three levels, not two.
**The client half does not exist at all** — `currencyMixin` holds one `firmCurrency`, and
`firmOverlay` is firm-scoped with no `saveClientConfig`. Backend work, not a screen change.

🔴 **It is NOT the per-client currency he rejected earlier the same day** (see 13.2's comment) —
that was a second *firm-level* setting carrying conversion maths; this is a **label**, defaulting
to the firm's, with conversion still inside models on `fxAllowancePct`. The item says so itself.
**13.1 is now load-bearing** and ships with it: a client-level relabel reads as a conversion far
more readily than a firm-wide one.

### Notes

- **LAPTOP — shared files I touched**: `locales/en.json` (a `salesBlog` block),
  `components/FirmManagerHub.vue` (untouched today; stage 4's tab counts were yesterday),
  `design/features/localisation-and-currency.md` (§1a, §3, P6),
  `design/features/to-do-items.json`, `to-do.md`, `CODE-SIZE.md`.
- **Three faults found by OPENING the app, none by 13,197 tests** — recorded in the closure entry.
  One defect deliberately filed rather than fixed: `SalesBlog.vue` puts `is-primary` and `is-info`
  on two adjacent buttons, an instance of **16.1**.
- **Open for Mike on 13.4 when he ranks it**: where the advisor edits the client's currency.
  Stored against the **client**, not per advisor per client.
