# The Advisory Staircase question — wording, saved before it is approved

> **Item 4.16 · E.** One authored field, `selectorPrompt`, reaching no prompt and no screen.
> Spec: [`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md) §4 E. Approved to build by Mike, 2026-08-16.
>
> This file exists because a label shown only in chat is a label nobody can check afterwards.
> **Nothing here is built yet.** Mike picks the wording, then it gets built to match this file.

---

## 1. What is actually broken

`data/advisory-staircase.json` line 7 holds the sentence the app asks an advisor:

> *"Where would you say your current engagement with this client sits on the Advisory Staircase?"*

**Nothing reads it.** The same sentence is typed by hand into the engine in two places —
[`../server/advisorEngine.js`](../server/advisorEngine.js) lines **1502** and **2165** — so a mentor's
or a firm's edit to the data file reaches nobody.

Line 2165 is not identical. It carries a lead-in used when the advisor has just declined a saved
answer:

> *"**No problem — ** where would you say your current engagement with this client sits on the
> Advisory Staircase?"*

⚠ **That lead-in is a behaviour, not wording to be edited.** It belongs to the moment, not to the
question, so it stays in the code and the edited sentence is appended to it. A firm editing the
question must not be able to delete "No problem —" from a conversation it was never shown in.

**This is the same fault fixed for the staircase *steps* on 2026-07-31** — recorded in the comment at
[`../server/advisorEngine.js`](../server/advisorEngine.js) line 1641, where a firm's renamed steps
reached the ceiling but not the selector. The question sentence sitting above those steps was missed.

---

## 2. Where the field goes

The **Advisory Staircase** tab, in the block below the steps that already holds **Default complexity
ceiling** — [`../components/firm/FirmStaircase.vue`](../components/firm/FirmStaircase.vue) lines
183–196. It uses that block's existing save path, so it inherits the mentor → firm cascade and the
version history without new machinery.

```
  ── the live steps ───────────────────────────────
  Step 1  Compilation & Verification      [Edit] [Switch off]
  Step 2  Assimilation                    [Edit] [Switch off]
  ...
  ─────────────────────────────────────────────────

  <<< THE NEW FIELD GOES HERE >>>
  [ label .......................................... ]
  [ Where would you say your current engagement     ]
  [ with this client sits on the Advisory           ]
  [ Staircase?                                      ]
  hint ..............................................

  Default complexity ceiling
  [ Foundational  v ]
  Used when a step has no ceiling set.

  [ Save ]  [ Ceiling history (3) ]
```

**Above the ceiling, not below it.** The question is what an advisor is asked; the ceiling is what the
AI does with the answer. On screen the question comes first because that is the order it happens in.

**A multi-line text box, not a single-line input.** The sentence is 88 characters and a firm may
lengthen it; a one-line input would hide the end of their own wording.

---

## 3. 🔴 The wording to choose — Mike picks one

### 3a. The field label

| | Option | Reads as |
|---|---|---|
| **A** | **The question your advisors are asked** | Says who sees it and that it is a question. Matches `fieldDescriptionHint`'s existing voice — *"this is the wording they see when choosing"*. |
| **B** | **Staircase question** | Shortest. Matches the terse house style of `Step name` and `Complexity ceiling`. |
| **C** | **How the staircase is introduced** | Describes the purpose rather than the thing. |

### 3b. The hint beneath it

| | Option |
|---|---|
| **A** | *"The wording an advisor sees when they are asked where a client engagement sits. The steps below are the answers they choose from."* |
| **B** | *"What an advisor is asked before choosing a step."* |
| **C** | *(no hint — the label carries it)* |

**Neighbours, for comparison — these are the exact words already on this screen:**

- `Default complexity ceiling` — *"Used when a step has no ceiling set."*
- `What this step looks like` — *"How an advisor recognises this step — this is the wording they see
  when choosing."*

---

## 4. ⚠ Two knock-on wording questions — raised, NOT bundled

Neither is part of the choice above. Both are consequences of that block holding two settings instead
of one, and each is Mike's call in its own right.

1. **The block's code comment says *"The one setting that is not a list of rows"*.** It will be two.
   The comment is ours to correct; it needs no decision.
2. 🔴 **The history button reads "Ceiling history".** Once the block saves two settings, that button
   shows the history of both while naming only one. Its explanatory note says the same:
   *"Saved changes to the default complexity ceiling."* **Changing it is a separate decision and is not
   assumed by approving §3.**

---

## 5. What gets built once §3 is answered

- The field appears on the Advisory Staircase tab with the chosen label and hint, saved through the
  existing whole-config key.
- [`../server/advisorEngine.js`](../server/advisorEngine.js) lines 1502 and 2165 read the resolved
  value instead of a hardcoded string, keeping the `[STAIRCASE_SELECTOR]` token and line 2165's
  "No problem —" lead-in.
- If the config cannot be read, the platform sentence is used. **It fails toward today's behaviour,
  never toward silence.**
- Tests: the engine emits the firm's edited sentence; it emits the platform sentence when the firm has
  not edited; it emits the platform sentence when the config read fails; line 2165 keeps its lead-in.

**Today's advisor sees no change**, because the sentence in the data is word-for-word the sentence in
the code. The difference only appears the moment somebody edits it — which is the entire point.
