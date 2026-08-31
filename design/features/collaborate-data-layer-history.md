# The People Data Layer — the History

> **Read [`collaborate-data-layer.md`](collaborate-data-layer.md) first.** That page is the
> rules. If the two disagree, **the Brief wins**.

---

## 1. Why it was built as one file

Collaborate was written as a standalone application intended, from the start, to be handed to
another team. Its data layer was **deliberately built as a one-file database seam**: everything
in memory, every function async, every function carrying the query that would replace it.

That decision is why the merge into this app was cheap, and why connecting a real database is
still a contained job rather than an archaeology exercise. It is worth copying, not just
preserving: **a seam written for the person who will replace it is worth more than a seam
written for the person who wrote it.**

---

## 2. The pool that would have bitten whoever wired it

Collaborate arrived with **its own identical database pool**. Two pools onto the same database is
a latent fault — connection limits, transaction confusion, and two places to configure — and it
would have surfaced not at merge time but on the day somebody uncommented the line to go live.

It was deleted, leaving one pool for the whole application; the commented-out require left in the
data layer points at the surviving one, with a note explaining exactly this.

**The shape of the fault is the useful part:** nothing was broken, no test failed, and the
damage was reserved for a future stranger doing the obvious thing.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling |
|---|---|
| One backend or two? | **One.** Two servers, two configs and two auth middlewares became one each. |
| One pool or two? | **One**, for the whole app. |
| Does this repo determine a user's tier? | **No.** Login, roles and the hierarchy belong to the master app. This repo never invents a role-value name. |
| Where does the tier come from meanwhile? | **A hybrid** — firm from branch, group from country, designations from the role claim, with an interim override table. |
| Is the ownership map final? | **No** — a demonstration set to be replaced by a lookup against the real register, same return shape. |
| Reconcile the two data layers now? | **Not yet.** Two half-built layers and no working one to preserve; best done knowingly. |

---

## 4. What is honestly unfinished

**Reconciling the two data layers.** This app uses MySQL with a development file fallback; the
people layer is in memory. Neither has a real database. It was written down as its own slice
precisely so it would be done deliberately rather than by accident.

It is not approved or started.

---

## 5. Where the raw material is

**The authority on these seams is in the code, not in a document.** The header blocks in
`server/collaborate/data/repository.js`, `roles.js` and `ipClassification.js` are written for the
master team, name what to replace and what to keep, and are maintained with the code they
describe.

**Permanent companions:**
[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) §5 (slices 5 and 6, both open) and
§6 (the risks) · [`../HANDOFF.md`](../HANDOFF.md) ·
[`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §1.1 (what belongs to the master
app and must not be copied here).
