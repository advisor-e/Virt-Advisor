# Session Notes — 2026-08-23 · Laptop, Session 82

> **Branch `feat/advisor-progress`.** Suite **329 suites / 6,127 tests green**, lint 0 errors,
> tree clean, everything pushed.
>
> **Two items closed: 4.16 and 4.35.** One new item raised: **4.36**. Eleven live items remain,
> three of them needing Mike.
>
> 🔴 **`v0.10.0` is still awaiting pull by the master team.** Unchanged from sessions 80 and 81:
> Mike parked the email, and the ledger row records it as *Awaiting pull*. Nothing here changes
> that, and this session added two screens on top of it.

---

## 🔴 FIRST THING THE DESKTOP MUST DO

**Merge `master`, then `npm install`** — session 80's instruction still stands and has not been
superseded (`playwright` was added as a devDependency; `package-lock.json` changed).

This session added **no dependency** and touched **no shared configuration**.

⚠ **But it did add a file the desktop will not have: `data/productive-habits.json`**, and it
changed `server/utils/methodGuides.js` and `server/utils/logicTrees.js`. If Course Builder work is
touching either of those two files, take this version — the reasons are below and in the code.

---

## What shipped

| Commit | What |
|---|---|
| `06368e0` | the way into the Model Guide is a button, not a line of prose |
| `341402f` | **4.16 D** — The 3 Engagement Types: its own page, and the AI reads it |
| *(this one)* | **4.35** — Learning Psychology, the third standing page; **4.36** raised; the records |

---

## 1. The two new pages, and the one rule behind both

Domain Support's *Applies to every domain* group now holds **three pages, in this order**:

```
Facilitation 101          (shipped 2026-08-17)
The 3 Engagement Types    (new — item 4.16 D)
Learning Psychology       (new — item 4.35)
```

🔴 **"Under" means LISTED BENEATH, not OPENED FROM.** Mike said this three times before it was
built the way he meant it — the first build read "under Facilitation 101" as *inside* it. Each of
the three is its own page, reached from the list. **A future change that nests one inside another
is a regression**, and `tests/unit/methodGuides.test.js` fails on the order.

The screen needed **no change at all** for either page: `FirmDomainSupport.vue` already read a
`standing` flag from the data and its own comment said *"a second standing guide would need no
change here"*. That seam was left open in session 65 and this is the first use of it. Both pages
are a row in `methodGuides.GUIDES`.

---

## 2. 🔴 An item sat seven days on a question nobody asked

4.16 D was the last open part of the 102-field sweep. Its own text said *"Mike must rule where it
lives before anything starts"* — and it was carried, unasked, through four sessions of notes,
including 2026-08-21's explicit *"still carried … where the engagement types live"*.

When he was asked, he answered in one sentence.

**An item blocked on a question nobody puts is not blocked; it is forgotten.** Worth a rule for the
next session: an item marked *waiting on Mike* for more than one session either gets put to him or
it is not really waiting on him.

---

## 3. 🔴 And that item's own record was false while it sat there

4.16's `why` said part F — the thirteen method guides — *"DESIGN IS NOW SETTLED AND BUILD IS NOT
STARTED"*. **F shipped on 2026-08-17.** It was verified today by opening those screens in a real
browser at four tiers.

So the live list told Mike the item needed **him**, while half of what it named was already built.

**This is the third instance in three sessions:** 4.26's guard that accepted a passing mention as a
closure, session 81's Brief that denied a screen built the day before, and now this. The shared
cause is unchanged and worth stating again: **nothing compares the record to the code.** Session
81 guarded exactly one prose sentence with a test; everything else is still unguarded.

---

## 4. Learning Psychology — what it is, and what is deliberately unfinished

Mike's words: *"the drivers of human performance, reaction to learning and 5 steps in making a new
habit — as a separate editable page."* He named it **Learning Psychology** the same afternoon.

🔴 **The content is TRANSCRIBED, NOT AUTHORED** — from `Productive Habits.pdf` (the master app's
own template, `data/templates.json` index 27), because the item said so in terms. The PDF's font
subset drops its ligatures; it literally reads *"e ectiveness"*, *"Re ections"*, *" nish line"*.
Those are repaired, nothing else changed, and **tests fail if the holes come back** as well as
pinning the exact source sentences — so nobody can quietly rewrite the master app's wording into
something more fluent.

⚠ **THE PAGE IS `Learning Psychology`; THE RECORD IS STILL `productive_habits`,** and the data file
keeps its name. The id is the storage key a firm's saved wording is filed under — renaming it with
the page would orphan every override saved before the rename, silently. **Do not "tidy" this.**

⚠ **OPEN, AND IT IS MIKE'S CALL:** the page reaches the AI **only** alongside Facilitation 101's
learn reference. At ~6,000 characters, putting it on every client recommendation is a real cost and
was not made a default.

⚠ **A DUPLICATION WAS FOUND AND NOT RESOLVED.** The five drivers are also defined in
`data/staff-domain-support.json` (the *"5 Drivers of Human Output — Performance Diagnosis"* row),
where they serve a diagnosis. Learning Psychology carries the source definitions that row
paraphrases. Two copies is how content drifts apart in this repo. **Recorded, not reconciled.**

---

## 5. New item — 4.36, and it was reproduced before it was written down

Mike: *"the search function in the models summary is too literal. I typed 'Investing in houses' and
it failed to find the property assessment model."*

Reproduced in the running app the same hour, and it is worse than the one phrase:

| Typed | Result |
|---|---|
| `Investing in houses` | no models match |
| `houses` | no models match |
| `investment property` | no models match |
| `property` | 1 model — the right one |

**Two faults.** `haystack(m).includes(q)` matches the query as ONE whole phrase, so *"investment
property"* fails though both words are present; and nothing maps an advisor's vocabulary onto the
page's. ⚠ **The tempting fix is the wrong one:** with ~18 models a confidently wrong match is worse
than a miss, because the advisor carries it into a client meeting.

---

## 6. ⚠ What this session did NOT do

**No artefact was saved for either new screen.** A mockup of the button was offered and declined
(*"just get it done"*), and none was drawn for the two pages. **That is the `save-the-artefact`
rule not being met** — recorded rather than left silent. Both were instead verified by driving a
real browser at all four tiers, which is evidence of what shipped, not of what was agreed.

**The 5-Drivers duplication and the Learning Psychology prompt placement are both open questions
for Mike**, named above.

**`v0.10.0` is still not with the master team**, and this branch reaches `master` only by pull
request. **None is open.**

---

## 7. Where the work stopped

**Nothing is half-built and nothing is uncommitted.** Both items' closures are written on
`features/to-do-done-and-parked.md` before they came off the live list, which is the order that
page's own rule demands.
