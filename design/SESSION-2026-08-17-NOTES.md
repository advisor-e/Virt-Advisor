# Session Notes — 2026-08-17 · Laptop, Session 66

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,615 green / 317 suites**.
>
> ✅ **4.16 ITEM F — THE DESIGN IS SETTLED. THE BUILD IS NOT STARTED.** Every question F was
> blocked on is answered and committed. **No application code changed this session.**

---

## 🔴 FIRST TASK NEXT SESSION

**Build item F.** Read [`METHOD-GUIDES-SCREEN.md`](METHOD-GUIDES-SCREEN.md) and
[`mockups/method-guides.html`](mockups/method-guides.html), then build to them.

⚠ **DO NOT re-derive and DO NOT re-ask.** The artefact, all four wordings and the tier ruling are
Mike's, given on 2026-08-17 and recorded with the options he turned down beside them. Also do not
re-raise: the education-gate wording (session 61), the release number (sequenced after the tech
list, session 60), the "ten empty domains" (they are not empty, session 63), or deleting the 55
diagnostic branches (cancelled by evidence, session 65).

**What the build is**, from §7 of the artefact:

1. **One shared walker** over a guide's own structure, feeding **both** the prompt formatter and the
   screen. It replaces the thirteen hand-written formatters in `logicTrees.js` — it does not join
   them.
2. **The 116 dropped lines start reaching the AI** as a consequence of that walker.
3. **The guide opens from its material row** on the Domain Support tab, saved through the tab's
   existing override bundle — same mechanism as items B and C.
4. **A 13-line guide→row mapping authored in the open.** It exists nowhere today.
5. **Tests**: every authored string in all thirteen reaches the prompt; a firm's edit reaches it
   fenced; an unanticipated section still renders; a failed read serves the platform text.
6. **Then open a real session** in Dashboard Discussions, Working Capital Cycle and Ratio Analysis
   and read what comes back. The suite proves the lines arrive; only the running app shows whether
   the advice moved the right way.

---

## What shipped

Three commits, all documentation: `0398826` the artefacts, `33e1859` the wording choices, `e9cd3f6`
the tier decision.

### 1. The artefact F could not start without

[`METHOD-GUIDES-SCREEN.md`](METHOD-GUIDES-SCREEN.md) + [`mockups/method-guides.html`](mockups/method-guides.html),
registered in [`ARTEFACTS.md`](ARTEFACTS.md). Worked example is the real `conflict` domain with its
real authored text. Published at
https://claude.ai/code/artifact/9a3a654d-0266-45dc-9bc9-1df926b2ab51

### 2. 🔴 Two things the spec said, and the files did not

**It is THIRTEEN guides, not twelve.** `powerful-seminars.json` is not named `*-reference.json`, so
a file-pattern sweep missed it. `LEARN_REFERENCE_FORMATTERS` registers it beside the other twelve
and treats it identically. **A count taken from a filename pattern is a count of filenames.**

🔴 **They are NOT "read by the AI in full" — 116 of 954 authored lines reach no prompt.** Measured
by rendering each guide's own block and searching it for every authored string over 25 characters:

| Guide | Authored | Missing |
|---|---|---|
| dashboard-discussions | 170 | **62** |
| working-capital-cycle | 83 | **29** |
| ratio-analysis | 77 | **20** |
| the other ten | 624 | 5 |

Not filler. Every one of Dashboard Discussions' twelve metrics carries the `discussion_questions` an
advisor puts to the client, and its `tactical_options`; neither is emitted. Working Capital Cycle
emits each problem type's trigger and drops its `causes` — the symptom without the diagnosis.

⚠ **The 4.16 sweep counted all thirteen as reaching the prompt because the formatter exists.** That
is 4.16's own fault one level below where 4.16 looked. It is why F stopped being only a screen:
**a screen alone would have shown a firm text the AI does not receive and implied that it does.**

### 3. Mike's decisions, all four wordings and the tiers

| | Chosen |
|---|---|
| Control on the framework row | **The detail behind this framework** |
| Heading over the open guide | **What your advisors' AI is taught about this method** |
| Where a guide serves two domains | **This guide is also used by _X_. An edit here changes it there too.** |
| Facilitation 101 | **Its own entry above the domains — "Applies to every domain"** |
| **Who sees it** | **The same tiers as the materials table it opens from** |

🔴 **The tier answer is the OPPOSITE of item B's**, which was ruled mentor-only on 2026-08-16
(*"too technical for a firm or global manager"*). B is routing logic; a method guide is ordinary
advisory prose sitting in the panel where a firm already edits the materials table. **It was asked
rather than carried across, and asking changed the answer.** Do not assume the next block on that
tab inherits either ruling.

⚠ **The mockup was drawn showing option A of each and one choice went the other way.** It was
corrected the same day rather than left disagreeing with an approved wording.

---

## ⚠ What is open, and honestly

1. **F is designed and unbuilt.** That is the whole of next session.
2. **Item D still has no page at any tier** and cannot start without Mike. 🔺 **carried three sessions.**
3. **The release Mike asked for in session 65 was still not created.**
4. **The guide→row mapping exists nowhere in the data.** Twelve were matched by name in the artefact
   and need confirming as they are written down; **Facilitation 101 has no row anywhere.**
5. **Carried, untouched from sessions 61–65:** six ghost template references logged at every startup;
   two broken Brief links (`tier-cascade.md` → `collaborate.md`, `to-do-done-and-parked.md` →
   `../STATUS.md`); the Coaching Reference still has no Brief; `ARTEFACTS.md` still shows 2.6 as
   "☐ awaiting approval"; ~100 Handbook links point at documents with no page. **Now seven sessions.**

---

## 🖥 FOR THE DESKTOP

✅ **No application code changed. Nothing here can conflict with a build.** `logic-lab` untouched.

🔴 **Two Briefs gained rules that apply to work you may be doing:**

- **`domain-support.md` P3c** — a method guide surfaces on that tab from its framework row, at the
  same tiers as the materials table. **Trap 6** — a formatter that lists its fields by hand goes
  quiet on anything authored later.
- **`logic-tables.md` P2c** — the thirteen guides are *formatted* in `logicTrees.js` and *screened*
  on Domain Support. **Trap 6** — "the file reaches the AI" does not mean its contents do.

⚠ **If you touch `server/utils/logicTrees.js`, know that the thirteen
`format*ReferenceForPrompt` functions are due to be replaced by one shared walker.** Adding a
fourteenth, or adding a field to one of them by hand, is work that will be thrown away — and it is
the exact pattern that lost the 116 lines.

**New files:** `design/METHOD-GUIDES-SCREEN.md`, `design/mockups/method-guides.html`, and this note.

---

## ☐ Open for Mike

1. **Where the engagement types live** — 18 authored fields, no page at any tier. The one 4.16 item
   that cannot start without him. 🔺 **now carried three sessions.**
2. **Whether a firm may REMOVE an inherited diagnostic situation** — today it cannot. Carried from
   session 65.
3. **The "Ceiling history" button** — covers two settings, names one. Carried from session 64.
4. **4.12 · where the corrected handover lives** — carried **nine** sessions.
5. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **nine** sessions.
6. **The template picker on a firm's own coaching entry** — carried from session 60, never ruled.

⚠ **Items 4 and 5 have now been carried for nine sessions each.** Neither needs a working session.
