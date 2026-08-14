# To-Do — Done & Parked

> **Read [`to-do.md`](to-do.md) first.** That page is what is live. This page is what is finished
> and what is deliberately waiting, kept so that nothing is forgotten and nothing has to be
> re-derived.
>
> **Parked is not the same as forgotten.** Every item in §2 was paused by a decision, and the
> decision is recorded with it. If somebody proposes one of them as new work, the answer is here.

---

## 1. Parked by your own ruling — these are decisions, not tasks

*Nobody should re-raise these as open work. If circumstances change, the ruling changes first.*

**Template Check queue, and the Logic Tables rewording.** Parked 2026-08-13 — sort them after
UAT testing.

**The state-management refactor.** Parked until the master app's UAT settles, then bundled with
the move off browser storage. A broad refactor under a live UAT changes the ground under the
testers for no feature gain. **The standard itself is unchanged** — this is timing only.

**The advisor-enablement distinction table.** Ruled 2026-06-22: keep the concerns separate.
Advisory Distinctions stay client-outcome only; "easier or safer for the advisor" is a separate
layer paired to Learn mode. ⚠ **Evidence is accruing that it is needed** — a live thread repeated
the exact miss it was meant to catch, recommending an advanced sales script to a low-experience,
compliance-focused advisor. Still parked, but the case is getting stronger.

**Broadening crisis detection to more advisory areas.** Build when a real session shows a missed
crisis, not preemptively.

**The primary-issue clarification.** Only a remnant remains — a clarification at recommendation
time, to be built if a real session produces a genuine fork.

**The case-study feedback loop** — real cases becoming suggested distinctions. The destination of
the whole distinctions design, deliberately out of scope for the cascade build itself.

**Splitting the course builder component**, and a percentage-display bug. Both kept in the general
tidying pile on purpose: pulling them into feature work balloons scope for little advisor-visible
gain.

**Two frameworks embedded in a prompt** could become firm-editable, or could consciously stay
locked in the prompt. Either is fine; deciding by accident is not.

---

## 2. Closed recently, with what proved it

**The master team can now be handed a release with instructions.** ✅ Closed 2026-08-14, commit
`206476a`. Four things that would each have cost them an afternoon, none of them ever on this list
because nothing was looking at *loading* the app rather than building it:

- **`HOST` and `PORT` were silently ignored.** `nuxt.config.js` set both explicitly, and Nuxt merges
  that file over the defaults its own `HOST`/`PORT` lookup produces — so a server setting
  `HOST=0.0.0.0` saw no change at all, which reads as a broken build rather than a setting that
  never applied. Both now read the variables and keep the loopback default when unset. **Proven
  live the same afternoon, by accident:** a script of mine hit `ECONNREFUSED 127.0.0.1:3000`
  against a server answering perfectly on `::1`.
- **`package.json` said `0.6.0`** through the whole of v0.7.0 and v0.8.0. Corrected, and held by
  `tests/unit/releaseVersion.test.js`, which compares it to the newest `RELEASE-NOTES-v*.md` file.
  Fixing the number alone would have expired at v0.9.0 — nothing reads that field, which is exactly
  why it drifts.
- **There was no `.env.example`.** The variables were spread across three documents and
  `OPENAI_API_KEY` — the one that stops the app dead — was in none of the tables. Now one file,
  grouped by whether UAT needs it, names only.
- **There was no load pack.** [`../UAT-LOAD-PACK.md`](../UAT-LOAD-PACK.md), linked from the README:
  pull the tag, the runtime, the environment, the schema **including the reserved `firms` rows**,
  the screen addresses (nothing in the app links to them), and how to prove the app really started.

**A rule Mike never made, removed from the four places still asserting it.** ✅ Closed 2026-08-14,
commit `7aee852`. *"The dev server belongs to Mike — never start or restart it"* was invented by an
AI session on 2026-07-21 after a bad afternoon, written into `WORKING-AGREEMENT.md`, and quoted back
at him as his own instruction. He struck it out on 2026-08-03; it survived in the report skill, the
progress handover and three places in `ACTIONS.md`, **and was quoted at him again on 2026-08-14**.
All four corrected, each keeping the original wording quoted so the trail survives. The July session
notes keep their copies deliberately — they are the record of what was believed at the time.

**The advisor screen's words can be changed without a developer.** ✅ Closed 2026-08-14 (was
§4.5), commit `bf9c7fe`. 87 interface strings moved out of `VirtualAdvisor.vue` into
`locales/en.json` under `advisor.*` — buttons, prompts, placeholders, the 14 domain-dropdown
labels, the section banner. **Not one word changed**, verified mechanically: every phrase removed
from the component appears byte-identical in the wording file. **The item's title was wrong and
believing it would have cost the session** — it named "the report screens and parts of the advisor
screen", and the report screens never had the problem. Every apparent hit on them was inside a
JSDoc comment. The whole item was one file. Held by two new tests, because an unresolved key does
not throw — vue-i18n prints the key on a button while every other test passes.

**The duplicate of the Workshop 1 primary-issues list is gone.** ✅ Closed 2026-08-14 (was §4.5a),
commit `7f69a74`. The plan was to wire the component to `data/primary-issues.json`. **Checking
first showed that would have been busywork on code that cannot run**: the selector was retired
from intake 2026-06-10, and the marker that opens it exists nowhere that emits it — so neither
copy was reachable. Removed the card, its state, three methods, the styles and the duplicated
const, about 100 lines. **The marker strip was deliberately KEPT** on both reply paths: a model is
not a compiler, and an advisor must never read `[PRIMARY_ISSUE_SELECTOR:profit]` in a reply.
**`data/primary-issues.json` was kept** — authored content, and deleting content is not the same
act as deleting dead code.

**An advisor can correct the AI's read in plain words.** ✅ Closed 2026-08-14 (was §4.5b), commit
`a168123`. The question was whether the capability survived the deletion above. **It never
depended on it** — the correction is conversational. But answering the question found a real
defect: the switch required the reply to contain the *entire* label, so *"no, it's really about
staff"* did nothing while *"you've got it wrong"* triggered a full reset. **The engine answered
annoyance and ignored a calm, specific correction**, and it failed silently — the advisor believes
they were understood and the advice stays wrong. Fixed by `resolveDomainCorrection`, deliberately
conservative because a wrong switch is worse than no switch. Eleven failing tests written first.
The rule now lives in [`virtual-advisor.md`](virtual-advisor.md) P9.

**The authored-commentary READ is complete — 29 of 29 domains, 194 of 194 materials.** ✅ Closed
2026-08-14 (was §4.6 part b — not to be confused with §4.6b), commit `5754aae`. 1 confirmed clause and 49 candidates, each written out
verbatim so the batch write is decide-and-type. **§4.6 itself stays open** — the batch write is
§4.6c and nothing further needs reading. Full record:
[`../DOMAIN-SUPPORT-SWEEP-PROGRESS.md`](../DOMAIN-SUPPORT-SWEEP-PROGRESS.md).

⚠ **The lesson running through all four: a backlog title is a claim, not a fact.** Two items in a
row were mis-titled in a way that would have produced real work with no effect. **Measure first.**

**A new feature starts as a Handbook page — and it is now one command.** ✅ Closed 2026-08-14,
part 3 of Mike's instruction and the last of the three. `npm run feature "<name>" "<group>"
"<summary>"` writes the Brief, the History and the index row from the skeleton the other pages
already use, so the page exists before the code does. It refuses to overwrite an existing page,
refuses a group [`README.md`](README.md) does not already have — a typo would otherwise invent a
navigation category that reads on screen as a real one — and refuses a name whose slug would
collide with the `-history` suffix the generator pairs by. Nothing is written until every check
passes, so a refusal never leaves half a feature on disk. Both pages it writes are stubs and say
so at the top, because a plausible-sounding Brief nobody wrote is exactly what this folder exists
to prevent.

**The reason it is a command and not a discipline:** every part of the setup a person has to
remember is a part that gets skipped under time pressure, and the feature whose page gets skipped
is the rushed one — the one that most needed it. Typing one line is faster than writing two pages
by hand, so the compliant route is now also the lazy route.

What proved it: [`tests/unit/newFeature.test.js`](../../tests/unit/newFeature.test.js), and a live
run — a throwaway page created, picked up by `npm run handbook` as page 26 with its History behind
the gate and no *Unlisted* warning, then removed. **Its last block is the one that matters**: it
checks the folder rather than the script, failing if any Brief anywhere ends up without a History
or without a row in the index, however it got there. Testing the tool would have left the rule
unguarded.

**The Handbook can be rebuilt, and its design cannot quietly change.** ✅ Closed 2026-08-13.
This item used to read *"the Handbook cannot be rebuilt — the generator was deleted with its
session"*, **and that claim was false.** The generator was on the machine the whole time; `find`
located it in four seconds — but only *after* a replacement had been written from a written
description of the page, in a different palette, with the History pulled out of the gate the index
says it sits behind. Every check passed, because every check compares the code to the note and
nothing compared the build to the artefact.

What proved it: the original shell restored byte-for-byte (matching MD5) into
[`scripts/handbook-shell.html`](../../scripts/handbook-shell.html), and the rebuilt output checked
against the original's own output — identical 24 page ids, identical 24 gates, byte-identical
stylesheet. Three faults in the original were fixed on the way (a hand-typed page list that had
already drifted from the index, a hardcoded path that ran on one machine, and a substitution that
filled only the first match and once published 412 KB of nothing). The design is now pinned by
test, and [`ARTEFACTS.md`](../ARTEFACTS.md) registers every approved artefact so one can never
again exist with no footprint in the repository. Full story:
[`handbook-history.md`](handbook-history.md).

**The Handbook opens itself, and work is picked from it.** ✅ Closed 2026-08-13 — parts 1 and 2
of Mike's instruction. `/startup` builds it, republishes it to its one recorded address and opens
it, so the page cannot drift from the repository; step 4 reads [`to-do.md`](to-do.md) instead of
the 6,000-line backlog. `/shutdown` mirrors it, updating the Brief first. `WORKING-AGREEMENT.md`
carries the same change, because both commands name it as their source of truth. **Part 3 — a new
feature starting as a page — closed a day later**, immediately above.

**A refused database save was reported as saved.** ✅ Fixed 2026-08-13. Every store fell back to a
local file whenever a query failed, and the only test was "are we not in production?" — so a
genuine refusal by a live database looked identical to having no database at all. **UAT is not
named `production`**, so the master team could have exercised the whole cascade, watched it work,
and signed it off having proved nothing. The fix discriminates on a code only a live server's
rejection carries; fourteen files now ask one helper. ⚠ **Not yet proven against a real MySQL** —
worth five minutes the first time the master team has one in front of them.

**`dotenv` was used but never declared.** ✅ Closed 2026-07-30, pinned exactly. It existed only
because a frontend build package happened to pull it in — had that shifted, the backend would
still have **booted**, printed one quiet note, and run with no API key at all.

**The availability gate was raised as a live fault and is not one.** ✅ Measured 2026-08-13. Of
the titles that exist in our mirror but not the master export, **zero** are referenced by any
decision branch and **zero** by any prose field. It is a latent weakness, not a defect. Recorded
so nobody re-derives it — and because the raw counts that first looked alarming were worthless.

**The negative tab gates.** ✅ Fixed. Three tabs were gated on "not the mentor", written when only
two tiers existed. A third tier would have switched two tabs on and made another vanish, with
nothing erroring and no test failing. Every tier is now named positively.

**The fake team dashboard.** ✅ Deleted. It returned invented advisors after a fake delay, and its
"AI insight" was string concatenation over those invented numbers. It was an accepted development
stub — and a manager would have been looking at fiction on a screen carrying their own firm's
name.

**The report screens' look.** ✅ Standardised and guarded. Eight screens each carried their own
copy of the frame, palette, cards and fonts under a different naming scheme; one shipped with no
frame at all and the build stayed green. Now one shared shell, one set of numbers, four tests that
fail the build on divergence.

**Course builder: five phases, twenty-four items.** ✅ Built, tested and pushed the same day the
plan was approved. Included the two that mattered most — a failed revision can no longer leave an
advisor with nothing, and a grading failure records "ungraded" instead of inventing a pass.

**The distinctions cascade.** ✅ Built through five stages, including the one that decides what
happens when the mentor deletes a row a firm had customised: **keep theirs**.

**Collaborate merged.** ✅ Slices 1, 2 and 4 — the code came across wired to nothing, the two
backends became one, and the manager console became a hub tab. Live-verified on the running app.

**Advisor progress: honest failure.** ✅ The read routes used to swallow database errors and
substitute an empty result, so a broken connection and a brand-new advisor produced exactly the
same screen.

---

## 3. The pattern in all of it

Read the closed list above and one shape repeats: **almost every serious fault rendered
confidently, passed its tests, and was wrong.**

A save that reported success. A screen of zeros that meant "refused". A fake dashboard that was
more convincing than the real one. A banner that existed but in the wrong place. A locale that
silently reverted to English. A quiz override that never fired. A gate that would have switched
tabs on for a tier nobody had created yet.

None of them crashed. None of them failed a test. Every one was found by a person reading the
code.

**That is the argument for this whole set of documents** — and for the rule at the foot of the
live list: a warning written in prose is not a task, and only a task gets done.

---

## 4. Where the full record is

[`../ACTIONS.md`](../ACTIONS.md) — the full 6,135-line backlog, including the verified sweep of
2026-08-03 that first established the real number is about ten. ⚠ Read its own warning:
*"Trust the CODE, not these flags"* — three separate items were found already built while still
flagged open.

[`../ACTIONS-ARCHIVE.md`](../ACTIONS-ARCHIVE.md) — completed work, verbatim, by date. Nothing is
deleted, only moved.

[`../STATUS.md`](../STATUS.md) — a generated table. ⚠ It only updates when somebody runs the
command by hand, carries no generated-on stamp, and its line links drift. See §2.8 of the live
list.
