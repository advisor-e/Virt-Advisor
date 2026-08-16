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

### Learn mode was "built and working" and was masking a gap · 2026-06-23

True for the original coaching trees — but seven "Get the Job" advisor-development trees, a
second schema imported seven weeks earlier, were **loaded but reached no consumer** and had been
mis-counted as empty. Now wired, and gated so they can never leak into a client session.

**The transferable part: "built and working" was accurate about the part that was looked at.**
Coverage claims need to name what they cover.

### The invisible swap gained a reverse · 2026-06-23

When an advisor in Learn mode describes a live client situation, the Learn prompt now names the
cross-over transparently and offers to expand in place — rather than bouncing them into the
client tool and losing their context.

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

Read 2026-08-13. **Left in place** — records of their own date:

- `virt-advisor-system-design.md` (v2.0, 2026-06-04) calls itself *"Authoritative. Supersedes all
  prior design documents"* and its §13b build-status table is now well out of date — it predates
  the tier cascade, the merged Collaborate app, the report models and the mentor authoring
  surface. **Its pipeline design is still the best account of the engine; its build status is
  not.**
- The same document says `templates.json` holds **278** templates. It holds **291** records.
- Its §11.3 says Advisory Distinctions is *"Designed 2026-06-04. Not yet built."* It has been
  built, cascaded and given a mentor authoring screen since — see
  [`advisory-distinctions-history.md`](advisory-distinctions-history.md).
- It lists two numbered principles as "5" and two as "6", and its §11.1 describes Firm Manager
  auth as reading role from `localStorage`, which the JWT work superseded.

**None of this is a criticism of the document.** It is the single best explanation of how the
engine reasons, and it was accurate when written. It is listed here because a coder reading it
cold would take its build status as current.

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
