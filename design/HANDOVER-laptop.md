# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-07 (fifth session) · Laptop · branch `feat/advisor-progress`

Suite **8,185 green** (419 suites), lint 0 errors. Two commits, both pushed — `b745ba2`.
Nothing uncommitted. Started 1 ahead / 0 behind master; ended 3 ahead / 0 behind.

**4.58 SLICE 4 IS BUILT — the manager's aggregate.** Screens C3 and C4 of the drawing
approved 2026-09-01. A firm manager opens the Meeting Review tab and sees whether the
observation points are landing across the firm this month — counts only, never a name, and
nothing at all below the ruled gate. New: `server/utils/meetingAggregate.js`,
`server/routes/meetingPatterns.js`, `components/firm/FirmMeetingPatterns.vue`. 37 new tests.

**The one thing worth carrying forward: this block deliberately does NOT cascade upward.**
Every other cascading thing here runs mentor → global → group → firm. This is firm tier
alone, because Brief **P13** keeps anything derived from a recorded meeting inside the firm
it came from — the consent line promises a named client exactly that. A tier above the firm
is answered **403, not an empty screen**, because an empty screen reads as *"your firm did
nothing"*. If you touch `TAB_TIERS` or the tier chain, this is the one row that is meant to
look wrong.

**A real fault the tests caught before it shipped.** The month was read with `getMonth()`,
so the same twenty meetings fell into different months on a server in Auckland and one in
London, with nothing on screen to say which had happened. Fixed to UTC; the cost is a
visible one-day skew at a month boundary, and it is the better of the two.

**Three rulings from Mike, each put to him alone.**

- **4.71's last open question:** a new forecast opens at one year. Recorded as a seventh
  ruling on [`mockups/three-way-forecast-three-years.html`](mockups/three-way-forecast-three-years.html).
  No code changed — it already did.
- **"Read my reports"** is his wording, and is now **pinned** in
  `tests/unit/meetingReview.component.test.js`. Do not reword it.
- **The cohort floor applies per point**, not only to the screen. His ruling now, not our
  reading of it.

### 🔴 DESKTOP — read this first

- **Shared files changed:** `design/ARTEFACTS.md` (the Meeting Review row, the consent row,
  and a new *Letters drafted for Mike to send* table), `design/features/to-do-items.json`
  (4.58 and 4.71), `server/restify-server.js` (one route mounted),
  `server/utils/meetingAudioStore.js` (`listMeetingIds` added — additive, ids only).
- **You are 18 ahead / 14 behind `master`** as of your last push. Merge `master` in before
  going further; today's forecast work and the MYOB parser fix are both in it.
- **The OpenAI account is still OUT OF CREDITS.** Economic analysis fails for every user.

### Open, and named rather than left to be discovered

- **Three decisions inside slice 4 are OURS, not his rulings**, all named in Brief §5: the
  month read in UTC; a meeting contributing only once it has coaching notes; and the bar
  turning amber below 70%. He has not ruled on any of the three, and none changes a figure.
- **The "Share with my manager" button is still absent, and slice 4 did NOT unblock it.**
  `ARTEFACTS.md` used to say it waited on the aggregate existing. That reasoning was wrong
  and is corrected: the aggregate is anonymous by construction, so a named report has
  nowhere to arrive. It needs its own screen and a separate decision under P2 — **and Mike
  has not asked for one.**
- **📧 An email is drafted and waits on Mike to send it:**
  [`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md), closing item 5 of Brief §4.
  The other three §4 items — the impact assessment, staff consultation, and a lawyer per
  market — are his and block a first real recording, not a commit.

### Next

**4.58's remaining work** is follow-through across meetings, transcript expiry, and
meeting-types slices 3–4 (slice 3 is one computed property in `FirmMeetingTypes.vue`). The
firm glossary is absent by his ruling and needs words from him, not code.

**4.69** still owes one run on the no-date path once credits return. **4.60** waits on four
real exports from QuickBooks Online and MYOB, and whoever collects them should be asked for
the Fixed Asset Schedule at the same time (**4.65**).

**Nine live items.** `activeOn` this laptop: **4.58** and **4.69**.

⚠ **The desktop's handover is dated 2026-09-04 but its branch has a commit from 2026-09-07** —
a session ended there without writing one. Worth knowing before assuming what it holds.
