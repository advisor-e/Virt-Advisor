# The To-Do List

> **This is the whole live list. If it is not here, nobody is doing it.**
> Finished work, and work deleted for failing the product test, is on
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
>
> **Last verified against the code: 2026-08-15**, item by item.

---

## 1. The list — blockers first, then score

| # | Item | Score | Blocks | Waiting on |
| --- | --- | --- | --- | --- |
| 1 | 🔒 **3.1** Provision MySQL | 5 | Nearly everything | Master team |
| 2 | 🔒 **2.1** Send the master team the release number | 3 | The whole UAT round | **Mike** |
| 3 | 🔒 **4.8** Finish the course-builder walk-through | 4 | Release confidence | Us |
| 4 | 🔒 **3.3** Firm membership data | 3 | Two hubs showing real firms | Master team |
| 5 | 🔒 **3.2** Middle-tier logins | 3 | Demonstrating two hubs | Master team |
| 6 | 🔒 **4.12** One handover story for the master team | 3 | Handover | Us |
| 7 | **4.13** Make a silent save failure loud | 5 | — | Us |
| 8 | **2.6** `advisor_note` — one line from you | 4 | — | **Mike** |
| 9 | **2.3** Seminar's seven lines | 4 | — | **Mike** |
| 10 | **2.9** The education-gate wording | 4 | — | **Mike** |
| 11 | **4.9** Make the coaching reference inherit | 3 | — | Us |
| 12 | **4.4** Prove a Handbook edit survives a reload | 2 | — | **Mike** (one click) |
| 13 | **4.7** Flip `engine-strict` back on | 2 | — | Us |
| 14 | **3.5** Reply to Carl about `npm install` | 1 | — | Us |

**Fourteen items. Four need Mike.** If this list passes about twenty, something is wrong.

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
wasted pieces of work on 2026-08-15. ⚠ **Not yet enforced.** A guard test that fails the build on an
item missing any of the five is the control this needs, and it is **not built** — it waits on Mike
approving the shape from [`../mockups/to-do-list-table.html`](../mockups/to-do-list-table.html),
so the test is written once against a settled format rather than twice.

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

**3.1 · 🔒 Provision MySQL.** **SCORE 5 · data integrity**
- **Why:** the credentials are still placeholders and **no row has ever been written anywhere.**
- **Risk:** the single biggest hole in the project. Advisor progress, case studies, every
  firm-editable setting, courses and the whole people layer run on development files or in memory.
  Two real course sessions were completed in the running app and **both writes failed.**
- **Asked by:** **Mike** and the master team both — nothing works without it.
- **Touches:** every store in the app. See 4.13, which is the same wound seen from the inside.

**3.3 · 🔒 The firm membership data.** **SCORE 3 · sells the package**
- **Why:** the firms table has no country, group or parent column, so nothing in our data says
  which firms are in which group.
- **Risk:** the two middle hubs show **invented firms**. They cannot be demonstrated honestly.
- **Asked by:** the master team must supply it. Merged with the old 3.4 — asking them for the two
  role values *is* this item, not a separate one.
- **Touches:** both middle-tier hubs, every roll-up above a firm.

**3.2 · 🔒 The middle-tier logins.** **SCORE 3 · sells the package**
- **Why:** no role value produces a global group manager or a group manager, and the mentor is
  still borrowing the platform-admin role.
- **Risk:** two hubs that exist cannot be shown to anyone by signing in as that person.
- **Asked by:** the master team must supply the role values.
- **Touches:** `firmAuth`, every tier-resolved route.

**3.5 · Reply to Carl about `npm install`.** **SCORE 1 · internal only**
- **Why:** somebody outside is waiting on an answer.
- **Risk:** small, but it is a person waiting. One message.
- **Asked by:** **Carl**, outside the project.
- **Touches:** nothing in the app.

---

## 6. Ours to build

**4.8 · 🔒 Finish the course-builder walk-through.** **SCORE 4 · the user is worse off**
- **Why:** part done 2026-08-14 — the whole course document lifecycle was walked live, and a real
  advisor session ran 14 turns to a genuine streamed recommendation. **Still not walked:**
  interrupting a streaming reply with Start-fresh, refreshing to confirm a course survives, and
  confirming the migration ran.
- **Risk:** we hand UAT "key functionality in position" without having clicked the last of it. A
  green suite does not prove the app boots — the route tests call handlers directly.
- **Asked by:** **Mike's** §3 bar for the release.
- **Touches:** the course builder, the advisor screen, the streaming path.

**4.12 · 🔒 One handover story for the master team.** **SCORE 3 · sells the package**
- **Why:** the merged app's own handover documents still describe a separate standalone
  application.
- **Risk:** the master team reads documents describing an app that no longer exists and builds the
  tiers above it wrongly.
- **Asked by:** ⚠ **ours** — `COLLABORATE-MERGE-PLAN.md` §6. Nobody outside asked. Kept because
  the master team genuinely receives the wrong documents; **say so if you would rather it went.**
- **Touches:** the Collaborate handover documents, the UAT load pack.

**4.13 · Make a silent save failure loud.** **SCORE 5 · data integrity**
- **Why:** v0.8.0 fixed half of it — a database that *refuses* a write no longer lands in a scratch
  file. **The other half is open:** when nothing answers at all, the dev fallback writes
  `data/dev-*.json` and **the screen still says saved.**
- **Risk:** an adviser's work vanishes and nobody finds out until they go looking for it. The
  course saved on 2026-08-14 went to a local file and reported success, exactly like a real save.
- **Asked by:** ⚠ **found by us**, then confirmed live in Mike's own running app.
- **Touches:** every store. The load pack's `NODE_ENV=production` closes it, but a documented
  workaround is not a fix — and production mode also forbids the dev tokens the two middle hubs need.

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
- **Nothing is parked.** Parking was tried and it failed: a parked item is still in the codebase and
  still an invitation to finish it. Deleted means deleted.
- **Re-verify what is already here, not only what is proposed.** The 2026-08-15 audit found §2.7
  had been **built on 2026-07-29** and had sat here for seventeen days as an open question. Four
  items in total have now been found already built while still flagged open.
- **When something is done, move it** to [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
- **Numbers are stable and gaps are deliberate.** A missing number means that item was deleted;
  the second page says which and why.
