# Case Reviews — the Brief

> **A Mentor Hub tab, also at both middle tiers.** Current rules only; the history is in
> [`case-reviews-history.md`](case-reviews-history.md).
>
> **Covers:** the accuracy review of real client work shared upward. **Does not cover:** how a
> case is written or shared in the first place
> ([`cases-and-clients.md`](cases-and-clients.md)).

---

## 1. Design philosophy

**Real client work is the only honest evidence of whether the system is any good.**

Every other check in this app compares the code to what somebody wrote down. This one compares
the *recommendation* to what actually happened with a real client — which is the only test that
can find the failures nobody anticipated.

**It is the top of a chain that starts with two separate consents.** The advisor decides whether
their firm sees a case. The firm manager decides, separately, whether an anonymised copy travels
further. Neither can make the other's decision, and **what arrives here is the anonymised copy
written at the moment of approval — never the raw text.**

**Its purpose is accuracy, not assessment.** The question is *did the system recommend the right
thing*, never *did this advisor do well*. Those two readings of the same case look similar and
lead to completely different products.

---

## 2. Key principles — the non-negotiables

**P1 · Anonymised copy only.** The raw case text stays at the firm. What travels is the version
written on approval — not re-derived at read time, so changing the anonymiser never silently
rewrites history.

**P2 · Double opt-in, two owners.** Advisor sets visibility; manager approves the share upward.
Collapsing them into one control would publish an advisor's work on a decision they never made.

**P3 · Every row carries its origin as a path** — the level immediately below the viewer first,
the firm last. A report showing something is wrong without showing *where* is an alarm with no
address. **Naming a firm to the manager above it is not a disclosure**; the adviser and the client
are what stay hidden.

**P4 · The personal-field guard throws, it does not filter.**

**P5 · It reads the level immediately below, summarised**, at the mentor and both middle tiers.

**P6 · An empty review queue says so on screen.**

---

## 3. Design considerations

**This is the input to the improvement loop, not the end of it.** What is learned here is meant
to become better distinctions and better selection — the designed step from a reviewed case to a
suggested distinction is the destination, and it is **not built**.

**It is the third cross-firm read in the app**, and it should reuse the origin-path shape the
others established rather than inventing one.

**Accuracy review needs the recommendation, not just the outcome.** A case without what the system
suggested cannot answer the question the screen exists to ask.

---

## 4. For the coder

| Piece | Path |
|---|---|
| Case storage and share state | `server/utils/caseStore.js` |
| Anonymisation | `server/utils/anonymiseCase.js` |
| Roll-up with origin | `server/utils/caseRollup.js` — `withOrigin` |
| Origin path | `server/utils/tierChain.js` — `originPathOf` |
| Routes | `server/routes/cases.js` |
| **The artefact** | `design/mockups/case-origin.html` |

**Traps.** The origin is a **path**, ordered — element zero is what the screen groups by, and the
rest is the address inside that group. Do not flatten it. And the anonymised copy is written once,
at approval; do not switch it to re-deriving on read.

**Known state.** Runs on the development file fallback; the case table has never been provisioned.

---

## 5. Related briefs

[`cases-and-clients.md`](cases-and-clients.md) — where a case comes from ·
[`advisory-distinctions.md`](advisory-distinctions.md) — what the lessons should become ·
[`adoption.md`](adoption.md) and [`logic-lab-report.md`](logic-lab-report.md) — the other
cross-firm reads · [`tier-cascade.md`](tier-cascade.md).

**History:** [`case-reviews-history.md`](case-reviews-history.md)
