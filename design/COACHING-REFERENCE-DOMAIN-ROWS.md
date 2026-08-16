# Domain rows on the Coaching Reference page — 🔴 REJECTED ROUTE

> **This design was proposed, instructed by Mike, and then overtaken by evidence on the same day.**
> It is kept because *why* it was wrong is the reusable part.
>
> **Do not build this.** The settled spec is [`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md).
> **Page purposes:** [`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md).

---

## What was proposed

Move the **65 `diagnostic_entry` branches** onto the **Coaching Reference** page as a second row type,
inheriting that page's screen, cascade, prompt injection and version history for free.

Mike instructed it in plain terms — *"yes add them to the coaching reference page"* — after spotting
the destination himself: *"isn't that what the 'coaching reference' page in the hub is for?"*

The reasoning was sound on what was known at the time. The Coaching Reference is the only block in the
app that is visible, editable at every tier, cascading, and read by the AI. Putting content there
avoided building a new screen, a new gate, a new formatter and new routes.

---

## Why it is wrong — two findings, in order

### 1. The page purposes were the wrong way round

The proposal rested on Coaching Reference answering *"which tool fits this client"* and Logic Tables
answering *"what do I ask next"*. **That reading came from the Briefs, not the code, and it was
backwards.** Mike corrected it:

> *"the step by step — here's how you do it in sequence — is provided by the domain support page; the
> if-then-else logic of which template to use in which scenario vs another template is provided by the
> logic tables."*

The code agrees with him. See [`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md) §2.

A diagnostic-entry branch reads *"If the presenting issue is team dysfunction, morale, or leadership
conflict — start with the Leadership Fit audit…"*. That is a **condition naming a template**. It is
Logic Tables content, not Coaching Reference content.

### 2. Most of them are duplicates of the trees anyway

Laying each domain's branches beside its logic tree showed the diagnostic entry is a **2-to-6 line
index of routing the tree already carries** — and the tree names the actual templates while the branch
does not. **About 55 of the 65.** The trees hold 19, 24, 27 nodes where the diagnostic entry holds 3.

**So the content did not need a new home. It needed checking against the home it already had.**

---

## 🔴 The reusable lesson

**Two sessions of design went into 4.16, and every wrong turn had the same shape: a written record was
trusted where the code was available.**

1. An approved artefact said ten domains were empty and needed authoring. **They were not empty** —
   each had a live logic tree. Mike stopped it: *"the domain support material exists (I know this
   because I created it) but the problem is — not all of it was being read by AI."*
2. The Briefs were paraphrased into page purposes, and two of them came out reversed.
3. Only then did rendering the prompt and reading the formatters give the right answer.

**A Brief is a claim. An approved artefact is a claim about a moment. The code and Mike outrank both.**

⚠ **And the near-miss worth naming:** building this would have created a *second* editable copy of
routing that already exists in the logic trees, at lower resolution, on a different page, with a
different editor — the exact drift this repository keeps closing.
