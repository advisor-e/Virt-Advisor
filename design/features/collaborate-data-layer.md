# The People Data Layer — the Brief

> **Read this before connecting a database to the people layer, or adding anything that reads
> advisers.** Current rules only. The history is in
> [`collaborate-data-layer-history.md`](collaborate-data-layer-history.md).
>
> **Covers:** the single data-access layer behind advisers, groups and messaging, and the seams
> the master team will replace. **Does not cover:** the screens above it
> ([`adviser-network.md`](adviser-network.md), [`collaborate-groups.md`](collaborate-groups.md)).

---

## 1. Design philosophy

**One file to change to connect the database.**

The whole people layer runs through a single data-access module. Every function is already
`async`, every one carries a note naming the query that replaces it, and the routes and screens
above are written only against its function names and return shapes. Swapping the in-memory body
for a real query is meant to be a drop-in edit, function by function, with **nothing above it
changing.**

That is not tidiness. This app is handed to a master coding team who did not write it, and the
value of the seam is that they can find it, understand what each function is *for*, and replace
it incrementally rather than reading the whole application first.

**The second idea: know what is ours to store.** An adviser's identity — who they are, where they
work, how to reach them — belongs to Advisor-e. What belongs here is what they advertise about
their advisory practice. Storing a copy of the first creates a second, drifting record of
something we do not own.

---

## 2. Key principles — the non-negotiables

**P1 · There is ONE database pool for the whole app.** Two pools onto the same database is a
latent bug. The correct one is named in the module's own comment.

**P2 · Keep function names, parameters and return shapes identical when wiring SQL.** That is the
entire contract that lets everything above stay untouched.

**P3 · Every replaced function is wrapped in try/catch and returns a safe error** — a code and a
message, never a stack trace, a file path or a raw database error. Log the detail server-side.

**P4 · Advisor identity is read from Advisor-e, not stored here.** This app's tables hold the
advertised fields only, joined to identity at read time.

**P5 · The role resolver is an authorisation surface**, not a lookup. It is pure, re-evaluated
server-side on every request, and never trusted from the client.

**P6 · The interim role-override table is admin-only and must never let a user promote
themselves.** It is scaffolding until the master app's role claim is wired.

**P7 · The ownership classifier reads the catalogue's page id; it never edits the catalogue.**
It is a separate layer keyed by that id.

---

## 3. Design considerations

**In-memory means it resets on restart.** Every group, thread and membership is gone when the
process stops. That is fine for development and it is why nothing in this layer has ever been
proven against real data — say so rather than reporting the feature as working.

**Two half-built data layers met in the merge**, and neither had a real database: this app uses
MySQL with a file fallback, the people layer is in memory. **Reconciling them is a known,
unstarted piece of work.** It is best done knowingly rather than by accident, which is precisely
why it was written down as its own slice rather than folded into another.

**The seam notes are the specification.** Each function's comment names the query that should
replace it. Treat those notes as part of the deliverable — if you change a function's behaviour,
the note has to move with it, or the master team implements the old intent.

**Three seams are marked for replacement, not just one:** the data access itself, the role and
tier resolver, and the ownership classifier. Each has a header block written for whoever picks it
up, and each keeps its return shape deliberately stable.

---

## 4. For the coder

### Where things live

| Piece | Path | What it is |
|---|---|---|
| The data layer | `server/collaborate/data/repository.js` | The only file to change to connect MySQL |
| Role / tier resolver | `server/collaborate/data/roles.js` | The authorisation seam |
| Ownership classifier | `server/collaborate/data/ipClassification.js` | Tier and lock, keyed by page id |
| Audit log | `server/collaborate/data/auditLog.js` | Scoped activity record |
| Dev store | `server/collaborate/data/devStore.js` | The in-memory backing |
| Tool catalogue | `server/collaborate/data/advisoryTemplates.js` | |
| Error shape | `server/collaborate/utils/sendError.js` | |
| Production guards | `server/collaborate/utils/productionGuard.js` | Startup checks that refuse unsafe production config |
| The one pool | `server/utils/db.js` | |
| Schema | `config/db-schema.sql` | |

### Where the tier comes from

A hybrid, by owner decision: **firm** from the advisor's branch, **group** from their country,
and the **manager and mentor designations** from the role claim in the login token — with the
interim override table standing in until that claim is wired. Unknown resolves to `advisor`.

### Traps that have actually bitten

1. **A second connection pool.** Deleted. The commented-out require in the data layer points at
   the surviving one — uncomment *that*, not a new one.
2. **The `group` table is a special interest group, not a management tier.**
3. **Identity fields drifting.** Anything read from Advisor-e must not be written back here.

### Known state and open work

The people layer is in memory and resets on restart. Reconciling it with this app's
MySQL-with-fallback model is unstarted and unapproved.

⚠ **This brief used to end with a second open item — "the standalone app's own handover documents
still describe a separate application". It was wrong and it is withdrawn (2026-08-21.)** The two
documents it meant, Collaborate's `START-HERE.md` and `HANDOVER.md`, **have never existed in this
repository**: `git log --all` finds no history for either name, added or deleted. The merge brought
the code (`server/collaborate/`, `mixins/collaborate/`), not those files. The documents the master
team actually receives — [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md) and
[`../HANDOFF.md`](../HANDOFF.md) — already describe a section of this app, not a separate one.
The remaining "standalone" wording in [`collaborate-data-layer-history.md`](collaborate-data-layer-history.md),
[`adviser-network-history.md`](adviser-network-history.md) and
[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) is **past tense and correct** —
it describes what Collaborate was before the merge, and must not be "corrected".

🔴 **Why this is written out rather than deleted.** A brief is a ruleset, so a claim sitting in one
is read as true and acted on. This one survived from 2026-07 to 2026-08-21 and became to-do item
4.12 — ranked first on the live list — before anyone checked whether the files it named were
there. Deleting the sentence would leave the next session free to re-derive it from the merge plan.

---

## 5. Related briefs

[`adviser-network.md`](adviser-network.md) · [`collaborate-groups.md`](collaborate-groups.md) ·
[`tier-cascade.md`](tier-cascade.md) · [`firm-manager-hub.md`](firm-manager-hub.md) — whose
overlay store has the same "no real database yet" position.

**History:** [`collaborate-data-layer-history.md`](collaborate-data-layer-history.md)
