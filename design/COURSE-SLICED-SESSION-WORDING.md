# Sliced course sessions — the wording

**Status: PROPOSED. Nothing here is built, and nothing here is approved.** This file exists
so Mike has something to rule on that survives the conversation, per
[Save the Artefact](../CLAUDE.md). The screen it describes is
[`mockups/sliced-course-outline.html`](mockups/sliced-course-outline.html) — open that
first; this file is the reasoning behind it.

- **The model:** [`COURSE-SESSION-PLANNING.md`](COURSE-SESSION-PLANNING.md), approved
  2026-08-03. A session is a time-boxed slice of ONE activity.
- **The code:** `planSessions` and `fitOptions` in
  [`server/utils/courseEffort.js`](../server/utils/courseEffort.js) — built, tested, and
  wired to nothing.

---

## What actually changes on screen

Today the outline card lists the sessions **the AI grouped**: one row per session, each
naming one or more templates, each timed by adding up that template's video + reading +
rehearsal.

Under the slicer, the AI still chooses the material and the order, but **code writes the
timetable**. One row becomes one slice of one activity — `Read: E.O.Y Meeting (part 2 of 3)`
— and the AI's own session titles, focus lines and objectives are discarded along with its
grouping. That is the whole reason this file exists: **something has to write the words the
AI used to write.**

---

## ⚠ A defect in the approved question — this has to be settled before anything is built

`COURSE-SESSION-PLANNING.md` says of the fit question: *"Every figure is computed, so it can
never offer an option it cannot deliver."* **The second option cannot be delivered.**

Run against the real master export, Mike's own EOY material (E.O.Y Meeting 9 / 60 / 30 and
Working Capital Cycle 24 / 20 / 30 = 173 minutes):

| Session length | What the slicer produces |
|---|---|
| 15–20 min | **11 sessions** — 9, 20, 20, 20, 15, 15, 12, 12, 20, 15, 15 |
| 45 min (the figure the question offers) | **7 sessions** — 9, 30, 30, 30, 24, 20, 30 |
| 50–60 min | **6 sessions** — 9, 60, 30, 24, 20, 30 |

**Four sessions is unreachable at any length.** This material is six activities, and rule 4
of the approved model says activities are never mixed in one session — so six is the floor.
`fitOptions` divides 173 by 4 and reports "about 45 minutes each" without ever asking the
slicer whether that plan exists.

Left as it is, an advisor picks the second option and gets 7 sessions after being told 4.
That is the same failure the whole session-length exercise was written to stop: **a number
shown to the advisor that nothing checked.**

### D6 — how the second option should read *(needs Mike)*

**Recommendation.** Compute the second option by *actually running the slicer* rather than
dividing: find the shortest session length whose plan comes in at or under the count they
asked for, and offer the plan it produces. When their count is below the floor, say so
plainly and offer the fewest sessions the material allows.

For Mike's live case that reads:

```
The material I've picked for this comes to 2h 53m of work in total — watching,
reading and rehearsing.

That doesn't fit 4 sessions of 15–20 minutes. Each piece of work has to finish
before the next one starts, so the fewest this material can be is 6 sessions.

• Keep your session length — 15–20 minutes each, and the course becomes 11 sessions
• Keep the course as short as possible — 6 sessions, the longest about 1 hour

Which would you rather?
```

The first bullet is **unchanged** from the wording Mike approved. Only the second is
corrected, plus one sentence explaining why 4 is not on offer. **"Cover less material" is
still not an option** — proposed and rejected 2026-08-03.

**The alternative, for completeness:** allow two short activities to share a session, which
would make 4 sessions reachable. That means dropping rule 4 of the approved model, so it is
Mike's call and not a quiet fix. Not recommended — a session that is "the last 9 minutes of
one video plus the first half of a reading" is exactly the muddle the slicer exists to end.

---

## The decisions

Each has a recommendation. Approving the mockup as it stands adopts all of them; disagreeing
with any single row is easier than approving nine things separately.

### D1 — What the three activities are called

Every session row begins with the activity, so this word is read more than any other on the
screen.

| Option | How row 2 reads |
|---|---|
| **A (recommended)** | `Read: E.O.Y Meeting (part 1 of 3)` |
| B | `Reading: E.O.Y Meeting (part 1 of 3)` |
| C | `Read the template: E.O.Y Meeting (part 1 of 3)` |

**A** — `Watch` / `Read` / `Rehearse`. They are Mike's own words in the approved model, they
are instructions rather than nouns, and they are short enough that the template name stays
readable. **B** matches the existing time breakdown ("9m video · 60m reading · 30m
rehearsal") but reads as a category rather than a thing to do. **C** is clearer to a first-
time user and noisier by the eleventh row.

### D2 — How a split is numbered

**Recommendation: `(part 2 of 3)`** — the approved model already states this format
(§5). An advisor needs to know both where they are and how much is left, and `2/3` saves
five characters at the cost of a moment's decoding.

### D3 — What a revenue model row says

A revenue model has no authored split, so it is one indivisible 30-minute block rather than
watch/read/rehearse. It needs its own label.

**Recommendation: `Work through: Cafe`.** Alternatives: `Model: Cafe` (accurate, but tells
the advisor nothing to do) or `Complete: Cafe` (implies a finish line the app cannot check).

Where a model is longer than the session budget it splits like anything else —
`Work through: Cafe (part 1 of 2)`.

### D4 — The line underneath the title

Today this is the AI's `focus` sentence. A sliced session needs one that matches what the
row actually asks for. **Recommendation — written by code, one per activity:**

- Watch — *"Watch the tutorial video for this template."*
- Watch, split — *"Watch the tutorial video — part 2 of 2, picking up where you left off."*
- Read — *"Read through the template."*
- Read, split — *"Read through the template — part 2 of 3, picking up where you left off."*
- Rehearse — *"Rehearse the template with a colleague."*
- Work through (model) — *"Work through the model with your own figures."*

"Picking up where you left off" is deliberate: it is the honest description of a split
reading, and it makes clear the app is not claiming to know the document's internal
structure.

### D5 — Whether a session says what it is *for*

The AI's objectives are discarded with its grouping, so the obvious answer is "nothing" —
but there is a better source. **Every one of the 93 timed visible templates in the export
carries an authored objective**, written by the master app, e.g. for E.O.Y Meeting:

> *"How to frame the EOY meeting to act as a 'springboard' into advisory services, without
> giving away all the 'gold' advice for free."*

**Recommendation:** show that authored objective on the **first session of each template
only** — repeating it under all six E.O.Y rows would be noise — and pass it to the AI tutor
on **every** session of that template, where repetition costs nothing and helps.

This is a straight improvement on today: it is authored by the master app rather than
generated, so no session's stated purpose can be a fabrication.

### D7 — When the answer to the fit question is not clear

The advisor might reply "whatever you think" or "the second one sounds fine". The approved
model says it must not be guessed at.

**Recommendation:** read the reply in code for a clear signal one way or the other. If there
is none, re-ask **once** in plainer words — the existing CB-06 pattern used everywhere else
in this interview:

```
Sorry — which would you prefer: shorter sessions and more of them, or fewer
sessions that each run longer?
```

If the second reply is still unclear, **build the shorter-sessions plan and say so out loud**
rather than pick in silence:

```
I'll go with keeping your sessions at 15–20 minutes — that makes it 11 sessions.
Use 'Request changes' if you'd rather have fewer, longer ones.
```

### D8 — Material that has no published time

Material the export never timed cannot be placed in a timetable at all. It is already
collected by `planSessions` and must be named, never dropped in silence and never counted as
zero work. **Recommended line, under the sessions:**

```
1 resource has no published time, so it isn't timetabled: Dashboard Report.
You can still open it from the course.
```

⚠ **Open sub-question:** the second sentence is only true if a template that never became a
session is still reachable from the course screen. If Mike wants it timetabled anyway, the
only honest way is to ask him for a default allowance, exactly as the 30 minutes for revenue
models was set.

### D9 — Not blocking: does the conversation with the AI carry time?

Carried unchanged from `COURSE-SESSION-PLANNING.md`, flagged to Mike 2026-08-03 and not yet
ruled. The computed minutes cover the **material only**. A "15-minute session" that is a
9-minute video plus a conversation with the tutor is really 20+ minutes of the advisor's
evening. Nothing in this build depends on the answer; it changes only whether a fixed
allowance is added per session.

---

## The worked example, as it would read on screen

Mike's live EOY material at 15–20 minutes. Every figure below is produced by the code that
exists today; nothing is illustrative.

| # | Title | Time |
|---|---|---|
| 1 | Watch: E.O.Y Meeting | 9m |
| 2 | Read: E.O.Y Meeting (part 1 of 3) | 20m |
| 3 | Read: E.O.Y Meeting (part 2 of 3) | 20m |
| 4 | Read: E.O.Y Meeting (part 3 of 3) | 20m |
| 5 | Rehearse: E.O.Y Meeting (part 1 of 2) | 15m |
| 6 | Rehearse: E.O.Y Meeting (part 2 of 2) | 15m |
| 7 | Watch: Working Capital Cycle (part 1 of 2) | 12m |
| 8 | Watch: Working Capital Cycle (part 2 of 2) | 12m |
| 9 | Read: Working Capital Cycle | 20m |
| 10 | Rehearse: Working Capital Cycle (part 1 of 2) | 15m |
| 11 | Rehearse: Working Capital Cycle (part 2 of 2) | 15m |

**Total 2h 53m** — the same total at every session length, because the work never changes;
only the cutting does.

---

## What gets built once this is ruled on

Recorded here so the build can be checked against it afterwards.

1. **The fit question** joins the design interview as its own state. ⚠ It must not collide
   with the outline-revision flow, which today treats *any* message arriving while an
   outline is pending as a request to rewrite the course.
2. **`planSessions` replaces the AI's grouping** in `courseEngine.js`, and the sliced
   sessions carry the titles, focus lines and objectives ruled on above.
3. **The outline card renders them**, and the session-delivery prompt is told the activity,
   the template and the part — so the tutor knows it is running part 2 of 3 of a reading.
4. **Tests**: the fit question's routing, the unclear-answer path, and the wording of every
   generated title — the last of these is what a future session would otherwise drift from.
