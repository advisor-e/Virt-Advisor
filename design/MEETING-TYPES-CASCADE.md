# Meeting Types and Observation Points — the full cascade

> **Status: ☐ AWAITING MIKE'S APPROVAL.** Nothing here is built. Written 2026-09-02 on his
> instruction; registered in [`ARTEFACTS.md`](ARTEFACTS.md).
>
> **As a page:** https://claude.ai/code/artifact/d685c390-a0aa-4c67-a85b-ef0654eea7df
>
> **What he asked for, in his own words (2026-09-02):**
>
> > *"the creation of meeting types must be dynamic, editable and cascading from mentor — all
> > down thru the layers until reaching the business entity level"*
>
> and, correcting us the same day:
>
> > *"I NEVER said advisor cant edit at business entity level or advisor level — I said NOBODY
> > can edit a level ABOVE their own."*
>
> Brief: [`features/meeting-review.md`](features/meeting-review.md) P12 and P14.

---

## 1. What changes, in one paragraph

Today the app ships **eleven meeting types that Mike never chose** — a session picked them out
of the coaching trees — and only the four **manager** levels can edit the observation points
inside them. After this change, **the types themselves are content**: the mentor writes them,
every level below may accept, edit, switch off or add its own, and the chain runs all the way
down to **the individual client the meeting is with**.

Two lists cascade instead of one:

| | What it is | Example |
|---|---|---|
| **Meeting types** | The kinds of meeting a firm has | *End of year review*, *First meeting*, *Bad news conversation* |
| **Observation points** | What an advisor is checked on, inside one type | *"I framed the meeting in the first two minutes"* |

Both use the **same** inheritance the app already runs for Advisory Distinctions, the
Staircase and quizzes. Nothing new is invented for the mechanism.

---

## 2. The levels

```
Mentor                    ← writes the platform's types and points
  └─ Global group manager ← a brand may differ
       └─ Group manager   ← a country may differ
            └─ Firm manager
                 └─ Advisor            ← their own standing preferences
                      └─ Business entity   ← this client, this relationship
```

**The top four are built.** The bottom two are not, and there is no storage for them — §5.

**Who may edit: everyone, at their own level and below. Nobody, ever, above.** That is P14 and
it is the only permission rule here. An advisor switching a point off for one client changes
that client's meetings and nothing else. It cannot reach the firm's list, and no route in the
app can express reaching upward — every one is scoped to the caller's own verified identity.

> ⚠ **A correction worth stating once, so it is not re-derived.** Earlier notes in this
> repository claimed advisors were barred from editing on principle. **Mike never said that.**
> Those sentences were ours and are deleted. The advisor and entity levels are simply unbuilt.

---

## 3. What happens to the eleven types that exist

They stay, with their ids unchanged, and they become **the mentor's starting list — yours to
keep, rename or delete.**

Ids never change, because every stored decision and every recorded meeting is keyed to one.
Renaming *"Trial Fit"* to *"First meeting"* changes what everybody reads and breaks nothing.

**Deleting one is different and the design must be explicit:** a type that has meetings
recorded against it is **switched off, never destroyed** — it disappears from the picker and
stays readable on the meetings that used it. A report that cannot say what kind of meeting it
came from is a report nobody can act on.

---

## 4. The one thing that is genuinely new: the link to a coaching tree

Today a meeting type **must** be an id from `data/logic_trees.json`. That rule is deleted — it
was never Mike's, and **nothing in the code depends on it**: checked across all 102 uses, the
type is a key for the points and a name looked up from that file. No report, prompt or recorder
walks a coaching tree from a meeting type.

**Recommendation: keep the link, make it optional.** A type may point at a coaching scenario, or
at nothing. Where it points somewhere, the app can later offer the matching coaching material
next to the meeting; where it does not, the type still works completely. That keeps a real
benefit and drops the constraint.

A new type therefore carries: an **id** (minted), a **name** (authored), an optional **coaching
scenario**, and its **observation points**.

---

## 5. Where the two new levels are stored — and why not the obvious way

Configuration today lives in one table, keyed by `(firm_id, config_key)`, with version history
and restore for free. The four manager levels ride it using reserved ids in the firm column —
`__platform__`, `__global__:<brand>`, `__group__:<brand>:<country>` — each needing its own row
in the `firms` table.

**The obvious extension is wrong.** `firm_id` is a foreign key to `firms`, so a scope id per
advisor and per client would mean inventing a fake firm for every advisor and every client a
firm has. That is thousands of rows that are not firms, and a schema the master team owns.

**Recommendation: keep the advisor's and the entity's decisions inside their own firm's row**,
under two new config keys, each a map keyed by advisor id or client id:

```
meeting-observation-advisor   { advisorId: { typeId: {declines, overrides, own} } }
meeting-observation-entity    { clientId:  { typeId: {declines, overrides, own} } }
```

Three properties come out of that, and all three matter:

- **No schema change**, so nothing waits on the master team.
- **A firm's data stays in the firm's row** — an advisor's tailoring cannot be read by another
  firm, because it is not stored anywhere another firm can address.
- **Version history and restore work unchanged**, because it is the same store.

The cost, stated plainly: history is per firm rather than per advisor, so "who changed this"
is answered at firm granularity. That is acceptable for a preference; it would not be for a
regulated record, and this is not one.

**The client already exists as a record** — `/api/clients` is the firm's register, the list an
advisor picks from at the start of a session. So the bottom of the cascade attaches to
something real, not something to be invented.

---

## 6. What Mike needs to decide

Everything else follows from the rulings already given.

| | Question | Our recommendation |
|---|---|---|
| **D1** | ✅ **RULED BY MIKE, 2026-09-02 — YES.** The advisor gets their own level, separate from the client's: *"how I run my meetings"* and *"how I run meetings with this client"* are both settable. The recommendation was taken as put, with the cost stated at the time — it is a fifth place a point can come from, so **the pre-set must say where each point came from**, or an advisor asking "why is this on my list?" has five candidates and no answer. | *(as recommended)* |
| **D2** | ✅ **RULED BY MIKE, 2026-09-02 — BOTH.** The advisor and the firm manager may each set a client's points. A partner can prepare a difficult client's meeting for a junior, and a firm can handle its awkward relationships consistently whoever walks in. Nothing new is handed to a firm manager, who already sets what every advisor is checked on. ⚠ **The cost, recorded at the time:** the client-level list stops being purely the advisor's own working note, so **the pre-set must name the source of each point** — which D1 already requires. | *(as recommended)* |
| **D3** | ✅ **RULED BY MIKE, 2026-09-02 — THEY STAY AS THEY ARE**, and in his words: *"i change them in mentor mode in uat"*. So the eleven ship unchanged and he renames them on screen rather than in the file. ⚠ **TWO CONSEQUENCES, recorded because they bite quietly.** (a) A mentor edit in UAT is stored in **that environment's database** as a mentor-tier override, never written back to `data/meeting-observations.json` — so a rebuilt UAT, a new demo or a fresh deployment starts from the shipped eleven again. If his names are to be the platform default everywhere, they must eventually be written into the file. (b) The `__platform__` row must exist in that environment's `firms` table before he saves anything, or **the save is refused by the foreign key while the screen reports success** — the fault that ran the mentor's own saves silently broken for weeks (`config/db-schema.sql`, `USER-LEVEL-CASCADE-HANDOVER.md` Part 3). | *(as recommended)* |
| **D4** | ✅ **RULED BY MIKE, 2026-09-02 — THE WHOLE TYPE.** Switching a type off at any level removes it from the picker at that level and below, rather than leaving it present with nothing to check. A type with no points is a dead end an advisor has to learn to ignore. ⚠ It does **not** delete: §3 still holds, so a type with meetings recorded against it stays readable on those meetings. | *(as recommended)* |

---

## 7. How it would be built

Four slices, each shippable and each useful alone. **Nothing starts until the design is
approved.**

1. **Types become data.** The eleven move out of the coaching-tree dependency and carry their
   own names, with the optional link. No new levels yet. Nothing visible changes — which is how
   it should be proven, because it is a change of foundation.
2. **The mentor authors types on screen.** Create, rename, reorder, switch off — the same tab
   that already holds the points.
3. **Types cascade to the four manager levels.** Reuses the mechanism switched on for the points
   on 2026-09-02; the tab already exists at all four.
4. **The advisor and entity levels.** The two new config keys, the advisor's own screen, and
   the per-client tailoring on the pre-set. This is the only slice with new storage in it.

---

## 8. What this does not solve

- **The reference-material join** — the firm's script one tap away from a point, Stage A of the
  approved drawing. Still unbuilt, still the largest single piece of Meeting Review, and
  independent of this.
- **The ten empty types.** Whatever they end up being called, **somebody has to write the
  observation points inside them, and that somebody is Mike.** No amount of cascade machinery
  produces advisory content. This design makes the writing possible at every level; it does not
  do the writing.
- **The manager's half of Meeting Review** — the aggregate, the follow-through check across
  meetings, the transcript-expiry job.
