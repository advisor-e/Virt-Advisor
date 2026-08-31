# The Firm Manager Hub — the History

> **Read [`firm-manager-hub.md`](firm-manager-hub.md) first.** That page is the rules. This page
> is why they exist. If the two disagree, **the Brief wins**.

---

## 1. The fault that survived five written warnings

**A save the database refused was written to a scratch file and reported as saved.**

Every store in this app falls back to a gitignored dev file when a query fails, so the app runs
with no MySQL. Its only test was *"are we not in production?"* — so **any** failure was read as
"there is no database", including one where MySQL was present and had deliberately refused the
write. Reads fell back to the same file, so the screen looked entirely convincing.

**Why it mattered that week, not merely eventually:** UAT is not named exactly `production`. The
master coding team could have exercised the whole cascade, watched it work, and signed it off
having proved nothing — the database never written to, the file gone at the next deploy. **A
false pass is worse than a failure: a failure gets fixed, a false pass gets signed off.**

**The transferable part is how it survived.** It was named as a *hazard* in five separate places
in the backlog and again in the design record, which itself observed it had been "written down
three times". Every one of those describes it as something to avoid **by seeding a `firms` row**.
**Not one logged it as a code defect.** The record kept warning about the symptom while nothing
owned the cause.

> **A hazard repeated in prose is not a task. Only a task gets done.**

Fixed 2026-08-13. The fix discriminates on `sqlState`, which only a live server's rejection
carries — connection failures never have one, and the error `code` cannot be used because both
kinds set it. Fourteen files now ask one helper. ⚠ **It has not been proven against a real
MySQL**, because there is none on this machine; it is evidenced by tests against a constructed
foreign-key error. Worth five minutes the first time the master team has a database in front of
them.

---

## 2. The gate written as a negative

Three tabs were gated on `scope !== 'mentor'`, written when *firm* and *mentor* were the only
two scopes that existed. The moment a third appeared, that condition would be **true** for it —
so Team Progress and Team Case Studies would have switched themselves on at the new tiers, while
Advisory Distinctions, gated on `scope === 'firm'`, would have **vanished** from them.

**Nothing would have errored and no test would have failed**, because no test can assert what a
scope that does not yet exist should show.

Replaced by one matrix that names every tier positively. Now, adding a fifth scope shows up as a
tab that is *missing* — visible — rather than one that appears uninvited. → Brief **P2**.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Separate screens per tier? | **No.** One screen, re-scoped. | 2026-07-30 |
| Templates & Videos tab? | **Dormant.** Templates are Advisor-e's whole lifecycle. | 2026-07-27 |
| Which distinctions flavour do the middle tiers get? | **The firm flavour** — they have a layer above them. | 2026-08-10 |
| Does Template Check roll up? | **No — mentor only.** The one named exception, narrowed by the owner himself. | 2026-08-11 |
| Storage key for a tier's overrides? | **Reserved scope ids on the existing `firm_id` column.** No schema change. | 2026-08-09 |
| Is a firm's edit protected from a later mentor edit? | **Yes — firm customisation wins and sticks.** | locked |
| When a mentor deletes a row a firm customised? | **Keep theirs.** The firm's version is promoted to a standalone firm-own row. | 2026-06-27 |

### The "+3" that was a "+2"

A wrong tab-count was carried unchanged through session notes and corrected only when someone
opened the approved mockup and put it beside the code — the Save-the-Artefact rule doing its job.

---

## 4. Where the earlier record is wrong

Read 2026-08-13. **Left in place** — records of their own date:

- `COLLABORATE-MERGE-PLAN.md` §4.4 says `firm_framework_versions` becomes keyed
  `(scope_level, scope_id, config_key)` with the `firms` foreign key dropped. **That is not what
  happened.** The reserved-scope-id ruling kept the existing column and needed no schema change.
- `virt-advisor-system-design.md` §11.1 describes access control as reading role and token from
  `localStorage`. Identity now comes from a verified JWT, and the routes take it from there.
- `ADVISOR-E-DESIGN-LOGIC.md` §7 lists *"the two middle-tier hub pages are designed and approved
  but not built"* and *"the tab gates must be rewritten"*. **Both are now done.**

---

## 5. Where the raw material is

**Permanent companions:** [`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §5.1
(the tab table and the gate trap) · [`../TIER-CASCADE-MAP.md`](../TIER-CASCADE-MAP.md) ·
[`../FIRM-EDITABLE-TABLES-PLAN.md`](../FIRM-EDITABLE-TABLES-PLAN.md) ·
[`../MENTOR-SAVE-SCOPE-PLAN.md`](../MENTOR-SAVE-SCOPE-PLAN.md) ·
[`../MENTOR-HUB-CONSOLIDATED-NOTES.md`](../MENTOR-HUB-CONSOLIDATED-NOTES.md) ·
[`../MENTOR-AI-HUB-STUB.md`](../MENTOR-AI-HUB-STUB.md).

**Artefacts — keep on file:** `mockups/tier-hub-pages.html` (the two middle-tier hubs, approved
2026-08-10) · `mockups/mentor-adoption-view.html`.

**The skill:** `firm-manager-edit-target` — the recipe for bringing a new block under no-code
firm editing, reusing the overlay mechanism and the authorisation guard.
