# The Education Gate — the History

> Why the Brief says what it says. **If this and [`education-gate.md`](education-gate.md)
> disagree, the page above wins.**

---

## 2026-08-24 · Built in one session, after a month of not being built

**Mike:** *"get 2.9 done now please."*

### It was never a wording task, and the list said it was for eight days

The item had been carried for a month as *"only the on-screen words are missing"*. On 2026-08-16
Mike rescoped it — asked whether the gate should fire **wherever poor financial literacy shows up**
or **only where the app can already see it**, he chose *"wherever it shows up"* — and §4 of the
to-do page was rewritten to say so, in terms, including that the wording question **must not be
re-asked**.

[`to-do-items.json`](to-do-items.json), which the ranked table is *generated from*, was not
touched. It kept `waitingOn: "Mike"` and kept the exact sentence §4 calls wrong.

**On 2026-08-24 that worked as designed and produced the wrong outcome.** A `/startup` session read
the generated table, told Mike 2.9 was *"waiting on you — a five-minute wording answer"*, and he
picked it on that basis.

🔴 **Why no test caught it.** `applyToDo.test.js` guards the **table** against the **JSON**, and
`npm run to-do` regenerates one from the other, so those two can never drift. **Nothing compares
either to the hand-written prose on the same page** — and the prose is where the ruling lives. The
drift landed exactly in the unguarded gap. ⚠ **The generated table is the front door and is
therefore the most dangerous place for a stale field:** a reader who trusts it never reaches the
section that corrects it.

### And the correction was wrong twice before it was right

Checking §4's own findings against the code found a second fault, and then a third:

1. §4 said the literacy signal *"sits under forecasting in `primary-issues.json`"*. **That file is
   read by no code at all** — its selector left intake on 2026-06-10, and
   `virt-advisor-registry.md` already said *"⚠ no code reads it"*. So the signal fired in **no**
   domain, not one of eight.
2. The first correction replaced that with `FINANCIAL_FOUNDATIONS_GAP` in `signals.js` and called
   it *the* live literacy signal. **There are two.** `pd-35` in `advisory-distinctions.json` is
   live, AI-classified, boosted, and scoped to **forecasting** — and it carries the exact
   description §4 had quoted. It was the content the entry meant all along.
3. So the original sentence was right about the *behaviour* and wrong about the *file*, and the
   first correction was right about the file and wrong about the *count*.

Both wrong versions are struck through on the page rather than rewritten. **An incomplete
correction is how the original error survived a month**, and it very nearly did so again the same
afternoon.

### The mechanism the old note said did not exist had been there all along

§4 recorded, as a reason the work could not start, that the ruling modelled the gate on *"the
existing outside-your-range pattern"* which **had never been built** — so there was *"no working
screen to take the shape from"*, and the domain-independent signal *"has to be designed"*.

Neither was true by the time anyone looked:

- `advisorEngine.js` has a **question queue** where every entry may declare `skip()`. One entry at
  the end of it, after every domain question and before recommendations, **is** a
  pre-recommendation prompt. The note had been looking for a screen.
- `signals.js` already opens with a **domain-independent "Client signals" block** sitting above the
  per-domain blocks. The shape existed; nothing had to be invented.

**The transferable part:** an item's stated blocker is a claim about the code, and claims about the
code go stale. This one made the work look like a design exercise for a month when it was an
afternoon's build.

### The wording, and why this draft

Three drafts were put to Mike side by side. He chose the one that names the observation plainly and
then **offers to hand the teaching back**:

> Do you want me to put education first, or show what's technically needed and leave the teaching
> to you?

The rejected two either quoted the triggering phrase inside the question or cut it to two neutral
lines. The chosen one carries the whole design intent: the gate notices, the advisor decides, and
the advisor is told in the same breath that it stays their call.

That choice moved where the reasoning goes. The 2026-07-16 ruling requires *"the reasoning shown
either way"*, and this wording carries no evidence in the question — so the reason belongs in the
**acknowledgement after the answer**, on both branches. It is written as its own SSE delta rather
than asked of the model, because a model asked nicely to open with a sentence is a model that
sometimes does not.

### ⚠ The artefact was saved AFTER the approval, not before

The wording was approved from previews rendered in chat, and `EDUCATION-GATE.md` and
`mockups/education-gate.html` were written immediately afterwards. **That is the
`save-the-artefact` rule half-met**, and it is recorded here and on the design document rather
than smoothed over. What the rule protects — a checkable original that outlives the conversation —
exists from that point on, but it did not exist at the moment of approval, which is the moment the
rule names.

### The guarantee that took the most care

**The gate must not change which templates are recommended.** Two reasons: the staircase's own rule
guard keeps this decision in the acumen lens, and `pd-35` **already** boosts templates for the same
idea inside forecasting, so a second lever would double-count it there and change live advice
nobody asked to change.

The obvious implementation — put the phrases in the dictionary's `signals` map with no domain
scope, so scoring weights them zero — was rejected. A weight of zero is a thing a later maintainer
reads as a bug and fixes. Instead the phrases live in a **separate `gateSignals` map that
`SIGNAL_REGISTRY` does not read**, so there is no wire to template selection to cut, and a test
pins the registry to exactly the scoring map's keys. The guarantee is structural rather than
promised.

### What shipped, and what did not

Green: 6,212 tests / 331 suites, lint 0 errors, 99.5% of statements and 100% of functions in the
new backend files.

⚠ **No browser was driven against the new hub tab.** The suite cannot see whether a screen looks
right. That check is a person's, and it has not been done.
