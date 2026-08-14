# The To-Do List

> **This is the whole live list. If it is not here, nobody is doing it.**
> Finished work, and work deleted for failing the product test, is on
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
>
> 🔴 **Every item here has to pass Mike's test before it earns a line** —
> [`product-principles.md`](product-principles.md): *does it serve the user, make the system better
> quality or more robust, or improve marketability?* **If the answer to all three is no, it is not
> parked, deprioritised or filed under tidying. It is deleted, with its code.** Ruled 2026-08-15
> after a full audit cut the list from 31 items to 15.
>
> **Numbers are stable and gaps are deliberate.** A missing number means that item was deleted;
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md) says which and why.
>
> **Last verified against the code: 2026-08-15**, item by item. Items marked ✅**verified** were
> checked against the actual code or git history on that date. Items marked ⚠**unverified** came
> from the backlog and have not been re-checked — treat them as claims, not facts.

---

## 0. Release position — read before picking anything up

🔴 **Ruled by Mike, 2026-08-14. Getting another release to the master coding team is the
priority.** In his words: *"I want all key functionality and key pages in position so we can load
into UAT and get initial thoughts sorted — details like this domain word sweep can be done in
early production beta stage."*

**So judge every candidate task by one question: does this get a release out?**

- **Key functionality and key pages in position** — that is the bar. Not polished, not complete.
- **Finer detail is explicitly deferred to early production beta.** The domain-support word sweep
  was the named example — **and on 2026-08-15 Mike deleted it outright** rather than deferring it,
  under the standing test in [`product-principles.md`](product-principles.md): *if it does not serve
  the user, improve quality or robustness, or improve marketability, it comes out of the app.*
  Apply that test to anything in this class before writing it down at all.
- **This SUPERSEDES the ruling of 2026-08-11** — *"no PR to `master` until the task list is
  clear"*. That position is withdrawn. A PR to `master` is now on the table rather than
  deliberately held back, and there are **25 commits ahead of `master`** already waiting.

⚠ **Why this block exists at all, and why nothing like it goes in a session note again.** The
2026-08-11 ruling it replaces lived *only* in session notes, hand-copied forward into five of them
(`SESSION-2026-08-11-C`, `-08-12-B`, `-08-12-C`, `-08-12-D`, `-08-12-E`) and never once written
into this list or `ACTIONS.md`. Every session faithfully carried it and no session promoted it, so
a standing instruction about *when we release* sat in a dated file for four days. Those five copies
are now stale — **this block is the current position and they are not.** It is the same fault the
Working Agreement names in its own checklist: a rule left in a session note is a rule nobody will
find. **A ruling that changes what we work on belongs here, on the day it is given.**

---

## 1. Why this list exists

**`ACTIONS.md` is 6,135 lines long, and it reads as about seventy open tasks. The real number is
closer to ten.**

That is not a filing problem, it is a decision-making problem. When the list looks like seventy
things, nobody can hold it in their head, so nobody triages it — and the genuinely urgent item
sits in the same visual weight as a note about JSDoc. It has already gone wrong in a measurable
way: on one occasion the app's "top open defect" was reported from that file **three days after
it had been fixed**.

There is a second failure the backlog does not catch at all. A hazard written as a warning is not
a task. One fault was described in five separate places, every time as something to be careful
about, and **not once as something to fix**. It survived for weeks because the record kept
warning about it and nothing owned it.

**So this list has rules:**

- **Every item says who it is waiting for** — you, us, or somebody outside this project.
- **Every item says how it was verified**, or admits it wasn't.
- **A warning is not an item.** If it belongs here, it is written as something someone does.
- **Finished work moves**, it does not accumulate. The second page keeps the record.

---

## 2. Waiting on you — nothing happens until you rule

*Four items. None of them need code first; all of them block code.*

**2.1 · Send the master team the release number.** ✅**verified** — `v0.8.0` is tagged and pushed,
and nobody outside has been told. They cannot pull what they do not know exists; v0.6.0 was never
pulled at all. Three lines: pull the **tag** `v0.8.0`, **no `npm install` this time**, read the
notes first. **As of 2026-08-14 there is now a page to point them at** —
[`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md), linked from the README, covering the runtime, the
environment, the schema rows, the screen addresses and how to prove the app really started.

**2.3 · Seminar's seven lines** — reword toward Public Speaking. ⚠ carried since session 48.

**2.6 · `advisor_note` — one line from you.** ✅**verified 2026-08-15** — the
`profitability_feasibility` / `pf_awareness` node in your own logic tree carries a real
instruction that reaches the AI **nowhere**: *"This determines the delivery method. Do not use
Trial Fit on an unaware client — it will cause map shock. Do not use Cautious Reveal on a
motivated client — it will feel slow and condescending."* `formatNodeForPrompt` does not read the
field. Not fixed unasked, because emitting a new field changes what the model is told. **Should
`advisor_note` be emitted the same gated way `recommendation` now is?**

**2.9 · The education-gate wording.** The behaviour is already ruled — on low client literacy the
advisor gets a prompt asking whether to apply education-first or see what is technically needed,
with the reasoning shown either way. **The on-screen words need confirming before it is coded.**

---

## 3. Waiting on somebody else — not ours to finish

*Four items. Every one of them is why something else looks half-built.*

**3.1 · 🔴 Provision MySQL.** ✅**verified** — the credentials are still placeholders and no row
has ever been written anywhere. **This is the single biggest blocker in the project.** Advisor
progress, case studies, every firm-editable setting, courses and the whole people layer all run
on development files or in memory. Nothing in any of them has ever been proven against a real
database. Two real course sessions were completed in the running app and both writes failed.

**3.2 · The middle-tier logins.** ✅**verified** — no role value produces a global group manager
or a group manager, and the mentor is still borrowing the platform-admin role. Until this lands,
those hubs cannot be demonstrated by signing in as one.

**3.3 · The firm membership data.** ✅**verified** — the firms table has no country, group or
parent column, so nothing in our data says which firms are in which group. In development the two
middle hubs show **invented firms**, and the server says so loudly at startup.

**3.5 · Reply to Carl about `npm install`.** ⚠ carried.

*(3.4 — "ask the master team for the two role values" — was merged into 3.2 and 3.3 on 2026-08-15.
It was the action those two items are waiting on, not a separate task.)*

---

## 4. Ready to build — approved or unblocked

**4.4 · Open the Handbook, edit a word, reload, confirm it survives.** ⚠ **This is one click, and
it has to be yours** — the edit-persistence is proven in code but has never been seen working in a
browser, and this machine has no browser automation (no Playwright), so no session can prove it for
you. *(Waits on Mike — 30 seconds.)*

**4.7 · Flip `engine-strict` back on.** ✅**verified** — still `false`. Two transitive packages
over-declare their Node requirement and need pinning down first, then one install to verify.
⚠ **Reinstall is overnight-only on this machine**, and there is a documented safe procedure —
follow it exactly rather than running a plain `npm install`.

**4.8 · The course builder live click-through — PART DONE 2026-08-14.** ✅**walked live against
the running app.** The whole course document lifecycle works: create → list → update progress →
re-read → delete, through the real HTTP path with the progress edit surviving a re-read. Mike
confirms building a course and setting the quiz works well in the screen itself. **A real advisor
session was also walked end to end** — 14 turns through the intake pipeline to a genuine streamed
AI recommendation (444 chunks, 2,579 characters), and the live OpenAI call answers in ~1.1s with
the CA bundle correctly configured. ⚠ **Storage caveat: it saved to `data/dev-courses.json`, not
MySQL** — see 3.1, and 4.13 below. **Still not walked:** interrupting a streaming reply with
Start-fresh, refreshing to confirm the course survives, and confirming the migration ran. *(Waits
on us — a short session.)*

**4.13 · Make a write that cannot REACH MySQL as loud as one MySQL refuses.** New 2026-08-14.
✅**verified — the course saved this afternoon went to a local file and reported success, exactly
like a real save.** v0.8.0 fixed half of this: `server/utils/dbFailure.js` tells a *refusal* (which
carries a `sqlState`) from a connection failure (which does not), so a rejected write no longer
lands in a scratch file. **The other half is open** — when nothing answers at all, the dev fallback
still writes `data/dev-*.json` and the screen still says saved. The load pack tells UAT to run with
`NODE_ENV=production`, which closes it, **but a documented workaround is not a fix**: it depends on
whoever deploys reading section 5, and choosing production mode also forbids the dev tokens the two
middle-tier hubs currently need. *(Waits on us.)*

**4.9 · Make the coaching reference inherit.** ✅**verified as a real gap** — its fifteen rows
already carry stable ids; it simply never joined the inheritance mechanism, and its firm side is
append-only.

**4.12 · One handover story for the master team.** The merged app's own handover documents still
describe a separate standalone application.

---

## 5. How to keep this list honest

- **Apply the product test before writing anything down.** Serves the user, improves quality or
  robustness, improves marketability — if none of the three, it does not go on the list at all.
  This is the rule the 2026-08-15 audit added, and it is the one that keeps the list short.
- **Nothing is parked.** Parking was tried and it failed: a parked item is still in the codebase,
  still in the backlog and still an invitation to finish it. Deleted means deleted, code included.
- **When something is done, move it** to [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
  Do not tick it and leave it here.
- **When a hazard is discovered, write it as a task** — something a person does — or it will not
  get done.
- **Re-verify before acting, and re-verify what is already here.** An item marked ⚠ is a claim from
  the backlog, not a fact. **The 2026-08-15 audit found §2.7 had been BUILT on 2026-07-29** and had
  sat here for seventeen days saying it must not be built without Mike's answer. Four items in total
  have now been found already built while still flagged open.
- **An observation is not a task, and an AI-written line carries no authority.** A whole fortnight of
  work grew out of one AI-authored sentence in `ACTIONS.md` that a later session read as an
  instruction. If nobody asked for it, it does not go on the list.
- **If this list passes about twenty live items, something is wrong** — either work is not being
  moved off it, or warnings are being filed as tasks again.
