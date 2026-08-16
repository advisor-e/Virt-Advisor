# Logic-Lab Report — the Brief

> **A Mentor Hub tab.** Read this before changing what a mentor learns from the levels below.
> Current rules only; the history is in
> [`logic-lab-report-history.md`](logic-lab-report-history.md).
>
> **Covers:** the roll-up of what every firm pushed back about the decision configuration.
> **Does not cover:** the Logic Lab itself ([`logic-lab.md`](logic-lab.md)) or the tables it
> reasons over ([`logic-tables.md`](logic-tables.md)).

---

## 1. Design philosophy

**One firm pushing a fix is that firm's preference. Several firms pushing the same fix is a
platform default that needed fixing.**

That is the entire reason this screen exists, and it is the feedback half of the cascade made
concrete: configuration flows down so everyone shares good material, and what firms *changed*
flows back up so the defaults improve.

**The pushed-edit feed is the page; the counts are supporting material.** In the artefact's own
words: *counting configuration tells you what firms have; a pushed edit tells you what a firm was
trying to achieve, and what they had to do to get there.*

**It reports configuration, never people.** This is a read across firms, and the line is enforced
in code rather than by convention.

---

## 2. Key principles — the non-negotiables

**P1 · Configuration, never people.** No adviser, no client, nothing personal. The guard
**throws** rather than filtering, so the day the payload shape changes is loud.

**P2 · The feed leads; the counts follow.** A screen that opens on totals answers the wrong
question.

**P3 · Every cross-firm row carries its origin, as a path.** A report showing something is wrong
without showing where is an alarm with no address. Naming a firm to the manager above it is not a
disclosure — the adviser and the client stay hidden.

**P4 · It reads the level immediately below the viewer**, summarised. It appears at the mentor
and both middle tiers.

**P5 · An empty roll-up says so on screen.**

**P6 · The artefact is the specification.** The approved mockup holds the ruled shape and
wording.

---

## 3. Design considerations

**A pushed edit is evidence, not a complaint.** The screen's job is to make a pattern visible —
several firms making the same change — so a default can be improved once rather than worked
around repeatedly.

**This is the second cross-firm accuracy read in the app**, and it shares its privacy discipline
with the first. If a third is ever built, it reuses this shape rather than inventing one.

**It is about the configuration a firm changed**, not the outcomes their advisers achieved.
Those are different questions and different screens.

---

## 4. For the coder

| Piece | Path |
|---|---|
| The roll-up | `server/utils/mentorLogicLabReport.js` |
| The personal-field guard | `assertNoPersonalFields`, in the same module |
| Origin path | `server/utils/tierChain.js` — `originPathOf` |
| Hub tab | rendered by `components/FirmManagerHub.vue` |
| **The artefact** | `design/mockups/mentor-logic-lab-report-mockup.html` — approved 2026-08-04 |

**Traps.** The guard throwing is deliberate. The origin path is a **path**, ordered from the
level immediately below the viewer down to the firm, so its first element is what the screen
groups by — do not flatten it. And this tab was one of those gated on a negative; every tier is
now named positively.

**Known state.** It depends on firms having pushed edits, which depends on real firms using the
product against a real database. It has never shown live data.

---

## 5. Related briefs

[`logic-lab.md`](logic-lab.md) — where a pushed edit comes from ·
[`logic-tables.md`](logic-tables.md) · [`adoption.md`](adoption.md) — the other mentor-only
accuracy read · [`tier-cascade.md`](tier-cascade.md).

**History:** [`logic-lab-report-history.md`](logic-lab-report-history.md)
