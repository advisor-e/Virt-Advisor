# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-06 (third session) · Laptop · branch `feat/advisor-progress`

Suite **7,991 green** (413 suites), lint **0 errors**. Everything pushed, each commit through
the full gate. Nothing is uncommitted.

### ✅ SLICE 2 IS BUILT — an advisor can reach the economic analysis

Step 5 of the forecast, on Mike's *"get it done so we can get it built"*.
`components/EconomicAnalysisStep.vue` + a fifth chip on `pages/three-way-forecast.vue` +
a fifth `ProvenanceBadge` state. **Five differences from the drawing are named ON the
drawing**, and its stale *"Open — none of this is settled"* closing section is corrected.

**Slice 3, the printed pack, is the last piece and is NOT built.**

Two things in that build worth not rediscovering: the privacy ruling is the **first test in
the file**, asserting the request body key by key (only `brief` and `clientRef`) — a screen
that quietly added the client's name would look identical in UAT. And there is **no
`v-html`** on the screen: model text is parsed into text/bold/link tokens, so a
`[label](javascript:…)` cannot become a link, and a test pins that.

### 🔴 4.66 IS STILL ACTIVE ON THE LAPTOP — `activeOn` stands

Slice 2 touches `ThreeWayForecastIntake.vue`. Do not start it on the desktop.

### The session in one line: one setting was confirmed, and four faults fell out of it

The job was to confirm the model name. Doing it live found four defects, **none of which any
test could have caught**, and all four are fixed.

| | Before | Now |
|---|---|---|
| `getRun` | 🔴 **The backend would not boot AT ALL** | restify's callback form, like `health.js` |
| Model | `gpt-4o`, a guess — never searched | **`gpt-6-astra`**, on record |
| Searching | Asked for in the prompt, and declined | `tool_choice: 'required'` |
| Search phrases | All ten arrived empty | read from `.done`, where the query exists |

**The boot failure is the one to understand.** `getRun` was neither an async 2-arg handler nor
a callback 3-arg one, and restify asserts at *mount* time — so every route on this branch had
been down since `46d5715`, that morning. The suite was green throughout, because nothing in
this repository ever starts the server. Same family as the missing `nuxt build` gate.

### 🔴 The thing that must not be undone

**`tool_choice: 'required'` in `server/routes/economicAnalysis.js` is load-bearing.** Without
it the model decides for itself whether to search, and on the first live run it decided not
to — returning a confident, correctly numbered, **entirely unsourced** outlook in ten seconds.
The validator refused it (`SECTION_UNSOURCED`). §3 of the prompt asking it to search is not a
control. This is the citation fix's lesson a second time.

### Run 5 is on the evidence page, and it is the first with its model named

`gpt-6-astra` · 141 s · 10 searches · 2,013 words · 29 citations · 22 official sources ·
99,024 in / 5,422 out. **The cost is deliberately not recorded** — the published rate could
not be retrieved, so the usage is there to check a bill against rather than an estimate
nobody verified.

Every guardrail held: five numbered sections found, no lending view, no forecast of the
business's own figures, and **§4 came back with no figures at all** — so the no-restatement
rule survives a change of model. It also handled a genuine source disagreement on freight
exactly as §3 asks.

### Two things a later session would otherwise rediscover

- **The tests had encoded the same wrong assumption as the code.** A fixture invented a
  `response.output_item.added` event carrying `action.query` — a shape the API never sends —
  and an assertion insisted the `.done` event be *ignored*. 67 tests passed regardless. They
  now use the shapes captured from the live stream, and one assertion exists purely to stop
  double counting.
- **Screen 3 still cannot be built as drawn.** The API does not say which output section a
  search belongs to, so the four ticking research areas would be a guess dressed as progress.
  Slice 2 shows the model's real search phrases instead — which is only possible now that
  they actually arrive.

### Records brought back into line with the code

- `ECONOMIC-ANALYSIS-TEST-RUNS.md` — run 5 added; the run-4 caveat now says re-checked.
- `ECONOMIC-ANALYSIS-PROMPT.md` — §7 closed out; **§6 now reads "Settled — nothing on this
  page is open"**, Mike having approved the numbering sentence ("yes") once the live run showed
  the guard finds section 4 by its number.
- `ARTEFACTS.md` — its Economic Analysis row still claimed *"no route, no component, no entry
  in `data/ai-prompts.json"*, three of which had been false since that morning.

### Next

**Slice 3 — the printed pack.** The research prints as its own section after the cash flow,
with the five headings, the figures beside their sources, the full source list, **and the
"what could not be sourced" section**, every page carrying the AI research tag. The screen
already promises all of that in `inPackBody` / `inPackTag`, so until slice 3 exists those two
sentences describe something that does not happen yet — which is the first thing to fix or to
soften.

⚠ **Nobody has yet watched slice 2 drive a real run in a browser.** The component is proven
by 21 tests against a stubbed `fetch`, and the engine by run 5, but the two have not been put
together on screen. That is a five-minute look with the backend running and
`ALLOW_DEV_AUTH=true`, and it is the honest next check before slice 3.

**4.15, 4.50, 4.58, 4.60, 4.62, 4.65 unchanged and untouched today.** Seven items live.
