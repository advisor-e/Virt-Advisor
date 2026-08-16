# The question each method opens with — wording, saved before it is approved

> **Item 4.16 · C.** Fifteen authored fields reaching no prompt and no screen — thirteen
> `stage_entry_question`, two `flat_branches`.
> Spec: [`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md) §4 C. Approved to design by Mike, 2026-08-16.
>
> This file exists because a label shown only in chat is a label nobody can check afterwards.
> **Nothing here is built yet.** Mike picks the wording, then it gets built to match this file.

---

## 1. What is actually broken

### 1a. Thirteen opening questions the AI has never asked

Thirteen learn-mode logic tables each carry a `stage_entry_question` in
[`../data/logic_trees.json`](../data/logic_trees.json) — the sentence that finds out **where in the
method the advisor already is**, before any coaching starts. The whole point of these tables is that
they are staged: an advisor preparing an End of Year meeting needs different help from one halfway
through delivering it.

**Nothing reads the field.** Proved, not assumed: `stage_entry_question` appears in exactly one file
in the repository — the data file that authors it. No formatter, no route, no component, no test.

The full thirteen, verbatim, so this can be checked rather than trusted:

| Table | The question nobody is asked |
|---|---|
| `eoy_meeting` | *"Where are you in the EOY meeting process right now — are you still preparing and reaching out to the client, about to walk into the meeting, currently in the session and wanting guidance on what to do next, or wrapping up and thinking about follow-up?"* |
| `trial_fit` | *"Where are you in the Trial Fit process right now — are you about to introduce the model for the first time, already in a session and wanting to know what to do next, or preparing to reconvene after assigning homework?"* |
| `cautious_reveal` | *"Where are you in the Cautious Reveal process right now — are you preparing for a meeting with a client who hasn't heard of revenue modelling before, are you in the concept anchoring stage, or have you already introduced the idea and are now ready to show them more?"* |
| `public_speaking` | *"Where are you in the process right now — just starting to design the content, already have content and preparing to deliver, or are you close to the event and working on logistics?"* |
| `facilitation_101` | *"Which part of the Facilitation 101 sequence do you want to work on — the opening frame, building your 3rd person story, or knowing when and how to secure relevance with the client?"* |
| `reveal_growth_curve` | *"Which part of the Growth Curve reveal do you want to work on — the opening positioning and script, building your persona, delivering the story, the drawing technique, or how to close the session?"* |
| `conflict_meeting` | *"Which part of running a conflict meeting do you want to work on — understanding the psychology behind why people dig in, creating a pathway for them to let go, the step-by-step facilitation process, the framing and status tools, or using Force Field Analysis to drive action?"* |
| `capacity_capability_opportunity` | *"Which part of the Capacity, Capability, Opportunity framework do you want to work on — setting up the conversation with legitimate constraints, assessing what the business can produce (Capacity), evaluating whether they are skilled and resourced to compete (Capability), or testing whether the market actually wants what they offer (Opportunity)?"* |
| `heald_matrix` | *"Which part of the Heald Matrix do you want to work on — understanding why it works and how to introduce it, the four quadrants and their descriptions, how to reveal and facilitate the self-assessment, or how to guide the client toward action and close into a planning engagement?"* |
| `demings_volatility` | *"Which part of Deming's Theory of Volatility do you want to work on — why averages mislead and what to use instead, the four types of variation, how to diagnose root cause using causation versus coincidence, or the four strategic options for stabilising the business?"* |
| `working_capital_cycle` | *"Which part of the Working Capital Cycle do you want to work on — understanding the cycle and the difference between fixed and working capital, diagnosing the three problem types correctly, applying cash preservation tactics, or auditing costs and management effectiveness?"* |
| `ratio_analysis` | *"Which part of Ratio Analysis do you want to work on — the Advisory Staircase and collaborative philosophy, when data is less relevant and what makes a comparison invalid, common size year on year data, or how to interrogate external benchmark data?"* |
| `dashboard_discussions` | *"Which part of Dashboard Discussions do you want to work on — the 3x3 framework and category secrets philosophy, the profitability and margin metrics, the capital and balance sheet metrics, or the facilitation process including root cause analysis and building the action plan?"* |

⚠ **These thirteen are exactly the thirteen tables that have a companion method guide**
(`LEARN_REFERENCE_FORMATTERS` in [`../server/utils/logicTrees.js`](../server/utils/logicTrees.js)).
The guide reaches the AI in full; the question that decides **which part of the guide the advisor
needs** does not. So today the model receives a nineteen-thousand-character reference and no way of
knowing where the advisor is standing in it.

### 1b. Two seminar rules in an array nothing looks at

`public_speaking` carries two further rules under `flat_branches`:

| Rule | If | Then |
|---|---|---|
| **Networking Boundaries** | an attendee raises a deeply technical or bespoke service enquiry during hospitality drinks | trigger the Selling out of bounds protocol — *"I would love to talk about that more, I will give you a call Monday"* |
| **Event Conclusion** | the seminar is complete and the Call to Action has been made | staff distribute and collect the `get.feedback` form |

**Why the formatter misses them.** `formatLogicTreeForPrompt` reads flat rules from `tree.branches`.
`public_speaking` is a **nodes**-shaped table, so its `tree.branches` is empty and its two standing
rules sit in a second array with a different name. Neither the prompt nor the Logic Tables screen has
ever shown them.

---

## 2. Where they go

### 2a. In the prompt

**The opening question goes in the table's header block**, immediately after the table description and
before the stages — because that is the order it happens in: ask where they are, then coach the stage.

**Gated to learn-mode tables** (`tree.mode === 'learn'`). Every one of the thirteen is learn-mode, and
the gate means the field can never leak into a client-delivery table block if one is authored later.

**The two seminar rules are appended after the stages**, through the existing `formatFlatBranch`
formatter — the same renderer the Get-the-Job tables already use, not a second one.

Both are **fenced when the table has been edited by a firm**, exactly like every other firm-editable
field on these tables.

### 2b. On screen — the Logic Tables tab

[`../components/firm/FirmLogicTables.vue`](../components/firm/FirmLogicTables.vue). Mentor first;
firms inherit. It uses the tab's existing save path and the single `logic-trees` override bundle, so
the cascade and the version history come with it and no new machinery is added.

```
  ┌ Get the Job — Public Speaking & Seminar Delivery ──────────┐
  │  [Provided with the platform]                              │
  │                                                            │
  │  <<< THE NEW BLOCK GOES HERE >>>                           │
  │  label ..................................................  │
  │  [ Where are you in the process right now — just       ]   │
  │  [ starting to design the content, already have        ]   │
  │  [ content and preparing to deliver, or are you close   ]  │
  │  [ to the event and working on logistics?              ]   │
  │  hint ...................................................  │
  │                                                            │
  │  Logic branch │ If            │ Then          │ Notes      │
  │  ─────────────┼───────────────┼───────────────┼─────────   │
  │  Stage 1      │ ...           │ ...           │ ...        │
  │  ... (8 stages)                                            │
  │  Networking   │ ...           │ ...           │ ...        │
  │   Boundaries  │               │               │            │
  │  Event        │ ...           │ ...           │ ...        │
  │   Conclusion  │               │               │            │
  │                                                            │
  │  [+ Add branch]  [Reset]              [Save changes]       │
  └────────────────────────────────────────────────────────────┘
```

**Above the table, not below it** — same reasoning as the Advisory Staircase question approved on
2026-08-16: the question is asked first, the branches are what happens next.

**A multi-line text box.** The shortest of the thirteen is 176 characters and the longest is 335. A
single-line input would hide almost all of every one of them.

**The block appears only on the thirteen tables that have a question.** The other twenty-nine show the
branch table exactly as they do today — no empty box inviting a firm to fill in a field the AI will
not read for that table.

---

## 3. ✅ THE WORDING — CHOSEN BY MIKE, 2026-08-16

**Label:** **The question your advisors are asked first**
**Hint:** *"Your advisor is asked this before any coaching starts, so the AI knows which stage they
need. The branches below are the stages it chooses between."*
**The two seminar rules:** §3c option **A** — two more rows in the same table, tagged **Always
applies**.

**This is what the build must match, word for word.** Any difference between the screen and these
lines is a deviation to be named, not a detail.

*The options he chose between are kept below so the choice can be read back rather than taken on
trust.*

### 3a. The label above the box

| | Option | Reads as |
|---|---|---|
| **A** | **The question this table opens with** | Names the thing and where it sits. Matches the tab's own voice — the lede already calls each row *"a branch"* of a *"table"*. |
| **B** ✅ | **The question your advisors are asked first** | Closest to the wording approved for the Advisory Staircase — *"The question your advisors are asked"* — with "first" doing the work of saying it comes before the branches. |
| **C** | **Where are you up to?** | Uses the question's own voice rather than describing it. Shortest. |

### 3b. The hint beneath it

| | Option |
|---|---|
| **A** ✅ | *"Your advisor is asked this before any coaching starts, so the AI knows which stage they need. The branches below are the stages it chooses between."* |
| **B** | *"What an advisor is asked before the AI picks a stage to coach."* |
| **C** | *(no hint — the label carries it)* |

**Neighbours, for comparison — the exact words already on this screen and its sibling:**

- Logic Tables lede — *"The IF-THEN rules that steer how a meeting is run. Each row is a branch: a
  condition your advisor meets, the action to take, and why."*
- Logic Tables order note — *"Row order is the order these rules are read — moving a row changes how
  the table reads, not the decision flow."*
- Advisory Staircase (approved 2026-08-16) — **The question your advisors are asked** /
  *"The wording an advisor sees when they are asked where a client engagement sits. The steps above
  are the answers they choose from."*

### 3c. The two seminar rules — where they show

| | Option | Consequence |
|---|---|---|
| **A** | **As two more rows in the same branch table**, carrying a small tag reading **Always applies** | One table, one Save button, one way to edit a rule. The table's row count goes from 8 to 10, which is the honest number. |
| **B** | **In their own small block below the table**, headed *"Rules that always apply"* | Keeps the eight staged branches visually separate from the two standing rules. Costs a second table with identical columns on one screen. |

**Our recommendation is A.** They are the same four fields, edited the same way, and a non-technical
editor meeting two identical tables on one page has to work out why. The tag carries the distinction
without a second grid.

⚠ **This is a real difference, not a presentation detail.** Under A, a firm adding a row gets an
ordinary staged branch — the standing rules can be reworded but the set of them stays at two. That is
the same reword-and-add scope ruled on 2026-07-24, applied to a field that has never been visible.

---

## 4. What gets built once §3 is answered

**The prompt half**

- `formatLogicTreeForPrompt` emits the opening question in the header, gated on `mode === 'learn'`,
  fenced when the table is firm-authored.
- The same function emits `flat_branches` through `formatFlatBranch`, after the stage blocks.
- A table with neither field produces byte-identical output to today.

**The screen half**

- The new block on the Logic Tables tab with the chosen label and hint, shown on the thirteen tables
  that have a question, saved through the tab's existing override bundle.
- The two seminar rules become editable per §3c, writing back to `flat_branches` — never into the
  stage list, which would change the walk.
- The rail's branch count for `public_speaking` becomes **10**, because that is how many rules the
  table now shows and saves.

**Tests**

- The engine emits each of the thirteen questions for its own table, and emits none for the
  twenty-nine that have none.
- A firm's edited question reaches the prompt; an unedited firm gets the platform question.
- A failed config read serves the platform question — **it fails toward today's behaviour, never
  toward silence.**
- The two seminar rules reach the prompt, and a save round-trips them back into `flat_branches`
  rather than into `nodes`.
- A client-mode table carrying the field emits nothing (the learn gate).

---

## 5. ⚠ What this changes for a live advisor — say it plainly

**Unlike item E, today's advisor DOES see a change.** E replaced a hardcoded sentence with the
identical sentence from data; nobody could tell. Here, fifteen pieces of authored content start
reaching the AI that have never reached it before.

The change is in the AI's favour and it is what the content was written for — but it is a real
behaviour change on thirteen learn conversations and one seminar table, and it must be **proved on the
running app before it ships**, not only in the test suite. That means opening a learn conversation on
at least one of the thirteen and confirming the model asks where the advisor is up to instead of
launching into stage one.

---

## 6. ⚠ Raised, NOT bundled

1. **Item G is a duplicate, proved 2026-08-16.** `get-team-problem`'s six `if_then_logic` rules are
   the same six branches as the `get_team_problem` logic table — same conditions, same actions, same
   order, lightly reworded. The AI already receives every one of them. **G therefore belongs with item
   A (retire), and deleting authored content is Mike's call, not ours.** It is recorded here because it
   was found while reading the code for C; it is not part of this change.
2. **The "Ceiling history" button on the Advisory Staircase tab** still names one setting while
   covering two — carried from session 64, still open, still Mike's call.
