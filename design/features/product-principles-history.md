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

## 4. The first recommendation was wrong, and how

Asked whether to hide the note, the initial answer was **keep it** — on the strength of a sentence
in the feature's own Brief that the code did not support. It was withdrawn within the hour, once
the owner asked the question that tested the premise rather than the conclusion: *is it because AI
will add stuff to their words going forward?* **The lesson:** a justification written when a
feature is designed can survive into a state of the world where it is no longer true — check it
against the code whenever it is used to defend something.

---

## 5. The day after: the test deleted the feature that produced it

**2026-08-15.** Asked why a Client Survey item was on his list, Mike asked the question nobody had
asked in a fortnight: *who requested this feature?* Traced through `ACTIONS.md`, the answer was
**nobody** — and the Brief, the mechanism and its test were all deleted that day.

His ruling, verbatim:

> *"You are the senior software engineer — if it doesn't serve the user, make the system better
> quality or robust, improve marketability — then get it the fuck out of my app."*

And on the offer to park it rather than delete it:

> *"Why would you park them!? That would mean they're still in the system — keep only the work that
> makes a difference and get rid of all the other shit — just wastes my time and causes more
> confusion."*

Two facts follow. First, the test has teeth: it deleted the feature it was born from, one day
later, including working tested code. Second, **hiding was the wrong answer on 2026-08-14** — too
small; everything behind the hidden note stayed and generated more work. That correction is now in
[`product-principles.md`](product-principles.md) §3. Full record:
[`../ACTIONS.md`](../ACTIONS.md) §authored-commentary-sweep-deleted.
