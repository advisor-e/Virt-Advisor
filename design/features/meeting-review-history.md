# Meeting Review — the History

> **Read [`meeting-review.md`](meeting-review.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.
>
> ⚠ **The feature is not built.** This History therefore records how the design was arrived at,
> not what happened to a running feature. Nothing below describes code.

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

**The names of the two reports were NOT settled** and remain open. *Meeting Summary* and *Advisor
Review* appear throughout the Brief as placeholders and carry no approval.

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

## 8. The build record, 2026-09-01 to 2026-09-04

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
  "The two reports are not built yet"). **One label is not Mike's:** "Read my reports" on the
  recorder's finished state — written so the reports screen was reachable, still waiting on his
  word.
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
