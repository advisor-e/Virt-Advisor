# Domain Support — rows needing Mike's eye

**Written 2026-07-30.** Derived from the data files themselves (`data/*-domain-support.json`),
not from anyone's session notes. 29 domains, 181 material rows in total; **165 of them have
all four columns filled**. The 18 below are the exceptions.

Tick a row off in the app once it is done.

---

## A. Sales & Marketing — 16 rows with a blank Step-by-step column

Domain appears in Firm Manager as **"sales and marketing"**.

**Why they are blank, deliberately:** the source (*Sales and Marketing Review*) is a bare index
table carrying a summary and a benefit per framework and **no method at all**. Writing steps
would have meant inventing the firm's IP, so the cells were left for Mike to fill.

**What is already done for every row below:** the **summary** and the **who & when** are
written, and the who-and-when names the source page. Only the steps are missing.

| ☐ | Row | Source page | What it is (short) |
|---|---|---|---|
| ☐ | 6 Marketing Questions | p5 | Six questions testing whether the client has considered their value from the customer's perspective |
| ☐ | Product Fit | p7 | Trade-off between profitability and customer acceptance — is the offer genuinely wanted |
| ☐ | 10 Marketing Messages | p10 | Ten statements written to the customer's actual purchase decision points |
| ☐ | Customer Type Table | p12 | Customer types against product fit in one table; separates the message per type |
| ☐ | A.I.D.C.R.A Advertisement Framework | p14 | The order an advert should be built in — Attention, Interest, Desire, Conviction, Response, Action |
| ☐ | Digital Funnel Storyboard | p17 | Maps the offerings and messages that move a target customer from couch to client |
| ☐ | (Outbound) Messaging Plan | p22 | Schedules messaging activity — medium, platform, time, cost |
| ☐ | (Inbound) Landing Page Review | p26 | Reader's logic vs page logic, then sequences text, graphics and widgets |
| ☐ | Sparketing (Friction) Review | p31 | Reviews the product backwards: what stops people buying it |
| ☐ | Branding Review | p33 | Aligning logo, graphics, message, market promise and story |
| ☐ | Customer Loyalty Programme | p35 | What a loyalty programme is actually for, and whether it turns into profit |
| ☐ | Pricing | p37 | Pushes pricing past "up or down" — price as a deliberate position |
| ☐ | Packaging / Bundling | p39 | How packaging supports the big promise and the customer's perception |
| ☐ | Sales Channel Options | p41 | Channel options with a pros-and-cons discussion on each |
| ☐ | Sales Process Review | p43 | Reviews the sales process from both the customer's and the salesperson's side |
| ☐ | Drafting Tender Proposals | p52 | Notes and ideas for tender applications; the source treats it as general reading |

**Not on this list:** *Powerful Seminars* — already carries **18 steps**, taken from its own
24-page deck. Nothing needed.

---

## B. Board Governance — 2 rows to keep or delete

Domain appears as **"firm board governance and reporting"**.

**These are NOT blank.** Both have a full summary, who-and-when and steps (7 and 5
respectively). The only open question is whether they belong at all, because **no source
document sits behind either one**. They are live engine content today, which is why they were
carried across rather than quietly deleted.

| ☐ | Row | Decision |
|---|---|---|
| ☐ | **White Paper Program** | Keep or delete. Firm-branded thought leadership to build market profile. ⚠ **Different from the source's *Board White Paper***, which is an internal proposal template — easy to confuse the two, and both are in this domain. |
| ☐ | **Deming's Volatility Principles in Governance** | Keep or delete. Applies Deming on variation to the board table: most interventions respond to normal noise, not a real signal; reacting to noise ("tampering") makes the firm less stable. |

---

## C. Unconfirmed — do not treat as fact

The desktop's session notes of 2026-07-30 also claim **four similar unsourced rows in
`fm-coach-culture`** (Coach & Culture, 20 rows).

**This could not be confirmed from the data.** The rows carry only `name`, `summary`,
`who_when` and `steps` — there is **no field recording where a row came from** — so the count
of four exists only in the written notes. Confirming it means reading that domain's source PDF
against its 20 rows. Logged here rather than repeated as fact.

---

## How this was checked

Counted directly from `data/*-domain-support.json`: a row counts as "blank steps" when `steps`
is absent, an empty array, or whitespace. Result: **16 blank rows, all of them in
`sales-marketing`** — no other domain has a single one.
