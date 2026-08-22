# What each hub page is for

> **Read this before deciding where a piece of content belongs.** Twelve tabs, each answering exactly
> one question — and **the names are not a reliable guide to which.**
>
> **Verified from the code**, not from the Briefs. Where a row says *brief only*, it has not been
> code-checked and must not be relied on.
> **Screen version:** https://claude.ai/code/artifact/be01a4ac-1d31-44b2-99ab-73b0f1b2639d

---

## 1. The pages, by the question each answers

### The AI reads these — editing them changes advice

| Page | The question it answers | What it is **not** | Checked |
|---|---|---|---|
| **Domain Support** | *How do I run this, step by step?* | Not which template to choose | code ✓ |
| **Logic Tables** | *Which template, in which scenario?* | Not how to deliver it once chosen | code ✓ |
| ~~**Coaching Reference**~~ | 🔴 **REMOVED 2026-08-20** — it answered *"which tool fits this client?"*, which is Logic Tables' question by Mike's own ruling | Never coaching, despite the name | code ✓ |
| **Advisory Staircase** | *How deep is this relationship?* | Not the kind of work — explicitly independent | code ✓ |
| **Advisory Distinctions** | *What did the advisor just mean?* | Not what to do about it | brief only |
| **Quizzes** | *Does the adviser know this?* | Not how a session is delivered | brief only |

### People read these — the AI never does

| Page | The question it answers | Checked |
|---|---|---|
| **Logic Lab** | *Why did the engine decide that?* — desktop's ground | route ✓ |
| **Adoption** | *How are firms actually using it?* | brief only |
| **Logic-Lab Report** | *What did the firms push back on?* | brief only |
| **Case Reviews** | *Was the advice any good?* | brief only |
| **Template Check** | *Does the catalogue match the tables?* — mentor only, parked | brief only |
| **Adviser Network** | *Who reports to me?* | brief only |
| **Templates & Videos** | dormant since 2026-07-27, by Mike's decision | code ✓ |

---

## 2. The three that are proved, and how

**Domain Support — the step-by-step.** `formatMaterialLines()` in
[`../server/utils/domainSupport.js`](../server/utils/domainSupport.js):

```
### <name>
<summary>
**Who & when it suits:** <who_when>
**How to use it:**
1. <step>
2. <step>  …
```

**187 of 194 materials carry ordered steps — 1,118 steps in total.**

**Logic Tables — the IF-THEN template selector.** Every node in all 42 trees, verbatim from
`governance`:

```
"condition": "Primary concern is leadership style or culture alignment"
"action":    "Explore the fit between leadership style and business strategy."
"templates": [ "Leadership Review" ]
"branches":  [ answer_pattern → next_node, … ]
```

**Coaching Reference — a flat selection menu, not coaching. 🔴 REMOVED 2026-08-20.** Its own code
said so while it existed: *"the template-selection guidance injected into the Phase 3 prompt"* …
*"it is the menu the AI picks a template FROM"*. Five of its six fields chose a tool; only
`deliveryNotes` said how to run one.

**That description is what condemned it.** *Which template, in which scenario* is the row directly
above in this same table — Logic Tables — and Mike had already ruled that boundary
([`COACHING-REFERENCE-DOMAIN-ROWS.md`](COACHING-REFERENCE-DOMAIN-ROWS.md)). The page was answering a
question another page owned. Item 4.24 folded the seven pieces worth keeping into the logic trees
and removed the rest, its cascade and its tab. See
[`features/coaching-reference.md`](features/coaching-reference.md) and
[`COACHING-REFERENCE-EVIDENCE.md`](COACHING-REFERENCE-EVIDENCE.md).

---

## 3. ✅ The Coaching Reference got a Brief — and then the page went

🔴 **The page was removed on 2026-08-20**, the day after its Brief was written. Read this section as
the record of how that happened, not as a description of a live screen.

It was **the only content page in the hub with none**. Nobody ever wrote down what it was for, which
is the likeliest reason its name promised coaching while its code called it a selection menu — and,
as it turned out, the likeliest reason it should not have existed. Writing the Brief is what let
Mike see the claim plainly enough to challenge it, hours later.

✅ **Settled:** [`features/coaching-reference.md`](features/coaching-reference.md) — the purpose, the
eight principles, and **§5, the table of what belongs there and what does not**. Written because
Mike asked why Facilitation 101 sits under Domain Support rather than there: a fair question that
the name itself invites, and one this page could answer only by saying what the tab is *not*.

🔴 **The name is still open, and it is Mike's decision** — four options are recorded at §6 of that
Brief. Until it is settled, §5's table is what stops content landing on the wrong page.

---

## 4. How this page came to be written

Mike, 2026-08-16: *"I think we need to get really clear on the purpose of each page… this might show
us how the content we're dealing with here may be spread across different pages but make it
consistent in terms of user experience."*

⚠ **The first version had Domain Support and Logic Tables reversed**, because it was written from the
Briefs in `design/features/` rather than from the formatters. Mike caught it in one line: *"the step
by step — here's how you do it in sequence — is provided by the domain support page; the if-then-else
logic of which template to use in which scenario vs another template is provided by the logic
tables."*

**The lesson is the one already in the repo and it was ignored anyway: a Brief is a claim, the code is
the authority.** That is why every row above carries how it was checked, and why six rows say *brief
only* rather than quietly reading as verified.
