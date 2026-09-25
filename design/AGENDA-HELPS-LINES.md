# "Helps Your Client To…" lines — every row of the scope menu now carries one

> ✅ **COMPLETE, 2026-09-25.** All **47** rows of the Strategy Planner's session scope menu carry a
> *Helps Your Client To…* line: **34** read off Mike's own decks, and **13** drafted here and
> approved by him word for word — the ten agenda rows, the two framing pages (Collaborative
> Thinking and Our Session Objective), then Business Owner Expectations (item 15.23). Every one
> of the thirteen is in the record below, dated.
>
> 🔴 **THIS FILE IS STILL THE ONLY PLACE AN UNAPPROVED LINE MAY EXIST.** Nothing waiting here is
> in `data/strategy-frameworks.json` or on any screen. Once an AI-written sentence sits in the
> `helpsClientTo` field it is indistinguishable from Mike's own, which is why a draft lives here
> until he approves it — and `tests/unit/strategyConcepts.test.js` fails the build if an agenda
> row carries a line that is not in the record below.
>
> **Item 15.3.** Asked for by Mike, 2026-09-17: *"i want you to review the material and produce
> a few lines in the 'helps your client to' column i can then review what you develop and edit
> from there."* This **amends his own Decision B** of the same morning — *"never generated, never
> filled by AI"* — recorded on [`design/mockups/strategy-session-menu.html`](mockups/strategy-session-menu.html).

## If a new concept ever arrives without a line

1. Draft its line from its own deck page, in the table below, in the voice of the 34 — they
   open with **"To …"** or a plain verb, address the client as **you**, and name a practical
   consequence rather than a definition.
2. Mike approves it — in chat is enough; the session puts `yes` in the Approve column for him.
3. `npm run helps-lines -- --apply` copies the approved text character for character into the
   data and adds a dated line to the record below. It refuses a row that is not approved, a
   concept it does not recognise, and any row that would overwrite a line already written.

## Waiting on Mike — none today

| Approve | Concept | Draft | Drafted from |
|---|---|---|---|

---

## What has been applied

- **2026-09-25** · `business-owner-expectations` — "Put a number on the life each owner wants — the income, the hours, the time off and the work they'd rather be doing — and see how big the business has to become to pay for it."
- **2026-09-24** · `collaborative-thinking` — "Look at the business together, one side at a time, before anyone decides — so the plan is built on everyone's view rather than out-voting the person who saw the crack."
- **2026-09-24** · `our-session-objective` — "Know what today is for and what is expected of everyone: come with an open mind, be ready to be challenged, discover what you've been missing, and leave with an action plan."
- **2026-09-24** · `assess-current-position-by-reviewing-pre-meeting-data-sectio` — "Start from evidence rather than memory — what the team said, what customers said, and what the accounts show — so the plan is built on the position you are actually in."
- **2026-09-24** · `determine-the-business-strategic-objective-and-document-the` — "Commit to one desired end result, and to the thinking behind how you will reach it. A single Strategic Objective is the acid test every later decision gets measured against."
- **2026-09-24** · `review-internal-insights-data` — "Hear what the team actually say about the place before designing anything. The gap between that and what you assumed is usually where the work is."
- **2026-09-24** · `review-your-understanding-of-people-process-basics` — "Check the basics are genuinely in place before reaching for improvement — a great many "people problems" turn out to be a process nobody ever wrote down."
- **2026-09-24** · `define-the-leadership-style-necessary-for-success` — "Choose the leadership style your strategy actually needs — innovation and precision are led very differently — rather than defaulting to the one that suits you personally."
- **2026-09-24** · `define-the-cultural-core-values` — "Name what matters most and put it in order, so that when two good things collide the team already knows which one wins."
- **2026-09-24** · `understanding-our-habit-drivers` — "Understand the triggers behind the habits you are trying to change, so a new way of working survives contact with a busy week."
- **2026-09-24** · `design-the-organisational-hierarchy-chart` — "Make the reporting lines explicit — who deals with who, about what — so a problem reaches the person who can actually solve it."
- **2026-09-24** · `determine-the-divisional-kpis` — "Give each division one primary output and a measure that proves it, so performance is discussed with numbers instead of impressions."
- **2026-09-24** · `develop-cascaded-operational-objectives` — "Push the plan's milestones down to the division and the named person responsible, so the strategy becomes somebody's job rather than everybody's intention."

