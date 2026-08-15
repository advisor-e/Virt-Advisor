# Session Notes — 2026-08-15 (D) · Laptop, Session 59

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,341 green / 309
> suites**, lint **0 errors**, **47 ahead / 0 behind `origin/master`**.
>
> ⚠ **Application code was touched in two places:** `server/utils/coaching.js` (one
> function signature, backward-compatible) and `server/advisorEngine.js` (one new load,
> threaded to two prompt builders). Two new backend files and one new test file.
> `components/`, `pages/` and `store/` are untouched.

---

## 🔴 FIRST TASK NEXT SESSION — ask Mike, do not pick

The batch he approved has **one item left that needs nothing from him: 4.7**, flipping
`engine-strict` back on. ⚠ **It needs an overnight window on this laptop, not an answer** —
the reinstall is the slow part. Ask him when, do not start it in a working session.

**4.12 is now waiting on Mike and the reason changed** — see below. It is no longer the
answer-free job it was filed as.

---

## What happened

**Mike's instruction:** *"review all tasks in the to do list that relate to technical
issues — not the fine tuning of doc titles etc — and batch them into a list of tasks that
do not require answers from me."*

The batch came out at **three items, not seven**: 4.12, 4.9 and 4.7. Everything else either
needs his words (2.6, 2.9), needs page names only he has (4.15), or is a message to a
person (3.5). He approved the batch and it was worked in his own recorded order.

### 🔴 4.12 turned out not to be answer-free — corrected to him mid-session

**The two documents are not in this repository.** `START-HERE.md` and `HANDOVER.md` live in
a **separate repo** — `C:\Users\mb\Projects\Advisor Collaborate`, branch `main`, last commit
`626da83`. Verified: they have never existed in this repo's history.

**The risk on the to-do list is real.** START-HERE.md hands the master team a checklist to
provision a MySQL instance for *that* app, fill SQL seams in *that* app's
`server/data/repository.js`, and answer five questions about *that* app's auth — while
Collaborate's code has been merged here since `8215bec` and runs off *our*
`config/integration.js` and *our* pool.

**Two calls are Mike's, and both are open:**

1. **Where the fix goes** — edit the other repository, or write one handover here that
   supersedes it.
2. **What it should describe** — the plan ties this to slice 3's "widened scope model", and
   ⚠ **slice 3 has not been done**: `firm_framework_versions` is still keyed on `firm_id`
   alone and `scope_level` appears nowhere in `server/` or `config/`. The mentor tier was
   solved with the `__platform__` sentinel scope instead. Whether slice 3 still happens is
   not ours to decide.

**Also found:** that same START-HERE page carries **the identical `engine-strict` job as our
4.7**, filed there as `P1-TOOLCHAIN`. The same task is open in two repositories.

### ✅ 4.9 — the engine half, built (`869909c`)

The coaching reference was the fifth block named in the 2026-07-30 ruling and the only one
that never joined `resolveInheritedRows`. It does now, for every tier.

🔴 **The thing worth knowing, and it is not in the diff.** The key `coaching-reference`
already existed and the obvious wiring was to inherit through it. **It does not hold
platform guidance** — it holds a firm's promoted case observations, an advisor's free text
about a real client, which reaches the model **fenced**. Folding the two together would have
stripped that fence off every promoted entry: a prompt-injection hole with nothing on screen
to notice it by. They now live under different keys, resolve through different code and
render into different prompt sections, and four tests fail if they ever meet.

`template` is not editable on an inherited row, and is stripped **on the read** rather than
left to a save route that does not exist yet — a rule that lives only in unwritten code is
not a rule.

⚠ **Nothing here is visible to anyone.** There is no coaching tab in the Firm Manager Hub —
no component, no route — so no firm can make a decision for this to resolve. **That screen
is Mike's to look at and was deliberately excluded from the batch.** He knows; it was said
before the work started and again after.

---

## ⚠ What is open, and honestly

1. **4.7** — the only remaining answer-free item. Needs an overnight window.
2. **4.12** — now needs two decisions from Mike (above).
3. **The Firm Manager coaching screen** — the visible half of 4.9. **Not filed as an item**,
   deliberately: filing it would be us asking for our own work again. Raise it with him.
4. **The new release number** — 2.1 is still parked and nothing replaces it. Carried from
   session 58, still his call, still unraised.
5. **Two Brief links are still broken** — `tier-cascade.md` → `collaborate.md` (never
   existed) and `to-do-done-and-parked.md` → `../STATUS.md` (deliberately deleted). Verified
   this session. Mike was told; he has not ruled. **Not added to anything.**

---

## 🖥 FOR THE DESKTOP

**Nothing of yours moved.** Logic Lab, every firm-side component and every page are as you
left them.

**Two new backend files you may not have:** `server/utils/coachingConfig.js` and
`server/utils/firmCoachingReference.js`. If you are about to touch coaching, take ours.

**One signature changed, compatibly:** `coaching.formatCoachingForPrompt()` now takes an
optional resolved-rows array. Called with no argument it renders the shipped file exactly as
before, so no existing caller needed editing and none was edited.

🔴 **If you add anything to the coaching reference, keep the two kinds apart.** Platform rows
(`cr-*`, and the tier prefixes `mc-` / `xc-` / `gc-` / `fc-`) are trusted guidance. The
promoted entries under `coaching-reference` are fenced user text. The tests will stop you,
but knowing why is better than being stopped.

---

## ☐ Open for Mike — one new, three carried

1. 🔴 **4.12 · where the corrected handover lives, and what it describes** — new this
   session.
2. **4.7 · when the overnight reinstall can run** — a time, not an answer.
3. **2.6 · `advisor_note`** — one word: yes. Carried.
4. **2.9 · the education-gate wording** — his own design. Carried.
5. 🔴 **The new release number** — carried from session 58, still uncovered.
