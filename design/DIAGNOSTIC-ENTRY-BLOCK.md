# The Diagnostic Entry block — words the AI is shown

> 🔴 **SUPERSEDED — session 63, 2026-08-16 · DO NOT BUILD FROM THIS FILE**
>
> Its **findings** stand: the 65 branches are authored, reach no prompt, and appear on no screen.
> Its **plan** does not. Two of its premises were disproved by the code the day after it was approved:
> the ten "empty" domains each have a live logic tree, so nothing needs authoring; and the branches
> are Logic Tables content, of which **about 55 duplicate the trees already**.
>
> **Build from [`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md) instead.** Why this one was wrong is
> recorded in [`COACHING-REFERENCE-DOMAIN-ROWS.md`](COACHING-REFERENCE-DOMAIN-ROWS.md).
> Kept whole rather than deleted, because the mistake is the reusable part.
>
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

**65 of those branches, across 19 of the 29 domains, reach no prompt on any path.** (A 20th,
`get-team-problem`, carries 6 more of the same kind under a different key — §5.) Proved by
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

## 4. Who can edit it — 🔴 MENTOR ONLY

### Where it lives on screen

**A section inside the existing Domain Support tab — not another page and not another tab.** It
renders in the same panel as the materials table, above it, when a domain is selected from the rail.
Nothing else on the tab moves.

### The tier ruling

> **Mike, 2026-08-16:** *"this looks too technical for a firm or global manager — this looks mentor
> level only."*

| Tier | Sees the section | Why |
|---|---|---|
| Mentor | **Yes — authors it** | Platform advisory content, and the only tier expected to reason about routing logic. |
| Global group manager | No | Ruled too technical for this tier. |
| Group manager | No | Ruled too technical for this tier. |
| Firm manager | No | Ruled too technical for this tier. |
| Advisor · business entity | No | Neither authors configuration — the advisor is a pass-through, the entity a recipient (`tier-cascade.md` §3). |

*(Superseded 2026-08-16, before any code was written. This table first proposed all four managing
tiers editing the block, with row-level inheritance beneath the mentor. Mike ruled it mentor-only on
sight of the mockup. Recorded rather than quietly overwritten, because the first version is what P10
produced by default and the correction is the useful part: **a hub page is the rule; every tier
getting it is not.**)*

**Nothing is being taken away from anyone.** The section does not exist today, so no tier loses a
control it currently has.

### What that means in the code

- **The gate is named positively — `['mentor']` — never `scope !== 'mentor'`.** A negative gate
  answers *yes* for a tier that does not exist yet, and would switch this section on by itself the
  day a new scope appears (`tier-cascade.md` P5; the trap that had already bitten three tabs).
- **`FirmDomainSupport.vue` does not currently know its tier** — it takes only `apiToken`. It gains
  a `scope` prop, passed from `FirmManagerHub.vue` exactly as the hub already passes scope elsewhere.
- **No inheritance machinery is needed for this phase.** With one authoring tier there is nothing to
  cascade, so `resolveInheritedRows`, the per-tier id prefixes and the fencing of lower-tier text are
  all **not built** — and this is recorded so a later session does not read their absence as an
  oversight. If the ruling is ever widened, that is the work it implies.

**Fencing still applies the day a second tier authors here**, and not before: platform content is
repo data and is not fenced, exactly as the platform overview and materials are not.

---

## 5. What this phase deliberately excludes

- **`get-team-problem`'s 6 rules.** They sit under a top-level `if_then_logic` key, not
  `diagnostic_entry`, and carry **three** parts — condition, action, context — not two. Same fault,
  different shape. **Excluded rather than bent to fit**, and it stays on 4.16 until done.
- **The logic-tree findings** (13 `stage_entry_question`, 2 `flat_branches`) — Phase 2.
- **The engagement types and the staircase `selectorPrompt`** — Phase 3. Neither has a hub tab
  today, so both need a home decided first.

---

## 6. Wording — ✅ APPROVED by Mike, 2026-08-16

All four as proposed, unchanged:

1. **Column names** — *"When the client presents"* and *"Where to start"*.
2. **Section heading** — *"Diagnostic Entry"*.
3. **Label style** — the authored key with underscores replaced by spaces. Nothing reworded.
4. **The entry question reaches the advisor prompt too** — the change named in §3 is wanted.

---

## 7. What the mentor edits, and what he is asked to complete

### The editable fields — there are three, and that is all

Per domain, on the section:

| Field | Shape | Count |
|---|---|---|
| **Entry question** | One line of free text | One per domain |
| **When the client presents** | A short label | One per starting point |
| **Where to start** | A paragraph of guidance | One per starting point |

Plus **add a starting point** and **remove one**. Nothing else on the section is editable — the
origin marker is display only.

**How a new row gets its key.** The mentor types the label; the stored key is that label
lower-cased with spaces as underscores (*"Culture misalignment"* → `culture_misalignment`). It is
derived, never typed, and never shown as a second field to fill in. This matches §2 rule 2 in the
other direction: the key and the label are one authored thing, transformed mechanically.

### What he is asked to complete NOW: nothing

**All 19 domains that carry starting points already carry their text.** The section makes existing
content visible and sends it to the AI; it asks for no authoring to work.

### What the section will SHOW him — the honest gaps

| State | Domains | Which |
|---|---|---|
| Question **and** starting points | **19** | The 19 in §4 — 65 starting points, 2 to 6 each, median 3 |
| Question but **no** starting points | **7** | `get-marketing`, `get-positioning`, `get-pricing-proposals`, `get-sales`, `get-sales-tracker`, `get-seminar`, `get-team-problem` |
| **Nothing at all** | **3** | `eoy`, `profit`, `staff` |

Two patterns worth naming rather than leaving him to spot:

- 🔴 **The three carrying nothing are core client-facing domains** — End of Year, Profit and Staff.
  They are among the most-used conversations in the app, and the AI gets no routing for any of them.
- **All seven question-only domains are Get-the-Job** — the advisor's own business development, not
  client work. That they were authored to a shallower depth looks deliberate rather than missed.
  `get-team-problem` is the exception in that group: it *has* six rules, under the different key
  excluded in §5.

**An empty section says so on screen** — *"No starting points set. The AI receives the overview and
materials for this domain, and no routing."* Never a blank panel that reads as broken
(`tier-cascade.md` P8).

### 🔴 RULED BY MIKE, 2026-08-16 — ship it filled

> Asked whether to build now with the ten gaps shown as empty for him to fill whenever, or to write
> End of Year, Profit and Staff first so the section ships with them filled, he chose:
> **"ship it filled with as many sections as possible."**

**The section does not ship with holes in it.** The empty state above is still built — a domain added
later must never render a blank panel — but **it should be reached by as few domains as possible on
the day this lands**, not by ten of twenty-nine.

**The target: all 10.** The three carrying nothing (`eoy`, `profit`, `staff`) are the priority
inside that, because they are core client-facing domains. The seven Get-the-Job domains follow.
**"As many as possible" is the instruction, so any domain left empty at ship time is a fact to
report to him by name — never a silent shortfall** (the no-silent-caps rule).

⚠ **This changes the shape of Phase 1 and its order.** The wiring and the screen are now the
*second* half of the job; **authoring ten domains' routing is the first**, and it is the larger
piece. The two ship together.

🔴 **UNRESOLVED, AND IT IS THE FIRST THING TO SETTLE NEXT SESSION: who drafts the ten.** The three
options, none of them chosen:

1. **Mike authors them.** Most faithful — this is advisory content and he is the mentor. Slowest.
2. **We draft from each domain's own `overview` and `materials`, he approves.** The raw material is
   already in the file, so a draft is a summarising job rather than an inventing one. **Every draft
   must be committed as an artefact before he approves it** (Save the Artefact) — ten domains is ten
   sets of words he has to actually read, and it must not become a rubber stamp.
3. **A mix** — we draft the seven Get-the-Job ones, he writes the three core client-facing ones.

**Do not start drafting before this is answered.** Writing advisory routing text is authoring, and
authoring it unasked would be the same fault as inventing wording — at ten times the scale.

### Going forward — the standing ask

**When a domain is added or reworked, the mentor owes it one entry question and its starting
points.** On today's evidence that is **2 to 6 starting points, most often 3** — a label and a
paragraph each. It belongs in the `add-a-domain` procedure as a named step, so a new domain cannot
quietly arrive with no routing the way `eoy`, `profit` and `staff` did.

**No other tier is ever asked for this** — see §4.
