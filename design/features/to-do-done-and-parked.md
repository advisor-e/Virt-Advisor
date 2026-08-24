# To-Do — Done & Parked

> **Read [`to-do.md`](to-do.md) first.** That page is what is live. This page is what is finished
> and what is deliberately waiting, kept so that nothing is forgotten and nothing has to be
> re-derived.
>
> **Parked is not the same as forgotten.** Every item in §1 was paused by a decision, and the
> decision is recorded with it. If somebody proposes one of them as new work, the answer is here.
>
> 🔴 **And deleted is not the same as parked.** §0 below lists what was cut on 2026-08-15 for
> failing the product test. Those items are gone from the list and gone from the codebase. They are
> recorded here so nobody re-derives them, **not so they can be revived.**

---

## 0. Deleted 2026-08-15 — the audit that cut the list from 31 items to 15

Mike asked for a full review: every item checked against the code, and against whether he had ever
asked for it. His instruction: *"unless I specifically asked for it, unless it meets all my criteria
for building a better app, I want it deleted — off the list, not parked."*

**Four things the audit found, and they are the reason the rules on [`to-do.md`](to-do.md) §5
changed:**

1. **§2.7 had been built on 2026-07-29** and still read *"not to be built either way without your
   answer"*. Seventeen days. The per-question quiz record ships with no free text, enforced on the
   way in and on the way out, pinned by tests.
2. **Three items were one item.** §4.11 (reconcile the two data layers) and §5.3 (advisor profile
   off browser storage) were both §3.1 — there is no database. One blocker, written three times.
3. **Two items existed to maintain a file nobody reads.** §2.8 and §5.4 both served
   `design/STATUS.md`, a generated view of the 6,135-line `ACTIONS.md` that this very list replaced
   as the front door. Last generated 2026-08-03. **STATUS.md, `scripts/generate-status-table.js`,
   its test and the `npm run status` script are all deleted.**
4. **The whole of section 5 broke the list's own rule** — *"a warning is not an item"* — under a
   heading that admitted *"no user impact"*.

**Deleted, with the reason each failed:**

| Item | Why it went |
| --- | --- |
| 2.4 · Annual plan name | A working name already in use; nothing broken and nothing blocked |
| 2.5 · Five roll-up labels | Locale strings already on screen; nothing broken |
| 2.7 · Quiz free text | **Already built 2026-07-29** — the recommendation was implemented, not left open |
| 2.8 · STATUS.md staleness | Machinery for a stale copy of a superseded file |
| 4.3 · Point CLAUDE.md at ARTEFACTS.md | Paperwork about paperwork; serves no user |
| 4.10 · Extend the invisible mode swap | Written as *"Ruled:"* — **no record anywhere of who ruled it**, and not Mike as far as the repo shows |
| 4.11 · Reconcile the two data layers | Duplicate of 3.1 |
| 5.1 · Large components | A warning, not a task; no user impact by its own heading |
| 5.2 · Sparse doc comments | Same |
| 5.3 · Profile off browser storage | Duplicate of 3.1 |
| 5.4 · Status table "paused" marker | Went with STATUS.md |
| 5.5 · Six firm-editable blocks | A menu of possible features nobody requested. If one is wanted it is a new request |
| 2.2 · The four missing hub tabs | Deleted later the same day — see the box below, which exists so nobody re-raises it |
| 4.13 · Make a silent save failure loud | Deleted 2026-08-15 by Mike — scored 5, reaches no user; see the second box below |

### 🔴 2.2 — the four hub tabs, and why this is a DELIBERATE, RECORDED deviation

**Do not re-raise this.** The code shows fewer tabs than
[`../mockups/tier-hub-pages.html`](../mockups/tier-hub-pages.html) §2 draws, and that is now a
decision rather than an oversight. The mismatch is real and was verified cell by cell on
2026-08-15 — the approved table gives the **Mentor** hub *Team Progress* and *Team Case Studies*,
and the **Firm** hub *Case Reviews* and *Logic-Lab Report*; `TAB_TIERS` in
[`../../components/FirmManagerHub.vue`](../../components/FirmManagerHub.vue) gives none of the four.

**The work this belonged to is finished.** All four hubs were built on 2026-08-10/11, the reports
were wired to roll up, `getTeamRollup` handles every level above a firm, and Template Check was
narrowed to the mentor on Mike's own word. What remained was four cells in a tier table — not four
features.

**Mike's ruling, 2026-08-15, after asking what it was actually for:**

- **The mentor's two would display invented firms.** Nothing in our data records which firms belong
  to which group (§3.3), so the tab would show the development placeholders. A screen only
  Advisor-e staff see, showing fabricated data, serves nobody.
- **The firm's two are new work nobody asked for.** Both routes are guarded by
  `requireManagingTier`, which rejects the firm outright. Widening it means re-scoping the roll-up
  and taking a privacy decision about a firm manager reading its advisers' client case reviews —
  for a feature that exists only because we drew it.
- **A mismatch with a drawing is not a defect.** Nothing is broken; the tabs are absent, not
  faulty. The product test asks whether it serves the user, improves quality or robustness, or
  improves marketability. All three answers are no.

**If the master team ever supplies the group membership data, the mentor's two are two lines on the
day it matters** — and they will show something real. That is the right moment, not now.

⚠ **The code comment in `TAB_TIERS` was left untouched.** Its stated reasoning — that Team Progress
*"has no meaning at the mentor"* and that the accuracy reports are read *"at every managing tier
above the firm"* — is not Mike's and runs against
[`tier-cascade.md`](tier-cascade.md) **P4** (*"no per-report exceptions, ever"*). It is recorded
here rather than rewritten there, because rewriting a comment on working code is exactly the
make-work this audit exists to stop. **The deviation is the record; this box is where it lives.**

**Done in the same pass rather than left on Mike's plate:** §4.1 (the laptop's branch was wrong in
`/startup` and confused this session), §4.2 (the one dead Handbook link — `relink()` needed
`[^"]+` → `[^"]*`), §4.5c (the unreachable `__none_of_these__` handler, deleted). §3.4 was merged
into §3.2 and §3.3, being the action they wait on rather than a task of its own.

⚠ **§4.4 could NOT be done here and is honestly still Mike's.** Opening the Handbook, editing a
word and reloading needs a real browser; this machine has no browser automation, so no session can
prove it for him.

### 🔴 4.13 — a SCORE 5 that could not reach a single user

**Deleted 2026-08-15 on Mike's call**, at the top of the very next session, after it had been
presented to him as the highest-scoring job on the list.

**What it claimed.** When no database answers at all, every store falls back to a gitignored
`data/dev-*.json` file and the route returns a normal success reply, so the screen says *Saved*.
That is all true, and it is exactly what happened to a course on 2026-08-14.

**Why it went.** Mike's question was *"who is this function for?"*, and the honest answer kills the
item. `devFallbackAllowed()` can only fire where there is **no database at all** — which is a
developer machine and nothing else. **UAT has MySQL. Production has MySQL.** Production mode
refuses the fallback outright ([`UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md) §5 already tells the master
team to run that way). No adviser, no firm and no client can reach it. Against the §2 scoring table
a 5 requires that *someone's data could be lost without anyone noticing* — the only "someone"
available is us, and we already know.

**In his words:** *"I know I'm in a development role… the UAT and production have MySQL connected —
I know this, you know this, why are we wasting time?"*

**🔴 What must NOT be revived, and what must NOT be touched.**
- The task is dead. The scored-5 framing was wrong; by the list's own table it was a **1**.
- **The v0.8.0 half is real and stays.** [`server/utils/dbFailure.js`](../../server/utils/dbFailure.js)
  stops a write that a **live MySQL refused** from reporting success. That one *does* bite in UAT and
  production, where a server is present and can say no. Deleting the task deletes no code.
- **The fallback itself is a feature, not a defect.** Without its read half every screen on a
  developer machine is blank; without its write half no journey can be walked to its last click.
  Three fixes were proposed in this conversation — a warning banner, blocking writes, and reworded
  save confirmations — and **all three were wrong**. Do not re-propose them.

**The lesson, and it is the same one as 2026-08-15's other two.** The item's own *Asked by* field
said ⚠ **found by us**. It was written honestly, scored by us, ranked by us, and put in front of
Mike as priority three. **The field worked; nobody read it.** A score assigned by whoever found the
thing is not a priority — it is the finder's own opinion wearing a number.

---

## 1. Parked by your own ruling — these are decisions, not tasks

*Nobody should re-raise these as open work. If circumstances change, the ruling changes first.*

**4.21 · Correct the three proven faults in the property source workbook.** 🗑 **Deleted 2026-08-17
by Mike, the same session it was filed.** In his own words: *"im not fussed about fixing the
workbook, so longs as the code is strong and backed up in github we don't need it again."*

- **What it was:** three faults proved from the cells of
  [`../report-source-models/Multiple Property Assessment.xlsx`](../report-source-models/Multiple%20Property%20Assessment.xlsx)
  and corrected in our code the same day — the interest-only balance zeroed with nothing repaying
  it, the residual repayment's flipped sign, and year 1's weekly figure returning 0 when positive.
  The item asked for the workbook itself to be corrected, under the standing rule that a proven
  source defect is fixed in the code **and** the `.xlsx` so the two cannot diverge.
- **Why it is deleted and not done:** the workbook was the *source*, and it has now been read. What
  it knew is in [`../../server/report/multiplePropertyModel.js`](../../server/report/multiplePropertyModel.js)'s
  header, in §6 of [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md), and
  in 55 golden tests that carry its cached values **with their cell references**, so any figure can
  still be checked by hand without opening it.
- 🔴 **The standing rule is not repealed.** *"Correct the code and the source"* still holds for the
  next workbook. This is one owner decision about one file whose job is finished — **not a new
  precedent that source defects may be left standing.**
- ⚠ **The workbook IS opened again, once: Phase 2 (item 4.19)** reads it for properties 2–5, the
  apportionment and the consolidated report. **Those four blocks are copies of the first, so all
  three faults are waiting there** — apply the corrections already worked out rather than
  re-deriving them. That warning now lives on 4.19 itself, where it will be read.

**2.1 · Send the master team the release number.** ⏸ Parked 2026-08-15 by Mike, from the Handbook
control. In his own words: *"we will need to issue a new release. we missed last weeks deadline and
have added new features since."*

- **What it was:** `v0.8.0` was tagged and pushed on 2026-08-14 and nobody outside was ever told.
  It had been the list's only blocker on other people for four sessions.
- **Why it is parked and not done:** announcing `v0.8.0` is now the wrong thing to announce. The
  deadline it was cut for has passed and work has landed since — three commits on the ranking
  control alone, on the day it was parked.
- 🔴 **This does not mean the release stopped mattering.** It means the *number* changed. Nothing on
  the live list covers cutting the newer release, and that gap is deliberate.
- ✅ **AND THE GAP IS NOW ANSWERED — Mike, 2026-08-15 (session 60):** *"lets sort the new release
  number when we've sorted all the tech issues, till then stay focused on the tech issues for uat
  testing."* **It is sequenced after the technical list, not waiting on him.** This line used to
  read *"it is Mike's to say whether it becomes an item"*, which is what put the question in front
  of him in sessions 58, 59 and 60 — three times, for a decision he had already made by parking
  this item. **Do not raise it again until the technical items on
  [`to-do.md`](to-do.md) are cleared.** See `to-do.md` §3.
- **Untouched and still correct:** the integration email at
  [`../MASTER-TEAM-INTEGRATION-EMAIL.md`](../MASTER-TEAM-INTEGRATION-EMAIL.md) and the load pack at
  [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md). Only the version number in them is stale. **Do not
  re-derive either.**

**Template Check queue, and the Logic Tables rewording.** Parked 2026-08-13 — sort them after
UAT testing.

**The state-management refactor.** Parked until the master app's UAT settles, then bundled with
the move off browser storage. A broad refactor under a live UAT changes the ground under the
testers for no feature gain. **The standard itself is unchanged** — this is timing only.

**The advisor-enablement distinction table.** Ruled 2026-06-22: keep the concerns separate.
Advisory Distinctions stay client-outcome only; "easier or safer for the advisor" is a separate
layer paired to Learn mode. ⚠ **Evidence is accruing that it is needed** — a live thread repeated
the exact miss it was meant to catch, recommending an advanced sales script to a low-experience,
compliance-focused advisor. Still parked, but the case is getting stronger.

**Broadening crisis detection to more advisory areas.** Build when a real session shows a missed
crisis, not preemptively.

**The primary-issue clarification.** Only a remnant remains — a clarification at recommendation
time, to be built if a real session produces a genuine fork.

**The case-study feedback loop** — real cases becoming suggested distinctions. The destination of
the whole distinctions design, deliberately out of scope for the cascade build itself.

**Splitting the course builder component**, and a percentage-display bug. Both kept in the general
tidying pile on purpose: pulling them into feature work balloons scope for little advisor-visible
gain.

**Two frameworks embedded in a prompt** could become firm-editable, or could consciously stay
locked in the prompt. Either is fine; deciding by accident is not.

---

## 2. Closed recently, with what proved it

**4.44 · The check two documents promised, now written.** ✅ Closed 2026-08-25.
`scripts/check-engines.js` · `npm run check:engines` · tests in
`tests/unit/checkEngines.test.js`.

- **The gap.** Item 4.7 brought the tree to zero engine offenders and turned
  `engine-strict=true` on — but that fires only for whoever runs the install, and the scan
  that PROVED the zero was written ad hoc and thrown away, as was the one that found seven
  offenders the same morning. `.npmrc` and 4.7’s own closure both pointed at a check that
  was not in the repository. An instruction naming a missing tool teaches readers that the
  instructions are approximate.
- **What it checks — three things, each of which fails the run.** Every installed package
  whose `engines.node` excludes the locked runtime; the packages req 2 forbids outright
  (`typescript`, `vue-tsc`); and the `@types/node` pin from item 4.41, so a drift
  back up the versions is reported rather than found a month later. Nothing looked for the
  banned names before — **4.41 exists precisely because nothing did**.
- 🔴 **The target is read, never typed.** The locked runtime comes from the root
  `package.json`’s own `engines.node`. A version typed into the script could drift from
  the lock it exists to enforce and would then report a comfortable zero against the wrong
  number. A root with no `engines.node` stops the scan instead of scanning against nothing.
- **Not wired into pre-commit or CI, deliberately.** A full `node_modules` walk is too slow
  for every commit, and `engine-strict` already hard-fails the install, which is the
  enforcement. This is the on-demand confirmation nobody had.
- **What proved it.** Nine tests over fixture trees, and they exist for one reason: a checker
  that reports green unconditionally is worse than no checker — that is the fault closed in
  **4.30** the same day, green and documented and doing nothing. They prove it flags a nested
  offender, a scoped offender, a banned package, a copy off the pin and a pin that has been
  deleted — **and that a compliant tree reports nothing at all**. Run live against the real
  tree: **0 offenders across 1,982 packages**, matching the throwaway scan of 2026-08-24
  independently. Suite **6,285 green** at verification — **6,281** once this item came off the
  list, four generated tests going with it — lint 0 errors.
- **The two sentences that promised it are now true.** `.npmrc` names the command, and
  4.7’s closure above no longer says the check is missing.

**4.40 · The `defu` advisory — reviewed, corrected, and accepted.** ✅ Closed 2026-08-25.
The review is in [`../SECURITY-AUDIT-NOTES.md`](../SECURITY-AUDIT-NOTES.md).

- **The item’s count was wrong.** It recorded four copies in the vulnerable range. There are
  **five physical copies**: `defu@2.0.4` (shared by `@nuxt/config` and `@nuxt/static`)
  and two separate `defu@5.0.1` are vulnerable; the copies under `@nuxt/telemetry` and
  `rc9` are **already patched at 6.1.7**. Four dependency edges had been counted as copies.
- 🔴 **The item’s "build-time only" was wrong.** It said none was reachable from the deployed
  runtime. npm classifies **all five copies and all four parent packages as production
  dependencies**. `@nuxt/config` loads the config when the SSR server starts;
  `serve-placeholder` is runtime 404 middleware. The general Nuxt 2 acceptance rests on
  *"build-time tools only"*, so this one could not borrow that reasoning and does not.
- **It is still safe, for a reason nobody had written down.** The advisory needs an
  attacker-supplied `__proto__` key in the **defaults argument**. All four call sites were
  traced: every one merges our own configuration — `nuxt.config` values or module options
  — and none takes request data. The code runs; the vulnerable path does not.
- **The fix was available and was deliberately not taken.** One unscoped `"defu": "6.1.7"`
  override would clear the advisory outright, and the compatibility evidence is good: every
  consumer uses only the base `defu(a, b)` call, none touches the three helpers renamed
  between 5 and 6, and 6.1.7 already installs in this tree under `engine-strict`. It was
  not done because CLAUDE.md’s npm-audit policy permits a fix *"only for packages outside the
  Nuxt 2 build toolchain"* and every copy arrives through the locked Nuxt 2.14.0 chain.
  **Mike’s ruling, 2026-08-25: *"we stick to the rules"*.** The full option is recorded in the
  security notes so it is not re-derived.
- **What this item actually needed was the review, and this was it.** The audit policy’s
  counterweight is that every high finding is *logged as a task and reviewed*, never silently
  swallowed. Reviewing it found two factual errors and left the conclusion unchanged.

**4.41 · A package the Constitution bans by name, and why it cannot leave.** ✅ Closed
2026-08-25. Pinned in `package.json` overrides; the reasoning lives in `.npmrc` beside it.

- **Two of req 2’s three names were already clean.** Neither `typescript` nor `vue-tsc` is in
  the tree, and there is not one `.ts` file in our own source. The `legacy-peer-deps` line in
  `.npmrc` exists specifically to keep `typescript` out, and it is working.
- **`@types/node` is real, and it is unremovable.** **21 packages require it**, every one
  transitive — Jest internals and webpack typings — and each asks for `*`. Jest is the test
  runner the Engineering Standards mandate, so removing it means removing Jest. npm
  `overrides` can change a version; it cannot delete a transitive dependency. There is no
  action that takes req 2 to zero for this package.
- **Context that narrows it.** It is one of **25 `@types/*` packages** the toolchain already
  pulls in (`@types/webpack`, `@types/dompurify`, `@types/json-schema` and 22 more), and it is
  type definitions only — text describing shapes. Nothing in the package executes, in the
  build or at runtime.
- **What was done instead: a DOWNGRADE toward the spec.** Every requirer accepts `*`, so npm
  had resolved the newest (**25.9.3**) and the tree carried definitions for Node 25 APIs this
  project must never use. Pinned to **14.18.63**, the Node 14 line. This is the same shape as
  the `isomorphic-dompurify` 1.3.0 ruling in CLAUDE.md and sits inside the one-directional
  rule: the locked target is untouched and only the drift moved.
- **What proved it.** Installed with npm 8.19.4 on Node 14.15.0 under `engine-strict=true`.
  The lockfile diff is exactly the intent and nothing else: `@types/node@25.9.3` removed with
  its only dependency `undici-types`, 20 nested copies at 14.18.63 added, and **zero version
  changes to any other package**. Engine scan **0 offenders across 1,982 packages**. Suite
  **6,284 green** at the point of verification — **6,280** once this item came off the list,
  because `toDoItems.test.js` generates 4 tests per item — lint 0 errors, `nuxt build` exit 0.
- ⚠ **The residue, stated rather than hidden.** `@types/node` is still in the tree and req 2
  still names it. The item is closed because the action space is empty, not because the
  package is gone. If Jest is ever replaced, this becomes removable and should be removed.

**4.30 · The invisible-character strip ran on no path at all.** ✅ Closed 2026-08-25. Wired in
`server/utils/openaiClient.js`; tests in `tests/unit/openaiClient.test.js`.

- **The item understated it.** 4.30 recorded that `promptSafety.stripInvisible` was not applied to
  `advisorEngine.js`. A repo-wide search found it was applied **nowhere** — not the advisor engine,
  not `courseEngine.js`, not `cases.js`, not the case anonymiser. It shipped on 2026-08-21 with its
  own tests and **zero call sites**, and stayed that way for four days.
- 🔴 **Two things made it read as done.** `server/utils/aiPrompts.js` carries a comment naming
  `stripInvisible` among the protections, immediately followed by *"This block is what the model is
  TOLD; those are what is DONE."* And `tests/unit/aiPrompts.test.js` asserted only that the function
  **exists** — `typeof ps.stripInvisible === 'function'`. Nothing anywhere asserted it was ever
  **called**. A function with tests, a comment vouching for it, and no caller: green, documented,
  and doing nothing.
- 🔴 **A DELIBERATE, RECORDED DEVIATION from the item's own `touches`.** The item named
  `advisorEngine.js` and `courseEngine.js` output handling — six emit points. It was fixed instead
  at `server/utils/openaiClient.js`, the single function every OpenAI reply passes through. That
  covers all **seven** output paths in one change, including the anonymiser the item did not know
  about, and covers whatever is added next. Six per-engine edits would have left the next AI
  feature unprotected on the day it shipped — which is precisely how this gap appeared. Mike
  approved the deviation before any code was written, 2026-08-25.
- **The split character, handled rather than documented.** A Unicode tag character is two code
  units, and a stream can deliver them in separate chunks, where neither half matches on its own
  and the browser rejoins them on screen. The wrapper holds a trailing half back for the next
  chunk, kept per choice index; a half still held when the stream ends is dropped, because alone
  it is not a character. Checked against a filter without the carry: the payload survives intact
  and still reads as `safetext` to a human.
- **What proved it.** Five tests through the real client with an injected request, no network — a
  hidden payload removed from a normal reply and from a streamed one; removed when deliberately
  split across two chunks; a split emoji rejoined unbroken; and ordinary content, token usage and
  finish reason all intact. Suite **6,284 green** — 5 new tests here, and 4 fewer generated by
  `toDoItems.test.js` now this item is closed — lint 0 errors.

**4.7 · Flip engine-strict back on — the Node 14.15 lock is no longer advisory.** ✅ Closed
2026-08-24. Plan: [`../STACK-RECONCILIATION-PLAN.md`](../STACK-RECONCILIATION-PLAN.md); the
operational detail lives in [`../../.npmrc`](../../.npmrc), beside the settings it governs.

- **What it does now.** `.npmrc` carries `engine-strict=true`, so `npm install` **hard-fails** on
  any package whose `engines.node` excludes the locked 14.15 — where before npm merely warned and
  carried on, which is how the stack drifted in the first place. Five `overrides` in
  `package.json` clear the offenders. A scan of the installed tree now reports **zero engine
  offenders across 1,964 packages**, down from seven.
- **The job was seven packages, not the two recorded since June.** Five arrived on 2026-07-21 with
  the component-test tooling (`bbc476e`) — `minimatch@9`, `minipass@7`, `path-scurry`, `nopt@7`
  and `abbrev@2`, all via `@vue/test-utils → pretty → js-beautify@1.15.4`, whose `glob@10` chain
  needs Node 14.17+. **None was logged as a Stack Constitution deviation when it arrived**, which is
  the whole reason this item understated itself for a month. The deviation-logging rule exists
  precisely to stop that, and it did not fire.
- 🔴 **Turning engine-strict on changed which npm can run in this repo at all, and nothing said so.**
  The half-done note left on 2026-08-24 said to use Node 20.20.2 / npm 10.8.2. That cannot work:
  `engine-strict` checks the **root project too**, and `package.json` declares `engines.node`
  `14.15.x`, so npm 10 rejects the repo before reading a single dependency. npm 6 — bundled with
  Node 14.15 — is equally barred, because it ignores `overrides` outright and rewrites the v2
  lockfile to v1. **npm 8 on Node 14.15.0 is the only combination that satisfies all three
  constraints** (`overrides` landed in 8.3; npm 8's own engines are `^12.13 || ^14.15 || >=16`).
  Verified with npm 8.19.4, run from a temp directory so nothing on PATH changed.
- 🔴 **The overrides were right all along; the lockfile was holding old pins.** With the lockfile
  present, the scoped `@nuxt/telemetry → consola` override had no effect at all. **npm does not
  retroactively apply an override to a package already pinned in `package-lock.json`.** The
  `js-beautify` override appeared to work only because it changed that package's own version, which
  invalidated its subtree and forced re-resolution; `@nuxt/telemetry`'s version never changed, so
  its subtree was never revisited. Proved by resolving with **no lockfile**, which produced a clean
  tree from the repo's own unmodified overrides. The fix was to delete the two stale `consola`
  entries and let npm re-resolve that single edge.
- **The surgical route was taken over regenerating the lockfile, and the numbers are why.** A full
  regeneration also produced a clean tree, but churned **280 added / 269 removed / 86 version
  changes** — including `dompurify 3.4.9 → 3.4.14`, which sits underneath the deliberately exact
  `isomorphic-dompurify@1.3.0` pin. Removing two lines instead churned **9 added / 35 removed / 1
  changed**, and every one of those 45 entries is accounted for: the old js-beautify chain out, the
  1.14.0 chain in, the nested consola gone, `node-releases` pinned, `js-cookie` dropped (a
  dependency of js-beautify 1.15.4 only, imported nowhere in our source), and the lockfile's stale
  `0.9.0` stamp catching up to `0.10.0`.
- 🔴 **npm 8 drags in TypeScript, which the Constitution bans by name.** npm 7+ auto-installs peer
  dependencies; npm 6 did not, so this tree never had them. Installing them pulls `typescript@7.0.2`
  as a peer of `tsutils`, reached via `@typescript-eslint` from `@nuxtjs/eslint-config` — breaking
  **req 2** (no TypeScript, ever) and `engine-strict` at once, since typescript@7 wants Node
  >=16.20. `legacy-peer-deps=true` restores the npm 6 behaviour. It relaxes nothing: the Node
  target and `engine-strict` are untouched, and it **keeps a forbidden package out** of the tree.
- 🔴 **The plan's header claimed this was finished for two months while it was half-done.**
  [`../STACK-RECONCILIATION-PLAN.md`](../STACK-RECONCILIATION-PLAN.md) read *"✅ EXECUTED — this
  plan is DONE"* from June 2026, when §3 had run and the second half of §4 — the `.npmrc` — had
  not. Nothing failed and nobody erred; the header simply asserted completion, so **no later reader
  had reason to look**. It also pointed at `ACTIONS.md` and the `SESSION-*.md` notes as the live
  record, both of which stopped being that on 2026-08-24. All three corrected in this change. This
  is the same failure family as the item above: **the record kept the claim and lost the state.**
- **Verified, in the order the item specified.** Lockfile diff sane (45 entries, all explained) ·
  engine scan **0 offenders / 1,964 packages** · lint **0 errors** (204 pre-existing warnings) ·
  suite **6,271 passed / 332 suites** · backend boots and `/api/health` returns **200**, which is
  what proves the restify 9.1.0 surface still works · `nuxt build` exits 0. The install itself ran
  with `engine-strict` **on**, which is the real proof — that setting fails rather than warns.
- ⚠ **Two things deliberately left open.** `@types/node@25.9.3` is in the tree and **req 2 forbids
  it by name**; it was already in the committed lockfile before this change, so it is a
  pre-existing deviation to be logged as its own item, not something this change introduced. And
  the engine scan that proved the zero above existed **only as a throwaway script**, so nobody
  else could confirm the state without rebuilding it. That was item **4.44**, closed 2026-08-25:
  the check is now `npm run check:engines`.

**2.9 · The education gate — built, with its mentor screen.** ✅ Closed 2026-08-24, session 83.
Behaviour ruled 2026-07-16, reach ruled 2026-08-16, wording ruled 2026-08-24. Design:
[`../EDUCATION-GATE.md`](../EDUCATION-GATE.md); artefact:
[`../mockups/education-gate.html`](../mockups/education-gate.html).

- **What it does now.** When the engine can see a client is not comfortable reading their own
  numbers, the advisor is asked — after every other question, immediately before any
  recommendation — *"Do you want me to put education first, or show what's technically needed and
  leave the teaching to you?"* Whichever they answer, they are told what triggered the question,
  in the client's own words.
- **The signal is domain-independent at last.** A `financial_literacy_gap` entry in
  [`../../data/signal-dictionary.json`](../../data/signal-dictionary.json)'s new `gateSignals`
  map, matched against everything the advisor has typed in **any** advisory area. Its phrases are
  **pd-35's own authored triggers**, not new writing — a fourth vocabulary for the same idea is
  how the existing three drifted apart.
- **It is editable by the people whose content it is.** An Education Gate tab at all four manager
  tiers, mentor first, with version history and restore. Mike chose "the mentor screen ships in
  the same change" when asked how far to go.
- 🔴 **The gate cannot change what is recommended, and that is structural rather than promised.**
  The phrases live in a map `problemSignals.SIGNAL_REGISTRY` does not read, so there is no wire to
  `templateResolver` to cut — not a weight of zero a later maintainer could "fix".
  `tests/unit/educationGate.test.js` fails if one is ever added. Two reasons it matters: the
  staircase rule guard keeps this decision in the acumen lens, and **pd-35 already boosts
  templates for this idea in forecasting**, so a second lever would double-count it there.
- 🔴 **THE ITEM SAT A MONTH BEHIND A SENTENCE THAT WAS WRONG, AND THE LIST KEPT SERVING IT.** The
  generated table said *waiting on Mike — "only the on-screen words are missing"* for eight days
  after §4 of [`to-do.md`](to-do.md) declared both wrong and said the wording question **must not
  be re-asked**. On 2026-08-24 a `/startup` session read the table, told Mike it was a five-minute
  wording answer, and he picked it on that basis. The prose had been corrected; the JSON it is
  generated from had not, and no test compares the two.
- 🔴 **AND THE CORRECTION ITSELF WAS WRONG TWICE BEFORE IT WAS RIGHT.** §4 named the dead
  `primary-issues.json` as where the literacy signal lived; the first correction replaced that
  with `FINANCIAL_FOUNDATIONS_GAP` and called it *the* live signal; there are **two**, and the
  forecasting one — pd-35 — is the content §4 had actually meant all along. Both wrong versions
  are struck through on the page rather than rewritten. **An incomplete correction is how the
  original error survived a month.**
- **Verified:** 6,188 tests / 330 suites green, lint 0 errors. The new backend files cover 99.5%
  of statements, 100% of functions. ⚠ **Not verified by eye at any tier** — no browser was driven
  against the new hub tab, and that is a human check nobody has done yet.

**4.16 · 102 pieces of authored advice the AI never saw — the last part closed.** ✅ Closed
2026-08-23, session 82. The sweep began 2026-08-16; D was the last of its seven parts.

- **What D was:** `data/engagement-types.json` holds 3 engagement types × 6 authored fields.
  **None reached a prompt and none reached a screen.** `server/advisorEngine.js` emitted a
  hardcoded three-line paraphrase in their place — *"client lacks knowledge — teach and build up
  sequentially"* and two like it. The build spec called it *"the only one with no page"* and
  *"the one genuinely homeless item"*.
- **What closed it:** **The 3 Engagement Types** is now its own page in Domain Support, listed
  under Facilitation 101, editable at all four tiers, and the client-mode prompt reads that same
  document through the same tier overrides — fenced as untrusted data when any tier has reworded
  it. `341402f`.
- 🔴 **It waited seven days on a decision, and the decision took one sentence.** The item said
  *"Mike must rule where it lives before anything starts"*, and it was carried unasked through
  four sessions of notes. When he was finally asked he answered immediately. **An item blocked on
  a question nobody puts is not blocked; it is forgotten.** That is the transferable part.
- 🔴 **AND THIS ITEM'S OWN RECORD WAS FALSE WHILE IT SAT THERE.** Its `why` said part F — the
  method guides — *"DESIGN IS NOW SETTLED AND BUILD IS NOT STARTED"*. F was built on 2026-08-17
  (`server/utils/methodGuides.js`, all thirteen guides, on screen at every tier); it was verified
  by opening those screens in a browser on 2026-08-23. So the list told Mike this item needed
  **him**, when half of what it named was already shipped. Same family as 4.26 above and as
  session 81's false Brief: **the record keeps its own account, and nothing compares it to the
  code.**

**4.35 · Domain support general content — the psychology under the delivery.** ✅ Raised and
closed 2026-08-23, session 82. Asked by Mike through the Handbook control that morning, built the
same afternoon.

- **What he asked for:** *"the drivers of human performance, reaction to learning and 5 steps in
  making a new habit — as a separate editable page — showing under the facilitation 101 page and
  the engagement types pages."* Named by him the same day: **Learning Psychology**.
- **What shipped:** a third standing page in Domain Support, under the other two, editable at all
  four tiers: the emotional reaction to learning, the eleven-stage progressive learning path, the
  5 Drivers of Human Output with their definitions, the 5 Steps to Building New Habits with the
  smoking worked example, and the interference-triggers block with its compliance-deadlines
  example.
- 🔴 **The content is TRANSCRIBED, not authored.** From `Productive Habits.pdf` — the master app's
  own template, `data/templates.json` index 27 — as the item demanded in terms. The PDF's font
  subset drops its ligatures (*"e ectiveness"*, *"Re ections"*, *" nish line"*); those are repaired
  and nothing else is changed. Tests pin the exact source sentences and fail if the holes return,
  so a later hand cannot quietly rewrite the master template into something more fluent.
- **Two slides deliberately not transcribed:** the session housekeeping slide and the blank
  worksheet. Neither is content the AI can use. Recorded so nobody wonders where they went.
- ⚠ **The page is Learning Psychology; the record is still `productive_habits`** — and
  `data/productive-habits.json` keeps its name. The id is the storage key a firm's saved wording
  is filed under, so renaming it with the page would orphan every override saved before the
  rename, silently.
- ⚠ **WHERE ELSE IT REACHES THE AI IS STILL MIKE'S CALL.** It goes to the prompt only alongside
  Facilitation 101's learn reference. It is ~6,000 characters, so putting it on every client
  recommendation is a real cost and was not made a default. **This is a live open question, not a
  finished decision.**
- ⚠ **A duplication was found and NOT resolved.** The five drivers are also defined in
  `data/staff-domain-support.json` — the *"5 Drivers of Human Output — Performance Diagnosis"* row
  — where they serve a diagnosis. Learning Psychology carries the source definitions that row
  paraphrases. Two copies is how content drifts apart here. **Recorded, not reconciled; it needs
  Mike's call.**


**4.26 · The Model Library card promised one rental property, not five.** ✅ Closed
2026-08-23, session 82. Marked Done by Mike from the Handbook control.

- **What changed:** [`../../utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js)
  now reads *"Whether a rental portfolio is worth buying — up to five properties, ten years of
  cash, tax and equity."* The stale comment beside it, which described a `scope` field deleted
  when Phase 2 landed, went with it.
- 🔴 **He had marked it Done once before, on 2026-08-21, and it was half right both times** —
  the *screen* does five properties, which is what he was looking at; the *card* was a separate
  string. The item's own note predicted this and said to show him the line rather than the
  label.
- 🔴 **And the guard that should have held it on the list failed.** `apply-to-do.js` treats an
  item as closed if the text `**4.26**` appears anywhere on this page — and it did, inside
  4.19's closure, in the sentence *"Two wording decisions also stayed with Mike and are 4.26 and
  4.27."* A passing mention counted as a closure record. The check matches a string, not a
  record. **Not fixed — recorded here, and it will do the same to 4.27.**

**4.34 · The Model Guide showed `[placeholders]` where the real figures belong.** ✅ Raised
AND closed 2026-08-22, session 81 — raised by Mike the evening the page shipped, fixed the
next morning. Commit `e25b80c`.

- **Why it mattered:** [`../../data/report-model-summaries.json`](../../data/report-model-summaries.json)
  stored each model's Coach reading as the sentence with its numbers taken out, because the
  figures are computed when the screen runs.
  [`../../components/ModelGuide.vue`](../../components/ModelGuide.vue) printed those lines
  verbatim, so the page read *"your [working capital] of working capital … takes [n] days …
  about [amount] more revenue a year"* where the model's own screen reads **$120 · 30 days ·
  $1,800**. A firm manager choosing a model got the shape of the reading and none of its
  substance — **worse than no reading, because it looks finished** — and the AI was handed
  the same bracketed text.
- **Mike's own words:** *"it makes this section worthless"* (2026-08-22), and the next
  morning *"last session left the model summary without actual figures in them which made
  the reading useless"*.
- **What proves it.** The sentence stays the single source both readers share; it now carries
  `{named}` gaps that each reader fills from the same figures — the screen in the firm's
  currency through `currencyMixin`, the AI in the platform default.
  [`../../server/utils/reportModelFigures.js`](../../server/utils/reportModelFigures.js)
  computes each model **by calling the same model function the screen's own route calls**,
  on that model's own defaults. 27 new tests in
  [`../../tests/unit/reportModelFigures.test.js`](../../tests/unit/reportModelFigures.test.js),
  plus 6 on the route and 6 on the screen. Suite **6,103 green**, lint 0 errors.
- 🔴 **THE ITEM'S OWN PLAN WAS WRONG IN ONE PLACE, AND CHECKING IT IS WHAT FOUND IT.** The
  item said the route could compute every model from its defaults. Two of the readings were
  not the model's to give: Working Capital's *"cut it to 20 days"* what-if lived in
  `BusinessPerformanceReport.vue`, and EBITDA's dip year and terminal share lived in
  `EbitdaDcfReport.vue`. Computing them here would have been **a second copy of the same
  arithmetic** — the drift fault this repo keeps closing, in a new place. They were **moved
  into the models**, both screens now read them from there, and the golden tests confirm the
  move changed nothing. Approved by Mike before building, on the grounds that a number
  quoted on two screens needs one home.
  ⚠ **The EBITDA half was one step past what was asked for**, and was reported as such
  rather than folded in quietly.
- 🔴 **WHERE A LINE DESCRIBES A PATTERN, IT IS NOW PROSE AND CARRIES NO GAP.** Cost of
  Capital's three verdicts and the Multiple Property per-property sentence give a different
  answer every run; **a single number there would read as the answer**. Reworded, and the
  wording put in front of Mike before anything was built.
- **Margin · Mark-up · Break-even was the one model that could not answer at all** — its
  defaults lived only in the component, so the backend computed a page of zeros. They are
  mirrored into the model with a test pinning them to the screen's own `DEFAULTS` line.
  ⚠ **Its live route was deliberately NOT changed to fall back on them.** Its overheads and
  drawings sliders both start at zero, so *"missing"* and *"dragged to nothing"* are the same
  value on the wire, and defaulting there would silently overwrite a real choice.
- 🔴 **THE FIX INTRODUCED A RISK, AND IT WAS SURFACED RATHER THAN SHIPPED QUIETLY.** The AI
  now reads *"$4,420,963"* where it read *"[amount]"*. All six models state "illustrative
  teaching figures" in their limits and the list instruction already forbids passing them off
  as the client's — but that asked the model to join two sentences a page apart. Mike ruled
  the same day that the heading name them as samples **in the same breath as the number**, in
  the prompt and on the screen. Both headings now do, and a test fails if either loses it.
- **What guards it now.** A gap with no figure fails the build. A figure that stops computing
  fails the build. A screen that goes back to deriving its own copy fails the build. A
  mirrored default that drifts from the screen's fails the build. And no brace or bracket can
  reach either reader: a figure that will not compute degrades to "—", the reports' own
  no-figure convention.
- ⚠ **Not verified by eye in a browser.** The rendered text is asserted by component tests,
  which is the substance of this change; the layout of the longer headings is not. That gap
  is **4.25**, still open.

**4.29 · The AI had never been told the report models exist.** ✅ Closed 2026-08-22,
session 80. Carried since 2026-08-21 — Mike's own instruction, approved to build the same
day. Plan item T22, open since 2026-07-09.

- **Why it mattered:** `utils/reportModelCatalogue.js` was read by exactly one file,
  `components/ModelLibrary.vue`. Nothing in `server/` read it, and the only mention of a
  model's name on the backend was a JSDoc comment inside the model itself. **Ten built
  models that answer real client questions were invisible to the one part of the app an
  advisor actually asks for help.**
- **Mike's own words:** *"ensure that each of the performance models have a 'key calculation
  output' page or section, so that the AI can read what the model serves"*, and *"place it
  wherever you want, it's for AI - not the advisor or manager"* (2026-08-21).
- **What proves it.** [`../../data/report-model-summaries.json`](../../data/report-model-summaries.json)
  carries one entry per live model, rendered into the client-mode prompt by
  [`../../server/utils/reportModels.js`](../../server/utils/reportModels.js). 27 tests.
  🔴 **The assertion that matters runs the real builder and reads the real text** — the
  assembled prompt string is 18,706 characters and contains every model, every page path,
  and no model that has no page. A source scan proves a line exists; only that proves the
  text reaches the model, and the difference is the exact fault named at the top of
  `coachingPromptFields.test.js`: fields authored, stored, cascaded and rendered into no
  prompt anywhere, with every test green because every test asked whether they were SAVED.
- **The guard runs BOTH ways, and that was deliberate.** A summary for a model with no page
  fails — that is the constraint the whole design turns on, and it is item 4.15 happening
  again if it slips. A live model with **no** summary also fails, so the day one of the
  eight `STATUS_SOON` models goes live the build says it needs an entry. Without the second
  half it would have been a one-way ratchet: safe, and no protection against the failure
  that actually happened. Mutation-verified three ways, plus a fourth on the wiring.
- **Every model states what it does NOT cover, and that is not optional.** A test fails an
  entry without it. An Education model must say its figures are illustrative — the 8 Levers
  workbook's 880,000 "Trading Income" is a teaching figure, and an advisor told about that
  model without the caveat could repeat it to a client as a finding.
- 🔴 **NO SCREEN, AND THAT IS A STATED EXCEPTION TO THE 2026-08-16 HUB-PAGE RULE.** Mike
  ruled it himself. The reason holds: a description of what a calculation does is a fact
  about the maths, not authored advisory judgement — nobody at any tier gets to decide that
  Lease vs Buy answers a different question than it answers. ⚠ If a firm ever wants to say
  when *its* advisors should reach for a model, that **is** authored judgement and needs a
  mentor-tier screen. The data file says so in its own header.
- 🔴 **WHAT IT DID NOT DO BECAME ITEM 4.32 RATHER THAN A SILENCE — and 4.32 closed the same
  session.** The AI could read the list and nothing invited it to use it: none of the six
  mode prompts in `data/prompts/` mentioned a calculation model, and `discover.txt` ends
  *"Do not add any other sentence after it… End there. Full stop."* Tried live with a
  builder-short-of-cash question: three templates, no model. It was raised as its own item
  because editing a mode prompt changes what a deployed screen says to real advisors. Mike
  ruled the same afternoon — *"yes and both if its appropriate"* — and it was built. See
  4.32 below.
- ⚠ **One stale claim corrected on the way past:** `report-models.md` §5 still said *"no
  browser driver is installed in this repository"*. `playwright` landed the day after that
  was written (2026-08-21, `7fa5e9a`) and was used this session to drive the AI Prompts tab.
  Item 4.25 already recorded it correctly; the Brief did not.

**4.32 · The AI could read what the models do and was never invited to mention one.**
✅ Raised AND closed 2026-08-22, session 80 — which is the whole point of it having been an
item at all rather than a quiet widening of 4.29.

- **Why it mattered:** 4.29 finished with the content in the prompt, the tests green, and
  the advisor no better off. Asked live about a builder short of cash, the AI returned three
  templates and no calculator — correctly, because nothing had told it it could.
- **Mike's own words:** *"yes and both if its appropriate"* (2026-08-22), answering whether
  the AI should be allowed to point at a calculator, and in which modes.
- **What changed, and what deliberately did not.** `discover.txt` gains a **"A calculator
  that fits"** block *inside* its format, and `client.txt` gains hard rule **R18**. Both
  carry the brake as well as the invitation: only when one genuinely fits, always with its
  exact page path, only from the list, never in place of a template.
  🔴 **The search mode's closing rule is untouched** — *"MUST be the final line… End there.
  Full stop."* The calculator block was placed **above** that line rather than the rule
  being loosened, and a test asserts both that the rule is still there and that the block
  sits before it. That rule exists so the AI stops talking; weakening it was never the ask.
  🔴 **R18 says in terms that it is NOT an exception to R17**, which fixes the recommended
  template set. A model is not a template and never joins, replaces or reorders it. Without
  that sentence the two rules read as contradictory, and a contradicted hard rule is one the
  model gets to choose about.
- **Verified against the running app four times, not asserted.** A lease-or-buy question
  returned the Lease vs Buy calculator with `/lease-vs-buy`. A cash-flow question returned
  Debtor Business Drag with `/debtor-drag`. **A question about two directors who cannot
  agree returned three templates and no calculator at all** — the restraint half, which is
  the one that matters, because an invitation without a brake is item 4.18 waiting to happen.
- ⚠ **One attempt was reverted mid-flight and it is worth recording.** Telling the AI not to
  bold a model name — meant to stop a template's video attaching to it — stripped the bold
  off the **template** name too, which is exactly what `videoInjector` reads. It made the
  output worse than the problem it addressed. Reverted, and the underlying issue became
  item **4.33** instead: it cannot be fixed in the prompt, because the injector runs after
  the AI has finished writing.

**4.28 · The AI Prompts page had an engine and no screen.** ✅ Closed 2026-08-22, session 80.
Carried since 2026-08-21 — Mike's own instruction, and the backend half had shipped the day
before, which is exactly the half-a-fix state CLAUDE.md names.

- **Why it mattered:** *"Wiring content into the prompt without a screen is half a fix"*
  (CLAUDE.md, 2026-08-16). Both prompts, the protocol block, the cascade and 32 tests had
  shipped in `ea6ac22`, and **no tab rendered a line of it** — so no manager could see or change
  a single variable. The engine read as done and was not.
- **Mike's own words:** *"I want to create a 'AI Prompts' page in the hub pages (Mentor, Global
  Group Manager, Group Manager and Firm Manager) so that users have the ability to influence the
  approach to formulas in the performance report models"* (2026-08-21), then *"finish 4.28 you
  should have everything you need"* (2026-08-22).
- **What proves it, and it is not only the tests.** The tab is
  [`../../components/firm/FirmAiPrompts.vue`](../../components/firm/FirmAiPrompts.vue), served by
  [`../../server/routes/aiPrompts.js`](../../server/routes/aiPrompts.js), gated by
  `TAB_TIERS.aiPrompts` to all four manager tiers. 47 engine tests, 22 route tests, 24 component
  tests. **And the running app was driven with Playwright at both loginable tiers**: the tab
  appears sixth under *Your AI coach*, the three settings carry the ruled labels, the protection
  panel renders its four sentences, all twelve method sections render with no input inside any of
  them, no raw locale key reaches the screen, and the page does not scroll sideways.
- **The cascade was exercised over real HTTP, not asserted:** the mentor saved a materiality of 3,
  the firm read 3 as *inherited* with nothing of its own, the firm then set 12 and held it, and
  the mentor was unaffected. Every refusal was tried live too — an undeclared variable, an
  out-of-range number, an unknown prompt, an invalid choice, and a scope named in the request
  body, which wrote to the caller's own scope and left the mentor's untouched.
- 🔴 **The redraw is the part worth keeping.** The first drawing was written for an engineer and
  Mike rejected it on sight: *"who is supposed to be working with this page? A computer coder or
  an accountant …? If its the latter (and it is) then your version risks being too complicated
  for them."* The security document is now **mentor-only** — its seven engineering headings were
  7 of the 19 sections a firm manager saw — and below the mentor it is four plain sentences. **No
  manager lost a control**, because that document has no editable setting at any tier, and a test
  fails if it ever gains one.
- 🔴 **One defect was caught in the build and is worth recording, because it is the same fault
  Mike found in the two fetch-burst boxes — in prose instead of in a control.** The protection
  panel's fourth sentence was *"Nothing is treated as final until a person has approved it"*. The
  panel's own heading promises these things are *applied by the system every time*, and that one
  is **enforced nowhere** — it restates the prompt's Draft-and-Publish section, which is advice to
  a model. It was replaced before shipping with *"Pictures and web code are stripped out of the
  AI's answer"*, which the locked markdown pipeline does enforce. Every line now declares the
  module that performs it and a test opens that file to check.
- ⚠ **Two stale counts fell out of this and are fixed:** `hubTabTiers.test.js` asserted a
  conditional-tab count while its own headline total lived only in prose — the total is now
  derived from `NAV_GROUPS`, and doing that immediately caught a second error, a comment claiming
  seven unconditional tabs when Coaching Reference left on 2026-08-20 and there are six.
- ⚠ **Still true and not fixed by this item:** item **4.30** — `stripInvisible` is not applied to
  the live advisor output path. The panel's third sentence is true of this prompt path and not yet
  of the advisor screen.

**3.5 · Reply to Carl about `npm install`.** ✅ Closed 2026-08-21, session 78. **Mike sent it
himself.** Carried since 2026-08-09 — twelve days for a question that needed one message.

- **Why it mattered:** somebody outside the project was waiting on an answer.
- **What we would have lost:** not much in the code, but it is a person waiting, and the
  ledger row for the next pull depends on him replying.
- **Mike's own words:** *"If this is important, draft the email you want me to send Carl and
  I'll pass it on."* (2026-08-15) — then, on 2026-08-21: *"i already copied and sent it, i was
  testing what you had at your end."*
- **What proves it:** the email he sent is [`../RELEASE-v0.9.0-EMAIL.md`](../RELEASE-v0.9.0-EMAIL.md),
  drafted 2026-08-17 and saved before sending, whose closing section answers the `npm install`
  question for `v0.7.0`, `v0.8.0` and `v0.9.0` explicitly. Every fact in it was re-verified
  against the repository on 2026-08-21 before he sent it: the tag exists on `origin` at
  `d4284e6`, `origin/master` has not moved since, and `package-lock.json` is untouched between
  `v0.8.0` and `v0.9.0`.
- 🔴 **Why it sat for twelve days, which is the part worth keeping.** His instruction of
  2026-08-15 asked for a draft. **The Handbook control deleted his comment on save** — see
  `838f3a0` — so no session after that one could see he had asked for anything. The draft was
  written on 2026-08-17 for a different reason and nobody connected the two. The item did not
  wait on a decision; it waited on a sentence nobody could read.
- ⚠ **The reply he asked for is still owed:** when Carl pulls, the date, environment and commit
  hash go in [`../DEPLOYED-VERSIONS.md`](../DEPLOYED-VERSIONS.md). The email asks for them.

**4.22 · Settle whether purchase costs are non-deductible in the property model's first year.**
✅ Closed 2026-08-21, session 78, **by Mike, and the item's premise was the thing that was
wrong.** Carried since 2026-08-17.

- **Why it mattered:** `MODEL` C46 adds back Setup Costs only, while the workbook's own note at
  `INPUTS` H46 reads *"Setup Costs / Purchase Costs - Non Deductible"*, naming both. On the note's
  reading, year 1's taxable loss is 2,000 smaller and the year-10 tax bill moves from 1,521.61
  to 2,081.61.
- **What we would have lost:** the New Zealand DEFAULT — the value every firm that changes
  nothing would use.
- **Mike's own words:** *"I thought this was settled since we created the property tax rules
  inputs for a firm manager to enter based on their local tax rules. This is done."*
- **What proves it:** he is right, and it was checked rather than taken.
  [`../../components/firm/FirmPropertyTaxRules.vue`](../../components/firm/FirmPropertyTaxRules.vue)
  carries `yearOneAddBack` as a firm-manager field (`key: 'yearOneAddBack'`, line 157), and the
  report screen reads whatever `server/utils/propertyTaxRules.js` resolves. A firm sets it to
  its own jurisdiction's rule. The model already accepts `setup`, `setupAndPurchase` and `none`
  and is golden-tested at all three.
- ⚠ **The question the item asked is therefore the wrong question.** It asked which answer is
  correct for New Zealand. The product's answer is that no single answer is correct for
  everybody, which is why it became a setting on 2026-08-17 (§8 Q6) — and once it is a setting,
  the platform default is a starting point rather than a ruling. Nobody had noticed that the
  item outlived its own premise.
- 🔴 **What it leaves behind, and it is now item 4.29's problem too:** the shipped default is
  still `ADD_BACK_SETUP` and it is applied **silently**. A firm that never opens the tax rules
  card gets it and is never told. The pattern that fixes this — a default that must announce
  itself — arrived the same day in `data/ai-prompts.json` (`unsetRule: "announce"`), from the
  cash flow document. It is not yet applied to the property model.

**4.12 · 🔒 One handover story for the master team.** ✅ Closed 2026-08-21, session 78, on Mike's
approval — **not by doing what it said.** It was the first item on his ranked list and the list's
only blocker, and it was carried from 2026-07 on a premise that was never true.

- **Why it mattered:** the merged app's own handover documents were said to still describe a
  separate standalone application, so the master team would build the tiers above it wrongly.
- **What we would have lost:** nothing, as written — see below. What was genuinely at risk was
  found only by checking it.
- **Mike's own words:** *"if this is just a handover note - get it done"* (2026-08-15, and those
  words were deleted by the control the same day — see `838f3a0`).
- 🔴 **Why the premise was false, proved rather than argued:** the item named two files,
  Collaborate's `START-HERE.md` and `HANDOVER.md`. **Neither has ever existed in this repository.**
  `git log --all -- "*START-HERE.md" "**/HANDOVER.md"` returns nothing, and
  `--diff-filter=D` returns nothing — they were never added and never deleted. They lived in the
  separate Collaborate repo; the merge brought the code (`server/collaborate/`,
  `mixins/collaborate/`), not those documents. The documents the master team actually receives —
  [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md) (*"For the Advisor-e master coding team"*) and
  [`../HANDOFF.md`](../HANDOFF.md) (*"integrating the Firm Manager module into the main app"*) —
  already describe a section of this app. Of the five surviving uses of "standalone", four are
  correctly past tense and must not be "corrected".
- **What proves it:** the false claim is written out of the brief it lived in
  ([`collaborate-data-layer.md`](collaborate-data-layer.md) §4) rather than deleted, so the next
  session cannot re-derive it from the merge plan.
- 🔴 **What checking it DID find, and this is the item's real value.**
  [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md) — the one page the master team loads a release from
  — still said *"the newest cut release is `v0.8.0`"* at five places. **`v0.9.0` was tagged
  2026-08-17**, and Mike sent Carl the v0.9.0 release email on **2026-08-21**, so the announcement
  and the loading instructions contradicted each other on the same morning. Corrected to `v0.9.0`,
  with the `npm install` line and the *Known issues* link (renamed from *Known limits* at v0.9.0)
  brought with it, and a standing warning added that cutting a tag includes updating that page.
- ⚠ **The lesson, which is not new:** an item's premise is a claim, not a status. This one was
  ranked **first** for weeks and nobody had opened the two files it named. See
  [`../ACTIONS.md`](../ACTIONS.md)'s own warning — *"Trust the CODE, not these flags."*

**4.19 · Finish the property model — properties 2 to 5, the apportionment and the consolidated
report.** ✅ Closed 2026-08-21, sessions 75–76. Carried since 2026-08-17, when Mike put it on the
live list himself after asking whether the other four properties were ever coming.

- **Why it mattered:** Phase 1 answered *"is this one property worth buying"*. The workbook was
  built to answer *"does this portfolio work"*, and an adviser whose client holds several rentals
  had no screen that put them together.
- **What we would have lost:** the apportionment and the consolidation exist nowhere in Phase 1 in
  any form, so they were precisely the part nobody could infer from the built screen. It lived in a
  design document with nothing scheduling it, which on this project is how work quietly becomes
  never. That is why the row existed.
- **Mike's own words:** *"finish 4.24 then lets get 4.19 finished at last"* (2026-08-20), then
  *"looks great - move forward"* on the drawing and *"i like it"* on the built screen (2026-08-21).
- **What proves it:** all five build steps are done — the maths and its golden test (`c7fc42b`,
  `a0a779f`, `e36f8da`), the route taking two shapes on one URL with the live Phase 1 request shape
  pinned by a test (`838cf46`), **the drawing before the screen** (`30c2b7a`), and the screen and
  catalogue line (`4f34588`). Suite **5,887 green / 322 suites**, lint 0 errors. The workbook's own
  `Consolidated Report` row 11 and row 22 match its cached values **exactly across all ten years**;
  rows 24 and 26 deliberately do not, because those carry Mike's ruling that an interest-only loan
  may not simply vanish. Mike opened the finished screen on the running app.
- 🔴 **THE DRAWING CAME FIRST, AND THAT IS THE POINT.** P2-3 was written as its own numbered build
  step precisely because §10 of [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md)
  records the Property Tax Rules tab being built with no artefact at all. It was not absorbed into
  "the screen" a second time. The drawing is
  [`../mockups/multiple-property-portfolio.html`](../mockups/multiple-property-portfolio.html), its
  six questions are §11, and **§10 names twelve differences between it and the build**.
- 🔴 **THE SCREEN SAYS SOMETHING NO VERSION OF THE WORKBOOK COULD.** On the model's own figures the
  first property absorbs the whole $315,000 deposit and the other four borrow **100% of their
  purchase price**; the rentals stand at **90.9%** loan to value. Spread the deposit evenly instead
  and **every** property breaches an 80% ceiling. *$315,000 does not buy five properties* — and the
  spreadsheet could never have said so, because it has no lending test anywhere in it.
- 🔴 **AND CLOSING IT FOUND TWO DEFECTS THAT 5,885 PASSING TESTS COULD NOT SEE.** Both were found by
  mounting the screen with the real English strings and reading it as an adviser would: a scalar
  indexed as a ten-year series, so the client's cash deposit rendered as ten dashes; and a deposit
  box left blank beside a total that had visibly had that money deducted from it. Both are fixed,
  both carry a mutation-verified test, and the reading step is now **P19 of
  [`report-models.md`](report-models.md) §5** so it is a build step rather than a lucky habit.
- ⚠ **What did NOT come off with it:** layout is unverified — no browser driver is installed and
  jsdom has no layout engine. That gap is now item **4.25** on the live list rather than a warning
  in a document. Two wording decisions also stayed with Mike and are **4.26** and **4.27**.

**4.24 · Fold the Coaching Reference into Logic Tables — Mike's Option D.** ✅ Closed 2026-08-20,
session 74. Filed the previous evening on the evidence in
[`../COACHING-REFERENCE-EVIDENCE.md`](../COACHING-REFERENCE-EVIDENCE.md) and executed the next
morning.

- **THE READING CAME FIRST, WHICH IS THE ONLY REASON THIS WAS SAFE.** All fifteen rows were read
  against the logic tree covering the same ground before anything was touched. **Seven had nothing
  the trees do not already say better** — Deming's (`demings_volatility` already carries causality
  vs correlation vs coincidence), Rubbish In (`financial_systems_review` has the Chart of
  Accounts), Ratio Analysis (whose Stage 2 is literally *"When Data Is Less Relevant"* and Stage 3
  Common Size), and Planning Outcomes Review, Porter's & Pine, Blue Ocean and Customer Journey,
  all four of which `client_planning` and `client_sales` **name explicitly, with the routing rule
  attached**.
- **Seven pieces were genuinely unique and were MOVED, not deleted.** The delivery ladder
  (free-draw best, presentation next, watch the video and rehearse) → `reveal_growth_curve` Stage 4
  · *two bites at the cherry*, the reason both the Global and Local references get used →
  `eoy_meeting` Stage 3 · the client's own words, *"a big tax bill but nothing in the bank"* →
  `working_capital_cycle` Stage 1 · walk the customer's journey, the mini decisions, incremental
  not drastic → `client_planning` Branch 2a · *shifts the burden of proof back onto the client's
  business model* → `trial_fit` Stage 1 · the **7 Cash Drivers** template, named in no tree at all
  → `dashboard_discussions` Stage 4 · easy liquidity and wealth inside vs outside the business →
  `cashflow`, the Loan Estimator branch.
- 🔴 **TWO OF THE SEVEN WENT IN AS TRIGGER WORDS, NOT ONLY AS NOTES** — the tax-bill sentence and
  "7 Cash Drivers". A note reaches the model only once the tree is already open. A client saying
  those words now *opens* it. Notes alone would have been half the fix.
- **Then the removal, on Mike's instruction — *"remove the tab"*.** Out went the fifteen rows, the
  `## Coaching Reference` prompt block at **both** build sites, seven routes, the 362-line
  firm-editable cascade in `firmManager.js`, the Hub tab, and six now-dead source files
  (`coaching-reference.json`, `coachingConfig.js`, `firmCoachingReference.js`,
  `FirmCoachingReference.vue`, `FirmCoachingEntryForm.vue`, `utils/coachingRows.js`) plus three
  gitignored dev files. Five test suites went with them; three were trimmed to keep the half that
  survives.
- ✅ **THE PROMOTED CASE OBSERVATIONS ARE UNTOUCHED**, as the item required — different key,
  different loader, still FENCED. `coachingPromptFields.test.js` was rewritten rather than deleted
  precisely to keep guarding that fence, and it now asserts the adviser's text sits *inside* it
  rather than beside it: a fence that opens and closes around nothing would have passed the old
  shape of that test.
- 🔴 **THE ORPHAN ROW WAS NOT CONTENTLESS, AND FINDING THAT OUT TOOK MIKE PRODUCING THE SOURCE.**
  Row 15, *"Covid 19 Client Pre-Meeting"*, was reported here as matching no template and no tree.
  Mike supplied the deck — **Coping with Adversity**, based on the Enneagram — and it turned out
  the template had existed all along under a *different name*, and the material was **already in
  Domain Support**, in the people-power domain, still titled *"Coping with Covid"*. The search that
  declared it missing had been run on the row's own stale name. **A name lookup is not an
  existence check**, and this is the second time that exact mistake has been recorded on this
  project.
- ⚠ **A near-miss worth keeping.** Folding that row into the **Heald Matrix** was proposed, on the
  grounds that the Heald Matrix already "names three coping styles". It does — **Assertion,
  Withdrawal, Dutiful**, the *Hornevian* triad, how a person pursues what they want. Mike's deck
  teaches **Intensity, Competency, Positive Outlook**, the *Harmonic* triad, how a person copes
  when they **don't get it**. Same source tradition, different axis. The merge would have silently
  replaced one framework with another, and only reading the deck stopped it.
- **What that row became instead.** The people-power material was renamed to **Coping with
  Adversity** and enriched from the deck with the two things nowhere in the app: the three-styles
  table (what each looks like, when it is time to change focus, the Tips n Tricks) and the
  *"catch ourselves early"* principle — that doing so avoids serious relationship, self-esteem and
  poor judgement damage. Authored into `summary`, `who_when` and `steps` **only**, because those
  are the four fields `domainSupport.js` actually emits; a fifth field would have been the 4.16
  fault repeated in the same week it was closed.
- 🔴 **Its id still says `covid` and that is correct.** `domainSupportRowIds.test.js` locks ids
  against retitling: *"an id is assigned once and never changes… do not tidy an id to match a new
  name."* A firm's decisions about a row are keyed to it. Renaming the id would have silently
  discarded them.
- **Suite: 320 suites / 5,764 tests green**, down from 325 / 5,876 — the difference is the five
  deleted suites, not lost coverage. Lint 0 errors.

**4.23 · Build the Firm Manager Hub sidebar — grouped navigation, and drop the duplicate cases
tab.** ✅ Closed 2026-08-19, session 73. Filed the day before, the same session that designed it,
and built the next — the shortest gap between a design and its build on this list, which is the
point of filing it at all.

- **What shipped.** The horizontal `b-tabs` band is a grouped Buefy `b-menu` sidebar at all four
  tiers, with Mike's four headings. Firm 3 headings / 11 items, mentor 3 / 12, group and global
  4 / 13 — the design's own counts, asserted **off the rendered screen** rather than off
  `TAB_TIERS`, because the matrix is what the design predicted and the screen is what a manager
  gets. Phase 1 is commit `85097e9`; the duplicate followed in the same session.
- **NO TAB BODY MOVED**, and that is why this was a safe change rather than a frightening one.
  Every panel sits exactly where its `b-tab-item` stood; only one is ever shown, so the order a
  manager reads comes from `NAV_GROUPS` alone. Seventeen single-line swaps instead of an 1,800-line
  reindent. `activeTab` became a key rather than an index for the same reason — an index is a
  promise that the menu and the panels are in the same order, and they deliberately are not.
- **The duplicate is gone.** `teamCaseStudies` is `['firm']`. 🔴 **It is not a breach of "every
  report rolls up"** (2026-08-10) — those cases still reach every tier above the firm through Case
  Reviews, which was returning the identical list. One door closed, not the room. It is asserted
  explicitly in `hubTabTiers.test.js` rather than dropped from the roll-up loop, because an
  exception quietly removed from a list looks identical to one never considered.
- 🔴 **Two tests changed and both reasons matter more than the changes.**
  `mentorHubScope.component.test.js` read `nav.tabs li`; when the tab bar went it did not fail, it
  returned **nothing**, and an order assertion passed by comparing two empty arrays. A selector
  that matches nothing is indistinguishable from agreement. `iconFont.test.js` required more than
  ten distinct icon names app-wide — dropping eleven tab icons took the **whole app** to seven,
  because the hub was carrying most of them. That floor was measuring how many icons the app
  happens to use, which was never a rule; it now pins names.
- ⚠ **A stale comment had been wrong since 2026-08-15 and nothing could see it.** `hubTabTiers`
  said "6 unconditional tabs" and listed six, omitting Coaching Reference. The assertion pins the
  *conditional* count, so the total in the test's own name drifted 13 → 14 in silence.
- 🔴 **CLOSING IT FOUND TWO THINGS THE DESIGN HAD WRONG, AND BOTH WERE FOUND BY MIKE OPENING THE
  SCREEN — not by any test.** First, the design named four tabs as having a collapsible list; only
  **two** ever did, and **Quizzes now has the control** (his instruction: *"the one thing to make
  consistent please"*), each screen keeping its own storage key. Second, on the Property Tax Rules
  tab the **interest-deductibility phasing boxes showed no numbers**: five inputs share a slot
  sized 180px for one, leaving ~31px each — narrower than the spinner inside them. It held and
  saved the right value the whole time. **No test in 5,874 could have caught either.** Jest does
  not lay a page out.
- ⚠ **`listFirmCases`'s non-firm branch now has no caller from the hub.** Left alone deliberately:
  it returns the same anonymised list Case Reviews returns, so nothing is exposed, and narrowing a
  live route is a separate decision from removing a tab. Flagged, not actioned.
- **What proves it.** The suite runs **5,874 / 325 suites, zero failures**, audit gate passing.
  Ten new tests. **Every difference from the approved mockup is named** at
  [`../HUB-NAVIGATION-GROUPING.md`](../HUB-NAVIGATION-GROUPING.md) §8, including the one label —
  **"Show menu"** — that was never put to Mike, because the mockup only ever draws the menu open.
- 🔴 **Still open and now carried a third time: Mike has still not sat down with the Property Tax
  Rules tab.** He saw enough of it to find the phasing defect. That is not the same as reviewing it.

**4.20 · Finish Phase 1 of the property model — the screen, and the tax rules cascading from the
group.** ✅ Closed 2026-08-18, session 70. Filed 2026-08-17 the moment the maths was built and the
screen was not, precisely so a half-built thing would not quietly become never. It did not.

- **What was left when it was filed.** The model, its 55 golden tests and the Restify route were
  green; nothing rendered them. Left to build: the catalogue row, the page, the screen component,
  its strings, the consistency guard, and the four tax rules cascading group → firm → advisor.
- **The screen shipped 2026-08-17** (`908f1b2`), with **seven differences from the approved mockup,
  every one named** at [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md)
  §10. Two of the seven are the drawing being a drawing; five are the build knowing things the
  drawing could not.
- **The cascade shipped 2026-08-18** (`1feefa2`) — 1,156 lines, 34 tests, on the existing
  firm-overlay mechanism so version history and restore came for free. Its rules are now in
  [`tier-cascade.md`](tier-cascade.md) §4 and [`firm-manager-hub.md`](firm-manager-hub.md) §4, not
  only in a session note.
- 🔴 **The GST rule is why the tax settings could not stay assumptions.** `fee% × 1.15` was
  hardcoded *inside* the formula: an advisor read **7.5%** on screen while the model charged
  **8.625%**, and nothing said so. The other three were at least wrong *visibly* in the wrong
  country; that one was wrong **silently**.
- 🔴 **What closing it found, and it is a defect rather than a flourish: the Hub tab was built with
  NO approved artefact, and Mike has still not seen it.** Its wording is his rulings (§8 Q5, Q6) so
  nothing on it is invented — but the layout was never put to anyone. It was treated as plumbing
  attached to a report screen instead of as a screen in its own right. **A tab is a screen.**
  Recorded in full, with why a mockup drawn afterwards is not the remedy, at §10 of the design
  document. **The remedy is Mike opening the tab on the running app**, and until he does, "done"
  means built-and-tested, not seen.
- **What proves it.** The suite runs **5,861 / 325 suites, zero failures**, with the audit gate
  passing. Two guards objected before the commit was allowed through and both were right to: the
  "same screen" test wanted the new tab **named** as a tier exception rather than absorbed, and the
  generated content-routing index needed rebuilding for the new data file.
- ⚠ **The first fix to that guard was wrong and the test caught it.** The exception list is in
  **tab order**, not the order exceptions were ruled on, so appending the name failed. That is now
  a written trap at [`firm-manager-hub.md`](firm-manager-hub.md) §4 rather than a thing the next
  person rediscovers.
- **This unblocks 4.19** — properties 2 to 5, the apportionment and the consolidated report — which
  was explicitly waiting on Phase 1 and holds none of the mathematical difficulty.

**2.6 · `advisor_note` — one line from you.** ✅ Closed 2026-08-16, session 61. Carried since
2026-08-12, and it closed at four times its filed size because Mike asked a better question than
the one on the ticket.

- **What was wrong.** The *Profitability — Client Awareness Check* branch carries Mike's own
  instruction — *"This determines the delivery method. Do not use Trial Fit on an unaware client —
  it will cause map shock. Do not use Cautious Reveal on a motivated client — it will feel slow and
  condescending."* — under a key `formatNodeForPrompt` did not read. It reached the AI nowhere. The
  guard test that found it had listed it as `AWAITING MIKE` since the day it was written, because
  emitting a new field into live prompts is his call.
- 🔴 **The filed plan would have made it worse, and only running the code showed that.** The plan
  was to emit the sentence through the availability gate like `recommendation`. Put through
  `withholdUnavailableNames`, what survives is **"This determines the delivery method."** — the gate
  reads "use Trial Fit" and "use Cautious Reveal" as tools it cannot find, when they are delivery
  approaches and not documents. It would have shipped as a fix while deleting the instruction.
- 🔴 **Mike's question is what changed the shape of it:** *"perhaps AI would benefit from greater
  context? what are the notes about WHY I said not to spring it on somebody — what to look for
  etc..."* The answer was yes, **and the notes already existed** — the map shock definition, four
  observable signs of a motivated client, the resistant client's profile, and the contrast between
  the two methods, all authored in `data/trial-fit-reference.json` and
  `data/cautious-reveal-reference.json`. None of it loaded at that branch:
  `buildLearnReferenceText()` returns null for the Profitability tree, and three realistic
  profitability conversations — including *"I am not sure they realise they need a revenue model
  yet"* — all route to `profitability_feasibility`, so neither guide attaches. Rendered, the branch
  gave the model **a question and two labels.**
- **What was built.** A 1,835-character context block on that one branch, **read at run time from
  the two reference files** — no sentence copied into code — followed by Mike's ruling. The full
  19,000-character guides stay attached to their own coaching trees; the availability gate is
  untouched.
- **The artefact came first**, per the rule: [`../PF-AWARENESS-DECISION-BLOCK.md`](../PF-AWARENESS-DECISION-BLOCK.md)
  was committed (`717706d`) *before* Mike approved it, with every line traced to the file and key it
  is read from, and registered in [`../ARTEFACTS.md`](../ARTEFACTS.md) under a new heading, **"Words
  the AI is shown"** — prompt content is an artefact he approves even though it is not a screen.
  **Four differences from it are named on the artefact itself.**
- **One judgement call was put to him and he ruled on it.** One of his own Cautious Reveal signs —
  *"Client would experience map shock if shown a complex model immediately"* — names the consequence
  rather than something an adviser can observe. **Mike: keep it.** It is in the block as written.
- **What proves it.** The build took the suite 5,429 → 5,442 (+13, one new suite); closing this item
  then took it to **5,438 / 314 suites**, because `toDoItems.test.js` generates four validation tests
  per live item and retiring an item retires its four. **5,438 is the true final count** — the
  halfway figure reached the commit message and is corrected here. The new suite is the point: it reads
  every expected sentence **out of the source file at test time** and requires it to survive into the
  rendered prompt. A test carrying its own copy of the sentence would pass while the file drifted
  away from the prompt — which is this defect reproduced inside its own test.
- 🔴 **A guard beyond the plan, because the note is the one field emitted past the availability
  gate.** Safe for this note; not a general licence. A second `advisor_note`, written later and
  naming a real template the catalogue cannot serve, would reach the AI ungated. The test asserts
  `profitability_feasibility/pf_awareness` is the **only** node in the corpus carrying one, so a
  second stops the build and gets a decision.
- ⚠ **Not yet watched in a live conversation.** The proof is the rendered prompt, read end to end
  and matching the approved block line for line. Nobody has yet seen the AI *use* it with an adviser.
- **This is the third instance of one defect** — `recommendation` (55 branches), `howItHelps` /
  `deliveryNotes` (2026-08-15), and now this. **4.16 is the sweep for the rest**, and its method is
  the one that worked all three times: render the prompt and read it.

**4.9 · Make the coaching reference inherit.** ✅ Closed 2026-08-15, session 60. The fifth and last
block named in the 2026-07-30 ruling to join the one firm-editable mechanism — and the only one
whose engine shipped a session before its screen.

- **What was wrong.** The fifteen coaching entries the AI reads when it chooses which template to
  put in front of a client went to the model **exactly as shipped, for every firm on the platform.**
  The mentor could not edit them, a group could not, and a firm could only ever *add* to them by
  promoting a case. The cascade had a hole in it.
- **What was built.** Seven Restify routes (read · edit · reset · switch off · add / edit / delete
  your own), a Firm Manager tab, a pure row-builder, and 47 approved strings. The tab is
  unconditional at every tier, like the Advisory Staircase.
- **The artefact came first**, per the rule the Logic-Lab failure earned:
  [`../mockups/firm-coaching-reference.html`](../mockups/firm-coaching-reference.html) was committed
  (`f98b681`) *before* Mike approved it, with every new sentence listed at its foot. **Two
  deviations from it, both additions and both named in `9cd39c9`:** Reset to platform is also
  offered on a switched-off entry that still carries a firm edit, and Reset and Remove each confirm
  first.
- 🔴 **What closing it uncovered, and it is the more valuable half.** Exercising the finished tab
  against the running app showed that **`howItHelps` and `deliveryNotes` reached nothing at all** —
  not the prompt, not any adviser screen. Both are authored in `data/coaching-reference.json`, both
  had just been made firm-editable, both were stored correctly, and `formatEntry` rendered neither.
  A firm could have rewritten the longest and most prominent field on its new tab and changed
  **nothing** about the advice its advisers received. **Every test was green, because every test
  asked whether the field was SAVED and none asked whether it was USED.** Mike ruled both must reach
  the AI; they now do (`8d0ca29`).
- **What proves it.** Suite 5,341 → **5,429 / 313 suites**, +88 tests. And, more to the point,
  proven against the running application rather than only in tests: a firm's edit is stored,
  resolved, and **replaces Advisor-e's text in the prompt the model actually receives**; the firm's
  own added entry is in it; its switched-off entry is not.
- **A cost accepted knowingly.** The coaching block grew **8,483 → 12,846 characters**, half as long
  again, in every eligible prompt. The existing size guard refused it at 12,000 — which is exactly
  its job — and the ceiling was re-argued with the new measurement rather than quietly bumped.
- **What it did NOT get, each recorded as absent rather than forgotten:** no "platform updated this
  entry" badge and no Adopt / Keep mine (the engine stores no drift baseline, and a badge with no
  stamp behind it is a light that can never come on); no version history; and **no template picker
  on a firm's own entry — its template is free text.**
- ⚠ **The template picker is the one thing left genuinely open, and it is NOT on the live list.** A
  firm's own entry names its template by typing it, and nothing checks that the name matches a
  template in the library — so a typo coaches the AI toward something it cannot find. The named
  absence was on the approved mockup and Mike has seen it. **It is his to say whether it becomes an
  item**, and it is written here rather than filed, because an item nobody asked for is what the
  list's own rules exist to keep out.

**2.3 · Seminar's seven lines — reworded toward Public Speaking.** ✅ Closed 2026-08-15. Carried
since session 48, and it took Mike five words: **the page is called "Design & Deliver."**

- **What was wrong.** Seven Get-the-Job branches said *"Use Get Seminar template."* No page in the
  291-record library has ever been called that. The gate does the right thing and refuses to name a
  tool nobody can open, so the sentence was cut — **one branch withheld entirely, six cut back to
  their second sentence** — from the day the gate shipped (`fdb15ca`) until now.
- **Why nobody could close it.** It needed the real page name, and that is Mike's to give, not a
  developer's to rule on. He gave it the moment he was shown the seven actual sentences instead of
  being asked about *"Seminar's seven lines"* for the fourth session running.
- **What proves it.** `Design & Deliver` is in the committed library —
  Get the Job → Seminar Delivery → **Public Speaking**. Run through the production gate, all seven
  now pass **intact**, ampersand and all. Measured across the whole corpus:
  **27 whole / 14 partial / 14 withheld → 34 whole / 8 partial / 13 withheld.**
  Seven instructions started reaching advisers.
- **Guarded** by [`logicTreeRecommendationNames.test.js`](../../tests/unit/logicTreeRecommendationNames.test.js),
  which runs the real gate rather than imitating it, and is mutation-verified: putting the old name
  back on one branch turns three tests red.
- **Nothing else changed.** Seven strings, five words each — `git diff` is 7 lines.

🔴 **A bigger finding came out of it, and NOBODY HAS RULED ON IT.** These seven were seven of
**28 branches, out of 55, that lose text to the same gate.** The remaining **21** — across the
`fmc_`, `cas_`, `fbp_` and `ol_` tables — are advisers not receiving instructions, for the same
reason and with nobody having looked. It is deliberately **not** filed as a to-do: nobody asked for
it, and §7 says such an item must justify itself first. **Raise it with Mike; do not start it.**

**4.14 · The ranking control is in the Handbook.** ✅ Closed 2026-08-15 by Mike, from the control
itself — the second item ever settled that way, and the first that was settled *using the thing it
built*. All three phases shipped in one day, which is what he asked for when he said it had to be
split so it could not be lost again.

- **Phase 1** — the items became data, with a guard test on the five fields.
  [`to-do-items.json`](to-do-items.json) + [`toDoItems.test.js`](../../tests/unit/toDoItems.test.js).
- **Phase 2** — the To-Do page renders the control instead of a table, commit `7449313`. Eight
  deviations from the approved mockup, every one named in [`to-do.md`](to-do.md) §6 before it
  shipped.
- **Phase 3** — `npm run to-do` generates the ranked table from the data, and
  `npm run to-do -- <file>` brings a saved list back, commit `a003c95`. It refuses to remove a
  settled item until its closure is written on this page. **This entry is that refusal working:**
  the command declined to close 4.14 until these words existed.
- **Then it was rebuilt on his instruction**, commit `41141d6`. The first version moved a row out
  from under him the moment he marked it Park and he could not find it again. His rule —
  *"nothing leaves my sight in terms of order etc until I click save"* — is now the control's
  governing constraint and is mutation-verified by test.

⚠ **What it cost, recorded honestly:** three rebuilds in one day, one defect he found in the first
minute of real use (a UTC date stamp, a day out), and one design he called *"very poor"* — the
two-button list choice, which was ours and not the mockup's. **Every one of those was found by a
person using it, not by 41 tests.**

#### The full 4.14 record, moved here with the item

*Written on the live list while the work was open, and moved intact on 2026-08-15 when Mike
closed it. The phase table, the eight named deviations from the approved mockup, and the rule he
gave after using it are all here — the live list keeps only what is live.*

**4.14 · Put the ranking control into the Handbook.** **SCORE 1 · internal only**
- **Why:** the ranking table Mike used on 2026-08-15 was a standalone drawing with its items typed
  in by hand, and its Save only put text in a box to copy out. The Handbook already has the round
  trip it needs — edit, survives a reload, **Save writes a real file to Downloads** — so the control
  belongs there.
- **Risk:** the ranking and the notes Mike applies cannot reach the repository except by hand, so
  his own ordering decays back into prose the moment a session ends. It already has once.
- **Asked by:** **Mike**, 2026-08-15 — *"the last session developed a ranking system that I could
  apply and I could add notes. It was never coded into the handbook as we ran out of context."*
  He also asked for it to be **split across two or three sessions** so it cannot be lost again.
- **Touches:** [`to-do-items.json`](to-do-items.json),
  [`../../scripts/build-handbook.js`](../../scripts/build-handbook.js),
  [`../../scripts/handbook-shell.html`](../../scripts/handbook-shell.html), and the table in §1.

**The three phases, and where we are:**

| Phase | What | State |
| --- | --- | --- |
| **1** | The items become data, with a guard test on the five fields | ✅ **Done 2026-08-15** — [`to-do-items.json`](to-do-items.json) + [`toDoItems.test.js`](../../tests/unit/toDoItems.test.js) |
| **2** | The Handbook's To-Do page renders the ranking control instead of prose | ✅ **Done 2026-08-15** — [`../../scripts/handbook-shell.html`](../../scripts/handbook-shell.html) |
| **3** | The Save file comes back into the data; this table is generated from it | ✅ **Done 2026-08-15** — [`../../scripts/apply-to-do.js`](../../scripts/apply-to-do.js) + [`applyToDo.test.js`](../../tests/unit/applyToDo.test.js) |

**The approved artefact is [`../mockups/to-do-list-table.html`](../mockups/to-do-list-table.html)** —
Mike used it to set the current order, so it is approved by use. Phase 2 was measured against it, and
**every deviation is named below** rather than left to be discovered.

### Phase 2 — every difference from the approved mockup

Approved by Mike on 2026-08-15 before the build. The mockup remains the artefact; this is the
record of where the shipped control departs from it and why.

| # | The mockup | What shipped | Why |
| --- | --- | --- | --- |
| 1 | Fourteen items typed into the script | The live ten, read from [`to-do-items.json`](to-do-items.json) | Six of the mockup's were already wrong — four settled on 2026-08-15, one deleted, and 4.14 did not exist |
| 2 | Save put a markdown table in a copy-out box | Save writes `to-do-items.json` to Downloads | Mike's ranking returns as data, which is what phase 3 consumes. His explicit call |
| 3 | Two drop-downs listing deleted and parked work | Removed | The Handbook already shows both behind its **Done & parked** gate on the same page, generated from [`to-do-done-and-parked.md`](to-do-done-and-parked.md). Two copies drift |
| 4 | The browser's saved copy silently outlived any change to the list | The two lists are merged, and what changed is *reported* | See the rule below — the two-button version lasted one afternoon |
| 5 | The `#` column sorted by blockers-then-score, and settled rows sank to the bottom | **Nothing reorders itself at all** | See the rule below — this one Mike gave after using it |
| 6 | Expanded row held why · risk · touches · comment | Adds *what it blocks*, the *asked-by* detail, and the item's note | The data carries all three and §2 calls **asked by** the field that matters most. Dropping them would hide it |
| 7 | **Start again** and **×** discarded immediately | Both confirm first | What is discarded is Mike's own calls, and they exist nowhere else until he saves |
| 8 | Fact columns collapsed at 720px | They collapse at the Handbook's own 900px | The shell has one breakpoint; a second would be a second answer to the same question |

### 🔴 The rule Mike gave after using it — 2026-08-15

> **"Nothing leaves my sight in terms of order etc until I click save."**

He marked the release item **Park**, and the row dropped to the bottom of the table before he could
type the reason. He could not find it again. In his words: *"the handbook is clunky and confusing —
I see the chances of a fuck-up occurring… this is very poor design."* He was right, and both faults
were ours, not the mockup's:

- **Settled rows sank to the bottom.** Taken from the mockup, where every call had already been made
  before anyone looked at the screen. In use it is exactly backwards — the moment you settle an item
  is the moment you need to write *why*, and the box has just left the screen.
- **The stale warning made him choose between two lists he could not compare.** That was our
  addition, not the mockup's. A decision with no information attached to it, where either answer
  could throw away work.

**What the control does now:**

1. **Nothing moves on its own, ever.** Settling, scoring, or flagging an item as a blocker repaints
   that row where it stands. The only thing that reorders the list is Mike pressing a sort heading,
   a banner says so while it is sorted, and **Back to my order** restores it in one click. What is on
   screen is what Save writes. Pinned by test, and the test is mutation-verified against the exact
   bug he hit.
2. **Choosing Park, Done or Delete asks for the reason there and then** — the box takes focus, its
   label becomes *"Why you are marking it Park"*, and the row is flagged amber until something is
   written. The count line carries *"N still need a reason"*.
3. **The two-button choice is gone.** His work and the project's list are merged: his copy of an item
   wins, in his order; new items are appended and named; an item that has left the project is
   reported **with his comment on it**, so his words outlive the item. It is information, never a
   question — because nothing of his is discarded, there is nothing to ask.

⚠ **Not built, and it is not in the mockup either: an item cannot be dragged up or down.** The
ranking is applied through the score, the **Your call** column and the three sortable headings —
which is what the approved artefact does. If moving a row by hand is wanted, it is a new decision,
not a deviation.

**4.4 · A Handbook edit survives a reload — and the ranking control works.** ✅ Closed 2026-08-15
by **Mike**, and only he could close it: this machine has no browser automation, so no session could
ever have proved it for him. He opened the To-Do page, marked this item **Done**, left a comment on
it and pressed **Save the list**.

- **`to-do-items.json` arrived in Downloads**, 11.6 KB, at 11:36 — a real file from a real click.
- All ten items came through, **his ordering intact**, with his call and his comment on the row.
- **The settled item sank out of the ranking to the bottom**, which is the behaviour the whole
  screen is built around and had never been seen happening.
- His comment, kept because it is the only first-hand record of the test:
  *"We should be able to get this sorted straight away. Check if this works."*

⚠ **It also found a defect, in the first minute of real use.** The saved file was stamped
`2026-08-14`. The control built its date from the browser's UTC clock and Mike is twelve hours ahead
of UTC, so **every save before midday recorded yesterday**. On a project where the date on a record
is what settles who decided what, that is not cosmetic. Fixed the same day — the date is now read
from local time, and `tests/unit/buildHandbook.test.js` fails if `toISOString` is ever used for it
again. **Nine tests over the control could not catch this and no test could have:** it needed a
person, in a timezone, pressing the button.

**The master team can now be handed a release with instructions.** ✅ Closed 2026-08-14, commit
`206476a`. Four things that would each have cost them an afternoon, none of them ever on this list
because nothing was looking at *loading* the app rather than building it:

- **`HOST` and `PORT` were silently ignored.** `nuxt.config.js` set both explicitly, and Nuxt merges
  that file over the defaults its own `HOST`/`PORT` lookup produces — so a server setting
  `HOST=0.0.0.0` saw no change at all, which reads as a broken build rather than a setting that
  never applied. Both now read the variables and keep the loopback default when unset. **Proven
  live the same afternoon, by accident:** a script of mine hit `ECONNREFUSED 127.0.0.1:3000`
  against a server answering perfectly on `::1`.
- **`package.json` said `0.6.0`** through the whole of v0.7.0 and v0.8.0. Corrected, and held by
  `tests/unit/releaseVersion.test.js`, which compares it to the newest `RELEASE-NOTES-v*.md` file.
  Fixing the number alone would have expired at v0.9.0 — nothing reads that field, which is exactly
  why it drifts.
- **There was no `.env.example`.** The variables were spread across three documents and
  `OPENAI_API_KEY` — the one that stops the app dead — was in none of the tables. Now one file,
  grouped by whether UAT needs it, names only.
- **There was no load pack.** [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md), linked from the README:
  pull the tag, the runtime, the environment, the schema **including the reserved `firms` rows**,
  the screen addresses (nothing in the app links to them), and how to prove the app really started.

**A rule Mike never made, removed from the four places still asserting it.** ✅ Closed 2026-08-14,
commit `7aee852`. *"The dev server belongs to Mike — never start or restart it"* was invented by an
AI session on 2026-07-21 after a bad afternoon, written into `WORKING-AGREEMENT.md`, and quoted back
at him as his own instruction. He struck it out on 2026-08-03; it survived in the report skill, the
progress handover and three places in `ACTIONS.md`, **and was quoted at him again on 2026-08-14**.
All four corrected, each keeping the original wording quoted so the trail survives. The July session
notes keep their copies deliberately — they are the record of what was believed at the time.

**The advisor screen's words can be changed without a developer.** ✅ Closed 2026-08-14 (was
§4.5), commit `bf9c7fe`. 87 interface strings moved out of `VirtualAdvisor.vue` into
`locales/en.json` under `advisor.*` — buttons, prompts, placeholders, the 14 domain-dropdown
labels, the section banner. **Not one word changed**, verified mechanically: every phrase removed
from the component appears byte-identical in the wording file. **The item's title was wrong and
believing it would have cost the session** — it named "the report screens and parts of the advisor
screen", and the report screens never had the problem. Every apparent hit on them was inside a
JSDoc comment. The whole item was one file. Held by two new tests, because an unresolved key does
not throw — vue-i18n prints the key on a button while every other test passes.

**The duplicate of the Workshop 1 primary-issues list is gone.** ✅ Closed 2026-08-14 (was §4.5a),
commit `7f69a74`. The plan was to wire the component to `data/primary-issues.json`. **Checking
first showed that would have been busywork on code that cannot run**: the selector was retired
from intake 2026-06-10, and the marker that opens it exists nowhere that emits it — so neither
copy was reachable. Removed the card, its state, three methods, the styles and the duplicated
const, about 100 lines. **The marker strip was deliberately KEPT** on both reply paths: a model is
not a compiler, and an advisor must never read `[PRIMARY_ISSUE_SELECTOR:profit]` in a reply.
**`data/primary-issues.json` was kept** — authored content, and deleting content is not the same
act as deleting dead code.

**An advisor can correct the AI's read in plain words.** ✅ Closed 2026-08-14 (was §4.5b), commit
`a168123`. The question was whether the capability survived the deletion above. **It never
depended on it** — the correction is conversational. But answering the question found a real
defect: the switch required the reply to contain the *entire* label, so *"no, it's really about
staff"* did nothing while *"you've got it wrong"* triggered a full reset. **The engine answered
annoyance and ignored a calm, specific correction**, and it failed silently — the advisor believes
they were understood and the advice stays wrong. Fixed by `resolveDomainCorrection`, deliberately
conservative because a wrong switch is worse than no switch. Eleven failing tests written first.
The rule now lives in [`virtual-advisor.md`](virtual-advisor.md) P9.

**The whole authored-commentary sweep is DELETED — documents, tasks and code.** 🗑 Removed
2026-08-15 on Mike's instruction, after he asked who had requested it. Nobody had: the confirmed
fabrication (the A.I.D.C.R.A expansion) was his own find and he fixed it on 2026-07-31, then
deferred the follow-up in writing. The *"blast radius was never measured"* line that spawned
everything after it was written by an AI session, not by him. When it was finally measured on
2026-08-14 the fact-level result came back **clean — all 140 checkable claims verified present**,
and what the sweep then pursued instead was a writing-style question nobody had asked for.

Removed: the sweep record, the provenance Brief and its history, the approved mockup, the marking
mechanism (nine tags in `strategy-domain-support.json`, the AI prompt block, the *"This is our
wording"* control, three test files, five locale keys) and to-do items §2.10, §4.6, §4.6a, §4.6b
and §4.6c. Mike's ruling, verbatim: *"if it doesn't serve the user, make the system better quality
or robust, improve marketability — then get it the fuck out of my app."* That is now the standing
test in [`product-principles.md`](product-principles.md). **The A.I.D.C.R.A correction stays** — it
was the real defect and it is fixed in the data.

⚠ **The lesson running through all four: a backlog title is a claim, not a fact.** Two items in a
row were mis-titled in a way that would have produced real work with no effect. **Measure first.**

**A new feature starts as a Handbook page — and it is now one command.** ✅ Closed 2026-08-14,
part 3 of Mike's instruction and the last of the three. `npm run feature "<name>" "<group>"
"<summary>"` writes the Brief, the History and the index row from the skeleton the other pages
already use, so the page exists before the code does. It refuses to overwrite an existing page,
refuses a group [`README.md`](README.md) does not already have — a typo would otherwise invent a
navigation category that reads on screen as a real one — and refuses a name whose slug would
collide with the `-history` suffix the generator pairs by. Nothing is written until every check
passes, so a refusal never leaves half a feature on disk. Both pages it writes are stubs and say
so at the top, because a plausible-sounding Brief nobody wrote is exactly what this folder exists
to prevent.

**The reason it is a command and not a discipline:** every part of the setup a person has to
remember is a part that gets skipped under time pressure, and the feature whose page gets skipped
is the rushed one — the one that most needed it. Typing one line is faster than writing two pages
by hand, so the compliant route is now also the lazy route.

What proved it: [`tests/unit/newFeature.test.js`](../../tests/unit/newFeature.test.js), and a live
run — a throwaway page created, picked up by `npm run handbook` as page 26 with its History behind
the gate and no *Unlisted* warning, then removed. **Its last block is the one that matters**: it
checks the folder rather than the script, failing if any Brief anywhere ends up without a History
or without a row in the index, however it got there. Testing the tool would have left the rule
unguarded.

**The Handbook can be rebuilt, and its design cannot quietly change.** ✅ Closed 2026-08-13.
This item used to read *"the Handbook cannot be rebuilt — the generator was deleted with its
session"*, **and that claim was false.** The generator was on the machine the whole time; `find`
located it in four seconds — but only *after* a replacement had been written from a written
description of the page, in a different palette, with the History pulled out of the gate the index
says it sits behind. Every check passed, because every check compares the code to the note and
nothing compared the build to the artefact.

What proved it: the original shell restored byte-for-byte (matching MD5) into
[`scripts/handbook-shell.html`](../../scripts/handbook-shell.html), and the rebuilt output checked
against the original's own output — identical 24 page ids, identical 24 gates, byte-identical
stylesheet. Three faults in the original were fixed on the way (a hand-typed page list that had
already drifted from the index, a hardcoded path that ran on one machine, and a substitution that
filled only the first match and once published 412 KB of nothing). The design is now pinned by
test, and [`ARTEFACTS.md`](../ARTEFACTS.md) registers every approved artefact so one can never
again exist with no footprint in the repository. Full story:
[`handbook-history.md`](handbook-history.md).

**The Handbook opens itself, and work is picked from it.** ✅ Closed 2026-08-13 — parts 1 and 2
of Mike's instruction. `/startup` builds it, republishes it to its one recorded address and opens
it, so the page cannot drift from the repository; step 4 reads [`to-do.md`](to-do.md) instead of
the 6,000-line backlog. `/shutdown` mirrors it, updating the Brief first. `WORKING-AGREEMENT.md`
carries the same change, because both commands name it as their source of truth. **Part 3 — a new
feature starting as a page — closed a day later**, immediately above.

**A refused database save was reported as saved.** ✅ Fixed 2026-08-13. Every store fell back to a
local file whenever a query failed, and the only test was "are we not in production?" — so a
genuine refusal by a live database looked identical to having no database at all. **UAT is not
named `production`**, so the master team could have exercised the whole cascade, watched it work,
and signed it off having proved nothing. The fix discriminates on a code only a live server's
rejection carries; fourteen files now ask one helper. ⚠ **Not yet proven against a real MySQL** —
worth five minutes the first time the master team has one in front of them.

**`dotenv` was used but never declared.** ✅ Closed 2026-07-30, pinned exactly. It existed only
because a frontend build package happened to pull it in — had that shifted, the backend would
still have **booted**, printed one quiet note, and run with no API key at all.

**The availability gate was raised as a live fault and is not one.** ✅ Measured 2026-08-13. Of
the titles that exist in our mirror but not the master export, **zero** are referenced by any
decision branch and **zero** by any prose field. It is a latent weakness, not a defect. Recorded
so nobody re-derives it — and because the raw counts that first looked alarming were worthless.

**The negative tab gates.** ✅ Fixed. Three tabs were gated on "not the mentor", written when only
two tiers existed. A third tier would have switched two tabs on and made another vanish, with
nothing erroring and no test failing. Every tier is now named positively.

**The fake team dashboard.** ✅ Deleted. It returned invented advisors after a fake delay, and its
"AI insight" was string concatenation over those invented numbers. It was an accepted development
stub — and a manager would have been looking at fiction on a screen carrying their own firm's
name.

**The report screens' look.** ✅ Standardised and guarded. Eight screens each carried their own
copy of the frame, palette, cards and fonts under a different naming scheme; one shipped with no
frame at all and the build stayed green. Now one shared shell, one set of numbers, four tests that
fail the build on divergence.

**Course builder: five phases, twenty-four items.** ✅ Built, tested and pushed the same day the
plan was approved. Included the two that mattered most — a failed revision can no longer leave an
advisor with nothing, and a grading failure records "ungraded" instead of inventing a pass.

**The distinctions cascade.** ✅ Built through five stages, including the one that decides what
happens when the mentor deletes a row a firm had customised: **keep theirs**.

**Collaborate merged.** ✅ Slices 1, 2 and 4 — the code came across wired to nothing, the two
backends became one, and the manager console became a hub tab. Live-verified on the running app.

**Advisor progress: honest failure.** ✅ The read routes used to swallow database errors and
substitute an empty result, so a broken connection and a brand-new advisor produced exactly the
same screen.

---

## 3. The pattern in all of it

Read the closed list above and one shape repeats: **almost every serious fault rendered
confidently, passed its tests, and was wrong.**

A save that reported success. A screen of zeros that meant "refused". A fake dashboard that was
more convincing than the real one. A banner that existed but in the wrong place. A locale that
silently reverted to English. A quiz override that never fired. A gate that would have switched
tabs on for a tier nobody had created yet.

None of them crashed. None of them failed a test. Every one was found by a person reading the
code.

**That is the argument for this whole set of documents** — and for the rule at the foot of the
live list: a warning written in prose is not a task, and only a task gets done.

---

## 4. Where the full record is

[`../ACTIONS.md`](../ACTIONS.md) — ⛔ **FROZEN 2026-08-24.** The historical backlog, 7,400+
lines, including the verified sweep of 2026-08-03 that first established the real number is
about ten. Nothing is added to it and nothing is triaged from it; it stays as searchable
history. ⚠ Read its own warning: *"Trust the CODE, not these flags"* — three separate items
were found already built while still flagged open. **The live list is
[`to-do-items.json`](to-do-items.json).**

[`../ACTIONS-ARCHIVE.md`](../ACTIONS-ARCHIVE.md) — completed work, verbatim, by date. Nothing is
deleted, only moved.

[`../STATUS.md`](../STATUS.md) — a generated table. ⚠ It only updates when somebody runs the
command by hand, carries no generated-on stamp, and its line links drift. See §2.8 of the live
list.
