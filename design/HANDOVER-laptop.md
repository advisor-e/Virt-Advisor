# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-10-01 (afternoon) · Laptop · branch `feat/advisor-progress`

**0 behind master (merged #151 at 16:00), pushed; PR #152 merged into master, 7ee8ec90.
Suite green: 689 suites / 14,837 tests on Node 14.15.**

**8.4 CLOSED on Mike's word.** OpenAI's diarizing model refuses more than 1400 s of audio,
whatever the file size (proven), so meetings now record in 20-minute parts: strategy sections
split at 20 min, ordinary meetings in parts joined into one transcript, a failed part named on
the done panel and above both reports. Browser-walked, 41 min: 257 of 257 lines labelled right.
Drawing: `meeting-review-long-recording.html`; how it works: `meeting-review.md`.
Mike ruled the advisor's voice clip extends to every recorded meeting (Decision C).

**13.9 filed:** the meeting reports and set-up screens still type their English in code.

**FOR THE DESKTOP:** merge master — #152 is in it. Shared files changed: `locales/en.json`
(`meetingRecorder.*`, `meetingReportsGap.*`), `components/MeetingRecorder.vue`,
`components/MeetingReview.vue`, `server/routes/meetingReview.js`, `meetingSegments.js`,
`server/utils/meetingAudioStore.js`, `utils/meetingParts.js` (new).

**Still in hand here:** 8.6, 15.31 (Mike's try-out).
