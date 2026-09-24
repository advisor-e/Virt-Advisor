# Business Owner Expectations — the wording (item 5.3)

> ✅ **APPROVED BY MIKE, 2026-09-24 — every line below, exactly as it stands.** Every row and column label on the two steps is copied from
> `design/report-source-models/BO Expectations.xlsx` exactly as the workbook writes it — including
> *(Strategic) Client Dealings*, *$ Management*, *Fishing*, *Other 1*, *Yr1 Interest*,
> *Mthly Repayments* and *Debt / Equity %*. Those are not listed here.
>
> **Listed here is every word the workbook does not supply**, so each one is ours until he rules on
> it. The keys live under `report.ownerExpectations` in `locales/en.json`.

## The model's name and place

| Where | Wording | Why |
|---|---|---|
| Model Library card, page title | **Business Owner Expectations** | The workbook's file name spelt out (*BO Expectations*). *Business Targets* is not used: it is already a template title in the master library, and a model sharing a template's name is the collision `nameCollisions.test.js` guards. |
| Library category | **Growth** | The nearest of the six existing categories. |
| Library summary | **What each owner wants to earn, work and take off at three target stages — and the revenue the business must reach to pay for it.** | |
| Library scope line | **Two steps: the owners, then the business development stages. Up to six owners.** | |

## The two steps

| Where | Wording |
|---|---|
| Step chip 1 | **Owners' expectations** |
| Step chip 2 | **Business development stages** — the workbook's sheet name |
| Button, step 1 | **Next — business development stages** |
| Buttons, step 2 | **Back** · **Print** |

## Step 1 — the owners

| Where | Wording |
|---|---|
| Card | **The years** — the four year boxes, labelled **Current**, **Stage 1**, **Stage 2**, **Stage 3** |
| Card | **Owners** — the list, one owner open at a time; an unnamed one reads **Owner 3** |
| Field | **Name** |
| Fields | **Weekly Hours · Stage 1**, **Weeks Annual Leave · Stage 1** (and Stage 2, Stage 3) |
| Card | **Income** — every owner by stage, with **Totals** |
| Card | **Weekly hours and annual leave** |
| Card | **Focus Tasks/Duties % · Andy**, headed *priced at 45 hours a week* |
| Columns | **Tasks/Duties** · **Now %** · **Hrs** · **Focus %** · **Hrs** — the workbook heads them *Now* and *Focus*; the % is ours |
| Footnote | *Both columns are priced at the owner's Stage 1 weekly hours, as the workbook does. Each column should add to 100%. Rename, remove or add this owner's tasks here; the other owners keep their own.* |
| Button, under the tasks | **+ Add task** · each row's **×** reads *Remove this task* on hover · an empty name box shows *Task name* |
| Note, only if the firm's list cannot be read | *The firm's starting task list could not be loaded, so a new owner starts on the workbook's list.* |
| Headline sub-label | **all owners combined** |

## The hub tab — Owner Focus Tasks (all four managing tiers, under Model Inputs)

| Where | Wording |
|---|---|
| Tab label | **Owner Focus Tasks** |
| Sentence, mentor, nothing written yet | *This is the starting list taken from the Business Owner Expectations workbook. Change anything below and press Save, and every tier beneath you receives your list instead.* |
| Sentence, lower tier, nothing written anywhere | *You are using the platform's starting list, taken from the Business Owner Expectations workbook. Change anything below and press Save to hold your own instead.* |
| Sentence, inherited from a tier above | *You are using the starting list set by {tier}. Change anything below and press Save to hold your own instead.* |
| Sentence, this tier's own | *This is your own starting list. Every owner on Business Owner Expectations begins with these tasks at every tier beneath you, and each owner may then rename, remove or add their own.* |
| Buttons | **+ Add task** · **Save this starting list** · **Go back to the inherited list** · **Version history** / **Hide version history** · **Restore** |
| Ladder | each tier reads **writes it · 10 tasks** or **inherits** — the Session Processes wording |
| Confirm, going back | *Your own starting list will stop being used, and the one from the level above will be handed down instead. Earlier versions stay in the history.* · **Go back to inheriting** |

## Step 2 — the business development stages

| Where | Wording |
|---|---|
| Card sub-heading | *net profit is the owners' income; revenue is worked back up from it* |
| Rows | **Sales/Promo' Costs %** and **Sales/Promo' Costs $** — the workbook gives both rows the same label; the % and $ are ours to tell them apart |
| Footnote | *Net Profit $ is the owners' combined income from step 1. Revenue $ is worked back from it: net profit, depreciation, loan payments and fixed costs make the total gross profit; add sales and promotion costs for gross profit, then variable costs for revenue.* |
| Card | **The business at each stage** — the four written rows |
| Card | **Quick Calculator** — the workbook's own name |
| Debt / Equity % with no equity left | **—** |
| Headline | **Revenue $ · Stage 1 (2026)**, sub-label **to pay the owners $250,001** |
