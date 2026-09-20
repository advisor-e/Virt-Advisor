# Letter to OpenAI Sales — reply to Kalaiselvam, drafted 2026-09-18

**Status: DRAFT FOR MIKE. Not sent.** It answers the three things Kalaiselvam asked for
(region, endpoints and models *including post-transcription processing*, and Edward's case
reference) and asks for the two things only he can start: **Zero Data Retention** and a
**written confirmation for our configuration**.

> ⚠ **Two blanks only Mike can fill**, both marked `[...]` in the letter:
> the **support case reference** from Edward's reply (§5.1 of
> [`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md)), and the **region** —
> New Zealand is where the firms are, and OpenAI's data-residency list is theirs to confirm,
> so the letter asks rather than assumes.

**Every technical fact below was read from the code on 2026-09-18, not recalled:**

| What he asked | Our answer | Where it is true in the repo |
|---|---|---|
| Endpoint, transcription | `/v1/audio/transcriptions` | `server/utils/transcriptionClient.js:43` |
| Model, transcription | `gpt-4o-transcribe-diarize` | `server/utils/transcriptionClient.js:49` |
| Endpoint, the reports | `/v1/chat/completions` | `server/utils/openaiClient.js:51` |
| Model, the reports | `gpt-4o-mini` | `config/integration.js:280` (`report` role) |
| Processing after transcription | Two reports, from the whole transcript | `server/utils/meetingReports.js` |

---

## The letter

> **Subject:** Zero Data Retention and written confirmation — meeting transcription and
> summarisation (following your 18 September reply)
>
> Dear Kalaiselvam,
>
> Thank you for this — it is the first reply we have had that answers the question directly, and
> the distinction you drew between the transcription endpoint and the rest of the workflow is
> exactly the one that matters to us. I am grateful for it.
>
> You asked for our region, our endpoints and models including any processing after
> transcription, and Edward's case reference. All three are below.
>
> **What the application does.** We are building a feature for accounting and advisory firms that
> records a consented client meeting, transcribes it, and produces two written outputs: a summary
> of what was agreed, for the client, and a private note for the adviser on how they handled the
> meeting. The people recorded are small-business owners and their advisers. The audio is
> destroyed by us once it has been transcribed.
>
> **Our endpoints and models, in the order they run:**
>
> | Step | Endpoint | Model | What is sent |
> |---|---|---|---|
> | 1. Transcription | `/v1/audio/transcriptions` | `gpt-4o-transcribe-diarize` | The meeting audio |
> | 2. The two reports | `/v1/chat/completions` | `gpt-4o-mini` | The full transcript, as text |
>
> Step 2 is the processing after transcription you asked about, and it is the reason I am
> writing. As you set out, the transcription endpoints carry no abuse-monitoring retention and
> no application-state retention — but our transcript is then submitted to
> `/v1/chat/completions`, which by your description falls under standard abuse-monitoring logs of
> up to 30 days. The transcript carries the whole of the meeting's spoken content, so for our
> purposes step 2 is where the personal data sits, not step 1.
>
> **Preferred region:** our firms and their clients are in New Zealand, and the meeting content
> is New Zealand personal information governed by the Privacy Act 2020. Please tell me which
> supported region you would recommend for us, and whether in-region processing — not only
> in-region storage — is available there for both endpoints above. If New Zealand is not
> supported, I would like to know the nearest region that is, and precisely what would still be
> processed or logged outside it.
>
> **Edward's support case reference:** [INSERT CASE REFERENCE FROM EDWARD'S REPLY]
>
> **What I am asking for, specifically:**
>
> 1. **Zero Data Retention** for our organisation, covering **both** endpoints above — most
>    importantly `/v1/chat/completions`, since that is where the transcript goes. Please confirm
>    whether we are eligible, what the approval requires from us, and what the process and
>    timescale look like.
> 2. **Written confirmation for our configuration**, addressing these four points. I am not
>    asking anyone to sign off on our use of the service — only to state what your systems do:
>    a. With ZDR in place, whether any part of a transcript submitted to `/v1/chat/completions`
>       is retained in abuse-monitoring logs, and if so for how long.
>    b. Which of the two categories of human access you described — authorised employees, or
>       specialised third-party contractors — could reach content from either endpoint, under
>       ZDR and without it.
>    c. Whether the exceptions you referred to ("endpoint, feature, and documented safety
>       exceptions still apply") would apply to either endpoint above, and in what circumstances.
>    d. Confirmation that inputs and outputs on both endpoints are not used for model training
>       unless we opt in, as your reply states.
>
> **Why this is worth your time, and I will be straightforward about it.** We are not yet
> processing a single real recording. The feature is built and is being held closed until we can
> describe truthfully to a client, in the consent we ask for aloud before recording begins, what
> happens to their words. We are not able to tell them that no person could ever access the
> recording — your reply makes clear that would be untrue — and we have no intention of saying
> so. What we need is to be accurate about the retention and the access that do apply, and ZDR
> would let us describe a materially better position than the one we can describe today.
>
> If a call would be the faster route to the ZDR application, I am happy to have one, though I
> would ask that the four points above come back in writing whatever we discuss.
>
> With thanks for a genuinely useful reply,
>
> Mike Barnes
> Advisor-e
> mike@advisor-e.com

---

## Notes for us — not part of the letter

**What this letter deliberately does not do:**

- **It does not ask anyone to approve our use of the service.** Mike's ruling of 2026-09-18
  stands: *"you will NEVER get a single person to 'sign-off' on this within OpenAI."* Every one
  of the four points asks OpenAI to state what **their own systems do** — a question their
  support staff can answer without any authority over our design.
- **It does not repeat the five original questions.** Three of them are now answered by his
  reply (human access, training opt-in, endpoint retention). Re-asking answered questions is how
  the first two letters were read as a form and handled as one.
- **It does not claim ZDR would make human access impossible.** His reply says documented safety
  exceptions still apply, so point 2c asks what those are rather than assuming they are nil.

**If the reply is again a non-answer**, the record in
[`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md) §5.4 is unchanged and still holds:
published terms plus documented attempts, and nobody may call it confirmed. A fourth attempt
would then be evidence of diligence, not a blocker — the two remaining gates on Meeting Review
are the lawyer's review and the staff consultation, and neither waits on OpenAI.

**Related:** [`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md) §5.3 (his reply,
verbatim) · [`features/meeting-review.md`](features/meeting-review.md) §4 ·
[`MEETING-CONSENT-WORDING.md`](MEETING-CONSENT-WORDING.md) · [`MEETING-REVIEW-DPIA.md`](MEETING-REVIEW-DPIA.md)
