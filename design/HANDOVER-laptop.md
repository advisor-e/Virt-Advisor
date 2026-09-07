# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-08 · Laptop · branch `feat/advisor-progress`

Suite **8,301 green** (425 suites), lint 0 errors, `npm run build` succeeds. Seven commits,
**PR #69 open** — 9 ahead, 0 behind. Nothing uncommitted.

**MEETING-TYPES SLICES 3 AND 4a ARE BUILT.** Slice 3 opened the kinds of meeting to all four
manager tiers — one computed property. Slice 4a is the advisor's own level, drawn as
[`mockups/meeting-preset-advisor-level.html`](mockups/meeting-preset-advisor-level.html),
six questions ruled and the drawing approved as its own question.

### 🔴 THE THREE THINGS A LATER SESSION WOULD OTHERWISE GET WRONG

1. **`visible` on `FirmMeetingTypes.vue` IS NOT A PERMISSION CHECK and must not be made one.**
   `tierOfScope` returns exactly four values, so a condition naming all four is always true —
   protection that reads as protection and is none. P14 lives on the backend, where it always did.
2. **Q1's "yes" came with the cost REFUSED, not accepted.** *"yes but fix the issue - build it
   so the manager can see"* — which is why Stage C shipped in the same slice. Reading the "yes"
   alone rebuilds the wrong thing. **A cost recorded against a recommendation is not a cost
   accepted by ruling on it.**
3. 🔴 **THERE IS NO ADVISOR ROSTER IN THIS APPLICATION.** `config/db-schema.sql` says so four
   times. The drawing's "4 of 12" could not be built and Mike wrote the replacement line himself.
   **Any feature wanting a "% of your team" figure meets this same wall.**

### 🔴 DESKTOP — read this first

- **PR #69 will put you behind again.** Merge `master` in before touching anything.
- **Shared files that moved:** `server/restify-server.js` (5 route lines),
  `server/routes/meetingObservations.js` (+430 lines, advisor level + the manager's view),
  `server/utils/meetingObservations.js` (`asAdvisorPreset` carries two more fields — additive),
  `components/firm/FirmMeetingObservations.vue` (a panel), `FirmMeetingTypes.vue`,
  `MeetingPreset.vue`, `design/ARTEFACTS.md`, `to-do-items.json`, `meeting-review.md`.
- **Your `xeroReportParser.js` work was not touched.** Nor 4.70, 4.62 or 4.66.
- **The OpenAI account is still OUT OF CREDITS.**

### Open, and named rather than left to be discovered

- **4.72 filed today:** `nextOwnPointId` at the MANAGER tier hands a removed point's id to the
  next one added — the same fault fixed in the advisor's copy. Left deliberately: it changes
  storage all four manager tiers share.
- **Ten live items.** `activeOn` this laptop: **4.69** alone, still owing one run on the
  no-date path once credits return. 4.58 stays unflagged — what remains on it is the
  per-client level and §4, and nobody is mid-flight on either.

### Next

**Meeting Review's last code is the per-CLIENT level** — undrawn on purpose: it needs the
client picker, empty without MySQL, so it is desktop or UAT work. **§4's five non-coding items
gate a first real client recording** and are Mike's.
