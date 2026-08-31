# Advisory Distinctions — the History

> **Read [`advisory-distinctions.md`](advisory-distinctions.md) first.** That page is the rules.
> If the two disagree, **the Brief wins**.

---

## 1. Why this feature matters more than its size suggests

It was designed as a table in a hub — and it ended up defining how the whole platform inherits.

The question the platform was stuck on was whether a level **clones** the level above's
configuration or **layers** on top of it — different architectures hiding behind one loose word,
and the owner caught the difference.

**The ruled answer was neither, and it already existed here.** A row nobody has touched stays
current with the level above's edits automatically; any row a level *has* edited is protected,
with the update **offered** rather than applied. Clone-like protection where somebody made a
decision, automatic freshness where they did not.

Ruled the same day: **that mechanism becomes the single one used everywhere** — Domain Support,
Logic Tables, Quizzes, the Staircase and the coaching reference all come up to it. And the
sequencing reversed with it: unify the mechanism at two levels first, then add the middle levels
once, **because extending one mechanism to five levels beats extending seven and merging them
later.**

---

## 2. The bug that proved the feature was unreachable

**A firm's distinction never surfaced to its own advisors, and the reason was three lines away
from the feature.**

The advisor page derived the firm identity from the **URL query only**. With no `?firmId=` in the
address — which is to say, always, in normal use — it was null, so the code path that loads a
firm's rows was skipped entirely. The firm side of the feature had been built, tested and
shipped, and no advisor had ever received a row from it.

Closed by putting the advisor route behind token authentication: identity comes from the verified
token, and any ids in the request body are ignored — which closed an authorisation hole in the
same change.

**The transferable part:** the feature worked. Its *reachability* did not, and nothing in the
feature's own tests could see that.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Opt-in or opt-out for a mentor row? | **On by default.** Live for every firm immediately. | 2026-06-16 |
| Whose choice wins? | **The firm's.** Customisation wins and sticks. | 2026-06-16 |
| What happens when the mentor deletes a customised row? | **Keep theirs** — promote to a standalone firm-own row. A firm never loses its work because the mentor removed the original. | 2026-06-27 |
| Adopt: whole-row or field-by-field? | **Whole-row first.** Cherry-picking is a later refinement. | 2026-06-27 |
| Does the mentor get a screen, or keep editing a file by hand? | **A screen** — the firm's screen, one level up, in plain-CRUD mode. | 2026-06-27 |
| Where do mentor rows live? | **The shared overlay store** under a reserved scope — version history and restore for free, no new table. | 2026-06-27 |

---

## 4. The subtle piece, recorded because it will be re-derived otherwise

**An override stores only the fields that were edited.** The resolver spreads the level above's
row and then the edit over it, so unedited fields keep tracking the level above **live, per
field, not per row**. That is a good property and it creates one problem: there is no record of
how the row above looked when the edit was made, so nothing can detect that it has since
changed.

The fix is a **stamped baseline** at override time — a content signature. Current row ≠ stamped
baseline shows the badge. It is the one genuinely new piece of machinery in the whole cascade,
and it only became cheap once mentor authoring rode the versioned store.

A complementary notice covers the other case: a row a level has *not* overridden changes
automatically, so the level is told "this changed since your last visit" rather than being left
to notice.

---

## 5. Where the earlier record is wrong

Read 2026-08-13. **Left in place** — records of their own date:

- `virt-advisor-system-design.md` §11.3 says *"Designed 2026-06-04. Not yet built."* It is built,
  cascaded, given a mentor authoring screen, and extended to five levels.
- The same section proposes **two new database tables**, `platform_distinctions` and
  `firm_distinctions`. Neither was created — the feature rides the shared overlay store, which is
  why it has version history.
- `DISTINCTIONS-CASCADE-PLAN.md` describes **three** tiers. There are six levels, four of which
  can hold configuration.
- The same plan's §2 says advisors don't receive firm distinctions at all. That was the bug in
  §2 above, and it is closed.

---

## 6. Where the raw material is

**Permanent companions:**
[`../DISTINCTIONS-CASCADE-PLAN.md`](../DISTINCTIONS-CASCADE-PLAN.md) (the staged build, and §6 on
the mentor authoring surface — still the fullest account of the mechanism) ·
[`../virt-advisor-system-design.md`](../virt-advisor-system-design.md) §11.3 (what a distinction
*is*, with the owner's own example rows) ·
[`../WORDING-DISTINCTION-AI-FAILURE.md`](../WORDING-DISTINCTION-AI-FAILURE.md) (approved failure
copy) · [`../CONTENT-ROUTING.md`](../CONTENT-ROUTING.md) (**generated** — shows all 67
distinctions as client-recommendation assets, with the boost and template count each carries) ·
[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) §4.4 (the correction box where
this mechanism was ruled the single one).
