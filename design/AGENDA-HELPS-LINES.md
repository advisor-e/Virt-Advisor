# The 18 missing "Helps Your Client To…" lines — drafts for Mike

> 🔴 **THIS FILE IS THE ONLY PLACE AN UNAPPROVED LINE MAY EXIST.** Nothing here is in
> `data/strategy-frameworks.json` and nothing here is on a screen. That is deliberate and it
> is the whole safeguard: once an AI-written sentence sits in the `helpsClientTo` field it is
> indistinguishable from the 34 Mike wrote, and a concept living in two versions is the drift
> the Strategy Planner exists to end.
>
> **Item 15.3.** Asked for by Mike, 2026-09-17: *"i want you to review the material and produce
> a few lines in the 'helps your client to' column i can then review what you develop and edit
> from there. use the existing lines as inspiration and guidance."* This **amends his own
> Decision B** of the same morning — *"never generated, never filled by AI"* — which is recorded
> on [`design/mockups/strategy-session-menu.html`](mockups/strategy-session-menu.html).

## How to use this page

1. **Read each draft and change it to whatever you want it to say.** Edit the text in the
   **Draft** column directly. It is yours to rewrite completely — the draft is a starting
   point, not a proposal to accept or reject.
2. **Put `yes` in the Approve column** on every row you are happy with. Leave it blank on the
   rest; a blank row is simply not applied and stays here for next time.
3. **Run `npm run helps-lines`.** It copies the approved text, character for character, into
   `data/strategy-frameworks.json` and removes that row from this page. It refuses to write a
   row that is not approved, and it refuses a concept id it does not recognise.

**Why a command rather than typing it in by hand:** eighteen lines re-typed is eighteen chances
to introduce a difference nobody notices. The same reason `npm run to-do` exists.

⚠ **These rows are the agenda decks only.** Business Targets, Strategic Orientation 1 and
Organisational Review are agendas rather than Session Scope tables, so they have never had this
column. The other 34 concepts already carry Mike's own line and **are not touched by any of
this**.

## The voice these are written to

Read off his own 34 lines. They tend to open with **"To …"** or a plain verb — *identify,
get clear on, understand, stop and think about* — address the client as **you**, and name a
practical consequence rather than a description of the concept. Several carry a short aside in
brackets. They are not marketing copy and they are not definitions.

> *"To look out for changes in the market and anticipate how everyone will react; so you can be
> ready to take advantage of the situation."*
>
> *"Identify the 'little things' that can contribute to massive business growth."*
>
> *"Get clear in your own mind about who you serve, how you add value and what makes you
> special. (Know what matters)"*

---

## Strategic Orientation 1 — the agenda, slide 2

| Approve | Concept | Draft | Drafted from |
|---|---|---|---|
| | `assess-current-position-by-reviewing-pre-meeting-data-sectio`<br>**Assess current position (section 2)** | Start from evidence rather than memory — what the team said, what customers said, and what the accounts show — so the plan is built on the position you are actually in. | pp13–14 Team and Customer & Skills Insights, p16 Financial Performance & Assets |
| | `determine-the-business-strategic-objective-and-document-the`<br>**Determine the business Strategic Objective & document the Strategy (section 3)** | Commit to one desired end result, and to the thinking behind how you will reach it. A single Strategic Objective is the acid test every later decision gets measured against. | p7 — *"Desired end result (Singular)"*, *"effectively an 'acid test'"*; p18 Strategic Statements |

## Organisational Review — the agenda, slide 2

⚠ These nine already carry Mike's own one-line description as a sub-line (*"Where are we
headed?"*). **That is a different column and none of it is touched here** — these drafts are
only for the empty *Helps Your Client To…* column.

| Approve | Concept | Draft | Drafted from |
|---|---|---|---|
| | `review-internal-insights-data`<br>**Review Internal Insights Data** | Hear what the team actually say about the place before designing anything. The gap between that and what you assumed is usually where the work is. | p5 — Internal Team Insights, gathered before the meeting |
| | `review-your-understanding-of-people-process-basics`<br>**Review Your Understanding of People/Process Basics** | Check the basics are genuinely in place before reaching for improvement — a great many "people problems" turn out to be a process nobody ever wrote down. | p6 — the People vs Process table, *"check your understanding (and progress) of Process/ Systems Development"* |
| | `define-the-leadership-style-necessary-for-success`<br>**Define the Leadership Style Necessary for Success** | Choose the leadership style your strategy actually needs — innovation and precision are led very differently — rather than defaulting to the one that suits you personally. | p7 — *"does it simply reflect your preferences…"*, and the two worked examples |
| | `define-the-cultural-core-values`<br>**Define the Cultural Core Values** | Name what matters most and put it in order, so that when two good things collide the team already knows which one wins. | pp11–13 — the Values Hierarchy, *"Everything's important until it clashes with 'another'"* |
| | `understanding-our-habit-drivers`<br>**Understanding our Habit Drivers** | Understand the triggers behind the habits you are trying to change, so a new way of working survives contact with a busy week. | pp16–17 — the five steps, and INTERFERENCE TRIGGERS |
| | `design-the-organisational-hierarchy-chart`<br>**Design the Organisational Hierarchy Chart** | Make the reporting lines explicit — who deals with who, about what — so a problem reaches the person who can actually solve it. | pp19–21 — *"WHO is best to deal with who, when dealing with WHAT?"* |
| | `determine-the-divisional-kpis`<br>**Determine the Divisional KPI's** | Give each division one primary output and a measure that proves it, so performance is discussed with numbers instead of impressions. | p22 — Division / Primary Output / Divisional KPI |
| | `develop-cascaded-operational-objectives`<br>**Develop Cascaded Operational Objectives** | Push the plan's milestones down to the division and the named person responsible, so the strategy becomes somebody's job rather than everybody's intention. | p24 — Division / Operational Objective / Team Member Responsible |

---

## What has been applied

*Nothing yet.* `npm run helps-lines` writes a dated line here for every row it applies, so this
page is also the record of which line was approved when.
