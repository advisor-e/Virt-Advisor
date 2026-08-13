# Groups, Marketplace & Messaging — the History

> **Read [`collaborate-groups.md`](collaborate-groups.md) first.** That page is the rules. If the
> two disagree, **the Brief wins**.

---

## 1. How the code arrived, and why it is namespaced

The whole application was brought across in one slice, **wired to nothing**, before any
behaviour changed. That order was deliberate: both test suites had to go green in one repository
first, on the reasoning that *if that slice is hard, everything after it is harder.*

It landed under its own directory rather than merged into this app's folders because **eight
paths collided and four of those differed**. Namespacing meant **zero edits to this app's
files** — one line in the ignore rules was the entire footprint.

Their pages landed as **components, not pages**, so no new URL became reachable in this app. The
wording clash that had been flagged as a risk never arose: their file landed whole in its own
directory.

**The scope was wider than the plan assumed** — getting 431 tests green also required their
pages, both mixins, the integration config, a middleware and two scripts. Recorded because the
plan's estimate for that slice was the one thing it got wrong.

---

## 2. The traps found on the way in

**A silent alias failure.** During the move, an import alias resolved to nothing without raising
an error — files simply weren't there, and nothing said so. Found by hand.

**A forked translation route.** The two apps had each grown their own version of the same route.
Reconciling them was part of the merge rather than a discovery afterwards.

**Two database pools onto one database.** Collaborate brought its own identical connection pool.
It was deleted, leaving one for the whole app — a latent bug waiting for whoever uncommented the
wrong line.

**Two integration configs and two schema files**, both authentication and security surfaces.
Slow, careful work, explicitly not a copy-paste.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling |
|---|---|
| Merge the app, or lift one component? | **Merge the app.** The manager page is a window onto the people layer, not a self-contained screen. |
| Where does the code live? | **Namespaced under its own directory** — zero edits to this app's files. |
| Do their pages become routes here? | **No.** They landed as components; no URL became reachable. |
| What happens on a wording-section collision? | **Refuse it loudly.** Never let one file silently win. |
| Who owns co-developed tools? | **Four explicit tiers**, with locked material non-derivable and not listable. |
| Is the ownership map final? | **No** — it is a demonstration set with a platform-owned default, to be replaced by a lookup against the real register, same return shape. |

---

## 4. The risk that was named up front

**The merge cut across an in-flight handover.** Collaborate's last commits were a master-team
handover checklist and pre-handover security fixes — that repository was being packaged, right
then, as a standalone deliverable with isolated integration seams. Merging changed what the
master team had been promised.

The owner's ruling was that one neat pull is the goal, **so the handover documents had to be
rewritten as part of the merge rather than left to contradict it.**

Also stated plainly at the time: **nothing in the early slices was provable by eye.** They were
provable only by the test suites, and were reported that way rather than as a working screen.

---

## 5. Where the earlier record is wrong

Read 2026-08-13. [`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md):

- Its §1 gives the standalone repository's local path, GitHub name and branch state. **That is
  no longer where this code is maintained.**
- Its §5 lists slices 3, 5 and 6 as unbuilt. Slice 3 was overtaken by the reserved-scope-id
  ruling; slice 5 (reconciling the two data layers) and slice 6 (one handover story) remain open.
- Its §4 and §4.4 contradict each other on clone-versus-layer; neither is the ruled model.

**Left in place** as a record of its own date.

---

## 6. Where the raw material is

**Permanent companions:**
[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) §1–§3 and §6 (what Collaborate is,
why the merge was realistic, and the risks) ·
[`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §1.2 and §5.4.

**In-code documentation:** the header blocks in `server/collaborate/data/ipClassification.js` and
`roles.js` are written for the master team and are the authority on those two seams.
