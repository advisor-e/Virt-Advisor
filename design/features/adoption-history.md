# Adoption — the History

> **Read [`adoption.md`](adoption.md) first.** That page is the rules. If the two disagree,
> **the Brief wins**.

---

## 1. Why this screen exists instead of a wider Team Progress

The rejected design — Team Progress shown one level up — and the reasoning are in the Brief
(§1). **Recorded here because the rejected design was cheaper**, and taking it would have
created a privacy problem that no test could have caught.

---

## 2. The related error, in the opposite direction

The privacy reasoning above was later **over-applied**, treating an internal manager as an
outside party — told in full in [`tier-cascade-history.md`](tier-cascade-history.md) §2. Both
errors are worth holding together: **do not widen a named-person view upward, and do not treat
an internal manager as an outside party.**

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Roll up Team Progress instead? | **No.** Count activity, strip who. | 2026-08-09 |
| Tone | **Warmer, advisory — not a league table.** | 2026-08-09 |
| Quiet-firm threshold | **Generous** — a badge means act, not glance. | 2026-08-09 |
| Filter personal fields or throw? | **Throw.** | locked |
| Does it appear at the middle tiers? | **Yes**, scoped to the level below. | 2026-08-10 |

The four ruled decisions, including the approved wording, are in the artefact —
`design/mockups/mentor-adoption-view.html` — not in a commit message.

---

## 4. Where the raw material is

**The artefact:** `design/mockups/mentor-adoption-view.html` — **keep on file.** It is the
specification.

**In-code:** the header block of `server/utils/mentorAdoption.js` explains why this screen exists
rather than a roll-up, and is maintained with the code.

**Permanent companions:** [`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §2 (who
the user is, and why tone is help not score) and §4.4 (the over-application) ·
[`../TIER-CASCADE-MAP.md`](../TIER-CASCADE-MAP.md) §3.
