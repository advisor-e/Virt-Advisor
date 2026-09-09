# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-10 · Desktop · branch `feat/firm-quiz-builder-ui`

Suite **9,541 green**, lint 0, build exit 0, everything pushed (`4f74f38`). **0 behind master**
after merging the laptop's PR #71 in (13 conflicts, all side-by-side additions). **PR #70 is
open**, desktop → master, and now carries the whole day. Nothing active on this machine.

**🔴 MIKE'S INSTRUCTION FOR NEXT SESSION: "bring them to me".** Put these in front of him first:

- **Release v0.11.0** — he wants one tag covering both machines. Step 2 of Integration is done
  (master merged in); what remains is merge PR #70, build on master, notes, version bump,
  ledger row, tag. Start from the live state, on his word.
- **The three items that wait on us**, all the laptop's by its own handover: 4.83 Compliance
  pages (score 5, approved, not started), 4.84 Notification dots, 4.85 One Handbook.
- **The five that wait on him**: 4.15 (he settles the 18 names in UAT — never propose it),
  4.58 §4 (staff consultation, lawyer per market, OpenAI letter), 4.78 / 4.81 / 4.82 (the
  laptop's depreciation and tax work, built, needs his review in the app).
- **4.86** waits on the master team's answer to email question 7 (adviser identity).
- **Stale flag:** 4.78 still reads active on the laptop in master; the laptop's clearing
  commit lands with its next push.

**Built today:** the client level of the Meeting Review pre-set (4.58) — one shared list per
client, every entry named, no manager screen; five rulings on
[`mockups/meeting-preset-client-level.html`](mockups/meeting-preset-client-level.html). A
cannot-be-heard tick dropped in storage on the advisor level, fixed. Course Builder's live
click-through completed. Search-content cascade confirmed complete on our side. Integration
email gained question 7.

**He was going to open the app before the release**: `/meeting-preset`, pick Dev Client Ltd.
Backend on Node 14.15 exact path with `ALLOW_DEV_AUTH=true`; frontend `nuxt start`.

**LAPTOP:** shared files changed here today: `to-do-items.json`, `ARTEFACTS.md`,
`MEETING-TYPES-CASCADE.md`, `meeting-review.md`, `server/routes/meetingReview.js` (presetFor
takes a clientId), `server/routes/meetingObservations.js` (two lines), `restify-server.js`.
