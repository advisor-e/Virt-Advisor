# Business Entity Reports — the History

> **Read [`business-entity-reports.md`](business-entity-reports.md) first.** That page is the
> rules. If the two disagree, **the Brief wins**.

---

## 1. Where this came from

**Mike, 2026-09-03, in his own words** — quoted in full at the head of the Brief. Two parts:
a stub so the feature can be *seen* at the business-entity level, and the advisor's ability to
*hide* models from a client until terms are agreed, after which the client may edit "so long
as any changes are made clear they are edited by the client". His example was the Three-Way
Forecast, then mid-build on the laptop: a client must not start one alone.

**What the investigation found before a line was written**, and what shaped the design:

- **No business-entity login existed.** `business_entity` was one of six tier names and
  nothing else — no role value from the master app, no route, no storage. It sat exactly
  where the two middle manager tiers had sat before 2026-08-11: named, fail-closed, unbuilt.
- **No report was saved anywhere.** Every Model Library screen was a stateless calculator.
  "Edit thereafter" therefore needed saved reports per client per model first — which is why
  the request became two parts, and why part 2 (item 4.62) is its own change.
- **One earlier sentence was overtaken.** `tier-cascade.md` §3 said the business entity "is a
  recipient" that "authors nothing" and gets no storage. True of the cascade's content; no
  longer true of a report's figures. Corrected in the same change, with the reason.

## 2. Decisions taken and closed — do not reopen

All six put to Mike one at a time on 2026-09-03, each ruled as recommended. They stand in the
Brief §3; this is the record of the alternatives rejected.

| # | Ruled | Rejected, and why |
|---|---|---|
| D1 | Hidden by default | *Open until hidden* — a client could start anything the advisor had not got round to hiding. |
| D2 | A greyed card that cannot open | *Not listed at all* — cleaner, but hides what the firm offers. |
| D3 | The switch on the report's header | *A toggle panel on the client record* — tidier overview, but it means leaving the report to do it, and no client record screen exists. |
| D4 | Badge + banner + Restore, all three | *Fewer* — each covers a different moment (reading a figure, opening the report, undoing a wrong edit). |
| D5 | Advisor only | *Client may hide a confusing model* — the advisor would no longer see what the client sees. |
| D6 | Inputs only | *Client may also write notes* — a second kind of client-authored content with its own badge and history, which nothing in the request asked for. |

**The screens were approved as a separate question** after the six rulings, because ruling on
what goes into an artefact is not approving it. *"yes"* — Mike, 2026-09-03.

**Three deviations from the drawing, named when the stub was built the same day** (Brief §4):
the client-record list is not built because no client record screen exists; the model is
keyed by its route because the catalogue is an ES module the Node 14 backend cannot read; and
the header control carries a client picker, because no report knew its client before.

**Part 2, slice 1 — the seam, built 2026-09-03 on the desktop.** Mike: *"saved reports work"*,
then *"yes"* to the two-slice plan and the two labels *Save for client* / *Save my changes*.
Two choices made in the building, both recorded in the Brief §5: the advisor's version is
carried forward through every client save so the `client` badge is a **comparison**, not a
per-figure stamp (twelve screens hold their figures twelve ways; a stamp would have to be
built twelve times); and the client's save is refused **in the store** against the switch
table, so a hidden-again model cannot keep being written to from a stale screen. The session
was cut short by a power failure; the commit says so and what was left undone.

## 3. Where the raw material is

The drawing: [`../mockups/business-entity-reports.html`](../mockups/business-entity-reports.html),
registered in [`../ARTEFACTS.md`](../ARTEFACTS.md). The rulings are in the Brief §3 with the
date; the two commits of 2026-09-03 (`design(business-entity-reports)` and
`feat(business-entity-reports)`) carry the rest. Part 2 is item 4.62 on
[`to-do-items.json`](to-do-items.json).
