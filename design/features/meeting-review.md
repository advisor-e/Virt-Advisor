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
cost.

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

---

## 3. Design considerations

**What the pre-set actually is.** Before the meeting, the advisor picks the scenario and confirms
or edits the observation points attached to it — the firm's list, not a blank page. They may add
objectives of their own for this meeting. **The list is then shown to them before they walk in**,
which is the first place this feature pays, before a word is recorded.

**Knowing who spoke is the hard part, and half the checks depend on it.** "Did the advisor use a
metaphor" is unanswerable without separating the advisor's speech from the client's. Speaker
separation from a single room microphone is genuinely difficult and is the largest technical
unknown in the feature. Options, in increasing order of cost: a transcription service that returns
speaker labels; a short voice sample from the advisor at the top of the recording; per-speaker
microphones for in-person meetings; or accepting a merged transcript and restricting the first
version to checks that do not need attribution. **This must be settled before build, not during.**

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
spoken consent of P1, and a transcript that is ready when the meeting ends, because the pieces are
transcribed as they arrive. **The residual risk is the browser tab** — an operating system may
throttle or suspend a backgrounded tab, and a screen lock mid-meeting is not a rare event. Hold a
wake-lock, and treat "recording stopped unexpectedly" as an alarm, never a silent state.

**Chunking solves two problems at once.** The transcription API rejects large files, so an hour of
audio must be split however it arrives. Splitting it at capture time therefore costs nothing extra
and buys the crash-safety of P10 and the near-instant transcript above.

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

1. **An explicit ruling on the PII rule.** `CLAUDE.md` says *"Strip internal DB IDs and PII before
   sending anything to an LLM."* A meeting transcript cannot comply. This feature needs a written,
   scoped exception recorded in `CLAUDE.md` itself — not an assumption that the rule was not meant
   literally.
2. **Consent wording, written and approved by Mike**, for the spoken line and the screen. It is the
   feature's legal foundation and is not a developer's to draft.
3. **A data protection impact assessment.** Recording identifiable third parties and processing
   what will sometimes be special-category data (health, family, bereavement) requires one.
4. **Staff consultation.** Recording employees and generating performance findings about them is
   monitoring in employment-law terms, whoever owns the report. P2 makes the position defensible;
   it does not remove the obligation.
5. **The transcription provider's terms**, in writing: no training on submitted audio, a stated
   retention period, and a data-processing agreement. The provider becomes a sub-processor of every
   client's confidential affairs.
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
CommonJS on the backend. A multipart upload handler must be checked for Node 14 support before it
is chosen, not after.

**The AI output is parsed and validated before anything is stored**, and the validator is tested
against valid, malformed, missing-field and wrong-type responses — the 100% target in `CLAUDE.md`
applies to it. An observation whose citation does not appear in the transcript is dropped, and the
drop is logged.

**Traps to expect** — none has bitten yet, because nothing is built:

1. **A silently merged transcript.** If speaker separation degrades, every attribution check
   becomes a coin toss while still looking confident. It must fail visibly, not blur.
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
| Consent wording, spoken and on screen | Mike | Open — blocks build |
| The exception to the PII-to-LLM rule | Mike | Open — blocks build |
| Speaker separation approach | Ours to propose, Mike to choose | Open — blocks build |
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
