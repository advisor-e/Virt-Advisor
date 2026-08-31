# Handbook Ring-Fence Review — 2026-08-31

**Purpose.** Mike asked for a page-by-page review of the design handbook (`design/features/`)
to ring-fence notes and comments that are unnecessary for the human team member who will read
it in the coming days. The handbook should hold clear, concise notes that stick to the
framework — the rule, why it matters, what we risk if we ignore it.

**This file is the approval artefact.** Nothing listed here has been changed. Each row is a
*proposal*; Mike approves, amends or rejects rows, and only then are edits made. Committed per
the Save-the-Artefact rule.

**The criteria (Mike's, 2026-08-31):**

- **CUT** — mistake-found-and-fixed narratives with no durable observation or key learning;
  "this page used to say the opposite" correction layers; session diary (commit hashes,
  backlog item numbers, test-count arithmetic, who-found-what-when); notes aimed at AI
  sessions rather than a human reader; duplicate retellings of an incident already told
  elsewhere; self-referential meta-commentary ("kept verbatim because…").
- **CONDENSE** — a still-binding rule or durable lesson wrapped in blow-by-blow narrative:
  keep the rule/lesson/Mike's words, shed the story.
- **KEEP (never touched):** current rules and constraints; Mike's rulings and verbatim words;
  why-it-matters rationale; incidents whose lesson is still in force (told once, tersely);
  artefact and test links.

**Line numbers** are as read on 2026-08-31 at commit `3e12e15` (branch level with master).
They will shift as edits land — apply cuts per file from the bottom up.

---

## A. Four defects found in passing (contradictions to resolve, not style)

| # | where | the contradiction |
|---|---|---|
| D1 | `virtual-advisor.md` 59 vs 163–166 | One section says the translation move is complete ("87 strings moved"), another lists a "known open gap: some strings still hardcoded". One is stale — verify against the code, keep the true one. |
| D2 | `localisation-and-currency-history.md` 55–66 | §4 declares "the open breach — hardcoded English is still present" while its own Brief records the breach closed 2026-08-14. Stale section. |
| D3 | `to-do-done-and-parked.md` 1875–1878 | Footer points to `../STATUS.md` as "a generated table"; §0 of the same page records STATUS.md and its generator as deleted 2026-08-15. |
| D4 | `collaborate-data-layer-history.md` 54–57 | Claims handover documents "still describe a separate app"; the Brief's 2026-08-21 withdrawal states those documents never existed here. Brief wins. |

## B. Practical constraints before editing

- **`to-do.md` is hybrid.** Only the marked block (`<!-- BEGIN GENERATED … -->` to
  `<!-- END GENERATED -->`, currently the ranked table) is written by `npm run to-do`
  (`scripts/apply-to-do.js`). Trimming inside the markers must happen in
  `to-do-items.json`; everything outside is hand-editable. `tests/unit/toDoItems.test.js`
  fails if a hand-written detail block names a ref that is neither live nor labelled
  DONE/PARKED — delete whole stale blocks, never leave a ref unlabelled.
- **`to-do-done-and-parked.md` is fully hand-written**, but each item's `**X.Y · name.**`
  heading line must stay intact — `apply-to-do.js` string-matches it as the closure gate.
- Run `npm test` and `npm run handbook` after each batch of edits.

---

## C. Findings by page

Verdicts: **CUT** = remove · **CONDENSE** = keep the rule/lesson/Mike's words, remove the
narrative around it.

### C1. The AI engine

#### virtual-advisor.md (178)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 66–71 | P9 pre-fix narrative: "Until 2026-08-14 it only moved if…" | CONDENSE | The counter-rule (73–77) is the keeper; shrink the before-state to "a wrong switch fails silently". |
| 59 | "True of this screen as of 2026-08-14 — 87 strings moved" | CONDENSE | Date + string-count is session bookkeeping; the rule stands without it. See defect D1. |
| 163–166 | "Known open gap: some strings still hardcoded" | CUT | Contradicts line 59 — defect D1; verify which is true, remove the loser. |

#### virtual-advisor-history.md (107)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 34–61 | §2 "other faults": true-flag, third mode list, no timeout, six tabs | CONDENSE | Near-verbatim duplicates of Brief Traps 1–4; keep only detail the Brief lacks. |
| 75–83 | "The OpenAI boundary, and how it was closed" | CONDENSE | Completed migration; the binding rule is Brief P3 and CLAUDE.md Req 7 — one line on why the SDK wording was superseded. |

#### advisory-engine.md (215)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 90–94 | P10 tail: item numbers 4.46/4.18, verify date, mechanism detail | CONDENSE | Build-ledger citations; the rule + LEARN-SCOPE-HONESTY artefact link carry it. |
| 108–109 | "Three assets found in the wrong lane in one week…" | CONDENSE | Same incident told three times (also logic-tables.md, logic-tables-history); keep the lesson here, the story once. |
| 183–191 | Trap 6: three-instance inventory (`recommendation`, `howItHelps`, `advisor_note`) | CONDENSE | The rule ("render the real prompt and read it") is gold; shrink the catalogue to one example. |
| 192–196 | Trap 7: gate-ate-the-advisor-note story | CONDENSE | Keep "run it through and read what survives"; trim the Trial Fit / Cautious Reveal blow-by-blow. |

#### advisory-engine-history.md (123)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 58–66 | "Learn mode was built and working and was masking a gap" | CUT | Identical incident + lesson told in logic-tables-history §3 (its natural home) and Brief trap 2. |
| 67–71 | "The invisible swap gained a reverse" | CUT | Feature changelog, no mistake, no lesson; if current behaviour, it belongs in a Brief. |
| 90–108 | §4 corrections of the system-design doc + "None of this is a criticism" | CONDENSE | One line suffices ("pipeline design still best; build status stale"); the meta-defence at 104–106 cuts entirely. |

#### logic-tables.md (207)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 91–97 | P9 narrative: four financial trees, blank prompt line | CONDENSE | Rule (fallback to guide summary; "read, never copied") stays; discovery story shrinks to a clause. |
| 168–173 | Trap 5: `public_speaking` standing rules, "Fixed 2026-08-16" | CONDENSE | Keep "a field named in only one file is unreachable — grep first"; trim fix-date and specifics. |
| 174–180 | Trap 6: 116/954 lines, 4.16-era sweep | CONDENSE | Same fault and numbers as domain-support.md trap 6 (better home); keep a one-line pointer. |
| 185–192 | Trap 7 discovery narrative: item 4.24, tax-bill sentence | CONDENSE | The note-vs-trigger rule (181–184, 193–195) is the keeper; one example sentence suffices. |

#### logic-tables-history.md (117)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 25–44 | §2 gate "raised as a fault, measured, found inert" | CONDENSE | Ruling + rationale already Brief P5 and trap 3; keep the "prove it first" line + pointer to the measurement. |
| 60–71 | §4 wrong-lane / routing report | CONDENSE | Duplicates Brief trap 1 and advisory-engine.md almost word for word; keep "found by a person, not automation" once. |

#### domain-support.md (228)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 93–103 | P3e item citations (4.16 D, 4.38 refs) | CONDENSE | Rulings stay in full; backlog item numbers and back-story are bookkeeping. |
| 105–113 | Five-drivers block: "used to paraphrase… it now declares" | CONDENSE | State the current mechanism + ruling + test; the migration narrative is closed. |
| 190–191 | Trap 2: "reported as top defect three days after fixed" | CUT | Duplicate — same story with its lesson lives in history §1. |
| 212–217 | Trap 7: the ~55-duplicates claim tested and failed | CONDENSE | Keep "a duplication claim is tested, not accepted" + evidence link; trim the retelling. |

#### domain-support-history.md (161)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 102–129 | §5b "What the Brief said before 2026-08-25, and why it no longer says it" | CUT | 28 lines preserving two superseded warnings purely to explain their removal — the worst single block in the handbook. |
| 136–140 | §6 bullet: checklist carried the fabricated expansion | CONDENSE | Retells §1's story in the same file; one telling. |
| 143–146 | §6 bullet: ACTIONS.md "read the top of the entry, not the bottom" | CUT | Process narration for AI sessions; no rule a human reader needs. |

#### advisory-distinctions.md (156)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 142–146 | "Mike saw one distinction where 67 are shipped (item 4.17)" | CONDENSE | Keep the rules (banner names hidden rows; fallback ≠ done); drop the anecdote and item number. |

#### advisory-distinctions-history.md (118)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 13–16 | "A plan built on the word *fold*… contradicted itself" | CONDENSE | The ruled answer (17–27) is the keeper; the post-mortem shrinks to a clause. |
| 60–69 | "The build, stage by stage" | CUT | Blow-by-blow sequencing; the durable piece (promotion runs before deletion) already lives in Brief P5. |

### C2. Hub pages — mentor & firm (group A)

#### firm-manager-hub.md (271)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 110–115 | Parenthetical tab-count history ("Six since 2026-08-20… seven from 2026-08-15…") | CONDENSE | State "six" and link coaching-reference.md — the story lives there. |
| 152–160, 162–166 | "Duplicate found 2026-08-19, FIXED same day" narrative + session-73 detail | CONDENSE | Keep the ruling (Team Case Studies is firm-only + reason at 170–174); cut the chronology. |
| 177–179 | "`listFirmCases` non-firm branch now has no caller… deliberately left alone" | CONDENSE | Process caveat; one clause suffices. |
| 203–204 | "(Five since 2026-08-20, six before it…)" | CUT | Count-history parenthetical; the sentence already says the count follows the group. |
| 207–209 | "(11 / 12 / 13 until the Coaching Reference tab was removed…)" | CUT | Superseded counts retold before the correction. |
| 217–225 | Hide-list: §3-was-wrong story, verbatim request, built-same-day | CONDENSE | Keep the three rulings (two tabs only; per-screen keys; Distinctions excluded); cut the discovery blow-by-blow. |

#### firm-manager-hub-history.md (105)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 67–71 | "The '+3' that was a '+2'" carried through eight session notes | CONDENSE | Fixed clerical error; its lesson (open the artefact) is already the binding CLAUDE.md rule — one line at most. |
| 86–87 | DISTINCTIONS-CASCADE-PLAN §2 correction "URL-query era… closed" | CUT | Closed old defect in a superseded doc; no surviving reader risk. |

#### coaching-reference.md (215)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 38–40 | "This Brief was written on 2026-08-19, later than the feature… see §6" | CUT | Meta-commentary on the page's own authorship; the no-Brief lesson lives in History §1. |
| 121–124 | "Its name is the weakest thing about it… recorded at §6" | CUT | Naming complaint for a removed tab; falls with §6. |
| 184–203 | §6 "Open — the name" — four renaming options + cost table | CUT | A 20-line open decision on a feature removed 2026-08-20; the name will never be chosen. |

#### coaching-reference-history.md (105)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 18–31 | "How the gap surfaced" + Facilitation 101 blow-by-blow | CONDENSE | The durable lesson is 33–36 ("a missing Brief does not announce itself"); the anecdote shrinks to one sentence. |

#### advisory-staircase.md (129)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 107–109 | "It was authored from the start and read by nothing until that date…" | CONDENSE | Fixed-mistake retelling inside a rule paragraph; the rule stands without it. |

#### advisory-staircase-history.md (79) — clean.

#### quizzes.md (138) — clean.

#### quizzes-history.md (91)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 70–76 | "§5 describes the overlay pattern… exactly what happened" + "Left in place" meta | CONDENSE | Prediction-came-true narration; keep only the two concrete corrections (62–68) and the open template-picker dependency. |

#### logic-lab.md (101)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 56–58 | P5 retells the design-nearly-lost incident | CONDENSE | Duplicate of History §1 and CLAUDE.md's Save-the-Artefact rule; one sentence + pointer. |

#### logic-lab-history.md (76)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 22–27 | Second retelling of the chat-approved-never-saved mockup failure | CUT | Third home for the same incident — verbatim in CLAUDE.md, which line 74 already links; keep only 13–21. |

#### adviser-network.md (142) — clean.

#### adviser-network-history.md (125)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 43–53 | Wrong-then-inverted recommendation build-up before Mike's quote | CONDENSE | Keep the quote and the withdrawn-half-measure ruling (55–63); the forensics shrink to a sentence. |
| 65–80 | "Why the tab shipped out of order" | CONDENSE | Keep "the thing that settled it was reading the fetch calls"; the scheduling chronology is session history. |

### C3. Hub pages — mentor & middle tiers (group B)

#### adoption.md (91) — clean.

#### adoption-history.md (66)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 8–23 | §1 retelling of "why not a wider Team Progress" | CONDENSE | Brief §1 already carries the rejection and reasoning; keep only "the rejected design was cheaper, no test could catch it". |
| 26–38 | §2 "the related error, in the opposite direction" | CONDENSE | Told in full in tier-cascade-history §2 and case-reviews-history §2; keep the paired lesson (36–38) + pointer to one canonical telling. |

#### logic-lab-report.md (94) — clean.

#### logic-lab-report-history.md (66)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 10–17 | §1 re-quotes the artefact sentence already in Brief §1 | CONDENSE | Keep the quote in one home only. |
| 50–51 | "i love it, it looks great" approval anecdote | CUT | Who-said-what-when with no rule; the approval date is in the Brief's table (75). |

#### case-reviews.md (94) — clean.

#### case-reviews-history.md (83)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 26–37 | §2 "the confusion this had to survive twice" | CONDENSE | Third full retelling of the outside-party/internal-manager confusion; keep the one-sentence distinction + pointer to the canonical telling. |

#### template-check.md (102)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 62–64 | "correction made after the count had been carried… several sessions" | CONDENSE | Keep the twelve-tab fact; the backstory is fully told in template-check-history §2. |
| 87–88 | "a save can be refused… that fault is fixed" | CONDENSE | Keep only the live requirement — the mentor scope needs its reserved row seeded. |

#### template-check-history.md (96)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 33–38 | the "+2/+3 vs +2/+2" blow-by-blow over eight sessions | CONDENSE | Keep "a number in a note is not evidence" (40); the arithmetic of which backlog line said what goes. |

#### ai-prompts.md (297)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 61–63 | P3: "yearOneAddBack… item 4.22 sat open for five days" | CONDENSE | Keep the rule + "a default nobody is told about…"; drop item-number/five-days detail (retold in History). |
| 115–119 | P8: full retelling of the fourth-line fault, with date | CONDENSE | Incident is the History's in substance; keep the rule + one clause of why. |
| 134–139 | "This paragraph said 'almost none…' until 2026-08-22… `28cb249`" | CUT | Corrected-mistake layer with commit hash; the correct rule is fully stated at 133–135. |
| 266–274 | Known state: item numbers and closure dates | CONDENSE | Keep current-state facts (tab exists; stripInvisible covers every AI path); drop closed-item bookkeeping. |

#### ai-prompts-history.md (188) — worst page in the handbook

| lines | what it is | verdict | reason |
|---|---|---|---|
| 10 | "Mike: finish 4.28 you should have everything you need" | CUT | Session-opening quote; no rule. |
| 33–46 | "What the redraw did, and the one thing it had to prove" | CONDENSE | Near-verbatim duplicate of Brief P7; keep a pointer. |
| 64–67 | "Two labels, and the one that stayed" | CONDENSE | The two wording rulings bind — keep them; drop the self-commentary. |
| 71–76 | Live-verification walkthrough | CUT | Blow-by-blow test narration; surviving caveats (78–81) already in the Brief's Known state. |
| 87–95 | Mike's two opening quotes | CONDENSE | Both already appear in Brief §1 (20–24). |
| 100–107 | "The framing this session started with was wrong" | CUT | AI-session self-correction; the durable fact (no report calls OpenAI) is in Brief §3. |
| 146–151 | "Two mistakes made and corrected inside the build" | CONDENSE | The trap and its reason live in Brief Traps (251–254); one sentence here. |
| 153–158 | "A guard caught the change, and it was right" | CUT | Fixed-in-session, guard worked as designed; Brief Traps already carries the instruction. |
| 160–168 | "What was deliberately NOT built" | CONDENSE | Two of four bullets superseded; the two survivors are in Brief §3 and P5. |
| 170–176 | "The two middle tiers" | CONDENSE | Duplicate of Brief Known state and tier-cascade.md; keep a pointer. |
| 187 | "Commits: `2968d76` · `ea6ac22`" | CUT | Commit-hash bookkeeping; artefacts are linked in the Brief's table. |

#### tier-cascade.md (371)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 78–80 | "Corrected by Mike within the hour… the first version got it wrong" | CONDENSE | Keep the quote (the ruling); the correction story belongs in the History. |
| 96–106 | "DO NOT open a reconciliation… an earlier revision was wrong and dangerous" | CONDENSE | Warning aimed at future AI sessions; keep one line — "do not reconcile those files on P11's strength". |
| 140–154 | P10 evidence: the 4.16 sweep arithmetic (102 pieces, 71, 65, 13, 2…) | CONDENSE | Keep the lesson ("does *this field* have a screen?") and the headline count; the per-file inventory goes. |
| 217–220 | Trap 1: "this used to be silent… now fixed (`dbFailure.js`)" | CONDENSE | Keep the live requirement (seed the reserved row); drop the fixed-fault history. |
| 221–228 | Trap 2: full negative-gate incident retelling | CONDENSE | P5 already carries the rule; keep "TAB_TIERS is the matrix, `hubTabTiers.test.js` pins it, never gate on a negative". |
| 282–287 | "This paragraph replaced one that said the opposite…" | CUT | Correction-of-a-correction; the true current state (274–281) is fully stated above it. |
| 297–298, 302–304 | Coaching reference: dates, hash, "(Superseded 2026-08-15…)" box | CUT | Superseded premise + self-referential meta; the current rule stands at 296. |
| 331 | "Built 2026-08-18 (`1feefa2`)" | CONDENSE | Drop hash/date; the ruling reference (MULTIPLE-PROPERTY-ASSESSMENT §8 Q6) is the durable link. |

#### tier-cascade-history.md (146)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 43–49 | "'Content flows down freely; people never flow up'… named here only so the correction is traceable" | CUT | Corrected mistake defended by meta about its own preservation. |
| 111–128 | §4 "Where the earlier record is wrong" | CONDENSE | Keep one line per stale document naming it and the ruled model; drop the paragraph-length rebuttals. Re-check bullet 3 — the hubs are now built. |
| 144–145 | Session-notes date list | CUT | Blow-by-blow pointers; the artefact links above do the durable work. |

### C4. Reports & learning

#### report-models.md (529)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 204–206 | "That test compared the two 'word for word' until 2026-08-22…" | CUT | Correction chronology; the operative rule is stated two lines up. |
| 215–219 | "This listed three and omitted Lease vs Buy… corrected the same day" | CUT | Fixed-mistake narrative; the test now enforces the list automatically. |
| 321–325 | "Until then, the catalogue was read by one file… Ten built models were invisible" | CUT | Backstory duplicated in full in History §0. |
| 333–334 | "IT HAS A SCREEN NOW — built 2026-08-22 (`68f5fae`)" | CONDENSE | State the fact (the Model Guide at `/model-guide`, see P20) and stop. |
| 336–351 | Blockquote: "This paragraph said the opposite until 2026-08-22… Why this is worth the space" | CUT | Superseded premise + self-defending meta; the lesson ("no test reads prose") already appears at 502–511. |
| 364–377 | "Investing in houses" search incident | CONDENSE | Keep the mechanism, `searchWords`, the no-fuzzy rationale; drop item numbers and retelling. |
| 406–416 | Video-injector collision fix chronology | CONDENSE | Keep the guard rule and its two conditions; the reverted-attempt story is History §0's centrepiece. |
| 486–496 | "Why it is a step and not a nicety" — 5,885-tests-green story | CONDENSE | Keep at half length: "neither golden tests nor mockups can see a screen saying something untrue." |
| 502–511 | "CORRECTED 2026-08-22: THIS PARAGRAPH USED TO SAY 'no browser driver'…" | CONDENSE | Keep only current facts — playwright installed, no test uses it, layout unverified. |

*(§6 — the four rules of a Brief — untouched: the index names it the worked example.)*

#### report-models-history.md (257)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 50–55 (2nd half) | "It became item 4.32 rather than…" | CONDENSE | Keep the half-a-fix lesson; drop backlog bookkeeping. |
| 57–66 | "And then it was answered the same afternoon" | CUT | Both facts are stated as current rules in Brief §3a. |
| 82–86 | "One claim was wrong… video first reported as AI-invented" | CUT | Misreport corrected same day, no durable lesson — the confusion-increasing class. |
| 190–197 | SliderGroup naming ⚠ | CONDENSE | Keep "a proposed name is not a built component; check `components/` first"; drop the two-day chronology. |
| 203–213 | §4 migration: six numbered steps with commit hashes | CONDENSE | Keep only 215–217 ("proven before trusted — the two shared components were the only two that never drifted"). |

#### model-library.md (111) — clean.

#### model-library-history.md (75)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 24–30 | "'Nineteen' is correct for its date and is now stale…" | CONDENSE | Keep the current count and "quote the catalogue, never a document"; drop the correction layers. |

#### course-builder.md (153) — clean.

#### course-builder-history.md (100)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 10–16 | "All five phases built the same day… zero tests to 76" | CONDENSE | Session-achievement narration; the four durable fixes below carry the value. |
| 80–83 | Coverage note "logged as evidence rather than left to be discovered" | CONDENSE | Keep the fact (global coverage threshold fails, pre-existing); drop the self-referential defence. |

#### advisor-progression.md (151) — clean.

#### advisor-progression-history.md (116)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 46–58 | §3 "The evening that proved the database has never worked" | CONDENSE | Near-duplicate of the Brief's "Known state"; keep date + access-denied evidence in two sentences. |
| 74–76 | "A third copy of a list, drifted" | CUT | One-off fixed drift; the single-source rule already exists. |
| 78 | "No screen's request had a timeout" | CUT | Duplicates Brief P7 and trap 3; fixed, no residual lesson. |
| 80–83 | "Six browser tabs cost an afternoon" | CONDENSE | Duplicate of Brief trap 4 (the actionable home). |

### C5. Network, across-the-app & meta

#### collaborate-groups.md (135)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 119–121 | Trap 3: "alias failed silently during the code move" | CUT | One-off migration incident, fixed; no ongoing rule. |

#### collaborate-groups-history.md (95)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 18–20 | "Their pages landed as components… clash never arose" | CONDENSE | Decision already in §3 table; "the risk never arose" is dead narrative. |
| 22–24 | "Scope was wider than the plan assumed — 431 tests…" | CUT | Session accounting; teaches nothing durable. |
| 30–31 | "A silent alias failure… Found by hand." | CUT | Mike's exact cut example. |
| 33–34 | "A forked translation route" | CUT | Retold with its lesson in localisation-and-currency-history §2. |
| 36–38 | "Two database pools onto one database" | CONDENSE | Owned by collaborate-data-layer-history §2 and Brief P1; reduce to a cross-reference. |
| 40–41 | "Two integration configs… slow, careful work" | CUT | Process narration. |
| 60–63 | Merge-cut-across-a-handover backstory | CONDENSE | Keep only the ruling (65–66); the packaging narrative goes. |
| 68–69 | "Nothing in the early slices was provable by eye" | CUT | Narration aimed at past AI sessions. |
| 75–84 | §5 "Where the earlier record is wrong" — merge-plan errata | CONDENSE | Keep one line — merge plan §1/§4 stale, slices 5–6 still open. |

#### collaborate-data-layer.md (140)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 115–125 | ⚠ withdrawn-claim block: "handover docs never existed…" | CONDENSE | Keep one sentence (item withdrawn 2026-08-21; the named docs never existed here); push forensics to the History. |
| 127–130 | 🔴 "Why this is written out rather than deleted" | CUT | Self-referential meta defending a passage itself flagged. |

#### collaborate-data-layer-history.md (73)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 27–28 | "Deleted 2026-08-02… commented-out require points at the surviving one" | CONDENSE | Keep the fault-shape lesson (30–31); drop date narration. |
| 54–57 | "Handover documents still describe a separate app" | CUT | Defect D4 — contradicts the Brief's withdrawal; Brief wins. |

#### cases-and-clients.md (133) — clean.

#### cases-and-clients-history.md (93) — clean. (Every incident carries a still-binding ruling, told tersely.)

#### localisation-and-currency.md (131)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 106–112 | Trap 3: "hardcoded-English breach CLOSED — and the item was wrong…" | CONDENSE | Keep "closed 2026-08-14; 87 strings moved; measure before believing a backlog title"; drop the forensics. |

#### localisation-and-currency-history.md (80)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 55–66 | §4 "The open breach, stated plainly" | CUT | Defect D2 — stale; the Brief records the breach closed 2026-08-14. |

#### product-principles.md (110)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 77–81 | "Ruled by Mike on 2026-08-15, in the case that produced this page…" | CONDENSE | Keep the 🔴 rule and the quote or the ACTIONS link; the retelling duplicates History §7. |
| 95–97 | ⚠ "This page's worked example no longer exists… deleted 2026-08-15" | CUT | Meta about a deleted test; the rule (93–95) stands alone. |
| 103–110 | Worked-examples table | CONDENSE | All four rows describe a feature History §7 says was deleted entirely; "Keep" verdicts on deleted things mislead. |

#### product-principles-history.md (135)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 62–77 | §4 "What it cost to apply it late" | CUT | Cost accounting; the lesson ("ask before building") is Brief §3, and its premise was overtaken by §7's deletion. |
| 81–98 | §5 "The first recommendation was wrong, and how" | CONDENSE | AI-misreads-then-withdrawn narrative — the exact cut example; keep one line: check a Brief's justification against the code. |
| 102–105 | §6 "sources… the decision it produced no longer exists" | CUT | Stale pointer; fold the deletion fact into §7. |
| 111–117 | §7 opening — trace, invented acronym, "blast radius" | CONDENSE | Keep only "traced: nobody requested it" leading into Mike's verbatim ruling (119–127, KEEP). |
| 129–135 | "Two things this page now records that it could not before…" | CONDENSE | Keep the two facts; drop the framing. |

#### handbook.md (123)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 62–74 | Rule 9's "Why this is a rule…" — three comments discarded, six days, `838f3a0` | CONDENSE | The rule (54–61) + test link suffice in a Brief; the incident retelling belongs in the History. |
| 82–83 | "HUB-PAGE-PURPOSES.md was moved in on 2026-08-16… it went back" | CUT | One-off mistake, guarded by a test; the rule is stated in the sentence before. |

#### handbook-history.md (146)

| lines | what it is | verdict | reason |
|---|---|---|---|
| 5–9 | "design/ had grown to 120 files… 22 files" | CONDENSE | Near-verbatim duplicate of README's "Why this exists"; one home. |
| 30–33 | "restored byte-for-byte (matching MD5)…" | CONDENSE | One sentence: "restored and proven identical to the original's output". |
| 43 | Fault 2: hardcoded laptop path | CUT | Fixed one-off, no durable rule. |
| 44–47 | Fault 3: String.replace / 412 KB page | CONDENSE | Keep "substitute() counts occurrences and refuses to build". |
| 73–76 | "Where the older records went stale" | CUT | Both incidents closed; no surviving rule. |
| 94–95 | "Built in the three phases Mike asked for… all in one day" | CUT | Build narration. |
| 97–105 | Fault one — the UTC date stamp | CUT | Fixed one-off; its lesson is already the section's intro line (83). |
| 109–115 | Fault two blow-by-blow — the Park row vanishing | CONDENSE | Keep the two fault bullets, the 🔴 artefact-behaviour lesson (121–122) and the rule mapping (126–131). |
| 139–142 | Item 2.3 / "Seminar's seven lines" anecdote | CONDENSE | Keep "the label was the blocker, not the decision" as one line. |

#### README.md (128) — clean.

### C6. The to-do pages

#### to-do.md (392) — hybrid file; see §B before editing

| lines | what it is | verdict | reason |
|---|---|---|---|
| 44–131 | "N items came off on 2026-08-22/21" closure changelog | CUT | Every closure is recorded in full on the done page. |
| 132–199 | Same pattern for 2026-08-20/19/18/16/15 | CUT | Duplicate retellings. ⚠ First move to the done page the few Mike quotes not already there (e.g. 4.23's "the hub is getting overwhelming…"). |
| 201–206 | Note that four score-5s meant "do this now" | CUT | All four items now closed. |
| 208–237 | 3.1/4.8/3.3/3.2 settled-by-Mike blocks | **KEEP** | Mike's own words, DONE/PARKED-labelled, not duplicated on the done page. |
| 240–281 | §2 scoring system + five mandatory fields | **KEEP** | Current rules. |
| 286–294, 306–328 | §3 release rulings, ordering rule, Mike's words | **KEEP** | Live rulings. |
| 295–299 | "This entry exists because the question was put to him three sessions running" | CUT | Self-referential meta; the ruling above it suffices. |
| 330–348 | "How today's list reads against it" with struck-through closed items | CUT | Stale bucket-check + corrections-of-corrections. |
| 353–364 | §4 waiting-on note (Carl's ledger row) | **KEEP** | Live obligation. |
| 367–369 | §5 "Ours to build" — empty section | CUT | Header with no content. |
| 371–392 | §6 honesty rules | **KEEP** | Durable rules; the 4.13 retelling inside is the lesson's evidence. |

#### to-do-done-and-parked.md (1878) — fully hand-written; keep every `**X.Y · name.**` heading line

| lines | what it is | verdict | reason |
|---|---|---|---|
| 16–54 | §0 audit intro + deletion table | **KEEP** | The page's numbering rule depends on it; concise. |
| 56–92 | 2.2 hub-tabs deviation box | CONDENSE | Ruling + "do not re-raise" are the record; the cell-by-cell verification narrative isn't. |
| 93–100 | "Done in the same pass… §4.4 could NOT be done here" | CUT | Session narration; 4.4 closed long ago. |
| 102–135 | 4.13 box | CONDENSE | Keep Mike's words, the three rejected fixes, the lesson; cut restated mechanics. |
| 139–217 | §1 parked rulings | **KEEP** | Doing exactly its job. Exception: 177–183 ("This line used to read…") CONDENSE — correction-of-a-correction. |
| 222–414 | Closures 4.33, 4.47, 4.42, 4.17, 4.49, 4.51, 4.39 | CONDENSE | Each 20–40 lines of measurement blow-by-blow; keep item + outcome + Mike's words + test/artefact link. |
| 417–535 | Closures 4.43, 4.31, 4.46, 4.36, 4.45 | CONDENSE | Same pattern — reproduction narratives, commit lists, rejected-first-version stories. |
| 536–616 | 4.25 and 4.18 closures | CONDENSE | Keep artefact links and the "found already built" warning; cut run-by-run live-probe accounting. |
| 617–735 | 4.38, 4.27, 4.37, 4.44, 4.40 | CONDENSE | Keep the Mike lines; cut build narrative and suite-count arithmetic. |
| 739–799 | 4.41 and 4.30 | CONDENSE | Keep residue/deviation notes; cut lockfile diff accounting. |
| 801–863 | 4.7 engine-strict closure — npm archaeology | CUT (most) | 60 lines of which-npm-on-which-Node forensics; keep ~8 lines (outcome, the npm-8 fact, the two open residues). Operational detail lives in `.npmrc` and `STACK-RECONCILIATION-PLAN.md`. |
| 865–875 | 2.9 and 4.53 | **KEEP** | Already the model closure shape. |
| 877–1141 | 4.16, 4.35, 4.26, 4.34, 4.29, 4.32, 4.28 | CONDENSE | Mike's verbatim words and artefact links KEEP; prompt-wording histories and test-count tallies are diary. |
| 1143–1332 | 3.5, 4.22, 4.12, 4.19, 4.24 | CONDENSE | Keep Mike's words + one durable lesson each (3.5's deleted-comment cause; 4.24's Hornevian/Harmonic near-miss); cut git-log proofs and move lists. |
| 1335–1418 | 4.23 and 4.20 | CONDENSE | Keep "Jest does not lay a page out" and the no-artefact-tab finding; cut selector/icon-test forensics. |
| 1420–1542 | 2.6, 4.9, 2.3 | CONDENSE | Keep Mike's questions/rulings + artefact links; cut the 5,429→5,442→5,438 corrections and gate walkthroughs. |
| 1544–1567 | 4.14 closure summary | **KEEP** | Concise; carries Mike's rule and the honest cost paragraph. |
| 1568–1615 | "The full 4.14 record, moved here" | CUT | Blow-by-blow of a build superseded by the control itself; the mockup link and deviations survive in the summary above. |
| 1616–1631 | The rule Mike gave after using it | **KEEP** | His rule and verbatim criticism are the record. |
| 1632–1650 | "What the control does now" | CONDENSE | Restates tested behaviour. |
| 1652–1670 | 4.4 closure | CONDENSE | Keep his comment and the UTC-timezone lesson; cut the KB-at-timestamp diary. |
| 1672–1841 | Pre-numbering-era completed items | ARCHIVE | Not referenceable by the apply gate; move to an archive page. Keep Mike's ruling at 1742–1745 (now enshrined in product-principles.md anyway). |
| 1845–1859 | §3 "The pattern in all of it" | **KEEP** | The page's one distilled durable lesson. |
| 1863–1873 | §4 pointers to ACTIONS.md / archive | **KEEP** | Live navigation. |
| 1875–1878 | §4 pointer to `../STATUS.md` | CUT | Defect D3 — describes a file this page records as deleted. |

---

## D. Totals and the recommended order of work

~150 findings; roughly 15–20% of the handbook's volume. Twelve pages fully clean.

Suggested batches, each ending with `npm test` + `npm run handbook`:

1. **The four defects (§A)** — contradictions first; each needs a quick code check to pick
   the true side.
2. **Pure CUTs in Briefs** — highest reader impact, lowest judgement.
3. **History-page CUTs and CONDENSEs**, one section at a time.
4. **`to-do-done-and-parked.md`** — the big one; condense per the table, headings intact.
5. **`to-do.md`** — after the quotes flagged at 132–199 are confirmed present on the done page.

Every CONDENSE keeps: the rule, Mike's verbatim words, why-it-matters, and all artefact/test
links. Nothing of Mike's is discarded anywhere in this plan.
