# Template Check — the last 12 rows that still say "Nothing matches"

**Written 2026-08-12 (laptop) for Mike. Nothing has been recorded on the Template Check screen and
nothing in `data/logic_trees.json` has been changed.**

Third and last companion to [`TEMPLATE-CHECK-ALREADY-ANSWERED.md`](TEMPLATE-CHECK-ALREADY-ANSWERED.md)
(the 30 that had an answer) and [`TEMPLATE-CHECK-REMAINING-58.md`](TEMPLATE-CHECK-REMAINING-58.md)
(the other 58).

> **This file deliberately does NOT restate those two.** Every one of the 12 already has a row in
> them. Copying those rows here would leave three records of one fact and no way to tell which is
> current — the same failure as a paraphrase standing in for an artefact. **Each entry below links
> to its original row and carries only what is NEW or what CORRECTS it.**

**Why these 12 and not the 29.** The screen now shows 87 rows: 30 you have ruled, 12 flagged, 16 not
a tool, 17 carrying a suggestion, and **12 saying "Nothing matches" — the ones with no suggestion at
all to react to.** Those 12 are this file. The other 17 already show you a candidate on screen.

---

## First, the seven that are not rulings

**Seven of the 12 are one name — `Get Seminar`, once in each of seven branches.**
→ [`TEMPLATE-CHECK-ALREADY-ANSWERED.md` § Section C](TEMPLATE-CHECK-ALREADY-ANSWERED.md#section-c--get-seminar-seven-rows-and-they-are-mikes-to-correct-in-the-app-7-rows)

Confirmed again today against the catalogue: **no record in the 291 has "Seminar", "Speaking" or
"Presenting" anywhere in its title.** This is not a matching failure. The document is not there, and
the material was placed across Public Speaking in June, so **the seven lines are yours to reword in
the app** — not a developer's to rule on. A session that puts them on your ruling queue has misread
the record.

### 🔴 NEW, and it raises the urgency: those seven lines are being cut from live advice today

All seven sit in the `recommendation` field, which has been gated sentence-by-sentence against the
catalogue since `fdb15ca`. Measured 2026-08-12:

| Get Seminar table | Count |
|---|---|
| Recommendations withheld **entirely** | **1** |
| Recommendations withheld **in part** | **6** |
| Recommendations reaching the adviser **intact** | **0** |

The gate is behaving correctly — it will not name a tool the adviser cannot open. But the effect is
that **the Get Seminar table is close to silent in the running app**, and it stays that way until
those lines point at Public Speaking material. Neither companion document says this, because the
gate's reach over `recommendation` was only established after they were written.

---

## The five that are genuinely yours

### 1 · Covid Agenda Programme — the earlier doubt is resolved

→ [original row](TEMPLATE-CHECK-REMAINING-58.md) *(Group 1, marked ⚠ "Worth your eye")*

That row hesitated because *"the table names four components and the catalogue entry is one
record"*. **The four components are the four steps of the one record.** `Covid Agendas` states its
own purpose as:

> *"This template guides you through a **4 step business recovery plan**. In New Zealand, the plan
> qualifies for NZTE funding support as it includes Critical Learning Points."*

and the sentence in the table reads:

> *"Complete the Covid Agenda Programme **(Feasibility, Scenarios, Contingency, Fundamentals)**."*

It is also the **only** record in the catalogue whose title or purpose matches all three of
*scenario*, *contingency* and *feasibility*. **Recommendation: point it at `Covid Agendas`.** Still
your ruling, but the reason for hesitating has gone.

⚠ **Why the screen could not see it: a plural `s`.** `covid agenda programme` shares one word in
three with `covid agendas`, against a bar of six in ten. That is a **fourth instance** of the
punctuation/spacing family — after the digit (5 Aug), the apostrophe and the space (12 Aug), all
three closed in [`ACTIONS.md` §name-matcher-punctuation-blind](ACTIONS.md#name-matcher-punctuation-blind).
**Not fixed, and not logged as a to-do either** — it is put in front of you here because the choice
is yours: singular/plural matching is a change to the same live function, so it needs its own proof
and its own tests, exactly as the apostrophe did.

### 2 · Management Reporting Annual Plan — the earlier options were the wrong two

→ [original row](TEMPLATE-CHECK-REMAINING-58.md) *(Group 2, marked ⚠)*

That row offered only **Winning Management Reporting**, and asked whether it was the same thing.
Reading its purpose, it is not — it is *"why clients struggle to get excited about management
reporting services"*, a piece about selling the service, not a plan.

**Two better candidates were never offered, and both are published:**

| Candidate | Its own purpose | Fit |
|---|---|---|
| **Mgt Annual Plan** | *"introduce more structure to your regular management meetings… more focused towards business improvement"* | The name is nearly exact |
| **Annual Board Plan** | *"records the board's intentions to deal with certain business topics/issues and schedules their sequence throughout the year"* | The sentence calls it *"a 12-month governance and strategic calendar… frame it as their advisory board calendar"* |

The sentence it appears in:

> *"For clients ready for structured ongoing advisory: introduce the Management Reporting Annual
> Plan — a 12-month governance and strategic calendar. Frame it as their advisory board calendar."*

**Yours to choose.** The name points at the first, the description points at the second. There is a
third possibility — that both are right and the branch should name one for the management meeting
and one for the board — and only you can say.

### 3 · Volatility Analysis — one more candidate than the earlier row offered

→ [original row](TEMPLATE-CHECK-REMAINING-58.md) *(Group 2, marked ⚠)*

That row offered **Demings Volatility**, which reads correctly: *"encourages people to accept that
business goes up and down and to learn to properly interpret the data they're reviewing."*

**Also published, and not previously mentioned: `Volatility Scenario`** — but its purpose is
*"calculate the Financial Capacity of their business"*, which is a calculator, not an
interpretation aid. The name appears in three branches of Systems Thinking, and all three use it to
**interpret**, e.g.:

> *"Standardise the interpretation of data — use Volatility Analysis to distinguish common-cause
> variation (normal range, do not act) from special-cause events (genuine anomaly, act
> deliberately)."*

**Recommendation: `Demings Volatility`.** Recorded as a recommendation and not a ruling because the
same name also appears in *Branch 4A — Six Sigma Pathway* as *"Volatility Analysis (from the Lite
Data)"*, which may mean something else again. **Your eye on that one branch would settle it.**

### 4 · Decision Workpaper — the earlier row's answer holds, and the gap is real

→ [original row](TEMPLATE-CHECK-REMAINING-58.md) *(open since 5 August)*

Checked today: **no record in the catalogue contains "workpaper" or "work paper"** in its title or
its purpose. So the earlier row's two options are inferences, and the better of them is sound:

> **FM Board White Paper** — *"standardizes how new ideas or major purchases are pitched to the
> board. It requires an Executive Summary, Historical Context, Suggested Solution, Measurable…"*

against the sentence:

> *"Have them use a Decision Workpaper to outline logic, counter-arguments, and early failure
> indicators for every major decision."*

Structure-for-a-major-decision, in a board context, in the Firm Board Pack table. **Recommendation:
`FM Board White Paper`** — or flag it as a twelfth missing export if you know the workpaper to be a
real document in its own right. **Quality Decisions**, named in the same sentence, is published and
resolves fine.

### 5 · Forecast & Action Plan — the branch answers this itself

→ [original row](TEMPLATE-CHECK-REMAINING-58.md) *(Group 2, marked ⚠ "Neither is obviously it")*

**New evidence, and it points at "Not a tool".** `Forecasting`, `Sales Forecaster` and
`Volatility Scenario` all carry the **identical** purpose text — they are the Revenue & Feasibility
Model family, not three separate answers. And the branch's own notes already tell the adviser how to
pick one:

> *"Select the appropriate Revenue & Feasibility Model from the template list [Do the Job > Revenue
> & Feasibility Models > …]. Use this order: (1) title match; (2) tags match; (3) purpose match. If
> no match found, tell the advisor explicitly rather than guessing."*

So *"Deploy a Forecast & Action Plan combining a 3-way forecast with Revenue Model sensitivity
analysis"* is describing **what to build**, not naming a document. **Recommendation: Not a tool.**
Nothing is lost — the sentence that follows already routes the adviser to the real list.
 
---

## What this leaves

| What kind of row | How many |
|---|---|
| Not a ruling — yours to reword in the app | **7** (Get Seminar), and currently silent in the live app |
| Carries a recommendation you can confirm or overturn | **4** (rows 1, 3, 4, 5) |
| Genuinely open, needs your knowledge of the product | **1** (row 2 — Mgt Annual Plan *or* Annual Board Plan) |

**Where to rule them:** `http://localhost:3000/mentor`, Template Check tab. A ruling recorded there
is stored in `data/dev-template-check-rulings.json`, which is committed and travels between
machines.

**None of the above has been recorded.** Every recommendation in this file is a reading of the
evidence, offered for you to accept or reject — and where two documents are both plausible it says
so rather than choosing, because guessing those is the exact failure the Template Check screen was
built after.
