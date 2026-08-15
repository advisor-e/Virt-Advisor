# Session Notes — 2026-08-15 (E) · Laptop, Session 60

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,429 green / 309 → 313
> suites**, lint **0 errors**, `nuxt build` green, **52 ahead / 0 behind `origin/master`**,
> pushed and level with the remote.
>
> ⚠ **Application code was touched in five places:** `server/routes/firmManager.js` (7 new
> routes), `server/restify-server.js` (7 registrations), `server/utils/coaching.js` (one
> function), `components/FirmManagerHub.vue` (one tab), `locales/en.json` (47 strings).
> Three new files under `components/firm/` and `utils/`.

---

## 🔴 FIRST TASK NEXT SESSION — ask Mike, do not pick

**The live list is [`features/to-do.md`](features/to-do.md), and it is seven items.** Do **not**
rank it yourself; his order is in the file and his ordering rule is §3.

**Two carried items need him and nothing else:** **2.6** (one word: yes) and **2.9** (the
education-gate wording, his own design). **4.7** needs a *time*, not an answer — an overnight
window on this laptop for the reinstall. **4.12** needs two decisions (which repository, and
what it should describe).

✅ **THE RELEASE NUMBER IS SETTLED — do not raise it.** Mike, at the end of session 60: *"lets
sort the new release number when we've sorted all the tech issues, till then stay focused on the
tech issues for uat testing."* It is **sequenced after the technical list**, not waiting on him.
Recorded in [`features/to-do.md`](features/to-do.md) §3 and against **2.1** on the done page.

⚠ **It had been put to him in sessions 58, 59 AND 60** — three times, for a decision he had
already made by parking 2.1. **A decision that keeps being re-asked is a decision nobody wrote
down.** That is the whole reason a ruling goes in the Brief or the list, never only in a note.

---

## What happened

**Mike's instruction:** *"we finished halfway through a session, keep going from last task."*
The approved batch from session 59 was three items and had got two-thirds of the way. He chose
the coaching screen, and **item 4.9 is now closed end to end.**

### ✅ 4.9 — the visible half (`f98b681` → `af79304` → `9cd39c9` → `8d0ca29`)

Seven Restify routes, a Firm Manager tab, a pure row-builder, 47 approved strings, +88 tests.
Full closure on [`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2;
the durable rules are in the Brief, [`features/tier-cascade.md`](features/tier-cascade.md).

**The mockup was committed before it was approved** —
[`mockups/firm-coaching-reference.html`](mockups/firm-coaching-reference.html) — with every new
sentence listed at its foot, and **its two deviations named in the build commit** rather than
found later. Both are additions: Reset to platform is also offered on a switched-off entry that
still holds a firm edit, and Reset and Remove each confirm first.

### 🔴 THE FINDING, and it is worth more than the feature

**`howItHelps` and `deliveryNotes` reached nothing at all.** Authored in
`data/coaching-reference.json`, made firm-editable the session before, stored correctly by the
new routes — and rendered into **no prompt anywhere**. Both appeared nowhere else in the entire
backend. A firm could have rewritten the longest and most prominent field on its new tab and
changed **nothing** about the advice its advisers received.

**Nothing caught it because every test asked whether the field was SAVED, and none asked whether
it was USED.** It surfaced only by rendering the real prompt for a firm that had made a real
edit, through the running app, and reading it.

**Second instance of this exact shape** — the 55 logic-tree branches whose instruction sits
under a key `formatNodeForPrompt` never reads. Twice is a pattern, so it is now item **4.16**,
with its method prescribed: *render the prompt and read it, do not inspect the store.*

Mike ruled both fields must reach the AI. They now do.

### Three things that went right and are worth repeating

1. **The artefact register caught me.** `designArtefacts.test.js` refused the first commit
   because the new mockup had no row in `ARTEFACTS.md`. That control was built after the
   Handbook was rebuilt from a description of itself, and this is the first time a real
   addition tested it. It worked.
2. **The size guard was re-argued, not bumped.** The coaching block grew **8,483 → 12,846
   characters** in every eligible prompt and `coachingSelection.test.js` refused it at 12,000 —
   exactly its job. The ceiling moved with the new measurement, the date and the reason beside
   it, and still leaves room for about one entry so *adding* one trips it.
3. **The shared-renderer risk was checked BEFORE the change.** `formatEntry` also renders a
   firm's promoted case observations, which reach the model **fenced**. Promoted entries carry
   neither field, so the fix is present-only and they render byte-identically — pinned by test,
   along with the fence.

### Two of my own errors, recorded because the shape recurs

- **A test passed for the wrong reason.** `expect(text).toContain('Customised')` passed against
  the string `firmCoaching.tagCustomised`, because the harness stubs `$t` to return the key.
  Assert **keys**, never English — it also keeps the suite green through the i18n sweep.
- **I claimed content was real when four lines were mine.** The mockup said the rows were the
  real file; four one-line summaries were invented. Corrected before it was shown. The one
  invented row that remains — the firm's own entry — is **labelled as invented on the page**.

---

## ⚠ What is open, and honestly

1. **Nobody has clicked through the screen.** Tests prove the behaviour, `nuxt build` proves it
   compiles, and the routes were exercised against the running app with curl — but no one has
   looked at it. **The dev servers were left running** on 3000/4000.
2. **The dev data is deliberately dirty.** `dev-firm-coaching-{declines,overrides,own}.json`
   hold one edited entry, one switched off and one firm-own, so the tab shows all four states
   instead of fifteen identical rows. Gitignored. Delete the three files to reset.
3. **The template picker.** A firm's own entry names its template as **free text** and nothing
   checks it against the library, so a typo coaches the AI toward a template that does not
   exist. Named as absent on the approved mockup. **NOT filed as an item — Mike's to say.**
4. **Two Brief links are still broken** — `tier-cascade.md` → `collaborate.md` (never existed)
   and `to-do-done-and-parked.md` → `../STATUS.md` (deliberately deleted). Carried from session
   59. Told, not ruled. **Still not added to anything.**

---

## 🖥 FOR THE DESKTOP

**Nothing of yours moved.** Logic Lab and every page are as you left them.

🔴 **`components/FirmManagerHub.vue` WAS EDITED HERE** — one import, one entry in `components`,
one new `b-tab-item`. Three lines in three places. If you are touching the Hub, **merge
`master` first** once this lands; it is the file the two machines collide on most.

🔴 **`server/utils/coaching.js` `formatEntry` now renders two more fields.** If you add anything
that goes through it, remember it serves **both** the trusted platform rows and the **fenced**
promoted case observations. The fields are present-only for exactly that reason.

**Four new files you will not have:** `components/firm/FirmCoachingReference.vue`,
`components/firm/FirmCoachingEntryForm.vue`, `utils/coachingRows.js`, and the coaching mockup.

---

## ☐ Open for Mike — one new, three carried

**The release number is NOT on this list.** It was settled at the end of this session — see the
first-task block above. ✅

1. **4.12 · where the corrected handover lives, and what it describes** — carried.
2. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried.
3. **2.6 · `advisor_note`** — one word: yes. Carried.
4. **2.9 · the education-gate wording** — his own design. Carried.
5. 🆕 **Whether the template picker becomes an item** — see "What is open" §3.

⚠ **Note the shape of items 3 and 4: both are one sentence from Mike and both have been carried
for several sessions.** Neither needs a working session. If a session opens and he is available,
ask those two first — they are the cheapest things on the list to close.
