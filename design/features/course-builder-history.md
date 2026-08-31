# The Course Builder — the History

> **Read [`course-builder.md`](course-builder.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. The improvement pass that produced most of the rules

A logic review found twenty-four items, and every fix followed the same discipline: show the
broken behaviour, propose the exact change, wait for the owner's yes, fix, test, run the full
suite, commit.

**The four that mattered most, and why each was ranked first:**

- **A failed revision could leave the advisor with nothing.** The approved outline is now kept
  as a fallback. Nobody loses their work.
- **A grading failure invented a 75% pass.** It now records "ungraded", and ungraded answers are
  excluded from averages and certificates. **A fabricated score is worse than a missing one** —
  it is a claim about a person's capability that nobody made.
- **Hallucinated resource names reached advisors.** Every name in a generated outline is now
  checked against the real library. Never invent the firm's IP.
- **Images were not blocked in course chat**, though they were in the main conversation. A
  one-line fix closing a known injection channel that had simply been missed in the second
  screen.

Those four were done first because they were the cheapest fixes with the highest trust payoff.

---

## 2. Faults worth remembering

### An override keyed on something that changes

Hand-written quiz overrides were keyed on **AI-written session titles**. The titles vary between
generations, so the overrides silently never fired. Re-keyed on something stable. The general
shape: *never key data on a value a model wrote.*

### The grader was marking against general knowledge

The quiz grader did not receive the session summary the question-writer had, so it graded
answers against what the model happened to know rather than what the course had taught.

### A global swallow hid unrelated crashes

An `unhandledRejection` handler was catching everything, including faults that had nothing to do
with courses. Removed.

### Dead pipeline logic that looked alive

Three pieces of the design pipeline were traced and cleared: a flag that was never read, a field
that was never written, and a conversation history that was passed and ignored. All removed only
after tracing — the rule is trace before removing, not delete on suspicion. One of them, an
unused `skip` hook, turned out to be exactly the mechanism the interview needed and was wired up
rather than deleted.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| The "Firm-wide" sharing button | **"Coming soon"** — visible, disabled, visibility always stored private until sharing works | 2026-07-15 |
| Real persistence | **Built** — owner-scoped routes, progress identity from the token, legacy browser copy never deleted | 2026-07-15 |
| Does the AI show template content? | **Never.** It names the resource and points to the library. | locked |
| A grading failure | **"Ungraded."** Never a substituted number. | 2026-07-15 |
| Splitting the 2,700-line component | **Stays in the general backlog.** Balloons scope for little advisor-visible gain. | 2026-07-15 |

---

## 4. What is honestly not finished

**The live click-through has never been done.** With both servers running: build a course
end to end, complete a session and quiz, interrupt a streaming reply with Start-fresh, refresh
and confirm the course survives in the server store, then reload to confirm the legacy migration
ran. Three separate tracked items close only on that session.

**Coverage note:** the full coverage run fails the repository's global threshold — 51.3%
against 80 — pre-existing, and not caused by the course work.

---

## 5. Where the raw material is

**Permanent companions:** [`../COURSE-BUILDER-PLAN.md`](../COURSE-BUILDER-PLAN.md) (the five
phases, item by item, with the commit that closed each) ·
[`../COURSE-SESSION-PLANNING.md`](../COURSE-SESSION-PLANNING.md) ·
[`../COURSE-SESSION-LENGTH-WORDING.md`](../COURSE-SESSION-LENGTH-WORDING.md) ·
[`../COURSE-SLICED-SESSION-WORDING.md`](../COURSE-SLICED-SESSION-WORDING.md) (approved wording —
the artefacts, not paraphrases of them) ·
[`../virt-advisor-system-design.md`](../virt-advisor-system-design.md) §8 (what the two phases
are, and how a course differs from Learn mode).

**Item register:** the CB-xx ids in the plan are rows in `ACTIONS.md`. Close them in both places
together.
