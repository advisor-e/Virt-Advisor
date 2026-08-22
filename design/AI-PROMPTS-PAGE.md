# AI Prompts — the hub page

> **✅ BUILT 2026-08-22 (item 4.28).** Written 2026-08-21, session 78, from Mike's
> instruction and the two documents he supplied. Saved before he approved it, per
> CLAUDE.md → *Save the Artefact*. The drawing is
> [`mockups/ai-prompts-tab.html`](mockups/ai-prompts-tab.html) — the **second** drawing,
> and its own §3 names every difference between it and the build.
>
> **What §9 asked Mike, and what he said** — recorded here so no session re-asks:
>
> | | Question | His answer |
> |---|---|---|
> | **Q1** | The page's name | **"AI Prompts"** is the tab label (2026-08-21). |
> | **Q2** | Do the variables cascade, or does each tier set its own? | **They cascade**, `deepMerge`, field level. A tier holds only its own changes, so a setting reading *inherited* keeps receiving the level above's corrections. Confirmed by P11 of `features/tier-cascade.md`. |
> | **Q3** | Copy the source documents into `design/`? | **Yes** — both are committed under [`prompt-sources/`](prompt-sources/). |
> | **Q4** | Is the Flagged Issues Register in scope? | **Deferred**, and the reasoning is in `features/ai-prompts.md` §3: it is an approval workflow for AI output, and no report calls the AI yet. |
> | **Q5** | The two small security fixes — now or later? | **Split.** Invisible-character stripping shipped 2026-08-21 on this path; applying it to the live advisor screen is item **4.30**. The three-legs inventory is still not done and says so on the mentor's tab. |
>
> **And one ruling that came after §9 was written, on him reading the drawing (2026-08-22):**
> the page is for an accountant, not an engineer. The security document is now **mentor-only**;
> below the mentor it is four plain sentences. See §5a and `features/ai-prompts.md` P7.

**Mike's instruction, verbatim (2026-08-21):**

> *"I want to create a 'AI Prompts' page in the hub pages (Mentor, Global Group Manager,
> Group Manager and Firm Manager) so that users have the ability to influence the approach
> to formulas in the performance report models."*

> *"They should appear in the hub page in an editable form but NOT over ride key protocols
> which we have already deemed as essential for security etc."*

This is the open plan item **T20** in
[`BUSINESS-PERFORMANCE-REPORT-PLAN.md`](BUSINESS-PERFORMANCE-REPORT-PLAN.md) — *"editable /
visible AI prompt templates per report type"* — P1, unstarted since 2026-07-09.

---

## 1. The two source documents

Both live **outside this repository**, at
`C:\Documents\Visual Code Projects\Perf Report`:

| File | What it is |
|---|---|
| `cashflow forecast prompt with privacy.docx` | *Three-Way Cash Flow Forecast — AI Build Instructions.* Eleven sections plus three marked user variables. |
| `AI Audit and Security Prompt.docx` | A hardening brief on the *"lethal trifecta"* — private data + untrusted content + outbound tools — in six steps. |

🔴 **They must be copied into `design/` before anything is built from them.** Neither the
desktop machine nor the master team can see that folder, and a design whose source cannot
be opened by the people reviewing it is the `save-the-artefact` failure with extra steps.

---

## 2. What exists today — checked, not assumed

- **No report model calls the AI at all.** `server/routes/report.js` never touches OpenAI;
  only `server/routes/cases.js` does. Every report is pure maths to screen.
  **These would be the first prompts the report side has ever had** — there is no existing
  report prompt to improve on.
- The hub is one component, [`../components/FirmManagerHub.vue`](../components/FirmManagerHub.vue),
  rendered by four pages that differ only by a `scope` prop (`mentor`, and the three below).
  A tab is added to `NAV_GROUPS` and gated by `TAB_TIERS`. **A new tab is a line, not a page.**
- The first navigation group is **"Your AI coach"**, whose own comment reads *"Everything
  here teaches the AI — the hub's own stated purpose."* That is where this belongs.
- Per-tier storage with **version history and restore already exists**: the `firmOverlay`
  mechanism (`config_key`), already carrying currency, the coaching reference and the
  Advisory Distinctions.

---

## 3. 🔴 The ruling this page turns on — locked body, editable variables

Mike's constraint is *"editable … but NOT over ride key protocols."* The cash flow document
already solves this, and solves it better than a permissions matrix would:

> *"The three highlighted boxes below mark the only decisions you must set before running
> these instructions."*

**The body is the method. The named variables are the user's.** That is the whole design.

Two categories only — no third "sort of editable" band, because a band nobody can define is
a band nobody can enforce:

| | Meaning | Shown as |
|---|---|---|
| 🔒 **Locked** | Cannot be changed at any tier. Visible in full, so a manager can see the standard they are held to. | Read-only text |
| ✏️ **Editable** | A named variable with a declared default and a declared rule for when it is unset. | An input, with *Reset to default* |

### Why a protocol may not be merely "locked text"

🔴 **The privacy section of the cash flow document is advice to a model. Ours is code that
runs before the model sees anything.**

`server/utils/anonymiseCase.js` scrubs server-side; `server/utils/promptSafety.js` fences
untrusted input and strips break-out markers, proven by `tests/unit/promptSafety.test.js`.
**A prompt instruction is advisory and a server-side scrub is not.** So the app's own
protocols are **prepended to every prompt on this page at send time, on the backend, and are
not part of the editable document at all** — they cannot be deleted by editing a box, because
they are not in the box.

The document's own §3A stays on the page as locked text *as well*, because a manager should
see the standard. But it is the belt, not the braces.

---

## 4. The cash flow prompt, section by section

| § | Section | Ruling | Why |
|---|---|---|---|
| 1 | Role and Objective | 🔒 Locked | Defines the method |
| 2 | Output Format + Excel conventions | 🔒 Locked | Auditability depends on it (live formulas, no pasted values, colour legend, zero formula errors) |
| 3 | Source Discipline — *Non-Negotiable* | 🔒 Locked | Its own heading says so |
| 3A | Privacy and De-identification — *Non-Negotiable* | 🔒 Locked | And backed by code, per §3 above |
| 4 | Editable Variables | 🔒 Locked list, ✏️ **Variable 2 — reporting granularity** | The list of drivers is the method; the period is the user's |
| 5 | Materiality | 🔒 Locked rule, ✏️ **Variable 1 — materiality threshold** | The five tests and the always-flag list stay; the % is the user's |
| 6 | Scenario and Sensitivity | 🔒 Locked | Base/upside/downside driven from inputs, never hard-coded |
| 7 | Flagged Issues Register | 🔒 Locked | The audit artefact |
| 8 | Draft and Publish Stages | 🔒 Locked | The approval gate |
| 9 | Graphs | 🔒 Locked | Minimum set; native charts driven by cells |
| 10 | Plain-English Summary | 🔒 Locked, ✏️ **Variable 3 — currency & units** | Tone rule stays; currency is the user's |
| 11 | Auditability Standard | 🔒 Locked | The bar |

**Three editable fields on a page of eleven locked sections.** That is faithful to the
document and it is exactly *"influence the approach"* without rewriting the method.

## 5. The security prompt, section by section

| Step | Ruling | Why |
|---|---|---|
| 1 · Inventory the three legs | 🔒 Locked | ❌ **Never done here.** The one to do *before* shipping editable prompts |
| 2 · Gate the sinks | ⛔ **Not applicable** | This app's AI has no outbound tools |
| 3 · Cap outbound fetch bursts | ⛔ **Not applicable** | No web fetch |
| 4 · Strip secrets from the environment | 🔒 Locked | ✅ Already true — the OpenAI key is backend-only (Stack Constitution req. 7) |
| 5 · Fence untrusted content, sanitise output | 🔒 Locked | ✅ Partly true — `promptSafety.js` fences; the markdown pipeline strips images and HTML. ❌ **Invisible characters are not stripped** |
| 6 · Taint-gate memory writes | ⛔ **Not applicable** | No agent memory |

⚠ **Being straight about this one: three of its six steps guard a door that is not in this
building.** Shipping them would be security theatre. They stay on the page marked *not
applicable, and why* — recording the reason rather than silently dropping them, per
CLAUDE.md.

✏️ **Its editable surface is therefore NONE, and that is a correct result rather than a
defect.** This section said *"which steps apply, and the numeric thresholds where one does"*
and the build read it as a licence to ship two: a fetch-burst limit of 6 and a 60-second
window, belonging to **step 3, which is marked *does not apply here***. They validated, they
saved, they inherited down the tiers. They controlled nothing. **Mike found them by looking at
the drawing** and removed them (`28cb249`, 2026-08-22). The tab now renders *"Nothing here is
yours to set"*.

🔴 **No test in this suite could have caught it** — the boxes worked perfectly. A test can
prove a control works; it cannot ask whether the thing it controls exists.

---

## 5a. 🔴 Who this page is written for — the ruling that redrew it

**Mike, 2026-08-22, on reading the first drawing:**

> *"who is supposed to be working with this page? A computer coder or an accountant who has
> been given a word doc with some ai / claude prompts on it and told the prompts need to be
> included for their protection? If its the latter (and it is) then your version risks being
> too complicated for them."*

He is right, and the arithmetic makes it plain: the security document above contributed
**7 of the 19 sections a firm manager was shown**, in a different profession's language.

| | Mentor | Global group · Group · Firm |
|---|---|---|
| Three-Way Cash Flow Forecast | ✅ in full | ✅ in full — *materiality*, *three-way forecast*, *draft and publish*, *auditability* are an accountant's **own** words |
| AI Audit and Security | ✅ in full, all seven steps with their applies-here verdicts | ❌ replaced by four plain sentences: **"How your clients' information is protected"** |
| The document picker | ✅ — it genuinely has two | ❌ — a picker offering a choice of one is furniture |
| Editable settings | 3 | 3 — **unchanged** |

**Nothing is taken from anybody by this, and it is proven rather than asserted.** The security
document has **no editable setting at any tier**, so no manager loses a control — only a
document they could not act on. `aiPrompts.test.js` fails if it ever gains one, which forces
the ruling to be revisited rather than a control being quietly removed from three tiers.

**The filter is on the backend** (`promptsForTier`), not in the markup, so a tier cannot reach
the mentor's document by asking for it.

---

## 6. What these documents give us that we do not have

Assessed against `CLAUDE.md`, [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md), `promptSafety.js`,
`anonymiseCase.js` and `validateAIResponse.js`.

### From the cash flow document

1. 🔴 **A declared default that must announce itself.**
   *"If unset, default to 5% **and flag that this default was applied**."*
   Nothing in this app does this. Content is either fixed or fully editable; there is no
   notion of a default that reports its own use.
   ⚠ **Not theoretical:** `yearOneAddBack` silently defaults to `'setup'` in
   `multiplePropertyModel.js` — that is to-do item **4.22**, which sat open for five days
   before Mike settled it. A default that announced itself would have surfaced it at once.

2. 🔴 **"Do not guess — ask", declared per variable.**
   Currency: *"None — ask first; do not guess."* We have *never fabricate* as a principle.
   We have no per-field escalation rule.

3. 🔴 **The Flagged Issues Register**, with status *open / accountant-accepted / resolved*.
   CLAUDE.md requires logging Original | AI Suggestion | Final Approved per transformation.
   It does not give an accountant a standing list to work down. This is an audit artefact
   the app does not have in any form.

4. **Three-way provenance in the output** — hard data provided, derived by formula,
   assumption the AI introduced. `ProvenanceBadge` marks slider inputs; nothing classifies
   AI output this way.

5. **Materiality defined by rule** — five explicit tests plus an always-flag list (opening
   balances, tax treatment, financing terms, going-concern-sensitive items, any negative
   cash position). Today "what deserves a flag" is a fresh judgement every time.

### From the security document

6. 🔴 **Step 1 — the inventory of the three legs.** Never done. It is the right thing to do
   *before* four tiers can edit prompt text, not after.

7. 🔴 **Strip invisible characters** — zero-width, bidi, unicode-tags — from model output.
   We strip images and raw HTML for exactly this class of reason
   (`_md.disable(['image','html_inline','html_block'])`, locked in CLAUDE.md). **We do not
   strip invisible characters.** Specific, real, and small.

8. **Two principles worth adopting as written:** *"prefer removing a capability over adding
   a detector"*, and *"state honestly what each control does NOT cover."*

### What they repeat that we already do better

Source discipline, privacy, auditability. Ours are enforced in **code with tests**; theirs
are **instructions to a model**. Where they overlap, ours wins and theirs stays as visible
standard. This is the point of §3.

---

## 7. Which tiers get it

Per Mike's binding ruling of 2026-08-16 — *"ALL AI fixes must use hub pages, starting with
the mentor and cascading down as appropriate"* — and his instruction here, which names all
four:

| Tier | Gets the tab | What it may do |
|---|---|---|
| **Mentor** | Yes | Authors the platform default for every prompt |
| **Global group manager** | Yes | Overrides the variables for its brand |
| **Group manager** | Yes | Overrides the variables for its group |
| **Firm manager** | Yes | Overrides the variables for its firm |
| Advisor · client | **No** | They consume the output; they do not set the method |

Storage is `firmOverlay` at the appropriate `config_key`, which brings **version history and
restore** without new work. The advisor/client exclusion is stated rather than assumed, as
*"as appropriate" is a judgement to state, not to assume.*

---

## 8. 🔴 Security — the widening this creates, stated before it is built

Today no user-authored text reaches a report prompt, because **no report prompt exists**.
This feature creates that path: **four tiers of user gain the ability to edit text that
reaches a model.** That is a new prompt-injection surface, and it is the honest cost of the
feature.

What holds it:

- **The app's protocols are prepended on the backend at send time**, outside the editable
  document (§3). They cannot be edited away.
- **Editable values are fenced** with `fenceUntrusted()` before they reach the model, the
  same as any other untrusted input, with the break-out test already proving the fence.
- **Editable surface is three values and a handful of thresholds** — not free prose. A
  number cannot carry an injection.
- **Version history and restore** come free with `firmOverlay`, so a bad edit is one click
  from undone and the change is attributable.

⚠ **What this does NOT cover** (per the security document's own closing instruction): it
does not protect against a manager writing a *legitimate but wrong* value — a materiality
threshold of 99% is a valid number and a useless control. Nothing here detects that. The
mitigation is that the value is visible on the page and versioned, not that it is validated.

---

## 9. What actually needs Mike's word

| | Question | Why it is his |
|---|---|---|
| **Q1** | **The page's name.** He wrote *"AI Prompts"* — is that the tab label, or a working title? The neighbouring tabs read *Domain Support*, *Logic Tables*, *Advisory Staircase*, *Advisory Distinctions*. | Labels are never invented here (CLAUDE.md) |
| **Q2** | **Do the three variables cascade, or does each tier set its own independently?** A firm inheriting the group's materiality threshold is a different product from a firm choosing its own from the platform default. | The cascade is his design |
| **Q3** | **Should the two documents be copied into `design/`?** They are the source of a design and currently exist on one laptop only. | Where files live is his call (`where-to-save-user-files`) |
| **Q4** | **Is the Flagged Issues Register in scope, or a later item?** It is the biggest genuinely new thing here and it is a feature in its own right, not a prompt section. | Scope |
| **Q5** | **The two small security fixes — invisible-character stripping and the three-legs inventory — now, or as their own task?** Neither depends on this page. | Sequencing |

---

## 10. Build order once approved

1. Copy both documents into `design/` (Q3).
2. **The content, as data** — both prompts as structured records: locked sections, editable
   variables with defaults and unset-rules. Single source, backend-readable.
3. **The backend send path** — protocols prepended, editable values fenced, output validated.
   Nothing user-authored reaches a model unfenced.
4. **The tab**, in the *"Your AI coach"* group, gated to the four manager tiers, reading and
   writing through `firmOverlay`.
5. **The guards** — a test that every locked section is rendered read-only, and a test that
   the protocol block is present in every assembled prompt. Written the way the four report
   guards are: mutation-verified, so removing the protection fails the test.

Steps 2–4 are one deliverable. **Wiring content into the prompt without a screen is half a
fix** (CLAUDE.md, 2026-08-16), and a screen with no send path is the other half.

---

## 11. What was built, 2026-08-22 — step by step against §10

| Step | State | Where |
|---|---|---|
| 1 · Sources into `design/` | ✅ 2026-08-21 | [`prompt-sources/`](prompt-sources/) |
| 2 · The content, as data | ✅ 2026-08-21 | `data/ai-prompts.json` — plus, on 2026-08-22, per-prompt `tiers` and the `protectionPanel` |
| 3 · The backend send path | ✅ 2026-08-21 | `server/utils/aiPrompts.js` — `PROTOCOL_BLOCK` prepended, values fenced |
| 4 · The tab | ✅ 2026-08-22 | `components/firm/FirmAiPrompts.vue`, last under *Your AI coach*, gated by `TAB_TIERS.aiPrompts` to all four manager tiers; served by `server/routes/aiPrompts.js` |
| 5 · The guards | ✅ 2026-08-22 | 47 · 22 · 24 tests, below |

**The guards §10 step 5 asked for, and what each actually holds:**

- **Every locked section renders read-only** — asserted at all four tiers, with every section
  *opened*, checking there is no `input`, `textarea`, `select` or `contenteditable` inside a
  section body. Collapsed sections would have passed trivially, so they are expanded first.
- **The protocol block is in every assembled prompt** — and, its other half, **never in an API
  response and never in the rendered page**. It cannot be edited away because it is not in the
  thing being edited.
- **A request cannot reach a locked section or a protocol** — a body naming a section id, an
  unknown prompt, an unknown variable, an out-of-range number or an undeclared choice is a
  400, and `saveFirmConfig` is asserted *not* to have been called.
- **Every route writes to `req.firmId` and nothing else** — a scope named in the body is
  ignored, asserted directly.
- **Each line of the protection panel names a real protection** — the test opens the named
  file and looks for the named export or call, so a sentence whose backing is deleted fails
  the build instead of going quietly false.
- **Every locale key the screen asks for has English behind it** — the component tests assert
  i18n *keys* by the suite's own convention, so without this a key with no translation would
  pass every one of them and show a manager the raw string `firmAiPrompts.save`.

**What is NOT proven, said plainly:**

- 🔴 **Only two of the four tiers can be logged into.** `config/integration.js` ships
  `globalManagerRole` and `groupManagerRole` empty on purpose, fail-closed. The middle two are
  correct-by-construction and unexercised by a real login. That is Advisor-e's data to supply.
- ⚠ **No test in this project can see that a screen LOOKS right** (item 4.25). Both defects
  this feature has had were found by Mike looking at a picture, and neither was findable by a
  test.
- ⚠ **No prompt here has ever been sent to a model.** No report model calls the AI (§2), so
  assembly is proven against its own output rather than against a real completion.
