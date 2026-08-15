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
| 1 | 🔒 **4.12** One handover story for the master team | 5 | Handover | Us |
| 2 | **2.9** The education gate | 4 | — | Us |
| 3 | **4.7** Flip engine-strict back on | 5 | — | Us |
| 4 | **3.5** Reply to Carl about npm install | 5 | — | Us |
| 5 | **4.15** The 21 branches that still name a page nobody can open | 4 | — | Us |
| 6 | **4.16** Check every block's authored fields actually reach the prompt | 4 | — | **Mike** |
| 7 | **4.17** A screen can show one row when 67 exist, and say nothing | 2 | — | Us |

**Seven live items. One needs Mike.** If this list passes about twenty, something is wrong.
<!-- END GENERATED -->

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

⚠ **Four items were scored 5 by Mike on 2026-08-15 — 4.12, 4.9 (now closed), 4.7 and 3.5 — and by §2's table a 5
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

- **Technical / feature:** 4.12 (the master team's documents are wrong), 2.9 (the education gate is
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
2. **The literacy signal exists in one domain out of eight.** *"Poor financial literacy — owner
   focused on wrong numbers"* sits under **forecasting** in [`../../data/primary-issues.json`](../../data/primary-issues.json)
   and nowhere else; all eight domains were checked. A client who plainly cannot read their numbers
   but came about staffing or profitability **would not trip the gate.** Mike's own 2026-07-16
   precondition — *"the literacy signal's reliability verified first"* — is what this answers.
   `advisory-staircase.json` agrees: `"status": "not-wired"`.

**The order of work, and it is fixed by his ruling:**

1. **Widen the signal — ours, and first.** ⚠ **NOT by copying the line into all eight domains' issue
   lists.** Eight copies of one sentence is how content drifts apart here, and it is the fault
   closed on 2026-08-16 by item 2.6. It needs to become a signal the engine reads **independently of
   the domain** the conversation happens to be in. That shape has to be designed.
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
- **Touches:** the literacy signal across all eight domains, the Advisory Staircase, the
  pre-recommendation prompt.

---

## 5. Waiting on somebody else — not ours to finish

*One item. The other three were settled by Mike on 2026-08-15 — see §1.*

**3.5 · Reply to Carl about `npm install`.** **SCORE 1 · internal only**
- **Why:** somebody outside is waiting on an answer.
- **Risk:** small, but it is a person waiting. One message.
- **Asked by:** **Carl**, outside the project.
- **Touches:** nothing in the app.

---

## 6. Ours to build

**4.12 · 🔒 One handover story for the master team.** **SCORE 3 · sells the package**
- **Why:** the merged app's own handover documents still describe a separate standalone
  application.
- **Risk:** the master team reads documents describing an app that no longer exists and builds the
  tiers above it wrongly.
- **Asked by:** ⚠ **ours** — `COLLABORATE-MERGE-PLAN.md` §6. Nobody outside asked. Kept because
  the master team genuinely receives the wrong documents; **say so if you would rather it went.**
- **Touches:** the Collaborate handover documents, the UAT load pack.

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

### The three phases

**Phase 1 · domain support, 71 items.** Artefacts approved and committed —
[`../DIAGNOSTIC-ENTRY-BLOCK.md`](../DIAGNOSTIC-ENTRY-BLOCK.md) and
[`../mockups/domain-support-diagnostic-entry.html`](../mockups/domain-support-diagnostic-entry.html).
Mike's rulings, all 2026-08-16: wording approved as proposed; **mentor tier only** (*"too technical
for a firm or global manager"*); a **section inside the existing Domain Support tab**, not a new
page; and **ship it filled** — *"with as many sections as possible"*.

⚠ **"Ship it filled" reorders the phase.** Authoring the **10 empty domains** — `eoy`, `profit`,
`staff` first, then the 7 Get-the-Job ones — is now the **first and larger half**, and it ships with
the wiring. The section never goes live half-filled. Any domain still empty at ship time is named to
him, never quietly dropped.

🔴 **BLOCKED ON MIKE, and it is the first thing to settle next session: who drafts the ten.** He
authors them · we draft from each domain's own `overview` and `materials` for his approval · or a
mix. **No drafting starts before he answers** — authoring advisory routing text unasked is the same
fault as inventing wording, at ten times the scale. If we draft, each one is a committed artefact
*before* he approves it; ten domains must not become a rubber stamp.

**Phase 2 · the logic trees, 15 items.** **Phase 3 · engagement types and the staircase, 16 items** —
neither has a hub tab today, so both need a home decided first.

**Still open and deliberately excluded from Phase 1:** `get-team-problem`'s 6 rules sit under
`if_then_logic` and carry three parts, not two. Same fault, different shape — excluded rather than
bent to fit.

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

**4.7 · Flip `engine-strict` back on.** **SCORE 2 · robustness**
- **Why:** still `false`. Two transitive packages (`consola`, `node-releases`) over-declare their
  Node requirement and need pinning down first.
- **Risk:** the Node 14.15 lock is not actually enforced at install time, so a future install can
  drift off the Stack Constitution silently.
- **Asked by:** the **Stack Constitution** — the coding team's locked spec.
- **Touches:** `.npmrc`, `package.json` overrides. ⚠ **Reinstall is overnight-only on this
  machine** and there is a documented safe procedure — follow it rather than a plain `npm install`.

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
