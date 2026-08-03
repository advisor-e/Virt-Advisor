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

- <a id="pr-firm-quiz-builder-to-master"></a>☐ **P1 · PROCESS — raise a pull request from
  `feat/firm-quiz-builder-ui` to `master`. The branch is green and ready; nothing is blocking it but
  the asking.** Logged 2026-08-02 by Mike's question — it had been said in conversation and written
  nowhere, which is the exact failure the Save-the-Artefact rule was written about the same evening.
  - **State at the time of logging (`237ef00`):** 9 ahead, **0 behind** `origin/master`, working tree
    clean, pushed. Full suite **3,965 green / 237 suites** *after* merging the 75 commits that came in
    with PR #30 (the Business Performance Report programme) — a clean merge, no conflicts. The
    pre-push and audit gates passed on every commit.
  - **What is sitting on it:** the Logic-Lab correction (distinctions measured live through the
    engine's own classifier; the phrase screen removed from the hub but kept in the repo), the
    `npm run serve` / `npm run go` start commands, **both approved mockups**, and the **CLAUDE.md
    "Save the Artefact" rule**.
  - **Why it should not wait.** That rule binds *both* machines and the laptop cannot follow a rule it
    does not have — every day it stays on this branch is a day the other division can approve a design
    in chat and lose it, which is the thing that cost this session a day. Same shape as the
    [`startup-blind-to-other-machine`](#startup-blind-to-other-machine) P1: work that is pushed but not
    PR'd is invisible to the other division, and every check reports green throughout.
  - **`master` means releasable** (WORKING-AGREEMENT), and this branch is: green, merged up to date,
    and carrying no half-finished screen — the Decision Logic page has not been started, so nothing is
    mid-build. Reached by pull request only; `.husky/pre-push` refuses a direct push.
  - **Not a blocker for tomorrow's build.** It can be raised before starting, or after the page lands
    — Mike's call. Raising it first is the safer order: it gets the rule to the laptop today and keeps
    the PR small enough to actually review.

- <a id="logic-lab-decision-logic-build"></a>☐ **P1 · BUILD — TOMORROW'S FIRST TASK. The DECISION LOGIC page,
  approved by Mike 2026-08-02 from a working mockup, goes into Firm Manager Hub as the tab named
  "Logic-Lab". THE MOCKUP IS THE SPEC — do not design from this entry.**
  - **THE ARTEFACT:** [`design/mockups/decision-logic-map-mockup.html`](mockups/decision-logic-map-mockup.html).
    Open it in a browser (or serve it: copy to `static/` and hit `/decision-logic-map-mockup.html`).
    It is interactive — the diagnostic calls the real probe route. **Per CLAUDE.md → "Save the
    Artefact", this entry LINKS the file and does not replace it. When the build is done, put the two
    side by side and name every difference.**
  - **Mike's ruling, verbatim (2026-08-02):** *"I want the logic lab page as it is currently sitting in
    firm manager hub … to be deleted. I don't wanna see it anymore. It's shit. I want the decision
    logic mock up that you've got in future inserted into fair manager hub and renamed logic lab."*
    And on the old work: *"all of the work that's been done around that phrase testing needs to be
    saved somewhere. I just don't wanna see it in this manager hub. We may find down the road we
    choose to use it, so don't delete it entirely."*
  - **What the page contains, in the order it was approved (section 1 and 2 signed off explicitly —
    *"I'm really happy with section one and two … let's save them"*):**
    1. **"Here are the three things that affect client recommendation"** — three columns, order fixed
       by Mike: **domain support · logic tables · Advisory Distinctions**. Each carries what it holds,
       what it does, and what to edit it for. **Descriptions are code-verified, not paraphrased** —
       Mike rejected the first version as invented: domain support is the how-to content
       (`name` / `summary` / `who_when` / `steps`, [`domainSupport.js`](../server/utils/domainSupport.js)
       L102-113) read by **Learn mode** ([`advisorEngine.js`](../server/advisorEngine.js) L3192) and
       **Course Builder** ([`courseEngine.js`](../server/courseEngine.js) L170, L364), and template
       selection never reads it ([`contentRouting.js`](../server/utils/contentRouting.js) L107-112);
       logic tables contribute `TREE_HINT_BOOST = 3`
       ([`templateResolver.js`](../server/utils/templateResolver.js) L184); distinctions contribute
       `+5` and are judged **only inside the detected domain**. Quiz banks sit in a footnote —
       named, and stated to affect nothing.
    2. **"What do you want to change?"** — a symptom→lever router, five rows. This replaced two
       sections of statistics that Mike ruled useless for deciding anything (*"they just confuse the
       shit out of me"*): the aggregate 59%/80% block was **cut**, and the margin insight was folded
       into the distinctions column where it means something.
    3. **The near-miss answer** — opens in place behind router row 5, not a section of its own. Each
       line is a decision with **Move / Copy / Leave**, not an observation. Source:
       `findNearMissDistinctions`, already computed every session and never surfaced.
    4. **The diagnostic** — sentence + "what went wrong" dropdown + **the template you expected**.
       The expected template is what turns "here is what happened" into "here is how far short you
       were". Shows the live probe result, then the score sheet with the gap.
    5. **"Give me ideas of what to change"** — a separate opt-in button below the diagnosis. Numbered
       strongest-first with what each is worth, and it adapts to the dropdown. **It never drafts the
       firm's content**: the suggested distinction is the advisor's own sentence quoted back.
  - **🔴 THE ONE BLOCKER, and it is small.** The score sheet and the gap arithmetic need a template's
    real `matchReasons`. The engine computes them on **every** session
    ([`advisorEngine.js`](../server/advisorEngine.js) L2867, stored in `_decisionTrace.templateScores`
    with `_scoreGap` alongside) and **no route exposes them**. That route is the first thing to build.
    Everything else on the page reads data that is already reachable.
  - **Already live and reused as-is:** the sentence probe (`POST /api/firm-manager/logic-trees/probe`),
    which now measures Advisory Distinctions for real via one gpt-4o-mini call — verified live
    (`[openai] logic-lab-probe … status=ok latency=2044ms`).
  - **Not yet decided:** where the page is reached from beyond the hub tab, and whether the
    Move/Copy/Leave buttons write immediately or stage a change. Both are Mike's calls.

- <a id="logic-lab-phrase-testing-parked"></a>🔒 **PARKED (not deleted) — the phrase-testing screen and its
  470-sentence comparison. Removed from Firm Manager Hub 2026-08-02 by owner instruction; every file
  kept.** Logged under the no-silent-parking rule so it is revived deliberately, never rediscovered.
  - **What is still in the repo and works:**
    [`components/firm/FirmLogicLab.vue`](../components/firm/FirmLogicLab.vue) (22 passing tests in
    [`firmLogicLab.component.test.js`](../tests/unit/firmLogicLab.component.test.js)), the two
    read-only routes, and the **approved** green/red mockup
    [`design/mockups/logic-lab-wording-mockup.html`](mockups/logic-lab-wording-mockup.html).
    The hub no longer imports or renders the component — see the comment block in
    [`FirmManagerHub.vue`](../components/FirmManagerHub.vue).
  - **Why it was rejected, in one line:** its comparison runs against a corpus of **419 branch
    conditions + 51 Scenario Lab cases**, which are instructions to the AI and test fixtures, not
    advisor speech. Mike deleted six real trigger phrases (39 → 33) and it reported **0 gained, 0
    lost, 470 unchanged** — *"nothing would change"* is not an answer, it is the tool being unable to
    tell, and it reads as reassurance. Reproduced independently: adding `org chart`, `turnover` or
    `nobody knows who reports to whom` to `staff_performance` each moved **0 of 470**; `org chart`
    appears in **0** of the corpus sentences.
  - **What would make it worth reviving:** a corpus of sentences that sound like advisors talking —
    real session text or transcribed openings — instead of branch conditions. Until then the
    comparison must not report "nothing moves" as a finding; it should say it cannot tell.
  - **What was genuinely good in it, and has already moved on:** the sentence probe. It is section 4
    of the Decision Logic page above, and it is the half Mike found useful — it showed that only
    `"decision making"` landed out of a three-part sentence, while *"no clear direction"* and *"not on
    the same page"* reached nothing.

- <a id="decision-logic-page"></a>☑ **SUPERSEDED by the two entries above (2026-08-02). Kept for the
  design reasoning and the IP-boundary ruling, which still bind.**
  ☐ **P1 · BUILD — the DECISION LOGIC page: a read-only screen where a firm
  manager sees the parts they can edit, what each one actually changes, and what difference a change
  makes. RULED 2026-08-02 (Mike). Not started — no code written, no spec document yet.**
  - **What Mike asked for, in his words (2026-08-02):** *"a separate page that showed all the mechanics /
    pathways that help determine a template in a read only page so firm managers could understand what
    influences the template selection"*, multi-column — and later: *"the purpose … is to allow users to
    learn what makes the best difference across all variable inputs. We want them to be able to actively
    influence the [decisions] made on their content by AI for their advisors."*
  - **🔴 THE IP BOUNDARY IS THE FIRST CONSTRAINT, NOT A DETAIL (Mike, 2026-08-02).** *"The algorithm 'as a
    whole' stays hidden — this is our IP."* Specifically protected: **that the engine relies on the growth
    stages, the 3 engagement types and the Advisory Staircase**, and **the feeder/tested question order and
    how it works**. The page shows **only the parts made editable on purpose**, how each influences, and
    the logic behind decisions. Consistent with the 2026-06-11 ruling in memory
    `design-growth-locked-protected-ip` (framework CONTENT platform-locked; the staircase
    complexity-*grading* per level stays firm-tunable, and is not a contradiction).
  - **Plan B chosen over Plan A.** Plan A (show every lever, all ~13 reason families) was rejected: it
    would expose engagement types, growth stages, the staircase ceiling and the question order as named
    levers. It is also the worse product — a page listing levers a manager may not touch teaches them what
    they are not allowed to do. **Every row in Plan B ends in an action.**
  - **Page shape — grouped by WHAT EACH LEVER CHANGES, not one section per building block.** Measured, the
    five editable blocks do three different jobs, and a flat list would teach something false about two of
    them: **Distinctions (67) + logic tables (37 of 42) SELECT templates** · **domain support (29) shapes
    the AI's wording and selects nothing** · **quiz banks (62) never touch a client recommendation**. Then
    a fourth section: **test a change** (the trigger workbench moves here — see `workbench-placement`).
  - **✅ ACCURACY RULED (Mike): "of course it needs to be accurate for them — always."** The page reads the
    **firm's own live configuration**, edits included — never the platform base with the firm's work
    missing. **Consequence to budget for:** [`contentRouting.js`](../server/utils/contentRouting.js)
    hard-requires the four platform data files at load (L28-31) and its five classify functions take **no
    arguments**. They must take their content as input. The classification RULES must not change — that
    module is deliberately the single source the report and the build guard both read.
  - **Two safeguards, both required.** (1) **The hidden remainder always carries its number** — *"other
    engine factors: +11"*, never omitted, so the arithmetic never has a gap (a score that does not add up
    loses the reader's trust, and the no-silent-omission rule already binds here). (2) **The allowlist of
    publishable reason codes FAILS CLOSED, with a test that proves it** — a code is hidden unless
    explicitly cleared, so the next developer who adds a scoring rule cannot leak the IP by forgetting.
  - **✅ IT IS WORTH BUILDING — measured live, 51 Scenario Lab cases, the real resolver.** Removing the
    firm-editable levers **changes the top recommendation in 30/51 cases (59%)** and the displayed set in
    **41/51 (80%)**; they supply **37.5%** of the winning template's score. Of the 41 changed sets, 29
    turned on **distinctions alone**, 3 on logic tables alone, 4 on both, and 5 changed because a rival
    template was boosted past another. The changes are substantive, not cosmetic: all four `strategy`
    cases go from *Lite Strategy + 1 pg Bizz Case* to *Orientation Part 1 + Planning Outcomes Review*.
  - **⚠ DO NOT present leverage as share-of-score.** The same data reads as worthless or powerful depending
    on the number chosen, and Mike raised exactly this risk (*"else it could make the page seem
    worthless"*). Leverage is not a proportion — it is whether a nudge crosses the gap between the top two
    candidates, and the **average margin between #1 and #2 is 3.0 points**. A +3 flipped the winner at a
    score of 47 *and* at a score of 6. **Show the margin** — "this came top by 2 points, and 3 of those
    came from your logic table" — never "your edit was worth 5%".
  - **The raw material mostly exists and has never been surfaced.**
    [`templateResolver.js`](../server/utils/templateResolver.js) L567 already returns `matchReasons` per
    template with the real numbers (`distinction:+5`, `tree_hint:+3`, `penalty:*`) — computed on every
    session and thrown away. [`CONTENT-ROUTING.md`](CONTENT-ROUTING.md) already classifies 491 assets with
    the deciding code path and evidence, generated with a freshness guard.
  - **Honest limits the page must state.** `matchReasons` explains the **deterministic scoring only** — not
    the domain detection ahead of it (use the existing probe) nor the AI's narrative after it. And whether
    a **distinction matches** is an AI judgement that carries no number; only its boost does. So the page
    has two evidence sources and must say which is which rather than blending them into one confident view.
  - **OPEN, and Mike's to decide:** every user-facing label, the page's own name (*"Decision Logic"* is his
    phrase from the session, not yet confirmed as the title), and where it is reached from. Wording is never
    invented (CLAUDE.md). **NEXT STEP: write the spec document; before that, (a) read `6b9d4d2`, which
    changed what the routing report covers, and (b) Mike looks at the trigger workbench, which is now in
    `master` and still has never been seen by anyone.**

- <a id="request-compressed-to-one-line"></a>☐ **P1 · PROCESS — a request was compressed into a one-line
  paraphrase, and the build then delivered against the paraphrase. That is how a trigger workbench came to
  be built instead of the page Mike asked for.** Found 2026-08-02 by Mike: *"AI gave me a 'workbench' and
  forgot about the rest."*
  - **The evidence.** The ONLY written record of the request is a single line in this file: *"Raised by
    Mike: a read-only view of what affects what, aligned with the tests, that warns of effects before a
    change."* The commit that followed (`754d204`) already calls it *"the workbench Mike asked for"* — so
    the narrowing had happened **before any code was written**, and nothing in the record showed it.
  - **What the compression lost:** "a separate page", "all the mechanics / pathways", "multi-column", and
    "so firm managers could understand what influences template selection". None of it reached the notes.
  - **Why this is a process defect, not a misunderstanding.** Two days of work were designed, tested,
    committed and merged, and **every gate passed** — because the gates check the code against the note,
    and the note itself was already wrong. No test can catch this class of failure.
  - **Proposed rule, cheap and mechanical:** when a request becomes a task entry, **the entry quotes the
    ask verbatim before it paraphrases it.** The paraphrase is the AI's reading and is allowed to be wrong;
    the quote is not. Read it back before designing against it.
  - Same accretion-without-sign-off family as the two already on record in memory:
    `design_growth_locked_protected_ip` ("surface all three frameworks so a firm can edit them" — never
    Mike's call) and `design_conversational_intake`.

- <a id="cert-bundle-residual"></a>☐ **P3 · DOC — three FUNCTIONAL references still point at
  `certs/digicert-bundle.pem`, deliberately left there.** Logged 2026-08-02 under the no-silent-parking
  rule, so the decision is visible rather than living only inside a commit message.
  - **Corrected that day (`152c1bb`):** the live-AI recipes in the four lab scripts and
    [`HANDOFF.md`](HANDOFF.md). The committed bundle does **not** cover `api.openai.com` on a machine
    running antivirus HTTPS scanning — verified, Avast Web/Mail Shield re-signs it.
  - **NOT changed, on purpose:** `package.json` (`dev`/`start`), `.husky/pre-commit` L20 and
    [`audit-gate.js`](../scripts/audit-gate.js) L33-34. Those serve the **npm registry** chain, which
    demonstrably works — the audit gate passed with that bundle on both of today's commits. Changing them
    is a behaviour change nobody asked for and could break the dev workflow for no gain.
  - **Open if ever revisited:** whether a machine-specific AV root belongs in the repo at all. It probably
    does not — a per-machine env var is the cleaner answer, and that is what `HANDOFF.md` now instructs.

- <a id="stranded-report-programme"></a>◐ **P1 · RESCUE — THREE FINISHED FEATURES AND THE MODEL
  VISUAL STANDARD WERE STRANDED ON `feat/business-performance-report`, ABSENT FROM `master`.
  ✅ CLOSED 2026-08-02 — [PR #30](https://github.com/advisor-e/Virt-Advisor/pull/30) IS MERGED
  TO `master` (`02c22ca`) and merged back into `feat/advisor-progress` (`dfff97e`), pushed.
  Suite **3,968 green / 238 suites**, lint 0 errors, audit gate PASS.**
  Found 2026-08-02 (laptop, Session 23) while measuring branch drift for the item below — which
  is the point: **the blind spot found its own second instance.** Mike, told what was there:
  *"yes, cost of capital is definately supposed to be there — bring it back."*
  - ✅ **DONE 2026-08-02 — `master` merged INTO the stale branch (`033657d`, 185 commits), PR
    raised from the frozen snapshot `release/report-programme-2026-08-02`, never from the live
    branch (the PR #23 → #24 lesson).** The trial measurement held exactly: **one conflicted file,
    `design/ACTIONS.md`, one marker, both sides kept in full; no code file conflicted.** Final
    state **237/237 suites, 3,955 tests, lint 0 errors, audit gate PASS**. 80 files, +11,675/−457.
  - **What is missing from `master`** (~30 files, verified by comparing the two trees, not assumed):
    - **Cost of Capital (WACC)** — `components/CostOfCapital.vue`, `pages/cost-of-capital.vue`,
      `server/report/costOfCapitalModel.js`, 3 tests. Its commits describe a *finished* feature:
      the screen live in the Model Library, a hurdle-rate test, adopt-a-beta, and a correction
      to standard practice (CAPM without the two extra adjustments).
    - **Lease vs Buy** — screen, maths model, route, 3 tests.
    - **Loan Estimator** — 4 components, model, page, 6 tests, `data/loan-criteria.json`,
      `data/tax-bands.json`, `design/LOAN-ESTIMATOR-PLAN.md`.
    - **`components/base/ReportShell.vue` — the single source of the model visual standard** —
      plus `design/REPORT-VISUAL-STANDARD.md`, `design/REPORT-LAYOUT-REFERENCE.html`, and the
      refactor putting **all eight existing model screens** onto it.
    - Also an `add-a-report` skill and 12 session notes.
    - ⚠ **CORRECTED 2026-08-02 — this line also listed `components/FirmDashboard.vue`,
      `server/routes/firm.js` and `scripts/sync-video-minutes.js`, and that was WRONG.** They are
      absent from `master` because `master` **deleted them on purpose** (`d3c4e5c` "delete the
      FirmDashboard mock and its whole cluster"; `b1b4432`, the stale video-minutes copy) — not
      because they were stranded. The merge honours those deletions. **Measuring absence and
      reading it as loss** is the trap: a file missing from `master` is either work that never
      arrived or work deliberately removed, and only the deleting commit can tell you which.
      Checked before committing precisely because a merge that silently resurrects deleted code
      is worse than one that drops it.
  - 🔴 **THE DETAIL THAT PROVES IT IS LOAD-BEARING: `design/REPORT-LAYOUT-REFERENCE.html` exists
    ONLY on that branch.** The project's binding visual rule — every model copies that layout
    skeleton — has had **no source in the shared code**. Any model built from `master` alone has
    been working to a standard it cannot read.
  - ✅ **MEASURED BEFORE ANY APPROACH WAS PROPOSED, and the measurement overturned the
    expectation.** 185 behind / 73 ahead read like a reconstruction; a trial merge in a throwaway
    worktree says otherwise:
    - **Exactly ONE conflicted file — `design/ACTIONS.md`, one marker.** *No code file conflicted.*
      295 files merge cleanly.
    - **235/237 suites, 3,944/3,947 tests green** on the merged result.
    - **Failure 1 — the routing map goes stale**: the Loan Estimator adds two data files, so the
      generated count moves 30 → 32. Fix is `npm run routing` + commit. **This is
      [`cross-branch-rule-collision`](#cross-branch-rule-collision) again** — a rule made on one
      machine meeting rows added on the other.
    - **Failure 2 — `ReportShell.vue`'s style block fails `componentStyles.test.js`**
      (`CssSyntaxError: Unknown word` at 1:1). That guard did not exist when ReportShell was
      written. **Undiagnosed: either a genuinely malformed style block the branch could never have
      caught, or the guard misreading a valid file.** Diagnose before merging — do not assume which.
      - ✅ **DIAGNOSED AND FIXED 2026-08-02 — it was THE GUARD, and the stylesheet was always
        fine.** `ReportShell.vue` **quotes** `` `<style scoped>` `` inside its own documentation
        (L17 — it is the component whose entire purpose is to stop each screen hand-writing one).
        The extractor's unanchored `/<style…>/` matched that **sentence**, then ran on to the real
        `</style>` 98 lines below, so postcss was handed a paragraph of English. **The real
        stylesheet was never parsed at all** — a false failure concealing a genuine blind spot,
        which is the worse half. Fixed by anchoring both tags to the start of a line (`^…^`, `m`
        flag): a Vue block always opens at column 0, a mention in a comment never does.
        **Verified it does not blind the guard** — across all 82 `.vue` files both versions find
        blocks in the same **60** files, disagreeing on exactly the one file intended. Two
        permanent tests added in the file's own "the check itself works" block, per its stated
        design that the proof lives in the suite rather than in a session someone must remember.
    - **Failure 3, NOT predicted — `server/report/` fell ONE branch under its 85% coverage gate**
      (790/930 = 84.94%) the moment three models joined the folder. **Third instance of
      [`cross-branch-rule-collision`](#cross-branch-rule-collision) in a single merge.**
      🔴 **Closed with tests, NOT by moving the gate** — lowering a threshold to fit the code is
      the "ratify the drift" move this project does not make, and it would have been over a single
      branch. Six real tests on genuinely unexercised guards in `leaseVsBuyModel.js`, all of them
      route-facing input the model already has a guard for and nothing ran: a number arriving as
      **text** (the code's own comment names this), as **NaN/Infinity**, a **zero servicing
      interval** (`div()` exists so an unknown interval cannot yield Infinity), a **zero-month
      loan**, and **0% finance** (real for interest-free dealer deals — it takes a different
      formula branch entirely).
      - ✅ **A REAL DEFECT FOUND WHILE WRITING THEM, PINNED AND REPORTED, NOT FIXED — RULED ON AND
        FIXED 2026-08-02 (Session 25, `a76b3e2`).** A numeric
        field that is **absent** is named in `defaultedInputs` (the R8 ruling). A field that is
        **present but unusable** — `deposit: 'eight thousand'` — is silently replaced by the
        sample and named **nowhere**, so the caller is told the figure is theirs when it is ours.
        Same family as every other silent-default finding here. Pinned as a `⚠ CURRENT BEHAVIOUR`
        test so a future fix **fails that test rather than passing quietly**. Needs a Mike ruling;
        the model reaches a public route that takes raw browser JSON.
        - ✅ **Mike's ruling: R8 extends to unusable figures.** A present-but-unusable figure is
          now treated exactly as an absent one — it falls back to the sample **and** is named in
          `defaultedInputs`.
        - 🔴 **THE REPORTED DEFECT WAS THE SMALLER HALF.** `loanEstimatorModel.js` — not the model
          that raised the flag — was **worse**: its `take()` fed `num()` with no fallback, so an
          unusable figure became **ZERO, not the sample**. A deposit typed in words silently became
          *no deposit*, and the loan amount moved with it. **Finding a defect in one model is a
          reason to check its siblings, not a reason to fix one file.** `quickPositionModel`,
          `ebitdaDcfModel` and `costOfCapitalModel` were already correct; the two outliers now
          share the same `usable()` test.
        - **The tests pin the opposite error too**: a numeric string (`'8500'`) and a genuine zero
          are the client's own figures and must **not** be declared — a flag that cries wolf is its
          own defect.
  - **So the route is ONE MERGE, not a file-by-file port** — and porting Cost of Capital alone was
    considered and rejected: its CSS reads ReportShell's tokens, so it would land working but
    looking wrong. The features do not separate cleanly; the visual standard is the floor they
    all stand on.
  - ⚠ **The branch is 185 behind and last touched 2026-07-29.** Whatever is done, it is done by
    merging `master` INTO it (measured above) and raising a PR from a frozen snapshot — never by
    merging a two-week-stale tree into `master`.
  - ~~**NOT STARTED. Nothing has been merged, cut or pushed.**~~ *(Superseded 2026-08-02 — see the
    DONE bullet at the top of this entry. Left visible rather than deleted so the gap between
    "measured" and "merged" stays legible: it was one session.)*
  - ✅ **BOTH REMAINING STEPS DONE THE SAME DAY (Mike instructed the merge).** `master` =
    `02c22ca`; back-merged into `feat/advisor-progress` as `dfff97e`, pushed, **9 ahead / 0
    behind**. **The predicted `ACTIONS.md` conflict did NOT recur** — both sides had already
    been reconciled inside PR #30, so git had nothing left to disagree about. **Worth carrying:
    the append-vs-append conflict is paid ONCE PER DIVERGENCE, not once per merge.**
  - 🔴 **CONSEQUENCE THE DESKTOP MUST ACT ON: `feat/firm-quiz-builder-ui` went from 0 behind to
    75 BEHIND `master`** the instant #30 landed, with 4 unmerged commits of its own. Merge
    `master` in before touching anything there. **This is a third worked example of
    [`startup-blind-to-other-machine`](#startup-blind-to-other-machine)** — the branch read
    green right up to the moment the ground moved under it, and nothing on either machine said
    so. The pattern is no longer arguable: it has now happened on 2026-08-01, on this rescue,
    and again within an hour of merging it.
  - ⚠ **`feat/business-performance-report` is 187 behind / 0 ahead and now fully superseded** —
    everything it held is in `master`. Its local copy is 186 ahead of its own remote and
    deliberately unpushed; the merged snapshot carries the identical commit, so nothing is at
    risk. **It is a candidate for deletion**, but that is Mike's call and needs its own approval.

- <a id="startup-blind-to-other-machine"></a>✅ **P1 · PROCESS — `/startup` reported "0 behind master" while this machine
  was running a two-day-stale Firm Manager hub. The check is structurally blind to the other
  machine's unmerged branch. CLOSED 2026-08-02 (laptop, Session 26, `7ab696e`, Mike-approved) —
  see the DONE bullet at the foot of this entry.** Found 2026-08-01 by Mike, who opened the hub and
  could not find work the laptop had finished.
  - **The evidence.** `npm run check:branch` measures `HEAD` against `origin/master` only. On the
    morning of 2026-08-01 the desktop was **0 behind `master`** — genuinely true — while
    `origin/feat/advisor-progress` sat **82 commits ahead of `master`**, unmerged. Both branches had
    split from `b3b6ad6` (PR #27, 2026-07-30) and had not met since. The desktop was therefore
    up to date with the *shared* code and two days behind the *actual* work, with a green light saying
    so.
  - **Why this is the Agreement's own failure mode, one level up.** `WORKING-AGREEMENT.md` was written
    because UAT ran 97 commits behind and nothing said "this version is ready, take it." The same gap
    exists between the two machines: a branch that is pushed but not PR'd is invisible to the other
    division, and the start-of-session check reports green throughout.
  - **Not fixed by merging more often** — the laptop had pushed correctly and the desktop had merged
    `master` correctly. Both followed the rules. What is missing is a *report*: at minimum,
    `check:branch` naming any other `feat/*` branch that is ahead of `master`, and how far. That is a
    read-only addition to an existing script, not a new mechanism.
  - **Resolved for today** by PR #28 (`c47e369`) and the merge into this branch (`a235a71`), but the
    blind spot is unchanged and will recur on the next divergence.
  - 🔴 **IT RECURRED, AS PREDICTED, AND THE FOURTH INSTANCE WAS THE AI'S.** 2026-08-02, Session 26:
    asked what to work on, the AI recommended the trigger-vocabulary sweep and the Trigger
    Workbench — **twice** — from `ACTIONS.md` and the code on this branch, both of which say the
    Workbench is a component at the foot of the Logic Tables tab. Mike: *"you are out of date — it
    has its own page and is called logic lab and is being worked on by desktop computer."* Neither
    the records nor the code on this side could show that, because the work is on
    `feat/firm-quiz-builder-ui` and has never reached `master`. **The blind spot does not only
    mislead a person about their own branch — it makes every recommendation drawn from the shared
    records potentially stale, with nothing saying which parts.**
  - ✅ **BUILT 2026-08-02 (laptop, Session 26, `7ab696e`, Mike-approved).**
    [`scripts/branch-survey.js`](../scripts/branch-survey.js) + 3 calls in
    [`check-branch-state.js`](../scripts/check-branch-state.js), covered by 20 tests in
    [`branchSurvey.test.js`](../tests/unit/branchSurvey.test.js). Suite 3,984 → **4,004 green /
    240 suites**, lint 0 errors. Live output on the very run that shipped it:
    `feat/firm-quiz-builder-ui   4 ahead, 75 behind master — last commit 2026-08-02`.
    - **It is SILENT when every branch is merged.** A block printing "all clear" on every run is
      scrolled past, and then the run that matters is scrolled past with it.
    - **`release/*` snapshots are excluded.** They are frozen copies cut for a PR and deliberately
      never merged back, so they are permanently ahead of `master` **by design** — reporting them
      would be noise on every run, and noise is how a report dies.
    - 🔴 **IT CANNOT BLOCK A PUSH, STRUCTURALLY RATHER THAN BY PROMISE** — its own try/catch, no
      exit code, and **its own separate fetch**. `check-branch-state` fetches `master` alone for
      rule 1; if the wider fetch fails the survey goes quiet rather than degrading that rule into
      "unverified". A test pins that it asks git *nothing else* on that path. Another machine's
      branch is never a reason to refuse this machine's work.
    - ⚠ **A DEFECT CAUGHT IN THE NEW CODE BEFORE IT WAS WIRED IN:** the counts were taken against
      the **local** `master`, which in this repo is reached by pull request and can be weeks stale
      or absent entirely. Every number would have been quietly wrong — the exact failure class this
      item exists for, reproduced inside its own fix. Now `origin/master`, pinned by a test that
      fails if it is changed back.
    - **`check-branch-state.js` had NO test of any kind, and that is part of why this survived four
      sightings — there was nothing to add a case to.** The git calls now sit behind an injected
      runner, so the whole path *including the fetch-failed route* is pinned without a sandbox repo.
    - ⚠ **What it still does NOT do.** It reports branches, not screens: it can say
      *"the desktop has 4 unmerged commits"*, never *"the Workbench you are about to describe is now
      the Logic Lab."* A record drawn from this side can still be stale in its details — the survey
      tells you to go and ask, which is the honest limit of what a branch count can know.

- <a id="hook-tests-worktree-not-commit"></a>✅ **P1 · PROCESS — the pre-commit hook validates the
  WORKING TREE, not what is being committed. A half-staged change passed all three gates and was
  committed red. CLOSED 2026-08-02 (laptop, Session 25, `a76b3e2`) — see the DONE bullet at the
  foot of this entry.** Found 2026-08-02 (laptop, Session 24) by the AI, on its own mistake, while
  verifying the report-programme merge commit.
  - **What happened.** `design/CONTENT-ROUTING.md` and `tests/unit/componentStyles.test.js` were
    already staged **by the merge** (as files arriving from `master`). Both were then edited to fix
    the merge's failures, and only a third file was `git add`-ed. `.husky/pre-commit` ran ESLint,
    the full 3,955-test suite and the audit gate — **all genuinely green, none of them testing the
    commit.** Commit `741eb5c` therefore shipped with the OLD regex and the STALE routing map while
    reporting a clean run. Caught by diffing the committed blob against the working tree; fixed by
    amending (nothing had been pushed) to `033657d`.
  - **Why this is the project's own recurring shape, one level down.** It is the same defect as the
    CSS guard found the same hour, and as the 2026-07-31 `nuxt build` failure that "shipped green":
    **a check that reports on something adjacent to the thing you care about.** Three gates, all
    honest, all pointed one inch to the left of the artefact.
  - **Not fixed by being more careful.** The hook is silent about the gap and there is no signal at
    the moment of commit. **The proposed control (needs its own approval, NOT built):** have
    `pre-commit` refuse when a tracked file has unstaged modifications — that does not test the
    commit either, but it *forces* working tree ≡ commit contents, which makes the three gates it
    already runs actually mean what they claim. Cheap, read-only, no stashing (a stash that fails
    mid-hook can lose work, which is a worse trade).
  - ~~⚠ **Until it exists, the rule is manual: `git status` before committing, and after any commit
    that fixes a merge, diff the COMMITTED blob — not the working tree — for each file you changed.**~~
    *(Superseded 2026-08-02 — the control exists; the manual rule is no longer the only defence.)*
  - ✅ **BUILT 2026-08-02 (laptop, Session 25, `a76b3e2`, Mike-approved).**
    [`scripts/check-staged-tree.js`](../scripts/check-staged-tree.js) refuses a commit while a
    tracked file has unstaged edits, wired into [`.husky/pre-commit`](../.husky/pre-commit) as
    **gate 0**. Tests in [`checkStagedTree.test.js`](../tests/unit/checkStagedTree.test.js). Suite
    3,984 green / 239 suites, lint 0 errors.
    - **It does not test the commit either, and says so rather than overclaiming.** It forces
      *working tree ≡ commit contents*, which is what makes the three gates already running mean
      what they claim.
    - **Runs FIRST** — a refusal costs a second rather than a full 3,984-test suite.
    - **No stashing inside the hook**, as proposed: a stash that fails mid-hook can lose work.
    - ⚠ **The closure itself went unrecorded for a session.** This entry read ☐ open while the fix
      ran on every commit, until Session 26's `/startup` caught it. **A commit closes a task in the
      code, not in this file, and nothing in the toolchain notices the difference** — the same
      "record pointing one inch to the left of the artefact" shape as the defect above. See
      [`SESSION-2026-08-02-B-NOTES.md`](SESSION-2026-08-02-B-NOTES.md).

- <a id="cross-branch-rule-collision"></a>☐ **P2 · DOC — a rule introduced on one machine collides with
  rows added on the other, and only surfaces at merge.** Found 2026-08-01 while merging PR #28; fixed
  in the same commit (`a235a71`).
  - 🔴 **THREE MORE INSTANCES 2026-08-02, all in ONE merge — this is now a pattern, not an
    anecdote.** The report-programme merge hit the routing-map count, the CSS style-block guard, and
    the `server/report/` coverage threshold ([`stranded-report-programme`](#stranded-report-programme)).
    Every one was a rule written on `master` meeting files written on the stale branch; every one was
    green on both branches alone and failed only once merged. **The cost scales with how long the
    branches stay apart** — this branch had been separated for two weeks and produced three; the
    2026-08-01 merge had been separated two days and produced one.
  - **What happened.** The laptop's `79de6d9` gave all 181 domain-support material rows a permanent
    `id` and locked the list in [`domainSupportRowIds.test.js`](../tests/unit/domainSupportRowIds.test.js) —
    correctly, because firm overrides key off the id, and keying off a title means a rename silently
    discards a firm's saved choices. Meanwhile the desktop's `7ae8b31` and siblings transcribed 13 new
    material rows (strategy 9, staff 2, sales-marketing 2) on a branch where that rule did not exist.
    Neither side was wrong. The suite was green on both branches and failed only once merged.
  - **The fix was purely additive:** 13 ids written by hand following the convention the other 168
    rows use, added to `LOCKED_IDS`. No existing id changed, so no firm's saved choices could break —
    and none exist yet anyway. Suite 3,652 green / 221 suites.
  - **Why it is logged rather than closed.** The laptop deliberately did **not** commit its id
    generator (a committed migration script was judged a hazard here — see `migrate-ghost-references.js`,
    which deleted what it could not resolve). So the next batch of rows written on either machine will
    hit exactly this again, and the convention lives only in the data and this note. Any future rule of
    the form "every row of X needs a Y" carries the same trap while both machines edit X.

- <a id="workbench-placement"></a>☐ **P2 · DECISION (Mike) — the trigger workbench is on the screen but
  could not be found.** Found 2026-08-01 by Mike, who went looking for the phrase work after the merge
  and reported seeing only the laptop's changes.
  - **Not a defect — a placement question.** The component is present and unconditionally rendered:
    [`FirmLogicTables.vue`](../components/firm/FirmLogicTables.vue) L218 renders `firm-trigger-workbench`
    outside the `v-if`/`v-else`, and [`FirmManagerHub.vue`](../components/FirmManagerHub.vue) L27 renders
    the Logic Tables tab. Nothing was lost in the merge.
  - **Where it sits:** the bottom of the Logic Tables tab, below the table list, the branch editor and
    the "Earlier versions" history — a long scroll past content most sessions will not touch.
  - **The placement was deliberate** (§0.6 rules the hub to two content tabs, and the workbench is about
    those tables' trigger phrases), so this is not a matter of correcting an oversight. But a feature the
    owner cannot locate on the screen it lives on fails the standard in memory
    `feedback-avoid-map-shock`: functional, logical *and* findable.
  - **◐ SUPERSEDED 2026-08-02, not answered — and that is the right outcome.** Mike's response to the
    placement question was that moving the workbench does not address what he actually asked for: the
    workbench was built in place of a read-only page showing all the pathways that decide a template. So
    the workbench becomes the **"test a change" section of the [Decision Logic page](#decision-logic-page)**
    and the placement question dissolves rather than needing a ruling. **Still true and still outstanding:
    nobody has ever looked at it** — it is now in `master`, at the bottom of the Logic Tables tab, and what
    Mike makes of it shapes how that section of the new page should behave.
  - *(Original question, kept for the record: whether it moves above the version history, gets its own tab
    despite §0.6, or is reached some other way. Any label is the firm's decision, never the AI's.)*

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
  - **✅ ANSWERED 2026-08-02 (Mike): it becomes a visible screen** — this report is the raw material for
    the [Decision Logic page](#decision-logic-page), not a developer-only artefact. It does **not** ship as
    it stands: the screen shows only the deliberately-editable blocks (the IP boundary), and it must read
    the **firm's own** resolved configuration rather than the platform files this report reads off disk.
    The generated report stays as the governance record that keeps the classification honest.

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
  - **✅ STEP 2 — THE SCREEN. BUILT 2026-08-01 (wording approved by Mike first, this branch, commit
    `c440101`). Full suite 2,145 green / 142 suites, lint 0 errors.**
    - [`components/firm/FirmTriggerWorkbench.vue`](../components/firm/FirmTriggerWorkbench.vue) —
      *"Try a sentence"* and *"Try a wording change"*, mounted **inside the Logic Tables tab, not a
      third tab** (§0.6 rules the hub to two). The sentence half renders with no table open, because
      it asks about the whole engine; the change half needs one, because a proposal is always about a
      single table. 34 locale keys, en-only with `fallbackLocale: 'en'`, matching every sibling tab.
    - **No table id ever reaches the screen.** The preview route names the table a conversation was
      TAKEN FROM by its internal id (`succession_planning`); `nameFor()` resolves it against the
      parent's list, and a test fails if the raw key leaks.
    - **`notMeasured` and `corpusLimit` print the SERVER's wording**, not a locale copy — the API owns
      those strings so every surface states the same limit. A preview is discarded when the parent
      opens a different table, so one table's consequences can never be read against another. One test
      pins that the component issues **only** the two read-only routes.
    - **⚠ NOT VERIFIED BY EYE.** The suite proves what renders and which calls are made; it cannot see
      a screen, and nobody has looked at this. To check: **Firm Manager → Logic Tables**, both with no
      table selected and with one open.

- <a id="workbench-winner-wording"></a>☐ **P3 · DECISION (Mike) — the workbench lists every table a
  sentence opens, but does not say which one the engine acts on.** Raised and deliberately left unbuilt
  2026-08-01 while building the screen above.
  - **The fact it needs to convey.** Production walks **every** table scoring ≥1
    ([`advisorEngine.js`](../server/advisorEngine.js) L2383) but one is the winner (`topTable`). The
    screen lists them strongest-first, which is true but not self-explanatory — a reader cannot tell
    the first row is different in kind.
  - **Not guessed.** The approved mockup carried no wording for this distinction, and a label naming how
    the firm's own engine chooses is the firm's language (CLAUDE.md — confirm wording, never invent).
    The payload already carries `topTable`, so this is wording only, not new measurement.

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
      distinction match is an AI judgement that varies between runs, so a single run is a **sample**, not
      the deterministic before/after the logic-table preview gives. The answer to that is repetition —
      run it enough times to tell a real move from a flaky one — never skipping the live run.
  - **🔴 COST IS NOT A REASON TO SKIP A LIVE AI RUN (ruling, Mike, 2026-08-02).** Where live AI is what
    proves the thing, it runs. Token spend is never weighed against the correctness of a measurement, an
    AI-off run is never quietly substituted for a real one, and "shall I spend the tokens?" is not a
    question to put to Mike. An earlier version of this entry treated per-run API spend as a design
    constraint; **Mike never set that constraint**, and it had by then undermined three pieces of work by
    presenting a deterministic run as if it were the answer.
    - **Measured the same day, which is why this is stated so bluntly.** With the AI layer OFF, the
      firm-editable levers appeared to change the top recommendation in **16%** of the 51 Scenario Lab
      cases and to supply **4.9%** of the winning template's score. With the AI layer ON — the real engine —
      it is **59%** and **37.5%**. The cheap run was wrong by nearly a factor of four, and wrong in the
      direction that makes the firm's own editing work look worthless. A design decision was about to be
      taken on that number.
    - The measurement scripts stay uncommitted because they are one-off scratchpad runs, never because a
      run costs anything.

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

- <a id="collaborate-merge"></a>☐ **NEW WORKSTREAM RULED 2026-07-30 (Mike) — merge the Advisor
  Collaborate app into this repo and surface its manager console as a Firm Manager Hub tab.**
  Full plan: [`COLLABORATE-MERGE-PLAN.md`](COLLABORATE-MERGE-PLAN.md). Collaborate is a
  **separate repository** (`advisor-e/Colab`, laptop path `C:\Users\mb\Projects\Advisor
  Collaborate`) — 38 suites / 431 tests / 99.72% line coverage, same locked stack (Nuxt 2.14.0,
  Restify 9.1.0, Node 14.15, Buefy, vue-i18n 8), same `config/integration.js → AUTH` login seam.
  Mike's framing: Virt Advisor is the container for **three** features — performance reports,
  the AI section, and Collaborate — pulled through by the master team as one repo.
  - **Scope finding:** the manager page **cannot travel alone** — three of its six endpoints are
    group routes, and it reads advisers, approvals, the activity feed and the audit log. The job
    is *merge the app, then surface its page as a tab*, not *move one component*.
  - 🔴 **RULED — the 5-level cascade is built in PROPERLY, now; firm-as-top is not carried
    forward.** Mentor → global group manager → group manager → firm manager → adviser
    (pass-through) → client; documents clone DOWN, reporting rolls UP, every tier is the same
    screen re-scoped. *Curator and coach do not clone documents and sit outside the chain.*
    **The half-measure of confining tiers to one tab, or logging the seams for the master team,
    was offered, rejected, and must never be re-proposed** (one-directional rule).
  - **Why now is the cheapest it will ever be: there is NO DATA TO MIGRATE.** MySQL has never
    been provisioned, so no override row exists anywhere. Re-keying
    `firm_framework_versions` from `(firm_id, config_key)` to `(scope_level, scope_id,
    config_key)` is a schema edit today and a live migration of a firm's authored content later.
  - **The truncation is concentrated — ~6 functions + 1 table**, read not guessed: the 5
    `firmOverlay.js` functions, `firmContent.js`'s loader, `mergeEntry` (2-arg merge → fold over
    the chain), `firmAuth`, and the table above. `deepMerge` already generalises.
  - **Collaborate has ALREADY built the self-similar tier console** — one component for all four
    manager tiers, production serving every tier from one role-gated page, roll-up tree for
    higher tiers, per-tier stat tiles, scope re-derived server-side each request. No stubs needed
    there; the room to make is in **this** repo's tabs.
  - ✅ **View-as ruled NOT a significant risk (Mike)** — the adviser generates and submits their
    own CPD report, so they are the check. Offered and still open: stamp each claim with who was
    signed in, so a stray entry can be explained rather than argued about.
  - **Acceptance test for the storage change: a firm-level user's behaviour must be
    byte-identical.** The existing tabs' tests are the safety net; any passing a bare `firmId`
    around must be READ, not just made to compile.
  - 🔵 **ENTRY POINTS IN THE MASTER APP (Mike, 2026-07-30) — this repo surfaces at THREE
    places inside Advisor-e, and slice 4 depends on it.** Firm manager clicks a page called
    **"Manage AI Coach"**, and *that* is what opens the Firm Manager Hub. The adviser reaches
    most adviser-level features from a head-banner button called **"AI help"**, and the
    performance-reporting screens (built at client level) from a second head-banner button
    called **"Performance Reports"**. So a Hub tab is never its own URL — it is reached through
    "Manage AI Coach" — and the AI section and the reports are *different buttons at different
    levels*, not one navigation surface.
  - ✅ **SLICE 1 BUILT 2026-07-30 (approved by Mike, laptop, branch `feat/advisor-progress`) —
    Collaborate's code is in this repo, namespaced, inert, and proven.**
    **86 new files; exactly ONE existing file of ours modified (`.gitignore`, approved — see
    below); this entry is the record, not part of the change.**
    Suites: **186 / 2,837 green** — our 148 / 2,406 unchanged and their 38 / 431 intact, both
    totals whole. Lint **0 errors** (10 warnings from the landed code, 9 of them `no-console`,
    which this repo sets to warn). Landing map: `components/collaborate/` (8 components),
    `components/collaborate/screens/` (14 pages), `mixins/collaborate/`, `server/collaborate/`
    (16 files), `config|data|locales|scripts|server-middleware|tests /collaborate/`.
    - ⚠ **THE REAL TRAP, and it would have been SILENT: the `~/` alias.** Collaborate's
      components import `~/mixins/speechMixin`, `~/mixins/localeMixin` and `~/data/languages`
      — and **this repo has a file at all three of those paths.** `~` resolves from the repo
      root, so left unrewritten their components would have quietly bound to *our* mixins and
      *our* `data/languages.json` (ours is `.json`, theirs `.js`; jest resolves `.js` first) and
      the tests would still have gone green against the wrong code. All 15 alias references are
      namespaced and verified — `grep` for any `~/…` in the landed tree not going via
      `/collaborate/` must return nothing. **Anyone landing more of this app must re-run that
      check.** By contrast the paths that *broke* (a missed `config/integration` hop in
      `routes/people.js`) threw immediately — loud beats silent, and only the alias class is
      dangerous.
    - **Their 14 pages landed as COMPONENTS (`components/collaborate/screens/`), not under
      `pages/`** — deliberate: Nuxt auto-routes everything in `pages/`, and slice 1 must add no
      reachable URL to an app already deployed in UAT. The entry-point note above makes this
      the permanent answer, not just a slice-1 precaution: the console is reached through
      "Manage AI Coach", so it should never own a URL. Reversible in slice 4 by moving files.
    - **`.gitignore` gained one exception line**, the single edit to one of our files.
      `search_content_*.json` (line 37) has **no folder anchor**, so Collaborate's tracked
      337 KB template snapshot — which its 17 marketplace tests cannot run without — would have
      been **invisible to git anywhere in this repo**: green on the laptop that copied it in,
      missing on the desktop and in CI. Same class as the gitignored-export/worktree trap
      recorded at §PR-24 above. The JSON is byte-identical and was never edited (CLAUDE.md's
      hard rule); only `advisoryTemplates.js`'s own `SNAPSHOT` path constant — which its header
      documents as a seam meant to be repointed — was changed.
    - **Nothing is wired: no Restify route registered, no menu entry, the locale file not
      connected, no page reachable.** As designed — and therefore **none of slice 1 is provable
      by eye, only by the suites** (plan §6 risk 4). Say so rather than implying a working
      screen.
    - **No npm install was needed.** Every test-relevant package is at an **identical** version
      in both repos (jest, babel-jest, @vue/test-utils 1.3.6, @vue/vue2-jest 27.0.0, vue,
      vue-i18n, jsonwebtoken, mysql2, restify, nuxt, buefy, pug, vuex). Collaborate's only three
      extra dev dependencies are Playwright, markdownlint and a webpack plugin — so **its 2
      browser end-to-end tests did NOT come across**; that is the one part of its safety net
      still outside this repo.
    - ✅ **Cross-machine: still no contact with the desktop's ground.** The desktop's active
      files (`firmManager.js`, `components/firm/*`, `data/*-domain-support.json`) are untouched;
      slice 1's only shared-file edit is `.gitignore`, which the desktop has not touched.
      **Slices 2–3 remain the collision — whoever starts slice 2 says so first.**
      - 🔴 **SLICE 2 WAS DONE 2026-08-01 (laptop) AND THE COLLISION IS NOW REAL:
        `server/restify-server.js` and `config/integration.js` were both edited.** The desktop
        must merge `master` before touching either. Full record: Session 21 below. Slice 3 (the
        storage re-key) is still unstarted and still the other half of this warning.
    - ⚠ **SLICE 2 GAINED A NEW READER 2026-07-31 (`cb6d43c`) — `server/utils/staircaseConfig.js`
      reads `firm_framework_versions` via `loadFirmConfig(firmId, 'advisory-staircase')`, so it
      is one of the surfaces the `(scope_level, scope_id, config_key)` re-key must make
      level-aware.** It is small — a single call inside one function — but it is a *new* one,
      added after the collision list above was written, and it has **two** callers (the engine's
      complexity ceiling and `GET /api/advisor/staircase`), which is the whole point of it.
  - 🔴 **RULED 2026-07-30 (Mike, laptop) — THE ADVISORY DISTINCTIONS MECHANISM IS THE SINGLE
    FIRM-EDITABLE MECHANISM EVERYWHERE.** *"Domain support, logic tables, quizzes, everything
    that's at firm manager level should be following the same mechanism pattern."* This
    supersedes the per-feature approach each tab was built with.
    - **What "the mechanism" means:** a level may **decline** a row it inherited, **override**
      one, or **add its own**; when the level above changes a row this level had edited, it is
      **offered** the update (*Mentor updated this → Adopt / Keep mine*) rather than having it
      imposed; a delete above leaves the customising level keeping theirs. Version history and
      restore already ride the same store for free.
    - **Inventory taken before ruling — 1 rich, 6 plain.** Rich: **Advisory Distinctions**
      (`resolveDistinctions.js`). Plain merge/overlay, all to be brought up: **Domain Support**,
      **Logic Tables**, **Quizzes**, **Advisory Staircase**, **coaching reference**, **Currency**.
    - ⚠ **Currency is the one deliberate exception.** The pattern is for *a list of rows
      inherited from above*; currency is a single setting, where "switch this row off" and "add
      your own" are meaningless. Forcing it there is cargo-cult, not consistency. Left alone.
    - 🔴 **THIS DOCUMENT'S §4 AND §4.4 CONTRADICT EACH OTHER, AND §4.4 IS THE WRONG HALF.** §4
      says a document *"clones down through each level"*; §4.4 says `mergeEntry` becomes *"a
      fold over the chain"*. Those are different architectures, and a plan built off §4.4 was
      proposed to Mike before he caught it. **The resolved model is neither pure clone nor pure
      layer — it is what Distinctions already does:** a row nobody has touched stays current
      with the mentor's edits automatically, and any row a level *has* edited is protected, with
      the mentor's update offered. Clone-like protection where it matters, automatic freshness
      where it does not. See the correction note now in the plan's §4.4.
    - 🔴 **OWNERSHIP CORRECTED — LOGIN, ROLES AND THE HIERARCHY ARE ADVISORY.COM'S, NOT OURS**
      (Mike, 2026-07-30): *"There is no separate login for virtual adviser… all of the
      hierarchy, all of the authentication and login is driven via the master app."* `firmAuth.js`
      is a **reader**, not a login — it verifies a token Advisory already issued and lifts claims
      out of it. **Never invent role-value names here**; a constant with a TODO for the master
      team is the correct shape, exactly as `AUTH.mentorRole` already does. This is the
      2026-06-26 [`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md) position,
      which is clearer than slice 2's wording and wins: the four middle roles *"have no distinct
      functionality in this app"* and all operate it as a Firm Manager.
      **Consequence: the old slice 2 all but disappears** — it collapses to stamping `groupId` /
      `globalId` when Advisory begins sending them, which is meaningless until something consumes
      them. It is not a slice; it is two lines inside the storage work.
    - **SEQUENCING RULED: unify the mechanism at two levels FIRST, then add the middle levels
      once.** This reverses the storage-first order proposed earlier the same session. Extending
      **one** mechanism to five levels is far less work than extending seven and merging them
      afterwards. Both the mechanism change and the scope re-key are cheap **only while no firm
      has saved content** — which is still true today, and is the whole timing argument.
    - ✅ **STEP 1 DONE — `79de6d9`: 181 stable ids across the 29 domain-support files.** The
      mechanism keys a firm's decisions to a row **id**; Domain Support rows had none, so
      identity was the `name`. Keying on a title means a retitle silently discards a firm's
      choices and a switched-off row quietly returns — no error, no warning, and not
      hypothetical (five titles were retitled upstream the week before). Proven byte-identical
      to the AI: all three prompt surfaces × 29 domains, same SHA-256 before and after.
      `tests/unit/domainSupportRowIds.test.js` locks all 181 and was **proven to fail** before
      being trusted.
    - ✅ **STEP 2 DONE — `51b77a5`: 15 `cr-` ids on the platform coaching reference.** The same
      defect and the same fix as Domain Support. **The `cr-` prefix is not decoration:** a
      firm's own PROMOTED coaching entries live under the *same* firmOverlay config key
      (`coaching-reference`) and already carry ids — but **numbers**, assigned by
      `appendFirmCoachingEntry`. Two id systems under one key is how a collision arrives later;
      the prefix keeps them permanently apart. Proven byte-identical to the AI (SHA-256 of the
      rendered coaching block, 8,483 chars, unchanged), and
      `tests/unit/coachingReferenceRowIds.test.js` locks the id set **and the row count**, so a
      16th entry cannot be committed without an id.
    - ✅ **ROW-ID READINESS OF THE OTHER FIVE BLOCKS — CHECKED, NOT ASSUMED (2026-07-30).** The
      mechanism cannot be adopted by a block whose rows have no stable identity. Read from the
      data, not inferred:

      | Block | Row identity today | Verdict |
      |---|---|---|
      | Advisory Distinctions | `pd-N` stable ids | ✅ the reference implementation |
      | Domain Support | 181 ids added today (`79de6d9`) | ✅ done |
      | **Logic Tables** | **381 rows** carry `id` — 356 graph `nodes` + **25 `flat_if_then` `branches` the first count missed** — 0 missing, unique within tree | ✅ ready, and **now ENFORCED** (`0a2534d`) |
      | **Quizzes** | questions carry `id` (0 missing) — but a **bank** is keyed by template **title** | ⚠ ready at question level only |
      | **Advisory Staircase** | 5 `as-` ids added 2026-07-31 (`221e18c`) | ✅ **done — the last of the four** |
      | **Coaching reference** | 15 `cr-` ids added 2026-07-31 (`51b77a5`) | ✅ **done** |

      - 🔴 **QUIZZES NEEDS A MIKE RULING, NOT A PATCH — title-as-identity is DELIBERATE there.**
        `quizBankKeys.test.js` **fails any bank key that is not an exact template title**, and PR
        #27 turned on exactly this: `"Board 6 Hats"` could not become its own bank because past
        that gate both keys canonicalise to `6 Hats` and `findQuizBank` keeps only the first. So
        a bank's identity is its title *on purpose*, locked by a test someone wrote knowingly.
        Adding a bank id collides with that decision. **Do not "fix" it unilaterally.**
      - ✅ **Coaching reference — DONE 2026-07-31 (`51b77a5`), see step 2 above.**
      - ✅ **ADVISORY STAIRCASE — DONE 2026-07-31 (`221e18c`). THE LAST OF THE FOUR; the family
        is closed** (domain support · coaching reference · firm-added logic rows · staircase).
        5 `as-` ids + `advisoryStaircaseRowIds.test.js`, which also **refuses an id that is
        merely a position wearing a new hat** (`3`, `step-3`, `as-3`) and locks the row count.
        - ⚠ **BE HONEST ABOUT WHAT THE IDS DO TODAY: nothing at runtime.** The advisor's answer
          travels as chat text ("Step 3: Interpretation — …") and carries no id, so the ids
          exist for the cascade to hang a decline/override off, exactly as `pd-N` does. Wiring
          an id through the answer is cascade work, not a loose end to tidy.
        - **The safety gain came from `resolveStaircaseStep`, not the ids** — the engine used to
          take the position number out of the answer and trust it, so a reordered staircase
          silently re-pointed every stored answer at a different ceiling. It now resolves by
          **name first, position second**, so a step that moves but keeps its name still
          resolves correctly. A hardcoded `/Step ([1-5])/` went with it: a sixth step had been
          silently unreadable.
        - **Known limit, stated in-code:** a step both *renamed and moved* still resolves by
          position. No rule can recover it from that text — only an id travelling with the
          answer can, which is the cascade.
      - ⚠ **STILL OPEN: Quizzes, unchanged.** **Not a defect to patch** — title-as-identity is
        deliberate there and locked by `quizBankKeys.test.js`. **It needs Mike's ruling, not a
        fix.** It is now the only one of the six blocks not ready.
      - ✅ **FIXED 2026-07-31 (`5a3de15` + `8ec9973`) — A FIRM'S STAIRCASE OVERRIDE REPLACED THE
        WHOLE `steps` ARRAY, so a firm that had customised it would never have seen a step the
        platform later adds.** Logged the same morning and deliberately left for the mechanism
        rather than bolted on ahead of it — which is exactly how it was closed: the staircase is
        the **first block onto the shared mechanism**, so the fix and the workstream are the same
        change. `deepMerge` is gone from the blend; a step the firm has not touched now stays
        current with Advisor-e automatically. See Session 13 below.
  - ☐ **NEW 2026-07-30 — THIS APP'S OWN REPORTING HAS NO ROLL-UP ABOVE THE FIRM, and it is
    listed as a job nowhere.** Mike, same session: reporting cascades **up** — adviser actions
    summarise to the firm manager, then group, global, mentor; *"every tier is the same screen,
    re-scoped"*. Collaborate's **people** roll-up is built and tested (`ConsoleNode.vue`, lazy
    per-node loading). **Ours is not:** `activity.js`'s team-overview route is firm-manager gated
    and firm-scoped, as are Team Progress and the CPD screens. **Design note that makes this
    cheaper than it sounds: up and down are not mirror images.** Down = clones, which must be
    stored (hence the scope columns). **Up = summaries computed at read time — no new table, no
    stored copies, and a summary of summaries, not a re-count of every adviser.** The one real
    trap is performance: built naively, a mentor opening the screen pulls every adviser on the
    platform. Collaborate already solved exactly that; copy it rather than rediscover it.
  - ✅ **P2 · TEST — Collaborate's coverage gates DID come across. CLOSED (stale row corrected
    2026-07-31).** This row said the landed Collaborate code was ungated and asked for
    `collectCoverageFrom` + `coverageThreshold` to be extended to it. That was done on
    2026-07-30 in the same rebuild that re-based the whole coverage config: `jest.config.js`
    now collects from `server/**` (reaching `server/collaborate/**`) and carries four
    Collaborate buckets plus the three 100% utils — see its own comment explaining that the
    numbers are a **re-partition** of Collaborate's `global: 88/78/88/88`, not a relaxation of
    it. **Found by reading `jest.config.js` rather than trusting this row** — the standing rule
    at the top of this file ("trust the CODE, not these flags") earning its place again.
  - ☐ **P3 · WIRE — repo plumbing now exists twice, deliberately.** Two `audit-gate.js`, two
    `restify-server.js`, two `db-schema.sql`, two `config/integration.js`, and two each of
    `sanitiseInput.js` / `sendError.js` / `validateAIResponse.js` (`health.js` and `db.js` were
    byte-identical, so those are honest duplicates of nothing). Reconciling them means editing
    our copies, which slice 1 was scoped to avoid — and `integration.js` + `db-schema.sql` are
    auth/storage surfaces that slices 2–3 rewrite anyway. **Do not merge them ad hoc**; fold
    into slice 2 (identity/scope) and slice 3 (storage) where each pair is being rewritten with
    tests around it. Plan §6 risk 2.
- <a id="cpd-pdf-export"></a>✅ **DONE 2026-08-02 (laptop, `773809e`) — the CPD record exports as a
  PDF, as a full statement rather than a screen print.** Mike chose the fuller of two options:
  not "print what is on screen" but a document a professional body can accept.
  - **The screen was missing both things such a body needs, and both were already in the system.**
    `GET /api/activity/cpd` never returned the advisor's name (`req.advisorName` has existed on
    the verified pass all along, and two other routes in that same file already returned it), and
    the screen never displayed the claim dates it was already being sent. One line of backend.
  - **Standing claims only, dated, oldest first.** A withdrawn claim stays on screen as history
    but is off the statement — the printed total counts standing claims only, so listing it would
    contradict the figure above it.
  - **The name is never invented.** Null name → the advisor id is printed, per the house rule in
    `firmAuth.js`. ⚠ **An id where a name should be is poor on a submitted document — whether the
    real Advisor-e token carries a name claim is a question for the master team**, not fixable here.
  - **The Download button is withheld until something stands.** A statement listing nothing still
    carries a heading, a name and a total of zero, which reads as a claim of no CPD rather than
    the blank page it is.
  - The date is stamped **at the press**, not at load — a record left open overnight must not
    print yesterday's date on a document submitted today.
  - 18 tests (3 route, 15 component). ⚠ **Layout unverified by eye** — see the print item below.
  - *Original entry follows for the record:* **the CPD record must be exportable as a
  PDF**, because the adviser sends it to their accounting society. **Its own task, NOT part of
  the Collaborate merge.** Groundwork already checked: this app needs **no PDF dependency** —
  six screens (Business Performance, Debtor Drag, Margin Breakeven, EBITDA-DCF, Quick Position,
  Course Builder) already export via `window.print()` behind a Download button plus an
  `@media print` stylesheet, and `MarginBreakevenReport.vue` names its method `downloadPdf()`.
  Following that pattern avoids a real PDF library, which would be a fight on locked Node 14.15
  (most need Node 18+), and satisfies memory `mike-scope-instructions` — match the section,
  don't invent a new look. ⚠ **Honest limit:** the browser makes the PDF and the adviser saves it, so
  there is no server-side copy of what was sent and layout depends on their browser. If the
  society ever needs a document the firm can vouch for independently, that is a much bigger job.

- <a id="scoped-print-rules-inert"></a>✅ **FOUND AND FIXED 2026-08-02 (laptop, `e30ac33`) — the course
  certificate's print rule had NEVER run, and printing one produced the entire Course Builder
  screen.** Found while looking for a pattern to copy for the CPD statement above — the precedent
  turned out to be broken, which is the only reason it was caught.
  - **The mechanism.** The rules sat in `<style scoped>`, so Vue rewrote `body > *` to
    `body > *[data-v-hash]`. Nuxt's own page wrapper carries no such attribute, so the rule matched
    nothing and hid nothing. **Verified by compiling it** with `@vue/component-compiler-utils`, not
    by reading it — the output selector is the proof.
  - **Why nothing failed.** The damage is in what the CSS *compiles to*, not in what the component
    renders, and jsdom has no print pipeline. **No mount test could have caught it** — the same
    class as the report-header geometry bug that `reportHeaderFullWidth` exists for.
  - **The fix is a second, deliberately unscoped block** gated behind a body class added for the
    duration of the press only, so an ordinary Ctrl+P elsewhere is untouched. `visibility` rather
    than `display`, because display:none on an ancestor cannot be undone further down and the
    certificate is nested several levels deep.
  - 🔴 **The control, not the note: [`tests/unit/scopedStylesCannotReachOutside.test.js`](../tests/unit/scopedStylesCannotReachOutside.test.js)
    fails the build if any component puts a `body`/`html`-reaching rule in a scoped block again.**
    It is fed the exact rule that shipped broken and required to catch it — a guard that cannot
    fail is decoration — and pinned against false alarms, which a naive version raises 19 times on
    names like `.cert-body`. Repo swept: **CourseBuilder was the only instance.**
  - **The same weakness was then found in the CPD statement committed an hour earlier** and fixed in
    both: a `visibility: hidden` element still occupies its space, so the screen above would have
    pushed out pages of blank paper behind the printed page.
  - ⚠ **NEITHER PRINTED PAGE HAS BEEN SEEN BY A HUMAN.** The tests prove what is on the page and
    that the isolation is applied and released; they cannot see a layout or count sheets of paper.
    **Two print previews are outstanding** — My Progress → Download PDF, and Course Builder →
    Download certificate → Print. Per the Working Agreement, verification only a human can perform
    is named as such and the work is not described as verified until someone has looked.

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
  - ☐ **OWNER REVIEW — the 18 rows still needing Mike's eye are listed in
    [`DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`](DOMAIN-SUPPORT-REVIEW-CHECKLIST.md)** (laptop,
    2026-07-30). Counted from the data files themselves, not from notes: **165 of the 181 rows
    have all four columns filled.** The 18 are 16 blank Step-by-step cells (all in
    `sales-marketing`, deliberately — the source carries no method) and the 2 unsourced
    `org-board-pack` rows to keep or delete. ⚠ The desktop's claim of **four** similar rows in
    `fm-coach-culture` **could not be confirmed** — the rows carry no field recording their
    origin, so that count exists only in the notes; verifying it means reading that domain's
    source PDF against its 20 rows.
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

- **◐ ACTIVE WORKSTREAM (started 2026-07-23) — The Loan Estimator, WHOLE lending assessment.** Plan: [`LOAN-ESTIMATOR-PLAN.md`](LOAN-ESTIMATOR-PLAN.md). Mike picked this from the ★ triage below and ruled **full scope**, not the Quick Calculator the catalogue's one-line summary describes. **Phase 1 is BUILT (see sub-bullet below); Phases 2–6 each need their own approval.** The workbook (`design/report-source-models/The Loan Estimator.xlsx`, 4 sheets, read end to end) is a bank lending assessment in five parts — rule table · security position · serviceability · repayment schedules · business block — across **15 NZ-specific security classes** (incl. Fonterra shares, dairy and sheep/beef farms, glasshouse horticulture; an earlier count of 16 was wrong — proven against the rule table 2026-07-23). Comparable in size to the Business Performance Report; 6 phases, backend outward, each its own commit and approval. Three anchors hand-verified against the workbook: monthly repayment `5747.094633`, residential stress payment `9026.370957`, household surplus `105.7495571` (verdict flips above 250).
  - ✅ **Phase 1 DONE 2026-07-23 (laptop session, Mike-approved per file) — rule table + security position (Parts A + B), backend only.** `data/loan-criteria.json` (the 15-class rule table — lend %, max term, assessment rate — plus overdraft criteria, every figure the workbook's own with its source cell recorded; labels are the workbook's wording, screen wording deferred to Phase 4). `server/report/loanEstimatorModel.js` (adjusted values with the Static/Growth/Decline rule incl. the formula's anything-else→Decline fallthrough; equity, loan limits, available security, stressed deposits, stress-tested payments at the assessment rate over max term; personal/commercial/combined totals + the sheet's per-group ratios; cap-based property, Fonterra and overdraft sub-calculators, overdraft sign kept negative as the sheet shows it; unknown class throws; defaults never substitute silently per the R8 ruling — `defaultedInputs` names any block that fell back to the sample). `tests/unit/loanEstimatorModel.test.js` — 22 golden tests from the workbook's cached values with cell refs (incl. the `9026.370957` anchor); **mutation-verified outside the repo**: 3 deliberate breakages (Decline neutered / stress payment on debt / lend % on raw value) fail 10, 9 and 8 tests respectively, unmutated control 22/22. Suite 1,626 → **1,648 green / 117 suites**, lint 0 errors. No route, catalogue row or screen yet — those are Phase 4. **Next: Phase 2 (repayment schedules + Quick Calculator), gated on the §4 Reducing-balance defect ruling** (reproduce-and-flag vs correct, plan §4).
  - ✅ **RULED 2026-07-23 — tax tables ship as a CENTRAL FEEDER (§3.1 closed, and bigger than the plan asked).** Mike's ruling: one central, per-country tax-band table that **ALL models and reports** draw from — the currency-selection pattern — with AI able to *propose* rate updates. Built as `data/tax-bands.json`: country-keyed, each table carrying tax-year label, `effectiveFrom` and a verification stamp (date + source URL). **NZ bands verified against IRD's published rates 2026-07-23 — the workbook's bands (10.5/17.5/30/33/39 at 15,600/53,500/78,100/180,000) are CURRENT (in force since 1 Apr 2025, unchanged into 2026–27)**; the workbook wasn't stale, it just carried no date. AI never writes rates silently: updates require explicit human approval with original|suggestion|approved logged (CLAUDE.md rule) — flow tracked as the follow-on workstream below.
  - ✅ **RULED 2026-07-23 — Australia (§3.2 closed by the feeder design).** A country appears in `tax-bands.json` **only when a real, verified table exists** — `getTaxBands('AU')` throws loudly (golden-tested). Visibly absent beats the workbook's present-and-zero federal table.
  - ☐ **FOLLOW-ON WORKSTREAM — tax-band feeder: AI-proposed updates + firm-level editing (worldwide).** Firm Manager "Check for updates": AI drafts a country's new bands with source cited → screen shows old vs new → human approves before landing (isApproved + original|suggestion|approved log, per CLAUDE.md Security & data integrity); firm-level overlays via the existing firmOverlay mechanism (version history + restore for free). 🔒 Gated on Firm Manager Auth like the other EDIT-TARGETs. Logged 2026-07-23 (Mike's ruling).
  - ✅ **RULED 2026-07-23 (session C) — verdict wording (§3.3, was: gates Phase 4).** Mike chose **neutral wording + qualifier**: **"Meets the affordability test" / "Falls short of the affordability test"**, with the qualifier line beneath: **"An indication of affordability only — not a lending decision."** The workbook's "Looking Good!"/"Doesn't Look Good" is retired from the screen. (Exact strings restated in the session-C notes; they land in `locales/en.json` with the Phase 4 screens.)
  - ✅ **RULED 2026-07-23 (session C) — stepped flow (§3.4, was: gates Phase 4).** Mike chose a **stepped flow like Quick Position** (chips, one stage at a time), over one long screen. Headline/banner/badges still come from `components/base/` per the 2026-07-22 "every model looks the same" ruling.
  - ✅ **RULED + CORRECTED 2026-07-23 — the source workbook's Reducing-balance defect (was: gates Phase 2).** Mike ruled **option (b): correct it in both places**. `Interest` `AA8`–`AF8` (read `O90`/`P102`–`P150` — cumulative interest/principal — where years 1–4 correctly read column `N`; displayed an impossible collapsing-then-climbing balance) now read column `N` with cached values 930,000 → 900,000 → … → 780,000, fixed by surgical XML edit of the `.xlsx` itself and verified by re-reading the file with the repo's own hardened `xlsxReader` (all 4 sheets parse; untouched cells byte-identical values). The model computes the correct balances and the golden test pins all ten years. **A second defect found and ruled the same session: `Interest` G24** computed the Interest-Only monthly payment on the **purchase price** (C22×rate/12 = 6,187.50) instead of the borrowed amount; Mike ruled "interest only should relate to the balance of the loan" → corrected to G22×rate/12 (= 4,950.00), in code and in the source `.xlsx`. Plan §4.
  - ✅ **Phase 2 DONE 2026-07-23 (same session) — repayment schedules + Quick Calculator (Part D), backend only.** `computeRepaymentSchedule` in `server/report/loanEstimatorModel.js`: both monthly worksheets (`Interest` rows 31–150) simulated with the sheet's exact recurrences — Table (constant payment, hand-verified anchor `5747.094633` = C29/C31) and Reducing (constant $2,500 principal, first-month payment `7450` = K29) — rolled up to the 10-year interest/principal/closing-balance table with the sheet's own clamp guards; Interest-Only returns the corrected `4950` payment and (faithfully) no schedule; the sheet's odd year-END-balances total row (N10 `10157984.98`) reproduced as its own metric. Golden test → **31 tests**: all ten years of both bases against cached values (cells W5..AF12 / N42..N150), the corrected balance row asserted against the workbook's own column-N values, per-field `defaultedInputs` (R8), unknown-basis throws. **Mutation-verified outside the repo**: 3 mutants incl. one recreating the source bug's exact class (year-end balance reading a wrong rolling column) — killed 2/3/3 tests respectively, control 31/31. Suite 1,648 → **1,657 green / 117 suites**, lint 0 errors. ~~Next: Phase 3 (serviceability), gated on the two open DECISIONs above.~~ *(Both ruled same day — see below.)*
  - ✅ **Phase 3 DONE 2026-07-23 (same session) — serviceability (Part C) + the central tax feeder, backend only. A THIRD source defect found, ruled (option a) and corrected in both places.** `data/tax-bands.json` (the feeder — see ruling above) + `computeServiceability` in the model: both customers taxed to net through the feeder (its first consumer), rentals taxed at the marginal band of the stacked total, boarder income; loan minimums at max(assessment, actual) rate over min(assessment, actual) term (`PMT` grid AO20:AO29, anchor `4178.875443`); expenses vs the minimum-allowances floor (dependant tiers 175/125/105 per week, over-18s 95, vehicles 300/mo, adult living 205/wk — now config in `loan-criteria.json` → `serviceability`, cells recorded); surplus per N64's max(actual, floor) rule; `verdictPass` against the configured 250 threshold — **wording stays a Phase 4 decision (§3.3)**. **The defect: `Serviceability` AL13/AL16 rental-tax formulas missing parentheses in their band-2/3/4 branches** — computed `rental − threshold×rate` (the sample showed $8,027 tax on $33,800 in the 33% band; dimensional nonsense — bands 1/5 show the intended clean multiply). **Correcting it flips the sample surplus from the sheet's cached `105.7495571` (the third hand-verified anchor — which had encoded the defect) to `−154.8337762`: the household actually FAILS the test once rental income is taxed properly.** Corrected in code and in the source `.xlsx` (2 formulas + 5 downstream cached values), verified with the repo reader; Phase 2 fixes confirmed intact; verdict cell unchanged ("Doesn't Look Good" — now for the right arithmetic). Golden test → **41 tests** (tax chain, corrected rentals, loan repricing, floor-binds branch, verdict flip at threshold, absent-country throw); 3 new mutants killed (incl. the under-taxing class), control green. Hire-purchase inputs are captured-but-never-costed in the sheet — reproduced, noted in the model header. Suite 1,657 → **1,667 green / 117 suites**, lint 0 errors. ~~Next: Phase 4 (route, catalogue, screens) — gated on §3.3 (verdict wording) and §3.4 (one screen vs stepped flow).~~ *(Both ruled 2026-07-23 session C — see above; Phase 4a below.)*
  - ✅ **Phase 4a DONE 2026-07-23 (session C, commit `8393a77`) — the combined route, backend's last piece.** `computeLoanEstimatorReport` assembles all three parts **in the model** (the marginBreakeven lesson — the golden test exercises exactly what the screen receives); `POST /api/report/loan-estimator` in `server/routes/report.js` returns the standard envelope, safe generic 400, detail logged server-side only; registered in `restify-server.js`, **anonymous like the other calc routes** (numbers in, numbers out). +7 tests: 3 assembler goldens (all three hand-verified anchors land through it; per-part `defaultedInputs` per R8; bad block fails the whole call loudly) + 4 route tests (envelope, no-leak failure, junk body, registration tripwire). Suite 1,667 → **1,674 green / 118 suites**, lint 0 errors.
  - ✅ **Phase 4b DONE 2026-07-23 (sessions C/D, 5 commits: `52edede` page shell → `9451e6f` step 1 → `1f269a7` step 2 → `d2ca480` step 3 → catalogue flip) — page, all three screens, catalogue flip + BOTH guard entries. The report is LIVE in the Model Library.** Stepped page (`pages/loan-estimator.vue`, chips per the §3.4 ruling, back-nav restores confirmed figures, no intake/token plumbing — route is anonymous). Step 1 `LoanEstimatorSecurity.vue` (Capital Input grid, rows single-source from `loan-criteria.json`, the two sheet-wired derived rows read-only from side calculations). Step 2 `LoanEstimatorServiceability.vue` (workbook's own field wording, Mike-approved as one list; legal name/date NOT captured — PII rule; Hire Purchase omitted as never-costed; country fixed 'NZ' silently — all ruled 2026-07-23). Step 3 `LoanEstimatorReport.vue` (ruled verdict + qualifier in `en.json`, HeroStrip ×3, security/serviceability summaries, interactive Quick Calculator via `currencyMixin` + `reportRecompute`, Interest-Only faithfully schedule-less). Each screen ships its component test; the load-bearing ones are SAMPLE PARITY (screen sample ≡ backend defaults, deep-equal — neither copy can drift alone) and the −154.83 corrected-verdict anchor rendered through the real assembler. Catalogue row → `STATUS_READY` + ruled summary + `/loan-estimator`; `RENDERED_BY` map + headline-guard `SCREENS` entry landed in the same commit (the session-C order finding — so **Phase 5's guard step is already done**). `modelClass` `CLASS_DECISION`, no Illustrative badge. Suite 1,674 → **1,698 green / 121 suites**, lint 0 errors (the catalogue census tests — ready-routes list, built-model classes, `readyCount` — updated for the 7th live model in the same commit). ~~Next: Mike views it in his running app.~~ *(Viewed same day — see below.)*
  - ✅ **Phase 4b follow-ups same day (session E, Mike live-viewed all three steps + report in his running app ✔).** (1) **Entry-step consistency restyle** — Mike's ruling: the entry steps must look like the finished models, NOT get their own bolder look; the fix was the section's signature `HeroStrip` on steps 1–2 with live **display-only** running totals (market value / debt / net equity · gross income / loan balances / weekly living), plus the house colour layer (cyan card top edge, washed header bands, zebra grids, cyan-dashed derived cells, blue per-card totals). (2) **`maxAffordableNewLoan`** — APP-ORIGINAL formula (no workbook cell; Mike-approved wording **"Estimated maximum borrowing" / "With everything else as entered — an indication only"**): the largest New-Property-Loans balance whose bank-assessed minimum still leaves surplus at the 250 threshold, solved directly (payment is linear in balance); **proven by round-trip test** (max fed back in → surplus lands exactly on 250; sample: $451,561.88 vs the failing $500k). Hero #4 on the report banner. Suite → **1,700 green / 121**, lint 0 errors. ~~Next: Phase 6 (business block).~~ *(Phase 6a done — see below.)*
  - ✅ **Phase 6a DONE 2026-07-24 (laptop, Mike-approved per change) — the business block MATHS (Part E), backend only. A FOURTH source defect found and CORRECTED (staff double-count).** `computeBusinessBlock` in `server/report/loanEstimatorModel.js` (+ a `presentValueAnnuityDue` helper, Excel `PV(...,type=1)`): the nine COMMERCIAL securities (Capital Input rows 23–39 = the commercial grid minus commercial property, reused from Phase 1 — the hard NZ-specific half was already built and golden-tested), each carried at adjusted value / current debt / remaining security + per-class **Year-1 interest** (`IF(remainingSecurity>1, security×assessmentRate, 0)`, sign kept negative, Horticulture's negative headroom gated to 0 but still summed into H96 as the sheet does); **EBIT-to-interest ratio** (|EBIT ÷ ΣY1int| = 1.701976765, N96); **bank-adjusted max security** (H98); the **EBIT-serviced maximum loan** (D40/G102 = `PV(9.5%,15,EBIT÷divisor)`, −977,191.0856) and its **monthly payment** (L101, 10,204.07051). Business scalars + staff/tax + the two EBIT divisors are config in `data/loan-criteria.json` (`business` block). **The defect:** `Loan Criteria` Z43 = Z39+Z40+**Z41**+X42 where Z41 is itself SUM(Z39:Z40) — the staff cost was added TWICE (211,000 not 118,000; bank-adjusted security 1,854,001.5 not 1,947,001.5). Mike ruled **CORRECT it** (2026-07-24, "fix as we go, do it right first time"); fixed in code AND in the source `.xlsx` (Z43 formula + 3 cached cells: Z43, D36, Serviceability H98 — surgical edit, **exactly 3 cells changed, all other cells byte-identical**, verified with the repo `xlsxReader`; original backed up in scratchpad). **Bonus caught:** Z45 is `IF(BusinessType="Farm", 1.5, 3)` — a Farm services more per EBIT dollar; both divisors now config + tested (hardcoding 3 would have silently mis-lent to every farm). Golden test **+9** (all workbook-sourced except the two the correction moved + the hand-derived Farm branch); **mutation-verified outside the repo**: 3 mutants killed — one recreating the exact double-count (→211,000), one removing the Y1 gate (Horticulture →22,565.63), one ignoring business type (Farm divisor stuck at 3). Suite 1,700 → **1,709 green / 121 suites**, lint 0 errors. **NOT wired into `computeLoanEstimatorReport` yet, no screen — deliberate phase boundary (like Phase 1 before its route).**
  - ✅ **Phase 6b DONE 2026-07-24 (laptop, Mike-approved) — business block wired into the assembler.** `computeLoanEstimatorReport` now returns a fourth part, `business` (payload `{ securityPosition, repayment, serviceability, business }`); assembler golden test extended (business anchors land through it — bank-adjusted security 1,947,001.5 + max loan −977,191.0856; `business.defaultedInputs` per R8; a bad business securities block fails the whole call loudly). Route unchanged (already passes the body through). Suite **1,709 green / 121**, lint 0 errors. **Mike ruled the visible section (option A) — next: Phase 6c (field WORDING approval as one list → then input fields for EBIT / staff / tax / business type; business entity NAME recommended NOT captured, PII, like the individual's legal name), then 6d (the report display section in the house HeroStrip/card style).**
  - ✅ **Phase 6c/6d DONE 2026-07-24 (laptop, Mike-approved + viewed live) — the Business loan step, front and centre.** Commits `a661a7e` (step + report block) / `fd2e25d` (rate + term on the card). New wizard order **Security → Business loan → Serviceability → Report** (Mike's ruling: for a business owner the business loan is the main event, step 2, not an optional tail); `components/LoanEstimatorBusiness.vue` captures EBIT / business type (Commercial/Farm) / staff / current tax due (entity NAME not captured — PII); the report leads its 4-cell HeroStrip with the **Maximum business loan** (shown positive; sheet stores it negative by PV convention), gated on the business prop so a purely personal enquiry is unchanged. Suite 1,709 → **1,721 / 122**, lint 0 errors.
  - ✅ **Serviceability STRESS-MARGIN DONE 2026-07-24 (laptop, session B, Mike-approved per change + viewed live) — commit `bfd6223`.** The serviceability engine now assesses the three property/revolving loans at the client's own entered rate **PLUS an advisor "Stress test margin (%)"** (firm default 1.5% in `data/loan-criteria.json` → `serviceability.stressTestMargin`, editable per client), **REPLACING** the workbook's flat `max(8.95% floor, rate)`. Personal Term Loans keep the workbook rule (entered rate alone, no margin). **A DELIBERATE owner-approved DEPARTURE from the source workbook — NOT a defect fix:** real banks add a buffer on top of the client's rate; the sheet used `max(fixed 8.95%, rate)` via `IF(AG>AH,AG,AH)` (proven non-additive, the port was faithful). Mike's three ruled answers: default **1.5%**, the **3 property/revolving rows only**, a **single field "Stress test margin (%)"** with grey helper *"Added to each loan's rate for the bank's serviceability assessment — the client only ever sees their own rate."* The loan grid's rate column relabelled **"Interest Rate (%)"** (the old "if higher than 6.65%" wording described the retired floor). **Sample-data consequence resolved WITH Mike:** the demo New Property Loan now carries a realistic **5.95%** (was 0, which only worked under the old floor); under 5.95% + 1.5% the sample household now **PASSES** (surplus **+345.33/mo**, was the −154.83 FAIL). Neat regression anchor kept: a **3% margin reproduces the old −154.83 exactly** (5.95% + 3% = the old 8.95% floor). `minPayment` and `maxAffordableNewLoan` reprice on the new basis; `stressMargin` is an R8-declared input. All affected golden anchors updated across the model / route / report / serviceability tests; **new tests pin** that the margin is added to the 3 loans, never to Personal Term Loans, and can flip the verdict; **mutation-verified outside the repo** (max-not-add and margin-on-personal-term both caught). 8 files, suite 1,721 → **1,724 green / 122**, lint 0 errors. Detail: [`SESSION-2026-07-24-B-NOTES.md`](SESSION-2026-07-24-B-NOTES.md).
- **◐ ACTIVE WORKSTREAM (started 2026-07-27) — Lease vs Buy model (Valuation · Decision).** Port of `design/report-source-models/CM.Lease vs. Buy.xlsx` — tells a client whether leasing or buying an asset is cheaper. Mike chose it from the "coming soon" catalogue to test the report scaffolding on a full build; ruled **full port** (not a trimmed version). FBT-vs-Reimbursement sheet OUT of scope (owner-approved — it doesn't feed the verdict). **Steps 1–8 of ADDING-A-REPORT DONE this session, three commits:**
  - ✅ **Model + golden test (steps 1–2), commit `8ce44c0`.** `server/report/leaseVsBuyModel.js`: Table/Reducing loan amortisation, SL/DV depreciation, the 10-year Buy and 6-year Lease cost build-ups. 18 golden checks tie every figure to its source cell (Buy gross 52,764.59, Lease 28,725.45, verdict Lease!); mutation-verified outside the repo. **One owner-approved CORRECTION (Mike, 2026-07-27):** the workbook double-counts the lease-end costs (`Lease!K3` already includes `D37`; `Input!D33` adds `D37` again) → inflated Lease total 38,425.62 and a WRONG "Buy!" verdict on the sample. Counted once → Lease 28,725.45 < Buy 33,264.59 → honest "Lease!" (saves NZ$4,539). **✅ Source `.xlsx` corrected 2026-07-27 (commit `402c595`, Mike-approved):** Input sheet 3 cells (D33 `=Lease!K3+Lease!D37`→`=Lease!K3`; I33 value; K31 verdict "Buy!"→"Lease!"), rebuilt from a pristine backup with only `sheet1.xml` swapped, every other zip entry byte-identical, re-parsed clean by the repo's `xlsxReader` — code and spreadsheet now agree.
  - ✅ **Route + registration (steps 3–4), commit `0a94854`.** `POST /api/report/lease-vs-buy` — anonymous calc route (no firmAuth), standard envelope, safe error shape; +4 route tests.
  - ✅ **Catalogue + page + screen + guards (steps 5–8), this commit.** `components/LeaseVsBuy.vue` (single live-recompute screen, verdict band keeps the workbook's "Lease!"/"Buy!" per Mike's ruling, house HeroStrip/card style, NO Illustrative badge — Decision class), `pages/lease-vs-buy.vue`, catalogue row → `STATUS_READY` + `/lease-vs-buy`, all wording in `en.json` (workbook's own labels), both consistency guards + the catalogue census updated (8th live model, 2nd Decision-class), `leaseVsBuy.component.test.js` pins the rate conversion + verdict render. Suite **1,753 green / 125**, lint 0 errors.
  - ☐ **Remaining: (1) correct the source `.xlsx` double-count (Mike to view the exact change first); (2) Mike views the screen in his running app** (backend restart needed to pick up the new route). *(Note 2026-07-28: item (1) contradicts the ✅ two bullets above, which records the `.xlsx` correction DONE at `402c595`. One of the two lines is stale — flagged, not edited, pending Mike's confirmation of which.)*
- **◐ ACTIVE WORKSTREAM (started 2026-07-28) — Cost of Capital (WACC).** Port of `design/report-source-models/Cost of Capital.xlsx` (2 sheets — the smallest workbook in the unbuilt set). Mike picked it from the 11 remaining "coming soon" models. **Scope ruled 2026-07-28: FULL — both sheets, the beta helper wired to the calculator, plus an interactive advisory layer** ("don't be lazy — make it really useful for a client"). Class **Decision** (real figures typed in; no Illustrative badge, nothing to an LLM). This is no longer the quick win it was picked as — it is Loan-Estimator-shaped, phased, each phase its own approval.
  - ✅ **THREE SOURCE DEFECTS FOUND, PROVEN FROM THE FORMULAS, AND OWNER-RULED "CORRECT" (2026-07-28).** Values were read with the repo's own `xlsxReader`; formulas came from the raw sheet XML (the reader drops `<f>` nodes). **A first reading wrongly suspected a circular reference at `X40`; the raw XML disproved it — `X40` is simply empty and `AE40` holds the formula.** The real faults:
    1. **The equity half of the WACC is annihilated.** `AE40 = X40 - M40` reaches for the last SLOT of the equity row, not the last FILLED period. `X40` is blank, so growth = `AE42 = AE40/M40` = **-1** (-100%). That flows to `WACC Calcs!E10`, and `M19 = L20*(1+E10)` multiplies the cost of equity by zero → `I23` (the equity contribution) = 0 → **the published "Weighted Average Cost of Capital" of 1.62% is the DEBT cost alone**, with 62.5% of the capital contributing nothing. **Decisive proof it is a defect, not merely missing data:** the sheet's own note says "If you don't have data for one period leave it blank", and its sibling average honours that (`Y50 = Y43/M37`, `M37` = a live count of FILLED periods). Only this formula doesn't. Corrected: growth = (last filled - first filled)/first = **+4.2457%**.
    2. **The same blank corrupts the volatility beta** (found while building, same root cause). `M62 = STDEV.P(M43:X43)` spans all twelve share-value cells; the twelfth is 0 (its own `if(M40=0,...)` guard firing on the blank), so a share price of *nothing* enters the spread — "volatility" reads 27.67% on values that only range 335.92–350.18, inflating the volatility beta to **7.61**. Filled periods only → **0.36**.
    3. **Cost of equity omits the market premium.** `H21 = E6 + E7*E8` = riskFree + beta x market RETURN. CAPM multiplies beta by the market *premium* (`Rm - Rf`), because the reward for risk is only the excess over what a government bond pays for none. As written the risk-free rate is counted twice, overstating cost of equity by exactly `beta x riskFree` = 2.03 points (**8.57% vs 6.55%**) — pinned by its own test. Mike ruled correct (the recommendation; he was given the port-faithfully option explicitly).
    - Also corrected: `M52 = $Y$17 - M43` measures the COMPANY's share values against the MARKET average (4,660 vs ~343). Traced to a display-only branch — the volatility beta reaches `F15` via the clean `O62 = M62/Y50` — so it never touched the WACC. Corrected anyway.
    - **NET EFFECT ON THE HEADLINE: 1.62% → 6.16%.** (An earlier estimate of 6.30% given in-session was superseded by the exact computation.) **The corrections vindicate each other:** fixed, the helper's two betas become **0.47** and **0.36** — against the **0.52** a human had already hand-typed into `E8` by judgement. Three independent routes agreeing is the strongest evidence the corrections are right.
  - ✅ **PHASE 1 DONE 2026-07-28 (laptop, Mike-approved per change) — the maths engine, backend only (recipe steps 1–2).** `server/report/costOfCapitalModel.js`: `computeWacc` (the `WACC Calcs` sheet, corrected), `computeBetaHelper` (the `Beta Calcs` sheet — market and company series, population stdev, growth, both candidate betas, guard-rail warning CODES so the screen owns the English), and `computeCostOfCapital` (the assembler — wires growth across exactly as `E10 = 'Beta Calcs'!F9` does, keeps beta advisory since the workbook hand-enters it, and reports `growthSource` + `betaSuggestions.inUse` so a screen can never credit the answer to a beta it wasn't built on). Blank-vs-zero is a first-class distinction (`isFilled`) — conflating them IS defect 1. R8 honoured: `defaultedInputs` names every fallback, and a WACC called with no growth rate reports it rather than inheriting the sample's. `tests/unit/costOfCapitalModel.test.js` — **41 tests**: every untouched figure pinned to the workbook's own cached value with its cell ref (**all matched first run** — `Y10` 55,924, `Y17` 4,660.333333, `M29` 169.3946739, `Y43`, `Y50`, and all four debt cells `H22`/`I24`/`J24`/`L24`), each corrected figure carrying a SENTINEL against the defective value, plus blanks/R8/guard-rails/degenerate-input coverage. **Mutation-verified outside the repo** (`scratchpad/mutate-wacc.js`, 5 mutants): growth-reads-last-slot **14 fails**, blank-as-zero-share-price **9**, cost-of-equity-drops-premium **7**, STDEV.P→STDEV.S **6**, variance-from-market-mean **1**; control green. *(The first harness was itself broken — a bad `--config` made every run fail identically, so its "all killed" result was meaningless and was rebuilt before being believed.)* Suite 1,801 → **1,842 green / 130 suites**, lint 0 errors. **No route, no catalogue row, no screen — deliberate phase boundary.**
  - ✅ **PHASE 2 DONE 2026-07-28 (laptop, Mike-approved) — the route, backend's last piece.** `costOfCapital` in `server/routes/report.js` (standard envelope; safe `COST_OF_CAPITAL_COMPUTE_FAILED` with the real error logged server-side only; payload assembled in the MODEL not the route, per the marginBreakeven lesson; JSDoc documents the blank-vs-zero series contract since a `null` period is meaningful input here). `POST /api/report/cost-of-capital` registered **anonymous** in `restify-server.js` — numbers in, numbers out, no `firmAuth` (only file-intake routes carry it); reads no DB, writes nothing, calls no third party, sends nothing to an LLM. `tests/unit/costOfCapitalRoute.test.js` **+6**: envelope + corrected anchors, R8 declaration on an empty body, supplied inputs reaching the maths (`growthSource` → 'supplied'), non-object body, the no-leak 400 shape, and a source tripwire pinning the registration line **and the absence of `firmAuth`**. Carries a **SENTINEL at the HTTP boundary** — the route must never serve the defective 1.62% (the engine guards it too, but this is the layer a screen actually calls). Tripwire mutation-checked: with the `server.post` line removed the assertion correctly fails. *(A first check reported it surviving — a flaw in the throwaway verification script, whose strip regex broke on CRLF endings, not in the tripwire. Worth remembering: a "mutation survived" result is itself worth double-checking before it is believed.)* Suite 1,842 → **1,848 green / 131 suites**, lint 0 errors. **Catalogue row deliberately NOT flipped** — three build guards derive their work list from the catalogue's ready routes, so flipping to `ready` before the page exists fails the build looking for a page that isn't there (the Lease vs Buy lesson: catalogue + page + screen + guards land in ONE commit).
  - ✅ **SCREEN WORDING APPROVED 2026-07-28 (Mike, as one list — build straight from this; do not re-ask, do not invent).** Principle applied: keep the workbook's term wherever an advisor would recognise it; replace only internal abbreviations a client would find meaningless. **Inputs:** 5-year government bond rate · Average share index return · Beta · Expected inflation rate · Your company's growth rate · Company tax rate · Equity invested · Debt (funds borrowed) · Borrowing rate. **Outputs:** Cost of equity · **Cost of debt (after tax)** *(the "after tax" is deliberate — without it a reader compares it against the headline borrowing rate)* · **Funded by equity** *(was "ev ratio")* · **Funded by debt** *(was "dv ratio")* · Weighted average cost of capital *(kept — the industry term)*. **Beta helper:** **Beta from growth** *(was "Return On Investment (Performance) Co Variance Beta")* · **Beta from volatility** *(was "Share (Volatility) Beta")* · Total shareholders' equity · Shares issued · Share index value. All of it goes through `$t()` into `locales/en.json` — no hardcoded English (Stack Constitution).
  - ✅ **PHASE 3 DONE 2026-07-28 (laptop, Mike-approved) — THE SCREEN. The model is LIVE in the Model Library (9th ready model, 3rd Decision-class build).** Catalogue row, page, screen and all three manual guard entries in ONE commit (the Lease vs Buy lesson — three build guards derive their work list from the catalogue's ready routes, so flipping to `ready` before the page exists fails the build). **A visual artifact was built and owner-approved BEFORE any layout code** (the binding rule after the Lease vs Buy layout defect), showing real backend output rather than mock figures.
    - `components/CostOfCapital.vue` — one live-recomputing screen in the house two-column grid, `ReportShell` tokens only (no colour, frame, card or font declared), full-width header + banner per the [A]–[D2d] anatomy, `::v-deep .rs-top` reset, 16px gaps throughout. `currencyMixin` + `reportRecompute` (no local `money()`, no hand-rolled debounce or race guard). NO "Illustrative" badge — Decision class. All wording through `$t()` into `locales/en.json`, straight from the approved list; **nothing invented** except the six guard-rail warning strings, flagged to Mike as the one unapproved piece.
    - **Layout decisions worth recording:** the banner carries four figures, with the funding split as value + sub-line so all five approved output labels appear in four cells; **the Beta helper runs periods DOWN the page, not across** (twelve columns of seven-figure shareholders' equity will not fit the results column; twelve rows do); the build-up is shown line by line so an advisor can walk a client down it. **The WACC hero deliberately carries no `tone`** — a WACC is neither good nor bad on its own, and colouring it would assert a judgement the model cannot make (the hurdle test that CAN judge it is phase 5).
    - ✅ **THE GROWTH RATE — owner ruling 2026-07-28.** Mike asked whether changing one figure re-works the whole model (it does — `reportRecompute`, no Recalculate button anywhere). The one loose end was the derived growth rate. **Ruled: editable, with a "use the calculated figure" link** — over "lock it" and over "editable, silently stops tracking". `form.growthRatePct === null` means follow the helper and `growthRate` is **omitted from the request entirely**, so the backend reports `growthSource` honestly instead of being handed back a figure it derived itself. Clearing the field hands it back too.
    - **Beta stays advisory** (the workbook hand-enters `E8`); the helper's two suggestions sit beside the one in use. The one-click adopt button remains phase 5.
    - `tests/unit/costOfCapital.component.test.js` — **16 tests** covering only what the SCREEN can get wrong: the display→decimal conversion, the E7/F10 single-field tie, R8 (the seeded screen defaults nothing), all five growth-override behaviours, blank-vs-zero in the series, reactivity, beta never auto-adopted, and a **sentinel on the headline HeroFigure** — asserted on the cell's `value` prop, NOT on `wrapper.text()`, because "1.6200%" legitimately appears further down as the debt's share of the cost. That coincidence is precisely what made the original defect so hard to see. Plus a coverage test deriving from the engine's own `WARN` map, so a new guard-rail with no wording fails the build instead of showing an advisor "ROI_BETA_ATYPICAL".
    - Guards wired: `reportHeadlineConsistency` SCREENS, `reportHeaderFullWidth` file list, `reportBadgeClass` RENDERED_BY, plus the catalogue census (ready routes, `readyCount` 8→9, built-model classes 8→9). `reportShellFrame` needed no entry — it is catalogue-derived.
    - **Mutation-verified outside the repo** (`scratchpad/mutate-coc.js`, 8 mutants, control green): dropped ÷100 **2 fails**, blank-as-zero **1**, `$set`→direct index assignment **1**, growth always sent **4**, beta auto-adopted **1**, market return decoupled **1**, banner nested one level down **killed** (confirmed in an isolated run showing the placement assertion's DOM diff), `.rs-top` reset removed **killed** via that guard's own regex — it reads the file from disk, so a module alias cannot shadow it, and it is checked directly rather than left looking like a survivor. **Two of the eight initially read as survivors and were REAL test gaps, now closed:** reading a series value back proves nothing about reactivity (the array does change — the watcher is the subject), and beta auto-adoption is invisible before the first response lands, so that test now mounts WITH a result. **The harness itself was wrong twice before it was believed** — a shell-mangled `--moduleNameMapper` made every run fail identically, then a `Tests: N failed` regex reported a compile failure as a survivor. Third time this model has taught the same lesson: *a mutation verdict, killed or survived, is worth double-checking before it is trusted.*
    - Suite 1,848 → **1,871 green / 132 suites**, lint 0 errors. ⚠ **Backend restart needed** before `/api/report/cost-of-capital` will answer; **owner still to view the screen in his running app.**
  - ✅ **PHASE 4 DONE 2026-07-28 (laptop, Mike-approved after viewing the exact change list) — THE SOURCE `.xlsx` CORRECTED. Code and spreadsheet now agree.** `design/report-source-models/Cost of Capital.xlsx`, **72 cells across both sheets**, deliberately opened ONCE after all rulings rather than edited per-defect.
    - **5 formula corrections:** `Beta Calcs!AE40` `X40-M40` → `LOOKUP(2,1/(M40:X40<>""),M40:X40)-M40` (reach the last FILLED period, not the last slot); `M43` `if(M40=0,0,…)` → `if(M40="","",…)` (a blank period stays blank instead of entering as a share price of nothing — the ROOT of defect 1, fixed once for both halves); `M52` `if(M43=0,0,$Y$17-M43)` → `if(M43="","",$Y$50-M43)` (measure the company against its OWN mean); `M54` gained the matching blank guard so the squares row cannot `#VALUE!`; `WACC Calcs!K21` `E6+E7*E8` → `E6+E8*(E7-E6)` (CAPM multiplies beta by the PREMIUM). **Headline `E26`: 1.62% → 6.16%.**
    - **TWO FURTHER INSTANCES OF THE SAME DEFECT FOUND AND CORRECTED IN THE SAME PASS — `M46`/`M48`**, the company chart band, also read the MARKET mean and spread (`$Y$17`/`$M$29`) where they should read the company's (`$Y$50`/`$M$62`). Display-only and not ported, so no code change; corrected under the standing ruling that a correction covers the whole section, not the cell being edited. Found by inventorying every company-block formula referencing a market figure, rather than fixing only the one already known.
    - **Verified four ways, and the verification is the point:** (1) it parses with the repo's OWN `xlsxReader` (both sheets, 26 + 70 rows) — checked again after installing, from the repo copy, not just the scratchpad build; (2) **all 14 untouched zip entries are BYTE-IDENTICAL**, proven by a purpose-written zero-dependency zip writer that copies unchanged entries' compressed bytes verbatim (`Compress-Archive` and Python's `zipfile` both re-compress everything, which would leave no way to show the untouched parts are untouched); (3) exactly 72 cells differ, none added or removed; (4) **every corrected cached value agrees with the ported model to 1e-9**, and every previously-correct anchor (`Y10`, `Y17`, `M29`, `Y43`, `Y50`, `K22`, `I24`, `K24`, `L24`) is unmoved. The edit REFUSES to run if any target cell's existing formula is not the exact text expected.
    - **Two cross-checks fell out on their own, and are the strongest evidence the fix is right:** the company variance row `Y52` now sums to **exactly 0** (as the market row `Y19` always did — the arithmetic signature of measuring against your own mean; it was 47,490 before), and `M56` (spread the long way, via `sqrt(Y54/M37)`) now equals `M62` (`STDEV.P`) at **4.510057035** — two independent routes agreeing where they previously gave 4,317 and 94.9.
    - ⚠ **File grew 130,337 → 165,730 bytes.** Content is unchanged in size (the XML grew ~200 bytes); Node's zlib simply compresses this repetitive XML ~37% worse than Excel's encoder, and no `level`/`memLevel`/`strategy` combination closes the gap. Accepted: git stores a new binary blob either way, so the real cost is ~35 KB once.
    - Suite **1,871 green / 132 suites**, lint 0 errors. Backup of the pristine original kept in the session scratchpad.
  - ✅ **PHASE 5a DONE 2026-07-28 (laptop, Mike-approved: input shape, then wording, then commit) — THE HURDLE-RATE TEST. The WACC turned into the decision it exists to serve.** First piece of the phase-5 advisory layer. NOT in the workbook — the workbook stops at the WACC. **Owner-verified in the running app** (250,000 costing / 22,000 earning → "Clears your cost of capital by 2.64 percentage points", needs 15,407, ahead by 6,593 — an exact match to the model).
    - **INPUT SHAPE RULED 2026-07-28:** the advisor enters the **money** — what the investment costs and what it is expected to earn each year — and the return **percentage is derived**, over entering the percentage directly. The percentage is the figure a client cannot easily produce, so calculating it is real help rather than a data-entry chore.
    - **The hurdle is the WACC exactly as calculated, with NO risk margin.** Some advisors add a buffer for a risky project; the workbook does not, and inventing one would assert a judgement no input authorises. An optional buffer is its own later ruling. Said on screen, not just in code: *"The bar is your cost of capital exactly as calculated above, with no safety margin added."*
    - `computeHurdleTest(src, hurdleRate)` in `server/report/costOfCapitalModel.js`, wired into `computeCostOfCapital` and judged against the **same** `wacc` the response carries (a strict-equality test pins it — the `inUse` reasoning applied to the verdict). Returns **null** unless both figures are usable; a blank or zero cost has no percentage, and an advisor mid-typing is not an advisor in error. Verdicts are CODES (`CLEARS`/`MEETS`/`SHORT`) — no English in the engine. **`MEETS` exists so an investment landing exactly on the bar is not forced into a pass or a fail.** Route unchanged (it already forwards the whole body); its JSDoc contract updated.
    - **Answers in MONEY as well as percentage points** — "it must earn $15,407 a year and it is expected to earn $22,000" is a sentence an advisor can say to a client; "8.80% beats 6.16%" is not. **The verdict is the ONLY toned element on the screen** — the headline WACC deliberately has none (a cost of capital is neither good nor bad), but a verdict genuinely is one or the other. Colour is a second signal only: the sentence says "clears" or "falls short" in words, so it survives greyscale and colour-blindness.
    - **+29 tests. Suite 1,871 → 1,900 green / 132 suites**, lint 0 errors. **Mutation-verified outside the repo** (`scratchpad/mutate-hurdle.js`, 12 mutants, control green, module redirected via a `moduleNameMapper` config FILE so no repo file is ever written).
    - ⚠ **THREE REAL TEST GAPS found by mutation, all closed — every one had a PASSING test over it:**
      1. **The currency test asserted digits only.** A hand-rolled `'$' + toLocaleString('en-US')` produced the same "15,407" and survived, losing the firm's currency and the reader's language. Now switches the firm currency to GBP and asserts the figure follows — which a hardcoded formatter cannot.
      2. **The break-even test used $250,000, which divides exactly in binary**, so it never exercised the float tolerance it existed to test. **499 of the 2,000 round thousands from $1k–$2m do NOT round-trip exactly**; at $35,000 the margin lands at −6.9e-18, i.e. *"falls short by 0.00 percentage points"* on an investment priced to break even to the cent. Test now uses $35,000 and asserts the float gap first.
      3. **NOTHING tested which input box fed which field** — every test called the methods directly, so two boxes bound to each other's field passed the whole suite. Four DOM tests added (located by LABEL, not position). The second immediately caught a further class: **writing a value and displaying one are separate bindings**, and a cost box *showing* the earnings figure passed the first three — you would type 250,000 and the box would answer 22,000. Only the owner's eye would have caught it.
    - ⚠ **The harness was wrong TWICE more before it was believed** — jest writes its summary to **stderr**, and `execFileSync` returns only stdout on a passing run, so a healthy control read as "no tests ran"; and `$'` in a string `.replace()` is JS's "everything after the match" token, which mangled one mutant into a compile error. Both were reported as verdicts. **Fifth time on this model: a mutation verdict, killed or survived, is worth double-checking before it is trusted.** The harness now refuses to call a run with zero passing tests a kill.
  - ✅ **PHASE 5b + 5c DONE 2026-07-28 (laptop, Mike-approved as one plan) — ADOPT-A-BETA (with provenance) and the SENSITIVITY VIEW.** +15 tests, suite 1,900 → **1,915 green / 132 suites**, lint 0 errors. **Mutation-verified: 21 mutants, control green, ALL KILLED on the first run, 0 harness errors** — the first clean first pass on this model.
    - **Adopt-a-beta.** A "Use this Beta" button on each of the two SUGGESTION boxes (never on the beta in use — that would invite adopting the figure you already have). Takes the **full-precision** suggestion, not the two decimals displayed, so the answer matches the suggestion it credits. A provenance line under the Beta field reads "Using the Beta from growth"/"…from volatility" and **clears the moment the advisor types their own figure** — compared against the value it was adopted AT, so an unrelated field change does not drop it. Adoption stays deliberate, per the workbook's own design (`WACC Calcs!E8` hand-entered).
    - **"What moves the answer most."** Each input raised **on its own** (rates +1 point, beta +0.1, funding mix +1 point of debt holding total capital), WACC recomputed, ranked by absolute effect. On the sample: share index return **+0.36**, beta **+0.35**, bond rate **+0.33**, borrowing rate **+0.27**, inflation **+0.04**, mix **−0.03**, tax **−0.02** — so the market inputs dominate and tax barely registers, which is where the client conversation belongs. Sorted by MAGNITUDE, not signed value (a mutant sorting signed sank both falls to the bottom and was killed). The one-at-a-time rule is **stated on screen**, because a reader who assumed the lines add up would badly overestimate changing two things at once. Rendered as signed percentage **POINTS**, not percentages — the figures compared are themselves percentages.
  - ⛔ **GEARING CURVE — DROPPED 2026-07-28, and NOT to be built as specified. Needs a finance ruling first.** Proved before building: this model holds the cost of equity FIXED as gearing rises, so the WACC falls in a straight line from **7.27% at no debt to 4.32% at all debt** — the "optimal" mix is **100% debt**. That is not advice, it is a wrong answer with a chart around it. A real gearing curve needs **beta re-levering** (equity gets riskier as you borrow — the Hamada relationship) and some pricing of distress; both are finance theory the workbook does not contain, and adding them is its own owner decision. Logged rather than silently skipped.
  - 🚧 **STATIC REFERENCE LINKS — DESIGNED AND MAPPED, NOT BUILT. Owner ruling 2026-07-28: the links follow the FIRM'S SELECTED CURRENCY**, not a hardcoded country — so a firm set to NZD gets the RBNZ and the NZX 50, one set to GBP gets the Bank of England and the FTSE 100. Six supported currencies (`data/currencies.json`, default NZD). Agreed mapping, ready to build: **NZD** RBNZ / S&P-NZX 50 · **AUD** RBA / S&P-ASX 200 · **GBP** Bank of England / FTSE 100 · **EUR** ECB / EURO STOXX 50 · **USD** US Treasury / S&P 500 · **CAD** Bank of Canada / S&P-TSX Composite. Wording approved: a "Where to find these figures" line under the Market rates card, with "Government bond rate — {publisher}" and "Share index return — {index}".
    - ⛔ **STOPPED BEFORE BUILDING, deliberately.** Mike approved "verify the links resolve, then build". **Verification is not possible from here:** of 12 URLs, only **2 could be confirmed** (Bank of Canada — live, bond yields dated the prior week; ECB — live, 5-year yield listed). RBNZ, RBA, Bank of England and S&P Global all return **HTTP 403 to an automated request** (bot protection, NOT a dead page), the US Treasury page **timed out**, and the London Stock Exchange page renders its content via script so nothing could be read. The domains are certainly the right institutions; the exact PAGE PATHS are what could not be confirmed, and a dead link in front of a client is worse than no link — which is the whole reason the check was asked for.
    - **Recommendation on the table when this resumes:** point at each institution's **top-level statistics section** rather than a deep page — shallow links survive site reorganisations, deep ones are precisely what rots — and book a one-off human click-through of all twelve as a tracked task. Mike has NOT yet ruled on this; he chose to bank the finished work first.
  - ✅ **OWNER-CHECKED AND SIGNED OFF 2026-07-29.** Mike ran the app and confirmed all four checks good: the "Use this Beta" links on the two suggestion tiles only, the provenance line clearing on a typed beta but surviving an unrelated edit, the sensitivity table's ranking and negative rows, and the screen sitting in the shared frame. *(Phase 5a had been checked on 2026-07-28: 250,000 / 22,000 → clears by 2.64 points, exact match.)* ⚠ **Note for a re-check:** the figures above are the PRE-correction-4 ones. The same scenario now reads **clears by 3.09 points** — see the correction-4 entry below.
  - ☐ **P3 · DOC — some cell references in our own notes and code comments are WRONG (values were always right).** Found while reading the raw sheet XML for phase 4, with a parser written after two ad-hoc regexes each lied — one matched across cell boundaries, the other assumed `r` was the first attribute on `<c>`. True refs: cost of equity is **`K21`** (not `H21`), cost of debt after tax **`K22`** (not `H22`), the debt tax shield **`K24`** (not `J24`), company volatility % **`P62`** (not `O62`), market volatility % **`P29`** (not `O29`), and the two displayed betas on `WACC Calcs` are **`I8`/`K8`** (not `H8`/`J8`). Affects the header comment in `server/report/costOfCapitalModel.js`, the cell-ref comments in `costOfCapitalModel.test.js`, and the entries above. **Nothing is computed wrongly** — every figure and test still matches the workbook; only the labels a future reader would use to re-check by hand are off, which is exactly when a wrong ref costs an hour. Logged 2026-07-28. ✅ **DONE 2026-07-29 (Mike-approved).** All six corrected in `costOfCapitalModel.js` and `costOfCapitalModel.test.js`; `grep` for the old refs now returns nothing in code. **Each correction was re-proved against the raw workbook XML first, not taken from this note** — the whole point of the fix is that a future reader can re-check by hand, so a wrong correction would be worse than the wrong label. Confirmed: `H21`/`H22`/`J24`/`O62`/`O29`/`H8`/`J8` are all EMPTY cells; the formulas live in `K21` (`=E6+E8*(E7-E6)`), `K22` (`=E17-(E17*E12)`), `K24` (`=I24*E12`), `P62` (`=M62/Y50`), `P29` (`=M29/Y17`), `I8`/`K8` (`='Beta Calcs'!I9` / `!I15`).
  - ☐ **NEXT PHASES (each its own approval):** ~~(3) the screens~~ *(done)*; ~~(4) the source `.xlsx` correction~~ *(done)* — deliberately deferred so the file is opened ONCE, after all rulings, rather than edited three times; (5) the interactive advisory layer Mike ruled in — ~~**hurdle-rate test** (does a proposed investment clear the WACC?)~~ *(done — phase 5a above)*, ~~**gearing curve**~~ *(**DROPPED** — it would recommend 100% debt; see the entry above)*, ~~**sensitivity view**~~ *(done — 5c)*, ~~**helper-to-calculator adopt button with provenance**~~ *(done — 5b)*, and **static reference links** to where the bond rate and index return are published *(blocked on the jurisdiction)*.
  - 🔒 **RAISED AND DEFERRED — a live market-data feed.** Mike asked about linking to share-market data. Static reference links carry no risk and are in scope above. A LIVE feed is its own decision: it needs a backend-only API key, costs money, and market data is typically **licensed with redistribution to clients restricted** — plus it can fail mid-client-meeting. No client-privacy exposure (only a ticker leaves the building). Not started; needs a licensing + cost ruling first.
  - ✅ **CORRECTION 4 — RULED AND DONE 2026-07-29 (laptop, Mike-approved): the two adjustments on top of CAPM are REMOVED. The headline WACC moves 6.16% → 5.71%.** Raised as an open question on 2026-07-28 (the growth rate is a TOTAL change across the window, not annualised, applied as a plain multiplier `M19 = L20*(1+growth)`). Mike ruled: *"Growth rate calculations are wrong, then fix it… put it to standard practice."* **Investigating it proved the fix was not to recalculate growth but to remove it — and that the step beside it was wrong the same way and larger.** Proved against the raw workbook XML before any code changed:
    - `K21 = E6+E8*(E7-E6)` = **6.5468%** — textbook CAPM, correct.
    - `L20 "Post Inflation" = K21*(1+E9)` = 6.9723% — **wrong: double-counts inflation.** `E6` (a government bond rate) and `E7` (a share index return) are quoted in NOMINAL terms, so expected inflation is already inside them. A model works entirely in nominal or entirely in real terms; this one took nominal inputs and then inflated them. The sheet's own label — "Expected **REAL** Inflation Rate" — shows a real-terms model was intended, but the inputs were never converted.
    - `M19 "Post Real Growth" = L20*(1+E10)` = 7.2684% — **wrong: growth is not a component of a discount rate.** Cost of equity is what investors REQUIRE for bearing risk, and under CAPM risk is carried entirely by beta. Growth belongs in the cash flows being discounted, never in the rate they are discounted at. It also ran backwards as an incentive: **the faster a company grew, the higher its hurdle became**, so a good year made every future investment look worse. (The annualisation defect that raised the question is now moot for the WACC — but the figure still feeds the ROI beta, so it still matters there.)
    - **Corrected:** `I23 = H23 * K21` weights the CAPM figure directly. WACC **6.1627% → 5.7117%** (hand-derived: 0.625 × 0.065468 + 0.0162). Hurdle test on the worked sample moves with it — required annual return $15,407 → **$14,279**, margin 2.64 → **3.09 points**.
    - **Scope — the ruling covers the whole screen, not just the maths.** `E9`/`E10` are no longer inputs to the WACC anywhere: removed from the model, the route contract, the request payload, the two input boxes, the "use the calculated figure" link, the two build-up rows, and the inflation row of the sensitivity table. **A control that no longer moves the answer is worse than no control** — an advisor would type into it, watch nothing happen, and reasonably conclude the screen was broken. The change invents **no new user-facing wording**; it only removes (4 dead locale keys deleted).
    - **The growth rate is NOT gone from the app** — it is still derived by the Beta helper, where it legitimately drives "Beta from growth". A fix that killed the ROI suggestion too would have overshot; a test pins that it did not.
    - **Testing — the failures were the point.** 24 tests failed on the first run, every one a golden value that moved. New guards added beyond re-goldening: `SUPERSEDED_*` sentinels pinning the 6.16% answer **this model itself published until today** (re-adding either multiplier leaves the arithmetic internally consistent, so only a pinned value catches it); a test proving a caller who *still sends* `inflationRate`/`growthRate` gets the identical answer (the ruling must hold for un-updated callers, not just updated ones); and DOM tests locating the absent fields **by label, not position**. ⚠ **One trap caught:** the break-even test deliberately uses a cost that does NOT round-trip in binary, and the old figure ($35,000) divides exactly at the NEW WACC — it would have kept passing while proving nothing, the exact failure its own comment warns about. Re-chosen to **$7,000** (gap 6.9e-18), with a note that it must be re-chosen whenever the WACC changes. Suite **1,917 green / 132 suites**, lint 0 errors.
    - ✅ **SOURCE `.xlsx` CORRECTED 2026-07-29 (Mike-approved) — code and workbook agree again.** `WACC Calcs` only; `Beta Calcs` deliberately untouched (the growth rate still legitimately drives the ROI beta there). `I23` `=H23*M19` → **`=H23*K21`** (cached 0.04542727725 → 0.0409175); `E26` cached 0.06162727725 → **0.0571175**; and eight cells deleted — the `E9`/`E10` inputs, the `L20`/`M19` stages, and their four labels. `D9` now carries a note in place of the old "Expected Real Inflation Rate" label, so a reader of the SHEET learns why the rows are empty instead of assuming someone deleted them by accident. `fullCalcOnLoad="1"` set so Excel rebuilds anything downstream rather than trusting a cache that predates the edit.
      - **Verified before the file was installed, not after:** rebuilt on a scratchpad copy, then confirmed by re-reading the result — archive integrity clean, `sheet1.xml` well-formed with all 26,045 cells balanced and **no empty `<row>` left behind**, and `sheet2.xml` / `sharedStrings.xml` / `styles.xml` / `comments1.xml` **byte-identical** to the original (so nothing moved that we did not mean to move). Suite 1,917 green after the swap.
      - ⚠ **Two things worth knowing.** First, a hand-written correction initially dropped `I23`'s style index (`s="27"` → `s="0"`), which selects the number format — it would have rendered a percentage cell as a raw decimal, changing nothing about the maths and everything about how the sheet reads. Caught by verifying the output rather than trusting the script; the script now carries the original style over and **refuses to invent one**. Second, this machine has no `zip` binary and the repo no zip library, so the archive was rewritten by a purpose-written zip writer (`scratchpad/rezip.js`, entry order taken from the original). PowerShell's `Compress-Archive` was rejected deliberately — it gives no control over entry order, and an `.xlsx` Excel dislikes fails at OPEN time, long after the script reports success.
      - ☐ **CANNOT BE PROVEN FROM HERE — Mike to open the workbook once in Excel.** Everything above verifies the file as a ZIP and as XML. It does not prove Excel accepts it, and no tool on this machine can. Low risk given the checks, but it is a real gap and is not being reported as done.
- **📌 RELEASE RULING 2026-07-28 — `v0.6.0` is NOT being chased; a fresh tag will supersede it.** Mike ruled: build more models first so the master team pulls **once**, then release. Facts at the time: `v0.6.0` (commit `9a29aee`, cut 2026-07-21) was **offered and is still awaiting pull**; `master` had moved **35 commits** past it and this branch **95**, so the offered tag contains none of the Loan Estimator, Lease vs Buy or the report visual standard. ⚠ **Watch item:** the gap to UAT grows while models are batched — this is the same shape as the 97-commit drift, slowed down but not eliminated. ⚠ **Record conflict surfaced:** `DEPLOYED-VERSIONS.md` says `v0.6.0` was *offered to the master team*; `SESSION-2026-07-27-NOTES.md` says it was *"still not sent"*. Both cannot be true — Mike to confirm which, so the binding ledger is honest.
- **✅ P1 · CONSISTENCY GOVERNANCE — Report visual standard LOCKED IN (all 6 steps DONE 2026-07-27).** Standard + plan: [`REPORT-VISUAL-STANDARD.md`](REPORT-VISUAL-STANDARD.md). Closed the gap that let Lease vs Buy ship with no frame and the build stay green: the report "look" (frame, palette, cards, buttons, fonts) was copy-pasted into all eight screens and drifted screen by screen, and the old consistency guard only checked the shared banner. Fix delivered = one source (`ReportShell` + `--rs-*` tokens) + a guard that fails the build on a frameless page. Owner sign-off 2026-07-27: five numbers RULED (left column 360px, gap 20px, width 1120px, card radius 14px, card title 12px), dark mode RULED all-light, shell-and-guard approach approved. **All six steps built, tested, pushed (`20be0e2` → `29fac32`); suite 1,784 green / 127 suites:**
  - ✅ **Step 1 DONE 2026-07-27, commit `20be0e2` — the shell + token source.** `components/base/ReportShell.vue` (frame + every design value as `--rs-*` custom properties, declared once, inherited by any screen in its slot; the `ReportShell` the header/consistency tests already anticipated but that was never built). Additive only — no screen touched. `tests/unit/reportShell.component.test.js` mounts the frame + slot and pins the five numbers + the no-dark-mode ruling to the source. Suite 1,753 → **1,761 green / 126 suites**, lint 0 errors.
  - ✅ **Step 2 DONE 2026-07-27 — all 8 of 8 screens migrated.** Each: page wraps in `<report-shell>`; the screen's private palette becomes a thin ALIAS layer over the shared `--rs-*` tokens (no colour value declared in a screen), frame + dark-mode block removed, stray raw hex repointed to tokens. First five (earlier this session): Lease vs Buy (`87c8c77`), Margin Breakeven (`e49b97c`), Debtor Drag (`94c63f7`), Working Capital (`60a5ed6`), Eight Levers (`8f8cdd7`); plus token extension `9edf3b1` (shared soft/contrast/shadow house-palette values promoted into the shell). **Last three (this session, Mike-approved per screen):** Quick Position (`9d41582`), EBITDA-DCF (`ebd6ab8`), Loan Estimator (`b927395` — page + its four step components). These three were raw-hex with the header + step-chips in the PAGE, and the Loan Estimator a 4-step flow across `LoanEstimator{Security,Business,Serviceability,Report}.vue`; each was behaviour-preserving (every swapped value equals the token it points at). **Owner-approved consequence (first five):** the four house screens now size to the shell's 1120px wrap → a small width tidy-up to match Lease vs Buy (Eight Levers narrowed most, from a 1180px cap). Off-standard numbers kept LITERAL for the Step 3 sweep: Eight Levers 320/18/900; all screens' 340px col (Loan Estimator 320px); the Loan Estimator input screens' 10px card radius + 13px/700 card title; plus genuinely bespoke per-model accents (verdict panels, runway/bar-chart viz, drop-zone cyan, `#223a57` field-label ink, `#f8fbfd` zebra). Suite 1,753 → **1,767 green / 126**, lint clean throughout.
  - ✅ **Step 3 DONE — `ff549b6`** — the five ruled numbers now come from the shell tokens on every screen: the two-column layouts read `var(--rs-col-input)` / `var(--rs-col-gap)` (→ 360px / 20px), the three Loan Estimator input cards read `var(--rs-card-radius)` (10px → 14px) + the standard 12px/600/.1em title, and Eight Levers' odd 900px/18px fell into line. Card padding (16px vs the doc's 16px 18px on four cards) is NOT one of the ruled five and is left literal — flagged for a separate owner call. EBITDA-DCF has no two-column layout. Suite 1,767 green / 126.
  - ✅ **Step 4 DONE (no code change) — all-light already true.** The 8 report screens carry no `prefers-color-scheme` block (removed during migration) and the shell has none (pinned by `reportShell.component.test.js`). *(Separate: `ModelLibrary.vue` — the catalogue landing grid, outside this standard — carried its own `--mlb-*` dark override. **✅ RULED + REMOVED 2026-07-28** — see the entry below.)*
  - ✅ **Step 5 DONE — `264bdb9`** — `tests/unit/reportShellFrame.test.js` fails the build if a live report page does not wrap its screen in `<report-shell>`. The guarded list is DERIVED from `reportModelCatalogue`'s ready routes (single source), so a new `ready` report is covered automatically — no manual add. Sibling to `reportHeadlineConsistency` (banner) + `reportBadgeClass` (badge). Mutation-verified (page `report-shell` root → plain div fails exactly the shell-adoption assertion; revert → green). +17 tests, suite 1,767 → **1,784 / 127**.
  - ✅ **Step 6 DONE — `29fac32`** — `ADDING-A-REPORT.md` steps 6 (page wraps in `<report-shell>` + import example), 7 (screen declares no frame/palette/card/font — reads the `--rs-*` tokens; no dark mode), 8 (frame guard is catalogue-derived, no manual step), the checklist, and the "three guards" section all updated to teach the shell-first flow.
  - ✅ **POST-LOCK REFINEMENT 2026-07-27 (owner-caught, all pushed `203fd64`→`053efe8`; suite 1,784 → 1,799 green / 128).** After the "complete" mark the owner caught three real defects the guards couldn't see — all RENDERED-geometry (jsdom has no layout engine, so no mount test can measure a width or gap):
    1. **Banner not full-width** (`203fd64` + doc `3c7321b`): six screens rendered the HeroStrip INSIDE the 1fr results column (~740px), not as a full-width band. Lifted to a full-width band above the two-column layout on all six; NEW check in `reportHeadlineConsistency` asserts the banner's DOM parent is the screen root; the standard's Banner section gained the placement rule.
    2. **Header shrunk + gap doubled** (`d3c9595` + anatomy/reference `c574bff`): making the roots flex columns collided with the shared `ReportHeader`'s `margin: 0 auto 22px` (auto margins override stretch → shrinks; the 22px stacks on the flex gap). Reset via `.<root> ::v-deep .rs-top { margin: 0 }` on the five header-inside screens; NEW guard `reportHeaderFullWidth.test.js` (mutation-verified). The [A]–[D2d] **section anatomy** is documented in `REPORT-VISUAL-STANDARD.md` and saved as the labelled `design/REPORT-LAYOUT-REFERENCE.html`.
    3. **Gaps not uniform** (`053efe8`): unified every section-level gap to **16px** — `--rs-col-gap` 20→16, `--rs-card-pad` "16px 18px"→"16px", EBITDA `.ed-report` 18→16, Loan Estimator `.ler-result` 12→16, stepped-page (QP/EBITDA/Loan) header→chips→content →16. Micro-spacing *inside* components (tile grids, button rows, chart labels) left tighter (owner ruling). **This CLOSES the Step-3 "card padding left literal" follow-up** (now uniform 16px). `reportShell.component.test.js` pins the revised `--rs-col-gap:16` + `--rs-card-pad:16`.
    Report layout now has **four** guards: `reportBadgeClass` (badge), `reportHeadlineConsistency` (banner exists + full-width), `reportShellFrame` (frame), `reportHeaderFullWidth` (header full-width). **⚠ One unverified spot:** the stepped-page header spacing uses a page-level `::v-deep` that no test mounts (tests mount components, not pages) — owner to eyeball QP/EBITDA/Loan in the running app. *(Static read 2026-07-28 says all three are correct — identical `::v-deep` reset on all three pages, more specific than `ReportHeader`'s own rule so it wins, and the header cannot shrink here because `.report-shell__wrap` is a block, not the flex column that caused defect 2. Reading CSS proves intent, not rendered pixels — the owner's eye is still the only proof.)* ~~**Still-open owner call:** `ModelLibrary.vue`'s own `--mlb-*` dark-mode block.~~ *(Ruled + closed 2026-07-28 — next bullet.)*
  - ✅ **ALL-LIGHT RULING EXTENDED TO THE CATALOGUE GRID — DONE 2026-07-28 (laptop, Mike-approved per change).** The last dark-mode override in shipped app code is gone. `ModelLibrary.vue` obeyed the viewer's OS dark-mode setting via `@media (prefers-color-scheme: dark)` re-pointing the `--mlb-*` palette at a near-black canvas; every report screen had been ruled all-light on 2026-07-27, so a dark-mode visitor got a **dark catalogue handing over to a light report, one click apart**. Invisible to the owner, whose machine runs light. Mike ruled **remove it** (the journey cannot be dark end-to-end when the client-facing half is ruled light). Block deleted, replaced by a comment recording that the absence is deliberate — the `ReportShell` pattern, so the next reader does not "correct" the oversight. **Whole-app inventory done first** (the ruling covers the section, not the file being edited): `prefers-color-scheme` now appears in **zero** shipped `.vue`/`.js` files; remaining hits are `design/mockups/*.html` (static reference artwork, not shipped), docs, and `package-lock.json`. **NEW GUARD `tests/unit/modelLibraryLight.test.js` (+2)** — this file had no styling guard at all, so a later tidy-up re-adding a dark block (which reads like an oversight being corrected) would have shipped green. Two assertions, deliberately: the media query, **and** the five dark palette hex values — guarding the values survives a change of *mechanism* (body class, data attribute) that a media-query-only check would miss. Source-read not mounted, and the JSDoc says why: jsdom neither resolves scoped `<style>` blocks nor evaluates `prefers-color-scheme`, so a mount test could not observe the guarded thing and would pass by accident. **Mutation-verified outside the repo** (`scratchpad/mutate-modellibrary.js`): control passes both, mutant with the block re-injected **fails both**, naming all five colours. Suite 1,799 → **1,801 green / 129 suites**, lint 0 errors. ✅ **Owner-checked and CLOSED 2026-07-28** — Mike confirmed the Model Library stays light with Windows in dark mode. *(This line said "check outstanding" until 2026-07-29 while the session notes recorded it as confirmed — the two documents contradicted each other. Corrected here.)*
- **⚠ TWO RECORD CONTRADICTIONS, UNRESOLVED — raised 2026-07-28 morning, again at that day's close, and again 2026-07-29. FOURTH session carrying both. Both need one sentence from Mike; neither can be settled by reading the repo.** A record that contradicts itself is worse than a missing one, because both halves look authoritative:
  1. **`v0.6.0` — offered or not?** `DEPLOYED-VERSIONS.md` says it was *offered to the master team*; `SESSION-2026-07-27-NOTES.md` says it was *"still not sent"*. The ledger is the binding document, so if the notes are right the ledger is currently lying about a release.
  2. **The Lease vs Buy source `.xlsx` — corrected or not?** This file records that correction as **done** (`402c595`) in one line and **outstanding** two lines below. One is stale and there is no way to tell which from here.
- **◐ ACTIVE WORKSTREAM (started 2026-07-29, laptop) — Advisor Progress.** Plan + full file map: [`ADVISOR-PROGRESS-HANDOVER.md`](ADVISOR-PROGRESS-HANDOVER.md). Records which advisory tools an advisor used, at what capability tier, and what they scored — read by "My Progress" (own record) and a team view (firm manager). **The screens render, the routes are written, the tables are designed, and nothing has ever been written to a database, because the database has never been provisioned** (`config/integration.js` still carries `password: 'REPLACE_ME'`).
  - **Session 1 (2026-07-29, laptop):** two commits — the backend test bed and the honest-failure fix.
  - **Session 2 (2026-07-29, laptop):** three commits — `eb0c466` the Team Progress tab, `a2b5416` My Progress reduced to one job + its first tests, `526ca6e` sessions with no capability level counted. Suite **1,950 → 1,996 / 133 suites**, lint 0 errors, branch **8 ahead / 0 behind** `master`.
  - ✅ **BACKEND TEST BED — DONE 2026-07-29 (Mike-approved), commit `3148a1d`.** The only prior coverage (`activity.routes.test.js`, 6 tests) is a **security file**: every test proves identity comes from the verified JWT and never from the client, and **every one hands the routes an EMPTY result set**. So the ~50 lines turning rows into tier cards, average quiz scores, a recent-activity list and the team table **had never run over a single row** — a wrong average, a session filed under the wrong tier, or Recent Activity sorted oldest-first would all have shipped green. `tests/unit/activity.aggregation.test.js` **+24 tests** feeding realistic rows through `getProgression`/`getTeam`: tier counts, the 70/73 average landing on the rounding boundary (72, not 71), a skipped quiz excluded rather than counted as zero, per-tier `lastActive`, the 10-item cap, and mysql2's habit of returning COUNT/AVG as **strings** (a dropped `Number()` would concatenate '3'+'2' to "32"). Database is a stand-in throughout — **needs no MySQL**, which is the point. **Mutation-verified outside the repo** (`scratchpad/mutate-activity.js`, 7 mutants, control green, all killed).
  - ✅ **HONEST FAILURE — DONE 2026-07-29 (Mike-approved), commit `550efc8`.** Each of the four queries ended `.catch(() => [[]])`, so a refused connection was replaced with an empty result: **a broken database and a genuinely new advisor produced the identical screen** — a tidy page of zeros and "No activity yet". That is what kept the only real fault in this feature invisible; Mike completed two course sessions on 2026-07-28 (scoring 70 and 73) and **both ends stayed silent**. All four swallows removed — a **four-line diff**, no other production change. The honest path below them already existed, and so did the screen's error state (`AdvisorProgression.vue` L12-14 — message + Try Again button); **it had simply never been reachable**. Tests re-pinned to the new behaviour, including the other half of the fix — an empty database must still read as a genuinely new advisor, or we trade a screen that hides faults for one that invents them. 8 mutants killed incl. the **regression direction** (putting the swallow back fails 3 tests). ⚠ **Visible consequence, intended:** My Progress now shows an error, because the database really is unreachable. **The WRITE path (`activityLogger`) deliberately stays fire-and-forget** — an outage must never interrupt a live advisor session.
  - ✅ **BOTH ODDITIES FIXED 2026-07-29 (Mike ruled option B), commit `526ca6e`.** They were recorded as `CURRENT BEHAVIOUR` tests precisely so a fix would fail the suite rather than pass quietly — and that is exactly how this change got read instead of waved through. Original defects: (1) a session carrying **no capability tier** appeared in Recent Activity but counted towards nothing; (2) worse — on the **team table** a tierless row listed the advisor with all zeros and no date, because `ensureAdvisor` ran before the tier check, so **nine real sessions read to a manager as an advisor who has done nothing**.
    - **How often this happens decided the ruling.** [`tierLookup.js`](../server/utils/tierLookup.js) returns no tier for an **empty or unrecognised** tool list, and maps the three role-based **Get Organised** subsections to `null` **by design**. A client conversation that ends without a tool recommendation produces exactly this row — routine, not exotic.
    - **Ruling (Mike, over the alternative of leaving such advisors off the table entirely): count them and say so.** Hiding the advisor trades one false impression for another; "nine sessions, none yet at a capability level" is both true and useful.
    - Both routes now report an `unclassifiedSessions` tally, `totalSessions` includes it, and **`lastActive` is read from any session rather than only a levelled one** — previously an advisor's most recent work was invisible if it happened to be unclassified. Team table shows *"N not yet at a level"* under Total (+ a legend line that appears only when something is); My Progress shows the count under the tier cards and labels the previously **blank** badge *"No level yet"*.
    - **Unlevelled quiz scores stay out of every average** — an average belongs to a tier and these rows have none. Deliberate, and the one thing the fix drops rather than surfaces.
    - Also fixed in the same pass: an advisor whose work was **entirely** unclassified was told to *"Complete a VA case… to start building your progress record"* while having done several — the same denial of real work, from the other side.
    - **Mutation-verified outside the repo** (13 mutants across all three files, all killed, incl. restoring the original defect). **The harness was wrong twice before it was right** — CRLF-written patterns silently matched nothing, and a copied module's relative `require` could not resolve — and once fixed it exposed a **real test weakness**: a fixture whose unlevelled count and total were both 9 could not tell the two numbers apart. **Lesson to carry:** never believe a mutation verdict without a green control run AND a check that each mutant actually applied.
  - ✅ **STEP 0 SETTLED 2026-07-29 by reading the code — the team view belongs IN the Firm Manager Hub.** The handover flagged two competing manager views. `FirmDashboard.vue` (the mock with "Sarah Chen"/"James Park", and a `generateInsights()` that is **string concatenation, not AI**) is **not a tab of the Hub on either branch** — it is an orphan reached from a Course Builder button. Its intended route `/api/firm/advisors` **does exist and is registered**, but returns `{advisors: []}` and proposes a **three-table schema (`advisors`/`courses`/`course_sessions`) that was never built** — while the real data already sits in `advisor_va_sessions`, `advisor_course_completions` and `va_courses`. So: **build a team-progress TAB in `FirmManagerHub.vue`**, next to Team Case Studies. Do not build against `firm.js`'s TODO schema.
  - ✅ **TEAM PROGRESS TAB BUILT 2026-07-29 (Mike-approved, wording signed off first), commit `eb0c466`.** [`components/firm/FirmTeamProgress.vue`](../components/firm/FirmTeamProgress.vue) + one tab line in [`FirmManagerHub.vue`](../components/FirmManagerHub.vue) + the `firmTeamProgress` i18n block + 14 component tests. **No backend work was needed:** `GET /api/activity/team` already sat behind `firmAuth + requireManagerRole` — the same guard the whole Hub uses — so the firm is taken from the verified token, never the browser. Uses `b-table`, the Hub's established pattern.
    - **What made this cheap: the table already existed and nobody could reach it.** The manager half of `AdvisorProgression.vue` rendered only behind an `isFirmManager` prop that **nothing in the app ever sets** — [`pages/advisor.vue`](../pages/advisor.vue) is the only mount point and does not pass it. So this was relocation, not new construction. *(Same flag gates the Course Builder button that opens the `FirmDashboard.vue` "Sarah Chen" mock — meaning that fiction is not currently reachable by a firm either. Worth knowing before treating it as urgent.)*
    - **Mutation-verified** (7 mutants, all killed). One initially **survived**: deleting the HTTP-status check changed nothing, because every failure fixture also tripped the success-flag guard below it. A test for a non-OK response carrying well-formed-looking data now pins it.
  - ✅ **MY PROGRESS IS ONE ADVISOR'S OWN RECORD 2026-07-29 (Mike-approved), commit `a2b5416`.** The dead team half, the `isFirmManager` switch and ~50 lines of orphaned styling removed from `AdvisorProgression.vue`; `VirtualAdvisor.vue` stops passing the flag down (the flag stays — Course Builder uses it). Net **107 lines deleted, 33 added**. **18 tests — the first this live screen has ever had**, incl. two that fail if the team table or the manager switch ever returns here, so we cannot quietly end up with two copies again. Assertions target **structure and figures, not English**, so the pending i18n sweep will not redden them. Mutation-verified (9 mutants, all killed) — **two of the nine first "died" from a compile error rather than a real catch** (deleting a `v-if` orphaned its sibling `v-else`) and were rewritten to flip the condition instead.
  - ✅ **ADVISOR NAMES WIRED 2026-07-29 — the link-in point exists; the master app fills it.** Mike's ruling: authentication and advisor-ID allocation already happen in Advisor-e before a user ever reaches this app, so the name arrives on the **same verified token** — our job was the stub, not a lookup. `AUTH.nameClaim` added to [`config/integration.js`](../config/integration.js) (alongside the existing firmId/advisorId/role/email claims and their confirm-with-the-auth-team TODOs); `firmAuth` sets `req.advisorName`; both write paths carry it; `advisor_name` columns added to both tables; the team table shows the name with the ID beneath it.
    - **Why it is CAPTURED AT WRITE TIME, not looked up at read time** — the decisive constraint: a JWT carries the name of *the person holding it*. A firm manager's token tells us the manager's name, never a colleague's, and this app holds no advisors table to join against. So each advisor's name is recorded when **they** do the work, from **their** token — the same principle as the capability tier, and self-sufficient without any new master-app endpoint.
    - Null-safe throughout: no name claim ⇒ `advisorName: null` ⇒ the screen shows the ID, which is exactly today's behaviour. Nothing breaks before the claim lands, and nothing is invented.
    - The most recently active row's name wins, so a changed name updates; an older name is still used rather than showing none. Unclassified sessions carry a name and date like any other — the same trap that made nine sessions read as nothing.
    - ⚠ **Privacy note (raised, not hidden):** this puts a person's name in tables that previously held only IDs, tiers and dates. Scope is the firm's own advisors within the firm's own record. Flagged for the master team's confirmation, since Advisor-e owns the advisor record.
    - ☐ **Still to confirm with the Advisor-e auth team:** the actual claim name (`nameClaim` currently guesses `'name'`). Wrong guess = names simply do not appear; nothing else misbehaves.
  - ☑ ~~**NEW FINDING 2026-07-29 · DECISION — the team table lists advisors by RAW ID, and nothing we hold can give it a name.**~~ **Answered by the ruling above.** Kept for the reasoning: A manager sees `dev-advisor-001`, or a platform ID string in production. Neither `advisor_va_sessions` nor `advisor_course_completions` carries a name or email, and [`db-schema.sql`](../config/db-schema.sql) L122 says why: *"advisor_id is not FK-constrained — advisors table belongs to the Advisor-e platform."* **This is the one thing between a working screen and a useful one.** The column heading was deliberately left as "Advisor" rather than "Advisor ID" so today's limitation is not baked into the design.
  - ☐ **NOT PROVEN BY EYE (honest limit on all of today's work).** Neither screen has been opened in a browser, and **both will show their error message until MySQL exists** — which is them working correctly, not a fault. Everything today is proven by tests and fixtures only. The test suite cannot see a screen.
  - ✅ **DEV-FILE FALLBACK BUILT 2026-07-29 — the feature works with NO database**, commit `4ac8453`. New [`activityStore.js`](../server/utils/activityStore.js): activity was the ONE store lacking the try-MySQL-then-JSON-file pattern that case studies, courses, clients, firm overlays and firm content all have. That, not MySQL provisioning, is why these screens had never shown anything. The SQL moved there verbatim so the routes' aggregation is untouched; the fallback reproduces INSERT IGNORE de-duplication, GROUP BY with NULL as its own group, AVG ignoring NULL scores, and COUNT/AVG as **strings** like mysql2's. **Honest-failure kept on both sides of the seam:** production propagates a DB failure untouched; inside the fallback a MISSING file is a new advisor and a CORRUPT one throws. 17 tests. Proven end to end against a genuinely absent database.
  - ✅ **`.env` WAS NEVER READ 2026-07-29**, commit `37f29c1`. The backend starts with plain `node`, which does not load `.env` — so the OpenAI key, the JWT secret and the CA path sat in the file while the process reported them missing. Now loaded at the entry point (not via a `-r dotenv/config` flag, which would silently do nothing on the direct-path launch recipes), guarded so a deployment without dotenv still boots. The placeholder-MySQL warning was also corrected: it claimed the routes "will return empty data", untrue since the fallback landed. ~~**`dotenv` is undeclared — logged as its own P1**~~ — **declared and CLOSED 2026-07-30**, see [§undeclared-dotenv](#undeclared-dotenv).
  - ✅ **i18n SWEEP DONE 2026-07-29 — `AdvisorProgression.vue` is fully translated.** 21 `$t()` calls; zero hardcoded user-facing English left. Same words as before — moved, not rewritten, so no wording needed re-approval. `DOMAIN_LABELS` (a map of English) became `KNOWN_DOMAINS` (a list of codes) with the wording in `advisorProgress.domain.*`; an unknown domain still falls back to its raw code so a new engine domain is visibly unlabelled rather than invisible. The error state now stores an i18n KEY rather than an English sentence. **Two of the screen's own tests did go red** — the ones asserting English domain names — against the claim that key-based assertions would survive the sweep; repointed at keys. *(Honest note: that claim was 16/18 right, not 18/18.)*
  - ☐ **NEXT (each its own approval):** ~~(1) `activityLogger.js` write path still has **no direct tests**~~ — **DONE 2026-07-29 (session 4), commit `94fbc61`, 45 tests, 14/14 mutants killed**; ~~(2) `FirmDashboard.vue`~~ — **DELETED 2026-07-29 on Mike's ruling**, with its button, its `firm` panel mode and its two orphaned backend routes; (3) 🔒 **provision MySQL** — no longer blocks the screens, only real multi-machine persistence; ~~(4) per-question quiz record~~ — **BUILT 2026-07-29**, see below.
  - ✅ **PER-QUESTION RECORD BUILT 2026-07-29 — the substantive open feature of this workstream.** `log-course` sent only a score, so the tables had never seen an individual question and a manager could see *that* an advisor got 73, never *what* they got wrong. Now each completed session stores `[{bankKey, bankRef, score, passed, ungraded}, ...]` in a `quiz_questions` JSON column, and the advisor's own progression returns it.
    - **The standing recommendation was implemented rather than re-asked: NO free text.** Not the advisor's written answer, not the question text, not the marker's feedback. Advisors write differently once they believe a manager reads their words, which would degrade the very signal the record exists to collect — and text can be added later, but cannot be un-stored. **Proven, not asserted:** an end-to-end run submitting `answer` and `question` fields alongside the real data found **no trace of them anywhere on disk**.
    - **Treated as hostile input.** The identity on this route comes from the JWT, but the question detail comes from the browser. New `server/utils/quizRecord.js` drops unknown fields rather than passing them through, coerces every type, refuses out-of-range values instead of clamping them into something plausible (a score of 900 becomes "no score", not 100), and caps both the array and each string so a crafted payload cannot bloat a row. **15 tests** — the 100% standard CLAUDE.md sets for functions processing untrusted input.
    - Two shapes handled on read because both occur: mysql2 returns a JSON column already parsed, the dev-file fallback stores a string. A malformed record reads as an empty list rather than failing the whole screen.
    - ☑ ~~**Manager-facing view NOT built, deliberately.**~~ **BUILT 2026-07-29** — see the next item. Kept for the reasoning: returning a colleague's questions is a cross-advisor read and needed the same `firmAuth`/IDOR treatment as the rest.
  - ✅ **MANAGER VIEW OF THE PER-QUESTION RECORD BUILT 2026-07-29 (Mike-approved, wording signed off first).** New route `GET /api/activity/team/advisor/:advisorId` (`getAdvisorQuestions`) + new [`components/firm/FirmAdvisorQuestions.vue`](../components/firm/FirmAdvisorQuestions.vue), opened by a **Quiz detail** button on each row of the Team Progress tab. Mike chose **both** shapes over either alone: a **topic rollup** (per question bank — asked / correct / average, **weakest first**) and a **session-by-session** list. **43 new tests**; suite **2,083 → 2,085 / 137 suites**, lint 0 errors.
    - **No new SQL and no new firm boundary.** It reuses `readAdvisorSessions`, which already filters on advisor AND firm together, so a manager naming an advisor in another firm gets an empty record and cannot tell that apart from "no record" — no probing for who exists. Same `firmAuth + requireManagerRole` pair as the team overview. The advisor id in the path is the only client-supplied value on the route, and it is capped like every other stored identifier.
    - **The no-free-text guarantee is now enforced on the way OUT as well as in** — every question is put back through `normaliseQuizQuestions` on read. Even a row written by an older path, or a hand-edited dev file, could not carry an advisor's own words to a manager's screen. Pinned by a test that stores `answer`/`question`/`feedback` and proves none of them survive.
    - **An unmarked question is never a wrong one.** It is tallied separately, kept out of every average, and a topic whose questions were ALL unmarked sinks in the ordering rather than heading it on no evidence — otherwise the screen would send a manager to coach a weakness nobody has shown.
    - ⚠ **Privacy step-change, raised before building and approved:** this is the first screen showing one named person's question-level results to someone else. Scope is a firm's own advisors, no free text, and no advisor's record is fetched until a manager deliberately opens that row (pinned by a test).
    - ☐ **NOT PROVEN BY EYE.** Tests, fixtures and mutation only — the suite cannot see a screen. Needs no MySQL: the dev-file fallback carries it.
  - ✅ **P1 · FIX — a MISSING quiz score was being recorded as ZERO. Fixed 2026-07-29 (Mike-approved), `server/utils/quizRecord.js`.** `safeInt` tested `Number.isFinite(Number(value))`, and `Number(null)`, `Number('')`, `Number([])` and `Number(false)` are all **0** — which is a legitimate score. So a graded question that came back with **no mark at all** was stored as zero out of 100: **a failure the advisor never had.** The existing 15 tests pinned `900`, `-5`, `NaN` and `'abc'`, but never `null` or an empty string, so it had been live since the per-question record shipped that morning.
    - **Why it surfaced now, and why it mattered more:** until the manager view, a fabricated zero only dragged down an average an advisor saw about themselves. It would now be shown to their manager, against a named topic, as a question they got wrong.
    - **Found by mutation testing, not by reading** — mutant M4 survived, which is what a genuinely missing test looks like. The fix is one guard (only a number, or a string with something numeric in it, can be a score); the write path is corrected too, so nothing new is stored wrong. `bankRef` is unaffected — those values already fell outside its allowed range and came out null anyway.
    - +7 assertions, including the two that must still hold: a genuine `0` survives, and a score arriving as the string `'73'` is still 73.
    - ☐ **Pre-existing rows are not migrated.** Any zero already stored may be a real zero or a fabricated one, and nothing distinguishes them. Only the dev file can hold such rows today (MySQL has never been provisioned), so the exposure is one developer machine — but if MySQL is provisioned before this is considered, that stops being true.
    - **Mutation-verified: 22 of 22 mutants killed**, on a green control run, with every mutation proven to have applied. It also caught a test of mine passing for the wrong reason (an alphabetical tie-break produced the expected order even with the ordering logic inverted). **Harness lesson, again:** the repo files are CRLF, so multi-line patterns written with `\n` matched nothing and reported as "killed" — the harness now normalises line endings rather than relying on anyone remembering.
    - ✅ *(was item 1)* merge `master` in — **done**, commit `ce9ef42`; the branch is level with `origin/master`, not 46 behind.
    - ✅ *(was item 2)* the team-progress tab in the Hub — **done**, see above.
    - ◐ *(was item 3)* tests — **done for both screens** (32 new component tests); **i18n still open**, now item 2 above.
  - ☑ ~~**P3 · DOC — `activityLogger.js` L9-11 is stale.**~~ **ALREADY FIXED — found 2026-07-29 (session 4) while writing that file's tests.** The header now states plainly that advisorId/firmId are JWT-derived and NOT taken from the request body, and says the earlier comment misdescribed the feature's security posture. The entry, not the code, was out of date. *(Third instance in one day of this file lagging the code — see the file's own "trust the CODE, not these flags" warning at the top.)*

  ### Session 4 (2026-07-29, laptop) — a by-eye attempt, two defects, and the last test gap closed

  Three commits (`5a6cb7c`, `086419f`, `94fbc61`), all pushed. Suite **2,085 → 2,158 / 140 suites**
  (+73), lint 0 errors, tree clean, **20 ahead / 0 behind** `master`.

  - ⚠ **THE SPINNING SCREEN WAS NEVER AN APP FAULT — record this so nobody hunts it again.**
    My Progress span for ever with **no red in the console and NOTHING in the backend log**,
    while identical requests from Node answered in 20 ms. Cause: **Chrome allows only SIX
    simultaneous connections per host, and in Nuxt dev EVERY OPEN TAB permanently holds one for
    hot-reload** (`[HMR] connected`). With all six taken, the screen's `fetch` was **queued
    inside the browser and never sent**. A *fresh tab makes it worse*, which defeats the obvious
    "reload and see". **Fix: close the other `localhost:3000` tabs.** Production-immune — there
    is no hot-reload connection there.
    - **The diagnostic that cracked it:** `Get-NetTCPConnection -RemotePort 3000 -State
      Established` → 6, owner `chrome`. And before that, **counting the backend log against my
      own calls** — every entry was attributable, which proved the browser had never once
      reached the progression route while the Firm Manager tab had. **Rule of thumb: a request
      absent from the SERVER log never left the browser — stop debugging the server.**
    - **Also learned:** Restify has **no hot-reload**. A backend running since before a commit
      serves the OLD code — routes 405, new fields silently absent. Compare source-file mtimes
      against the process start time before believing any live behaviour.
  - ✅ **FIX — a panel mode no longer opens a conversation**, commit `5a6cb7c`. `selectMode()`
    kept a THIRD copy of "modes that are a panel, not a chat" (`noConversation`), alongside
    `PANEL_MODES` and the template's own chain. It had drifted twice: it never gained
    `progression`, and it carried `firm` until the FirmDashboard deletion. So opening My Progress
    asked vue-i18n for **`opening.progression`, a key that has never existed in any locale file**,
    and pushed the raw key into the message list as the assistant's opening line. Nothing
    displayed it — the progression panel replaces the message area — so it surfaced only as a
    console warning, and only once someone finally opened the screen. **Latent since the screen
    was built.** The duplicate list is deleted and the check reads `PANEL_MODES`. +4 tests in the
    file that already guards this exact drift.
    - **Deliberately NOT asserted:** that a panel mode has no `opening.*` string. `course`
      legitimately has one — CourseBuilder runs its own conversation *inside* the panel and uses
      it four times. A panel may own a greeting; what it must not do is have `selectMode` push
      one on its behalf. *(My first version of that test was wrong and was corrected, not the
      code.)*
  - ✅ **FIX — every activity screen now has a request time limit**, commit `086419f`. `fetch()`
    has no timeout of its own, so an unanswered request stays pending for the life of the page;
    all three screens share the `loading = true … finally { loading = false }` shape, so the
    spinner never stops and the user is told nothing. **This is the read-path swallow defect one
    layer up** — a failure that renders as "still working". New
    [`utils/fetchWithTimeout.js`](../utils/fetchWithTimeout.js) wired into **all three** screens,
    not just the one that failed (section-wide, per the standing scope rule).
    - **It ABORTS, not merely abandons.** An abandoned request keeps holding one of the browser's
      six connection slots, so a screen that timed out would make the next one likelier to time
      out too. Where the browser has no `AbortController` it still stops waiting.
    - **No new user-facing wording** — a timeout rejects, landing in the `catch` each screen
      already has, reusing the error copy already approved. **All 66 existing component tests
      passed UNMODIFIED**, so the wiring is behaviour-preserving; nothing was re-pinned to make
      it green. 24 new tests, and the screens are tested individually because a correct helper
      proves nothing about whether a screen calls it.
  - ✅ **`activityLogger.js` TESTED — the last untested file in this workstream**, commit
    `94fbc61`, **45 tests**. It decides *what* is written into an advisor's permanent record and
    had never run under a test: a value truncated at the wrong length, a tier from the wrong
    list, or a genuine 0 turned into "no score" would all be written permanently, and no
    read-side test could tell afterwards.
    - **Pins the deliberate asymmetry with the read path**, so it is not "corrected" by someone
      who has read only the other half: writes **swallow** their errors (a storage outage must
      never interrupt a live advisor session) **but still log the CAUSE**. That console line is
      the only trace a lost write leaves — "it failed" with no reason is what made the live MySQL
      refusal take a day to pin down.
    - Also pinned: identity is required or nothing is written (an unattributable row inflates a
      firm's totals and belongs to nobody); the tier is computed at WRITE time; a genuine `0`
      survives while a skipped quiz stays `null`; a non-array list never reaches the store; a
      missing title stores `''` rather than the four-letter word `"undefined"`; every string is
      cut to its column width, because an oversized value refused by the database mid-session
      would vanish into the fire-and-forget swallow.
    - **Mutation-verified: 14 of 14 killed**, green control, every mutation proven to have
      changed the file before its verdict was believed. No production file was modified.
  - ☐ **NEW · DECISION for Mike — `sessionIndex` is not validated (found, deliberately NOT
    fixed).** `Number(undefined)` is `NaN` and nothing rejects it: the dev file turns `NaN` into
    `null` on `JSON.stringify`, while **MySQL would refuse the row outright — and because the
    write is fire-and-forget, that refusal is swallowed and the session is lost with only a
    console line.** It is also **half the de-duplication key** (advisor, course, index), so a
    `NaN` cannot match an existing row and `INSERT IGNORE` cannot do its job. Every real caller
    supplies it (CourseBuilder passes the loop index), so it is not biting today. **Pinned as a
    `CURRENT BEHAVIOUR` test** so a future fix FAILS the suite and gets read rather than passing
    quietly — the pattern that paid off on the two tier oddities. Changing a write path needs its
    own ruling.
  - ☐ **STILL NOT PROVEN BY EYE.** The servers were shut down at Mike's instruction before any
    screen was opened. Everything this session is proven by tests, fixtures and mutation only.
    **Before the next attempt: close every `localhost:3000` tab but one.**
  - **Seeded for that attempt (local only):** `data/dev-activity.json` — gitignored, never in the
    repo — now carries one course session for `sample-advisor-02` with **9 questions across 3
    real quiz banks, one unmarked**, so Quiz detail renders a genuine weakest-first rollup
    (Debtor Protocols 42 · Working Capital Cycle 68 · 7 Cash Drivers 85). The three older
    sessions still show 0 questions, correctly — they predate the per-question record.

  ### Session 5 (2026-07-29, laptop) — the CPD record, backend

  Suite **2,158 → 2,299 / 143 suites** (+141), lint 0 errors. **Backend only — no screen
  exists yet, so an advisor sees nothing of this.**

  - ✅ **THE THREE CPD ALLOWANCES ARE NOW READ. Built 2026-07-29 (Mike-approved, wording
    signed off first).** Every template in the master export carries three authored times in
    `cpd`: `watchedVideo`, `reviewTemplate` and `reheasedTemplate` (video · reading ·
    rehearsing with a colleague). **Only the first was ever used, and only to add a sentence
    to advice — the other two, ~82 hours across the library, had never been read by anything.**
    An advisor can now record CPD against the templates their own work used.
    - **Mike's ruling on what a tick MEANS: it is a PLEDGE, and that is built into the row.**
      `pledge_key` + `pledge_version` store the exact declaration shown at the moment of the
      claim (a key, never English), so a later rewording cannot change what an advisor agreed
      to. Nothing is ever ticked on their behalf — no pre-ticked boxes, nothing inferred from a
      finished session. Only the token holder can claim their own.
    - **Mike's ruling on repeats: they COUNT.** *"If an advisor watched it 3 times it should be
      recorded — some concepts require extra effort."* So a claim is a counter, not a checkbox,
      and there is **deliberately no unique key** on the table. A per-session cap was proposed
      and rejected: it could not record three viewings for one session.
    - **A withdrawal keeps the row and stamps `withdrawn_at`.** A figure may already have gone
      into a real CPD submission; a record that vanishes is worse than one showing a claim made
      and later withdrawn.
    - **Minutes are FROZEN into the row at claim time**, like the capability tier.
      `data/templates.json` is replaced wholesale on every master export (five times since May);
      a total an advisor has already declared must not move underneath them.
    - **Nothing that gives a claim its value comes from the browser.** The client names a
      template and one of three activities; minutes, real title, page and pledge are all
      resolved server-side. A request naming `minutes: 9999` is pinned by test to store 9.
    - **An advisor may only claim against templates their OWN sessions used** — otherwise the
      whole library is claimable by anyone who knows a title.
    - Files: [`server/utils/cpdCatalogue.js`](../server/utils/cpdCatalogue.js) (new),
      `advisor_cpd_claims` in [`db-schema.sql`](../config/db-schema.sql), three routes in
      [`activity.js`](../server/routes/activity.js) (`GET /api/activity/cpd`,
      `POST /api/activity/cpd/record`, `POST /api/activity/cpd/withdraw`), store read/write in
      [`activityStore.js`](../server/utils/activityStore.js), registration in `restify-server.js`.
      The two advisor-session SELECTs were widened by one column each (`recommended_templates`,
      `session_resources`) — additive; the progression and quiz-detail aggregations are untouched.
    - **Mutation-verified: 29 of 31 killed**, green control, every mutation proven to have
      applied, harness outside the repo restoring by checksum. **The two survivors are
      EQUIVALENT mutants** (a swap between two zero-minute records, neither claimable; and an
      early allowlist guard whose real enforcement is three lines below it). Both are now
      explained in the code so they are not re-hunted — the guard is kept deliberately.
  - ⚠ **THREE DEFECTS IN THE MASTER EXPORT — found, handled conservatively, NOT edited here.**
    The export is generated by the master app and is never hand-corrected in this repo.
    - **The rehearsal field is misspelled at source: `reheasedTemplate`.** Read exactly as
      spelled, and pinned by a test — a "tidied" field name would silently read nothing.
    - **Neither `page` nor `title` is unique.** 21 page ids and 5 titles appear on more than one
      record; 10 disagree about CPD time. Identity is therefore the normalised TITLE (what the
      activity tables actually store). `cpd.isHidden` resolves nearly all collisions; where two
      visible records still disagree **the LOWER figure wins and the disagreement is logged** —
      never the higher, because over-claiming a regulated figure on a data defect is the one
      outcome that cannot be undone. Exactly one template is affected today: **"Advisor Prep",
      84 vs 120 minutes.**
    - **One hidden record carries time** — "Business Purchase Assessment 1", 15 minutes'
      reading, with no visible twin. The master app marked it hidden, so it is deliberately not
      claimable. Flagged rather than quietly granted.
    - Two allowances are fractional (15.2, 24.23) and round to whole minutes.
  - ✅ **P2 · FIXED 2026-07-30 (Mike-approved) — the tutorial-video sentence is alive again, across
    83 templates.** **The premise below was half wrong, and the correction is the useful part: the
    data was never missing.** Every one of the 289 records in `data/templates.json` carries a `cpd`
    block, and **83 hold `cpd.watchedVideo` above zero** — the injector was simply reading
    `videoMinutes`, a hand-made *copy* of that field, which **0 of 289 records have**. Meanwhile
    [`cpdCatalogue.js`](../server/utils/cpdCatalogue.js) L108 reads `cpd.watchedVideo` off the very
    same list and has always worked — one file read the original, the other a stale duplicate.
    **Fix:** [`videoInjector.js`](../server/utils/videoInjector.js) reads the authored field, with
    cpdCatalogue's guards (finite number, rounded, 1–1440 minutes, `isHidden` skipped), and
    **`scripts/sync-video-minutes.js` is DELETED** — its only job was to create the duplicate that
    rots, and nothing else ever read it. Recoverable from git history.
    - **Rounding is deliberate and follows precedent, not invention:** the export carries 15.2 and
      24.23, and *"a 15.2-minute tutorial video"* is not English. `Math.round` matches
      `cpdCatalogue.activityMinutes`, so the advice and the advisor's own CPD record state the
      **same** number for the same video rather than differing by a decimal.
    - **18 tests — the first this file has ever had**, which is the actual repair: the outage was
      invisible for ten weeks precisely because nothing tested it. The first test pins that the
      minutes come from the authored field, so reintroducing a synced copy goes red at once.
    - **Mutation-verified 7/8, control green, every mutation proven to have applied.** **One
      survivor was a REAL gap, and it is the same lesson as the CPD screen's:** widening the block
      boundary does not move where the sentence lands — that is decided separately, by the first
      blank line — so the ordering test could not see it. What it *does* widen is the
      "already mentioned?" check, so **one template could be silently skipped because a LATER
      template's prose mentioned a video**, and that advisor would never learn their video existed.
      Now pinned. *(The 8th survivor is judged EQUIVALENT, not a gap: removing the "at least a
      minute" bound cannot change any output, because a rounded zero is already excluded by the
      `minutes > 0` check below it. The bound is kept as a statement of intent. Recorded as
      judgement, not as a proven kill.)*
    - ☐ **NOT PROVEN BY EYE.** The tests prove the sentence is produced; nobody has seen it in real
      advice. Needs a live session recommending a template that has one — *E.O.Y Meeting* (9 min),
      *Growth Curve* (15) and *Loan Estimator* (12) all qualify.
    - ☐ **LOGGED, NOT FIXED — the sentence is hardcoded English on the backend**
      ([`videoInjector.js`](../server/utils/videoInjector.js)), so a non-English advisor gets one
      English line inside otherwise translated advice. Pre-existing and out of scope here; it needs
      its own decision, because `vue-i18n` does not exist on the backend and the wording would have
      to be resolved another way. *Original entry follows for the record:*
  - ✅ **NEW · P2 · FIX — the tutorial-video sentence has been DEAD since 19 May 2026.
    FIXED 2026-07-30 (`b1b4432`); this entry was found still marked open on 2026-08-02
    (Session 26) and closed then.** The recommended fix below is exactly what was done:
    [`videoInjector.js`](../server/utils/videoInjector.js) now reads `cpd.watchedVideo` off the
    template record, `scripts/sync-video-minutes.js` is **deleted** so the manual step cannot rot
    again, and `tests/unit/videoInjector.test.js` exists where there were no tests at all.
    **Verified against the data, not taken from the commit message:** 291 records carry
    `cpd.watchedVideo`, **0** still carry the old `videoMinutes` copy, and **83** have a non-zero
    time — *E.O.Y Meeting* 9 min, *Growth Curve* 15 min. The sentence appears in advice again.
    - ⚠ **THIRD stale flag found in one day**, after the pre-commit P1 and the silent-default
      defect. All three described finished work as outstanding. This file's own header warning —
      *"trust the CODE, not these flags"* — is not advice, it is a measured property of the file.
      A stale-flag sweep was offered to Mike and not taken up; it remains worth doing.
    *(Original entry follows, unchanged, for the record.)*
  - ☐ ~~**NEW · P2 · FIX — the tutorial-video sentence has been DEAD since 19 May 2026.**~~
    [`videoInjector.js`](../server/utils/videoInjector.js) reads `t.videoMinutes`, and **no
    record in `data/templates.json` has that field**, so the map is empty and the function
    returns the text untouched at L35. *"A 9-minute tutorial video is available in Advisor-e to
    help you prepare"* has not appeared in any advice for ten weeks. Proof, counting the field
    at each commit that replaced the file: `672314a` 238 records/**88** → `1168e63` (2026-05-19)
    278/**0** → every export swap since 289/**0**. Cause: `videoMinutes` is a DERIVED field that
    [`scripts/sync-video-minutes.js`](../scripts/sync-video-minutes.js) must add by hand after
    every export swap, and it has not been re-run. **There are no tests for `videoInjector.js`**,
    which is why ten weeks passed. **Recommended fix (not done — needs its own approval): read
    `cpd.watchedVideo` off the template record directly, exactly as cpdCatalogue now does, and
    delete the manual sync step so it cannot rot again.** Nothing is broken on screen; advice
    simply stopped mentioning the videos.
  - ☑ ~~**NEXT — the screen (slice 2), its own approval.**~~ **BUILT 2026-07-29 (session 6) —
    see below.** Kept for the wording, which is the signed-off source and must still not be
    re-asked or invented: `components/CpdRecord.vue` mounted
    inside My Progress (NOT more of `AdvisorProgression.vue`, which is 405 lines and was
    deliberately reduced to one job), plus the approved wording into `locales/en.json`. **The
    wording is already signed off** — do not re-ask or invent it: section **CPD Record** /
    *Continuing Professional Development*; **CPD time recorded: 4h 20m**; *Tutorial video
    (9 min)* · *Read the template (60 min)* · *Rehearse with a colleague (30 min)*; button
    **Record**; *Recorded 3 times — 27 min*; **Withdraw**; empty state *"Nothing to record yet.
    CPD activities appear here once you have used a template in a client session or a course."*
    The three pledges: *I confirm I have watched this tutorial video in full.* / *…read this
    template in full.* / *…rehearsed this template with a colleague.* — with *"This is your own
    declaration. The date and time are recorded against your name."*
  - ☐ **NO MANAGER VIEW OF CPD, deliberately.** An advisor's CPD record is their own
    professional record, and this would be the second privacy step-change in a week. A decision
    for Mike once the screen exists, not a code question.
  - ☐ **NOT PROVEN BY EYE — and cannot be yet.** There is no screen. Everything in session 5 is
    proven by tests, fixtures and mutation only.
  - ☐ **HONEST LIMIT: a tick is a declaration, not an observation.** The app cannot see whether
    a video was watched or a rehearsal happened — the video lives in Advisor-e and the rehearsal
    happens in a room we cannot see. That is the design Mike chose (over a bare estimate), and
    it is how professional CPD logs work; the mitigations are the name, the timestamp and the
    stored wording on every row. The screen's copy must make the self-declaration plain.
    **Met by the screen (session 6):** the pledge sentence and the declaration notice are both
    shown before anything is recorded.

  ### Session 6 (2026-07-29, laptop) — the CPD screen

  Suite **2,299 → 2,334 / 144 suites** (+35), lint 0 errors. **An advisor can now see and
  record their own CPD.** Session 5's backend had no screen at all, so none of it was
  reachable.

  - ✅ **CPD SCREEN BUILT (Mike-approved; wording was already signed off and was used
    verbatim).** New [`components/CpdRecord.vue`](../components/CpdRecord.vue) (441 lines),
    mounted at the foot of My Progress by an 8-line change to
    [`AdvisorProgression.vue`](../components/AdvisorProgression.vue) — its own component, not
    more of a screen that was deliberately cut back to one job. It shows the running total,
    then each template the advisor's own work has used with its claimable activities, a
    **Record** button per activity, and **Withdraw** where something is standing.
    - **The approved wording went into `locales/en.json` as a new top-level `cpd` block —
      top-level because the pledge key stored on every claim row is literally
      `cpd.pledge.video`.** The wording has to live at that exact key, or a claim made today
      could not be shown in the words the advisor agreed to after a future rewording. That is
      the whole point of storing a key rather than a sentence, and it constrains where the
      block may sit. English only, like `advisorProgress` and `firmTeamProgress`; the seven
      other locales carry the core chat UI and fall back.
    - **The screen sends only a template name and an activity** — pinned by a test asserting
      the POST body has exactly those two fields. Minutes, the real title and the pledge are
      resolved server-side, so this screen could not inflate a regulated figure even if the
      browser were tampered with.
    - **Nothing is recorded without the pledge being shown.** Record opens a modal carrying
      that activity's declaration and the "This is your own declaration…" notice; the write
      happens only on the second, deliberate press. Pinned by a test that the first press
      writes nothing at all.
    - **A failed write is said out loud and the pledge stays open** — the backend deliberately
      does NOT swallow these (unlike the mid-session `activityLogger` write), and the screen
      had to match: an advisor who is not told their pledge failed will believe they have
      declared something they have not.
    - **Success re-reads the record rather than adjusting the figures here.** The total an
      advisor may declare is the server's, computed from the rows it actually stored — never
      one this screen incremented.
    - **Repeats stay claimable after a claim** (owner ruling): Record remains available beside
      the tally, because three viewings are three records.
    - **An activity the export no longer offers is shown as history without a Record button** —
      recorded, visible, withdrawable, but not claimable again.
  - ✅ **OWNER RULING — Withdraw takes back the MOST RECENT recording**, one press, rather than
    listing every claim with its own date and button. The recordings are identical apart from
    their timestamp, so the extra choice buys nothing; and nothing is lost either way, since
    the server keeps the row and stamps it withdrawn. Ordering is by claim date with the higher
    id breaking a tie — a date column with no sub-second precision can return two identical
    stamps, and "most recent" must still resolve to exactly one row. A claim with no readable
    date sorts oldest, so it can never be withdrawn in place of the newest.
  - ☑ ~~**TWO GAPS LEFT OPEN DELIBERATELY — both need wording Mike has not approved, and
    inventing copy is against CLAUDE.md.**~~ **BOTH CLOSED 2026-07-30 (session 7) — see below.**
    Kept for the record of why they were left: the pledge box closed only with the ✕, Escape or
    a click outside; and Withdraw acted immediately, one click on a professional record, with no
    question sentence in existence to put in front of it.
  - **Mutation-verified: 24 of 24 killed**, green control, every mutation proven to have applied,
    harness outside the repo restoring by checksum. **The first run had ONE survivor and it was
    a real gap:** deleting the HTTP-status check in the read path changed nothing, because every
    failure fixture also tripped the success-flag guard below it — so a proxy or gateway
    answering 502 with its own JSON would have rendered as a genuine CPD record, total included.
    ⚠ **This is the THIRD appearance of that same blind spot in this feature** (Team Progress
    tab, then the quiz-detail route, now here). A failure fixture that trips two guards at once
    can only ever prove one of them. Worth a standing habit: when a screen checks both the HTTP
    status and a success flag, one test must break them apart.
  - **One existing test file changed:** `advisorProgression.component.test.js` asserted the
    screen made exactly one request, and the new section makes its own. The child is stubbed
    there so those tests stay about the parent, and a separate unstubbed test pins that the CPD
    section really is mounted and really is handed the same login pass — a stub would pass
    whether or not it was.
  - ☑ ~~**NOT PROVEN BY EYE.**~~ **LIVE-PROVEN BY MIKE 2026-07-30.** He ran the screen against
    the local dev data and signed it off. **Both predictions held exactly**, which is the useful
    part of the record: the screen showed **Lite Planning** with all three activities
    (11 · 40 · 20 min) and a total of 11m, and **"General Meeting Agenda" did NOT appear** — the
    master export gives it no CPD time, so it is not claimable. Both look like bugs and are not;
    say so before anyone hunts them. *(Still true for next time: close every other
    `localhost:3000` tab before opening it — session 4's six-connection trap.)*
  - ☐ **STILL OPEN — no manager view of CPD** (see above, unchanged). ~~the tutorial-video
    sentence is still dead~~ — **FIXED 2026-07-30**, its own P2 above.

  ### Session 7 (2026-07-30, laptop) — the two CPD wording gaps, closed

  Suite **2,334 → 2,340 / 144 suites** (+6), lint 0 errors. Session 6 shipped the CPD screen
  with two gaps left open *because the wording did not exist* — not because the work was hard.
  Mike supplied both, and they were used verbatim.

  - ✅ **CANCEL ON THE PLEDGE BOX + A CONFIRMATION BEFORE WITHDRAW (Mike-approved; wording
    chosen by Mike from three options each, then used word for word).** Four new keys in the
    top-level `cpd` block of [`locales/en.json`](../locales/en.json) — `cancel`,
    `withdrawTitle`, `withdrawQuestion`, `withdrawNote` — and the two changes in
    [`CpdRecord.vue`](../components/CpdRecord.vue). **The write path itself was not touched**;
    `withdraw(act)` became `openWithdraw(act)` + `confirmWithdraw()`, with the network call
    moved intact behind the second, deliberate press.
    - **Approved wording, recorded so it is never re-asked or re-invented:** button **Cancel**;
      title *Withdraw a recording*; question *"Withdraw your most recent recording of this
      activity?"*; note *"The recording is kept and marked withdrawn. You can record it again at
      any time."*
    - **Why the question says "this activity" and not the activity's name:** Mike's choice of
      three. The button pressed is already on that row, so naming it again buys little — but the
      wording deliberately says **most recent**, because Withdraw takes back one recording and an
      advisor with three would otherwise expect all three to go.
    - **No minutes figure is promised in the copy**, deliberately: the screen holds the *total*
      claimed minutes for an activity, not the minutes of the single row being taken back. A
      number we cannot compute is worse than no number on a record that may go to a body.
    - **Built as a second `b-modal` in the component rather than `$buefy.dialog.confirm`** — the
      pattern used by [`FirmDocuments.vue`](../components/firm/FirmDocuments.vue) L330 and
      [`FirmDomainSupport.vue`](../components/firm/FirmDomainSupport.vue) L423. Two reasons, both
      recorded so this is not read as drift: the Buefy dialog takes a **single message string**
      and the approved copy is a question *plus* a separate reassurance sentence; and it draws
      itself outside the component, so a test could only prove a dialog was *asked for*, never
      that pressing Withdraw wrote nothing. On a professional record the stop should be provable.
      Both modals guard their card with `v-if`, so only one is ever in the DOM and they cannot be
      confused for one another.
    - **A failed withdrawal keeps the box open with the reason on it**, matching the failed
      pledge exactly — an advisor told nothing would believe the recording had gone. A success
      closes it and re-reads the server's record rather than adjusting the figure here.
  - **Mutation-verified: 8 of 8 killed**, green control, every mutation proven to have applied,
    harness outside the repo (the component is redirected to a mutated **copy** via a scratchpad
    jest config — the repo is never written to).
    ⚠ **The first run had ONE survivor and it was a real gap — and it is the SAME blind spot for
    the fourth time on this feature.** Removing the guard that hides the section-level error
    while a box is open changed nothing, because the test read the **first** matching element and
    found the right words either way: a failed write would have printed its message **twice**,
    once inside the box and once behind it. Now pinned by asserting there is exactly **one**.
    The previous three were the Team Progress tab, the quiz-detail route and session 6's CPD read
    path — each an assertion that could pass while proving only half of what it appeared to.
    **Standing habit, now earned four times over: when two things could satisfy an assertion, one
    test must separate them.**
  - ☑ ~~**NOT PROVEN BY EYE.**~~ **LIVE-PROVEN BY MIKE 2026-07-30, and signed off** — the CPD
    record, the pledge box with its new **Cancel**, and the **Withdraw** confirmation were all
    run in the browser and behaved as designed. This feature had never been seen working before
    today; it is now proven by eye as well as by tests.
    - ⚠ **Worth knowing before the next report of "the Cancel button is missing":** it is **not**
      on the activity row, which correctly shows only **Record** and **Withdraw**. Cancel lives
      inside the pledge box, beside the confirming Record. That was the one point of confusion.
    - **Getting there cost most of the morning, and none of it was this code** — see the
      environment note below.
  - **ENVIRONMENT — the servers could not be started at all, and it was never the app.**
    `node` and `npm` were unresolvable in *every* terminal on the laptop: the Windows user `Path`
    had been rewritten as a plain string (`REG_SZ`), so its last two entries — the literal text
    `%NVM_HOME%;%NVM_SYMLINK%` — were never substituted and pointed nowhere. Repaired by writing
    the two real folders as `REG_EXPAND_SZ`, original value backed up first. **Nothing in this
    repository was changed for it.** Three findings worth keeping:
    - **The dev server runs on the locked Node 14.15**, cleanly. (An older note claimed it needed
      Node 20; that is wrong and has been corrected.)
    - **A `Ctrl+C`'d Nuxt dev server may survive, and later re-claim port 3000.** Three had
      stacked up unnoticed; one that had been pushed to a random port rebuilt itself when the
      squatter died and took 3000, so the *next* start went to a random port and looked broken.
      Always list the node processes and check who owns 3000 before diagnosing anything.
    - **Grepping `.nuxt` proves nothing in dev** — it holds only ~26 scaffolding files; the
      bundles live in memory. A string that certainly renders shows zero hits. An "it isn't in
      the build" conclusion from that grep would have been flatly wrong.
    - Also confirmed while there: `.env` **is** now read (`OPENAI_API_KEY present=true`, no JWT
      placeholder warning), closing out the 2026-07-29 fix. The MySQL placeholder warning and the
      `[activityStore] … using the dev file` lines are the fallback working as designed.
  - ☐ **NEW FINDING 2026-07-30 — 21 page ids in the template library are shared by more than one
    record, and some of the pairs are plainly DIFFERENT templates.** Noticed while proving the
    video fix; **not investigated, and nothing was changed** — `data/templates.json` derives from
    the master export, which is never edited here. Examples: `id-4277160310` → *Client pre Meeting*
    **and** *Coping With Adversity*; `bizz360` → *Working Capital Cycle* **and** *Activity Ratios*;
    `id-679676385` → *App Review* **and** *What's Applicable*. Others are true duplicates (the same
    title twice) or spelling variants (*Finance & Depreciation* / *Finance and Depreciation*).
    **Seven of the shared pages carry a tutorial video.**
    - **Today's fix is unaffected** — the injector matches on **title**, so each template uses its
      own record. **But it is a second reason the deleted sync script had to go:** that script
      matched on **page**, so it would have handed *Coping With Adversity* the video length
      belonging to *Client pre Meeting*. A page-keyed lookup is not safe on this data.
    - **For anyone keying anything on `page`:** check for collisions first, or key on title as
      `cpdCatalogue` and `videoInjector` do. **Raise the pairings upstream** — whether they are
      intentional is a question for whoever authors the export, not something to resolve here.
  - **HANDOVER TO THE DESKTOP (2026-07-30).** The desktop spent today on Domain Support and its
    wiring to the AI engine, and at `7dd83fd` it fixed **the domain-support config-key P1** — the
    same fault this laptop had queued as its next task. **Checked before starting anything:** the
    two branches' file lists overlap in **exactly two files — `design/ACTIONS.md` and
    `locales/en.json`** — and nothing else. Both are append-heavy, so expect conflicts in both when
    the branches meet at `master`: **read the merge rather than accepting it**, especially in this
    file, which is the project's shared memory. This branch **deliberately did NOT touch** the
    domain-support P1 entry above, so the desktop's own record carries its closure and the two
    machines do not both write the same entry.

  ### Session 8 (2026-07-30, laptop) — the master merge, a claim that did not survive, and the Collaborate ruling

  Three commits (`7b945b5`, `f7993b5`, `750f822`), all pushed. Suite **2,340 → 2,406 / 148
  suites**, lint 0 errors, tree clean, **33 ahead / 0 behind** `master`. **No production code
  was touched** — a merge and three documents.

  - **The merge the desktop asked for is DONE** (`7b945b5`). `origin/master` merged in once PRs
    #25/#26 landed: 25 behind → 0. The two branches' only overlapping files were
    `design/ACTIONS.md` and `locales/en.json`, exactly as session 7 predicted — and git resolved
    **both with no conflict**, because each side had appended to a different region.
    **Verified rather than trusted:** both sides' entries confirmed present, `en.json` re-parsed,
    the four approved CPD keys checked by value.
  - ⚠ **The domain-support config-key P1 was closed by the DESKTOP (`7dd83fd`), not here** — it
    had been sitting at the top of this laptop's list. **Lesson: read what a merge brought before
    starting a task that was queued before it.**
  - 🔴 **A CLAIM INHERITED FROM THE OTHER MACHINE'S NOTES WAS WRONG, AND MIKE CAUGHT IT.** The
    desktop's session notes said *"the migrated content of 28 domains has never been read on
    screen"*; that was relayed to Mike, who pushed back. **This very file records him editing
    that content in the app on 2026-07-29** — the *Hide list / Show list* control exists because
    he asked for it while doing so. **Counting from the data took one command and gave the true
    answer: 165 of 181 rows carry all four columns.** The real gap is **16 blank Step-by-step
    cells, ALL in `sales-marketing`** (deliberate — that source is an index table with no
    method), plus **2 unsourced `org-board-pack` rows** to keep or delete. A further "four in
    `fm-coach-culture`" **could NOT be confirmed** — those rows carry no field recording their
    origin, so the count exists only in prose. Written up as
    [`DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`](DOMAIN-SUPPORT-REVIEW-CHECKLIST.md) (`f7993b5`).
    **Standing rule earned here: a claim inherited from another machine's session notes is a
    claim to CHECK, not to pass on.** It is the same failure mode as this file's own "trust the
    CODE, not these flags" warning, arriving from a new direction.
  - ✅ **COLLABORATE MERGE RULED AND PLANNED** (`750f822`) — see [§Collaborate](#collaborate-merge)
    for the substance. Recorded here only as the session's outcome: Collaborate is a **separate
    repository**; its manager page cannot travel alone; the four-tier gap is in **this** repo,
    not in Collaborate; and Mike ruled the five-level cascade is **built in properly now**, the
    half-measure rejected. Nothing built — slice 1 returns for its own approval.
  - ⚠ **CROSS-MACHINE COLLISION WARNING (the reason this block matters to the desktop).** Slices
    2–3 of the Collaborate plan re-key the firm override storage and make `firmAuth` scope-aware,
    which **changes the ground under Domain Support and Logic Tables — the desktop's active
    area.** Both machines must not move that layer at once. Whoever starts slice 2 says so first.
  - **Two mechanical traps worth not rediscovering:** the Bash tool has no `npm`/`node` on its
    PATH (`export PATH="$NVM_SYMLINK:$PATH"` first), and PowerShell here-strings (`@'…'@`) are a
    syntax error there — for a long commit message, write it to the scratchpad and `git commit -F`.

  ### Session 9 (2026-07-30, laptop) — the coverage gate had never run, and now it does

  Three commits (`0148fad`, `dac0e88`, `aa10dbe`) plus this note, all pushed. Suite
  **2,837 → 3,050 / 191 suites**, lint 0 errors, tree clean. **No production code was
  touched** — one config file, six test files, two documents. Full record:
  [`COVERAGE-DEBT.md`](COVERAGE-DEBT.md).

  - 🔴 **READ THIS BEFORE YOUR NEXT COMMIT, DESKTOP: `npm test` now collects coverage on every
    run, so `.husky/pre-commit` enforces it.** Two consequences for you. The suite goes from
    ~11s to ~18s, which is the whole price. And **a commit that drops coverage in a bucket
    below its floor will now be REFUSED** — that is the point of the change, but it will be a
    surprise the first time. If it blocks you, the fix is a test, or raising the floor in the
    same commit once the number genuinely improved; never lowering one. Floors and their
    reasoning are commented per-bucket in `jest.config.js`.
  - **What started this:** the small ACTIONS.md task to extend the coverage gate to the landed
    Collaborate paths. Sizing it found that **this repo had never collected coverage on any
    automated run** — `npm test` was bare `jest`, the hook was bare `jest`, and there is no CI
    directory. So the existing thresholds only ever fired if a human typed
    `npm run test:coverage`, and doing the task as written would have recorded a standard that
    still gated nothing.
  - **Root cause, read from history not guessed:** the old `global: { lines: 80 }` dates from
    2026-05-04 (`d793b77`), when `collectCoverageFrom` reached **9 files** in `server/utils`.
    That folder now holds **47** and an AI engine grew inside it. **The standard did not slip;
    the measured set grew five-fold underneath a number nobody was checking.** Two standards
    CLAUDE.md names outright — **Restify routes ≥90% and mixins ≥80% — were not being measured
    at all.**
  - **Repo-wide 70.9% → 78.8% lines.** Buckets that crossed their standard today:
    `server/utils/` 67.9→84.1%, `mixins/**` 32.4→93.4%, `server/middleware/` 89.4→**100% and
    pinned**. `server/routes/` rose 72.1→74.1% but **stays a floor**, because it cannot reach
    90% until `firmManager.js` is done.
  - **The gaps closed were chosen for what they guard, not for the number.** Untested-until-now
    and now covered: the **dev mentor bypass** and **all of `requireMentorRole`** (the one gate
    that deliberately crosses the firm boundary — a `firm_manager` must be refused);
    **`anonymiseCasePreview`**, the only case route that sends client content to an LLM, whose
    contract is that the raw summary and transcript never come back; the **13 learn-mode prompt
    formatters**, where a renamed data file silently strips an advisor's entire coaching
    reference; **`caseMixin`**'s server-derived ownership, token race and id-only promotion;
    and **`localeMixin`**'s prototype-pollution guards on an LLM-built reply.
  - ⚠ **`firmManager.js` owes 264 lines and is DELIBERATELY NOT DONE HERE.** It is the file
    Collaborate slice 2 rewrites, and the desktop's active area. Writing its tests *as part of*
    that slice makes them the rewrite's safety net; writing them now would collide. Same
    warning as session 8: whoever starts slice 2 says so first.
  - ⚠ **`advisorEngine.js` (510 lines owed, 37%) is FROZEN, not forgotten.** 3,343 lines of SSE
    streaming engine; chasing the number as it stands means mocking so heavily the tests test
    the mocks. Decompose-then-test is its own workstream. Its real safety net today is
    `scripts/scenario-lab.js`, which Jest cannot count — and which has known blind spots
    recorded above, so a green lab run is not evidence for a change it does not reach.
  - **Two of my own mistakes, recorded because they cost real time:** a blanket `/undefined/`
    assertion is a false positive (the Heald Matrix reference legitimately reads *"do not leave
    the next step undefined"*), and a bucket's floor **must be recomputed whenever its
    exclusions change** — the first `./server/collaborate/` floor was measured with its 0% boot
    file still in the bucket and read 83 over code that measures 96.
  - **Also found, not a coverage job:** **`store/` does not exist.** CLAUDE.md names Vuex
    modules as the only global state mechanism and lists `store/` as a directory; the repo has
    no such directory. Documentation describing something that is not there — worth a decision,
    not a fix.

  ### Session 10 (2026-07-30, laptop) — a ruling that redirects the workstream, and step one of it

  Two commits (`79de6d9` + this note) plus two merges. Suite **3,058 → 3,062 / 192 suites**,
  lint 0 errors, tree clean. The substance is in [§Collaborate](#collaborate-merge) — recorded
  here only as what happened and what the desktop needs.

  - **PR #27 merged to `master` (`b3b6ad6`), and `master` merged back in here.** The Governance
    quiz — 62 banks / 652 questions, counted from the data rather than taken from the PR body.
    `ACTIONS.md` auto-merged with no conflict again, each side having appended to a different
    region; both sides' entries were confirmed present rather than assumed. **A test-count jump
    with no test file changed (3,050 → 3,058) was explained, not waved through:**
    `quizBankKeys.test.js` generates two cases per bank, and 4 banks arrived.
  - 🔴 **THE RULING — the Distinctions mechanism becomes the single firm-editable mechanism
    everywhere.** Full record, the inventory behind it (1 rich, 6 plain), the Currency
    exception, the corrected sequencing and the ownership correction on login/roles are all in
    [§Collaborate](#collaborate-merge). **This redirects the Collaborate slice list** — read it
    before picking up slice 2 or 3 from the plan, both of which it overtakes.
  - ✅ **Step one built: 181 stable row ids** (`79de6d9`). Data and one test only; no code
    touched; prompt output proven byte-identical.
  - ⚠ **THREE OF MY OWN ERRORS THIS SESSION, RECORDED BECAUSE THE PATTERN MATTERS MORE THAN THE
    SLIPS.** All three were the same failure: **reading a plan as authority instead of reading
    the code and asking the owner.** (1) I proposed resolving tiers and inventing manager
    role-value names at the front door — Mike: *"there is no separate login for virtual
    adviser"*; auth is Advisory's entirely. (2) I described the cascade as layered diffs when
    Mike's model is cloning, having followed the plan's §4.4 over its own §4. (3) I recommended
    storage-first sequencing that the inventory then reversed. **The plan document was wrong or
    stale in all three places** — it is now corrected in-file. Standing lesson, and a sibling of
    session 8's "a claim inherited from another machine's notes is a claim to CHECK": *a design
    document is a claim too. The code and the owner outrank it.*
  - **Two mechanical traps worth not rediscovering.** The 29 domain-support files are **CRLF and
    do not survive a PowerShell `Get-Content`/`Set-Content` round-trip** — one restore silently
    rewrote line endings and left a 25-line phantom diff; revert with `git checkout` and re-run a
    deterministic generator instead. And **14 of the 29 carry hand formatting**
    (`trigger_keywords` on one line) that a JSON re-dump reflows, so edits to them must be
    surgical text insertions or the real change drowns in a whole-file diff.
  - **HANDOVER TO THE DESKTOP.** This session touched **`data/*-domain-support.json` — your
    active area** — but additively only: 181 `id` keys inserted, nothing else altered, no code
    file changed. If you have uncommitted work in those files, merge carefully. The
    **slice 2/3 collision warning is now partly moot** (slice 2 has all but disappeared — see
    the ownership correction), but **the storage re-key still changes the ground under Domain
    Support and Logic Tables, and still needs whoever starts it to say so first.**

  ### Session 11 (2026-07-31, laptop) — two id gaps closed, and a live defect found by closing one

  Three commits (`51b77a5`, `0a2534d`, `c7bf261`) plus this note, all pushed. Suite
  **3,062 → 3,076 / 194 suites**, lint 0 errors, tree clean, **47 ahead / 0 behind** `master`.
  Session opened with `/startup`: 0 behind, nothing to catch up on.

  - ✅ **Coaching reference: 15 `cr-` ids + a lock test** (`51b77a5`). Substance in
    [§Collaborate](#collaborate-merge) step 2. Data file and one test; **no code touched**;
    the AI prompt proven byte-identical by hash.
  - ✅ **Logic Tables: the ids were right by care alone — now they are enforced** (`0a2534d`).
    **Nothing was broken and nothing was fixed**, which is the whole point: all 381 rows
    already carried an id and *nothing stopped the next one going without*. **The earlier
    readiness count (356) missed the 25 `flat_if_then` `branches`** — corrected in the table
    above. Two vacuous-pass traps closed deliberately: a tree in an unknown shape would have
    made the id loop iterate an empty list, and an empty read would have passed every check.
    **The check is proven permanently, not once** — a plain function run against a
    deliberately broken tree inside the test file, rather than a one-off done by breaking the
    real data and putting it back.
  - 🔴 **A LIVE DEFECT FOUND WHILE WRITING THAT TEST, REPORTED BEFORE BEING TOUCHED, THEN FIXED
    ON MIKE'S SAY-SO** (`c7bf261`). `_mergeBranchRows` gave a firm-added row the id
    `firm-branch-${i}` — **its position in the submitted list**. An existing firm row keeps its
    id because the client sends it back, so the moment a new row landed at the index where an
    earlier row's number was minted, **two rows carried the same id**. Silent: no error, the
    table still renders, and a firm's decision would land on whichever the code reached first.
    **Proven before fixing** — the new test returned 3 rows and 2 distinct ids on the old code.
    The generated id now dodges every id already spoken for (platform rows + whatever the
    submitted rows arrived with), so ids never renumber and never collide. Four tests, each
    guarding a different failure. **Safe to change today for the same reason as the storage
    re-key: no firm has saved anything anywhere, so there is no stored duplicate to migrate.**
  - **The pattern across all three: an id that encodes a POSITION or a TITLE is not an id.**
    Domain Support had it (title), the coaching reference had it (title), firm-added logic rows
    had it (position). **The Advisory Staircase still does** — `steps` keyed by `step`, a
    position number. It is the last one of these left, and it is not fixed.
  - ⚠ **One of my own errors, recorded because the pattern matters.** I reported "LINT CLEAN"
    when lint had in fact failed: the shell exit code I checked belonged to the `tail` at the
    end of the pipe, not to `eslint`. **A green from a piped command is not a green from the
    command.** Caught it, fixed the style error, re-checked with a real exit code — but it was
    reported to Mike wrongly first, and the pre-commit hook would have caught it anyway, which
    is exactly why that gate exists.
  - **HANDOVER TO THE DESKTOP.** This session touched **`server/routes/firmManager.js` — your
    active area** — but only inside `_mergeBranchRows` (~20 lines, id assignment only). **No
    storage, auth or overlay surface was changed**, and `data/*-domain-support.json` was not
    touched at all. Merge before starting the Collaborate storage work, because that function
    is one the rewrite touches. **The slice 2/3 warning stands unchanged: whoever starts the
    storage re-key says so first.**

  ### Session 12 (2026-07-31, laptop) — the Advisory Staircase, both halves

  Two commits (`cb6d43c`, `221e18c`) plus this note, all pushed. Suite **3,076 → 3,129 / 197
  suites**, lint 0 errors, tree clean, **50 ahead / 0 behind** `master`. Session opened with
  `/startup`: 0 behind, nothing to catch up on.

  - ✅ **A firm's renamed staircase steps reached the ENGINE but never the ADVISOR** (`cb6d43c`).
    The override set the complexity ceiling, so the two ceiling dropdowns on the Firm Manager
    tab worked — but `VirtualAdvisor.vue` built the selector's options from
    `data/advisory-staircase.json` **baked into the bundle at build time**, so **Step name** and
    **What this step looks like**, the two largest fields, were saved, versioned and restorable
    while reaching nobody. The tab rendered as working. Nothing was broken for a real firm: no
    override exists anywhere, in MySQL or the dev file. **The rule it was breaking was already
    written down** — `resolveDistinctions.js` says in its own header that the engine and the Firm
    Manager UI read one resolver "so the advisor session and the management screen can never
    disagree". Fix: `utils/staircaseConfig.js` owns the blend; the engine and the new
    `GET /api/advisor/staircase` both read it. **Worth a sweep: what other config has two
    readers?**
  - 🔴 **THE TRAP OF THE SESSION — 18 passing route tests sat behind a request that could not
    reach the route.** Every test called the handler directly, so all of them passed whether or
    not the browser could get there. It could not: `/api/advisor` is mounted to the **SSE engine
    proxy**, which forwards only POSTs to `/query` and `next()`s everything else, so a real
    `GET /api/advisor/staircase` fell through every handler to a **Nuxt 404** — with a fully
    green suite behind it. **A green suite proves the handler, not the wiring.** Fixed by
    registering the specific path to `apiProxy.js` **above** `/api/advisor` in `nuxt.config.js`,
    and there is now a test that fails if anyone reorders those lines. **Standing check: any new
    frontend→backend path means reading `nuxt.config.js` serverMiddleware, not just the route
    list.**
  - ⚠ **The dev stand-in nearly made the whole fix look broken.** With MySQL unprovisioned a
    firm-manager save lands in `data/dev-firm-staircase.json`; a read that only knew about MySQL
    would have reported "no override" and served Advisor-e's wording — an invisible failure in
    the one environment the feature can currently be tried in. Raised before it shipped and the
    fallback put in the **shared** blend, so the complexity ceiling honours it too. **Copy this
    whenever adding a firm-config read.**
  - ✅ **The staircase's position-as-identity closed — the LAST of the four** (`221e18c`).
    Substance in [§Collaborate](#collaborate-merge) above, including the honest note that the
    ids do nothing at runtime and the safety came from `resolveStaircaseStep`.
  - ⚠ **I DEVIATED FROM THE PLAN MIKE APPROVED, AND SAID SO AT THE TIME.** The proposal said the
    engine would **refuse** to resolve when the name contradicted the position, falling back to
    the default ceiling. Building it revealed that would degrade every returning client of every
    firm that had **renamed** a step — the common event, and the entire point of the tab fixed
    that same morning. Built name-first-then-position instead, which is never worse than the old
    behaviour. **When analysis shows the approved detail is the worse one, build the better one
    and report the deviation plainly — do not ship a known-worse rule because it was described
    first.**
  - ☐ **FOUND, NOT FIXED — `staircaseStep`, `growthStage` and `finMgtTheme` are ALWAYS saved
    null on a case record.** `submitStaircaseStep` clears `selectedStaircaseStep`
    (`VirtualAdvisor.vue` L1719) before `createCase` reads it (L1253); the same holds for the
    other two selectors. **First judged more serious than it is, then corrected by checking:
    this is NOT data loss.** The live remember-this-client feature reads the staircase position
    out of `decisionTrace.situation` (`extractSavedClientFactsFromCases`), never the column, and
    `lastStaircaseStep` / `lastGrowthStage` in `priorEngagement.js` are computed and read by
    nothing. So it is dead wiring plus **one test (`priorEngagement.test.js`) asserting a shape
    reality never produces** — a small source of false confidence, not a live fault. *Source:*
    staircase investigation 2026-07-31.
  - **Mike asked mid-session whether the case-review promote/withdraw and the Distinctions
    clone-down patterns were being followed across the Hub.** The straight answer was **no** —
    this session was one hop (firm → advisor display), not a hierarchy, so neither applied.
    They remain the two reference implementations to **read** before the cascade work rather
    than reinvent: Distinctions for the downward direction (decline / override / add-own, id
    pinned), case reviews for the upward one (promote only on an explicit approval, content
    read back from the database rather than trusted from the browser, withdraw to reverse).

  ### Session 13 (2026-07-31, laptop) — the one mechanism, and the staircase onto it

  Three commits (`1d10a62`, `5a3de15`, `8ec9973`), all pushed. Suite **3,129 → 3,191 / 200
  suites**, lint 0 errors throughout, tree clean, **54 ahead / 0 behind** `master`. Session
  opened with `/startup`: 0 behind, both open PRs merged, nothing to catch up on.

  **This is the ruled sequencing being executed, not a detour** — unify the mechanism at two
  levels first, then add the middle tiers once. Mike picked the Collaborate workstream and
  left the choice of first block to me; the staircase was chosen over Domain Support because
  it is five rows in one file whose two readers already funnel through one resolver, so a
  mistake is cheap to find, and because putting it on the mechanism **closes an already-logged
  defect** rather than only building infrastructure.

  - ✅ **PHASE 1 (`1d10a62`) — the mechanism lifted out whole.**
    `server/utils/resolveInheritedRows.js` is now the block-agnostic decline / override /
    add-your-own resolver; `resolveDistinctions.js` is a thin caller of it.
    **The proof it changed nothing: `resolveDistinctions.test.js` and the four other
    distinction test files passed UNTOUCHED.** Not one assertion was edited — that was the
    acceptance condition set before starting, and an edit to any of them would have meant the
    refactor had changed behaviour and was wrong. Four guarantees are now written down as
    rules with their own tests rather than inherited as behaviour: identity is not editable,
    no phantom rows, decline beats override, and the edit REPLACES the original so nothing
    scored per row can be counted twice. Two levels only, deliberately — the middle tiers are
    added in that one file, later, rather than guessed at now.
  - ✅ **PHASE 2 READ HALF (`5a3de15`) — a firm's staircase was a frozen copy.** The override
    was a complete copy of all five steps merged with `deepMerge`, which replaces an array
    wholesale, so **the moment a firm edited one word, all five became their private snapshot
    of that day's wording** — a step Advisor-e added later could never reach them, with nothing
    on screen to suggest they had stopped receiving updates. Now decisions keyed to step ids,
    resolved through the shared mechanism. Storage is **additive** (three new keys beside the
    untouched `advisory-staircase`, which stays the home of `defaultCeiling` — a single
    setting is not a list of rows, the same reason Currency is out of the mechanism).
  - ✅ **PHASE 2 WRITE HALF (`8ec9973`) — six routes**, mirroring the distinction cascade
    verb-for-verb. Four guarantees enforced server-side: the **server assigns a new step's id**
    (a browser id could collide with an `as-*` and silently replace one of Advisor-e's), ids
    are highest-so-far + 1 rather than the row count, **switching off is not deleting**, and a
    firm **cannot switch off its last step** (409 `LAST_STEP`, which can explain itself where
    the blend's silent fallback cannot).
  - ⚠ **TWO EXISTING TESTS CHANGED IN THE READ HALF, AND THAT IS CORRECT HERE** — unlike Phase
    1, this phase changes behaviour on purpose. Both asserted that a firm's saved list
    *replaces* Advisor-e's, which is the defect itself. Rewritten to the new rule with their
    original intent intact (junk never reaches an advisor mid-session; a description is never
    `undefined`), plus a third test proving a field the firm did not write keeps Advisor-e's
    wording rather than blanking it. **The distinction that matters: a test edited because
    behaviour deliberately changed is legitimate; a test edited to make a refactor go green is
    not.**
  - **A migration promise built for data that does not exist.** `adaptLegacyWholeConfig` reads
    a whole-config save as edits — by id first, then by **position**, because the old shape
    replaced the array wholesale so the firm's first row WAS the platform's first row; reading
    it any other way would re-file their wording under the wrong steps. Only fields that
    genuinely DIFFER are carried across. No MySQL row exists and there is no dev file on this
    laptop — but the old tab is live and **the desktop's dev files cannot be read from here**.
  - **The dev fallback was TIGHTENED rather than copied.** `firmDistinctions` falls back to the
    JSON stand-ins on ANY store failure; `firmStaircase` rethrows in production, and the blend
    logs it and serves the platform base. A stray dev file on a production box must not rewrite
    a firm's staircase, and an outage must not be dressed up as "this firm has no override".
    **Worth considering for `firmDistinctions` too — not changed here, because it is the
    desktop's ground and was not this session's approved scope.**
  - ✅ **CHECKED, NOT ASSUMED — two claims verified against code rather than carried:**
    (1) firm-authored staircase wording **never enters a prompt as configuration**; it reaches
    the AI only inside advisor chat text, the situation summary or the prior-engagement
    summary, all three already fenced (`advisorEngine.js` L84, L203, L2739), so no fencing was
    added where none was needed. (2) Session 12's proxy trap does **not** apply to the new
    routes — `/api/firm-manager` is already mounted to `apiProxy.js` and connect mounts on a
    `/` boundary.
  - 🔴 **MIKE'S CHALLENGE, AND THE RIGHT ANSWER TO IT.** Asked mid-session whether I had read
    the code for BOTH cascades — upward (case-review promote/withdraw) and downward
    (Distinctions hierarchy/permissions) — the honest answer was **partly**: the downward
    resolver yes, the upward path and the permission layer no, they were being carried from
    session notes. Reading them changed the work: the storage became additive rather than a
    rewrite, and the routes gained the "server assigns identity, never the browser" rule taken
    straight from `cases.promote` (whose own header records that the old flow appended to a
    GLOBAL file, putting one firm's client notes into every other firm's prompts). **Carrying a
    claim from a session note is not reading the code, and the difference showed up in the
    design.**
  - ✅ **Phase 2's last piece — the tab controls — BUILT in Session 14 below (`801dd4f`).**
    Wording RULED by Mike 2026-07-31: mirror the Advisory Distinctions tab verbatim
    (`Switch off` / `Switch on` / `Reset to platform` / `Add step`, form titles
    `New step` / `Edit step`) rather than invent staircase-specific words, so the Hub reads
    as one screen. **Phase 3 remains open**: the *Adopt / Keep mine* offer when Advisor-e
    changes a step a firm has edited.

  ### Session 14 (2026-07-31, laptop) — the tab caught up with its plumbing, then Phase 3

  Two feature commits (`801dd4f`, `c4c2a6d`) plus this record, all pushed. Suite
  **3,191 → 3,221 / 201 suites**, lint 0 errors, tree clean, **58 ahead / 0 behind** `master`.
  Session opened with `/startup`: 0 behind, nothing to catch up on. **The staircase workstream
  is now COMPLETE — Phases 1, 2 and 3 all in.**

  **The screen was undoing yesterday's fix on every press of Save.** Phase 2 changed a firm's
  staircase from a frozen copy into decisions, but the tab above it was still the whole-config
  editor — five text boxes and one Save that posted all five steps at once, re-creating the
  private snapshot the storage change had just removed. Each step is now a decision: Edit,
  Switch off, Reset to platform, Add step, Remove.

  - ✅ **THE DEFECT THIS ALMOST REBUILT IN THE BROWSER, and it would have been silent.** The
    save route records exactly the fields it receives, and a recorded field stops tracking
    Advisor-e's wording for good. Posting the whole form would therefore have frozen the two
    fields a firm never touched at today's text — **rename one step, silently stop receiving
    improvements to the other two**, which is the defect the whole mechanism exists to prevent,
    rebuilt one layer up. `utils/staircaseRows.buildStepEdit` sends only what changed and is
    the most-tested thing in the change. **Its corollary, decided rather than asked:** a firm
    editing its version back to Advisor-e's wording in *every* field is asking for Advisor-e's
    step again, so that is a **reset, not a save** — a save of identical text would leave the
    row frozen at wording that merely matches today. Honest limit written into the code: the
    routes merge, so a single field cannot be un-overridden on its own; the firm presses Reset
    to platform and edits again. No remove-one-field verb was invented for a case no one has hit.
  - ✅ **NO SECOND COPY OF THE MECHANISM.** The merge stays server-side in
    `resolveInheritedRows`; the tab draws the `resolved` list the advisor's selector and the
    engine's ceiling already read, so the management screen cannot disagree with a live session.
    `utils/staircaseRows` adds only what the resolver deliberately leaves out — **the
    switched-off steps**, which an advisor must never be offered but a manager must be able to
    bring back. They sit below the live list and **unnumbered**: a step that simply vanished
    reads as data loss, and one printing "Step 3" beside a list running 1, 2, 3 claims a
    position it does not hold.
  - ✅ **VERSION HISTORY WAS ABOUT TO LIE, AND WAS RULED ON RATHER THAN LEFT.** The steps moved
    to their own keys, so a restore under `advisory-staircase` could have reported success while
    nothing on screen moved — the silent kind of failure. **Mike ruled: relabel to "Ceiling
    history"**, covering what it now genuinely governs, with the per-step undo (Reset to
    platform) named in the note. The alternative of merging four keys into one restorable
    history was offered and not taken: it needs a rule for what "restore" means across four
    stores, which is a design, not a bolt-on.
  - **Layout ruled by Mike: keep the brand-toned step blocks**, not a Distinctions-style table.
    The 2026-07-22 palette instruction stands; the verbatim-wording ruling was about words, and
    was not read as licence to restyle the screen.
  - **Tab extracted to `components/firm/FirmStaircase.vue`** alongside the four others — the Hub
    loses 232 lines and gains 6 — and its strings moved into `locales/en.json`, which the inline
    version never did (the Hub and the Distinctions tab are still hardcoded English).
  - ✅ **PHASE 3 (`c4c2a6d`) — a firm's edit was hiding our later wording from them, silently
    and permanently. Now it offers.** An edit SHIELDS a step from the platform's later text,
    which is right until it means that firm never sees any improvement to that step again with
    nothing on screen to say so. `Review update` opens a side-by-side compare; the firm chooses
    **Adopt** (drop their version, take ours, resume tracking) or **Keep mine** (their wording
    stays, the prompt clears until our NEXT change). **Adopt needed no new route** — it is the
    existing reset, which already drops the override and now the baseline with it; only
    Keep-mine is new, and it **409s rather than quietly succeeding** when the firm holds no
    version to keep, because stamping a baseline for an unedited step arms a prompt that can
    never fire. Wording RULED by Mike 2026-07-31: **"Platform"**, matching the badge already on
    those rows, not "mentor" (there is no mentor here) and not "Advisor-e" (which would have
    left one screen using two names).
  - ⚠ **TWO TRAPS, EACH OF WHICH WOULD HAVE ANNOUNCED A CHANGE THAT NEVER HAPPENED.**
    (1) An edit made before this feature has **no baseline**; reading that as drift would greet
    every such firm with a review prompt on first load, so it is backfilled as in-sync and
    tracked from there. (2) The signature covers **wording only, never `step`** — that number is
    a POSITION the resolver assigns, so switching off a step above renumbers everything below
    it, and signing it would tell a firm we had rewritten a step nobody touched. A test declines
    two steps above an edited one and proves silence.
  - **THE HONEST DIFFERENCE FROM DISTINCTIONS, written into the code so it is not later read as
    a copy that drifted.** A mentor authors distinctions in the running app, so a firm sees drift
    within minutes; **the staircase is a committed file**, so its signature changes when a release
    ships. Same detection, release-to-release cadence. There is **deliberately no "since your last
    visit" half**: that notice reads `updated_at`/`created_at` timestamps the staircase file does
    not carry, and a step a firm has not edited already updates itself silently, which is the
    wanted behaviour. Inventing timestamps to announce it would be building a feature out of data
    that does not exist.
  - ✅ **NEAR-MISS CLOSED — four dev-only staircase files were not gitignored** while all fifteen
    of their siblings were: the three cascade keys from Session 13 plus the Phase 3 baselines.
    They hold one firm's dev configuration and were one `git add .` from the repo. **The pattern
    worth carrying: a new storage key needs a new ignore line, and it was missed twice running.**
  - ⚠ **NOT PROVEN BY EYE — no one has clicked ANY of it, Phase 2 or Phase 3.** The suite covers
    the logic, the Pug templates compile, lint is clean; the button-to-route wiring is argued and
    tested, not demonstrated in the running app. Mike's dev server is never started or restarted
    from here. **This is the one outstanding check on the feature** — Firm Manager Hub → Advisory
    Staircase: edit a step, switch one off, add one, and confirm the switched-off group brings it
    back.
  - **WHERE THIS LEAVES THE ONE-MECHANISM RULING.** The staircase is the **first block on it
    whole** — resolver, storage, routes, screen and the update offer. Still on their own
    per-feature arrangements: **Domain Support, Logic Tables, Quizzes, the coaching reference**
    (Currency stays out by design — a single setting is not a list of rows). The middle
    management tiers still land ONCE, in `resolveInheritedRows.js`, per the ruled sequencing.
    *(Superseded in part the same day — **Quizzes** moved onto the mechanism for storage and the
    read path in Session 15 part 2 below; its screen is Phase 3.)*
  - ✅ **FOUND IN SESSION 13, FIXED IN SESSION 15 below (`d0c1eb0`).** `firmDistinctions` fell
    back to its dev JSON stand-ins on **any** store failure, production included, while
    `firmStaircase` had been tightened in Session 13 to rethrow. The inventory taken before
    fixing found it was **not one path but three**, and the fix is the staircase's guard applied
    to all of them.

  ### Session 15 (2026-07-31, laptop) — a store failure that read as a firm with no settings

  One feature commit (`d0c1eb0`) plus this record, pushed. Suite **3,221 → 3,230 / 201 suites**,
  lint 0 errors, tree clean, **60 ahead / 0 behind** `master`. Session opened with `/startup`:
  0 behind. Mike picked this off the three candidates and ruled **all three paths in one pass**
  rather than only the flagged one.

  **The whole defect in one line: the fallback answered EMPTY, and empty is exactly what a
  healthy store says about a firm that has customised nothing.** So a database outage was
  indistinguishable from a firm with no settings — on the advisor's session and on the
  manager's screen alike, with nothing in the logs. The dev-file half is the more alarming
  reading but the less likely one: those files are gitignored, so a deployment does not carry
  them — it needs a hand-copy or a missed ignore line first, **which has now happened twice in
  three sessions**.

  - ✅ **THREE PATHS, NOT ONE — the inventory is why.** `firmDistinctions` (the flagged one),
    **`firmContent`** — *domain support and logic tables*, the two biggest firm-editable
    surfaces — and **`platformDistinctions`**' read path. Already correct and left alone:
    `firmStaircase`, `coaching`, `routes/currency`, and `firmManager`'s own dev helpers, which
    all gate on `IS_DEV` and rethrow.
  - **THE GUARD IS THE EASY HALF; WHAT EACH CALLER DOES WITH IT IS THE DESIGN, and they
    correctly differ.** Firm Manager routes were already wrapped and now return a 500 the
    manager can see. The advisor and course engines **log the fault and run on platform
    content** — a storage problem must never end a live conversation. That rule lives in ONE
    place, `firmContent.readForSession`, rather than a try/catch copied to four call sites; its
    JSDoc says plainly that routes must not use it, because an empty editing screen is the very
    failure being removed.
  - 🔴 **TRAP 1, AND IT WAS WORSE THAN THE BUG BEING FIXED.** Five Firm Manager routes check the
    id against the platform set **before** their `try` block — deliberately, so an unknown id
    404s before anything is written. A throw there lands **outside** the handler's catch, and
    **an async Restify handler that rejects sends nothing at all**: the manager's browser hangs
    until it gives up. Found by walking every caller rather than assuming the routes were
    uniformly wrapped. `_platformRowsOr500` turns it into the same 500 the handler would have
    sent; four tests prove each route answers.
  - 🔴 **TRAP 2 — the platform set's SAVE path already rethrew in production; only its READ did
    not.** That asymmetry mattered more than it looks: **every mentor edit is a
    read-modify-write**, so answering a failed read with the committed seed would let one edit
    **overwrite the mentor's whole authored set with the shipped defaults**. The file's own
    write path was the argument for the change.
  - **Tests: 8 new.** They plant a stray dev file and prove production never reads it, prove a
    live session survives with a logged fault, and prove the four routes answer 500 instead of
    hanging. ⚠ **Honest limit: no revert-to-red proof was run on the four route tests** — that
    means editing the source back to broken, and this repo's rule is no unapproved change even
    briefly. The mechanism beneath them (the reader rejecting in production) *is* proven
    red-to-green in `platformDistinctions.test.js`.
  - ⚠ **NOTHING BEHAVES DIFFERENTLY TODAY, AND NONE OF IT CAN BE SEEN BY EYE.** MySQL has never
    been provisioned, so the failure this guards cannot be produced here — which is also the
    argument for doing it now, before a firm has content to lose. Development is untouched: the
    dev-JSON stand-ins work exactly as before.

  ### Session 15 part 2 — QUIZZES JOIN THE ONE MECHANISM (Phases 1 and 2 of 4)

  Two feature commits (`222a384`, `041d5f9`), pushed. Suite **3,238 → 3,269 / 204 suites**, lint
  0 errors, tree clean, **63 ahead / 0 behind** `master`. Mike chose quizzes over the coaching
  reference **because quizzes are collision-free** — they live in their own files, while a
  coaching tab would touch `firmManager.js` and `components/firm/`, which is the desktop's ground.

  - 🔴 **RULED 2026-07-31 (Mike) — a firm's quiz decision is about a SINGLE QUESTION, not a whole
    quiz.** The old overlay replaced a bank **wholesale**, and that was a deliberate choice with a
    real reason (merging two lists by position would let a firm's 3-question edit inherit the tail
    of a 10-question bank). The price was the exact defect the mechanism exists to prevent: **a
    firm that reworded ONE question stopped receiving Advisor-e's improvements to the other nine,
    permanently, with nothing on screen to say so.** The mechanism dodges positions a different
    way — it keys on identity — which is what Phase 1 exists for.
  - 🔴 **DEFECT FOUND AND FIXED — a firm could have saved a quiz the AI would never read.** The
    course engine read `data/course-quizzes.json` **directly** and never loaded the firm overlay,
    while the Firm Manager screen rendered platform ⊕ firm through `mergeQuizBanks`. A firm would
    have saved, seen it on screen *with version history beside it*, and every course would still
    have used ours. **The same failure as the domain-support config key on 2026-07-30.** It had
    not bitten only because no Save button reaches the route — the Phase 3 screen would have made
    it real on day one. Closed by `server/utils/quizConfig.js`.
  - ✅ **PHASE 1 (`222a384`) — 652 questions across 62 banks gained a stable `qid`.** Assigned once
    in file order, never reused, opaque **on purpose**: an id derived from the question's wording
    would change when the question is reworded, which is the very loss being prevented — and
    rewording is the normal case Phase 4's Adopt / Keep-mine offer is built for.
    - ⚠ **THE POSITIONAL `id` COULD NOT BE REPLACED, which is why there are two fields.** It is a
      **live handshake with the AI**: `courseEngine` writes `Entry {id}` into the generation
      prompt, the model returns a `bankRef` naming one, and the grader looks the entry back up by
      that number to find the firm's model answer. Changing its type would have changed the prompt
      and could have broken grading.
    - **Proven, not asserted:** the AI-facing text of both surfaces hashes **identically** before
      and after across all 62 banks, read from the committed blob rather than from memory. The
      locking test was itself checked against what it must catch — an inserted question with
      everything renumbered, and two ids quietly swapped, both fail it; improving a question's
      wording does not, deliberately.
  - ✅ **PHASE 2 (`041d5f9`) — storage becomes decisions, and the engine reads them.** Separate
    additive keys (`quiz-declines` / `quiz-overrides` / `quiz-own`), the staircase's shape, so the
    existing key is never rewritten. `quizConfig.js` is the engine's single read path, the
    counterpart of `staircaseConfig.js`.
  - 🔴 **TRAP 1 — THE SAFE DEFAULT BROKE THE COMMON CASE, and an existing test caught it.**
    Fencing had to become **per question**, because one bank can now hold Advisor-e's questions
    and the firm's side by side. `isFirmAuthored` fails **closed** — anything without a platform
    tag is fenced — which is right for a security check and bit immediately: the ordinary path
    where a firm has decided nothing returned **untagged** platform banks, so **Advisor-e's own
    questions would have been fenced and the tuned prompt quietly changed for every firm**. Fixed
    at the cause (no path may return an untagged bank), not at the symptom. Byte-identical prompt
    text for a firm with no decisions is now locked by a test.
  - 🔴 **TRAP 2 — the positional number must close its gaps.** Switch off question 2 and the rest
    renumber, or the model is shown Entry 1, 3, 4 and the grader hunts for a number nobody
    offered. Same reasoning as the staircase's `step`.
  - **Two judgement calls made rather than interrupt, both deliberate.** (1) A firm that switches
    off **every** question in a bank has **no bank** — it is dropped so the engine falls through
    to AI generation, rather than being handed an empty bank it is told to build every question
    from. (2) The old whole-bank shape is **read as decisions**, including the honest reading that
    a question the stored copy does not contain was **removed on purpose**, so it stays off.
  - ☐ **PHASE 3 — the editing screen.** The Quizzes tab is **browse-only today**: search, see
    where quiz material is missing, view version history. No edit, add or switch-off. Needs the
    per-question routes and Mike's wording decisions. **Ordering rule: the screen must not gain a
    Save button before the engine reads what it saves** — which Phase 2 has now settled.
  - ☐ **PHASE 4 — Adopt / Keep mine** when Advisor-e changes a question a firm has edited.
  - ⚠ **NOT PROVEN BY EYE — nothing writes any of this yet**, and MySQL has never been
    provisioned. Nothing is half-built and nothing is user-reachable.
  - **WHERE THE ONE-MECHANISM RULING NOW STANDS.** Whole: **Advisory Staircase**, and **Quizzes**
    for storage + the read path (its screen is Phase 3). Still on their own per-feature
    arrangements: **Domain Support**, **Logic Tables**, **the coaching reference** — the last of
    which has no Firm Manager screen at all, so a firm can neither see nor change its 15 entries.
    (Currency stays out by design.) *(Updated in Session 16 below: Quizzes is now whole,
    screen included.)*

  ### Session 16 (2026-07-31, laptop) — quizzes finished, and the screen that looked broken

  Three commits (`1e5ac87`, `da097f5`, `ae53c9a`), pushed. Suite **3,269 → 3,341 / 206 suites**,
  lint 0 errors, tree clean, **67 ahead / 0 behind** `master`. Session opened with `/startup`:
  0 behind. **PHASE 3 IS COMPLETE** — storage, the engine read path, the routes and the screen
  are joined up. Only **Phase 4 (Adopt / Keep mine)** remains.

  - ✅ **PHASE 3a (`1e5ac87`) — six per-question routes**, mirroring the staircase cascade so a
    reader who knows one knows the other. `getQuizzes` now also returns the **resolved** banks —
    the ones the course engine reads — because putting Save buttons on the older whole-bank
    `merged` view would have reopened the exact defect Phase 2 closed on this feature.
    - **ONE DELIBERATE DIFFERENCE FROM THE STAIRCASE, and it is the opposite rule.** The
      staircase REFUSES to let a firm switch off its last step; quizzes must ALLOW it, because a
      bank with nothing left is dropped and the course falls through to AI-generated questions.
      Blocking it would deny a firm a decision the engine already handles. The cost is carried by
      the screen, which has to say what replaces it.
  - 🔴 **A GAP FOUND WHILE BUILDING 3a, AND CLOSED WITH IT.** `loadFirmQuizState` reads the three
    new keys first and consults the old `quiz-banks` shape only while the firm has made no
    decision. So a firm's **first** per-question decision would have switched the old shape off
    permanently and everything saved there would have stopped reaching its advisors — silently,
    with the screen still showing a saved state. **It was unreachable until these routes existed**,
    which is exactly why it was closed alongside them rather than after.
    `_carryLegacyQuizDecisionsForward` promotes the old copy into the three keys **once**, reuses
    the proven adapter via `fromLegacy` rather than keeping a second copy of that judgement, does
    **not** delete the old key, and writes no empty parts. Six tests, using a store that answers
    with what was last written — a store that replayed the original would let a broken carry-over
    pass.
  - ✅ **PHASE 3b (`da097f5`) — the tab edits.** The badge moved **from the quiz to the question**:
    since the per-question ruling one page can hold Advisor-e's questions and the firm's side by
    side, so one badge on the whole quiz would necessarily be wrong about one of them. The panel
    now rebuilds from the latest load rather than a snapshot taken at click time — harmless while
    nothing could change, but with editing it would show a firm its own pre-edit wording as though
    the save had not happened. Row rules live in `utils/quizRows.js`, the sibling of
    `staircaseRows.js`.
  - 🔴 **THE DEFECT MIKE FOUND ON THE RUNNING SCREEN (`ae53c9a`) — AND THE RULE WORTH KEEPING.**
    Clicking Edit appeared to do nothing. The form rendered at the **foot of the panel**, and a
    Growth Curve bank is **ten tall cards** (~3,000 characters), so it opened about a screen and a
    half below the button pressed. The only visible change near the click was the **Add question
    button hiding itself**, so the single cue on screen read as a fault.
    **The layout was copied from the Advisory Staircase, where it is fine — five short steps, form
    in view.** → **RULE: a layout borrowed from another tab must be re-checked against THIS tab's
    content volume.** That is the reusable lesson; the fix (edit in place, tinted card, Add button
    no longer hides) is the one-off. **The suite was green throughout** — it cannot see a screen,
    which is why this needed a human. **LIVE-VERIFIED by Mike after the fix.**
  - **Three wording rulings (Mike, 2026-07-31).** (1) The last-question warning **names what
    replaces it** — "your advisors will still get a quiz here — but the AI will write the questions
    instead of your firm" — because the failure being prevented is a firm believing it removed the
    quiz. (2) **"Add question"**, matching the staircase's "Add step". (3) The **version-history
    table is replaced by a note on undoing**: it read the old whole-quiz storage, which nothing
    writes to any more, so it would have been empty for every firm forever — and an empty history
    table reads as though nothing saved had been kept.
    - ⚠ **Six shorter strings were written without asking** (the top notice, the switched-off note,
      the nothing-left message, two form hints, the confirmations) rather than interrupt a fourth
      and fifth time. Named here so they can be corrected on sight; buttons and tags are the
      staircase's verbatim, per the consistency ruling.
  - ✅ **CLOSED 2026-07-31 (Session 17, laptop) — it was the SENTENCE, not the behaviour.** The
    staircase behaves exactly as quizzes does: `setStaircaseDecline` writes the declines key and
    nothing else, so the override survives and `resolveInheritedRows` swaps the firm's version
    back in the moment the id leaves that list. A test had proven it all along —
    `staircaseCascade.routes.test.js`, "an edit made earlier survives switching the step off and
    on again" — it had simply never been read against the sentence on the screen. The note now
    says *"Switch one back on to use it again — it returns with any wording your firm gave it."*
    - 🔴 **THE CLAIM HAD SPREAD TO THREE DEVELOPER COMMENTS, ONE OF THEM IN QUIZZES.**
      `FirmStaircase.vue`'s `switchOff`, the staircase decline route, and — the one that matters —
      **the quizzes decline route** (`firmManager.js`), which asserted the opposite of what
      `quizCascade.routes.test.js` had just proven. **The wrong sentence was copied onto the new
      feature in the same session the correct behaviour was built and tested.** All three now
      state that only the declines key is written and name the reset route as the thing that
      *does* discard an edit. → **RULE: when a feature is cloned from a sibling, its prose is
      cloned too, and prose carries no test.** A copied comment must be re-read against the
      behaviour being built, not just the behaviour it came from.
    - ⚠ **HONEST LIMIT: nothing stops the claim coming back.** The fix is one locale string and
      three comments; no test ties the wording to the behaviour, because the suite cannot read
      copy. A firm-facing sentence remains provable only by a human reading it — the same class
      of gap as the Session 16 screen defect.
  - ✅ **GAP FOUND WHILE CHECKING THE ABOVE — CLOSED SAME DAY in Session 17 (`63cc54f`).** A
    switched-off step offered no way back to the platform's version: the list rendered only a
    **Switch on** button, so a step the firm edited and then switched off could be returned to
    Advisor-e's default only by switching it on first and then pressing **Reset to platform** —
    and while it sat there nothing said the firm's edit was still being held. Fixed in **both**
    tabs at once (the same shape existed in Quizzes), per the whole-section rule. See Session 17.
  - 🔵 **CROSS-MACHINE — a red suite is coming, and it is the safety net working, not a break.**
    The desktop (`feat/firm-quiz-builder-ui`, despite the name, is transcribing domain support and
    logic tables) has added materials to `strategy`, `sales-marketing` and `staff` domain-support
    files. Its branch predates our row-id commit (`79de6d9`), so a read-only trial merge
    (`git merge-tree`) shows those three files **auto-merging with NO conflict** while **13 rows
    arrive with no `id`** — 9 in strategy, 2 in sales-marketing, 2 in staff. `domainSupportRowIds.test.js`
    will then fail all four of its tests. **Whoever merges second gives those 13 rows ids and adds
    them to `LOCKED_IDS`.** Only `design/ACTIONS.md` conflicts textually; `package.json` and
    `server/courseEngine.js` auto-merge.
  - ⚠ **HONEST LIMITS.** No revert-to-red proof was run on the Phase 3a route tests — that means
    editing source back to broken, and this repo's rule is no unapproved change even briefly. The
    carry-over tests are the exception and do stand on their own (the assertions are on data only
    the carry-over can produce). MySQL has still never been provisioned, so none of the storage
    paths have run against a real database. `utils/quizRows.js` sits outside the coverage gate,
    which measures `server/`, `server-middleware/` and `mixins/` only — the same position as
    `utils/staircaseRows.js`, so a pre-existing scope choice rather than a new gap.

  ### Session 17 (2026-07-31, laptop) — the tabs stop behaving differently

  Three commits (`c223695`, `63cc54f`, `025ed9c`), pushed. Suite **3,341 → 3,365 / 208 suites**,
  lint 0 errors, tree clean, **71 ahead / 0 behind** `master`. Session opened with `/startup`:
  0 behind. **Phase 4 (Adopt / Keep mine) was planned and approved in principle but NOT started**
  — see the handover at the end.

  - 🔴 **RULED 2026-07-31 (Mike) — EVERY FIRM MANAGER TAB OPENS THE EDIT BOX WHERE YOU CLICKED.**
    *"I do not want users having to figure out each page is different."* This is a standing rule
    for any tab built from here, not a fix to two screens. **Clicking Edit opens the form IN the
    row clicked; Add opens at the END of the list, where the new row will appear.** Quizzes is
    the reference implementation (Session 16).
    - **Inventory taken before changing anything** — two offenders, not one. **Advisory
      Staircase** (form below BOTH the live list and the switched-off list, so worse than the
      quizzes case) and **Advisory Distinctions**. **Domain Support and Logic Tables already
      comply** — they have no separate form at all, the fields are inline `b-input`s in the row,
      which is in-place by construction. Team Case Studies, Team Progress and Documents have no
      edit form.
    - 🔴 **ADVISORY DISTINCTIONS WAS REBUILT FROM A `b-table` INTO CARDS.** A table cannot hold a
      form against the row it belongs to except through a Buefy detail-row trick whose behaviour
      could not be verified without seeing the screen. Cards make it structural. Every column's
      content survives, under the same words the column headings used.
    - **The Add button no longer hides on either tab** — a button vanishing at the top was the
      only visible response to clicking Edit, and it read as a fault (the Session 16 cue).
    - **Three form components now exist** — `FirmQuizQuestionForm`, `FirmStaircaseStepForm`,
      `FirmDistinctionForm` — one per tab, so the form shown when editing and when adding cannot
      drift apart. The distinctions picker's search/area filters moved INTO its form component:
      they are about finding a template, not about what is saved, and a fresh child mounts with
      fresh filters instead of the parent having to remember to reset both on open AND close.
    - ⚠ **A PROCESS NOTE MIKE MADE EXPLICITLY.** He gave a clear instruction and the AI came back
      with a technical either/or (expanding table row vs cards) dressed as a design choice.
      *"I don't know why you asked me to try and do it differently when I already clearly gave
      you an instruction."* **When the instruction is clear, implement it and report what was
      done — do not re-open it as a question.**
  - ✅ **THE RESET GAP CLOSED, BOTH TABS (`63cc54f`).** Switched-off rows the firm has edited now
    carry the same **Customised** tag the live list uses and offer **Reset to platform** directly.
    **No backend change was needed** — both reset routes only ever delete the stored edit and
    never touch the declines key, so resetting from the switched-off list leaves the row switched
    off. Asserted explicitly: if it ever also fired the decline route, a firm asking for
    Advisor-e's wording back would silently find the question live in front of its advisors.
    **No new strings** — both tabs already had a Customised tag and a Reset button.
  - ✅ **THE STAIRCASE SENTENCE WAS WRONG, THE BEHAVIOUR WAS RIGHT (`c223695`).** See the closed
    CHECK above. The claim had spread to **three developer comments**, one of them on the
    **quizzes** decline route — asserting the opposite of what `quizCascade.routes.test.js` had
    just proven. **The wrong sentence was copied onto the new feature in the same session the
    correct behaviour was built and tested.** → **RULE: when a feature is cloned from a sibling,
    its prose is cloned too, and prose carries no test.** A copied comment must be re-read
    against the behaviour being built, not the behaviour it came from. (A fourth copy was found
    later in `utils/staircaseRows.js` and fixed in `63cc54f`.)
  - ✅ **TEMPLATE-PICKER DUPLICATE KEYS (`025ed9c`).** "Capacity, Capability, Opportunity" appears
    **twice inside General Tools** in the master export, and the picker keyed its list by title —
    Vue warned duplicate keys "may cause an update error", i.e. a tick can land on the row the
    manager did not click. The row's `index` is now carried through the projection and used as
    the key.
    - ⚠ **THE FIRST ATTEMPT WAS WRONG AND ONLY THE TEST CAUGHT IT.** Keying on `index` looked
      right against `data/templates.json`, but the picker is handed a **trimmed copy** keeping
      only `title` and `subSection`, so every key evaluated to `undefined|<title>` and the
      collision survived. The test now asserts against **the list the picker is actually handed**,
      not the raw file. → **RULE: assert against the data the component RECEIVES, not the file it
      came from.**
    - **Scope stated honestly:** this fixes which row you CLICK. What a tick **stores** is still
      the title, which is what `templateResolver` matches on, so two templates sharing a title
      still boost together. That is a content question for the master export, which this repo
      **never edits**. One visibly repeated row therefore remains in the picker. The other four
      duplicate titles sit in areas the picker already excludes.
  - ✅ **TWO SCREENS THAT HAD NO RENDERING TEST NOW HAVE ONE.** `firmStaircase.component.test.js`
    (5) and `firmDistinctions.component.test.js` (9). They assert **WHERE** the form opens, not
    that one exists — *"a form exists somewhere on the page"* was true on the day the Session 16
    bug was reported. They also lock that a switched-off distinction is still listed with a way
    back, and that a customised one shows the firm's wording with Reset offered.
  - ⚠ **HONEST LIMITS.** **Neither screen has been seen running** — Mike's dev server was down all
    session, and Advisory Distinctions is a real change to information layout, which is exactly
    the class of thing the suite missed in Session 16. **Mike's look at Distinctions is the
    outstanding verification.** MySQL still not provisioned. The three form components sit outside
    the coverage gate (`server/`, `server-middleware/`, `mixins/` only), the same pre-existing
    scope choice as `utils/quizRows.js`.
    - 🔴 **UPDATED 2026-08-01 — this limit was RIGHT TO STATE AND THE SCREEN WAS BROKEN.** Not in
      its layout: the rebuild left a stray `}` in the Hub's stylesheet, and **the whole Firm
      Manager page would not compile at all**. Found by a build before Mike looked; see Session 18.
      **Advisory Distinctions has since been viewed and approved by Mike — that verification is
      now CLOSED. The Advisory Staircase rebuild has still not been seen running.**
  - ☐ **NOTED, NOT ACTIONED — Advisory Distinctions is the only Firm Manager tab still written in
    hardcoded English.** Quizzes and the Staircase route every label through `$t()`. Flagged
    rather than proposed because the i18n sweep is gated behind the cleanup pass (P3 · I18N
    below, branch `chore/i18n-jsdoc-cleanup`). The cards rebuilt this session reuse the table's
    own English headings, so the tab is no worse than it was — but it is now the odd one out on a
    Hub that was just deliberately made consistent.

  ### ✅ Quizzes Phase 4 (Adopt / Keep mine) — COMPLETE 2026-08-01 (`ab31075` + `e254ff8`)

  > **Closed 2026-08-01.** Stage A (the record) and Stage B (the screen) are both built, tested,
  > mutation-proven, committed and **live-verified by Mike on the running app** — see Sessions 19
  > and 20 below. The plan below is left verbatim as the record of what was built; every item in
  > it is now history, not to-do. **The quizzes workstream is finished.**

  The last piece of the quizzes workstream, and a **port of what the Advisory Staircase already
  does** (Phase 3, `keepMineStaircaseStep` / `_staircaseDriftIds` / `_staircaseStepSignature` /
  the review modal in `FirmStaircase.vue`) — not a design job. Verified 2026-07-31 that **nothing
  of it exists yet**: `setQuizOverride`'s own JSDoc says so in as many words.

  **What it is, in one sentence:** a firm that edits one of Advisor-e's questions is shielded from
  our later improvements to it, deliberately — Phase 4 tells them we changed it, shows both
  versions, and lets them **Adopt** ours or **Keep mine**.

  **Stage A — the record (backend).**
  1. New additive key `quiz-override-baselines` (+ gitignored dev file), mirroring
     `STAIRCASE_BASELINES_KEY`. Nothing existing is rewritten.
  2. `_quizQuestionSignature(row)` over `EDITABLE_QUESTION_FIELDS`.
  3. Stamp the platform's current wording as the baseline **in `setQuizOverride`** — currently and
     deliberately not stamped, because until this stage nothing could read it.
  4. `_quizDriftQids(firmId, overrides, savedBy)`, returned from `getQuizzes` as `driftQids`.
  5. 🔴 **A MISSING BASELINE IS BACKFILLED, NOT READ AS DRIFT.** An edit made before this feature
     has no stamp; reading that as "the platform changed this" would greet every such firm with a
     review prompt for an update that never happened. Same rule as the staircase.
  6. **Adopt is the EXISTING reset route** — it must also drop the baseline, as the staircase's
     does, so a later re-edit stamps fresh rather than inheriting a signature from a decision the
     firm has since undone.
  7. New route **Keep mine** (`POST /api/firm-manager/quizzes/platform/:qid/keep-mine`) —
     re-stamps the baseline to the platform's CURRENT wording so the prompt clears until our next
     change. **409, not a silent success, when the firm holds no edit:** nothing is being kept,
     and stamping a baseline for a question the firm does not override would arm a prompt that can
     never fire.

  **Stage B — the screen.** Flagged questions get a tag and a **Review update** button opening a
  side-by-side panel with Adopt / Keep mine.

  **No wording decisions are outstanding** — the staircase's labels are already approved and the
  consistency ruling says the tabs read the same, so they are mirrored verbatim ("Platform updated
  this question", "Review update", the existing panel text).

  **Do Stage A, prove it, commit, then Stage B** — so nobody is ever holding a half-built feature.

  ### Session 21b (2026-08-01, laptop) — COLLABORATE SLICE 4: there is finally something to look at

  Suite **3,474 → 3,486 / 212 suites** (two new), lint 0 errors, **`nuxt build` green**, 5/5
  mutants killed, both components restored **byte-identical (SHA-256)**. Built straight after
  slice 2, same session.

  **The Firm Manager Hub has a seventh tab: "Advisor Network"** — label ruled by Mike from three
  offered (as *"Adviser Network"*; **respelled to "Advisor" on 2026-08-02**, see the wording bullet
  below). It is Collaborate's manager console: every adviser in scope with availability and
  group count, group-join approvals, bulk invite, the cross-firm Open/Closed control, and the
  activity feed. Higher tiers get the roll-up tree, unchanged.

  - 🔴 **THE PLAN'S ORDERING WAS WRONG AND WAS CHECKED RATHER THAN FOLLOWED.** §5 put the tab
    *after* the storage re-key, reasoning it should "land on correct foundations rather than
    needing rework". **Read the component: it fetches only `/api/people/*`, served from
    Collaborate's own in-memory store, and never touches `firm_framework_versions`** — the table
    slice 3 re-keys. There was no dependency, so the tab could not have needed rework, and
    following the order would have kept the whole workstream invisible for another two sessions.
    The row in the plan is corrected in place.
  - 🔴 **VIEW-AS IS WITHHELD IN THIS TAB, AND THAT IS NOT THE RISK MIKE ALREADY RULED ON.** His
    2026-07-30 ruling was that the *exposure* is negligible because the adviser submits their own
    CPD report. This is a different defect: the button sets the cookie then reloads to `/`, which
    **in this app redirects to the advisor screen**, and the "you are viewing as someone else"
    banner lives in Collaborate's layout, which never came across. A manager would land in a
    colleague's session with **no sign of it and no way back**. The Action column goes with the
    button — an empty column reads as broken. Restoring it means bringing the banner and its exit
    path across, in one change, and the reason is written in the component so nobody "fixes" the
    omission.
  - ✅ **ONE COMPONENT STILL SERVES ALL FOUR TIERS.** The obvious move — clone a firm-only
    version into `components/firm/` — was rejected: it would fork the one thing Collaborate had
    already built that this repo is under a ruling to make room for. `ManagerConsole.vue` instead
    gained an `embedded` prop that drops the page frame, its banner and the dev tier-switcher.
    The element structure is identical in both modes, only the classes change, so nothing below
    has to know which mode it is in.
  - 🔴 **THE WORDING FILES ARE JOINED BY A MERGE THAT REFUSES A COLLISION.** Collaborate's
    `locales/collaborate/en.json` is not copied into ours — the two are merged section by section
    in `plugins/i18n.js` via `utils/i18nMessages.js`, which **throws** if a section name exists in
    both. Letting one file win silently would change every label under that section with no error
    anywhere. **`profile` DOES collide in both files and is deliberately not merged**, with a test
    that fails if someone "fixes" the omission by adding it to the list. Three sections are
    merged (`common`, `console`, `firm`) — what the tab actually renders, checked by walking the
    components for `$t()` keys rather than by eye.
  - **TESTS ARE POSITIONAL, NOT PRESENCE-BASED, per the Session 16 lesson:** that the console
    renders WITHOUT a second banner or page frame inside a tab that already has both; that
    View-as and its column are absent; that the adviser table and cross-firm control are still
    there (a tab that lost them would be decoration); and that it reads the **real** role-gated
    endpoint, not one of Collaborate's dev preview endpoints — pointing the live tab at a preview
    would show a manager fabricated demo advisers as if they were their own firm's people.
    - ⚠ **ONE MUTANT RAN INVALID FIRST TIME** — a placeholder left unsubstituted in the harness,
      so the pattern matched nothing. Re-run properly; it killed. **The lesson from Session 19
      earning its place again: a skipped mutant reads like "no test needed" when it means "no
      test ran".**
  - ✅ **LIVE-VERIFIED BY MIKE, 2026-08-01, ON THE RUNNING APP** — *"collab firm manager page is
    in and works great"*. That closes the one thing the suite structurally cannot judge, and it
    proves five things at once that no test covers together: the console renders inside the Hub
    with no second banner or page frame; its data reaches the browser through the new
    `/api/people` proxy entry; the merged auth admits one token across both apps' routes; the
    locale join worked (no raw `firmAdviserNetwork.*` keys on screen); and **the two former
    servers boot as one real Restify process** — confirmed separately with `/api/health` and
    `/api/people/firm` both answering 200 on port 4000, which the mocked-Restify wiring test by
    definition cannot show.
  - ✅ **WORDING CONFIRMED — the tab's one new sentence** (`firmAdviserNetwork.lede`): *"Everyone
    advising under your firm: who they are, the specialty groups they have asked to join, and
    whether they may work with advisers outside the firm."* On screen when Mike approved the tab;
    every other label is Collaborate's existing approved wording. Tab NAME (**Adviser Network**)
    was ruled explicitly from three offered.
    - ✅ **SUPERSEDED 2026-08-02 — the tab is "Advisor Network", and the whole page spells it
      "Advisor"** (Session 25, `a76b3e2`; re-confirmed by Mike 2026-08-02 when this record was found
      to contradict the shipped app). 25 strings plus 5 demo job titles, scoped from
      [`utils/i18nMessages.js`](../utils/i18nMessages.js) — only the `common` / `console` / `firm`
      sections are surfaced by this app, so the rest of Collaborate's wording file was correctly
      left alone. **Internal key names are unchanged** (`firmAdviserNetwork.*`, and the `lede` text
      above is otherwise as approved): they are not user-facing.
    - ⚠ **The line above is kept, not overwritten.** It is the true record of the original ruling,
      and a superseded ruling that quietly disappears leaves the next person unable to tell a
      decision from a drift.
  - ⚠ **HONEST LIMITS THAT REMAIN.** The advisers shown come from Collaborate's **in-memory
    store, which resets on restart** (slice 5) — dev-firm-001 shows "Advisor-e Munich" with 3
    advisers and 2 pending approvals, and none of it is real data. The `firm-manager` page chunk
    grew 186 → 213 KiB uncompressed; it is an async route chunk, not first-load, so the 300 KB
    gzipped budget is not engaged — but it has not been measured gzipped either way.
    - ◐ **UPDATED 2026-08-02 (slice 5 phase B) — the reset is fixed IN DEVELOPMENT ONLY, and the
      distinction is the point.** On a developer machine the store now snapshots to a gitignored
      `data/dev-collaborate-people.json` after each change and hydrates on boot, so the tab keeps
      its advisers *and* the manager's own decisions across a restart. **In production nothing is
      read or written** — deliberately: the store holds names, emails and phone numbers, and that
      file on a live server would be personal data at rest outside the database. **So a UAT or
      production instance still resets on restart**; only MySQL fixes that (phase C, blocked on
      provisioning). Do not read this row as "persistence is done". The data is still mock, and
      the chunk size above is unchanged and still unmeasured gzipped.

  ### Session 23 (2026-08-02, laptop) — THE TWO DIVISIONS JOINED, AND A THIRD ONE FOUND ADRIFT

  Suite **3,499 → 3,665 / 222 suites**, lint 0 errors, audit gate clean. Commits `cade62e`
  (laptop), `6b9d4d2` (on the release snapshot), **PR #29** (`9661b0b`), merge `10d9a37`.
  **Every step was approved by Mike individually; nothing unapproved is in the tree.**

  - **The db-pool test left the Collaborate folder** (`cade62e`). Session 22 logged it as a small
    follow-up: `tests/collaborate/db.test.js` had been repointed at OUR pool, so a future "remove
    Collaborate" sweep would have deleted the app's **only** test of its database connection.
    Moved to `tests/unit/db.test.js` — a pure `git mv`, no content change, because both folders sit
    two levels under the root and its `require('../../…')` paths resolve identically. Counts
    unchanged (3,499 / 213), which is the proof rather than a coincidence.
  - 🔴 **THE DESKTOP'S 26 COMMITS REACHED `master` (PR #29) — and one defect was found and fixed
    on the way.** Verified **before** proposing the merge, in a detached throwaway worktree with
    the gitignored master export copied in first (the 2026-07-29 near-miss: without it
    `ghostReferenceValidator` reports no ghosts and two tests fail for the wrong reason).
    - **220/221 suites on a clean checkout — one failure the desktop could not have seen.**
      `CONTENT-ROUTING.md` carried a **count of the gitignored `data/dev-*.json` stores**, so the
      document was reproducible only on a machine where the app had been run: `11` on the desktop,
      `0` in a fresh clone, worktree or CI — while `contentRoutingReport.test.js` exists precisely
      to assert it matches its generator. **Green on its author's machine, red everywhere else.**
    - Fixed by naming the files instead of counting them, with a comment saying why a count must
      not return — *the failure is invisible from any machine that has run the app*. **Proven by
      regenerating with 0 dev files, then 3 planted, then 0 again: identical SHA-256 all three
      times**, and the old code confirmed machine-dependent the same way. A measured fix, not a
      plausible one. Then confirmed from the other direction when the merge landed here, on a
      machine that HAS all 11.
    - **Cut as a frozen `release/firm-quiz-builder-2026-08-02` snapshot at `2caee06`**, never
      pointed at the live branch — the PR #23 → #24 lesson, so anything the desktop committed that
      day could not silently join the release.
    - ⚠ **The pre-commit hook REFUSED to run in the worktree** (`.husky/_/husky.sh` is generated by
      `npm install` and does not travel). The helper was copied in so all three gates ran for real
      — **not** `--no-verify`. Worth knowing before anyone reaches for the flag: **verifying in a
      worktree needs three things carried in by hand — the gitignored master export, a
      `node_modules` junction, and `.husky/_/husky.sh`.**
  - **`master` merged into this branch (`10d9a37`) — clean, and the arithmetic is the proof.**
    `master`'s 3,652 + this branch's 13 = **3,665**. Not one test dropped or duplicated, which is
    the specific thing that fails when two branches meet (Session 21's 13 missing row ids).
  - 🔴 **THEN THE REAL FINDING — see [`stranded-report-programme`](#stranded-report-programme) in
    the ★ block.** Measuring which branches sit ahead of `master`, to design the fix for
    [`startup-blind-to-other-machine`](#startup-blind-to-other-machine), surfaced
    `feat/business-performance-report` at **73 ahead, last touched 2026-07-29**: Cost of Capital,
    Lease vs Buy, the Loan Estimator and **ReportShell — the model visual standard** — none of it
    in `master`. **The blind spot found its own second instance before its fix was even written.**
    Full detail and the trial-merge measurement are in that item.
  - **SLICE 3 HELD, deliberately, on Mike's call.** Counted rather than recalled: `loadFirmConfig`
    has **26 call sites across 10 files**, and the desktop's last 26 commits touched **three of
    those ten** — `server/routes/firmManager.js` (17 of the 26 calls), `advisorEngine.js`,
    `courseEngine.js`. The danger is not the loud conflict git shows you; it is the desktop
    **adding a new call** while the function's meaning changes — that merges green and is wrong,
    and it has already happened three times on this exact function.
    - **The control to build when it does start:** make a call in the old shape **throw**, so
      anything added meanwhile fails loudly in the suite instead of merging silently. That turns
      the dangerous class into the visible one and depends on nobody remembering anything.
  - ⚠ **`startup-blind-to-other-machine` is PLANNED, NOT BUILT.** The design: a **report-only**
    section in `scripts/check-branch-state.js` listing other branches ahead of `master` with how
    far and when last touched; never blocks a push (another machine being ahead is not your fault);
    fetches all of `origin` rather than just `master`, since stale local refs would defeat it;
    excludes your own branch and the frozen `release/*` snapshots. Today that yields **two lines,
    not a wall of noise**. ⚠ **The script has NO test at all** — one comes with the change.

  ### Session 22 (2026-08-02, laptop) — COLLABORATE SLICE 5 phases A and B: one pool, and a store that remembers

  Suite **3,486 → 3,499 / 213 suites** (one new suite), lint 0 errors, audit gate clean.
  Commits `e3d701c` (phase A) and `285b0eb` (phase B). **Slice 5 was taken ahead of slice 3 on
  Mike's call**, knowing phase B may need revisiting after the storage re-key — the trade was
  made explicitly, not by accident.

  - 🔴 **THE DUPLICATE POOL WAS NOT MERELY UNTIDY — THE FILE ARGUED WITH ITSELF.**
    `server/collaborate/utils/db.js` was byte-identical to `server/utils/db.js` bar the require
    depth, and **after slice 2 merged the two `config/integration.js` files it read the SAME
    settings** — so uncommenting `repository.js`'s SQL seam would have opened **two connection
    pools onto one database**. The trap was sharper than that: `repository.js`'s docblock already
    told the master team to use `server/utils/db.js` and `config/db-schema.sql`, while **the line
    of code directly beneath it required Collaborate's copy**. Anyone wiring SQL follows the code,
    not the prose. Deleted; seam repointed; the pool test (then `tests/collaborate/db.test.js`,
    since moved — see below) repointed to our pool — which **had no test at all until then**, so
    the merge gained coverage rather than losing it.
    (Its docblock had said `server/utils/db.js` all along while requiring the other file.)
    - ✅ **Small follow-up, DONE 2026-08-02 (session 23).** That test covered OUR pool while
      living in `tests/collaborate/`, so a future "remove Collaborate" sweep would have deleted
      the only test of the app's database connection. Moved to **`tests/unit/db.test.js`**.
      A pure `git mv` with **no content change**: both folders sit two levels under the repo
      root, so its two `require('../../…')` paths resolve to the same files as before.
  - **The 15 Collaborate tables moved into `config/db-schema.sql`** under their own section, with
    **table-name collisions checked before merging rather than assumed** (there were none; 26
    tables, no duplicates). They also inherit the `CREATE DATABASE` / `USE` that their standalone
    file never had — it had relied on the operator selecting a database first. One comment carried
    a path that changed when the app landed here (`server/data/ipClassification.js` →
    `server/collaborate/data/ipClassification.js`) and was corrected in passing.
  - 🔴 **"PERSIST THE ADVISERS" WOULD HAVE BEEN THE WRONG SCOPE, and reading the tab proved it.**
    The Adviser Network tab is not read-only: it writes **cross-firm posture**, **approve/decline
    on a join request** and **group invitations** — four different collections. Persisting the
    adviser list alone would still have lost the manager's own decisions on restart.
  - **The 22 mutating exports are wrapped from ONE list**, not a save call added at each of the 21
    mutation sites — a missed site there is silent data loss. A naming-convention test
    (`MUTATING_VERBS`) fails if someone adds `createSomething()` and does not list it.
  - 🔴 **THE LIMIT THAT MUST NOT BE MISREAD: this is DEV-ONLY, and production still resets.**
    `NODE_ENV=production` reads nothing and writes nothing, whatever else is configured, because
    the store holds names, emails and phone numbers — that file on a live server is personal data
    at rest outside the database. Durable storage is MySQL (phase C, blocked on provisioning).
    **Phase C was offered and refused on honesty grounds:** 42 untestable SQL bodies with no
    database to run them against is the fake-finished work CLAUDE.md forbids.
  - **Two failure modes designed out rather than discovered.** (1) **The id counters travel inside
    the snapshot** — restore the rows without them and the next created row reuses an id that is
    already taken. (2) **The suite is sealed off from the developer's file** — hydrating from
    whatever sits on a machine would make the 431 Collaborate tests depend on local state, the
    trap that bit the firm-distinctions dev fallback before it was hardened. Every test names its
    own temp file, and the full run was checked to leave `data/` untouched.
  - ✅ **MUTATION-VERIFIED OUTSIDE THE REPO, and each mutation confirmed to have APPLIED first** —
    the Session 21 lesson earning its place: a mutant that never ran reads exactly like a mutant
    that was killed. Remove the production guard → production writes a file; remove the Jest guard
    → it enables under test; remove the shape guard → a JSON array is accepted. Each kills its own
    test and no other; the original passes all three.
  - ✅ **THEN PROVEN IN A REAL NODE PROCESS, NOT JEST** (env-pointed at a scratchpad file, so
    nothing was written into the repo): first run read the seeded `open` and changed it; **second
    run booted reading `closed`**, with 9 advisers, 4 groups, postures and all five counters
    restored. ⚠ **Not seen in a browser after a restart** — the mechanism is proven end to end,
    the on-screen experience is not. Worth one click-through when the app is next running.
  - ⚠ **CROSS-MACHINE — slice 3 is now MORE entangled with the desktop, not less.** Checked, not
    assumed: the desktop's `feat/firm-quiz-builder-ui` (26 ahead, 0 behind) touches **none** of the
    slice-3 storage files, but it has added **two new callers of `overlay.loadFirmConfig(firmId,…)`**
    at `firmManager.js` ~L3109 and ~L3152 — the exact function slice 3 re-keys. That merges
    **green and silently wrong**. With `staircaseConfig.js` that is three such callers added since
    the collision list was written. **Recommendation on record: land the desktop's branch into
    `master` BEFORE starting slice 3**, so every caller is visible in one tree.
  - ⚠ **A STALE CLAIM OF MINE, CAUGHT THE SAME DAY.** I reported "16 blank Step-by-step rows in
    `sales-marketing` waiting for Mike" from a prior session's note. Counted against the desktop's
    branch: **it has already filled 9 and added 2 materials — 7 remain** (Customer Type Table,
    Sparketing, Branding Review, Customer Loyalty Programme, Pricing, Packaging/Bundling, Sales
    Process Review). The inherited-claim rule again: a note from the other machine is a claim to
    check.

  ### Session 21 (2026-08-01, laptop) — COLLABORATE SLICE 2: the two back-ends became one

  Suite **3,461 → 3,474 / 210 suites** (one new suite), lint 0 errors, **`nuxt build` green**,
  15/15 mutants killed, all three production files restored **byte-identical, proven by
  SHA-256**. Approved by Mike as a named change list before any file was touched.

  **What is now single:** one Restify server (Collaborate's 40 routes registered alongside our
  103), one `config/integration.js`, one auth middleware, one `/api/translate/locale`, one
  `/api/health`. **Five duplicate files deleted** — Collaborate's `restify-server.js`,
  `middleware/auth.js`, `config/collaborate/integration.js`, `routes/translate.js`,
  `routes/health.js` — with every reference repointed and every test kept, not dropped.

  - 🔴 **THE TWO SERVERS BOTH BOUND PORT 4000, SO THEY COULD NEVER HAVE RUN TOGETHER.** Slice 1
    landed the code and reported it green, which it was — but "both suites pass" was never the
    same claim as "both apps run". Nothing had tried to start them at once.
  - 🔴 **`/api/translate/locale` WAS NOT A DUPLICATE, AND PICKING EITHER COPY WOULD HAVE LOST
    WORKING CODE.** Reported to Mike before merging, because it changed what he had approved.
    The two had been hardened in opposite directions: **ours** carries `buildChunks`, the fix
    for short strings piling into one oversized URL that MyMemory 414s — silently reverting a
    whole locale to English; **Collaborate's** carries input sanitisation, a 5,000-char cap,
    schema validation of the reply, and **`from`**, which lets a chat message be translated out
    of its own language. Registering ours alone would have quietly broken Collaborate's chat
    translation into a wrong-but-plausible result. Mike ruled: fold them. Done, and the folded
    route now carries all five behaviours.
    - ⚠ **NEITHER REPO'S TESTS COVERED `from` OR THE SANITISING** — Collaborate had both in code
      and never asserted what went on the wire. Five tests added, all mutation-proven. **A
      feature that only one side's code had is exactly what a merge loses silently.**
  - 🔴 **THE ROUTE TABLE HAD NO TEST AT ALL, AND IS EXCLUDED FROM COVERAGE.** `restify-server.js`
    is a process bootstrap, so a mistyped handler registers `undefined`, Restify throws at boot,
    and all 3,400 other tests still pass — the Session 18 shape exactly. New
    `tests/unit/serverWiring.test.js` mocks Restify and asserts: every handler is a function; **no
    path is claimed twice** (Restify keeps the FIRST registration and drops the rest silently,
    which is the specific way merging two route tables breaks a screen with no error anywhere);
    every Collaborate route carries its auth guard; every firm-manager route still carries
    `firmAuth`. 4/4 mutants killed.
  - **THE DEV DOORS WERE DELIBERATELY NOT COLLAPSED, and that is the considered answer, not a
    shortcut.** In production the two guards are identical — valid Advisory JWT or 401. They
    differ only in dev: ours demands an explicit magic token, Collaborate's admits a request with
    no token at all. Forcing one would either loosen every firm-manager route or break every
    Collaborate screen in dev. So both doors stay, over **one** token reader — meaning one
    `jwt.verify` call site for the RS256 switch, and one claim map.
    - **Collaborate's guard gained a check it did not have:** it tested only the
      `ALLOW_DEV_AUTH` flag and leaned on the startup guard for production. It now also requires
      `NODE_ENV !== 'production'`, so the bypass is refused twice over. A test pins it.
    - ⚠ **A SEMANTIC CLASH THAT WOULD HAVE READ AS A BROKEN TEST:** ours freezes the dev flag at
      require time, Collaborate's read it per request, and its tests toggled `process.env`
      mid-run. Freezing is the stronger property (nothing at runtime can open the bypass), so it
      won, and those two tests were re-pointed through `jest.isolateModules` — the assertions are
      unchanged.
    - **`firmAuth` is still Bearer-only.** Collaborate authenticates by cookie and now shares the
      reader, so a test locks that our routes still refuse a cookie token: **widening them is an
      auth decision, not plumbing**, and must be Mike's call, not a side effect of a merge.
  - **Both identity shapes now come off one verified token** — `req.identity` for Collaborate's
    routes, the flat `req.firmId`/`req.userRole` for ours. Neither half was rewritten to read the
    other's, and a guard that set only its own half is a killed mutant.
  - **The startup guard is now Collaborate's tested pure function** (`productionStartupViolations`),
    which checks the same three things ours checked inline and untested, and reports **all** of
    them rather than the first. Our dev-only warnings are unchanged.
  - ⚠ **HONEST LIMITS.** **Nothing is visible yet** — no menu entry, no page, no URL; the console
    is still only reachable by an API call. That is slice 4, and this slice is provable only by
    the suites and the build, exactly as plan §6 risk 4 said. **Collaborate's data layer is still
    its own in-memory store that resets on restart** (slice 5), and **`config/collaborate/db-schema.sql`
    is still a second schema file** (slice 3). Neither was touched.
    - ✅ **The second schema file is GONE as of 2026-08-02** (slice 5 phase A): its 15 tables were
      merged into `config/db-schema.sql` under a "COLLABORATE — people layer" section, verified
      free of table-name collisions before merging, and the file deleted. The master team now
      applies **one** schema. ◐ **The in-memory-store half was then addressed the same day by
      phase B — but in DEVELOPMENT ONLY, and production still resets.** See the phase-B note under
      Session 22 below before quoting this as done.
  - ⚠ **KNOWN DUPLICATES LEFT STANDING, deliberately, and where each one dies:** the two
    `sendError` modules (firmAuth requires Collaborate's for its envelope — one cross-namespace
    require, commented), `server/collaborate/utils/db.js` (a second MySQL pool, now orphaned) and
    `server-middleware/collaborate/api.js` (a second proxy, unregistered — ours is used because
    it also aborts the upstream request when the client disconnects). All three are storage/data
    surfaces that slices 3 and 5 rewrite with tests around them; merging them ad hoc now was the
    thing the P3 row above explicitly warned against.
    - ✅ **The duplicate MySQL pool DIED 2026-08-02** (slice 5 phase A). `server/collaborate/utils/db.js`
      was byte-identical to `server/utils/db.js` bar the require depth, and after slice 2 merged the
      two `config/integration.js` files it read the **same** DB settings — so uncommenting
      `repository.js`'s seam would have opened **two pools onto one database**. Worse, that file was
      **internally contradictory**: its docblock already named `server/utils/db.js` and
      `config/db-schema.sql` while the code beneath required Collaborate's copy, so anyone wiring SQL
      would have followed the code and got the wrong pool. Deleted; the seam repointed;
      the pool test (then `tests/collaborate/db.test.js`) repointed to our pool — which until then
      had **no test at all**, so this gained coverage rather than losing it. The other two
      duplicates still stand as written.
      - ✅ **Follow-up DONE 2026-08-02 (session 23):** that test covered OUR pool while living in
        `tests/collaborate/`, so a future "remove Collaborate" sweep would have deleted the only
        test of the app's database connection. Moved to **`tests/unit/db.test.js`** — a pure
        `git mv`, no content change (same folder depth, so its relative requires still resolve).
  - ⚠ **CROSS-MACHINE: THIS IS THE COLLISION THE SLICE-1 NOTE PREDICTED.** `server/restify-server.js`
    and `config/integration.js` were both edited here. The desktop must merge `master` before
    touching either.

  ### Session 20 (2026-08-01, laptop) — Phase 4 STAGE B, and the same fix carried to Distinctions

  Two commits (`e254ff8`, + the Distinctions sidebar). Suite **3,437 → 3,459 / 209 suites**, lint
  0 errors, `nuxt build` green, tree clean. **Both pieces were LIVE-VERIFIED by Mike on the running
  app** — *"all looks good and works as planned"* and *"yep all good"*. Phase 4 is complete and the
  quizzes workstream is closed.

  - ✅ **STAGE B BUILT — a firm now sees what we changed to a question it had reworded.** The tag,
    the **Review update** button, and the side-by-side panel with Adopt / Keep mine. Adopt reuses
    the reset route (which drops the baseline too); Keep mine calls Stage A's new route. Wording
    mirrors the Advisory Staircase's approved labels verbatim, per the consistency ruling.
  - 🔴 **THE ONE DEPARTURE FROM THE STAIRCASE, AND IT IS THE POINT OF THE SESSION: A FLAG THAT
    CANNOT BE FOUND IS NOT A FLAG.** The staircase's five steps are all on one screen, so a flag
    there is impossible to miss. **A quiz question sits inside one of 62 pages behind the rail**,
    so a tag on the card alone would have waited to be stumbled upon — a firm could hold an update
    for months. The rail now carries the count on the page **and** on its sub-section, so a firm
    sees something is waiting before opening anything. Ported straight from the plan, this would
    have shipped without it.
    - **The count runs THROUGH `buildQuizRows`, not beside it.** A second count would be free to
      disagree, and the way that shows up is a rail promising an update on a page where nothing is
      flagged — which teaches a manager to ignore the flag. Same rule applied to Distinctions below.
    - `hasUpdate` also requires the platform version to still exist. The backend never reports
      drift on a retired qid, so the guard should never fire; without it, Review update would open
      a panel with one empty half.
  - ✅ **THE SAME GAP EXISTED ON ADVISORY DISTINCTIONS, AND IS NOW CLOSED (Mike asked the right
    question: "can we use what you've done elsewhere?").** That tab's banner has always said "N
    mentor updates since your last visit" — and **its own code comment finished the sentence:
    *"Count spans all domains; switch domains to find the badged rows."*** Fourteen domains, one on
    screen at a time. The sidebar now carries a per-domain count.
    - **It counts BOTH kinds** — the passive *"Updated by mentor"* notice and the *"Mentor updated
      this distinction"* drift that needs a decision. They differ in what they ask of a manager,
      but the question the sidebar answers — *is there anything to look at in here?* — has the same
      answer for both.
    - **`domainDistinctions` became `distinctionRowsFor(domain)`**, a method the computed calls.
      That is what lets the sidebar and the cards share one rule. The tab's nine existing tests
      passed untouched, which is the proof the refactor changed no behaviour.
    - **The label had to move from Buefy's `label` prop into its `label` slot** — `BMenuItem`
      renders one or the other, never both. A mutant that drops the domain name is in the suite
      because that is exactly how this change could have silently emptied the sidebar.
    - ⚠ **NOT the same as the other tabs, and worth knowing: only ONE of the six blocks needed
      this.** The Staircase has five steps on one screen; Domain Support and Logic Tables carry no
      update flags at all (they are not on the shared mechanism yet, so there would be nothing to
      count); Document Library and Team Case Studies inherit nothing from us. Checked before
      building rather than applied everywhere for symmetry.
  - **Mutation-tested 11/11 killed across the two pieces** (6 for Stage B, 5 for the sidebar), all
    files restored **byte-identical, proven by SHA-256**. The mutants are the ones that would harm
    a firm: Keep mine firing the reset (discarding the wording it promises to keep), drift never
    reported, the rail counting questions rather than updates, the sidebar counting every row, and
    the dropped domain name.
  - ⚠ **A TEST-DATA FINDING WORTH THE LINE: `firmDistinctions.component.test.js` builds its rows in
    a domain called `growth`, WHICH IS NOT ONE OF THE FOURTEEN.** The card tests pass anyway —
    `domainDistinctions` filters by whatever domain is selected — so it went unnoticed. It only
    surfaced because a per-domain count has to key on a real id. The new tests use real ids; the
    older ones are left alone, since changing them would be changing tests that are passing for
    their own reasons.
  - **Dev-run facts worth not re-deriving:** dev-firm-001 **already holds a genuinely drifted row**
    — `pd-10`, in Profitability & Feasibility — so the Distinctions count is visible in dev with
    nothing seeded. The **passive** notice, by contrast, cannot be seen in dev at all: it needs
    `updated_at`/`created_at` on a platform row and **none of the 67 rows in
    `data/advisory-distinctions.json` carries one**. Showing it would mean editing committed
    platform content, which was not done.
  - ⚠ **HONEST LIMIT — the build covers Stage B, NOT the Distinctions change.** `nuxt build` ran
    green before Mike looked at Quizzes (the Session 18 rule). By the time the Distinctions work
    was finished his dev server was running again, and building against a live dev server is
    forbidden. `componentStyles.test.js` parses the Hub's style block with the same parser the real
    build uses and passed, so the Session 18 defect class is covered — **but that is not a build,
    and the next session should run one.**

  ### Session 19 (2026-08-01, laptop) — Quizzes Phase 4 STAGE A: the record

  One commit (`ab31075`). Suite **3,424 → 3,437 / 209 suites**, lint 0 errors, coverage up, tree
  clean. Same day and same session as Session 18 below; recorded separately because it is a
  different piece of work.

  - ✅ **BUILT, exactly as the plan above set out.** New additive key `quiz-override-baselines`
    (+ its gitignored dev file, added in the same commit as the key); `_quizQuestionSignature`
    over `EDITABLE_QUESTION_FIELDS`; the stamp in `setQuizOverride`; `_quizDriftQids` returned
    from `getQuizzes` as `driftQids`; the baseline dropped by the reset route (which **is** the
    Adopt half); and `POST /api/firm-manager/quizzes/platform/:qid/keep-mine`, **409 not a silent
    success** when the firm holds no edit.
  - 🔴 **A MISSING BASELINE IS BACKFILLED, NOT READ AS DRIFT** — the rule the whole feature turns
    on. An edit made before today carries no stamp; reading that as "Advisor-e changed this" would
    greet every such firm with a review prompt **on every question it had ever edited, at once**,
    for updates that never happened.
  - **TWO DELIBERATE DEPARTURES FROM THE STAIRCASE, both commented in code so the next reader
    does not "fix" them:**
    - The baselines key is **NOT** added to the reader's `CONFIG_KEYS`. Those three keys are the
      firm's DECISIONS, and `loadFirmQuizState` asks "has this firm decided anything?" by looking
      at them. **A baseline is not a decision** — filed alongside the three, a firm that had only
      ever been *stamped* would start reading as a firm with its own quiz configuration.
    - A `PLATFORM_QUESTIONS` Map is built beside `PLATFORM_QIDS`. The staircase can
      `steps.find(...)`; quiz questions are nested two deep across 62 banks, so a scan per lookup
      would repeat that walk for every edited question on every load of the tab.
  - **An override keyed to a qid Advisor-e no longer ships is NOT offered as an update** — nothing
    to compare against and nothing to adopt, and `loadFirmQuizState` already treats such a row as
    junk rather than a decision. Reporting it here would make this the one place that disagreed.
  - **13 new tests**, ported case for case from the staircase's, **plus two the staircase has no
    equivalent of**: the retired-qid case, and a **per-field** check that everything a firm may
    edit is actually signed — carrying a **control assertion**, so the loop cannot pass by
    comparing the signature against something else entirely.
  - **Mutation-tested 7/7 killed**, control green, production file restored **byte-identical
    (proven by SHA-256, not by eye)**. The mutants are the ones that would harm a firm: backfill
    removed, drift never reported, nothing stamped on edit, a stale baseline left on reset,
    keep-mine silently succeeding, a retired qid offered for review, a field dropped from the
    signature.
    - ⚠ **THE FIRST RUN REPORTED 3/7 AND THE VERDICT WAS A LIE — FIFTH SIGHTING OF THE CRLF
      TRAP.** Four multi-line patterns silently matched nothing because this repo's source files
      are CRLF and the patterns were written with `\n`. **A skipped mutant reads like "no test
      needed" when it means "no test ran".** The harness now normalises to the file's own line
      endings; the skip path also prints loudly rather than passing quietly. Extends the
      2026-07-28 and 2026-07-29 mutation lessons.
  - ✅ **STAGE B — THE SCREEN — BUILT AND LIVE-VERIFIED 2026-08-01 (`e254ff8`).** See Session 20
    below. Flagged questions carry the tag and a **Review update** button opening the side-by-side
    panel with Adopt / Keep mine, and the rail says which page holds the update.

  ### Session 18 (2026-08-01, laptop) — the rebuilt screen would not have opened at all

  One commit (`67329f8`), pushed. Suite **3,365 → 3,424 / 209 suites**, lint 0 errors, tree clean,
  **73 ahead / 0 behind** `master`. Session opened with `/startup`: 0 behind. Quizzes Phase 4 was
  again **not** started — it remains the next job, exactly as recorded above.

  - 🔴 **THE WHOLE FIRM MANAGER PAGE WOULD NOT COMPILE, AND IT SHIPPED GREEN.** Session 17's
    rebuild moved the template-picker styles out to `FirmDistinctionForm.vue` and deleted
    `.template-picker-selected` — **but left its closing brace behind**, one line above
    `</style>` in `FirmManagerHub.vue`. That single stray `}` fails `postcss`, so `css-loader`
    could not build the component, and the Hub is imported by `pages/firm-manager.vue`:
    **every tab was unreachable, not just Distinctions.** `nuxt build` ended `FATAL Nuxt build
    error`.
  - 🔴 **WHY 3,365 GREEN TESTS AND A CLEAN LINT PROVED NOTHING HERE — the rule to carry
    forward.** **Neither gate reads a `<style>` block.** The test runner strips it; ESLint lints
    markup and JavaScript. **Only a full build compiles CSS, and no commit runs one.** So a
    stylesheet error is invisible to every automated gate this repo had. → **RULE: run
    `nuxt build` before asking Mike to look at any rebuilt screen.** This is the third sighting
    of the same family (Session 16's screen defect, Session 17's untested prose, now this):
    **the suite cannot see a screen, and it cannot see the words or the styling on it either.**
  - **Found because Mike asked for a proper build before looking** — *"do a proper build so i can
    check without failing to open"*. Had he simply opened it, he would have met a broken page and
    no explanation.
  - **Proof method, recorded because guessing would have been faster and wrong:** brace balance
    in the style block was **15/15 before `63cc54f`** and **12/13 after** — which dated the
    defect to the rebuild before a single line was read. Then `postcss.parse` on the block alone
    (`Unexpected }`, line 59), then the real build for the authoritative answer. **All 70 `.vue`
    files were scanned: this was the only one broken.**
  - ✅ **GUARD BUILT — `tests/unit/componentStyles.test.js` (59 checks).** It parses every screen's
    style block with **`postcss`, the same parser `postcss-loader` uses inside the real build**, so
    a pass here means what the build means rather than being a second opinion that can drift from
    it. `postcss` arrives with Nuxt's build chain; **nothing was installed and no stack deviation
    is introduced.**
    - **It cannot pass vacuously.** A broken directory walk finding nothing would otherwise report
      a clean sweep — the most dangerous false green, because it looks like proof. **Both the file
      count and the style-block count are asserted.**
    - **The proof that it bites lives IN the test file** — the exact stray-brace CSS from this
      defect must throw. Breaking the real file and restoring it would have been a one-off no
      future session could see; this runs on every commit. Same reasoning as the Logic Tables
      id check (Session 2026-07-31).
    - A block declaring a preprocessor (`lang="scss"`) is skipped rather than mis-reported. No
      screen uses one today; this keeps a future one from failing for the wrong reason.
  - **MUTATION-CHECKED IN MEMORY, WITH NO REPO WRITE AT ALL** — the file was read, the brace
    re-inserted **on the string**, and both versions parsed: control passes, mutant fails at the
    right line, and the mutation was **confirmed applied** before the verdict was believed (the
    2026-07-28 lesson). **Use this shape whenever the thing to mutate is a file that must not be
    touched.**
  - ✅ **ADVISORY DISTINCTIONS VIEWED AND APPROVED BY MIKE — "all works good".** The Session 17
    cards rebuild is confirmed on screen; that verification is **closed**.
  - ✅ **THE ADVISORY STAIRCASE TAB WAS ALSO VIEWED AND APPROVED THE SAME DAY — "staircase tab
    all good".** Session 17 rebuilt two screens and **both are now confirmed on screen**. No
    screen verification is outstanding on the Firm Manager Hub.
  - **Dev-run facts worth not re-deriving:** `pages/firm-manager.vue` **auto-signs in on
    `localhost`** as `dev-firm-001` (no login step, and that firm owns the sample overrides), and
    the tab reads `data/advisory-distinctions.json` — **67 platform rows across 14 domains**,
    Conflict the fullest at 9 — plus `data/dev-firm-distinctions.json`. **No MySQL is needed to
    see real content on this tab.**
  - ⚠ **A HANDOVER DEFECT OF MY OWN, worth the line.** The two start commands were given as one
    block with `# comments` appended; Mike pasted both into one terminal and PowerShell hung on
    `>>`. **The backend never exits, so the two commands need two terminals.** → **Give ONE bare
    command per terminal, with no trailing comment that makes it read as a single paste.**

- **✅ FIRM MANAGER HUB RESTRUCTURE + QUIZ BUILDER — MERGED TO `master` 2026-07-29 (`a526153`, PR #24).** 45 commits, 55 files, from `feat/firm-quiz-builder-ui`. The Hub becomes **Domain Support · Logic Tables · Advisory Staircase · Advisory Distinctions · Quizzes · Team Case Studies**. Verified before merging in a **detached throwaway worktree** (neither machine's tree involved): **130 suites / 1,924 tests green, lint 0 errors**; fast-forward, so no conflict was possible.
  - ⚠ **MERGED FROM A FROZEN SNAPSHOT BRANCH (`release/firm-manager-hub` @ `389d47d`), NOT from the live branch — and that distinction is the point.** A PR tracks its head **branch**, not a commit, so the first attempt (PR #23, since closed) would have **silently swept in the desktop's in-progress Domain Support PDF-extraction work** the moment it was pushed. Mike's ruling: that work must stay off `master`. Pointing the PR at a snapshot leaves `feat/firm-quiz-builder-ui` free to receive work-in-progress commits with **no automatic route to `master`**. *(Honest limit: sealed against accident, not against intent — someone could still push to the snapshot or raise a second PR deliberately.)*
  - **What was read before merging, rather than assumed:** **Logic Tables is finished and live** — Save writes a firm-only override, Reset restores the platform default, version history, and **firm-authored branch text is fenced before it reaches the AI**; overrides merge into a fresh per-request copy never written back to the shared cache (cross-firm isolation). **Domain Support is a deliberate, banner-labelled PREVIEW** — Save/Reset inert, because persisting firm text and its AI fencing land together in the next slice, *so the surface is never live before its safeguard*; only EOY is migrated to the four-column shape and other domains show an honest "not yet in this format" notice. **The removed Decision Frameworks (PDF library) tab was Mike's own 2026-07-27 decision** — the AI never read those PDFs, so no engine behaviour changed; component and routes left dormant with a P3 cleanup logged.
  - ⚠ **TRAP WORTH AN HOUR TO THE NEXT PERSON.** Verifying a branch in a fresh `git worktree` showed **2 failures in `ghostReferenceValidator.test.js`** — and they were **NOT a defect**. The master export (`Central Frameworks/search_content_*.json`) is **gitignored, and a worktree does not carry gitignored files**; without it `validateLogicTreeReferences` logs a warning and returns **no ghosts by design**, so the two tests asserting a ghost is caught fail. Copy the export in before believing any verdict. The test file is byte-identical on both branches. **A near-miss: this was one step away from being reported as a regression on someone else's clean branch.**
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
  - ✅ **Phase 4 DONE 2026-07-22 — the "add a report" recipe: [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md)** — 8 steps, a checklist, and what is deliberately NOT shared. *(Checkbox left un-ticked on the day; corrected 2026-07-23 after verifying the document on disk.)* The optional `/add-report` **skill** half of this item was NOT built — the written recipe covers the same ground manually, so this is a convenience, not a gap. Logged as its own open item below rather than leaving the phase ambiguous.
  - ✅ **DONE 2026-07-23 — P3 · DX — the `/add-a-report` skill (the last unbuilt half of Phase 4).** `.claude/skills/add-a-report/SKILL.md`, matching the established sibling shape (`add-a-domain`). **Named `add-a-report`, not the plan's `/add-report`,** for consistency with `add-a-domain` — the two are the same kind of thing and should read the same way. **It deliberately does NOT restate the 8 steps:** it points at [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md) as the single source and carries only what a document cannot — the trigger phrases, the build order (backend → outward, with the golden test written *with* the model, never after), the per-change permission discipline, and the seven traps that actually cost time (step 8's silent failure; "every model looks the same" is Mike's ruling, not the new report's choice; `error` is a flag not a message; delete the local `money()`; green tests are not evidence — mutation-verify; don't hand-roll a race guard; calc routes are anonymous *by design*). Duplicating the steps would have let doc and skill drift into two half-true instructions — the exact failure `single-source-wiring` exists to prevent. Also pins the two ownership rules a fresh session forgets: Mike owns the dev server, and component tests now work so a screen with no test has no excuse. **Report scaffolding is now complete with nothing optional outstanding.** | ✅ done 2026-07-23

- ✅ **FIXED 2026-07-21 — P3 · DX — the dev server bound to the IPv6 loopback ONLY, so `http://127.0.0.1:3000` is unreachable while `http://localhost:3000` works (or doesn't, depending on the browser). Found 2026-07-21 — cost most of an afternoon.** [`nuxt.config.js`](../nuxt.config.js) sets `server.host: 'localhost'`; on the laptop `localhost` resolves to `::1` first, so Node binds IPv6-only. Proven: `http://[::1]:3000` → 200, `http://127.0.0.1:3000` → connection refused, same server, same moment. The trap is that a checker using `localhost` gets a 200 and concludes the server is healthy while the user's browser, going to the IPv4 address, sees nothing at all — which is exactly what happened. **Two separable things:** (a) **process rule, already binding:** whoever verifies a server is reachable must test the *exact address the user's browser uses*, not just `localhost`; and Claude does not start or restart Mike's dev server (recorded in the session memory). (b) **FIXED:** [`nuxt.config.js`](../nuxt.config.js) `server.host` is now `'127.0.0.1'`, with the reasoning in a comment so it cannot silently revert. The process rule is written into [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md) → *The running application — who owns it*: the human owns the dev server, an AI never starts or restarts it, never builds against a running one, and "reachable" means tested at the address the user's browser actually uses.
  - ✅ **BACKEND TWIN FIXED 2026-07-24 (laptop, session B) — commit `6e11daa`.** Same bug, other end: `server/restify-server.js` called `server.listen(PORT)` with NO host, so on Windows Node bound `::` (IPv6-only); the five Nuxt server-middleware proxies target `localhost:4000`, and whenever `localhost` resolved to IPv4 the proxy hit `ECONNREFUSED 127.0.0.1:4000` (surfaced this session while restarting the backend to pick up the stress-margin maths). Fixed IPv4 end-to-end to match the frontend: backend now `server.listen(PORT, HOST, …)` with `HOST = process.env.BACKEND_HOST || '127.0.0.1'` (env override for cross-host deploys, reasoning in a comment); the five proxies (`advisor`/`apiProxy`/`course`/`report`/`translate`) default target `localhost:4000` → `127.0.0.1:4000` (the sanctioned `API_BASE_URL` override untouched). **Proven** on a throwaway instance reachable at `127.0.0.1`, suite **1,724 green**, lint 0 errors. Also surfaced: an orphaned backend can silently keep serving stale code AND block a restart with `EADDRINUSE` — diagnose with `Get-NetTCPConnection -LocalPort 4000`, kill the PID, then `npm run backend` (the human runs it, never the AI).

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
- ☑ **CLOSED BY DELETION 2026-07-29 (Mike's ruling) — Team Dashboard mock removed entirely.** Was: `FirmDashboard.vue`'s `loadData` returned mock "Sarah Chen / James Park" advisors + a placeholder "AI insight" that was string concatenation, not AI. Deferred as a known dev stub on 2026-07-10; the real team view now exists as a Firm Manager Hub tab reading `/api/activity/team`, so the mock had nothing left to become. **Deleted with its whole cluster** — the component, the Course Builder "Team Dashboard" button and its `openFirmDashboard` emit, the `firm` panel mode in `VirtualAdvisor.vue`, the now-dead `isFirmManager` prop on `CourseBuilder.vue`, and `server/routes/firm.js` with its two route registrations. Those routes' ONLY caller was commented-out code inside the mock itself, and they proposed a three-table schema (`advisors`/`courses`/`course_sessions`) that was never built. Leaving them would have recreated the dormant-code problem already logged for `FirmDocuments`.
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
| CB-35 | P2 | BUILD/DECISION | **Time-aware courses — per-template review time + video length, fit to advisor's target** (Mike's idea, 2026-07-21). Show estimated review time and video length per template; when a course suggests several, sum them and select a set matching the advisor's chosen total time. **⚠ THE BLOCKER WAS NEVER REAL — CORRECTED 2026-08-03.** This row said *"no duration fields exist in the export today (checked 2026-07-21: the `cpd` object holds zero-valued completion counters `watchedVideo`/`reviewTemplate`, not lengths); new per-template review-minutes + video-length fields must be authored/calculated upstream and exported first."* **That is wrong.** They are **minute allowances**, and `reheasedTemplate` (misspelled in the export) is a third. Measured against the live export 2026-08-03: **93 of the 106 visible templates carry real times, ~98 hours across the library**; the CPD record shipped 2026-07-29 values a *regulated* claim from these same three fields, and `videoInjector` has read `cpd.watchedVideo` as minutes since June. The idea sat blocked for two weeks on a claim that was checked and still wrong — the same shape as the four stale flags found 2026-08-02, and the reason this file's own header says **trust the code, not these flags**. **Mike's rulings 2026-08-03:** (a) *the source of the estimate* — the export's own three fields; a session's length is the **TOTAL work**, video + reading + rehearsal added together (*"17mins video … 30 mins to read … 30 mins to rehearse … 1 hour 17mins will cover just that template"*); (b) *the fit rule* — a **revenue model always counts 30 minutes**, because 85 of the library's 89 industry models are hidden and untimed and without it a session built from six of them reports as no work at all; a mismatch is **surfaced, never silently corrected**, exactly as the original row asked. **(c) precedence against the CB-26 session-count knob is resolved by construction:** the two checks are independent and both render — neither overrides the other, and a course can carry both notices. **PHASE 1 SHIPPED (`f724c76`, 2026-08-03):** new [`server/utils/courseEffort.js`](../server/utils/courseEffort.js) resolves a template's minutes by **asking `cpdCatalogue`** rather than summing a second time (one source, so a course and a CPD record can never disagree), with the 30-minute model allowance and **"unknown", never zero**, for the 13 visible untimed non-models; `requestedSessionMinutes` reads the half of the interview answer that only ever had its session COUNT read back out; the engine **overwrites** the AI's `estimatedMinutes` (the design prompt had instructed the model to echo the advisor's own number back) and logs Original → Final; the outline card and overview finally display it. `validateCourseOutline`'s 30-minute default was removed in the same change — harmless while the field was an echo, a fabrication the moment the engine began deliberately removing it. 62 new tests. **⚠ PHASE 2 IS ABANDONED — superseded the same afternoon by Mike's session-planning model.** It was to hand the AI a time budget in the design prompt and hope it complied. Two live tests killed it: the AI overshot a 15–20 minute request by 3–4× and said nothing, and measurement showed **only 10 of the 93 timed visible templates fit inside 20 minutes as a whole** (median 59 min), so "make it fit" would have pushed the AI toward the handful of short templates whatever the goal. **The replacement is better and simpler: the AI never does the arithmetic at all.** It chooses the material and the order; **code slices it** into time-boxed sessions — a session is a slice of ONE activity, and an activity may span several sessions (at activity level **148 of 242 fit inside 20 minutes**, and 77 of 83 videos). And where the material still cannot meet the request, **the app ASKS the advisor** — longer sessions or more of them — rather than deciding. Full spec, Mike's rulings verbatim, the approved question wording and the open items: **[`design/COURSE-SESSION-PLANNING.md`](COURSE-SESSION-PLANNING.md)** — this entry LINKS it and does not replace it. **"Cover less material" was proposed and REJECTED by Mike; it must not reappear as a third option.**

**⚠ THE RANGE DEFECT, found by Mike's own live test and fixed same-day (`7a119b8`).** He answered *"15 to 20 minutes per session and say four sessions please"*, drew sessions of 1h 10m / 1h 3m / 30m, and **was told nothing** — `requestedSessionMinutes` returned null for a range, switching the whole comparison off. The rule had been copied from the session-count check, where it is right ("6-8 sessions" really is indifference); for a DURATION it is backwards, and it disabled the warning on probably the commonest way to answer. Now `requestedSessionLength` returns a **budget** `{min, max}` (a single figure being the degenerate range n–n) and the ±20% latitude runs outward from each end. Confirmed live on his second test: both the length and session-count notices fired. **The lesson generalises — a rule copied from a neighbouring check needs its premise re-tested against the new subject, not just its code reused.**

**BUILT (`9391775` pure functions, then WIRED AND LIVE-TESTED 2026-08-03: `ff78abf`, `c68a5b4`, `5792402`).** `planSessions` reproduces the plan Mike approved exactly (11 sessions, 2h 53m, `[9,20,20,20,15,15,12,12,20,15,15]`); `splitEvenly` divides evenly rather than leaving a stub (60 min at 20 → 3×20; 30 min at 20 → 15+15, never 20+10). **Everything the earlier "STILL TO DO" listed is done:** the fit question is its own `pendingFit` state checked BEFORE the outline-revision flow (that flow treats any message arriving with a pending outline as "rewrite the course", so an answer routed into it would have sent the advisor's choice to the AI as an instruction — pinned by a test); the material travels with the question and answering makes **no AI call at all**; a sliced session is named `Read: E.O.Y Meeting (part 2 of 3)` with the activity words Mike used, and states its purpose in the **master export's own authored `cpd.objective`** (all 93 timed visible templates carry one) rather than anything generated; the outline card renders them, and the session prompt is told the activity and the part so the tutor teaches the twenty minutes in front of the advisor. **The two options are a DROP-TAB, not a typed answer** — this app's own rule for a choice between defined options ([`virt-advisor-system-design.md`](virt-advisor-system-design.md)); Mike said he had asked for this before and there was no written trace of it anywhere, which is a failure of the record, not of his memory.

**FIVE DEFECTS FOUND AND FIXED THE SAME DAY**, four of them by Mike in the live app:

1. **`fitOptions` offered a course that could not be built.** It divided 173 minutes by 4 and said "about 45 minutes each"; slicing at 45 gives **seven** sessions, and four is unreachable at any length (six activities, never mixed). Now every figure offered comes out of a plan that has actually been built (`planForCount`).
2. **A session COUNT given as a range was ignored.** "between four and six sessions" read as a flat six because `and` was not a separator; his course came out at four — *inside his own range* — and he was still made to choose. `requestedSessionCount` now returns a budget `{min,max}` exactly as the duration parser does. **This reverses CB-26's original "a range is not a specific request" — the same premise-check the duration parser needed a day earlier, re-tested rather than copied.**
3. **The plan search stepped in five-minute jumps and missed reachable answers.** His Dashboard material makes exactly six sessions at a **14-minute** length; the sweep went 15 → 10 and offered seven. It now tries every whole minute.
4. **The second option's wording assumed the alternative was always a shorter course.** Beside an option of four sessions it announced *"the fewest this material can be is 7 sessions"* and called seven *"as short as possible"*. The wording now follows the direction the plan actually missed in, including the honest upward answer (*"Split it as far as it will go — 13 sessions of up to 5 minutes"*).
5. **`Request changes` destroyed the advisor's course.** One click cleared `pendingOutline`; nothing could restore it, because a course is not saved until "Start this course" and the outline JSON is stripped out of the chat transcript. **Mike lost a course to it.** The card now survives until a replacement arrives, and a failed send or a reply with no course puts the old one back.

**MIKE'S RULING 2026-08-03 — the standard allowance.** *"default time allowance - video 15 mins - read template 30 - rehearse 30"*. Untimed material used to be reported and left OUT of the timetable; that looked honest and was not — his "Simple Dashboard Discussions" course lost four of five resources and came out as 1h 4m of one template. An untimed template is now taught on the allowance. Four rules keep it from passing as a measurement: an authored time always wins; a revenue model keeps its own 30-minute ruling; every allowance-built session says *"Estimated — the library publishes no time for this template"*; and **`cpdCatalogue` is untouched — a CPD record is a REGULATED claim about authored hours and an allowance must never be counted into one.** `unknown` now means only "a name matching no template at all".

**ALSO FIXED:** the course chat rendered every reply as one unbroken block — `CourseMessage` v-html's the markdown, so Bulma's minireset zeroed the paragraph margins and the advisor chat's `::v-deep` rules had never been copied across. Design and session screens both.

**ARTEFACTS (Save-the-Artefact — these entries LINK the files and do not replace them):** [`design/COURSE-SLICED-SESSION-WORDING.md`](COURSE-SLICED-SESSION-WORDING.md) (the nine decisions, both corrections, and the four allowance rules) and [`design/mockups/sliced-course-outline.html`](mockups/sliced-course-outline.html) (the screen). Earlier: [`COURSE-SESSION-LENGTH-WORDING.md`](COURSE-SESSION-LENGTH-WORDING.md) and [`COURSE-SESSION-PLANNING.md`](COURSE-SESSION-PLANNING.md). Open them beside the screen before changing any of that copy.

**⚠ THREE STRINGS MIKE HAS NOT RULED ON**, written during the build and named here rather than folded in quietly: the drop-tab placeholder **"Choose one…"**, the button **"Build my course →"**, and **"Estimated — the library publishes no time for this template."** One-line changes if he wants them different.

**✅ RULED 2026-08-03 — "session times do not include conversation with ai".** A session's minutes are the MATERIAL only (video + reading + rehearsal); the conversation with the tutor sits outside the figure. No code changed — this is what it already did — so the ruling confirms the behaviour. **Do not add a per-session conversation allowance and do not re-open it.** **STILL OPEN, not blocking:** whether a firm should be able to set the untimed-template allowance itself, rather than it being the platform's 15/30/30. | `courseEngine.js` · `courseEffort.js` · `courseSliceCopy.js` · `designInterview.js` · `CourseBuilder.vue` · `CourseMessage.vue` | ✅ **DONE + LIVE-PROVEN 2026-08-03** — suite **4,226 green / 247 suites**, lint 0 errors, pushed. **Mike ran it four times in the real app**; passes 1–2 exposed the range defect, 3–4 exposed all five defects above and confirmed the finished build. |

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

- ☐ **P3 · TEST — ~~No component-test infrastructure and no Playwright, anywhere in the repo.~~ HALF OF THIS IS NO LONGER TRUE — corrected 2026-08-02.** ⚠ **FOURTH stale flag in three days**, after the three found on 2026-08-02 (`hook-tests-worktree-not-commit`, the `leaseVsBuyModel` silent default, the tutorial-video sentence). Same shape every time: **a record describing finished work as outstanding.** Measured, not assumed: **`@vue/test-utils` 1.3.6 is installed**, `tests/helpers/mountComponent.js` is a shared mount helper wiring real Buefy plus a key-returning `$t` stand-in, and **39 `*.component.test.js` files** exist. The component half is not only built, it is in routine use — today's CPD statement work added 15 component tests to it. **What REMAINS open is the Playwright half only:** no browser-journey harness exists, so the critical paths (advisor intake end-to-end, case save/review) are still unexercised, and no test in this repo can see a rendered layout — which is exactly the gap the CPD and certificate print work has just had to declare by hand. **Rescope accordingly: this is a Playwright task, not a component-testing task.** *Original wording follows for the record:* The Constitution names `@vue/test-utils` v1 (mixins/components ≥80%) and **Playwright for critical journeys**; neither has ever been set up — `tests/` is unit-only. Consequence (honest, measured 2026-07-14): all Vue-layer glue is untested repo-wide (today's client-knowledge-base work followed house practice — logic extracted into tested pure functions, thin Vue handlers untested like every other component). The new intake journey (client step → session → save → catch-up card) is exactly the critical path Playwright exists for. Needs: (a) decide + set up the harness(es), (b) first journeys: advisor intake end-to-end, case save/review. *Source:* testing-standards audit vs CLAUDE.md, 2026-07-14 (client-knowledge-base branch).

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

- <a id="undeclared-dotenv"></a>✅ **STACK DEVIATION CLOSED 2026-07-30 (Mike-approved) — `dotenv` is now declared, pinned exactly at `8.6.0` in `dependencies`.** The version already installed and proven working, so this is a declaration, **not a version bump** — and `8.6.0` declares `node >= 10`, in range for the locked 14.15. **Nothing behaves differently today;** what changed is that the backend's access to the OpenAI key, the JWT secret and the CA path no longer rides on a coincidence in the *frontend's* dependency tree. **Traced before it was fixed:** the only `require` is [`restify-server.js`](../server/restify-server.js) L50, and the package was on disk solely because **`@nuxt/config`** — a frontend build package — wants `dotenv@^8.2.0`. Had that shifted, the guarded require would have failed, the server would still have **booted**, printed one quiet NOTE, and then run with no API key at all: the exact renders-as-working failure this feature spent 2026-07-29 removing from the read path. **Method, recorded because it is the safe recipe for any future declaration:** npm 10 (from the Node 20 install) with `--package-lock-only --lockfile-version 2 --legacy-peer-deps`, so **`node_modules` is never touched** and a working dev environment cannot be damaged; lockfile backed up first and the diff proven **purely additive** — 0 packages removed, 0 added, no dependency version altered, lockfileVersion still 2, `overrides` and `engines` intact. Suite 2,340 / 144 green afterwards. *(npm also wrote the project's own `"version": "0.6.0"` into the lockfile, which the older file had omitted — not a dependency, and it would return on any future install, so it was left.)* *Original entry follows for the record:* ☐ **`dotenv` is used but not declared in `package.json`.** Logged 2026-07-29 under the binding deviation rule. The Restify entry point now calls `require('dotenv').config()` ([`restify-server.js`](../server/restify-server.js)), and three committed scripts already document `node -r dotenv/config` (`scenario-lab.js`, `discover-lab.js`, `domain-detection-check.js`). **`dotenv` is not a declared dependency** — it exists at `8.6.0` only because Nuxt pulls it in transitively, so an unrelated dependency change could remove it with a confusing failure.
  - **Not load-bearing, deliberately.** The require is wrapped in try/catch: without dotenv the server still boots and uses the process environment as-is, which is exactly what a real deployment supplies. So this is a hygiene defect, not an outage risk — which is why it is logged rather than rushed.
  - **Why it was not fixed on the spot:** `npm install` rewrites `node_modules` beneath a running Nuxt dev server. Same family as the "never `nuxt build` while the dev server runs" rule, and worse. **Do this with both servers stopped.**
  - **Procedure when the window comes** (the laptop's ONLY safe install path — npm 6 must never be used, it rewrites the v2 lockfile to v1 and ignores the stack-reconciliation `overrides`): back up `package.json` + `package-lock.json`, then with npm 10 on Node 20 and `NODE_EXTRA_CA_CERTS` pointing at the Windows root bundle (Avast intercepts TLS), run `npm install --save-exact --lockfile-version 2 --legacy-peer-deps dotenv@8.6.0`. **Verify the lockfile diff is purely additive** — 0 removed, 0 version changes, `lockfileVersion` still 2, `overrides` and `engines` intact — and restore the backup if not. Pin 8.6.0: it is what is already installed, so the tree should not move at all.

- <a id="dev-toolchain"></a>☐ **STACK DRIFT (dev toolchain) — flip `engine-strict` back to `true`.** The app **runtime is Node-14.15-clean** (backend + frontend install with zero engine warnings; full suite passes on 14.15); the only mismatches are dev/build tools. **Done already (archive context):** the four hard pins (`eslint 7.32.0`, `@nuxtjs/eslint-config 6.0.1`, `concurrently 7.6.0`, `cross-env 7.0.3`) + `cssnano 4.1.11` (postcss-7 line; the head-team's "5.x" is SUPERSEDED — confirmed by the master coding team 2026-06-23, Option 1) were applied and installed clean (lint 0, 319 tests, `nuxt build` green). **REMAINING:** the installed tree has **exactly two** Node-engine mismatches, both transitive over-declarers — `consola@3.4.2` (wants 14.18+) and `node-releases@2.0.47` (wants 18+). Add 2 `overrides` (`consola`→2.x, `node-releases`→older) + **one more install to verify**, then **flip `engine-strict` → `true`** in `.npmrc`. ⚠ Risk: downgrading `consola` major (v3→v2) may break whichever build tool pulls it — own task, own install window. ⚠ **Reinstall is overnight-only on this machine** (Avast cert + npm 8 per the install command in the archive). **Do NOT flip `engine-strict` to `true` until verified** — it will hard-fail the install otherwise. *Source:* engine scan 2026-06-12; pin list 2026-06-16; install 2026-06-16.
