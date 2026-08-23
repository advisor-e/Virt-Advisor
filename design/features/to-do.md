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
| 1 | **2.9** The education gate | 4 | — | Us |
| 2 | **4.7** Flip engine-strict back on | 5 | — | Us |
| 3 | **4.15** The 21 branches that still name a page nobody can open | 4 | — | Us |
| 4 | **4.17** A screen can show one row when 67 exist, and say nothing | 2 | — | Us |
| 5 | **4.18** The AI invents advice when it is routed to the wrong method | 4 | — | Us |
| 6 | **4.25** Nothing in this project ever checks that a screen LOOKS right | 4 | — | Us |
| 7 | **4.27** The property drawing promises a per-property tax override that nothing builds | 1 | — | **Mike** |
| 8 | **4.30** Invisible characters are stripped on the new path only, not the live advisor screen | 5 | — | Us |
| 9 | **4.31** An accountant can share a prompt and have it checked — designed, drawn, not built | 4 | — | Us |
| 10 | **4.33** A template's tutorial video gets attached to a calculator that shares its name | 2 | — | Us |
| 11 | **4.36** The Model Guide search only matches the exact words the page happens to use | 3 | — | Us |

**Eleven live items. One needs Mike.** If this list passes about twenty, something is wrong.
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

⚠ **Four items were scored 5 by Mike on 2026-08-15 — 4.12 (now closed), 4.9 (now closed), 4.7 and 3.5 — and by §2's table a 5
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
  with it counted in**, 2.9 (the education gate is
  not coded at all — it needs Mike's words, but what is missing is a *feature*), 4.7 (the Node lock
  is not enforced), 4.16 (content the AI is never shown), 4.17 (a screen showing 1 row of 67).
  ✅ **4.16's sweep is finished — 2026-08-16 — and 2.6 was its first known instance.** It found
  **102** pieces of authored content reaching no prompt, and a second half nobody had predicted:
  **no screen renders them either.** Closing 2.6 raised the expected yield rather than lowering it,
  exactly as this line warned it might. What is left of 4.16 is the fixing, in three phases, and
  Phase 1 waits on Mike — see §6.
- **Fine tuning:** 4.15 — twenty-one branches naming pages that exist under other names. **Ranked
  last for exactly this reason**, and it scores 4, so the disagreement is on the page as §2 requires.
- **Neither:** 3.5 is one message to a person who is waiting.

⚠ **A wording item is not automatically fine tuning.** 2.3 was filed as a wording tidy-up and was in
fact a table of coaching seven branches of advisers were not receiving. **Ask what breaks if it is
not done** — if the answer is "an adviser gets worse advice", it belongs in the first bucket
whatever it looks like.

---

## 4. The education gate

### 🔴 RULED BY MIKE, 2026-08-16 — the gate fires wherever poor financial literacy shows up

> Asked whether the gate should work **wherever poor financial literacy shows up**, or **only where
> the app can already see it** (inside a forecasting conversation), Mike chose: **"wherever it shows
> up."**

**This item is no longer waiting on Mike, and it is no longer a wording task.** It was carried for a
month as *"only the on-screen words are missing"*. **That sentence was wrong**, and it is recorded
here as wrong so nobody re-derives it: putting the wording question to him again is asking a
question he has already answered.

**What the 2026-08-16 check found**, and it is why the scope moved:

1. **The pattern the ruling says to copy does not exist.** The 2026-07-16 ruling models the gate on
   *"the existing outside-your-range pattern"* — the two-card output decided on 2026-06-04 in
   [`../virt-advisor-system-design.md`](../virt-advisor-system-design.md) §13. **No code carries
   that text or anything like it.** It was decided and never built, so there is no working screen to
   take the shape from.
2. ~~**The literacy signal exists in one domain out of eight.**~~ **CORRECTED 2026-08-24 — this
   was wrong, and it was wrong in the direction that matters.** It is struck through rather than
   deleted because the ruling above was made with it on the page. What it said: *"Poor financial
   literacy — owner focused on wrong numbers"* sits under **forecasting** in
   [`../../data/primary-issues.json`](../../data/primary-issues.json) and nowhere else. What is
   actually true, checked against the code:
   - **`primary-issues.json` is read by nothing.** The selector that read it was retired from
     intake on 2026-06-10 and the file has been disconnected ever since. A whole-repo search finds
     no loader except [`../../tests/unit/retiredPrimaryIssueSelector.test.js`](../../tests/unit/retiredPrimaryIssueSelector.test.js),
     which asserts the selector *stays* retired. [`../virt-advisor-registry.md`](../virt-advisor-registry.md)
     already said so — *"⚠ no code reads it"* — and so does the comment in
     [`../../components/VirtualAdvisor.vue`](../../components/VirtualAdvisor.vue). **So the signal
     did not fire in one domain out of eight. In that file it fires in none.**
   - **There is a live literacy signal, and the check missed it.**
     [`../../server/utils/signals.js`](../../server/utils/signals.js) raises
     `FINANCIAL_FOUNDATIONS_GAP`, and [`../../server/utils/caseState.js`](../../server/utils/caseState.js)
     turns it into the solution category `financial_literacy`. It is wired and working.
   - **It is domain-locked — but to `data-systems`, not forecasting**, inside
     `if (state.detectedDomain === 'data-systems')`, and it fires from exactly one intake question
     about the chart of accounts. So the conclusion the ruling rests on survives — a client who
     cannot read their numbers but came about staffing or profitability **would not trip the
     gate** — but the thing to widen is not the thing this entry named.
   - *(Smaller symptom of the same staleness: "eight domains". `primary-issues.json` has 11 domain
     keys; `domains.json` registers 22.)*

   Mike's own 2026-07-16 precondition — *"the literacy signal's reliability verified first"* — is
   what this answers. `advisory-staircase.json` agrees: `"status": "not-wired"`.

**The order of work, and it is fixed by his ruling:**

1. **Widen the signal — ours, and first.** ⚠ **NOT by copying the line into the domains' issue
   lists.** Copies of one sentence is how content drifts apart here, and it is the fault closed on
   2026-08-16 by item 2.6 — and since `primary-issues.json` is read by nothing, copying it there
   would achieve nothing at all. It needs to be a signal the engine reads **independently of the
   domain** the conversation happens to be in. ✅ **CORRECTED 2026-08-24 — the shape does NOT have
   to be designed; it already exists.** [`../../server/utils/signals.js`](../../server/utils/signals.js)
   opens with a domain-independent **"Client signals"** block — client awareness, ownership, growth
   stage, operator execution style — sitting above the per-domain blocks. Raising the literacy
   signal into that block is the job. What still has to be decided is what *raises* it outside
   `data-systems`: a question asked of every client, or inference from what they say. **That is a
   product call and it is Mike's**, but it belongs with step 2, not before it.
2. **Then the wording — Mike's**, and only then. **Where the gate can fire decides what it should
   say**, which is why asking for the words first would have produced words for a gate that mostly
   stays shut.
3. **Then build the gate**, with the reasoning shown either way, per the 2026-07-16 ruling below.

**2.9 · The education gate.** **SCORE 4 · the user is worse off**
- **Why:** on low client literacy the adviser is asked whether to apply education-first or see what
  is technically needed, with the reasoning shown either way. The behaviour was ruled 2026-07-16;
  the **reach** was ruled 2026-08-16.
- **Risk:** it stays uncoded. Advisers keep getting advice pitched over a client's head — and, since
  2026-08-16, we know the narrow version would have looked finished while firing almost never.
- **Asked by:** **Mike** — his own design, 2026-07-16, rescoped by him 2026-08-16.
- **Touches:** the literacy signal in [`../../server/utils/signals.js`](../../server/utils/signals.js)
  (`FINANCIAL_FOUNDATIONS_GAP`, today locked to `data-systems`), the Advisory Staircase, the
  pre-recommendation prompt.
- **Waiting on:** **us**, not Mike — corrected 2026-08-24. The generated table said *"Mike"* and
  *"only the on-screen words are missing"* for eight days after this section declared both wrong,
  because [`to-do-items.json`](to-do-items.json) was never updated alongside the prose. See the box
  below.

### 🔴 HOW THIS PAGE CONTRADICTED ITSELF FOR EIGHT DAYS — 2026-08-24

On 2026-08-16 this section was written to say, in terms, that 2.9 no longer waits on Mike and that
the wording question **must not be re-asked**. [`to-do-items.json`](to-do-items.json) — which the
ranked table at the top of this page is *generated from* — was not touched. It kept
`"waitingOn": "Mike"` and kept the exact sentence this section calls wrong.

**On 2026-08-24 that worked exactly as designed and produced the wrong outcome.** A session ran
`/startup`, read the generated table, and told Mike 2.9 was *"waiting on you — a five-minute
wording answer"*. He picked it on that basis. The question he was about to be asked for a second
time was one he had settled eight days earlier. [`../ACTIONS.md`](../ACTIONS.md) meanwhile asserts
the entry is *"now `waitingOn: Us`"* — a third version, true of none of the files.

**Why no test caught it.** [`../../tests/unit/applyToDo.test.js`](../../tests/unit/applyToDo.test.js)
guards the **table against the JSON**, and `npm run to-do` regenerates one from the other, so those
two can never drift. **Nothing compares either to the hand-written prose on the same page**, and
the prose is where the ruling lives. The drift landed precisely in the unguarded gap.

**This is the fourth instance of one fault in four sessions** — 4.26's guard that accepted a passing
mention as a closure, session 81's Brief that denied a screen built the day before, session 82's
4.16 record that claimed a shipped part was unbuilt, and now this. The shared cause has been named
each time and is still true: **nothing compares the record to the code, or to itself.** ⚠ **The
generated table is the front door and is therefore the most dangerous place for a stale field:** a
reader who trusts it never reaches the section that corrects it.

---

## 5. Waiting on somebody else — not ours to finish

*Nothing. **3.5 closed 2026-08-21** when Mike sent Carl's email himself; the other three were
settled by him on 2026-08-15. See §1.*

⚠ **One thing is still owed by somebody outside, and it is not an item here:** when Carl pulls
`v0.9.0`, the date, environment and commit hash go in
[`../DEPLOYED-VERSIONS.md`](../DEPLOYED-VERSIONS.md). The email asks for them. It is a row we
write on our side from four values only he can supply, which is why it cannot be a task with an
owner here — but a pull that never gets its row is the gap the Version-Pull Recording Rule
exists to close.

---

## 6. Ours to build

**4.16 · Check every block's authored fields actually reach the prompt.** **SCORE 4 · the user is
worse off** · 🔴 **WAITING ON MIKE**

### ✅ The sweep is DONE — 2026-08-16. It found 102.

| Block | Unreachable | What it is |
| --- | --- | --- |
| Domain support | **71** | 65 `diagnostic_entry` routing branches across 19 domains, 6 `if_then_logic` rules |
| Logic trees | **15** | 13 `stage_entry_question`, 2 `flat_branches` |
| Engagement types | **15** | 5 authored fields × 3 types, behind a hardcoded paraphrase |
| Advisory Staircase | **1** | `selectorPrompt`, duplicated as a hardcoded string in the engine |

Every one proved by **rendering the real prompt and searching it** — the method this item
prescribes, and the only one that has ever worked here.

🔴 **The risk was worse than filed.** It read *"a firm or the mentor carefully edits content the AI
is never shown"*. **Nobody can edit any of these — no screen renders one of them.** The Domain
Support tab edits the materials table only; the Logic Tables tab edits the branch rows only. The
content is invisible in **both** directions, which is why no test, no tab and no person had found
it. That finding is what produced the hub-page rule in `CLAUDE.md` and
[`tier-cascade.md`](tier-cascade.md) P10.

### ✅ The design is SETTLED — session 63, 2026-08-16 · next session builds

🔴 **The spec is [`../4-16-BUILD-SPEC.md`](../4-16-BUILD-SPEC.md). Read it and build — do not
re-derive the analysis.** Page purposes: [`../HUB-PAGE-PURPOSES.md`](../HUB-PAGE-PURPOSES.md).

**102 is a measurement, not a work list.** About **55 of the 65 `diagnostic_entry` branches are
duplicates** of routing the logic trees already carry at higher resolution — and the trees name the
actual templates while the branches do not. The real list is seven items:

| Work | Count | Page | |
| --- | --- | --- | --- |
| ~~Retire `diagnostic_entry` where the tree covers it~~ | ~~55~~ | — | 🔴 **CANCELLED 2026-08-16** |
| Every `diagnostic_entry` branch reaches the prompt and gets a screen | **65** + 26 | Domain Support | ✅ **2026-08-16** |
| `stage_entry_question` + `flat_branches` | 15 | Logic Tables | ✅ **2026-08-16** |
| Engagement-type authored fields — 6 per type | 18 | 🔴 **no page exists** | 🔴 **waits on Mike** |
| Staircase `selectorPrompt` from data, not a hardcoded string | 1 | Advisory Staircase | ✅ **2026-08-16** |
| The method guides get a screen | ~~12~~ **13** | Domain Support | ✅ **BUILT 2026-08-17** |
| `get-team-problem`'s `if_then_logic` — check against its tree first | 6 | Logic Tables | ✅ **2026-08-16 — a real duplicate, no work needed** |

🔴 **"About 55 of the 65 are duplicates" was WRONG, and it was overturned by the very test the spec
demanded before deleting anything.** Only three of the 65 had even 85% of their words present in
their best-matching tree, and all three read as complementary when put side by side: the tree says
WHICH conversation this is, the branch says WHAT TO DO once you are in it. **Nothing was deleted, and
there is no deletion left for Mike to rule on.** Evidence and method:
[`../DOMAIN-DIAGNOSTIC-BRANCHES.md`](../DOMAIN-DIAGNOSTIC-BRANCHES.md) §1.

⚠ **The one genuine duplicate in the whole sweep was `get-team-problem`'s six** — same conditions,
same actions, same order as its logic table. That one IS redundant and needs no work. It is worth
knowing that the intuition was right once in seven and wrong the other six times.

**The job also grew by 26 deliberately:** the `primary_question` fields DO reach the AI and appear on
no screen either — the same fault, the same field, the same tab. Fixing the 65 and leaving those
invisible would have been a choice, and the wrong one.

### ✅ F IS BUILT — session 67, 2026-08-17

🔴 **The build, and every difference from the approved artefact, is recorded at
[`../METHOD-GUIDES-SCREEN.md`](../METHOD-GUIDES-SCREEN.md) §10.** Read that before touching
any of it. Three differences matter: **only three of the five "shared" guides really are
shared** (two of the artefact's second rows name artefacts that are not this guide); the
overrides live in their **own bundle keyed by guide id**, not per domain, or the on-screen
"an edit here changes it there too" would be false; and numeric fields render read-only,
found by opening the real guide on the running app.

**Proved rather than asserted:** 967 authored strings across the thirteen, **0 missing from
the prompt** (was 116 missing). All three affected conversations were opened for real —
Dashboard Discussions returned **6/6** tactical options and **3/3** discussion questions
verbatim, Working Capital Cycle **9/9** causes.

⚠ **One thing found on the way, and it is NOT this item.** The engine routed a Dashboard
Discussions question to the **Ratio Analysis** tree, and the AI then **invented** tactical
options and discussion questions rather than saying it had none. Tree detection, not the
guides — but inventing content that reads as authored is the same failure family.

**D — the engagement types — is now the only part of 4.16 still open, and it waits on Mike.**

**Two things in this item's own description were wrong, and both were found by opening the files:**

1. 🔴 **It is THIRTEEN guides, not twelve.** `powerful-seminars.json` is not named `*-reference.json`,
   so the file-pattern sweep missed it — `LEARN_REFERENCE_FORMATTERS` registers it beside the other
   twelve and treats it identically.
2. 🔴 **They are NOT "read by the AI in full", which this list said for two sessions.**
   **116 of the 954 authored lines across them reach no prompt** — 62 in Dashboard Discussions
   (including the discussion questions authored against every one of its twelve metrics), 29 in
   Working Capital Cycle, 20 in Ratio Analysis. Each formatter names its fields by hand, so a field
   authored afterwards is never mentioned again. **The sweep counted the file as reaching the AI
   because the formatter exists.**

**So F is not only a screen.** Screen and prompt get built from **one walk of each guide's own
shape** — 155,000 characters, of which only 21% sits in fields all thirteen share and **35% is blocks
unique to a single guide** — so the two cannot disagree and the 116 close as a consequence of the
design rather than as thirteen patches. Each guide opens from the framework row it already has on
Domain Support; **Facilitation 101 has no row anywhere** and gets its own entry above the domains.
**Tiers: the same as the materials table around it** — the opposite of B's mentor-only ruling,
because a method guide is prose rather than routing logic, and it was asked rather than assumed.

✅ **E shipped 2026-08-16 (`5873c06`) — the first of the seven, and the safe one on purpose.**
The sentence an advisor is asked before choosing a staircase step now comes from the data and is
editable on the Advisory Staircase tab, mentor first, firms inheriting. Approved wording:
[`../STAIRCASE-SELECTOR-PROMPT-FIELD.md`](../STAIRCASE-SELECTOR-PROMPT-FIELD.md) §3.

**Today's advisor sees no change, and two tests hold that** rather than assert it — they pin the
exact strings that were hardcoded, written out in full so a later edit to the data file cannot
silently re-point them. Proved on the running app as well as in the suite: saved as the mentor,
inherited by a firm that had written none of its own, and the engine then put that sentence to the
advisor.

⚠ **Two things the build spec did not have, both found by opening the code — read before doing B–G:**

1. **The two hardcoded strings were NOT identical.** The second carries a "No problem —" lead-in for
   the moment an advisor declines a saved answer. It belongs to the moment, not the question, so it
   stays in code — a firm must not be able to delete it from a conversation it never saw.
2. 🔴 **A wording decision is still open and was deliberately not bundled:** that block's history
   button reads **"Ceiling history"** while now covering two settings. Renaming it is Mike's call.

🔴 **Two earlier plans are withdrawn, both by evidence rather than opinion.**
**(1) The ten "empty" domains are not empty** — `eoy`, `profit` and `staff` each have a live logic
tree, as do all seven Get-the-Job domains. Mike stopped it: *"the domain support material exists (I
know this because I created it) but the problem is — not all of it was being read by AI."* Authoring
them would have duplicated his own work tenfold.
**(2) The 65 do not go on the Coaching Reference page** — he instructed it, then the code showed they
are Logic Tables content and mostly duplicates. Recorded at
[`../COACHING-REFERENCE-DOMAIN-ROWS.md`](../COACHING-REFERENCE-DOMAIN-ROWS.md).
[`../DIAGNOSTIC-ENTRY-BLOCK.md`](../DIAGNOSTIC-ENTRY-BLOCK.md) is superseded by both.

**The cascade is binding on all of it** — Mike, 2026-08-16: *"each respective hub page needs to link
to AI so their changes work in practice so the cascade rules need apply here also."* Build
tier-agnostic on the `coachingConfig.loadResolvedCoaching` shape. The two middle tiers cannot be
exercised until the master team issues their roles and the firm→brand/country data; it fails toward
today's behaviour, never toward a guess.

✅ **`org-capacity-planner` having no logic tree is correct and is NOT an item** — ruled by Mike,
2026-08-16: *"there is no capacity planner logic — it is a single model used for firms to plan and has
a tutorial video attached."* Its 3 branches turn out to be a **sequence** across its own three
materials, not routing — the one place in all 65 where the field holds something other than
IF-THEN. See the spec §B.

**4.17 · A screen can show one row when 67 exist, and say nothing.** **SCORE 2 · robustness**
- **Why:** the mentor's Advisory Distinctions tab showed **1** distinction when the shipped set is
  **67**. A local, git-ignored dev file (`data/dev-platform-distinctions.json`) is deliberately
  preferred over the committed seed when there is no database, and one stale test row in it shadowed
  all 67 — **with nothing on screen saying so.**
- **Risk:** anyone developing, demoing or reviewing reads what is on screen as the real platform
  set. It cost most of a session to diagnose, and **the same pattern applies to every dev-JSON
  fallback in the app**, not just this one.
- **Asked by:** **Mike** — he spotted it himself on the Mentor Hub, 2026-08-16.
- **Touches:** `server/utils/platformDistinctions.js` and every other dev-JSON fallback
  (`firmDistinctions`, quizzes, coaching, currency); the Mentor Hub Advisory Distinctions tab.
- ⚠ **The local symptom is fixed by deleting that file** — Mike was given the command on 2026-08-16
  because the AI's own safety guard refused the deletion. **The item is the underlying fault:** a
  screen served from a dev fallback must *say* it is. Verify by loading the tab with and without the
  file, never by reading the loader.

**4.18 · The AI invents advice when it is routed to the wrong method.** **SCORE 4 · the user is
worse off**

⚠ **Sitting last because Mike has not ranked it, not because it scores low.** It was added on
2026-08-17, after his own ranking pass, and appending is the only way to add an item without
moving one of his. **Its position is not a judgement.**

- **Why:** a Dashboard Discussions question was routed by the engine to the **Ratio Analysis**
  coaching tree. The AI then produced its own plausible *"tactical options"* and *"discussion
  questions"* for the metric rather than saying it had none for it. **Two faults stacked:** the
  wrong guide was selected, and the model filled the gap instead of admitting it.
- **Risk:** an adviser reads invented content as Mike's authored method and takes it to a client.
  On screen it is indistinguishable from the real thing — right headings, right tone, right shape.
  🔴 **This is 4.16's failure from the other direction.** 4.16 was authored content that never
  arrived; this is unauthored content that arrives *looking* authored — and it is the worse of the
  two, because nothing about it looks wrong.
- **Asked by:** **Mike.** Found by us on 2026-08-17 while verifying 4.16 F on the running app — the
  first Dashboard Discussions attempt came back with invented questions. Reported the same session
  and he ruled it on: *"if you found this problem then yes - it gets put on the to do list."*
- **Touches:** `detectLogicTree` / `detectLogicTrees` in `server/utils/logicTrees.js` and
  `pickLearnTreeAI` in `server/advisorEngine.js` for the routing half; the learn-mode prompt for
  the honesty half.
- 🔴 **TWO HALVES, AND THE SECOND ONE IS THE ITEM.** Sharpening the routing reduces how often this
  happens and can never remove it — some questions are genuinely ambiguous, and Ratio Analysis and
  Dashboard Discussions are neighbouring methods. **The fault worth fixing is that the model does
  not say "I do not have that for this method."** Do not close this on a routing tweak alone.
- ⚠ **Verify the way 4.16 was verified** — ask a real question on the running app and compare the
  answer word for word against the source file. **Every automated test here passes on an answer the
  model made up.**
- Written into [`../RELEASE-NOTES-v0.9.0.md`](../RELEASE-NOTES-v0.9.0.md) §4a, so the master team
  meets it as a known issue rather than as a surprise in UAT.

**4.19 · Finish the property model — properties 2 to 5, the apportionment and the consolidated
report.** **SCORE 4 · the user is worse off**

⚠ **Sitting last because Mike has not ranked it, not because it scores low.** It was added on
2026-08-17, after his ranking pass, and appending is the only way to add an item without moving one
of his. **Its position is not a judgement.**

- **Why:** Phase 1 builds **one** investment property over ten years. The source workbook is a
  **five-property portfolio**: it also carries the family home and its mortgage, a **loan
  apportionment table** spending the deposit across the residence and five investments in order
  until the money runs out — ⚠ *this read "until the borrowing ceiling is reached" until 2026-08-20;
  there is no ceiling anywhere in the workbook, see the artefact §1* — and a **consolidated report**
  stacking all five into
  total revenue, total expenses, net operating profit, total debt, net equity and a combined weekly
  cash position. Without Phase 2 the model answers *"is this one property worth buying"* and cannot
  answer *"does this portfolio work"* — the question the workbook was built for.
- **Risk:** Phase 1 ships and the model **looks finished**. Properties 2–5 are the same block
  repeated, so what remains is precisely the part nobody can infer from the built screen — the
  apportionment and the consolidation exist nowhere in Phase 1 in any form. 🔴 **It was written into
  a design document with nothing scheduling it, and on this project that is how a plan quietly
  becomes never.** That is the whole reason this row exists.
- **Asked by:** **Mike.** He chose the model from the nine unbuilt ones on 2026-08-17 and approved
  the two-phase split, then asked directly whether the additional properties would be added in
  future — and on being told Phase 2 was a written plan with nothing scheduling it, ruled it onto
  the live list the same session.
- **Touches:** the Phase 1 maths model and its golden test, the Restify route,
  [`../../utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js), the page and screen
  components, and the `SCREENS` list in
  [`../../tests/unit/reportHeadlineConsistency.component.test.js`](../../tests/unit/reportHeadlineConsistency.component.test.js).
- ✅ **PHASE 1 IS COMPLETE — item 4.20 closed 2026-08-18, and this row is UNBLOCKED.** Phase 1 held
  all the mathematical difficulty: two loans amortised, diminishing-value depreciation on chattels
  only, ring-fenced losses, and the five-year interest-deductibility phasing. Phase 2 is the
  apportionment and the consolidation **on top of** it. *(This line read "DEPENDS ON PHASE 1 — do
  not start this first" until 2026-08-18.)*
- 🟡 **PHASE 2's MATHS IS BUILT — 2026-08-20, in three approved changes** (`c7fc42b`, `a0a779f`,
  `e36f8da`). The household, the apportionment table, five properties and the consolidation, plus
  three things Mike ruled the same day that the workbook does not have: the deposit **hold-back**,
  the **lending ceiling** as an editable setting on the existing cascade, and the **servicing
  demand**. 80 tests in `multiplePropertyPortfolio.test.js`; the workbook's own consolidated revenue
  and property-value rows match its cached values exactly across all ten years.
  ✅ **The ROUTE followed the same day** (`838cf46`, step P2-2): one route serving both shapes,
  with a test that fails the build if the LIVE Phase 1 request shape ever moves, and the address
  guard widened from one real client address to five. 16 route tests, up from 7.
  **STILL TO DO: the artefact, the screen and the catalogue line** — the artefact §9 steps P2-3 to
  P2-5. **This row stays open until they are done.**
- ⚠ **Phase 1's Hub tab was built with no approved artefact** —
  [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md) §10. **Do not repeat
  that here.** Anything Phase 2 puts on a screen gets its artefact committed *before* it is
  approved, per `CLAUDE.md`.
  🔴 **Updated 2026-08-20 — the rule was OFFERED and DECLINED, which is not the same as skipped.**
  Adding the lending ceiling to that same tab, Mike was offered a drawing first and said *"no, just
  add it as a field - I'm sure you can do it."* So the field's label, help text and placement are
  **ours**, each listed individually in the artefact §10 so any of them changes with one line from
  him. **The obligation for the Phase 2 SCREEN is untouched** — that is a whole screen, not a
  field, and it is its own build step.
- ✅ **MIKE HAS REVIEWED THAT TAB, and this line previously said the opposite — twice.** In his
  words: *"I DID look at the property tax rules — your notes should show that the phasing
  depreciation inputs were too small and thus failed to show the % figures."* He was right; five
  percentage boxes shared a slot sized for one. **Finding that defect WAS the review.** The claim
  that he had not seen it was corrected by him on the morning of 2026-08-20 and then **repeated the
  same afternoon** by a session that had not read the note holding the correction — which also
  proposed adding it to this list as a task he had already done. 🔴 **A finding is not evidence
  that the finder wasn't looking.** What is still missing is the artefact, not the review.
- ✅ **The name is settled — Mike, 2026-08-17.** The catalogue name **Multiple Property
  Assessment** is kept, and Phase 1 ships under it showing *"Property 1 of 5 · the remaining four
  arrive in the next release"*. The name never changes between the phases and nobody is misled at
  either stage. ⚠ **It was his own question that settled it** — asking whether the other properties
  were coming turned a naming problem into a scheduling one, and this row is the answer.
  ⚠ **This line used to end "Two questions remain open (the four headline labels, and whether the
  New Zealand tax assumptions are fixed or firm-editable)". It was already wrong** — both were
  ruled on 2026-08-17, the same day they were asked, as §8 Q2 and Q3 have said ever since. **No
  design question on this model is open.** Q1–Q7a were ruled 2026-08-17 and Q8–Q10 on 2026-08-20:
  [`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md) §8.
- ☐ **Three things sit with Mike, and none of them blocks the build:** the LVR ceiling figure
  (nothing is judged until it is set), whether the Property Tax Rules tab should be renamed now it
  holds a lending setting, and whether the sample's own 350,000 / 299,000 loan split should be reset
  now that its deposit is genuinely applied.

**4.7 · Flip `engine-strict` back on.** **SCORE 2 · robustness**
- **Why:** still `false`. Two transitive packages (`consola`, `node-releases`) over-declare their
  Node requirement and need pinning down first.
- **Risk:** the Node 14.15 lock is not actually enforced at install time, so a future install can
  drift off the Stack Constitution silently.
- **Asked by:** the **Stack Constitution** — the coding team's locked spec.
- **Touches:** `.npmrc`, `package.json` overrides. ⚠ **Reinstall is overnight-only on this
  machine** and there is a documented safe procedure — follow it rather than a plain `npm install`.

**4.28 · The AI Prompts page has an engine and no screen.** **SCORE 4 · the user is worse off**
- **Why:** the backend half shipped 2026-08-21 (`ea6ac22`) — both prompts as data, the protocol
  block, the cascade, the validator, 32 tests. **No tab renders any of it**, so a manager cannot
  see or change a single variable. Mike asked for a page and has an engine.
- **Risk:** this is the half-a-fix state CLAUDE.md names on 2026-08-16 — content wired toward the
  AI with no screen to inspect or correct it — and it is the state the 4.16 sweep found **102
  times**. Left here it is worse than not starting, because the engine reads as done.
- **Asked by:** **Mike**, 2026-08-21 — *"I want to create a 'AI Prompts' page in the hub pages
  (Mentor, Global Group Manager, Group Manager and Firm Manager) so that users have the ability
  to influence the approach to formulas in the performance report models."*
- **Touches:** `FirmManagerHub.vue` (`NAV_GROUPS` under *Your AI coach*, plus `TAB_TIERS`), a new
  `components/firm/FirmAiPrompts.vue`, a Restify route over `server/utils/aiPrompts.js`,
  `locales/en.json`, and the two guards in [`../AI-PROMPTS-PAGE.md`](../AI-PROMPTS-PAGE.md) §10.
- 🔴 **The tab label is ruled: "AI Prompts"** (Mike, 2026-08-21). Do not re-ask it.
- ⚠ **Two of the four tiers cannot be logged into.** `config/integration.js` ships
  `globalManagerRole` and `groupManagerRole` **empty on purpose**, fail-closed. Build all four —
  the tab matrix is declarative and excluding them bakes in a limit that is wrong the day
  Advisor-e issues the roles — but *"it works"* will mean the mentor and firm hubs proven and the
  middle two correct-by-construction and unexercised. **Say that rather than implying four.**

**4.29 · The AI has never been told the report models exist.** **SCORE 4 · the user is worse off**
- **Why:** [`../../utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js) is read by
  exactly one file, `components/ModelLibrary.vue`. Nothing in `server/` reads it, and
  `server/routes/report.js` never calls OpenAI. The only mentions of a model's name on the backend
  are JSDoc comments inside the model files themselves.
- **Risk:** ten built models that answer real client questions are invisible to the one part of
  the app an advisor actually asks for help. An advisor describing a client's cash problem cannot
  be pointed at Debtor Drag, because the AI has never heard of it.
- **Asked by:** **Mike**, 2026-08-21 — *"ensure that each of the performance models have a 'key
  calculation output' page or section, so that the AI can read what the model serves"*, and
  *"place it wherever you want, it's for AI - not the advisor or manager"*. Approved to build.
- **Touches:** a new `data/report-model-summaries.json` keyed by route, a backend block putting it
  in front of the model, and a guard tying it to the catalogue.
- 🔴 **The constraint that decides the design: the AI must never recommend a model with no page.**
  Eight catalogued models are `STATUS_SOON` with no route. A summary for one of those sends an
  advisor to a screen that does not exist — **which is 4.15 happening again somewhere new.** Cover
  the 10 `STATUS_READY` models only, and make the guard work **both ways**, so the day a `SOON`
  model goes live the test says it needs a summary.
- ⚠ **No screen, and that is Mike's explicit ruling** — a stated exception to the 2026-08-16
  hub-page rule, on the grounds that a description of what a calculation does is a fact about the
  maths, not authored advisory judgement. Most of the wording already exists in each model file's
  own concept note, written and golden-tested when the workbook was ported.

**4.30 · Invisible characters are stripped on the new path only, not the live advisor screen.**
**SCORE 5 · security, privacy or data integrity**
- **Why:** `promptSafety.stripInvisible()` shipped 2026-08-21 (`ea6ac22`) with 11 tests, closing
  the zero-width / bidi / Unicode-tag channel named in the security document's step 5. **It is not
  applied to `server/advisorEngine.js`**, which is the output path a real advisor reads today.
- **Risk:** the gap the fix was written for is still open where it actually matters — and the
  commit message and the tests read as though the channel is closed, so the next session can
  reasonably believe it is done. **That is the failure family this list exists to end.**
- **Asked by:** ⚠ **ours** — raised 2026-08-21 by the session that wrote the fix, deliberately
  rather than quietly widening the change. Wiring it into `advisorEngine` alters live behaviour on
  a deployed screen and deserves its own change with its own tests.
- **Touches:** `server/advisorEngine.js` and `server/courseEngine.js` output handling, plus tests
  proving a hidden payload is removed from a real streamed response and ordinary content survives.
- ⚠ **The frontend markdown pipeline is LOCKED** by CLAUDE.md and must not be touched. The strip
  belongs server-side at the source, which is where `stripInvisible` already lives. This is wiring
  an existing tested function into two more call sites, not new logic.

---

## 7. How to keep this list honest

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
