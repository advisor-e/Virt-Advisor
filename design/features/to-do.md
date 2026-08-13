# The To-Do List

> **This is the whole live list. If it is not here, nobody is doing it.**
> Finished and deliberately-parked work is on
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md) — kept so nothing is forgotten, moved so
> nothing is buried.
>
> **Last verified against the code: 2026-08-13.** Items marked ✅**verified** were checked against
> the actual code or git history on that date. Items marked ⚠**unverified** came from the backlog
> and have not been re-checked — treat them as claims, not facts.

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

*Nine items. None of them need code first; all of them block code.*

**2.1 · Send the master team the release number.** ✅**verified** — `v0.8.0` is tagged and pushed,
and nobody outside has been told. They cannot pull what they do not know exists; v0.6.0 was never
pulled at all. Three lines: pull the **tag** `v0.8.0`, **no `npm install` this time**, read the
notes first.

**2.2 · The four missing hub tabs.** ✅**verified against `TAB_TIERS`** — the approved mockup says
the Mentor hub should gain *Team Progress* and *Team Case Studies*, and the Firm hub *Case
Reviews* and *Logic-Lab Report*. The code deliberately excludes all four and says so in a
comment. **It is +2 and +2, not the "+3" carried through eight sets of notes.** Nothing is
broken — the tabs are absent, not faulty.

**2.3 · Seminar's seven lines** — reword toward Public Speaking. ⚠ carried since session 48.

**2.4 · The Management Reporting annual plan name** — "Mgt Annual Plan" or "Annual Board Plan".
⚠ carried.

**2.5 · The five roll-up labels.** ⚠ carried since session 45.

**2.6 · `advisor_note` — decide what it is.** ⚠ carried since session 45.

**2.7 · Should the per-question quiz record store the advisor's own written answer?** The
recommendation on file is **no free text** — advisors write differently once they believe a
manager reads their words, which degrades the very signal the record exists to collect. Text can
be added later; it cannot be un-stored. **Not to be built either way without your answer.**

**2.8 · How should `STATUS.md` stop going stale silently?** ✅**verified** — regenerating it once
moved the counts by ten items and its links were pointing about 260 lines off target. **A wrong
link is worse than no link.** Three options: regenerate it automatically whenever the backlog is
committed; add a test that fails when it is out of date; or stamp it with the version it was
generated from so a reader can see it is stale. Recommendation: the first.

**2.9 · The education-gate wording.** The behaviour is already ruled — on low client literacy the
advisor gets a prompt asking whether to apply education-first or see what is technically needed,
with the reasoning shown either way. **The on-screen words need confirming before it is coded.**

---

## 3. Waiting on somebody else — not ours to finish

*Five items. Every one of them is why something else looks half-built.*

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

**3.4 · Ask the master team for the two role values, and which group a manager manages.** ⚠
carried since session 39.

**3.5 · Reply to Carl about `npm install`.** ⚠ carried.

---

## 4. Ready to build — approved or unblocked

**4.1 · 🔴 Hardcoded English on the report screens and parts of the advisor screen.**
✅**verified** — a breach of the locked stack requirement that every user-facing string goes
through the wording layer. It is logged as critical, not accepted. Its real cost: the people who
own the words cannot change them without a developer, and a second language stops being a data
problem.

**4.2 · Measure the blast radius of the fabricated content.** One confirmed invented detail was
found living in the domain-support data presented as the firm's own material, and **corrected**.
**No sweep has ever checked the other rows for the same class of invention.** This is a
verification pass, not a fix — and it is the one open item where the honest answer is "we do not
know how big it is."

**4.3 · Flip `engine-strict` back on.** ✅**verified** — still `false`. Two transitive packages
over-declare their Node requirement and need pinning down first, then one install to verify.
⚠ **Reinstall is overnight-only on this machine**, and there is a documented safe procedure —
follow it exactly rather than running a plain `npm install`.

**4.4 · The course builder live click-through.** Never done. Build a course end to end, complete
a session and quiz, interrupt a streaming reply with Start-fresh, refresh and confirm the course
survives, reload and confirm the migration ran. **Three tracked items close only on that
session** — until then the feature is proven by tests and not by use.

**4.5 · Make the coaching reference inherit.** ✅**verified as a real gap** — its fifteen rows
already carry stable ids; it simply never joined the inheritance mechanism, and its firm side is
append-only.

**4.6 · Extend the invisible mode swap.** Ruled: it should fire in Discover mode and before a
recommendation, as well as during the client deep-dive. Needs a scenario-lab pass so the early
version cannot derail the intake questions.

**4.7 · Reconcile the two data layers.** This app uses MySQL with a file fallback; the people
layer runs in memory. Neither has a real database, which is exactly why it should be done
knowingly rather than by accident.

**4.8 · One handover story for the master team.** The merged app's own handover documents still
describe a separate standalone application.

---

## 5. Tidying — real, low value, no user impact

*Do these when something else brings you into the file, not as a project.*

**5.1 · The three large components keep growing** — the advisor screen, the course builder and
the hub are all well past the point where they would normally be split. Each is load-bearing and
needs tests in front of any split.

**5.2 · Sparse documentation comments** across the mixins and two large backend files. Already
scheduled into a planned clean-up pass, gated behind the master team's work.

**5.3 · Move the advisor profile off browser storage into the database.** Same family as the case
studies migration; waits on the same thing.

**5.4 · Teach the status table the "paused" marker.** ✅**verified as still open** — and worth a
sentence, because it is a small lesson in itself. The reason this fix was logged is that a paused
item was invisible in the generated table, and *paused work is exactly what gets forgotten*. But
the one example it exists to surface — a fake team dashboard — refers to **a screen that has
since been deleted**. The fix is still right; its evidence has expired.

**5.5 · Six building blocks could become firm-editable** — the question weights, the strategy
table, the primary-issues table, the content summaries, the coaching reference and a logic-tree
editor. A known recipe exists for each.

---

## 6. How to keep this list honest

- **When something is done, move it** to [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
  Do not tick it and leave it here.
- **When a hazard is discovered, write it as a task** — something a person does — or it will not
  get done.
- **Re-verify before acting.** An item marked ⚠ is a claim from the backlog, not a fact. Three
  separate items have been found *already built* while still flagged open.
- **If this list passes about twenty live items, something is wrong** — either work is not being
  moved off it, or warnings are being filed as tasks again.
