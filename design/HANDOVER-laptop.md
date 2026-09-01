# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-01 · Laptop · branch `feat/advisor-progress`

Suite **6,880 green** (362 suites), lint 0 errors. Started 14 ahead / 0 behind `master`, ended
**15 ahead / 0 behind**, pushed (`17117d8`). Nothing uncommitted.

### What shipped: Meeting Review slice 2 — consent, capture, transcript, deletion

An advisor can now record a meeting. Consent is spoken **into** the running recording, the audio
is transcribed with the speakers separated, and then **destroyed** — in a `finally`, so it goes
whether or not transcription succeeded. "Stop and delete" is available throughout and takes any
transcript with it. Firms set their own retention period and the consent screen renders that
figure. Details in [`features/meeting-review.md`](features/meeting-review.md) §5.

### 🖥 DESKTOP — three things, and the first one is aimed at you

**1. 🔴 THE MEETING AUDIO DOES NOT GO TO GOOGLE DRIVE, AND THAT WAS A RULING.** You built the
Drive pipeline (`uploadDocument` in `server/routes/firmManager.js`), and it is the obvious thing
to reach for here. Mike ruled against it on 2026-09-01: the consent line promises a client out
loud that *"nothing is shared outside our firm"*, and the argument that makes OpenAI acceptable —
already our contracted processor — does not cover Google. Meeting audio lives on **our own
server's disk** under `MEETING_AUDIO_DIR` (`server/utils/meetingAudioStore.js`). It also makes P8
deletion provable, because there is one place to look. Do not "simplify" this later.

**2. `gpt-4o-transcribe-diarize` has NO dated snapshot to pin.** Every other transcription model
on the account ships dated variants; this one is an undated name only, so OpenAI can change what
sits behind it silently. The name is written once (`DIARIZING_MODEL`) and every reply is
validated rather than trusted. Worth re-checking now and then. The model IS enabled and was
proven end to end — two synthetic voices, 8 segments, 2 speakers correctly separated.

**3. ⚠ YOUR HANDOVER IS BEHIND YOUR COMMITS.** `HANDOVER-desktop.md` is dated 2026-08-31, but
`feat/firm-quiz-builder-ui` has moved from 3 ahead to **4 ahead** of `master` since this morning.
Two commits are unrecorded. Also still outstanding from this morning: **your 4.56 is now 4.57** —
take the renumber when you next merge `master`.

### ⚠ The one thing that is not a coding task

Until today nothing here could record anyone; now it can. The four items in Brief §4 — impact
assessment, staff consultation, OpenAI's written terms for submitted **audio**, and a lawyer per
market — gate a first real recording. `/meeting-record` carries a banner saying so, and **a
banner is a warning, not a control.**

### Next

The two reports (Meeting Summary, My Coaching Notes) — slice 3. The transcript-expiry job is
deliberately separate work (Mike's ruling); destroying the audio was the promise and it is built.
