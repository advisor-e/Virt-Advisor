# The To-Do List

> **This is the whole live list. If it is not here, nobody is doing it.**
> Finished work, and work deleted for failing the product test, is on
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
>
> **Last verified against the code: 2026-08-15**, item by item.

---

## 1. The list — blockers first, then score

🔴 **Ordered by Mike himself, 2026-08-15**, from
[`../mockups/to-do-list-table.html`](../mockups/to-do-list-table.html). **This is his order, not a
computed one** — where his call and the score disagree, his call wins and the score stays visible
so the disagreement is on the page rather than hidden.

🔴 **The items are now data.** [`to-do-items.json`](to-do-items.json) is the source, and
[`../../tests/unit/toDoItems.test.js`](../../tests/unit/toDoItems.test.js) fails the build if any
item is missing one of its five fields, or if this table and the data disagree. **Edit the JSON,
not this table.** *(§2's "not yet enforced" is now enforced.)*

| # | Item | Score | Blocks | Waiting on |
| --- | --- | --- | --- | --- |
| 1 | **4.14** Put the ranking control into the Handbook | 1 | — | Us |
| 2 | 🔒 **2.1** Send the master team the release number | 3 | The whole UAT round | **Mike** |
| 3 | 🔒 **4.12** One handover story for the master team | 3 | Handover | Us |
| 4 | **2.6** `advisor_note` — one line from you | 4 | — | **Mike** |
| 5 | **2.3** Seminar's seven lines | 4 | — | **Mike** |
| 6 | **2.9** The education-gate wording | 4 | — | **Mike** |
| 7 | **4.9** Make the coaching reference inherit | 3 | — | Us |
| 8 | **4.4** Prove a Handbook edit survives a reload | 2 | — | **Mike** (one click) |
| 9 | **4.7** Flip `engine-strict` back on | 2 | — | Us |
| 10 | **3.5** Reply to Carl about `npm install` | 1 | — | Us |

**Ten live items. Five need Mike**, one of them a single click. If this list passes about twenty,
something is wrong.

⚠ **4.14 scores 1 and sits first, and that disagreement is deliberate.** No customer will ever see
the Handbook, so by §2's table it is internal work. Mike asked for it on 2026-08-15 and ranked it
now. His call beats the score; the score stays visible rather than being inflated to justify the
position.

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

---

## 4. Waiting on Mike

**2.1 · Send the master team the release number.** 🔒 **SCORE 3 · sells the package**
- **Why:** `v0.8.0` is tagged and pushed and nobody outside has been told it exists. They cannot
  pull what they do not know about; v0.6.0 was never pulled at all.
- **Risk:** the release round does not start. Every piece of feedback we need is deferred by
  however long this sits.
- **Asked by:** **Mike**, §3 ruling of 2026-08-14.
- **Touches:** everything already built. Three lines: pull the **tag** `v0.8.0`, **no
  `npm install` this time**, read [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md) first.

**2.3 · Seminar's seven lines — reword toward Public Speaking.** **SCORE 4 · the user is worse off**
- **Why:** the gate correctly refuses to name a tool nobody can open, so seven lines of coaching
  never reach an adviser.
- **Risk:** a table of coaching advisers simply are not receiving. This is not tidying.
- **Asked by:** **Mike** — his to reword, carried since session 48.
- **Touches:** Mentor Hub → Logic Tables → Get Seminar.

**2.6 · `advisor_note` — one line from you.** **SCORE 4 · the user is worse off**
- **Why:** the `profitability_feasibility` / `pf_awareness` node in your own logic tree carries a
  real instruction that reaches the AI **nowhere** — *"This determines the delivery method. Do not
  use Trial Fit on an unaware client — it will cause map shock. Do not use Cautious Reveal on a
  motivated client — it will feel slow and condescending."* `formatNodeForPrompt` does not read it.
- **Risk:** the AI keeps choosing a delivery method against your own written instruction.
- **Asked by:** ⚠ **found by us**, in Mike's own logic-tree content. Not fixed unasked because
  emitting a new field changes what the model is told. **Should it be emitted the same gated way
  `recommendation` now is?**
- **Touches:** `formatNodeForPrompt`, every recommendation using that branch.

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
| **2** | The Handbook's To-Do page renders the ranking control instead of prose | ☐ Next session |
| **3** | The Save file comes back into the data; this table is generated from it | ☐ |

**The approved artefact is [`../mockups/to-do-list-table.html`](../mockups/to-do-list-table.html)** —
Mike used it to set the current order, so it is approved by use. Phase 2 is measured against it, and
**every deviation from it must be named** before shipping.

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

**4.4 · Prove a Handbook edit survives a reload.** **SCORE 2 · robustness**
- **Why:** edit-persistence is proven in code and has never been seen working in a browser.
- **Risk:** the one-link Handbook Mike asked for may not actually keep an edit, and we would not
  know.
- **Asked by:** **Mike** — it is his Handbook. ⚠ **This is one click and it has to be his:** the
  machine has no browser automation, so no session can prove it for him.
- **Touches:** the published Handbook artifact only.

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
