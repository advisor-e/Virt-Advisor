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

Their pages landed as **components, not pages**, so no new URL became reachable in this app.

---

## 2. The trap found on the way in

**Two database pools onto one database.** Collaborate brought its own identical connection pool;
it was deleted, leaving one for the whole app. Told in full in
[`collaborate-data-layer-history.md`](collaborate-data-layer-history.md) §2 and the Brief's P1.

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

**The merge cut across an in-flight handover** — Collaborate was being packaged, right then, as
a standalone deliverable. The owner's ruling was that one neat pull is the goal, **so the
handover documents had to be rewritten as part of the merge rather than left to contradict it.**

---

## 5. Where the earlier record is wrong

[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) §1 and §4 are stale; slices 5
(reconciling the two data layers) and 6 (one handover story) remain open.

---

## 6. Where the raw material is

**Permanent companions:**
[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) §1–§3 and §6 (what Collaborate is,
why the merge was realistic, and the risks) ·
[`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §1.2 and §5.4.

**In-code documentation:** the header blocks in `server/collaborate/data/ipClassification.js` and
`roles.js` are written for the master team and are the authority on those two seams.
