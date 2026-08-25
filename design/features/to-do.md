# The To-Do List

> **This is the whole live list. If it is not here, nobody is doing it.**
> Finished work, and work deleted for failing the product test, is on
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
>
> **Last verified against the code: 2026-08-15** (session 60), item by item.

---

## 1. The list — blockers first, then score

🔴 **Ordered by Mike himself, 2026-08-15, from the Handbook control.** **This is his order, not a
computed one** — where his call and the score disagree, his call wins and the score stays visible
so the disagreement is on the page rather than hidden.

🔴 **The table below is generated. Do not edit it — your edit will be overwritten.**
[`to-do-items.json`](to-do-items.json) is the source; `npm run to-do` rewrites the block between the
markers from it, and [`../../tests/unit/applyToDo.test.js`](../../tests/unit/applyToDo.test.js)
fails the build if the page and the data have drifted apart. It is no longer a second copy kept in
step by hand. *(§2's "not yet enforced" is now enforced.)*

🔴 **A list saved from the Handbook comes back with `npm run to-do -- <file>`** — Mike's order, his
scores, his calls and his comments, validated against §2's five fields before anything is written.
**An item he settles does not silently vanish:** the command applies *nothing at all* until that
item's closure is written on [`to-do-done-and-parked.md`](to-do-done-and-parked.md), and prints the
block that needs writing. An item gone from both pages is an item nobody knows existed.

🔴 **In the Handbook this table is a control, not a table.** The generator replaces it with the
ranking screen from [`../mockups/to-do-list-table.html`](../mockups/to-do-list-table.html) — score
it, mark **Proceed / Done / Park / Delete**, comment on any row, and **Save the list** writes
`to-do-items.json` to Downloads for a session to apply. The table below is what a reader of the
repository sees; the two never both appear, and the build stops if they would.

<!-- BEGIN GENERATED: the ranked list — npm run to-do -->
| # | Item | Score | Blocks | Waiting on |
| --- | --- | --- | --- | --- |
| 1 | **4.15** The 21 branches that still name a page nobody can open | 4 | — | **Mike** |
| 2 | **4.50** The hidden-marker change has never been run in a real conversation | 2 | — | **Mike** |

**Two live items. Two need Mike.** If this list passes about twenty, something is wrong.
<!-- END GENERATED -->

**Four items came off on 2026-08-22, and one joined and left the same day** — see
[`to-do-done-and-parked.md`](to-do-done-and-parked.md):

- ✅ **4.34** — **the Model Guide's Coach reading carries its real figures.** Raised by Mike
  the evening the page shipped (*"it makes this section worthless"*) and closed the next
  morning. The sentence stays the one source both the screen and the AI share; each now
  fills the same `{gaps}` from the same figures, computed **by calling the model function
  the screen's own route calls** — so the guide reads $120 · 30 days · $1,800 because that
  is what the screen reads.
  🔴 **The item's own plan was wrong in one place, and checking it is what found it.** Two
  readings were computed inside `.vue` files, so quoting them would have meant writing the
  same sums twice. They were moved into the models instead, and both screens now read them
  from there.
  🔴 **And the fix introduced a risk that was surfaced, not shipped quietly:** the AI now
  reads real money where it read `[amount]`. Mike ruled the same day that both headings name
  the figures as samples in the same breath as the number. A test fails if either loses it.
  ⚠ **Layout not verified by eye** — the rendered words are asserted, the look of the longer
  headings is not. That gap is **4.25**, below.

- ✅ **4.29** — **the AI has been told the report models exist.** What each of the ten built
  models serves, its key calculation output, what the advisor must supply, when to reach for
  it and **what it does not cover** now reach the client-mode prompt — proven against the
  assembled prompt string, not a source scan. A guard holds it to the catalogue **both ways**,
  so a model going live cannot stay invisible and a model with no page can never be named.
- ✅ **4.32** — **raised and closed the same session, which is the point of it.** 4.29 put the
  models in the prompt and stopped: no mode prompt invited the AI to mention one, and asked
  live it returned three templates and no calculator. Rather than quietly widening 4.29, it
  became an item — Mike ruled *"yes and both if its appropriate"* the same afternoon, and both
  modes now carry the invitation **with its brake**: a calculator appears only when one
  genuinely fits, always with its page path, never in place of a template, and the search
  mode's "end there, full stop" rule is untouched. Verified against the running app four
  times, including a question where nothing fitted and no calculator was offered.
- ✅ **4.28** — **the AI Prompts tab is built**, at all four manager tiers, and the engine that
  had shipped the day before is no longer a half-fix. Redrawn first on Mike's ruling that the
  page is for an accountant and not an engineer: the security document is **mentor-only**, and
  below the mentor it is four plain sentences under *How your clients' information is protected*.
  Proven by 93 tests **and** by driving the running app at both loginable tiers.
  🔴 **One defect was caught in the build:** the panel's fourth sentence promised something the
  system does not enforce. Replaced before shipping — the same fault Mike found in the two
  fetch-burst boxes, in prose instead of in a control.

**Four items came off this list on 2026-08-21, and six joined it** — see
[`to-do-done-and-parked.md`](to-do-done-and-parked.md):

- ✅ **3.5** — **Mike sent Carl's email himself.** The draft had existed since 2026-08-17 and
  answers the `npm install` question for v0.7.0, v0.8.0 and v0.9.0 explicitly.
  🔴 **Why it sat twelve days is the part worth keeping:** his instruction of 2026-08-15 —
  *"draft the email you want me to send Carl and I'll pass it on"* — **was deleted by the
  Handbook control on save**, so no session after that one could see he had asked. The item did
  not wait on a decision; it waited on a sentence nobody could read. Fixed in `838f3a0`.
- ✅ **4.22** — closed by Mike, and **the item's premise was what was wrong.** It asked which
  year-one add-back is correct for New Zealand; the product's answer is that no single answer is
  correct for everybody, which is why it became a firm-manager setting on 2026-08-17. Verified
  rather than taken on trust: `yearOneAddBack` is a field on
  [`../../components/firm/FirmPropertyTaxRules.vue`](../../components/firm/FirmPropertyTaxRules.vue).
  ⚠ **What it leaves:** the shipped default still applies **silently**. The pattern that fixes
  that — a default which must announce itself — arrived the same day in `data/ai-prompts.json`
  and is not yet applied to the property model.
- ✅ **4.12** — closed **without doing what it said**, because its premise was never true. It named
  Collaborate's `START-HERE.md` and `HANDOVER.md` as describing a standalone app; **neither file has
  ever existed in this repository** (`git log --all` finds them never added and never deleted), and
  the documents the master team does receive already describe a section of this app. It was ranked
  **first** and was the list's only blocker.
  🔴 **Checking it found the real fault:** [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md) still told
  the master team the newest release was `v0.8.0`, four days after `v0.9.0` was tagged — and on the
  same morning Mike emailed Carl telling him to pull `v0.9.0`. Corrected.
- ✅ **4.19** — the property model is finished. All five Phase 2 steps: the maths and its golden
  test, the route taking two shapes on one URL, **the drawing before the screen**, the screen, and
  the catalogue line. Carried since 2026-08-17, when Mike put it on the list himself after asking
  whether the other four properties were ever coming.
  🔴 **The drawing was its own numbered build step and it was not absorbed into "the screen"** —
  which is exactly what happened to the Property Tax Rules tab, recorded in §10 of
  [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md). Mike ruled its six
  questions in one line (*"looks great - move forward"*) and opened the built screen.
  🔴 **Closing it found two defects with 5,885 tests green**, both by reading the screen's rendered
  words rather than by any assertion: a scalar indexed as a ten-year series, so the client's cash
  deposit showed as ten dashes; and a deposit box left blank beside a total that had visibly had
  that money taken off it. That reading step is now **P19** of
  [`report-models.md`](report-models.md) §5 so it is a build step, not a lucky habit.
  ⚠ **And it found a hole nothing can close by itself:** layout was shipped **unverified**, because
  no browser driver was installed. That is now **4.25** — a job, not a warning. The two wording
  calls it left with Mike are **4.26** and **4.27**.
  ✅ **4.27 closed 2026-08-25** — Mike struck the sentence; the tax rules stay portfolio-level.
  ✅ **The driver half of 4.25 closed the next day** (2026-08-21, `7fa5e9a`): `playwright` pinned to
  exact **1.34.3**, the last release that runs on the locked Node 14.15, configured so no other
  machine downloads a browser on `npm install`. **4.25 stays open** — the project can now see a
  rendered page, but no test does yet.

**One item came off this list on 2026-08-20** — see
[`to-do-done-and-parked.md`](to-do-done-and-parked.md):

- ✅ **4.24** — the Coaching Reference is folded into Logic Tables and gone. All fifteen rows were
  read against the tree covering the same ground **before anything was deleted**: seven said
  nothing the trees do not say better, and **seven gave up a sentence or two that was moved**, two
  of them as *trigger words* rather than notes so a client's own phrasing now opens the tree. The
  block, its cascade, its seven routes and its tab went on Mike's instruction (*"remove the tab"*).
  The firm-promoted case observations are untouched and still fenced.
  🔴 **The reading step justified itself twice.** One row was reported here as matching no template
  and no tree; **Mike produced the source deck and it turned out the template existed under a
  different name and the material was already in Domain Support** — the search that called it
  missing had been run on the row's own stale title. And folding that row into the Heald Matrix was
  proposed and would have been wrong: both teach coping styles, but from **different Enneagram
  triads**. Deleting on the first reading would have lost the content and the distinction.

**One item joined and came off again on 2026-08-19** — see
[`to-do-done-and-parked.md`](to-do-done-and-parked.md):

- ✅ **4.23** — the Firm Manager Hub sidebar, built the session after it was designed. Raised by
  Mike unprompted (*"the hub is getting overwhelming for a firm manager"*), and he proposed the fix
  himself. It shipped with **every difference from the approved mockup named**
  ([`../HUB-NAVIGATION-GROUPING.md`](../HUB-NAVIGATION-GROUPING.md) §8), and the duplicate cases tab
  above the firm tier went with it. **No tab body moved** — the panels stayed exactly where they
  were, so the change was 17 single-line swaps rather than a rewrite.
  🔴 **Closing it found two faults nothing in 5,874 tests could have seen, and Mike found both by
  opening the screen** — a *Hide list* control missing from Quizzes, and the property tax phasing
  boxes showing no number because five inputs share a slot sized for one. **Jest does not lay a
  page out.** It never carried a score of his; the 4 was provisional to the end.

**One item came off this list on 2026-08-18** — see
[`to-do-done-and-parked.md`](to-do-done-and-parked.md):

- ✅ **4.20** — Phase 1 of the property model is complete. The screen shipped 2026-08-17 with all
  seven differences from the approved mockup named; the tax rules cascading from the group shipped
  2026-08-18. 🔴 **Closing it found that the Hub tab was built with no approved artefact and Mike
  has still not seen it** — the wording is his rulings, the layout was never put to anyone. A tab
  is a screen, and this one was treated as plumbing attached to a report. **This unblocks 4.19.**

**One item came off this list on 2026-08-16** — see
[`to-do-done-and-parked.md`](to-do-done-and-parked.md):

- ✅ **2.6** — `advisor_note` reaches the AI, and the reasoning goes with it. Filed as one sentence
  to emit; it closed at four times that size because Mike asked *"what are the notes about WHY I
  said not to spring it on somebody — what to look for?"* The answer was that the reasoning had been
  authored all along and never loaded at that branch. 🔴 **The filed plan would have shipped as a fix
  while deleting his instruction** — only rendering the prompt showed it. Approved artefact:
  [`../PF-AWARENESS-DECISION-BLOCK.md`](../PF-AWARENESS-DECISION-BLOCK.md).

**Five items came off this list on 2026-08-15** — see
[`to-do-done-and-parked.md`](to-do-done-and-parked.md):

- ✅ **4.9** — the coaching reference inherits, and now has a screen. Session 60 built the visible
  half: seven routes and a Firm Manager tab, so a firm can finally answer the engine that shipped
  the session before. 🔴 **Closing it found two fields that were authored, stored, firm-editable and
  reached no prompt at all** — the reason **4.16** is now on the list.
- ✅ **2.3** — Seminar's seven lines. Carried since session 48; closed in one message once Mike was
  shown the seven actual sentences instead of being asked about them by label. The page is
  **Design & Deliver**. 🔴 **21 other branches still lose text to the same gate and nobody has
  ruled on them.**

- ✅ **4.4** — a Handbook edit survives a reload. The first item ever settled that way, and it found
  a date defect in the first minute of use.
- ✅ **4.14** — the ranking control. All three phases in one day, then rebuilt on his instruction
  after the first version moved a row out from under him.
- ⏸ **2.1** — announcing `v0.8.0`. Parked, not done: *"we will need to issue a new release."*
  🔴 **Nothing on this list now covers cutting that newer release.** That gap is deliberate and it
  is his to close.

⚠ **Four items were scored 5 by Mike on 2026-08-15 — 4.12 (now closed), 4.9 (now closed), 4.7 (now closed) and 3.5 — and by §2's table a 5
means security, privacy or data integrity.** Read alongside his comments (*"just get it done"*,
*"should never have been parked"*) he was plainly using 5 to mean **do this now**, not to name the
category. **His scores are recorded exactly as he set them and have not been adjusted.** The
mismatch is written here rather than quietly corrected, because §2 says the disagreement belongs on
the page.

### Settled by Mike on 2026-08-15 — off the live list

**The through-line in all four: the master app already provides this, and our side only had to
offer the connection point.** Verified in the code the same day — `config/integration.js` is that
point, and it is one file with no code change behind it.

**3.1 · Provision MySQL — DONE.** Not ours and never was. `server/utils/db.js` is a singleton pool
reading `config/integration.js` → `DB`; five values and it is live. Nothing to build.

**4.8 · The course-builder walk-through — PARKED.** In Mike's words: *"So long as you have created
the stubs or connection point — only the master coding team can complete this. If there's anything
specific you need to know, in technical terms to enable you to make provision for this, draft me
the email and I will provide you their response — else park it."* ✅ **Verified 2026-08-15: the
connection points exist**, and the email is drafted at
[`../MASTER-TEAM-INTEGRATION-EMAIL.md`](../MASTER-TEAM-INTEGRATION-EMAIL.md).

**3.3 · Firm membership data — PARKED.** Mike: *"All of this will be provided by master coding
team once they hook up to the master app. All of the IDs already exist — this ties in with the
MySQL database task."* ⚠ **One technical detail is genuinely still open and is question 5 of the
email:** a *manager's own* group arrives in their token and already works, but mapping *a firm* to
its brand and country needs a source we do not have. Until it exists `parentScopeOf()` returns the
platform scope — it falls back flat, it never guesses.

**3.2 · The middle-tier logins — PARKED.** Mike: *"Already provided for by the master app — login
and authentication and creation of accounts already exists in master app. You just need to create
stubs or make provision for master coding team to hook up."* ✅ **The provision is already there
and deliberately fails closed:** `globalManagerRole` and `groupManagerRole` are empty strings that
match no role, so no token can resolve to a tier that does not exist yet. Two role values and two
claim names, all four in the email.

---

## 2. How an item earns its place — the scoring system

**Built 2026-08-15 on Mike's instruction**, after two pieces of unrequested work reached him in one
day dressed as priorities: *"it also needs a ranking against my feature criteria — if it's a
security issue it gets 5 points, if it's a user enhancement it gets 4 points etc. This will keep us
all honest."*

### The score

| Score | What it is | The test it has to pass |
| --- | --- | --- |
| **5** | **Security, privacy or data integrity** | Someone's data could leak, reach the wrong tier, or be lost without anyone noticing |
| **4** | **The user is worse off without it** | An adviser or their client gets worse advice, a wrong screen, or no screen |
| **3** | **It helps sell the package** | A competitive advantage, or something a buyer asks to see before they commit |
| **2** | **Robustness — it fails better** | Nobody sees it until something breaks, and then it decides how bad the break is |
| **1** | **Internal only** | Helps us work. No customer would ever see it |
| **0** | 🔴 **Fails all of it** | Serves no user, fixes nothing, sells nothing. **A zero is not filed — it is deleted, with its code.** |

### The five things every item must say

An item missing any of these is not a task, it is a note — and notes are what produced the two
wasted pieces of work on 2026-08-15. ✅ **Enforced since 2026-08-15.**
[`../../tests/unit/toDoItems.test.js`](../../tests/unit/toDoItems.test.js) fails the build on an
item missing any of the five, on a score outside 1–5, on an `askedBy.ours` claim with nothing
justifying it, on a duplicate ref, and on a blocker that does not say what it blocks. It is
mutation-verified — dropping a `risk` line, claiming *ours* with no reason, and filing a 0 instead
of deleting were each confirmed to fail it.

1. **Score** — from the table above.
2. **Why** — why it matters, in one sentence.
3. **Risk** — what we actually lose by not doing it. If nothing is lost, the score is 0.
4. **Asked by** — **who wanted it.** Not who it waits on. ⚠ **If this cannot name Mike or a named
   person outside the project, say so plainly** — that is the single field that would have caught
   both of 2026-08-15's wastes, because neither could have filled it in.
5. **Touches** — what else in the app moves if this moves.

### How the order is decided

**Blockers first, then score.** An item that holds up other people beats a higher-scoring item that
holds up nobody — a 3 that unblocks a whole team is worth more this week than a 4 that waits
comfortably. 🔒 marks a blocker.

---

## 3. Release position — read before picking anything up

### 🔴 THE RELEASE NUMBER IS PARKED BEHIND THE TECHNICAL WORK — Mike, 2026-08-15 (session 60)

> **"lets sort the new release number when we've sorted all the tech issues, till then stay
> focused on the tech issues for uat testing"**

**Do not raise the release number again until the technical items on this list are cleared.** It
is not an open decision waiting on him, and it is not a blocker — it is *sequenced after* the work
below.

⚠ **This entry exists because the question was put to him three sessions running** — 58, 59 and
60 each listed it as the top open decision, and each time it was the same question he had already
answered by parking **2.1**. A decision that keeps being re-asked is a decision nobody wrote down.
**The goal is unchanged** — the master team testing in UAT — but the *number and the
announcement* come after the technical list, not alongside it.

**What this does NOT change:** the 2026-08-14 ruling below still stands. The bar is still key
functionality in position, and finer detail is still deferred to early production beta.

---

🔴 **Ruled by Mike, 2026-08-14. Getting another release to the master coding team is the
priority.** In his words: *"I want all key functionality and key pages in position so we can load
into UAT and get initial thoughts sorted — details like this domain word sweep can be done in
early production beta stage."*

- **Key functionality and key pages in position** — that is the bar. Not polished, not complete.
- **Finer detail is deferred to early production beta.** The domain-support word sweep was the
  named example, **and on 2026-08-15 Mike deleted it outright** rather than deferring it.
- **This SUPERSEDES the ruling of 2026-08-11** — *"no PR to `master` until the task list is
  clear"*. That position is withdrawn.

### 🔴 The ordering rule — Mike, 2026-08-15

> **"I want to clear all technical / feature issues first so the master team can start testing in
> the UAT — THEN I can double back and sort the fine tuning — wording — doc title alignment etc."**

**This decides the order of the whole list, not one item.** Two buckets, and the first empties
before the second starts:

| First — **technical and feature** | Then — **fine tuning** |
| --- | --- |
| Something is not built, not wired up, or does not work | Something works, and the words or the names could be better |
| It stops the master team testing in UAT | It does not stop anybody testing anything |

**How today's list reads against it, so the reading can be checked rather than assumed:**

- **Technical / feature:** ~~4.12 (the master team's documents are wrong)~~ — **closed 2026-08-21;
  its premise was false, and it is left struck through here because the reading below was made
  with it counted in**, ~~4.7 (the Node lock
  is not enforced)~~ — **closed 2026-08-24**, 4.16 (content the AI is never shown), 4.17 (a screen showing 1 row of 67).
  ✅ **4.16's sweep is finished — 2026-08-16 — and 2.6 was its first known instance.** It found
  **102** pieces of authored content reaching no prompt, and a second half nobody had predicted:
  **no screen renders them either.** Closing 2.6 raised the expected yield rather than lowering it,
  exactly as this line warned it might. 4.16 was then fixed in phases and **closed 2026-08-23**;
  its closure is on [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
- **Fine tuning:** 4.15 — twenty-one branches naming pages that exist under other names. **Ranked
  last for exactly this reason**, and it scores 4, so the disagreement is on the page as §2 requires.
- **Neither:** 3.5 is one message to a person who is waiting.

⚠ **A wording item is not automatically fine tuning.** 2.3 was filed as a wording tidy-up and was in
fact a table of coaching seven branches of advisers were not receiving. **Ask what breaks if it is
not done** — if the answer is "an adviser gets worse advice", it belongs in the first bucket
whatever it looks like.

---


## 4. Waiting on somebody else — not ours to finish

*Nothing. **3.5 closed 2026-08-21** when Mike sent Carl's email himself; the other three were
settled by him on 2026-08-15. See §1.*

⚠ **One thing is still owed by somebody outside, and it is not an item here:** when Carl pulls
`v0.9.0`, the date, environment and commit hash go in
[`../DEPLOYED-VERSIONS.md`](../DEPLOYED-VERSIONS.md). The email asks for them. It is a row we
write on our side from four values only he can supply, which is why it cannot be a task with an
owner here — but a pull that never gets its row is the gap the Version-Pull Recording Rule
exists to close.

---

## 5. Ours to build

---

## 6. How to keep this list honest

- **Score it before you write it.** A zero does not get filed under tidying — it is deleted, with
  its code.
- **Fill in "Asked by" honestly.** If it cannot name Mike or a named outsider, write ⚠ **ours** and
  expect to justify it. Both wastes of 2026-08-15 would have been stopped by that one field.
- **An observation is not a task, and an AI-written line carries no authority.** A fortnight of work
  grew out of one AI-authored sentence in `ACTIONS.md` that a later session read as an instruction.
- 🔴 **A score given by whoever found the thing is not a priority — it is the finder's own opinion
  wearing a number.** §4.13 was written honestly, scored **5** by us, ranked by us, and put in front
  of Mike as the third job on the list. His one question — *"who is this function for?"* — took it to
  a **1**, because the only people it could ever reach were us. **Its `Asked by` field already said
  ⚠ ours. The field worked; nobody read it.** Before defending a high score, read that field first.
- **Nothing is parked.** Parking was tried and it failed: a parked item is still in the codebase and
  still an invitation to finish it. Deleted means deleted.
- **Re-verify what is already here, not only what is proposed.** The 2026-08-15 audit found §2.7
  had been **built on 2026-07-29** and had sat here for seventeen days as an open question. Four
  items in total have now been found already built while still flagged open.
- **When something is done, move it** to [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
- **Numbers are stable and gaps are deliberate.** A missing number means that item was deleted;
  the second page says which and why.
