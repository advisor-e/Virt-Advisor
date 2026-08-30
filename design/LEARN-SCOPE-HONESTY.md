# Learn-mode scope honesty — the exact wording, for approval

> **Status: APPROVED by Mike 2026-08-25. BUILT the same day — see §3a for the three
> differences between the approved block and the one that shipped, each named rather
> than absorbed.** This file exists so the wording below is a thing that can be
> re-opened, not an event someone remembers. It is the artefact for to-do item
> **4.18 — "The AI invents advice when it is routed to the wrong method"**, and it was
> committed *before* approval (`5776ab3`) under the Save-the-Artefact rule in `CLAUDE.md`.
>
> **The item is NOT closed.** §9 is why: the tests prove the block reaches the model and
> no test can prove the model obeys it.
>
> Built in: `server/utils/logicTrees.js` (`formatCoachingScopeForPrompt`,
> `coachingGuides`, and the call inside `buildLearnReferenceText`) ·
> `tests/unit/coachingScope.test.js`.

---

## 1 · What this fixes, in one paragraph

An advisor asked a Dashboard Discussions question. The engine loaded the **Ratio Analysis**
coaching guide instead. The AI then produced its own *tactical options* and *discussion
questions* for the metric rather than saying it had none.

Those two things were not a garble of Mike's material. They were written by the model.
`tactical_options` and `discussion_questions` exist in exactly **one** file in this
repository — `data/dashboard-discussions-reference.json` — and that file was not in the
conversation. Verified 2026-08-25:

```
$ grep -l "tactical_options\|discussion_questions" data/*.json
data/dashboard-discussions-reference.json
```

## 2 · Why the model did it, and why nothing stopped it

**The global guardrail does not cover this.** `NEVER_INVENT_GUARDRAIL`
(`server/utils/promptGuardrail.js`) is prepended to every prompt and is strong, but read
closely it governs **quotation**: "scripts, quotes or wording", "opening statements, hooks,
personas or dialogue", and the *names* of templates, frameworks and methods. Tactical
options and discussion questions are none of those. They are structured coaching content,
generated fresh and presented as the model's own analysis rather than as a quote. The
guardrail lets them through, correctly, because it was written for a different failure.

**The prompt closes every honest exit.** `data/prompts/learn.txt` says, in the Ratio
Analysis section and again in the General Rule:

> "Do NOT recommend templates from the library — coach through the framework"
>
> "Do NOT fall back to the template library when a coaching tree is present. The coaching
> tree IS the recommendation."

That is right when the guide fits. When it does not, the model has been told to coach from
the one guide it holds and to reach for nothing else — and it has **never been given the
words "I don't have that."** Generating is the only move left open to it.

**This is 4.16 turned inside out.** 4.16 was authored content that never arrived. This is
unauthored content that arrives looking authored — and it is the worse of the two, because
it carries the right headings, the right tone and the right shape. Nothing about it looks
wrong.

## 3 · THE BLOCK — emitted with every loaded coaching guide

Generated, never hand-maintained. The guide names come from `methodGuides.GUIDES`, so a
guide added later appears here with no edit. Listed alphabetically so the order is
deterministic and testable. Shown below as it would read when the **Ratio Analysis** guide
is the one loaded:

**This is the block as it actually ships**, printed from the running code with the Ratio
Analysis guide loaded:

```text
## Coaching Reference Scope — READ THIS BEFORE ANSWERING

The ONLY Advisor-e coaching guides whose content you have been given in this conversation are:

  • Ratio Analysis

You have NOT been given the content of these other Advisor-e coaching guides:

  • Capacity, Capability, Opportunity · Cautious Reveal Method · Dashboard Discussions
  • Deming's Theory of Volatility · End of Year Meeting · Facilitation 101
  • Framing a Conflict Meeting · Powerful Seminars · Revealing the Growth Curve
  • The Heald Matrix · Trial Fit Method · Working Capital Cycle

If the advisor asks about something the guide above does not cover, SAY SO and stop.
Name the guide that covers it, and offer to switch — use this wording:

  "I don't have the Advisor-e coaching content for that in this guide — that sits
  in the <NAME> guide. Would you like me to switch to it?"

NEVER write your own version of a section that is absent from the guides above —
including metrics, tactical options, discussion questions, stages, steps, questions
to ask, or ratios. Content you produce here is indistinguishable from the firm's
authored method on screen, which is what makes it the most damaging thing you can
do. Having no answer is a correct answer. Inventing one is not.
```

## 3a · The three differences from the block Mike approved

Named rather than absorbed, per the Save-the-Artefact rule. None changes what the block
does; each was forced by something the approved draft would have made untrue.

**1 · "coaching guides whose content", not "detailed Advisor-e coaching content".**
The approved line claimed this guide was the only content in the conversation. In a
client-mode deep dive that is false — the prompt also carries the template list, domain
support and the report models. A block that misdescribes the model's own context teaches it
to distrust the rest, which is the opposite of the point.

**2 · The refusal sentence is now inside the block.** The approved §3 said only "Name the
guide that covers it, and offer to switch", with the sentence itself living in §4. As
drafted, the approved wording would never have reached the model at all — §4 would have
described a sentence nothing emitted. `<NAME>` is filled by the model with the guide it is
declining toward, which is why it is a placeholder rather than a fixed name.

**3 · "absent from the guides above", plural.** Facilitation 101 loads two blocks —
itself and Learning Psychology — so the singular would have been wrong on that path.

## 4 · THE SENTENCE — what the advisor actually reads

This is the only authored wording in the change, and it is the line this file exists to get
approved:

> **"I don't have the Advisor-e coaching content for that in this guide — that sits in the
> Dashboard Discussions guide. Would you like me to switch to it?"**

Three things it does deliberately:

- **It says what is missing, not that the advisor asked wrongly.** The advisor did nothing
  wrong; the routing did.
- **It names the guide that holds the answer.** A refusal without a route is a dead end,
  and a dead end is what makes inventing look helpful.
- **It offers, it does not switch.** The advisor stays in charge of the conversation.

The guide name in the middle changes to whichever guide fits. Everything else is fixed.

## 5 · The thirteen guides this covers

These are the guides reachable as a Learn-mode coaching guide — a `mode: learn` logic tree
whose id matches a guide id. One is loaded; the block names the other twelve.

Capacity, Capability, Opportunity · Cautious Reveal Method · Dashboard Discussions ·
Deming's Theory of Volatility · End of Year Meeting · Facilitation 101 · Framing a Conflict
Meeting · Powerful Seminars · Ratio Analysis · Revealing the Growth Curve · The Heald
Matrix · Trial Fit Method · Working Capital Cycle

`The 3 Engagement Types` and `Learning Psychology` are **not** listed: they are standing
reference blocks, never loaded as the advisor's chosen coaching guide, so naming them as
"not given" would be untrue on the calls where they are attached.

## 6 · The hub-page judgement, stated rather than assumed

`CLAUDE.md` requires any change to what the AI is shown to surface on a hub page, starting
at the mentor tier. **This change needs no new screen, and here is why.**

The block carries **no new advisory content**. It is a mechanical statement of which guide
is loaded and which are not, generated from the guide list. Every guide it names already
has a mentor-tier screen — the Method Guides page (`design/METHOD-GUIDES-SCREEN.md`), built
under 4.16 F, where the mentor can read and reword any line of any of them.

The one authored string is the sentence in §4, and it is a system-behaviour rule rather
than advisory content: it is what the product says when it has nothing, in the same class
as an error message. Putting it behind a firm-editable field would let a firm soften or
delete the refusal, which is precisely the safety property this change exists to create.

**Cascading:** mentor tier alone, and in fact no tier — nothing here is editable by design.
The moment a firm has a real reason to word the refusal differently, that is a new decision
to put to Mike, not a default.

## 7 · What this does NOT fix, and must not be read as fixing

**The routing itself.** The engine will still sometimes load the wrong guide, and it always
will — Ratio Analysis and Dashboard Discussions are neighbouring methods and some questions
are genuinely ambiguous. This change makes a wrong route **visible and honest** instead of
silent and invented. That is the whole of item 4.18's stated fault: *"THE FAULT WORTH
FIXING IS THAT THE MODEL DOES NOT SAY 'I DO NOT HAVE THAT FOR THIS METHOD.'"*

A separate, smaller change to the routing is queued behind this one and will be put to Mike
on its own: **four of the twenty-one learn guides carry no description at all** in the menu
the picker chooses from — `demings_volatility`, `working_capital_cycle`, `ratio_analysis`
and `dashboard_discussions`. They are the four financial ones, the only four genuinely hard
to tell apart, and both guides in this incident are among them. The seventeen that are easy
to distinguish all carry a paragraph of help. That is 4.16's pattern again, and it is fixed
by reading the description each reference file already holds — not by authoring anything
new.

## 8 · The honest cost — and what measuring it found

**A refusal the advisor did not need.** Telling the model to name twelve guides it does not
hold may make it offer to switch too readily — declining a question the loaded guide could
in fact have answered. That is the trade this change accepts: a needless offer to switch is
a mild irritation the advisor can wave away, and invented coaching taken into a client
meeting is not. If it proves too eager in use, the fix is to soften the trigger, never to
remove the refusal.

**The risk was sharper than that paragraph made it sound, and it was nearly missed.** Four
of the seven things the block forbids the model from authoring — *questions to ask*,
*ratios*, *steps*, *stages* — name headings that **are present** in the Ratio Analysis
guide. The rule only bites on content that is *absent*, so the block is correct as written;
but if the model pattern-matched the forbidden list instead of reading the condition, it
would withhold Mike's own authored material. That is this change causing the very harm it
exists to prevent, from the other direction.

**Measured 2026-08-25, four live calls, Ratio Analysis loaded and the block on.** Three
probes asked for content the guide holds, under headings the block names; one control asked
for content it does not hold.

| Probe | Asked for | Refused? | Answered from the file? |
| --- | --- | --- | --- |
| 1 | the nine benchmark interrogation questions (`questions to ask`) | no | **yes** — all nine, near-verbatim |
| 2 | the four ratio categories (`ratios`) | no | **yes** — Activity, Profitability, Liquidity, Leverage |
| 3 | the Advisory Staircase (`steps`) | no | **yes** — Compilation, Assimilation, Interpretation, Application |
| 4 | Deming's four variation types — **control, genuinely absent** | **yes** | n/a — named the Deming's Theory of Volatility guide |

**No over-refusal in any probe, and the control refused correctly and routed correctly.**
The model reads the condition rather than the word list. This is measured behaviour on four
questions, not a proof — if it drifts in use, §8's first paragraph is still the rule.

**Prompt size.** Roughly 900 characters on every Learn call that loads a guide, and on
client-mode deep dives. Small beside the ~19,000-character guide it accompanies.

## 9 · How this gets verified — and it is not by a test

Item 4.18 says it in terms: *"VERIFY THE WAY 4.16 WAS VERIFIED — ask a real question on the
running app and compare the answer word for word against the source file, because every
automated test here passes on an answer the model made up."*

So: the tests prove the block is **emitted**, names the right guide, and names the other
twelve. No test can prove the model **obeys** it. That is done by driving the running app —
asking a Dashboard Discussions question in Learn mode, forcing the Ratio Analysis guide,
and reading what comes back against `data/ratio-analysis-reference.json`. If that cannot be
run, this item does not close, and the reason gets written down rather than glossed.

### Done — 2026-08-25, against the live model

Eight calls to `gpt-4o-mini` through `server/utils/openaiClient.js`, using the real
`learn.txt` system prompt and the real assembled reference text. Four are tabled in §8; the
four here are the before-and-after pair on the reported incident.

**The defect reproduced.** With the block OFF and the Ratio Analysis guide loaded, the
question *"my client's wages to sales ratio has crept up — what tactical options and
discussion questions should I use?"* produced **five invented tactical options and five
invented discussion questions**, formatted as authored coaching. The premise was checked
rather than assumed: the word *wages* appears **nowhere** in
`data/ratio-analysis-reference.json`, while *Wages to Sales Ratio* is metric 2 of the twelve
in `data/dashboard-discussions-reference.json`. The model had nothing, and wrote it.

**With the block ON, the same question returns the refusal in §4 and nothing else** — no
options, no questions, and the correct guide named.

**🔴 THE LIVE CHECK CAUGHT A FAULT IN THE BLOCK ITSELF, WHICH IS WHY IT IS NOT OPTIONAL.**
On the first run the refusal read *"that sits in the **Ratio Analysis** guide"* — the guide
it was already holding. Told to name a guide and given no rule about which, it echoed the
most prominent name in front of it. A refusal pointing back at the guide that just failed is
a dead end delivered in a helpful tone, and **every test in this file passed while it did
that**. Two lines were added telling it `<NAME>` is always from the not-given list and never
the guide it holds, and to give only the first half of the sentence rather than guess. It
then named Dashboard Discussions, and separately named Deming's Theory of Volatility on the
§8 control — the right guide both times, from different questions.

**Not yet done: the same questions driven through the browser and the Restify route.** These
eight calls exercised the real prompt and the real model, not the real HTTP path. That is a
smaller gap than it sounds — the route assembles this same text — but it is a gap, and it is
recorded here rather than glossed.
