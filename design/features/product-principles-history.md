# Product Principles — the History

> **Read [`product-principles.md`](product-principles.md) first.** That page is the rules. If the
> two disagree, **the Brief wins**.

---

## 1. Where the test came from

**The owner wrote it, on 2026-08-14, in the middle of an argument about something else.**

A note had been built the day before showing which words in the domain-support material were
written by us rather than taken from a firm's own documents. It was visible at all four tiers. He
asked why the three tiers that could only read it were being shown it at all, adding the concern
that matters more than the feature did:

> *"I am worried the app is becoming overwhelming for an accountant or their educators. If they
> don't absolutely need to see it, why are we adding it to their hub pages?"*

That single case was resolved on its own facts — the note was hidden below mentor level. Then he
generalised it, unprompted:

> *"Another 'litmus test' we can apply to all our functions are — is it marketable? — will it help
> us sell the software package, is it a competitive advantage? — if not, it may just be confusing
> clutter."*

**The page exists because the general rule is worth far more than the decision that produced it.**
The marks question would have been answered either way in ten minutes. The test applies to every
screen in the product, forever, and would have caught things that shipped.

---

## 2. The exemption, and why the rule needed one before it could be adopted

Taken literally, *"if it isn't marketable, it's clutter"* deletes the best work in the codebase.
The pre-push hook has never sold anything. Nor has the fencing of firm-authored text before it
reaches a prompt, nor the validation of AI output, nor the guard test that fails the build on an
orphaned mark. All of them are load-bearing and none of them have a surface.

**So the test was accepted with the plumbing exemption attached**, and the sharpened form is the
one on the Brief: *sellable, or plumbing — if it is neither, it goes.* The underlying idea is that
the test is really about **attention**, and a thing with no surface costs none.

This was raised at the moment of adoption rather than discovered later, which is the only reason
the rule could be written as an absolute.

---

## 3. The distinction that saved the mechanism

Applying the test to the provenance work produced a result worth recording, because it looked at
first like the test would condemn the whole feature.

**It doesn't, and the reason is that a promise and a widget are different things.** *"Every
sentence an advisor reads is either yours, or labelled as ours"* is a strong claim for a product
sold on advice sounding like the advisor, and a competitor cannot make it without having done the
same reading. The mechanism is therefore **highly** marketable. The label on a manager's screen is
not, because that manager could do nothing with it.

**Same feature, opposite verdicts, and no contradiction.** This became P4.

---

## 4. What it cost to apply it late

The marks shipped on 2026-08-14 and the display came off the manager tiers the same day, after the
owner asked. Roughly an hour of build, a Brief paragraph, a mockup section and four tests were
written for a display that was then hidden.

**Nothing was wasted in the data layer** — the marks are still stored, still saved and still sent
to the AI, which is exactly the property that made the cut safe. But the screen work was avoidable,
and it was avoidable by asking one question at design time: *who reads this, and what do they do
differently because they read it?*

That is why §3 of the Brief says to ask it before building. It is not a general exhortation; it is
the specific lesson of this one exchange.

---

## 5. The first recommendation was wrong, and how

Asked whether to hide the note, the initial answer was **keep it** — on the strength of a sentence
in the feature's own Brief: *"A firm manager reviewing the material has no way to tell which
sentences are theirs to change."*

**The Brief said it; the code did not support it.** The sentence assumed an ongoing hazard — AI
adding words to a firm's material that the firm would want to clean off. There is no such path.
`formatMaterialLines` reads the material into a prompt and nothing writes back; the clauses came
from our own transcription sessions and stop when transcription stops.

The recommendation was withdrawn within the hour, once the owner asked the question that tested the
premise rather than the conclusion: *is it because AI will add stuff to their words going forward?*

**The lesson is not "the Brief was wrong".** It is that a justification written when a feature is
designed can survive into a state of the world where it is no longer true, and the only defence is
to check it against the code when it is used to defend something. Compare the same failure family
in [`domain-support-history.md`](domain-support-history.md), where a correction was applied to the
data and the document it had been copied to stayed wrong for a fortnight.

---

## 6. Where this page's own sources are

The exchange is in the session record for 2026-08-14 (laptop, session 54). ⚠ **The decision it
produced no longer exists** — the Brief, the mechanism and its test were all deleted on 2026-08-15.

---

## 7. The day after: the test deleted the feature that produced it

**2026-08-15.** Asked why a Client Survey item was on his list, Mike asked the question nobody had
asked in a fortnight: *who requested this feature?* Traced through `ACTIONS.md`, the answer was
**nobody**. The real defect — an acronym expansion invented as *"Conviction, Response"* — was his own
find, corrected by him on 2026-07-31, with the follow-up **deferred in writing**. The line that
spawned everything after it, *"the blast radius was never measured"*, was written by an AI session.
When it was measured, the fact-level result was **clean**.

His ruling, verbatim:

> *"You are the senior software engineer — if it doesn't serve the user, make the system better
> quality or robust, improve marketability — then get it the fuck out of my app."*

And on the offer to park it rather than delete it:

> *"Why would you park them!? That would mean they're still in the system — keep only the work that
> makes a difference and get rid of all the other shit — just wastes my time and causes more
> confusion."*

**Two things this page now records that it could not before.** First, the test has teeth: it
deleted the feature it was born from, one day later, including working tested code. Second,
**hiding was the wrong answer on 2026-08-14** — not wrong on its own terms, but too small. The note
came off three screens and everything behind it stayed: the data, the mechanism, the tests, a Brief,
a mockup and five backlog items, all of which then generated more work. That correction is now in
[`product-principles.md`](product-principles.md) §3. Full record:
[`../ACTIONS.md`](../ACTIONS.md) §authored-commentary-sweep-deleted.
