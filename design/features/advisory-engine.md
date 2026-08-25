# The Advisory Engine — the Brief

> **Read this before changing anything that affects what an advisor is recommended.** Current
> rules only. The reversals, the mis-routed sessions and the drift between design and build are
> in [`advisory-engine-history.md`](advisory-engine-history.md) — after this page.
>
> **Covers:** how a client situation becomes a set of recommended templates — signals, domains,
> strategy, scoring, and where the AI is and is not allowed to act. **Does not cover:** the chat
> screen itself ([`virtual-advisor.md`](virtual-advisor.md)) or who may edit the configuration
> ([`tier-cascade.md`](tier-cascade.md)).

---

## 1. Design philosophy

**The engine decides; the AI writes.** That single split is the whole architecture.

An advisor describes a client situation and receives a small set of advisory templates with a
reason for each. Every structural decision along the way — which advisory area this is, how the
engagement should be shaped, which templates are eligible, how they rank — is made in **code**,
deterministically. The AI is used at the end, to write the recommendation copy, and at the
start, to turn free text into one typed signal at a time. It is never allowed to choose a
template.

The reason is not architectural taste. An advisor is about to sit in front of a paying client
and act on this. If a recommendation cannot be traced back through signal → issue → strategy →
template, nobody can say why it was made — and a recommendation nobody can explain is worse than
none.

**The second idea: if in doubt, ask the advisor.** When the system needs a categorical decision
and cannot reach it with certainty, the answer is a constrained question — never an inference,
never a default, never an AI guess. The advisor knows their client. This takes precedence over
pipeline elegance.

**The third: guide, don't trap.** The system shows its current understanding, invites
correction, and always leaves a way out. It never forces an advisor to pick from wrong options,
and never ploughs on after they have signalled a mismatch. And it never predicts its way to
correctness — **real sessions are the improvement engine, not pre-emptive patching.** If an edge
case can only be fixed by more keywords, the wrong layer is doing the work.

---

## 2. Key principles — the non-negotiables

**P1 · AI classifies micro-signals. Code makes macro-decisions.** Free text → one typed signal
at a time, temperature 0, enum output. Everything else — routing, strategy, selection, ranking —
is code. **This boundary is not to be extended.** One bounded exception exists and is named in
P3.

**P2 · The AI cannot invent, rename or substitute a template.** Every selected name is validated
against the library before it reaches the writing stage; anything not found is rejected and
logged. An off-list reply is refused.

**P3 · Domain detection is keyword-first, AI only as the backstop.** A confident keyword match
(two or more hits) is used as-is with no AI. A tie asks the advisor. A thin single hit gets one
cheap AI opinion — if it agrees the keyword stands, if it disagrees **both are shown to the
advisor**, never a silent override. Only when keywords find nothing at all does the AI map the
situation by meaning, and only onto one of the existing 14 domains. Every choice is logged on the
decision trace.

**P4 · The template section boundary is absolute.** "Do the Job" templates are for clients.
"Get the Job" and "Get Organised" are for advisors. Client mode never shows the second kind, and
the advisor-development modes never recommend the first. This cannot be crossed.

**P5 · Show the best option even when it is out of range.** Two passes run: the best match in
the whole eligible library, and the best match within the advisor's current range. If they
differ, the advisor sees both, with the out-of-range one flagged as a stretch. If nothing
in-range exists, the screen says so in plain words. **Hard exclusions were removed because they
failed silently** — the best template was hidden and the advisor never knew it existed.

**P6 · The staircase complexity ceiling is the one remaining hard block.** It protects advisor
capability, not system tidiness. Everything else is ranking and flagging.

**P7 · Treat advisor and client text as hostile.** It is wrapped in explicit delimiters on the
backend before it enters any prompt. Never concatenated raw.

**P8 · Signals age slowly; template names age fast.** The design intent is that logic trees emit
*signals*, not template names. See §3 — the build has not reached this yet, and the intent is
not to be re-specified to match the drift.

**P9 · Every recommendation must be traceable.** Signal → primary issue → routing group →
strategy → template. If it cannot be traced, that is a bug, not a mystery.

**P10 · The AI cannot invent coaching content either, and says so instead.** P2 protects
template *names*; this protects the *method*. Every Learn-mode prompt that loads a coaching
guide also carries a generated statement of which guides it holds and which it does not, and
the instruction to decline rather than fill a gap — naming the guide that does cover it.
Routing will still sometimes pick the wrong guide and always will; what changed is that a
wrong pick is now **visible** instead of **invented**. ⚠ **The offer to switch that ends that
sentence does not yet work** — saying "yes" loads no guide at all. Item 4.46. Built and
verified against the live model 2026-08-25 (item 4.18); see
[`../LEARN-SCOPE-HONESTY.md`](../LEARN-SCOPE-HONESTY.md).

---

## 3. Design considerations

**Design and build differ here, deliberately and on the record.** This is the one feature where
the written design runs ahead of the code, and that gap is *intended* — the design is the
destination. What is built and live: signal capture, strategy resolution, template scoring and
the AI narrative. What is designed and **not** built: primary-issue classification as a named
field, and routing groups as a pre-filter. Do not read the design document as a description of
the code, and do not "correct" the design down to what exists.

**Content filed into the wrong lane is invisible.** It renders, it saves, it passes tests, and
it silently never reaches the decision it was written for. Three assets were found in the wrong
lane in one week, every one by a person reading code. Three lanes exist: content that influences
which templates a client is recommended; content that briefs the AI on the path but selects
nothing; and content only ever read by an advisor. **A lane is not a quality mark** — briefing
content is doing its job by not selecting templates.

**Domain support briefs the AI. It does not pick templates.** Selection is the resolver, the
logic tables and the distinctions — none of which read those files. Confusing the two is the
most common misreading of this engine.

**Context domains behave differently.** Conflict Meetings, End of Year Meetings and Due
Diligence do not produce primary issues. When active they override the strategy layer and
restrict what kinds of template are eligible.

**A "none of these apply" escape is required on every constrained selector.** It is not a
failure state; it is the system being honest that its read is wrong. The free-text reply
re-enters detection from the top, and the conversation continues forward — never backwards, never
losing answers.

**The engine is multi-tenant at every layer.** Every part supports a firm override on top of the
platform default. Nothing is single-tenant, and nothing new should be.

---

## 4. For the coder

### The pipeline, in order

| Stage | What happens | Where |
|---|---|---|
| 1 | Conversation and signal capture | `server/advisorEngine.js`, `server/utils/signals.js`, `problemSignals.js` |
| 2 | Primary issue classification | **designed, not in code** |
| 3 | Routing groups | **designed, not in code** |
| 4 | Strategy resolution — engagement type, complexity ceiling, template budget | `server/utils/strategyResolver.js` |
| 5 | Template selection — score and rank, no AI | `server/utils/templateResolver.js` |
| 6 | AI narrative — copy only | `advisorEngine.js`, prompts in `data/prompts/` |

### Where the configuration lives

| Piece | Path |
|---|---|
| Domains — keywords, disambiguation, questions | `data/domains.json` |
| Decision trees | `data/logic_trees.json`, read by `server/utils/logicTrees.js` |
| Signal vocabulary | `data/signal-dictionary.json` |
| Template library | `data/templates.json`, `server/utils/templates.js` |
| Signal weights per template | `data/semantic-profiles.json` |
| Rich template content | `data/content-summaries.json` |
| Domain briefing material | `data/*-domain-support.json`, `server/utils/domainSupport.js` |
| Distinctions (score boosts) | `data/advisory-distinctions.json` — see [`advisory-distinctions.md`](advisory-distinctions.md) |
| Lane classification + its guard | `server/utils/contentRouting.js` |

### The routing report

[`../CONTENT-ROUTING.md`](../CONTENT-ROUTING.md) is **generated** — `npm run routing` rebuilds
it. Never hand-edit it. Its rules live in `contentRouting.js`, which the build guard also reads,
so the report and the tests cannot disagree. It currently classifies 491 assets with **zero
unknown**.

### Traps that have actually bitten

1. **Two logic-tree schemas look identical on screen and behave completely differently.** A
   `nodes` tree is walked and its templates become client recommendations. A `flat_if_then` tree
   is Learn-mode reference and is **never walked**. Filing a tree as the wrong one makes its
   content unreachable and nothing fails.
2. **A tree emitting template *names* is the current build, not the design.** Names change as
   the library evolves; signals do not. Do not add more name-emitting trees on the assumption
   that this is the target.
3. **The search-contents export is generated by the master app.** Its ids and content must never
   be edited or challenged from here.
4. **A template absent from the export is held back** — the owner's rule: *"if it's not in the
   search JSON … don't recommend it."* The availability gate validates against the mirror rather
   than the export for a real reason: the export is gitignored, so on a fresh clone the gate
   would have nothing to check and would switch itself off.
5. **Strip internal ids and personal detail before anything reaches the AI**, and never trust its
   output as structured data — parse and validate the shape first.
6. 🔴 **A field the prompt builder does not read is invisible, and nothing fails.** Three instances
   now: `recommendation` on 55 branches (unread for about a year), `howItHelps` and `deliveryNotes`
   on the coaching reference (authored, stored, firm-editable, rendered into no prompt at all), and
   `advisor_note` on `pf_awareness`. Every one looked complete on screen and passed every test,
   **because every test asked whether the field was SAVED and none asked whether it was USED.** The
   only method that has ever caught it is **rendering the real prompt and reading it** — never
   inspecting the store. Write the test that way, or it will pass while the content goes nowhere.
   A firm or the mentor edits carefully and believes the advice changed; nothing on screen can tell
   them otherwise.
7. **A gate built for tool names will eat prose that merely looks like one.** The availability gate
   reduced `advisor_note` to its first sentence, because it read "use Trial Fit" and "use Cautious
   Reveal" as templates it could not serve when they are delivery *approaches*. Gating that field
   would have shipped as a fix while deleting the instruction. Before putting a new field through
   the gate, **run it through and read what survives.**

### Known gaps, honestly

- Primary issues are locked for all 14 domains but do not exist as a field in the case object.
- Routing groups are complete for one domain only.
- Two templates have no semantic profile; 23 have a profile with no signals; 88 have thin
  purpose-only profiles. These affect scoring precision, not function.

---

## 5. Related briefs

[`virtual-advisor.md`](virtual-advisor.md) — the screen this engine answers ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the editable vocabulary that boosts
scores · [`firm-manager-hub.md`](firm-manager-hub.md) — where a firm edits this configuration.

**History, and the design/build gap explained:**
[`advisory-engine-history.md`](advisory-engine-history.md)
