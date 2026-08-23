# The Education Gate — the Brief

> **When a client cannot read their own numbers, the advisor is asked how to pitch the advice —
> before anything is recommended.** Current rules only.
>
> **Covers:** what the advisor sees, what raises the gate, what the answer changes, and the hub
> tab that makes the wording editable.
> **Does not cover:** the Advisory Staircase itself — the staircase sets the complexity ceiling
> and nothing here touches it. See [`advisory-staircase.md`](advisory-staircase.md).
>
> **The written design is [`../EDUCATION-GATE.md`](../EDUCATION-GATE.md)** and the drawing is
> [`../mockups/education-gate.html`](../mockups/education-gate.html). Where this Brief and that
> document disagree, the document wins.

---

## 1. What it is

An advisor describes a client who is chasing turnover and ignoring margin. Before the engine
recommends anything, it says:

> From what you've described, this client may not yet be comfortable reading their own numbers.
>
> Do you want me to put education first, or show what's technically needed and leave the teaching
> to you?

Whichever the advisor picks, they are told why they were asked, quoting the client's own words
back: *"This came up because you mentioned 'chasing turnover'."*

**The whole design is in the second half of that question.** The gate never decides how to pitch
the advice; it notices something and hands the decision to the advisor, saying plainly that the
teaching stays theirs either way. Mike chose this wording from three drafts on 2026-08-24 for
exactly that reason.

## 2. Why it exists

Advisers were getting advice pitched over a client's head, with nothing in the engine noticing.
Ruled by Mike on 2026-07-16 — a pre-recommendation prompt, the advisor choosing, the reasoning
shown either way.

## 3. 🔴 Three rules, and the item is wrong if any is broken

**1. The gate changes whether the advisor is ASKED. It never changes what the engine SELECTS.**

This is structural rather than promised. The trigger phrases live in a `gateSignals` map that the
scoring registry does not read, so there is no path from the gate to template selection to cut —
it is not a weight of zero that a later maintainer could "fix". A test fails if a wire is ever
added.

Two reasons it has to be that way. The Advisory Staircase's own rule guard puts the education
decision in the acumen lens, never coupled to the staircase or the engagement type. And `pd-35`
already boosts templates for this same idea inside forecasting — a second lever would double-count
it there and change advice nobody asked to change.

**2. The reason line is not decoration.** If the engine cannot name the phrase that triggered it,
the sentence is **dropped**, never softened. A gate that cannot say why it fired should say
nothing rather than something woolly.

**3. It asks once per case.** An advisor is never asked the same question twice.

## 4. What raises it

A `financial_literacy_gap` entry in [`../../data/signal-dictionary.json`](../../data/signal-dictionary.json),
matched against **everything the advisor has typed, in any advisory area**. That "any area" is the
point — see §6.

The triggers live in two places, deliberately:

| Where | What | Who maintains it |
|---|---|---|
| `signal-dictionary.json` → `gateSignals` | regular expressions, covering the many ways a thing gets said | a developer |
| `education-gate.json` → `phrases` | plain text, matched literally | **a mentor, on the screen** |

Both are checked, and the mentor's phrase wins when both match — it is the vocabulary an advisor
recognises, where a regex fragment is not. Neither is generated from the other: a regex a mentor
cannot read is not an edit target, and a plain phrase cannot express `does(n't| not)`.

**The shipped phrases are not new writing.** They are `pd-35`'s six authored triggers, which were
Mike's own content and previously reachable only inside forecasting.

## 5. What the answer does

It sets the **sequencing rule** — `education_first` or `standard` — directly, not by changing the
engagement type. Routing it through engagement type would also move the complexity ceiling and the
template budget as a side effect, and the advisor answered a question about how to *pitch* the
advice, not about what the engagement *is*.

| Answer | Sequencing |
|---|---|
| Education first | `education_first` |
| What's technically needed | `standard` — and this **beats** an engagement type that would have sequenced education first, because the advisor was shown the choice and declined |
| Never asked, or unreadable twice | unchanged — whatever engagement type already decided |

## 6. 🔴 The fault this closed, which was bigger than it looked

The item was carried for a month as *"only the on-screen words are missing"*. It was not a wording
task, and three separate records disagreed about why.

**Three pieces of literacy content existed. None could fire outside one domain, and one of them
could not fire at all:**

| Where | Live? | Scope |
|---|---|---|
| `data/primary-issues.json` | ❌ **read by no code** — its selector left intake on 2026-06-10 | — |
| `pd-35` in `advisory-distinctions.json` | ✅ AI-matched, boost 5 | **forecasting only** |
| `FINANCIAL_FOUNDATIONS_GAP` in `signals.js` | ✅ one intake question | **data-systems only** |
| `signal-dictionary.json` | — | **had no literacy signal at all** |

So a client who plainly could not read their numbers, but came about staffing or profitability,
tripped nothing. That is what "wherever poor financial literacy shows up" (Mike, 2026-08-16) now
means in code.

## 7. The hub tab

An **Education Gate** tab at all four manager tiers, under *Your AI coach*. The mentor authors the
platform default; global group, group and firm inherit it and may override. Advisors and clients
do not get it — they meet the gate in the conversation, and an advisor who could reword the
question could quietly switch it off for themselves.

Three blocks: **the question**, **the two answers** (labels and the acknowledgement each produces),
and **what makes it appear** (the phrase list). Each carries a *Set here* or *Inherited* badge, so
a manager can tell a field that keeps receiving the level above's corrections from one that does
not. Version history and restore come with the storage mechanism.

**The answer *values* are not editable, only their labels.** `education_first` and `technical` are
the contract with the strategy resolver; a renamed button still does what it did, and there is no
third path to add. The backend refuses anything else rather than storing a value nothing
understands.

**Why there is a screen at all:** Mike's binding ruling of 2026-08-16 — content that shapes what
the AI does surfaces on a hub page, mentor first. Wiring the gate in and leaving its wording in a
data file would have made it live and untouchable, which is the exact state the 4.16 sweep found
102 times over.

## 8. What is not proven

**No browser has been driven against the new hub tab.** The suite covers the engine, the routes
and the cascade — 99.5% of statements in the new backend files — but a test suite cannot see
whether a screen looks right. That is a human check, and it has not been done.
