# Letters to OpenAI — written confirmation that the terms cover submitted audio

> **BOTH SENT 2026-09-12. Awaiting a written reply.** Two went out the same day, because the first
> reached a desk with no authority to answer it.
>
> | | Sent to | State |
> |---|---|---|
> | **§2 · The sales enquiry** | `openai.com/contact-sales` — the form, in two steps | **The live one.** Submitted by Mike; awaiting a human |
> | **§3 · The first letter** | `privacy@openai.com` | Auto-acknowledged within the hour with ChatGPT account-data links. Unanswered |
>
> 🔴 **THE ROUTE IS THE FINDING, AND IT SAVES THE NEXT ASK A DAY — BUT STATE IT PRECISELY.**
> `privacy@openai.com` is **the contractual address of record**: the DPA names it as the **Data
> Protection Officer** contact, and as where a customer objects to a sub-processor change. It is not
> the wrong address. What it does is **auto-triage into the consumer queue** — its same-day reply
> offered links on downloading ChatGPT account data, deleting an account and opting content out of
> training, and closed by saying that where an account is linked to a business offering *that
> organisation* handles the data rather than OpenAI, which is the script for an employee asking
> about their employer's ChatGPT seat. **Not a refusal, and not the wrong desk — an auto-responder
> in front of the right one.**
>
> **So the two routes are for two different things, and both are live.** The **account controls**
> (Zero Data Retention, Eyes Off, a named region) are granted per organisation by **sales**, which
> OpenAI's data-controls documentation states in terms. The **contractual points** — DPA scope for
> audio, the sensitive-data mismatch in §1 — belong at `privacy@openai.com`, because that is the
> address the contract itself nominates and a written answer from it is the one that stands.
>
> **Zero Data Retention and Eyes Off are granted per organisation by the sales team**, which
> OpenAI's own data-controls documentation states in terms: *"Get in touch with our sales team to
> learn more about these offerings and inquire about eligibility."* ⚠ **There is no sales email
> address** — the form is the only supported channel, and its message box will not take six hundred
> words. Hence two steps: a short opener to reach a human, then the enquiry as a reply in that
> thread. **That reply is also how this organisation acquires the named account contact it does not
> have**, which is the gap that sent the first letter to the wrong place.
>
> This closes item 5 of [`features/meeting-review.md`](features/meeting-review.md) §4 — one of the
> things Meeting Review needs before a real client is recorded. ⚠ **It closes on a written reply
> that names audio**, never on a documentation page. §1 is why the ask changed shape, not evidence
> that anything is settled.
>
> 🔴 **THIS IS NOT A NEW CONTRACT AND MUST NOT BE SENT AS ONE.** OpenAI is already this
> application's contracted sub-processor: the advisory engine, the course engine and the economic
> analysis all call it, and the diarizing transcription model runs on the *same account*. **What is
> missing is narrow** — the existing agreement was signed with text prompts in mind, and an hour of
> a named client's financial affairs is a different undertaking. Both letters ask for that in
> writing, and nothing else.
>
> If a **human** replies generically, the phrase that escalates it is *"we are asking as a data
> controller under the New Zealand Privacy Act 2020 and require a written answer for our records."*
> It is wasted on an auto-responder.

---

## 1. What OpenAI already publishes — why the ask changed shape

Read 2026-09-12 from OpenAI's data-controls documentation
([developers.openai.com/api/docs/guides/your-data](https://developers.openai.com/api/docs/guides/your-data)),
which covers the audio transcription endpoints **by name**. Four of the first letter's five
questions already have public answers. **None of this closes item 5** — a documentation page is not
a written reply, and it can change without notice. What it does is turn five things to *confirm*
into three account controls to *switch on* and one confirmation for the record.

| What we need | What is published today | What is still missing |
|---|---|---|
| **Not used for training** | *"As of March 1, 2023, data sent to the OpenAI API is not used to train or improve OpenAI models (unless you explicitly opt in to share data with us)."* The endpoint table reads **No** across the board | The same in writing, naming **audio** — that is what the client is promised aloud |
| **Retention** | `/v1/audio/transcriptions`, `/v1/audio/translations` and `/v1/audio/speech` show **no abuse-monitoring retention**, and all three are listed **Zero Data Retention eligible** | ZDR is not self-serve. Approved per organisation, through sales |
| 🔴 **Human review** | A separate control, **"Eyes Off"**, excludes customer content from human review — *"such content will be excluded from human review unless required by applicable law"* | **Its existence implies review is possible for accounts without it.** Eyes Off applied, or written confirmation no person can reach the audio |
| **Processing location** | Regional processing exists — separate `us.` and `eu.` API hosts — with content *"stored at rest in the selected region to the extent the endpoint requires data persistence"* | A region **selected** and named. IPP12 needs this, and it is a setting rather than a question |
| **The DPA covers audio** | Not addressed | Written confirmation. This was never going to come from a documentation page |

🔴 **Human review is the one that leans the wrong way, and it is one of the three that can falsify
the spoken consent line.** A vendor does not sell a control for excluding content from human review
unless content is otherwise reachable. It is not yet a problem — the audio endpoints show no
retention, so there may be nothing held to review — but *"nothing is retained"* and *"no person can
listen"* are two statements, and only one of them is published. §2 question 2 asks for the second.

### 1.1 The Data Processing Addendum — read 2026-09-12, and it answers more than expected

Read from [`cdn.openai.com/pdf/openai-data-processing-addendum.pdf`](https://cdn.openai.com/pdf/openai-data-processing-addendum.pdf).
Four findings, and the last is the sharpest point we have.

**A · We already have one, and it needed no signature.** *"By clicking 'I agree,' accepting the
Order Form, or using the Services, Customer agrees to this Agreement."* The DPA is incorporated into
the Services Agreement and accepted by use. §1.1: *"OpenAI acts as a Data Processor on the
Customer's behalf, and this DPA governs such Processing."* **So the processor relationship is in
force today** — §2 question 4 is asking whether it reaches *audio*, not whether it exists.

**B · Personnel are already bound.** §2.3: *"OpenAI will ensure that all persons authorized by
OpenAI to process Customer Data have committed themselves to confidentiality or are under an
appropriate statutory obligation of confidentiality."* ⚠ **Confidentiality is not inaccessibility.**
A person bound to confidence can still listen. This is why Eyes Off is asked for separately and why
the human-review row above stays open.

**C · New Zealand has no transfer mechanism in this contract.** §4.1 routes **EEA and Swiss** data to
**OpenAI Ireland Limited** under Standard Contractual Clauses; §4.2 routes **UK** data to **OpenAI
OpCo, LLC** under the UK Addendum. **New Zealand appears nowhere** — SCCs are an EU/UK instrument
and there is no adequacy decision to lean on. This is not a defect in the contract; it is why IPP12
puts the burden on the *disclosing agency* to satisfy **itself**. 🔴 **It is also why naming the
processing region is the substantive ask rather than a formality: it is the only thing that can
carry that test.**

**D · 🔴 THE MISMATCH, AND IT IS THE STRONGEST POINT WE HAVE.** Schedule 1 §5, on sensitive data:

> *"No sensitive data is intended to be transferred unless the user includes it unexpectedly in
> unstructured data."*

**Meeting Review transfers sensitive data by design, not unexpectedly.** A client's health, family
circumstances or bereavement will come up in a financial planning meeting whether or not anyone
intends it to — [`MEETING-REVIEW-DPIA.md`](MEETING-REVIEW-DPIA.md) says exactly that, and it is
special-category data under UK and EU law. The standard DPA contemplates that category **only as
something a user lets slip**. Our use makes it routine and foreseeable.

⚠ **Raise this in the reply thread, at `privacy@openai.com`, as a contractual point rather than a
support question.** It is the one place the terms we already hold actively contradict the use we are
about to make of them, and it is better discovered now than after a client has been recorded. It is
not in §2 because §2 was sent before this was read.

**Also recorded, since it is where the answer will have to be checked:** the Sub-Processor List is at
[`platform.openai.com/subprocessors`](https://platform.openai.com/subprocessors), a customer may
object to a change within 30 days, and §3.3 puts retention and deletion configuration **on us**:
*"Customer acknowledges and agrees that it is responsible for certain configurations and design
decisions for the Services … (e.g., retention periods, deletion, etc.) in a manner that complies with
applicable Data Protection Laws."*

---

## 2. The sales enquiry — SENT 2026-09-12 through the form. The live one

**Step one — the opener.** Short enough for a form's message box; its only job is to reach a human.

> We are an existing OpenAI API customer, based in New Zealand. We are about to begin submitting
> audio to the transcription API — recorded client meetings, transcribed with speaker separation —
> and before we record a single real client we need three account-level controls in place: Zero
> Data Retention on the audio transcription endpoints, Eyes Off, and a named data residency region.
> We also need written confirmation that submitted audio falls within the data processing addendum
> already on our account. Please put us in touch with someone who can action these. We have the
> detail written up and can send it on reply.

**Step two — the enquiry**, sent as a reply in that thread. Everything from `Subject:` to the
signature.

**Subject:** Zero Data Retention, Eyes Off and regional processing for audio transcription — existing API account

Hi,

We are an existing API customer. We are about to begin submitting **audio** for the first time —
recorded client meetings, transcribed with speaker separation via `gpt-4o-transcribe-diarize` on our
existing account. Before we record a single real client we need three account controls applied and
one point confirmed in writing.

Your published data-controls documentation indicates that all three controls exist and that the
audio transcription endpoints are eligible for them. We are asking you to apply them to our
organisation, and to confirm the position for audio specifically.

**1 · Zero Data Retention on the audio endpoints.** Your documentation lists
`/v1/audio/transcriptions` as Zero Data Retention eligible, and states that eligibility is arranged
through your sales team. Please confirm our organisation's eligibility and enable Zero Data
Retention at the organisation level for the audio transcription endpoints.

**2 · Eyes Off.** Please confirm whether our organisation qualifies for Eyes Off treatment, so that
submitted audio and the transcripts returned from it are excluded from human review, and apply it if
so. Your endpoint table shows no abuse-monitoring retention on the audio transcription endpoints; if
that already means no person at OpenAI or its contractors can access the audio or the transcript,
please state that directly, because it is not the same statement.

**3 · Regional processing.** Please confirm which data residency regions are available to our
organisation for the audio transcription endpoints, and enable the region we select. **We need the
region named rather than a statement that data may be processed globally.** Information privacy
principle 12 of the New Zealand Privacy Act 2020 requires us to satisfy ourselves that personal
information disclosed outside New Zealand is protected by comparable safeguards, and that test
cannot be met against an unnamed location.

**4 · Written confirmation for our records, covering audio specifically.** Please confirm in writing
that audio files submitted to the transcription API, and the transcripts returned from them, fall
within the scope of the data processing addendum already in place on this account with no separate
agreement or amendment required — and that they are not used to train or improve any model. Your
documentation states the second for API data generally; we need it stated for submitted audio.

**Why we are asking rather than relying on your published pages.** Every recording opens with a
spoken consent line read aloud to the client. It tells them the meeting is transcribed by AI, that
the audio is destroyed as soon as the transcript exists, and that nothing is shared outside their
advisor's firm. We destroy the audio on our side the moment transcription returns, and that is
provable in our code. What we cannot state on your behalf is what happens to the copy you receive —
and our own record has to show what we were told and when, which a link to a policy page cannot do.

We would also note, in case it bears on your answer: this content is frequently **sensitive personal
information**, and would be **special-category data** under UK and EU law. A client's health, family
circumstances or bereavement will come up in a financial planning meeting whether or not anyone
intends it to. We are a New Zealand company and our clients' firms operate in several markets.

For completeness: we wrote to your privacy address on 12 September 2026 and received an automated
reply concerning ChatGPT account data, which does not address any of the above. **We would also
welcome a named account contact for this organisation.**

Many thanks,

Mike Bruce
Advisor-e

**Why Zero Data Retention leads.** The four points are not equal. **If ZDR is granted it
substantially answers three of them at once** — nothing retained means nothing held to train on,
nothing sitting in a retention window, and nothing for a reviewer to listen to. That is why it is
question one, and why the ask is *"please enable this"* rather than *"please confirm that"*: a
request has to be actioned or declined, where a question can be answered with a link. ⚠ It is not a
certainty — eligibility is approved per organisation and a no is possible, which is why Eyes Off and
the region are asked for separately rather than folded into it.

---

## 3. The first letter — SENT 2026-09-12 to `privacy@openai.com`. Auto-acknowledged, unanswered

Kept as the record of what went out, and what came back. It asked the same ground as five open
questions. Nothing in it was wrong; it went to a desk with no authority to answer it.

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

## 4. Notes for us — not part of either letter

**What changed on 2026-09-10, and why.** The first letter previously asked four questions. It went
out asking five, and two of the four were sharpened:

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
5. **This closes ONE of the three gates that remain.** The other two are unaffected and still stand
   between the code and a real client meeting: **the lawyer's review per market** — which waits on
   this reply, since an answer here can change the wording a lawyer would be reading — and **the
   staff consultation**, which waits on neither and runs on its own track.
