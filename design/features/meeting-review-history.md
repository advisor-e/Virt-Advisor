# Meeting Review — the History

> **Read [`meeting-review.md`](meeting-review.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.
>
> ⚠ **This page records how the design was arrived at, and what each build found on the way** —
> §§1–7 are the design sessions, §8 is the build record. **Six slices are built, the last of them with its own approved drawing** (see the Brief);
> the line that used to stand here saying nothing was built was true on 2026-09-01 and has been
> replaced rather than left with a date beside it.

---

## 1. Where this came from

**Mike, 2026-09-01, unprompted and in his own words:**

> *"i want you to design a new feature… a note taking feature - effectively records the voices and
> transcribes the meeting, then generates two reports. 1 is a summary of the meeting - key points,
> key actions etc. The 2nd is an advisor only report, which reports how the advisor performed. The
> advisor will have the ability to pre-determine the nature of the meeting, set objectives and or
> key points to be observed. The advisor report will highlight if they failed pre-set actions such
> as missing key sales scripts, failing to frame the meeting correctly, failing to use metaphor or
> drawings to explain technical issues etc… of course, as is the case all over this app, the back
> end must be editable so managers can modify the key observation points etc"*

It is recorded verbatim because the gate in `CLAUDE.md` — *"did Mike ask for this, in his own
words?"* — exists precisely so that a later session cannot mistake an AI-written summary for a
request. **This one passes the gate on its face.** He also named the Handbook page himself, so the
page is not an inference either.

The request was checked against the repository before any design work: no audio, transcription or
meeting feature existed, and none of the 36 feature Briefs covered one.

---

## 2. The decisions taken on 2026-09-01

Each was put to Mike as a choice with its costs stated, and answered the same day. The first four
came out of the design session; the fifth was taken in a later session on that date, once the
technical ground under it had been checked.

| Decision | Ruling | What was rejected, and why it mattered |
|---|---|---|
| Who sees the advisor's report | **The advisor alone; they choose to share** | Rejected: manager-visible immediately (unambiguous monitoring); visible after a delay; each firm choosing for itself. The chosen option is the safest legal position and the only one consistent with the existing tone rule. Its cost is named in §3 below. |
| How the audio is captured | **Recorded live in the app** | Rejected: uploading a Teams/Zoom file, which was the recommendation on the day. See §4. |
| What happens to the recording | **Audio deleted at transcription; transcript kept on a firm-set clock** | Rejected: keeping everything until deleted by hand (worst position to hold client recordings in); deleting the transcript too (kills the follow-through feature and makes a disputed observation uncheckable). |
| What it is called | **Meeting Review** | Rejected: Meeting Notes (his own phrase, but understates the second report), Meeting Companion, Meeting Record. |
| How the advisor's voice is told from the client's | **Provider diarization; the advisor identified as whoever speaks the consent line** | Rejected: handing the model a stored voice sample of each advisor, which works but makes the app hold biometric special-category data for no gain; and shipping a merged transcript with attribution checks postponed, which would have dropped about half the observation points. Per-speaker microphones were ruled out before he saw the choice — in-person only, and hardware a firm must buy. |
| The spoken consent line | **Candidate B** — the full version, in [`../MEETING-CONSENT-WORDING.md`](../MEETING-CONSENT-WORDING.md) | Rejected: a shorter line that said "transcribed by our software" and understated the AI; and a formal, self-timestamping line that is stronger evidentially but opens a client meeting in a register that signals jeopardy. Both are kept on that page rather than deleted. |
| The screen, and the refusal path | **Two steps — record, speak, then confirm.** "Stop and delete" stays available for the whole meeting | Rejected: a single panel with a tick before recording. See the correction below — it was not rejected on taste, it was wrong. |
| Whether the promise binds the code | **Yes — P13, "nothing leaves the firm"** | Rejected: leaving it as a caution inside a wording document, where a developer would never read it. |
| Sending a transcript to an LLM at all | **Granted — for this feature and no other**, written into `CLAUDE.md` with four conditions | Rejected: a flat exception with no conditions, which would have exempted DB IDs and identifiers along with the spoken words; and treating the client's consent as sufficient on its own, which confuses the legal basis with the engineering rule. See §5. |

**The names of the two reports were not settled in the exchange above** — they were ruled later the
same day: **Meeting Summary** for the client and **My Coaching Notes** for the advisor, *Advisor
Review* rejected because inside a firm "review" reads as an appraisal. The Brief's §5 Known state
carries the ruling; this paragraph used to say the names remained open, which stopped being true on
the day it was written.

**The fifth ruling also corrected a factual assumption in the design**, which is worth recording
because the correction made the feature cheaper rather than dearer. The Brief was written on the
belief that speaker labels would require a **second** transcription supplier alongside OpenAI — a
new company holding an hour of a client's affairs, with its own data-processing agreement. Checked
against OpenAI's current API on 2026-09-01, that is not so: transcription and diarization come back
from one call to a provider this app already contracts with. §4 item 5 of the Brief shrank
accordingly. The lesson generalises — **the design's costliest paragraph rested on a capability
claim nobody had checked**, and it had been true when the assumption was formed.

### The correction Mike caught, recorded because the gate did not catch it

The consent screen was first drafted as **one panel**, ticked before recording began, whose checkbox
read *"I have read the consent line aloud and everyone present agreed."* Mike read the flow back in
his own words to check he had understood it — *"a screen opens with the words they are to repeat…
they tick yes and then it proceeds?"* — and the past tense gave it away. **That flow puts the spoken
consent before the microphone opens, so it is never on the recording at all.**

It would have defeated three things at once: P1, which exists so the client's agreement survives a
dispute; the whole reason live capture was chosen over an uploaded file (§4); and the diarization
ruling taken the same morning, which anchors the advisor's identity to that spoken line. **The words
were right; where they sat was wrong**, and no reviewer of the wording alone would have seen it,
because nothing about the sentences is incorrect.

It is recorded because of *how* it was found. The wording had been drafted, saved as an artefact and
put up for approval exactly as `CLAUDE.md` requires, and the artefact rule worked — the words existed
in a file before anyone said yes. **What that rule cannot check is whether the words are in the right
place in a sequence.** A wording artefact shows sentences; it does not show time. The fix was to
split the screen in two — record, speak, then confirm — which also gave the feature its answer for a
client who declines, a question §4 of that page had been carrying as open.

---

## 3. The tension inside the visibility ruling, and the answer proposed

Mike asked for manager-editable observation points **and** ruled that only the advisor sees their
own report. Taken literally, that means a manager sets a standard and can never learn whether it is
met — which would make the editing screen he asked for pointless within a month.

**The proposed resolution, accepted in the same exchange:** managers see the *pattern* with no names
attached — *"framing was missed in 11 of 28 meetings this month"* — and never an individual. This
gives a manager what they actually need (is the standard being met, and is my checklist any good?)
without any individual being exposed, and it keeps the feature on the coaching side of the line.

It is P3 in the Brief. The trap it creates — that in a small firm an aggregate is trivially
reversible to one person — is recorded as a design decision that must be settled before build, not
a constant to be tuned afterwards.

---

## 4. The recommendation that was overridden

**Recorded because the reasoning will not survive in anyone's memory, and the risk it names is
real.**

The recommendation on the day was to accept an uploaded recording first — the advisor records in
Teams, Zoom or on a phone as they already do — and add live capture later. It is materially simpler,
works identically for remote and in-person meetings, and cannot be defeated by a laptop going to
sleep.

**Mike chose live in-app capture.** That is his call and the design follows it without reservation.
Two things genuinely favour it, and both are now built into the Brief as principles rather than
notes: consent can be captured *inside the recording* (P1), and because audio must be chunked
anyway, the pieces can be transcribed as they arrive, so the transcript *text* is ready when the
meeting ends rather than several minutes later. **The speaker labels are not** — the §2 diarization
ruling requires one pass over the assembled recording, so the advisor's own report still arrives a
few minutes after the meeting. The consent ruling gained a second job at the same time: it is now
what identifies the advisor, so it must be spoken by them and spoken first.

**What was not resolved by the choice** is the failure mode that prompted the recommendation: an
operating system may throttle or suspend a backgrounded browser tab, and a screen locking mid-meeting
is ordinary. There is no second take with a real client. P10 (stream continuously) and P11 (fail
loudly) exist to contain it, and neither eliminates it.

---

## 5. The rule collision found at design time

`CLAUDE.md` requires: *"Strip internal DB IDs and PII before sending anything to an LLM."*

**A meeting transcript is PII from end to end**, so this feature cannot comply with that sentence as
written. This was surfaced to Mike before any file was created rather than being quietly worked
around, because a rule that a shipped feature silently breaks is worse than no rule.

It needed a written, scoped exception in `CLAUDE.md` itself, and the Brief §4 listed it as a blocker
rather than a formality. **Mike granted it the same day, in his own words: *"this feature only now
has permission to send transcripts to ai"*.** It is written into `CLAUDE.md` under Security & data
integrity, directly beneath the rule it excepts.

**Two things about how it was drafted are worth keeping.** The exception was deliberately made
*conditional* rather than flat — the client's recorded consent, DB IDs and identifiers still
stripped, nothing leaving the firm, audio destroyed at transcription — so that the spoken content is
the only thing exempted and the other half of the original rule survives intact. And it closes with
an explicit statement that it sets no precedent, because this repository's recurring failure is a
line written for one purpose being read later as general permission: the `ACTIONS.md` incident of
2026-08-26 is the same shape, and `CLAUDE.md`'s own gate exists because of it.

**A distinction that was drawn before it was written, and should not be lost.** The client's spoken
consent settles the *legal* basis for sending a transcript to a model. It does not amend the
*engineering* rule, which exists so personal data cannot reach a prompt by accident anywhere in the
app. Both were needed. The consent is what makes the exception defensible; it is not what replaces
it.

The same section records six other things that must exist before a first recording — consent
wording in Mike's words, an impact assessment, staff consultation, the transcription provider's
written terms, the position in each jurisdiction, and an answer to a client asking for their data.
None is a coding task, which is exactly why they are the ones that get discovered late.

---

## 6. Why the design treats the pre-set as the product

The obvious reading of the request is that transcription and summarising are the feature and the
advisor report is an extra. The design takes the opposite view, and it is worth recording why.

Every meeting tool on the market records and summarises. What no competitor has is an advisor
declaring, in advance, what a meeting is supposed to achieve, against a checklist their firm wrote.
That is the sellable half under [`product-principles.md`](product-principles.md) P1 — *"something a
competitor cannot easily claim"*.

It is also what makes the second report technically possible. An open-ended request to grade a
person produces confident invention; a request to find a named thing and quote it, or answer NOT
FOUND, is a retrieval task with a citation. **The pre-set is not a convenience feature. It is the
mechanism that makes the advisor report trustworthy at all**, and any later change that weakens it
— a "just summarise how it went" mode, for instance — takes the reliability with it.

---

## 7. Where this page's sources will go stale

- **The 42 scenarios** in `data/logic_trees.json` were read on 2026-09-01 to establish that a
  meeting-type list already exists. The count and the ids will change; the principle (P12) does not.
- **The tone rule** quoted from [`advisor-progression.md`](advisor-progression.md) §1 is quoted as
  it stood on 2026-09-01. If that Brief changes, this design inherits the change, not the quote.
- **The rulings in §2** are fixed points and do not go stale — but the *options rejected* beside
  them describe the alternatives as they were understood on the day.
- **The diarization capability** behind the fifth ruling was read from OpenAI's published API
  documentation on 2026-09-01 and has not been exercised against the account. The exact model name
  is a moving target — OpenAI retires audio models on a schedule — so confirm it is available and
  pin it before build. If it were ever withdrawn, the *ruling* (labels from the provider, advisor
  anchored to the consent line) survives; only the supplier would change, and with it §4 item 5.
- **Everything in the Brief is untested against code**, because there is no code. The first build
  will contradict some of it, and when it does, the Brief is corrected and the contradiction is
  recorded here.

## 8. The build record, 2026-09-01 to 2026-09-07

Moved here from the live list on 2026-09-03, when item 4.58's comment — 1,388 words, appended by
seven sessions — was cut to the list's word caps. What the Brief already states as current fact is
not repeated; this is the sequence, and the things found on the way.

- **2026-09-01, the design sessions.** Filed with eight open decisions. Speaker separation ruled
  (§2). The consent wording approved and registered; Mike caught the past-tense tick that would have
  put the client's consent outside the recording. Five more rulings, each put to him alone: the two
  reports are *Meeting Summary* and *My Coaching Notes* ("Review" rejected as reading like an
  appraisal); retention default 18 months; the drawing check is the words raising it plus a one-tap
  confirmation, the advisor's answer stored and never the guess; manager figures only above 5
  advisors AND 20 meetings, never lowered to populate a screen; a firm may not edit the consent
  wording. **Build trap**, recorded in `MEETING-CONSENT-WORDING.md`: the wording quotes the
  retention period aloud, and P8 lets a firm move that dial, so a build must never hardcode 18
  months into the sentence.
- **2026-09-01, slice 1** — the observation points, chosen first from five proposed slices because
  they carry no audio, no AI and no privacy exposure. Five deliberate differences from the drawing
  are in the ARTEFACTS row; the two that matter: Stage A's reference-material half (the
  document-to-points join) is not built, and only `eoy_meeting` ships with points — the other ten
  scenarios are registered and empty, because writing them would invent Mike's content.
- **2026-09-01, slice 2** — consent, capture, transcription, deletion. Three rulings: audio on this
  server's own disk, never the database or the Google Drive pipeline; slice 2 transcribes as well
  as captures, because audio without a transcript has no deletion trigger; transcript expiry is its
  own later piece. Found: `gpt-4o-transcribe-diarize` is published as an undated name only (Brief
  §3); the retention dial's labels were not in the drawing and were put to Mike rather than
  invented.
- **2026-09-02, slice 3** — the two reports. Four rulings, all found by opening the drawing beside
  the code before a line was written: no "Play this moment" (P8 has destroyed the audio; the
  surrounding transcript is shown instead); no "Send to client" (no mail channel, and adding one
  would route client financial content through an unassessed third party; approve-then-copy
  instead); the jargon count removed (it needs a firm glossary that does not exist); hearability
  marked by a point's author, never judged by the model. Three absences: "Actions agreed" moved out
  of the "no AI" block; no "Discard" (stop-and-delete removes the whole meeting); no "Share with my
  manager" until the aggregate exists. Two stale banners removed ("Recording is not built yet",
  "The two reports are not built yet"). **One label was written for the build and was not Mike's:**
  "Read my reports" on the recorder's finished state — **ruled by him on 2026-09-07** and now
  pinned, "my" carrying P2 in a label the way "My Coaching Notes" does.
- **2026-09-02, renumbered 4.56 → 4.58** by the laptop on Mike's ruling; both machines had filed a
  4.56 and the desktop's CPD item reached master first. 4.57 was skipped, not reused.
- **2026-09-02, the meeting types cascade.** Mike ruled that types themselves cascade ("dynamic,
  editable and cascading from mentor … until reaching the business entity level"); the design is
  `MEETING-TYPES-CASCADE.md`, slices 1–2 built. Two rules deleted because he never made them: that a
  type must be an id in the logic trees (old P12), and that advisors may not edit — his correction
  is P14. The eleven shipped types are marked as a suggestion, not his list. **The app ran for the
  first time that day** and three defects stopped it dead (the backend would not boot,
  `/api/meeting` was missing from the Nuxt proxy list, no management sign-in on that machine); all
  fixed, none findable by a test in this repository.
- **2026-09-04, item 4.59 — the badge that credited the mentor's points to a firm.** The points
  resolver returned the layer above untouched when a scope had decided nothing, so `source` still
  carried the badge of whichever level applied decisions: the mentor's own added point reached a
  firm marked `added-here`. Found on 2026-09-02 while building the types cascade, whose resolver
  had the identical fault, and left undone deliberately to keep that slice to its approved scope.
  **Worse than the mislabel, and not known when it was filed:** `FirmMeetingObservations.vue` reads
  that badge to choose between *Switch off* and *Remove* and to route an edit, so a firm manager was
  offered *Remove* on a mentor's point and any edit went to the own-row endpoint, which answers 404.
  Fixed by restamping as `inherited`, matching `meetingTypes.js`. **The badge also flipped on
  unrelated edits** — the full-resolve path already stamped correctly, so making any decision
  switched the scope out of the faulty branch; the second new test pins the two paths together.
- **2026-09-07, slice 4 — the manager's aggregate.** Screens C3 and C4 of the drawing approved on
  2026-09-01, built on Mike's word "finish the meeting review". **The design question it turned on
  was not in the drawing:** the ruled gate — 5 advisors and 20 meetings — protects the SCREEN, but
  a point checked in only three of the month's meetings would still print "1 / 3" underneath it,
  which is the exact reversal the gate exists to prevent. Put to him the same day and **ruled: the
  floor applies per point too**, the accepted cost being that a newly added point shows nothing
  for its first month or two. He also ruled the one label that had been ours, *"Read my reports"*. **A real fault was caught by writing the test first:** the
  month was read with `getMonth()`, so the same twenty meetings would fall into different months on
  a server in Auckland and one in London, with nothing on screen to say which had happened. Fixed to
  UTC, at the cost of a visible one-day skew at a month boundary — the better of the two, because
  the count no longer depends on where the server sits. **The tier direction is the other thing
  worth keeping:** this is the only block here that must NOT cascade upward (P13), so a tier above
  the firm is answered 403 rather than an empty screen, which would read as "your firm did nothing".
  37 new tests, suite 8,184 green (419 suites), lint 0.
- **2026-09-07, slice 5 — transcript expiry.** Built the same day on Mike's *"finish the meeting
  review"*, closing the half of P8 he had deliberately deferred on 2026-09-01. **The design
  question was which clock**, and the answer was already written down: `createMeeting` stores
  `retentionMonths` as it stood on the day, with its own comment saying *"a firm that later moves
  its dial must not retrospectively change what a client was told at this meeting."* So each
  meeting expires against its own record and never against the firm's live setting — resolving the
  current dial would silently extend a transcript somebody was promised would be gone. **The
  second question was scope, and it is the one worth arguing:** the two reports go with the
  transcript, because every coaching finding quotes it verbatim and the summary is written from
  it. Expiring `transcript.json` alone would delete one file and leave the client's own words in
  two others — the letter of the promise kept and its substance broken, which is the same argument
  `destroyMeeting` already makes for stop-and-delete. **A meeting with no recorded period is never
  purged, only counted:** it cannot be expired against a promise nobody can produce. The meeting
  record survives, stamped `transcriptPurgedAt`, so an expiry is provable rather than a directory
  that quietly went missing. The sweep runs daily from the server's listen callback — never at
  import, so requiring `restify-server.js` in a test deletes nothing — and its timer is `unref`'d.
  14 new tests.
- **2026-09-07, slice 6 — follow-through, and the client on the meeting record.** Built on Mike's
  *"yes"* to follow-through, after being shown that it could not be built as it stood. **A meeting
  record held the firm, the advisor, the meeting type and the retention period — but not which
  client the meeting was with**, so the only available match was advisor plus meeting type. That
  would have checked one client's agreed actions against a different client's transcript, and the
  result would have read as an ordinary report with real actions, real quotes and real timestamps.
  🔴 **The note that had blocked this was factually wrong.** Slice 2 left the client off the
  recording bar — which the approved drawing shows as *"End of year meeting · Whitfield & Co"* —
  on a recorded deviation saying *"there is no client record to draw a name from"*. The register
  had existed since 2026-07-14 (`/api/clients`), with approved wording already in the locale file.
  So adding the picker was a **return to the approved drawing**, not new scope, and it is worth
  noticing that a wrong sentence in the artefact register held a feature back for six days.
  **The check rides the coaching call rather than a third prompt:** each prior action becomes one
  more point in the same request, so the citation guard applies unchanged — quote this transcript
  or answer NOT FOUND, and an invented quote is dropped. Advisor-only quotes are right here rather
  than incidental: the question is whether the ADVISER returned to the action, and a client raising
  it unprompted is not the adviser following it through. **Three refusals are deliberate and
  tested:** another client, another advisor (P2), and a meeting with no client are never matched,
  and an expired previous meeting is reported as expired rather than as "no actions agreed". **The screen was drawn rather than added quietly**, because the approved
  drawing had no panel for it: `design/mockups/meeting-review-follow-through.html`, three screens,
  **approved by Mike the same day with all four questions ruled** one at a time. 🔴 **The ruling
  worth carrying forward is the labels:** *"You raised it"* / *"Not raised"*, with **"Done" / "Not
  done" rejected because the software cannot know it** — it hears an hour in a room and nothing of
  the months between, so a client who did send the forecast and simply did not mention it would
  have been reported as having failed to. The heading is *"Since we last met"*, the block sits
  above the observation points, and the expired panel names the firm's own retention period. **The
  build then found one thing the drawing had settled but the code had not:** `buildBlock` returned
  null for every empty case, which would have made an expired previous meeting render exactly like
  a meeting where nothing was agreed. It now says which kind of empty it is, and a test pins the
  three apart. 21 new tests in all.

---

## 9. A client asks for a copy — 2026-09-10

**Asked for by Mike, in his own words:** *"you also need to include the feature for a client to
request a copy of the meeting notes - that should be in the drawing prior to build."* Drawn as
[`../mockups/client-record-request.html`](../mockups/client-record-request.html), all eight of its
questions ruled the same day one at a time, and built on his *"go build it"*. It closes **§4 item 7**
of the Brief and **finding B** of [`../MEETING-REVIEW-DPIA.md`](../MEETING-REVIEW-DPIA.md) §10 —
IPP6 access and IPP7 correction, the last open finding in this feature that was **ours**.

### The two rulings that reversed the recommendation

🔴 **Ruling 1 — the coaching notes NEVER go to a client, and his reasoning replaced ours.** The
recommendation reached the same answer on weaker ground: P2, which says the report belongs to the
advisor. His ground is what the report is *for* — *"the advisor is covered by their terms of
engagement… our performance report is part of the advisors training and quality control for the
firm - clients never get these notes."* That is the question a regulator asks, and it survives the
objection the recommendation could not: those notes quote the client throughout, so a regulator
could hold the quoted parts to be the client's information whoever the report is about. **The
drawing's own fallback — releasing the quotations without the observations around them — is
dropped, not deferred.**

🔴 **Ruling 2 — the advisor ALONE releases, and it reshaped the screen rather than adjusting it.**
The recommendation was the firm manager as well, because advisor-only fails when somebody leaves
and a deadline does not pause. He refused it: *"the firm manager will never have the time to check
every interaction of their advisors and in many cases, those advisors will in fact be senior
partners."* **The consequence is that a client's request reaches across every advisor who ever met
them, so no one person can answer it.** It became shared work under a single clock, closed when the
last advisor releases their part. *The cost is carried rather than solved:* a request stalls on the
slowest advisor while the deadline belongs to the firm.

**That ruling opened a gap with no answer, which was put to him and ruled the same day (2b).**
`va_clients` is firm-scoped with **no owning advisor** — checked in `config/db-schema.sql` and
`server/utils/clientStore.js` — so when the recording advisor has left there is no "current
advisor" to fall back on, and a client's right does not lapse because a partner retired. A firm
manager may release, but **only by declaring the advisor can no longer act**. ⚠ **The declaration
cannot be verified**: this app holds no advisors table and does not handle sign-in. The permanent,
named record *is* the control — the same shape as the consent tick, which has never been verifiable
either.

### What the build found that the drawing did not

🔴 **Screen B's two tick-boxes were missing from the first cut of the code**, and putting the
artefact beside the build is what found them. They are not decoration: **they are ruling 8's actual
control.** *"Warn, and remove nothing automatically"* is only a control if somebody passed through
the warning — otherwise the third-party paragraph is a notice beside a button. Both are now
enforced **on the route**, because a disabled button is not one and a caller who never loaded the
screen would have sailed past it. Screen D's two ticks had been collapsed into one and are two
again: without *"my client asked for this"*, a firm could destroy a record for its own reasons and
have the surviving stub read afterwards as a client's request.

**No test would have caught it.** Nothing was asserting a control nobody had written. This is the
second time on this feature that the drawing-beside-the-build step has found something review did
not — §8 records the first.

⚠ **And a factual error of ours inside ruling 6 was corrected on the drawing during the build.** It
read that 20 working days is *"roughly 28 calendar days, so a UK firm shown 20 working days would
believe it had longer than it has"*. Backwards. **20 working days is exactly four weeks from any
weekday**; a calendar month is 28 to 31, so the month is **always at least as long**, equal only
across a non-leap February. Which makes one substitution merely wrong and the other dangerous:
showing a New Zealand firm "one calendar month" hands them up to three days they do not legally
have, on a screen that looks entirely reasonable.

### Three things the build could not do, recorded rather than worked around

1. **An older meeting cannot name its advisor.** This application holds no advisors table, so a
   name is now captured on the meeting record at write time — and every meeting recorded before
   2026-09-10 has none. The screen falls back to the identifier. **The same wall the "4 of 12"
   denominator met, and the same answer: a plausible wrong name is worse than an honest id.**
2. **Public holidays cannot be excluded from a working-day count.** There is no holiday calendar
   for any country here and inventing one would be worse than having none. The due date therefore
   runs **earlier** than a strict legal reading, which is the safe direction, and a test holds that
   direction so a later "improvement" cannot quietly push real due dates past the law.
3. **Nothing removes a third party your client named.** Ruling 8, deliberately. Software guessing
   at redaction would miss some, cut things it should not, and leave the firm believing the problem
   had been handled.
