# Virt Advisor — Action Backlog

> **📋 2026-07-10 full-app bug-fix pass — master-team handover:**
> [`SESSION-2026-07-10-NOTES.md`](SESSION-2026-07-10-NOTES.md). 8 commits on
> `feat/business-performance-report` (`master` untouched); 2 critical + several high
> fixes, mostly in the **original app**, all tested + stack-audited. Details also in the
> **CODE-REVIEW SWEEP — 2026-07-10** section below.
>
> **The single prioritised list of every OPEN task.** Triage from here.
> Completed work lives in [`ACTIONS-ARCHIVE.md`](ACTIONS-ARCHIVE.md) (verbatim, by date) — nothing is deleted, only moved once done.
>
> **Governance rule (no silent parking):** no item may be deferred in an inline note anywhere (registry / HANDOFF / code) **without also adding a line here**. The note and the backlog line are created together. See memory `feedback-no-silent-parking`.
>
> **Stack-deviation rule (binding, see `CLAUDE.md` → Stack Constitution):** any variance from the team's locked stack spec — a dependency version bump, a new plugin, a framework variation — is logged here as a **P1 (critical) reconcile task the moment it is found or introduced**. Drift is never silently accepted.
>
> **Legend** — Status: ☐ open · ◐ in progress · 🔒 blocked/gated. Type: **SEC** security · **WIRE** wiring · **BUILD** · **DECISION** (needs Mike) · **EDIT-TARGET** (no-code editing) · **DOC**.
>
> **⚠ Trust the CODE, not these flags.** Three separate items (Intervention Urgency, cause-first confirmation, grade-validation) were found *already built* while still flagged open. **Verify a candidate against the actual code/git before building it.**
>
> **Last swept:** 2026-06-29 (Stage E built; see ★ block).

---

## ★ BIGGEST PRIORITY RIGHT NOW

- <a id="course-session-domain-briefing"></a>✅ **P1 · FIX — Course Builder's session briefing reached the WRONG domain materials.
  FOUND *and* FIXED 2026-07-30 (approved by Mike, this branch, commit `dd0b031`). Full suite 2,016
  green / 134 suites, lint 0 errors. Measured effect: across the 29 domains, materials reaching the
  session prompt go 51 → 181 — and 51 was the *best case* for the old code (`people-power` 3 → 26,
  `sales-marketing` 2 → 17, `get-seminar` 3 → 16). No longer blocks the 3 new source documents.**
  - **The fix (3 files, no selection logic touched):** the name-match filter and the
    `materials.slice(0, 1)` fallback are gone from
    [`formatDomainContextForSession`](../server/utils/domainSupport.js); it now sends the detected
    domain's full material set in file order, mirroring `formatDomainSupportForPrompt` on the advisor
    path. The dead `resourceNames` parameter was removed and its single caller updated
    ([`courseEngine.js`](../server/courseEngine.js) L360) — the session's own resources are still
    injected separately by `sessionInject`, so nothing was lost. The legacy `support_tools` branch got
    the identical fix: no repo file is on that shape, but a firm override can be, so it is live code
    that carried the same defect. **No cap added, deliberately** — worst case ~7.4k tokens
    (`people-power`), median ~1.7k, volume the advisor path already carries; if one is ever needed it
    must say that it capped (no-silent-caps rule).
  - **Tests — new [`tests/unit/domainSupportSessionReach.test.js`](../tests/unit/domainSupportSessionReach.test.js),
    36 cases.** The one that earns its keep is the **sweep over all 29 domains** asserting every row
    reaches the prompt: a spot-check would have passed throughout the defect's life, because `eoy`'s
    first material was always the row the fallback happened to show. It also guards itself against
    passing vacuously (asserts ≥29 domains, all carrying materials — the trap the entry-node work
    recorded). Plus: the 16 formerly unreachable `get-seminar` rows now appear; output is byte-identical
    whatever second argument is passed (direct proof the coupling is gone); the legacy branch is
    unfiltered; **every** firm-authored row is still fenced, not just the first (more rows reaching the
    prompt means more untrusted text, so the security control is proven per row); and both engine paths
    agree on the material set, so a filter re-added to one and not the other fails here.
    Two earlier tests that *pinned the defect* ("renders a material matched by resource name",
    "falls back to the first material") were replaced, not deleted quietly — noted in place.
  - **Root cause, worth keeping:** the premise was wrong, not the predicate. **CB-33 already
    established that material names are teaching concepts, NOT template names** (comment at
    `formatDomainSummaryForDesign`; CB-02 grounding strips them from `resources`), so matching them
    against template names compared two namespaces the codebase had already ruled distinct. Measured
    before the fix: 66 of 181 rows unmatchable by ANY library page, 22 of 29 domains with no exactly
    matching row, 12 rows matching >8 pages each. Two failure modes — under-match → silent row 1;
    over-match → first-word collision (`Business Dating` matched `Business Targets`).
    Adding a `page` field per row was considered and rejected: only 14 of 181 rows are named for a
    library title and 42 more name one in prose, leaving **125 rows needing a human ruling**.
  - **Scope, verified not assumed:** `formatDomainContextForSession` had exactly ONE caller in the
    codebase. The four advisor-facing modes ("I have a client situation", "find something specific",
    "plan ahead", "learning more") use `formatDomainSupportForPrompt`
    ([`advisorEngine.js`](../server/advisorEngine.js) L2248/L2787/L3145) and are untouched; course
    *design* uses `formatDomainSummaryForDesign` and is untouched. **Template selection is unaffected** —
    that is `resolveTemplatesWithOutlier` + `walkLogicTree` + distinctions, which never read domain
    support (§0.6 ruling: the support doc briefs the AI, it does not pick templates).
  - **⚠ NOT PROVEN BY EYE — needs Mike.** Session content generated by Course Builder **will differ**;
    that is the point of the fix, not a side effect. The Scenario Lab drives the template resolver and
    never reaches `courseEngine`, so it is **structurally blind here — no lab delta is claimed.** The
    tests prove what the prompt now contains; whether the generated sessions read better is only
    provable by generating some (needs `OPENAI_API_KEY`) and reading them.
  [`formatDomainContextForSession`](../server/utils/domainSupport.js) (L277–286) name-matches each
  material against the session's `resources`, then falls back to `materials.slice(0, 1)`. It is live
  on **every** session generation ([`courseEngine.js`](../server/courseEngine.js) L359–361) —
  unconditional, straight into the system prompt, with no error and no empty section.
  - **Measured across all 29 domains / 181 rows using the engine's own predicate:** **66 rows (36%)
    cannot be matched by ANY library page**; 22 of 29 domains have no row matching a page title
    exactly; 12 rows match more than 8 pages each. Two failure modes — **under-match:** the AI
    silently gets row 1 whatever the session is about; **over-match:** unrelated materials pulled in
    on a first-word collision (`Business Dating` matches 6 pages incl. *Business Targets*;
    `Sales & Marketing Review` matches 19).
  - **Same failure shape as the storage-key P1 fixed earlier today** — firm-authored content
    silently never reaching the AI — except that one was latent until MySQL and **this one is live in
    a shipped feature Mike has proven end-to-end.**
  - **🔑 The premise is wrong, not the predicate.** CB-33 already established that material names are
    **teaching concepts, NOT template names** (comment at `formatDomainSummaryForDesign` L349–351;
    CB-02 grounding strips them from `resources`). This formatter matches those same names *against*
    template names — two namespaces CB-33 ruled distinct. So "add a `page` field and match better" is
    the wrong direction, and unaffordable regardless: only **14 of 181** rows carry a name that is a
    library title, 42 more name one in prose, leaving **125 rows needing a human ruling**.
  - **Proposed fix (needs its own approval):** drop the name-match and the `slice(0,1)` fallback; send
    the detected domain's **full** material set, exactly as the advisor path
    (`formatDomainSupportForPrompt`) already does. Cost measured: worst case `people-power`
    ~7.4k tokens, median ~1.7k — the advisor path already carries that same volume, so no new
    token-limit risk (contrast the 52k all-summaries case that *did* blow the limit, L156). Any cap
    added later must **state** that it capped (no-silent-caps rule).
  - **Honest limit on proof:** the Scenario Lab drives the template resolver and never reaches
    `courseEngine`, so it is **structurally blind here — no lab delta may be claimed.** Unit tests can
    prove every row now reaches the prompt; whether the generated sessions read better is only
    provable by generating them (needs `OPENAI_API_KEY`) and reading them by eye.
  - **Blocks:** transcription of the 3 new source documents (2026-07-30). 14 new rows into this path
    would *worsen* the over-match — `strategy` goes 4 → 13 rows with shared first words
    (*Business* Targets / *Business* Dating, *Orientation* Part 1 / 2, *Profit* Levers).

- <a id="content-routing-map"></a>✅ **P1 · BUILD — a visible routing map: which material reaches
  CLIENT RECOMMENDATIONS, and which is ADVISOR-READ-ONLY. BUILT 2026-08-01 (approved by Mike, this
  branch). Full suite 2,131 green / 141 suites, lint 0 errors.**
  - **What shipped.** [`scripts/generate-content-routing.js`](../scripts/generate-content-routing.js)
    → [`design/CONTENT-ROUTING.md`](CONTENT-ROUTING.md), `npm run routing`. **491 assets classified,
    0 unknown**: 236 client-recommendation · 29 AI-briefing · 226 advisor-read-only. One row per asset
    with the lane, the code path that decides it, and the evidence.
  - **Half of it already existed and had not been recorded here.** The classifier
    [`server/utils/contentRouting.js`](../server/utils/contentRouting.js) plus its build guard landed
    on 2026-07-31 in `4622f19` — but **nothing consumed it**, so the report this item actually asked
    for did not exist. The generator reads that module rather than re-implementing the rules, so the
    guard and the report can never disagree.
  - **🔴 TWO DEFECTS FOUND IN THAT CLASSIFIER while checking its numbers, before publishing anything.**
    Both would have printed a false figure in a governance report — the exact failure this item exists
    to prevent.
    - `_comment`, a documentation string sitting beside the banks, was **counted as a quiz bank** — 63
      reported where the firm has 62.
    - It read `bank.questions`; every consumer (`courseEngine.js` L455/L550, `firmQuizzes.js` L99) reads
      **`bank.entries`**. So all 62 banks reported **`questions=0`**. The *lane* was right — that comes
      from the require-chain, not the count — so the row looked classified while its evidence was false.
    - **Post-fix: 62 banks / 652 questions, independently matching the CB-30 record.**
    - **Why the existing guard missed both:** it asserted `length >= 60` and the lane, never the evidence
      it prints. Two assertions added — no `_`-prefixed id, and every bank reports a non-zero count with
      a ≥500 aggregate so it cannot pass on one stub bank.
  - **Blind spots are DERIVED, not typed.** The report subtracts what the classifier reads from what is
    on disk, so a new data file appears in "what this map does not cover" by itself. **30 data files are
    named as unclassified today** — including `signal-dictionary.json`, which *does* drive selection, so
    the gap is real and now visible rather than assumed away. Only the PLATFORM layer is classified;
    firm overrides resolve at runtime and are not on disk to read.
  - **✅ Freshness guard — the STATUS.md lesson applied**
    ([`tests/unit/contentRoutingReport.test.js`](../tests/unit/contentRoutingReport.test.js), 7 cases).
    The report is regenerated in memory and compared; if content data moves, `npm run routing` must be
    run before committing. Added because **STATUS.md was found ~260 lines stale on 2026-08-01** — a
    generated file with no freshness test rots and is then believed. **Proved it can actually fail**
    (changed count, changed table row, truncated file — all three detected). That proof found a flaw in
    the guard's own failure message: `findIndex` returns −1 when one file is a truncation of the other,
    which would have reported "line 0" and "(end of file)" for both sides; it now names the length
    difference instead.
  - **⚠ STILL OPEN, for Mike:** whether this also becomes a visible screen in Firm Manager or stays a
    developer report. The recommendation in the original entry — build the generated report first and
    decide on a screen once the real table is visible — is now actionable: the table exists to look at.

  <!-- Original entry, kept for the reasoning: -->
  - Raised by Mike 2026-07-31, after the
  `flat_if_then` finding on the three new logic tables: client-facing logic was about to be filed
  in a shape the engine never walks, which would have looked complete on screen and influenced
  nothing.
  - **The failure class this guards.** Content filed in the wrong lane is invisible — it renders,
    it saves, it passes tests, and it silently never reaches the AI. That has now happened three
    times: the domain-support storage-key P1 (2026-07-30), the Course Builder session-briefing P1
    (2026-07-30), and this near-miss. All three were found by hand. Nothing in the app shows the
    routing, so there is no way to notice the next one.
  - **What to build:** a GENERATED table — a script plus a committed report, never hand-maintained,
    because a hand-written copy is wrong the day an asset moves. One row per content asset:
    asset · type · lane (client-recommendation / advisor-learn-only / both) · the code path that
    decides the lane · evidence.
  - **Must cover at least:** the 42 logic trees (`nodes` = walked, its `templates` become client
    recommendations; `flat_if_then` = Learn-mode reference, never walked —
    [`logicTrees.js`](../server/utils/logicTrees.js) L257–261); the 29 domain-support files (they
    brief the AI, they do NOT pick templates — §0.6 ruling); `data/templates.json`
    (`includedInClient`); the 62 quiz banks; the distinctions cascade.
  - **Must state its own blind spots** (no-silent-caps rule): any asset it cannot classify is
    listed as UNKNOWN — never omitted, and never defaulted into a lane.
  - **Open, for Mike:** whether this also becomes a visible screen in Firm Manager, or stays a
    developer report. Recommendation: build the generated report first — it is the thing that
    keeps the answer true — and decide on a screen once we can see the real table.

- <a id="staff-tree-entry-triggers"></a>✅ **P1 · WIRE — the 8 new Organisational Review branches were wired
  correctly inside a table that never opened for the conversations they were written for.
  FOUND *and* FIXED 2026-07-31 (approved by Mike, this branch, commit `9b4c65c`). Full suite 2,062
  green / 137 suites, lint 0 errors.**
  - **The evidence.** A table is selected by matching the advisor's words against its `entry_triggers`
    ([`logicTrees.js`](../server/utils/logicTrees.js) `detectLogicTree`). `staff_performance`'s list was
    all performance language — *staff, morale, productivity, hiring, disharmony*. Run against the live
    detector: *"nobody knows who reports to whom and the org chart is a mess"* → **no tree selected**;
    *"our meetings go nowhere, cynical snipes and sulking"* → **none**; *"our stated values mean
    nothing"* → **none**. *"my staff are driving me nuts"* → `staff_performance`, as before.
  - **Severity corrected during the fix, and worth carrying.** The original entry measured **bare
    openers**. Production runs the detector over the **whole `collectedAnswers` block**
    ([`advisorEngine.js`](../server/advisorEngine.js) L2383) and walks **every** tree scoring ≥1, not
    only the winner. Rebuilding four realistic full conversations: **two did reach the table — but by
    accident**, on the generic word *culture* appearing in an unrelated answer; the two structural ones
    still reached nothing. Not "the door never opens" — "the door opens by luck about half the time,
    and never for the structural conversations".
  - **The fix: 22 phrases added (37 → 59)** — structure (*reporting lines, who reports to whom, org
    chart, chain of command, organisational/organizational structure, organisational review*), meetings
    (*meeting behaviour/behavior, passive-aggressive, meetings go nowhere, sulking, cynical, snipes*),
    values (*core values, values clash, stated values, value stack*), feedback and decisions (*feedback
    loops, how decisions get made*), typology (*typology, individual typologies*).
  - **🔑 Six words deliberately left out — the part that took the checking.** *Confirmation bias,
    optimism bias, decision making, leadership style, enneagram* and *job creep* all read as if they
    belong here, but each is **already owned** by a table built for it: `governance`,
    `org_firm_board_pack`, `org_leadership`, `conflict_meeting`, `fm_coach_culture`. Taking them would
    move conversations that land correctly today. *Confrontation* was left out for the same reason.
    All 22 added were checked against all 42 trees and owned by nobody.
  - **Measured before vs after in two separate processes with different `cwd`** — never through
    `firmTrees`, which merges onto the platform bundle and would make both sides read the new file
    (the 2026-07-30 trap). **1,063 probes across all 42 trees: zero winners moved.** 10 conversations
    changed, every one from no-tree to `staff_performance`.
  - **One target deliberately not fixed:** *"people react completely differently when things get
    tough"* still selects `conflict_meeting` — a symptom with no organisational word in it, so no
    trigger can catch it, and that destination is defensible.
  - **New test** [`tests/unit/staffTreeEntryTriggers.test.js`](../tests/unit/staffTreeEntryTriggers.test.js),
    19 cases. It asserts the **outcome** — which table opens for a realistic sentence — never the
    trigger list itself; a test that re-listed the 22 phrases would pass whatever the detector did with
    them. **Do not fix by widening the branch pattern instead:** that is the layer *below* selection and
    cannot open a table the detector never chose.

- <a id="people-power-openers-dead"></a>☐ **P2 · WIRE — two People Power situations open NO table at all.**
  Found 2026-07-31 while writing the test above: two control fixtures failed, and checking them against
  the **pre-change** file proved both were already broken — nothing to do with the Organisational Review
  work, and present since long before it.
  - *"the owners are not aligned and it is causing friction"* → `sp_sit_owners_misaligned`, **no table**
  - *"considering offering shares to key staff to lock them in"* → `sp_sit_remuneration`, **no table**
  - **Left alone deliberately.** Fixing them widens which table fires, so it needs its own approval and
    its own before/after — the same discipline the item above followed. Recorded in the test file so
    their absence from the fixture list cannot be mistaken for an oversight.
  - **Subsumed by the vocabulary sweep below** if that is done first; listed separately because these
    two are named, evidenced and cheap.

- <a id="trigger-vocabulary-sweep"></a>☐ **P1 · WIRE — the trigger lists match *phrasings*, not *subjects*.
  This is the general form of the two items above, and it affects all 42 tables.** Diagnosed 2026-07-31.
  - **The evidence.** The word `staff` is **not** a trigger. What exist are seven phrases *containing*
    it: *my staff, the staff, staff are, staff problems, staff performance, staff not performing, staff
    driving me*. So "key staff", "our staff", "their staff" all miss. Same for `owner` (only *owner
    relations*) and `team`.
  - **Measured, one realistic opener per branch: 11 of 13 reach nothing on the staff table** — and most
    of those are its **original** branches, not the 2026-07-31 additions: *"their attitude is the
    problem, they have checked out"*, *"they simply do not have the skills for the job"*, *"the owner is
    beaten up by the business"*, *"they are about to take on new people"*. Across eight other tables,
    **6 of 8** natural openers miss (valuation, governance, systems, risk management reach nothing or
    the wrong table).
  - **What is actually lost, stated precisely rather than alarmingly.** A missed table does **not** leave
    the advisor empty-handed — templates still come from signals and distinctions. What is lost is (1)
    the firm's diagnostic reasoning in the AI's context ([`advisorEngine.js`](../server/advisorEngine.js)
    L466), (2) the weak `TREE_HINT_BOOST` (+3) toward the pages that reasoning points at, and (3) the
    zero-candidate fallback. When the **wrong** table opens, the AI is handed irrelevant reasoning —
    worse than none.
  - **⚠ CORRECTION 2026-08-01 — the reassurance above is thinner than it reads, measured through the
    new probe.** Run through all three deterministic layers, the named openers *"their attitude is the
    problem, they have checked out"*, *"they simply do not have the skills for the job"* and *"we have
    had high turnover and are rehiring constantly"* return **no table, no domain and ZERO signals**. So
    "templates still come from signals" does not hold for these three: the signal layer is as blind to
    them as the trigger layer. The domain **is** recoverable — the AI backstop picks it up — and the
    distinctions layer is AI-judged so the probe cannot see whether it would have caught them. Two
    caveats kept deliberately: production matches over the whole `collectedAnswers` block rather than a
    bare opener (the 2026-07-31 severity correction stands, and is not being walked back), and three
    sentences are not a measurement of all 42 tables. Recorded because the original wording would let
    someone conclude the gap is cushioned when for these cases it is not.
  - **Scope, and why it is not one commit.** 42 tables, each needing candidate words checked against the
    other 41 (so nothing is stolen) and a real before/after. **The words are the firm's language**, so
    each table's list needs Mike's wording approval — this is not a bulk mechanical edit.
  - **Do this AFTER the word-boundary fix** (`4debcfc`, below), which is done: widening trigger words
    while short triggers still fire inside other words means measuring two moving parts at once.
  - **Known casualty to fix here:** the Scenario Lab case `staff·high turnover` now opens no table. It
    had been reaching `staff_performance` only because *hiring* matched inside "re**hiring**" — right
    answer, wrong reason. Needs a *turnover* / *rehiring* trigger.
  - **✅ TOOLING FOR THIS SWEEP — BUILT 2026-08-01 (approved by Mike, this branch, commit `754d204`).
    Suite 2,111 green / 139 suites, lint 0 errors.** Raised by Mike: a read-only view of what affects
    what, aligned with the tests, that warns of effects *before* a change. **Step 1 of two — backend
    only, NO SCREEN YET, nothing eyeballed.**
    - **What exists now.** [`server/utils/phraseProbe.js`](../server/utils/phraseProbe.js) +
      `logicTrees.explainDetection` answer two questions: *what does the engine do with this sentence*
      (domain detected · tables opened **and the exact phrases that opened them** · signals extracted),
      and *if I add these words, what moves* — the corpus run twice, reporting GAINED (with the table it
      was **taken from**), LOST, otherMoves and unchanged. Two read-only routes behind the existing
      `fmGuard`; **neither writes anything**, the proposal is merged in memory and discarded.
    - **It replaces a day of hand-measurement with about a second.** Proposing the four phrases this
      item recommends: **1 gained** (exactly the `staff·high turnover` casualty above, on *rehiring*),
      **0 taken from another table**, 0 lost, 469 unchanged — the "nothing is stolen" check this item
      says each of the 42 tables needs.
    - **The measurement trap is designed out, not avoided by care.** Both runs happen in ONE call with
      explicit inputs, so neither can read the other's edit as its own baseline (the 2026-07-30 trap).
      The proposal merges exactly as a save would (`firmContent.mergeEntry`, arrays replace wholesale)
      and drives the REAL detector — no second scoring implementation exists.
    - **Single source, not a third copy.** `advisorEngine` gained ONE line exporting `DOMAIN_PATTERNS`
      (no existing line changed, no behaviour moved) so the probe scores domains with the engine's own
      compiled patterns. `scripts/domain-detection-check.js` already keeps one copy; a third would be
      exactly the drift this week's routing defects were made of.
    - **The test that earns its keep** ([`tests/unit/phraseProbe.test.js`](../tests/unit/phraseProbe.test.js),
      28 cases): across all 470 corpus sentences, `explainDetection` must agree with the real
      `detectLogicTrees` on ordering and `detectLogicTree` on the winner. A spot-check would pass for
      years while the two diverged, after which the screen would explain a decision the engine never
      made — worse than no screen, because it would be believed. The corpus is asserted non-trivial so
      the guard cannot pass vacuously.
    - **Found by those tests and fixed in the same commit:** the phrase cap was 50 while
      `staff_performance` carries **59** triggers, so a firm rewriting the biggest table would have had
      9 phrases silently ignored. Raised to 200 (sized against the data), and anything beyond the cap is
      counted into `phrasesIgnored` — never dropped in silence.
    - **⚠ CORPUS LIMIT, reported in the payload itself.** The 470 sentences are branch conditions (419)
      and Scenario Lab cases (51) — the firm's own words, nothing invented, nothing to hand-maintain.
      They are **NOT** recordings of advisor speech, so they show what a change would take from other
      tables but do **not** prove a table opens for natural language. The typed probe covers that. Two
      of the four phrases tried above moved nothing precisely because advisors' wording is not in the
      corpus — the limit is real, not theoretical.
    - **⚠ The 4th phrase layer is NOT covered, by design** — see the distinctions-cap item below. Every
      response carries `notMeasured` naming it, so the tool can never read as "nothing else affects this".
    - **NEXT: the screen** (Step 2) — wording to be approved before any of it is written.

- <a id="distinction-trigger-cap"></a>✅ **P2 · DECISION/SEC — only the FIRST FIVE trigger phrases of any Advisory
  Distinction ever reached the AI, while the screen showed all of them and invited more.
  FOUND 2026-08-01 by Mike's question, RULED and FIXED the same day (this branch, commit `96bd94e`).
  Full suite 2,122 green / 140 suites, lint 0 errors.**
  - **Mike's ruling: send them all.** The chosen option was (a) below. The ceiling that replaced the
    five is `DISTINCTION_TRIGGER_EXAMPLE_CAP = 25` in [`advisorEngine.js`](../server/advisorEngine.js) —
    a **guard against an unbounded firm edit, not a content decision**: the save routes reject an empty
    array but set no upper bound, so a paste could otherwise push a thousand phrases into a live model
    call. It sits ~3x clear of the largest committed row (8), and anything beyond it is **counted and
    announced**, never trimmed in silence — the exact failure mode the old five had. The constant is
    exported so a screen or test reads THE number, not a second copy that drifts.
  - **The "cap it by prompt size" worry in the original write-up did not survive measurement.** The
    prompt only ever carries **one domain's** rows, never all 67, so sending every phrase costs
    **+247 characters (~60 tokens)** on the largest domain.
  - **✅ MEASURED LIVE against gpt-4o-mini — Mike authorised the token spend** ("using tokens to save
    customer dissatisfaction is not a problem for me"). 51 Scenario Lab cases, old prompt vs new.
    - **⚠ The first pass was NOT trustworthy on its own and was not reported as a result.** 6 cases
      differed old-vs-new — but re-running the **same** input differed on 2, so the noise floor was too
      close to the signal. `temperature: 0` is not the same as deterministic. The 6 were re-run **three
      times per condition**; only differences holding across every run are claimed below.
    - **Real (every run):** `valuation·is the offer fair` **+Porter's Revenue, −Asset Review** (from the
      6th phrase *"expectations are unrealistic"*); `staff·toxic culture` **+Remuneration & Incentives**
      (*"weak leadership"*); `eoy·tax planning` **+Money Matters**.
    - **Reliability gain:** `staff·hiring` matched *People Session* / *Productive Habits* on **1 of 3**
      runs before and **3 of 3** after — a flaky match made stable.
    - **Not counted:** the `data-systems` and `forecasting` differences did not survive repetition.
    - **Honest limit:** 51 committed test cases are not a measurement of live advisor speech, and a
      distinction match costs an API call per sentence, so this is a **sampled** result — it will never
      be the free, repeatable before/after the logic-table preview gives.
  - **The measurement scripts were deliberately NOT committed** — they are one-off scratchpad runs, and a
    committed tool that spends money per run needs its own design (see the sampled-workbench note below).

  - **── The diagnosis that led to the ruling, kept as written on the day ──**
  - Found by Mike's question *"how does this compare with the advisory distinctions page — or will they be
    at cross purposes?"*
  - **The evidence.** [`_classifyMatchingRows`](../server/advisorEngine.js) builds its prompt from
    `row.triggers.slice(0, 5)`. [`FirmManagerHub.vue`](../components/FirmManagerHub.vue) renders the
    column as `row.triggers.join(', ')` — every phrase, no cap shown — and the row is firm-editable.
  - **Measured on today's committed platform content: 56 of the 67 distinctions carry more than five
    phrases; 67 phrases in total never reach the engine.** Which five survive is array order, not a
    choice anyone made.
  - **Severity stated fairly, not alarmingly.** Distinction triggers are **not literal matches** — they
    are *examples* shown to gpt-4o-mini, which decides semantically against the row's `description`. So
    examples six onward are guidance, not gates, and the engine may well behave identically without
    them. This is **nothing like** the domain-support storage-key defect, where content genuinely never
    arrived. **The defect is the SILENCE, not the loss:** the screen invites work that provably has no
    effect. Same family as the three routing defects of 2026-07-30/31, which is why the question found it.
  - **Two honest options, both needing Mike:** (a) send all phrases and cap by prompt-size with a stated
    limit, or (b) keep the five and say so on screen ("the first five guide the AI"). Not for the AI to
    pick — (a) changes what reaches a live model, (b) changes the firm's understanding of its own controls.
    **→ Mike chose (a) on 2026-08-01.** Note the prompt-size half of (a) proved unnecessary once measured
    (~60 tokens on the largest domain); the ceiling that shipped guards a runaway *edit*, not prompt size.
  - **⚠ Why the new phrase probe does NOT cover this layer** (and says so in every response via
    `notMeasured`): a distinction match costs an OpenAI call per sentence, so it can never be a free,
    repeatable before/after like the logic-table preview. A distinctions workbench is possible but must be
    a **sampled** tool that declares its cost and its sample — a separate build, not an extension of
    [the trigger workbench above](#trigger-vocabulary-sweep).
  - **Do NOT "fix" this by adding literal matching to distinctions.** The semantic classifier is the
    design (it replaced exact keyword matching deliberately — see the comment above `classifyDistinctions`),
    and the two systems using the same column heading *"Trigger phrases"* for two different mechanisms is
    itself worth a wording decision on the hub.

- <a id="distinction-rows-compete"></a>☐ **P2 · DOC/DECISION — editing ONE distinction's phrases can move a
  DIFFERENT distinction's recommendations, and nothing on screen says so.** Found 2026-08-01 while measuring
  the fix above; **not a defect introduced by it**, and not a defect at all — a property of the design that
  the screen does not disclose.
  - **The evidence, from the live run.** *Asset Review* was dropped from `pd-54`, which gained **no** new
    phrases, and the `eoy` gain came from `pd-64`, which also gained none. A domain's distinctions all go
    into **one** prompt and are ranked against each other
    ([`_classifyMatchingRows`](../server/advisorEngine.js)), so making one row a better fit can stop the
    classifier picking a neighbour.
  - **Inherent to the semantic classifier** — the direct consequence of the deliberate replacement of exact
    keyword matching. Logged because [`FirmManagerHub.vue`](../components/FirmManagerHub.vue) presents each
    row as an independent control, which is how a firm manager will reasonably read it. Same family as the
    trigger cap above: the screen's silence about how the mechanism behaves, not a loss of content.
  - **For Mike:** whether the screen should say this, and in what words. Not for the AI to draft — it is a
    statement about how the firm's own controls behave (CLAUDE.md — confirm wording before writing it).
  - **Carries the wording decision left open above:** the hub uses one column heading *"Trigger phrases"*
    for **two different mechanisms** — literal word-boundary matching on logic tables, semantic examples on
    distinctions. Worth settling both in one pass.

- <a id="trigger-word-boundary"></a>✅ **P1 · FIX — entry triggers matched anywhere inside a word, so "HR"
  fired on "t-HR-ee". FOUND *and* FIXED 2026-07-31 (approved by Mike, this branch, commit `4debcfc`).
  Full suite 2,083 green / 138 suites, lint 0 errors.**
  - **The defect.** Matching was `message.includes(trigger)` with no word boundary. `staff_performance`
    carries the trigger **`HR`**: it matched t-**hr**-ee, t-**hr**-ough, s-**hr**-unk, c-**hr**-onic and
    t-**hr**-eshold, and **fired in 11 of the 51 Scenario Lab cases**, opening the staff table for
    conversations about margins, forecasting and due diligence. Clearest case: *"the owner wants to
    retire in three years and has no plan"* — textbook succession — opened the **staff** table.
  - **Not only `HR`.** `ratio` inside sepa-*ratio*-n / ope-*ratio*-nal / gene-*ratio*-n;
    `DD` inside a-*dd*-ed / mi-*dd*-le; `draw` inside with-*draw*-al; `lean` inside c-*lean*-ing;
    `ETA` inside d-*eta*-il / r-*eta*-in. **12 triggers across the 42 trees are short enough to do this.**
  - **The rule, chosen by measurement not taste:** a trigger must **start** at a word boundary but may
    run on into the rest of the word, so *workflow* still catches "workflows". The tidier-looking
    whole-word rule (trailing `\b` too) is **worse**: it drops *margins, benchmarked, management
    reports, bottlenecks, workflows, avoided, drawings* and costs one Scenario Lab case its correct
    table. Both halves are pinned by tests, because a future tidy-up adding the trailing `\b` would pass
    every other test in this repo.
  - **Measured old module vs new in one process, same data** (the genuine pre-change file restored from
    HEAD with its siblings alongside, so the matcher was the only variable): **51 Scenario Lab cases — 8
    changed, five from the wrong table to the right one** (`systems` ×2, `sales_process`,
    `demings_volatility`, `conflict_meeting`, all previously `staff_performance`); **1,085 self-probes —
    9 changed, every one from an unrelated tree to its OWN** (*"withdrawal"* → `heald_matrix`;
    *"operational risk"*, *"next generation"*, *"revenue concentration"* → away from `ratio_analysis`;
    *"chronic debtors"* → `working_capital_cycle`). **Nothing moved the other way.**
  - **New test** [`tests/unit/logicTreeTriggerBoundary.test.js`](../tests/unit/logicTreeTriggerBoundary.test.js),
    21 cases. ⚠ **Its first draft silently tested a fixture** — the `fs` mock leaks across the module
    registry, so a plain `require()` inherited the last fixture's fake `readFileSync` and the real-data
    assertions returned `null` instead of failing loudly. The vacuous-guard trap; `requireReal()` fixes
    it and the reason is written into the file.

- <a id="over-generic-triggers"></a>☐ **P2 · RULING NEEDED (Mike) — three triggers are still too generic,
  and the fix is wording, not code.** Surfaced once word boundaries were in (2026-07-31): these match at
  a legitimate word start but mean something else.
  - `draw` (`reveal_growth_curve`) catches *"**draw**ing up a new agreement"* and *"**draw**ings"*
  - `PIP` (`fm_coach_culture`) catches *"**pip**eline"*
  - `persona` (`reveal_growth_curve`) catches *"**person**ally"*
  - Each needs a more specific phrase in its place (e.g. *draw the curve*), which is the firm's language
    to choose — never guessed (CLAUDE.md — never fabricate the firm's IP).

- <a id="new-source-docs-2026-07-30"></a>☐ **3 new source documents added 2026-07-30 (commit `e443c52`) —
  read and planned, NOT YET TRANSCRIBED.** New master export
  `Central Frameworks/search_content_20260730041439.json` adds 2 library pages (**Speak Easy**,
  **Mapping the Marketing & Sales Process**, both Do the Job / Strategic Tools) — diffed title-by-title
  against the committed `data/templates.json`: 0 removed, no retitles.
  - **Strategic Planning Support.pdf** — 9 materials (Planning Outcomes Review · Business Targets ·
    Orientation Part 1 · Orientation Part 2 · Profit Levers & Blue Ocean · SWOT / PEST · Business
    Dating · Pivot · Porters & Pine). Proposed home: **`strategy`** domain (4 → 13 rows).
  - **Organisational Review Support.pdf** — 2 materials (Organisational Review · Org Chart Only).
    Proposed home: **`staff`** domain (2 → 4 rows). Judgement call, flagged to Mike: client-facing
    org design rather than firm-facing, so `staff` fits its keywords better than the `org-*` (firm)
    domains or `people-power`, but not decided.
  - **Sales & Marketing Support.pdf** — 3 materials (Mapping the Marketing & Sales Process · Sales &
    Mktg Review · Speak Easy). Home: existing **`sales-marketing`** domain. The Sales & Mktg Review
    material groups the existing 16-row menu into **5 stages** (offer → message → funnel → outreach/
    channel → proposal) covering **9 of the 16** rows; **7 get no method** (Customer Type Table,
    Sparketing, Branding Review, Customer Loyalty Programme, Pricing, Packaging/Bundling, Sales
    Process Review) — named in the doc's benefits paragraph but given no step anywhere in it. Ruled:
    keep all 16 rows, distribute the 5-stage detail into the 9 it covers, leave the 7 empty rather
    than invent a method (CLAUDE.md — never fabricate the firm's IP).
  - **3 new logic tables** (Branch Chain IF/THEN, the existing `flat_if_then` shape) — Strategic
    Planning (11 branches), Organisational Review (8), Sales & Marketing (13). **Found:** the
    Organisational Review branch table is duplicated verbatim inside its own support PDF
    (lines 170–307) — transcribes ONCE, into Logic Tables only, per the §0.6 tab split. **Found:**
    none of the 3 carry a `templates[]` column; a branch's THEN text names a real material in several
    cases (e.g. "Execute Blue Ocean Strategy", "Apply the Sigmoid Curve model") but `templates[]`
    must be derived only where the name is verifiable against the library — left empty and flagged
    to Mike otherwise, never guessed. The existing `logicTreeTemplateNames.test.js` build guard would
    catch a wrong name regardless.
  - **8 of the 14 material names are working names, not exact library titles** — resolved against
    the new export and will need the swap on transcription: Planning Outcomes → Planning Outcomes
    Review · Bizz Targets → Business Targets · Strategic Orientation.1/.2 → Orientation Part 1/2 ·
    S.W.O.T PEST → SWOT / PEST · Porter's & Pine → Porters & Pine · Org Chart → Org Chart Only ·
    Sales & Mktg Review → Sales & Marketing Review.
  - **Deleted by Mike, same commit:** `Sales & Marketing Slides table.pdf` — a one-page contents
    index for a *Sales & Marketing Review* deck never held in this repo; predates the refined
    domain-support/logic-table structure and fit neither. Superseded by `Sales & Marketing
    Support.pdf`. **Orphaned by the deletion:** `data/sales-marketing-slides.json` (the PDF's
    extract) — traced, nothing in the codebase reads it — a candidate for removal, not yet approved.
  - **Blocked until 2026-07-30 by the P1 above**, now clear.
  - ✅ **TRANSCRIPTION PROGRESS 2026-07-31 (all approved by Mike, this branch).** All **14 materials**
    are in; **8 of 32 branches** are in.
    - `7ae8b31` **Strategic Planning** — 9 materials into `strategy` (4 → 13). Mike ruled British
      spelling over the source PDF's US spelling; applied to every transcription since.
    - `a557096` **Sales & Marketing** — 2 new materials into `sales-marketing` (17 → 19) plus the
      5-stage method distributed into 9 existing rows; 7 left empty rather than invented.
    - **Organisational Review** — 2 materials into `staff` (2 → 4). **Mike ruled the home: `staff`**
      (client-facing org design; `people-power` is recruitment/pay, the `org-*` domains are the
      firm's own). Both names resolve exactly against `data/templates.json`. Cost measured through
      the live formatters: `staff` ~2,920 tokens, **10th of 29 domains**, well under `people-power`
      (~8,260, the accepted worst case).
    - **Mike's three-way opening question, same session** — `advisor_guidance.first_diagnostic_question`
      was *"engagement or effectiveness?"*, which read as an absolute ("do not recommend a template
      before…") and would have gated the two new materials behind a question that does not fit them.
      Now: **attitude / competence / communication lines** — reporting structure, authority, values
      and meeting behaviour. Attitude and competence still run the 5 Drivers diagnosis unchanged.
    - ⚠ **The `staff` file's `overview` still describes the domain as underperformance diagnosis
      only** — Mike's prose, left byte-unchanged, for his eye when he next reads the domain on screen.
  - ✅ **SHAPE RULED 2026-07-31 (Mike) — the branch tables become `nodes`, NOT `flat_if_then`.
    Read this before transcribing the remaining two.** `flat_if_then` is the Get-the-Job
    advisor-development lane: never walked, never reaching a client recommendation
    ([`logicTrees.js`](../server/utils/logicTrees.js) `formatFlatBranch` doc comment, design §2.5),
    and all 5 trees on that shape are `get_*`. These tables are about the **client's** business, so
    that shape would have made them inert — the near-miss that raised the content-routing P1 above.
    The `nodes` shape maps 1:1 onto the PDFs' four columns (`condition` / `action` / `notes` /
    `templates` = IF / THEN / Additional Context / the pages), so nothing is invented except the
    routing question a flat table cannot contain.
  - ✅ **Organisational Review's 8 branches BUILT 2026-07-31 (approved by Mike, this branch)** — as a
    **third path inside `staff_performance`** (15 → 24 nodes), mirroring the three-way question
    above, rather than a competing standalone tree (its triggers would have fought `staff_performance`
    on the shared words *culture* and *poor communication*). The standalone
    `Logic Tables/Organisational Review Logic.pdf` was read and confirmed **identical** to the copy
    inside the support PDF — transcribed once, as planned.
    - **Routing question is the one authored sentence** (a flat table has no question). Mike's own
      wording, widened after measurement showed his five options reached only 3 of the 8 rules:
      *"Which is blocking this organisation — messaging that is inconsistent or out of step with its
      core purpose and values, missing feedback loops, unclear communication lines or accountability,
      how decisions get made and debated, or the leadership style the strategy needs?"*
    - **Templates derived only where verifiable:** `Org Chart Only` (bias, typology, meetings),
      `Organisational Review` (values, job creep), both (alignment), plus `People vs. Process` on the
      two leadership-style branches — the support PDF's step 3 places that fork inside that named
      table. All pass the `logicTreeTemplateNames.test.js` build guard.
    - **Measured old file vs new, engine run twice in separate processes, 14 conversations:
      8 existing staff paths byte-identical; all 6 new paths reach the right pages.**
      ⚠ **The first measurement was worthless and reported "no change" everywhere** — the old tree
      was passed through the `firmTrees` parameter, which *merges* onto the platform bundle (and
      rejects an array outright), so both sides read the new file. Same class as the `scoringLog`
      trap. A real before/after needs two processes with different `cwd`.
    - ⚠ **`staff_performance.description` still describes only the attitude/competency split** — not
      updated, so it under-describes the tree by one path.
  - ✅ **Strategic Planning's 11 branches BUILT 2026-07-31 (approved by Mike, this branch)** — as a
    **third path inside `client_planning`** (7 → 19 nodes), following the `staff_performance`
    precedent above rather than a standalone tree. A standalone tree would have to carry the words
    `client_planning` already owns (*strategy*, *strategic planning*, *business plan*), and
    `detectLogicTree` simply picks whichever tree matches most triggers — so the two would fight.
    - **`cp_initial` widened from two ways to three**, the third being "or is something blocking the
      strategy work itself?". The startup and established paths are otherwise untouched.
    - **Routing question is the one authored sentence** (a flat table has no question), Mike's chosen
      wording: *"Which is blocking this plan — the owner only seeing what they want to see, running
      out of steam after a long effort, unable to separate themselves from the business, or set on
      how it has always been done; or is it the business itself — leads that do not convert, the fees
      they can charge, merging with another business, results that swing about, a product past its
      peak, or head-to-head competition on price?"* It does not enumerate the eleventh rule (the
      out-voted meeting participant); measurement confirmed the answer patterns reach it anyway.
    - **Templates derived only where verifiable** — the PDF carries no templates column.
      `SWOT / PEST` and `Porters & Pine` (over-exposure, the row names both), `Business Dating` (merger),
      `Demings Volatility`, `Profit Levers & Blue Ocean` (red water), `Succession Planning` (role
      identification). All pass the `logicTreeTemplateNames.test.js` build guard.
    - **Measured before vs after, snapshot taken before the file was edited** (avoiding the `firmTrees`
      merge trap recorded above): **6 existing paths byte-identical** — templates *and* node paths;
      at prompt level 6 of 8 text blocks byte-identical, Branch 2b differing only by a trailing
      newline, and only the opening question genuinely changed. **All 11 new rules reach their own
      node.** Cost: the tree's prompt goes ~1,483 → ~3,639 tokens, **9th of 42 trees** (`succession`
      ~9,312, `staff_performance` ~4,900). Full suite 2,043 green / 136 suites, lint 0 errors.
    - **Found by that measurement and fixed here:** the merger row lost `cp_initial` to the
      established-business branch, whose pattern contains *business* **twice** — `scorePattern` counts
      each occurrence, so it scored 2 against the merger row's 1. Adding *merge* and *combine* to the
      new branch corrected it; the 6 existing paths were re-measured afterwards and stayed identical.
      **Worth carrying: a repeated word in an `answer_pattern` silently doubles that branch's score.**
  - ☐ **P2 · RULING NEEDED (Mike) — six of the eleven branches have an empty `templates[]`**, left
    empty rather than guessed (CLAUDE.md — never fabricate the firm's IP). They give the advisor the
    reasoning but no page. Four name a *method* where a library page plausibly fits: Parallel Thinking
    (`cp_block_bias` and `cp_block_consensus_trap`) → **6 Hats**?; the Leverage/Intelligence-stage row
    (`cp_block_complacency`) and the Sigmoid Curve row (`cp_block_life_cycle`) → **Growth Curve**?
    Two name something with no library page at all: "Product (Fit) Review"
    (`cp_block_conversion_deficit`) and "For Them / Sorted for Maximum Fee"
    (`cp_block_premium_pricing`).
  - ⚠ **Same entry-trigger caveat as the staff table** ([P1 above](#staff-tree-entry-triggers)), not
    introduced by this change and not fixed by it. The 11 rules are reachable once the planning table
    is open, and realistic openers do open it (*"we are doing strategic planning but the owner only
    hears what they want to hear"* → `client_planning`). A symptom stated alone — *"they are stuck
    competing head to head on price"* — still selects **no tree at all**.
  - ✅ **Sales & Marketing's 13 branches BUILT 2026-07-31 (approved by Mike, this branch) — the
    workstream's last piece. All 14 materials and all 32 branches are now in.** Home measured, not
    assumed: `client_sales` (8 → 25 nodes). A realistic opener — *"my client needs more sales, their
    customers keep objecting that it costs too much"* — selects it, and the three sales-related
    `get_*` trees never compete because those are the **advisor** selling advisory services, whereas
    these 13 are the **client's** business selling to its customers.
    - **Shape ruled by Mike: three families, mirroring the source table's own Notes column** —
      Honey & Mumford processing styles (4), Flushing Out Real Concerns objections (5), sales
      distribution + pricing (4) — rather than a flat 13-way. A flat list would have asked the AI to
      choose between three different *questions* (who is this buyer / what did they object to / how
      is the team built) instead of between answers.
    - **Measured before vs after, snapshot taken before the file was edited: 6 existing paths
      byte-identical** (templates and node paths), only the opening question's prompt block changed,
      and **13 of 13 new rules reach their own node.** Prompt ~1,282 → ~3,499 tokens. Full suite
      2,043 green / 136 suites, lint 0 errors.
    - **All 13 keep an empty `templates[]`** — see the ruling item below.
    - ⚠ **A REGRESSION WAS INTRODUCED AND CAUGHT BY THE MEASUREMENT, not by the tests.** The first
      draft of the new `cs_initial` branch used the ordinary words *needs / sales / selling / value*,
      which out-scored the two branches that own them: the "selling" path and plain *"my client needs
      more sales"* both stopped recommending anything. Rewritten to distinctive vocabulary only
      (*buyer, impulsive, objection, salaried, distributor, overheads…*) and re-measured to
      byte-identical. **The whole 2,043-test suite passed while that regression was live** — routing
      behaviour is not covered by any test, which is why the before/after walk is the control here.
  - ☐ **P2 · RULING NEEDED (Mike) — all 13 Sales & Marketing branches have an empty `templates[]`.**
    The library has no page for Honey & Mumford processing styles, for "Flushing Out Real Concerns",
    or for the three sales-distribution models, so nothing was verifiable and nothing was guessed
    (CLAUDE.md — never fabricate the firm's IP). The single near-match is **Sales Teams**, a Revenue &
    Feasibility Model that is *not* `includedInClient` — a derivation for Mike, not a lookup. Until
    ruled, this table gives the advisor the reasoning with no page attached. *(Companion to the
    six-branch ruling on Strategic Planning above.)*
  - ☐ **P3 · SCORING — a repeated word in an `answer_pattern` silently doubles that branch's score.**
    `scorePattern` ([`logicTrees.js`](../server/utils/logicTrees.js) L1205–1213) counts every
    occurrence of a matched word, so a pattern naming *wants* twice scores 2 on that word alone.
    **Found by measurement twice in one day** — it mis-routed the merger row on Strategic Planning and
    the licensed-distributor row on Sales & Marketing; both were fixed in place. A sweep of all 42
    trees found **34 of 333 branches carry a duplicated scoring word**, most of them pre-existing
    (`governance`: *leadership, style, team, conduct, decision, governance, culture*;
    `risk_management`: *high*; `systems`: *planning, capacity*), and several introduced by this
    session's own Strategic Planning commit (`cp_block_merger`: *business*; `cp_block_life_cycle`:
    *product, peak, curve, decline*). **No harm is proven** — every affected path measured correct —
    so this is logged rather than swept. The fix is either de-duplicating the patterns or making
    `scorePattern` count distinct words; the second changes scoring for all 42 trees at once and would
    need a full before/after.

- <a id="firm-editable-logic-tables"></a>☐ **NEXT SESSION (Mike, 2026-07-22) — bring the Document Library page into line with
  Quizzes and Advisory Distinctions, and make the LOGIC TABLES and DOMAIN SUPPORT
  firm-editable.** ✅ **PLANNED 2026-07-23 — [`FIRM-EDITABLE-TABLES-PLAN.md`](FIRM-EDITABLE-TABLES-PLAN.md)** (cascade + override model agreed with Mike; Phase 0 is the next task).
  - ✅ **Phase 0 BUILT 2026-07-23 (approved by Mike, this branch):** firm-aware content
    loading is live behind the engines. New `server/utils/firmContent.js` (config keys
    `domain-support` / `logic-trees`, dev-file fallback like Distinctions);
    `domainSupport.js` + `logicTrees.js` merge a firm's sparse override at the point of
    use (platform caches stay pristine — no merged copy is ever cached); both engines
    load the overlays once per request from the firmAuth-verified `firmId` and thread
    them through every detection/format/walk call site. `deepMerge` moved verbatim to
    dependency-free `server/utils/deepMerge.js` (firmOverlay re-exports it unchanged)
    so content utils don't pull the MySQL pool into their require chain. 21 new tests in
    `tests/unit/firmContent.test.js` incl. the CROSS-FIRM LEAK TESTS (acceptance 1);
    suite 1,747 green.
  - **Scenario Lab delta (Phase 0 acceptance, recorded honestly):** the deterministic
    lab drives the template RESOLVER directly (`scripts/scenario-lab.js` →
    `resolveTemplatesWithOutlier`) and its require chain never reaches
    domainSupport/logicTrees, so it is structurally blind to this change — before/after
    delta is provably **zero**. The override's real effect (firm keyword/trigger edits
    changing detection for that firm only, and only for that firm) is demonstrated by
    the dedicated detection tests in `firmContent.test.js` instead.
  - ☐ **Stale lab baseline found (log, not Phase 0):** committed
    `design/SCENARIO-LAB-REPORT.md` was last re-baselined 2026-07-14 **AI-ON**, before
    the 2026-07-22 master export replaced `data/templates.json` — a fresh deterministic
    run differs substantially (and AI-OFF metrics are not comparable to the AI-ON
    baseline). Re-baseline with the AI layer ON when Mike wants the spend; my
    regenerated copy was restored, not committed, to avoid replacing a stronger
    baseline with a misleading weaker one.
  - ✅ **Phase 1 BUILT 2026-07-23 (approved by Mike, this branch):** Document Library
    rebuilt onto the rail → panel pattern. The rail (tone bands, drop-tab accordion,
    open/closed state) is now the SHARED `components/firm/FirmRail.vue` — FirmQuizzes
    ported onto it with all 26 of its tests passing unchanged, and the new
    `components/firm/FirmDocuments.vue` consumes it (Hub tab is now one line; the old
    b-menu + two-table markup and its six Hub methods are gone). All copy through
    `$t('firmDocuments.*')` (en.json, same en-only pattern as firmQuizzes). Rulings
    (Mike, 2026-07-23): text-only buttons — no icon font; three new lines of page copy
    approved verbatim. Fixes *quiz-rail-stuck-open* once in the shared rail (see that
    row) and takes this screen out of the *no-icon-font* blast radius.
  - ✅ **Phase 2 STARTED 2026-07-24 (approved by Mike, this branch) — EOY is the first domain
    migrated to the four-column standard (§0.5); engine wired.** `data/eoy-domain-support.json`
    re-authored from the source PDF into `materials[]` (name / summary / who_when / steps),
    keeping label + trigger_keywords + a refreshed overview; the three `domainSupport.js`
    formatters render the `materials` shape at every call site, with the legacy `support_tools`
    path kept as a fallback so the other 42 domains are unchanged. Deep EOY coaching still feeds
    Learn mode via the untouched `eoy-reference.json`. 6 new tests in
    `tests/unit/domainSupportMaterials.test.js`; suite 1,792 green. Commit `dfa8572`. In-app
    mockups (Domain Support + Logic Tables) reviewed and approved by Mike.
  - ✅ **TAB STRUCTURE RULED 2026-07-24 (Mike) — plan §0.6:** two dedicated Firm Manager tabs,
    **Domain Support** (four-column tables) and **Logic Tables** (IF→THEN grids); the umbrella
    "Decision Frameworks" is retired (that tab → "Domain Support"). Supersedes plan §0
    decision 1. The backend `/framework` "Decision Framework" feature is a different thing and
    is NOT renamed. Commit `2172e34`.
  - ✅ **Domain Support editable tab BUILT 2026-07-24 (approved by Mike, this branch). Commit
    `ccf1d04`; full suite 1,815 green.** [`components/firm/FirmDomainSupport.vue`](../components/firm/FirmDomainSupport.vue):
    two-group rail (advisory domains / get-the-job) + four-column inline-editable table (Template ·
    Summary · Who & when · Step-by-step), origin tags, version history — wired to the existing
    `getDomainSupport*` / `saveDomainSupport*` routes. Save/Reset live (sparse `{materials}`
    override; deepMerge replaces the array). Labels per Mike's mockup sign-off. EOY renders fully;
    a domain still on the legacy `support_tools` shape shows a "not migrated" notice.
    - **Security (done):** firm-authored `overview`+`materials` fenced with `fenceUntrusted` in ALL
      THREE prompt formatters (`formatDomainSupportForPrompt`, `formatDomainContextForSession`,
      `formatDomainSummaryForDesign`) — untrusted text read as data, never instructions (CLAUDE.md;
      mirrors CB-30). Platform output byte-unchanged (`tests/unit/domainSupportFencing.test.js`).
    - **Fix (done):** list route counts `materials` (EOY shows 4, not 0).
    - Added as its OWN tab, **non-destructive** — the PDF "Decision Frameworks" tab is untouched.
  - ✅ **P1 · WIRE — domain-support firm overrides now use the config key the engine reads.
    FIXED 2026-07-30 (approved by Mike, this branch). Full suite 1,967 green, lint 0 errors.**
    **The defect:** the save routes stored per-domain keys (`domain-support-<id>`) via
    `overlay.saveFirmConfig`, but both engines load a SINGLE `domain-support` bundle
    ([`advisorEngine.js`](../server/advisorEngine.js) L1461 · [`courseEngine.js`](../server/courseEngine.js)
    L164/L355 → [`firmContent.js`](../server/utils/firmContent.js) L96,
    `CONFIG_KEYS.domainSupport = 'domain-support'`). Pre-existing (b1bd546 skeleton + Phase 0),
    not introduced by the Domain Support tab. **It worked only by accident:** with no Firm-Manager
    MySQL, both sides fall back to the SAME dev file (`data/dev-firm-domain-support.json`, shape
    `{firmId:{domainId:override}}`), so a saved EOY edit did reach the AI. On MySQL the two keys
    would never reconcile — Firm Manager would report "saved" and the firm's content would
    **silently** never reach the AI. Fixed while nothing was stored yet, so no data migration was
    needed; the 29 migrated domains were already in the bundle shape.
    - **The fix** (one file, [`server/routes/firmManager.js`](../server/routes/firmManager.js),
      +142/−62; **no engine file touched**, so the AI path is byte-identical): the seven per-key
      helpers and `DOMAIN_SUPPORT_KEY_PREFIX` are replaced by `_loadFirmDomainSupportMapRaw` /
      `_saveFirmDomainSupportMap` on `CONTENT_CONFIG_KEYS.domainSupport` — mirroring the Logic
      Tables routes, which were deliberately built this way. Every reference was traced first
      (all inside that one file). Reset drops one key from the bundle instead of the old
      `is_active = 0` UPDATE, which is meaningless on shared storage.
    - **Perf, same cause:** the list route loaded the override *inside* the loop — ~36 store
      round-trips to draw one screen. Now one read before the loop.
    - **History is now bundle-level** (all domains' saves interleaved), the same honest caveat
      Logic Tables carries. Nothing visible changed: the screen shows history read-only.
    - **Restore stayed PER-DOMAIN, deliberately** — it reads that version's bundle, lifts out
      just that domain's entry and writes it into the CURRENT map, so restoring EOY cannot roll
      back the other 28. A domain absent from that version had no override then, so restoring it
      **clears** today's override rather than inventing one. Both branches are tested. (Logic
      Tables deferred per-table restore for exactly this reason — this technique would work there
      too; see the follow-up below.)
    - **SEC — a new exposure closed in the same change, not carried:** the domain id is now an
      object key rather than part of a config_key string, so an unchecked `__proto__` /
      `constructor` / `prototype` would assign the map's prototype instead of storing an override.
      New `_isKnownDomainSupportId` validates against domains.json + the seven `get-*` files;
      unknown ids get a clean 404. This risk did not exist under per-key storage, so closing it is
      part of the fix, not adjacent scope. `setDomainSupportSection` was checked and **already**
      validated its id — no pre-existing hole there.
    - **Tests:** new [`tests/unit/firmDomainSupport.routes.test.js`](../tests/unit/firmDomainSupport.routes.test.js),
      14 cases. **The one that earns its keep asserts the save key is literally `'domain-support'`** —
      a behavioural test in dev *cannot* catch this bug, because both sides fall back to the same
      file, which is precisely why it survived from b1bd546. The key is hardcoded in the test
      rather than imported, so a rename cannot slip past both sides at once. Also pinned: saving
      one domain leaves the others' edits intact, reset drops only its own key, history reads the
      shared key, and the two restore branches above.
    - **→ Follow-up (P3, cleanup, NOT done — needs its own approval):** the seven `get-*` file
      names now exist **twice** in `firmManager.js` — the hoisted `DOMAIN_SUPPORT_GET_FILES` and a
      literal copy inside `setDomainSupportSection` (L2281). Two copies of one list is the drift
      the single-source rule exists to stop; collapse it to the constant.
    - **→ Follow-up (P2, NOT done):** give **Logic Tables** the same per-table restore, using the
      lift-one-key-from-the-old-bundle technique proven here.
  - ✅ **Logic Tables tab — Slice B SHIPPED + 3-way grouping + firm re-filing (2026-07-27, this branch).**
    Editing is fully live: firm-authored branch-text fencing in `logicTrees.formatLogicTreeForPrompt`
    (`b2c7a62`), Save/Reset/history backend on the single `logic-trees` bundle (`9e6ef23`), and the
    live editable screen — reword + add/remove branches, per-bundle read-only history; per-version
    restore deferred (shared-bundle storage would roll back every table) (`af1afa0`). Both
    firm-editable pages (Logic Tables + Domain Support) now group by the master sections **Do the Job
    / Get the Job / Get Organised** (`fccb203`), and a firm can re-file an item into another section —
    display-only, firm-scoped, AI unaffected: backend move routes (`068cbe4`) + drag / "Move to" UI
    (`9b3aa73`). Full suite 1,863 green.
  - ✅ **Editing ergonomics SHIPPED 2026-07-29 (this branch) — found while Mike was about to edit
    29 domains of four-column tables.** Domain-support **steps** were single-line inputs, so a
    full-sentence step scrolled sideways and could not be read; the name/summary/who columns got
    auto-grow and drag-to-size on 2026-07-27 and the steps column was simply left behind. Each step
    is now an auto-growing textarea with **↑ ↓ reorder controls** and its own resize handle
    suppressed (a drag handle fights an autogrow directive); the step number is top-aligned so it
    no longer drifts down the side of a long step (`a7f68de`). Arrows were chosen over
    drag-and-drop deliberately — dragging inside a table cell is fiddly and this table is about to
    be edited heavily. `moveStep` **splices** rather than assigning by index (Vue 2 cannot observe
    `arr[i] = x`, so a swap would reorder the data without redrawing). The test that earns its
    keep proves a reordered step reaches the **save payload** in its new position — reordering that
    looks right on screen but saves the old order is the failure that would surface weeks later.
  - ✅ **🔑 Logic-tree ENTRY POINT is now data, not array position — 2026-07-29 (this branch,
    `71b7a2c` + `98ecc51`). Read this before touching `walkLogicTree` or the trees file.**
    Branch reorder was nearly shipped for all 42 logic tables and would have **silently changed
    engine behaviour**: `walkLogicTree` started at `tree.nodes[0].id`, so on a nodes-shaped tree
    the first row IS the entry point and promoting another row repoints where the engine begins
    reasoning — a FLOW change, which firm editing excludes (Mike's §0.6 scope ruling 2026-07-24).
    It would also have stuck: `_mergeBranchRows` maps rows in the order the browser sends them and
    `deepMerge` replaces arrays wholesale.
    - **Fix (Phase 1):** `entry_node` added to all **37** node-shaped trees in
      [`data/logic_trees.json`](../data/logic_trees.json), each set to the id of the node that sat
      first at the time — derived from behaviour, never chosen, so it cannot introduce a
      difference. `walkLogicTree` honours it and falls back to the first row when it is missing or
      dangling. Swept first: that line was the **only** positional read of nodes in the backend
      (every other link is by id, and `next_stage` looks up by stage value).
    - **Proof (this is live code — advisorEngine template hints + the zero-candidate fallback):**
      both paths A/B'd on identical inputs, every tree against every Scenario Lab case —
      **42 trees × 52 states = 2,184 comparisons, 933 template hits, 250 walks genuinely
      traversing branches, ZERO differences.** The 11 committed snapshots also passed unchanged.
    - **Worth recording because it nearly went unnoticed:** the FIRST version of that proof fed
      states with fields `buildSignalText` does not read (`coreProblem`, `domain`), so the signal
      text was empty, every score was 0, and almost every walk stopped at its entry node. It
      reported "identical" while proving nearly nothing. The same mistake made the first unit
      tests pass vacuously. Both were rebuilt on the real fields (`clientRaisedIssue`,
      `situationDiagnostic`, `industry`, `detectedDomain`) and the reason is commented in
      `tests/unit/logicTreeEntryNode.test.js` so it is not reintroduced.
    - **Phase 3:** `reorderable` on the detail route is computed **per tree** — a flat_if_then
      tree always qualifies; a nodes-shaped one qualifies only while it carries an `entry_node`
      naming a node that exists. A tree added later without one is refused rather than silently
      offered, and a route test sweeps every real tree to enforce it. `moveBranch` re-checks the
      flag rather than trusting that the buttons were hidden.
    - **On-screen copy is MINE, not Mike's** (standing in until he changes it): *"Row order is the
      order these rules are read — moving a row changes how the table reads, not the decision
      flow."* Shown only where reordering is offered. **Honest residual:** reordering does change
      the order branches are presented to the AI (`formatLogicTreeForPrompt` walks the array), which
      is presentation, not the deterministic walk — hence the note.
  - ☑ **Decision Frameworks (PDF Document Library) tab REMOVED 2026-07-27 (owner decision,
    this branch).** The tab + its wiring are gone from `FirmManagerHub.vue` (tab-item, the
    `FirmDocuments` import/registration, and the now-orphaned "Storage % used" header indicator
    + `loadStorage`/`storagePercent`). **Left dormant on purpose (tab-only removal, the option
    Mike chose):** `components/firm/FirmDocuments.vue` and the backend document/storage routes
    (`listDocuments`/`uploadDocument`/`downloadDocument`/`deleteDocument`/`getStorageUsage`, still
    registered) remain in the codebase, unreferenced. `FirmRail` is NOT dead — Quizzes uses it.
    **→ Follow-up (P3, cleanup):** delete `FirmDocuments.vue`, its component test, the document/
    storage routes + registrations, and the `firmDocuments` i18n block once no consumer remains.
  - ☑ **Templates & Videos tab HIDDEN 2026-07-27 (owner decision, this branch).** `v-if="false"`
    on the tab-item in `FirmManagerHub.vue` — not wired to anything usable in UAT (needs
    Firm-Manager MySQL), so a live-looking dead tab was misleading. Kept dormant (template-import
    + video-link code intact), not deleted — a real feature the master team may want.
  - ☑ **Firm Profile tab REMOVED 2026-07-27 (owner decision, this branch).** The "Firm Profile" tab
    (firm name / logo URL / brand colour / AI persona name) was a dead-end editor — its data was
    saved but **consumed nowhere** in the app (advisor experience and theming both verified to ignore
    it). Fully removed, not hidden: the tab + its data/methods in `FirmManagerHub.vue` (the header
    subtitle now falls back to the firm id), the `getProfile`/`updateProfile` functions + exports +
    JSDoc in `firmManager.js`, the two `/api/firm-manager/profile` mounts in `restify-server.js`, and
    the profile tests in `firmManager.routes.test.js`. Suite 1,859 green.
  - ✅ **Firm-table editing UX — name wrap + drag-to-size-and-remember (2026-07-27, this branch).**
    On both `FirmDomainSupport` and `FirmLogicTables`: the Template/Branch name field auto-grows and
    wraps (was a fixed single-line box that clipped long names) with a widened name column; the
    Summary / Who & when / If / Then / Notes boxes are drag-resizable and **remember their height
    per-browser** (restored on reopen) via a new shared `utils/textareaDirectives.js` (`autogrow` +
    `resize-persist`; client-only, localStorage — a personal display preference, deliberately never in
    the firm's saved content). Sizes persist on drag, independent of Save. Component tests still green.
  - ✅ **Domain-support content migration — COMPLETE 2026-07-29. 29 of 29 domains on the
    four-column standard; no repo file remains on the legacy `support_tools` shape.**
    Done earlier: eoy (`dfa8572`) · systems · risk · staff · succession · valuation (`bfc4b37`) ·
    stock-purchasing (`2a63982`) · conflict · due-diligence · governance (`ce4bf2d`) ·
    get-positioning · get-pricing-proposals · raising-capital (`6b24276`) · get-team-problem ·
    org-leadership · org-capacity-planner (`abc0826`) · org-firm-strategy · data-systems ·
    fm-coach-culture · forecasting (`2428903`) · get-marketing · get-sales (`e3d6843`) ·
    get-sales-tracker (`edee78a`).
    **Final six (2026-07-29, this branch):** get-seminar (16 rows) · org-board-pack (11) ·
    people-power (26) · strategy (4) · profit (4) · sales-marketing (17).
    Mike's instruction 2026-07-29: migrate them ALL, then he reviews and edits in the app
    rather than approving each draft in chat.
    - **A test had to change, because the migration invalidated it.**
      `tests/unit/domainSupportMaterials.test.js` proved the legacy `support_tools` renderer
      still works **by rendering the `profit` domain** — which is now migrated, so the guard had
      no legacy file left to point at. The fallback branch in
      [`domainSupport.js`](../server/utils/domainSupport.js) L141 is NOT dead (a firm override can
      carry the old shape at any time), so the guard now drives it through a firm override
      instead: `{materials: [], support_tools: [...]}`. Arrays merge wholesale, so emptying
      `materials` selects the legacy branch exactly as a pre-migration file did. Approved by Mike;
      no production code touched.
    - **Findings from the final six — three change the method's assumptions:**
      (1) **people-power is the fm-coach-culture problem again, larger.** The source names **26**
      templates; the live file held **7** authored "Framework" entries under entirely different
      names (Owner Alignment, Team Engagement, Customer Engagement/NPS, Recruitment, Remuneration,
      SMART Goals, plus an If-Then row). None were deleted — each was **folded into the source
      template it corresponds to** (Recruitment → *Hiring Winners*, Remuneration → *Remuneration &
      Incentives*, NPS → *Client Survey*, Team Engagement → *Team Survey*, SMART → *GE.SMART & FAST
      Goals*, Owner Alignment → *L.Suppt.Alignment*), following the fm-coach-culture ruling that
      folded legacy PIP content into its source row "rather than left as a duplicate".
      (2) **org-board-pack carries two rows with no source document at all** — *White Paper
      Program* (external thought-leadership marketing, a different thing from the source's *Board
      White Paper* internal proposal template) and *Deming's Volatility Principles in Governance*.
      Both are live engine content today, so both were **carried across** as ordinary rows, visible
      for Mike to remove in-app. **→ Owner decision outstanding**, same as the four
      fm-coach-culture rows.
      (3) **sales-marketing's 16 review frameworks have NO Step-by-step, deliberately.**
      `Sales & Marketing Slides table.pdf` is one of the seven "not really a support doc" cases: a
      bare index table carrying a summary and a benefit per framework and **no method at all**.
      Writing steps would mean inventing the firm's IP, so those cells are empty for Mike to fill
      in-app. *Powerful Seminars*, whose own 24-page deck does carry a method, got the full 18-step
      treatment in the same file.
    - **Also recorded:** get-seminar's source names 16 materials against 4 grouped tools in the old
      file; strategy and profit were the two clean ones — source and old file agreed, so those were
      a reshape only. Summaries hold the standard band (345–543 chars); the three longest sit in
      strategy, where the source teaching is densest.
  - ✅ **"Hide list / Show list" SHIPPED 2026-07-29 (Mike's ask, approved; this branch) — more
    editing room on both firm-editable tables.** Found while Mike was editing the migrated
    domain-support content: the rail takes a third of the width (`is-4`) and the table the rest, so
    the Step-by-step and Who-&-when boxes were cramped. A small control **beside the search box** —
    where Mike asked for it — collapses the rail and gives the table the full row (`is-12`), about
    50% more width. Label ruled by Mike from three options: **Hide list / Show list**.
    - Built on **both** `FirmDomainSupport.vue` and `FirmLogicTables.vue` — the same layout with
      the same problem, and the pair has been kept in step throughout (grouping, Move to, autogrow).
    - **The control sits in the toolbar, not the panel header, on purpose:** it is reachable whether
      or not a domain is open, so hiding the list can never strand an editor on a screen with no way
      back to it. A test locks that.
    - The choice is remembered per browser (`ds:railHidden` / `lt:railHidden`), mirroring the
      `resize-persist` box heights: a personal display preference, **never** in the firm's saved
      content. Restored in `mounted()`, never `data()` — localStorage does not exist during SSR.
      Blocked storage fails soft (the list simply shows).
    - 10 new component tests (5 per screen), including the two that earn their keep: the preference
      **survives leaving the screen and coming back** (the regression that would otherwise look fine
      all session and be silently forgotten), and the two screens keep **separate** preferences.
      Full suite **1,953 green**, lint 0 errors.
    - **get-marketing / get-sales were clean** — material names in the old files matched their
      source PDFs, so nothing had to be carried across or judged. Two shaping notes:
      `Get Marketing Support.pdf` carries **one** four-step execution method for the whole domain
      rather than per-material steps, so those steps were distributed to the materials they belong
      to and each row's detail filled from the doc's own source-template table; and the **Decision
      Tree was moved to the FRONT** of `get-sales` (the old file had it last) because the source
      uses it *before contact* to choose Campaign vs Total Needs.
    - **Findings from the 2026-07-29 batch, recorded because two change the method's assumptions:**
      (1) **`Dashboard Support.pdf` is NOT one of the seven "not really a support doc" problem
      cases** — it carries its own *Summary of the Theory* and a five-step method at the end, so it
      migrated like any other doc. One fewer undecided item than §0.5 assumed.
      (2) **The unlabelled grid in `3 pill Fin Mgt` (the one §0.5 flagged for manual eyes) is NOT a
      logic table** — it is the seven-stage *Client Progression* map pairing each client mindset with
      the template that suits it. Kept as a material row; the Logic Tables tab does not want it.
      (3) **`fm-coach-culture` is the worst divergence found so far.** The source PDF names **16**
      materials; the existing JSON had **6**, under entirely different names. Four of those six have
      **no source PDF at all** (fee estimate/job creep, COI engagement, applicant screening, group
      coaching) and read as generic industry content rather than firm IP — but they are live engine
      content today, so they were **carried across, not deleted**, and are visible as ordinary rows
      for Mike to remove in-app. The legacy PIP structure was folded into the PDF's *Advisory PIP
      Template* row rather than left as a duplicate. **→ Owner decision outstanding:** keep or delete
      those four rows.
    - **Honest variance:** summaries in `fm-coach-culture` and `forecasting` run to ~550 chars against
      the 333–463 the earlier files hold. Still three sentences, but at the long end; trimmable in-app.
    - **The 12 left are the heavy ones.** Several draw on multiple source PDFs rather than one:
      forecasting (3 docs, ~1.2 MB), strategy (4 docs), data-systems (3 incl. the 1.6 MB
      Dashboard), profit (4), sales-marketing (2, one of which is the Powerful Seminars deck —
      a §0.5 "not really a support doc"). Budget roughly double the effort per domain.
    - **Two rules being applied (Mike, 2026-07-29):** (1) **If-Then rows drop out** of Domain
      Support — the Logic Tables tab owns those grids under §0.6, so keeping them would put the
      same content in two editable places. Valuation and stock-purchasing both carry a logic
      table at the end of their source (valuation's is the *unlabelled* one §0.5 warned about).
      (2) The **seven non-support documents go last** — Coaching Content, Dashboard, Powerful
      Seminars, Sales & Marketing slide table, Cautious Reveal, Trial Fit, Why Use Rev Models are
      slide decks / FAQs / an index, and §0.5 still records their handling as undecided.
    - **Summary length is the standard to hold:** EOY's summaries run 254–322 chars. The first
      Systems draft put **2,600 characters** in one Summary cell and Mike rejected it on sight;
      re-authored so Summary is 3 sentences and the teaching lives in Step-by-step, where the
      four-column standard intends it. Migrated files now run 333–463 chars.
    - **`who_when` is the one drafted field** (the gap §0.5 predicted) — EXCEPT where the source
      carries its own suitability line, which succession and stock-purchasing both do, so those
      are the firm's words.
    - **Content-loss check performed per domain:** only 13 templates have a `*-reference.json`
      second home (that is why EOY could summarise freely — `eoy-reference.json` was untouched).
      Systems, risk, staff, succession, valuation and stock-purchasing have **none**, so their
      files are the only home for that teaching and nothing was dropped from them.
    - **Helper used:** a scratchpad `apply-materials.js` splices `materials[]` in and removes
      `support_tools`, preserving `label` / `trigger_keywords` / `overview` / `diagnostic_entry` /
      `advisor_guidance` verbatim — those last two are still read by the prompt formatters
      ([`domainSupport.js`](../server/utils/domainSupport.js) L190, L267, L344) and must not be
      dropped just because EOY's file happens not to have them.
  - 📋 **Domain-support content migration — METHOD CONFIRMED (2026-07-27, Mike).** Author each
    domain's four-column draft **from the 43 source PDFs in `domain support/`** — NOT the existing
    `data/*-domain-support.json`, which plan §0.5 rules a *lossy* summary. **Keep ALL the richness**
    (fold every field into Summary + Step-by-step); the If-Then logic tables are **left alone** — they
    already exist as their own PDFs in `Logic Tables/`. Produce the drafts, then **finalise + approve
    one domain at a time** (mirrors how EOY was made, `dfa8572`). Cash Tactics was trialed in-app as
    the first draft this session and the preview **reverted** (not content-approved). **28 of 29
    domains still to migrate** (only EOY done). Detail: `FIRM-EDITABLE-TABLES-PLAN.md` §0.5.
  - ✅ **Specialist Tools Quiz INGESTED 2026-07-28 (approved by Mike, this branch).** The PDF is now
    tracked at `Course Builder Quiz/Specialist Tools Quiz.pdf` (renamed from the browser's `(1)`
    copy) and its **18 sections / 180 questions are live as 16 CB-30 banks** in
    [`data/course-quizzes.json`](../data/course-quizzes.json) — banks 31 → 47, questions 320 → 500.
    Transcription is mechanical from the PDF text (the firm's IP, never retyped or invented); two
    source artefacts were normalised (ﬁ/ﬀ ligatures, and a stray colon the PDF carries inside the
    running word "answer"). Fourteen banks are 10 questions; **Succession Planning** and **Coping
    With Adversity** are 20 each, merging two PDF sections apiece.
    - **Mapping (exact-title rule, `quizBankKeys.test.js`):** ten sections are named as their page.
      The rest map on documented page-purpose evidence — Cafe Turnaround Behaviours → *Turnaround
      Behaviours* ("this example showcases a cafe"), SMART & FAST Goals → *Powerful Goal Setting*
      (its purpose names the S.M.A.R.T acronym), Succession Metaphor → *Succession Planning* (its
      purpose names "the use of a 'planning metaphor'"), Weighted Stock Review → *Stock Policies*
      (a "Weighted Average" stock-prioritisation model), Due Diligence support → *Due Diligence
      Support* (case only).
    - **Library refreshed as part of the same job:** `data/templates.json` re-mirrored from
      `search_content_20260727205143.json` (286 → 289). Mike re-exported **twice** during the
      session to publish the pages the quiz teaches from — **Due Diligence Support**, **Systems B4
      Scale**, **Coping With Adversity**, all Specialist Tools. Every one of the 286 pre-existing
      entries is byte-identical; the diff is purely the three additions.
    - **One snapshot re-recorded (approved separately):** `treeContributionHarness` — the new
      *Due Diligence Support* page scores 5 like the other Specialist Tools valuation pages and
      now enters the top 6 for the sell/exit scenario, displacing the lowest tie. Engine logic
      untouched; the file's **verdict** assertions (Mike-confirmed correct outcomes) still pass
      unchanged. Full suite **1,891 green**, lint 0 errors.
  - ✅ **Strategic Tools Quiz INGESTED 2026-07-28 (approved by Mike, this branch) — every quiz PDF
    in `Course Builder Quiz/` now has banks behind it.** Its **11 sections / 110 questions** are live
    as 11 banks (banks 47 → 58, questions 500 → 610), same mechanical transcription. All 11 sections
    are abbreviations of their Strategic Tools page and needed no judgement call — *Planning Outcomes*
    → **Planning Outcomes Review**, *Bizz Targets* → **Business Targets**, *Strategic Orientation.1/.2*
    → **Orientation Part 1/2**, *Sales & Mktg Review* → **Sales & Marketing Review**, *Porter's & Pine*
    → **Porters & Pine**; the other five are named exactly as their page. No new library pages were
    needed and no snapshot moved. Full suite **1,913 green**.
  - ✅ **QUIZ LAB BUILT 2026-07-28 (approved by Mike, this branch) — `scripts/quiz-lab.js`.** The
    bench the locking test cannot be: it drives the REAL `findQuizBank` and the REAL grader
    selection once per bank, so it proves a bank is **reachable by a live session** and that every
    entry id resolves to its **own** model answer — neither of which an exact-title check can show.
    Writes [`design/QUIZ-LAB-REPORT.md`](QUIZ-LAB-REPORT.md) (metrics · per-bank verdict · library
    coverage · the opening of the AI's brief per bank) and **exits 1 on a structural fault**, so it
    can be wired to CI. Run free with `node scripts/quiz-lab.js`; filter with a substring.
    - **First run, all 58 banks: 0 orphans, 0 misbound, 0 grader faults** across 610 questions.
    - **Circularity caught during the build (recorded because it would have made the bench
      worthless):** the first version built the test session's resource **from the bank key**, so a
      mis-keyed bank matched itself and looked healthy. It now takes the title from the LIBRARY.
    - **Negative control (the bench is not vacuous):** run against a broken bank file — typo'd key,
      duplicate entry id, empty model answer — it reported 1 orphan + 1 grader fault and exited 1.
    - **`--ai N` mode (opt-in, spends credit):** generates real quizzes and flags any question that
      cites a missing entry or copies an entry near-verbatim. **First AI run (3 banks / 9 questions,
      E.O.Y Meeting · The 9 Growth Stages · Phone Techniques): every question built from a real bank
      entry with a valid `bankRef`, none near-verbatim** — CB-30 works end to end on the new content.
      *Observation, not a defect:* Phone Techniques drew entries 1–3 in order, which may be position
      bias or may simply be the synthetic session content (the page's purpose text stands in for a
      transcript) giving the model nothing to choose relevance on. A real session would tell them
      apart.
    - ☑ **LIVE-EYEBALL DONE 2026-07-28 (Mike, running app).** Both servers were started on the
      2026-06-29 recipe (backend Node 14.15 by exact path; frontend a PRODUCTION build, not the
      dev server) and Mike completed two course sessions end to end — **quiz scores 70 and 73**.
      Generation and grading were also driven directly over HTTP, through the Nuxt proxy as the
      browser does it: a Systems B4 Scale quiz built from entries 1/8/4, and the grader **passed a
      strong answer at 80 and failed a vague one at 40, its reasoning quoting the firm's own
      nodes-and-links teaching** — proof the CB-30 marking guide is authoritative, not GPT's
      general knowledge. Closes the CB-19 / Stage E live-verification line for the quiz path.
  - ✅ **QUIZ PROVENANCE BUILT 2026-07-28 (approved by Mike, this branch) — "which bank fed this
    question?"** Mike's ask: a complaint that "the quizzes aren't accurate" had **no address** —
    `bankRef` is an entry NUMBER, and nothing said which bank it belonged to.
    - **Backend** ([`courseEngine.js`](../server/courseEngine.js) `handleQuizGenerate`): the response
      now carries `bank: { key, source, origin }` (null when the page has no bank). The key is
      resolved by object identity rather than changing `findQuizBank`'s return shape, which the
      grader and its tests also depend on.
    - **SECURITY LINE HELD:** identity only, never entries. The firm's model answers stay withheld
      until AFTER grading (the existing rule — otherwise the browser holds the answers while the
      advisor writes theirs). Locked by a test that fails if any bank answer appears in the
      generate response.
    - **Frontend** ([`CourseBuilder.vue`](../components/CourseBuilder.vue)): every graded result
      records `bankKey` / `bankSource` / `bankRef` — on the RESULT, because that is what persists
      with the course and is what a manager view would later read. Quiz Review shows a quiet grey
      line: *from Ratio Analysis · question 5 · Course Builder Quiz/Specialist Tools Quiz.pdf*.
      Three states are deliberately distinct: banked (names it), unbanked (*AI-written from the
      session content*), and a result saved BEFORE today (says nothing rather than guessing).
      Advisor-visible on Quiz Review only — the in-quiz result card is left uncluttered.
    - 11 new tests (5 backend + 6 component); full suite **1,924 green**, lint 0 errors.
  - ✅ **Governance Quiz INGESTED 2026-07-30 (approved by Mike, this branch). `79f72f7`; full suite
    1,980 green / 133 suites, lint 0 errors.** Its **5 sections / 50 questions** — banks **58 → 62**,
    questions **610 → 652**. Data only: one file (`data/course-quizzes.json`) plus the source PDF;
    no code touched, so the AI path is byte-identical.
    - **Four sections were exact template titles and became new banks** — *Board Member Conduct*,
      *Draft White Papers*, *Governance Introduction*, *Quality Decisions*, 10 entries each, all in
      **Do the Job / Governance Tools** (an allowed quizzable area, so they reach the Quizzes editor).
    - **🔑 The fifth section, "Board 6 Hats", is NOT a template title — and could not become its own
      bank.** The library holds exactly one 6 Hats page (`id-5038284749`, General Tools), whose bank
      already carried 10 questions from `General Section Quiz.pdf`. Filing a second bank would (a)
      fail [`quizBankKeys.test.js`](../tests/unit/quizBankKeys.test.js), which enforces exact titles,
      and (b) even past that gate, be **silently unused** — both keys canonicalise to `6 Hats` and
      `findQuizBank` keeps only the first. So the SKIP-DUPLICATES ruling (2026-07-20) applied.
    - **Skip list, listed not silent — 8 of 10 skipped, 2 merged as ids 11–12.** Kept: the **four
      domains of intelligence** (absent), and the **Black Hat triggers** — the bank carried Red and
      Yellow but covered the Black Hat **nowhere**, so an advisor could pass a 6 Hats quiz never
      meeting the hat that forces risk assessment. That one restates Yellow and was flagged as a
      judgement call before Mike approved it. Skipped: cross-purposes, Sperber, De Bono's 10-fold,
      Purpose vs Area Focus, the Double Blind, the hat-order rule, (Problem, Because, Results), the
      two aims of parallel thinking.
    - **Provenance:** entries 11–12 carry their own `source`/`transcribed`, because the bank header
      says `General Section Quiz.pdf` and that is no longer true of those two. Extra fields do not
      disturb the shape the locking test checks. Flagged to Mike as an addition beyond the proposal.
    - **One transcription deviation, Mike-approved:** Q47 arrives from the PDF with an italic
      artefact (*"…65 finance companies 31were investigated 24 were charged"*); written as
      "Out of 65 finance companies, 31 were investigated and 24 were charged." Punctuation only.
    - **Verified by running the real lookup, not by reading code:** `findQuizBank` reaches all five
      banks, and **"Board 6 Hats" → `6 Hats`** through the CB-34 tolerant pass. `quiz-lab`:
      62 banks / 652 questions / **0 orphans / 0 misbound / 0 grader faults**; new coverage row
      *Do the Job / Governance Tools 8 pages, 4 with a bank*.
  - ☐ **P3 · DOC — [`QUIZ-LAB-REPORT.md`](QUIZ-LAB-REPORT.md) is now STALE** (says 58 banks / 610
    questions; reality is 62 / 652). **Do NOT regenerate it on a machine with no `OPENAI_API_KEY`:**
    an AI-OFF run silently DROPS the report's *"Generated quizzes (AI mode)"* section — ~600 lines of
    real AI-written examples — leaving a weaker document that still looks complete. That happened
    2026-07-30 and was restored from git rather than committed (same trap the Scenario Lab report
    recorded 2026-07-23). Re-baseline only where a key exists.
    - ⚠ **`scripts/quiz-lab.js` ignores unknown flags** — `--help` does not print usage, it RUNS the
      lab and **overwrites the committed report**. That is how the above happened. Never invoke it
      casually; it is a write, not a read.
  - ☑ **LIVE END-TO-END CONFIRMED BY MIKE 2026-07-30 — the advisor AND firm-manager halves.** In his
    words: he ran a quiz, got the answers, saw the pass/fail score, **went into My Progress as an
    advisor and saw it recorded, then went in at firm-manager level and saw it recorded there.**
    This is the reporting half that the 2026-07-28 live-eyeball (above, ~L402) did not cover.
    **⚠ The laptop branch's own session-4 note still reads "STILL NOT PROVEN BY EYE" for that
    screen — that note is STALE and Mike's account supersedes it.** Recorded here because it cannot
    be corrected on the laptop's branch from this machine; flagged in the handover instead.
  - ➡ **MOVED TO THE LAPTOP 2026-07-29 (Mike's call) — the whole advisor-progress section
    now belongs to branch `feat/advisor-progress`**, cut from `origin/master` and pushed;
    its briefing is [`ADVISOR-PROGRESS-HANDOVER.md`](ADVISOR-PROGRESS-HANDOVER.md) (the two
    screens, why they render zeros, the mocked Team Dashboard, the missing component tests).
    Nothing had to be moved out of this branch — every advisor-progress file is
    byte-identical between `master` and here. **The desktop does not pick these items up.**
    The one exception is the per-question record immediately below: it builds on the quiz
    provenance that exists only on THIS branch, so it waits until this branch merges to
    `master` and the laptop merges `master` in.
  - 🟠 **Still open — the BACKEND record (the manager half of the same idea).** `log-course` still
    sends only the score, so `advisor_course_completions` — and therefore **My Progress** and the
    **Team Dashboard** — are unchanged: they show averages and have never seen a question.
    - **Gated on Firm-Manager MySQL provisioning, with fresh evidence:** both of tonight's live
      completions (scores 70 and 73) **failed to record** — `[activityLogger] logCourseSession
      failed: Access denied for user 'root'@'localhost'`. My Progress returns all-zero tiers and an
      empty `recentActivity` for that reason alone. This is the P1 blocking a real feature, not a
      theoretical gap.
    - **DECISION for Mike when it is unblocked:** whether the per-question record stores the
      advisor's own free-text ANSWER. Recommendation is **no** — store bank key, entry number,
      pass/fail and score only. Advisors write differently once they believe a manager reads their
      words, which would degrade the very signal the record exists to collect. Text can be added
      later; it cannot be un-stored.
    - **Cheapest path when it lands:** per-question provenance already persists inside the course
      record (`va_courses` via `courseStore`, dev-file fallback), so a manager view may be able to
      read from there rather than needing new columns — but cross-advisor reads are IDOR-sensitive
      and must go through the same `firmAuth` pattern.
  - ✅ **Ghost logic-tree references — 29 → 0, ALL CLOSED 2026-07-30 (the last one needed Mike's
    ruling, recorded at the end of this entry). FIXED 2026-07-30 (approved by Mike, this branch).
    Full suite 1,971 green, 11 snapshots unchanged, lint 0 errors. ⚠ READ THIS BEFORE EVER RUNNING
    `scripts/migrate-ghost-references.js` — it would have destroyed real content.**
    The backend warned at every start that six template names in `data/logic_trees.json` matched
    nothing in the search content (*"These produce AI hallucinations"*): `Sales Session`,
    `Data Session`, `Planning Session`, `People Session`, `Process Session`, `Growth Framework`.
    Six distinct names, but **29 actual references across 22 nodes** — the boot log dedupes.
    - **What they really were: five LIVE pages that had been RETITLED upstream in Advisor-e.**
      Proved from each page's own slug in the master export, which still spells the old name —
      `planning-session` → **"Lite Planning"**, `data-session` → **"Lite Data"**, `sales-session` →
      **"Lite Sales"**, `people-session` → **"Lite People"**, `process-session` → **"Lite Process"**.
      The CB-12 lesson exactly: titles drift, slugs don't. Not caused by the 2026-07-28 library
      refresh (it added three pages and removed none).
    - **🔴 The existing repair script was the WRONG tool and would have caused real harm.**
      `migrate-ghost-references.js` **deletes** what it cannot resolve
      (`node.templates.filter(name => !ghosts.includes(name))`). Running it would have stripped
      **28 correct recommendations** out of the trees — 13 from `systems` alone — after which the
      trees would have validated clean while recommending nothing in those spots. A worse state
      than the warning, and invisible. The script is left in place but must not be run on these.
    - **The fix:** the five stale titles renamed to the live page titles (28 references, 7 trees).
      Mechanical, no judgement — each mapping is proved by the slug. Diff is 28 insertions /
      28 deletions, no reformatting (the file is exactly `JSON.stringify(…, null, 2)` + newline).
      The one-off script aborted rather than writing if any target title were missing from the
      export, so it could not create a fresh dead reference.
    - **MEASURED, not assumed — and the committed bench could NOT see this.**
      [`treeContributionHarness.test.js`](../tests/unit/treeContributionHarness.test.js) only
      exercises the `valuation` and `governance` trees, so it is structurally blind to all seven
      trees touched here; its snapshots passing is *expected*, not evidence. Measured instead
      through the same production soft-hint path (`resolveTemplates` + `treeHintNames`), one
      variable changed: **4 of 7 trees moved their deterministic top-6** — `systems` (*Lite
      Process* enters at 7), `client_sales` (*Lite Sales* 6 → **9**, now 2nd), `cashflow` and
      `cash_tactics` (*Lite Data* enters at 8, now 2nd). `staff_performance`, `client_planning`
      and `frameworks_find` are equally fixed; their references are simply out-scored on the test
      case. **This is a deliberate behaviour change:** those rules recommended nothing before.
    - ✅ **GUARD SHIPPED so this cannot rot silently again:**
      [`tests/unit/logicTreeTemplateNames.test.js`](../tests/unit/logicTreeTemplateNames.test.js)
      fails the build if any client-delivery tree names a page the library lacks. **A boot warning
      is not a control** — this one was logged, backlogged and carried for days while the tool that
      "existed for it" would have made things worse. Anchored to the **committed**
      `data/templates.json`, NOT the gitignored export, which would make the guard pass vacuously
      on a fresh clone and in CI. Scope mirrors `validateLogicTreeReferences` (node trees only;
      flat_if_then Learn trees excluded for the documented reason). **The allowlist is now EMPTY**
      (it held one entry, `Growth Framework`, until Mike ruled on it later the same day), so the
      dead-reference test runs with no exemptions at all. The failure message tells the next reader
      to check the slug before deleting.
      - **Recorded honestly:** while the allowlist is empty, the "every allowlist entry is still
        needed" test iterates nothing and proves nothing. That is stated in the file so a passing
        no-op is not mistaken for a working guard.
      - ☐ **P3 · TEST follow-up (found 2026-07-30, NOT done — needs its own approval):** that test
        checks an allowlisted name is still **absent from the library**, but not that it is still
        **referenced by a tree**. So a name that stops being used would leave a stale exemption
        behind — the one thing the allowlist rule exists to prevent. Nothing is stale today
        (the list is empty), which is why this was logged rather than folded into that change.
    - **Negative control run (the guard is not vacuous):** against broken fixtures it caught the
      real retitle defect and a hand typo, and correctly ignored `[placeholders]`, prose
      fragments, the allowlisted name and a healthy tree. **Blind spot recorded honestly:** if
      someone runs the deletion script the dead name is *gone*, so the guard falls silent — a rule
      recommending nothing looks identical to a healthy one. That is why the test also pins the
      five corrected names by name.
    - ✅ **RULED + FIXED 2026-07-30 (Mike, same session) — `Growth Framework` → `Growth Curve`.
      The last dead reference is closed; 29 → 0.** (`frameworks_find` node
      `ff_branch1_milestones`.) **A different fault from the five retitles, which is why no slug
      could solve it:** the source PDF names a *framework* — "THEN use the 'Growth Fundamentals
      Framework'" — where all six other branches in that table name a page, and in the library
      `Growth Framework` is a **subSection holding six** pages (*The 9 Growth Stages*, *Growth
      Curve*, *Lite Fundamentals Components*, *Growth Fundamentals Framework Philosophy*, *Growth
      Curve Checklist*, *Revealing the Growth Curve Freehand*). There was never a page of that
      name to go dead, so this needed the owner's ruling, not a lookup.
      - **The evidence put to Mike:** of the six, only *Growth Curve* carries
        `includedInClient: true` — the rest are advisor-side reference material — and its stated
        purpose is *"align your mutual understanding of their contextual position"*, which is the
        branch note's *"pick a spot on the curve"* almost word for word.
      - **The CB-34 resolver's guess was the worst of the six.** It returned *Growth Fundamentals
        Framework Philosophy* on word overlap: the *"Full Monty… all the information **you** need"*
        advisor study manual, the one page you would never open in front of a confused owner. Not
        acting on a word-overlap guess was the right call, and is the case for keeping content
        rulings with Mike rather than with the resolver.
      - **MEASURED before the edit, through the production soft-hint path** (`walkLogicTree` →
        `treeHintNames` → `resolveTemplatesWithOutlier`), one variable changed, states built on the
        fields `buildSignalText` actually reads. **The branch is live** — reached in 3 of 3
        hand-built milestone states, so it was firing and recommending nothing. **Effect, stated
        honestly:** *Growth Curve* now earns `tree_hint:+3` where the old name earned nothing, which
        puts it in the AI's shortlist in **3 of 8** plausible domains (people-power r4, valuation
        r5, forecasting r6) and changes the **advisor's cards in 1 of 8** (people-power:
        *8 Profit Levers* → *Growth Curve*). In `strategy` — the likeliest domain for this
        conversation — nothing changes, because `TREE_HINT_BOOST = 3` is deliberately too weak to
        beat that domain's own matches. Guide, not replace, working as designed.
      - **⚠ A measurement artefact to know about:** the first run reported the page "not in the
        pool", which was wrong — `scoringLog` is capped at 20 rows
        ([`templateResolver.js`](../server/utils/templateResolver.js) L622), so absent-from-the-log
        is **not** unscored. Re-measured against the AI shortlist (`candidates`) and the displayed
        cards (`buildDisplaySet`) instead, which is what actually reaches people.
      - **The Scenario Lab could not see this change** — 0 of its 51 cases reach Branch 1, the same
        structural blindness recorded for the entry-node work. The measurement above stands in for
        it; no lab delta is claimed.
      - **Guard extended:** a new test pins the ruling to the node — `Growth Framework` must never
        reappear as a reference, `Growth Curve` must exist in the library, and Branch 1 must name
        exactly it. A bad merge fails there rather than quietly returning the branch to
        recommending nothing.
      - **The `action` prose was left alone** ("Use the Growth Fundamentals Framework"). It names a
        real framework, not a missing page, so it carries none of the hallucination risk that
        justified the seven prose swaps above — and it is Mike's wording.
    - ✅ **7 prose mentions in tree `notes` SWAPPED 2026-07-30 (approved by Mike, same session).**
      The AI reads `notes`, so these carried the **same hallucination risk** as the template
      references — it could still name a page the advisor cannot find. 7 occurrences across 6
      fields: `systems` nodes `sys_b1c_both`, `sys_b2a_data`, `sys_b3a_clarity`, `sys_b4a_sixsigma`
      (×2), `sys_b4b_lean`, and `valuation` node `val_b3_goodwill`. **NAME SWAP ONLY — Mike's
      sentences are otherwise byte-unchanged**; this is the firm's own writing and rewording it was
      explicitly not in scope. Verified afterwards: **zero occurrences of the five old names remain
      anywhere in the file**, prose or references. Suite 1,971 green.
      - ☐ **One reading artefact left for Mike, deliberately not "tidied":** `sys_b4a_sixsigma`
        now reads *"Volatility Analysis (from **the Lite Data**) establishes what is normal
        variation…"* — grammatical but awkward, because the old title absorbed the article
        naturally and the new one does not. Fixing it means deleting a word of Mike's prose, which
        is a different act from correcting a page name, so it was flagged rather than done. The
        other six read cleanly (*"Use Lite Process to rebuild the architecture"*).
      - **The guard does not cover prose** and deliberately so: a substring check over free text
        would false-positive on ordinary sentences. Prose mentions remain a manual concern at the
        next retitle — the guard will catch the *reference*, which is the signal to come and look
        at the notes too.
  - ☑ **Domain Support rail made honest 2026-07-27.** `_countSupportItems` now counts only the
    editable four-column `materials` (legacy `support_tools` domains report 0, matching the
    "not authored yet" panel they show when opened); the rail renders a muted "Not set up yet"
    instead of a bare `0`, so progress is legible at a glance (only EOY has content so far).
  - ☐ **Still open:** (1) **Job 2 — SCOPE CORRECTED 2026-07-30, read this before starting it;**
    (2) per-material origin tags are domain-level until the §2.4 compare-screen work.
  - 🔴 **JOB 2 IS NOT A 29-DOMAIN JOB — the earlier wording was written 2026-07-27 and is STALE.**
    It read as "fold each material's genuine how-to Q&A into the steps" across the board. But the
    **2026-07-29 migrations of the remaining 28 domains already folded that depth in as they went** —
    proven by reading a late-migrated file: `governance-domain-support.json` step 7 carries the
    *Waterline* and the five Team Functioning Levels, step 4 defines *Tampering*, step 5 names the
    *Assassin*. That is Q&A-depth content already living in the steps. **The genuine gap is EOY
    ONLY** — the first domain, migrated 2026-07-24 under the explicit "Job 1: Q&A untouched" rule,
    before the richer method existed. Corrected because this line sent a session down that blind
    alley on 2026-07-30; left standing it would do so again.
    - **EOY analysis already done (read-only, 2026-07-30) — 21 Q&As classified, nothing written.**
      **6 genuine folds** (all Mike's own words, absent from the steps): the *"faster you go, the
      bigger the mess"* punchline (Agenda step 4); the KPI test question *"…if we knew the answer to
      X, how would that help us in our future decision making..?"* (Basic Targets step 5); the
      Farmer's-ladder endpoints *Labourer (1) → Vertical/Consortium Owner (8)* (Rural step 3); the
      four Strategic farm-expense examples (Rural step 5); the quiet-persona handling *"fill up the
      'theatre' with energy"* and the **'By the Way' script** for a rude client (Scripts step 2).
      **13 drops** — 9 already in the steps near-verbatim, and **4 test-style ones already covered by
      the `E.O.Y Meeting` bank** (entries 8, 9, 6, 7), which is exactly what the cross-check is for:
      signed-off quiz material must not be duplicated into the steps. **2 for Mike** (teaching
      content, not delivery): the Quick-ratio definition, and the Working Capital Cycle KPI elements.
      Not started — needs its own approval, and it is a small tidy-up, not a programme.
    - ☐ **P3 · CONTENT (Mike) — two defects in `Domain Support/EOY Support.pdf` itself.** (1) The
      *Basic Targets* Q&A ends with an **orphan numbered item "6."** — a question begun and never
      written. (2) *Rural* Q&A 5 cites *"the standard **6-step** Accounts Review"*, but no material
      in the document describes a 6-step accounts review; the steps carry a single accounts-review
      step. Either a detail that never made it across, or loose wording. His source, his call.
    - **Also noted:** *"Tampering"* is defined nowhere in the EOY steps or the `E.O.Y Meeting` bank,
      though Agenda step 4 asks advisors to classify it. It **is** defined in the new
      `Quality Decisions` bank (entry 4) and in the governance material — different templates, so
      legitimately separate under the cross-bank rule, not a gap to close by copying.
  - **The point (Mike's words):** so educators can have a real impact on the AI's
    recommendations and include their own material easily. This is the firm-authoring
    story reaching the engine's decision inputs, not another CRUD screen.
  - **Scope named so far:** (1) Document Library page brought to the same layout and
    code pattern as the Quizzes and Distinctions pages; (2) the logic tables and
    domain-support data become **dynamic, editable tables at Firm Manager level**.
  - **Plan from what already exists, not from scratch** — Mike's instruction is to base
    it on the layout and code already used in those two pages:
    [`components/firm/FirmQuizzes.vue`](../components/firm/FirmQuizzes.vue) (rail →
    panel, brand block tones, data-driven ordering/filtering via
    [`data/quizzable-sections.json`](../data/quizzable-sections.json)) and the Advisory
    Distinctions tab in [`FirmManagerHub.vue`](../components/FirmManagerHub.vue)
    (firm-overlay CRUD, version history, restore).
  - **Reuse, don't reinvent:** the layered firm-overlay machinery
    ([`server/utils/firmOverlay.js`](../server/utils/firmOverlay.js), config_key rows in
    `firm_framework_versions`) already gives version history, restore and the IDOR-safe
    guard for free — the same pattern behind Distinctions, the Staircase and the new
    quiz banks. Skill: `firm-manager-edit-target`.
  - **Known gates to settle when planning:** firm-authored table content becomes
    untrusted input reaching the engine, so it needs the same `origin`-tagged fencing the
    quiz banks got (CB-31 Phase 2); and Firm-Manager MySQL persistence is still not
    provisioned, so this runs on the dev-file fallback like every other Firm Manager
    feature until it is.

- <a id="quiz-rail-stuck-open"></a>☑ **FIXED 2026-07-23 (Phase 1 of the firm-editable tables build, approved by Mike).**
  Exactly the fix direction below: open-state is now THREE-STATE (unset / opened /
  closed) inside the shared `components/firm/FirmRail.vue` — an explicit close always
  wins over auto-expand, auto-expand applies only while the firm has expressed no
  choice, and a changed search text resets the flags so a stale close can never hide a
  new search's hits. The missing "a sub-section can be CLOSED again" test now exists
  (4 cases in `tests/unit/firmQuizzes.component.test.js`, incl. the exact reported
  scenario). Original report, kept for the record:
  **BUG — a Quizzes-rail drop-tab cannot be closed once a quiz inside it has been
  opened.** Reported by Mike 2026-07-22 on Growth Framework; it is not specific to that
  section — it happens in ANY sub-section as soon as a page inside it is selected.
  **Cause is known**, in [`FirmQuizzes.vue`](../components/firm/FirmQuizzes.vue) (the
  `sub.isOpen` computation in `tree`): open-state is
  `openSubs[key] || (searching && has hits) || (holds the current page)`. That last
  clause FORCES the panel open, so `toggleSub` flipping the manual flag to false has no
  effect — the condition still returns true and the panel re-opens on the same tick.
  **Introduced today** with the auto-expand that fixed the "search finds matches but
  shows nothing" defect: making "contains the current page" force-open was right for
  first render and wrong as a permanent override of an explicit collapse.
  **Fix direction:** the manual flag must be able to say *closed*, not just *open* —
  e.g. store three states (unset / opened / closed) and let an explicit close win over
  the auto-expand, keeping auto-expand only where the firm has not expressed a choice.
  **No test caught it:** the component tests assert the rail renders and that search
  expands a match, but nothing asserts a sub-section can be CLOSED again. Add that case
  with the fix.

- <a id="no-icon-font"></a>☐ **BUG — every `<b-icon>` in the app renders as NOTHING; no icon font is loaded.**
  **Partial ruling 2026-07-23 (Mike, Phase 1):** the rebuilt Document Library is
  text-only — no `b-icon` props, CSS-drawn shapes where an affordance is needed — so
  this screen no longer depends on the missing font. The APP-WIDE decision (install
  `@mdi/font` locally vs remove the remaining icon props) stays open below.
  Found 2026-07-22 when a disclosure arrow would not appear however it was styled.
  Buefy's default icon pack is Material Design Icons and `b-icon` emits
  `<i class="mdi mdi-…">`, but [`nuxt.config.js`](../nuxt.config.js) loads only
  `buefy/dist/buefy.css` and the Open Sans webfont — no MDI stylesheet, and
  [`plugins/buefy.js`](../plugins/buefy.js) sets no `defaultIconPack`. So every icon
  across the app is blank: the seven Firm Manager tab icons, the document-library and
  video buttons, everything. **Not cosmetic where an icon is the only affordance** — the
  Quizzes rail's expand arrow was invisible, leaving a control that gave the firm no sign
  it could be opened. Worked around there with a CSS-drawn triangle
  ([`FirmQuizzes.vue`](../components/firm/FirmQuizzes.vue) `.rail-chev`) so it cannot
  depend on a missing font. **The app-wide fix is still open** and needs a decision:
  install `@mdi/font` as a local asset (no CDN, offline-safe) versus removing the icon
  props. Predates today — nobody had noticed because no screen depended on an icon alone.

Two honest answers on different axes — the file used to conflate them:

- **Highest-SEVERITY open item:** the **dev-toolchain reconcile** → add 2 `overrides` + flip `engine-strict` back to `true` (P1, stack governance — the last unclosed Stack-Constitution drift). **But it is overnight-reinstall-gated** — not a now-task. → [§Dev-toolchain](#dev-toolchain)
- **★ NEXT ACTION — open for triage (Mike to pick).** The big **cross-domain engine workstream (2026-06-25) is DONE, merged to `master`, and live-validated** — full record in ACTIONS-ARCHIVE. Strongest remaining candidates: **Firm-Manager config persistence → MySQL** (pre-production — the only thing between the validated DEV crisis distinction and a real firm authoring one), the **jest coverage-gate** item, or the **dormant-trees needs-signal bucket**.
- **✅ Done 2026-06-29 (this session) — Distinctions cascade Stages E AND D BUILT + verified, on branch `feat/mentor-distinctions-authoring`.** **Stage E** (mentor-update review): when the mentor edits a distinction a firm OVERRODE, the firm gets a "Mentor updated this distinction" badge + Review-update compare panel → **Adopt** or **Keep mine** (per-override content-signature drift) — plus the non-overridden complement ("since your last visit" notice) and a latent-bug fix (firm screen now reads the LIVE mentor set). **Stage D** (mentor delete → "keep theirs"): customising firms keep their version as a firm-own row; cross-firm enumeration is production-real (`listFirmIdsWithConfigKey`). Test isolation hardened (dev-fallback tests no longer touch shared real files) → a clean `npm test` is deterministic. **Full suite 637 green; lint clean. Stage D + E LIVE-VERIFIED by Mike 2026-06-29** (Adopt/Keep-mine flow + delete→keep-theirs click-tested in the running app). Mentor-authoring is now A–C + **D + E**; only **Stage 3** (hierarchy/role) remains. **✅ MERGED to `master` 2026-06-30** (merge commit `db97c7b`); the feature branch plus 5 other stale merged branches were deleted (local + remote), leaving the repo `master`-only. *Detail:* plan §6, memory `design-distinctions-cascade`.
- **✅ Done 2026-06-25 (this session) — cross-domain engine sweep, all lab-measured over 50 fixed cases across the 14 domains:** (1) **Display-drop fixed** (`buildDisplaySet` — code owns Stage-6 card selection, AI writes copy only; R17 exclusion licence retired). (2) **AI domain-detection backstop**, confidence-gated (keyword-first; thin/no-match → AI by meaning, boxed to the 14; disagreement → ask the advisor) — detection reachability 78%→96%. (3) **Distress read** recalibrated 8%→75% precision (sober crisis tone). (4) **Industry-model leak** fixed (revenue models suppressed outside profit/forecasting). (5) **Signal coverage** broadened for staff/data/systems 26%→42%. (6) **Crisis routing fixed** — broadened profit crisis keywords + gave the AI classifier real domain boundaries (crisis=profit, not risk); live-validated end-to-end (café-crisis → Cafe + Quick & Worst + Receivership, sober tone). (7) **Scenario Lab** built (`scripts/scenario-lab.js` + `scenario-lab-cases.json` + `domain-detection-check.js` + readable `design/SCENARIO-LAB-REPORT.md`) — repeatable cross-domain test bench. (8) **Case-study "wipe on refresh"** fixed (advisor-page token resolution + caseMixin token-watch). (9) **Discover (template search) crisis fix** — naturally-worded crisis searches now surface the survival tools (`filterTemplatesByQuery` insolvency-vocabulary expansion + `discover.txt` "CRISIS FIRST"); built the **Discover Lab** sibling (`scripts/discover-lab.js`); survival-tool surfacing 2/5 → 5/5, live-validated. 544 tests, lint clean, nuxt build green.

---

## CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass)

> Full review of the business-performance-report feature (Quick Position + EBITDA & DCF
> A–D + intake pipeline) for tech-plan drift and bugs. **Full detail with file:line and
> failure scenarios: [`SESSION-2026-07-18-NOTES.md`](SESSION-2026-07-18-NOTES.md)** (R-numbers
> below refer to it). Baseline at review time: **1,266 tests / 88 suites green on Node
> 14.15.0** (run live ✔); both intake routes carry `firmAuth` ✔. Stack Constitution,
> intake contract, privacy boundary and ~20 hand-re-derived golden values all verified
> clean — see the notes' ✅ section. **No code changed** — all gated on Mike's per-item
> approval. Fix session planned 2026-07-19; suggested order in the notes.

**🔴 P1 — CRITICAL (fix before more real client files)**
- ✅ **FIXED 2026-07-19 — R1 — QP intake: edited figure keeps its "from file" badge** — [`components/QuickPositionIntake.vue`](../components/QuickPositionIntake.vue) L48. Added `@input="markEntered(key)"` + method, the exact pattern from `EbitdaDcfIntake.vue`. Intake contract §4.4 restored. 1,266 tests green, lint clean. *(Mike-approved 2026-07-19.)*
- ✅ **FIXED 2026-07-19 — R2 — QP: cleared figure silently becomes the demo sample number, still tagged "from file"** — `QuickPositionIntake.vue`. `confirmFigures()` now blocks the build unless every visible figure is a finite number; offending rows highlighted + approved message (`report.quickPosition.confirm.incomplete`). Closes the frontend fabrication path (backend defaulting = R8, still open; EBITDA-side validation = R23, still open). 1,266 tests green, lint clean. *(Mike-approved wording + fix 2026-07-19.)* ⚠ No component test yet — `@vue/test-utils`/`vue-jest` are not installed (suite is backend-only); install is desktop work per the two-machine rule — logged below.
- ✅ **FIXED 2026-07-19 — R3 · SEC — XLSX reader: unbounded row index → OOM/DoS from a ~1 KB crafted file** — [`server/report/intake/xlsxReader.js`](../server/report/intake/xlsxReader.js). `MAX_ROWS_PER_SHEET = 10000`; a value-bearing cell at/past row 10k throws `FILE_TOO_LARGE` (approved message) before any row padding. Checked at the padding site so empty Excel-re-save phantom cells far down still parse. +2 tests (attack file refused, phantom file parses). 1,268 tests green, lint clean. *(Mike-approved fix + wording 2026-07-19.)*
- ✅ **FIXED 2026-07-19 — R4 — multi-column exports silently read first-column-only** — [`server/report/intake/xeroReportParser.js`](../server/report/intake/xeroReportParser.js). Two-tier `guardFigureColumns` in both extractors (Mike chose option C): 2–4 figure columns (comparative) → parses first column + approved warning; ≥5 (by-month/quarter) → refused, `MULTI_PERIOD_COLUMNS` 422 (added to `INTAKE_STATUS`), approved message naming the whole-period export. +3 tests (comparative warns, by-month refused, single-column silent). 1,271 tests green, lint clean. *(Mike-approved option + wording 2026-07-19.)*
- ✅ **TEST-GAP — CLOSED 2026-07-22.** Tooling installed 2026-07-21, actually proven and all 42 component tests written 2026-07-22 (Quick Position intake 12, EBITDA intake 18, both report screens 12). Suite 1,456 → **1,498 green**. `@vue/test-utils@1.3.6` (the Vue 2 line the Stack Constitution names), `@vue/vue2-jest@27.0.0` (matched to the installed Jest 27.5.1) and `vue-template-compiler@2.7.16` (promoted from transitive to a direct devDependency, pinned exact because it must match `vue` exactly). `jest.config.js` gained `moduleFileExtensions`, a `transform` and the `~/`/`@/` `moduleNameMapper`; `testEnvironment` stays `'node'` and component tests opt into jsdom per-file with a `@jest-environment jsdom` docblock, so the backend suite is untouched. Proven end to end by `tests/unit/heroFigure.component.test.js` — **Pug templates compile through the transformer on the locked Node 14.15**, which was the main unknown. Suite 1,363 → **1,366 green**. ⚠ **That proof was narrower than it read — corrected 2026-07-22.** `HeroFigure` happens to contain no *valueless* Pug attribute, so it never exercised the one place the test pipeline diverges from the app's. `pug-plain-loader` (the app's build path) hardcodes `doctype: 'html'`; `@vue/vue2-jest` does not, so `@dragover.prevent` expanded to `@dragover.prevent="@dragover.prevent"` and template compilation failed outright — meaning **no** real screen on either branch could be tested. Fixed in `jest.config.js` with `globals: { 'vue-jest': { pug: { doctype: 'html' } } }`. **This matters to the desktop too:** Course Builder's components were equally untestable until this landed. *Install caveat, important for the desktop:* it was done with npm 10 (Node 20) + `--lockfile-version 2` + **`--legacy-peer-deps`**. Without that last flag npm 10 resolves a **pre-existing** unmet peer of `tsutils` (from the ESLint chain) and installs `typescript@7` — a Stack Constitution violation that npm 8 does not trigger. Verified additive: 51 packages added, **0 removed, 0 version changes**, lockfile still v2, `overrides` and `engines` intact. **Origin:** found 2026-07-19 when the R1/R2 fix's test could not be written (Mike approved the test; blocked, not skipped). ✅ **DONE 2026-07-22 — `tests/unit/quickPositionIntake.component.test.js`, 12 tests, plus the shared `tests/helpers/mountComponent.js`** (real Buefy — the intake holds its state in `b-input` `v-model`s, so a stub would test the stub; and a `$t()` stand-in returning the **key**, not English, deliberately, so these tests survive the pending report-i18n sweep instead of breaking the day the wording moves into `locales/`). Covers R1 (from-file badge kept; flips to *entered* on edit; other rows untouched), R2 (empty figure blocks the build, row flagged, message shown; block clears once supplied; a toggle-hidden row cannot hold the build hostage), R12 (step-back preserves figures, badges and the P&L carry-forward; the emitted payload is a deep copy) and R13 (wrong-type / oversized / multi-file drops all refused **with no upload attempted**). **Verified by mutation, outside the repo** — with `markEntered` removed the badge test fails; with the confirm guard removed the R2 test fails, emitting `cash: { value: "" }`, the exact fabrication path R2 was raised to close. Suite 1,456 → **1,468 green (100 suites)**, lint clean, no app code touched. ✅ **AND THE REST DONE, SAME DAY — this item is now CLOSED.** `tests/unit/ebitdaDcfIntake.component.test.js` (18) covers the 24-row × 5-year grid: row-level provenance (stays *from file* while ANY year in the row is a file figure, flips only when all are edited), a cleared cell blocks the build and flags just that cell, the grid emits exactly as many cells per row as there are years (never a padded sample slot), the Read button holds its "minimum two years" promise, wrong-type / >5 files / >5 MB **per request** all refused before upload, and year assignment refuses missing or duplicate years. It also pins the **column reversal** — the grid displays newest-first but stores oldest-first, so a broken reversal would save a figure typed under 2025 against 2021: no error, no visible symptom, just a wrong valuation. `tests/unit/reportScreens.component.test.js` (12) covers the half of R9/R11 the mixin tests **cannot** reach — `reportRecompute.test.js` proves a failed recompute *sets* the stale flag but says nothing about whether the screen then shows anything, and correct state that renders nothing is precisely the failure Phase 2 proved the suite was blind to. Result payloads come from the **real backend models**, not hand-written fixtures, so a change to the calc's output shape surfaces here instead of leaving the tests passing against a payload the backend stopped producing. All mutation-verified outside the repo (remove the two-file minimum, the cleared-cell guard, the stale banner or the figure-greying → the matching test fails). Two wrong assumptions were caught and are now pinned: the EBITDA screen shows **one** badge collapsed (two rows sit behind the expand toggle, and both still print to the client PDF), and QP's expenses panel exists only when P&L lines were supplied. Suite → **1,498 green (102 suites)**, lint clean. *(R10 needs no screen test — the race guard lives in the mixin and is covered there.)* *(Extended 2026-07-19 with the R9/R10 fix:)* also cover both report screens — stale banner shows on a failed recompute (R9), an out-of-order response is discarded (R10), and the R11 badges: EBITDA `rowSrc` file/entered per row, QP fixed-costs tag set by `useExpensesMonthly` and cleared by a slider touch, liabilities group renders seed provenance. R12: restore round-trip (report → chip 2 → confirm table intact, badges preserved; chip 1 keeps figures under the drop zone; forward chip 2 gated on a seed). *(Extended 2026-07-20 with R13:)* wrong-type / oversize file shows the `fileCheck` message with no upload made; QP multi-drop on one zone refused with the `multiDrop` message. *(R22/R23:)* a QP money slider seeded above its cap keeps the figure on touch (dynamic max); EBITDA listed history renders and sends N cells for an N-year seed; the Read button stays disabled below 2 staged files.
- ☐ **P3 · ENV — npm 8 is not installed on the desktop, which is the machine that does the installs.** Found 2026-07-21 syncing the branch after the component-test tooling landed. The desktop has only **npm 6.14.8** (bundled with the locked Node 14.15) and **npm 10.8.2** (bundled with the Node 20 install). npm 6 must never be used here: it rewrites `package-lock.json` to lockfileVersion 1 and **discards the `overrides` block holding the stack reconciliation**; npm 10 would rewrite the lockfile upward. The sync was done by fetching npm 8.19.4 into the session scratchpad and running it from there with **`--legacy-peer-deps`** (mandatory — see the caveat above: without it the pre-existing unmet `tsutils` peer pulls in `typescript`, a Stack Constitution violation). Verified afterwards: lockfile byte-identical, no `typescript` in the tree, suite 1,456 green. *Also note:* `npx npm@8` fails on this machine — npm 6's npx cannot handle the space in `C:\Users\Mike Barnes`, hence the scratchpad. **The workaround is temporary and vanishes with the session, so this recurs every time.** Fix is to install npm 8 permanently against the Node 14.15 install — a change to Mike's machine, not the repo, so it needs his say-so. | desktop environment | ☐ found 2026-07-21

**🟠 P1/P2 · High**
- ✅ **FIXED 2026-07-19 — R5 — EBITDA calc: mismatched growth/discount lengths → NaN → null EV indistinguishable from honesty-null** — [`server/report/ebitdaDcfModel.js`](../server/report/ebitdaDcfModel.js). Both DCF blocks now throw on length mismatch (route catch → standard safe 400); padding rejected as the R8 fabrication channel. +3 tests (both blocks refuse; matched 2+2 pair still computes, futureYears [2026,2027]). 1,282 tests green, lint clean. *(Mike-approved 2026-07-19.)*
- ✅ **FIXED 2026-07-19 — R6 · SEC — intake catch echoed unexpected `err.message` → could leak a server file path** — new [`server/report/intakeError.js`](../server/report/intakeError.js): prototype-less allowlist of all 10 authored intake codes (NOT_XLSX/CORRUPT_FILE/TOO_MANY_PARTS added with statuses); `intakeErrorResponse` passes authored messages through, everything else → generic sentence + 400 (empty-message knowns too). Both catches in `routes/report.js` use it; code-only logging kept. csvReader's 2 cap errors now carry `FILE_TOO_LARGE` so their messages survive. +8 tests incl. ENOENT-path-never-leaks and `constructor`-probe. 1,279 tests / 89 suites green, lint clean. *(Mike-approved 2026-07-19.)*
- ✅ **FIXED 2026-07-19 — R7 · SEC — global `jsonBodyParser` had NO `maxBodySize`** (unlimited buffering, six anonymous calc routes behind it) — [`server/restify-server.js`](../server/restify-server.js): `JSON_BODY_LIMIT = 1 MB` (sized from evidence: largest config family ~551 KB future logic-tree overlay, templates 337 KB, calc bodies KBs; SSE engines self-cap 256 KB, uploads via formidable 5 MB — separate channels). Anonymous calc routes deliberately unchanged. +3 tests (`jsonBodyLimit.test.js`): live 413 on oversize via real socket, normal body parses, source tripwire pins the wiring. 1,285 tests / 90 suites green, lint clean. *(Mike-approved 1 MB, 2026-07-19.)*
- ✅ **RULED + FIXED 2026-07-19 — R8 · DECISION (Mike): option A — defaults may substitute, but NEVER silently** — both engines now return `defaultedInputs` naming every figure that computed on a sample default, exact positions included (`costOfSales[0]`, `listed.sharePrice`); flags travel through the same padding/trim path as the values so the echo cannot drift. +7 tests (blend declares padded years; junk named at position; fully-supplied body declares nothing with golden EV pinned; demo declares all). Paired with R23's confirm gate (below). 1,292 tests / 90 suites green, lint clean.
- ✅ **FIXED 2026-07-19 — R9 — both new reports: failed recompute left stale figures with no warning** — `QuickPositionReport.vue` + `EbitdaDcfReport.vue`: EightLevers stale-banner pattern copied in (existing `report.staleTitle`/`calcUnreachable`/`retry` strings, hero figures greyed `.is-stale`). No component tests possible yet — added to the TEST-GAP desktop task. 1,282 tests green, lint clean. *(Mike-approved 2026-07-19.)*
- ✅ **FIXED 2026-07-19 — R10 — both new reports: debounced-recompute race, older response could overwrite newer** — `_reqSeq` monotonic stamp in both recomputes; superseded responses (success AND failure) discarded. Covered in the TEST-GAP task. *(The three older reports' logged race below remains open — separate item.)* *(Mike-approved 2026-07-19.)*
- ✅ **FIXED 2026-07-19 — R11 — EBITDA print screen had NO from-file/entered badges; QP hid two file-sourced figures and untagged a third** — [`components/EbitdaDcfReport.vue`](../components/EbitdaDcfReport.vue): row-level badges (`rowSrc`, the intake's rule) on the 3 input P&L rows, printing with the PDF. `QuickPositionReport.vue`: `useExpensesMonthly` now tags fixed-costs *from file* (slider touch flips back); new read-only aside group "Immediate liabilities (from the Balance Sheet)" (Mike-approved heading) shows creditors/wagesDue + badges. Badge cases added to TEST-GAP. 1,292 tests green, lint clean. *(Mike-approved all 3 parts + heading, 2026-07-19.)*
- ✅ **FIXED 2026-07-19 — R12 — stepper desync + silent wipe of confirmed figures navigating back from step 3** — both intakes gained `restore` (reopen the confirm table with figures + badges intact) and `step` props (chip navigation via watch — the `$refs.intake.phase` reach-in retired); both pages' `goTo` keeps the seed on every move, chip 2 forward only when confirmed figures exist. QP restored mode carries expenseLines/incomeTotal/companyName through re-confirm. Cases added to TEST-GAP. 1,292 tests green, lint clean. *(Mike-approved 2026-07-19.)*

**🟡 P2/P3 · Medium/minor — R13–R24, logged in full in the notes (no silent parking):** client-side file validation ✅ FIXED 2026-07-20 (pre-upload type + size check in both intakes via shared `report.fileCheck` keys, QP multi-drop refused with approved message, dead `drop.reading`/`drop.wrongKind` keys deleted; backend checks untouched; component-test cases added to TEST-GAP; wording Mike-approved) (R13) · "5 MB each" is actually per-request total + late file-count check ✅ FIXED 2026-07-20 (Mike's option B: 5 MB total cap unchanged; server 413 + new client pre-upload total check say "together", approved wording; EBITDA route refuses >5 files BEFORE parsing, assembler backstop kept; +4 route-guard tests w/ mocked formidable) (R14/R15) · CSV accounting negatives `(1,234)` unparsed → figure silently vanishes ✅ FIXED 2026-07-20 (`toFigure` in csvReader: bracket negatives, `$`/`-$`/`$-` prefixes; comma grouping now strict so `"1,2,3"` stays text — never silently 123; `(-500)` stays text, sign never guessed; +4 tests incl. goldens unchanged) (R16) · real "Total …" account labels dropped ✅ FIXED 2026-07-20 (kept as a line item ONLY when inside an open section + closing no section by name + value ≠ any open section's running sum — so a renamed closer like "Total COGS" can never double-count; same discriminator in lineItems + totalCrossChecks; +3 tests) (R17) · unanchored `trading income` matcher ✅ FIXED 2026-07-20 (anchored — "Non-Trading Income" never classifies as sales) (R18) · multi-section opex under-read ✅ FIXED 2026-07-20 (a valued section feeding no bucket now raises an on-screen warning naming it, once per section, approved wording — never auto-classified; +3 tests) (R19) · fiscal-year alignment checks year only ✅ FIXED 2026-07-20 (assembler compares period-end day+month from each file's own date line; mismatch → approved on-screen warning; +2 tests) + QP date check lives frontend-side not in intake per §4.6 — ✅ RULED 2026-07-20 (Mike): screen-side IS the design — the QP intake takes one file per request so the two dates never meet on the server; the backend returns each file's date, the screen compares them (R20) · calc-route logs drop the stack ✅ FIXED 2026-07-20 (all six calc catches log the full error object; intake routes' code-only logging untouched — deliberate privacy) (R21) · slider hard-caps clamp real figures ✅ FIXED 2026-07-20 (all six QP money sliders get a dynamic ceiling via `moneyMax` — stretches to a file-seeded/restored figure so a touch can never snap it down; hand-entry beyond the normal caps deliberately deferred into R24's Buefy-vs-native ruling; no component tests possible — TEST-GAP) (R22) · EBITDA `''`-in-arrays ✅ FIXED 2026-07-19 (confirm gate: `invalidCells` highlight + the approved incomplete message, mirrors R2) — **R23 residual ✅ FIXED 2026-07-20:** the listed history array is now sized to the seeded year count (visible = sent; demo keeps all 5 sample slots), and the intake's Read button enforces its own "minimum two years" promise (was enabled at 1 file, which would have re-opened the sample fallback). Backend untouched (already accepts 2–5-length histories). Cases added to TEST-GAP (R23) · misc small ◐ TRIAGED 2026-07-20 (Mike-approved): ✅ fixed — out-of-range XML char ref now throws typed `CORRUPT_FILE` (was a raw RangeError; +1 attack-file test) and the report proxy forwards query strings (+2 tests, mocked http); ✅ RULED — the report screens KEEP native range/number inputs over `b-slider`/`b-numberinput` (print better on the PDF, no mid-UAT churn; not a second-library breach); ☐ still logged with reasons — `kShort` "0k" + `price()` "$-0.93" cosmetics; `money()` ×3 duplication + hardcoded `$`/en-US → folds into the P1 report-i18n sweep; company-name banner-row heuristic (evidence-gated — needs real exports); `requiredUnits: 0` on zero price + listed-growth sign-flip (older golden-pinned models — their cleanup item); index `:key` on spliced lists (component-test era) (R24).

- ✅ **DONE 2026-07-21 — Firm preferred-currency (report money now firm-configurable).** Closes the R24 "`money()` ×3 duplication + hardcoded `$`/en-US" note. A firm picks one currency on the Model Library landing page (managers only; everyone sees it read-only); every report formats money in it, grouping by the reader's language. **Backend:** `server/routes/currency.js` — `GET /api/report/currency` (firmAuth, degrades to default) + `POST` (firmAuth + requireManagerRole, allowlist-validated), persisted via `firmOverlay` (`config_key 'currency'`), dev-JSON fallback. **Frontend:** `utils/currencyFormat.js` (pure Intl, unit-tested) + `mixins/currencyMixin.js`; all 6 report components converted (private `money()` deleted). `server-middleware/report.js` now forwards GET. Single source: `data/currencies.json` (GBP/EUR/USD/NZD/AUD/CAD, NZD default). 1,349 tests green, lint clean, **security-reviewed clean 2026-07-21** (Mike-approved throughout). *Detail:* commits `d4af078` (L1) · `73ad63b`/`e837e18` (L2/L4).
  - ☐ **Follow-up (deferred, minor) — plain-number localisation.** The currency-*symbol* formatting is done; symbol-free plain numbers still group in en-US regardless of language: `round0`/`round1` day-counts + turn factors (Business Performance, Eight Levers, Debtor Drag), customer/market counts (Eight Levers `round0`), and EBITDA/DCF `kShort` chart ticks ("572k"). Route these through `currencyFormat.num(value, locale)` in a focused pass. Low priority — only visible when the UI language ≠ English. Kept out of the currency change deliberately to keep it clean.

- ✅ **P2 · BUILD — Report scaffolding workstream COMPLETE 2026-07-22, all four phases.** Phase 4 is [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md) — 8 steps, a checklist, and what is deliberately NOT shared. A new report is now assembly: no formatting, race handling, badge logic, header or failure behaviour to write. Plan approved 2026-07-21: [`design/REPORT-SCAFFOLDING-PLAN.md`](REPORT-SCAFFOLDING-PLAN.md). The six report screens re-implement the same blocks by hand (slider groups, hero figures, provenance badges, stale banner, debounced-recompute race guard, page chrome) — slow to build the next report, and why R9/R10/R11 reached only 2 of 6 reports. Extract to `mixins/reportRecompute.js` + `components/base/` (HeroFigure, SliderGroup, ProvenanceBadge, StaleBanner) + `components/shared/ReportShell.vue`, converting the 6 incrementally + behaviour-preserving. Satisfies the logged `components/base`+`shared` STRUCT item. Multi-session; `currencyMixin` (done) is the pattern.
  - ✅ **Phase 1 DONE 2026-07-21 — `reportRecompute` mixin, all 6 reports converted.** Owns debounce + monotonic request-stamp race guard + stale flag; reports supply `recomputeRequest()`/`applyResult()` (+ optional `onRecomputeError()`). **Closed the slider-race bug** in the 4 older reports. +6 mixin tests. Live-verified.
  - ✅ **Phase 2 DONE 2026-07-21 — `HeroStrip`/`HeroFigure` + `SliderField`, every converted screen browser-verified by Mike.** Reach is smaller than the plan's inventory implied: the six screens are not uniform, and extraction stopped wherever continuing would have been a redesign rather than a de-duplication (details in the two sub-items).
    - ✅ **`HeroStrip` + `HeroFigure` built, 5 of 6 screens converted, ALL browser-verified by Mike 2026-07-21.** `components/base/HeroStrip.vue` (gradient, 3/4-column layout, stale state) + `HeroFigure.vue` (label, value, sub-line, unit, colour tone). Presentation only — screens keep formatting via `currencyMixin` and pass finished text in, so no new user-facing wording and no locale changes. ~50 lines of duplicated CSS deleted. Commits `bc977a5` (Debtor Drag) + `521d6d6` (Working Capital, Margin & Break-even, Quick Position, EBITDA/DCF).
      - **Eight Levers deliberately EXCLUDED** — its headline is a different design (light stat cards, `.lev-headline`/`.lev-stat`), not the dark banner. Folding it in would be a redesign, not a behaviour-preserving extraction. Revisit only as an explicit design decision.
      - **Sizes standardised** (owner decision 2026-07-21) rather than parameterised — the five copies had drifted 24/25/26px purely from hand-typing. Deliberate visual change: big figure 24→26px (Margin & Break-even) and 25→26px (Quick Position, EBITDA/DCF).
      - Two screens pass a control into the `sub` slot — Working Capital's cashflow pill, EBITDA/DCF's editable exit multiple — still styled from their own page via `.herostrip` (HeroStrip's root, so the slot's ancestor). Both were the highest-risk cases and both verified good.
    - ✅ **`SliderField` DONE 2026-07-21 — 3 screens converted, all browser-verified by Mike.** `components/base/SliderField.vue` (label, value, filled track). No formatting in the component — the screens' `fmt` vocabularies genuinely conflict (Working Capital's `pct` is a fraction to multiply, Debtor Drag's/Eight Levers' is already a percentage), so each screen keeps its own `fmtField` and passes finished text in. Colours via `--sl-*` custom properties so each screen keeps its palette **and** its dark-mode overrides. Converted: Margin & Break-even, Working Capital, Debtor Drag. Deliberate size standardisation on Debtor Drag (thumb 15→16px, label 12→12.5px, value 12.5→13px). Two non-visual a11y additions: each slider now has an accessible name (labels were never associated with their inputs) and the focus ring reaches all three.
      - **Eight Levers EXCLUDED from this half too** — its slider is a different design (5px pill track, hard-stop gradient, filled thumb with a white ring), like its headline. **Quick Position EXCLUDED** — different track, provenance badge inside the label, R22 dynamic `moneyMax`. EBITDA/DCF has no sliders. So SliderField covers **3** screens, not the 4 first recorded.
    - ⚠ **Verification is manual and expensive.** Phase 2 needed Mike to eyeball 5 screens (banner) then 3 more (sliders); the suite stayed green throughout and could not have caught a visual regression. This was the strongest argument for the TEST-GAP component-test tooling — ✅ **now built and closed 2026-07-22** (it did not need the desktop; see the TEST-GAP item above). A conversion like Phase 2's would now be caught by `tests/unit/reportScreens.component.test.js` rather than only by Mike's eyes.
  - ✅ **Phase 3 DONE 2026-07-22 — `ProvenanceBadge` + `StaleBanner` + `ReportHeader`, all six screens browser-verified by Mike.** Named `ReportHeader`, not `ReportShell`: it owns the header band only; page layout and print framing stayed with each screen. Reach was larger than the plan estimated — the badge was hand-copied across **8 sites in 4 files** (not 2 reports), the banner across **3** screens (not 2). **⚠ OWNER RULING 2026-07-22 supersedes the Phase 2 scope correction:** every model in this section looks the same — one **solid `#002b64`** banner (no gradient) and one shared headline strip. Eight Levers' light stat cards and its gradient banner are gone; `HeroStrip`'s own gradient and a second one Working Capital carried on its headline tile are gone too. *The lesson: excluding a screen as 'a different visual language' was defensible per-screen and wrong in aggregate — it silently preserved drift the owner never chose.* **Also closed R9 on the three older reports** (Debtor Drag, Margin, Working Capital), which never greyed stale figures and warned only with a **vanishing toast** — on a failed recompute they sat showing figures that described the PREVIOUS inputs at full brightness, so an advisor could move a slider in front of a client, see no change and have no way to know why. All six now grey the headline and show the same persistent banner with Retry; their three toasts also hardcoded English. **Consistency is now enforced, not remembered:** [`tests/unit/reportHeadlineConsistency.component.test.js`](../tests/unit/reportHeadlineConsistency.component.test.js) mounts all six against real backend model output and fails the build if any screen hand-rolls its headline, leaves stale figures bright, or warns transiently. Suite → **1,550 green (107 suites)**, lint clean.
  - ☐ **Phase 4 — the "add a report" recipe (doc and/or `/add-report` skill).**

- ✅ **FIXED 2026-07-21 — P3 · DX — the dev server bound to the IPv6 loopback ONLY, so `http://127.0.0.1:3000` is unreachable while `http://localhost:3000` works (or doesn't, depending on the browser). Found 2026-07-21 — cost most of an afternoon.** [`nuxt.config.js`](../nuxt.config.js) sets `server.host: 'localhost'`; on the laptop `localhost` resolves to `::1` first, so Node binds IPv6-only. Proven: `http://[::1]:3000` → 200, `http://127.0.0.1:3000` → connection refused, same server, same moment. The trap is that a checker using `localhost` gets a 200 and concludes the server is healthy while the user's browser, going to the IPv4 address, sees nothing at all — which is exactly what happened. **Two separable things:** (a) **process rule, already binding:** whoever verifies a server is reachable must test the *exact address the user's browser uses*, not just `localhost`; and Claude does not start or restart Mike's dev server (recorded in the session memory). (b) **FIXED:** [`nuxt.config.js`](../nuxt.config.js) `server.host` is now `'127.0.0.1'`, with the reasoning in a comment so it cannot silently revert. The process rule is written into [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md) → *The running application — who owns it*: the human owns the dev server, an AI never starts or restarts it, never builds against a running one, and "reachable" means tested at the address the user's browser actually uses.

- ☐ **P2 · SALVAGE — PR #1 (`chore/i18n-jsdoc-cleanup`, opened 2026-06-30) CLOSED UNMERGED 2026-07-21, deliberately.** It sat **161 commits behind `master`** with 1 commit of its own: i18n extraction on `FirmDashboard`/`AdvisorProgression`/`MentorReview`/`MentorDistinctions` (+ `locales/en.json` keys) and JSDoc on 3 mixins + 2 server-middleware proxies (10 files, +596/−154, against a 637-test baseline; the suite is now 1,363). Every one of those files has moved since — the currency sweep, the R1–R24 report fixes and the SSE-proxy rework all landed on top. Resolving that much drift by hand is slower and riskier than redoing the extraction against current `master`, and a half-resolved i18n merge fails *silently*: it shows English to non-English advisors rather than erroring. **Nothing is lost** — the branch is NOT deleted, so the exact keys and JSDoc can be lifted from it whenever the work is redone. **The intent is still open** and should be folded into the P1 report-i18n sweep above rather than tracked twice. *This is the drift the Working Agreement exists to prevent, in miniature: nobody decided about it for three weeks, and the cost of deciding rose every day.*
- ✅ **P3 · UX — FIXED 2026-07-22 (Mike approved). Working Capital's orbiting "coin" now responds across its whole range.** Old rule `max(1.4, 6 / cycleFactor)` was floored at 1.4s, so 0d and 10d receivable (30× vs 6× a month) spun identically while every figure beside them changed; 90d gave a 17s lap that read as stationary. Replaced with a **log-scale map** of turns (0.33–30 a month) onto a lap time of **8s → 0.8s**: 0d 1.40s→0.80s, 10d 1.40s→3.37s, 90d 17.14s→7.91s. Log, not linear, because turns span two orders of magnitude and a linear map would spend almost the whole range in the slow end. Accepts the coin as a *feel* indicator rather than a proportional measure — it already was one, it just failed silently. +6 tests pinning the PROPERTY (faster cycle = visibly faster coin, monotonic, mid-range separated too, both ends bounded) rather than the numbers, so the curve can be retuned without rewriting them; mutation-verified. Suite 1,569 green. *Original entry:* (found + measured 2026-07-21; pre-existing, NOT caused by the scaffolding work).** [`BusinessPerformanceReport.vue`](../components/BusinessPerformanceReport.vue) `spinDur` = `max(1.4, 6 / cycleFactorMonthly)` seconds per lap. Measured against the live backend across `daysReceivable`: 0d → 30× turns → **1.4s (floored)**; 10d → 6× → **1.4s (floored)**; 20d → 2× → 3.0s; 35d → 1× → 6.0s; 50d → 0.67× → 9.0s; 90d → 0.35× → **17.0s**. So (a) every business turning faster than ~4×/month spins at an identical speed — dragging receivables from 13d to 0d changes every figure and the dot not at all, which is what Mike noticed; (b) at the slow end a 17-second lap reads as stationary, not slow. Compounded by browsers not restarting a running animation when its duration changes, so a 6→9s shift is hard to perceive at all. **Proposed fix (NOT approved — Mike to rule):** clamp both ends, ~0.8s fastest to ~8s slowest, tracking the real cycle factor in between; accepts that the dot is a *feel* indicator, not a proportional measure (it already isn't — it saturates silently today). **Alternative:** leave it and accept it as decoration, though a moving indicator that stops responding is arguably worse than none.

---

## CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app)

> Fresh full-app bug sweep (backend engines, routes, report models, utils, all
> frontend). Baseline at sweep time: **700 tests green, lint clean** — none of the below
> is caught by the current suite. **Verified by Claude directly** = ✔ (read the code +
> confirmed the mechanism); others are reviewer-evidenced with file:line, not yet
> independently re-proven. **No code changed** — all gated on Mike's per-item approval.
> Fixing top-down, one at a time. Overlaps with existing backlog items are cross-noted.

**🔴 P1 · SEC — CRITICAL (fix before any deploy)**
- ✅ **FIXED 2026-07-10 — `/api/course` mounted with NO `firmAuth`** — [`server/restify-server.js`](../server/restify-server.js) L131. Added `firmAuth` guard + attached `Authorization: Bearer` to all 6 course fetches in `CourseBuilder.vue` (mirrors the advisor route). 700 tests green, lint clean. Unauthenticated callers could previously drive GPT-4o on the firm's OpenAI key. ✔ *(still compounded until fixed: no body-size cap + spoofable rate-limit key — see below.)*
- ✅ **FIXED 2026-07-10 — Stored XSS in "Remove" confirm dialogs** — doc name / video title ([`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue)) and distinction description ([`components/MentorDistinctions.vue`](../components/MentorDistinctions.vue)). Buefy renders `dialog.message` via `v-html`. **Revised for Stack Constitution compliance:** the first pass used a custom `escapeHtml` util, which clashed with the mandated `isomorphic-dompurify` (Security rule). Now uses `DOMPurify.sanitize(msg, { USE_PROFILES: { html: true } })` — the same call the rest of the app uses — at both new dialog sites; the custom util + its test were removed and `moveNearMiss` restored to its original code. **Also fixed a runtime bug the first pass introduced:** the `escapeHtml` require had landed mid-`.filter().map().sort()` chain in `MentorDistinctions.vue`, which would have crashed that component (uncaught — no test loads it). 725 tests green, lint clean, `nuxt build` green. ✔

**🟠 P1/P2 · High**
- ✅ **FIXED 2026-07-10 — Backend URL hardcoded `http://localhost:4000`** in 7 frontend files ([`utils/cases.js`](../utils/cases.js), [`mixins/caseMixin.js`](../mixins/caseMixin.js), [`components/MentorReview.vue`](../components/MentorReview.vue), `MentorDistinctions.vue`, `AdvisorProgression.vue`, `FirmManagerHub.vue`, [`components/CourseBuilder.vue`](../components/CourseBuilder.vue)). Added a generic thin proxy [`server-middleware/apiProxy.js`](../server-middleware/apiProxy.js) registered for `/api/cases`, `/api/activity`, `/api/firm-manager`, `/api/mentor` in `nuxt.config.js`; switched all calls to relative `/api/...` paths (same-origin, no CORS change, backend never exposed). Lint clean, 707 tests green, `nuxt build` green. ⚠ Runtime round-trip PARTIALLY verified live 2026-07-16: `/api/activity` + `/api/courses` round-tripped through the Nuxt proxy in the Stage E click-through; one saved-case action + one Firm-Manager action still to click. ✔
- ⏸ **DEFERRED (intentional while in dev, Mike 2026-07-10) — Team Dashboard renders mock advisors** — [`components/FirmDashboard.vue`](../components/FirmDashboard.vue) L244. `loadData` returns mock "Sarah Chen / James Park" data + a placeholder AI insight; the real `/api/firm/advisors` endpoint exists. Wire to the live API before production (not a bug today — a known dev stub). ✔
- ✅ **FIXED 2026-07-10 — OpenAI calls have no effective timeout** — [`server/utils/openaiClient.js`](../server/utils/openaiClient.js) L131. `create(params, options)` now honours `options.timeout` and `postCompletions` sets a socket **inactivity** timeout (safe for streaming — active tokens reset it; only a genuine stall trips it), with a 60s default so all 10 advisorEngine calls are covered too, not just the 2 courseEngine calls that passed a value. +3 unit tests. 710 tests green, lint clean.
- ✅ **FIXED 2026-07-10 — SEC: cross-firm document download (IDOR) + broken auth on download** — [`server/routes/firmManager.js`](../server/routes/firmManager.js) L287. Added an authorisation gate before streaming: a `firm` document must belong to `req.firmId` (DB check), a `platform` document must be a real base file in the named category; otherwise 404. Also fixed the linked bug (frontend `<a>`-tab download couldn't send the Bearer token) by switching `downloadDoc` to an authenticated `fetch` → blob save, passing `source`+`category`. +6 route tests (cross-firm 404, platform membership, happy paths). 716 tests green, lint clean.
- ✅ **FIXED 2026-07-10 — SEC: `/api/course` body has no size limit** — [`server/courseEngine.js`](../server/courseEngine.js) L469. `parseBody` now caps at 256 KB (matches advisorEngine's `BODY_LIMIT`), rejects with 413 + destroys the socket. +3 unit tests. 722 tests green, lint clean.
- ✅ **FIXED 2026-07-10 — SEC: rate limiter keys on spoofable `X-Forwarded-For`** — [`server/utils/rateLimit.js`](../server/utils/rateLimit.js) L11. Now keys on the real socket peer and ignores `X-Forwarded-For` by default; a new `TRUST_PROXY=true` env flag re-enables header parsing for proxied deployments. +3 unit tests (incl. an explicit spoof-guard test). ⚠ **If ever deployed behind a reverse proxy, set `TRUST_PROXY=true`** or all users share one bucket. 722 tests green, lint clean.
- ✅ **ALREADY FIXED — verified in code 2026-07-22.** Shipped in PR #5 (2026-07-21); the sweep entry was never ticked off. `firmOverlay.js` now derives the prune count from the actual ROW COUNT, with a comment saying explicitly that it must not come from the version number. *(was: prune over-deletes)* — [`server/utils/firmOverlay.js`](../server/utils/firmOverlay.js) L86. Prune count derived from the version number, not the excess-row count; an actively-edited config loses all rollback history. (Related to the Firm-Manager-MySQL persistence item below.)
- ✅ **FIXED PROPERLY 2026-07-22 (Mike: "do it once, do it right") — recommended-template extraction.** Reading recommendations out of AI prose was wrong in BOTH directions and fed the advisor's capability record (Team Dashboard / Capability Progression, incl. the session's highest tier): bolded names — the AI's house style for a real recommendation — never matched, so genuine recommendations went unrecorded; while ordinary prose matched, e.g. *"your retail shop needs better forecasting and a pivot in leadership"* logged **five** tools nobody recommended, and since `Pivot` is advanced-tier the session was recorded as advanced-level work. **Proper fix, not a better regex:** `data/prompts/client.txt` §11 now instructs the AI to end Phase 3 with `[[TEMPLATES: Exact Title | Another]]`; `resolveRecommendedTemplates()` reads that declaration and **validates every name against the real catalogue** (an LLM naming a template is not evidence it exists); the engine holds back the tail of the SSE stream so the marker never reaches the advisor, not even a partial one mid-chunk. The prose scan survives only as a fallback for a response with no marker — with both defects fixed (emphasis counts; the 28 everyday-word titles need emphasis, multi-word titles do not) — so a model that ignores the instruction degrades gracefully rather than recording nothing. +22 tests incl. the stream hold-back across awkward chunk splits and a truncated marker. *(was: `**Template**` never matches; common English titles false-match prose)* — [`server/utils/tierLookup.js`](../server/utils/tierLookup.js) L96. `**Template**` never matches → `recommendedTemplates`/session metadata come out empty; also common English titles ("Help","Shop") false-match prose.
- ✅ **FIXED 2026-07-10 — Saved-courses picker never refreshes** — [`components/CourseBuilder.vue`](../components/CourseBuilder.vue). `savedCourses` was a `computed` reading `localStorage` (not reactive → cached forever). Now reactive `data` rebuilt by `_refreshSavedCourses()` on mount, on `advisorId` change, and after every `_saveCourse`/`_deleteCourse` (the only two writers). Options-API-compliant; SSR-safe (guarded, client-only). 729 tests green, lint clean, `nuxt build` green.
- ✅ **VERIFIED FIXED 2026-07-16 — Course-completion logging dead in prod** — original localhost hardcode fixed by the apiProxy work; live click-through 2026-07-16 proved two real completions reach the backend and attempt the MySQL INSERT (only the unprovisioned DB blocks the row landing). (= CB-19; both lines closed together.)
- ✅ **FIXED 2026-07-10 — Legacy-case migration self-disables on failure** — [`utils/cases.js`](../utils/cases.js) + [`mixins/caseMixin.js`](../mixins/caseMixin.js). The completion flag was set unconditionally, so a first-run failure (prod: migration ran before the real token resolved → 401) permanently abandoned every case. Now: the flag is set ONLY when all cases migrate; migrated ids are tracked so a retry resumes without duplicating; the mixin re-runs migration when the real token settles (idempotent + re-entrancy-guarded). +4 regression tests. 729 tests green, lint clean.

**🟡 P2/P3 · Medium (18)**
- ◐ **Report-model maths — verified against source Excel 2026-07-10; 1 proven formula flaw FIXED, others are faithful/not-flaws.**
  - ✅ **FIXED — WCC contribution margin (cell D20)** [`workingCapitalCycleModel.js`](../server/report/workingCapitalCycleModel.js) L96. The source `=(V29-Q15*V7)/V29` is dimensionally inconsistent (per-batch cost ÷ per-month revenue), overstating margin whenever cycle ≠ 30 days (e.g. 20-day cycle: 80% vs true 60%). Corrected to `V31/V29` (same-period; the sheet's own V31 already ×V25). Identical to source at the default (V25=1) so golden set unchanged; +2 regression tests. **⚠ The source `.xlsx` has the same flaw — owner should correct the master (or ask me to patch it).**
  - ✔ **NOT a flaw — debtor `fixedMonthly` `/12`** [`debtorDragModel.js`](../server/report/debtorDragModel.js) L143. Source cell `L13 =(Q4-L11-Q11)/12` — faithful and correct for a 12-month model. Non-12-month input is an INPUT-VALIDATION gap, not a formula error (see below).
  - ✔ **NOT a flaw — margin/break-even negative result** [`marginBreakevenModel.js`](../server/report/marginBreakevenModel.js) L55. Source `E27 =(E24+E25)/E26` is the standard break-even formula; a negative margin (cost > price) has no break-even, so the negative output is correct-but-out-of-domain — handle at the route/display, don't change the formula.
  - ✅ **FIXED 2026-07-10 — input robustness across all 3 report models.** Every numeric input is now coerced to a finite number (accepts JSON-string numbers like `"2"`, falls back to the sample default on junk), and the debtor collection/creditor profiles are normalised to exactly 5 finite numbers with sales entries coerced — so a string input can no longer string-concatenate (`V9`) and a short/garbage array can no longer produce `NaN` balances. Behaviour-preserving for valid input (all golden tests unchanged); +8 robustness tests. 732 tests green, lint clean.
- ✅ **FIXED 2026-07-17 — SEC — prompt injection (both halves closed).** Client-controlled `languageName` was interpolated unfenced into the system prompt at two sites ([`server/advisorEngine.js`](../server/advisorEngine.js), the sweep's L2137 had drifted). Fixed stronger than fencing: the engine now resolves the display name **server-side from the language code** against the canonical list — `data/languages.js` converted to `data/languages.json` (single-source shared by `mixins/localeMixin.js` and new `server/utils/languageName.js`); the body's free-text `languageName` is ignored; unknown code → English default. 6 new tests lock the resolver + list integrity + that the engine never reads the client field again (suite 1,109 green, lint clean, build green). Live non-English session eyeball still to do. *(The course `sessionContext` half was ✅ FIXED 2026-07-15, `e64f812` — CB-09/CB-14.)*
- ☐ **Non-atomic Stage-D delete** across stores — [`server/routes/mentor.js`](../server/routes/mentor.js) L181 — a mid-way failure leaves the master row live while firms lose their overrides.
- ☐ **Session-state read-modify-write race** on concurrent same-session requests — `advisorEngine.js` (last-write-wins loses answers). **Investigated + confirmed 2026-07-21 (parked by Mike — higher-risk core-path change, not a rushed fix):** `sessionStore` is an in-memory `Map` (L275); the handler reads the saved state (`sessionGet` L1197), builds a working *copy* (`Object.assign` L1199), then does many `await`s (AI calls + SSE streaming) before saving that copy back at **four** exit points (L1373 / L1665 / L1925 / L2619). Two overlapping requests on one session both read state v0, each adds its answer, and the later `sessionSave` overwrites the earlier → one answer silently lost. Trigger is low-frequency (double-submit / mid-flight retry / two tabs), which is why it's parked, not urgent. **Recommended fix:** a per-session async lock (serialise same-session processing so B reads state only after A saves) — must release on *every* exit/error path incl. mid-stream failure, and not deadlock or break SSE. **Do as a dedicated pass with overlapping-request tests** (concurrency won't surface in normal unit tests; no component-test tooling here). Same in-memory-store family as the `advisorEngine` note that it's single-process only (replace `Map` with Redis for multi-process).
- ✅ **FIXED 2026-07-15 — Global `unhandledRejection` swallow** hid every other crash — `courseEngine.js` L29. Removed (`56dc793`): both stated reasons were stale (Node locked at 14.15 where rejections warn, never crash; the OpenAI SDK it guarded was removed 2026-06-16). See Course Builder table CB-15.
- ✅ **ALREADY FIXED — verified in code 2026-07-22.** Shipped in PR #7 (2026-07-21); the sweep entry was never ticked off. `buildChunks()` accumulates a running total rather than measuring each value alone. *(was: chunk-splitting defeats its own URL-length guard)* defeats its own URL-length guard → translations silently fall back to English — [`server/routes/translate.js`](../server/routes/translate.js) L64.
- ◐ **CourseBuilder SSE never aborted** — *(course half ✅ FIXED 2026-07-15, `b8ef0ed` — AbortController on every context switch; see Course Builder table CB-18.)* **Remaining:** no error branch in `initClientSession` ([`components/VirtualAdvisor.vue`](../components/VirtualAdvisor.vue) L1156) → spinner sticks forever.
- ✅ **FIXED 2026-07-22 — Chat input rendered under the Team Dashboard.** `firm` renders a full-screen panel like `course` and `progression`, but the input's `v-if` excluded only those two, so the message box and send button sat underneath the Firm Dashboard — an input with nothing to talk to. **Cause was structural, not careless:** panel modes are declared in the template's `v-if` chain, while the input tested a SEPARATE chain of `mode !== '...'` further down; adding a mode to the first never obliged anyone to update the second. Replaced with one named `PANEL_MODES` list that both sides use. +4 tests that derive the rule — every mode rendering a panel must be declared, and the conversational modes must NOT be (over-listing would silently remove the advisor's ability to type). Mutation-verified.
- ✅ **FIXED 2026-07-21 — Report-component slider races** (stale numbers on rapid slider drags) — `BusinessPerformanceReport.vue` / `DebtorDragReport.vue` / `MarginBreakevenReport.vue` (+ EightLevers) had no request token. Closed by the `reportRecompute` mixin (scaffolding Phase 1): all 6 reports now share the monotonic request-stamp race guard; a superseded response is discarded. +6 mixin tests incl. the RACE case. Live-verified.
- ✅ **FIXED 2026-07-22 — Speech mixin teardown + permission-denial loop.** (1) Added `beforeDestroy`: handlers detached BEFORE `abort()` so the abort cannot itself trigger a restart, and all three recording flags cleared. Previously `onend` saw `isListening` still true on the DESTROYED instance and restarted the recogniser — the browser recording indicator stayed on and audio kept being captured after the advisor left the screen (a privacy issue, not a leak). (2) `onerror` now clears **every** recording flag on a fatal error, not just `isListening`: a profile/review field stayed set, so `onend` restarted, which errored again — an endless start→error loop on a single "Block" click. `no-speech` still restarts, since that just means the advisor paused. +8 tests with a fake engine mimicking the real callback ORDER (error → onend, abort → onend), which is what made the loop possible; mutation-verified — removing either fix fails 2 tests. *(was: mic stays live after destroy + infinite start→error loop on a permission denial)* — [`mixins/speechMixin.js`](../mixins/speechMixin.js) L37,L66.
- ✅ **NOT A DEFECT — corrected 2026-07-22.** The premise was wrong, and it is the same misunderstanding that made the report-i18n P1 look enormous: the seven locale files are NOT hand-filled. `mixins/localeMixin.js` posts the WHOLE English message set to `/api/translate/locale` at runtime and caches the result; the static files hold only the eight core sections that predate that service. All the named keys (`mode.*`, `profile.questions.*`, `opening.course`) are present in `en.json`, so they already translate. Nothing to do. *(was: 15 keys missing from all 7 non-English locales → mixed-language menu/profile)* (`mode.*`, several `profile.questions.*`, `opening.course`) → mixed-language menu/profile. *(Extends the existing P3 i18n item.)*
- ✅ **FIXED 2026-07-15 — `server-middleware/course.js`** was missing the client-disconnect cleanup that `advisor.js` added → abandoned SSE sockets wedged the dev server. Identical `res.on('close')` pattern copied (`1887fbc`). See Course Builder table CB-20.
- ✅ **FIXED 2026-07-22 — `retryLastMessage` duplicated the user turn.** `sendMessage()` always pushes the user turn; retry popped only the error reply, so the question was re-added on top of the one already there. Visible in the thread AND sent to the model as conversation history — the AI saw the advisor asking the same thing twice in a row, three times after a second retry, and read the repetition as meaningful. Now removes both, each guarded by what the message IS (role + content) rather than by counting back two, so an unexpected thread shape costs a retry instead of eating a real answer. +6 tests incl. that guard; mutation-verified (old code fails 3). **Also added `tests/setupJsdom.js`** — `isomorphic-dompurify` reaches for `TextEncoder`, which jsdom does not expose, so importing VirtualAdvisor in any test died before a single case ran. Wired via `setupFiles` so the next person testing the Markdown pipeline does not rediscover it.
- ✅ **FIXED 2026-07-22 — `profileQuestions` index drift.** The question list is COMPUTED from the answers: a role answer reading as "beginner" drops the experience question, and client-demographic appears only for some combinations. Progress was a numeric index into that list, so editing an earlier answer shifted every later question by one — skipping one entirely and mislabelling the rest, with nothing on screen to show it. Now re-anchored by FIELD in a `profileQuestions` watcher: whichever question the advisor was on stays the question they are on, wherever it moves; if it disappears, hold position and clamp rather than run off the list. Also clamped `openProfile`, which set the step to the ANSWERED COUNT — equal to the list length once every question is answered, i.e. one past the last index. +9 tests, two of which first prove the list genuinely changes shape; mutation-verified (a clamp-only fix fails 2).

**⚪ P3 · Low (~20)** — more unauthenticated quota-burning routes (`/api/translate/locale`, `/api/report/*`, [`server/restify-server.js`](../server/restify-server.js) L129,L132-134); check-then-write races (storage quota, config version numbers); ~~0%-score display bugs (dashboard "—", quiz score hidden)~~ (✅ CB-22, 2026-07-21); wrong Buefy props (`confirm-key-codes`, `empty-string`); audit-trail fields (`promotedBy`) trusted from the request body; formidable temp-file leak on parse error; `NODE_ENV`-gated dev fallbacks masking DB outages on staging; Drive query `\`-escaping gap; report-page docstring claims a session handoff that isn't checked. *(Full per-item detail held in this sweep's chat record; expand into lines here on request.)*

---

## COURSE BUILDER — consolidated outstanding actions (logged 2026-07-15)

> **One table = every OPEN item touching the course builder** — engine
> [`server/courseEngine.js`](../server/courseEngine.js), proxy
> [`server-middleware/course.js`](../server-middleware/course.js), screen
> [`components/CourseBuilder.vue`](../components/CourseBuilder.vue), the two course
> prompts, and `data/course-quizzes.json`. Compiled from the **2026-07-15 course-builder
> logic review** (source "Review 07-15" = new that day) plus every pre-existing open line
> elsewhere in this file (source "↑ mirror" — the original line stays the master entry;
> **close both together**). Status: ☐ open · 🔍 verify (cause believed already fixed —
> prove in the running app before closing). No code has been changed for any row below.

| ID | Pri | Type | Issue (plain English) | Where | Source |
| --- | --- | --- | --- | --- | --- |
| CB-01 | P2 | FIX | A failed outline **revision destroys the approved outline** — the engine discards `pendingOutline` before knowing the revised one parsed; advisor is left with no outline and the next message silently rebuilds from scratch. Keep the old outline as fallback. | `courseEngine.js` L234–238 | ✅ FIXED 2026-07-15 (`03f45e3`) |
| CB-02 | P2 | FIX/CONTENT | **No code check that outline `resources` are real template names** — the prompt says "never invent" but nothing enforces it; a hallucinated name is shown to the advisor ("Your resource for this session is X") and degrades session-time template matching. Cross-check against the template list on outline acceptance. | `courseEngine.js` outline validation + `templates.js` | ✅ FIXED 2026-07-15 (`cba5585` — new `server/utils/outlineResources.js`, strip-and-log) |
| CB-03 | P2 | FIX | **Grading failure silently awards a pass at 75%** — any network/AI error during quiz grading records `passed, 75, "Could not evaluate"`, which flows into progress, the certificate, and the team dashboard. Should record "ungraded" and be excluded from averages (fail loudly). | `CourseBuilder.vue` L1166–1170 | ✅ FIXED 2026-07-15 (`e713f28` — new `utils/quizScoring.js`, +11 tests) |
| CB-04 | P2 | FIX | **Quiz grader never sees what was taught** — quiz *generation* gets the session conversation; quiz *grading* gets only question + objective, so answers are graded against GPT-4o's general knowledge, not the Advisor-e material. Pass the same capped session summary into the grade call. | `courseEngine.js` L422–433 | ✅ FIXED 2026-07-15 (`6bb9e82` — grade call now carries the capped session summary) |
| CB-05 | P2 | SEC | **Course chat renderer does not block images** — the locked VirtualAdvisor pipeline disables images for security; CourseBuilder's separate MarkdownIt instance doesn't, and its sanitiser profile allows `<img>` → AI output could pull an outside image (tracking/exfiltration channel). One-line fix: `_md.disable(['image'])`. | `CourseBuilder.vue` L400 | ✅ FIXED 2026-07-15 (`a949c16`) |
| CB-06 | P2 | UX/FIX | **Rigid 3-question interview** — whatever the advisor types next is stored as the answer to the pending question (a "what do you mean?" becomes their stored preference); questions already answered in the opening message are re-asked; the built-in `skip` hook exists but is never used. Needs non-answer detection + skip-if-already-answered. | `courseEngine.js` L93–106, L249–258 | ✅ FIXED 2026-07-15 (`f0909f2` — clarification re-ask capped at one + opening-message pre-fill; new `server/utils/designInterview.js`; wording approved) |
| CB-07 | P2 | BUILD | **Firm-wide course sharing** — RULED (Mike 2026-07-16): personal-copy model. Shipped: `listSharedForFirm`/`getShared` + `GET /api/courses/shared` + `POST /api/courses/shared/:id/copy` (firm-bounded, outline-only — the author's progress/design conversation never leave owner scope; copy = fresh private course owned by the caller, `copied_from` audit column added to the schema); picker gains "Shared by your team" + "Use this course" (duplicate-copy confirm via `copiedFrom`), per-row two-way "Share with firm"/"Make private" (retraction never claws back copies — the no-cascade principle) and a confirm-gated "✕ Remove" (the picker previously had no delete); outline-card "Firm-wide" option enabled ("Coming soon" tag retired). | `courseStore` · `routes/courses` · `CourseBuilder.vue` · `db-schema.sql` | ✅ SHIPPED 2026-07-16 — 10 new tests (1,058 green), lint clean, `nuxt build` green; firm boundary live-proven with a foreign-firm JWT (empty list + 404 on copy); full flow live-verified by Mike incl. remove + duplicate guard. Runs on the dev-file fallback until MySQL provisioning |
| CB-08 | P3 | FIX | **Outline shape-check too shallow** — validates only title + session titles; focus, resources, objectives, minutes, session ids, `totalSessions`, `intensity` all unchecked → a half-formed outline renders with blank patches and a wrong session count. | `validateAIResponse.js` L97–128 | ✅ FIXED 2026-07-15 (`773de46` — reject missing title/focus, normalise ids/counts/intensity/minutes; 100% coverage held) |
| CB-09 | P3 | SEC | **Interview answers enter the outline prompt unfenced** — `fenceUntrusted` is used on the revision + quiz-answer paths but the four collected answers are concatenated raw. Extends CB-14. | `courseEngine.js` L261–266 | ✅ FIXED 2026-07-15 (`e64f812` — fenced, incl. quiz prompts + advisorProfile) |
| CB-10 | P3 | FIX | **Design-phase AI failure shows an empty speech bubble** — on a failed OpenAI call the design handler streams a bare `done` (no message); the session handler correctly sends "timed out, try again". Align them. | `courseEngine.js` L189–194 | ✅ FIXED 2026-07-15 (`55780ff` — also killed empty bubbles on outline-only replies) |
| CB-11 | P3 | STRUCT | **Dead design-pipeline logic** — `multiGoalDetected` computed/stored but never used; `goalsSecondary` read but never written; the frontend sends `conversationHistory` which the backend ignores. Trace-before-removing applies. | `courseEngine.js` L85–90, L137; `CourseBuilder.vue` L702 | ✅ FIXED 2026-07-15 (`f0909f2` — all trace-verified dead before removal; unused `q.skip` hook also cleared, superseded by pre-fill) |
| CB-12 | P3 | FIX | **Hand-written quiz overrides keyed on exact session title** — but the AI writes the titles, so overrides almost never fire outside canned starter courses. Key on something stable (e.g. resource/template id). | `courseEngine.js` L361–366; `data/course-quizzes.json` | ✅ FIXED 2026-07-15 (`92559e7` — overrides key on template names; file had no live entries) |
| CB-13 | P3 | TEST | **Course engine handlers have no tests** — only `parseBody` is covered; the interview state machine, outline handling, and both quiz handlers sit at 0% vs the ≥90% route target. Rides the jest coverage-gate item. | `tests/unit/` (gap) | ✅ FIXED 2026-07-15 (`5153419` + down payments across Phases 1–4 — 76 course tests across 9 files, engine at 92% lines, locked ≥90 in `jest.config.js`) |
| CB-14 | P2/P3 | SEC | **`sessionContext` interpolated unfenced into the system prompt** (client-controlled). | `courseEngine.js` L286 | ✅ FIXED 2026-07-15 (`e64f812`) — course half of the sweep line; the advisorEngine `languageName` half stays open there |
| CB-15 | P3 | FIX | **Global `unhandledRejection` swallow** hides every other crash in the process. | `courseEngine.js` L29 | ✅ FIXED 2026-07-15 (`56dc793` — removed; both stated reasons stale) |
| CB-16 | P2 | BUILD | **Course progress persistence** — the `progress` handler is a labelled stub (`CourseReminderService.markComplete`); wire to MySQL + firm-level reporting. | `courseEngine.js` / `CourseReminderService.js` | ◐ BUILT 2026-07-15 (Stages A–D; identity hardened `5fb077e`; the reporting half pre-existed via `/api/activity/log-course`). ✅ Stage E live click-through PASSED 2026-07-16 (two real quiz completions logged end-to-end). Remaining: master-team MySQL provisioning only |
| CB-17 | P2 | BUILD | **Courses themselves live only in localStorage** — clearing the browser loses every course, and the completion certificate is fabricated client-side with no server record. Same migration family as CB-16 and Profile→DB. | `CourseBuilder.vue` `va_courses` store | ◐ BUILT 2026-07-15 (`9591c47` schema+store · `8d369cb` routes · `1c5a585` screen switch-over + hardened per-advisor migration, legacy never deleted). Runs on the dev-file fallback. ✅ Stage E live click-through PASSED 2026-07-16 (save → refresh → picker persists; a June-16 legacy localStorage course migrated intact with id + design history; Start-fresh mid-stream clean). Remaining: MySQL provisioning only |
| CB-18 | P3 | FIX | **Course SSE streams never aborted** — a stale stream can land in a fresh conversation. | `CourseBuilder.vue` fetch readers | ✅ FIXED 2026-07-15 (`b8ef0ed` — AbortController on every context switch) — course half of the sweep line; the VirtualAdvisor `initClientSession` half stays open there |
| CB-19 | P2 | VERIFY | **Course-completion logging dead in prod** — original cause (hardcoded localhost) was fixed by the apiProxy work (`6040abf`); current code calls relative `/api/activity/log-course`. Click through one completion against a running backend, then close both lines. | `CourseBuilder.vue` `_logActivity` | ✅ VERIFIED 2026-07-16 — live click-through (Mike): TWO quiz completions round-tripped `/api/activity/log-course` through the Nuxt proxy (200) and the backend attempted the real MySQL INSERT (blocked only by the unprovisioned DB — master-team item). Sweep mirror closed with it |
| CB-20 | P3 | FIX | **Proxy missing client-disconnect cleanup** that `advisor.js` has → abandoned SSE sockets wedge the dev server. | `server-middleware/course.js` | ✅ FIXED 2026-07-15 (`1887fbc` — advisor.js pattern copied) |
| CB-21 | P3 | I18N | **`opening.course` missing from all 7 non-English locales** (part of the 15-key i18n item). | `locales/*` | ☐ ↑ mirror — sweep 2026-07-10 |
| CB-22 | P3 | FIX | **A 0% quiz score displays as hidden/"—"** (falsy-zero display bug). | dashboard / quiz score display | ✅ FIXED 2026-07-21 (`feat/course-builder-v3`) — two surfaces. **Live path:** [`CourseBuilder.vue`](../components/CourseBuilder.vue) completion screen L448 — the session-score `v-if` tested `quizScore` (truthy), hiding a real 0; now `!== null` (matches L309/averageScore). **Dashboard** [`FirmDashboard.vue`](../components/FirmDashboard.vue) (still on mock data — deferred): the "no graded data" sentinel was the number `0` (indistinguishable from a real 0%), so a genuine 0 was dropped from both averages and shown as "—". Sentinel changed to `null` (`allRows` avgScore L171, `summaryStats` avgQuizScore L227); the two display guards (L33/L98) and both average filters now null-check; `scoreClass` gives a real 0% the red "low" colour; mock-insight text guarded against "null%". Strict `eqeqeq` throughout. Suite 1,276 green, lint 0 errors. ⚠ No component tests for either `.vue` (repo-wide gap) — code-verified; a live 0%-score eyeball is optional/awkward to stage |
| CB-23 | P3 | STRUCT | **`CourseBuilder.vue` monolith** — over the >200-line decompose rule; no base/shared split. | `CourseBuilder.vue` | ◐ IN PROGRESS 2026-07-21 (`feat/course-builder-v3`) — presentational-extraction approach (parent keeps ALL logic/state; each screen/repeated block → child component, props in / events out, no logic moves). **Step 1 DONE:** voice bar (3 copies→1) → `components/base/VoiceInputBar.vue` (`f47d89d`). **Step 2 DONE:** chat bubble + streaming (4 sites→1) → `components/course/CourseMessage.vue` (`dfb35fb`). Parent down ~106 lines; `renderMarkdown`/DOMPurify security stayed in the parent (CB-05). First parent→child composition in this codebase. Remaining: library, outline card, quiz, overview, completion screens. ⚠ Both steps automated-green (lint / 1402 tests / nuxt build) but **NOT yet live-eyeballed by Mike** — do that before stacking step 3. |
| CB-24 | P3 | DOC | **`server-middleware/course.js` has no JSDoc** — scheduled into the gated cleanup pass. | `server-middleware/course.js` | ☐ ↑ mirror — code-gov audit / CLEANUP-PASS-PLAN |
| CB-25 | P2 | BUILD | **Course resources are clickable links to the real Advisor-e page** — RULED (Mike): master-app page target; URL pattern confirmed from a live address (`{dashboardBase}#{link}?type={section lowercased}`, seam in `config/integration.js` → `TEMPLATE_PAGE`). Built: link-building at outline grounding (`templatePageUrl` + per-session `resourceLinks`, server-owned); https-only re-validation at the storage door (a tampered/shared course can never carry a hostile address); clickable tags on the outline card AND the session header (always visible — the AI-opened path never carried the chat-message link); all links open in a NEW tab (sanitiser `ADD_ATTR: ['target']` — the html profile strips target, proven live; Course Builder's own renderer, locked VirtualAdvisor pipeline untouched). | `integration.js` · `outlineResources.js` · `validateAIResponse.js` · `CourseBuilder.vue` | ✅ SHIPPED 2026-07-16 — 10 new tests (suite 1,079), lint clean, build green; live-verified by Mike (correct page, new tab, chat preserved). ⚠ residual: the word-slug link form (e.g. `#spare-2`) not yet clicked — one paste-test outstanding |
| CB-26 | P2 | FIX | **Outline silently ignores the requested session count** — live case: SIX asked, FOUR delivered, no acknowledgment. Fixed three ways: (1) tested parser `requestedSessionCount` (digits + number words; ranges/conflicts → null = check stands down); (2) code-owned per-generation mismatch flag → amber notice on the outline card ("You asked for N sessions — this outline has M…", wording approved) — the AI is never trusted to confess; stale/hostile round-tripped flags stripped; (3) prompt rule 4 strengthened incl. de-anchoring the example outline's "4" (likely root cause) + deviation-must-be-stated. Revisions check the revision instruction only (an accepted deviation is never re-flagged). | `designInterview.js` · `courseEngine.js` · `course-design.txt` · `CourseBuilder.vue` | ✅ FIXED 2026-07-16 — 11 new tests incl. the live phrasing (suite 1,069), lint clean, build green; live end-to-end re-run of the original request delivered 6-of-6 |
| CB-27 | P2 | UX/FIX | **Silent blank resource slots — SOLVED 2026-07-16.** Final diagnosis (proven with the real filter + list): the search DID surface `E.O.Y Meeting` at rank 3 of 40 — the AI ignored its list and invented anyway (the prompt forbade inventing in 3 places; same disobedience pattern as CB-26 → code-owned fix). Shipped, 3 parts: (1) **rescue-snap** at grounding — an invented name whose words fully contain the complete word-set of EXACTLY ONE real title (dot-blind) snaps to that real title, link included, logged Original → Snapped; ambiguity/one-word titles never snap (never-invent holds absolutely); (2) **honest blanks** — "No library resource matched this session — it runs from the session focus instead." on the outline card + session header (wording approved); (3) **abbreviation blind spot** — 3-letter search words (EOY/FBT/KPI/tax) no longer dropped; dotted titles match plain forms both ways; Discover Lab before/after IDENTICAL headline (21/23, 5/5; one case improved rank 5→4). Genuine content gaps (capital-raising) remain a Mike/master-app call. | `templates.js` · `outlineResources.js` · `courseEngine.js` · `CourseBuilder.vue` | ✅ SHIPPED 2026-07-16 — 10 new tests (suite 1,089), lint clean, build green, Discover Lab regression-free; acid test: the twice-failed EOY course went 0-of-6 → 3-of-6 real linked resources + honest labels, snap fired live ('5-Stage EOY Meeting Process' → 'E.O.Y Meeting'); live-verified by Mike |
| CB-28 | P2 | FIX | **Entry hides the saved-course library** — `_loadOrStartCourse` showed the picker ONLY when a paused course existed; with active courses it silently auto-resumed the FIRST one (any second course invisible except via "← My Courses"). Fix: whenever ANY saved course exists, entry lands on the picker. | `CourseBuilder.vue` `_loadOrStartCourse` | ✅ FIXED 2026-07-16 — 1,048 tests green, lint clean, `nuxt build` green, live-verified by Mike (both courses listed on entry) |
| CB-29 | P2 | FIX/CONTENT | **Quiz questions don't test the facts taught** — the generation prompt instructed "Test conceptual understanding, not memorisation", forbidding key-fact questions. Replaced (wording approved by Mike) with: Q1+Q2 test the specific facts/frameworks actually taught, Q3 applies them to the advisor's practice, and a guard against testing general knowledge the session didn't cover. | `courseEngine.js` `handleQuizGenerate` prompt | ✅ FIXED 2026-07-16 — lint clean, 55 quiz tests green, live-proven (generated quiz opened with "Name and describe the four stages of the psychology of the sale") |
| CB-30 | P2 | BUILD/DECISION | **Predefined quiz banks as AI source material** — content model RULED (Mike 2026-07-17, corrected same day): banks key on the **exact template title** (NOT per-domain — "questions relate to specific templates; domain-keyed content will get lost"). Mike authors Question/Answer/Key-Point sets per template as a text PDF named exactly after the template title (first delivered: `Course Builder Quiz/Working Capital Cycle quiz.pdf` — 10 entries, title verified against `templates.json`). **Tailors-to-session ruling:** the AI treats the Q&As as source material adapted to what the session taught — never verbatim; Mike's model answers also feed the grader (extends CB-04). Transcription must be exact (his IP), verified and signed off by Mike before wiring; incoming PDF names verified against the library on ingestion. Banks live in the CB-12 template-keyed `course-quizzes.json`. | `courseEngine.js` quiz path + `data/course-quizzes.json` | ✅ SHIPPED 2026-07-18 (54cdd17 first bank signed off · da4e807 engine wiring · 690f857 second bank) — priority: override > bank > AI tailoring. Generation feeds the bank as mandatory source material (3 most relevant entries, tailored, bankRef-tagged; model answers kept OUT of the generate prompt); grading receives Mike's model answer + key point as the authoritative marking guide (bankRef only selects a server-held entry — tamper-safe). Locking test enforces the exact-title ruling: bank keys must match `templates.json` titles, transcriptions must be whole. 29 new tests, suite 1,140 green, lint clean. Two banks LIVE: `Working Capital Cycle` + `E.O.Y Meeting` (PDF renamed from "End of Year" — not a library title; deliberately not "EOY Quiz", the client-facing questionnaire). ⚠ residual: a live quiz run on a bank template still to be eyeballed |
| CB-31 | P2 | BUILD/EDIT-TARGET | **Firm Quiz Builder** (elevated from "firm-manager quiz-bank editing", Mike 2026-07-21) — a Firm Manager page where a firm owns its quiz material: seed from the 3 provided quizzes (EOY, General Section, Lite Fundamentals), edit via the firmOverlay layered-override pattern (platform base untouched, version history/restore free, IDOR-safe — Advisory Distinctions machinery; skill `firm-manager-edit-target`), and add firm topics **bound to a real template in the firm's search content** (never free-standing — Mike's ruling: firm templates start as Advisor-e blanks, are recorded in search content, cascade global→group→firm). Plan: [`FIRM-QUIZ-BUILDER-PLAN.md`](FIRM-QUIZ-BUILDER-PLAN.md) (`cf2972e`) — 4 phases + 4 open decisions (§7). Uses the CB-34 resolver. Rides the Firm-Manager-MySQL persistence item. **Phase 0 DONE 2026-07-21** — both outstanding quiz PDFs transcribed and machine-verified field-by-field against the PDF text (not eyeballed): **Lite Fundamentals Quiz** → 6 banks × 10 (Planning Session, Data Session, Lite Marketing, Sales Session, People Session, Process Session); **Growth Fundamentals Framework** → Growth Framework ×20 (Mike ruled BOTH "The 9 Growth Stages" Q1–10 and "Growth Fundamentals Framework Philosophy" Q31–40 belong to that one page, so they merge) + Lite Fundamentals ×10. 90 entries live across 14 banks; every key passes the exact-title locking test. Only deviations from the PDFs, both Mike-approved: the mangled symbol in the Quick-Position and R.O.A formulas is "÷", and one `--` rendered as an em dash. **Phase 2 DONE 2026-07-21 — the firm quiz store.** New [`server/utils/firmQuizzes.js`](../server/utils/firmQuizzes.js) (`CONFIG_KEY 'quiz-banks'`, `validateQuizOverride`, `mergeQuizBanks`) + `getQuizzes`/`saveQuizzes` in `firmManager.js` behind `fmGuard`, dev-JSON fallback (`data/dev-firm-quizzes.json`, gitignored). No new schema — rides `firm_framework_versions`, so the generic history/restore routes work with `configKey='quiz-banks'`. **Mike's ruling 2026-07-21: a firm MAY edit the platform's own questions** — stored as an overlay, base untouched, always restorable. Safety: the overlay is rebuilt field-by-field from validated values (unknown fields dropped, prototype keys refused, sizes capped); every key must resolve through the CB-34 resolver, so a quiz can never silently attach to a non-existent page; a bank is replaced **wholesale**, never entry-by-entry. **SEC — prompt-injection door closed before it opened:** merged banks carry `origin`, and `courseEngine` now fences `origin==='firm'` text at BOTH AI touch-points (quiz generation + the grader's marking guide) — firm-typed text is untrusted however trusted the manager; platform banks stay unfenced so tuned CB-29/CB-30 behaviour is unchanged. +27 tests (20 unit + 7 wiring tripwires pinning the guard, the fencing and "never writes the base"). 1,453 green, lint clean. **Phase 3 (the screen) is next** — mockup approved: [`design/mockups/firm-quiz-builder-mockup.html`](mockups/firm-quiz-builder-mockup.html). | Firm Manager hub + `firmOverlay` + `resolveTemplateName` + `firmQuizzes` | ◐ PLAN APPROVED 2026-07-21; Phases 0 + 2 done; Phase 3 next; §7 decisions 1 & 3 ruled |
| CB-37 | P3 | DOC | **Quiz-bank provenance line points at a renamed file.** The `E.O.Y Meeting` bank in [`data/course-quizzes.json`](../data/course-quizzes.json) still records `source: "Course Builder Quiz/E.O.Y Meeting.pdf"`, the filename from before the 2026-07-21 folder sync (`fe861fa`) renamed it to `E.O.Y Meeting Quiz.pdf`. Harmless to the app — `source` is provenance only, never matched on — but it is an audit trail pointing at a file that no longer exists. Fix is a one-line edit; logged rather than bundled into an approved change. Check the other 13 banks' `source` lines at the same time. | `data/course-quizzes.json` | ☐ found 2026-07-21 |
| CB-36 | P2 | DECISION | **One quiz section has no page yet — "Revealing the Growth Curve Freehand" (Q21–30 of the Growth Fundamentals Framework quiz, 10 questions).** The heading matches no title in the master export, so the resolver refused rather than guess. The ten questions are **deliberately NOT transcribed** — they cannot reach the engine until Mike names their page. Closest candidates: **Growth Curve Checklist** (same Growth Framework sub-section) or **Growth Framework** itself. Mike 2026-07-21: "I'll make sure things align later" — parked by decision, not overlooked. Transcribing afterwards is ~10 minutes; the extraction and the verifier are already proven. | `data/course-quizzes.json` · `Course Builder Quiz/Growth Fundamentals Framework.pdf` | ☐ Mike 2026-07-21 — needs a page name |
| CB-33 | P2 | FIX | **Course design commands the AI to use non-template names as resources** — root of CB-27's "inventions": the dropped names ("5-Stage EOY Meeting Process", "EOY Template Suite — Selection Guide"…) are REAL concepts from `eoy-domain-support.json`, and `formatDomainSummaryForDesign` injects them with the instruction "use these as session resources, in sequence" — the AI obeys, grounding (correctly) strips them, sessions go blank. Fixed as ruled: the design injection now labels support-file tools "Teaching frameworks … these are NOT resource names" and directs `resources` to the template list only (the template-page mapping alternative was unnecessary — CB-27's rescue-snap already covers it at grounding). | `domainSupport.js` `formatDomainSummaryForDesign` · `courseEngine.js` | ✅ FIXED 2026-07-17 — wording approved by Mike; 3 new tests lock the guard (suite 1,103 green), lint clean. Prompt-text fix: live EOY design re-run still to be eyeballed (rescue-snap + honest blanks remain the net) |
| CB-32 | P2 | FEATURE | **Session re-ordering + free navigation** (Mike's request, 2026-07-16). Design ruled same day (merge of all three options): fully open navigation + completion still requires every quiz + a confirm ONLY when a jump/move skips complexity (= progressive-intensity courses; consistent-depth courses shuffle silently). Built: "Open →" on every overview row (the "upcoming" lock is gone); ▲▼ arrows re-order — the session's progress record travels with it (positional pairing preserved, quiz scores can never attach to the wrong session), ids renumber, the active session is tracked to its new position, and every move persists immediately (`_saveCourse` now includes the outline). Both confirm wordings approved by Mike. | `CourseBuilder.vue` overview + `_saveCourse` | ✅ SHIPPED 2026-07-16 — lint clean, suite 1,079 green, build green; live-verified by Mike (open-any, both confirms, score travels, order survives refresh). No component-test coverage (repo-wide gap, logged) — verified by click-through |
| CB-34 | P2 | DECISION/BUILD | **Quiz-bank lookup by sub-section, traced by page ID** (Mike's idea, 2026-07-21). Organise quiz docs by `subSection` and route: a suggested page → its app ID (`page`/`link` in the master export) → `subSection` → the sub-section's quiz doc → a per-template sub-tab. The `section/subSection/topic/title` taxonomy **already exists on every export entry**, so the ID→subSection trace is free. **Revises CB-30's exact-title keying** (shipped 2026-07-18) toward the stable ID as the key — more robust, since template titles are AI-written at session time and drift (the CB-12 lesson), whereas IDs are untouchable. **pt 1 BUILT + committed (`dc37d3c`):** `server/utils/resolveTemplateName.js` — maps a typed heading → the matching template, tolerant of case/punctuation/spacing + one clean extra/missing word, and REFUSES (ranked suggestions) on ambiguity/mismatch (never guesses). 39 tests, 100% coverage; all 18 General-Section-Quiz headings resolve incl. the 2 near-misses. **KEY FINDING that reshaped the design:** there is **no stable UNIQUE id** in the export — `page`/`link` is deliberately shared across templates (a page hosts multiple templates when a topic needs more than one; Mike confirmed 2026-07-21, NOT a bug), and `title` has 5 duplicates + is editable. So "bind to a permanent id" is impossible as-is; the resolver keys on the resolved template instead, and a truly rename-proof binding needs a real unique id from the master app (upstream). The old "route by page ID" framing above is therefore superseded — the resolver now underpins **CB-31** (Firm Quiz Builder). **pt 2 WIRED 2026-07-21 (Mike-approved):** `findQuizBank` ([`server/utils/quizOverrides.js`](../server/utils/quizOverrides.js)) now puts both the bank key and the session's resources through the resolver and matches on the canonical template title, so a near-miss key (extra word / punctuation / case) still binds — and a key that resolves to nothing is logged loudly by name with its closest titles (`[quizBanks] ORPHAN BANK`, once per key per process) instead of silently returning null and handing the session to AI-invented questions. **Why this mattered:** the repo's own banks are held to the exact title by the `quizBankKeys` locking test, but a bank authored by a firm manager (CB-31) is saved at runtime with no such gate. Deliberate limits: exact matching runs first (no working lookup shifts); the AI-written session TITLE is excluded from the tolerant pass (it would invite a confident bind to the wrong template — resources are the reliable key per CB-02); matching is on the canonical title, NOT the `page` id, because `page` is shared across templates (see the KEY FINDING above). An unreadable template library degrades to exact-only, never crashes. +8 tests; 1,410 green, lint clean. | `server/utils/resolveTemplateName.js` · `server/utils/quizOverrides.js` · master export | ◐ pt 1 (`dc37d3c`) + pt 2 built; feeds CB-31; unique-id gap is an upstream ask |
| CB-35 | P2 | BUILD/DECISION | **Time-aware courses — per-template review time + video length, fit to advisor's target** (Mike's idea, 2026-07-21). Show estimated review time and video length per template; when a course suggests several, sum them and select a set matching the advisor's chosen total time. **Blocked on data — no duration fields exist in the export today** (checked 2026-07-21: the `cpd` object holds zero-valued completion counters `watchedVideo`/`reviewTemplate`, not lengths); new per-template review-minutes + video-length fields must be authored/calculated **upstream** and exported first. Open decisions (Mike): (a) the source of the "review time" estimate; (b) the fit rule — target time is a *budget*, never silently drop a needed template (CB-26 principle: surface a shortfall honestly rather than quietly miss the number); (c) precedence when this conflicts with the CB-26 session-count knob. | `courseEngine.js` · outline/resource display in `CourseBuilder.vue` · master export | ☐ Mike 2026-07-21 — idea logged, blocked on upstream data + rulings |

---

## OPEN — actionable now (build / decide this session)

- <a id="status-table-deferred-glyph"></a>☐ **P3 · FIX — a real backlog item is invisible in `STATUS.md` because the parser
  does not recognise its `⏸` status glyph.** Found 2026-08-01 while re-pointing the status guard;
  logged rather than folded into that change.
  - **The instance.** The `⏸ DEFERRED (intentional while in dev, Mike 2026-07-10) — Team Dashboard
    renders mock advisors` entry is a top-level item with a genuine status, but `parseItem`
    ([`scripts/generate-status-table.js`](../scripts/generate-status-table.js)) reads no `⏸`, so the
    row is absent from the generated table. It is one of the 3 `topLevelUnparsed` lines; the other
    two are summary pointers that are correctly not tasks.
  - **Why it matters more than one row.** `⏸` is exactly the status a reader most needs to see —
    deliberately paused work is the kind that gets forgotten. A table that silently omits it reads
    as "not a thing", which is the no-silent-parking rule failing at the display layer.
  - **Fix:** teach `parseItem` the `⏸` marker (mapping to a "Deferred" label alongside the existing
    in-progress / open / blocked set), and add a case to
    [`tests/unit/statusTable.test.js`](../tests/unit/statusTable.test.js) pinning it. Cheap, but it
    changes what the generated table claims, so it takes its own approval.

- <a id="status-md-silent-staleness"></a>☐ **P3 · DECISION — `STATUS.md` goes stale silently, and nothing says so on
  the page.** Found 2026-08-01: regenerating it moved **57 → 62 outstanding** and **108 → 113
  completed**, and its links were pointing roughly **260 lines** off (an item linked at `#L1156` had
  moved to `#L1418`). Today's edits account for about two of those ten items — the rest of the drift
  predates this session.
  - **The mechanism.** It only updates when a person runs `npm run status`. Nothing in the commit
    hooks or CI regenerates it, and the file carries no "generated on" stamp, so a stale copy is
    indistinguishable from a current one. **A wrong line link is worse than no link** — it silently
    lands the reader on an unrelated item.
  - **Same failure class as the routing defects of 2026-07-30/31:** a surface that renders
    confidently, is believed, and is wrong. That is why it is logged rather than left as housekeeping.
  - **Three options, needing Mike's call rather than a default:** (a) regenerate in the pre-commit
    hook whenever `ACTIONS.md` is staged — always true, at the cost of touching a second file in
    every backlog commit; (b) a test that fails when `STATUS.md` does not match a fresh generation —
    same guarantee, but it blocks the commit instead of fixing it; (c) stamp the file with the
    `ACTIONS.md` commit it was generated from, so a reader can see it is stale without preventing it.
    Recommendation: (a), because the only thing worse than a stale view is one that needs a human to
    remember it exists.

- <a id="fabricated-detail-in-summaries"></a>☐ **P1 · CONTENT/VERIFY — a FABRICATED detail was found living in the domain-support
  data, presented as the firm's own material. One confirmed instance; the blast radius is unknown.**
  **Deferred by Mike on 2026-07-31 — logged deliberately, NOT to be picked up next**, so the
  three-document transcription is finished first. Not started.
  - **The confirmed instance.** The `A.I.D.C.R.A Advertisement Framework` row in
    [`sales-marketing-domain-support.json`](../data/sales-marketing-domain-support.json) expanded
    the acronym as *"Attention, Interest, Desire, **Conviction, Response**, Action"*. Mike's ruling,
    2026-07-31: **that was AI-generated when the summary was drafted — none of his templates use it.**
    The correct expansion, in both new source PDFs, is *Credibility, Risk Removal*. Mike corrected
    the row himself the same day.
  - **Why this one mattered more than a typo.** It was specific, plausible and authoritative — a
    six-part expansion of the firm's own acronym — and it reached the AI on **every** sales-marketing
    conversation. It was found only because a new source document happened to contradict it.
  - **Why the blast radius is unknown.** The domain-support summaries across all 29 domains were
    drafted the same way. Swept `data/` for this specific wording on 2026-07-31: **no other
    occurrence** (the two `conviction` hits in `cautious-reveal-reference.json` and
    `trial-fit-reference.json` are the ordinary English word, verified in context, not the acronym).
    That clears THIS fabrication and says nothing about any other.
  - **Why no existing test catches it.** Every domain-support test checks structure, reach, fencing
    and counts — that a row renders, saves and gets to the prompt. **Nothing compares a summary
    against its source PDF**, so an invented specific passes every gate we have. Same class as the
    content-routing problem: it looks right, reads authoritatively, and is wrong.
  - **Do NOT bulk-regenerate the summaries** — that would replace one set of unverified AI text with
    another. The check has to be against the source documents.
  - **Open question for whoever picks it up:** whether a sample of high-risk rows is enough (rows
    naming an acronym, a numbered model, or a named framework — the shape that carries inventable
    specifics), or whether all 29 domains need reading against their PDFs. Sample first, and report
    the hit rate before deciding — the hit rate is the evidence for how far to go.

- ☐ **P2 · VERIFY — the advisor-chat recommendation change has NOT been exercised live.** Merged 2026-07-22 (PR #21, `d791a9a`): the AI now declares its recommendations in a trailing `[[TEMPLATES: …]]` marker, which the engine holds back from the SSE stream so it never reaches the advisor. Covered by 22 tests — parsing, catalogue validation, the stream hold-back across awkward chunk splits, a truncated marker — but **no real conversation has been run against it**, because this machine has no `OPENAI_API_KEY` and every advisor request fails at startup. What tests cannot answer: whether the answer still streams smoothly and nothing odd appears at the end. **Do one real Virtual Advisor conversation wherever a key exists before this reaches UAT**, and check (a) the reply streams normally, (b) no `[[TEMPLATES` text is ever visible, (c) the session's recommended templates look right on the Team Dashboard. *Source: session 2026-07-22.*

- ✅ **P2 · UX — DONE 2026-07-22. Sample figures now say so.** Wording approved by Mike: **"These are sample numbers, not your client's"** (`report.sampleFigures`), shown via new [`components/base/SampleNotice.vue`](../components/base/SampleNotice.vue). Both exposure points covered: (1) **demo/manual mode** on Quick Position and EBITDA — no seed, so every figure is the sample company's; (2) **the projection dials on SEEDED runs too** — growth %, discount % and exit multiple start on the sample's settings even when the P&L above came from the client's files, and the notice clears the moment any dial is touched (it is about the DEFAULTS, not about the dials being editable). A group-level notice, not a per-cell tag: the grid is 24 rows × 5 years and tagging every cell is noise the eye stops seeing — which is how the original problem went unnoticed. +6 tests, including the negative cases (gone once seeded, gone once a dial is set) because a warning that never disappears is one advisors learn to ignore. Suite 1,563 green. *Original entry:* Found live by Mike during the R13–R24 smoke session: on the EBITDA screen's demo/manual path he changed sales to $145,000 and got a −$5,409,687 gross profit — arithmetically correct, because the OTHER cells (cost of sales $5,554,687 etc.) still silently held the sample company's figures. Two exposure points: (1) **demo/manual mode** — every cell starts as a sample figure with no on-screen marker saying so; (2) **the projection dials on seeded runs too** — the five growth %, five discount % and exit-multiple cells default to the sample's settings with nothing labelling them as assumptions to adjust (the P&L rows have R11 provenance badges; the dials have nothing). Direction: a visible "sample figure — adjust for your client" treatment (per-cell tag or a banner over the group) on demo-mode cells and the projection dials, wording to be approved by Mike before coding; QP demo mode gets the same review. Complements R8/R11 (backend declares defaults; intake badges facts) — this is the last leg: the SCREEN saying which numbers are still assumptions. *Source: live smoke pass 2026-07-20.*

- <a id="report-i18n-drift"></a>✅ **P1 · STACK DEVIATION CLOSED 2026-07-22 — the three report components' text is now in `locales/en.json`** (`report.debtorDrag` 56 strings, `report.marginBreakeven` 42, `report.workingCapital` 66). Wording unchanged throughout (owner: "as they are"); verified on the running app — all three pages render character-identical English and leak zero keys. **⚠ The scope below was WRONG and is corrected here:** translation is not done by hand-filling seven locale files. [`mixins/localeMixin.js`](../mixins/localeMixin.js) sends the **whole English message set** to `/api/translate/locale` at runtime and caches it; the static `fr/es/de/...` files only hold the eight core sections that predate that service. So anything that reaches `en.json` is already available in all 8 languages — the only real gap was strings that never got there. Pattern follows `EightLeversReport` (the one already-compliant screen): definitions carry a `k` key and the template resolves `$t('...field.' + fld.k)`, so labels stay reactive to a locale change instead of being frozen at `data()` time. **✅ RULED 2026-07-22 (Mike): LEAVE IT — the pill keeps the words "Cashflow Positive" / "Cashflow Negative".** The proposed change (backend returns a CODE, screen supplies the words) was offered and declined; today's mapping already makes the pill translate, so there is no user-facing gap. Recorded so it is not re-proposed. *Residual, accepted:* the Working Capital cash-flow pill shows text the **backend** returns (`'Cashflow Positive'`/`'Cashflow Negative'`, [`workingCapitalCycleModel.js`](../server/report/workingCapitalCycleModel.js) cell J3). Mapped to keys in a `cashflowText` computed so it translates today, with an unrecognised value falling through unchanged. The proper fix is for the model to return a **code** and the screen to name it — a backend contract change, so logged rather than done. *Original entry follows for the record:* **the three components hardcoded English; none of their user-facing text went through `$t()`.** Logged 2026-07-13 per the Stack Constitution's binding deviation-logging rule ("any deviation … is logged in `design/ACTIONS.md` as a P1 the moment it is found"). The Constitution requires **all** user-facing strings to route through `vue-i18n` and live in `locales/` — no hardcoded English in templates or logic. But [`BusinessPerformanceReport.vue`](../components/BusinessPerformanceReport.vue), [`DebtorDragReport.vue`](../components/DebtorDragReport.vue) and [`MarginBreakevenReport.vue`](../components/MarginBreakevenReport.vue) hardcode every label in their Pug templates — headings, eyebrows, field labels, instruction copy, status text. The app ships **8 locales** (`en, fr, es, de, pt, it, nl, pl`), so a non-English advisor sees the entire report in English. **Predates this session** — it is how the report feature was originally built; found while adding the Model Library (which *does* comply). **Not a bug in behaviour**, so nothing is broken for an English user; it is a compliance + reach gap. **Fix:** extract the three components' strings into `locales/en.json` under a `report.*` namespace and replace with `$t()` calls, then translate. **Scope warning:** this is a large mechanical sweep across three big components and should be quoted as its own task, not bolted onto a bug fix. **Related decision already taken (2026-07-13):** the 19 model *names and summaries* in [`utils/reportModelCatalogue.js`](../utils/reportModelCatalogue.js) are deliberately English-only data for now (owner's call) — they are catalogue content, not interface chrome, and will move server-side under T22. That decision does **not** cover the hardcoded template copy above, which is straightforwardly non-compliant.

- <a id="deployed-versions-backfill"></a>✅ **P2 · DOC — Backfill the unknown commits in the deployed-versions ledger. RESOLVED 2026-07-21.** The Version-Pull Recording Rule shipped 2026-07-20 (`design/DEPLOYED-VERSIONS.md` + README notice + CLAUDE.md rule): every pull into UAT/production/the master app must record its commit hash in the ledger. The ledger opened with two honest gaps. The master team replied to Mike 2026-07-21 and both are now closed: **UAT runs `709bac5`** — the merge of PR #2 (`feat/client-knowledge-base`), the only pull request in the repo's 527-commit history, so the identification is unambiguous. **The production gap does not exist:** Mike confirmed 2026-07-21 that *nothing has been deployed to production yet* — the app is UAT-only, and the earlier "2026-07-13 production go-live" note was simply wrong. Ledger row written and the incorrect production claim withdrawn in both `DEPLOYED-VERSIONS.md` and `CLAUDE.md`. **Material finding:** UAT was **97 commits behind `origin/master`** at confirmation — it predates the entire Business Performance Report programme and all of Course Builder v2 (CB-01…CB-33), which is why course-builder design issues could not be tested in UAT. *Source:* sessions 2026-07-20, 2026-07-21.

- <a id="release-tagging-workflow"></a>☐ **P2 · PROCESS — Adopt release tags as the integration hand-off to the master team.** Successor to the resolved ledger task above, and the structural fix for the 97-commit drift it uncovered. **Root cause:** the repo has 527 commits and exactly **one** pull request — every other branch was merged locally, so there has never been a moment that says *"this version is ready, take it."* The master team pulled `master` once and it has moved ever since with no signal attached. **Agreed direction (Mike, 2026-07-21):** (1) `master` means *releasable* — work in progress never lands there; (2) each integration is cut as a **version tag** (`v0.6.0`, `v0.6.1`, …) and the team pulls the **tag**, never the moving branch — the tag is immutable, and the team already thinks in version/PR numbers, which is how they replied; (3) both machines reach `master` via **pull requests**, never machine-to-machine merges, and branches are short-lived; (4) the ledger stays maintained **on our side** — the master team has no write access to this repo, so a rule depending on them writing rows would fail silently. **Remaining:** land both branches into `master`, cut the first tag, and send the team the version number. Tag-naming scheme (`v0.6.0` vs `uat-<date>`) still to be confirmed by Mike. *Source:* session 2026-07-21.

- <a id="dormant-trees"></a>◐ **P2 · DECISION+BUILD — 28 dormant trees → harvest JUDGMENT into signals.** Direction LOCKED 2026-06-23 (memory `design-logic-trees-guide-not-replace`): trees GUIDE the engine, don't replace it. **Done:** the soft-hint mechanism (whole tie-breaker bucket, one wiring), valuation wired, `governance_too_early` signal (Option A), name-rot disproven (93/93 real) — all in archive. **Remaining:**
  - The **needs-signal bucket** — `client_sales`, `systems`, `succession`, `quickfire` — where a name boost isn't enough and the judgment must become a real authored signal (the governance pattern). Work one at a time, Mike confirming the correct answer per domain. NB triage domain→tree mapping is inferred (trees carry no domain field) — confirm per tree before building.
  - **Governance Option B (deliberate later step):** also hold BACK formal governance tools when the business is unready (Option A only surfaces the foundational tools).
  - ☐ **CONTENT GAP — Productive Habits needs a content summary.** The readiness gate names two foundational tools; People vs. Process is wired, but **Productive Habits** (page `farmers-model`) has **no entry in `content-summaries.json`** — needs Mike's team to author its summary (+ a `reviewed_signal_map` of `governance_too_early`) before it can join the gate. Engine must not fabricate it. *Source:* harness 2026-06-23.
  - **AUDIT 2026-06-24 (started on `client_sales`; swept all 4).** Per memory `feedback-distinctions-before-signals`: each tree's judgment was checked against the THREE engine layers — Advisory Distinctions (67 firm-editable rows), the per-domain support-coaching JSON, and the search JSON. **Result: most tree judgment is ALREADY covered**, so "harvest into a NEW signal" was the wrong default — genuine gaps are mostly distinction tweaks (Mike's IP, no-code), not new signals. Detail: `client_sales` covered (only `Profit Levers & Blue Ocean` homeless); `systems` + `succession` judgments are carried by their domain-support JSON (philosophy selection, scale-readiness, emergency/sudden-departure, the Salary Sacrifice table all present) — so the earlier per-tree "gaps" are **RETRACTED**. One genuine gap survives → Quickfire-crisis item below.
  - *Method:* `tests/unit/treeContributionHarness.test.js` (current-engine vs tree-assisted). *Source:* registry Part 2; memory `design-logic-trees-guide-not-replace`, `feedback-distinctions-before-signals`.

- <a id="quickfire-crisis"></a>✅ **P2 · RESOLVED 2026-06-25 — crisis recognition now robust + live-validated (see ACTIONS-ARCHIVE).** Beyond STEP 1/2 below: the profit crisis keywords were broadened to catch natural phrasing ("shut down", "face liquidation", "go bust", "insolvent", "won't survive"…), the AI domain-detection backstop now routes a failing business to profit even on novel wording, and the AI classifier was given real domain boundaries (crisis=profit, NOT risk management — it had mis-routed a live café crisis to Risk). The display-drop fix ensures the top-scored crisis tool can't be dropped. Live café-crisis sessions now surface Cafe + Quick & Worst + Receivership with the sober tone. **Only remainder = production MySQL persistence** so a REAL firm (not the dev file) can author the crisis distinction → the Firm-Manager-config-persistence item. Original recognition history:
- <a id="quickfire-crisis-hist"></a>◐ **(history) Engine could not recognise a business in CRISIS (the quickfire SURVIVAL branch).** Found + validated by the 2026-06-24 dormant-tree audit (above), across all three engine layers. When an advisor describes a client who may FAIL — going under, imminent failure, receivership/liquidation — the engine had no path to its crisis tools: **no domain** in `domains.json` covered survival/crisis (quickfire has no domain home); **no domain-support JSON** for crisis; **no Advisory Distinction**. Yet the crisis templates are real and client-facing in the search JSON — `Quick Position`, `Worst Case Scenario`, `Receivership vs Liquidation`. So a top-stakes business-failure conversation was handled like an ordinary performance chat.
  - ✅ **STEP 1 DONE (2026-06-24) — recognition.** Mike's decision: crisis sits under **Profitability** (technically correct; a fuller crisis topic — also covering owner disputes / injury / death — is a future, unresourced topic). Mike's 7 crisis identifier phrases added to the `profit` domain `keywords` in `domains.json`: *going under, shutting down, facing business closure, business failure, facing liquidation, going into receivership, voluntary administration*. Verified: all 7 route to `profit`, none match any other domain, ordinary profit talk unaffected. NB this is the **keyword topic-gate** (Stage 1), which is deliberately literal — see the AI-topic-detection item below.
  - ✅ **STEP 2 VALIDATED (2026-06-24) — Mike's IP, no-code, proven end-to-end.** Mike authored the crisis Advisory Distinction in Firm Manager (dev firm `dev-firm-001`, row id 4: triggers = the crisis phrases; templates = `Quick & Worst`, `Receivership vs Liquidation`, `@rf-industry`; boost 20). A live café-crisis session surfaced **`Receivership vs Liquidation` #1 and `Quick & Worst` #2** — the crisis tools now top the recommendations. **Two engine fixes were required to get here this session:** (a) the **distinction-matcher bug** (`5879252`) — it read only the first advisor message, so the crisis answer never reached the matcher; (b) realising the **boost must clear the industry-boosted field** (a café's `Cafe` model gets its own +8) — boost ≥ 10 surfaces the crisis tools reliably (Mike set 20). **NB this validation used the DEV-FILE distinction (test-only).** Production still needs: a real firm authoring it + MySQL persistence (covered by the Firm-Manager-config-persistence item). One follow-on surfaced: the café revenue model scored highest yet was dropped from the *display* → see [§Display drops top template](#display-drop). *Source:* live crisis test 2026-06-24.

- <a id="tree-fidelity"></a>✅ **P2 · DATA — Tree→template provenance sweep RESOLVED 2026-06-24.** Found by the 2026-06-23 fidelity sweep. Full results: [`design/TREE-PDF-FIDELITY-SWEEP-2026-06-23.md`](TREE-PDF-FIDELITY-SWEEP-2026-06-23.md). **Rule applied (Mike 2026-06-24):** a template ref survives if it's in the search JSON **or** named in the source PDFs (PDF-verified); fails both → delete. Results:
  - ✅ **`get_positioning`** — 4 fabricated template names (Business Assessment Report, Revenue Model What-if, Agenda & Notes, Management Reporting Annual Plan) failed both tests → **deleted**. `Dashboard Discussions` (real, in search JSON) kept.
  - ✅ **`get_marketing` / `get_team_problem` / `get_sales_tracker`** — all refs PDF-verified advisor-dev kit (legitimately absent from the client search JSON) → **kept as-is**. One prefix-masked real template, `Get. 5 Layers Questionnaire`, **normalised** → `5 Layers Questionnaire` (matches search JSON).
  - ✅ **`valuation`** — `Valuation support.pdf` (the sweep had only read `Valuation Logic.pdf`) is the real source; MBO/BIMBO/Newco ratified upstream by Mike (Indicative Value Questions template). Branch + soft-hint (`327f592`) rest on valid data. *Source:* full PDF re-read + Mike 2026-06-24.

- ✅ **P3 · SEC/TEST — Ghost-reference validator scope LOCKED to node trees (2026-06-24).** `validateLogicTreeReferences` in [`server/utils/logicTrees.js`](../server/utils/logicTrees.js) scans `nodes[].templates`. Extending it to `flat_if_then` `branches[].templates` was tried and **rejected**: those branches reference Get-the-Job advisor-kit / framework materials that legitimately sit outside the client search JSON (provenance rule — a ref is valid if in the search JSON **or** named in the source PDFs, and the PDFs are not machine-readable here), so scanning them false-positived **11 legitimate refs** and would hard-fail CI under `VA_STRICT_CONTENT`. Decision (Mike, Option A): validate node / client-delivery trees only; branches are deliberately out of scope, guarded by a code comment **and** a decision-guard test. Shipped: helper refactor + return value + export + 6 unit tests (100% on the validator). *Source:* tree-provenance sweep 2026-06-24.

- ◐ **P2 · BUILD/DECISION — Get-the-Job Stage 2: `due_diligence`.** LIKELY ALREADY DONE (source-grounded 2026-06-23). Full assessment: [`design/STAGE-2-DUE-DILIGENCE-HARVEST-DRAFT.md`](STAGE-2-DUE-DILIGENCE-HARVEST-DRAFT.md). Every DD "THEN" is advisor **methodology** (run QoE, mandate legal review, structure an Earn-out…), **NOT a template recommendation** — so DD is a **coaching/methodology** domain and its full judgment already injects via `due-diligence-domain-support.json`. The earlier "checks→signals→templates harvest" premise is **RETRACTED** (unsourced). **✅ RULED 2026-07-16 (Mike): ADD the risk→tool mapping.** Next step = a working session where Mike authors which DD risk → which library template (Customer Reliance, Key Interviews… — his IP, the app never invents it), then a small wiring build to surface those tools alongside the coaching. *Source:* full DD source read 2026-06-23; ruling 2026-07-16.

- ◐ **P2 · BUILD — Course persistence (courses + progress) — BUILT 2026-07-15, Stages A–D (Course Builder table CB-16/CB-17).** `va_courses` schema + `courseStore` (`9591c47`), owner-scoped `/api/courses` CRUD (`8d369cb`), progress identity from the verified JWT (`5fb077e`), screen switch-over + hardened per-advisor localStorage migration — legacy copy never deleted (`1c5a585`). The reporting half already existed (`/api/activity/log-course` → `advisor_course_completions`). Runs on the dev-file fallback until the master team provisions MySQL (same family as the Firm-Manager-MySQL item). **✅ Stage E live click-through PASSED 2026-07-16** (Mike drove it: save → refresh → picker persists; June-16 legacy course migrated intact; two quiz completions fired the activity log end-to-end; Start-fresh mid-stream clean; server-side CRUD/auth/isolation/duplicate-refusal all verified by Claude the same day). **Remaining: MySQL provisioning only.** `CourseReminderService` hooks remain platform-team stubs. Three new observations from the live test logged as CB-25/26/27. *Source:* registry Part 1A → Course; build 2026-07-15.

- ✅ **P1 · FIX — Learn topic-router never re-routed on a mid-conversation pivot. FIXED + LIVE-PROVEN 2026-07-16.** Root cause (two layers): the AI picker's input was ALL user messages joined OLDEST-first then sliced to 1,000 chars — a long thread's newest messages (the pivot) were truncated out entirely. Fix: `newestFirstUserText` (current message always first inside the cap), picker prompt told newest-first outweighs older context, keyword fallback tries a recent-2 window before full text. 4 tests incl. the live defect shape (suite 1,100). **Live re-test proof:** on the same sales→EOY pivot the prompt jumped 19.8k→24.5k (EOY pack loading) and the answers carried the real EOY structure (Growth Curve, Volatility, temperaments, Start/Stop/Keep). *Learn-logic audit + live threads 2026-07-16.*

- ✅ **P2 · FIX — Verbatim-content honesty at the data boundary (Learn + all chat modes). SHIPPED 2026-07-18 (`4f14c28`, wording approved by Mike).** Live-evidenced TWICE (both 2026-07-16 threads, incl. after the routing fix): asked for "the exact script", the AI attributed invented dialogue to a real document; the fabrication watch caught every instance. Shipped as the proposed pair: (1) the GLOBAL never-invent guardrail now also requires the AI to say plainly when it does not hold the exact text, and never to present a paraphrase or reconstruction as a quotation; (2) enforcement (the un-parked Tier-2 item, below) appends Mike's approved correction note to the same reply when the watch fires. ⚠ Residuals: no advisor-SSE integration harness exists (the three engine wire-ins are the 100%-covered helper + inspection — a live sighting of the note is pending); the note is English-only in non-English sessions (same as other server-generated notices). *Learn-logic audit 2026-07-16; build 2026-07-18.*

- ☐ **P2 · CONTENT (Mike/master-team) — the EOY scripts text is not in the app's data, and "EOY Scripts Only" is not a page in the current master export.** The firm's EOY reference names the document + purpose ("specific dialogue prompts…") but the app has never been given its text — it cannot quote it, and (not being in the search JSON) cannot even deep-link it. Options: add the script text to the EOY reference data (Mike's IP), and/or expose EOY Scripts Only as a real page in the next master export so CB-25 links reach it. *Learn-logic audit 2026-07-16.*

- ☐ **P2 · FIX — Learn mode is profile-blind: it asks questions the advisor profile already answers.** Live-caught by Mike 2026-07-16 (Learn thread): asked "how would you describe your current skill or confidence level?" — then apologised when told to read the profile, proving it HAD the profile all along. TWO confirmed causes (audit 2026-07-16): (a) the injected profile instruction block is written for CLIENT mode ("Do not ask the Phase 2 questions — skip from Phase 1 to Phase 3"), meaningless to the Learn prompt; (b) `learn.txt`'s "Conversation approach" EXPLICITLY instructs asking "current skill or confidence level / any training before?" with no profile carve-out — the prompt orders the very question the profile answers. Fix direction: a learn-specific profile instruction + a carve-out on the Where-they're-starting-from questions (ask only what the profile doesn't cover). *Found during the Learn-enrichment live test; audit-confirmed same day.*

- ✅ **FIXED 2026-07-22 — `/api/clients` proxy wiring. The logged diagnosis was HALF RIGHT and the real fault was worse.** The proxy entry was indeed missing, but the feature was not broken by it: `utils/clients.js` bypassed the proxy entirely by hardcoding an absolute backend address. So the client register worked on a developer laptop and **only** there — in UAT or production the browser is not on the same host as Restify, and every call would have failed. Breaches CLAUDE.md → Architecture boundary ("the frontend's only legitimate env variable is `API_BASE_URL`" — the frontend should not know where the backend lives). Fixed both ends: `/api/clients` added to the `apiProxy` list in `nuxt.config.js`, and `utils/clients.js` now calls `/api/clients` like every other feature, deleting the absolute URL. +6 wiring tripwires (no hardcoded host in the browser bundle, proxy entry present and pointing at the shared thin proxy, backend routes exist and all three stay behind `firmAuth`) — tripwires rather than behaviour tests because the WIRING is the thing at risk, and a mocked-fetch unit test would pass either way. *(was: routes exist on Restify but `/api/clients` never registered on the Nuxt proxy)* The client-register routes (client knowledge base, merged 2026-07-14) exist on the Restify backend, but `/api/clients` was never registered on the Nuxt thin proxy — frontend calls to it have no route to the backend through the Nuxt server. The feature is inert until the master team's migration, so nothing is broken *today*, but the wiring is incomplete. Fix: one `serverMiddleware` line in `nuxt.config.js` (the `/api/courses` entry added 2026-07-15 is the template). *Found 2026-07-15 while registering `/api/courses`.*

- ☐ **P2 · BUILD (pre-production) — Firm Manager config persistence → MySQL.** The Firm Manager config **writes** (template-library import, Advisory Staircase override, Advisory Distinctions — incl. the cascade state: declines, overrides, and the Stage-E `distinction-override-baselines` + `distinction-last-seen` markers) fall back to **gitignored local JSON files** when MySQL is unavailable. **These dev-file fallbacks are TEST-ONLY** (gated behind `IS_DEV`, no version history) and must be replaced before production: a live MySQL instance + the `firm_framework_versions` table via `firmOverlay` (schema in `config/db-schema.sql`). **Why logged:** the fallback makes local testing pass, so without this line the missing real persistence could be silently mistaken for "done." *Source:* HANDOFF; added 2026-06-09.

- ☐ **P2 · BUILD — Distinctions cascade, Stage 3 — hierarchy hook-up** to the master app (mentor→firms→advisors). **✅ RULED 2026-07-16 (Mike): the Mentor role ALREADY EXISTS in Advisor-e — the mentor is Mike.** Stage 3 = point `AUTH.mentorRole` (interim `platform_admin`) at the real upstream role; confirm the exact role/claim name in the login token with Mike / the master team at build time. Stages 0–5 are done (archive). Persistence rides the Firm-Manager-MySQL item above. *Source:* memory `design-distinctions-cascade`; ruling 2026-07-16.

- ✅ **P2 · DONE — Distinctions cascade, mentor authoring surface (the UI origin of the cast). MERGED to `master` 2026-06-30 (merge commit `db97c7b`); feature branch deleted. → move to ACTIONS-ARCHIVE next sweep.** Agreed with Mike 2026-06-27; full plan in [`design/DISTINCTIONS-CASCADE-PLAN.md`](DISTINCTIONS-CASCADE-PLAN.md) §6. Give the mentor the **same no-code Advisory Distinctions screen the firm has** ([`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue) Tab 5) on the Mentor page ([`pages/mentor.vue`](../pages/mentor.vue)), so the mentor authors the platform (`pd-N`) set via UI instead of hand-editing `data/advisory-distinctions.json`. **Row model = plain CRUD** (Add/Edit/Move/Remove/boost — no decline/override/reset; there is no layer above the mentor). Cascade itself is unchanged — only *where `platformRows` come from* changes. Storage reuses `firmOverlay` under a reserved global scope (`firm_id='__platform__'`; version history/restore for free); rides the Firm-Manager-MySQL persistence item above. **Status — A–E built, verified, and MERGED to `master` 2026-06-30 (commit `db97c7b`); feature branch deleted:**
  - ✅ **A** single-source loader (`server/utils/platformDistinctions.js`); repointed all 5 platform reads; byte-identical with no stored rows. Commit `eba9589`.
  - ✅ **B** `/api/mentor/distinctions` CRUD (`firmAuth + requireMentorRole`, global scope, never `req.firmId`); dev-file fallback; prod save errors re-thrown. Commit `9e496eb`.
  - ✅ **C** mentor UI (`components/MentorDistinctions.vue` + tabbed `pages/mentor.vue`); self-contained (firm screen untouched); nuxt build green. Commit `c3b8e02`.
  - ✅ **D — delete semantics ("keep theirs"). BUILT 2026-06-29.** On a mentor delete, `firmManager.promoteOverridesForDeletedRow` (called from `mentor.deleteMentorDistinction` BEFORE the row is removed — fail-safe) promotes each customising firm's version to a standalone firm-own row (master domain + the firm's edits), then drops that firm's override + drift baseline. Declined-only firms need no action; untouched firms lose the default; idempotent for a firm that already moved the row. Cross-firm enumeration is **production-real** (`firmOverlay.listFirmIdsWithConfigKey` = `SELECT DISTINCT firm_id … WHERE config_key='distinction-overrides'`) with the dev-overrides map as the dev fallback — not throwaway. Tests: `tests/unit/firmManagerStageD.routes.test.js`. Persistence still rides the Firm-Manager-MySQL item (dev-file fallback today).
  - ✅ **E — mentor-update review (adopt/keep-mine). BUILT 2026-06-29** (branch `feat/mentor-distinctions-authoring`). When the mentor edits a row a firm OVERRODE, the firm screen shows a **"Mentor updated this distinction"** badge + **"Review update"** → **compare panel** (mentor's current vs the firm's) → **Adopt** (= reset-to-platform: drops override + clears baseline) or **Keep mine** (`POST …/distinctions/platform/:id/keep-mine`: re-stamps baseline, clears till next edit). Drift = per-override **content-signature** baseline (`distinction-override-baselines` store; ignores audit fields so an identical re-save is not drift; pre-existing overrides lazily backfilled — no false positives). Whole-row only (field-level cherry-pick deferred, per plan). Backend `server/routes/firmManager.js`; UI `components/FirmManagerHub.vue`; tests `tests/unit/firmManagerStageE.routes.test.js` (8) + `firmManagerDistinctionReview.routes.test.js` (6). Also shipped the **non-overridden complement**: a per-firm `distinction-last-seen` marker → "N mentor updates since your last visit" banner + "Updated by mentor" badge + "Mark all as reviewed" (auto-applied rows; nothing to accept). **Latent bug fixed:** the firm screen had been reading platform CONTENT from the static `advisory-distinctions.json` import (mentor edits never showed) — now reads the live `platform` from `getDistinctionState`. Wording confirmed by Mike 2026-06-29. *Source:* plan §6 Stage E; live-verified via curl (firm overrides pd-10/62/64 → mentor edits pd-10 → driftIds=['pd-10']).
  - ⚠ Risk (live now): a mentor edit is cross-firm + on-by-default — blast radius across all firms; banner warns of this. *Source:* design session 2026-06-27; memory `design-distinctions-cascade`.

- ✅ **P3 · TEST — dev-fallback tests no longer depend on local `data/dev-*.json` files. FIXED 2026-06-29.** `platformDistinctions.test.js` uses a surgical `fs` mock (seed-fallback assertions never read a developer's local `dev-platform-distinctions.json`); `caseStore.js` dev path is now `CASE_DEV_FILE`-overridable and `caseStore.devfallback.test.js` points at an isolated per-PID temp file (no shared real file, immune to a concurrent live backend). A clean `npm test` is now deterministic regardless of local dev state. *Source:* Stage D/E session 2026-06-29.
- ☐ **P3 · TEST — `jest.config.js` `collectCoverageFrom` excludes the decision engine + routes** (`advisorEngine.js`, `courseEngine.js`, `server/routes/**`, `mixins/**`), so the Constitution's ≥90% route / ≥80% mixin targets are **not enforced**. The audit's highest-leverage / lowest-risk item — but removing the exclusions may surface coverage below threshold and fail CI, so it needs a measured pass (raise coverage, or stage thresholds), not a blind flip. *Source:* handover audit #3, 2026-06-21. **Measured 2026-07-14** (client-knowledge-base branch): new `routes/clients.js` at **100% stmts/funcs/lines** (route standard met where built); the pre-existing frontend fetch wrappers (`utils/cases.js` 15%, `utils/clients.js` network half) drag the utils numbers — untestable without fetch mocks, predates the branch. **Measured 2026-07-15** (course-builder Phase 5): a full `jest --coverage` run FAILS the config's own thresholds today — global lines **51.3% vs the configured 80** (`signals.js` ~1%, `templateRegistry.js` 12%, `videoInjector.js` 10%, `tierLookup.js` 33%, `summaries.js` 59%) and `sanitiseInput.js` branches 83.82 vs 85 — confirming thresholds are unenforced (pre-commit runs plain `npm test`, no coverage). Partial progress: `server/courseEngine.js` is now IN `collectCoverageFrom` at **92% lines with a per-file `lines: 90` lock** (`5153419`) — one of the two named engine exclusions closed; `advisorEngine.js`, `server/routes/**`, `mixins/**` remain excluded.

- ☐ **P3 · TEST — No component-test infrastructure and no Playwright, anywhere in the repo.** The Constitution names `@vue/test-utils` v1 (mixins/components ≥80%) and **Playwright for critical journeys**; neither has ever been set up — `tests/` is unit-only. Consequence (honest, measured 2026-07-14): all Vue-layer glue is untested repo-wide (today's client-knowledge-base work followed house practice — logic extracted into tested pure functions, thin Vue handlers untested like every other component). The new intake journey (client step → session → save → catch-up card) is exactly the critical path Playwright exists for. Needs: (a) decide + set up the harness(es), (b) first journeys: advisor intake end-to-end, case save/review. *Source:* testing-standards audit vs CLAUDE.md, 2026-07-14 (client-knowledge-base branch).

- ☐ **P3 · STRUCT — Monolithic components, no base/shared split.** `VirtualAdvisor.vue` 2708, `CourseBuilder.vue` 2152, `FirmManagerHub.vue` 1295, `FirmDashboard.vue` 665 — over the "decompose when complex and >200 lines" rule; no `components/base/` or `components/shared/`. *Source:* code-gov audit 2026-06-15.

- ☐ **P3 · DOC — Sparse JSDoc.** Mixins lack `@param`/`@returns`; `course.js` has none; `advisor.js` ~4 tags across 2061 lines. **Scheduled into the planned cleanup pass — see [`design/CLEANUP-PASS-PLAN.md`](CLEANUP-PASS-PLAN.md)** (gated: runs AFTER the master team's DB + mentor-login wiring lands, on their email + Mike's go-ahead; branch `chore/i18n-jsdoc-cleanup`). *Source:* code-gov audit 2026-06-15.

- ☐ **P3 · I18N — Hardcoded English in templates** (e.g. "Access Restricted" in `pages/firm-manager.vue`); should route through `$t()`. Infra (`localeMixin`, 8 locales) exists; pervasive sweep. **Measured 2026-06-30: 12 `.vue` screens, only 2 translated → 10 to do. Scheduled into the planned cleanup pass — see [`design/CLEANUP-PASS-PLAN.md`](CLEANUP-PASS-PLAN.md)** (English plumbing only; the other 7 languages are a human-translator job, out of scope; gated: runs AFTER the master team's DB + mentor-login wiring lands, on their email + Mike's go-ahead; branch `chore/i18n-jsdoc-cleanup`). *Source:* code-gov audit 2026-06-15.

- ☐ **P3 · EDIT-TARGET — Bring building blocks under Firm-Manager no-code editing:** 14-question **weight sliders**, **Strategy table** (`strategyResolver` rules), **primary-issues** table, **content-summaries** editor, **coaching-reference** editor, **logic-trees** flowchart editor (tied to the dormant-trees item). *Source:* registry Part 2.

- ☐ **P3 · EDIT-TARGET — Plan-mode's 2 proprietary frameworks** are embedded (locked) inside `plan.txt` and flagged "should become firm-editable." Add to the firm-editable consideration (or consciously decide they stay prompt-locked). *Source:* registry Part 1A → Plan.

- ☐ **P3 · BUILD — Profile → DB.** Move the advisor profile off localStorage into the firm DB (same migration family as case studies). *Source:* registry Part 1A → Profile.

- ◐ **P3 · BUILD — Close the improvement loop.** Case-study → suggested-distinction flow; wire coaching-reference editing into Firm Manager. **Storage half DONE 2026-07-15 (coaching-reference review, Phase 1):** promoted case observations now live PER FIRM in `firmOverlay` (`config_key='coaching-reference'`, version history/restore for free; dev fallback `data/dev-firm-coaching.json`) instead of the global `data/coaching-reference.json` (which is now platform-base, read-only at runtime). The Firm Manager list/edit/delete UI on top of that store is the remaining half. *Source:* registry Part 9; coaching-reference review 2026-07-15.

- ✅ **P1 · SEC/FIX — Coaching-reference learning loop hardened (Phase 1 of the 2026-07-15 review). DONE 2026-07-15.** Three defects in the case-review → AI learning path, found by a full trace of the feedback loop:
  - **(a) Cross-firm leak + unlocked global write:** `POST /api/cases/promote` appended the advisor's free-text case review to the single global `data/coaching-reference.json`, which every firm's Phase 3 prompt then ingested — one firm's client observations reached every other firm's AI sessions, via an unversioned read-modify-write file append. **Fix:** promoted entries are firm-scoped in `firmOverlay` (see the improvement-loop item above); the engine loads `loadFirmCoaching(firmId)` per request and injects it as its own prompt section, so a firm only ever sees platform base + its own entries.
  - **(b) Unfenced hostile prompt input:** promoted advisor review text entered the prompt raw, framed as "Expert Guidance" — a prompt-injection vector (governance: user text in prompts is hostile). **Fix:** `formatFirmCoachingForPrompt` wraps firm entries in `fenceUntrusted()`; embedded fence markers are stripped (test-covered). Platform-base curated entries stay unfenced, like the template library.
  - **(c) Promote trusted the request body:** the promoted text, case title, and even the audit stamps (`promotedBy`/`promotedAt`) came from the browser. **Fix:** the body carries ONLY `caseId`; the entry is built from the STORED case (`caseStore.getVisibleCase` — own or firm-shared, the standard visibility boundary), audit stamps from the verified JWT + server clock. Hostile body extras are ignored (test-covered).
  - Tests: `tests/unit/coaching.test.js` (store, fallback, fencing) + `promote` block in `tests/unit/cases.routes.test.js`. **Phases 2–3 of the same review still open — see below.**

- ☐ **P2 · FIX — Coaching-reference review, Phase 2: cap + domain-filter the injected entries.** `formatCoachingForPrompt` (platform) and the firm block inject EVERY entry into every eligible prompt — unbounded growth as firms promote cases. Plan (approved direction 2026-07-15): filter firm entries to the session's detected domain (undomained entries always pass), newest first, fixed cap, cap-hit logged (no silent truncation). Ships with a scenario-lab before/after check. *Source:* coaching-reference review 2026-07-15.

- ☐ **P2 · SEC/FIX — Coaching-reference review, Phase 3: server-side `caseContext`.** The "Past Case Studies" prompt block is browser-supplied (`sanitiseInput` caps size but the text enters the prompt unfenced, and the client chooses the content). Plan: engine loads the case list server-side via `caseStore.listForAdvisor` (JWT identity), fences summaries/review text; body field accepted-but-ignored for one release, then removed. *Source:* coaching-reference review 2026-07-15.

- ✅ **P2 · BUILD — Mentor case-study review (per-case, manager-gated, anonymised). DONE 2026-06-26** — built, tested, `nuxt build` green, **live-validated end-to-end** (Mike walked it through: manager Share-with-mentor → anonymised preview/approve → mentor `/mentor` page showed the anonymised café case with tone/jargon kept), and **handover documented** (`design/USER-LEVEL-CASCADE-HANDOVER.md` Part 4). Parts: data model; anonymiser (`anonymiseCase.js`, +15 tests); approve/withdraw API (+6 tests); manager UI in FirmManagerHub Team Case Studies; net-new `/mentor` page (MentorReview.vue + `GET /api/mentor/cases`, gated by `requireMentorRole`). **Only residual = the master team's** single seam: point `AUTH.mentorRole` (interim `platform_admin`) at the real upstream Mentor role when it lands — no route/UI change. → move to ACTIONS-ARCHIVE next sweep. *Source:* Mike 2026-06-26. Lets the mentor view firm case studies — *with the firm manager's per-case permission* — to find accuracy problems and improve the app. Four parts, built in dependency order, each approval-gated: **(1) Data model** — a manager-controlled "shared with mentor" flag on the case (independent of the advisor's private/firm `visibility` — double opt-in: advisor→firm, then manager→mentor), a stored **anonymised copy** (transcript + summary), and an audit stamp (who/when). **(2) Anonymiser** — backend Restify route (AI pass) at **share-time**; strips identity (names/company/place/identifying figures) but deliberately **preserves tone, frustration, confusion, jargon** (that's the accuracy signal); logged (raw vs scrubbed) + test-covered to the AI-output standard; raw text never leaves the firm. **(3) Manager flow** — **"Share with mentor"** / **"Withdraw from mentor"** (two-way) in the firm-manager case-review area, with a **preview-and-approve** step: the manager sees the anonymised version and approves before it reaches the mentor. **(4) Mentor view** — a **net-new role-gated screen** (no mentor surface exists today): cross-firm list of approved-shared cases, showing engine behaviour (decision trace + template outcomes + advisor review) **and** the anonymised conversation; filtered strictly to approved cases. **Privacy:** mentor read deliberately crosses the firm boundary → role-gated to mentor only, approved-only filter, anonymise-at-share-time, manager human-in-the-loop approval. **Master-team dependency:** the mentor *login/role + cross-firm scope* rides the upstream auth seam (handover doc); the flag, anonymiser, manager flow and mentor view are this app's code. **Order (Mike 2026-06-26):** build → test/see it → THEN write the handover section (document what actually exists, not a prediction). *Source:* Mike 2026-06-26.

- ☐ **P3 · BUILD — Auditability goals.** Decision Trace (per-recommendation trace) + Config versioning (edit history; tag each saved case with the active config version). **Part-delivered** via `SCORING_VERSION` (now on the trace, see archive). *Source:* registry Part 9.


- ☐ **P3 · DOC tidy** — fold any remaining per-file detail from `registry_compilation_wip`; resolve the Org CA Capacity Planner mislabelled-PDF flag (Part 2A). *Source:* registry.

- ◐ **P2 · BUILD/DECISION — Business Performance Report (NEW feature, in design).** Non-tech accountants drag-and-drop reports exported from Xero → the app runs the supplied financial models → generates a branded, **personalised** Business Performance Report; AI writes the narrative from **anonymised figures only** (no client name / ID / bank numbers leave the app). Reuses the existing engine (i18n, `courseEngine`-style AI route, `firmAuth`, markdown pipeline) — **no stack change**. Launched from Advisory.com's existing "client report button" into a Virt-Advisor-hosted page (Option 1). Currently in **design**; full plan, task board, decisions and integration map in [`design/BUSINESS-PERFORMANCE-REPORT-PLAN.md`](BUSINESS-PERFORMANCE-REPORT-PLAN.md). Open sub-decisions tracked there (dropped file formats; streaming vs JSON; Advisory launch hand-off). *Source:* design sessions with Mike from 2026-07-09.

---

## NEEDS A MIKE DECISION (no code until you rule)

> **✅ ALL RULED 2026-07-16** — every item in this section (plus CB-07, Stage 3 and the DD
> item above) was decided by Mike in the 2026-07-16 decision session (memory
> `rulings-2026-07-16`). Rulings that created a build are marked ☐ and stay open as build
> tasks; closed items (✅, no code) move to ACTIONS-ARCHIVE next sweep.

- ✅ **`org_leadership` home — RULED: stays in Learn mode.** Current tagging (`mode:'learn'` + `section:'get-organised'`, barred from client deep-dive) is confirmed as the design. Closed, no code change. *Source:* 2026-06-23; ruling 2026-07-16.
- ◐ **P3 · BUILD — Learn-mode domain-support enrichment — BUILT 2026-07-16 (ruled: INJECT).** 10 of 21 Learn coaching trees resolve to a verified domain-support file — 7 by exact name conversion, 3 by explicit data-owned aliases in `logic_trees.json` (`sales_process`→get-sales, `eoy_meeting`→eoy, `conflict_meeting`→conflict, each content-verified); the other 11 have no file and stay honestly unenriched (nothing guessed). Resolver `supportIdForLearnTree` + injection in the Learn context slot; 7 tests incl. a data-drift guard. **Client engine provably untouched:** scenario-lab deterministic run byte-identical with/without the change. Live-verified: Learn prompts grew ~8k→21k+ tokens (material arriving) and the post-routing-fix EOY answers carried the real reference structure. **Also shipped from the same audit (Mike's F2 ruling): the "Save as case study" nudge no longer fires in Learn mode** (learn chats aren't client cases — they'd pollute firm sharing/mentor review/coaching promotion). Remaining: closes fully once the honesty+enforcement pair (below) lands and Mike calls the depth satisfactory. *Source:* ruling + build + audit 2026-07-16.
- 🔒 **STATE — Vuex installed but unused — RULED: PARKED until the Advisor-e UAT settles, then bundled with the localStorage→MySQL migration.** Virt Advisor is integrated into the master app's UAT (fact recorded 2026-07-16); a broad state refactor under a live UAT would change the ground under the testers for zero feature gain. When data moves server-side, each screen adopts Vuex as its storage moves — no double rework. The standard itself is unchanged (Vuex remains the required mechanism); this ruling is timing only, per the one-directional rule. *Source:* code-gov audit 2026-06-15; ruling 2026-07-16.
- ☐ **P3 · BUILD — HOW-swap scope — RULED: YES, both places.** The invisible client→learn swap is to fire in Discover mode AND pre-recommendation as well as the client deep-dive. Scenario-lab pass required so the early-session version cannot derail the 14-question intake. *Source:* registry Part 8; ruling 2026-07-16.
- ✅ **P3 · BUILD — Raw-JSON "Decision Framework" Firm Manager tab — SHIPPED 2026-07-16 (ruled: HIDE, admin/mentor-only).** The tab renders only for `platform_admin` (= the interim mentor role, so the mentor keeps the support tool); the page passes `userRole` into the hub, most-restrictive default (no role → no tab); the raw framework data isn't fetched for users who can't see the tab; dev auto-login runs as admin so it stays locally testable. **Deliberately UI-only:** the `/api/firm-manager/framework*` routes stay manager-level because the friendly Staircase tab's version-history/restore rides them (traced 2026-07-16) — managers hold that write access by design via the friendly screens. ⚠ Residual: the hidden-state (firm-manager view) can't be demonstrated locally (dev login is always admin) — verify in Advisor-e UAT with a real firm-manager login. Suite 1,089 green, lint clean, build green. *Source:* SESSION-2026-06-17-NOTES §5, §7; ruling + build 2026-07-16.
- ☐ **P2 · BUILD — Education gates on the Advisory Staircase — RULED: advisor-choice prompt (Mike's own design, 2026-07-16).** Not silently wired, not left display-only: on low client literacy (Lens 2), a **pre-recommendation prompt** — modelled on the existing outside-your-range pattern — asks the advisor *"apply education-first, or skip and see what's technically needed"*, with the reasoning shown either way. Fits guide-don't-replace. On-screen wording to be confirmed with Mike before coding; scenario-lab tested; the literacy signal's reliability verified first. *Source:* memory `design-education-gates-ascent`; ruling 2026-07-16.
- ✅ **"Context domains override the strategy layer" — RULED: current per-domain handling IS the design.** The old note (whose `CONTEXT_DOMAINS` dead code was removed 2026-06-12) is superseded; no override rule is built. Reopen only if a live session shows a context-led conversation mishandled. Closed, no code change. *Source:* lint cleanup trace 2026-06-12; ruling 2026-07-16.

---

## GATED — not startable yet (evidence / auth / ops blocked)

- ✅ **P2 · SEC — Tier 2 fabrication watch: enforcement ON. SHIPPED 2026-07-18 (`4f14c28`).** The watch fired twice in Mike's live Learn thread and both detections were CONFIRMED accurate: 3 + 4 quoted spans flagged "not found in the firm reference or conversation" were exactly the invented EOY "script" lines Mike was given (zero false positives observed) — the original parking condition was satisfied. The original "surgical removal" plan was superseded at proposal (2026-07-16): responses STREAM, so an invented span has already been seen — removal can't unprint it. Enforcement instead APPENDS a visible correction note (wording approved by Mike 2026-07-18; document-named + generic variants). The named variant fires only when exactly one known document — name harvested from OUR OWN reference text via "the X document" — appears within 500 characters of a flagged span; any ambiguity falls back to the generic wording, so the correction can never itself misattribute. The note is plain markdown appended after a divider — the locked rendering pipeline is untouched. `fabricationWatch.js` now at 100% coverage on all four measures. ⚠ Residual: live sighting pending (needs a session where the model invents a quote, or one deliberately provoked). *Source:* Tier 1/2 build 2026-06-22; live evidence + un-parking 2026-07-16; enforcement 2026-07-18.
- ✅ **EXPERIENCE — Frustration detection BUILT 2026-06-25.** `detectFrustration` (advisorEngine) — anger / profanity / "I already told you" / "for the third time", with a guard so narrating the client's words ("the owner said fuck it") and describing a stressful client situation don't trip it. Wired into the intake answer-recording: on a hit it ACKNOWLEDGES (`FRUSTRATION_ACK`) and re-asks the current question plainly instead of treating the venting as the answer; capped at 2/session so it never loops. Closes the original "profanity sailed past" failure. 24 unit tests; 568 suite green. *Source:* Mike café test 2026-06-09; memory `design-intake-resistance-fallback`. (`FRUSTRATION_ACK` wording is a draft pending Mike's confirm.)
- 🔒 **BUILD — Broaden urgency-trigger detection (follow-up to Intervention Urgency, evidence-gated).** `deriveUrgency` (`caseState.js`) sets `high` only from `GOVERNANCE_URGENCY === 'urgent'` and `RISK_URGENCY === 'immediate'`, so a crisis in another domain (e.g. cash crisis in Financial Management) does not trip the flag. The wiring is domain-agnostic; this is about *detecting* urgency in more domains (a new per-domain urgency signal, or inferring from cause text). Build when a real session shows a missed crisis. *Source:* Intervention Urgency build 2026-06-23.
- 🔒 **BUILD — Primary-issue selector remnant (evidence-gated).** Largely overtaken by removal (the `primaryIssue` question is permanently skipped; the issue is inferred from the cause-signal lever + domain). **Only remnant:** a **recommendation-time clarification** that fires *only if* template scoring hits a genuine issue fork — build it when a real session actually produces a fork, not preemptively. *Source:* memory `design-primary-issue-step`.
- 🔒 **BUILD — Firm Manager: master-export self-service upload (Stage 2). Blocked on Firm Manager Auth (hub Phase 1)** — no verified firmId to scope the file to until then. Per-firm Google Drive folder, schema-validated upload (size cap, JSON-only, shape check, last-known-good fallback), version history + restore, firm_manager role-gated. Stage 1 (single central loader + validation) ships first and this swaps in behind it. *Source:* memory `firm-manager-hub`; skill `master-export-upload`.
- 🔒 **OPS (not code) — Provision the `va_case_studies` MySQL table.** The case-study feedback loop is merged to `master`; dev runs on the dev-JSON fallback. Schema in `config/db-schema.sql`. Same family: the Firm-Manager-config-persistence MySQL item above.
- 🔒 **FEATURE (future, parked) — Advisor-enablement distinction table, paired to Learn mode.** DECISION (Mike, 2026-06-22): keep concerns **separate** — Advisory Distinctions stay **client-outcome only**; "easier/safer for the advisor" is a **separate layer**, a distinction-type table paired to Learn mode. **Worked example (the miss):** an EOY/upsell session by a new advisor with a small lifestyle café surfaced **Total Needs Sales Scripts**. Two root causes: Learn mode hands the AI all of `get-the-job`+`get-organised` wholesale unfiltered (`advisorEngine.js:2037-2047`); the `learn.txt` guardrail only governs the sales-process pick. Distinctions don't reach Learn mode at all. **Parked — not building now.** ⚠ Evidence accruing: 2026-07-16 live Learn thread repeated the exact miss at resource level — first recommendation was **Total Needs Sales Scripts** to a low-experience, compliance-focused advisor (the experience gate covers the sales *process* pick, not the resource list); it self-corrected to Lite Fundamentals only when the advisor challenged it against the decision tree. *Source:* Mike 2026-06-22; memory `design-advisor-enablement-distinctions`; live evidence 2026-07-16.
- 🔒 **BUILD (later) — Distinctions cascade Stage 4 — case-study → suggested-distinction loop** (north-star #4; out of scope for the cascade build itself). *Source:* memory `design-distinctions-cascade`.

---

## ⛔ DO-FIRST P1 (stack governance — overnight/reinstall-gated)

- <a id="dev-toolchain"></a>☐ **STACK DRIFT (dev toolchain) — flip `engine-strict` back to `true`.** The app **runtime is Node-14.15-clean** (backend + frontend install with zero engine warnings; full suite passes on 14.15); the only mismatches are dev/build tools. **Done already (archive context):** the four hard pins (`eslint 7.32.0`, `@nuxtjs/eslint-config 6.0.1`, `concurrently 7.6.0`, `cross-env 7.0.3`) + `cssnano 4.1.11` (postcss-7 line; the head-team's "5.x" is SUPERSEDED — confirmed by the master coding team 2026-06-23, Option 1) were applied and installed clean (lint 0, 319 tests, `nuxt build` green). **REMAINING:** the installed tree has **exactly two** Node-engine mismatches, both transitive over-declarers — `consola@3.4.2` (wants 14.18+) and `node-releases@2.0.47` (wants 18+). Add 2 `overrides` (`consola`→2.x, `node-releases`→older) + **one more install to verify**, then **flip `engine-strict` → `true`** in `.npmrc`. ⚠ Risk: downgrading `consola` major (v3→v2) may break whichever build tool pulls it — own task, own install window. ⚠ **Reinstall is overnight-only on this machine** (Avast cert + npm 8 per the install command in the archive). **Do NOT flip `engine-strict` to `true` until verified** — it will hard-fail the install otherwise. *Source:* engine scan 2026-06-12; pin list 2026-06-16; install 2026-06-16.
