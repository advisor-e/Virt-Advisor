# Strategy Planner — the Brief

> ## 🔴 REDIRECTED BY MIKE ON 2026-09-17 — the built four steps stand, the shape ahead of them does not
>
> **Design from the OUTPUT.** In his words: *"I want the final output to break down to each
> concept/slide/s within the template in the menu so that an advisor can complete the initial
> session check and have a strategic plan formatted to include the necessary concepts/slides
> into 1 seamless document that can easily expand over time."* And: *"each concept needs to be
> presented AS IT CURRENTLY APPEARS in the slides."*
>
> **Nothing below §7 has been redesigned yet.** The four steps described here are built and
> walked in a browser, and they keep working — but the framework model in §2 is superseded and
> is marked so. **Read [`design/PLANNING-TEMPLATE-CENSUS.md`](../PLANNING-TEMPLATE-CENSUS.md)
> before designing anything**: it is the measured survey of Mike's own templates that the new
> direction rests on.
>
> To-do item **15.1**. Approved artefact:
> [`design/mockups/strategy-planner.html`](../mockups/strategy-planner.html) — **eleven
> decisions, all ruled by Mike on 2026-09-16**, registered in [`ARTEFACTS.md`](../ARTEFACTS.md).
> ⚠ That drawing predates the redirection. Its **rulings still bind** (Decision 5 especially);
> its **screens do not describe the target any more.**
>
> **Step 1 — scope the session.** The four Planning Domains, each opening Mike's own Session
> Scope table from ADV.0 Planning Outcomes: Framework · What it explores · Helps your client
> to… · Include. The advisor picks the client and ticks the frameworks.
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

## 1. Why it exists, measured before it was designed

The impact test was run **before any of this was drawn** (CLAUDE.md's rule of 2026-09-16), and
it is what shaped the build. Counted from Mike's own Session Scope tables:

| | |
|---|---|
| Concepts across the four Planning Domains | **51** |
| An advisor could capture, in the app | **0** |
| Answers surviving to the next session | **0** |
| Concepts with a supporting calculator | 3 |

The decks carry tables forward between sessions, so having nowhere to put anything was the
feature's central defect rather than a missing nicety.

🔴 **The measurement is what produced the shape: ONE capture machine, never 51 screens.**
Re-run the same count to measure the build.

**The 51 is Mike's own scoping ruling of 2026-09-17** — the menu is the five main documents'
own contents pages and agendas, nothing else. It replaces an earlier count of 45, which was
taken from ADV.0's index rather than from the decks themselves and was therefore inheriting
that file's drift. `design/PLANNING-TEMPLATE-CENSUS.md` §1 holds the per-document breakdown
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
form is a grid rule plus an entry in `STRATEGY_SHAPES`; it serves all 51. A component serves
one, and 51 components is the build that never ends.

**A table is expanded into ordinary fields** (`row-3-whom` is just a field key), so the store,
the navigation timeline and the audit trail need no special case for it.

### Every concept has TWO forms — taught, and captured

**Mike's ruling, 2026-09-17:** *"each concept needs to be presented AS IT CURRENTLY APPEARS in
the slides."* Measuring his templates against his fill-in tables the same day showed those are
two different things, and that the second is far smaller than the first:

| | | |
|---|---|---|
| **Teaching form** — drawn as the slide draws it | a ring, a staircase, a curve, a 2×2 | **21** across the 51 |
| **Capture form** — the table the client completes | almost always a grid | **9** across the 21 fill-in templates |

**Nothing is ever filled in as a ring, a staircase or a curve.** The Org Chart proves it: what
gets typed is a flat *role / reports to* list, and the hierarchy tree is only the rendering.
**The plan document carries the capture, never the teaching.**

The full libraries are in
[`design/PLANNING-TEMPLATE-CENSUS.md`](../PLANNING-TEMPLATE-CENSUS.md) §3, each form traced to
the templates that use it — **the banded grid alone carries S.W.O.T, Porter's, Blue Ocean
Fronts, Insights Summary and the Profit Levers.**

⚠ **The five shapes built in September 2026 — `buckets`, `quadrants`, `forces`, `statements`,
`actions` — cover about three of the 51 honestly, and TWO OF THEM ARE WRONG against Mike's own
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
| **Everything the redirection opened** | How each of the 21 teaching and 9 capture forms is drawn · how the output document assembles them · how a manager ADDS a concept at each tier (Mike's request, 2026-09-17, mentor cascading down) · whether Sales & Marketing's "Where To Start??" routing flow becomes part of the session check. **None of this is designed. Do not assume it from the September drawing.** |

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

## 8. Where it lives

`data/strategy-frameworks.json` · `server/utils/strategyFrameworks.js` ·
`server/utils/strategySessionStore.js` · `server/routes/strategyPlanner.js` ·
`components/strategy/` · `pages/strategy-planner.vue` · `config/db-schema.sql`

Tests: `strategyFrameworks` · `strategySessionStore` · `strategyPlanner.routes` ·
`strategyCapture.component`.

**The source material, in the repository since 2026-09-17** — read it before designing, not
the summaries written from it: [`design/planning-templates/`](../planning-templates/) holds
Mike's twelve decks and two workbooks, and `fill-in-tables/` beneath it the 21 templates a
client completes, in their original Word, PowerPoint and Excel so the real grid is readable.
[`design/PLANNING-TEMPLATE-CENSUS.md`](../PLANNING-TEMPLATE-CENSUS.md) is the measured survey:
scope, both form libraries, the concept inventory with page ranges, and the defects found.

⚠ **This machine could not open a PDF until 2026-09-17.** Every design decision before that
date was made from second-hand summaries. If a claim in this Brief predates it and concerns
what a slide looks like, check it against the deck.
