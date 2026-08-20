# The Firm Manager Hub — the Brief

> **Read this before adding a tab, changing a gate, or making anything firm-editable.** Current
> rules only. The history is in [`firm-manager-hub-history.md`](firm-manager-hub-history.md).
>
> **Covers:** the one screen every management tier renders, its tabs, and the override machinery
> behind the editable ones. **Does not cover:** what flows between tiers
> ([`tier-cascade.md`](tier-cascade.md)) or the individual editable blocks, which have their own
> briefs.

---

## 1. Design philosophy

**One screen, four tiers, no new functionality.**

> *"Every tier is the same screen, re-scoped… there's no new functionality."* — the owner,
> 2026-07-30

`pages/mentor.vue`, `pages/global-group-manager.vue`, `pages/group-manager.vue` and
`pages/firm-manager.vue` all render the **same component** with a different `scope` prop. A
manager at any level sees the same hub, showing their own configuration and the level below
them. The moment a tier gets a screen of its own, the model is broken and the drift begins.

**The hub exists so a firm can teach the system without a developer.** This is the commercial
heart of the product: the platform ships a strong base, and the reason a firm pays is that they
can pour their own advisory knowledge in and have it reach their advisors automatically. Every
editable block on this screen is a piece of that promise — plain-English editing screens, never
code.

**And every edit is recoverable.** Overrides carry version history and one-click restore for
free, because they all ride one storage mechanism. A manager can change their firm's advisory
configuration knowing they can put it back.

---

## 2. Key principles — the non-negotiables

**P1 · The hub is one component. Do not fork it per tier.** Differences between tiers are
expressed as scope, never as a second screen.

**P2 · Every conditional tab names its tiers positively.** The matrix lives in one place —
`TAB_TIERS`. Never gate a tab on a negative: a `!== 'mentor'` rule answers *yes* for a tier that
does not exist yet, and adding one would switch tabs on silently. Named positively, a new tier
shows up as a **missing** tab, which is visible.

**P3 · Identity comes from the verified token, never from the request.** A route resolves the
caller's tier and scope; it never takes a firm id from a body or query string. This is the guard
against one firm reading or writing another's configuration.

**P4 · A level holds only its changes, not a copy.** Untouched rows keep receiving the level
above's improvements; edited rows are protected and the update is *offered*, not applied. See
[`tier-cascade.md`](tier-cascade.md) P3.

**P5 · Every override goes through the one overlay store**, so version history and restore come
free. Do not invent a second storage path for a new editable block.

**P6 · A tab with nothing to show says so.** An empty roll-up and a broken one must never look
alike.

**P7 · Wording on this screen is approved before it ships** — labels, status pills, failure
messages. Several are recorded verbatim in the design record.

---

## 3. Design considerations

**There are two flavours of the Advisory Distinctions tab, and the difference is structural.**
The firm flavour carries *decline / override / reset-to-platform*, which only mean something
when a layer sits above you. The mentor sits at the top, so its version is plain add / edit /
move / remove. Every tier **below** the mentor takes the firm flavour — including the two middle
tiers.

**Tabs divide into three kinds**, and knowing which you are adding matters more than where it
goes: **cascading config** (edited here, flows down), **firm-local records** (never cascade —
Logic-Lab is one, by nature), and **roll-up reports** (read-only views of the level below).

**Templates & Videos is dormant on purpose.** It is switched off everywhere by an owner decision,
because templates are Advisor-e's entire lifecycle — not ours. It is not a broken tab awaiting
repair.

**Adding a firm-editable block is a known, repeatable job**, not a design exercise. The overlay
mechanism, the version history, the restore and the authorisation guard already exist; a new
block reuses them. The `firm-manager-edit-target` skill is the recipe.

**This component is very large** — over 1,700 lines, with a backend route file over 3,700. Both
are candidates for decomposition, and both are load-bearing. A split needs tests in front of it.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The hub component | `components/FirmManagerHub.vue` |
| Tab bodies | `components/firm/*.vue` |
| The tier pages | `pages/mentor.vue` · `pages/global-group-manager.vue` · `pages/group-manager.vue` · `pages/firm-manager.vue` |
| The backend | `server/routes/firmManager.js`, `server/routes/mentor.js` |
| Override storage + version history | `server/utils/firmOverlay.js` |
| Content resolution | `server/utils/firmContent.js` |
| Auth and scope resolution | `server/middleware/firmAuth.js` |
| The tab matrix | `TAB_TIERS` in `FirmManagerHub.vue` (exported for its test) |

### The tab matrix, as built

Unconditional at every tier: **Domain Support · Logic Tables · Logic-Lab · Advisory Staircase ·
Quizzes · Adviser Network**. *(**Six since 2026-08-20.** It was seven from 2026-08-15, when
Coaching Reference was added — the fifth and last block to join the row-inheritance mechanism, and
the only one whose engine shipped before its screen. **That tab and the feature behind it were
removed on 2026-08-20** (item 4.24, Mike: "remove the tab"): the fifteen rows it edited were
measured against the logic trees that had superseded them, the seven pieces worth keeping were
folded into those trees, and the rest went. See
[`coaching-reference.md`](coaching-reference.md).)*

| Tab | Tiers |
|---|---|
| Advisory Distinctions (firm flavour) | firm, global, group |
| Advisory Distinctions (mentor flavour) | mentor |
| Team Progress · Team Case Studies | firm, global, group |
| Adoption | mentor, global, group |
| Logic-Lab Report · Case Reviews | mentor, global, group |
| Template Check | **mentor only** — the one named exception |
| Property Tax Rules | firm, global, group — **not the mentor** |
| Templates & Videos | dormant everywhere |

`hubTabTiers.test.js` pins the firm and mentor columns to what they showed *before* the middle
tiers existed — the proof that adding them was behaviour-preserving rather than a claim that it
was.

**Property Tax Rules (2026-08-18)** carries the settings the Multiple Property Assessment is
built on: what may be depreciated and how, whether rental losses ring-fence, the GST inside the
management fee, and which year-1 costs are added back. Ruled by Mike 2026-08-17
([`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md) §8 Q6): **a group —
normally a country — sets them, a firm may correct them, and an advisor types over them on the
report for one client.** The advisor's override is the report's own Tax rules card and is never
stored, which is why [`tier-cascade.md`](tier-cascade.md) §3's "the advisor gets no override
storage" is not contradicted by that ruling.

🔴 **The mentor is excluded, and that is a ruling rather than an oversight.** Option (c) — the
platform seeds New Zealand, then the group — was put to Mike and turned down: the mentor has no
country of its own to speak for. The New Zealand base ships in
[`../../data/property-tax-rules.json`](../../data/property-tax-rules.json) and is deliberately
not editable from a screen, so a mentor tab would mean one tier editing a country's tax rules on
behalf of every country.

⚠ **This is the first tab whose reason for being tier-limited is not "a manager's view of their
own advisers by name".** Both earlier exceptions shared that reason; this one does not, which is
why it is written out here rather than added to their sentence.

### ✅ A duplicate at the group and global tiers — found 2026-08-19, FIXED the same day

**Team Case Studies and Case Reviews return the identical list above the firm.** Both call
`caseStore.listSharedWithMentor` with the same scope and the same `withOrigin` decoration —
`cases.js` `listFirmCases` for any non-firm tier, and `mentor.js` `listMentorCases`. A group
manager and a global group manager therefore open two differently-named tabs and find the same
cases in both. **Only the firm manager's version is genuinely different**: theirs reads
`listSharedForFirm` — their own advisers' cases in full, un-anonymised.

⚠ **This is not a regression.** `listFirmCases` was deliberately widened above the firm on
2026-08-12 to stop a middle tier being shown an empty list; that fix was correct. What it created,
unnoticed, was an overlap with a tab that already did the job at those tiers.

✅ **Fixed 2026-08-19, session 73.** `teamCaseStudies` is now `['firm']` — the third tier-limited
tab, carrying its own written reason in `TAB_TIERS` and a named entry **in menu order** in
`mentorHubScope.component.test.js`. The reasoning is in
[`../HUB-NAVIGATION-GROUPING.md`](../HUB-NAVIGATION-GROUPING.md) §5.

🔴 **Anyone tempted to widen it back must read the reason first.** Narrowing it is **not** a
revert of the 2026-08-12 widening, which was correct, and it is **not** a breach of "every report
rolls up" (2026-08-10): those cases still reach every tier above the firm through Case Reviews.
One door closed, not the room. `hubTabTiers.test.js` asserts it explicitly rather than dropping it
from the roll-up loop, because an exception quietly removed from a list looks identical to one
never considered.

⚠ **`listFirmCases`'s non-firm branch now has no caller from the hub**, and is deliberately left
alone. It returns the same anonymised list Case Reviews returns, so nothing is exposed; narrowing
a live route is a separate decision from removing a tab.

### ✅ The navigation grouping — approved AND built 2026-08-19

**The hub renders a grouped Buefy `b-menu` sidebar**, at all four tiers, replacing the horizontal
`b-tabs` band. Commit `85097e9`. **Every difference from the approved mockup is named at
[`../HUB-NAVIGATION-GROUPING.md`](../HUB-NAVIGATION-GROUPING.md) §8** — open that beside the code
before changing anything here.

Four group headings — **Your AI coach · Your Team In Action · Model Inputs · Rolled up from
below**. The middle two are Mike's own words and
[`../HUB-NAVIGATION-GROUPING.md`](../HUB-NAVIGATION-GROUPING.md) §4 carries a written instruction not
to harmonise their capitalisation, which he was offered and declined.

Two rules the build holds, and any change here must keep holding:

- **The hub menu never collapses itself.** Auto-hiding it when a tab with its own left-hand list
  opens is the tidy thing to do and is exactly the behaviour ruled out on 2026-08-15. It reuses
  `FirmDomainSupport.vue`'s Show/Hide pattern with its own `hub:menuHidden` key; the manager
  collapses it or it stays. Asserted in `mentorHubScope.component.test.js`.
- **Every AI-facing tab is ONE group, and the reason is that any split states a falsehood.**
  `advisorEngine.js` loads domain support, distinctions, logic trees *and* the staircase. A heading
  implying the logic tables or the staircase sit outside the AI's reach would teach every new
  manager something untrue from the navigation itself. Mike rejected exactly that split on sight.
  Do not reintroduce it. *(**Five since 2026-08-20**, six before it — the rule is about the group,
  not the count, and the count follows whatever is in the group.)*

**Counts as built, measured 2026-08-20 off the rendered screen:** firm 3 headings / **10** items ·
mentor 3 / **11** · group and global 4 / **12**. *(11 / 12 / 13 until the Coaching Reference tab was
removed that day; the approved design's counts and this change are recorded together at
[`../HUB-NAVIGATION-GROUPING.md`](../HUB-NAVIGATION-GROUPING.md) §2.)* Asserted off the rendered
screen rather than off `TAB_TIERS`, because the matrix is what the design predicted and the screen
is what a manager gets.

### 🔴 Which tabs can hide their own list — two, not four

**Domain Support and Logic Tables. That is the whole list.**

⚠ `HUB-NAVIGATION-GROUPING.md` §3 named **four** — adding Quizzes and Advisory Distinctions —
and it was wrong. Both have a rail; neither had a control to collapse it. Mike found it on the
running screen on 2026-08-19: *"you have a show menu/hide menu for all but only domain support and
logic tables have an additional 'hide list'. Please add the same feature to Quizzes page."*

✅ **Quizzes now has it**, built the same day, same words (**Hide list / Show list**), same
remembered choice. 🔴 **Each screen keeps its OWN localStorage key** — `ds:`, `lt:`, `fq:` — and
`firmQuizzes.component.test.js` fails if they are ever shared. One screen tidying another's list
away is the same fault as the menu collapsing itself.

🔴 **Advisory Distinctions deliberately does NOT get one**, ruled the same day: *"the others don't
need it due to layout"*. That is a decision, not an omission — do not "finish" it later.

### Traps that have actually bitten

1. 🔴 **A save can be refused by the database while the screen reports success.** Every store
   falls back to a local dev file when a query fails, and the test used to be "are we in
   production?" — so a genuine refusal looked like "there is no database". The fix
   discriminates on `sqlState`, which only a live server's rejection carries. **It is fixed, and
   the shape to preserve is that a real refusal is never absorbed.** A new tier scope still needs
   its reserved row in `firms` seeded, or its saves are foreign-key refused.
2. **A domain list drifted between two files.** A write landed in the gap between them. There is
   now a test so that gap cannot silently reopen — if you add a domain, both lists move.
3. **Own-row id prefixes must stay distinct per tier**, or one level switching off "its own" row
   drops another's.
4. **The `group` table in the schema is not a management tier.** It is a Collaborate special
   interest group.
5. 🔴 **A new tab that does not appear at every tier must be NAMED in
   [`../../tests/unit/mentorHubScope.component.test.js`](../../tests/unit/mentorHubScope.component.test.js),
   and the list is in TAB ORDER, not in the order the exceptions were ruled on.** That file
   guards the claim that a person who knows the firm screen recognises the mentor screen; it
   compares the two and fails on any tab present at one and not the other. **Appending the new
   name is the obvious move and it is wrong** whenever the tab is not drawn last — the assertion
   compares against the tabs in the order the screen draws them. Property Tax Rules sits after
   Coaching Reference, ahead of both existing exceptions, and appending it failed on 2026-08-18
   before the order was understood. ⚠ **A growing list here is the "same screen" claim being
   eroded a tab at a time**, so a new entry earns its own written reason.

### Known state

MySQL has never been provisioned, so every firm-editable block runs on its dev-file fallback and
**no override row exists in any environment**. That is why re-keying storage was cheap; it also
means nothing here has been proven against a real database. Say so rather than reporting a
screen as done.

---

## 5. Related briefs

[`tier-cascade.md`](tier-cascade.md) — what flows through this screen ·
[`advisory-distinctions.md`](advisory-distinctions.md) · [`quizzes.md`](quizzes.md) ·
[`advisor-progression.md`](advisor-progression.md) · [`adviser-network.md`](adviser-network.md).

**History:** [`firm-manager-hub-history.md`](firm-manager-hub-history.md)
