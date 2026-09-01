# Approved Artefacts — the register

> **An artefact is anything shown to Mike so he can say yes or no to it** — a screen mockup, a
> layout, a wording list, the design of a page he reads. **Every one of them lives in this
> repository. If it is not in this table, it is not approved, and nothing should be built from it.**

**This table is guarded.** [`tests/unit/designArtefacts.test.js`](../tests/unit/designArtefacts.test.js)
fails the build if a file listed here is missing, if an artefact is added to
[`mockups/`](mockups/) without being listed, or if any path here points outside the repository.
A row is a claim the test checks — not a note.

---

## Why this register exists

On **2026-08-13** the Advisor-e Handbook was rebuilt from a written description of itself, in a
different palette, with the History moved out of the gate the index says it sits behind. It was
rebuilt because a note said the original had been deleted. **The original was on this machine the
whole time** — in a session-scoped temporary folder — and `find` located it in four seconds.

The rule requiring an artefact to be saved before approval already existed, and every check passed,
because **the artefact had no footprint in this repository at all**. Nothing referenced it, so
nothing could notice it was missing, and "I could not find it" became permission to design a
replacement.

That is the hole this table closes. An artefact with no row is invisible; an artefact with a row
is checked on every commit.

This is the same failure family as the Logic-Lab mockup of 2026-08-01/02 — rendered in chat,
approved, never saved, and gone a day later.

---

## The register

**Screens and layouts** — in [`mockups/`](mockups/), one HTML file each.

| Artefact | File | Referenced from |
|---|---|---|
| AI Prompts tab | [ai-prompts-tab.html](mockups/ai-prompts-tab.html) | ✅ approved + BUILT 2026-08-22 (item 4.28) — **SECOND drawing**: the first was written for an engineer and Mike rejected it, and the file's own §3 names every difference between the drawing and the build. AI-PROMPTS-PAGE.md §10, features/ai-prompts.md |
| Case origin path | [case-origin.html](mockups/case-origin.html) | Case Reviews, Cases & Clients, Tier Cascade |
| Share a prompt (accountant contribution) | [prompt-contribution.html](mockups/prompt-contribution.html) | PROMPT-CONTRIBUTION-SAFETY.md, AI-PROMPTS-PAGE.md |
| Coaching Reference tab | [firm-coaching-reference.html](mockups/firm-coaching-reference.html) | ✅ approved + BUILT 2026-08-15 (item 4.9) — two deviations named in `9cd39c9`; features/tier-cascade.md, features/firm-manager-hub.md |
| Debtor Drag | [debtor-drag-mockup.html](mockups/debtor-drag-mockup.html) | ⚠ nothing — see *Orphans* below |
| Decision logic map | [decision-logic-map-mockup.html](mockups/decision-logic-map-mockup.html) | LOGIC-LAB-BUILD-VS-MOCKUP.md |
| EBITDA-DCF deconstruction | [ebitda-dcf-deconstruction-preview.html](mockups/ebitda-dcf-deconstruction-preview.html) | BUSINESS-PERFORMANCE-REPORT-PLAN.md |
| EBITDA-DCF screen | [ebitda-dcf-mockup.html](mockups/ebitda-dcf-mockup.html) | BUSINESS-PERFORMANCE-REPORT-PLAN.md |
| Firm quiz builder | [firm-quiz-builder-mockup.html](mockups/firm-quiz-builder-mockup.html) | ACTIONS.md, 2026-07-21 desktop notes |
| Global groups membership | [global-groups-membership.html](mockups/global-groups-membership.html) | ACTIONS.md, 2026-08-10 notes |
| Hub navigation grouping | [hub-navigation-grouping.html](mockups/hub-navigation-grouping.html) | HUB-NAVIGATION-GROUPING.md, features/firm-manager-hub.md |
| Logic Lab wording | [logic-lab-wording-mockup.html](mockups/logic-lab-wording-mockup.html) | ACTIONS.md |
| Logic table — Template Check | [logic-table-template-check.html](mockups/logic-table-template-check.html) | MENTOR-HUB-CONSOLIDATED-NOTES.md, TREE-RECOMMENDATION-REVIEW.md |
| Logic tables — rule in place | [logic-tables-rule-in-place.html](mockups/logic-tables-rule-in-place.html) | ACTIONS.md, 2026-08-12 notes |
| Margin Breakeven | [margin-breakeven-mockup.html](mockups/margin-breakeven-mockup.html) | ⚠ nothing — see *Orphans* below |
| Meeting Review — the screens | [meeting-review.html](mockups/meeting-review.html) | ☐ **the screens await approval**, drawn 2026-09-01, **nothing built**. features/meeting-review.md. Screens 2 and 3 reproduce [MEETING-CONSENT-WORDING.md](MEETING-CONSENT-WORDING.md) verbatim. **Five decisions inside the drawing WERE ruled by Mike on 2026-09-01 and are applied here**: the two report names (Meeting Summary / My Coaching Notes), 18-month retention, the drawing check, the 5-advisor / 20-meeting aggregate threshold, and that a firm may not edit the consent wording. Ruling on what goes in the screens is not the same as approving the screens — hence the box is still unticked. **Its look is governed by [BRAND-TOKENS.md](BRAND-TOKENS.md) § Journey stages** — added 2026-09-01 on his ruling that "colours can still be consistent — they should be listed in the design handbook"; this page is that section's first use. Item 4.56. |
| Mentor adoption view | [mentor-adoption-view.html](mockups/mentor-adoption-view.html) | Adoption, Firm Manager Hub, Tier Cascade |
| Mentor Logic-Lab report | [mentor-logic-lab-report-mockup.html](mockups/mentor-logic-lab-report-mockup.html) | Logic-Lab Report, MENTOR-AI-HUB-STUB.md |
| Model Library launcher | [model-library-launcher.html](mockups/model-library-launcher.html) | BUSINESS-PERFORMANCE-REPORT-PLAN.md |
| Multiple Property Assessment (Phase 1) | [multiple-property-assessment.html](mockups/multiple-property-assessment.html) | MULTIPLE-PROPERTY-ASSESSMENT.md, features/to-do.md item 4.19 |
| Multiple Property Assessment (Phase 2 — the portfolio) | [multiple-property-portfolio.html](mockups/multiple-property-portfolio.html) | MULTIPLE-PROPERTY-ASSESSMENT.md §11, features/to-do.md item 4.19 |
| Quick Position | [quick-position-mockup.html](mockups/quick-position-mockup.html) | BUSINESS-PERFORMANCE-REPORT-PLAN.md |
| Sliced course outline | [sliced-course-outline.html](mockups/sliced-course-outline.html) | COURSE-SESSION-PLANNING.md, COURSE-SLICED-SESSION-WORDING.md |
| Template Check — evidence row | [template-check-evidence-row.html](mockups/template-check-evidence-row.html) | ACTIONS.md, 2026-08-12 notes |
| Template Check — table context | [template-check-table-context.html](mockups/template-check-table-context.html) | ACTIONS.md, 2026-08-12 notes |
| Tier hub pages | [tier-hub-pages.html](mockups/tier-hub-pages.html) | Firm Manager Hub, Tier Cascade, WORDING-CASE-SHARE-CASCADE.md |
| To-do list — scored table | [to-do-list-table.html](mockups/to-do-list-table.html) | features/to-do.md, product-principles.md |
| Volatility Report | [volatility-report.html](mockups/volatility-report.html) | ✅ wording approved by Mike 2026-08-31, **not yet built**. features/report-models.md; source `report-source-models/Volatility Report.xlsx`. The dial's 50/75 thresholds were **measured** from the workbook's own gauge images, not chosen. |
| What each model is for — the Model Guide | [report-model-summaries.html](mockups/report-model-summaries.html) | features/report-models.md · built at `/model-guide`, 2026-08-22 |
| Working Capital Cycle | [working-capital-cycle-mockup.html](mockups/working-capital-cycle-mockup.html) | BRAND-TOKENS.md, BUSINESS-PERFORMANCE-REPORT-PLAN.md |

**Pages Mike reads** — an approved design that is generated rather than drawn once.

| Artefact | File | What it governs |
|---|---|---|
| The Advisor-e Handbook | [`scripts/handbook-shell.html`](../scripts/handbook-shell.html) | The palette, layout, gate and edit bar of the Handbook. Restored byte-for-byte 2026-08-13 after being rebuilt from a description. Its values are pinned by [`tests/unit/buildHandbook.test.js`](../tests/unit/buildHandbook.test.js). |

**The Handbook's published address**, which `/startup` republishes to every session:

> [The Advisor-e Handbook](https://claude.ai/code/artifact/77ed69c4-c8b9-47d3-b384-7900c63d29d6)

It is written here because it has to live somewhere the repository can see. A link held only
in a chat window is the same failure as a design held only in a temporary folder: publishing
without it silently creates a **second** Handbook, and the one Mike has bookmarked quietly
stops being updated. Build with `npm run handbook`, then republish to that URL — never
publish a new one.

**Words the AI is shown** — prompt content Mike approves before it reaches a model. Not a screen,
but the same rule: he cannot say yes to something that exists only in a chat window.

| Artefact | File | What it governs |
|---|---|---|
| The Awareness Check block | [PF-AWARENESS-DECISION-BLOCK.md](PF-AWARENESS-DECISION-BLOCK.md) | The context the AI is given while choosing between Cautious Reveal and Trial Fit on the `pf_awareness` branch. ☐ awaiting approval — item 2.6, features/to-do.md. |
| The Diagnostic Entry block | [DIAGNOSTIC-ENTRY-BLOCK.md](DIAGNOSTIC-ENTRY-BLOCK.md) · screen: [mockups/domain-support-diagnostic-entry.html](mockups/domain-support-diagnostic-entry.html) | The 65 authored "where to start when the client presents like this" branches across 20 domains — today on no screen and in no prompt. ☐ awaiting approval — item 4.16 Phase 1, features/to-do.md. |
| The method guides | [METHOD-GUIDES-SCREEN.md](METHOD-GUIDES-SCREEN.md) · screen: [mockups/method-guides.html](mockups/method-guides.html) | The 13 deep method guides — 155,000 characters reaching the AI and no screen at any tier — and the 116 authored lines inside them that reach neither. ☐ awaiting wording, §6 a–d — item 4.16 F, features/to-do.md. |

**Words a client is told** — wording spoken or shown to someone *outside* the firm. The same rule as
the two blocks above, with the stakes raised: these are the only strings in the app whose accuracy
is a **promise made to a named third party**, not a description of a screen. A paraphrase here is
not a drift, it is a misrepresentation.

| Artefact | File | What it governs |
|---|---|---|
| Meeting Review consent | [MEETING-CONSENT-WORDING.md](MEETING-CONSENT-WORDING.md) | The line an advisor speaks aloud before recording a client meeting, the two-step screen around it, and what happens when someone declines. ✅ approved by Mike 2026-09-01, **not built** — no screen, no route, no locale string. Its promise *"nothing is shared outside our firm"* binds the code as **P13** of features/meeting-review.md. A lawyer's review in each market, and legally competent translation into the eight locales, are still outstanding — that page §5 and §6. |

### Orphans

Two mockups are listed above but referenced by no document:
`debtor-drag-mockup.html` and `margin-breakeven-mockup.html`. **Both screens are built and live**,
so these are records of a finished decision rather than pending work. They are kept, not deleted —
an artefact is the evidence of what was approved, and the build is checked against it, not the
other way round.

---

## How to use it

1. **Making something for Mike to approve?** Commit the file *first*, add its row here in the same
   change, then ask him. An artefact shown from chat alone does not exist.
2. **About to build from an approved design?** Open the file in this table, put it beside the
   build, and name every difference. A deliberate deviation is fine; an unrecorded one is not.
3. **Cannot find the artefact?** That is a **stop**, not a licence to design a replacement. Search
   the repository, then the machine — including temporary folders from earlier sessions. Say what
   you found before writing anything.
4. **Never move an artefact outside the repository.** A temporary folder is where things go to be
   declared missing.
