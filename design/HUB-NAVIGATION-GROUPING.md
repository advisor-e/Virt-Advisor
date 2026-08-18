# Firm Manager Hub — Navigation Grouping

> **Status: PROPOSED, awaiting the owner's approval. Nothing has been built.**
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
| **Your team** | Advisor Network · Team Progress · Quizzes · *Your advisors' cases* |
| **Model settings** | Property Tax Rules |
| **Rolled up from below** *(not the firm manager)* | How firms are using the app · Logic Lab Report · *Shared cases (anonymised)* · Template Check |

Resulting counts: firm **3 headings / 11 items**, mentor **3 / 12**, group and global **4 / 13**
(13 rather than 14 assumes §5's duplicate is removed).

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

### 2.2 Why Case Reviews is not under "Your team"

Two tabs concern cases and they are not the same thing:

- **A firm manager's own advisors' cases** — in full, not anonymised, because they are their own
  people and the raw text is the point of a review. That is their team.
- **Cases sent up from the level below** — anonymised, and only where a firm manager took a second,
  explicit decision to share. Those are not the reader's team.

Filing the second under *Your team*, beside Advisor Network and Team Progress which name real
individuals, would say the opposite of what the consent gate exists to say.

---

## 3. The layout

**A sidebar, not a second row of tabs.** Names stacked down the left. Group headings label, they do
not open — nothing costs an extra click.

**It must be collapsible, and the pattern already exists.** Four tab bodies already carry their own
left rail:

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

| Group | Recommended | Alternatives offered |
| --- | --- | --- |
| The six that teach the AI | **Your AI coach** | AI coach · How your AI advises |
| Advisors, progress, quizzes, cases | **Your team** | Your advisors · People |
| Settings the report models compute with | **Model settings** | Technical inputs *(Mike's phrase)* · Report settings |
| What arrives from the levels below | **Rolled up from below** | Across the levels below you · Roll-up reports |

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

## 7. The decisions being asked for

| # | Decision | Recommended |
| --- | --- | --- |
| 1 | Sidebar with grouped names, replacing the horizontal band | Yes |
| 2 | One group of six for everything that teaches the AI, not two | Yes |
| 3 | The four group headings (§4) | Your AI coach · Your team · Model settings · Rolled up from below |
| 4 | The two case-tab names (§4) | Your advisors' cases · Shared cases (anonymised) |
| 5 | The duplicate at group and global tier (§5) | Drop the firm-flavoured tab at those two tiers |

---

**Related:** [`features/firm-manager-hub.md`](features/firm-manager-hub.md) — the Brief ·
[`features/tier-cascade.md`](features/tier-cascade.md) — what flows between tiers
