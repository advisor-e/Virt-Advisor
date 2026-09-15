# The Advisory Engine — the History

> **Read [`advisory-engine.md`](advisory-engine.md) first.** That page is the rules. This page
> is why they exist. Nothing here is a current instruction. If this page and the Brief disagree,
> **the Brief wins**.

---

## 1. The north star this was built toward

**Virt Advisor is a platform a firm makes its own.** The shared base makes it useful on day one;
what a firm pays for is pouring its own advisory knowledge in and having it reach its advisors
automatically, without writing code. Four commitments were set at the outset:

1. **A firm can add its own IP and steer what its advisors are shown** — through plain-English
   editing screens, never code.
2. **A firm controls its own template library** — it shapes the content upstream and uploads it.
3. **A firm's team finds its stuff effortlessly** — everything surfaces through one conversation,
   with no folder-hunting.
4. **Real client work continuously sharpens the firm's system** — case studies feed back into
   distinctions and selection.

The test for any unclear design decision: *does this make it easier for a firm to add its IP,
control its library, get it to its team, and learn from its own client work?*

---

## 2. The reversals, and why each happened

### Hard exclusions removed — they failed silently · 2026-06-04

The resolver used hard gates to keep "unsuitable" templates out: engagement-type gates, domain
sub-section blocks. The effect was that **the best template for a situation was excluded without
the advisor knowing it existed**, and a worse one was recommended instead.

Replaced by soft preferences, the two-card output, and one remaining hard block — the staircase
ceiling, kept because it protects advisor capability rather than system tidiness. → Brief
**P5**, **P6**.

The message shown when nothing in-range exists — *"This client may need a more experienced
advisor or a specialist referral before a structured advisory engagement can begin"* — **is a
feature, not a failure.** It tells the advisor the truth about the match between the situation
and their current capability.

### The keyword-only constraint was lifted, deliberately · 2026-06-25

Domain detection was purely literal keyword matching, and literal matching is brittle to
wording. A live café-liquidation session was mis-routed because the advisor wrote *"gone to
liquidation"* and *"shut their business down"*, matching none of the literal triggers
(*"facing liquidation"*, *"shutting down"*).

The fix was **not** to add more keywords — that is precisely the pre-emptive patching the
design principles reject. It was a confidence gate with an AI backstop, verified against 50
cross-domain cases at 90% reachability. This is the conscious, documented lifting of a former
constraint, and it kept the boundary intact: the AI still cannot invent a domain or pick a
template. → Brief **P3**.

### A prompt rule written four times, enforced none · 2026-09-16 (item 7.7)

Asked about wages, the AI answered **Best match — Wages/Salary Review**, with that model's own
summary beneath it. `Wages/Salary Review` is a calculator page in this app (`/wages-review`); the
library holds `Wages Review`. One word apart, and a different kind of thing. The advisor goes to
Advisor-e for a document that is not there and finds out in front of their client.

**`discover.txt` already forbade exactly this, three times — lines 33, 38 and 92 — and the
model-list instruction a fourth.** The answer was not another sentence. Item 7.6, filed the same
day, had just proved that rewording this prompt does not move the behaviour it aims at.

Two facts settled the shape of the fix:

- **Our 19 calculators are not in the master library at all**, so "is this name a template?" is
  answerable with certainty from the shipped data. The doc/slide/sheet type is not available to
  help: all 24 fields of `search_content_20260820053246.json` were checked and none carries it —
  `status` is `"--"` on all 291 rows. If it ever arrives it would sharpen the *other* half of this
  family (Working Capital Cycle and Quick Position, where a calculator and a document genuinely
  share one name, handled by item 4.33's route test in `videoInjector`).
- **Discover mode does not stream.** The main path buffers the whole reply and emits it in ONE
  delta at `finish_reason`, so nothing is on the advisor's screen when the check runs. Unlike the
  fabrication watch — which must correct itself in public because Phase 3 really does stream — a
  wrong answer here can simply not be sent. → Brief **P2**.

**Running it taught two things the 11,155-test suite could not**, which is now three days in a row:
the AI mislabels a **second** calculator the same way (`High-Level Budget`), so a hardcoded pair
would have been wrong by the end of the first day; and the first version of the correction made
one answer **worse** — told it could not use the calculator, the AI reached for a weak template
instead of saying nothing fitted. The correction now carries STEP 1's honest no-match with it.

Six live conversations, four trips, four corrections, none reaching an advisor. The note for the
twice-ignored case is Mike's approved wording and is pinned by a test beside the data it protects.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| May the AI select or rank templates? | **No.** Code owns selection, permanently. | locked |
| May the AI classify the domain? | **Only as a backstop**, boxed to the existing 14, logged. | 2026-06-25 |
| Hard exclusions or transparency? | **Transparency** — two cards, one flagged. | 2026-06-04 |
| Do domain-support files pick templates? | **No.** They brief the AI only. | ruling §0.6 |
| Is a mis-routed session fixed with more keywords? | **No.** Real sessions and captured corrections are the improvement engine. | principle 3 |
| Do trees emit signals or names? | **Signals is the intent.** The build emits names; the intent is not to be re-specified downward. | design intent |

---

## 4. Where the earlier record is wrong

`virt-advisor-system-design.md` is still the single best account of how the engine reasons, but
its build-status table, template count and "not yet built" entries are stale — it is left in
place as a record of its own date. **Read it for the pipeline design, never for build status.**

---

## 5. Where the raw material is

**Permanent companions:** [`../virt-advisor-system-design.md`](../virt-advisor-system-design.md)
(the full pipeline, stage by stage — read it for the *how*, not the *status*) ·
[`../CONTENT-ROUTING.md`](../CONTENT-ROUTING.md) (**generated** — `npm run routing`) ·
[`../virt-advisor-registry.md`](../virt-advisor-registry.md) ·
[`../ENGINE-DEFECTS-2026-07-14-HANDOVER.md`](../ENGINE-DEFECTS-2026-07-14-HANDOVER.md) ·
[`../SCENARIO-LAB-REPORT.md`](../SCENARIO-LAB-REPORT.md) (the 50-case cross-domain verification)
· [`../TREE-PDF-FIDELITY-SWEEP-2026-06-23.md`](../TREE-PDF-FIDELITY-SWEEP-2026-06-23.md) ·
[`../TREE-RECOMMENDATION-REVIEW.md`](../TREE-RECOMMENDATION-REVIEW.md) ·
[`../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`](../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md).

**The skill:** `add-a-domain` — the working recipe for adding or configuring a domain, covering
the companion files and the code that hardcodes domain lists.
