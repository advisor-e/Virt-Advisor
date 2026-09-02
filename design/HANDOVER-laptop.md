# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-02 · Laptop · branch `feat/advisor-progress`

Suite **7,173 green** (373 suites), lint 0 errors. Started 21 ahead / 0 behind, merged
`master` (your PR #54), ended **32 ahead / 0 behind**, pushed (`6d310d7`). Nothing uncommitted.

### 🔴 THE APP WAS RUN FOR THE FIRST TIME AND THREE THINGS STOPPED IT DEAD

None was findable by any test here, because nothing in this repo starts the server or the
front end. **The Meeting Review backend had never run, on any machine, since it was built.**

1. **Restify refused to boot** — nine sync handlers in `meetingReview.js` took two arguments.
2. **`/api/meeting` was missing from the Nuxt proxy list**, so the browser could never call it.
3. **No management screen could be signed into here.** The dev server binds IPv6 only; all
   twelve pages' dev sign-in knew `localhost` and `127.0.0.1` and not `::1`. Now one shared
   `utils/devHost.js`. **Use `http://[::1]:3000/...` on this machine — `localhost` hangs.**

### Two rules were deleted because Mike had never made them

The meeting-type↔logic-tree link (old P12), and "advisors may not edit". His rule is **P14:
nobody edits a level ABOVE their own.** Also deleted, repo-wide: the false "the middle tiers
cannot log in" note (19 files) and the two coined job titles for the middle tiers (9 files,
including the master-team email) — `tierVocabulary.test.js` now fails the build if either
returns anywhere in the source. ⚠ **It caught this very handover**, which spelled both out.

### What shipped

Observation points now cascade through all four manager tiers. **Meeting types are content**
— slices 1 and 2 of [`../MEETING-TYPES-CASCADE.md`](MEETING-TYPES-CASCADE.md) (approved, four
decisions ruled): a type carries its own name, and the mentor creates, renames, reorders and
switches types off.

### 🖥 DESKTOP — three things

1. **`master` merge:** both machines had closed items the other hadn't seen. Resolved to the
   union — 4.15, 4.50, 4.58, 4.59. Your 4.56 is closed; our 4.54/4.55 stay closed.
2. **Don't reuse 4.59** — the source-badge defect, filed today.
3. **New shared `utils/devHost.js`** — use `isDevHost()` in any new page's dev sign-in.

### Next

Slice 3 (types at the three tiers below the mentor — one computed property) then slice 4
(the advisor and business-entity levels, which need the new storage shape). **4.59 is a
one-line fix already proven in the sibling module.** Still not Mike's word: the label
**"Read my reports"**. And the reports have still never run against the live OpenAI model.
