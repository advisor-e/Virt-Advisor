# Model Classification — Education vs Decision Tool vs Report

> **Settled with the owner, 2026-07-13.** This is the frame that everything downstream hangs
> off: what data a model needs, whether privacy protection applies, whether it may carry the
> "Illustrative" badge, and how hard its maths must be tested.
>
> **Why this document exists.** The build was heading toward treating all models as *reports*
> that a client's accounts get fed into. The owner stopped it: the Working Capital Cycle,
> Debtor Drag and Margin/Mark-up/Break-even models are **not reports — they are teaching
> tools**. The evidence agreed: an inventory of their inputs
> ([`REPORT-DATA-MODEL.md`](REPORT-DATA-MODEL.md) §2) found ~⅔ of the figures they need do not
> exist in any accounting export, because they are pricing and operational assumptions, not
> accounting outputs. That is not an intake problem to solve — it is the signature of a model
> that was never meant to be fed by a ledger.

---

## 1. The three classes

| | **Education** | **Decision tool** | **Report** |
| --- | --- | --- | --- |
| **Purpose** | Make a concept land. The advisor moves a variable so the client *sees* the effect | Answer a specific question the client will act on | Tell the client where their business actually stands |
| **Whose numbers?** | Illustrative — chosen to teach | **The client's real numbers** | **The client's real numbers** |
| **How the data arrives** | Nothing to import — the defaults are the lesson | **Typed in** by the advisor (loan amount, rate, purchase price) | **From the accounts** — a dropped Xero export (XLSX/CSV) |
| **File intake (T10)?** | **No** | **No** | **Yes** |
| **Privacy / scrubbing (T13)?** | **No** — no client data ever enters it | **YES** | **YES** |
| **"Illustrative" badge?** | **Yes — required** | **Never** | **Never** |
| **Accuracy bar** | The concept must be honest; exact figures are not claims | **Highest** — someone may sign a loan on the output | **Highest** — it purports to describe a real business |

### The rule that matters most

**Privacy is triggered by _real client numbers_, not by a file upload.**

This corrects the assumption in the first draft of `REPORT-DATA-MODEL.md`, which took "no file
dropped" to mean "no client data, so no exposure". That is wrong. A client's loan balances,
property values and retirement position are sensitive whether they arrive by upload or by
keyboard. **Decision tools import nothing and still handle sensitive personal data.**

So the T13 anonymisation boundary applies to **Decision tools and Reports alike**: if the AI
writes narrative over the client's real numbers, identity is scrubbed first, the AI sees
figures only, and the finished output is re-personalised locally. Education models are the only
class exempt — and only because nothing real ever goes into them.

### The trap to avoid: "quietly both"

A model must not serve as a teaching aid one minute and be mistaken for the client's real
position the next. That is exactly how an illustrative number ends up in front of a client as
if it were fact. Every model gets **one** class. Where a model genuinely has two uses, it is
split into two models, or it must know which mode it is in and say so on screen — it is never
left ambiguous.

---

## 2. The 19 catalogued models

Owner-classified 2026-07-13. ✅ = built and live today.

### Education (5) — illustrative numbers, no client data, no privacy exposure

| Model | Note |
| --- | --- |
| **Working Capital Cycle** ✅ | Owner-confirmed. 6 of its 12 inputs are pricing/operational assumptions no ledger holds |
| **Debtor Business Drag** ✅ | Owner-confirmed. Its premise is the *alternative* collection profile — a what-if, not a fact |
| **Margin · Mark-up · Break-even** ✅ | Owner-confirmed. Needs unit price and unit cost — product facts, not accounting outputs |
| **Break-Even** | Same shape — teaches the concept |
| **8 Levers Model** | Teaches which lever moves profit first |

**All three built models are Education.** They are correctly badged *Illustrative* today, and
they need **no file intake and no scrubbing** — a large part of the previously-planned work
simply does not apply to them.

### Decision tool (5) — real client numbers, typed in, no file intake, privacy applies

| Model | Note |
| --- | --- |
| **The Loan Estimator** | Real loan amount and rate, entered — someone may sign on the answer |
| **Lease vs Buy** | A real funding choice on real terms |
| **Multiple Property Assessment** | Compares real investments the advisor enters |
| **Cost of Capital (WACC)** | Owner call: real debt/equity/rates entered, not read from the balance sheet |
| **Retirement Review** | Owner call: the owner's real position, entered. **Sensitive personal data**, though not from the business accounts |

### Report (9) — real client numbers from the accounts, needs file intake + privacy

| Model | Note |
| --- | --- |
| **Dashboard Reports** | "From your accounting data" |
| **Sales Dashboard** | Real sales mix and trends |
| **3-Way Forecast Filter** | Projections off the real P&L, balance sheet and cash flow |
| **Quick Position** | "Where the business stands right now" — only true on real figures |
| **High-Level Budget** | Actuals and variances |
| **Mid-Level Budget** | Actuals and monthly tracking |
| **Volatility Report** | Variance analysis on real figures |
| **EBITDA & Discounted Cash Flow** | Owner call: a valuation shown to an owner must be real |
| **Stock Purchasing (Growth Pro)** | Owner call: reorder points are only actionable on real stock data |

---

## 3. What this changes

1. **T3 / T10 / T13 are re-scoped.** [`REPORT-DATA-MODEL.md`](REPORT-DATA-MODEL.md) was written
   as though the three built models needed file intake. They do not. That document now applies
   to the **Report class only** — none of which is built yet. Its figure inventory stays valid
   and becomes the *evidence* for the Education classification.
2. **The privacy trigger is corrected** — real client numbers, not file upload (see §1).
   Decision tools were previously assumed exempt; they are not.
3. **T22's catalogue fingerprint needs a `class` field**, alongside inputs/outputs/industry.
4. **The Model Library should show the class on each card**, so an advisor picking from 19
   knows whether they are opening a teaching aid, a decision tool, or a client report — *before*
   they open it. (Proposed build change; not yet approved.)
5. **The testing bar differs by class.** A Decision tool's maths may be signed on; an
   Education model's job is to be conceptually honest. Both matter — they are not the same bar.
6. **Nothing that is built needs to change.** All three live models are Education, are badged
   correctly, and behave correctly. This classification affects what we build *next*.
