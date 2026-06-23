# Stage 2 — Due Diligence: source-grounded assessment

> **STATUS: assessment for Mike, grounded in ALL FOUR sources (read 2026-06-23):**
> `Logic Tables/Due Diligence Logic.pdf`, `Domain Support/Due Diligence support.pdf`,
> the `due_diligence` tree in `logic_trees.json`, and `due-diligence-domain-support.json`.
> All four are **consistent and faithful** (no extraction loss). **This replaces an earlier
> draft that pre-mapped DD risk-checks to library templates — that mapping was unsourced
> and is RETRACTED** (it failed the "read the source first / never invent firm IP" rule;
> caught by Mike's probe).

## The decisive finding: DD outputs are METHODOLOGIES, not template recommendations

The DD logic (identical across the PDF "Logic Branch Table", the tree, and the domain-support
`if_then_logic`) is six IF→THEN rules. **Every THEN is an advisor action, not a template:**

| IF (trigger) | THEN (action) |
|---|---|
| High profit + multiple one-time add-backs / owner perks | Run a **Quality of Earnings** analysis (strip add-backs, re-derive EBITDA) |
| Heavy reliance on a few long-term supplier/customer contracts | Mandate a **legal review for Change-of-Control clauses** |
| Single client > 20% of revenue | Flag **deal-breaker**, initiate valuation renegotiation |
| Operations / key accounts tied to one key person | Structure an **Earn-out clause** in the SPA |
| Buyer cloud vs target legacy/paper systems | Trigger an **IT & Cyber Audit** (quantify tech debt) |
| AR ageing shows clients at 90+ days | **Recalculate daily cash-flow** requirements |

None of these surfaces a library template. The DD reference is a **coaching framework** —
Three-Pillar (Financial/Legal/Operational), the 5-Step Process, the QoE add-back scrutiny, and
the FORD Model for staff/cultural DD.

## What this means for Stage 2

1. **The DD judgment already reaches the AI.** `due-diligence-domain-support.json` (7.7 KB,
   verified read) carries all six rules + the three pillars + FORD + QoE, and **already injects**
   whenever the DD context-domain is detected. So a DD client session already gets this coaching.
2. **There is no "harvest the checks into signals to surface templates" task** — because the DD
   checks do not point at templates. That premise was mine, and it was wrong.
3. The 13 real library DD/acquisition tools (Customer Reliance, Key Interviews, Supply Chain
   Review, Stg. 1 Due Diligence, Purchase Assessment tools…) exist, but **the firm's DD reference
   does not map its checks to them.** Any such mapping would be invention — it must come from
   Mike, not be pre-staged here.

## The one genuine question for Mike (small, optional)

DD already works as a coaching domain. The only open enhancement is:

> **Should specific library DD tools be surfaced alongside the coaching for specific risks** —
> e.g. when the advisor describes customer concentration, also offer "Customer Reliance"? Or is
> DD deliberately coaching-led (run the methodology), with template selection left to the advisor?

This is a **product/IP judgment for Mike**, not an engineering harvest. If "yes, surface tools,"
Mike supplies the risk→tool mapping (his IP) and *then* it becomes a small signal job. If "no,
coaching is the point," **Stage 2 is already complete** — DD works via domain-support and needs
no code change.

## Recommendation

Treat Stage 2 as **likely already done** (DD coaching injects and is faithful to the source).
Do not build signals or map templates without Mike's explicit risk→tool mapping. The honest
status is: *DD judgment is live via domain-support; optional tool-surfacing awaits Mike's call.*
