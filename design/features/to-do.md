# The To-Do List

> **This is the whole live list. If it is not here, nobody is doing it.**
> Finished and deliberately-parked work is on
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md) — kept so nothing is forgotten, moved so
> nothing is buried.
>
> **Last verified against the code: 2026-08-13.** Items marked ✅**verified** were checked against
> the actual code or git history on that date. Items marked ⚠**unverified** came from the backlog
> and have not been re-checked — treat them as claims, not facts.

---

## 0. Release position — read before picking anything up

🔴 **Ruled by Mike, 2026-08-14. Getting another release to the master coding team is the
priority.** In his words: *"I want all key functionality and key pages in position so we can load
into UAT and get initial thoughts sorted — details like this domain word sweep can be done in
early production beta stage."*

**So judge every candidate task by one question: does this get a release out?**

- **Key functionality and key pages in position** — that is the bar. Not polished, not complete.
- **Finer detail is explicitly deferred to early production beta.** The domain-support word sweep
  (§4.6) is the named example. Do not let that class of work hold a release.
- **This SUPERSEDES the ruling of 2026-08-11** — *"no PR to `master` until the task list is
  clear"*. That position is withdrawn. A PR to `master` is now on the table rather than
  deliberately held back, and there are **20 commits ahead of `master`** already waiting.

⚠ **Why this block exists at all, and why nothing like it goes in a session note again.** The
2026-08-11 ruling it replaces lived *only* in session notes, hand-copied forward into five of them
(`SESSION-2026-08-11-C`, `-08-12-B`, `-08-12-C`, `-08-12-D`, `-08-12-E`) and never once written
into this list or `ACTIONS.md`. Every session faithfully carried it and no session promoted it, so
a standing instruction about *when we release* sat in a dated file for four days. Those five copies
are now stale — **this block is the current position and they are not.** It is the same fault the
Working Agreement names in its own checklist: a rule left in a session note is a rule nobody will
find. **A ruling that changes what we work on belongs here, on the day it is given.**

---

## 1. Why this list exists

**`ACTIONS.md` is 6,135 lines long, and it reads as about seventy open tasks. The real number is
closer to ten.**

That is not a filing problem, it is a decision-making problem. When the list looks like seventy
things, nobody can hold it in their head, so nobody triages it — and the genuinely urgent item
sits in the same visual weight as a note about JSDoc. It has already gone wrong in a measurable
way: on one occasion the app's "top open defect" was reported from that file **three days after
it had been fixed**.

There is a second failure the backlog does not catch at all. A hazard written as a warning is not
a task. One fault was described in five separate places, every time as something to be careful
about, and **not once as something to fix**. It survived for weeks because the record kept
warning about it and nothing owned it.

**So this list has rules:**

- **Every item says who it is waiting for** — you, us, or somebody outside this project.
- **Every item says how it was verified**, or admits it wasn't.
- **A warning is not an item.** If it belongs here, it is written as something someone does.
- **Finished work moves**, it does not accumulate. The second page keeps the record.

---

## 2. Waiting on you — nothing happens until you rule

*Ten items. None of them need code first; all of them block code.*

**2.1 · Send the master team the release number.** ✅**verified** — `v0.8.0` is tagged and pushed,
and nobody outside has been told. They cannot pull what they do not know exists; v0.6.0 was never
pulled at all. Three lines: pull the **tag** `v0.8.0`, **no `npm install` this time**, read the
notes first.

**2.2 · The four missing hub tabs.** ✅**verified against `TAB_TIERS`** — the approved mockup says
the Mentor hub should gain *Team Progress* and *Team Case Studies*, and the Firm hub *Case
Reviews* and *Logic-Lab Report*. The code deliberately excludes all four and says so in a
comment. **It is +2 and +2, not the "+3" carried through eight sets of notes.** Nothing is
broken — the tabs are absent, not faulty.

**2.3 · Seminar's seven lines** — reword toward Public Speaking. ⚠ carried since session 48.

**2.4 · The Management Reporting annual plan name** — "Mgt Annual Plan" or "Annual Board Plan".
⚠ carried.

**2.5 · The five roll-up labels.** ⚠ carried since session 45.

**2.6 · `advisor_note` — decide what it is.** ⚠ carried since session 45.

**2.7 · Should the per-question quiz record store the advisor's own written answer?** The
recommendation on file is **no free text** — advisors write differently once they believe a
manager reads their words, which degrades the very signal the record exists to collect. Text can
be added later; it cannot be un-stored. **Not to be built either way without your answer.**

**2.8 · How should `STATUS.md` stop going stale silently?** ✅**verified** — regenerating it once
moved the counts by ten items and its links were pointing about 260 lines off target. **A wrong
link is worse than no link.** Three options: regenerate it automatically whenever the backlog is
committed; add a test that fails when it is out of date; or stamp it with the version it was
generated from so a reader can see it is stale. Recommendation: the first.

**2.9 · The education-gate wording.** The behaviour is already ruled — on low client literacy the
advisor gets a prompt asking whether to apply education-first or see what is technically needed,
with the reasoning shown either way. **The on-screen words need confirming before it is coded.**

**2.10 · 🔴 Rule on Net Promoter Score in the Client Survey, then we act on your answer.** New
2026-08-14. ✅**verified — "detractor", "promoters" and "net promoter" return zero matches across
all 113 firm documents.** `people-power-client-survey` step 4 teaches NPS in full: the 0-10
recommendation question, the 9-10 / 7-8 / 0-6 banding, and the promoters-less-detractors
calculation. Steps 5-7 are in the same position — your source gives four steps, the app gives
eight.

**This is not the marking question and must not be answered with a mark.** A rationale clause
explains a step you own; this is a *method* you do not. It is good practice and may well be
wanted — but as it stands it reads as your firm's own method.

**Your answer becomes one of three specific actions, and one of them happens either way:**

- **"Keep it as ours"** → mark steps 4-7 as authored commentary in the same batch as §4.6c.
- **"Keep it as the firm's"** → you supply or point at the source, and we record it beside the row.
- **"Remove it"** → steps 4-7 are cut back to the four steps the source gives.

*(Waits on Mike. Recorded in full at
[`../DOMAIN-SUPPORT-SWEEP-PROGRESS.md`](../DOMAIN-SUPPORT-SWEEP-PROGRESS.md) §6.1.)*

---

## 3. Waiting on somebody else — not ours to finish

*Five items. Every one of them is why something else looks half-built.*

**3.1 · 🔴 Provision MySQL.** ✅**verified** — the credentials are still placeholders and no row
has ever been written anywhere. **This is the single biggest blocker in the project.** Advisor
progress, case studies, every firm-editable setting, courses and the whole people layer all run
on development files or in memory. Nothing in any of them has ever been proven against a real
database. Two real course sessions were completed in the running app and both writes failed.

**3.2 · The middle-tier logins.** ✅**verified** — no role value produces a global group manager
or a group manager, and the mentor is still borrowing the platform-admin role. Until this lands,
those hubs cannot be demonstrated by signing in as one.

**3.3 · The firm membership data.** ✅**verified** — the firms table has no country, group or
parent column, so nothing in our data says which firms are in which group. In development the two
middle hubs show **invented firms**, and the server says so loudly at startup.

**3.4 · Ask the master team for the two role values, and which group a manager manages.** ⚠
carried since session 39.

**3.5 · Reply to Carl about `npm install`.** ⚠ carried.

---

## 4. Ready to build — approved or unblocked

**4.1 · Correct the laptop's expected branch in `/startup`.** ✅**verified** —
[`.claude/commands/startup.md`](../../.claude/commands/startup.md) still says the laptop works the
*business performance report* branch. It has been `feat/advisor-progress` since 2026-07-29. One
line. *(Waits on Mike — it was left alone rather than folded into a change he was approving.)*

**4.2 · Convert the one dead link in the Handbook.** `[../i18n-*](../)` in
[`localisation-and-currency-history.md`](localisation-and-currency-history.md) points at the
parent folder and does nothing when clicked, because the rewrite needs a character after `../`.
One character in `relink()`. Currently pinned as a ⚠ CURRENT BEHAVIOUR test so it cannot be
forgotten. *(Waits on Mike.)*

**4.3 · Point `CLAUDE.md`'s "Save the Artefact" section at the register.**
[`ARTEFACTS.md`](../ARTEFACTS.md) now exists and is guarded; the rule that failed on 2026-08-13
should name it, and should say that a missing artefact is a **stop**, not a licence to redesign.
*(Waits on Mike — it is his file.)*

**4.4 · Open the Handbook, edit a word, reload, confirm it survives.** The edit-persistence is
proven in code and has not been seen working in a browser since the restore. *(Waits on Mike.)*

**4.5 · Hardcoded English — the interface strings are DONE.** ✅**measured and fixed
2026-08-14.** The breach was of the locked stack requirement that every user-facing string goes
through the wording layer; its real cost was that the people who own the words could not change
them without a developer.

⚠ **The item's old title was wrong and cost a session's worth of assumption. The report screens
were never the problem — they are clean.** Every apparent hit on them is inside a JSDoc comment,
and `BusinessPerformanceReport.vue` already does the right thing: the backend returns the
workbook's own value (`'Cashflow Negative'`, cell J3) and the screen maps it through `$t()`.
**Measure before believing a backlog title.**

**87 interface strings moved out of `components/VirtualAdvisor.vue` into `locales/en.json`
under `advisor.*`** — buttons, prompts, placeholders, the 14 domain-dropdown labels and the
section banner. **No wording changed**; two interpolations became the wording layer's `{count}`
and `{name}` form. Guarded by two new tests in `tests/unit/i18nMessages.test.js`, which exist
because an unresolved key does **not** throw — vue-i18n renders the key itself, so a button would
read `advisor.save.confirm` and every other test would still pass.

⚠ **Not yet seen in a browser.** Proven by 5,256 passing tests and a key-resolution check, not by
use. *(Waits on Mike — worth pairing with 4.4, which is the same kind of look.)*

**4.5a · The duplicate primary-issues list — DONE, by deletion rather than by wiring.**
2026-08-14. ✅**verified.** The first plan was to wire the component to
`data/primary-issues.json`. **Checking first showed that would have been busywork on code that
cannot run**, and the honest fix was to remove it:

- The selector was **retired from intake 2026-06-10** — the engine infers the primary issue.
- **Nothing emits `[PRIMARY_ISSUE_SELECTOR:…]`** — the string existed in exactly two places in the
  repository, the component reading it and a design document. The screen was unreachable.
- So **neither copy of the list was being used by the running app.**

Removed: the card, its state, three methods, the styles and the duplicated const — about 100 lines
out of a component §5.1 already flags as too large. **The marker strip was deliberately KEPT** on
both reply paths: nothing emits it, but a model is not a compiler, and an advisor must never read
`[PRIMARY_ISSUE_SELECTOR:profit]` in the middle of a reply. **`data/primary-issues.json` was
kept** — authored Workshop 1 content, and deleting content is not the same act as deleting dead
code. Pinned by `tests/unit/retiredPrimaryIssueSelector.test.js`.

⚠ **The lesson is the one from 4.5 again, one step harder: the backlog said "de-duplicate", the
code said "this never runs".** Two items in a row have been mis-titled in a way that would have
produced real work with no effect. **Measure before believing a title.**

**4.5b · Decide whether the advisor needs a "none of these fit" escape.** New 2026-08-14.
*(Waits on Mike.)* The deleted card carried a button — *"None of these fit — let me describe it
differently"* — which cleared the detected area and asked the advisor to re-describe the problem
in their own words. **It had not been reachable since June, so nothing was lost today**, but the
capability is a good one and it is now gone rather than merely hidden.

**The question is whether an advisor can currently correct a wrong read.** If yes, this closes as
"already covered". If no, it wants a home somewhere reachable. **Do not rebuild the old card** —
that is the screen we just established should not exist.

**4.5c · Remove the orphaned `__none_of_these__` handler, or give it a caller.** New 2026-08-14.
✅**verified.** `server/advisorEngine.js:2193` still answers the `__none_of_these__` query by
clearing the domain and asking the advisor to re-describe. **Its only caller was the button
deleted in 4.5a, so it is now provably unreachable.** Left in place deliberately rather than
bundling a backend change into a frontend deletion. **It is settled by 4.5b:** if Mike wants the
escape, this handler is what the new route calls; if not, delete it. *(Waits on 4.5b.)*

**4.6 · Sweep the domains for authored commentary — READ COMPLETE, 29 of 29.** ✅**measured
2026-08-14** — the blast-radius question is answered. **The facts are clean:** all 140
marker-carrying claims in the data — every acronym expansion, counted list, quotation and named
authority — were verified present in the firm's own documents. **What was found instead** is a
layer of short authored clauses explaining *why* a step matters, appearing in none of the firm's
documents. Mike's ruling: **mark them**, do not delete them.

**(a) The marking mechanism is BUILT** — commit `90b673d`, 2026-08-14. The nine Strategy clauses are
marked, the AI is told which words were ours, and the platform can mark more by highlighting them on
the Domain Support screen. Approved from
[`../mockups/domain-support-authored-commentary.html`](../mockups/domain-support-authored-commentary.html);
the rule it now follows is [`domain-support-provenance.md`](domain-support-provenance.md) §4.1. Read
that before marking anything, and record the marks as it says.

**(b) The read is DONE — 29 of 29 domains, 194 of 194 materials, 2026-08-14.** ✅**complete.**
Full record, including the exact wording of every candidate, the method, the traps and the list of
what was cleared: [`../DOMAIN-SUPPORT-SWEEP-PROGRESS.md`](../DOMAIN-SUPPORT-SWEEP-PROGRESS.md).
**Nothing further needs reading.** Mike ruled 2026-08-14 that the whole read completes first and the
marks go in as one batch — that batch is now §4.6c below.

**The final yield is 1 confirmed clause and 49 candidates, not the 150–200 once estimated — that
figure is withdrawn.** The habit tracks the shape of the *source document*, and the last ten domains
prove it from both ends at once: raising-capital, succession, systems, org-capacity-planner,
org-leadership and fm-coach-culture's fifteen sourced rows are near-verbatim clean because their
sources are already full prose, while people-power (17 candidates), org-board-pack (7),
get-marketing (5) and org-firm-strategy (5) were written from sources that give **one descriptive
line per template**. `People Power Suppt.pdf` is the extreme case — 26 app materials built largely
from a one-sentence-each summary table.

⚠ **One thing the mechanism does not do: find them.** It is the container. Finding a clause is still
a person reading a domain beside its own source PDF. Three detectors were built and all three were
defeated by paraphrase, and a fourth measurement confirms it: the nine known marks score 25–75%
against the corpus and **61 non-marks fall in the same band**.

**4.6c · 🔴 Write the marks — one batch, the last piece of 4.6.** New 2026-08-14. *(Waits on us,
except the six in the first bullet.)* The reading is finished and the candidates are written out
verbatim in [`../DOMAIN-SUPPORT-SWEEP-PROGRESS.md`](../DOMAIN-SUPPORT-SWEEP-PROGRESS.md) §5, so
this is a decide-and-type job with no re-derivation. Four specific actions, **in this order**:

1. **Resolve the six factual claims first** (§5, the 🔴 table). These are Brief **P5** breaches — a
   claim about a named framework or a stated cause and effect is never ours to author — and they
   are a different, more serious failure from a rationale tail. **One or more may need correcting
   or removing rather than labelling, which is Mike's call, not ours.**
2. **Work the remaining 43 candidates**, marking or clearing each, adding an `authored_commentary`
   entry beside that material's `steps` in the shape at
   [`domain-support-provenance.md`](domain-support-provenance.md) §4.1. Copy each clause
   **exactly** — the guard test fails on a fragment that is missing or appears twice.
3. **Correct `"all 115 firm documents"` to 113 on the nine existing Strategy marks**, in the same
   batch. The corpus is 45 + 50 + 10 + 8 = **113 PDFs**; the only other two in the repo are the NIST
   attachment and a report source model, neither of them firm domain material. That phrase exists
   so a reader can reproduce the search, so it has to say what was actually searched.
4. **Run `npx jest tests/unit/authoredCommentary.test.js` after each domain**, not at the end, so a
   mistyped fragment is caught while that domain is still open.

⚠ **Do not fold §2.10, §4.6a or §4.6b into this batch.** Each is a different question with a
different answer, and answering any of them with a commentary mark would file a bigger problem
under a smaller one.

**4.6a · Check whether a source document exists for 21 domain-support rows.** New 2026-08-14,
**updated the same day: the measurement is now confirmed by reading, and it is one row bigger.**
21 rows match no firm document at all (under 6% word overlap with any of them), concentrated in
`people-power`, `fm-coach-culture` (5 whole materials — `advisory-pip-template`,
`group-coaching-programme`, `applicant-screening-and-competency-based-recruitment`,
`fee-estimate-and-job-creep-management`, `centre-of-influence-coi-engagement-framework`) and
`org-board-pack` (3). **`advisory-pip-template` is the added one** — it was not in the measured 20
and its content is absent from the corpus too. Two were already known from
[`../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`](../DOMAIN-SUPPORT-REVIEW-CHECKLIST.md). **Open each of the
21, find its source or establish there isn't one, and record which.** This is a *different question*
from the commentary sweep and must not be answered with a commentary mark — a row with no source is
a bigger problem than a row with an added clause. The five `sales-marketing` rows in that count are
index rows carrying no steps at all, which is the known deliberate gap, not a defect. *(Waits on us.)*

**4.6b · Two undeclared edits to the firm's own material — do they stand?** New 2026-08-14. Neither
is authored commentary, so neither belongs in `authored_commentary`; both are changes to the firm's
words with nothing recording that we made them. **(1)** `get-seminar-blank-platform-template` step 5
renumbers the source's *"Stage 2 (Call to Action & Close)"* to *"Stage 4"* — the source itself runs
1, 1, 2, 3, 2, so it is almost certainly a correction of their typo. **(2)** `forecasting-cash-tactics`
step 4 softens the source's *"If they refuse, **fire them as a client**"* to *"stop acting for them."*
**Ask Mike whether each stands, then record the answer beside the row.** *(Waits on Mike.)*

**4.7 · Flip `engine-strict` back on.** ✅**verified** — still `false`. Two transitive packages
over-declare their Node requirement and need pinning down first, then one install to verify.
⚠ **Reinstall is overnight-only on this machine**, and there is a documented safe procedure —
follow it exactly rather than running a plain `npm install`.

**4.8 · The course builder live click-through.** Never done. Build a course end to end, complete
a session and quiz, interrupt a streaming reply with Start-fresh, refresh and confirm the course
survives, reload and confirm the migration ran. **Three tracked items close only on that
session** — until then the feature is proven by tests and not by use.

**4.9 · Make the coaching reference inherit.** ✅**verified as a real gap** — its fifteen rows
already carry stable ids; it simply never joined the inheritance mechanism, and its firm side is
append-only.

**4.10 · Extend the invisible mode swap.** Ruled: it should fire in Discover mode and before a
recommendation, as well as during the client deep-dive. Needs a scenario-lab pass so the early
version cannot derail the intake questions.

**4.11 · Reconcile the two data layers.** This app uses MySQL with a file fallback; the people
layer runs in memory. Neither has a real database, which is exactly why it should be done
knowingly rather than by accident.

**4.12 · One handover story for the master team.** The merged app's own handover documents still
describe a separate standalone application.

---

## 5. Tidying — real, low value, no user impact

*Do these when something else brings you into the file, not as a project.*

**5.1 · The three large components keep growing** — the advisor screen, the course builder and
the hub are all well past the point where they would normally be split. Each is load-bearing and
needs tests in front of any split.

**5.2 · Sparse documentation comments** across the mixins and two large backend files. Already
scheduled into a planned clean-up pass, gated behind the master team's work.

**5.3 · Move the advisor profile off browser storage into the database.** Same family as the case
studies migration; waits on the same thing.

**5.4 · Teach the status table the "paused" marker.** ✅**verified as still open** — and worth a
sentence, because it is a small lesson in itself. The reason this fix was logged is that a paused
item was invisible in the generated table, and *paused work is exactly what gets forgotten*. But
the one example it exists to surface — a fake team dashboard — refers to **a screen that has
since been deleted**. The fix is still right; its evidence has expired.

**5.5 · Six building blocks could become firm-editable** — the question weights, the strategy
table, the primary-issues table, the content summaries, the coaching reference and a logic-tree
editor. A known recipe exists for each.

---

## 6. How to keep this list honest

- **When something is done, move it** to [`to-do-done-and-parked.md`](to-do-done-and-parked.md).
  Do not tick it and leave it here.
- **When a hazard is discovered, write it as a task** — something a person does — or it will not
  get done.
- **Re-verify before acting.** An item marked ⚠ is a claim from the backlog, not a fact. Three
  separate items have been found *already built* while still flagged open.
- **If this list passes about twenty live items, something is wrong** — either work is not being
  moved off it, or warnings are being filed as tasks again.
