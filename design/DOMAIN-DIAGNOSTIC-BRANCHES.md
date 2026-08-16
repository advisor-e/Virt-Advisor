# The 65 branches — wording, saved before it is approved

> **Item 4.16 · A + B, now one job.** Sixty-five `diagnostic_entry` routing branches reaching no
> prompt and no screen, plus the 26 `primary_question` fields that reach the prompt and no screen.
> Spec: [`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md) §4 A and B — **§4 A is overturned below.**
> Screen chosen by Mike, 2026-08-16: **Domain Support**.
>
> **Nothing here is built yet.** Mike picks the wording, then it gets built to match this file.

---

## 1. 🔴 THE SPEC WAS WRONG ABOUT THE 55, AND HERE IS THE EVIDENCE

The build spec says about **55 of the 65** branches are *"duplicates of routing the logic trees
already carry at higher resolution"*, and item A therefore proposes retiring them. It also says,
honestly, that this was **a reading of node names, not a test**, and requires a text-by-text
confirmation before anything is deleted.

**That confirmation was run on 2026-08-16 and it does not support the claim.**

Every branch's content words were scored against every word its best-matching tree puts in front of
the model. If the branches were duplicates, their words would be in the tree.

| Share of the branch's words found anywhere in its best tree | Branches |
|---|---|
| 85–100% | **3** |
| 70–84% | 20 |
| 50–69% | 33 |
| Under 50% | 9 |

**And all three of the strongest were then read side by side. None is a duplicate.**

| | The tree node — what the AI already gets | The branch — what it never gets |
|---|---|---|
| `succession.planned_transition` | *"This is a family succession — assess whether the incumbent has begun thinking about life after the business."* **Its THEN is empty.** | *"Work through the full Dream Home methodology in sequence… separate wish list meetings with incumbents and successors before bringing stakeholders together. **A 5-year lead time is global best practice** — if the timeline is shorter, identify which steps must be accelerated and what the corresponding risks are."* |
| `valuation.buyer_assessing_a_purchase` | *"Client is evaluating a business to purchase — assessing whether the asking price is fair and fundable."* **THEN empty.** | *"**Focus first on Serviceability** — can the business cash surplus service the debt required to buy it? **Then** assess the Goodwill Payback Period and the transferability of intangible assets."* |
| `valuation.seller_seeking_valuation` | *"Client wants to value their own business for a potential sale."* **THEN empty.** | *"**Start with Steps 1–3** of the methodology to establish Adjusted Net Profit and Super Profit. **Then** apply the 3-Point Sensitivities to test whether the indicative value range is bankable."* |

**The tree says WHICH conversation this is. The branch says WHAT TO DO, and in what order, once you
are in it.** The words overlap because they are about the same subject — which is exactly why a
name-level comparison read them as the same thing. The five-year lead time appears in no tree node.
Neither does "separate wish list meetings before bringing stakeholders together".

### What this changes

1. **Item A is cancelled.** There is nothing to retire and no deletion for Mike to rule on. All 65
   are real, unreached advisory content.
2. **Item B is no longer ten branches.** It is all 65, in one build.
3. **Item G still stands.** `get-team-problem`'s six `if_then_logic` rules ARE the six branches of
   the `get_team_problem` table — same conditions, same actions, same order. It is the one genuine
   duplicate found anywhere in this sweep, and it is a different field.

⚠ **The method, stated so it can be challenged.** Word overlap is a proxy, not proof: a high score
does not prove sameness and a low one does not prove novelty. It was used to RANK, and the ranking
was then read by hand from the top — because a duplicate must score high, so the strongest cases are
where the claim had its best chance. It failed there. Anyone wanting to re-open this should start
with those three.

---

## 2. What is actually broken

**91 fields on one screen's worth of content, in two states:**

| Field | Count | Reaches the AI? | On any screen? |
|---|---|---|---|
| `diagnostic_entry.<branch>` | **65** across 19 domains | ❌ no | ❌ no |
| `diagnostic_entry.primary_question` | **26** | ✅ yes | ❌ no |

The prompt formatters in [`../server/utils/domainSupport.js`](../server/utils/domainSupport.js) emit
`primary_question` and stop. The Domain Support tab
([`../components/firm/FirmDomainSupport.vue`](../components/firm/FirmDomainSupport.vue)) edits the
materials table and nothing else.

**The `primary_question` row is included deliberately.** It is the exact fault this item is named
for — content shaping AI output that nobody can see or correct — and it sits in the same field, on
the same screen, as the 65. Fixing one and leaving the other would be a choice, and it would be the
wrong one.

Two examples of what an adviser is currently not told:

> **conflict · entrenched_position_with_loss_of_self** — *"The conflict has become about identity,
> not just interests. Before any process can work, the facilitator must open the cognitive pathway
> for detachment using the Santa Claus sequence. **Attempting to resolve the substantive issue
> before addressing the loss-of-self dynamic will fail** — the party cannot hear the solution until
> they feel safe enough to let go."*

> **strategy · revenue_model_always_required** — *"Regardless of which branch is taken, **all
> planning engagements must be supported by a Revenue Model.** Financial alignment is not optional —
> it is the structural backbone of any credible plan."*

---

## 3. Where they go

### 3a. In the prompt

Both domain formatters gain the branches directly beneath the entry question they already emit, so
the AI reads the question and the answers together. Fenced when the firm has authored them, exactly
as `overview` and `materials` already are.

### 3b. On screen — the Domain Support tab

Above the materials table, mirroring item C's block on Logic Tables and for the same reason: the
question and its answers come before the "how to run it" material.

```
  ┌ Conflict and conflict meetings ────────────────────────────┐
  │  [Provided with the platform]                              │
  │                                                            │
  │  <<< THE NEW BLOCK GOES HERE >>>                           │
  │  block heading ..........................................  │
  │  The question that opens this area                         │
  │  [ What is the nature of this conflict — a shared goal  ]  │
  │  [ with different views on process, genuinely opposed   ]  │
  │  [ interests, or an entrenched position?                ]  │
  │                                                            │
  │  When this is the situation │ What the adviser should do   │
  │  ───────────────────────────┼──────────────────────────    │
  │  Shared goal, different     │ This is the most resolvable  │
  │   process                   │ form of conflict...          │
  │  Genuinely opposed          │ Use the Cliff Face and Grab  │
  │   interests                 │ Rails technique...           │
  │  Entrenched position with   │ The conflict has become      │
  │   loss of self              │ about identity...            │
  │                                                            │
  │  Teaching frameworks (the existing materials table)         │
  │  ...                                                        │
  │  [Reset]                              [Save changes]        │
  └────────────────────────────────────────────────────────────┘
```

**The situation names are generated, not authored.** They are stored as identifiers
(`entrenched_position_with_loss_of_self`), which is not a label to show anybody. The screen renders
them as ordinary words — *"Entrenched position with loss of self"* — and that column is **read-only**:
renaming one would repoint the identifier the stored content is keyed to. **Only the guidance is
editable.** A firm that wants a situation the platform does not list adds one, and its name is then
its own.

**Ten domains have no branches at all** and simply show the materials table as they do today, with no
empty block inviting a firm to fill in a field the AI would never read for them.

---

## 4. ⚠ THE WORDING — MIKE'S CHOICE, NOTHING IS BUILT UNTIL THIS IS ANSWERED

### 4a. The heading over the block

| | Option |
|---|---|
| **A** | **What to do, depending on the situation** |
| **B** | **Diagnosis — matching the advice to the problem** |
| **C** | **Where this conversation goes next** |

### 4b. The two column headings

| | Left column | Right column |
|---|---|---|
| **A** | **When this is the situation** | **What the adviser should do** |
| **B** | **The situation** | **The advice** |
| **C** | **If** | **Then** — matching the Logic Tables columns exactly |

### 4c. The label over the entry question

| | Option |
|---|---|
| **A** | **The question that opens this area** |
| **B** | **The question your advisors are asked first** — identical to the wording approved for Logic Tables on 2026-08-16 |
| **C** | **Working out which situation this is** |

**Neighbours, for comparison — the exact words already on this screen:**

- Domain Support lede — *"The background knowledge your advisors' AI draws on for each advisory
  area."*
- Its materials table — **Framework**, **What it is**, **Who and when**, **How to use it**.

---

## 5. What gets built once §4 is answered

- Both domain prompt formatters emit the branches under the entry question, fenced when
  firm-authored. A domain with no branches produces byte-identical output to today.
- The block on the Domain Support tab with the chosen wording, saved through the tab's existing
  override bundle — mentor first, firms inheriting, version history for free.
- The situation column is read-only for platform rows; the guidance is editable; a firm may add its
  own situation and remove one.
- Tests: every one of the 65 reaches the prompt; the 10 domains without branches emit nothing new;
  a firm's edit reaches the prompt fenced; a failed read serves the platform text.

---

## 6. ⚠ What this changes for a live adviser — say it plainly

**Sixty-five pieces of advice start reaching the AI that never have.** That is a real behaviour
change across nineteen advisory areas, and it must be proved on the running app before it ships, not
only in the suite.

**It is also the largest single content change of the whole 4.16 sweep**, and worth saying out loud
before a release: the AI's advice in those nineteen areas will move. It should move toward what Mike
wrote — that is the entire point — but "should" is a prediction, and the check is to open a
conversation in two or three of those areas and read what comes back.
