# ZDR intake — ready to send

> **Copy everything between the lines below, fill the nine `[BRACKETED]` blanks, send it.**
> To: Kalaiselvam, OpenAI · Subject: **ZDR intake — support case 14889777**
>
> The nine blanks are the only things not answerable from the code. Everything else was read
> off the repository and is correct as written — see
> [`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md) §5.5 for the reply this answers
> and §6 for where each line came from.
>
> ⚠ **When it is sent, write the date at the top of this file.** A drafted email nobody sends is
> the failure that left the master-team integration email unsent through six releases.
>
> **Status: NOT SENT.**

---

Hi Kalaiselvam,

Thank you — that's the clearest answer we've had, and confirming that both endpoints are
ZDR-eligible addresses the specific gap we were stuck on. The intake follows.

**Contact**

- Legal signer name: **[YOUR NAME]**
- Legal signer email: **[YOUR EMAIL]**
- Legal signer title: **[YOUR TITLE]**

**Company**

- Company name: **[LEGAL ENTITY NAME, as it appears on the OpenAI account]**
- Website: https://advisor-e.com
- Industry: Finance — professional-services software for accounting and business-advisory firms
- Publicly traded: **[YES / NO]**
- Existing Order Form with OpenAI: **[YES / NO]**
- OpenAI fund company: **[YES / NO]**
- Funding stage, if a startup: **[SELF-FUNDED / SEED / SERIES A / N/A]**

**OpenAI API Org ID:** **[ORG ID — list each one separately with its purpose if you have
separate production, testing and development orgs]**

**Use cases**

- [x] Chat and conversation
- [x] Summarization
- [x] Question-answering
- [x] Reasoning over structured and unstructured data
- [x] Drafting assistance
- [x] Writing with human review
- [ ] Writing without human review — deliberately not ticked. Nothing we generate reaches a
  client without an adviser reviewing it first.
- [ ] Code generation · [ ] Code transformation · [ ] Editing · [ ] Search — not used.

**Primary users: Other.**

Our users are professional advisers employed by accounting and business-advisory firms that
subscribe to the Advisor-e platform. They are not our employees, and they are not consumers
paying us directly — the subscribing firm is the customer and its advisers are the end users.

Authentication is handled entirely by the master Advisor-e platform, never by the application
making these API calls. An adviser signs in to Advisor-e, which issues a signed JWT; every
request into our application carries it as a Bearer token and is verified server-side, with firm
identity, role and scope read from the token claims. There is no local password store, no
self-registration and no anonymous access — a request without a valid token is refused.
Unrecognised role values resolve to the least-privileged role by design.

**Use-case detail** — further to the description already sent:

The workflow this request is for is Meeting Review. With the client's recorded spoken consent, an
adviser records a client meeting. The audio goes to `/v1/audio/transcriptions` using
`gpt-4o-transcribe-diarize`, and the audio is destroyed as soon as the transcript returns. The
transcript is then sent to `/v1/chat/completions` to produce two written reports — one for the
adviser, one summarising observations for their firm. It is that second call that carries an hour
of a named client's financial affairs, and it is the call this request is principally about.

Internal database identifiers and firm/adviser identifiers are stripped before anything is sent,
and the uploaded audio carries a neutral filename containing no meeting, firm or adviser
reference. What reaches the API is the spoken content of the meeting.

**Two things we would like answered rather than assumed:**

1. **Model names.** You list `gpt-4o-mini-2024-07-18`. Our summarisation runs on `gpt-4o-mini`
   (undated) and our transcription on `gpt-4o-transcribe-diarize`, which as far as we can
   establish is published under an undated name only. Does ZDR coverage attach to those names as
   we call them, or must we pin to dated snapshots — and if the diarizing transcription model has
   no dated variant, what is the position?

2. **Region.** Our requirement was in-region processing for New Zealand. We read your reply as
   saying NZ is unlisted, and that Australia offers storage only with no regional processing for
   either endpoint — so offshore processing is unavoidable and we should take legal advice on that
   basis rather than select a region to solve it. Please confirm that reading before we proceed.

Best regards,
Mike Barnes

---

## The nine blanks, and why each is yours

Nobody may fill these from the repository — inventing a funding stage or an org ID would put a
fabricated answer into a contractual process.

| Blank | Why it is not in the code |
| --- | --- |
| Legal signer name, email, title | No person is named anywhere in this repository as able to sign |
| Legal entity name | The app knows the brand `Advisor-e`, never the contracting company |
| Publicly traded / Order Form / fund company / funding stage | Corporate facts, held nowhere in the codebase |
| OpenAI org ID | The app reads a **key** from `config/integration.js` → `AI.primary.apiKey`. The **org** behind that key is not derivable from it |
