# Case Studies & Clients — the History

> **Read [`cases-and-clients.md`](cases-and-clients.md) first.** That page is the rules. If the
> two disagree, **the Brief wins**.

---

## 1. Why the two-axis model exists

The storage model was settled on 2026-06-19 and the reasoning is worth keeping, because the
obvious design is one switch and the obvious design is wrong.

An advisor's case is **theirs**. It lives centrally so it follows them across devices, and they
control whether their firm sees it. That is one decision, and it belongs to them.

Whether an anonymised copy travels *above* the firm is a **different** decision, belonging to
the **firm manager**, and it exists for a different purpose: accuracy review of the system
itself, by the people who can improve it.

**Collapsing those into one control would mean an advisor's decision to help a colleague also
became a decision to publish upward.** Nobody would have made that choice; it would have been
inferred from a different one.

---

## 2. The authorisation hole that shaped every route

Cases originally lived in browser storage, and ownership came from an id the client held. That
is two faults at once: work that lives on one device is lost when the advisor changes machine,
and an identity the client supplies is an identity the client can change.

Every route now derives the advisor and the firm from the verified token, and mutations carry an
explicit ownership condition. One detail is easy to miss and deliberate: **the authenticated
advisor id is echoed back in the response**, so the screen can tell which cases are the advisor's
own without relying on a client-held value. The identity is server-derived at both ends.

---

## 3. The privacy rule that was got wrong once, in the other direction

On 2026-08-10 a tab matrix left the case reports out of both middle tiers, reasoning from a
ruling that had kept a report away from the mentor.

**That ruling was about an outside party** — Advisor-e — seeing a customer's staff. A global
group is a **brand**, so a global or group manager is the customer's own senior person looking at
their own firms. Applying an external-party boundary to internal managers inverts it.

The corollary, ruled a day later: **naming a firm to the manager above it is not a disclosure.**
Every cross-firm row carries its origin as a path, because a report that shows something is
wrong without showing where is an alarm with no address. What stays hidden is the **adviser** and
the **client**.

---

## 4. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Where do cases live? | **Centrally**, so they follow the advisor. | 2026-06-19 |
| Who decides a case is visible to the firm? | **The advisor.** | 2026-06-19 |
| Who decides it goes above the firm? | **The firm manager**, separately. Double opt-in. | 2026-06-19 |
| What does the level above see? | **The anonymised copy only** — never the raw text. | 2026-06-19 |
| Does a cross-firm row name its firm? | **Yes.** Not a disclosure; the adviser and client stay hidden. | 2026-08-11 |
| Filter personal fields, or throw? | **Throw.** A silent filter hides the day the shape changed. | locked |

---

## 5. The destination

This feature is the input to the improvement loop: real case studies reviewed, and what is
learned fed back into the distinctions and template selection that decide what advisors are
shown. The design principle behind it is explicit — **real sessions improve the system, not
pre-emptive patches.** Engineering time spent on speculative edge-case patching is misallocated;
build the capture mechanism and let real work say what needs fixing.

That loop is designed and partly built. The case-study review to suggested-distinction step is
the part still ahead.

---

## 6. Where the raw material is

**Permanent companions:**
[`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §4.3–4.4 (the sharing limits and
the mistake that section exists to prevent) ·
[`../WORDING-CASE-SHARE-CASCADE.md`](../WORDING-CASE-SHARE-CASCADE.md) (approved wording — the
artefact, not a paraphrase) ·
[`../SAVED-CLIENT-INTAKE-EXPERIENCE-PLAN.md`](../SAVED-CLIENT-INTAKE-EXPERIENCE-PLAN.md) ·
[`../virt-advisor-system-design.md`](../virt-advisor-system-design.md) §14 (the improvement
engine and why it is not pre-emptive patching).

**Artefact — keep on file:** `mockups/case-origin.html` (the origin path, and the shape any
later cross-firm report should reuse rather than reinvent).
