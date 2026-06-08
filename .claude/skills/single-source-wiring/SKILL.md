---
name: single-source-wiring
description: >-
  Use when consolidating duplicated content or config into a single source of truth in this
  content-driven app. Trigger it whenever the same data lives in BOTH code (a hardcoded object,
  array, or constant) AND a data/*.json file, or when adding a new per-domain / per-framework
  field that the engine must read. Produces a provably behaviour-preserving change: the data
  file becomes the single source and code reads from it. Keywords: "wire X to single source",
  "de-duplicate code and JSON", "Option C relocation", "move the map into domains.json",
  "single source of truth", "kill drift". This is the pattern used for Growth Fundamentals,
  the Advisory Staircase, and the 3 Engagement Types.
---

# Single-source wiring

Consolidate a value that currently lives in two places (code + data, or two data files) into
**one** source of truth, and switch the live code to read from it — without changing behaviour.

## Hard rules (inherit from CLAUDE.md — do not override)

- **Governance first.** Follow the 5-step Debugging Protocol and Code Change Governance in
  `CLAUDE.md`: investigate and report freely, but get an explicit "yes" before **every** file
  edit, and propose edits **one at a time**.
- **Stack constraints.** Backend is **CommonJS** (`require` / `module.exports`) and must run on
  **Node 14.15** — no `Array.at()`, `Object.hasOwn()`, or top-level await. Frontend imports the
  JSON normally.
- **Never hand-edit the master `search_content` export.** Its IDs and content are app-generated
  upstream and off-limits (CLAUDE.md). This skill is for design/config data files, not that file.
- **No silent parking / no silent deletion.** When you remove a duplicate, leave an audit record
  (mark a `revisit`/status block "done", or log it) — never just disappear it. Log any deferral
  in `design/ACTIONS.md`.

## Procedure

### 1. Find every copy
Grep for the code constant and the data file. List **every reader** of the value (which modules
import or reference it). You must know all consumers before changing anything.

### 2. Prove current parity (this is the gate)
Show that the copies are **identical today** — same keys, same counts, same values. Print the
tallies (e.g. "5 education / 12 facilitation / 5 advice").
- If they match → there is no current drift; proceed.
- If they **don't** match → STOP. Report the drift and ask which copy is correct. Do **not**
  silently pick one. Reconciling a real disagreement is a separate, approved decision.

### 3. Choose the single source
The **data/*.json file** is the source of truth. If the value is a per-item attribute (per
domain, per step, per type), put it as a **per-item field on that item** so the item's own name
already lives beside it (kills future drift). If it's a single scalar default, put it at the
**top level** of the file, mirroring the existing convention (e.g. `defaultCeiling` in
`advisory-staircase.json`, `defaultEngagement` in `engagement-types.json`).

### 4. Edit the data file first (additive, inert)
Add the new field(s)/default to the JSON. This edit alone changes nothing at runtime because no
code reads it yet. Then **validate**: parse the JSON and re-print the tallies to confirm they
still match step 2 exactly and nothing is missing.

```
node -e "const d=require('./data/<file>.json'); /* assert counts + no missing */"
```

### 5. Switch the code to read from the data file
Replace the hardcoded literal with one **built or read from the JSON**. Keep the **exported
interface identical** (same constant name, same shape) so downstream readers need **no change**.
Prefer Node-14-safe constructs (`reduce`, `find`, arrow functions).

### 6. Remove the duplicate + leave an audit trail
Delete the now-redundant copy. If the data file carried a `revisit`/TODO block describing the
relocation, convert it to a **done record** (status, date, what was wired) rather than deleting
it outright.

### 7. Verify behaviour is unchanged
- Re-derive the built structure in a one-off `node -e` check; spot-check representative values.
- Run the **full test suite**: `npm test` (or `npx jest`). It must stay green.
- Confirm the change is byte-for-byte equivalent in effect (same tallies, same resolved outputs).

### 8. Record and commit
- Mark the task ✅ done in `design/ACTIONS.md`; update any relevant memory file.
- Commit **each consolidation separately** with a message that states it is behaviour-preserving
  and cites the test result. Push only when the user asks.

## Worked references (already in git history)
- **Growth Fundamentals** — `0fa4c21`
- **Advisory Staircase** — `305df42`
- **3 Engagement Types (Option C)** — `888bea3`

Read those diffs for the canonical shape of a correct single-source wiring.
