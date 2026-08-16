# Session Notes — 2026-08-17 · Laptop, Session 67

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, pushed. Suite **5,745 green /
> 321 suites**, lint 0 errors, audit gate PASS, `nuxt build` exit 0 with zero warnings.
>
> ✅ **4.16 ITEM F IS BUILT.** ⏳ **v0.9.0 IS PREPARED AND WAITING ON ONE CLICK** — PR #44.

---

## 🔴 THE ONE THING OUTSTANDING

**[PR #44](https://github.com/advisor-e/Virt-Advisor/pull/44) needs merging, then
`v0.9.0` tagging on the merge commit, then the hash backfilling into the ledger row.**

The merge was attempted and **refused by the permission guard on this machine** — not by
any rule in this repo, and nothing is wrong with the release. Everything up to the merge
button is done: notes written, version stamped, ledger row written ahead and marked
not-yet-cut, branch pushed, PR open, all four gates green on the head commit.

```
gh pr merge 44 --merge
git checkout master && git pull
git tag -a v0.9.0 -m "Release v0.9.0" && git push origin v0.9.0
```

Then put the merge-commit hash into the `v0.9.0` row of
[`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md), which is written and waiting for it.

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

## ⚠ Found on the way — NOT this item, and nobody is on it

🔴 **The engine can route a question to the wrong coaching tree, and the AI then INVENTS
content that reads as authored.** A Dashboard Discussions question routed to the **Ratio
Analysis** tree, and the model produced its own plausible "tactical options" and
"discussion questions" rather than saying it had none for that metric. The authored content
was correct and reachable; the wrong guide was picked, and the model filled the gap.

**It is tree detection, not the guides** — but inventing content that reads as authored is
the same failure family this whole item exists to close. It is written into
[`RELEASE-NOTES-v0.9.0.md`](RELEASE-NOTES-v0.9.0.md) §4a so the master team is not
surprised by it. **It is not on the to-do list and it is not scored** — that is Mike's call,
not ours, and it is named here rather than filed quietly.

---

## ☐ Open for Mike

1. **Merge PR #44 and cut the tag** — the release he asked for, one click away.
2. **Where the engagement types live** — 18 authored fields, no page at any tier. **Now the
   only part of 4.16 still open**, and the one thing in it that cannot start without him.
   🔺 **carried four sessions.**
3. **Whether the mis-routing above deserves a place on the list** — see the section above.
4. **Whether a firm may REMOVE an inherited diagnostic situation** — today it cannot.
   Carried from session 65.
5. **The "Ceiling history" button** — covers two settings, names one. Carried from session 64.
6. **4.12 · where the corrected handover lives** — carried **ten** sessions.
7. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **ten**
   sessions.
8. **The template picker on a firm's own coaching entry** — carried from session 60.

⚠ **Items 6 and 7 have now been carried for ten sessions each.** Neither needs a working
session.

---

## Housekeeping

- **The dev servers were stopped** to run `nuxt build` (they share `.nuxt`). `npm run go`
  restarts both.
- **A test firm edit was saved and then reset** during live verification;
  `data/dev-firm-method-guides.json` is back to empty. The machine was left as found.
