# Logic-Lab Report — the History

> **Read [`logic-lab-report.md`](logic-lab-report.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. The sentence the screen was built around

From the approved artefact:

> *"Counting configuration tells you WHAT FIRMS HAVE. A pushed edit tells you WHAT A FIRM WAS
> TRYING TO ACHIEVE and what they had to do to get there."*

That is why the feed leads and the counts support it. A screen that opens on totals tells you how
much configuration exists, which nobody needs to know. A screen that opens on what firms
*changed* tells you which of your defaults is wrong.

**One firm pushing a fix is that firm's preference. Several firms pushing the same fix is a
default that needed fixing.**

---

## 2. Why the privacy line is not incidental

This is the **second** cross-firm read in the app, and the pair of them establish the pattern:
the boundary is enforced **in code**, by a guard that **throws** on a personal field rather than
filtering it out.

A silent filter would keep working after the payload shape changed — which is exactly the class
of failure this codebase has been bitten by repeatedly: something that renders confidently, is
believed, and is wrong. Throwing makes the day of the change loud.

**Related, and ruled a week later:** every cross-firm row carries its **origin as a path**,
because a report that shows something is wrong without showing where is an alarm with no address.
Naming a firm to the manager above it is not a disclosure; the adviser and the client are what
stay hidden.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Feed or counts first? | **The feed.** Counts are supporting material. | 2026-08-04 |
| Does it show people? | **Never.** Configuration only, enforced by a throwing guard. | locked |
| Does it roll up the tiers? | **Yes** — mentor and both middle tiers, each reading the level below. | 2026-08-10 |
| Do rows name their firm? | **Yes** — not a disclosure. | 2026-08-11 |

The owner's response to the artefact — *"i love it, it looks great"* — approved the shape on
2026-08-04.

---

## 4. Where the raw material is

**The artefact:** `design/mockups/mentor-logic-lab-report-mockup.html` — **keep on file.**

**In-code:** the header block of `server/utils/mentorLogicLabReport.js` states why the feed is
the page and why the privacy line is enforced the way it is.

**Permanent companions:** [`../MENTOR-AI-HUB-STUB.md`](../MENTOR-AI-HUB-STUB.md) (the Mentor Hub
is the Firm Manager Hub re-scoped, plus this one addition) ·
[`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §4.2–4.3 ·
[`../TIER-CASCADE-MAP.md`](../TIER-CASCADE-MAP.md) §3.
