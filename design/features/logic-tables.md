# Logic Tables — the Brief

> **Read this before adding, editing or re-filing a decision tree.** Current rules only. The
> history is in [`logic-tables-history.md`](logic-tables-history.md).
>
> **Covers:** the decision trees that carry the advisory reasoning — their two shapes, what a
> node may recommend, and how a firm edits them. **Does not cover:** how a recommendation is
> scored ([`advisory-engine.md`](advisory-engine.md)) or the briefing material
> ([`domain-support.md`](domain-support.md)).

---

## 1. Design philosophy

**The logic tables are the advisory thinking, written down.**

They are not configuration. Each one is a decision path an experienced advisor would follow —
*if the client shows this, then look at that; if they have already tried it, go here instead* —
transcribed from source material into something the engine can walk. Roughly forty of them carry
the reasoning behind most of what an advisor is recommended.

**Faithfulness to the source is the first rule, and it outranks convenience.** A table's
authority is the source document it was transcribed from, and the transcription is meant to match
it — including when the source names a tool the catalogue does not carry yet. **The tree keeps
the name; a gate stops it reaching an advisor.** Editing the tree to match today's catalogue
would quietly rewrite the advisory thinking to fit an accident of publishing.

**And a tree must never send an advisor to a page they cannot open.** That is the one
non-negotiable at the other end: whatever a table declares, only what genuinely exists reaches a
client recommendation.

---

## 2. Key principles — the non-negotiables

**P1 · There are two shapes and they behave completely differently.** A **node** tree is
*walked*, and the templates at its nodes become client recommendations. A **flat if-then** table
is Learn-mode reference and is **never walked**. Filing a table as the wrong shape makes its
content silently unreachable.

**P2 · 🔴 The two look identical on screen.** Nothing in the interface distinguishes them.
Assume nothing from appearance — check the shape in the data.

**P2a · A learn table's opening question reaches the AI, and it is edited on this tab.** The
sentence that establishes *where in the method the advisor already is* is emitted **for learn-mode
tables only** — a client-delivery table is walked to a recommendation, not opened with a question.
**The screen shows the box under exactly that condition**, so the 13 tables that have one offer an
edit and the other 29 offer nothing. Wording approved by Mike, 2026-08-16; artefact
[`../LEARN-TREE-OPENING-QUESTION-FIELD.md`](../LEARN-TREE-OPENING-QUESTION-FIELD.md).

**P2b · A nodes table may also carry STANDING RULES, in a third array.** Rules that hold whichever
stage the advisor is in live in `flat_branches`, outside the walked graph. They show as ordinary
rows tagged **Always applies**, and they can be reworded but not added to — the set is the
platform's. A row saved back into the staged list would join the walk.

**P2c · Thirteen learn tables carry a companion METHOD GUIDE, formatted here and screened
elsewhere.** `LEARN_REFERENCE_FORMATTERS` attaches a deep guide — 155,000 characters across the
thirteen — to the same tables that carry an opening question, and it reaches the model in full
whenever that table is coached. **The guide is edited on Domain Support, not on this tab:** it
answers *how do I run this session*, which is that page's question, and it opens from the framework
row it belongs to. Formatted in `logicTrees.js`; screened in `FirmDomainSupport.vue`. **Do not go
looking for the screen where the code is.** Ruled by Mike, 2026-08-17; artefact
[`../METHOD-GUIDES-SCREEN.md`](../METHOD-GUIDES-SCREEN.md).

**P3 · A tree may legitimately name a tool the catalogue has not published yet.** That keeps the
tree faithful to its source. The availability gate holds the name back until the catalogue
carries it, and then it starts flowing **with no edit to the tree**.

**P4 · Nothing is recommended that is not in the firm's published content.** The owner's rule:
*"if it's not in the search JSON … don't recommend it. Hold it back."*

**P5 · The gate validates against the mirror, not the raw export, on purpose.** The export is not
committed to the project, so on a fresh clone or in a build the gate would have nothing to check
against and would **switch itself off** — which is worse than checking against a slightly
different list.

**P6 · Firm and level edits are untrusted input.** Anything authored above or below the platform
is fenced before it reaches a prompt. Platform data is trusted; authored overrides are not.

**P7 · Logic Tables cascade; the Logic Lab does not.** The tables inherit down the levels field by
field. The Logic Lab's accepted list is array-shaped and firm-local by nature — an array replaces
wholesale, so it cannot cascade without one level blanking another's set.

**P8 · The design intent is that trees emit signals, not template names.** Template names age
fast as the library changes; signals do not. The build emits names today. **Do not re-specify the
intent downward to match the build** — but do not add more name-emitting trees on the assumption
that it is the target either.

**P9 · Every learn tree states its subject to the model.** Four of the twenty-one carried no
`description` — the four financial ones, the only four whose vocabulary genuinely overlaps — so
their prompt header emitted a **blank line** where every other tree says what it is, and the AI
picker chose between bare labels. A tree with none now falls back to its companion guide's own
authored summary. **The sentence is read, never copied:** a second copy in `logic_trees.json`
would be two things to keep level by hand, and the one nobody edits is the one the AI reads. A
tree's own `description` always wins, so authoring one later needs no code change.

---

## 3. Design considerations

**The source document is the authority, not the machine-readable copy.** When a table's content
is questioned, check it against the document it was transcribed from — the source's own
then-column — rather than against a derived file. This cuts both ways: do not concede a defect
because a derivative disagrees, and do not call content missing because it is absent from the
published export.

**A "faithful transcription" and "a good decision path" are different tests**, and both matter.
A table can be perfectly faithful and still route badly, and the fix for that is a conversation
with the owner, not a quiet edit.

**Firm-level editing exists and is real.** A level can edit the tables it inherited and add its
own, so a firm can train its people the way it likes. That is the product promise; it also means
the tables an advisor sees are **not necessarily the ones in the project**.

**Template Check is the accuracy report over this material** — it scans the shared catalogue
against the tables. It is mentor-only and deliberately so: it improves the system, and has no
firm dimension to show anyone else.

⚠ **The Logic Lab is the other machine's active work.** The laptop stays off it. Documenting it
here is fine; changing it is not, without coordinating.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The trees | `data/logic_trees.json` |
| Loader, formatter, availability gate | `server/utils/logicTrees.js` |
| Level merge | `server/utils/firmContent.js`, `deepMerge.js` |
| Prompt fencing | `server/utils/promptSafety.js` |
| Name scanning | `server/utils/toolNameScan.js` |
| Master export reader | `server/utils/masterExport.js` |
| Firm-facing screens | `components/firm/FirmLogicTables.vue`, `FirmDecisionLogic.vue`, `FirmLogicLab.vue`, `DecisionLogicDiagnostic.vue` |
| Lane classification | `server/utils/contentRouting.js` |

### The two shapes, exactly

| | Node tree | Flat if-then |
|---|---|---|
| Data | `nodes[]` | `branches[]`, `type: "flat_if_then"` |
| Walked by the engine? | **Yes** | **Never** |
| What it produces | client recommendations | Learn-mode reference text |
| Lane | client-recommendation | advisor-read-only |
| How many | 37 | 5 |

### Where a tree's content reaches an advisor

Three routes, and they are not the same: Learn-mode reference, a soft hint during a client
session, and a fallback when scoring produces no candidate. A change to a tree can therefore
affect a screen you were not thinking about.

### Traps that have actually bitten

1. **Filing a table under the wrong shape makes it invisible** — it renders, it saves, it passes
   tests, and it never reaches the decision it was written for. Three assets were found in the
   wrong lane in one week, every one by a person reading code.
2. **Seven advisor-development tables were loaded but reached no consumer** and had been counted
   as empty. "Built and working" was true of the part that had been looked at.
3. **Raw substring counts over tree content are worthless.** A name that appears thirty times is
   usually sitting inside longer names and ordinary prose. Walk the structure instead.
4. **The generated routing report must not be hand-edited** — regenerate it. Its rules live in
   code that the build guard also reads, so the report and the tests cannot disagree.
5. 🔴 **The prompt formatter reads flat rules from `tree.branches` — which is EMPTY on a nodes
   table.** That is why `public_speaking`'s two standing rules reached neither the prompt nor any
   screen for as long as they existed: they sat in `flat_branches`, a third array nothing looked
   at, and no test could name a field nothing named. Fixed 2026-08-16. **A field that appears in
   only one file in the repository — the one that authors it — is unreachable by definition; grep
   for it before assuming it is wired.**
6. 🔴 **"The file reaches the AI" does not mean its contents do.** The thirteen method-guide
   formatters in this file each name their fields by hand, so **116 of 954 authored lines across
   them arrive nowhere** — a field added to a guide after its formatter was written is simply never
   mentioned again. A 4.16-era sweep counted all thirteen as *reaching the prompt* on the strength
   of the formatter existing. **Render the prompt and search it for each authored string**; the
   measurement is at [`../METHOD-GUIDES-SCREEN.md`](../METHOD-GUIDES-SCREEN.md) §2. The fix is one
   walker over each guide's own shape, feeding screen and prompt from the same read.
7. 🔴 **A NOTE ONLY REACHES THE MODEL ONCE THE TREE IS ALREADY OPEN. A TRIGGER IS WHAT OPENS IT.**
   Content moved *into* a tree is not thereby reachable: `notes`, `condition` and `question` are
   read only after the tree has been selected, and selection happens on `entry_triggers`. So
   guidance whose whole value is recognising a situation must be authored in **both** places — the
   explanation in the node, and the words a client would actually say in the triggers.
   **Found when item 4.24 folded the Coaching Reference in (2026-08-20.)** Two of the seven pieces
   were symptom-recognition rather than method: the client's own sentence *"how come I have a big
   tax bill but nothing in the bank?"*, and a pointer to the **7 Cash Drivers** template, which no
   tree named at all. Written as notes alone, the tax-bill sentence would have sat inside
   `working_capital_cycle` and never once caused that tree to open for the conversation it
   describes — content that is live, correct, and unreachable. Both went into
   `entry_triggers` as well.
   **Ask of any content being moved into a tree: does this tell an advisor how to run something
   (a note), or does it tell you that you are IN a situation (a trigger)? If the second, it needs
   both.**

---

## 5. Related briefs

[`advisory-engine.md`](advisory-engine.md) — what walks these trees ·
[`domain-support.md`](domain-support.md) — the other content driver ·
[`firm-manager-hub.md`](firm-manager-hub.md) — where they are edited ·
[`tier-cascade.md`](tier-cascade.md) — how edits inherit.

**History:** [`logic-tables-history.md`](logic-tables-history.md)
