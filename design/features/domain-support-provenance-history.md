# Domain Support Provenance — the History

> **Read [`domain-support-provenance.md`](domain-support-provenance.md) first.** That page is the
> rules. If the two disagree, **the Brief wins**.

---

## 1. Why this page exists — the question that had never been answered

On 2026-07-31 a fabricated detail was found in the domain-support data: the AIDCRA advertisement
framework expanded as *"Attention, Interest, Desire, Conviction, Response, Action"* when the firm's
own source says *"Credibility, Risk Removal"*. It was corrected in the data the same day.

The correction was real, but a question was left open and stayed open for a fortnight:
**nobody had checked whether it was the only one.** The backlog carried it as item 4.6 —
*measure the blast radius* — with the honest note that it was the one item where the answer was
"we do not know how big it is."

**It got worse before it got better.** The invented wording survived in
[`../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`](../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md) — the document
the sixteen missing Step-by-step cells were to be written *from* — for two weeks after the data was
clean. The fix had been applied where the fault was, and nothing asked where the content had been
copied to.

---

## 2. Two detectors were built, and both were wrong

This is recorded because the failure is more useful than the result.

**The first asked: do this claim's words appear in the firm's documents?** Across 115 business
documents the answer is almost always yes, because the words are ordinary. It reported a clean
sweep of all 140 claims. Run against the known fabrication it scored **88% — sourced**. Run against
a deliberately invented control, *"the 7 Zephyr Pillars (Clarity, Cadence, Candour, Courage,
Contrast, Cohesion, Closure)"*, it scored **67%**. A test that cannot fail is not a test.

**The second required the words to co-occur in one passage.** Much better — the nonsense control
correctly dropped to 22%. But the known fabrication still scored 88%, because it was two substituted
words inside an otherwise faithful claim. **Most of a fabrication is usually true.** A score
threshold therefore separated the one known fault from clean rows by two percentage points, which
is no separation at all.

**The lesson that survived:** the signature of an invention is not a low score, it is *a specific
word that is not there*. The verdict has to key off the missing words, not the total.

**Neither detector was believed until it was calibrated.** Four controls were run every time — the
known fabrication, its corrected form, an invented framework, and a verbatim line from a real
source. The first version failed two of them and its numbers were discarded rather than reported.

---

## 3. The third method, and why it also failed

A row-level check was then built: how much of each row's prose can be found in the firm's documents?
It ranked 157 of 223 rows as "weak" — which, reported as it stood, would have looked like a
catastrophe.

**It was tested against rows known to be faithful** — the Strategic Planning rows transcribed and
reviewed on 2026-07-31. They scored **31% to 70%**, the same band as the "weak" rows.
`strategy-pivot`, the row that actually contained the AIDCRA fabrication and is otherwise
faithful, scored 55%.

**So the detector was measuring how closely the wording copies the source, not whether it is true.**
The material is paraphrased into the firm's voice by design, and to a word-matcher a good paraphrase
and a fabrication are the same thing.

**That negative result is the most valuable output of the whole exercise**, because it settles the
method question: this cannot be automated, and any future attempt to automate it should be run
against these same controls before its numbers are quoted to anybody.

---

## 4. What reading the source actually found

Nine of the thirteen Strategy rows come from `Domain Support/Strategic Planning Support.pdf`. Read
line by line against it:

- **Every fact checked out.** Frameworks, lists, formulas and named authorities all verbatim. The
  AIDCRA row now matches its source exactly, confirming the 2026-07-31 correction was right.
- **Eight of nine rows have exactly the source's step count.** The ninth, Planning Outcomes, went
  from four steps to nine — an honest un-nesting of the source's own sub-bullets, not added content.
- **Nine short clauses across seven rows appear in none of the 115 firm documents.**

The clauses are listed in full in the Brief. They share one shape: a contrastive gloss explaining
why a step matters — *"rather than one large bet"*, *"not judged after it"*, *"rather than staged
ones"*. Two are complete invented sentences. **One per row, steadily, with two rows completely
clean** — a rate that even is a writing habit, not a set of accidents.

---

## 5. The ruling, and the two that were not chosen

Three options were put to the owner on 2026-08-14. **He chose to mark them.**

**Keeping them unmarked** was rejected because it would have meant rewording the never-invent rule
to permit exactly the thing that rule exists to stop, and the one-directional principle applies to
content standards as much as to the stack: the spec is not relaxed to match a drift.

**Removing them** was rejected because most of the clauses are genuine improvements, and deleting
them would have made the sweep look finished while leaving the habit that produced them untouched.
The next row written would have had the same problem.

**Marking them keeps both halves:** the editorial value stays, and the firm's material stays
identifiable as the firm's.

---

## 6. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Are the added clauses acceptable? | **Yes, if marked as ours.** Not deleted, not left silent. | 2026-08-14 |
| Who sees a mark? | **The mentor only.** See §8 — the tiers below cannot act on it. | 2026-08-14 |
| Is `canSeeMarks` a preference? | **No, a trigger.** It widens the day anything drafts material for a firm. | 2026-08-14 |
| Does this relax the never-invent rule? | **No.** Inventing the firm's *method* stays forbidden. | 2026-08-14 |
| May we author a fact about a named framework? | **Never.** That is the AIDCRA failure and is a different class. | 2026-08-14 |
| Can the sweep be automated? | **No — proven, not assumed.** Three detectors, all defeated by paraphrase. | 2026-08-14 |
| Is the fact-level content clean? | **Yes.** 140 of 140 marker-carrying claims verified. | 2026-08-14 |

---

## 7. Where the raw material is

**The sources** are the PDFs in `Domain Support/` (45 of them), `Central Frameworks/` and
`Course Builder Quiz/` — 115 documents in all once converted with `pdftotext`. The Strategy sweep
was read against `Domain Support/Strategic Planning Support.pdf`, 14,640 characters.

**The detectors were scratchpad tools and were not kept.** They are described in §2 and §3 in
enough detail to rebuild, and the four calibration controls are stated there — which is the part
worth keeping. The tools were wrong twice; the controls were what caught it.

**The confirmed fabrication's own record** is in
[`domain-support-history.md`](domain-support-history.md) and the corrected row in
[`../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`](../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md), which names its
old wording so the change is checkable rather than silent.

**Where the earlier record is wrong:** [`../ACTIONS.md`](../ACTIONS.md) and
[`to-do.md`](to-do.md) both described 4.6 as a verification pass of unknown size. It now has a
measured answer for one domain of twenty-nine, and a stated method for the rest.

---

## 8. The second sitting — the note came off three screens the day after it went on

Built on 2026-08-14, the mark was visible at all four tiers: the mentor could create one, the three
manager tiers could read it. The Brief's own §1 justified that — *"a firm manager reviewing the
material has no way to tell which sentences are theirs to change"*.

**The owner asked the question that undid it: if they can see it but not edit it, why are we showing
them?** — with the concern that the hub is becoming overwhelming for an accountant.

**Defending it failed on the code.** The stated case rested on an implied ongoing hazard: AI adding
words to a firm's material, which the firm would want to clean off. No such path exists.
`formatMaterialLines` **reads** this material into a prompt; nothing writes back. The nine clauses
came from *our own transcription sessions*, a development activity, and they stop when the
transcription stops. So for a firm manager the note is a record of finished work — and the first
recommendation given that day, to keep it visible, was withdrawn the same hour.

**Two things were separated in the process, and the distinction is worth keeping.** The mechanism
*is* marketable — *"every sentence an advisor reads is either yours, or labelled as ours"* is a real
claim for a product sold on advice sounding like the advisor. **The manager-screen label is not.**
Same feature; one is a promise, the other is a widget nobody can act on.

**What was accepted in exchange**, stated rather than buried: a firm manager editing a step will not
know a clause was ours, and may adopt it as their firm's wording. That is the same silence §1
objects to. It was judged the smaller cost because the clause is one the owner had already ruled
worth keeping.

**The general test came out of this exchange** and is now
[`product-principles.md`](product-principles.md) — with the exemption that saved the rest of the
mechanism: *invisible plumbing is judged on whether it prevents a fault, not on whether it sells.*
