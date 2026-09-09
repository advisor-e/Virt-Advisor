# Letter to OpenAI — written confirmation that the terms cover submitted audio

> **Ready to send.** Rewritten 2026-09-10 on Mike's instruction — *"draft the letter to open AI
> such that I can send it"*. The sendable text is everything between the two rules below; copy
> from `Subject:` to the signature and nothing else. The notes for us are at the foot of the page,
> below the second rule, and are not part of the letter.
>
> This closes item 5 of [`features/meeting-review.md`](features/meeting-review.md) §4 — one of the
> things Meeting Review needs before a real client is recorded.
>
> 🔴 **THIS IS NOT A NEW CONTRACT AND MUST NOT BE SENT AS ONE.** OpenAI is already this
> application's contracted sub-processor: the advisory engine, the course engine and the economic
> analysis all call it, and the diarizing transcription model runs on the *same account*. **What is
> missing is narrow** — the existing agreement was signed with text prompts in mind, and an hour of
> a named client's financial affairs is a different undertaking. This letter asks for that in
> writing, and nothing else.
>
> **Where to send it.** OpenAI does not publish a single address for this. The two that reach the
> right desk are the **privacy contact** (`privacy@openai.com`, or the request form at
> [openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy)) and, if the
> account has one, the **named account contact** — send to both, since the second is what gets it
> answered. If the reply comes back generic, the phrase that escalates it is *"we are asking as a
> data controller under the New Zealand Privacy Act 2020 and require a written answer for our
> records."*

---

**Subject:** Written confirmation — data handling for audio submitted to the transcription API

Hi,

We are an existing API customer using the platform for text completions. We are about to begin
submitting **audio** for the first time — recorded client meetings, transcribed with speaker
separation via `gpt-4o-transcribe-diarize` on our existing account.

Before we record a single real client we need five things confirmed **in writing**. We expect all
five are already covered by our existing terms; we need them stated **for audio specifically**,
because that is what our own clients are being promised out loud at the start of every recording.

**1 · Audio is not used for training.** Please confirm that audio files submitted to the
transcription API — and the transcripts returned from them — are not used to train or improve any
model, under our existing API agreement and with no additional opt-out required by us.

**2 · Retention, and Zero Data Retention.** Please state how long submitted audio is retained on
your systems before deletion, including any retention for abuse monitoring or safety review, and
whether that period differs from the retention applying to text prompts. **Please also confirm
whether our account is eligible for Zero Data Retention on the audio transcription endpoints, and
if so what we must do to enable it.** If ZDR is not available for these endpoints, please say so
directly.

**3 · The audio falls under our existing data processing terms.** Please confirm that submitted
audio and returned transcripts sit inside the scope of the data processing addendum already in
place on this account, and that no separate agreement or amendment is required.

**4 · Processing locations and sub-processors.** Please confirm the countries or regions in which
submitted audio is processed and stored, and whether any sub-processor not already on your
published list handles it. **We need this in order to meet information privacy principle 12 of the
New Zealand Privacy Act 2020**, which requires us to satisfy ourselves that personal information
disclosed outside New Zealand is protected by comparable safeguards. A general statement that data
"may be processed globally" is not sufficient for that test — we need the regions named.

**5 · Human review.** Please confirm whether any submitted audio, or any transcript returned from
it, is ever accessible to or reviewed by your personnel or contractors, and if so under what
circumstances and with what controls.

**Why we are asking precisely.** Every recording opens with a spoken consent line read to the
client. It tells them the meeting is transcribed by AI, that the audio is destroyed as soon as the
transcript exists, and that nothing is shared outside their advisor's firm. We destroy the audio on
our side the moment transcription returns, and that is provable in our code. What we cannot state
on your behalf is what happens to the copy you receive — and we are not willing to record a real
person until we can.

We would also note, in case it bears on your answer: this content is frequently **sensitive
personal information**, and would be **special-category data** under UK and EU law. A client's
health, family circumstances or bereavement will come up in a financial planning meeting whether or
not anyone intends it to. We are a New Zealand company and our clients' firms operate in several
markets.

A short written reply is all we need. It does not have to be a formal amendment if the position is
already covered by our existing terms — but we do need it in writing rather than by reference to a
public policy page, because our own record has to show what we were told and when.

Many thanks,

Mike Bruce
Advisor-e

---

## Notes for us — not part of the letter

**What changed on 2026-09-10, and why.** The letter previously asked four questions. It now asks
five, and two of the four were sharpened:

- **Zero Data Retention is now named explicitly** (question 2). Asking "how long do you keep it"
  invites a policy link; asking "are we eligible for ZDR on these endpoints and how do we turn it
  on" invites a yes or a no. It is the single highest-value sentence in the letter, because a yes
  removes the retention question altogether rather than answering it.
- **Question 4 now names IPP12** and says why a "processed globally" answer fails. Under the NZ
  Privacy Act we must satisfy *ourselves* that the recipient has comparable safeguards, which we
  cannot do against an unnamed region. See
  [`MEETING-REVIEW-DPIA.md`](MEETING-REVIEW-DPIA.md) §6.
- **Question 5 on human review is new.** The spoken consent line tells a client the recording is
  transcribed by AI. If a person at the provider can listen to it, that sentence is incomplete —
  which is a wording question, not only a contractual one.

**What to do with the reply.**

1. **File it** — save the reply next to this page, or record here where it is kept, with the date.
2. **Update [`MEETING-REVIEW-DPIA.md`](MEETING-REVIEW-DPIA.md) §6 (IPP12) and §9**, which both
   currently record this as unresolved and are the reason the assessment is not yet complete.
3. **Mark item 5 of [`features/meeting-review.md`](features/meeting-review.md) §4** with the date
   and what was confirmed.
4. ⚠ **If any answer is "no", stop and say so.** A "no" on question 1, a long retention period on
   question 2, or a "yes" on question 5 is not a detail to work around — the spoken consent wording
   in [`MEETING-CONSENT-WORDING.md`](MEETING-CONSENT-WORDING.md) would no longer be true, and that
   page and the code ship together by its own rule.
5. **This closes ONE of the five items in §4.** The impact assessment, the staff consultation, the
   lawyer's review per market, and the answer on a client's own rights are unaffected and still
   stand between the code and a real client meeting.
