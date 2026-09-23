# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-23 (evening) · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean, all pushed, 14 ahead / 0 behind. 617 suites / 13,464 green, lint 0 errors.**
`activeOn` clear here; 15.1 is yours and I touched none of its files.

### 🔴 FIRST THING TOMORROW: THIS BRANCH IS 14 AHEAD AND OWES A PULL REQUEST

**No PR is open** (checked 2026-09-23). The threshold in `WORKING-AGREEMENT.md` is **10**,
so this is already over — and *ahead* is the number that becomes the 97-commit drift,
because a machine can push faithfully every day and still reach nobody. `/startup` step 6
fires on this automatically; it is written here so it does not depend on that.

**It is Mike's yes, then `gh pr create --base master`** — never a direct push, which the
pre-push hook refuses. ⚠ **Merging it does NOT dissolve the 5.1 conflict below** — it
decides *when* the laptop meets it. Once this is on `master`, the laptop's next merge
flags that its `1bc1022b` edits a line inside an item this branch deleted. **Mike's
closure wins; take the deletion.**

### 🔴 ITEM 5.1 WILL CONFLICT ON MERGE, AND MIKE'S CLOSURE WINS

We both found the same stale sentence hours apart. Your `1bc1022b` corrected 5.1's note
(*"NOT WALKED IN A BROWSER YET"* → walked); **Mike closed 5.1 outright** (`c3536ad6`), so
the item is gone from the live list and your edited line goes with it. Three files show
conflicts: `to-do-items.json` (his closure wins), plus `to-do.md` and `CODE-SIZE.md` —
**both generated**, so regenerate rather than resolve: `npm run to-do`, `npm run handbook`.

### The list went 28 → 18. Every one is Mike's own call, written in as it was given

**Done:** 9.1 (48/48, wired, walked — UAT remains) · 5.1 · 7.5.
**Parked, each with what un-parks it:** 8.1 (OpenAI's ZDR review, nothing granted) ·
11.1 (identity is Advisor-e's) · 5.2 (a real payroll export from Mike) · 7.6 (his own
16 Sept ruling, never moved off the list) · 7.3 (three design questions + DeepSeek).
**Deleted:** 7.12 — every fault it was filed over was already fixed, improved, ruled not
a defect, or forbidden to touch. Its orphaned build steps in `advisory-engine.md` now say
they are reference, which is what would otherwise have rebuilt it.
**Fixed:** 9.3 — the sharing badge has three states; *"Sharing paused"* is Mike's wording.

### 🔴 THE RULE THAT CAME OUT OF TODAY — read it in `CLAUDE.md`

*"EVERY TASK ENDS WITH MIKE'S CALL ON THE ITEM"* (`bfe9f507`). Name the item, say what it
now is, ask **proceed / done / park / delete**, write the answer in **that moment**.
**His answer in chat is the supported route** — the Handbook's Save button downloads a file
somebody must then apply, and that has happened **once since 15 August** against **492**
direct edits.

Why it was needed: **his top four were all finished, blocked or "do not wire" while still
sitting at the top as live work**, so picking from the top was guaranteed to pick something
undoable — and did, twice, before he stopped it.

⚠ **`waitingOn` said "Mike" on five items where it shouldn't have.** Check it against the
note *and* the commits before believing it.

### Two things the checks now catch that they didn't this morning

- **A machine that is BEHIND master is no longer invisible** (`63b1a63c`). `ahead > 0`
  alone hid the laptop at 0 ahead / 3 behind, and `/startup` then licensed reading that
  silence as "both machines level". It isn't a claim the check ever supported.
- **"Check the code" now means the commits too.** 5.1's browser claim was false and three
  records said so — `git log --grep "<ref>"` shows them in one command.

### Integration asks no longer depend on an email

`WORKING-AGREEMENT.md` Integration **step 6**: every release cut writes notes with a
**"What we need from you"** section carrying all ten questions. The draft email had sat
unsent since 15 August. Don't propose sending it.
