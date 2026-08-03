# Sliced course sessions — the wording

**Status: BUILT 2026-08-03**, on Mike's instruction to finish the slicer ("fix everything …
make sure you don't delete options or ignore plans that have been agreed"). The
recommendation under each decision below is what now ships; nothing was dropped, and every
place a recommendation was changed after the first draft says so.

The screen is [`mockups/sliced-course-outline.html`](mockups/sliced-course-outline.html) —
open that first; this file is the reasoning behind it. Any later change to the wording
changes **both files and the code together**, or the three stop agreeing.

> **⚠ One correction to the first draft of this file.** It showed the two options as text the
> advisor had to answer by typing. They are a **drop-tab** — the advisor picks. Mike said he
> had asked for this before; there is no written trace of that request anywhere in the repo,
> which is a failure of the record, not of his memory. It is also what this app's own rule
> already required: [`virt-advisor-system-design.md`](virt-advisor-system-design.md) puts a
> choice between defined options on a constrained selector, "no interpretation needed", and
> names Session Length as one of them.

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

### D6 — how the second option reads *(built)*

Both options are now computed by *actually running the slicer* rather than dividing:
`planForCount` sweeps every session length in five-minute steps and returns the plan closest
to the count the advisor asked for, along with the length that builds it. When their count is
below the floor, the app says so plainly and offers the fewest sessions the material allows.

Each option carries the length that rebuilds it, so answering re-slices at a length already
proven to produce the plan named on the label — **the figures on screen and the course the
advisor gets cannot disagree.**

For Mike's live case that reads:

```
The material I've picked for this comes to 2h 53m of work in total — watching,
reading and rehearsing.

That doesn't fit 4 sessions of 15–20 minutes. Each piece of work has to finish
before the next one starts, so the fewest this material can be is 6 sessions.

Which would you rather?
```

…followed by the **drop-tab**, holding the two options and nothing else:

```text
[ Choose one…                                                            ▾ ]
  Keep your session length — 15–20 minutes each, and the course becomes 11 sessions
  Keep the course as short as possible — 6 sessions, the longest 1 hour

                                                          [ Build my course → ]
```

The first option is **unchanged** from the wording Mike approved. Only the second is
corrected, plus one sentence explaining why 4 is not on offer. **"Cover less material" is
still not an option** — proposed and rejected 2026-08-03. Nothing is preselected: a
preselected answer is the app choosing for the advisor.

**Where the count they asked for CAN be built** the second option is their own number:
*"Keep your 7 sessions — each one up to 30 minutes"*, and the "fewest this material can be"
sentence does not appear.

### Corrected again, after Mike's second live test (2026-08-03)

He asked for *"15 to 20 minutes sessions and maybe between four and six sessions"* on the
Dashboard Discussions material. Three things were wrong, all now fixed and pinned:

1. **The count is a RANGE, and a plan inside it is a fit.** His course came out at four
   sessions — inside the four-to-six he asked for — and he was still made to choose. "between
   four and six" was read as a flat request for six, because `and` was not a range separator.
   The count parser now returns a budget `{min, max}` exactly as the duration parser does, and
   no question is asked when the plan lands inside it. *This is the same premise-check that
   duration needed a day earlier: a range is a budget, not a shrug.*
2. **The search stepped in five-minute jumps and missed the answer.** That material makes
   exactly six sessions at a 14-minute length; the sweep went 15 → 10 and offered **seven**
   when six existed. It now tries every whole minute.
3. **The second option's wording assumed the alternative was always a SHORTER course.** Beside
   an option of four sessions it announced *"the fewest this material can be is 7 sessions"*
   and labelled seven sessions *"as short as possible"*. The wording now follows the direction
   the plan actually missed in:

| The plan has… | Their count reachable | The second option reads |
|---|---|---|
| too many sessions | yes | Keep your 6 sessions — each one up to 1 hour |
| too many sessions | no | Keep the course as short as possible — 6 sessions, the longest 1 hour |
| too few sessions | yes | Keep your 6 sessions — each one up to 14 minutes |
| too few sessions | no | Split it as far as it will go — 13 sessions of up to 5 minutes |

The explanatory sentence follows the same split: *"the fewest this material can be is N
sessions"* going down, *"the most it can be split into is N sessions"* going up.

**Two labels written for this screen**, neither of them from an earlier approval: the
placeholder **"Choose one…"** and the button **"Build my course →"**.

**The alternative, for completeness:** allow two short activities to share a session, which
would make 4 sessions reachable. That means dropping rule 4 of the approved model, so it is
Mike's call and not a quiet fix. Not recommended — a session that is "the last 9 minutes of
one video plus the first half of a reading" is exactly the muddle the slicer exists to end.

---

## The decisions

Each says what was built and why, with the alternatives that were considered kept beside it —
so a later session can see what was weighed rather than only what won.

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

**The drop-tab removes this problem rather than handling it** — an advisor who picks cannot be
unclear. What follows is the fallback for one who types anyway.

The reply is read in code for a clear signal one way or the other, deliberately narrowly:
"keep the length", "shorter sessions", "fewer sessions", "the second one". Anything else —
including "keep the length but fewer sessions" — is treated as unclear. A wrong guess builds
the wrong course silently, which is worse than asking again. It is then re-asked **once**, the
CB-06 pattern used everywhere else in this interview:

```text
Sorry — I couldn't tell which of those you'd prefer. Pick one from the list
above and I'll build it.
```

If the second reply is still unclear, it **builds the shorter-sessions plan and says so out
loud** rather than picking in silence:

```text
I'll go with keeping your sessions at 15–20 minutes — that makes it 11 sessions.
Use 'Request changes' if you'd rather have fewer, longer ones.
```

**And the choice is honoured by code, never by the AI.** The material travels with the
question, so answering re-slices what the advisor was told about; the reply never becomes an
instruction to the model. This also had to be kept clear of the outline-revision flow, which
treats any message arriving with a pending outline as "rewrite the course" — the fit answer is
checked first, and pinned by a test.

### D8 — Material that has no published time

Material the export never timed cannot be placed in a timetable at all. It is already
collected by `planSessions` and must be named, never dropped in silence and never counted as
zero work. **The line under the sessions:**

```text
1 resource has no published time, so it isn't timetabled: Dashboard Report.
```

The draft of this file added *"You can still open it from the course."* **That was cut before
building, because it is not true**: a template that never became a session has no session to
be opened from. Saying it would have been a small, confident falsehood on a screen whose whole
purpose is that its figures can be trusted.

⚠ **Open for Mike, not blocking:** if he wants such material timetabled anyway, the only
honest way is a default allowance he sets, exactly as the 30 minutes for revenue models was
set. Nothing is assumed in the meantime.

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

## What was built, and where it lives

1. **The fit question** is its own state (`pendingFit`) in
   [`courseEngine.js`](../server/courseEngine.js), checked **before** the outline-revision
   flow — which treats any message arriving with a pending outline as "rewrite the course",
   and would have sent the advisor's choice to the AI as an instruction. The material travels
   with the question and is re-validated and re-grounded on the way back in; answering makes
   no AI call at all.
2. **`planSessions` replaces the AI's grouping** whenever a session length was named. With no
   length named, nothing has changed: the AI's grouping is timed and checked exactly as
   before, and the CB-26 session-count notice still applies on both paths.
3. **The wording lives in one place** — [`courseSliceCopy.js`](../server/utils/courseSliceCopy.js)
   — because a sliced outline is saved, re-read months later, copied to a teammate with a
   shared course, and used to brief the tutor. Composing the titles in the screen would leave
   the stored course with none.
4. **The outline card renders the slices**, and the session prompt is told the activity and
   the part, so the tutor teaches the twenty minutes in front of the advisor rather than the
   whole template.
5. **Tests**: `courseSliceCopy.test.js` (every generated word), `courseFitQuestion.test.js`
   (the question, both answers, the unclear path, and that the answer never reaches the AI),
   `courseSlicedOutline.component.test.js` (the drop-tab, the card, and the Request-changes
   bug), plus the corrected `fitOptions` block in `courseEffort.test.js`.

### What the length notice became

The session-length **warning** built earlier the same day is now unreachable on a sliced
course, because the slicer cannot produce a session longer than the budget. It is kept as an
**invariant guard**: if a plan ever did exceed the length asked for, that is logged as an
error and still shown. The tests that used to pin the warning now pin the stronger fact —
**the over-long session cannot be built at all** — and say so in the file, rather than being
deleted for going green.

### Also fixed in the same change

**'Request changes' destroyed the outline.** One click cleared it from the screen, and nothing
could bring it back: a course is not saved until "Start this course", and the outline JSON is
stripped out of the chat transcript. Mike lost a course this way on 2026-08-03. The button now
only moves the cursor into the message box; the card survives until a replacement arrives, and
a failed send or a reply with no course puts the old one back.
