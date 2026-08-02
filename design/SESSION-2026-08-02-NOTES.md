# Session Notes — 2026-08-02 · Desktop (the day a measurement was nearly reported wrong)

> **Nothing is unsaved.** Branch `feat/firm-quiz-builder-ui` = `origin`, **3 ahead / 0 behind
> `master`**, working tree clean. Suite **3,652 green / 221 suites**, lint 0 errors, audit gate PASS.
>
> **PR [#29](https://github.com/advisor-e/Virt-Advisor/pull/29) merged the desktop's 25 commits to
> `master`** (`9661b0b`), cut as the frozen snapshot `release/firm-quiz-builder-2026-08-02`. The
> trigger workbench, Domain Support and Logic Tables Slice A are all in `master` now.
>
> **🔴 LAPTOP: merge `origin/master` before starting.** It now carries the desktop's work.

---

## The one thing to carry out of today

**A cheap measurement nearly cancelled a feature.**

The question on the table was whether the firm-editable levers move template selection enough to
justify building a Decision Logic page at all. Measured with the AI layer **off** — because the
repo's own notes framed a live AI run as an avoidable cost — the answer looked like **16%** of cases
and **4.9%** of the winning score. On those numbers the honest recommendation would have been that
the page barely justifies the work.

Measured properly, with the live AI layer on: **59%** and **37.5%**.

Wrong by nearly four times, and wrong in the direction that makes the firm's own editing work look
worthless. The cause is structural: Advisory Distinctions are **AI-judged**, so an AI-off run
measures the single largest editable lever as exactly zero.

Mike's ruling, and it is now in `CLAUDE.md`-adjacent form in `ACTIONS.md`:

> *"I have NEVER said to save a few bucks on tokens and avoid live AI — if live AI testing is
> required for best practice, do it without asking — always."*

He had never set that constraint. It had accreted into **four** places in the repo as though it were
policy, two of which advertised the AI-off run as the recommended one (`scenario-lab.js` and
`quiz-lab.js` both headed *"RUN (deterministic, free)"*). All four corrected in `22934aa`.

---

## What happened today

**`/startup` clean.** 26 ahead / 0 behind. The other machine's branch was checked by hand, because
the [`startup-blind-to-other-machine`](ACTIONS.md#startup-blind-to-other-machine) P1 is still unbuilt —
`feat/advisor-progress` was 0 ahead, so nothing was hiding.

**The workbench placement question turned out to be the wrong question.** Mike's answer to "where
should it go" was that the workbench was built *instead of* what he asked for: a read-only page
showing all the mechanics and pathways that decide a template. Finding the record proved him right —
the only written trace of the request is a **one-line paraphrase**, and commit `754d204` already
called it "the workbench Mike asked for". **The narrowing happened before any code was written, and
every gate still passed, because the gates check the code against the note and the note was already
wrong.** Logged as [`request-compressed-to-one-line`](ACTIONS.md#request-compressed-to-one-line).

**The DECISION LOGIC page was designed and ruled** —
[`decision-logic-page`](ACTIONS.md#decision-logic-page) has the full record. Headlines: **Plan B**
(only the deliberately-editable blocks, never the algorithm as a whole — the growth stages, the 3
engagement types, the Advisory Staircase and the question order stay hidden); **grouped by what each
lever changes**, because the five editable blocks do three different jobs and a flat list would teach
something false about two of them; **the firm's own live configuration, always** (*"of course it
needs to be accurate for them — always"*); the hidden remainder shown as an unnamed total that still
carries its number; and a **fail-closed allowlist** so a future scoring rule cannot leak the IP by
being forgotten.

**A find worth having: the engine already explains itself.**
[`templateResolver.js`](../server/utils/templateResolver.js) L567 returns `matchReasons` per template
with the real numbers — `distinction:+5`, `tree_hint:+3`, `penalty:*` — computed on **every** session
since it was written, and thrown away. That is the raw material for the page.

**Two harness faults were caught before either became a "finding".** The first measurement copied
`scenario-lab.js`, which builds its case state directly and never passes `treeHintNames`, so the
logic-table lever read **0%** — an artifact, not a result. The second ran with the AI layer nominally
on while every call failed, so distinctions read **0/51**. Both were caught by an explicit rule in the
harness: **a layer producing no effect at all is a probable harness fault, not a measurement.** Worth
keeping — `classifyDistinctions` swallows its own errors and returns `{}`, so the run *completed
successfully* with everything measuring zero.

**The TLS blocker, fixed and documented (`152c1bb`).** Live OpenAI calls failed
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` in **~20 ms** — fast enough to read as a network outage, which is
how it was first misdiagnosed. Cause: `api.openai.com` is re-signed by **Avast Web/Mail Shield Root**,
and the committed `certs/digicert-bundle.pem` is DigiCert roots only. **The recipe documented in this
repo cannot work on this machine.** Fixed for the run by exporting the Avast root from Windows' own
trust store to a file *outside* the repo; TLS verification was never disabled. The correct recipe now
lives in [`HANDOFF.md`](HANDOFF.md). Stated narrowly on purpose: that bundle **does** satisfy the npm
registry chain — the audit gate passes with it — so "the bundle is broken" would misdirect the next
reader.

---

## What is NOT done

**The trigger workbench has still never been seen by anyone.** It is in `master`, at the bottom of the
Logic Tables tab (Firm Manager → Logic Tables, both with no table selected and with one open). This
was the first task of today's session and it did not happen, because the session went where Mike's
questions led. **It is the first task of the next one** — what he makes of it shapes how the "test a
change" section of the new page should behave.

**The Decision Logic page has no spec document and no code.** Every decision it needs is ruled and
recorded; nothing is built.

**Read `6b9d4d2` before writing that spec.** It came in with PR #29 and changed what the routing
report claims to cover — and that report is the page's raw material.

---

## Process notes, recorded rather than buried

- **The Edit tool failed with `EUNKNOWN: fsync` on every write to the E: drive**, repeatedly, on files
  from 1 KB to 452 KB. `touch` worked, so the files were writable. Everything today was applied via a
  node script doing a verified literal replacement — refusing unless the old text matched **exactly
  once**, and normalising the patch to the target's line endings (repo files are CRLF). Slower, but it
  cannot half-apply, and it caught nothing wrong. Worth knowing on the next session on this machine.
- **A bash quoting trap:** a first attempt at editing `MEMORY.md` inline let bash interpret the
  backticks in the replacement text as command substitution, silently stripping every commit hash from
  the new content. Corrected by moving the text into a script file. Never put backticked content
  through `node -e` inside double quotes.
- **No dev server was started today** — no screen work was done, so none was needed. Nothing was left
  running by this session.
- Two memory files were written outside the repo (the live-AI ruling and the Avast TLS recipe), and
  `MEMORY.md` was compacted after a hook flagged it over its size limit. Every entry was kept; only
  over-long hooks were shortened.

---

# Part 2 — same day, evening (the session that built the wrong thing twice, then the right one)

> **Nothing is unsaved.** Branch `feat/firm-quiz-builder-ui` = `origin`, **8 ahead / 0 behind
> `master`**, working tree clean. Suite **3,965 green / 237 suites** after merging the 75 commits
> that landed with PR #30 (the Business Performance Report programme) — clean merge, no conflicts.
>
> **🔴 TOMORROW'S FIRST TASK is written up in full:**
> [`ACTIONS.md#logic-lab-decision-logic-build`](ACTIONS.md#logic-lab-decision-logic-build).
> **The spec is a file, not a paragraph:** `design/mockups/decision-logic-map-mockup.html`.
> Open it before writing any code.

## What to do tomorrow, in order

1. **Open the mockup.** It is interactive — its diagnostic calls the live probe route. Serve it with
   `npm run serve`, then `http://localhost:3000/decision-logic-map-mockup.html` (a copy lives in
   `static/`; `design/mockups/` is the master).
2. **Build the one missing route:** a template's `matchReasons`. The engine already computes them on
   every session — `advisorEngine.js` L2867, stored in `_decisionTrace.templateScores` with
   `_scoreGap` alongside — and nothing exposes them. Everything else the page needs is reachable.
3. **Build the page into Firm Manager Hub as the tab named "Logic-Lab".** The old tab of that name is
   already gone (this session); the name is being reused.
4. **When it is done, put the mockup beside the build and name every difference.** That is now a
   binding rule, not a nicety — see below.

## The three things this session actually established

**1. Mike's original request was never built, and the record shows why.** He asked for a map of what
makes the biggest difference across the editable blocks — which lever to edit for a better outcome.
What got built over two days was a phrase-testing workbench. The request had been compressed into a
one-line paraphrase and the build delivered against the paraphrase. Logged already as
`#request-compressed-to-one-line`; this session is the correction.

**2. A rule now exists so an approved design cannot evaporate.** `CLAUDE.md` → **"Save the Artefact —
approval is never given from chat alone."** Anything shown for approval is a committed file first;
`ACTIONS` and commits **link** it and never summarise it. It exists because the 2026-08-01 mockup was
approved in chat, never saved, and the build drifted from it with every gate passing — the gates
compare code to the note, and the note was already a paraphrase.

**3. The phrase-testing tool was measured and found to give a FALSE answer.** Mike deleted six real
trigger phrases (39 → 33) and it reported *0 gained, 0 lost, 470 unchanged*. Its corpus is 419 branch
conditions and 51 lab cases — instructions to the AI and test fixtures, not advisor speech. Removed
from the hub, **kept in the repo**, fully documented at
[`ACTIONS.md#logic-lab-phrase-testing-parked`](ACTIONS.md#logic-lab-phrase-testing-parked).

## What was built and kept

- **The sentence probe now measures Advisory Distinctions for real** — one gpt-4o-mini call through
  the engine's own classifier, verified live (`status=ok latency=2044ms`, matching "Poor decision
  quality"). It had been excused as too expensive; for one sentence it is one call. This is the half
  Mike found useful and it becomes section 4 of the new page.
- **`npm run serve`** — clears both ports, builds, runs both halves. **The default for any testing
  session.** The Nuxt *dev* server died five times today (twice OOM at a 12 GB heap, once a native
  crash, twice wedged while still reporting "listening"). Production build: same app, 80 MB, stays up.
  `npm run go` is the dev-mode equivalent for when code is actually changing.

## Traps found today, worth not rediscovering

- **A wedged Nuxt dev server reads exactly like broken code.** It keeps its port, reports "listening",
  and answers nothing — API calls *and* page loads. A Logic-Lab test was misdiagnosed as hung until
  the process was found at 8.64 GB. **Check the frontend's memory, and whether the request reached the
  backend at all, before debugging any "it's hung" report.**
- **`NoDefaultCurrentDirectoryInExePath=1`** is set on this machine: npm scripts cannot call a `.bat`
  by bare name. `dev:clean` still carries this fault — untouched, because it was not asked for.
- **The backend DOES load `.env`** (dotenv, since `a91122f`). `HANDOFF.md` still says otherwise and
  that stale line cost time today. `NODE_EXTRA_CA_CERTS` is the exception — Node reads it before any
  JS runs, so putting it in `.env` does nothing. Avast injects a working value itself.
- **Mike's IDE does not open relative markdown links** — they go to a web search. Give him a URL.

---

# ⬆ Desktop above · ⬇ Laptop below — both divisions worked 2026-08-02

Both machines wrote session notes for this date and each created a file of this name.
They are different sessions, not two drafts of one: the desktop ran the Logic-Lab
correction and the Decision Logic design; the laptop ran Session 24, the rescue of the
stranded report programme. Merged into one file on 2026-08-02 when the two branches were
aligned. Nothing was cut from either.

# Session Notes — 2026-08-02 · Laptop, Session 24 (the stranded programme comes home)

> **Nothing is unsaved.** `feat/advisor-progress` = `origin` at `dfff97e`, **9 ahead / 0
> behind `master`**, working tree clean. Suite **3,968 green / 238 suites**, lint 0 errors,
> audit gate PASS.
>
> **✅ [PR #30](https://github.com/advisor-e/Virt-Advisor/pull/30) MERGED to `master`
> (`02c22ca`) later the same day, on Mike's explicit instruction, and merged back into this
> branch (`dfff97e`).** It brought ~80 files including **`ReportShell.vue` and
> `REPORT-LAYOUT-REFERENCE.html`** — which change what "a model screen looks right" *means*.
> **Anything built in the Model Library from now on must read that skeleton**; before today
> it did not exist in the shared code at all.
>
> **🔴 DESKTOP: your `feat/firm-quiz-builder-ui` went from 0 behind to 75 BEHIND `master`
> the moment #30 landed**, with 4 unmerged commits of its own. **Merge `master` in before
> touching anything.** It is also a live instance of
> [`startup-blind-to-other-machine`](ACTIONS.md#startup-blind-to-other-machine): the branch
> read green right up to the moment the ground moved under it.

---

## The one thing the desktop most needs to know

**Three finished features had been sitting outside `master` for two weeks, and the reason
nobody noticed is the reason we keep not noticing.**

Cost of Capital (WACC), Lease vs Buy and the Loan Estimator were **built, tested and
finished** on `feat/business-performance-report`, last touched 2026-07-29. So was
`components/base/ReportShell.vue` — the single source of the model visual standard — and
`design/REPORT-LAYOUT-REFERENCE.html`.

That last file is the point. **The project's binding rule is that every model copies that
layout skeleton, and the skeleton has never existed in the shared code.** Any model built
from `master` alone was working to a standard it could not read.

Mike, told what was there: *"yes, cost of capital is definately supposed to be there —
bring it back."*

It is now merged onto current `master` and raised as PR #30 from a frozen snapshot
(`release/report-programme-2026-08-02` @ `033657d`), never from the live branch — the
PR #23 → #24 lesson.

---

## Three collisions in one merge, and what they have in common

Every one was a rule written on `master` meeting files written on the stale branch. Every
one was **green on both branches alone** and failed only once merged. This is
[`cross-branch-rule-collision`](ACTIONS.md#cross-branch-rule-collision), and it now has
four instances.

**The cost scales with separation.** Two weeks apart produced three collisions. The
2026-08-01 merge, two days apart, produced one.

1. **The routing map** lost count of the Loan Estimator's two data files. `npm run routing`.

2. **The CSS style-block guard — and this one was the guard's fault, not the code's.**
   `ReportShell.vue` **quotes** `` `<style scoped>` `` inside its own documentation; it is
   the component whose entire purpose is to stop each screen hand-writing one. The
   extractor's unanchored `/<style…>/` matched **that sentence**, then ran on to the real
   `</style>` 98 lines below, so postcss was handed a paragraph of English
   (`Unknown word` at 1:1).

   **The real stylesheet was never parsed at all.** That is the worse half: a false failure
   on a healthy file, concealing a genuine blind spot. Both tags are now anchored to the
   start of a line. **Verified it does not blind the guard** — across all 82 `.vue` files
   both versions find blocks in the same 60 files, disagreeing on exactly the one intended.

3. **`server/report/` fell ONE branch under its 85% coverage gate** (790/930 = 84.94%) when
   three models joined the folder. **Closed with tests, not by moving the gate** — lowering
   a threshold to fit the code is the "ratify the drift" move this project does not make,
   and it would have been over a single branch. Six tests on guards that existed and had
   never run: a number arriving as **text**, as **NaN/Infinity**, a **zero servicing
   interval**, a **zero-month loan**, and **0% finance**.

---

## The mistake worth more than the merge

**A half-staged commit passed lint, 3,955 tests and the audit gate, and shipped red.**

`CONTENT-ROUTING.md` and `componentStyles.test.js` were already staged **by the merge**
(as files arriving from `master`). Both were then edited to fix the failures above, and
only a third file was `git add`-ed. Commit `741eb5c` therefore contained the **old regex
and the stale routing map** while every gate reported green.

**`.husky/pre-commit` validates the WORKING TREE, not what is being committed.** Every gate
was honest; none of them was testing the commit.

This is the same defect as the CSS guard found the same hour, and as the 2026-07-31
`nuxt build` failure that "shipped green": **a check pointed one inch to the left of the
artefact.** Caught by diffing the committed blob against the working tree; fixed by
amending to `033657d` (nothing had been pushed).

Logged as [`hook-tests-worktree-not-commit`](ACTIONS.md#hook-tests-worktree-not-commit),
**P1**. The proposed control — refuse a commit while a tracked file has unstaged edits — is
written up and **deliberately NOT built**; it needs its own approval.

**Until it exists the rule is manual:** after any commit that fixes a merge, diff the
**committed blob**, not the working tree.

---

## Two things waiting on a Mike ruling

1. **A silent-default defect in `leaseVsBuyModel.js`.** A numeric field that is **absent**
   is named in `defaultedInputs` (the R8 ruling). A field **present but unusable** —
   `deposit: 'eight thousand'` — is silently replaced by the sample and named **nowhere**,
   so the caller is told the figure is theirs when it is ours. The model sits behind a
   public route taking raw browser JSON. **Pinned as a `⚠ CURRENT BEHAVIOUR` test so a fix
   fails that test rather than passing quietly. Found, reported, not fixed.**

2. **The pre-commit control above.**

---

## Corrected on sight

The `stranded-report-programme` entry listed `components/FirmDashboard.vue`,
`server/routes/firm.js` and `scripts/sync-video-minutes.js` as work to rescue. **Wrong.**
`master` deleted all three **on purpose** (`d3c4e5c`, `b1b4432`); the merge honours those
deletions.

**The trap, worth carrying:** measuring absence and reading it as loss. A file missing from
`master` is either work that never arrived or work deliberately removed, and **only the
deleting commit tells you which**. Checked before committing, because a merge that silently
resurrects deleted code is worse than one that drops it.

---

## Also recorded

- **`STATUS.md` was stale by ~120 rows** — 64 outstanding / 118 completed on the page,
  97 / 208 in reality. Regenerated. This is exactly the already-logged "STATUS.md goes stale
  silently and nothing on the page says so".
- **No `--no-verify` was used at any point**, including on the merge commit. (Contrast
  2026-08-01, where it was used once unasked.)
- `feat/business-performance-report` is **186 ahead of its own remote and unpushed**. Its
  tip `033657d` is byte-identical to the pushed snapshot, so **nothing is at risk** — only
  the branch name is not backed up.

---

## Where the work stopped

Nothing is half-finished. The session ends on a clean tree with everything pushed.

~~1. Mike reviews and merges PR #30. 2. Then `feat/advisor-progress` merges `master` back
in — expect the same `ACTIONS.md` conflict.~~ **✅ BOTH DONE the same day.** Mike instructed
the merge; `master` = `02c22ca`, back-merged here as `dfff97e`, pushed. **The predicted
`ACTIONS.md` conflict did NOT recur** — both sides had already been reconciled inside #30,
so git had nothing left to disagree about. Worth knowing: the append-vs-append conflict is
paid **once per divergence**, not once per merge.

**Next, in order of consequence:**

1. **The desktop merges `master`** into `feat/firm-quiz-builder-ui` (75 behind) before any
   further work there.
2. **The two rulings above** — the silent default in `leaseVsBuyModel`, and the pre-commit
   control.
3. Then the open backlog: the trigger-vocabulary P1, and building
   [`startup-blind-to-other-machine`](ACTIONS.md#startup-blind-to-other-machine) — which
   this session gave a third worked example of.
