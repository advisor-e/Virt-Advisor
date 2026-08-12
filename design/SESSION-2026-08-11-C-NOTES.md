# Session Notes — 2026-08-11 · Laptop, Session 44

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,000 green / 292 suites**, lint 0 errors, **44 ahead / 0 behind `master`**, level with the
> remote at `4dfc3d2`.
>
> ⚠ **A BACKEND RESTART and a FRONTEND REBUILD are needed** wherever the app runs — route,
> middleware and locale changes. A running Restify process holds the old code.

---

## 🔴 THE ONE THING TO READ — a loose name is not a cosmetic problem

Two tier values had been carrying loose spellings: the global-group tier had **dropped the word
"group"**, and the bottom of the tree was **named after one person rather than the entity**.

Mike ordered both renamed, and his reasoning is the record:

> *"go back through the entire cascade code and change all roles to exactly what the stated role
> is … and NEVER allow this to shift. this is sloppy work and it's how fuck ups occur."*

> *"a business entity may have more than 1 person/client"*

**He is right on the evidence of this same session.** The shortened global-group value produced an
**invented job title twice within an hour** — a title that does not exist, used confidently in
front of the owner, because the short form sounded like a real one and nothing in the repo marked
it as wrong. That is the whole failure mode in miniature: a coined name sounds authoritative, gets
repeated back, reaches a document, and then nobody can tell which names are real.

**The vocabulary, and it does not shift:**

| Spoken | Code value | What it is |
|---|---|---|
| mentor | `mentor` | Advisor-e itself, the platform owner |
| global group manager | `global_group_manager` | runs a **global group** — a brand (Advisor-e, BDO, Lindt & Co) |
| group manager | `group_manager` | runs a **group** — normally a country inside that brand |
| firm manager | `firm_manager` | runs a **firm** — a branch |
| advisor | `advisor` | the person in front of a business entity |
| business entity | `business_entity` | the entity advised — it has people; a client is one of them |

⚠ **Deliberately NOT renamed, and a future sweep must not "finish the job":**
`loadPrompt('client')` is a **prompt filename** and `mode: 'client'` is a **conversation mode
stored in the database**. Neither is a tier. All 21 uses of the string were read before any was
touched — a blanket replace would have corrupted stored rows.

🔴 **The control, because "never allow this to shift" is not something a comment can do:**
[`tierVocabulary.test.js`](../tests/unit/tierVocabulary.test.js) pins the six exact strings,
asserts the two **separate** tier lists in [`roles.js`](../server/collaborate/data/roles.js) and
[`tierChain.js`](../server/utils/tierChain.js) genuinely agree — a claim `tierChain`'s comment had
been making for months with **nothing checking it** — and scans every source file for the
superseded spellings.

🔴 **`design/` is inside that scan, and that is the half that mattered.** Six design documents
carried the old value, including the governing framework
[`ADVISOR-E-DESIGN-LOGIC.md`](ADVISOR-E-DESIGN-LOGIC.md). The code would have been corrected by
the next test run; **a document nobody tests would have kept teaching the wrong name
indefinitely** — and that document is where a fresh session goes to learn what the levels are
called.

**The guard proved itself immediately.** It failed on its first run and caught two hits in
comments written minutes earlier *to explain the rename*. Reworded to describe the old names
rather than spell them, so the scan needs no exemptions — an exemption is how a name creeps back.

---

## Case Reviews named no source at all

The feed carried `firmId` in its payload and **no screen displayed it**, so a manager opened the
tab to a stack of anonymous cards and could act on none of them. An alarm with no address.

**The proposal put to Mike was to REMOVE the firm identity. He rejected it:**

> *"if i am the group manager, how do i recognise which data relates to which firm? how can i help
> them if i dont know who they are??"*

[`ADVISOR-E-DESIGN-LOGIC.md`](ADVISOR-E-DESIGN-LOGIC.md) §2 settles it — reports roll up so we can
see *"who is failing so we can offer help"*. **Anonymisation here protects the business entity, not
the firm.** ⚠ §4.4 records the identical confusion being made on 2026-08-10: applying an outside
party's privacy boundary to the customer's own senior people. **That is twice.**

**The answer is a PATH, not a label** — `tierChain.originPathOf`. Element 0 is the level
immediately below the viewer (what the screen groups by, rule 7); the rest is the address inside
that group (§2). The two rules stop competing instead of one overruling the other.

✅ **It deepens by itself.** Built on `scopeChain`, so with no membership data the path is exactly
`[firm]` and the mentor sees firm names **because the firm genuinely is the level below it today**.
The mapping arriving turns the same code into three steps grouped by global group, with no second
change and no rule to revisit.

The **advisor stays stripped** and the **business entity stays anonymised**. Firm names come from
`firmsDirectory` — the same source the Adoption tab uses, so this does not become a third spelling
of the same firm.

Artefact: [`mockups/case-origin.html`](mockups/case-origin.html).

---

## The wording is ruled — Set B

Nine sentences said a case was shared "with the mentor". Mike chose **Set B**, which names the
levels. All nine now live in [`locales/en.json`](../locales/en.json) under `caseShare`.

They were not merely hardcoded, they were **untranslatable**: this app translates by sending the
English message set out at runtime, so a string sitting in a template reached **none** of the eight
languages. These nine now reach all of them.

⚠ **Raised and overruled, on the record.** Sentences 8–9 sit on `MentorReview.vue`, which **three**
tiers open, so Set B's *"the firms in your group"* is exact for a group manager and loose for the
mentor. Mike was shown that and reaffirmed Set B. The test pins it **with the reasoning attached** —
an apparent inconsistency with no record looks identical to a mistake and gets "fixed" by someone
who was not in the conversation.

---

## ⚠ Three things a future session should not take on trust

**1 · The artefact for the origin work was written AFTER the build.** The screen was described in
chat, approved in chat, and built; no file existed at the moment of approval. **That is a
Save-the-Artefact breach**, and it is the exact failure that rule was added for on 2026-08-01/02.
The mockup says so on its own face, so it cannot be mistaken for evidence of what was approved.

**2 · Pug templates are still not exercised by the suite.** Three templates changed this session
and all three were compiled by hand through `pug` + `vue-template-compiler`. ⚠
`ManagerConsole.vue` indents its whole template one level under the tag, so a naive extraction
fails to parse — dedent to the common indent first, and do not read that failure as a broken file.

**3 · Test files were edited in the rename, and that is a rename, not a weakening.** Seven test
files carried the old tier value as a literal. Every expectation is unchanged; only the identifier
moved. Said plainly because "the whole suite passed unmodified" would have been false.

---

## ☐ Open for Mike

- **Decide the mentor +2 / firm +3 tabs** the §2 matrix implies for the two hubs already live in
  UAT. Raised, not built. *(Carried from sessions 42–43.)*
- **Ask the master team for the two role values + which group a manager manages** — §5 of the hub
  artefact can be sent as it stands. ⚠ `mentor` was never added either. **Note the values have
  changed name on our side**: `global_group_manager`, not the shortened form. *(Carried 39–43.)*
- **Rule the 93 Template Check rows** — the queue stays empty until he does. *(Carried.)*
- **Reply to Carl about `npm install`** — v0.7.0 adds `@mdi/font`. *(Carried.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried.)*
- **Decide on the `/startup` change** in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
  *(Carried.)*
- ☐ **One firm, two spellings — adjacent, not caused here.** Adoption resolves real firm names;
  the **Logic-Lab Report still prints raw ids** (`server/routes/mentor.js`, `firmName: firmId`, and
  its own comment admits it). Case Reviews uses the directory so it is not a third spelling.
- **44 commits sit unmerged on this branch.** 🔴 **Mike ruled 2026-08-11: no PR to `master` until
  the task list is clear** — this is a known, accepted position, not an oversight. Do not re-raise
  it. The desktop is **not active**, so collision risk is nil for now.

---

## ⛔ What is left on the tier work is NOT ours

**Nothing calls `setFirmMembership`.** The reports and the new origin path both fill themselves the
day real data lands, with no code change — but the `firms` table has no group or country column and
no JWT carries the claims. Instructions are already in
[`config/db-schema.sql`](../config/db-schema.sql), the control at the point of use.

---

## On conflicts

**Shared files touched this session** — the desktop should merge `master` before going near any:

- [`server/utils/tierChain.js`](../server/utils/tierChain.js) · [`server/routes/mentor.js`](../server/routes/mentor.js) · [`server/middleware/firmAuth.js`](../server/middleware/firmAuth.js)
- [`server/collaborate/data/roles.js`](../server/collaborate/data/roles.js) · [`repository.js`](../server/collaborate/data/repository.js)
- [`server/utils/firmQuizzes.js`](../server/utils/firmQuizzes.js) · [`firmStaircase.js`](../server/utils/firmStaircase.js)
- [`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue) · [`MentorReview.vue`](../components/MentorReview.vue) · [`collaborate/shared/ManagerConsole.vue`](../components/collaborate/shared/ManagerConsole.vue)
- [`locales/en.json`](../locales/en.json) · [`locales/collaborate/en.json`](../locales/collaborate/en.json)

🔴 **The rename touched Collaborate.** If the desktop has work in flight there, it will conflict on
the tier value — **the resolution is always the new name**, never the old one, and
`tierVocabulary.test.js` will say so loudly if anyone resolves it the other way.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went near
them.

## Commits

- `3d21e89` — the case-share wording, Set B
- `4dfc3d2` — the role rename, its guard, and the Case Reviews origin path
