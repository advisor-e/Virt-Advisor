# Firm Manager Hub — Navigation Grouping

> **Status: ✅ BUILT 2026-08-19, session 73.** All five decisions of §7 are in the code.
> Phase 1 — the sidebar, at all four tiers — is commit `85097e9`. Phase 2 — the duplicate
> of §5 — landed with it. **Every difference from the artefact is named in §8 below;
> nothing is left to interpretation.**
>
> **The artefact is [`mockups/hub-navigation-grouping.html`](mockups/hub-navigation-grouping.html).**
> Open it beside anything built from this. This page carries the reasoning and the decisions;
> the mockup carries the look. Neither summarises the other.
>
> Raised by Mike, 2026-08-19: *"the hub is getting overwhelming for a firm manager"* and
> *"simply making a side bar with names under each other vs a sliding banner with tabs across a
> page which forces you to scroll is probably half the confusion fix"*.

---

## 1. The problem, measured

The hub is one component rendered at four tiers ([`features/firm-manager-hub.md`](features/firm-manager-hub.md) P1).
Tabs have been added one at a time, each landing at the end of a single horizontal band.

| Hub | Tabs today |
| --- | --- |
| Firm manager | 11 |
| Mentor | 12 |
| **Group manager** | **14** |
| **Global group manager** | **14** |

⚠ **The firm manager's hub is the lightest of the three.** The crowding is worst at the two tiers
that were not being looked at when the complaint was raised.

🔴 **The code comment in `FirmManagerHub.vue` still says "each middle hub 12 tabs".** That was true
when written and is now stale by two. Counted 2026-08-19 by reading `TAB_TIERS` against the
template.

**Why a band is the wrong shape for this.** It is not only clutter. A horizontal row wider than the
page puts items *past the edge*, so a manager cannot see what they have not scrolled to. A vertical
list shows every name at once at any window width.

---

## 2. The grouping

**Grouped by the job a manager came to do — never by how a thing is stored.** Six of these tabs
share one storage mechanism; grouping on that would put Coaching Reference beside Quizzes because
of a database decision, which means nothing to the person reading the screen.

| Group | Tabs |
| --- | --- |
| **Your AI coach** | Domain Support · Advisory Distinctions · Coaching Reference · Logic Tables · Advisory Staircase · Logic-Lab |
| **Your Team In Action** | Advisor Network · Team Progress · Quizzes · *Your advisors' cases* |
| **Model Inputs** | Property Tax Rules |
| **Rolled up from below** *(not the firm manager)* | How firms are using the app · Logic Lab Report · *Shared cases (anonymised)* · Template Check |

Resulting counts: firm **3 headings / 11 items**, mentor **3 / 12**, group and global **4 / 13**
(13 rather than 14 assumes §5's duplicate is removed).

> 🔴 **SUPERSEDED IN PART ON 2026-08-20, BY A LATER RULING — the counts above are what was
> approved on 2026-08-19 and are left as approved.** **Coaching Reference has since been removed**
> from the *Your AI coach* group, along with the feature behind it (item 4.24, Mike: *"remove the
> tab"*). The **headings and the grouping are unchanged**; one entry has gone. Live counts are now
> firm **3 / 10**, mentor **3 / 11**, group and global **4 / 12**, asserted off the rendered screen
> in `mentorHubScope.component.test.js`. §2.1's rule — that everything teaching the AI stays in ONE
> group — is untouched and now covers five entries rather than six.

### 2.1 Why the six are one group and not two

🔴 **The first draft split them and it stated a falsehood.** It proposed *"what the AI draws on"*
(Domain Support, Distinctions, Coaching Reference) against *"how advice is chosen and delivered"*
(Logic Tables, Advisory Staircase, Logic-Lab). Mike rejected it on sight: *"sends the message that
AI is not working across the logic tables and advisory staircase — which is NOT true"*.

**He is right, and it is verifiable.** [`server/advisorEngine.js`](../server/advisorEngine.js) —
the prompt builder — requires all six: `domainSupport`, `resolveDistinctions`, `coaching`,
`logicTrees` and `staircaseConfig`. A heading implying otherwise would teach every new manager
something untrue, permanently, from the navigation itself.

**It fails a second time on the detail.** Coaching Reference is not content. Its own file describes
it as *"the guidance the model reads when it chooses which template to put in front of a client"* —
a decision, not a thing said. So the honest split is **two items and four**, and a group of two is
too thin to earn a heading.

✅ **One group of six.** The true statement about all six is the same statement — *everything here
teaches the AI* — which is the hub's own stated purpose: *"The hub exists so a firm can teach the
system without a developer."* It also matches the door managers arrive through: **"Manage AI
Coach"** in the master app.

### 2.2 Why Case Reviews is not under "Your Team In Action"

Two tabs concern cases and they are not the same thing:

- **A firm manager's own advisors' cases** — in full, not anonymised, because they are their own
  people and the raw text is the point of a review. That is their team.
- **Cases sent up from the level below** — anonymised, and only where a firm manager took a second,
  explicit decision to share. Those are not the reader's team.

Filing the second under *Your Team In Action*, beside Advisor Network and Team Progress which name real
individuals, would say the opposite of what the consent gate exists to say.

---

## 3. The layout

**A sidebar, not a second row of tabs.** Names stacked down the left. Group headings label, they do
not open — nothing costs an extra click.

**It must be collapsible, and the pattern already exists.** Four tab bodies already carry their own
left rail:

> 🔴 **CORRECTED 2026-08-19 — the table below was wrong, and Mike found it on the running screen.**
> Four tabs have a rail; only **two** ever had a control to collapse it. In his words: *"you have a
> show menu/hide menu for all but only domain support and logic tables have an additional 'hide
> list'. Please add the same feature to Quizzes page."* **Quizzes now has it**, built the same day
> with the same words and its own `fq:` storage key. **Advisory Distinctions does not, and that is a
> ruling** — *"the others don't need it due to layout"* — not an unfinished job. The table is left
> standing with this correction above it rather than quietly rewritten, because the wrong claim is
> what the build was reasoned from.

| Tab | Its rail |
| --- | --- |
| Domain Support | the domain list |
| Logic Tables | the table list |
| Quizzes | the quiz-bank list |
| Advisory Distinctions | the domain list |

[`components/firm/FirmDomainSupport.vue`](../components/firm/FirmDomainSupport.vue) has a Show/Hide
list button that remembers the choice in the browser (`RAIL_STATE_KEY`). The hub menu reuses that
pattern rather than inventing a second one.

🔴 **The hub menu must never collapse itself.** Opening one of those four tabs must not tidy the hub
menu away as a side effect. It is the tidy thing to do and it is exactly the behaviour ruled out on
2026-08-15 — nothing moves under the owner's hand. The manager collapses it, or it stays.

**What the sidebar buys beyond the scroll.** A horizontal band rations name length — every extra
word pushes something off the edge. A vertical list does not. This is what makes §4's clearer,
longer tab names affordable.

**Worth recording:** grouping alone would also stop the scrolling, even horizontally (three or four
headings on top, at most six items beneath). The sidebar's distinct win is *all names visible at
once* plus *room to name things properly*.

---

## 4. The names — not decided

**Every name below is a proposal.** Labels are the owner's call; see the artefact for the full
option tables.

✅ **Two are settled, both in Mike's own words rather than from the options offered (2026-08-19):
"Your Team In Action"** and **"Model Inputs"**. They are recorded here verbatim rather than
paraphrased, because a label approved in chat and summarised afterwards is the failure this whole
page exists to avoid.

| Group | Heading | Alternatives offered |
| --- | --- | --- |
| The six that teach the AI | **Your AI coach** *(proposed)* | AI coach · How your AI advises |
| Advisors, progress, quizzes, cases | ✅ **Your Team In Action** *(ruled)* | ~~Your team~~ · Your advisors · People |
| Settings the report models compute with | ✅ **Model Inputs** *(ruled)* | ~~Model settings~~ · Technical inputs · Report settings |
| What arrives from the levels below | **Rolled up from below** *(proposed)* | Across the levels below you · Roll-up reports |

⚠ **The headings are deliberately NOT harmonised to one capitalisation style.** Both ruled names are
title case; the two still proposed are sentence case. Harmonising them was put to Mike on 2026-08-19
and declined — *"no — keep capitals etc as you have them"*. **Do not tidy this on sight.** Each label
is the owner's, exactly as he gave it, and a later pass that "fixes the inconsistency" would be
overwriting a decision with a preference.

⚠ **"Across your firms" is not offered**, though it reads best. It is wrong for a global group
manager, whose level below is a *country*. A heading has to be true at every tier that sees it.

### The two case tabs

Today: **"Team Case Studies"** and **"Case Reviews"**. A group manager sees both. Nobody could
reliably tell from those two labels which is which.

| Today | What it is | Recommended | Alternatives |
| --- | --- | --- | --- |
| Team Case Studies | Own advisors' cases, in full, not anonymised | **Your advisors' cases** | Team cases · keep as is |
| Case Reviews | Sent up from below, anonymised, opt-in | **Shared cases (anonymised)** | Anonymised case library · keep as is |

The recommended pair carries the two facts that actually separate them: *whose*, and *whether
identities were stripped*.

---

## 5. 🔴 A duplicate found while drawing this

**At group and global tier, two tabs return the identical set of cases.**

[`server/routes/cases.js`](../server/routes/cases.js) — Team Case Studies, for any tier above a firm:

```js
: await withOrigin(await caseStore.listSharedWithMentor(firmId), firmId)
```

[`server/routes/mentor.js`](../server/routes/mentor.js) — Case Reviews:

```js
const cases = await caseStore.listSharedWithMentor(req.firmId)
const decorated = await withOrigin(cases, req.firmId)
```

Same store call, same decoration, same scope.

| Tier | Team Case Studies | Case Reviews | Same? |
| --- | --- | --- | --- |
| Firm manager | Own advisors' cases, in full | *no tab* | No — correct |
| Group manager | Anonymised, shared up | Anonymised, shared up | 🔴 **Duplicate** |
| Global group manager | Anonymised, shared up | Anonymised, shared up | 🔴 **Duplicate** |
| Mentor | *no tab* | Anonymised, shared up | No — correct |

Only the **firm manager's** version is genuinely different — theirs reads their own advisors' cases
in full, which is a different screen with a different purpose.

**Recommended:** drop the firm-flavoured tab at the group and global tiers, leaving it a
firm-manager tab, and let the roll-up version carry those two. That takes them from 14 tabs to 13
and removes a contradiction rather than merely a crowd.

⚠ **Not actioned.** Removing a tab is the owner's call, and it is listed as decision 5 below.

*(This is not a regression. `listFirmCases` was deliberately widened above the firm on 2026-08-12 —
before that it was firm-exact and returned an empty list to a middle tier. The widening was correct;
what it created, unnoticed, was an overlap with a tab that already did the job.)*

---

## 6. Rules this design is held to

| Rule | How it is satisfied |
| --- | --- |
| **Nothing moves under the owner's hand** (2026-08-15) | The hub menu never collapses itself |
| **One screen, four tiers, no forking** (Brief P1) | One component; groups declared once beside `TAB_TIERS` |
| **Conditional tabs name their tiers positively** (Brief P2) | Grouping is a display layer over `TAB_TIERS`; no gate rewritten |
| **Bulma + Buefy only** (Stack Constitution req. 6) | Buefy's `b-menu` with grouped lists; nothing new installed |
| **Save the artefact** (binding) | [`mockups/hub-navigation-grouping.html`](mockups/hub-navigation-grouping.html), committed before approval was asked for |

⚠ **Known consequence.** Grouping reorders the tabs, so
[`tests/unit/mentorHubScope.component.test.js`](../tests/unit/mentorHubScope.component.test.js)
needs its exception list rewritten in the new draw order. That list is in **tab order**, not in the
order exceptions were ruled on — the trap that bit on 2026-08-18. Recorded here so it is expected
rather than rediscovered.

---

## 7. The decisions

**Approved by Mike, 2026-08-19**, in the conversation that produced this file.

| # | Decision | Outcome |
| --- | --- | --- |
| 1 | Sidebar with grouped names, replacing the horizontal band | ✅ **Approved** |
| 2 | One group of six for everything that teaches the AI, not two | ✅ **Approved** |
| 3 | The four group headings (§4) | ✅ **Approved** — Your AI coach · **Your Team In Action** · **Model Inputs** · Rolled up from below. The two in bold are his own words, not from the options offered. |
| 4 | The two case-tab names (§4) | ✅ **Settled — NO RENAME.** "Team Case Studies" and "Case Reviews" both stay exactly as they are |
| 5 | The duplicate at group and global tier (§5) | ✅ **Approved** — drop the firm-flavoured tab at those two tiers |

⚠ **Decision 5 dissolved decision 4, which is why nothing is renamed.** The rename was proposed
because a group manager saw *both* case tabs side by side and could not tell them apart. With the
duplicate dropped, **no tier ever sees both**: the firm manager has one, every tier above has the
other. The collision that motivated the rename is gone, so the rename was withdrawn rather than
carried out for its own sake.

🔴 **Do not "finish" this later.** The rename options in §4 are recorded as history, not as pending
work. A future reader finding two proposed names and no rename in the code is looking at a decision,
not an omission. The one weakness left — **"Case Reviews" does not say the cases are anonymised** —
is real, and belongs in the text on that page rather than in the tab name.

### What decision 5 means in the code

`teamCaseStudies` in `TAB_TIERS` becomes `['firm']`. It is the **third** tab to be tier-limited, and
per [`features/firm-manager-hub.md`](features/firm-manager-hub.md) §4 it needs its own written reason
and a named entry — **in tab order** — in
[`tests/unit/mentorHubScope.component.test.js`](../tests/unit/mentorHubScope.component.test.js).

🔴 **This narrows a tab that was deliberately widened on 2026-08-12.** That widening was correct at
the time and is not being reversed as a mistake: it fixed a middle tier being shown an empty list.
What it created, unnoticed, was an overlap with a tab that already did the same job at those tiers.
The reason must say so, or a future reader will restore it believing a bug was reintroduced.

---

## 8. ✅ As built — every difference from the artefact, named

Built 2026-08-19, session 73. The mockup was opened beside the build and read line by line;
these are all the differences, deliberate ones included. **An unrecorded deviation is the
failure this whole page exists to prevent, so a difference being small is not a reason to
leave it out.**

| # | The artefact says | The build does | Why |
| --- | --- | --- | --- |
| 1 | A **"Hide menu"** button, top right of the sidebar | Same, plus **"Show menu"** when it is closed | The mockup only ever draws the menu OPEN, so it has no name for the other state. A control that hides its own way back is a trap. The pair mirrors Show/Hide list on Domain Support. 🔴 **"Show menu" is the one label in the build that was never put to Mike.** |
| 2 | Navy left-border on the open item, `#fbfcfd` rail, custom `.navitem` styling | Bulma's own `b-menu`, unstyled | §2's own banner says the look "is copied from `tier-hub-pages.html`, not proposed here… what is being asked for is the grouping, the group names". The hub already renders a `b-menu` rail on the Advisory Distinctions tab one click away; two looks for one control is worse than either. Only layout CSS was added. |
| 3 | Plain text names, no icons | Same — **and eleven tabs lost the icon they had** | Ruled by Mike mid-build: *"if we don't need the icons drop them out"*. Domain Support and Logic Tables never had one, so a mixed column would have had to invent two. ⚠ This took the WHOLE APP from 11 distinct icon names to 7 and tripped `iconFont.test.js`, whose floor of >10 was measuring how many icons the app happens to use. It now pins names instead. |
| 4 | Group and global: **4 headings / 13 items** | Same | §5's duplicate went in the same session. Asserted off the screen, not off the matrix, in `mentorHubScope.component.test.js`. |
| 5 | *(silent — the mockup shows only the menu)* | **Quizzes gained a Hide list button** | Not from this design. Mike, on the running screen: *"the one thing to make consistent please"*. 🔴 **§3's table of four tabs with their own rail was WRONG** — it implied all four could be collapsed; only Domain Support and Logic Tables ever had the control. Advisory Distinctions still does not, ruled the same day: *"the others don't need it due to layout"*. |

**Not a difference, but worth recording:** the panels in `FirmManagerHub.vue` were **not
reordered**. Each sits exactly where its `b-tab-item` stood; only one is ever shown, so the
order a manager reads comes from `NAV_GROUPS` alone. That kept the change to 17 single-line
swaps instead of an 1,800-line reindent, and it is why `activeTab` is a key rather than an index.

### What the build found that the design did not

- 🔴 **`mentorHubScope.component.test.js` read `nav.tabs li`.** When the tab bar went it did not
  fail — it returned **nothing**, and the order assertion passed by comparing two empty arrays.
  A selector that matches nothing is indistinguishable from agreement. The file now proves the
  menu is on screen before trusting a word it says.
- ⚠ **The "6 unconditional tabs" comment in `hubTabTiers.test.js` had been wrong since
  2026-08-15**, when Coaching Reference became unconditional. The assertion pins the
  *conditional* count, so the total in the test's own name drifted 13 → 14 with nothing failing.
- ⚠ **`listFirmCases`'s non-firm branch now has no caller from the hub.** It is left exactly as
  it is: it returns the same anonymised list Case Reviews returns, so nothing is exposed, and
  narrowing a live route is a separate decision from removing a tab. Flagged, not actioned.

---

**Related:** [`features/firm-manager-hub.md`](features/firm-manager-hub.md) — the Brief ·
[`features/tier-cascade.md`](features/tier-cascade.md) — what flows between tiers
