# The Diagnostic Entry block — words the AI is shown

> **Approval artefact. Saved before approval**, per `CLAUDE.md` → Save the Artefact.
> **Screen:** [`mockups/domain-support-diagnostic-entry.html`](mockups/domain-support-diagnostic-entry.html).
> **Item:** 4.16, Phase 1 — [`features/to-do.md`](features/to-do.md).
> **Built under:** the ruling of 2026-08-16 — *"ALL AI fixes must use hub pages where possible,
> starting with the mentor and cascading down as appropriate"* (`CLAUDE.md`;
> [`features/tier-cascade.md`](features/tier-cascade.md) P10).

---

## 1. What is missing, and how it was proved

Every domain-support file carries a `diagnostic_entry` object: an entry question, and beneath it a
set of named branches saying **where to start when the client presents a particular way**.

**65 of those branches, across 20 of the 29 domains, reach no prompt on any path.** Proved by
rendering all three prompt builders for all 29 domains and searching the output for each authored
string — not by reading the code. The method is the one item 4.16 prescribes.

They are invisible on screen as well. The Domain Support tab edits the **materials** table only, so
nobody at any tier has ever been able to see or change them.

---

## 2. The block, exactly as it will render

Worked on the real `governance` domain. **Grey is unchanged; this artefact governs the marked
addition.**

```
## Domain Context — Governance

<overview — unchanged>

**Diagnostic entry point:** Is the governance problem about leadership style and culture
fit, about how the board or leadership team actually makes decisions, or about the gap
between documented governance and how it is practised in reality?

**Where to start, by what the client is presenting:**
- **culture misalignment** — If the presenting issue is team dysfunction, morale, or
  leadership conflict — start with the Leadership Fit audit and the 5 Levels of Team
  Functioning to establish where the team's waterline sits before recommending any
  structural changes.
- **decision quality** — If the presenting issue is poor decisions, recurring mistakes, or
  a sense that the board is not functioning effectively — introduce the psyche errors and
  boardroom manipulation tactics, then apply the 8-step decision quality framework.
- **governance gap** — If governance structures exist on paper but are not being followed —
  the issue is almost always cultural. Written codes, protocols, and tolerances are
  necessary but insufficient without the behavioural commitment to use them.

### <materials — unchanged>
```

### The rules the renderer follows

1. **Order.** The block sits **after** the overview and **before** the materials — deciding *where
   to start* precedes choosing *what to use*. This mirrors how the content was authored.
2. **Nothing is reworded.** The branch text is emitted verbatim. The label is the authored key with
   underscores replaced by spaces — `culture_misalignment` → `culture misalignment`. **No
   capitalisation, no expansion, no invented wording.** A mechanical transform is auditable; a
   rewrite is not.
3. **Every branch goes.** No filtering, no top-N, no "most relevant" guess. This follows the ruling
   already recorded in `domainSupport.js`: matching authored names against session content compared
   two different namespaces and silently briefed the AI on row 1. If a cap is ever needed it must
   **say that it capped**.
4. **One formatter, three paths.** The advisor path, the session briefing and the course-design
   summary render the block through one shared function, so they cannot drift apart.
5. **Fenced when it is not the platform's.** Anything a tier below the mentor authors is wrapped by
   `fenceUntrusted` before it reaches the model, exactly as the overview and materials already are.

---

## 3. 🔴 One change that goes beyond the 65 branches

**The entry question already reaches two of the three paths** — the session briefing and course
design — **but not the advisor path**, which is the main one. Rendering all three through one
formatter fixes that inconsistency as a side effect.

**This is a real change to the live advisor prompt beyond the defect being fixed, and it is named
here rather than slipped in.** If it is not wanted, the shared formatter takes a flag and the
advisor path renders branches only.

---

## 4. Who can edit it

Stated in this change, as P10 requires.

| Tier | Can edit | Why |
|---|---|---|
| Mentor | **Yes — owns it** | Platform advisory content. The mentor authors it; everyone below inherits. |
| Global group manager | Yes | A brand may route its firms differently. Same screen, re-scoped. |
| Group manager | Yes | A country may route differently again. |
| Firm manager | Yes | A firm may know its own client base better than the tier above. |
| Advisor · business entity | No | Neither authors configuration — the advisor is a pass-through, the entity a recipient (`tier-cascade.md` §3). |

**Mechanism: row-level inheritance** (`resolveInheritedRows`), the same one the Advisory Staircase
and the coaching reference use — switch a row off, edit it, reset it, or add your own. An untouched
row keeps receiving the tier above's improvements automatically (`tier-cascade.md` P3).

**Own-row id prefixes stay distinct per tier** — mentor `md-`, global `xd-`, group `gd-`, firm
`fd-` — or one level switching off "its own" row silently drops another's (`tier-cascade.md` §3).

---

## 5. What this phase deliberately excludes

- **`get-team-problem`'s 6 rules.** They sit under a top-level `if_then_logic` key, not
  `diagnostic_entry`, and carry **three** parts — condition, action, context — not two. Same fault,
  different shape. **Excluded rather than bent to fit**, and it stays on 4.16 until done.
- **The logic-tree findings** (13 `stage_entry_question`, 2 `flat_branches`) — Phase 2.
- **The engagement types and the staircase `selectorPrompt`** — Phase 3. Neither has a hub tab
  today, so both need a home decided first.

---

## 6. Open questions for Mike

1. **The two column names.** Proposed: *"When the client presents"* and *"Where to start"*.
2. **The section heading.** Proposed: *"Diagnostic Entry"*, matching the field's name in the data.
   *"Where to start"* is the plainer alternative.
3. **The label style** — see rule 2 above. Nothing has been reworded; confirm that is right.
4. **Whether the entry question should reach the advisor prompt** — see §3.

**None of these are in the build. The build does not start until they are answered.**
