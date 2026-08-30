# Domain Support — the History

> **Read [`domain-support.md`](domain-support.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. The fabrication, and why it is the defining story of this material

**An invented detail was found living in the domain-support data, presented as the firm's own
material.**

One framework's row expanded an acronym into terms that were not the framework's terms. It read
perfectly plausibly. It had been in the data, in front of the AI, for an unknown length of time.

It was corrected on 2026-07-31, and the corrected version is now consistent across every data
file. **What has never been done is measure the blast radius** — no sweep has checked the other
rows for the same class of invention. That remains the open task, and it is a verification pass
rather than a fix.

Two things about it are worth more than the instance itself:

**It was reported as the app's top open defect three days after it had been fixed.** That is the
single clearest illustration of why a 6,000-line backlog cannot be trusted as a status report.

✅ **One copy of the invented version outlived the fix by a fortnight, in the document you would
work from.** `DOMAIN-SUPPORT-REVIEW-CHECKLIST.md` still described that framework using the
**fabricated** expansion — every data file carried the correction; the checklist did not. Anyone
filling in that row's missing steps from the checklist would have re-introduced the invention,
into the exact field the fabrication rule exists to protect. **Found and corrected 2026-08-13,
with the old wording named in the row so the correction is checkable.**

**Why it survived is the transferable part.** The fix was applied where the fault *was* — the
data — and nothing asked where else that content had been copied to. A correction is not complete
until every copy of the wrong thing is found, and prose copies are exactly the ones nothing
tests.

---

## 2. Why sixteen cells were deliberately left blank

The source behind one advisory area is a bare index table — it carries a summary and a benefit
for each framework and **no method at all**.

Writing steps into those rows would have meant inventing the firm's material. So the summary and
the who-and-when were written for every row, the source page was named, and **the steps were left
empty for the owner to fill.**

That is the rule working as intended, and it is worth stating plainly because sixteen blanks look
like unfinished work: **an empty cell is honest, a plausible one is a fabrication.** No other area
has a single blank row.

---

## 3. Two rows nobody can source

Two rows in one area carry a full summary, who-and-when and steps — and **no source document sits
behind either one.** They are live engine content today, which is exactly why they were carried
across rather than quietly deleted.

Whether they belong is an open question for the owner. ⚠ One of them is easily confused with a
differently-named item in the same area, so the two must not be conflated when deciding.

**A separate claim about four similar unsourced rows in another area could not be confirmed from
the data**, because there is no field recording where a row came from. It exists only in written
notes. It is recorded as unconfirmed rather than repeated as fact.

---

## 4. What briefing material is not

The line that this material **briefs the AI and selects nothing** was ruled explicitly, and it
matters because the intuition runs the other way: this is the richest content in the app, so it
feels as though it should influence what gets recommended.

It does not. Selection is the resolver, the logic tables and the distinctions, and **none of them
read these files.** A lane is not a quality mark — this material is doing its job by not
selecting.

The related rule at the other end of the pipeline: the AI is briefed with this material but must
not present it as something the advisor was handed. **Invented quotations are a known failure
mode**, with a watch that flags spans not found in the reference or the conversation. It fired
twice in a live thread and both detections were correct.

---

## 5. Decisions taken and closed — do not reopen

| Decision | Ruling |
|---|---|
| Do these files select templates? | **No.** They brief the AI only. |
| What happens when a source has no method? | **Leave it blank** for the owner. Never invent. |
| Are firm edits trusted? | **No.** Fenced before reaching a prompt. |
| How do overrides merge? | **Sparse, per field** — except arrays, which replace wholesale. |
| Can one firm's edits reach another? | **Never.** Only the base is cached. |
| What about rows with no source? | **Open** — keep or delete is the owner's call, not a tidy-up. |
| How often does Learning Psychology reach the AI? | **On the learn path only** — Mike, 2026-08-25 (4.38). |
| Which copy of the five drivers is the source? | **Learning Psychology** — Mike, 2026-08-25 (4.37). |

---

## 5b. What the Brief said before 2026-08-25, and why it no longer says it

Both passages below were **warnings that a decision had not been taken**. Both decisions were
taken on 2026-08-25, so the warnings became false and were replaced in the Brief rather than
left standing beneath the new text. They are kept here because a warning that was true for a
year explains why the code looks as it does.

**On how far Learning Psychology reaches** — the Brief carried:

> ⚠ **Where else it should go is an open decision for Mike**, recorded rather than defaulted.

Ruled 2026-08-25: leave it on the learn path. It had been left off the default when the page
shipped on 2026-08-23 **without anyone choosing it** — an accidental setting, not a decision,
which is the only reason it was ever an item.

**On the five drivers being written down twice** — the Brief carried:

> ⚠ **Known duplication, recorded so it cannot drift quietly.** Learning Psychology’s five
> drivers are also defined in `data/staff-domain-support.json`, in the *"5 Drivers of Human
> Output — Performance Diagnosis"* row, where they serve a diagnosis of which driver is failing.
> Learning Psychology carries the source definitions that row paraphrases. Reconciling the two is
> its own change and needs Mike’s call.

That is a fair description of the fault: two copies, different words, different names
(`Mindset` against `Mind Set (mental state / attitude)`), both reaching the AI on different
occasions. Recording it stopped it being forgotten but did not stop it being possible. It is now
one copy, read from the guide at prompt-build time — see the Brief.

---

## 6. Where the earlier record is wrong

Read 2026-08-13:

- ✅ **`DOMAIN-SUPPORT-REVIEW-CHECKLIST.md` carried the fabricated acronym expansion until
  2026-08-13** — see §1; corrected in place, with the old wording named so the change is
  checkable. It is otherwise the best account of exactly which rows need attention, and it was
  derived from the data files rather than from anyone's notes, which is why its counts can be
  trusted.
- `virt-advisor-system-design.md` §2.4 describes these files accurately but its build-status
  table predates several features.
- `ACTIONS.md` carries the fabrication entry with its own correction stacked on top — the
  original wording is preserved beneath a note saying the confirmed instance is fixed. Read the
  top of the entry, not the bottom.

---

## 7. Where the raw material is

**Permanent companions:**
[`../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`](../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md) (which rows need
the owner's eye — ⚠ see §1 before using it) ·
[`../CONTENT-ROUTING.md`](../CONTENT-ROUTING.md) (**generated** — all 29 files classified as
AI-briefing, with material counts) ·
[`../FIRM-EDITABLE-TABLES-PLAN.md`](../FIRM-EDITABLE-TABLES-PLAN.md) §3 (the firm-aware merge) ·
[`../STAGE-2-DUE-DILIGENCE-HARVEST-DRAFT.md`](../STAGE-2-DUE-DILIGENCE-HARVEST-DRAFT.md).

**The skill:** `add-a-domain` — the recipe for adding or configuring an advisory area, covering
the companion files and the code paths that carry hardcoded lists.
