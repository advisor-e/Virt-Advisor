# Case Reviews — the History

> **Read [`case-reviews.md`](case-reviews.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. Why the origin is a path, not a label

Ruled 2026-08-11: **every cross-firm row carries its origin.**

The reasoning is one sentence — *a report that shows something is wrong without showing where is
an alarm with no address* — and it follows directly from what the whole roll-up is for. The users
of this product are learning on the job; the reports exist so somebody can **offer help**. A
report that says "something is failing somewhere" cannot be acted on.

**The origin is ordered deliberately**: the level immediately below the viewer first, the firm
last. Element zero is what the screen groups by; the remainder is the address inside that group.
It was built for this screen, and it is the shape any later cross-firm report should reuse rather
than reinvent.

---

## 2. The confusion this had to survive twice

**Naming a firm to the manager above it is not a disclosure.** The distinction: an outside party
seeing a customer's staff is not a customer's own senior person looking at their own
organisation — and **what stays hidden in either case is the adviser and the client.** The full
telling, including the tab matrix the same confusion once broke, is in
[`tier-cascade-history.md`](tier-cascade-history.md) §2.

---

## 3. Why the anonymised copy is written once

It is written **at the moment of approval** and stored, rather than re-derived every time
somebody reads it.

That is a deliberate durability decision: if anonymisation were applied on read, a later change to
the anonymiser would silently rewrite what had already been shared and reviewed. Writing it once
means what a manager approved is what is seen.

---

## 4. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Does the raw case text travel? | **Never.** The anonymised copy only. | 2026-06-19 |
| One consent or two? | **Two, with two owners** — advisor, then firm manager. | 2026-06-19 |
| Does the report roll up? | **Yes** — mentor and both middle tiers. | 2026-08-10 |
| Do rows name their firm? | **Yes.** Not a disclosure. | 2026-08-11 |
| Filter personal fields or throw? | **Throw.** | locked |

---

## 5. What is honestly unfinished

**The loop does not close yet.** Reviewing cases is built; turning what is learned into a
suggested distinction — the designed step that makes this an improvement engine rather than a
reading exercise — is **not built**. It is recorded as the destination so it is not lost.

**And nothing here has run on real data**, because the case table has never been provisioned.

---

## 6. Where the raw material is

**The artefact:** `design/mockups/case-origin.html` — **keep on file.**

**Permanent companions:**
[`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §4.3–4.4 (the limits, and the
mistake that section exists to prevent) ·
[`../WORDING-CASE-SHARE-CASCADE.md`](../WORDING-CASE-SHARE-CASCADE.md) (approved wording) ·
[`../TIER-CASCADE-MAP.md`](../TIER-CASCADE-MAP.md) §3.1 ·
[`../virt-advisor-system-design.md`](../virt-advisor-system-design.md) §14 (why real sessions,
not pre-emptive patches, are the improvement engine).
