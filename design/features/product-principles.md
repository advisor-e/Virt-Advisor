# Product Principles — the Brief

> **Read this before proposing a feature, a tab, a panel, a badge or a note on a screen.**
> Current rules only.
>
> **Covers:** the tests a thing must pass to earn a place in the product at all.
> **Does not cover:** how anything is built — that is the per-feature Briefs, indexed in
> [`README.md`](README.md).
>
> **History:** [`product-principles-history.md`](product-principles-history.md) — where the test
> came from, and the feature it was first applied to, which it later deleted.

---

## 1. Design philosophy

**The scarcest thing in this product is not screen space. It is the attention of an accountant who
has ten minutes between client meetings.**

Every control, label, badge and note spends a little of it. Most features are judged on whether
they work; the question asked far less often is whether the person looking at them is better off
for their being there. A feature that works perfectly and helps nobody is not neutral — it is a
tax, charged to every user, every time they open the screen.

**The product is also sold, not just used.** The people it must convince are firm owners deciding
whether Advisor-e is worth paying for. Anything on screen that cannot be explained to them in a
sentence is, at best, something they scroll past.

---

## 2. Key principles — the non-negotiables

**P1 · The marketability test. If a user has to look at it, it must be sellable.** Can you name
what it wins them in one sentence you would say to a prospect? Is it something a competitor cannot
easily claim? If the answer to both is no, **it is confusing clutter and it does not ship** —
however well it works, and however much effort it took.

**P2 · Invisible plumbing is exempt, and is judged differently.** Something with no surface costs
no attention, so P1 does not apply to it. Guard tests, the pre-push hook, input fencing before a
prompt, validation of AI output — none of it will ever sell a licence and removing it would cost
the product. **Judge plumbing on whether it prevents a fault.**

**P3 · So the question is: sellable, or plumbing? If it is neither, it goes.** Those are the only
two ways to earn a place. "It's interesting", "it was hard to build", "it documents what we did"
and "it might be useful one day" are not third options.

**P4 · A thing can be sellable as a promise and clutter as a widget.** These are separated, not
confused. The provenance mechanism is a genuine selling point — *"every sentence an advisor reads
is either yours, or labelled as ours"* — while the label on a manager's screen was clutter, because
that manager could do nothing with it. Keeping the first does not oblige you to keep the second.

**P5 · Visibility is per tier, and the test is applied per tier.** A thing can earn its place on
one hub and fail on another. The cascade rule governs *function*, not decoration: hiding a note
from a tier that cannot act on it is not a break in the cascade.

**P6 · When something is cut for clutter, name what is lost.** There is almost always a real cost,
and burying it is how a decision becomes impossible to revisit. Write it into the Brief beside the
rule, in plain terms.

---

## 3. Design considerations

**The test is easiest to fail on things that are true.** The rejected note was accurate, carefully
built and honestly motivated. None of that is the question. *"Who reads this, and what do they do
differently because they read it?"* is the question, and "nothing" is a complete answer.

**Ask it before building, not after.** The cost of applying this test at design time is one
sentence. Applied afterwards it means unpicking work, which is what happened the one time it has
been used in anger.

**Hiding is the smaller cut, and it is not always the right one.** Cutting a display is cheap and
reversible, which makes it safe to apply firmly rather than tentatively. But a hidden mechanism is
still in the codebase, still in the tests, still in the backlog, and still an invitation to finish
it. 🔴 **When the answer to all three questions is no, the thing comes out — code, documents and
tasks together.** Ruled by Mike on 2026-08-15, in the case that produced this page: the note that
was hidden a day earlier was deleted entirely once he asked who had requested it and the answer was
nobody. *"That would mean they're still in the system — keep only the work that makes a difference
and get rid of all the other shit."* Full record:
[`../ACTIONS.md`](../ACTIONS.md) §authored-commentary-sweep-deleted.

**Beware "it needs to be discoverable".** Discoverability is a reason to place a *useful* thing
well. It is not a reason to display a thing that has no use.

---

## 4. For the coder

**Where a visibility decision lives.** In the component, as a named computed with a positive tier
test — `canSeeX () { return this.scope === 'mentor' }`, never `!== 'firm'`. A negative gate answers
*yes* for a tier that does not exist yet ([`tier-cascade.md`](tier-cascade.md) P5).

**A cut made for clutter is pinned by a test, and the test carries the trigger.** Not a comment,
not a to-do — a case that fails if someone widens the gate without meaning to, whose comment says
in plain words what would have to change for widening to be right. ⚠ **This page's worked example
no longer exists**: it was `tests/unit/authoredCommentaryScreen.test.js`, deleted on 2026-08-15
along with the feature it guarded. The rule stands; the next cut of this kind supplies the example.

**Do not fold two questions into one flag** because they happen to have the same answer today. Who
may *see* and who may *do* diverge later, and merging them means the divergence is a rewrite rather
than an edit.

### Applying it — the worked examples so far

| Thing | Verdict | Why |
|---|---|---|
| Commentary marks, mentor screen | **Keep** | The sweep is done here; the mentor acts on them |
| Commentary marks, three manager hubs | **Cut** | Nothing in the app writes into their material, so there is nothing to act on |
| Telling the AI which words were ours | **Keep — plumbing** | No surface; prevents the AI presenting our words as the firm's |
| The guard test on platform marks | **Keep — plumbing** | No surface; fails the build on an orphaned mark |
