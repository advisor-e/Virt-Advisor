# The To-Do List

> **This is the whole live list. If it is not here, nobody is doing it.**
> Finished work, and work deleted for failing the product test, is on
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
>
> **Last verified against the code: 2026-08-15**, item by item.

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
| 2 | **2.6** advisor_note — one line from you | 4 | — | **Mike** |
| 3 | **2.9** The education-gate wording | 4 | — | **Mike** |
| 4 | **4.9** Make the coaching reference inherit | 5 | — | Us |
| 5 | **4.7** Flip engine-strict back on | 5 | — | Us |
| 6 | **3.5** Reply to Carl about npm install | 5 | — | Us |
| 7 | **4.15** The 21 branches that still name a page nobody can open | 4 | — | Us |

**Seven live items. Two need Mike.** If this list passes about twenty, something is wrong.
<!-- END GENERATED -->

**Four items came off this list on 2026-08-15** — see
[`to-do-done-and-parked.md`](to-do-done-and-parked.md):

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

⚠ **Four items were scored 5 by Mike on 2026-08-15 — 4.12, 4.9, 4.7 and 3.5 — and by §2's table a 5
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
  not coded at all — it needs Mike's words, but what is missing is a *feature*), 2.6 (a field that
  reaches the AI nowhere), 4.9 (the cascade has a hole in it), 4.7 (the Node lock is not enforced).
- **Fine tuning:** 4.15 — twenty-one branches naming pages that exist under other names. **Ranked
  last for exactly this reason**, and it scores 4, so the disagreement is on the page as §2 requires.
- **Neither:** 3.5 is one message to a person who is waiting.

⚠ **A wording item is not automatically fine tuning.** 2.3 was filed as a wording tidy-up and was in
fact a table of coaching seven branches of advisers were not receiving. **Ask what breaks if it is
not done** — if the answer is "an adviser gets worse advice", it belongs in the first bucket
whatever it looks like.

---

## 4. Waiting on Mike

**2.9 · The education-gate wording.** **SCORE 4 · the user is worse off**
- **Why:** the behaviour is already ruled — on low client literacy the adviser is asked whether to
  apply education-first or see what is technically needed, reasoning shown either way.
- **Risk:** it stays uncoded. Advisers keep getting advice pitched over a client's head.
- **Asked by:** **Mike** — his own design, 2026-07-16.
- **Touches:** the Advisory Staircase, the pre-recommendation prompt.

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

**4.9 · Make the coaching reference inherit.** **SCORE 3 · sells the package**
- **Why:** its fifteen rows already carry stable ids; it simply never joined the inheritance
  mechanism, and its firm side is append-only.
- **Risk:** a firm cannot tailor its own coaching reference the way it can everything else — the
  cascade has a hole in it.
- **Asked by:** ⚠ **ours** — from Mike's tier-cascade design, but nobody asked for this row
  specifically.
- **Touches:** `resolveInheritedRows`, the firm overlay, the coaching reference screen.

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
