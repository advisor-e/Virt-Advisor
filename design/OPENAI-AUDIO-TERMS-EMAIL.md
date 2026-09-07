# Email to OpenAI — written confirmation that the terms cover submitted audio

> **Draft for Mike to send.** Written 2026-09-07 on his instruction, closing item 5 of
> [`features/meeting-review.md`](features/meeting-review.md) §4 — the four things Meeting Review
> needs before a real client is recorded.
>
> 🔴 **THIS IS NOT A NEW CONTRACT AND MUST NOT BE SENT AS ONE.** OpenAI is already this
> application's contracted sub-processor: the advisory engine, the course engine and the economic
> analysis all call it, and the diarizing transcription model runs on the *same account*. The
> Brief's §3 records that as the reason no second company is introduced to hold an hour of a
> client's private affairs. **What is missing is narrow:** the existing agreement was signed with
> text prompts in mind, and an hour of a named client's financial affairs is a different
> undertaking. This email asks for that in writing, and nothing else.
>
> **Send it as it stands.** File the reply beside this page — item 5 of §4 is not closed by a
> phone call or by a public policy page, it is closed by a reply that names audio.

---

## The email

**Subject:** Written confirmation — data handling for audio submitted to the transcription API

Hi,

We are an existing customer using the API for text completions, and we are about to start
submitting **audio** for the first time — recorded client meetings, transcribed with speaker
separation via `gpt-4o-transcribe-diarize`.

Before we record a single real client we need four things confirmed **in writing**. We believe
all four are already covered by our existing terms; we need it stated for audio specifically,
because that is what our own clients are being promised out loud at the start of each recording.

**1 · Audio is not used for training.** Please confirm that audio files submitted to the
transcription API — and the transcripts returned from them — are not used to train or improve
any model, under our existing API agreement and with no additional opt-out required.

**2 · Retention.** Please state how long submitted audio is retained on your systems before
deletion, and whether that period differs from the retention that applies to text prompts. If a
zero-retention or shorter-retention option exists for audio on our account, please tell us how to
enable it.

**3 · The audio is covered by the same data processing terms as our text usage.** Please confirm
that submitted audio falls inside the scope of the data processing addendum already in place, and
that no separate agreement or amendment is needed.

**4 · Sub-processors and location.** Please confirm the regions in which submitted audio is
processed and stored, and whether any sub-processor other than those already listed handles it.

**Why we are asking precisely.** Every recording opens with a spoken consent line read to the
client, which tells them the recording is transcribed by AI, that the audio is destroyed as soon
as the transcript exists, and that nothing is shared outside the firm. We destroy the audio on our
side the moment transcription returns. What we cannot state on your behalf is what happens to the
copy you receive, and we are not willing to record a real person until we can.

We would also note, in case it is relevant to your answer: this content is often
**special-category personal data** under UK and EU law — a client's health, family circumstances
or bereavement will come up in a financial planning meeting whether or not anyone intends it to.

A short written reply is all we need — it does not have to be a formal amendment if the position
is already covered.

Many thanks,

Mike Bruce
Advisor-e

---

## What to do with the reply

1. **File it** — save the reply next to this page, or record where it is kept.
2. **Mark item 5 of §4 in [`features/meeting-review.md`](features/meeting-review.md)** with the
   date and what was confirmed. It is one of four items gating a first real recording.
3. ⚠ **If any answer is "no", stop and say so.** A "no" on question 1 or a long retention period
   on question 2 is not a detail to work around — the spoken consent wording in
   [`MEETING-CONSENT-WORDING.md`](MEETING-CONSENT-WORDING.md) would no longer be true, and that
   page and the code ship together by its own rule.
4. **This closes ONE of the four.** The data protection impact assessment, the staff consultation,
   and the lawyer's review per market are unaffected and still stand between the code and a real
   client meeting.
