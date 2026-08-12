# The Course Builder — the Brief

> **Read this before touching course design, session delivery or quizzing.** Current rules only.
> The history is in [`course-builder-history.md`](course-builder-history.md).
>
> **Covers:** the structured multi-session learning programme an advisor builds for themselves —
> the design interview, the outline, session delivery and the end-of-session quiz. **Does not
> cover:** the conversational Learn mode ([`virtual-advisor.md`](virtual-advisor.md)) or where
> the results are read ([`advisor-progression.md`](advisor-progression.md)).

---

## 1. Design philosophy

**A course is a structured programme; Learn mode is a conversation.** They are different
products and should not be merged.

Learn mode follows the advisor's lead in a single sitting. A course has a fixed outline, runs
over days or weeks, logs each completion, and quizzes at the end of every session. An advisor
comes here when they want a *programme* rather than an answer.

**The AI facilitates. It never teaches the content.** This is the rule that shapes the whole
session experience: the AI opens a session with a couple of sentences on why the material
matters, **directs the advisor to the real resource in the Advisor-e library**, then asks what
stood out and connects it to their own practice. It never generates template content and never
shows what is inside a template. The firm's intellectual property lives in the library, not in a
model's output.

**Two things must never be fabricated: the advisor's work, and their score.** A failed AI call
must not lose the outline they approved, and a grading failure must not invent a pass mark. Both
have happened; both are now structurally prevented.

---

## 2. Key principles — the non-negotiables

**P1 · The AI never generates template content.** It names the resource and points the advisor
to the library. Anything else puts a model's paraphrase where the firm's material should be.

**P2 · Every resource name in a generated outline is checked against the real library before the
outline is accepted.** A hallucinated resource name is rejected. Never invent the firm's IP.

**P3 · A grading failure records "ungraded" — never a made-up score.** Ungraded answers are
excluded from averages, certificates and any manager-facing view.

**P4 · The approved outline is kept as a fallback.** A failed revision can never leave the
advisor with nothing.

**P5 · All four interview answers and any client-supplied context are fenced before entering a
prompt.** Treated as hostile input, wrapped in explicit delimiters, never concatenated raw.

**P6 · Images are disabled in course chat**, exactly as in the main conversation. Same
injection channel, same control.

**P7 · Stale streams are aborted.** Starting fresh mid-response must not let the old answer land
in the new conversation, and a client disconnect is cleaned up on the backend.

**P8 · Course ownership comes from the verified token.** Courses are owner-scoped; progress
identity is never read from the request body.

**P9 · New on-screen wording is confirmed before it goes into code** — including failure
messages and the "ungraded" language.

---

## 3. Design considerations

**The interview is the one genuine design surface.** Three questions, and it must handle a
non-answer ("what do you mean?") by re-asking rather than storing it — capped at one re-ask —
and skip questions the advisor already answered in their opening message. Getting this wrong
makes the product feel deaf.

**Quizzes can be AI-generated or overridden by a fixed set.** Hand-written overrides are keyed
on something stable, **not** on AI-written session titles, which change between generations and
silently stop matching.

**The grader must see what was taught.** It receives the same capped session summary the
question-writer got, so answers are graded against the course content rather than the model's
general knowledge.

**Sharing is deliberately not finished.** The "Firm-wide" button is visible but disabled behind
a *Coming soon* pill, and visibility is always stored as private until sharing genuinely works.
That is an owner ruling, not an oversight.

**Persistence is real but unproven.** Courses save to the server store behind the owner-scoped
routes, with a hardened per-advisor migration from the old browser storage that **never deletes
the legacy copy**. It runs on the dev-file fallback until MySQL exists.

**This component is very large** — over 2,700 lines — and splitting it is a known deferred item,
kept out of feature work on purpose because it balloons scope for little advisor-visible gain.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The screen | `components/CourseBuilder.vue` |
| The engine | `server/courseEngine.js` |
| Thin SSE proxy | `server-middleware/course.js` |
| Routes | `server/routes/courses.js` |
| Outline validation | `server/utils/outlineResources.js` |
| The design interview | `server/utils/designInterview.js` |
| Quiz scoring | `utils/quizScoring.js` |
| Quiz overrides | `server/utils/quizOverrides.js`, `data/course-quizzes.json` |
| Starter courses | `data/course-starters.json` |
| Prompts | `data/prompts/course-design.txt`, `course-session.txt` |

### The two phases

**Design** — the advisor picks one of four starter courses or begins from scratch; the AI
generates a full outline as structured data; the advisor confirms or adjusts before starting.
**Delivery** — one session at a time: a short why-this-matters opening, a pointer to the real
resource, a check-in on what stood out, questions connecting it to the advisor's practice, then
the quiz.

### Testing bar

Outline validation is AI-output handling, so it carries the strictest house standard — valid,
malformed, missing fields and wrong types. The engine is held at 90% line coverage by config,
deliberately, because it had almost none.

### Traps that have actually bitten

1. **A quiz override keyed on an AI-written title never fires.** The titles change; the override
   silently does nothing.
2. **A grading failure used to invent 75%.** Any new failure path must produce "ungraded", never
   a number.
3. **A revision failure used to leave the advisor with nothing.** Keep the approved outline.
4. **A global unhandled-rejection swallow hid unrelated crashes.** It was removed. Do not
   reintroduce a catch-all.
5. **Completion logging is fire-and-forget by design** — a database failure must never interrupt
   a live session — which means a failed write is easy to miss. It is logged server-side; check
   there, not on screen.

### Known open items

The live end-to-end click-through has never been completed: build a course, finish a session and
quiz, interrupt a streaming reply with Start-fresh, refresh and confirm the course survives, and
confirm the legacy migration ran. Until that is done, this feature is proven by tests and not by
use.

---

## 5. Related briefs

[`virtual-advisor.md`](virtual-advisor.md) — where a course is launched from ·
[`quizzes.md`](quizzes.md) — the question banks ·
[`advisor-progression.md`](advisor-progression.md) — where completions are read.

**History:** [`course-builder-history.md`](course-builder-history.md)
