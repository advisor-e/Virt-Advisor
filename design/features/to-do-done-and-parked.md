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

[`../ACTIONS.md`](../ACTIONS.md) — the full 6,135-line backlog, including the verified sweep of
2026-08-03 that first established the real number is about ten. ⚠ Read its own warning:
*"Trust the CODE, not these flags"* — three separate items were found already built while still
flagged open.

[`../ACTIONS-ARCHIVE.md`](../ACTIONS-ARCHIVE.md) — completed work, verbatim, by date. Nothing is
deleted, only moved.

[`../STATUS.md`](../STATUS.md) — a generated table. ⚠ It only updates when somebody runs the
command by hand, carries no generated-on stamp, and its line links drift. See §2.8 of the live
list.
