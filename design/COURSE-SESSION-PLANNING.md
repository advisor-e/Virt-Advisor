# Course session planning — how a course is cut into sessions

**Approved by Mike, 2026-08-03**, in the conversation that followed his two live tests.
Committed **before** the build, per [Save the Artefact](../CLAUDE.md). Nothing below has
been built yet.

---

## The model Mike set

> *"i ask for 15 -20 mins and ask for 4 sessions — the video is 12mins long — that is
> session 1. session 2 and 3 can be reading the template — session 4 and 5 can be two lots
> of rehearsing — the course doesnt have to stick the video, template read and rehearsal
> into 1 session"*

**A session is a time-boxed slice of ONE activity, and an activity may span several
sessions.** It is not one template.

**Why it had to change.** One template = one session cannot honour a short request: only
**10 of the 93** timed visible templates fit inside 20 minutes as a whole, and the median
template is **59 minutes**. Told "fit 15–20 minutes", the AI would have been pushed toward
the handful of short templates regardless of whether they suited the goal. At activity
level **148 of 242 activities (61%)** fit inside 20 minutes, and **77 of 83 videos** do.

**Why no fabrication is involved.** Splitting a 60-minute reading across three sessions
does not mean inventing page divisions — the advisor reads for their twenty minutes and
picks up where they left off. Nothing claims to know the document's internal structure.

**Mike's reason, in his words:** *"the key thing is to stick closer to the session times as
this represents the 'head space' of the advisor. If they dont have 30 mins and tell you
15 - 20 and you ignore it, they will likely not start the course."*

## What this replaces

The planned **Phase 2** — handing the AI a time budget in the design prompt and hoping it
complied — is **abandoned**. Under this model the AI never does the arithmetic:

- **The AI chooses** the material and its order.
- **Code slices** it into sessions and does every calculation.

Same division as the resource grounding and the session-count check: the AI picks, code
counts.

## Slicing rules

1. Walk the chosen templates in the AI's order; within each, **watch → read → rehearse**.
2. An activity longer than the session budget splits into **even** parts —
   `parts = ceil(minutes / max)` — so no session is left a stub. A 60-minute reading at
   20 minutes is 3 × 20, never 20 + 20 + 20 + 0, and a 30-minute rehearsal at 20 is 2 × 15,
   not 20 + 10.
3. **A natural boundary is allowed to run short.** A 12-minute video is a 12-minute session;
   it is never padded to reach the floor, and never merged with the next activity.
4. Activities are **not mixed** within one session.
5. Part numbering is stated on screen — `Read: E.O.Y Meeting (part 2 of 3)`.

### Worked example — the two timed templates from Mike's live EOY course

The same material re-slices at any length. The work never changes; only the cutting does.

| Session length asked for | Sessions | Total |
|---|---|---|
| 15–20 min | 11 | 2h 53m |
| 25–30 min | 7 | 2h 53m |
| 50–60 min | 6 | 2h 53m |

```
E.O.Y Meeting + Working Capital Cycle @ 15-20 min
   1.   9m  Watch: E.O.Y Meeting
   2.  20m  Read: E.O.Y Meeting (part 1 of 3)
   3.  20m  Read: E.O.Y Meeting (part 2 of 3)
   4.  20m  Read: E.O.Y Meeting (part 3 of 3)
   5.  15m  Rehearse: E.O.Y Meeting (part 1 of 2)
   6.  15m  Rehearse: E.O.Y Meeting (part 2 of 2)
   7.  12m  Watch: Working Capital Cycle (part 1 of 2)
   8.  12m  Watch: Working Capital Cycle (part 2 of 2)
   9.  20m  Read: Working Capital Cycle
  10.  15m  Rehearse: Working Capital Cycle (part 1 of 2)
  11.  15m  Rehearse: Working Capital Cycle (part 2 of 2)
```

---

## When it does not fit — the app ASKS, it never decides

**Mike's ruling, verbatim (2026-08-03):** *"no - go back and tell th advisor what you find
and ask them - would they prefer to increase the time per session or number of sessions to
fit"*

He asked for 4 sessions of 15–20 minutes; the material is 11 sessions at that length. Both
numbers cannot hold. **The advisor chooses which gives — not the app, and not the AI.**

### The approved wording

Shown before any outline appears. Every figure is computed, so it can never offer an option
it cannot deliver.

```
The material I've picked for this comes to 2h 53m of work in total — watching,
reading and rehearsing.

That doesn't fit 4 sessions of 15–20 minutes, so one of the two needs to give:

• Keep your session length — 15–20 minutes each, and the course becomes 11 sessions
• Keep your 4 sessions — and each one runs about 45 minutes

Which would you rather?
```

Mike's verdict: *"yes, that reads great"*.

### Deliberately NOT offered

**"Cover less material"** is not one of the options. It was proposed and Mike **rejected**
it. Do not reintroduce it as a third choice.

---

## Settled while building — nothing here is open

All three were built and ruled on 2026-08-03. The record of what was decided, and the
screen it produced: [`COURSE-SLICED-SESSION-WORDING.md`](COURSE-SLICED-SESSION-WORDING.md)
and [`mockups/sliced-course-outline.html`](mockups/sliced-course-outline.html).

- ✅ **An unparseable answer to the fit question.** Settled twice over: the two options are a
  **drop-tab**, so a typed answer is the exception rather than the rule. Where one does
  arrive it is read narrowly, re-asked once in plainer words, and — if still unclear — the
  shorter-sessions plan is built and **said out loud** rather than picked in silence.
- ✅ **Whether the conversation with the AI carries a time allowance. MIKE RULED 2026-08-03:
  IT DOES NOT.** *"session times do not include conversation with ai"*. A session's minutes
  are the MATERIAL only — video, reading and rehearsal — which is what the code already did,
  so the ruling confirms the behaviour rather than changing it. **Do not add a per-session
  conversation allowance, and do not re-open this.**
- ✅ **Session titles and objectives.** A sliced session is named by code from its activity
  and template (`Read: E.O.Y Meeting (part 2 of 3)`), and states its purpose using the master
  export's own authored `cpd.objective` — never a generated one.
