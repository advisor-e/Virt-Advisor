# Adoption — the Brief

> **A Mentor Hub tab.** Read this before changing what a mentor sees about how firms are using
> the product. Current rules only; the history is in
> [`adoption-history.md`](adoption-history.md).
>
> **Covers:** the "how firms are using the app" view — what it counts, what it deliberately does
> not show, and why. **Does not cover:** a firm manager's view of their own advisers
> ([`advisor-progression.md`](advisor-progression.md)).

---

## 1. Design philosophy

**It answers one question: which firms have gone quiet, so somebody can help them.**

Not *who is best*. Not *who is behind*. The whole product exists for advisors who are learning on
the job, and this screen exists so the people who can support them know where support is needed.
A badge here means **act**, not glance.

**It is deliberately not a roll-up of the team view.** Team Progress lists a firm's advisers **by
name** — that is a firm manager's view of their own people, and it is right at that level.
Widening it one level would have put every firm's advisers in front of the platform owner, across
a boundary this codebase enforces in code elsewhere.

**The same activity, counted one level up and stripped of who did it, answers the mentor's actual
question and crosses nothing.** That sentence is the whole design.

---

## 2. Key principles — the non-negotiables

**P1 · Counts, never people.** No adviser is named, and no field that could identify one is
carried. The guard **throws** rather than filtering — a silent filter would hide the day the
payload shape changed.

**P2 · Tone is help, not score.** The wording is advisory rather than a league table. This was
ruled explicitly and the approved wording lives in the artefact.

**P3 · A firm silent for the threshold period is flagged.** The threshold is generous on purpose
— it marks a firm worth a conversation, not a firm to be measured weekly.

**P4 · It is scoped to the level immediately below the viewer.** A middle tier reads only what
sits beneath it.

**P5 · An empty view and a broken one must never look alike.**

**P6 · The artefact is the specification.** The approved mockup holds the ruled decisions and the
approved wording. Build differences belong there, not in a commit message.

---

## 3. Design considerations

**Counting what a firm *has* is not the same as knowing what a firm is *doing*.** Configuration
counts describe a setup; activity describes use. This screen is about use.

**A quiet firm is not necessarily a failing firm** — it may be seasonal, or between engagements.
The screen should support a question, not deliver a verdict.

**It sits at the mentor and both middle tiers.** A group manager reads their firms; the mentor
reads their global groups.

---

## 4. For the coder

| Piece | Path |
|---|---|
| The roll-up | `server/utils/mentorAdoption.js` |
| The personal-field guard | `assertNoPersonalFields`, in the same module |
| Hub tab | rendered by `components/FirmManagerHub.vue` |
| **The artefact** | `design/mockups/mentor-adoption-view.html` — ruled 2026-08-09 |

**Traps.** The guard throwing is the feature — do not "improve" it into a filter. And the tab is
one of the three that used to be gated on a negative; every tier is now named positively, and it
must stay that way.

**Known state.** Like everything else that reads activity, it depends on a database that has
never been provisioned, so it has never shown real data.

---

## 5. Related briefs

[`tier-cascade.md`](tier-cascade.md) · [`firm-manager-hub.md`](firm-manager-hub.md) ·
[`advisor-progression.md`](advisor-progression.md) ·
[`logic-lab-report.md`](logic-lab-report.md) — the other mentor-only accuracy read.

**History:** [`adoption-history.md`](adoption-history.md)
