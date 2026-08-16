# Quizzes — the History

> **Read [`quizzes.md`](quizzes.md) first.** That page is the rules. If the two disagree,
> **the Brief wins**.

---

## 1. What the feature was asked to be

> *"Give a firm a no-code page inside Firm Manager to own its quiz material: start from the
> quizzes we provide, edit them, and add their own — so a firm can build quizzes that support how
> **they** teach, not just the platform defaults."*

The model the owner described, and the part that keeps being re-derived: **nothing is
free-standing.** In Advisor-e a firm starts from a blank template, edits it, and on save it
becomes a real firm-level template recorded in the search content. A firm's quiz attaches to one
of those — platform, cloned down, or their own. **The quiz page never mints a template.**

---

## 2. The finding that shaped the binding

**There is no stable unique id per template in the master export.** The `page` value looks like
one and is not — it is a deliberately *shared* page grouping, so several templates can carry the
same value.

That is why binding a topic to a template goes through a **resolver** rather than an exact-title
match, and why an ambiguous heading is surfaced for a human decision instead of being guessed.
It is also why a locking test proves *every topic resolves to exactly one template*, which
replaced a brittle exact-title test that broke whenever a heading was reworded.

---

## 3. Faults worth remembering

**Overrides keyed on AI-written session titles.** The titles change between generations, so the
hand-written overrides silently never fired — and nothing anywhere reported that they hadn't.
Re-keyed on something stable. **Never key content on a value a model wrote.**

**The grader was marking against general knowledge**, because it did not receive the session
summary the question-writer had.

**A grading failure invented a 75% pass.** It now records "ungraded", excluded from averages and
certificates. A fabricated score is a claim about a person's capability that nobody made.

---

## 4. Decisions taken and closed — do not reopen

| Decision | Ruling |
|---|---|
| Can a firm edit the platform quizzes' content? | **Yes, as an overlay.** The base is never touched, so reset always works. |
| Do quizzes cascade, or are they always a firm overlay on the platform base? | **They cascade**, by row decision, on the same mechanism as Advisory Distinctions. |
| Does the quiz page create templates? | **No.** It authors quizzes against templates that already exist. |
| Is the search content modified from here? | **Never.** Read-only, always. |
| Who signs off transcribed question text? | **The owner** — it is his material. |

---

## 5. Where the earlier record is wrong

Read 2026-08-13. [`../FIRM-QUIZ-BUILDER-PLAN.md`](../FIRM-QUIZ-BUILDER-PLAN.md) is the fullest
statement of the model and its status line is now wrong:

- It is headed **"DRAFT for review… no code written against it yet."** The feature is built —
  the Firm Manager quiz screens exist, the store exists, and the tier cascade carries quizzes as
  one of its six inheriting blocks.
- Its §7 lists four open decisions. **Two are answered:** quizzes *do* cascade, and a firm edits
  the platform set as an overlay with the base restorable. The template-picker source remains a
  real open dependency on the master app.
- Its §5 describes the overlay pattern as something to reuse "don't reinvent". That is exactly
  what happened, and it is now the pattern for every cascading block rather than a
  quiz-specific choice.

**Left in place** — it is a record of its own date, and §2's description of the model is still
the clearest account of why a quiz is always bound to a real template.

---

## 6. Where the raw material is

**Permanent companions:**
[`../FIRM-QUIZ-BUILDER-PLAN.md`](../FIRM-QUIZ-BUILDER-PLAN.md) (the model, the seed content and
the phases) · [`../QUIZ-LAB-REPORT.md`](../QUIZ-LAB-REPORT.md) (the bank analysis — the largest
single record on quiz content) · [`../COURSE-BUILDER-PLAN.md`](../COURSE-BUILDER-PLAN.md)
(CB-04, CB-12: the grader and the override keying) ·
[`../CONTENT-ROUTING.md`](../CONTENT-ROUTING.md) (**generated** — quiz banks classified as
advisor-read-only, which is correct: they never reach a client recommendation).

**The skill:** `firm-manager-edit-target` — the recipe this feature was built with.
