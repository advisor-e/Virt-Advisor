# Session Notes — 2026-08-14 (C) · Laptop, Session 54

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,272 green / 308 suites**, **0 ahead / 0 behind `origin/feat/advisor-progress`**,
> **26 ahead / 0 behind `origin/master`**.
>
> ⚠ **Application code WAS touched.** `components/VirtualAdvisor.vue` (substantially),
> `server/advisorEngine.js`, `locales/en.json`. No dev servers were started or restarted.

---

## 🔴 FIRST TASK NEXT SESSION — get the release out

**26 commits are waiting and nothing is behind `master`.** Mike's own §0 ruling is that a release
to the master coding team is the priority, and item **2.1** has been sitting unanswered: `v0.8.0`
is tagged and pushed and nobody outside has been told it exists. v0.6.0 was never pulled at all.

Do not start §4.6c (the batch write) instead. Mike named that class of work as beta-stage detail
that must not hold a release.

---

## What was done — five commits

| Commit | What |
| --- | --- |
| `5754aae` | The authored-commentary **read is COMPLETE** — 29 of 29 domains, 194 of 194 materials |
| `bf9c7fe` | 87 interface strings out of `VirtualAdvisor.vue` into `locales/en.json` → `advisor.*` |
| `7f69a74` | The retired primary-issue selector deleted — ~100 lines, plus a duplicate of the Workshop 1 list |
| `a168123` | The engine now acts on a **calm** correction, not only an annoyed one |
| `3c6752f` | Three Briefs corrected; four items moved to the done page; `ACTIONS.md` updated |

---

## 🔴 The lesson worth keeping — a backlog title is a claim, not a fact

**Two items in a row were mis-titled in ways that would have produced real work with no effect.**

- **4.5** said *"hardcoded English on the report screens and parts of the advisor screen"*. The
  report screens never had the problem — every apparent hit was inside a JSDoc comment, and
  `BusinessPerformanceReport.vue` already maps the backend's workbook value through `$t()`. The
  whole item was **one file**. Measuring turned an open-ended item into a single session.
- **4.5a** said *"de-duplicate the primary-issues list"*. Both copies fed a screen that **cannot be
  reached** — the selector was retired from intake 2026-06-10 and nothing emits its marker. Wiring
  one copy to the other would have been busywork on dead code. The honest fix was deletion.

**Measure before believing an entry in `ACTIONS.md` or `to-do.md`.** This is now written into the
done page and into `ACTIONS.md` itself.

---

## The defect found by asking a question properly

Mike asked *"will your suggested actions fix the issue?"* — and checking rather than answering
found a real, silent fault.

The engine asks *"I'm reading this as a **X** situation — have I got that right?"* That answer
re-routes the whole recommendation. **It only moved if the reply contained the entire label:**

| The advisor says | Before | Now |
| --- | --- | --- |
| "No, it's really about staff" | ignored | switches |
| "No — it's a staff problem" | ignored | switches |
| "Not quite, it's more about profit" | ignored | switches |
| "You've got it wrong" | full reset | full reset |
| "Yes — staff costs are squeezing their margins" | ignored | **holds, deliberately** |

**The engine answered annoyance and ignored a calm, specific correction** — and failed silently,
so the advisor believes they were understood while the advice stays wrong. Fixed by
`resolveDomainCorrection`, deliberately conservative: **a wrong switch is worse than no switch**,
so it moves only when exactly one *other* area is named and the current one is not. Eleven failing
tests written first. Rule now in [`features/virtual-advisor.md`](features/virtual-advisor.md) P9.

---

## 🖥 FOR THE DESKTOP

**Merge `master` before touching either of these:**

1. **`components/VirtualAdvisor.vue` changed a lot.** 87 strings became `$t('advisor.*')` calls,
   and ~100 lines were deleted (the primary-issue card, its state, three methods, its styles, and
   the `PRIMARY_ISSUES` const). If you have work in this file, expect conflicts.
2. **`server/advisorEngine.js` gained `resolveDomainCorrection`** and the `domainConfirmed`
   `onAnswer` now calls it. One small, contained change.

**Nothing here went near your ground** — Logic Lab and the firm-side logic-table screens are
untouched. `locales/en.json` gained a new top-level `advisor` section; nothing existing was
renamed or removed except the three selector-only keys.

⚠ **If you move any screen's strings into the wording layer, add that screen to the walk in
`tests/unit/i18nMessages.test.js` in the same change.** An unresolved key does not throw — vue-i18n
prints the key on the button and every other test still passes.

---

## ⚠ Two honest limits

1. **Never seen in a browser.** The 87 moved labels and the deleted screen are proven by 5,272
   tests and a key-resolution check, not by use. Pairs naturally with §4.4.
2. **The correction fix is proven on the matching function**, not end to end in a live session.
   The eleven cases cover the realistic phrasings and the false-switch traps.

---

## ☐ Open for Mike — ten decisions

All on [`features/to-do.md`](features/to-do.md) §2. **The new and most consequential one is
§2.10 — Net Promoter Score.** The Client Survey teaches it in full and none of that vocabulary
appears in any of the 113 firm documents. It is not a commentary mark; it is a method we added.
His answer maps to one of three specific actions and one of them happens either way.

**Also his:** §4.1–4.4 (four one-line jobs), and §4.6b (two undeclared edits to the firm's words).

**Ours, still open:** §4.5c (the orphaned `__none_of_these__` handler, now provably unreachable),
§4.6a (21 rows with no source), §4.6c (the batch write).
