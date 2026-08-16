# The 13 method guides — a screen, and the content that never left the file

> **Item 4.16 · F**, the last of the seven and the only build left that is ours.
> Spec: [`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md) §4 F — **its count and one of its premises are
> corrected below, with the evidence.**
> Page purposes: [`HUB-PAGE-PURPOSES.md`](HUB-PAGE-PURPOSES.md).
> Mockup: [`mockups/method-guides.html`](mockups/method-guides.html).
>
> **Nothing here is built yet.** Mike picks the wording in §6, then it gets built to match this file.

---

## 1. What the spec said, and what the code says

The spec files F as: *"The 12 method guides get a screen … All read by the AI today. None on any
screen at any tier."* Two of those three clauses hold. **Two numbers in it do not**, and both were
found by opening the files rather than counting them.

| | Spec | Actual | How it was checked |
|---|---|---|---|
| How many guides | 12 | **13** | `powerful-seminars.json` is the thirteenth. It is not named `*-reference.json`, so a file-pattern sweep misses it — it is registered in `LEARN_REFERENCE_FORMATTERS` beside the other twelve and behaves identically |
| Read by the AI in full | yes | **no — 12% is dropped** | every authored string over 25 characters was searched for in its own rendered prompt block. **116 of 954 are absent** |
| On a screen | none | **none** — confirmed | no component, route or template in the repository names any of the thirteen files |

**Together the thirteen hold 155,000 characters of authored method content.**

---

## 2. 🔴 The finding the sweep did not make — 116 authored strings reach nothing

4.16 exists because content was authored and never sent to the AI. The sweep counted these thirteen
guides as *reaching the prompt*, because each one has a formatter and the formatter runs. **That is
true of the file and false of its contents.** Each formatter names the fields it emits, one by one,
and where a field was authored later — or simply overlooked — it is silently skipped.

| Guide | Authored strings | Not reaching the AI |
|---|---|---|
| **dashboard-discussions** | 170 | **62** |
| **working-capital-cycle** | 83 | **29** |
| **ratio-analysis** | 77 | **20** |
| powerful-seminars | 93 | 3 |
| eoy | 102 | 1 |
| conflict-meeting | 60 | 1 |
| the other seven | 369 | **0** |
| **Total** | **954** | **116** |

**What is being lost is not filler.** From `dashboard-discussions`, every metric carries a
`discussion_questions` list — the questions the advisor actually puts to the client — and the
formatter emits the metric's name, what it highlights and its variation types, then stops:

> **Sales to Gross Profit Ratio · never sent to the AI**
> *"Is the information consistent with your previous business assumptions and beliefs?"*
> *"Which tactical options are of greatest influence and why?"*
> *"Did you have any actions planned prior to this data — do they still stand?"*
>
> — and beside them, the six `tactical_options` for that same metric, also never sent.

From `working-capital-cycle`, each of the three problem types carries its `causes` and its `impact`.
The formatter emits the type and its trigger. **The diagnosis of why a business cannot pay its wages
is authored, and the AI has never seen it.**

⚠ **Method, stated so it can be challenged.** A string counts as reaching the AI if it appears
verbatim in the rendered prompt. That under-reports nothing and slightly over-reports drops where a
formatter rewords rather than quotes — every one of the 116 was spot-checked against its formatter,
and the three large clusters above were read line by line in the code. Strings under 25 characters
and the `version`/`description` housekeeping fields are excluded.

**This changes what F is.** It is not only *"give them a screen"*. A screen showing text the AI does
not receive would be worse than today's silence, because it would look correct.

---

## 3. They are not homeless — they belong to rows that are already on screen

Each guide is the deep version of a framework the Domain Support tab already lists. **Twelve of the
thirteen match a material row that exists today**, by name:

| Guide | The material row it sits behind | Domain |
|---|---|---|
| Trial Fit | Trial Fit Method | profit |
| Cautious Reveal | Cautious Reveal Method | profit |
| End of Year | EOY Meeting Agenda | eoy |
| Conflict Meeting | Force Field Analysis — The 6-Step Conflict Meeting | conflict |
| Heald Matrix | The Heald Matrix | strategy |
| Ratio Analysis | Ratio Analysis Deck — the Advisory Staircase | data-systems |
| Growth Curve Reveal | Revealing the Growth Curve | strategy · org-firm-strategy |
| Capacity, Capability, Opportunity | Capacity, Capability, Opportunity | strategy · get-positioning |
| Deming's Volatility | Deming's Theory of Volatility | data-systems · org-board-pack |
| Dashboard Discussions | Dashboard Discussions | data-systems · get-sales-tracker |
| Working Capital Cycle | Working Capital Cycle — Money in Movement | forecasting |
| Powerful Seminars | Powerful Seminars | get-seminar · sales-marketing |
| **Facilitation 101** | 🔴 **none — see §4** | — |

⚠ **This mapping does not exist in the data. It is proposed here, by name, and needs confirming
once.** The guides are keyed to a *logic table*, and those thirteen tables carry no domain at all —
so nothing in the code today can say which domain page a guide belongs on. Thirteen lines of
mapping get authored once, in the open, rather than guessed at run time. **Guessing is the failure
this whole item exists to close**, so the build reads a written mapping and shows nothing where none
is written.

**Five guides belong to two domains at once.** One document, two pages — so an edit made on the
`strategy` page changes what the `org-firm-strategy` page shows. **That has to be said on the
screen, not discovered afterwards** (wording option §6c).

---

## 4. Facilitation 101 is genuinely different, and should not be forced into a domain

Its own description: *"the universal 3-stage entry protocol for introducing **any** advisory concept
or template to a client."* It is not about a domain — it is about the first five minutes of
presenting anything, anywhere. There is no material row for it in any of the 30 domain files, and
inventing one under an arbitrary domain would file it where nobody would look.

**Recommendation: it is not a twelfth-plus-one — it is a standing guide**, shown on its own, named as
applying to every domain. **This is a decision, not a technicality, and it is §6d.**

---

## 5. The shape problem, and why a tidy editor is the wrong answer

The thirteen files are not one shape. Measured across all 155,000 characters:

| | Share |
|---|---|
| The four fields all thirteen share (`objective`, `core_principle`, `key_concepts`, `additional_guidance`) | **21%** |
| The staged sequence — `stages` / `steps` / `application_steps` / `step_by_step` / `pillars` | **44%** |
| **Blocks unique to a single guide** | **35%** |

That last third is not a rounding error. It is 86% of Dashboard Discussions, 73% of Working Capital
Cycle and 69% of Ratio Analysis — the same three guides that account for 111 of the 116 dropped
strings. **A screen with a fixed set of boxes would leave most of those three invisible**, which is
this item's own fault repeated one level down. The nesting goes deeper than the top level, too: the
Santa Claus sequence inside the conflict guide is an array of question objects inside a coaching
stage inside the document.

**Recommendation — one renderer that walks the guide's own shape.** Every authored string becomes a
field on screen; the document's own section names become the headings; nothing is enumerated by hand
in code. Three consequences, all of them the point:

1. **A guide with a section nobody anticipated still renders in full.** No thirteen bespoke editors,
   and no fourteenth to write when a guide is added.
2. **The same walk builds the prompt.** Screen and prompt read one structure, so they cannot
   disagree — and the 116 drops close as a consequence of the design rather than as thirteen
   separate patches that the next authored field would defeat again.
3. **Structure is fixed; words are editable.** A firm may reword any line and cannot add or remove a
   stage. Editing the shape is authoring a method, and that is the mentor's work in the data file.

---

## 6. ✅ THE WORDING — CHOSEN BY MIKE, 2026-08-17

**Control on the framework row:** **The detail behind this framework**
**Heading over the open guide:** **What your advisors' AI is taught about this method**
**Where a guide serves two domains:** **This guide is also used by _Firm Strategy_. An edit here
changes it there too.**
**Facilitation 101:** **its own entry above the domains, named _Applies to every domain_** — §4's
recommendation, taken.

**This is what the build must match, word for word.** Any difference between the screen and these
lines is a deviation to be named, not a detail.

⚠ **The mockup was drawn showing option A of each and one choice went the other way**
([`mockups/method-guides.html`](mockups/method-guides.html) was updated the same day to carry **6a
C**). The other three were already what it showed. **Check the built screen against the mockup, not
against this paragraph** — a paraphrase is what the artefact rule exists to prevent.

*The options he chose between are kept below so the choice can be read back rather than taken on
trust.*

### 6a. What the control on the material row is called

| | Option |
|---|---|
| **A** | **The full method guide** |
| **B** | **How to run this, in full** |
| **C** ✅ | **The detail behind this framework** |

### 6b. The heading over the guide once it is open

| | Option |
|---|---|
| **A** ✅ | **What your advisors' AI is taught about this method** |
| **B** | **The method, in full** |
| **C** | **Coaching detail — every line of this goes to the AI** |

### 6c. The line shown where a guide serves two domains

| | Option |
|---|---|
| **A** ✅ | **This guide is also used by _Firm Strategy_. An edit here changes it there too.** |
| **B** | **Shared with _Firm Strategy_ — one guide, shown in both places.** |
| **C** | **Careful: editing this also edits _Firm Strategy_.** |

### 6d. Where Facilitation 101 goes — §4

| | Option |
|---|---|
| **A** ✅ | **Its own entry, above the domains, named _Applies to every domain_** |
| **B** | **A material row of its own inside one domain** — Mike names which |
| **C** | **On every domain page**, repeated, marked as a standing guide |

**Neighbours, for comparison — the exact words already on these screens:**

- Domain Support lede — *"The background knowledge your advisors' AI draws on for each advisory area."*
- Its materials table — **Framework**, **What it is**, **Who and when**, **How to use it**.
- Approved 2026-08-16, same tab — **What to do, depending on the situation**; **The question your
  advisors are asked first**.

---

## 7. What gets built once §6 is answered

- **One shared walker** over a guide's structure, used by both the prompt formatter and the screen.
  The thirteen hand-written formatters are replaced by it, not added to.
- **The 116 dropped strings start reaching the AI**, as a consequence of that walker rather than as
  a separate fix.
- **The guide opens from its material row** on the Domain Support tab, with the chosen wording,
  saved through the tab's existing override bundle — mentor first, firms inheriting, version history
  for free, exactly as items B and C ship today.
- **The 13-line guide-to-row mapping** is authored in the open, and a guide with no mapping renders
  nowhere rather than being placed by guesswork.
- **Tests:** every authored string in all thirteen guides reaches the prompt — the check of §2, kept
  as a test so the next authored field cannot go quiet; a firm's edit reaches the prompt fenced; a
  guide with an unanticipated section still renders; a failed read serves the platform text.

---

## 8. ⚠ What this changes for a live adviser — say it plainly

**Two things move, and only one of them is small.**

1. **The screen is new and takes nothing away.** No tier has these controls today, so nobody loses one.
2. 🔴 **The AI starts receiving 116 pieces of coaching it has never had**, concentrated in Dashboard
   Discussions, Working Capital Cycle and Ratio Analysis. Those three conversations will change. They
   should change toward what Mike wrote — that is the whole point — but **"should" is a prediction**,
   and the check is to open a session in each of the three and read what comes back, on the running
   app, before it ships.

**Which tiers see it is not assumed here.** Item B's block was ruled *mentor only* on 2026-08-16
(*"this looks too technical for a firm or global manager"*). A method guide is ordinary advisory
prose rather than routing logic, so the same reasoning does not obviously carry across — **it is
asked, not inherited**, once the wording is settled.
