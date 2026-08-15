# The Awareness Check — what the AI is shown while it chooses

> **Artefact for approval.** This is the exact text proposed for the AI at one decision point:
> the *Profitability — Client Awareness Check* branch (`pf_awareness`) of the Profitability &
> Feasibility tree, where the engine chooses between the **Cautious Reveal** and **Trial Fit**
> delivery methods.
>
> Saved before it was approved, so the build can be checked against it afterwards rather than
> against a description of it. Item **2.6** on [`features/to-do.md`](features/to-do.md).

---

## Why this exists

Mike's instruction on that branch has never reached the AI at all:

> "This determines the delivery method. Do not use Trial Fit on an unaware client — it will cause
> map shock. Do not use Cautious Reveal on a motivated client — it will feel slow and
> condescending."

It sits in [`../data/logic_trees.json`](../data/logic_trees.json) under `advisor_note`, and
`formatNodeForPrompt` does not read that key. It is the same defect as the `recommendation` field
and the two coaching fields found on 2026-08-15 — **authored, stored, and never used.**

The first plan was to emit that one sentence through the availability gate. Two things were then
found, and both changed the plan:

1. **The gate would have deleted it.** Run through `withholdUnavailableNames`, the surviving text
   is `"This determines the delivery method."` — the gate reads "use Trial Fit" and "use Cautious
   Reveal" as tools it cannot find, when they are delivery approaches, not documents.

2. **Mike asked the better question** — *"perhaps AI would benefit from greater context? What are
   the notes about WHY I said not to spring it on somebody, what to look for?"* The answer is that
   the reasoning already exists, in detail, in two reference files. It simply never loads here.

**What the AI actually receives at that branch today**, rendered from the running formatter rather
than read off the code:

```
**[Profitability — Client Awareness Check]** (assessment)
Condition: Profitability performance concern identified — not survival level
Ask: "Is the client already aware they need a revenue model — for example, a bank has requested
one, they want to test a scenario, or they have explicitly asked for financial modelling — or do
they need to be introduced to the concept first?"
Branches:
  • If "low awareness / no context / needs to be sold on the idea / hasn't asked for it"
      → Cautious Reveal — Pre-Meeting Outreach
  • If "high awareness / bank requested / motivated / already asked / wants scenario modelling"
      → Trial Fit — Client Qualification
```

A question and two labels. No reason, no signals, and the warning absent.

**And the full guides do not rescue it.** `buildLearnReferenceText()` returns `null` for the
Profitability tree — the Trial Fit and Cautious Reveal references attach only to their own
learn-mode coaching trees. Three realistic profitability conversations were run through
`detectLogicTree`, including *"client has low margins and I am not sure they realise they need a
revenue model yet"*; all three route to `profitability_feasibility`, so neither guide loads.

Some reasoning does appear on the two *destination* branches — but only after the choice is made,
and only on the road already taken. The AI never sees both sides while it is choosing.

---

## The proposed block — exact text

**2,044 characters.** Emitted only on this one branch, only when the engine reaches it.

```
Choosing the delivery method — why this choice matters

Map shock: The feeling of being overwhelmed that a client experiences when presented with a
complex revenue model all at once. The brain switches into immediate judgment mode —
embarrassment, fear, and resistance follow. The entire Cautious Reveal strategy exists to prevent
this by establishing the 'why' before the 'what'.

Signs the client is AWARE / motivated (points to Trial Fit):
  • External requirement: the bank requires them to get a cash forecast
  • Planning need: they want to plan business expenditure or test the feasibility of an idea
  • Strategic discussion: you are working on a strategic plan and want to introduce scenario
    modelling
  • Direct request: they have proactively phoned you after completing a pre-meeting quiz or
    watching an introductory video
  Caution: Even motivated clients may still experience map shock when they first see a complex
  spreadsheet. The Trial Fit method is designed to manage this — do not skip the framing stage
  even with enthusiastic clients.

Signs the client is UNAWARE / resistant (points to Cautious Reveal):
  • Low initial awareness or motivation regarding revenue models. The idea hasn't occurred to
    them, or they are fee-sensitive and would resist an upfront pitch.
  • Standard end-of-year compliance review — no existing advisory relationship on modelling
  • Client has no awareness of what a revenue model is or does
  • Client would experience map shock if shown a complex model immediately
  • You want to seed the idea of modelling during a routine meeting without making it a formal
    sales pitch
  Contrast: Trial Fit is for clients who are already motivated and just need to be introduced to
  the model itself. Cautious Reveal is for clients who need to be sold on the idea first — before
  any model is opened.

Advisor note: This determines the delivery method. Do not use Trial Fit on an unaware client — it
will cause map shock. Do not use Cautious Reveal on a motivated client — it will feel slow and
condescending.
```

*(Line wrapping above is for reading. The block is emitted as written in the source files.)*

---

## Every line, and where it comes from

**Nothing here is newly written.** Each line is read at run time from the file that already holds
it, so editing that file changes what the AI is shown, and the two can never drift apart. The only
authored text on this page is the four headings.

| Line in the block | Read from | Key |
|---|---|---|
| Map shock definition | [`../data/cautious-reveal-reference.json`](../data/cautious-reveal-reference.json) | `key_concepts.map_shock` |
| The four AWARE signs | [`../data/trial-fit-reference.json`](../data/trial-fit-reference.json) | `when_to_use.indicators` |
| Caution on motivated clients | [`../data/trial-fit-reference.json`](../data/trial-fit-reference.json) | `when_to_use.caution` |
| First UNAWARE sign | [`../data/cautious-reveal-reference.json`](../data/cautious-reveal-reference.json) | `when_to_use.client_profile` |
| Remaining UNAWARE signs | [`../data/cautious-reveal-reference.json`](../data/cautious-reveal-reference.json) | `when_to_use.typical_scenarios` |
| Contrast line | [`../data/cautious-reveal-reference.json`](../data/cautious-reveal-reference.json) | `when_to_use.contrast_with_trial_fit` |
| Advisor note | [`../data/logic_trees.json`](../data/logic_trees.json) | `pf_awareness.advisor_note` |

**The four authored headings**, which are the only new words on this page and the only ones
needing Mike's eye:

1. `Choosing the delivery method — why this choice matters`
2. `Map shock:`
3. `Signs the client is AWARE / motivated (points to Trial Fit):`
4. `Signs the client is UNAWARE / resistant (points to Cautious Reveal):`

---

## One judgement call for Mike

The fourth UNAWARE sign is **circular**:

> "Client would experience map shock if shown a complex model immediately"

Every other line names something an adviser can *observe* about the client. This one names the
consequence of getting the choice wrong — it is the answer restated as a question. It reads
perfectly well inside the full Cautious Reveal guide, where it sits among worked examples; as a
diagnostic signal in a short list it tells the AI nothing it can act on.

**It is Mike's authored content, so it has not been touched.** Keep it or drop it from this block
only — the guide itself is unchanged either way.

---

## What is deliberately NOT included

- **The full guides.** Roughly 19,000 characters each. They stay attached to their own coaching
  trees, exactly as now. This is the short form.
- **The stages and steps** of either method. The AI needs them once it has *chosen*, and it
  already gets them then.
- **Any change to the availability gate.** It stays as it is, doing its job everywhere else.

---

## How it will be wired, once approved

- Read from the two reference files at run time — **no sentence is copied into code or into a new
  data file.**
- Emitted on the `pf_awareness` branch only, so no other prompt grows.
- Pinned by a test that renders the real block and asserts each of the seven sourced lines
  survives — the method item **4.16** prescribes: *render the prompt and read it, do not inspect
  the store.* A test that only proves the field was saved is the test that missed this twice.
- `advisor_note` comes off the `AWAITING MIKE` list in
  [`../tests/unit/recommendationGate.test.js`](../tests/unit/recommendationGate.test.js), which is
  the guard that surfaced it.

---

## Status

☐ **Awaiting Mike's approval.** Nothing has been built. No code has been changed.
