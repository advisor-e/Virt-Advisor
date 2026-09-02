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
| Meeting Review — the screens | [meeting-review.html](mockups/meeting-review.html) | ☑ **APPROVED BY MIKE 2026-09-01** — *"Approved — build from them"* — drawn the same day. **Slice 1 is built from it**: the observation points, mentor + firm editing (`components/firm/FirmMeetingObservations.vue`), and the advisor's pre-set (`components/MeetingPreset.vue`). **Slice 2 is built from it too** (2026-09-01): the two consent screens verbatim (`components/MeetingConsentPanel.vue`), live capture with the wake-lock and the alarm (`components/MeetingRecorder.vue`), the advisor's page (`pages/meeting-record.vue`), and the retention dial. The two reports and the manager aggregate are **not**. ⚠ **FIVE FURTHER DELIBERATE DIFFERENCES IN SLICE 2**, named for the same reason: the **retention dial has no counterpart in the drawing at all** — it was needed because the consent screen quotes the firm's figure aloud, and its wording was written for the build and approved by Mike on 2026-09-01; **three end-state panels were added** (transcribed, deleted, failed) because the drawing goes straight from Stage B to the reports, which do not exist; **a §4 warning banner was added** to the advisor's page, saying this is not for a real client meeting yet; **no client or firm name appears in the recording bar**, the drawing showing "End of year meeting · Whitfield & Co" and there being no client record to draw a name from; and **the pre-set is shown again on the record page**, duplicating `/meeting-preset`, because the wording artefact §4 requires the list to remain visible when a client declines. ⚠ **FIVE DELIBERATE DIFFERENCES IN SLICE 1**, named in the head of those two components rather than left to be found: Stage A's reference-material half is not built (the document↔points *join* does not exist, which the drawing's own note calls the actual new work); a meeting-type picker was added, the drawing showing one of eleven scenarios; per-point edit / switch-off / remove controls were added, the drawing showing only "Add a point"; the advisor's screen has no "Start the meeting" and no "Add an objective", because neither has anywhere to go yet; and the scenario name is the logic tree's own (Brief P12) rather than the drawing's shortened form. Screens 2 and 3 reproduce [MEETING-CONSENT-WORDING.md](MEETING-CONSENT-WORDING.md) verbatim, and **since slice 2 the code renders them** — from `locales/en.json`, English only, held against that artefact by `tests/unit/meetingConsentWording.test.js` so the build cannot drift from the approved words without failing. **Five decisions inside the drawing were ruled by Mike on 2026-09-01 and are applied here**: the two report names (Meeting Summary / My Coaching Notes), 18-month retention, the drawing check, the 5-advisor / 20-meeting aggregate threshold, and that a firm may not edit the consent wording. **Its look is governed by [BRAND-TOKENS.md](BRAND-TOKENS.md) § Journey stages** — added 2026-09-01 on his ruling that "colours can still be consistent — they should be listed in the design handbook"; this page is that section's first use. ⚠ **FOUR DELIBERATE DIFFERENCES IN SLICE 3** (2026-09-02), and unusually these were found BEFORE any of it was written, by putting the drawing beside the code — each is a place the drawing asks for something the application cannot do, and each was put to Mike on its own and ruled on: **"Play this moment" is gone**, replaced by *"Show this in the transcript"*, because P8 destroys the audio the moment a transcript exists and there is nothing left to play — the drawing and the feature's own non-negotiable contradicted each other; **"Send to client" is gone**, replaced by *"Approve this summary"* and *"Copy for the client"*, because this app has no mail channel at all and adding one would put a named client's financial affairs through an unassessed third party, the same argument that kept the audio off Google Drive; **the jargon tile is absent rather than empty**, because it counts against a firm glossary that does not exist and writing a default word-list would be inventing Mike's advisory content; and **"Yes, I drew it" reads "Yes, I did"**, the drawing's wording working only for the drawing's own example. ⚠ **THREE FURTHER DIFFERENCES THAT ARE ABSENCES**, named so they are not read as oversights: **"Actions agreed" is not among the measured figures** (it cannot be counted, only understood, and the block is captioned *"no AI is involved"*); **no "Discard"** (no route discards one report — "stop and delete" removes the whole meeting, from the recording screen where a client asking to stop can actually be answered); and **no "Share with my manager"** (P2's sharing act has nowhere to arrive until the manager aggregate exists — the reasoning slice 1 used for "Start the meeting"). ⚠ **ONE LABEL WAS WRITTEN FOR THE BUILD AND IS NOT YET MIKE'S**: *"Read my reports"*, the button on the recorder's finished state, which is the only route to the reports screen — flagged to him at hand-over rather than left to be found. Item 4.58 (was 4.56 until 2026-09-02, when master's own 4.56 — the desktop's CPD item — arrived ahead of it). |
| Mentor adoption view | [mentor-adoption-view.html](mockups/mentor-adoption-view.html) | Adoption, Firm Manager Hub, Tier Cascade |
| Mentor Logic-Lab report | [mentor-logic-lab-report-mockup.html](mockups/mentor-logic-lab-report-mockup.html) | Logic-Lab Report, MENTOR-AI-HUB-STUB.md |
| Model Library launcher | [model-library-launcher.html](mockups/model-library-launcher.html) | BUSINESS-PERFORMANCE-REPORT-PLAN.md |
| Multiple Property Assessment (Phase 1) | [multiple-property-assessment.html](mockups/multiple-property-assessment.html) | MULTIPLE-PROPERTY-ASSESSMENT.md, features/to-do.md item 4.19 |
| Multiple Property Assessment (Phase 2 — the portfolio) | [multiple-property-portfolio.html](mockups/multiple-property-portfolio.html) | MULTIPLE-PROPERTY-ASSESSMENT.md §11, features/to-do.md item 4.19 |
| Quick Position | [quick-position-mockup.html](mockups/quick-position-mockup.html) | BUSINESS-PERFORMANCE-REPORT-PLAN.md |
| Sliced course outline | [sliced-course-outline.html](mockups/sliced-course-outline.html) | COURSE-SESSION-PLANNING.md, COURSE-SLICED-SESSION-WORDING.md |
| Template Check — evidence row | [template-check-evidence-row.html](mockups/template-check-evidence-row.html) | ACTIONS.md, 2026-08-12 notes |
| Template Check — table context | [template-check-table-context.html](mockups/template-check-table-context.html) | ACTIONS.md, 2026-08-12 notes |
| Three-Way Forecast | [three-way-forecast.html](mockups/three-way-forecast.html) | ☐ **awaiting Mike's approval**, drawn 2026-09-02. The four steps — drop the exports, confirm the opening position, set the assumptions, the forecast. Stages A and B behind it ARE built (`f42c74e`, `659706d`); nothing on this drawing is. Every figure is the real output of `server/report/threeWayForecastModel.js` on the source workbook's own sample, not a placeholder. Seven wording and behaviour questions are listed at the foot of the file, including the still-unruled 31-day month stepping. features/report-models.md · THREE-WAY-FORECAST-DEVIATIONS.md · source `report-source-models/3 way Filter.xlsx` |
| Tier hub pages | [tier-hub-pages.html](mockups/tier-hub-pages.html) | Firm Manager Hub, Tier Cascade, WORDING-CASE-SHARE-CASCADE.md |
| To-do list — scored table | [to-do-list-table.html](mockups/to-do-list-table.html) | features/to-do.md, product-principles.md |
| Firm Template Library tab | [firm-template-library.html](mockups/firm-template-library.html) | ✅ approved + BUILT 2026-09-01 (item 4.55, Cascade Phase 3): the two "whose library is in force" cards, upload/restore/Remove, and the read-only searchable contents table — **view-only by Mike's ruling** ("view only for now, with potential to become the master doc source in future — depending on feedback from the master coding team"). SEARCH-CONTENT-CASCADE-PLAN.md §7. |
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
| Meeting types and points — the full cascade | [MEETING-TYPES-CASCADE.md](MEETING-TYPES-CASCADE.md) | How meeting types and their observation points are authored and inherited from the mentor down to the individual client, and who may edit at each level. Written 2026-09-02 on Mike's instruction *"the creation of meeting types must be dynamic, editable and cascading from mentor — all down thru the layers until reaching the business entity level"*. ☑ **ALL FOUR DECISIONS RULED BY HIM the same day**, each as recommended: **D1 yes** (the advisor gets their own level as well as the client's), **D2 both** (advisor and firm manager may each set a client's points), **D3 they stay** — *"i change them in mentor mode in uat"* — and **D4 the whole type** (switching off removes it from the picker, never deletes). ☑ **APPROVED TO BUILD FROM — Mike, 2026-09-02**, asked as its own question after the four rulings, because ruling on the questions inside an artefact is not the same as approving the artefact. Four-slice build order in §7; slice 1 (types become data) built the same day. ⚠ It also records the storage finding that shapes the whole thing: the config table's `firm_id` is a foreign key to `firms`, so the reserved-scope trick used for the two middle tiers **cannot** extend to an advisor or a client — those levels are stored inside their own firm's row instead. Brief: features/meeting-review.md P12 / P14. |
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
