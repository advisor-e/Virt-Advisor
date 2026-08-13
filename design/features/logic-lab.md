# The Logic Lab — the Brief

> **A Firm Manager and Mentor Hub tab.** Read this before touching the decision-diagnostic
> screen. Current rules only; the history is in [`logic-lab-history.md`](logic-lab-history.md).
>
> ⚠ **This is the other machine's active ground.** The desktop owns the Logic Lab and the
> firm-side logic-table screens. Documenting it here is fine; changing it needs coordinating
> first.
>
> **Covers:** the screen where a manager sees *how* a recommendation was reached and can act on
> it. **Does not cover:** the tables it reasons over ([`logic-tables.md`](logic-tables.md)) or the
> roll-up of what firms changed ([`logic-lab-report.md`](logic-lab-report.md)).

---

## 1. Design philosophy

**It answers "why did it say that?" — and then lets the manager do something about it.**

Every recommendation in this app is meant to be traceable: signal, then issue, then routing, then
strategy, then template. The Logic Lab is where that trace becomes visible to a person rather
than living in a log. A firm manager can see the path the engine took and judge whether it was
right.

**The second half is what makes it more than a debugger.** A manager who can see *why* often
knows what the answer should be but not where to change it. The designed flow is that a
suggestion the lab surfaces can be **accepted and pushed** into the configuration it belongs to —
so the manager who *"knows what they want, not sure how to get it"* is not left hunting through
tabs.

> ⚠ **That push flow is designed and NOT BUILT.** No code exists for it. Do not read the design
> document as a description of the screen.

**It is firm-local by nature.** What one firm accepted is that firm's record of its own thinking.
It is not configuration to be inherited.

---

## 2. Key principles — the non-negotiables

**P1 · The Logic Lab does not cascade.** Its accepted list is array-shaped, and an array replaces
wholesale — a level holding a one-item list would blank the level above's entire set. That is a
correctness decision, not an omission.

**P2 · The three things a suggestion can touch are not equal.** Pushing a change into the
distinctions, into a logic table, and into the domain-support material are **different actions
with different risks**, and treating them as one button would break a rule this app holds for
good reason. Read the design before building any of it.

**P3 · Never invent the firm's material.** A suggestion that would write content nobody authored
is not a one-click.

**P4 · What a firm changed feeds the roll-up.** The value of a pushed edit is that several firms
making the same one reveals a platform default that needs fixing.

**P5 · The artefact is the record.** This feature exists partly *because* a design was agreed in
conversation and nearly lost — the conversation is recorded verbatim, with the analysis after it,
so the original can be read back rather than somebody's later summary.

---

## 3. Design considerations

**A trace is only as honest as what it can show.** If a stage of the pipeline is designed but not
built, the lab cannot display it — and the screen should not imply otherwise.

**Firm-local does not mean invisible.** What a firm accepted stays theirs, but the *pattern*
across firms is exactly what the mentor's report is for. Those are different reads of the same
activity and the privacy line between them is enforced in code.

**This is the newest of the hub screens and the most in flux.** Check the build against the
mockup before assuming either is current — there is a document that exists specifically to record
where the build and the mockup differ.

---

## 4. For the coder

| Piece | Path |
|---|---|
| The screens | `components/firm/FirmLogicLab.vue`, `FirmDecisionLogic.vue`, `DecisionLogicDiagnostic.vue` |
| Accepted-list storage | via `server/utils/firmOverlay.js`, key `logic-lab-accepted` |
| The roll-up above it | `server/utils/mentorLogicLabReport.js` |
| **Design record** | `design/LOGIC-LAB-ACCEPT-AND-PUSH.md` — **not built** |
| **Build vs mockup** | `design/LOGIC-LAB-BUILD-VS-MOCKUP.md` |

**Traps.** The accepted list cannot join the cascading keys — see P1. And the push flow is
designed, not built: anything that reads as though it exists is the design document, not the
screen.

**Known state.** Runs on the development file fallback like every other firm-editable block.

---

## 5. Related briefs

[`logic-tables.md`](logic-tables.md) · [`logic-lab-report.md`](logic-lab-report.md) ·
[`advisory-distinctions.md`](advisory-distinctions.md) · [`domain-support.md`](domain-support.md)
· [`firm-manager-hub.md`](firm-manager-hub.md).

**History:** [`logic-lab-history.md`](logic-lab-history.md)
