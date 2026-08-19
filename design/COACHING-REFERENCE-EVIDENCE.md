# Coaching Reference — the evidence, measured

> **Written 2026-08-19, session 73, at Mike's instruction.** He challenged the feature:
> *"this coaching reference page makes no sense — if it truly aids the AI in guidance then it
> would need one for every tool in the app — close to 300. I think this has developed out of
> miscommunication — find me the notes to prove it's essential how it serves the end user."*
>
> **The notes do not exist.** This page records what does — where the content came from, and what
> measurably changes when it is removed.
>
> 🔴 **Nothing has been changed or removed.** This is evidence for a decision, not a decision.

---

## 1. Where the fifteen rows came from

**The first commit of the repository, `2615e76`, 2026-03-30**, whose own message says it:

> *"Coaching reference from **Quickfire Advisory Directory**"*

That commit added `Quickfire Advisory Dir.pptx` — a PowerPoint — alongside
`data/coaching-reference.json`, at prototype stage: Nuxt 3, 195 templates, before any of the
architecture that now surrounds it existed.

**It has been edited once since, in five months** (`51b77a5`, 2026-07-31) — and that commit only
added id numbers. **Not one word of the content has ever been reviewed.**

---

## 2. The arithmetic

| Check | Result |
|---|---|
| Entries | **15** |
| Templates in the app | **291** (220 under *Do the Job*) |
| Entries whose name matches **no template in the catalogue** | 🔴 **7 of 15** |
| Age of the content | The first day of the project |
| Still includes | *"Covid 19 Client Pre-Meeting"* |

The seven that name nothing in the catalogue: *Growth Fundamentals Framework · EOY Meeting ·
Deming's Theory of Volatility · Revenue Model · Porter's & Pine · Blue Ocean Strategy & 8 Profit
Levers · Covid 19 Client Pre-Meeting.*

**Cost.** The block renders to **12,846 characters — roughly 3,200 tokens — injected into every
eligible prompt** (always in discover; in client, plan and learn once a conversation reaches four
exchanges).

---

## 3. The source deck already lives somewhere better

The PowerPoint was deleted from the repository in `72295f7` — *"Reorganise source content into
Central Frameworks / Domain Support / Logic Tables"*. Its content reappears as
**`Logic Tables/Quickfire Logic.pdf`**, and as **tree 0 of the 42 logic trees**: `quickfire`,
*"Quickfire Logic"*.

**The logic-tree version is strictly better.** It branches on the client's actual answer, and it
tells the model exactly how to choose:

> *"Use this order: (1) title match — find a template whose title names the client industry or
> business type; (2) tags match …; (3) purpose match …. If no match found after all three steps,
> tell the advisor explicitly rather than guessing or inventing a name."*

`coaching-reference.json` is the same source, flattened: fifteen rows, no branching, no matching
rule, and seven names that no longer resolve.

---

## 4. 🔴 Mike ruled on this boundary once already

[`COACHING-REFERENCE-DOMAIN-ROWS.md`](COACHING-REFERENCE-DOMAIN-ROWS.md) records him correcting the
same confusion, in his own words:

> *"the step by step — here's how you do it in sequence — is provided by the domain support page;
> **the if-then-else logic of which template to use in which scenario vs another template is
> provided by the logic tables**."*

That document's own conclusion was that the page purposes had been read **backwards**, from Briefs
rather than from code. **Choosing a template is Logic Tables' job by his ruling** — which leaves the
Coaching Reference asserting a purpose he had already assigned elsewhere.

---

## 5. What the record contains instead of a justification

Every note about this page is about **plumbing**: making it firm-editable (item 4.9), fixing a
cross-firm leak, giving rows stable ids, capping promoted entries, cascading it through the tiers.

**Not one asks whether fifteen is the right number, which templates should have an entry, or what
the coverage rule is.** It has been engineered five times and justified never.

---

## 6. 🔴 The measurement — does removing it change the advice?

**Method.** Two identical backends, one variable. The live engine on port 4000; a second on 4001
with `formatCoachingForPrompt` replaced in memory so the block never reaches the prompt. **Nothing
in the repository was modified.** Six advisor questions in discover mode, chosen so three fall
squarely inside what the fifteen rows describe and three fall entirely outside them. Each answer
was scanned for which real template titles it names.

🔴 **The control is the part that matters.** A language model does not give the same answer twice,
so a with/without difference means nothing until you know how much the engine differs **from
itself**. So the same six questions were also run twice against the *live* engine, changing nothing
at all.

### The result

| Run | What changed between the two answers | Template differences |
|---|---|---|
| Test 1 | **The 15 rows removed** | **9** |
| Test 2 | **The 15 rows removed** | **12** |
| Control 1 | **Nothing — same engine twice** | **11** |
| Control 2 | **Nothing — same engine twice** | **7** |

**Removing 3,200 tokens of guidance changes the recommendations no more than asking the same
question twice does.** The ranges overlap completely.

The two questions the fifteen rows cover *least* (succession; buying a competitor) were also the
two that came back **identical** most often — with and without.

### What this does and does not establish

✅ **It establishes** that at this sample size the block's effect on which templates get recommended
is **below the engine's own noise floor** — it cannot be detected.

⚠ **It does not establish that the block does nothing, ever.** Six questions, discover mode, no
advisor profile, no firm overlay, no conversation history, four runs. A firm claim of "no effect in
any mode" would need far more. **What can be said is that nobody has ever been able to point to an
effect, and the first attempt to measure one could not find it.**

⚠ **It also does not test tone or phrasing** — only which templates are named. If the fifteen rows
shape *how* advice is worded, this method would not see it. Nothing in the record claims they do.

**Raw data:** every question and both full answers were captured per run. The harness is in the
session scratchpad (`ab-server.js`, `ab-run.js`) and writes nothing to the repository.

---

## 7. ✅ DECIDED — Option D, by Mike, 2026-08-19

> **"make a note to go with option D"** — Mike, 2026-08-19, at the close of session 73.
>
> **Fold what is worth keeping into Logic Tables**, where the source deck already lives as the
> `quickfire` tree. That ends the duplicate at its root rather than deleting content unread.
>
> 🔴 **NOTHING HAS BEEN DONE.** The decision is recorded; the work is filed as item **4.24** on
> [`features/to-do.md`](features/to-do.md) and is not started. `data/coaching-reference.json`, its
> tab, its routes and its prompt block are all exactly as they were.
>
> ⚠ **The first step is reading, not deleting.** The eight entries that name a live template get
> read against the logic tree covering the same ground, so anything genuinely unique moves rather
> than vanishes. Only then does the block come out.

### The options as they stood

| | Option | What it costs |
|---|---|---|
| **A** | **Leave it.** | ~3,200 tokens on every eligible prompt, forever, for an effect nobody can demonstrate; a hub tab that teaches managers a page exists for choosing templates when Logic Tables does that |
| **B** | **Delete the block and its tab**, keeping the firm-promoted entries — they are a different mechanism, fenced, and are the improvement loop's second half | Loses content nobody has shown to matter; touches the prompt, one tab, seven routes, a screen and its tests. **Reversible — it is one data file and one formatter** |
| **C** | **Fix it: author an entry per template that needs one**, whatever that number turns out to be | Honest to what the page claims to be, and the largest content job on the list — Mike's own point is that "one for every tool" is close to 300 |
| **D** | **Fold what is worth keeping into Logic Tables**, where the source deck already lives as `quickfire` | Ends the duplicate at its root; needs each of the fifteen checked against the tree that superseded it |

⚠ **Before B or D:** the eight entries that *do* name a live template should be read against the
logic tree covering the same ground, so anything genuinely unique is moved rather than lost. That is
a reading job, not a measurement — half a session.

---

**Related:** [`features/coaching-reference.md`](features/coaching-reference.md) — the Brief, which
documents the mechanism and **does not** establish the purpose ·
[`COACHING-REFERENCE-DOMAIN-ROWS.md`](COACHING-REFERENCE-DOMAIN-ROWS.md) — the rejected route, and
Mike's ruling on the boundary · [`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md).
