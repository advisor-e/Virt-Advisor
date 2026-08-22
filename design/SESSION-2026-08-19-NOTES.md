# Session Notes — 2026-08-19 · Laptop, Session 72

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,857 green / 325
> suites**, audit gate PASS.
>
> ✅ **A DESIGN SESSION. No application code was changed.** Three commits, all in `design/`.
>
> 🔴 **A live defect was found and is NOT fixed** — see §3.

---

## 🔴 FIRST TASK NEXT SESSION

**Build item 4.23 — the Firm Manager Hub sidebar.** The design is approved and committed;
open [`HUB-NAVIGATION-GROUPING.md`](HUB-NAVIGATION-GROUPING.md) and
[`mockups/hub-navigation-grouping.html`](mockups/hub-navigation-grouping.html) **beside the
build and name every difference.**

Mike deliberately left the build for a fresh session. It was not blocked and nothing about it
is uncertain — the session had simply run long enough that a large refactor was better started
clean.

⚠ **And still carried from session 71: Mike has NOT seen the Property Tax Rules tab.** It was
this session's first task. The conversation about *where* that tab belongs overtook it and
settled the placement — it stays in the hub, under **Model Inputs** — without anyone ever
settling whether the screen itself looks right. **One look, not a working session.**

---

## What happened

Mike raised the hub unprompted: *"why are the property tax rules listed as a page in the firm
manager hub??? … the hub is getting overwhelming for a firm manager"*.

That opened into a full navigation design. **He proposed the answer himself** — *"simply making
a side bar with names under each other vs a sliding banner with tabs across a page which forces
you to scroll is probably half the confusion fix"* — and the reasoning behind it is the sharp
part: a horizontal band does not merely look cluttered, it puts items **past the edge of the
page**, so a manager cannot see what they have not scrolled to.

### 1. The complaint was understated, and pointed at the wrong tier

| Hub | Tabs |
| --- | --- |
| Firm manager | **11 — the lightest** |
| Mentor | 12 |
| Group manager | **14** |
| Global group manager | **14** |

The crowding is worst at the two tiers nobody was looking at. ⚠ **The code comment in
`FirmManagerHub.vue` still says "each middle hub 12 tabs"** — stale by two.

### 2. 🔴 The grouping that nearly shipped as a falsehood

The first draft split the AI-facing tabs into *"what the AI draws on"* (Domain Support,
Distinctions, Coaching Reference) and *"how advice is chosen and delivered"* (Logic Tables,
Advisory Staircase, Logic-Lab).

**Mike rejected it on sight:** *"sends the message that AI is not working across the logic
tables and advisory staircase — which is NOT true."*

He is right and it is verifiable in one grep: `server/advisorEngine.js` — the prompt builder —
loads domain support, distinctions, coaching, logic trees **and** the staircase. All six.

🔴 **A navigation heading is a permanent claim about how the system works.** That one would have
taught every new manager something untrue, from the menu, forever. **Nothing in the 5,857-test
suite could have caught it** — the split was internally consistent, well documented, and wrong.
It was caught because the product owner read it.

It failed a second time on the detail: **Coaching Reference is not content.** Its own file calls
it *"the guidance the model reads when it chooses which template to put in front of a client"* —
a decision. So the honest split was two and four, and a group of two is too thin to earn a
heading. **The six are now one group**, because the true sentence about all six is the same
sentence: everything here teaches the AI. It also matches the door managers arrive through —
**"Manage AI Coach"**.

### 3. 🔴 A duplicate found while drawing it — LIVE, approved, NOT FIXED

**Above the firm tier, two tabs return the identical list of cases.**

- `cases.js` `listFirmCases`, non-firm tier → `withOrigin(listSharedWithMentor(firmId), firmId)`
- `mentor.js` `listMentorCases` → `withOrigin(listSharedWithMentor(req.firmId), req.firmId)`

Same store call, same decoration, same scope. A group manager and a global group manager open
**Team Case Studies** and **Case Reviews** and find the same cases in both. Only the firm
manager's version genuinely differs — theirs is `listSharedForFirm`, their own advisers in full.

⚠ **This is not a regression.** `listFirmCases` was deliberately widened above the firm on
2026-08-12 to stop a middle tier being shown an empty list. That fix was correct. What it
created, unnoticed, was an overlap with a tab that already did the job at those tiers.

🔴 **When it is fixed, that reason must go in the code** — otherwise someone restores it in six
months believing a bug crept back.

### 4. Decision 5 dissolved decision 4

The two case tabs were to be renamed because a group manager saw both and could not tell them
apart. Drop the duplicate and **no tier ever sees both**. The rename was **withdrawn, not
carried out** — both names stay exactly as they are.

The rejected options stay in the design file marked **history, not pending work**, with a
written instruction not to "finish" it later. A reader finding two proposed names and no rename
in the code is looking at a decision, not an omission.

---

## The rules earned, and where they now live

**Not in this note.** A rule left in a session note is a rule nobody finds.

- [`features/firm-manager-hub.md`](features/firm-manager-hub.md) §4 — the duplicate as a live
  defect; the approved navigation grouping, **explicitly labelled NOT BUILT** so nobody
  describes the hub as having a sidebar before it does; and the two build rules (the menu never
  collapses itself; the six are one group and any split states a falsehood).
- [`HUB-NAVIGATION-GROUPING.md`](HUB-NAVIGATION-GROUPING.md) — the whole design, the five
  decisions, and the instruction not to harmonise the heading capitalisation.
- [`features/to-do.md`](features/to-do.md) — **new item 4.23**, and the note that its score is
  provisional.

**Two headings are Mike's own words:** **"Your Team In Action"** and **"Model Inputs"**, neither
from the options offered. Harmonising their capitalisation was put to him and **declined** —
*"no — keep capitals etc as you have them."* It does not show anyway: Bulma's `.menu-label`
carries `text-transform: uppercase`, so every heading renders as small capitals whatever case it
is typed in.

---

## 🖥 FOR THE DESKTOP

✅ **Nothing here can conflict with a Course Builder build.** No component, route, test or data
file was touched. Every change is a document.

⚠ **One file to know about if you touch the hub:**
[`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue) is about to be substantially
rewritten by item 4.23 — the tab band becomes a `b-menu` sidebar and every tab reorders. **No tab
body changes**, but the two guard tests (`mentorHubScope.component.test.js`,
`hubTabTiers.test.js`) will have their lists rewritten. If your branch touches that component,
say so before 4.23 starts.

**New files:** `design/HUB-NAVIGATION-GROUPING.md`,
`design/mockups/hub-navigation-grouping.html`, and this note.
**Also touched:** `design/ARTEFACTS.md`, `design/features/firm-manager-hub.md`,
`design/features/to-do.md` + `to-do-items.json`, `design/ACTIONS.md`.

---

## ☐ Open for Mike

1. 🔴 **Open the Property Tax Rules tab** — carried from session 71, and now carried twice. One
   look. The app was running this session and it still did not happen.
2. **Score item 4.23.** It went on the list at 4, which is the §2 reading of a user enhancement,
   **not a judgement he made**. It sits last so it does not jump his order.
3. **Send the release email** — [`RELEASE-v0.9.0-EMAIL.md`](RELEASE-v0.9.0-EMAIL.md). Sending it
   as written also closes item **3.5**. 🔺 **carried from session 67.**
4. **Where the engagement types live** — the only part of 4.16 still open. 🔺 **carried eight
   sessions.**
5. **4.22 · whether purchase costs are non-deductible in year 1** — needs an accountant's answer,
   not a developer's.
6. **Whether a firm may REMOVE an inherited diagnostic situation.** Carried from session 65.
7. **The "Ceiling history" button** — covers two settings, names one. Carried from session 64.
8. **4.12 · where the corrected handover lives** — carried **fourteen** sessions.
9. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **fourteen**
   sessions.
10. **The template picker on a firm's own coaching entry** — carried from session 60.

⚠ **Items 8 and 9 have now been carried for fourteen sessions each.** Neither needs a working
session.

---

## Housekeeping

- **The live list is ELEVEN**, up from ten. Nothing was finished this session, so nothing moved
  to [`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md).
- **The artefact register caught a real gap.** `designArtefacts.test.js` failed the first commit
  because the new mockup had no row in [`ARTEFACTS.md`](ARTEFACTS.md). That ratchet exists
  because the Logic-Lab design went missing, and it worked exactly as intended.
- 🔴 **The group tier still cannot be exercised by a real login.** Unchanged from session 71, and
  it matters to 4.23: the duplicate being fixed is a *group and global* tier behaviour, so the
  fix will be proven by tests against a seeded membership map, not by a live screen. **Say so
  rather than reporting it as done.**
- **The dev servers were started this session** and left running.
