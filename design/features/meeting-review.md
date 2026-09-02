# Meeting Review — the Brief

> ## ⚠ THREE SLICES ARE BUILT. THE MANAGER'S HALF IS STILL A DESIGN.
>
> **Slice 1 (2026-09-01) — the observation points.** The mentor authors the platform list, a
> firm may edit / switch off / add to it, and an advisor reads their own list before a meeting.
>
> **Slice 2 (2026-09-01) — consent, capture, transcription and deletion.** An advisor can open
> the consent screen in the approved words, start recording, speak the consent line into the
> running recording, confirm agreement, run the meeting, and finish — at which point the audio
> is assembled, transcribed with the speakers separated, and **destroyed**. "Stop and delete"
> is available throughout and takes any transcript with it. A firm sets its own retention
> period and the consent screen renders that figure rather than a constant. Paths are marked
> **BUILT** in §5.
>
> **Slice 3 (2026-09-02) — the two reports.** After the meeting the advisor asks for their
> reports and gets both: the client's **Meeting Summary**, a draft they edit, approve and copy
> into their own email; and **My Coaching Notes**, private to them, carrying four measured
> figures computed in code and one finding per observation point — each quoting the transcript,
> declaring the thing NOT FOUND, or asking the advisor about something a recording cannot hear.
> Any quote the transcript does not contain is dropped before it can be shown. Paths are marked
> **BUILT** in §5.
>
> **NOT built: the manager's half.** No manager aggregate, no follow-through check across
> meetings, and no transcript-purge job (deferred deliberately — Mike, 2026-09-01; destroying
> the AUDIO is the promise the consent line makes and it is built, expiring the TRANSCRIPT is
> its own piece of work). Nor is the **firm glossary** the drawing's jargon count needs — that
> tile is absent by Mike's ruling of 2026-09-02, because a default word-list would be inventing
> his advisory content. The unmarked rows of §5 still describe what is *intended*, not what runs.
>
> ⚠ **A REAL CLIENT MUST NOT BE RECORDED UNTIL §4 IS DONE — AND NOW THE CODE CAN.** That
> changed on 2026-09-01: until slice 2 there was nothing to misuse. The four items in §4 are
> not coding tasks and they gate a first recording rather than a first commit. `/meeting-record`
> carries a banner saying so, which is a warning and not a control.
>
> **The screens are drawn in [`../mockups/meeting-review.html`](../mockups/meeting-review.html)**
> — seven of them, from the pre-set through to the manager's aggregate, registered in
> [`../ARTEFACTS.md`](../ARTEFACTS.md) and ☑ **approved by Mike 2026-09-01**. Slice 1 departs
> from it in **five named ways**, listed in that register row and in the head of the two
> components. Where that drawing and this page disagree, **this page wins**: the drawing is a
> picture of the Brief, not a source.
>
> **The history is in [`meeting-review-history.md`](meeting-review-history.md).**

> **Covers:** recording a client meeting, transcribing it, and producing the two reports that
> come out of it — the client-facing summary and the advisor's own review — plus the pre-set
> that makes the second one checkable, and who may edit the observation points.
> **Does not cover:** the record of what an advisor has done over time
> ([`advisor-progression.md`](advisor-progression.md)), which this feeds rather than replaces.

---

## 1. Design philosophy

**Recording and summarising a meeting is a commodity. The advisor's review is the product — and
it only works because the advisor says in advance what the meeting is for.**

Asking a language model *"how did this advisor perform?"* is the least reliable thing that can be
asked of one. It will be warm, fluent and largely invented. Asking it *"the advisor undertook to
frame this meeting. Quote the sentence where they did, or answer NOT FOUND"* is a search with a
citation, which is a task models are dependable at. **The pre-set is what converts an unreliable
judgement into a checkable one**, and every design decision here follows from protecting that
conversion.

**The tone rule is inherited, and it is not decoration.**
[`advisor-progression.md`](advisor-progression.md) §1 already rules that the record of an
advisor's work exists so somebody can *offer help*, not so anybody can be *ranked*. A report that
says "you missed the sales script" is a ranking instrument by default. It becomes a coaching
instrument only by design — by belonging to the advisor, by citing its evidence, and by being
arguable. Those three properties are the feature.

**The recording is the liability; the reports are the asset.** An hour of a client's private
financial affairs is the most dangerous thing this application will ever hold. It exists to be
turned into text and then to stop existing. Anything that makes the audio linger is a design
failure, however convenient.

---

## 2. Key principles — the non-negotiables

**P1 · No recording without consent captured inside the recording.** A tick-box records that the
advisor claims consent. The spoken consent line at the top of the audio records that the client
gave it. The second is what survives a dispute, and it is the reason live capture earns its extra
cost. **The wording is approved and lives in
[`../MEETING-CONSENT-WORDING.md`](../MEETING-CONSENT-WORDING.md)** — the spoken line, the two-step
screen that keeps the consent inside the audio, and what happens when someone declines. It is not
repeated here: one copy of those words exists in this repository, and a build is checked against
that page rather than against a paraphrase.

**P2 · The advisor's review belongs to the advisor.** *(Mike's ruling, 2026-09-01.)* It is
generated for them, visible to them, and shared upward only by their own act. No manager, at any
tier, reads a named individual's review without the advisor sending it.

**P3 · The manager sees patterns, never names.** Managers set the observation points, so they must
learn whether the points are being met — *"framing was missed in 11 of 28 meetings this month"* —
with no route from any figure back to a person. A count that can be narrowed to one advisor is a
named report wearing a disguise, and the aggregation must be built so it cannot be.

**P4 · No observation without a citation.** Every finding quotes the transcript, or declares the
thing absent. **NOT FOUND must be as easy for the model to answer as a quote**, or the model will
invent evidence to be helpful. An uncited observation is discarded by the parser, not displayed.

**P5 · The advisor can dispute any observation, and the dispute stays in the record.** This is the
line between coaching and surveillance. It is also the only honest source of tuning data for the
observation points themselves.

**P6 · Two reports, two prompts, two stores.** Generated separately so coaching language cannot
leak into the client's copy. One call producing both will, eventually and unpredictably, tell a
client that their advisor should have used a metaphor.

**P7 · The client summary is never sent automatically.** It is a draft until the advisor edits and
approves it. The app writes; the advisor publishes.

**P8 · The audio is deleted as soon as a transcript exists.** *(Mike's ruling, 2026-09-01.)* The
transcript is retained on a clock the firm sets. Deletion is a scheduled job that must be provable,
not a best effort.

**P9 · Mechanical measures are computed in code and never asked of the AI.** Talk-time ratio,
question counts, silences, jargon density — arithmetic over a timestamped transcript. Routing them
through a model converts a fact that cannot be wrong into a claim that can.

**P10 · Recording streams continuously; a crash costs seconds, not the meeting.** Audio is sent to
the backend in short pieces as it is captured. There is no second take with a real client, and a
design that holds an hour in browser memory will eventually lose one.

**P11 · A failed recording fails loudly.** Following [`advisor-progression.md`](advisor-progression.md)
§1: a tidy page of "no observations" must never be what a total failure looks like. If capture,
transcription or generation failed, the screen says so in those words.

**P12 · Meeting types are authored and they cascade.** *(Mike's ruling, 2026-09-02: "the creation
of meeting types must be dynamic, editable and cascading from mentor — all down thru the layers
until reaching the business entity level".)* The mentor creates them, every level below may accept,
edit, switch off or add its own, and the chain ends at the business entity the meeting is with.

> 🔴 **THIS REPLACES A RULE MIKE NEVER MADE, AND THE REPLACEMENT MATTERS MORE THAN THE RULE.**
> P12 used to require that every meeting type be an existing id in `data/logic_trees.json`.
> **Nobody asked for that.** It was written by the session that drafted this design on
> 2026-09-01 and carried no attribution, unlike P2, P8 and P13, which carry his name. His words
> on being shown it: *"i have ZERO idea where the meeting types being linked to logic trees came
> from"*. The old wording is not reproduced here — a superseded rule quoted in full is the next
> session's instruction.
>
> ⚠ **AND IT HAD ALREADY COST SOMETHING.** The eleven meeting types shipped in
> `data/meeting-observations.json` were chosen by that session from the logic trees — not by
> Mike — and he was twice told to go and author observation points for "the ten empty ones".
> That would have been him writing content into categories he never picked. **The eleven are a
> suggestion to keep, rename or replace, and nothing more.**
>
> ⚠ **NOTHING IN THE CODE EVER DEPENDED ON IT.** Traced 2026-09-02 across every use of
> `scenarioId`: it is a key for the observation points and a name looked up from the trees.
> **No report, prompt or recorder walks a coaching tree from a meeting type.** The coupling
> bought a label and cost a constraint.

**P14 · Nobody edits a level ABOVE their own — and that is the whole rule.** *(Mike's ruling,
2026-09-02, correcting us: "I NEVER said advisor cant edit at business entity level or advisor
level — I said NOBODY can edit a level ABOVE their own".)* It matches what the cascade already
enforces: every route is scoped to the caller's own verified scope, so no tier can reach upward,
and `USER-LEVEL-CASCADE-HANDOVER.md` states the same thing as *"authority over content is total
within their firm, zero outside it"*.

> ⚠ **SO AN ADVISOR EDITING AT THEIR OWN LEVEL, OR AT A BUSINESS ENTITY'S, BREAKS NOTHING.**
> Those levels are below them. Earlier notes in this repository claimed advisors were excluded on
> principle, in four places, and **he never said it**; those sentences were ours and are deleted
> rather than corrected in place, so none of them survives to be read again. What is true is
> narrower and duller: **the levels below the firm are not built yet.** That is unfinished work,
> never a permission decision, and any note that reads otherwise is a defect to correct on sight.
>
> The directional half still binds: what a level changes binds **that level and below**, never
> above. An advisor tailoring a point for one client changes that client's meetings and nothing
> else — which is the same rule, not a second one.

**P13 · Nothing leaves the firm.** *(Mike's ruling, 2026-09-01 — "yes, nothing is shared outside our
firm".)* The approved consent line says this out loud to the client, so it is a constraint on the
code and not a form of words. **No transcript, observation, quotation or figure derived from a
recorded meeting travels beyond the firm** — not to Advisor-e, not to another firm, not into any
aggregate that leaves the tenancy. This is stricter than the rest of the app on purpose:
[`case-reviews.md`](case-reviews.md) *does* send anonymised cases upward, under its own separate
double consent, and a reader who assumes Meeting Review works the same way would break a promise a
named person heard spoken. **Anything that would change this needs new consent wording first, and
the two must ship together** — the sentence is the only one in this feature that a later change can
silently falsify.

---

## 3. Design considerations

**What the pre-set actually is.** Before the meeting, the advisor picks the scenario and confirms
or edits the observation points attached to it — the firm's list, not a blank page. They may add
objectives of their own for this meeting. **The list is then shown to them before they walk in**,
which is the first place this feature pays, before a word is recorded.

**Knowing who spoke is settled, and it costs less than this design first assumed.** *(Mike's
ruling, 2026-09-01.)* "Did the advisor use a metaphor" is unanswerable without separating the
advisor's speech from the client's, and roughly half the checks are of that shape. **The transcript
and the speaker turns come from the same OpenAI call** — the diarizing transcription model, asked
for its diarized response format, returns each segment with a speaker, a start and an end. That
matters well beyond convenience: OpenAI is already this app's contracted sub-processor and
`server/utils/openaiClient.js` already calls that host on Node 14, so **no second company is
introduced to hold an hour of a client's private affairs** — which is why §4 item 5 is smaller than
it looks.

✅ **CHECKED AND PROVEN END TO END, 2026-09-01, before slice 2 was written.** `gpt-4o-transcribe-diarize`
is enabled on the account, and a real call was made: two synthetic voices stitched into one recording,
sent with `response_format=diarized_json`, came back as **8 segments across 2 correctly separated
speakers**, the first being the one who read the consent line. So the anchor below is not a hope. The
call took under 9 seconds for 23 seconds of audio.

⚠ **BUT THE MODEL NAME CANNOT BE PINNED TO A DATED SNAPSHOT, AND THAT IS NOT AN OVERSIGHT.** Every
other transcription model on the account ships dated variants (`gpt-4o-mini-transcribe-2025-12-15`
and so on); this one is published as an **undated name only**. OpenAI can therefore change what sits
behind it without the name changing, and this repository's habit of pinning every version cannot be
followed here. The name is written in exactly one place — `DIARIZING_MODEL` in
`server/utils/transcriptionClient.js` — and the shape of every reply is validated rather than
trusted, which is the only defence available while no dated pin exists. **Re-check periodically.**

**Which speaker is the advisor is answered by P1, not by a voice sample.** The model will accept
short reference recordings and name speakers from them. **This design deliberately does not use
that.** A stored sample of an advisor's voice, held so that software can recognise them, is
biometric data — special-category under UK and EU law, in the same tier as health records, and one
more thing to guard and to destroy. It is also unnecessary, because **the advisor is the one who
speaks the consent line and it is the first thing on the recording**. The legal foundation and the
technical anchor are the same sentence. Per-speaker microphones were rejected separately: they work
only for in-person meetings and make the feature depend on hardware a firm must buy.

**The consequence, and it constrains the consent wording.** Speaker labels are assigned per
request, so "speaker 1" in one chunk is not "speaker 1" in the next. Chunked capture still buys
crash-safety and an early transcript, but **reliable attribution needs one pass over the assembled
recording once the meeting ends** — so the client summary can be ready almost immediately and the
advisor's review arrives a few minutes later. And because the anchor is the consent line, that line
**must be spoken by the advisor, and spoken first**. Shortening it, moving it, or letting the client
read it breaks attribution silently, which is trap 1 in §5.

**What cannot be observed, stated plainly.** Audio hears a metaphor — *"it's like a leaking
bucket"*. It cannot see a drawing. For the drawing check the honest options are to detect its
verbal signature (*"let me sketch this out"*), or to ask the advisor to confirm afterwards, and in
both cases **the report says which of the two it is**. It also cannot see a client's face, cannot
tell a pause for thought from a pause for a phone call, and cannot hear a document handed across a
table. A report that does not admit its blind spots will be trusted in places it should not be.

**The mechanical set is cheap, credible and should ship first.** Talk-time ratio, longest
monologue, open versus closed questions, silence after a question, jargon density against a
firm-editable glossary, and whether the agreed actions were reached before the time ran out. None
needs a model, none can hallucinate, and *"you spoke for 78% of a discovery meeting"* is more
useful than most of what the AI will produce.

**Follow-through is what makes this compound.** The actions agreed in March, checked against
April's transcript. It is the strongest argument for the feature and it is not available anywhere
else — but it is only possible because the actions were extracted with citations in the first
place, which is another reason P4 is load-bearing.

**Live capture was chosen over file upload, and the cost is recorded.** *(Mike's ruling,
2026-09-01, against the recommendation on the day.)* Upload would have been materially simpler and
robust to a sleeping laptop. Live capture was chosen and brings two things upload could not: the
spoken consent of P1, and transcript text that is ready when the meeting ends, because the pieces
are transcribed as they arrive — the text at once, though its speaker labels follow the final pass
described above. **The residual risk is the browser tab** — an operating system may
throttle or suspend a backgrounded tab, and a screen lock mid-meeting is not a rare event. Hold a
wake-lock, and treat "recording stopped unexpectedly" as an alarm, never a silent state.

**Chunking solves two problems at once.** The transcription API rejects large files, so an hour of
audio must be split however it arrives. Splitting it at capture time therefore costs nothing extra
and buys the crash-safety of P10 and the near-instant transcript text above — not its speaker
labels, which are taken from the whole-recording pass instead.

**Where the observation points are edited, and at which tiers.** They are content that shapes AI
output, so the hub-page rule in `CLAUDE.md` applies: **the mentor tier gets the screen, and gets it
first.** A firm gets its own editing view because a firm's scripts and standards genuinely differ
from the platform's — that is the whole of the request.

🔴 **ALL FOUR MANAGER TIERS EDIT THEM, ruled by Mike 2026-09-02** in his own words: the points are
*"editable and creatable by firm managers also — obviously, we start several as a mentor, they
cascade down to global group and group manager before firm manager, they accept or edit"*. The
mentor-alone default of 2026-08-24 holds until a tier has a real reason to differ, and he has given
it. **BUILT** for those four the same day (one line in `TAB_TIERS`).

🔴 **AND IT DOES NOT STOP AT THE FIRM — it runs to the business entity** (his later ruling the same
day, P12). Two lists cascade, not one: the meeting **types**, and the observation **points** within
each type. The two levels below the firm — the advisor, and the business entity the meeting is with
— are **NOT BUILT**, and there is no storage for them: the overlay is keyed to a firm id with a
database row behind it, so a per-entity scope needs its own shape. The client register already
exists (`/api/clients`, "Who is this session for?"), so the entity is a real record to hang it on.
See P14 for who may edit what — the answer is everyone, at their own level and below. The mechanism is the existing `firmOverlay` store under its own `config_key`, which brings
version history and restore with it; `loadResolvedObservations` already resolved through all four,
so the widening was one line in `TAB_TIERS` and no backend change at all.

**The retention dial is a selling point, not just a safeguard.** "We destroy the recording as soon
as it is text, and you choose how long the text lives" is a sentence a firm owner will repeat to
their own client. It is worth building as a visible setting rather than a buried default.

---

## 4. What this needs before it can go live

**None of these is a coding task, and none can be discovered late.**

1. ✅ **The PII rule — settled 2026-09-01.** `CLAUDE.md` says *"Strip internal DB IDs and PII before
   sending anything to an LLM."* A meeting transcript cannot comply, so Mike granted a written,
   scoped exception, and it is **in `CLAUDE.md` itself** under Security & data integrity — not an
   assumption that the rule was not meant literally. **Read its four conditions before writing a
   prompt**: they are the exception, not a preamble to it. Two matter most here — internal DB IDs
   and firm/advisor identifiers are **still stripped**, because the exception covers the spoken
   content alone; and it is **named to this feature and sets no precedent**.
2. ✅ **Consent wording — settled 2026-09-01.** The spoken line, the two-step screen, and the
   handling of a refusal or a withdrawal are approved and recorded in
   [`../MEETING-CONSENT-WORDING.md`](../MEETING-CONSENT-WORDING.md), registered in
   [`../ARTEFACTS.md`](../ARTEFACTS.md). **What remains is not drafting but review: a lawyer reads
   it in each market the feature is sold into**, and the eight locales are translated by someone
   competent in the local law rather than machine-translated — see that page §5, and item 6 below.
3. **A data protection impact assessment.** Recording identifiable third parties and processing
   what will sometimes be special-category data (health, family, bereavement) requires one.
4. **Staff consultation.** Recording employees and generating performance findings about them is
   monitoring in employment-law terms, whoever owns the report. P2 makes the position defensible;
   it does not remove the obligation.
5. **The transcription terms, for audio specifically.** Smaller than this list first assumed: the
   provider is OpenAI, already this app's contracted sub-processor (§3), so no new company and no
   new data-processing agreement are introduced. What is still needed **in writing** is that the
   existing terms cover *submitted audio* — no training on it, and a stated retention period —
   because a text prompt and an hour of a named client's financial affairs are not the same
   undertaking.
6. **Jurisdiction.** The app is already localised for more than one country, and the law on
   recording a conversation is not the same in all of them.
7. **The client's rights.** A named individual may ask for a copy of what was recorded about them,
   or its deletion. There must be an answer before the first recording, not after the first request.

---

## 5. For the coder

⚠ **A row marked BUILT exists and runs. Every other row is still a proposal** — where the piece
is *intended* to live, chosen to match the existing architecture rather than invent a shape.

| Piece | Path | State |
|---|---|---|
| Observation points, platform defaults | `data/meeting-observations.json` | ✅ **BUILT** — `eoy_meeting` seeded with Mike's four approved points; the other ten meeting scenarios registered and **empty**, for the mentor to author |
| The cascade and the validator | `server/utils/meetingObservations.js` | ✅ **BUILT** — `resolveInheritedRows`, mirroring the Advisory Staircase |
| Each tier's own decisions | `firmOverlay`, `config_key` ×3: `meeting-observation-declines` · `-overrides` · `-own` | ✅ **BUILT** — separate and additive, mirroring `firmStaircase.CONFIG_KEYS`. ⚠ **NOT one `meeting-observations` key**, as this table proposed: a single blob cannot express "switch this one off" and would freeze a firm's list against the mentor's later corrections |
| Manager routes | `server/routes/meetingObservations.js` | ✅ **BUILT** — 9 routes, all scoped to `req.firmId` |
| Manager editing, every tier | `components/firm/FirmMeetingObservations.vue`, a Hub tab per §3 | ✅ **BUILT** — all four manager tiers since 2026-09-02 (Mike's ruling, §3). The levels below the firm are **not built**, which is unfinished work and not a permission decision |
| The advisor's pre-set | `components/MeetingPreset.vue`, `pages/meeting-preset.vue` | ✅ **BUILT** — read-only **today**, because the advisor and business-entity levels do not exist yet. Not a rule about advisors: see P14 |
| Chunk intake, assembly, deletion | `server/routes/meetingReview.js` (Restify) | ✅ **BUILT** — 10 routes. The recording ones are `firmAuth` only and guard themselves on `req.advisorId` as well as `req.firmId`, because P2 gives a recording to the advisor who made it |
| The audio itself, while it exists | `server/utils/meetingAudioStore.js`, under `MEETING_AUDIO_DIR` | ✅ **BUILT** — **this server's own disk** (Mike's ruling, 2026-09-01), never the database and never the Google Drive pipeline the document library uses. `destroyAudio` and `destroyMeeting` **return a count of what they removed and re-read the directory to check** — trap 4 says deletion must be provable, and a function that answers quietly cannot be |
| Transcription client | `server/utils/transcriptionClient.js`, beside `openaiClient.js` | ✅ **BUILT** — multipart on Node 14 with no new dependency. ⚠ As predicted, this was new work rather than a call added to `openaiClient.js`, which speaks only to `/v1/chat/completions` |
| The retention dial | `server/utils/meetingRetention.js`, `firmOverlay` key `meeting-retention` | ✅ **BUILT** — P8's clock, cascading through the tier chain, surfaced on the existing Meeting Observations tab. ⚠ **The consent screen RENDERS this figure**; 18 months is where the cascade ends, not a constant |
| Consent screens | `components/MeetingConsentPanel.vue`, wording in `locales/en.json` | ✅ **BUILT** — English only. The other seven locales are deliberately empty: §5 of the wording artefact requires a translator competent in the local law, not a machine translation |
| Recording screen | `components/MeetingRecorder.vue` — `MediaRecorder` inside `mounted()` only | ✅ **BUILT** — with the wake-lock and the loud alarm of P10/P11 |
| The advisor's page | `pages/meeting-record.vue` | ✅ **BUILT** — carries the §4 warning banner |
| Mechanical measures | `server/utils/meetingMetrics.js` — no AI | ✅ **BUILT** — four figures, not the drawing's six. **Jargon** needs a firm glossary that does not exist (Mike's ruling 2026-09-02: absent, not empty). **Actions agreed** cannot be counted, only understood, so it comes from the summary generator with a citation and renders with the summary — leaving it here would print *"no AI is involved"* above a figure an AI produced |
| The two report generators | `server/utils/meetingReports.js` — separate prompts | ✅ **BUILT** — two prompts, two calls, two stores. Every quote is verified against the transcript before storage; an uncited one, or one the CLIENT said, is dropped and the point reports not found. The transcript is wrapped in delimiters and the model told it is not instructions |
| The reports screen | `components/MeetingReview.vue`, `pages/meeting-review.vue` | ✅ **BUILT** — reached from the recorder's finished state, which is its only route in. Four named differences from the drawing (below) |
| Hearability of a point | `cannotHear` + `hintWords` on an observation point | ✅ **BUILT** — the two fields slice 1 deliberately left out, now settled: the AUTHOR marks a point un-hearable, never the model. Schema only; no content was written |
| Transcript expiry | a scheduled purge over `MEETING_AUDIO_DIR` | proposed — **deliberately not in slice 2** (Mike, 2026-09-01). Destroying the audio is the promise the consent line makes; expiring the transcript is its own piece of work |

**✅ SETTLED IN SLICE 3 — the question slice 1 deliberately left open.** A point such as *"I drew
the numbers out for the client"* cannot be heard on audio (§3), and the drawing shows it as a third
state beside Found and Not found. Slice 1 stored a point as words alone, because *how* that class is
determined is a real question rather than a storage one. **Mike ruled on 2026-09-02: whoever writes
the point marks it**, with optional words that hint it happened. It is a property of the point —
*"I drew the numbers out"* is un-hearable in every meeting that will ever happen — so it is decided
once on the authoring screen and never guessed afresh by a model that would answer inconsistently
month to month with nothing to inspect. The two rejected options are recorded because they are the
ones a later session would reach for: letting the model classify it, and leaving the state out
altogether — the second is the worse of the two, because a drawing point then returns **Not found**,
telling an advisor they failed at something the software merely could not hear. The stored finding
remains **the advisor's confirmation, never the guess** (Mike, 2026-09-01), and the hint words only
ever raise the question.

**The route shape follows the rules already in force.** All third-party calls and all secrets are
backend-only; `server-middleware/` stays a thin proxy. Transcription and generation exceed the
2000 ms page-render rule by a wide margin, so both return a job id and are polled. Every route is
wrapped and returns `{ success: false, error: { code, message }, timestamp }`.

**Node 14.15 applies unchanged.** No `Array.at()`, no `Object.hasOwn()`, no top-level await;
CommonJS on the backend. The multipart question is already answered and needs no research:
`formidable` 2.1.2 is a pinned dependency and `server/routes/firmManager.js` already parses uploads
with it — follow that route's pattern rather than choosing a handler.

**The AI output is parsed and validated before anything is stored**, and the validator is tested
against valid, malformed, missing-field and wrong-type responses — the 100% target in `CLAUDE.md`
applies to it. An observation whose citation does not appear in the transcript is dropped, and the
drop is logged.

**Traps to expect** — none has bitten yet, because nothing is built:

1. **Attribution that looks confident and is wrong.** Two ways in. If speaker separation degrades,
   every attribution check becomes a coin toss while still reading as certain. And because labels
   are assigned per request, stitching chunk-level labels into a whole-meeting transcript will
   quietly swap the two people over — which is why attribution comes from one pass over the
   assembled audio (§3) and never from the chunks. Either way it must fail visibly, not blur.
2. **Aggregates that resolve to one person.** A firm with three advisors makes P3's "patterns, not
   names" arithmetic trivially reversible. **The threshold is set: no figure appears at all until at
   least 5 advisors and 20 meetings have contributed** *(Mike's ruling, 2026-09-01)*. It is a design
   decision, not a tuning constant, and it is **not** to be lowered to make a screen look populated.
   ⚠ **The accepted cost, recorded so nobody "fixes" it later:** a firm with four advisors sees no
   manager figures ever. That is the correct outcome — they still set the observation points and
   their advisors still get their own reports. The empty state must say why it is empty, or the
   first person to meet it will read it as a bug and file one.
3. **The client summary inheriting coaching language.** The reason for P6, and it will only be
   noticed when a client reads it.
4. **Deletion that is best-effort.** P8 is a promise made to a firm's clients. If a chunk fails to
   delete, that has to surface.

### Known state

**Slices 1 and 2 are built (both 2026-09-01).** Slice 1: the observation points, their four-tier
cascade, the mentor and firm editing screen, and the advisor's pre-set. Slice 2: the retention dial,
the two consent screens, live capture, chunk intake, the whole-recording transcription pass, and the
deletion of the audio. **170 tests for slice 2**, suite green at **6,880** (362 suites), lint 0
errors. Both ride `firmOverlay`, which already provides storage, version history and restore for
Advisory Distinctions, the Staircase, quizzes and currency, so none of that was built twice.

**Slice 3 is built (2026-09-02).** Meeting Summary, My Coaching Notes, the mechanical measures, the
citation check, the dispute, and the advisor's answer on a point a recording cannot hear. **135 new
tests**, suite green at **7,071** (371 suites), lint 0 errors.

**What is not built is the manager's half** — the aggregate above the 5-advisor / 20-meeting
threshold, the follow-through check across meetings, the transcript-expiry job, and the firm
glossary the jargon tile would need.

🔴 **FOUR THINGS SLICE 3 DECIDED, ALL RULED BY MIKE ON 2026-09-02 after being put to him one at a
time.** Each was a place the approved drawing asked for something the code cannot do — found by
putting the drawing beside the build *before* writing any of it, which is what the Save-the-Artefact
rule is for:

1. **"Play this moment" cannot exist.** P8 destroys the audio the instant a transcript exists, so by
   the time any report is generated there is nothing to play — the drawing and the feature's own
   non-negotiable contradicted each other. Replaced by **"Show this in the transcript"**, which
   expands the surrounding lines and serves what that control was for: checking evidence in context.
2. **"Send to client" cannot send.** This application has no mail channel and no such dependency.
   Adding one would put a named client's financial affairs through a company nobody has assessed —
   the same argument that kept the audio off Google Drive. Replaced by **"Approve this summary"** and
   **"Copy for the client"**; the advisor sends it from their own email, which is P7 exactly.
3. **The jargon tile is removed**, not left empty — see above.
4. **"Yes, I drew it" reads "Yes, I did"**, because the drawing's wording only works for the
   drawing's example and these buttons appear on any un-hearable point.

⚠ **THE PRE-BUILD CHECK IS DONE AND IT PASSED** — §3 carries the result, including the one thing it
turned up: the diarizing model has no dated snapshot to pin.

🔴 **THREE THINGS SLICE 2 DECIDED THAT THE DESIGN HAD LEFT OPEN**, recorded so nobody re-argues them:

1. **The audio lives on this server's own disk.** *(Mike's ruling, 2026-09-01.)* Reusing the Google
   Drive pipeline that `firmManager.uploadDocument` already uses would have been much the cheapest
   route and was rejected: the consent line says *"nothing is shared outside our firm"* out loud, and
   the argument that made OpenAI acceptable — already this app's contracted processor — does not
   cover Google. It also makes P8's deletion provable, because there is exactly one place to look.
2. **The transcript is a file beside the meeting record, not a database table.** No schema change was
   asked for and none is needed for this slice to be honest; keeping the transcript where the audio
   was is what makes "stop and delete" one provable act rather than two systems that must agree.
   ⚠ A later slice that needs to query transcripts across meetings should revisit this.
3. **A meeting with no confirmed consent cannot be transcribed.** `finish` returns 409. The tick
   records that the advisor *claims* consent; the audio records that it was *given*, and a transcript
   made without the first is one nobody ever said was allowed.

⚠ **AND ONE THING THE BUILD GOT RIGHT ONLY BECAUSE IT WAS WRITTEN DOWN FIRST: the audio is destroyed
in a `finally`.** It goes whether or not transcription succeeded. P8 is a promise about the recording,
not a reward for a clean run, and a failed transcription that left an hour of a client's meeting on
disk is exactly the lingering §1 calls a design failure. It has its own test.

**The two reports are named.** *(Mike's ruling, 2026-09-01.)* The client's is **Meeting Summary**;
the advisor's is **My Coaching Notes**. *Advisor Review* was rejected: inside a firm the word
"review" reads as an appraisal — something done *to* someone by a manager — which is the exact
reading P2 and the inherited tone rule exist to prevent. **"My" is load-bearing too**, because the
report belongs to the advisor and the name should say so before they open it.

---

## 6. Open decisions

| Question | Whose | Status |
|---|---|---|
| Names for the two reports | Mike | ✅ **Settled 2026-09-01** — **Meeting Summary** (client) and **My Coaching Notes** (advisor); *Advisor Review* rejected, §5 Known state |
| Consent wording, spoken and on screen | Mike | ✅ **Settled 2026-09-01** — spoken line, two-step screen, and the refusal path, in [`../MEETING-CONSENT-WORDING.md`](../MEETING-CONSENT-WORDING.md). A lawyer's review per market remains (§4 item 2) |
| The exception to the PII-to-LLM rule | Mike | ✅ **Settled 2026-09-01** — written into `CLAUDE.md`, named to this feature, four conditions, no precedent (§4 item 1) |
| Speaker separation approach | Ours to propose, Mike to choose | ✅ **Settled 2026-09-01** — provider diarization, advisor anchored to the consent line, no voice sample (§3) |
| Drawing check: verbal signature, or advisor confirms | Mike | ✅ **Settled 2026-09-01** — **both**: the verbal signature raises it and says it is guessing, the advisor confirms in one tap, and the stored finding is the confirmation, never the guess |
| Minimum cohort size for manager aggregates | Ours to propose | ✅ **Settled 2026-09-01** — **5 advisors and 20 meetings**, never lowered to populate a screen; §5 trap 2 records the accepted cost |
| Default transcript retention period | Mike | ✅ **Settled 2026-09-01** — **18 months**, as the platform default. It is spoken aloud to the client, so the line renders the firm's current figure and never a hardcoded one — [`../MEETING-CONSENT-WORDING.md`](../MEETING-CONSENT-WORDING.md) banner |
| Whether a firm may edit the consent wording | Mike | ✅ **Settled 2026-09-01** — **no**. One lawyer-checked version per market; the retention figure is the only value that varies |
| Where the audio lives while a meeting runs | Mike | ✅ **Settled 2026-09-01** — **this server's own disk**, never the database and never the Google Drive pipeline; §5 Known state 1 |
| Whether slice 2 also transcribes | Mike | ✅ **Settled 2026-09-01** — **yes.** Capture without transcription would leave audio with no deletion trigger, which is the one shape this feature must never take, even briefly |
| Whether the transcript-expiry job ships with slice 2 | Mike | ✅ **Settled 2026-09-01** — **no**, it is its own piece of work. Destroying the audio is the promise the consent line makes and that is built |
| The retention dial's own wording | Mike | ✅ **Approved 2026-09-01** — it is not in the drawing, so its labels were written for the build and put to him: "How long transcripts are kept", "Save this period", "Use the inherited period", "Set here" / "Inherited — …" |
| Which Handbook group this page belongs in | Mike | Provisionally **Learning**, beside Advisor Progress |

---

## 7. Related briefs

[`advisor-progression.md`](advisor-progression.md) — the record this feeds, and the source of the
tone rule · [`case-reviews.md`](case-reviews.md) — the existing pattern for real client material
travelling upward under double consent ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the inheritance mechanism the observation
points would use · [`logic-tables.md`](logic-tables.md) — the 42 scenarios the meeting type comes
from · [`product-principles.md`](product-principles.md) — the test this feature must pass ·
[`firm-manager-hub.md`](firm-manager-hub.md) — where the points are edited.

**History:** [`meeting-review-history.md`](meeting-review-history.md)
