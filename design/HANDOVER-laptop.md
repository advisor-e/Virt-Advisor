# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-07 (fifth session) · Laptop · branch `feat/advisor-progress`

Suite **8,220 green** (421 suites), lint 0 errors, `npm run build` succeeds. Ten commits,
**PR #68 merged** — `master` is `6be6a7c` and this branch is level with it, **0 ahead, 0
behind**. Nothing uncommitted.

**MEETING REVIEW IS COMPLETE ON BOTH SIDES.** Three slices built today on Mike's *"finish the
meeting review"*, each decision put to him one at a time.

- **Slice 4 — the manager's aggregate.** Counts per observation point across the firm this
  month, nothing below 5 advisors and 20 meetings.
- **Slice 5 — transcript expiry.** P8's other half. The clock a client is shown now runs.
- **Slice 6 — follow-through**, with its own approved drawing
  [`mockups/meeting-review-follow-through.html`](mockups/meeting-review-follow-through.html).

### 🔴 THE THREE THINGS A LATER SESSION WOULD OTHERWISE GET WRONG

1. **The manager aggregate is FIRM TIER ALONE and refuses every tier above — 403, not an
   empty screen.** That is Brief **P13**, not a missing cascade: nothing derived from a
   recorded meeting leaves the firm it came from, because the consent line promises a named
   client exactly that. If you are editing `TAB_TIERS` or the tier chain, this is the one row
   meant to look wrong.
2. **"Done" / "Not done" is not available on follow-through, ever.** The software hears an
   hour in a room and knows nothing of the months between, so it cannot say whether an action
   happened — only whether the adviser came back to it. Mike's labels are **"You raised it"**
   and **"Not raised"**, and they are load-bearing.
3. 🔴 **THE JARGON TILE IS CLOSED. Mike REMOVED it on 2026-09-02.** It is **not** waiting on him
   for a word list. This session said so three times and wrote it into the notes; he corrected
   it — *"nope - read the notes. jargon is not wanted"* — and the Brief now names the
   regression. **A settled decision turned back into work by paraphrase is the exact failure
   the rules here exist to stop.** Do not re-raise it.

### Rulings taken today

- **4.71** — a new forecast opens at **one year**. The last open question on quick-fire; no code
  changed, it already did.
- **4.58** — **"Read my reports"** is his wording, now pinned by a test in
  `meetingReview.component.test.js`.
- **4.58** — the **cohort floor applies per point**, not only to the screen.
- **4.58** — the follow-through screen: placement, heading, both labels, and the expired panel
  naming the retention period. All four recorded on the drawing with the argument put against
  each.

### Two faults the tests caught before they shipped

- **The aggregate read the month with `getMonth()`**, so the same twenty meetings fell into
  different months on a server in Auckland and one in London, with nothing on screen to say
  which had happened. Now UTC.
- **`buildBlock` returned null for every empty follow-through case**, so an expired previous
  meeting would have rendered exactly like a meeting where nothing was agreed — a fact about
  the retention clock read as a fact about the client.

### 🔴 DESKTOP — read this first

- **You are 18 ahead / 25 BEHIND `master`.** It was 14 this morning; PR #68 added the rest.
  **Merge `master` in before touching anything.**
- **Shared files that moved:** `server/restify-server.js`, `server/utils/meetingAudioStore.js`
  (three additive functions), `server/utils/meetingReports.js`, `server/routes/meetingReview.js`,
  `components/MeetingReview.vue`, `components/MeetingRecorder.vue`, `pages/meeting-record.vue`,
  `design/ARTEFACTS.md`, `design/features/to-do-items.json`.
- ⚠ **Your handover is dated 2026-09-04 but your branch has a commit from 2026-09-07** — a
  session ended there without writing one. Nobody here knows what that day did.
- **The OpenAI account is still OUT OF CREDITS.** Economic analysis fails for every user.

### Open, and named rather than left to be discovered

- **Three slice-4 decisions are OURS, not his rulings**, all named in Brief §5: the month read
  in UTC; a meeting counting only once it has coaching notes; and the bar turning amber below
  70%. None changes a figure.
- **"Share with my manager" is still absent, and slice 4 did NOT unblock it.** The register used
  to say it waited on the aggregate existing; that reasoning was wrong and is corrected — the
  aggregate is anonymous by construction, so a named report has nowhere to arrive. It needs its
  own screen and a separate decision under P2, **and Mike has not asked for one.**
- **📧 An email is drafted and waits on Mike to send it:**
  [`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md), closing §4 item 5.

### Next

**Meeting Review's remaining code is meeting-types slices 3 and 4** — slice 3 is one computed
property in `FirmMeetingTypes.vue`; slice 4 needs a storage shape for the two levels below the
firm. **§4's five non-coding items gate a first real client recording** and are Mike's.

**4.69** still owes one run on the no-date path once credits return. **4.60** waits on four real
exports from QuickBooks Online and MYOB — ask for the Fixed Asset Schedule at the same time
(**4.65**, one request to one person).

**Nine live items.** `activeOn` this laptop: **4.69** alone — it still owes one run on the
no-date path once the OpenAI credits return.

⚠ **4.58's flag was CLEARED at shutdown**, per the rule *"kept if still in hand, cleared if
finished or dropped"*. Meeting Review's advisor and manager sides are done; what remains on that
item is meeting-types slices 3 and 4, and **nobody has picked those up** — the desktop is free to
take them.
