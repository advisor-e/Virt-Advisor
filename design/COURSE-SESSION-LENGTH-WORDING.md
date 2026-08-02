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
| Mismatch notice | `You asked for {n}-minute sessions — {sessions}. {advice}` | `lengthNoticeText`, `lengthNoticeAdvice`, class `.outline-count-notice` |

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

## Not verified by eye

Component tests
([`courseSessionLength.component.test.js`](../tests/unit/courseSessionLength.component.test.js))
pin that the right words render from the right numbers. **No test can see the card.** Per the
Working Agreement, this is not verified until someone builds a course and looks at:

- the outline card before starting a course (times, breakdown, total, notice)
- the course overview (per-session times, total beside the progress text)
