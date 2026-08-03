# Session Notes — 2026-08-04 · Laptop, Session 33

> **Nothing is unsaved.** `feat/advisor-progress` = `origin`, tree clean, suite **4,536 green /
> 262 suites**, lint 0 errors.
>
> **PR #37 is MERGED** — `d1f9c84`, same session it was raised, on Mike's instruction. Branch caught
> up by fast-forward: **0 ahead / 0 behind `master`**. Everything below is now in the shared copy.
> **No backend restart was needed for it** — every change is front-end text.
>
> ⚠ **PR #36's restart is STILL outstanding.** It merged this morning (`52935f1`) and those were
> engine changes; a running Restify process holds the old code until someone restarts it.

---

## What the next session most needs to know

**A field name decided whether 55 branches' instructions existed.**

The logic trees write their instruction under two different names. Some branches use `action`.
Fifty-five use `recommendation` — and [`formatNodeForPrompt`](../server/utils/logicTrees.js#L299)
reads `action` and never `recommendation`. Nothing else in the backend reads it either. So for
those 55, the instruction has never reached the AI.

It looks fine from every angle a test or a screen can see: all 55 still have `notes`, which *does*
reach the prompt, so the AI gets the background and silently loses the instruction. Nothing errors,
nothing renders blank, no output looks wrong.

**Carry this:** two field names for one idea, and only one of them wired up. Worth a look wherever
else the data files carry optional prose fields — the failure is invisible by construction.

---

## What was done

### 1. PR #36 reviewed and merged (`52935f1`)

Tested green locally first — **the repo has no CI, so the local run is the gate**, which is worth
knowing before merging anything here. Merged with all ten commits kept, branch caught up, pushed.

### 2. The decision-trace panel now translates (`f0de590`)

~30 strings from the "Why this recommendation" panel and its saved-case twin moved into
`locales/en.json`. A Spanish-speaking adviser was reading the whole trace in English. Six of the
strings were built in JavaScript rather than written in a template, which is why scanning the Pug
for English would never have found them.

Wording is character-identical and a test pins the exact strings, so a paraphrase during the move
fails the build.

**`decisionTraceAiFailure.test.js` was RE-POINTED, not weakened** — exactly as its own comment
instructed the next reader. It read the component source for the literal "No distinction changed
the scoring in this area." to prove the AI-failure branch comes first; it now follows the key
through the source and checks the words in `en.json`.

### 3. The "Why" column, built from one table (`373ef20`, `f25d9c0`, `fab6c3a`)

The engine records why each template scored what it did, as codes. The adviser's panel translated
7 of 26; the firm manager's saved case translated **none** and printed the raw codes. The missing
phrases were the symptom — the defect was a mapping living inside a component, so the second screen
showing the same table grew its own, empty one.

`utils/traceReasonCodes.js` now holds the table once; both screens reach it through
`mixins/traceReasonMixin.js`.

**All 26 phrases are Mike's**, ruled one question at a time and recorded in
[`WORDING-TRACE-REASONS.md`](WORDING-TRACE-REASONS.md) — committed *before* approval, per the
Save-the-Artefact rule, and now marked BUILT with its one deviation named. His five rulings: show
all 26 in English · numbers only on the firm's own levers · keep the second person · both vague
live phrases reworded · "held back" on all seven penalties.

**One test reads the engine's own source** for its `reasons.push` literals, so a code added upstream
with no English fails the build rather than reaching a screen raw. That is the check that would have
caught the original nineteen.

---

## Where the work stopped

**Nothing is half-finished in code.** The investigation below was stopped deliberately by Mike —
*"I don't want this to turn into a whole big job… bring it back to your original question"* — and
it stopped cleanly.

Two linked P1s are logged in full in [`ACTIONS.md`](ACTIONS.md)
([field-drop](ACTIONS.md#tree-recommendation-field-dropped),
[ghost names](ACTIONS.md#tree-prose-names-ghost-templates)):

- the 55 dropped instructions above, and
- **12 template names in tree prose that exist nowhere in the search JSON** (plus 4 that are real
  but misnamed — "Board Resolution" is really *FM Resolutions*). The ghost-reference checker only
  inspects `node.templates`; a name inside a sentence is never checked.

**Mike's ruling, in his words:** *"If it's trying to recommend a template, then if it's not in the
search JSON or not in the search file, then don't recommend it. Hold it back. If it's information
or content that sits within a template so it's coaching advice, then, of course, that's
different."* The search JSON is the authority on what exists.

**⚠ The two must be fixed together.** Nothing reaches an adviser today only because the field-drop
swallows those sentences first. Repairing the field alone would start feeding 12 non-existent tool
names to the AI.

**Left explicitly unverified**, rather than guessed: six names in the *proper* template lists are
also absent from the search JSON (*Lite Sales, Lite Data, Lite Planning, Lite People, Lite Process,
Growth Curve*), and `templates.json` (291) and the search JSON (280) appear to disagree about
"Growth Curve". Check before acting.

**A correction made during shutdown:** the two "RULING NEEDED" items about empty `templates[]` were
reported to Mike as closeable and are **not**. 26 of 47 empty branches are pure coaching and
correctly empty, but those two entries ask whether specific pages (*6 Hats*, *Growth Curve*,
*Sales Teams*) belong on named branches — a judgement about his content that counting cannot settle.
Both stay open.

## On conflicts

Today touched `components/VirtualAdvisor.vue`, `components/FirmManagerHub.vue`, `locales/en.json`,
two new files under `utils/` and `mixins/`, three test files, and `design/ACTIONS.md`.
**`ACTIONS.md` and `locales/en.json` are where a conflict would land.**

## Open for Mike

- ~~PR #37 — needs a reviewer and a merge.~~ **MERGED** the same session (`d1f9c84`).
- **Restart the backend** wherever it runs, for PR #36's engine changes.
- **Logic-Lab remains the desktop's.** Nothing here went near it, and the one question that touches
  it — whether `decisionScore.js` and the trace panel should agree on how much reasoning a firm
  manager sees — is written down, not acted on.
