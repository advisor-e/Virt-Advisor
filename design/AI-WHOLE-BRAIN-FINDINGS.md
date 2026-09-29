# The AI as a Whole Brain — what the code does today

> **Findings, not a design.** Read out of the code on 2026-09-29 for Mike's question: *can the AI,
> working in any one feature, draw on the knowledge and rules of every other feature — like the
> regions of a brain working together?* Nothing was built. Before anything is, the Impact Test in
> `CLAUDE.md` applies: the problem, the measurement, and what already does the job.

## The answer

**No — not consistently.** About 30 AI calls sit behind roughly 20 features. Each is handed a
briefing assembled for its own job. There is no shared client memory, no shared register of what
each call may read, and no single place a briefing is built. The app behaves as **specialists
passing notes**, not one brain.

## What each AI can see

| AI feature | Advisory content (templates, trees, domain support, distinctions) | This client's history | Report figures | Strategy Planner | Meetings |
|---|---|---|---|---|---|
| Advisory engine — Discover, Client, Plan, Learn (`server/advisorEngine.js`) | Yes, richly | Saved cases — client mode's first recommendation only | The model catalogue, figures from **defaults** only (`reportModelFigures.js`) | No | No |
| Course Builder (`server/courseEngine.js`) | Templates, domain support, logic trees | No | No | No | No |
| Planner Suggest (`routes/strategyPlanner.js` postSuggest) | No | Saved case summaries | No | Its own concept list | No |
| Concept summaries, Wordsmith (`conceptSummary.js`, `wordsmith.js`) | No | No | No | Its own capture forms | That segment's recording only |
| Meeting Summary, Coaching Notes (`meetingReports.js`) | Logic-tree names only | Previous meeting's actions | No | No | Yes |
| Next Steps, report page 8 (`routes/nextStepsDraft.js`) | No | No | The eight health colours only | No | No |
| Market research, sales blog, document readers, translation, hub reading | No (hub reading sees engine data) | No | No | No | No |

**The shape of it.**
- **Knowledge flows out of the advisory engine and never back in.** Course Builder, the Planner and
  hub reading borrow its content. The engine itself never sees a planning session, an approved
  meeting summary, or the client's real Business Performance Report.
- **Most existing links are screen-to-screen, not AI-to-AI.** Item 15.13 shows the report in
  *Assess current position*, but no AI call reads it. Approved Wordsmith wording and approved
  concept summaries are saved into other features, with no AI involved.
- **The one deliberate "brain" link** is the report-model catalogue given to the advisory engine
  (`reportModels.formatReportModelsForPrompt`). It works, and it needed the name-collision guard
  (`tests/unit/nameCollisions.test.js`) to stay honest.

## What a whole brain would take

1. **One client memory**: a single record per client of what every feature learned *and had
   approved*, each entry tagged with its source and whether it may reach a model.
2. **One knowledge register**: every rulebook and content set, and which AI features may read it.
   `design/CONTENT-ROUTING.md` does this for the advisory engine alone, and leaves 53 data files
   unclassified.
3. **One briefing builder**: every AI call asks it for what this client and this moment need, with
   the privacy rules applied once instead of at 30 call sites.

The hub-page rule then applies: a Mentor Hub screen showing what each AI reads. **Large work**: it
changes the input to every AI call, and the Scenario Lab measures only the advisory engine.

## Advantages over today

- **Joined-up advice**: the engine could know what was agreed in the planner and what the report shows.
- **No repeating**: intake confirms what is already known rather than asking again.
- **Privacy decided in one place**: today each call site decides for itself, and three got it wrong (below).
- **The north-star vision**: a firm's own content would inform every feature, not only the one it was entered into.

## Risks

- **Privacy, first.** Meeting content is cleared for two named uses only (Meeting Review; Wordsmith's
  Alignment Statements segment). A shared memory would carry it into other prompts, and each is a
  fresh ruling for Mike. It would also have to pass the twelve ZDR rules
  (`design/OPENAI-ZDR-CONSTRAINTS.md`).
- **More context can mean worse answers.** Discover without its template list invented names; with
  models and templates side by side it confused look-alikes. Every added source must be benched.
- **Harder to explain.** "Why did it say that?" gets harder to answer as more sources blend.
- **Cost and speed.** Larger prompts cost more and run slower; moderating whole prompts once blew
  the 20k-per-minute limit.
- **A wrong memory spreads.** One bad approved note would influence every feature, not one.

## Recommended first step

Do not build the whole brain. Measure **one named link** first: the advisory engine seeing the
client's **approved** planner answers and report health colours, benched on Scenario Lab cases
where that knowledge should change the recommendation. If the bench does not move, the larger
build has not earned its place.

## Faults found while reading — each filed on the live list, 2026-09-29, on Mike's instruction

| Ref | Fault |
|---|---|
| 15.29 | Wordsmith can write one client's approved wording into another client's plan in the same firm |
| 7.14 | The primary-issue tie-break sends the advisor's words about a client marked not personal |
| 15.30 | Planner Suggest sends a client's saved case summaries as not personal, with no moderation |
| 40.1 | Nothing on the AI Prompts tab changes what any AI is sent |
| 8.6 | After a recorded strategy session, the next meeting's coaching notes check nothing from it |
| 7.15 | In client mode the engine reads past case studies and never uses them |
| 7.16 | A privacy test's comment says the engines bypass the privacy seam; they no longer do |
