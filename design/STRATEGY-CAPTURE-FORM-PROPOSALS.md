# Strategy Planner — a proposed answer table for each of 20 concepts

> **Item 15.16.** Every row below is a **proposal for Mike to rule on, one at a time**. Nothing
> here is built, and nothing in `data/strategy-frameworks.json` changes until he has ruled.
> Choosing a form for an unmeasured concept is his decision, not a reading —
> [`PLANNING-TEMPLATE-CENSUS.md`](PLANNING-TEMPLATE-CENSUS.md) §4, and the validator in
> `server/utils/strategyFrameworks.js` refuses one without it.
>
> Drafted 2026-09-24 on the laptop from the text of his decks
> (`design/planning-templates/`), read page by page. The text carries every word and its position
> on the page; it does not carry the drawings. Every page cited below can be opened to check.

---

## 1. The impact test

**What it solves.** An advisor teaches 20 of the 46 concepts and then has nowhere to write the
client's answer. What is said in the room is lost: it does not reach the plan document, and it
does not carry into the next session.

**How we will know.** Today **22 of 46** concepts capture an answer. After the rulings, the count
is 22 plus every row he approves. The same count is taken from `data/strategy-frameworks.json`
before and after. **Second check:** for each approved concept, a session is run and the typed
answer appears on the printed plan page.

**What already does this job.** The nine capture forms and the two readers that feed them —
`strategy-capture-tables.json` (his Word templates) and `strategy-deck-capture-tables.json` (a
table read off a deck page, which is how Branding, Pricing, Packaging, Customer Loyalty and
Divisional KPIs got theirs). **Every proposal below reuses one of the nine. None needs a tenth.**

---

## 2. What his decks say, concept by concept

Four groups, by what the deck itself offers. The group decides the work, so it is stated first.

### A — his own Word template exists and no concept uses it yet (3 concepts)

| Concept | Where it is taught | His capture page says | Proposed form | Template |
|---|---|---|---|---|
| **Market Diffusion Theory** | SO2 p25 | p29: *"Complete the Curve & Cycle table to record your 'market acceptance' observations"* | Small comparison grid | Curve & Cycle Notes |
| **Product Life Cycle** | SO2 p27 | the same p29 — one table serves both concepts | Small comparison grid | Curve & Cycle Notes |
| **Sales Process Review** | S&M p43 | p47: *"Complete the Sales Flowchart table"* **and** p50: *"Complete the Tension Point Scripts table"* | Snaking step sequence, then Prompt → answer sheet | Sales Flowchart, then Tension Point Scripts — **two sheets** |

⚠ **Two of these templates would not come through properly today.** The reader was run on both
on 2026-09-24:

| Template | Boxes his page has | Boxes the reader gives | Why |
|---|---|---|---|
| SWOT Notes | 12 | 12 ✅ | — |
| Tension Point Scripts | 5 blank script lines | 5 lines, 10 boxes ✅ | — |
| Curve & Cycle Notes | 4 | **3** | every cell holds his worked example, so the Diffusion column is read as labels |
| Sales Flowchart | 15 steps | **5**, none of them a step | the same: all 15 steps hold his example (*"prospect walks in"* …) |

So group A is a data change **plus** teaching the reader what to do with a page made entirely of
worked examples. That is the reader's job and it stays general — never a component per concept
(Brief §2).

*The fourth unused template, **SWOT Notes**, belongs to no concept. S.W.O.T is the `swot-pest`
framework in Strategic Orientation 1, not one of the 46, so there is nothing here to propose.*

### B — a table on his own deck page, with no Word template (7 concepts)

The same route Branding and Pricing already take: the table is read off the page.

| Concept | Taught | His capture page | What the table is | Proposed form |
|---|---|---|---|---|
| **Price For Problem Solving** | SO2 p20 | p21 *"Complete the Tables"* | four columns — Tell / Show / With / For Them, For Free → Maximum Fee — four numbered lines each | Banded grid |
| **Price For Delivery Medium** | SO2 p20 | p21, same page | three columns — Once to Many / One to Many / One to One — four numbered lines each | Banded grid |
| **A.I.D.C.R.A Advertisement Framework** | S&M p14 | p16 *"(Our) A.I.D.C.R.A Advertisement"* | six questions, one per stage — *What will grab their Attention?* … *Tell them how to purchase* | Prompt → answer sheet |
| **Digital Funnel Storyboard** | S&M p17 | pp20–21 *"(Our) … Engagement Story-Board"* parts 1 and 2 | six named rows (Free / Tiny Fee / Small Fee; Target / Golden / Premium Client) across eight columns (Medium … Your Desired Result) | Named rows × staged columns |
| **(Outbound) Messaging Plan** | S&M p22 | p25, the blank copy of pp23–24 | rows the client names (Concept Domain) across Video / Article / Speech / Blog | Named rows × staged columns ⚠ |
| **Sparketing (Friction) Review** | S&M p31 | p32 *"(Our) Sparketing Thoughts"* | seven considerations, each with its notes box, and five numbered lines for marketing statements | Prompt → answer sheet |
| **Sales Channel Options** | S&M p41 | p42 *"Sales Distribution (Channel) Options"* | seven considerations → *Your Sales Distribution Ideas* — the same layout as Branding p34 | Prompt → answer sheet |

⚠ **(Outbound) Messaging Plan** is the one row in B whose form is not a clean match: his rows are
not named in advance — the client writes in their own concept domains, and p24's example fills the
cells with months. Named rows × staged columns with the row names typed is the nearest of the
nine. If that is wrong, it is teaching only.

### C — a table on his deck page, but already filed as item 15.11 (4 concepts)

| Concept | Taught | His capture page | What the table is |
|---|---|---|---|
| **Vertical Integration** | SO2 p22 | p24 *"Vertical/ & Horizontal Integration Tasks"* | four named rows (Priority Tasks … Customer Experience vs Bottom Line) × Vertical / Horizontal |
| **Horizontal Integration** | SO2 p23 | the same p24 | — |
| **Revenue Streams** | SO2 p33 | p34 *"(Our) Revenue Streams"* | Upstream / Core / Downstream, with *Our Thoughts to Support These Ideas* |
| **E. Deming's Volatility Theory** | SO2 p36 | p37 *"(Our) Volatility Graph Observations"* | four causes × six numbered lines — a banded grid |

**15.11 describes exactly these pages** and proposes drawing them as capture surfaces over his
page. The deck-page reader in group B now reaches the same result without a drawing, which did
not exist when 15.11 was filed on 2026-09-20. **Which item carries these four is Mike's call** —
they are listed here so the two items cannot both build them.

### D — his deck has no capture page for these (6 concepts)

| Concept | Taught | What the deck offers |
|---|---|---|
| **Boston Model** | SO2 p26 | a 2×2 and prose: *"identify your business in relation to your key competitors… collect data that proves you're right"* — no table |
| **Technology Points** | SO2 p28 | four stages and prose — no table |
| **Sigmoid Curve** | SO2 p30 | a curve and prose — no table |
| **Risk Reward Matrix** | SO2 p35 | a matrix — no table |
| **Senge's Circles of Causality** | SO2 p38 | a causal loop and a quotation — no table |
| **(Inbound) Landing Page Review** | S&M p26 | pp27–30 are a **fully worked example** (the protein doughnut), eight sections × Reader's Logic / Landing Page Logic / Marketing Statement, and no blank copy |

**Proposed: teaching only** for the first five. A form for them would need box labels, and every
box label in this app is read off his own material (`strategyCaptureForms.js`: *"IT DERIVES, IT
DOES NOT AUTHOR"*). A label we wrote would sit in a client's plan as if it were his.

**Landing Page Review is the exception worth asking about.** His example already names every row
and both guidance columns; only the *Marketing Statement* column is the client's. Proposed: a
prompt → answer sheet — his section and logic as the prompt, the client's marketing statement as
the answer — read from pp27–30. If he would rather it stay a worked example, it is teaching only.

---

## 3. What the count would become

| If he approves | Concepts capturing an answer |
|---|---|
| nothing | 22 of 46 (today) |
| groups A and B | 32 |
| plus group C | 36 |
| plus Landing Page Review | 37 |
| the five in D stay teaching only | 37 of 46 — the other nine are the five, two framing pages, Cultural Core Values (15.17) and Drafting Tender Proposals |

---

## 4. The order they will be put to him

One at a time, each a yes/no, starting with the templates he supplied that no concept uses:

1. Market Diffusion Theory and Product Life Cycle → Curve & Cycle Notes (one table, both concepts)
2. Sales Process Review → Sales Flowchart, then Tension Point Scripts
3. Group C — which item carries the four: this one or 15.11
4. Each of group B, in deck order
5. Landing Page Review
6. The five teaching-only concepts

His ruling is written beside each row the moment he gives it.

## 5. What was built — 2026-09-24, on rulings 1, 3 and 4

**13 concepts now capture, 22 → 35 of 46.** Every box count was checked against his page and
seen on the running Run screen:

| Concept | Table | Form | Boxes |
|---|---|---|---|
| Market Diffusion Theory, Product Life Cycle | Curve & Cycle Notes (workbook) | Small comparison grid — first reading of this form | 4 each |
| Vertical Integration, Horizontal Integration | SO2 p24 | Named rows × staged columns | 20 each |
| Revenue Streams | SO2 p34 | Banded grid | 17 |
| E. Deming's Volatility Theory | SO2 p37 | Banded grid | 24 |
| Price For Problem Solving / Delivery Medium | SO2 p21, two tables on one page | Banded grid | 16 / 12 |
| A.I.D.C.R.A Advertisement Framework | S&M p16 | Banded grid, his question under each stage | 12 |
| Digital Funnel Storyboard | S&M pp20–21 | Named rows × staged columns | 42 |
| (Outbound) Messaging Plan | S&M p25 | Named rows × staged columns, rows typed by the client | 30 |
| Sparketing (Friction) Review | S&M p32 | Prompt → answer sheet | 7 |
| Sales Channel Options | S&M p42 | Prompt → answer sheet | 7 |

**How.** The deck-page reader (`scripts/read-deck-capture-tables.js`) learned a second shape:
a page declared a `grid` is read as writing lines, with merged cells taken from his own rules,
and his worked example shown as grey guide text in its line — the rule the deck-page question
sheets already follow. **Every one of the 46 existing concepts and 168 template readings was
compared before and after: all identical.**

**Revenue Streams' two "Our Thoughts" lists** (fixed on Mike's yes, 2026-09-24): his page heads
both the Upstream and the Downstream thoughts the same way, and the screen had merged them into
one list of eight. Each list now sits under its own column, and the printed plan names the side
on every line — *"Our 'Upstream' Revenue Opportunities · Our Thoughts to Support These Ideas"*,
his two headings joined, no word of ours.

**Not built, and why:**
- **Sales Process Review** — held by ruling 2.
- **(Inbound) Landing Page Review** — his pages are a finished worked example with no blank
  copy; turning it into a form needs his ruling on which column is the client's.
- **Boston Model, Technology Points, Sigmoid Curve, Risk Reward Matrix, Senge's Circles** — no
  capture page in his deck. Box labels would have to be written by us.

## 6. Mike's rulings

| # | Concept | Ruling | Date |
|---|---|---|---|
| 1 | Market Diffusion Theory, Product Life Cycle | ✅ **Yes** — both capture into Curve & Cycle Notes (p29), one table serving both | 2026-09-24 |
| 2 | Sales Process Review | ⏸ **Held** — *"confusion exists over the clients sales process - move forward without it for now - we can pick it up later"*. Taken to cover both sheets, Sales Flowchart and Tension Point Scripts. | 2026-09-24 |
| 3 | Vertical Integration, Horizontal Integration, Revenue Streams, E. Deming's Volatility Theory | ✅ **Yes** — carried by 15.16, their tables read off his slides (SO2 pp24, 34, 37) by the deck-page route Branding uses, not drawn over the slide as 15.11 proposed | 2026-09-24 |
| 4 | Every proposal in §2 not ruled above | **Build** — *"build as many as you can with what you have - we can pick up the rest later"*, given after rulings 1 and 3. Read as authority to build the proposals as drafted wherever his material supplies the table; anything that cannot be built from his material is reported back, not invented. | 2026-09-24 |
