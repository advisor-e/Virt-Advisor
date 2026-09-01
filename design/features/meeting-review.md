# Meeting Review — the Brief

> ## ⚠ NOTHING HERE IS BUILT. THIS IS A DESIGN FOR APPROVAL.
>
> **No code, no route, no screen and no data file for this feature exists in the repository.**
> Every section below describes what is *intended*, not what runs. Read it as a proposal to be
> marked up, and do not cite any sentence in it as a description of the app.
>
> It is written in the Brief's shape deliberately: the arguments are cheap to have on paper and
> expensive to have in code. When it is approved and built, the tense changes and this banner
> comes off. **The history is in [`meeting-review-history.md`](meeting-review-history.md).**

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

**P12 · The meeting type comes from the scenarios that already exist.** `data/logic_trees.json`
holds 42 named scenarios, of which roughly a dozen are meetings — `eoy_meeting`, `client_sales`,
`conflict_meeting`, `client_planning`, `trial_fit`, `dashboard_discussions`, `sales_process`,
`cautious_reveal`, `reveal_growth_curve`, `facilitation_101`, `public_speaking`. A second list of
meeting types beside them would drift within a month.

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
it looks. The model name is pinned like every other version in this repository, and must be
confirmed as enabled on the account before build; OpenAI retires audio models on a schedule.

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
first.** Per Mike's ruling of 2026-08-24 the default is the mentor tier alone; a firm gets its own
editing view because a firm's scripts and standards genuinely differ from the platform's — that is
the whole of the request — so this feature cascades to the firm. The two middle tiers get nothing
until one of them has a real reason to hold a different list. The mechanism is the existing
`firmOverlay` store under its own `config_key`, which brings version history and restore with it.

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

⚠ **None of the paths below exist yet.** They are where the pieces are *proposed* to live, chosen
to match the existing architecture rather than invent a shape.

| Piece | Proposed path |
|---|---|
| Chunk intake, assembly, deletion | `server/routes/meetingReview.js` (Restify) |
| Transcription client | `server/utils/transcriptionClient.js`, beside `openaiClient.js` |
| Mechanical measures | `server/utils/meetingMetrics.js` — no AI |
| The two report generators | `server/utils/meetingReports.js` — separate prompts |
| Observation points, platform defaults | `data/meeting-observations.json` |
| Firm's edited points | `firmOverlay`, `config_key='meeting-observations'` |
| Recording screen | `components/MeetingRecorder.vue` — `MediaRecorder` inside `mounted()` only |
| The reports screen | `components/MeetingReview.vue` |
| Mentor / firm editing | a Hub tab, per §3 |

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
   names" arithmetic trivially reversible. A minimum cohort size is required, and it is a design
   decision, not a tuning constant.
3. **The client summary inheriting coaching language.** The reason for P6, and it will only be
   noticed when a client reads it.
4. **Deletion that is best-effort.** P8 is a promise made to a firm's clients. If a chunk fails to
   delete, that has to surface.

### Known state

**Nothing is built.** No route, no screen, no data file, no test. The manager-editable half is the
only part with existing machinery behind it — `firmOverlay` already provides storage, version
history and restore, and is used by Advisory Distinctions, the Staircase, quizzes and currency.

**Also unresolved:** the names of the two reports. *Meeting Summary* and *Advisor Review* are
placeholders used throughout this page and **have not been approved**. Nothing should be labelled
from them.

---

## 6. Open decisions

| Question | Whose | Status |
|---|---|---|
| Names for the two reports | Mike | Open — placeholders in use |
| Consent wording, spoken and on screen | Mike | ✅ **Settled 2026-09-01** — spoken line, two-step screen, and the refusal path, in [`../MEETING-CONSENT-WORDING.md`](../MEETING-CONSENT-WORDING.md). A lawyer's review per market remains (§4 item 2) |
| The exception to the PII-to-LLM rule | Mike | ✅ **Settled 2026-09-01** — written into `CLAUDE.md`, named to this feature, four conditions, no precedent (§4 item 1) |
| Speaker separation approach | Ours to propose, Mike to choose | ✅ **Settled 2026-09-01** — provider diarization, advisor anchored to the consent line, no voice sample (§3) |
| Drawing check: verbal signature, or advisor confirms | Mike | Open |
| Minimum cohort size for manager aggregates | Ours to propose | Open |
| Default transcript retention period | Mike | Open |
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
