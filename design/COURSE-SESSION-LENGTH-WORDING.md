# Course session length — the approved wording

**Approved by Mike, 2026-08-03.** Governs the session-length copy on the Course Builder
outline card and course overview, built in `f724c76`.

> ⚠ **Saved after the fact, not before — this file records its own rule breach.** The
> [Save the Artefact rule](../CLAUDE.md) requires an artefact to be a committed file
> *before* Mike approves it. These two options were rendered in chat, Mike chose one, and
> the build went ahead with nothing on disk. Written up the same day, from the options as
> shown, once the rule reached this machine in the `origin/master` merge. It is a faithful
> record, but it is not the evidence the rule asks for — the evidence would have been
> committed first. Logged here rather than quietly corrected, because the point of the
> rule is that a paraphrase replacing an original is exactly what goes unnoticed.

---

## What Mike chose: "Plain and factual"

Chosen over the alternative below because it matches the tone of the session-count notice
already on the same card, and states the times without softening them.

```
┌─ Selling Advisory Services ──────────────────┐
│ 4 sessions · Consistent depth · 5h 8m        │
├──────────────────────────────────────────────┤
│ 1  Understanding the Advisory Staircase      │
│    30m — 5m video · 15m reading ·            │
│    10m rehearsal                             │
│                                              │
│ 2  Running the E.O.Y Meeting                 │
│    1h 39m — 9m video · 60m reading ·         │
│    30m rehearsal                             │
│    1 resource has no published time          │
├──────────────────────────────────────────────┤
│ You asked for 30-minute sessions — session   │
│ 2 works out at 1h 39m. Use 'Request          │
│ changes' if you want it shorter.             │
└──────────────────────────────────────────────┘
```

## What was rejected: "Framed as the adviser's time"

Recorded so a later reader knows the choice was made, not defaulted into. Same information,
softened — *"about 5h 8m of your time"*, *"About 1h 39m — watch 9m, read 60m, rehearse 30m"*,
*"Plus 1 resource we have no time for"*, *"These sessions run longer than the 30 minutes you
asked for…"*.

---

## The exact strings, and where they are built

All in [`components/CourseBuilder.vue`](../components/CourseBuilder.vue). CourseBuilder is
not yet i18n'd — its copy is inline English, matching the file's existing convention and the
precedent of the session-count notice beside it. It moves to `locales/` with the rest of the
screen in the i18n sweep.

| What | String | Built by |
|---|---|---|
| A duration | `30m` · `1h 39m` · `1h` | `formatMinutes()` |
| Session line | `{total} — {n}m video · {n}m reading · {n}m rehearsal` | `sessionTimeLabel()`, class `.session-time` |
| Course total | `5h 8m` (a tag beside "4 sessions") | `outlineTotalLabel()`, class `.outline-tag` |
| Untimed resources | `1 resource has no published time` / `2 resources have no published time` | `sessionUnknownLabel()`, class `.session-time-unknown` |
| Mismatch notice | `You asked for {asked} sessions — {sessions}. {advice}` | `lengthNoticeAsked`, `lengthNoticeText`, `lengthNoticeAdvice`, class `.outline-count-notice` |

**`{asked}` reads back what the advisor actually said** — `30-minute` for a single figure,
`15–20 minute` for a range (en dash). ⚠ **Added 2026-08-03 after Mike's live test and NOT
yet confirmed by him** — the approved artefact only ever showed the single-figure form,
because at that point a range switched the warning off entirely (see the defect note below).
The sentence around it is unchanged; only the number slot differs.

### Rules the wording encodes

These are wording decisions, not just formatting — each one exists to stop the screen
asserting something untrue.

1. **An unknown length shows nothing at all — never `0m`.** A session whose resources carry
   no published time has no time line. Counting it as zero would tell an adviser the work is
   free.
2. **An activity carrying no time is omitted, not shown as `0m video`.**
3. **A session costed by the 30-minute revenue-model allowance shows its total alone**, with
   no breakdown — there is no authored split to report.
4. **The notice follows the direction the session actually missed.** Over-long → "shorter".
   Under-length → "longer". A course with both → "changed".

---

## Deviations from the approved artefact

Per the Save-the-Artefact rule: every difference between what was approved and what shipped
is named here, whether deliberate or not.

**One deviation, deliberate, flagged to Mike when it was built.** The approved sentence ends
*"Use 'Request changes' if you want it shorter."* Mike saw it against an over-long session,
which is the common case. A session can also come out too **short**, and telling an adviser
to shorten a 10-minute session would be nonsense, so the sentence is mirrored on the same
pattern rather than re-written: `longer` when every flagged session is under, `changed` when
a course has some of each, and `them` instead of `it` for more than one session. Mike was
told at the time and did not ask for different wording — **but he has not seen the mirrored
sentences on screen.**

Nothing else differs.

---

## The defect Mike's live test found (2026-08-03)

He answered the session-format question with **"15 to 20 minutes per session and say four
sessions please"** and drew sessions of **1h 10m, 1h 3m and 30m**. The screen showed all of
it correctly — and **said nothing at all about the overrun**.

The cause was not the display. `requestedSessionMinutes` returned `null` for a range,
switching the whole comparison off. That rule had been copied from the session-count check,
where it is right: *"6-8 sessions"* really does mean the advisor does not mind. **For a
duration it is backwards** — "15 to 20 minutes" is a limit, and it emphatically means *not
70 minutes*. The warning had disabled itself on what is probably the commonest way to answer
the question.

Fixed the same day: the parser now returns a **budget** (`{min, max}`) — a single figure is
the degenerate range `n–n` — and the ±20% latitude runs outward from each end, so 15–20
accepts 12–24. His exact sentence is pinned as a test in three places (parser, engine,
screen), replaying the real numbers.

## Not verified by eye

Component tests
([`courseSessionLength.component.test.js`](../tests/unit/courseSessionLength.component.test.js))
pin that the right words render from the right numbers. **No test can see the card.** Per the
Working Agreement, this is not verified until someone builds a course and looks at:

- the outline card before starting a course (times, breakdown, total, notice)
- the course overview (per-session times, total beside the progress text)
