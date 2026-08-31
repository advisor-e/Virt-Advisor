# Template Check — the Brief

> **A Mentor Hub tab, and the one report that does not roll up.** Current rules only; the history
> is in [`template-check-history.md`](template-check-history.md).
>
> ⚠ **The queue itself is PARKED** — the owner's ruling, 2026-08-13: sort it after UAT testing.
> Do not re-raise it as open work.
>
> **Covers:** the accuracy check between the shared catalogue and the decision tables, and how a
> ruling on a row is remembered. **Does not cover:** the tables themselves
> ([`logic-tables.md`](logic-tables.md)).

---

## 1. Design philosophy

**It exists to improve the system, not to assess anybody.**

The decision tables name tools. The catalogue publishes tools. The two can disagree — a table can
name something the catalogue has never published under that title, or under a slightly different
one. This screen surfaces every one of those and asks the owner to say which it is: *this name
means that template*, or *this was never a document.*

**A ruling has to survive a page reload, or the screen raises the same false alarms every time it
is opened and stops being trusted.** That is the whole reason rulings are stored rather than held
in the page — and the approved design says it in as many words: *a dismissal is remembered and
can always be undone.*

**It is the one named exception to "every report rolls up", and the exception is principled.** It
has no firm dimension at all — it scans the shared catalogue against the shared tables, so there
is nothing in it belonging to a group that could be shown to that group.

---

## 2. Key principles — the non-negotiables

**P1 · Mentor only.** Narrowed by the owner himself, in the same breath as approving the roll-up
of the other reports: *"we use it to improve the overall system. it does not relate to
people/advisor performance or group manager selection/access permission to templates."*

**P2 · Its routes keep the mentor-role guard**, rather than the managing-tier guard the other
reports moved to. That is deliberate, not an oversight.

**P3 · A ruling is remembered, and can always be undone.** Both halves matter — an unrememberable
dismissal makes the screen useless, and an irreversible one makes it dangerous.

**P4 · Rulings ride the shared mentor overlay scope**, under their own key, so they inherit
version history and one-click restore with no new table and cannot collide with any real firm's
rows.

**P5 · The catalogue export is read-only.** This screen reports disagreements; it never edits the
master content.

**P6 · A name a table declares but the catalogue has not published is not necessarily an error.**
It may be a faithful transcription waiting for the catalogue to catch up. That is exactly the
judgement this screen exists to collect.

---

## 3. Design considerations

**The number of tabs it changes.** Because Template Check is mentor-only, each middle-tier hub
has **twelve** tabs rather than the thirteen first drawn.

**This was the first evidence the mentor-overlay pattern generalises.** It is the same mechanism
as the mentor's distinctions, applied to a second kind of mentor-authored content — which is what
suggested it would carry the rest of the cascade too.

**Three documents hold the queue itself** — what has already been answered, what remains, and the
last few. They are working documents for the ruling session, not specifications, and they are
parked.

---

## 4. For the coder

| Piece | Path |
|---|---|
| Ruling storage | `server/utils/templateCheckRulings.js` |
| Overlay store | `server/utils/firmOverlay.js`, mentor scope |
| Route guard | mentor-role, wired in `server/restify-server.js` |
| Tab gating | `TAB_TIERS` in `components/FirmManagerHub.vue` — `templateCheck: ['mentor']` |
| The queue | `design/TEMPLATE-CHECK-ALREADY-ANSWERED.md`, `-REMAINING-58.md`, `-THE-LAST-12.md` |

**Traps.** Do not "fix" the guard to match the other reports — the exception is deliberate and
documented in the code. And the mentor scope still needs its reserved row seeded before a ruling
can land in the database.

**Known state.** Runs on the development file fallback. The queue is parked until after UAT.

---

## 5. Related briefs

[`logic-tables.md`](logic-tables.md) — the tables it checks ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the pattern it reuses ·
[`tier-cascade.md`](tier-cascade.md) — and the one exception to its main rule ·
[`firm-manager-hub.md`](firm-manager-hub.md).

**History:** [`template-check-history.md`](template-check-history.md)
