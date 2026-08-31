# The Adviser Network — the History

> **Read [`adviser-network.md`](adviser-network.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. Where it came from

Collaborate was a **separate repository** — *"a place for advisors to find others to work with
on developing new content"* — built as a standalone sibling of this app **to the same stack
constitution**. That claim was checked rather than believed: the same Nuxt, the same Restify, the
same Node target, the same Vue, the same UI library, the same wording library, the same state
library, the same database driver. Same Pug templates, same Options API, same CommonJS backend.

It also arrived with a **better safety net than this repo had** — 431 tests at 99.72% line
coverage. That is the single biggest reason the merge was realistic: it could be *proven* rather
than hoped.

The owner's ruling that started it: Virt Advisor is the container for three features —
performance reports, the AI section, and Collaborate — and *"the code would then have to be
merged so that when the master coding team are pulling everything through, it all sits neatly."*
**One repo, one pull, one Firm Manager screen.**

---

## 2. The finding that set the size of the job

**The manager page could not come across on its own.**

Its handful of endpoints looked modest, but several are **group** routes, and the page also
reads advisers, the activity feed and the audit log. The tab is a *window onto Collaborate's
people layer*, not a self-contained screen.

So the work was: merge the whole application into this repo, then surface its manager page as a
Hub tab. **Anyone quoting that as "move one component" is wrong by an order of magnitude.** That
was not an argument against doing it — it was the honest scope, stated before starting.

---

## 3. The recommendation that was inverted

The first recommendation — *confine Collaborate's tier levels to its own tab* — was wrong, and
reading the code is what showed it: Collaborate already modelled the whole chain, while this app's
truncated two-level version left the middle tiers nowhere to exist. Confining Collaborate's levels
would have entrenched the missing layers in exactly the screens the cascade was meant to feed.

**The revised recommendation — and the owner's ruling on it:**

> *"Why would you create code that's gonna create a problem further down the track? If you need
> to leave room for the next two layers so that the code doesn't get confused, why would you do a
> shit job and cut it off now? Do it properly."*

The half-measure previously offered — log it for the master team, leave the code narrow — was
withdrawn and is not to be re-proposed.

---

## 4. Why the tab shipped out of order

Slice 4 (the tab) was taken **ahead** of slice 3 (the storage re-key): the console fetches only
the people routes, served from Collaborate's own store, and **never touches the override table**
— the thing that settled it was reading the fetch calls, not the plan's sequence.

✅ **Live-verified by the owner on the running app** — *"collab firm manager page is
in and works great"* — with the single backend confirmed answering both apps' routes from one
process. That is a claim the mocked wiring test could not make.

---

## 5. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| One repo or two? | **One.** One pull for the master team. | 2026-07-30 |
| Whose tier vocabulary? | **Collaborate's** — it is the platform-correct list and already existed, tested. | 2026-07-30 |
| Who implements the hierarchy? | **The master app.** We scope to it; we do not rebuild it. | 2026-07-30 |
| Is view-as a risk? | **Negligible** — the adviser submits their own record and would see a stray entry. | 2026-07-30 |
| Build the middle tiers now or later? | **Now, properly.** No firm-as-top carried forward anywhere. | 2026-07-30 |

**The timing evidence that made it cheap:** there was no data to migrate. Not one override row
existed in any environment, so widening the storage cost a schema edit and nothing else. Once a
real firm authors content against the old shape, the same change becomes a live migration of
their work.

---

## 6. Where the earlier record is wrong

Read 2026-08-13. [`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) is the fullest
account and carries **its own correction box**, which is the honest way to read it:

- Its §4 says documents *"clone down through each level"*; its §4.4 says the merge becomes *"a
  fold over the chain"*. **Those are different architectures.** Neither is the ruled model — see
  [`advisory-distinctions-history.md`](advisory-distinctions-history.md).
- Its §4.4 table says the override table becomes `(scope_level, scope_id, config_key)` with the
  foreign key dropped. **That is not what happened** — reserved scope ids ride the existing
  column, no schema change.
- Slices 3, 5 and 6 are listed as unbuilt. Slice 3 was overtaken by the reserved-row ruling.
- Its §1 gives Collaborate's own repository path and branch state. That repository is no longer
  where this code is maintained.

**Left in place** — a record of its own date, and §2's scope finding and §4.2's evidence are
still the clearest account of what came across.

---

## 7. Where the raw material is

**Permanent companions:**
[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) (read the status box and the §4.4
correction first) · [`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) §5.4 ·
[`../TIER-CASCADE-MAP.md`](../TIER-CASCADE-MAP.md) §3.
