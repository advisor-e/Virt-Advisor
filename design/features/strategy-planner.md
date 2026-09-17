# Strategy Planner — the Brief

> ## 🔴 REDIRECTED BY MIKE ON 2026-09-17 — the built four steps stand, the shape ahead of them does not
>
> **Design from the OUTPUT.** In his words: *"I want the final output to break down to each
> concept/slide/s within the template in the menu so that an advisor can complete the initial
> session check and have a strategic plan formatted to include the necessary concepts/slides
> into 1 seamless document that can easily expand over time."* And: *"each concept needs to be
> presented AS IT CURRENTLY APPEARS in the slides."*
>
> **§1–§7 describe the build as it stood BEFORE this redirection, and have not been
> redesigned.** The four steps described there are built and walked in a browser, and they keep
> working — but the framework model in §2 is superseded and is marked so. **§8 is the one piece
> built since: the concept index.** **Read
> [`design/PLANNING-TEMPLATE-CENSUS.md`](../PLANNING-TEMPLATE-CENSUS.md) before designing
> anything**: it is the measured survey of Mike's own templates that the new direction rests on.
>
> To-do item **15.1**. Three artefacts, all registered in [`ARTEFACTS.md`](../ARTEFACTS.md):
>
> - ⛔ **SUPERSEDED — the session an advisor runs** —
>   [`design/mockups/strategy-planner.html`](../mockups/strategy-planner.html),
>   **eleven decisions all ruled by Mike on 2026-09-16**. Its **rulings still bind** (Decision 5
>   especially) and that is the only reason it is kept. 🔴 **NEVER OPEN IT AS THE CURRENT DESIGN
>   AND NEVER SEND MIKE TO IT AS THE PLAN** — his instruction of 2026-09-17, after a republish of
>   it surfaced where he expected the new drawing: *"make sure the old plan version never comes
>   back."* Go to it for a ruling, never for the target.
> - **The assembled plan** — [`design/mockups/strategy-plan-output.html`](../mockups/strategy-plan-output.html),
>   drawn 2026-09-17, the output this redirection asks for. **All 31 pages of `Pivot.pdf`
>   reproduced**, each block carrying the Pivot page it answers, so the acceptance test runs
>   against the drawing rather than after a build. Its §5 states what it does *not* ask approval
>   for — chiefly how each of the 21 teaching forms is drawn, which stays open.
>   - ☑ **Decision 1 ruled by Mike 2026-09-17, as recommended** — the output is **one continuous
>     document of slide-shaped pages**: it scrolls as one document on screen and is his deck page
>     for page when printed or presented. 🔴 **ONE artefact, never two formats.** A build that
>     produces a web report *and* a separate exported deck has created two things that can
>     disagree, and the page is a 16:9 frame from the start rather than a reflowing column
>     squeezed into one later.
>   - ☐ **Four decisions still open**, Decision 2 asked and unanswered: does the advisor name the
>     steps himself, or does the app group the ticked concepts? Pivot's step 5 sits on the agenda
>     with no slides behind it, which is why the running order cannot be computed from the ticks.
> - ☑ **The session scope menu — APPROVED TO BUILD FROM, 2026-09-17** —
>   [`design/mockups/strategy-session-menu.html`](../mockups/strategy-session-menu.html), the
>   **INPUT**: Mike's own Session Scope table with the `Include (Yes/No)` column made real, its
>   34 described rows carrying **his wording read off the decks by machine**. Pivot's eleven
>   concepts are the eleven ticked rows, so the acceptance test runs on the page. **Five decisions
>   ruled**: **A** the menu is his table and its words are never rewritten · **B** an agenda row
>   carries only words Mike wrote · **C** the AI pre-ticks with a reason, never unticks, and the
>   scope follows the ticks · ⛔ **D WITHDRAWN, see below** · **E** shared text is stored once and
>   pointed at, never copied. 🔴 **Approval means it is
>   what the build is measured against — open it beside the build and name every difference. It
>   does not mean the screen has been built.**
>   - ☑ **The concept index — BUILT 2026-09-17.** The first of the two prerequisites is done: see
>     §8. The screen itself is not built.
>   - ⛔ **DECISION D IS WITHDRAWN AND DECISION F IS VOID — Mike, 2026-09-17.** In his words:
>     *"this has NOTHING to do with determining the place to start a strategic plan — it's a
>     method for diagnosing a sales approach."* **"Where To Start??" is not part of this feature,
>     the action-to-concept mapping is not to be written, and no session is to re-derive it.**
>     The ruling on the drawing itself still reads as given on 2026-09-17 and is superseded by
>     this line. *(It was ruled in on a description of page 4; reading the page itself the next
>     day showed it to be a seven-rung sales-journey diagnostic — Suspect through Centre of
>     Influence — whose endpoints are sales actions, four of which match no concept in the deck
>     at all.)*
>
> **Step 1 — scope the session.** The four Planning Domains, each opening Mike's own Session
> Scope table: the advisor picks the client and ticks the frameworks. ⚠ **As BUILT this screen
> predates the redirection, and two things about it are superseded by Decision A above**: it
> takes its table from **ADV.0 Planning Outcomes**, which §3 and census §5 rule is never the
> source — a deck's own contents table is — and its columns read *Framework · What it explores ·
> Helps your client to… · Include*, where the deck's own are **Page · Framework · Concept
> Summary · Helps Your Client To… · Include**. It also offers **5 frameworks of the 52**.
>
> **Step 2 — run the frameworks.** One card per chosen framework: the concept on the left so it
> can be taught without leaving the screen, the capture on the right.
>
> **Step 3 — objectives and actions.** The Strategic Objective and the Strategy in the deck's
> 4-box language, the Action Plan as a table, and the nine Growth Aspects as a coverage check.
>
> **Step 4 — the plan.** Everything captured, assembled. It stores nothing of its own.
>
> ⚠ **VOICE RECORDING IS NOT BUILT AND CANNOT BE** until Meeting Review's three non-coding
> gates clear. See §6.

---

## 0. The build from here — eight stages

🔴 **Mike's test, 2026-09-17, and it is what this section is:** *"each stage should explain how it
benefits the feature and align to specific requested features or attributes that I asked for — if
you can't pair it to a specific feature request of mine OR can't explain why it is crucial for
accuracy or user experience, then DONT put it in the build design."*

**Every stage below names the request it serves, in his words, or the measured defect it removes.
Four things that would otherwise have been built failed that test and are listed at the end
rather than quietly dropped.**

**Where the build actually stands:** the concept index is built (52 records, no screen). The old
four-step screen is built but predates the redirection. Nothing an advisor types is captured
anywhere.

### The spine — after stage 3 an advisor can run the whole job

| | Stage | The request it serves | What it buys |
|---|---|---|---|
| **1** | ☑ **BUILT 2026-09-17 — the session menu.** `components/strategy/StrategyScopeMenu.vue`, `GET /api/strategy/concepts`, the `decks` array in `data/strategy-frameworks.json` | *"an advisor can complete the initial session check"* · **Decision A** — the screen **is** his table, his words, his page numbers | The screen it replaced offered **5 concepts of 52** and took its wording from ADV.0, which has drifted **four concepts and a page offset** from the decks. **A client reads this table in the room.** |
| **2** | **Capture** — one stored record per box, keyed on the visit, with the navigation timeline behind it | *"a strategic plan … that can easily expand over time"* — a plan cannot expand if nothing is kept | The feature's central defect. An advisor can capture **nothing** today and **nothing** survives to the next session, while the decks carry tables forward between sessions by design. |
| **3** | **The assembled document** — the ticked concepts in Pivot's order: front matter, then per step a *Discussion* divider, its teaching slides, an *Action* divider, its capture slides. A failing objective carries its flag onto the page. | *"…into 1 seamless document"* · **Decision 1** — one continuous document of slide-shaped pages, **one artefact never two formats** · **Decision 6** — *"flag it"*, which means nothing unless the flag reaches the finished document | The purpose he stated: *"previously, I had to copy and paste parts into smaller versions."* After this, **zero hand-assembled decks**. |

### Then — making it right rather than making it work

| | Stage | The request it serves | What it buys |
|---|---|---|---|
| **4** | **21 teaching forms** — every concept drawn as the slide draws it | *"each concept needs to be presented **AS IT CURRENTLY APPEARS** in the slides."* **Nothing else in this list serves that sentence.** | Pivot is **12 teaching slides to 9 capture slides** — mostly teaching. A plan of blank tables is not a plan an advisor can present. ⚠ The largest stage here: 21 forms, none drawn. |
| **5** | **9 capture forms** — every table the table his template actually is | **Decision 4** — free text everywhere, Task / Whom / When stays three real fields | **Accuracy, and provable:** two built shapes are **wrong** against his own fill-in tables. S.W.O.T is one box per quadrant where his table is **four numbered blank lines in each**; the 8 Profit Levers is eight buckets where his template is **seven aims, three blank task lines each** — and the teaching slide is an equation, a third thing again. |
| **6** | **The AI pre-tick** — pre-ticks with a reason, never unticks, scope follows the ticks | **Decision C**, ruled 2026-09-17 | It works now and could not before: all 11 of Pivot's concepts resolve. Without it the best the engine offers is the two whole decks — **34 concepts of which Pivot uses 11**, leaving 23 to cut by hand. |
| **7** | **Calculators run inside the card** — the same backend route the standalone page calls | *"no, it needs to feel inclusive, comprehensive and seamless. I dont want it to feel like patchwork."* **Ruled against the recommendation.** | 3 of the 52 have a supporting model. The advisor never leaves the session. |
| **8** | **A manager adds a concept** — mentor tier first, cascading down | His request, 2026-09-17 | Without it a 53rd concept needs a developer. |

### What Stage 1 shipped, and the two differences from the drawing

Built 2026-09-17: the five panels in Mike's order, all 52 rows, ticks crossing freely between
panels. `listDecks()` refuses at load a deck with no rows, a deck whose concepts name a
different Planning Domain, a deck mixing agenda and scope-table rows, and a concept naming no
deck. **The acceptance test is a test:** `strategyCapture.component.test.js` ticks Pivot's
eleven and asserts they span exactly `strategic-orientation-2` and `sales-marketing`.

🔴 **The advisor can tick all 52 and only TWO lead to a capture card** — `porters-5-forces` and
`the-8-profit-levers`, the only built frameworks that answer a row on one of Mike's scope
tables. The screen says so in its own footer and step 2 says so again, rather than showing two
cards where eleven were scoped. **SWOT / PEST is no longer separately tickable**, and that is
correct: SWOT sits inside Strategic Orientation 1's section 2 and has never been a row of its
own. It was tickable only on the superseded menu, which read ADV.0 rather than the decks.

**Two named deviations, per the Save-the-Artefact rule:**

1. **The "Suggest for this client" button is not built.** It is Stage 6 and needs the pre-tick
   behind it; a button that does nothing is worse than no button.
2. 🔴 **The drawing was CORRECTED to match the decks, not the build to match the drawing.** As
   first drawn it split five agenda rows onto a sub-line — Business Targets' last two and
   Strategic Orientation 1's first three — and on one of them moved *"(section 2)"* from
   mid-sentence to the end. The slides do none of that: each is one line at one size and one
   x-position. **Organisational Review's nine sub-lines are real** — its descriptions are a
   second column on the slide at x=352.7 — and they stay. Pinned in
   `strategyConcepts.test.js`, and the concept id `…-data-sectio` corroborates it.

### 🔴 What the test removed

- **"Where To Start??" and its action-to-concept mapping** — withdrawn by Mike, see the box at
  the top of this page.
- **The ~100 Growth Aspect questions** — his own deferral, already filed as item **15.2**.
- **Voice recording** — designed by his Decisions 10 and 11, but unbuildable until Meeting
  Review's three non-coding gates clear. It is not a stage anyone can start.
- **Re-reading the decks to rebuild the concept index** — no request behind it and no accuracy
  gain: the index is pinned by tests and independently agrees with the approved drawing.

### What gates what

**Stage 1 is done.** **Stages 2 and 3 cannot start** until the four open decisions on
[`strategy-plan-output.html`](../mockups/strategy-plan-output.html) are answered — **Decision 4**
decides the stored record's shape (a concept captured twice), and **Decisions 2, 3 and 5** decide
the document's running order, its Discussion/Action split, and whether the client keeps one
document in two states.

---

## 1. Why it exists, measured before it was designed

The impact test was run **before any of this was drawn** (CLAUDE.md's rule of 2026-09-16), and
it is what shaped the build. Counted from Mike's own Session Scope tables:

| | At the scoping | After the concept index, 2026-09-17 |
|---|---|---|
| Concepts across the four Planning Domains | **52** | 52 |
| Concepts the app holds as a record of their own | **0** | **52** |
| Pivot's 11 concepts findable as their own entry | **0** | **11** |
| Of those, absent from the engine entirely | 3 | **0** |
| An advisor could capture, in the app | **0** | **0** — no screen is built |
| Answers surviving to the next session | **0** | **0** — no screen is built |
| Concepts with a supporting calculator | 3 | 3 |

The decks carry tables forward between sessions, so having nowhere to put anything was the
feature's central defect rather than a missing nicety.

🔴 **The measurement is what produced the shape: ONE capture machine, never 52 screens.**
Re-run the same count to measure the build.

⚠ **The right-hand column moves only the rows the index could move, and that is the point.** The
two zeros that measure whether an ADVISOR is better off are still zeros, because the index is
data with no screen on it. A build that reported this as progress toward capture would be
counting the wrong thing.

**The 52 is Mike's own scoping ruling of 2026-09-17** — the menu is the five main documents'
own contents pages and agendas, nothing else. It replaces an earlier count of 45, which was
taken from ADV.0's index rather than from the decks themselves and was therefore inheriting
that file's drift. **Strategic Orientation 2 contributes 18 of the 52**, counted off its own
Session Scope table across slides 3–5. `design/PLANNING-TEMPLATE-CENSUS.md` §1 holds the per-document breakdown
and what is deliberately excluded.

🔴 **AND THE SECOND MEASUREMENT, WHICH IS WHY THE FEATURE EXISTS AT ALL.** Mike, 2026-09-17:
*"previously, I had to copy and paste parts into smaller versions … because it was difficult
for an advisor to create a strategic plan that was limited in the number of slides they wanted
to cover — this is the whole purpose of this new feature."* `Pivot.pdf` is one of those
hand-made decks: every slide in it is lifted from Strategic Orientation 2 or Sales & Marketing.
**The gain is measured as: zero hand-assembled decks needed, and a concept existing once rather
than in three files.** The cost of the old way is already paid and visible — ADV.0's index has
drifted four concepts and a page offset out of step with the decks it indexes.

## 2. A concept is DATA, and never its own screen

**Decision 3, and the rule everything else hangs off.** A concept is a record naming the form
it uses; one component draws them all.

🔴 **If a concept will not fit a form, add a FORM — never a component for that concept.** A
form is a grid rule plus an entry in `STRATEGY_SHAPES`; it serves all 52. A component serves
one, and 52 components is the build that never ends.

**A table is expanded into ordinary fields** (`row-3-whom` is just a field key), so the store,
the navigation timeline and the audit trail need no special case for it.

### Every concept has TWO forms — taught, and captured

**Mike's ruling, 2026-09-17:** *"each concept needs to be presented AS IT CURRENTLY APPEARS in
the slides."* Measuring his templates against his fill-in tables the same day showed those are
two different things, and that the second is far smaller than the first:

| | | |
|---|---|---|
| **Teaching form** — drawn as the slide draws it | a ring, a staircase, a curve, a 2×2 | **21** across the 52 |
| **Capture form** — the table the client completes | almost always a grid | **9** across the 21 fill-in templates |

**Nothing is ever filled in as a ring, a staircase or a curve.** The Org Chart proves it: what
gets typed is a flat *role / reports to* list, and the hierarchy tree is only the rendering.

🔴 **THE DOCUMENT CARRIES BOTH, AND MOSTLY THE TEACHING.** `Pivot.pdf` is **12 teaching slides
to 9 capture slides**, and Mike's ruling asks for each concept *"AS IT CURRENTLY APPEARS in the
slides"*. The capture form governs **where the client's typing goes**, never what the document
contains — a plan of blank tables is not a plan an advisor can present. Its page-by-page
anatomy, and the five rules that follow from it, are
[`PLANNING-TEMPLATE-CENSUS.md`](../PLANNING-TEMPLATE-CENSUS.md) §1.

🔴 **AND A CONCEPT CAN BE CAPTURED TWICE INTO THE SAME TABLE.** Porter's takes observations in
Pivot's step 1 and responses in step 2. **A model in which a concept appears once in a session
cannot produce Pivot** — the capture record keys on the *visit*, not on the concept.

The full libraries are in
[`design/PLANNING-TEMPLATE-CENSUS.md`](../PLANNING-TEMPLATE-CENSUS.md) §3, each form traced to
the templates that use it — **the banded grid alone carries S.W.O.T, Porter's, Blue Ocean
Fronts, Insights Summary and the Profit Levers.**

⚠ **The five shapes built in September 2026 — `buckets`, `quadrants`, `forces`, `statements`,
`actions` — cover about three of the 52 honestly, and TWO OF THEM ARE WRONG against Mike's own
fill-in tables.** They are superseded, not merely incomplete; the old table is in the history
page. See §6 for what each one gets wrong.

## 3. Two texts per framework, and they are not duplicates

- **`explores`** — the deck's own one-line Session Scope wording, shown on step 1. Mike ruled
  this on 2026-09-16 after laying the build beside the drawing: a domain holding fifteen
  frameworks is unreadable with paragraphs in that column.
- **The coaching summary** — long, written to the advisor, **joined from the domain support
  file** and shown on the framework card. It is never copied into the frameworks file.

A client choosing the scope and an advisor running the session need different sentences.
**Neither may be deleted in favour of the other.**

🔴 **The coaching summaries span THREE domain support files, not one.** Business Targets and
Strategic Orientation are in `strategy-domain-support.json`; **Sales & Marketing Review** is in
`sales-marketing-domain-support.json` and **Organisational Review** in
`staff-domain-support.json`. A build over the strategy file alone delivers half the session.

🔴 **BUT THE CONCEPT LIST ITSELF COMES FROM THE DECKS, NOT FROM THOSE FILES** (Mike, 2026-09-17).
A deck's contents table sits in the same file as the slides it points at and cannot drift from
them. **ADV.0's copy already has** — four concepts missing and page references off by one from
page 12 of Sales & Marketing onward. The domain support files supply the coaching summary and
nothing more; they are a copy too, and the strategy one names six materials that have no deck.

## 4. What the session keeps

Three tables in [`config/db-schema.sql`](../../config/db-schema.sql):

| Table | Holds |
|---|---|
| `strategy_sessions` | one per planning session with one client |
| `strategy_session_entries` | one per capture box — the table that moves the zero |
| `strategy_session_timeline` | which box was open, and when, to the millisecond |

🔴 **These rows do not expire, deliberately.** A transcript runs on Meeting Review's clock and
is destroyed; the plan built from it is the firm's working document and is carried into the
next session by design. **Do not add a purge job here** by analogy with `meetingPurge.js`.

**What it holds is sensitive** — a client's whole plan in their own words, and the staff named
in Task / Whom / When. Every read is scoped by firm, and a session in another firm reads as
**absent rather than forbidden**, so an id cannot be probed for existence.

## 5. How spoken words will reach the right box

**Decision 11, answering Mike's own question — *"how will it know to aportion text to specific
questions?"***

**The field open when the words are spoken claims them**, from the navigation timeline. The AI
tidies wording and **never decides placement**, so LLM output is still never trusted as
structured data, and the raw passage is kept beside the tidied one as the Original / AI
Suggestion / Final Approved Value trail.

🔴 **A build that hands a transcript and a field list to a model and asks it to sort them has
broken this ruling.**

The same principle governs the coverage check: **the advisor picks each action's Growth Aspect
from a list of the nine**, and the wheel counts those. No model reads an objective and guesses.

## 6. What is not built, and why

| | |
|---|---|
| **Decision 6's three objective tests** | Ruled *"flag it, never block"* and drawn as Yes/No badges. Not in the build. |
| **The Mentor Hub authoring tab** | Needs `FirmManagerHub.vue`, active on the desktop. |
| **Voice recording** | A strategy session is a **Meeting Review meeting type** (Decision 10) — the Planner builds no recorder. It inherits that feature's three non-coding gates: staff consultation, a lawyer per market, and the OpenAI audio-terms letter. **The typed capture must stand alone until they clear.** |
| **The ~100 Growth Aspect questions** | Item **15.2**, filed on Mike's yes. |
| **The aspect descriptions on the wheel labels** | Mike's own deferral, 2026-09-16. |
| **Everything the redirection opened** | How each of the 21 teaching and 9 capture forms is drawn · how a step's slides lay out on a page · how a manager ADDS a concept at each tier (Mike's request, 2026-09-17, mentor cascading down). **None of this is designed. Do not assume it from the September drawing.** *(One thing has LEFT this row: the document's assembly ORDER is Pivot's anatomy, census §1. And one thing has left the FEATURE: the "Where To Start??" routing flow, withdrawn by Mike on 2026-09-17 — see the box at the top.)* |

### 🔴 The AI cannot suggest what to include, and the reason is structural

**Measured 2026-09-17 on Mike's yes, before anything was designed** (CLAUDE.md's impact test),
against `data/templates.json` and `data/content-summaries.json` — the engine's whole candidate
set. **Its unit is a document, never a concept.** Strategic Orientation 2 is one row: title
*Orientation Part 2*, page `strategic-orientation-pt-2`. Its eighteen concepts appear only as
words inside that row's `purpose` paragraph, which the ranker reads as keywords.

| | |
|---|---|
| Entries in the candidate set | 291 documents · 187 summaries |
| Pivot's 11 concepts present as their own entry | **0** |
| Present only as words in a document's purpose text | 8 |
| Absent entirely — Vertical Integration, 6 Marketing Questions, A.I.D.C.R.A | 3 |

**The best answer the engine can give is the two decks those concepts live in — 34 concepts, of
which Pivot uses 11, leaving 23 for the advisor to cut by hand.** That is the hand-assembly this
feature exists to end, restated as a number.

🔴 **So the AI-guided selection is not a tuning job on the existing engine. It needs a
concept-level index — and so does the menu screen.** One piece of data, two uses, and its text was
already written: every Session Scope row carries a *Concept Summary* and a *Helps Your Client
To…* line in Mike's own words.

✅ **That index now exists — built 2026-09-17, §8.** The measurement above was re-run against it:
**all 11 of Pivot's concepts resolve to their own record**, including the three that appeared
nowhere at all. What the paragraph above describes is the state the engine was in before that
build, and it is kept because it is what the index was measured against. **The AI-guided
selection itself is still not built** — Decision C describes it and nothing implements it.

⛔ **AND THE ANSWER IS NOT "WHERE TO START??".** An earlier reading of the census proposed Sales &
Marketing page 4 as the nearest existing diagnostic. **Mike withdrew it on 2026-09-17** — it
diagnoses a sales approach, not where a strategic plan starts. Do not raise it again.

⚠ **What was measured, stated exactly:** the candidate set, not a live engine run. A ranker
cannot return a row that does not exist, so the set answers the question on its own. **Nothing
here is drawn or approved.**

### 🔴 Two built shapes are WRONG against Mike's own fill-in tables

Found 2026-09-17 by reading the templates themselves. Both are inside the redirection and are
fixed by it — recorded here so neither is carried across by accident.

| Shape | What the build does | What Mike's table actually is |
|---|---|---|
| `quadrants` | one free-text box per quadrant, for S.W.O.T | **four numbered blank lines in each** of the four blocks |
| `buckets` | ideas sorted under eight headings, for the 8 Profit Levers | **seven aims, three blank task lines each** — and the teaching slide is an **equation**, a third thing again |

⚠ **NO STATEMENT IN THE STORE HAS EVER RUN AGAINST A REAL DATABASE.** It was written on the
laptop, which has no MySQL. A wrong column name or a broken join would pass every test. **That
check is desktop or UAT work** and is not done.

**The acceptance test is `Pivot.pdf`** — a deck Mike assembled by hand out of Strategic
Orientation 2 and Sales & Marketing. An advisor ticks those concepts and a running order, and
the app produces it. If it cannot, the gap is the design's.

## 7. The wheel's colours, and the condition attached to them

The nine colours are **Mike's own**, extracted from the vector fills of his
`9 Growth Aspects Graphic.pdf` rather than chosen. Two limits, both stated to him and both
still true:

- **Which colour belongs to which aspect is reconstructed** from the draw order of the
  colour-coded table beside the wheel. The wheel itself is not stored as vectors.
- 🔴 **The palette fails the colour-blind separation checks** — `#00b1e0` against `#5b9bd5`
  measures ΔE 6.5 even at normal vision, and `#002b64` against `#1f3864` are two near-identical
  navies. Mike ruled on 2026-09-16 to keep his colours exactly as they are, and **that ruling is
  safe only because every segment is directly labelled and the list beside it repeats them.
  Neither may be removed to save space.**

One deviation from the original, deliberate: labels sit **outside** the ring, horizontal. The
deck curves them inside it, which is unreadable at screen size and cannot be selected, read
aloud or translated.

## 8. The concept index — built 2026-09-17

**The 52 concepts, as records.** The prerequisite the approved menu named, and the thing the
engine never had: before it, Strategic Orientation 2 was **one** row in the candidate set and its
eighteen concepts existed only as words inside that row's purpose paragraph, so a ranker could not
return a concept because no concept existed to return.

It lives in `data/strategy-frameworks.json` under `concepts`, is loaded and validated by
`server/utils/strategyFrameworks.js` (`listConcepts`, `getConcept`, `conceptsForPlanningDomain`),
and is pinned by `tests/unit/strategyConcepts.test.js`.

| | |
|---|---|
| Concepts | **52** — Business Targets 5 · Strategic Orientation 22 · Sales & Marketing 16 · Organisational Review 9 |
| Carrying Mike's own Concept Summary and Helps line | **34**, from the two Session Scope tables |
| Agenda rows | **18** — 9 carry his own agenda sub-line, 9 are name-only |
| Teaching form named (census §3) | 33 |
| Capture form **measured** against one of his fill-in templates | 20 |

🔴 **EVERY WORD IS HIS, READ OFF THE DECKS BY MACHINE — never retyped, never summarised.**
Decision A. Ligatures are normalised to ASCII and nothing else is altered. Two deliberate wording
pins in the test file guard it, and they exist because the failure has already happened once: the
built `porters-five-forces` framework carries *"Look out for changes… so **they** can be ready"*,
a third-person rewrite of the deck's *"To look out for changes… so **you** can be ready"*, taken
from ADV.0. **A rewrite reads perfectly well in UAT. Only a comparison with the deck catches it.**

**Decision B, as amended by Mike on 2026-09-17.** All 18 agenda rows have a null
`helpsClientTo` — that line is his. But **Organisational Review's agenda already prints a
one-line description under each of its nine items** (*"Who reports to who?"*, *"What's MOST
important to us?"*), so those nine carry it, read off the slide by machine. The ruling is
unchanged in substance: an agenda row only ever carries words Mike wrote.

**Decision E is honoured in the data, not just described.** Three cells the decks merge are stored
once and pointed at with a `*Ref`, resolved when read: `price-for-delivery-medium` →
`price-for-problem-solving` (both columns — one sentence written across the pair),
`horizontal-integration` → `vertical-integration` (the Helps column), and
`drafting-tender-proposals` → its own summary (the deck puts one sentence in both its columns).
**An editing screen must say which rows share a piece of text before anyone changes it**, or one
row's edit silently rewrites its neighbour.

⚠ **32 concepts carry NO capture form, and that is deliberate.** Census §4 measured the nine
capture forms across 24 templates, **not across all 52**, and is explicit that choosing one for a
concept outside those 24 is a **design decision, not a reading**. Each measured row names the
template it was matched to (`captureTemplate`) so the match is checkable; the rest are
`unmeasured` with nothing in the field, and a test fails if a form ever appears on one.

**What the index is NOT.** It is data with no screen on it. The session scope menu is not built,
Decision C's AI pre-tick is not built, and no teaching or capture form is *drawn* — the index
names a concept's form, it does not lay it out.

### 🔴 There is no extractor in this repository, and these are the five traps if one is ever written

The rows were read off the PDFs **once**, by a throwaway script that was deliberately **not
kept**: it is Python, and this is a JavaScript-only repository under the Stack Constitution, so
committing it would have been a stack deviation needing its own reconcile task.
`tests/unit/strategyConcepts.test.js` **pins** the result; it does not re-derive it. **The data
file is now the source**, and the audit trail is the decks plus the census.

Re-extraction is therefore a fresh task with its own tooling decision. **Every one of these five
produced a wrong index that looked entirely plausible**, which is why they are written down
rather than left to be rediscovered:

1. **Anchor rows on the FRAMEWORK column, never the page column.** The deck merges a page-number
   cell across two rows — Price For Problem Solving and Price For Delivery Medium both sit
   against page 20 — so counting page numbers finds 6 rows where there are 7.
2. **Take the header row from the TOPMOST occurrence of each label.** *"Framework"* and *"Page"*
   also occur inside concept names further down the same table — *A.I.D.C.R.A Advertisement
   **Framework***, *(Inbound) Landing **Page** Review* — and reading the last occurrence silently
   discards every row above them. This one cost 8 of Sales & Marketing's 16 rows.
3. **Work in WORDS, not blocks.** PyMuPDF merges some of the deck's blocks across columns, so
   filtering blocks by x-position drops whole cells. Every word carries its own x.
4. **Group lines into a cell on the BOTTOM-to-TOP gap, and keep the threshold under 4pt.** Inside
   a cell the gap is ~0; between cells it is ~13.9pt on Strategic Orientation 2 but only ~4.4pt
   on Sales & Marketing. A threshold taken from the 9.8pt top-to-top leading welds neighbouring
   cells together, and each row then carries its neighbour's sentence.
5. **When a row has no cell of its own, find its partner by GEOMETRY.** That is a cell the deck
   merged across two rows. Looking a fixed direction — up or down — points Price For Delivery
   Medium at Vertical Integration, two rows away, whose text has nothing to do with it.

**And check the result against the approved menu drawing**, which independently marks the same
three shared cells. Agreement between a machine read and that drawing is the check that caught
each of the five above.

## 9. Where it lives

`data/strategy-frameworks.json` (`planningDomains`, `decks`, `frameworks`, `concepts`) ·
`server/utils/strategyFrameworks.js` · `server/utils/strategySessionStore.js` ·
`server/routes/strategyPlanner.js` · `components/strategy/StrategyScopeMenu.vue`,
`StrategyCaptureCard.vue`, `StrategyGrowthWheel.vue` · `pages/strategy-planner.vue` ·
`config/db-schema.sql`

⚠ **`StrategySessionScope.vue` was deleted in Stage 1**, not left beside its replacement. Two
menus that disagree is the drift this feature exists to end.

Tests: `strategyFrameworks` · `strategyConcepts` · `strategySessionStore` ·
`strategyPlanner.routes` · `strategyCapture.component`.

**The source material, in the repository since 2026-09-17** — read it before designing, not
the summaries written from it: [`design/planning-templates/`](../planning-templates/) holds
Mike's twelve decks and two workbooks, and `fill-in-tables/` beneath it the 21 templates a
client completes, in their original Word, PowerPoint and Excel so the real grid is readable.
[`design/PLANNING-TEMPLATE-CENSUS.md`](../PLANNING-TEMPLATE-CENSUS.md) is the measured survey:
scope, both form libraries, the concept inventory with page ranges, and the defects found.

⚠ **This machine could not open a PDF until 2026-09-17.** Every design decision before that
date was made from second-hand summaries. If a claim in this Brief predates it and concerns
what a slide looks like, check it against the deck.
