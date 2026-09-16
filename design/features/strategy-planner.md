# Strategy Planner — the Brief

> ## ✅ ALL FOUR STEPS ARE BUILT AND WALKED IN A BROWSER. RECORDING IS NOT.
>
> To-do item **15.1**. Approved artefact:
> [`design/mockups/strategy-planner.html`](../mockups/strategy-planner.html) — **eleven
> decisions, all ruled by Mike on 2026-09-16**, registered in [`ARTEFACTS.md`](../ARTEFACTS.md).
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
it is what shaped the build. Counted from Mike's own Session Scope tables on 16 Sep 2026:

| | |
|---|---|
| Frameworks across the four Planning Domains | **45** |
| An advisor could capture, in the app | **0** |
| Answers surviving to the next session | **0** |
| Frameworks with a supporting calculator | 3 |

The decks carry tables forward between sessions, so having nowhere to put anything was the
feature's central defect rather than a missing nicety.

🔴 **The measurement is what produced the shape: ONE capture machine, never 45 screens.**
Re-run the same count to measure the build.

## 2. A framework is DATA, and never its own screen

**Decision 3, and the rule everything else hangs off.** A framework is a record in
[`data/strategy-frameworks.json`](../../data/strategy-frameworks.json) naming a **capture
shape**; one component draws them all.

| Shape | What it is | Built for |
|---|---|---|
| `buckets` | ideas sorted under named headings | The 8 Profit Levers |
| `quadrants` | exactly four boxes | SWOT / PEST |
| `forces` | five or six boxes, one marked centre | Porter's 5 Forces |
| `statements` | a short list side by side | Strategic Objective and Strategy |
| `actions` | a rows × columns table | the Action Plan |

**`placement`** — a 2×2 an owner is placed on, for the Heald Matrix and Business Dating — is
the one shape still missing.

🔴 **If a framework will not fit a shape, add a SHAPE — never a component for that framework.**
A shape is a grid rule plus an entry in `STRATEGY_SHAPES`; it serves all 45. A component serves
one, and 45 components is the build that never ends.

**A table is expanded into ordinary fields** (`row-3-whom` is just a field key), so the store,
the navigation timeline and the audit trail need no special case for it.

## 3. Two texts per framework, and they are not duplicates

- **`explores`** — the deck's own one-line Session Scope wording, shown on step 1. Mike ruled
  this on 2026-09-16 after laying the build beside the drawing: a domain holding fifteen
  frameworks is unreadable with paragraphs in that column.
- **The coaching summary** — long, written to the advisor, **joined from the domain support
  file** and shown on the framework card. It is never copied into the frameworks file.

A client choosing the scope and an advisor running the session need different sentences.
**Neither may be deleted in favour of the other.**

🔴 **The frameworks span THREE domain support files, not one.** Business Targets and Strategic
Orientation are in `strategy-domain-support.json`; **Sales & Marketing Review** is in
`sales-marketing-domain-support.json` and **Organisational Review** in
`staff-domain-support.json`. A build over the strategy file alone delivers half the session.

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

⚠ **NO STATEMENT IN THE STORE HAS EVER RUN AGAINST A REAL DATABASE.** It was written on the
laptop, which has no MySQL. A wrong column name or a broken join would pass every test. **That
check is desktop or UAT work** and is not done.

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
