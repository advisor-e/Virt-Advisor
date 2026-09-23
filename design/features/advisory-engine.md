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
logged. An off-list reply is refused. **In discover mode the AI writes the names itself rather
than choosing from a scored list, so the check runs the other way round: the names it puts under
*Best match* and *Also worth considering* are read back against the library after it has written
them and before the advisor sees anything.** A calculation model offered as a template is not
sent — the AI is asked once more with the fault named and its real page path, and the corrected
answer is the one that is displayed, watched for invented wording, and recorded. If it ignores
the correction twice the answer goes out with a note saying plainly that the named item is a
calculator, not a template. `server/utils/templateHeadingCheck.js`.

⚠ **That check recognises a model by its EXACT catalogue name or route.** Measured 2026-09-17
against the shipped catalogues, the three "model named but no page path" cases are three
different things, not one:

| What the AI wrote | What it is | What happens today |
| --- | --- | --- |
| `Wages/Salary Review` | model only (`/wages-review`) | **Caught.** The check fires and the retry corrects it |
| `Sales Dashboard` | **both** a model (`/sales-dashboard`) and a real template title | **Skipped on purpose** — `if (isKnownTemplate) continue`. The page-path case lives in `videoInjector` (4.33) |
| `Stock Purchasing` | short form of `Stock Purchasing (Growth Pro)` | **Missed by everything.** `resolveModelToken` returns null, so the heading check skips it *and* a `[[MODEL:]]` carrying it counts as `unverified` rather than a real mention |

🔴 **SIX model names sit in both catalogues, not three — and that miscount was itself the
fault.** This paragraph said "three" (and `templateHeadingCheck`'s header said "two"), every
later note repeated it, and nobody recomputed it from the data. Three of the six differ from
the library's own spelling by a **single character**:

| Model | Route | The real template title | Differs by |
| --- | --- | --- | --- |
| Working Capital Cycle | `/business-performance-report` | Working Capital Cycle | — identical |
| Quick Position | `/quick-position` | Quick Position | — identical |
| Sales Dashboard | `/sales-dashboard` | Sales Dashboard | — identical |
| **Lease vs Buy** | `/lease-vs-buy` | **Lease vs. Buy** | a full stop |
| **High-Level Budget** | `/high-level-budget` | **High Level Budget** | a hyphen |
| **Dashboard Reports** | `/dashboard-reports` | **Dashboard Report** | a plural "s" |

`isKnownTemplate` compares exactly, so the bottom three read as "not a template" and
`checkTemplateHeadings` **flagged a genuine template recommendation as a calculator** — telling
the AI the advisor *"would go looking in Advisor-e and find nothing"* when the document is in
the library. Item 7.7's fault, produced in reverse by item 7.7's own guard, and it was firing
on **28 of 38** bench calls.

**Closed 2026-09-17:** `nearestTemplateTitle` (`tierLookup`) answers the question from the
catalogue on every call, and `checkTemplateHeadings` skips a name that resolves to a real
template. `tests/unit/nameCollisions.test.js` **recomputes the set** rather than trusting this
table — a seventh collision fails the build. It also pins that an invented name is never
rescued, so this can never become a licence to fabricate.

A name alone can therefore never say which of the two was meant, for any of the six. Row 3 of
the table above is the only real reach gap, and it is `resolveModelToken`'s matching, not a
missing mechanism. Forcing a page path whenever a model is named duplicates row 1 and breaks
row 2.

🔴 **A BENCH THAT OMITS THE TEMPLATE LIST MEASURES NOTHING — and it lies in a way that looks
like a finding.** Discover's prompt is assembled in two parts (`advisorEngine.js` ~3981–4138):
the system message is `discover.txt` alone, and a **separate user message** carries the
per-query pre-filtered template list *and then* the model block. A harness that sends only
`discover.txt` + the models leaves the AI with **no templates to choose from** while the format
still demands a **Best match** — so it invents plausible names to fill the block.

Built that way on 2026-09-17, a bench "discovered" the retry fabricating template names
(*"Lease vs Buy Decision"*, *"Inventory Management Review"*) and reported it as a defect worse
than 7.9. It was the harness. The real pre-filter surfaces **Lease vs. Buy** and **Loan
Estimator** for those exact queries — both are genuine library titles, and the long-standing
claim that those two questions have "no template either" is false.

**Before trusting any discover measurement, assert the context contains a known template title
and the models heading.** The numbers are meaningless otherwise, and wrong in the direction
that invents work.

### 🔴 2026-09-18 — six runs per model, on the RUNNING APP, and it overturned the reading below

**The four "never offered" are not never. Three are UNRELIABLE and one is not a defect.** Measured
through the real `/api/advisor/query` rather than a rebuilt context, six runs each, after asserting
the models block (51,357 chars) and the template pre-filter both reach the AI:

| Model | Before | After the rule change | What it was |
| --- | --- | --- | --- |
| Working Capital Cycle | 3/6 | **5/6** | the calculator dropped after a correct template |
| Sales Dashboard | 1/6 (named 6/6) | **3/6** (named 6/6) | same — named in prose, no page path |
| High-Level Budget | 2/6 | **1/6** | 🔴 a DIFFERENT fault — `/mid-level-budget` offered instead, 4/6 then 5/6. **Fixed later the same day — see item 7.11 below** |
| 8 Levers Model | 0/6 | 0/6 | **not a defect** — the AI answers with the template *8 Profit Levers* and stops |

**The change:** the instruction block's offer rule now names the case that was failing — *"IF A MODEL
ANSWERS THE QUESTION, NAMING IT IS NOT OPTIONAL — INCLUDING WHEN YOU HAVE ALREADY RECOMMENDED A
TEMPLATE."* Every one of the 24 runs recommended a template correctly and then dropped the
calculator; the refusal rule shouted in capitals while the offer rule whispered. Line 7 is
**untouched** — a near-miss is still forbidden outright. Pinned in `reportModelSummaries.test.js`.

Across the four: calculator links **6/24 → 9/24**, wrong-tool substitutions **9 → 6**.

✅ **THE BUDGET SUBSTITUTION IS A SEPARATE DEFECT (item 7.11), AND IT IS FIXED — 2026-09-18,
`ddf2dcce`.** Measured on 6 live runs after the change: the right calculator **4/4** wherever one
was offered, and High-Level Budget named as *Best match* **6/6**. Before: the wrong one 5/6.

**What fixed it was the one sentence that caused it.** Mid-Level Budget's `answers` opened *"The
same question as the High-Level Budget, plus the one that usually matters more"* — the AI was not
*forgetting* the right calculator, it was being told in the second field it reads that one of the
two is strictly better, and obeying. `useWhen` carries the correct steer back but is the sixth
field. Instruction line 8 cannot catch it either: that forbids the closest model when **none**
fits, and here one genuinely does. It now reads *"Whether the business is hitting its budget when
the money does not arrive the month it is earned"* — the timing distinction as a condition of the
question, not a ranking of one model over the other. Every other entry of the nineteen already
opened by naming what it answers in its own right; this was the only one defined against another.

🔴 **THE AI IS NOT ASKED TO RECALL A PAGE PATH. IT IS COPYING ONE FROM A LIST IT CAN SEE.**
`formatReportModelsForPrompt` prints `- **Page:** /debtor-drag` for every one of the nineteen
models, and the instruction orders it three separate times to use the exact path from that list.
**Do not start from the opposite premise** — item 7.13 did, was built entirely on it, and was
deleted by Mike on 2026-09-23 as a result. The closure on
[`to-do-done-and-parked.md`](to-do-done-and-parked.md) has the whole of it.

⚠ **A PAGE PATH IS PLAIN TEXT ON THE ADVISOR'S SCREEN, NOT A LINK.** `VirtualAdvisor.vue`
constructs MarkdownIt with `linkify: false`, so the advisor reads the path and types it. That
bounds what a wrong path costs: one failed page load and a retype. **It also means making paths
clickable is not the safe improvement it first looks like** — a wrong path stops being visibly
text and becomes a confident click into a dead page, in front of a client. Refused by Mike on
those grounds, 2026-09-23.

**What the app already knows, and deliberately keeps to itself.**
`resolveModelChoiceWithSource` resolves the correct route from the `[[MODEL:]]` marker on every
reply — including when the AI's own prose path is wrong or absent. That route feeds the Model
Choices screen (item 7.5) and is never shown to the advisor. This is a stated position, not an
oversight: the six colliding names below mean the app cannot always tell whether a template or a
model was meant, and a correction that is right most of the time is worse than none.

⚠ **SIX of the nineteen names are also real template titles**, so a name alone can never say
which was meant. `tests/unit/nameCollisions.test.js` recomputes the set. **Sales Dashboard is one
of them** — worth knowing, because 7.13 argued its case on that very model before anyone checked.

✅ **THE BLOCK IS "A model that fits" — Mike's ruling, 2026-09-18.** *"Calculator"* was our word,
never approved, and it had reached the advisor's screen as the block heading in `discover.txt`.
His words: *"we have models and templates. A model includes CALCULATIONS but it is NOT a
calculator."* Renamed in both prompts and in `buildRetryInstruction`; pinned by
`tests/unit/reportModelSummaries.test.js`. Never reintroduce it.

### What the earlier bench measured — 2026-09-17, 19 models × 2 runs

**12 of 19 reliably offered** (an openable page path on every run), 3 sometimes, 4 never. **No
invented template names.** The heading retry fired on 28 of 38 calls, so the AI names a model
under a template heading roughly two calls in three and the guard is carrying that load.

**Both questions the laptop's item 7.9 was filed over now score 2/2** — *lease or buy a van* → **Lease vs
Buy**, *loan repayments* → **The Loan Estimator**. So do **Stock Purchasing (Growth Pro)** and
**Cost of Capital (WACC)**, the two the short-form fix targeted.

**The four never offered are four different faults, not one.** Diagnosed by reading the replies,
not inferred:

| Model | What the AI did | What that means |
| --- | --- | --- |
| **8 Levers Model** | never named it; omitted the calculator block entirely | a genuine reach failure — the question never surfaces the model |
| **High-Level Budget** | offered **Mid-Level Budget** instead, with its path | the forbidden "closest model" substitution the list bans in capitals |
| **Sales Dashboard** | named it in prose, emitted **no page path** | the 7.9 shape proper, and the one the heading check cannot touch because the name is also a real template title |
| **Working Capital Cycle** | named it, WITH `/business-performance-report` | **not a fault** — re-run offered it correctly; its 0/2 was run-to-run variance |

⚠ **Two runs per model is too thin to separate a systematic miss from variance**, as the last row
shows. Treat a 0/2 as a candidate to re-run, never as a proven never.

### 🔴 `searchWords` NEVER REACHES THE AI — it is the Model Guide's filter box

Checked 2026-09-17, because a session assumed the opposite and nearly "fixed" the AI by editing
it. `formatReportModelsForPrompt` does not render it; its one consumer is
[`components/ModelGuide.vue`](../../components/ModelGuide.vue) (~line 268), whose own comment
says *"screen-only, never given to the AI. Item 4.36."*

**What the AI actually gets** is the prose — `answers`, `useWhen` (rendered as *"Reach for it
when"*), `inputsNeeded`, `alsoOnScreen`, `limits` and the coach lines. So:

- **To change what an advisor can FIND by typing** → `searchWords`.
- **To change what the AI reaches for** → the prose. That is authored content describing what
  the model is *for*, so it is Mike's call, never an AI session's, and never edited to chase a
  bench result.

**The 8 Levers case, measured.** Asked *"my client thinks more sales is the only way to grow
profit"* — almost verbatim its own `useWhen` — the AI offers **no calculator at all**, 3 runs of
3. It is not confused: it finds the template **8 Profit Levers**, which is a genuinely good
match, and simply stops there. The near-name is a coincidence of vocabulary, not a collision the
guard mishandles — `8 Profit Levers` is a real template and passes, `8 Levers Model` is
model-only and is correctly flagged under a template heading. **Nothing to fix in the
machinery**; what is missing is the calculator offered *alongside* a template that already
answers the question.

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
wrong pick is now **visible** instead of **invented**. **The offer to switch that ends that
sentence works**: the guide it names is carried into the topic pickers, so "yes" loads it.
Verified against the live model; see
[`../LEARN-SCOPE-HONESTY.md`](../LEARN-SCOPE-HONESTY.md).

---

## 3. Design considerations

**The design and the code now say the same thing.** Signal capture, **primary-issue
confirmation** (below), strategy resolution, template scoring and the AI narrative are all built
and live — primary-issue confirmation by item 4.97 (`server/utils/primaryIssueProposer.js`, wired
in `server/advisorEngine.js`).

**Routing groups are dead, not pending.** The registry ruled them removed on 2026-06-09
(`design/virt-advisor-registry.md` — *"Routing groups are dead and removed"*, and Stage 3 of the
old six-stage pipeline deleted with the 4-Table Governance Model that served it). They are not a
gap, not a pre-filter waiting to be built, and nothing should be written to restore them.

**Content filed into the wrong lane is invisible.** It renders, it saves, it passes tests, and
it silently never reaches the decision it was written for — and every case found so far was
found by a person reading code, not by automation. Three lanes exist: content that influences
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

### ✅ THE LABEL IS SETTLED — Mike's ruling, 2026-09-18

In his words: *"get rid of the name
calculator — I fucking hate it. We have models and templates. A model includes CALCULATIONS but
it is NOT a calculator."* The block heading is **`**A model that fits**`** and the word
*calculator* is gone from both prompts. **Never reintroduce it in anything the advisor reads or
the AI is told.** Where it survives elsewhere in this Brief it is quoting a past measurement, and
in [`report-models.md`](report-models.md) it names Mike's own workbook sheets (*Quick
Calculator*, *Hrly Rate & Tax Calculator*) — those are his source material and stay as written.

### Where a post-processor hooks into an answer

Three call sites finish an AI answer, and the raw buffer is still in scope at each — the
markers are stripped into a new variable while the buffer beside it keeps them, so anything
machine-read stays readable without re-plumbing. `injectVideoInfo` is the working example.

⚠ **This is REFERENCE, not an outstanding job.** It was written as build steps for item 7.12,
which **Mike deleted on 2026-09-23** once every fault it was filed over turned out to be fixed
(7.11), improved, not a defect, or forbidden to touch. **What those steps would have recorded is
already recorded:** `resolveModelChoiceWithSource` resolves the route from the marker on every
reply and feeds the Model Choices screen (item 7.5). Do not read the table below as work waiting
to be done — see `to-do-done-and-parked.md`.

| Path | Line | Stripped text | Raw buffer holding the marker |
|---|---|---|---|
| Post-recommendation conversation | `advisorEngine.js:3075` | `visible` | `_postBuffer` |
| Client-mode Phase 3 (streams) | `advisorEngine.js:3937` | `scrubbed` | `_p3Buffer` |
| Main buffered answer | `advisorEngine.js:4244` | `visible` | `answer` |

⚠ **Phase 3 genuinely streams** — it has already sent text when it reaches line 3937 and
corrects itself with a `replace` event. The other two emit once, so nothing is on screen yet.
Anything injected there must survive that replace rather than be appended twice.

⚠ **Engine behaviour is proved on the running app, never on the suite.** 13,484 passing tests
see none of it, and a handful of runs is a small sample on output that varies run to run. Drive
real conversations through `/api/advisor/query` — see `.claude/skills/run-the-app`.

### The pipeline, in order

| Stage | What happens | Where |
|---|---|---|
| 1 | Conversation and signal capture | `server/advisorEngine.js`, `server/utils/signals.js`, `problemSignals.js` |
| 2 | Primary issue — proposed, then confirmed or reframed by the advisor | `server/utils/primaryIssueProposer.js`, wired in `advisorEngine.js` |
| — | ~~Routing groups~~ — **deleted 2026-06-09**, not a missing stage | the registry's ruling |
| 4 | Strategy resolution — engagement type, complexity ceiling, template budget | `server/utils/strategyResolver.js` |
| 5 | Template selection — score and rank, no AI | `server/utils/templateResolver.js` |
| 6 | AI narrative — copy only | `advisorEngine.js`, prompts in `data/prompts/` |

### Where the configuration lives

| Piece | Path |
|---|---|
| Domains — keywords, disambiguation, questions | `data/domains.json` |
| Decision trees | `data/logic_trees.json`, read by `server/utils/logicTrees.js` |
| Signal vocabulary | `data/signal-dictionary.json` |
| Template library | resolved by `server/utils/templateLibrary.js` — the nearest tier's upload (firm → group → global → platform), whole; `data/templates.json` (via `server/utils/templates.js`) is the seed when no tier has uploaded |
| Signal weights per template | `server/utils/semanticProfiles.js` — a mentor's authored profile at the platform scope wins over `data/semantic-profiles.json`, which the compiler writes and which answers for every page nobody has authored. A store failure falls back to the compiled file rather than emptying the lever. Authored on the Mentor Hub's **Template Profiles** tab (item 7.2 US9) |
| Rich template content | `data/content-summaries.json` |
| Domain briefing material | `data/*-domain-support.json`, `server/utils/domainSupport.js` |
| Distinctions (score boosts) | `data/advisory-distinctions.json` — see [`advisory-distinctions.md`](advisory-distinctions.md) |
| Lane classification + its guard | `server/utils/contentRouting.js` |

### The primary issue — proposed, never listed

After the domain check-in the engine names **one** label from `data/primary-issues.json` for
the confirmed domain, with one reason drawn from the advisor's own words, and asks whether it
has that right. The advisor confirms it or reframes it in their own sentence; a reframe is put
back to them once. It is never a menu — the selector card was removed in June 2026 and
`tests/unit/retiredPrimaryIssueSelector.test.js` keeps it gone.

- **Ranking is on the advisor's evidence only** — the words of their cause answer (2 points a
  word) and the problem signals those words fired (1 point). The model is asked **only** to
  break a tie between two authored labels, choosing from the list or answering `none`.
- **Weak evidence withholds the proposal.** A lone matched word that is merely the domain's own
  name — "sales" taken from "cost of sales" — says the advisor's words picked the *area*, not
  the problem inside it. Where the domain holds more than one label, the engine asks the open
  driver question instead of asserting. A domain with a single label still proposes.
- **A reframe is ranked on the reply's words alone, with no signals.** The cause signals fire
  whatever the advisor types next, so including them read plain agreement as a correction.
- **On a miss, no label is stored.** One open driver question, then `how: 'none'` on the trace
  and a `[signal-miss]` log. A label the advisor's words do not support is worse than none: the
  resolver scores against it and the outcome pool learns from it.
- Context domains (`conflict`, `eoy`, `due-diligence`) and any domain with no authored labels
  ask neither question, and the trace row is hidden rather than reporting a miss.

The confirmed label lands on `state.primaryIssue`, the decision trace (`primaryIssue.label` /
`.how` / `.reason` / `.asked`), the Main issue row of the advisor's trace panel, and the
Outcome Learning pool. The step itself changed no scoring — it fills a field the scorer already
read. `SCORING_VERSION` is **`2.3.0`** (`server/utils/templateResolver.js`), raised by the signed
pooled adjustment of 4.97 US2, which made a hold-back able to lift as well.

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
6. 🔴 **A field the prompt builder does not read is invisible, and nothing fails.** It has happened
   more than once — `recommendation` on 55 branches sat unread for about a year: authored, stored,
   looking complete on screen and passing every test, **because every test asked whether the field
   was SAVED and none asked whether it was USED.** The only method that has ever caught it is
   **rendering the real prompt and reading it** — never inspecting the store. Write the test that
   way, or it will pass while the content goes nowhere. A firm or the mentor edits carefully and
   believes the advice changed; nothing on screen can tell them otherwise.
7. **A gate built for tool names will eat prose that merely looks like one.** The availability gate
   once reduced a coaching note to its first sentence by reading named delivery *approaches* as
   templates it could not serve — a "fix" that would have shipped while deleting the instruction.
   Before putting a new field through the gate, **run it through and read what survives.**
8. 🔴 **A RULE WRITTEN IN THE PROMPT FOUR TIMES IS STILL NOT ENFORCED.** `discover.txt` forbids
   naming a calculation model under a template heading at lines 33, 38 and 92, and the model-list
   instruction forbids it a fourth time — and the AI did it anyway, in four of six live
   conversations. **A fifth sentence is not a fix; a check in code is** (P2, item 7.7). Nothing in
   the suite could see this: all 11,155 tests prove our code handles what the AI sends, and none
   of them can prove what the AI sends.
9. 🔴 **A correction must carry the escape, AND fence it.** 7.7's first retry said only "name a
   real template", and the AI reached for a weak one rather than saying nothing fitted — a
   truthful no-match is what `discover.txt` STEP 1 actually asks for, so the escape was added.
   **Unfenced, it then produced a worse answer** (item 7.8): told to empty *Also worth
   considering*, and with no permission to leave a required block empty, the AI filled it with
   the no-match sentence — recommending a template and denying having one, in the same reply.
   **A correction that empties a required block must say what to do with the empty block**, or
   the model finds its own way out.

### Known gaps, honestly

- The advisor's confirmed primary issue reaches the trace and the outcome pool, but nothing
  measures how often the proposal is right across the 51 Scenario Lab cases (4.97 T019).
- The DOMAIN is misread on some cases, which the primary-issue step made visible. Upstream of
  everything above, because the area decides which templates are considered at all. **The
  "cost of sales" case is closed** (4.100): `sales-marketing` no longer counts the word *sales*
  when *cost of* precedes it, so a supplier-cost conversation stays in `profit` instead of being
  offered sales-and-marketing tools. That fixed **one phrase, not the general fault** — a thin
  single keyword can still carry a conversation into the wrong area, which is what the AI
  backstop and the confirmation step exist to catch.
- **A provider outage no longer stops everything, but it does stop the conversation — by
  design.** All eight calling files go through the provider seam (`server/utils/aiProvider.js`,
  4.97 US8 T050/T051, 2026-09-15), and every model name comes from one role map rather than a
  literal at the call site. A second provider answers for Course Builder, the hub reading, the
  compliance and prompt checks, the case anonymiser and the meeting reports. It does **not**
  answer for the advisor conversation: those calls are classed `personal: true` on Mike's
  ruling of 2026-09-15 — an advisor describing a real client in their own words does not reach
  a second provider until that provider's written terms have been read — so the seam rethrows
  the primary's own error rather than routing the words elsewhere. The advisor is told when no
  backup is configured (`GET /api/advisor/ai-readiness`, read once as a conversation opens);
  the warning blocks nothing and the session runs beneath it. Since T052 the decision trace
  also names which service answered, on **every** session — a row that appeared only on failure
  could not be trusted by its absence, and a case reopened months later still says who wrote it.
  Because the advisor's own calls are `personal: true`, that row names the primary in practice;
  the backup's wording is reachable at the call sites the second provider does answer for. The
  name is never written in code — it is whatever `AI_PRIMARY_NAME` is configured with.
- *(Routing groups were listed here as a gap. They are not one — the registry deleted the layer
  on 2026-06-09. See §3.)*
- **55 of the 220 client tools have a thin semantic profile** (recompiled 2026-09-16): 44 with
  no profile at all, 8 with an entry but no signals matched, 3 whose weights sum under 4. These
  affect scoring precision, not function — and **measured, the effect is small**: on the 51-case
  Scenario Lab with the AI layer live, authoring three of the blank profiles by hand moved score
  separation 5.6 → 5.7, and the engine already picked a content-driven top recommendation in
  51 of 51 cases with none of them authored. A profile also costs a tool the cases it does not
  fit: `8 Profit Levers` appeared in 19 recommendations after being given one, against 22
  before. The mentor's screen earns its place for a tool known to be missed, not as a
  44-tool data-entry job.

---

## 5. Related briefs

[`virtual-advisor.md`](virtual-advisor.md) — the screen this engine answers ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the editable vocabulary that boosts
scores · [`firm-manager-hub.md`](firm-manager-hub.md) — where a firm edits this configuration.

**History, and the design/build gap explained:**
[`advisory-engine-history.md`](advisory-engine-history.md)
