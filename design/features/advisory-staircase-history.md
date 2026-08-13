# The Advisory Staircase — the History

> **Read [`advisory-staircase.md`](advisory-staircase.md) first.** That page is the rules. If the
> two disagree, **the Brief wins**.

---

## 1. Why one hard block survived when the others were removed

The engine used to keep "unsuitable" templates out with hard gates — engagement-type rules,
sub-section blocks. They were removed on 2026-06-04 because **they failed silently**: the best
template for a situation was excluded and the advisor never knew it existed, so a worse one was
recommended in its place.

Everything became ranking and flagging. **Except this.**

The staircase ceiling stayed a hard block on an explicit distinction: the others protected system
tidiness, this one protects **advisor capability**. Showing a step-five engagement to a step-one
advisor is not an untidy list, it is putting somebody in front of a client with a tool they
cannot yet run.

The honest counterpart shipped with it — when nothing within range exists, the screen says so
plainly rather than silently returning less. **That message is a feature, not a failure.**

---

## 2. Why the storage is additive

When the staircase joined the single firm-editable mechanism, the obvious move was to rewrite its
existing config into the new shape.

It was done the other way: **separate, additive keys** for declines, overrides and own steps, with
the original key untouched. So nothing a firm had already saved needed migrating, and the change
could not damage existing content.

**And the default ceiling deliberately stayed put.** The row mechanism is for a *list of rows*
inherited from above, where "switch this one off" and "add your own" mean something. A single
account-wide number is not a row, and forcing it into the mechanism would have made a setting
look like a decision.

---

## 3. The asymmetry, and why it is the same as the currency rule

Read by anyone signed in; written by managers only.

The reasoning is identical to the firm's currency setting, and it is worth stating because the
instinct is to guard both ends: **the staircase question is asked of every advisor in every
client session.** If a read required the manager role, or threw on failure, an ordinary advisor's
session would break. So it degrades to the platform wording instead.

**Two identical asymmetries in the codebase is a pattern, not a coincidence** — anything an
ordinary advisor's session depends on is readable by them and degrades rather than fails.

---

## 4. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Keep any hard block at all? | **Yes — this one.** It protects advisor capability. | 2026-06-04 |
| Migrate the existing config into the new mechanism? | **No.** Additive keys; nothing rewritten. | 2026-07-30 |
| Does the default ceiling join the row mechanism? | **No.** It is a setting, not a row. | 2026-07-30 |
| Who may write? | **Managers only.** | — |
| Who may read? | **Any signed-in firm user**, degrading to the platform default. | — |

---

## 5. Where the raw material is

**In-code:** the header blocks of `server/utils/firmStaircase.js` and `server/routes/staircase.js`
state the storage decision and the read/write asymmetry, and are maintained with the code.

**Permanent companions:**
[`../virt-advisor-system-design.md`](../virt-advisor-system-design.md) §3.5 and §13 (the
engagement types, the ceiling, and why the other hard exclusions were removed) ·
[`../FIRM-EDITABLE-TABLES-PLAN.md`](../FIRM-EDITABLE-TABLES-PLAN.md) ·
[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) §4.4 (where one mechanism for
every editable block was ruled).
