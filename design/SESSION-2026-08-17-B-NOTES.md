# Session Notes — 2026-08-17 · Laptop, Session 67

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, pushed, and **level with
> `master`**. Suite **5,749 green / 321 suites**, lint 0 errors, audit gate PASS,
> `nuxt build` exit 0 with zero warnings.
>
> ✅ **4.16 ITEM F IS BUILT.** ✅ **v0.9.0 IS CUT, TAGGED AND PUSHED.**

---

## ✅ THE RELEASE IS DONE — nothing is outstanding

**`v0.9.0` is tagged on `d4284e6`**, the merge commit of
[PR #44](https://github.com/advisor-e/Virt-Advisor/pull/44), confirmed on `origin`. The
ledger row in [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md) carries the hash. The email
telling the master team is drafted and saved at
[`RELEASE-v0.9.0-EMAIL.md`](RELEASE-v0.9.0-EMAIL.md) — **Mike had not sent it when this
note was written**, so that is the one loose end, and it is his to close, not ours.

⚠ **`master` and this branch are level.** The pre-push hook caught the branch sitting one
commit behind after the merge; `master` was merged back in and the suite re-run green
before the tag was pushed. **Nothing was pushed with `--no-verify`.**

⚠ **An earlier version of this note said the merge was blocked and left instructions for
finishing it. That is withdrawn — it is done.** Recorded here rather than quietly deleted,
because a handover that silently changes its mind is worse than one that says it did.

---

## What shipped

Two commits: `6ae9778` item F, `2df3e7f` the release preparation.

### 1. Item F — the thirteen method guides

🔴 **Read [`METHOD-GUIDES-SCREEN.md`](METHOD-GUIDES-SCREEN.md) §10 before touching any of
it.** That section is the build put beside the approved artefact with every difference
named, as CLAUDE.md requires. **All four wordings and the tier ruling shipped exactly as
Mike gave them.**

**One walk replaces thirteen hand-written formatters** (`server/utils/methodGuides.js`),
and the same walk builds the prompt *and* the screen, so they cannot disagree.

**967 authored strings across the thirteen, 0 missing from the prompt** — up from 838 of
954. It is 967 rather than 954 because each guide's own `description` is now emitted too.

**Three differences from the artefact, all deliberate:**

1. 🔴 **Only THREE of the five "shared" guides really are shared.** §3's table was proposed
   by name and never checked. `org-firm-strategy` carries *"Growth Curve Checklist"* and
   `get-sales-tracker` carries *"Stats to Date Dashboard"* — **different artefacts, not
   other names for these guides.** Neither is mapped. The other three second rows do exist
   and are mapped.
2. **Overrides live in their own `method-guides` bundle keyed by GUIDE id**, not per
   domain — or the screen's own *"an edit here changes it there too"* would be false.
3. **Numeric fields render read-only.** Found by opening the real conflict guide on the
   running app: a stage number was a box you could type into, whose save the backend
   refuses. The same pass fixed item headings — the conflict guide's three facilitator
   pillars were headed "1", "2", "3" with *"The Person"* buried inside as a field.

### 2. v0.9.0 prepared

[`RELEASE-NOTES-v0.9.0.md`](RELEASE-NOTES-v0.9.0.md), version stamped to `0.9.0`, ledger
row written. 85 commits since v0.8.0 — which was cut on 2026-08-13 and **never pulled**, so
this covers both. **No `npm install`:** no dependency added, removed or moved.

---

## 🖥 FOR THE DESKTOP — read before pulling

🔴 **`server/utils/logicTrees.js` lost ~900 lines.** The thirteen
`format*ReferenceForPrompt` functions are gone as hand-written bodies and are now one line
each over `methodGuides.formatGuideForPrompt`. **They keep their names and their exports**,
so nothing calling them breaks — but if you have edited any of those thirteen on your
branch, your change is in a block that no longer exists and the merge will need care.

⚠ **Do not add a fourteenth hand-written formatter, and do not add a field to one of these
by hand.** A new guide is a row in `methodGuides.GUIDES`; a new field is a key in the JSON
and needs no code at all. Adding one by hand is the exact pattern that lost the 116 lines.

**New files:** `server/utils/methodGuides.js`, `server/utils/methodGuideConfig.js`,
`components/firm/MethodGuidePanel.vue`, `components/firm/MethodGuideSection.vue`, four test
suites, and this note. **Touched:** `logicTrees.js`, `firmContent.js`, `firmManager.js`,
`restify-server.js`, `advisorEngine.js`, `courseEngine.js`, `FirmDomainSupport.vue`,
`locales/en.json`, `.gitignore`, `package.json`.

`logic-lab` untouched.

---

## ⚠ Found on the way — now item 4.18 on the live list

🔴 **The engine can route a question to the wrong coaching tree, and the AI then INVENTS
content that reads as authored.** A Dashboard Discussions question routed to the **Ratio
Analysis** tree, and the model produced its own plausible "tactical options" and
"discussion questions" rather than saying it had none for that metric. The authored content
was correct and reachable; the wrong guide was picked, and the model filled the gap.

**It is tree detection, not the guides** — but inventing content that reads as authored is
the same failure family this whole item exists to close. It is written into
[`RELEASE-NOTES-v0.9.0.md`](RELEASE-NOTES-v0.9.0.md) §4a so the master team is not
surprised by it.

✅ **Mike ruled it onto the list the same session** — *"if you found this problem then yes -
it gets put on the to do list"* — and it is now **4.18**, scored **4**, in
[`features/to-do.md`](features/to-do.md) §6 and `to-do-items.json`. **Appended, not ranked:
his order is his, and inserting it would have moved one of his rows.** The page says the
last position is not a judgement.

🔴 **TWO HALVES, AND THE SECOND IS THE ITEM.** Better routing reduces this and can never
remove it — some questions are genuinely ambiguous. **The fault worth fixing is that the
model does not say "I do not have that for this method."** Do not close 4.18 on a routing
tweak alone, and verify it the way 4.16 was verified: a real question on the running app,
compared word for word against the source. **Every automated test here passes on an answer
the model made up.**

---

## ☐ Open for Mike

1. **Send the release email** — drafted and saved at
   [`RELEASE-v0.9.0-EMAIL.md`](RELEASE-v0.9.0-EMAIL.md), not sent when this note was
   written. Its closing section also answers Carl's `npm install` question (**item 3.5**),
   so sending it as written closes that item too.
2. **Where the engagement types live** — 18 authored fields, no page at any tier. **Now the
   only part of 4.16 still open**, and the one thing in it that cannot start without him.
   🔺 **carried four sessions.**
3. **Whether a firm may REMOVE an inherited diagnostic situation** — today it cannot.
   Carried from session 65.
4. **The "Ceiling history" button** — covers two settings, names one. Carried from session 64.
5. **4.12 · where the corrected handover lives** — carried **ten** sessions.
6. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **ten**
   sessions.
7. **The template picker on a firm's own coaching entry** — carried from session 60.

⚠ **Items 5 and 6 have now been carried for ten sessions each.** Neither needs a working
session.

---

## Housekeeping

- **The dev servers were stopped** to run `nuxt build` (they share `.nuxt`). `npm run go`
  restarts both.
- **A test firm edit was saved and then reset** during live verification;
  `data/dev-firm-method-guides.json` is back to empty. The machine was left as found.
