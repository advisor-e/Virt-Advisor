# Template Check — the History

> **Read [`template-check.md`](template-check.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. The exception, and why it is principled rather than convenient

On 2026-08-10 the owner ruled that **every report rolls up** — each level seeing the level
immediately below it, summarised, with no per-report exceptions. The rule exists because deciding
report-by-report which tier "should" see something invents per-tier functionality and creates an
exception list somebody must re-derive later.

**A day later he narrowed this one report himself**, in the same breath as approving the roll-up
of three others:

> *"template check should only be for the mentor since we use it to improve the overall system.
> it does not relate to people/advisor performance or group manager selection/access permission
> to templates."*

The structural reason underneath it: **it has no firm dimension.** It scans the shared catalogue
against the shared tables. There is nothing in it belonging to a group that could be shown to that
group, so "roll it up" has no meaning here rather than being merely undesirable.

**That is the difference between a principled exception and a convenient one**, and it is why
this one is safe to keep: it does not need a judgement call about who deserves to see what.

---

## 2. What it cost, and the count that was wrong for eight sessions

Narrowing it made each middle-tier hub **twelve tabs, not the thirteen first drawn**.

A carried backlog item read *"mentor +2 / firm +3"* tabs missing against the approved mockup. It
is **+2 / +2**. The third firm tab was Template Check, narrowed *after* the "+3" was written —
and the line was carried unchanged through eight sets of session notes before anyone opened the
artefact and put it beside the code.

**A number in a note is not evidence.** It was correct when written, and nothing marked it as
having expired.

---

## 3. Why rulings are stored at all

From the approved design: *a dismissal is remembered and can always be undone.*

The failure it prevents is specific and fatal to the screen's purpose — **if a ruling does not
survive a page reload, the screen raises the same false alarms every time it is opened, and stops
being trusted.** A tool nobody trusts is not used, and an unused accuracy report is worse than
none, because its existence implies the check is happening.

**And it must be undoable**, because a dismissal made in error would otherwise permanently hide a
real disagreement.

---

## 4. The pattern this proved

The rulings ride the **same mechanism as the mentor's distinctions** — the reserved global overlay
scope under its own key. That gives version history and one-click restore with no new table, and
makes a collision with a real firm's rows impossible.

It was the **first evidence that the pattern generalises** to a second kind of mentor-authored
content — which is part of why it was later ruled the single mechanism for the whole cascade.

---

## 5. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Does Template Check roll up? | **No — mentor only.** The one named exception. | 2026-08-11 |
| Which guard do its routes keep? | **The mentor-role guard**, not the managing-tier one. | 2026-08-11 |
| Are rulings remembered? | **Yes, and always undoable.** | approved design |
| Where are they stored? | **The mentor overlay scope**, its own key, version history for free. | — |
| Is the queue being worked now? | **No — parked until after UAT testing.** | 2026-08-13 |

---

## 6. Where the raw material is

**The queue documents** — [`../TEMPLATE-CHECK-ALREADY-ANSWERED.md`](../TEMPLATE-CHECK-ALREADY-ANSWERED.md),
[`../TEMPLATE-CHECK-REMAINING-58.md`](../TEMPLATE-CHECK-REMAINING-58.md),
[`../TEMPLATE-CHECK-THE-LAST-12.md`](../TEMPLATE-CHECK-THE-LAST-12.md) — are working material for
the ruling session, **parked**.

**In-code:** the header block of `server/utils/templateCheckRulings.js` explains why rulings
persist and why they use the mentor scope. The `TAB_TIERS` comment in `FirmManagerHub.vue` records
the exception and quotes the ruling.

**Permanent companions:** [`../TREE-RECOMMENDATION-REVIEW.md`](../TREE-RECOMMENDATION-REVIEW.md)
(the named-but-unpublished tools this screen surfaces) ·
[`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §4.2.
