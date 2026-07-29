# Session Notes — 2026-07-30 · Desktop (firm-editable tables / logic trees)

> **Nothing is unsaved.** Branch `feat/firm-quiz-builder-ui` = `origin` (21 ahead, 0 behind
> `master`), working tree clean. Suite **1,972 green / 133 suites**, lint 0 errors, audit
> gate clean (one accepted build-time critical, the known `ejs` advisory).
>
> **🔴 PR #25 IS OPEN AND UNMERGED — it needs Mike, and only Mike.**
> [PR #25](https://github.com/advisor-e/Virt-Advisor/pull/25) · base `master` ←
> `release/domain-support-migration` · 20 commits · GitHub reports **CLEAN / MERGEABLE**
> (fast-forward).
>
> **Laptop: you are currently FINE — `origin/feat/advisor-progress` is 0 behind / 30 ahead of
> `master`.** But **the moment #25 merges you are 20 behind**, so
> `git fetch origin && git merge origin/master` before starting work. Drift caught at 20 is
> free; it was 97 the time it hurt.

---

## The one thing the laptop most needs to know

**PR #25 is a frozen snapshot, not a live branch — and one fix from today is deliberately
NOT in it.**

`release/domain-support-migration` is pinned at `3064a71`. The last commit of the day,
`8b93df6` (the Growth Framework ruling), landed on `feat/firm-quiz-builder-ui` *after* the
snapshot was cut, so it reaches `master` in the **next** PR. That is by design, following the
PR #23 → #24 lesson from 2026-07-28: a pull request tracks its head *branch*, not a commit, so
pointing one at a live branch silently drags tomorrow's work-in-progress into a merge that
was reviewed without it.

**Do not "tidy this up" by repointing #25 at the live branch.** If the fix is wanted in the
same merge, cut a new snapshot and open a new PR; do not move the goalposts under a PR that
has already been reviewed as a fixed unit.

---

## What shipped today

**The domain-support storage-key P1 — FIXED (`7dd83fd`).** The save routes stored per-domain
config keys (`domain-support-<id>`) while both engines load a single `domain-support` bundle.
It worked only by accident in dev, where both sides fall back to the same file; **on MySQL
Firm Manager would have reported "saved" while the firm's content silently never reached the
AI.** One file changed (`server/routes/firmManager.js`), no engine file touched. A
`__proto__` exposure created by moving from key-strings to object keys was closed in the same
change. Fixed while nothing was stored yet, so no data migration was needed.

**Ghost logic-tree references — 29 → 0, the list is now completely clear.**

- `bd7dc63` + `3064a71`: five page names that had been **retitled upstream in Advisor-e**,
  proved from each page's own slug (`planning-session` → "Lite Planning", and four siblings).
  28 references across 7 trees, plus 7 prose mentions inside tree `notes` (the AI reads
  those too). Name swap only — Mike's sentences are otherwise byte-unchanged.
- `8b93df6`: the last one, `Growth Framework`, which needed **Mike's ruling rather than a
  lookup** — the source PDF names a *framework* where every other branch names a page, and
  in the library it is a subSection holding six pages. **Ruled: Growth Curve** — the only one
  of the six carrying `includedInClient`, and the one whose purpose is aligning "their
  contextual position", i.e. the branch note's "pick a spot on the curve".

**⚠ Two things about that work worth carrying, both recorded in `ACTIONS.md`:**

1. **`scripts/migrate-ghost-references.js` must never be run on these.** It *deletes* what it
   cannot resolve, which would have stripped **28 correct recommendations** — 13 from
   `systems` alone — after which the trees would have validated clean while recommending
   nothing. A worse state than the warning, and invisible.
2. **A boot warning is not a control.** This one had been logged and carried for days. The
   new `tests/unit/logicTreeTemplateNames.test.js` fails the build on any dead reference,
   anchored to the **committed** `data/templates.json` rather than the gitignored export —
   which would make it pass vacuously on a fresh clone and in CI.

---

## Behaviour changed on purpose — do not read these as regressions

Reconnecting dead references means rules that recommended **nothing** now recommend
something. Measured through the production soft-hint path, never assumed:

- **The five retitles:** 4 of 7 affected trees moved their deterministic top-6 — `systems`,
  `client_sales`, `cashflow`, `cash_tactics`.
- **Growth Curve:** now earns `tree_hint:+3`, entering the AI shortlist in **3 of 8**
  plausible domains and changing the advisor's cards in **1 of 8** (people-power:
  *8 Profit Levers* → *Growth Curve*). Unchanged in `strategy`, the likeliest domain for that
  conversation, because `TREE_HINT_BOOST = 3` is deliberately too weak to beat that domain's
  own matches. Guide, not replace, working as designed.

**Measurement traps hit today, both worth knowing before measuring anything similar:**

- **`scoringLog` is capped at 20 rows** (`templateResolver.js` L622). My first run read
  "absent from the log" as "unscored" and under-reported the effect. Measure the AI shortlist
  (`candidates`) and the displayed cards (`buildDisplaySet`) instead — that is what reaches
  people.
- **The Scenario Lab is structurally blind to this** — 0 of its 51 cases reach that branch, so
  a green lab run is not evidence here. No lab delta is claimed. (Same blindness the
  entry-node work recorded.)

---

## Where the workstream stands

Domain-support content migration is **complete — 29 of 29 domains** on the four-column
standard; no repo file remains on the legacy `support_tools` shape. The two firm-editable
tables (Domain Support, Logic Tables) are fully live: edit, save, reset, history, grouping,
re-filing, hide-list.

**Next task, if nothing overtakes it: Job 2** — fold each material's genuine how-to Q&A into
the Step-by-step column, cross-checked against the 10-question quiz banks. It is the last open
piece of the domain-support workstream.

## Open, and needing Mike rather than code

1. **Merge PR #25.** Nothing else can do it.
2. **The migrated content of 28 domains has never been read on screen.** Mike's instruction on
   2026-07-29 was to migrate them all and review in-app rather than approve each draft in
   chat, so that review is still outstanding. The tests prove the shape renders and saves;
   they cannot judge whether the words are right.
3. **Six carried-over rows with no source document** — four in `fm-coach-culture`, two in
   `org-board-pack`. Live engine content today, so they were carried across rather than
   deleted, and are visible as ordinary rows to remove in-app. Keep or delete is his call.
4. **One reading artefact**, left deliberately: `sys_b4a_sixsigma` now reads "…from **the
   Lite Data**…" — grammatical but awkward, because the old title absorbed the article and the
   new one does not. Fixing it means deleting a word of his prose, a different act from
   correcting a page name.

## Found today, not fixed (logged, needs its own approval)

- **P3 · TEST** — the allowlist test in `logicTreeTemplateNames.test.js` checks an entry is
  still *absent from the library*, but not that it is still *referenced by a tree*, so a name
  that falls out of use would leave a stale exemption behind. Nothing is stale today (the list
  is now empty), which is why it was logged rather than folded into that change.
- **P2** — give Logic Tables the same **per-table restore** now proven on Domain Support
  (lift one key out of the old bundle).
- **P3** — the seven `get-*` file names exist twice in `firmManager.js`; collapse to the
  hoisted constant.
