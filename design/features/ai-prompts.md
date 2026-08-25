# AI Prompts — the Brief

> **The prompt templates a manager can tune — locked method, declared variables.** Current rules
> only; the history is in [`ai-prompts-history.md`](ai-prompts-history.md).
>
> **Covers:** the three shipped prompts, what is editable and what is not, how the platform
> protocols are enforced, how a tier's settings cascade, the hub tab that renders it, and the
> Share-a-prompt panel a firm manager pastes their own prompt into.
> **Does not cover:** the report models' own key-calculation summaries, which are item 4.29 and a
> separate thing.

---

## 1. Design philosophy

**The body is the method and belongs to the platform. The variables are the user's.**

Mike asked for a page *"so that users have the ability to influence the approach to formulas in
the performance report models"* — and in the same breath, *"but NOT over ride key protocols which
we have already deemed as essential for security etc."* Those two requirements sound like they
need a permissions matrix. They do not.

The source document he supplied had already solved it, in its own opening line:

> *"The three highlighted boxes below mark the only decisions you must set before running these
> instructions."*

Eleven sections of method that nobody changes, and three named settings that anyone may. A firm
influences **how** the method is applied — what counts as material, what period to report on,
what currency — without being able to rewrite **what** the method is. That is the whole design,
and it was taken from the document rather than invented for it.

---

## 2. Key principles — the non-negotiables

**P1 · The protocols are not in the editable document, so they cannot be edited away.**
`PROTOCOL_BLOCK` lives in [`../../server/utils/aiPrompts.js`](../../server/utils/aiPrompts.js)
and is prepended to every assembled prompt at send time. It is not in `data/ai-prompts.json`, not
in any overlay, and reachable from no screen at any tier.
🔴 **Marking text read-only would NOT have been enough, and the distinction is the point.** A
locked *section* is the source document's own standard, shown so a manager can see what they are
held to — advisory text. What actually protects is code that runs before the model sees anything:
`promptSafety.fenceUntrusted`, `anonymiseCase`, `promptSafety.stripInvisible`. **A prompt
instruction is advisory; a server-side scrub is not.** Both exist. Only one of them protects.
*If ignored:* a manager deletes a paragraph of the privacy section and believes — reasonably —
that they have changed what the system does.

**P2 · The editable surface is the declared list and nothing else, and it fails closed.**
An unknown prompt id, an unknown variable id, a wrong type, a number outside its range, a choice
outside its set — every one is refused and reported, never partially kept. The surface is a
handful of values, **not free prose**, and a number cannot carry an injection. Values are still
fenced with `fenceUntrusted()` before they reach a model.
*If ignored:* this becomes the first place in the app where four tiers of user can put arbitrary
text into a prompt, which is a new attack surface dressed as a feature.

**P3 · A default that is applied must say so. A value that cannot be guessed stops the work.**
`unsetRule` is the pattern, taken from the cash flow document and absent everywhere else here:
`announce` uses the default **and tells the model to state that a default was applied**; `ask`
refuses to proceed. `assemblePrompt()` returns `blocked: true` for an unset `ask` variable.
🔴 *Why:* `yearOneAddBack` in the property model defaults **silently**, and that is precisely how
to-do item 4.22 sat open for five days on a question that had stopped being the right question.
A default nobody is told about is indistinguishable from a decision nobody made.
*If ignored:* the output looks authoritative and rests on values nobody chose.

**P4 · The cascade is `deepMerge`, never `resolveInheritedRows`.**
These are **map-shaped settings** — named variables with nothing to switch off and nothing to
add — exactly the shape the property tax rules are.
[`tier-cascade.md`](tier-cascade.md) §3 warns explicitly against reaching for the row mechanism
just because five blocks use it. A group that sets only the materiality threshold must keep
receiving the platform's value for the rest.
*If ignored:* every field needs a synthetic id and an off-switch that means nothing.

**P5 · A step that does not apply is recorded WITH its reason, never dropped.**
Three of the security document's six steps — outbound sink gating, fetch-burst caps, taint-gated
memory — guard a door this app does not have: no outbound tools, no web fetch, no agent memory.
They ship with `appliesHere: "no"` and the reason, and a test asserts every step carries a
verdict.
*If ignored:* either they vanish and somebody re-derives them in six months, or they get built as
security theatre over capabilities that do not exist.

**P6 · The sources live in the repository.**
Both `.docx` files are committed under [`../prompt-sources/`](../prompt-sources/). They arrived
from a folder on one laptop that neither the desktop nor the master team can open.
*If ignored:* a design whose source cannot be read by its reviewers — the `save-the-artefact`
failure with extra steps.

**P7 · The page is written for an accountant, not for an engineer.**
🔴 **Ruled by Mike on 2026-08-22, on reading the first drawing:** *"who is supposed to be working
with this page? A computer coder or an accountant who has been given a word doc with some ai /
claude prompts on it and told the prompts need to be included for their protection? If its the
latter (and it is) then your version risks being too complicated for them."*
What that produced, and each half matters:
- **The cash flow prompt stays exactly as drawn.** *Materiality*, *three-way forecast*, *draft and
  publish*, *auditability* are an accountant's **own** vocabulary. Seeing it reassures them.
- **The security prompt is MENTOR-ONLY.** Its seven headings — *the lethal trifecta*, *gate the
  sinks not the reads*, *taint-gate memory writes* — were **7 of the 19 sections a firm manager
  saw**, in a different profession's language. That is the opposite of reassurance: a list of
  alarming things they cannot evaluate. Below the mentor it is replaced by **one plain-English
  panel of four sentences**, *How your clients' information is protected*.
- **Nothing is hidden by this, and a test proves it.** The security prompt has no editable setting
  at any tier, so no manager loses a control — only a document they could not use. If it ever
  gains one, `aiPrompts.test.js` fails and the ruling has to be revisited rather than quietly
  taking a control away from three tiers.
- **Filtering is done on the BACKEND** (`promptsForTier`), never by hiding markup, so a tier
  cannot reach the mentor's document by asking for it.
*If ignored:* the page becomes a security briefing a firm manager cannot act on, and the three
settings they actually came for are buried in it.

**P8 · Every line of the protection panel must be something the system DOES.**
The panel's own lede says *"applied by the system every time"*. So each line declares the module
that performs it (`backedBy`) and the exact export or call that proves it (`provenBy`), and a test
reads the file to check. A line describing an **instruction to the model** would be a claim the
app is not keeping.
🔴 *Why, and it is not hypothetical:* the fourth line was *"Nothing is treated as final until a
person has approved it"* when the tab was drawn. It is enforced nowhere — it restates the prompt's
own Draft and Publish section, which is advice to a model. It was replaced before shipping. **This
is the same fault Mike caught in the two fetch-burst boxes on 2026-08-22, in prose instead of in a
control**, and it is the reason P1's distinction is not academic.
*If ignored:* a manager reads a reassurance the app does not deliver, and no test can tell.

---

## 3. Design considerations

**Two categories only — locked or editable. There is deliberately no middle band.** A
"tailorable" third category was considered and rejected: a band nobody can define is a band
nobody can enforce, and the first inconvenient case widens it. A test asserts every section is
locked, so a section becoming editable requires somebody to argue for it rather than to slip.

**The security prompt has NO editable surface at all, and that is a correct result.** Its content
is entirely protocol. A prompt with nothing to tune is not a defect — it is a prompt that is all
method, and the tab says *"Nothing here is yours to set"* rather than showing an empty box.
⚠ **This paragraph said "almost none … the numeric thresholds where one does" until 2026-08-22.**
It was already wrong when written: the only two thresholds it could have meant belonged to step 3,
*Cap outbound fetch bursts*, which is marked **does not apply here**. Mike found the two boxes by
looking at a picture and removed them (`28cb249`); the wording is corrected here rather than
quietly, because a Brief that overstates an editable surface teaches the next session to build one.

**Deferred on purpose: the Flagged Issues Register.** The cash flow document's register — every
assumption listed with a status of *open / accountant-accepted / resolved* — is the single most
valuable thing either document offers, and this app has nothing like it. It is **not built**,
because it is an approval workflow for AI output and **no report calls the AI yet**
(`server/routes/report.js` never touches OpenAI). Building a sign-off screen for output nothing
generates is work with no user. The prompt section describing it stays locked, so a model
following the prompt still produces one; the app-side workflow waits until a report actually
invokes a model. **This was a judgement call, made 2026-08-21, and it is recorded here so the
next session inherits the reasoning rather than the gap.**

**Not a data dictionary.** These prompts describe a method to a model. The separate job of telling
the AI *what each report model calculates* is item 4.29 and deliberately has no screen — Mike
ruled that one *"for AI - not the advisor or manager"*.

---

## 3a. Share a prompt — a manager's own words, checked

A firm manager pastes a prompt they believe in and asks whether it is any good. **Nothing is
stored and nothing changes** — not this app, not their firm, not the advising AI. The panel sits
on this same tab at all four tiers, below the settings and above the method.

**Three things happen, in this order.**

1. **Deterministic checks.** Six of them, worst first: the fence markers, invisible characters,
   anything shaped like a key, web and email addresses, real client details, and a 6,000-character
   limit checked before any of the others so a huge paste is never scanned. One refusal is shown
   at a time, in three parts — what we found, why it matters to their clients, what to do now —
   and every refusal offers a mail link to a person.
2. **The review.** The model reads the prompt, fenced, and reports what is good, what is missing
   and what conflicts. Each finding is theirs to take or leave, and taking one edits **the box on
   their screen** and nothing else.
3. **Putting it in force (Lane B).** A level saves material under its own name. It applies to that
   level immediately, with nobody above signing it off, and it reaches every conversation that
   level's advisors have — **fenced**, beside the firm's coaching notes, as a quotation the model
   is told to read and never obey.

### The cascade, and the one place it departs from every other block

🔴 **P11 is accept-first, and nothing else in this app is.** Every other cascade — distinctions,
the staircase, quizzes, domain support, logic trees — is *inherited until declined*: a row arrives
live and a level switches it off. Mike's P11 ruling is the opposite for authored material: *"the
higher levels can offer ideas but never enforce them."* So an offered contribution does **nothing**
at the level below until that level accepts it, and absence of a decision is not consent.

The design expected this step to *"reuse the existing cascade mechanism rather than adding one"*.
**It could not** — no existing mechanism has this polarity. This is P11's first implementation, and
it is deliberately small: a list of accepted offer ids, and nothing in force that is not either the
level's own or on that list.

⚠ **It reaches authored material only.** The Staircase, Distinctions, Quizzes, Domain Support and
Logic Tables are engine configuration and cascade as shared tools — the boundary paragraph under
P11 in [`tier-cascade.md`](tier-cascade.md), which exists because an earlier draft nearly broke four
working features on the strength of this rule.

⚠ **A firm chains straight to the mentor today.** A firm with no recorded membership has the
platform as its parent, because the two middle tiers ship fail-closed. The cascade is correct for
four levels and exercisable on two — stated rather than implied.

⚠ **Three pieces of material in force at once, and never a silent trim.** Every one joins every
conversation that level's advisors have, so the cap is a real cost in tokens and attention rather
than tidiness. When it bites it says so in the server log — the only way anyone learns a level's
later material stopped reaching the AI.

🔴 **The review is an advisor and never a gate.** It cannot admit anything. The deterministic
checks ran before it and do not consult it, and a review that fails is reported as a failure —
never as an empty report, because on screen those are the same picture and the silent one tells an
accountant their prompt is fine on the strength of a call that never came back.

🔴 **The model's own output goes back through the checks.** A finding carrying a web address, a key
or a hidden character is discarded whole before it reaches the screen. This closes the loophole the
design names: accepting a suggestion must never become a way to write unchecked text into a prompt.

🔴 **The words the reviewer is given are a document on this tab** (`prompt-review`, mentor only),
not a string in the code — so a mentor can read every one of them. It is the first production
caller of `assemblePrompt()`, which until now was built, tested and wired to nothing.

⚠ **What the checks cannot do.** A bare personal name is not detectable — "Margaret Whitfield" and
"Working Capital Cycle" are the same shape to a pattern. Addresses, tax numbers and titled names
are caught; a bare name reaches the model inside the fence, which is what makes it survivable.
Phone numbers are deliberately not matched: in an application full of figures that pattern catches
columns of them.

⚠ **The support address is one line in [`../../data/support-contact.json`](../../data/support-contact.json).**
Edit it, save it, done — no restart and no rebuild. A blanked or broken file falls back rather than
leaving an accountant with a dead button.

---

## 4. For the coder

| Piece | Path |
|---|---|
| The prompts, as data | [`../../data/ai-prompts.json`](../../data/ai-prompts.json) |
| Assembly, validation, cascade, tier filter | [`../../server/utils/aiPrompts.js`](../../server/utils/aiPrompts.js) |
| The Restify routes | [`../../server/routes/aiPrompts.js`](../../server/routes/aiPrompts.js) |
| The hub tab | [`../../components/firm/FirmAiPrompts.vue`](../../components/firm/FirmAiPrompts.vue) |
| Its wording | `locales/en.json` → `firmAiPrompts` (the panel and the prompts themselves are DATA, not locale keys) |
| Fencing and output stripping | [`../../server/utils/promptSafety.js`](../../server/utils/promptSafety.js) |
| The design and its build order | [`../AI-PROMPTS-PAGE.md`](../AI-PROMPTS-PAGE.md) |
| The approved drawing | [`../mockups/ai-prompts-tab.html`](../mockups/ai-prompts-tab.html) — **second** drawing; §3 names every difference |
| The source documents, verbatim | [`../prompt-sources/`](../prompt-sources/) |
| Share a prompt — the checks | [`../../server/utils/promptContribution.js`](../../server/utils/promptContribution.js) |
| Share a prompt — the review | [`../../server/utils/promptReview.js`](../../server/utils/promptReview.js) |
| Share a prompt — the route (Lane A, stores nothing) | [`../../server/routes/promptCheck.js`](../../server/routes/promptCheck.js) |
| Lane B — storage, cascade, the fenced block | [`../../server/utils/promptContributions.js`](../../server/utils/promptContributions.js) |
| Lane B — the routes | [`../../server/routes/promptContributions.js`](../../server/routes/promptContributions.js) |
| Where it reaches the AI | `server/advisorEngine.js` — `buildClientContext` and the generic context message, beside the firm coaching notes |
| Its overlay keys | `prompt-contributions` (a level's own) · `prompt-contributions-accepted` (offers it has taken) |
| Share a prompt — the panel | [`../../components/firm/FirmPromptCheck.vue`](../../components/firm/FirmPromptCheck.vue) |
| Its wording, approved before it was built | [`../PROMPT-CONTRIBUTION-WORDING.md`](../PROMPT-CONTRIBUTION-WORDING.md) · locale keys under `promptCheck` |
| Its design and build order | [`../PROMPT-CONTRIBUTION-SAFETY.md`](../PROMPT-CONTRIBUTION-SAFETY.md) |
| The support address | [`../../data/support-contact.json`](../../data/support-contact.json) |
| Tests | [`aiPrompts.test.js`](../../tests/unit/aiPrompts.test.js) · [`aiPrompts.routes.test.js`](../../tests/unit/aiPrompts.routes.test.js) · [`firmAiPrompts.component.test.js`](../../tests/unit/firmAiPrompts.component.test.js) · [`promptSafety.test.js`](../../tests/unit/promptSafety.test.js) |
| Override storage | `firmOverlay`, `config_key: 'ai-prompts'` |

**Traps.**
- **Do not write invisible characters as literals** — not in the source, not in a test. The first
  version of the strip pattern was a character class made of literal invisible characters:
  invisible in the file too, unreviewable, and destroyable by any tool that trims whitespace.
  Codepoints are spelled out (`\uXXXX` in the pattern, `String.fromCharCode` in the tests).
- **Adding a file to `data/` fails a test until the routing report is regenerated.**
  `contentRoutingReport.test.js` derives its blind-spot list from disk so a new data file cannot
  go unmentioned. Run `npm run routing`. The test is right; it caught this one.
- **The frontend markdown pipeline is LOCKED** (CLAUDE.md). Output sanitising belongs server-side
  at the source, which is where `stripInvisible` is.

**Known state.**
- ✅ **Built and tested:** the data, the protocol block, the validator, the cascade, assembly,
  `stripInvisible`, the tier filter, the four Restify routes, and **the hub tab**. 47 tests on the
  engine, 22 on the routes, 24 on the screen, 11 more on the stripper, 5 on the client door
  that applies it.
- ✅ **The screen exists** — *AI Prompts*, last under *Your AI coach*, at all four manager tiers.
  Item **4.28**, closed 2026-08-22.
- ✅ **`stripInvisible` runs on every AI path.** Applied at `server/utils/openaiClient.js` — the
  one function every OpenAI reply in this app passes through — rather than at each engine, so the
  advisor screen, the course screen, the case routes and the anonymiser are all covered by one
  change. Item **4.30**, closed 2026-08-25. The protection panel's third line — *"Invisible
  characters are stripped from the AI's answer"* — is now true on every screen a manager would
  assume it is, not only this one. A character arriving split across two streamed chunks is
  rejoined before it is tested, so the streaming case is closed too.
- ⚠ **The tab has been proven by tests, not by a person opening it at every tier.** Nothing in
  this project checks that a screen LOOKS right (item **4.25**), and the two defects this feature
  has had were both found by Mike looking at a picture.
- 🔴 **Two of the four tiers cannot be logged into.** `config/integration.js` ships
  `globalManagerRole` and `groupManagerRole` **empty on purpose**, fail-closed. The cascade is
  correct for four tiers and exercisable on two. **Never report this as working at four tiers.**
- ⚠ **No prompt here has ever been sent to a model.** Assembly is proven by tests against its own
  output, which is a weaker claim than a live screen and is stated as one.

---

## 5. Related briefs

[`tier-cascade.md`](tier-cascade.md) — the cascade mechanism P4 uses, and the warning against the
row mechanism · [`firm-manager-hub.md`](firm-manager-hub.md) — the hub the tab will live in, and
the `TAB_TIERS` matrix that gates it · [`report-models.md`](report-models.md) — the models these
prompts are about, and where item 4.29's summaries will sit · [`handbook.md`](handbook.md) — the
Brief-and-History convention this page follows.

---

**History:** [`ai-prompts-history.md`](ai-prompts-history.md)
