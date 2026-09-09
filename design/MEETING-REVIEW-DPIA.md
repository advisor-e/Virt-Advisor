# Meeting Review — Data Protection Impact Assessment

**Compared against the New Zealand Privacy Act 2020, and against UK/EU GDPR where it goes further.**

> **Written 2026-09-10 on Mike's instruction** — *"i want the data protection impact assessment
> compared with the NZ privacy act"*. It closes item 3 of
> [`features/meeting-review.md`](features/meeting-review.md) §4.
>
> ## 🔴 What this document is, and what it is not
>
> **Advisor-e supplies software on an all-care basis.** *(Mike's statement of the position,
> 2026-09-10, and it governs how every page in this document is written.)* In his words: anyone
> using our software **is responsible for meeting legal requirements and is ultimately responsible
> for any information given or received.** We are required to **identify best practice and take all
> reasonable steps to comply** — but we cannot be responsible for a user who chooses to ignore our
> suggestions.
>
> So this document is **our assessment of the software we built**, written so that a firm, and a
> firm's own lawyer, can see exactly what the system does with personal information and decide for
> themselves whether they may lawfully use it. It is:
>
> - ✅ **a factual description of the processing**, written by the people who built it;
> - ✅ **our own assessment of the risks and what the software does about them**;
> - ✅ **a list of the things a firm must satisfy itself of**, in §9, because they are not ours to
>   answer.
>
> It is **NOT** legal advice, **NOT** a warranty that any firm is compliant, and **NOT** a
> substitute for a firm's own reading of the law that applies to it.
>
> 🔴 **AND WE DO NOT REQUIRE A FIRM TO TAKE LEGAL ADVICE — WE CANNOT.** *(Mike's ruling,
> 2026-09-10: "we can't dictate or make it a condition for firms to seek legal advice, we can only
> ask that they indicate that they have read and understand the law, as it relates to them, in
> their country.")* Taking advice is what we **suggest**, and it is what most firms will sensibly
> do. What we **ask** is narrower, and it is the thing we are entitled to ask: that a firm confirms
> it has read and understands the law as it applies to it, in its own country.
>
> 🔴 **THAT CONFIRMATION GATES THE FEATURE.** *(Same ruling — "yes, they have to tick a box before
> the feature becomes active.")* Meeting Review does not become active for a firm until it is
> given. ⚠ **Note what is gated and what is not:** the gate is the firm's own declaration, never
> our assessment of their paperwork. The completeness check in the hub is information for them,
> and it blocks nothing — Advisor-e does not decide when a firm is compliant enough to proceed.
>
> ⚠ **THIS ASSESSMENT IS NOT YET COMPLETE, AND §9 SAYS WHY.** Two of its findings are open, one of
> them squarely on us. It must not be published to firms as settled until those are closed.
>
> **Related:** [`features/meeting-review.md`](features/meeting-review.md) (the Brief — what the
> software does) · [`MEETING-CONSENT-WORDING.md`](MEETING-CONSENT-WORDING.md) (the words a client
> hears) · [`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md) (the outstanding question
> to the transcription provider, which §6 IPP12 depends on).

---

## 1. Why an assessment exists at all

**Under UK and EU law, one is mandatory for this processing.** GDPR Article 35 requires a Data
Protection Impact Assessment where processing is likely to result in a high risk to people's
rights. Meeting Review meets that bar on at least three counts taken separately: it processes
**special-category data** (a client's health, family circumstances or bereavement will surface in a
financial planning meeting whether or not anyone intends it to), it involves **systematic
monitoring of employees** (the advisor is being observed), and it applies **new technology** to
both.

**Under New Zealand law, one is not mandatory — and should be done anyway.** The Privacy Act 2020
does not require a Privacy Impact Assessment. The Office of the Privacy Commissioner *recommends*
one, and its expectations for agencies using AI name a PIA explicitly, alongside senior leadership
approval, an assessment of necessity and proportionality, transparency with the people affected,
human review of decisions, and preventing an AI provider from retaining or disclosing personal
information without a lawful basis.

**Which is exactly the all-care position.** Not doing an optional thing is not a defence when the
optional thing is what the regulator says good practice looks like. This document is written to
serve as **both** — the DPIA for UK/EU markets and the PIA for New Zealand — because the underlying
question is the same one and only the mandatory-ness differs.

---

## 2. What the system actually does

*A description of the build as it stands on 2026-09-10. Every row is implemented; the Brief's §5
gives the file for each.*

An advisor, before a meeting, chooses the meeting type and reviews the observation points their
firm has set — what this meeting is meant to achieve. They open the consent screen, which reads in
the words approved in [`MEETING-CONSENT-WORDING.md`](MEETING-CONSENT-WORDING.md), start recording,
**read the consent line aloud into the running recording**, and the client answers aloud. The
meeting runs. Audio is streamed to the firm's backend in short pieces as it is captured.

When the meeting ends, the assembled audio is sent **once** to the transcription provider, which
returns the text with the speakers separated. **The audio is then destroyed** — in a `finally`
block, so it goes whether transcription succeeded or failed. From that moment the recording does
not exist anywhere in the system.

From the transcript, two documents are produced by two separate calls with two separate prompts:
a **Meeting Summary** for the client, which is a draft the advisor edits and approves and then
copies into their own email; and **My Coaching Notes**, private to the advisor, carrying four
arithmetic measures computed in code and one finding per observation point. **Every finding must
quote the transcript or declare the thing not found** — a quote that does not appear in the
transcript is discarded before it can be displayed.

The transcript and both reports are then held for the period the firm has set, and destroyed by a
daily sweep. A firm manager can see **counts** of whether observation points are landing across the
firm — never a name, and nothing at all until at least 5 advisors and 20 meetings have contributed.

### The personal information involved

| Whose | What | How collected |
|---|---|---|
| **The client** (and anyone else in the room) | Everything they say for the length of the meeting — financial position, business affairs, and whatever else arises | Directly, with spoken consent |
| **Third parties the client talks about** | Employees, family members, business partners, their circumstances — named or identifiable, and often sensitive | 🔴 **Indirectly. They are not present and have not been asked.** See §6, IPP3A |
| **The advisor** | Their own speech; four measures of how they conducted the meeting; a finding against each observation point | Directly, as an identified employee |

### Where it goes

| Stage | Where | For how long |
|---|---|---|
| Audio, during and just after the meeting | **The firm's own backend disk** — never the database, never the Google Drive pipeline the document library uses | Minutes. Destroyed as soon as a transcript exists |
| Audio, for transcription | **OpenAI**, already this application's contracted sub-processor | ⚠ **Their answer, not ours — §6 IPP12 and the outstanding letter** |
| Transcript and both reports | Beside the meeting record, inside the firm | The period the firm set, default 18 months. **Each meeting expires on the period stored on its own record** — the figure the client was told that day, never the firm's current setting |
| Manager aggregate | Inside the firm | Counts only, current month, above the threshold |
| **Anywhere outside the firm** | 🔴 **Nowhere. Nothing derived from a recorded meeting leaves the firm** — not to another firm, not to Advisor-e, not into any aggregate that leaves the tenancy | — |

---

## 3. Is it necessary and proportionate?

*The OPC asks this first, and GDPR Article 35(7)(b) requires it. It is not a formality — a system
that fails here cannot be fixed by better security.*

**The purpose is legitimate and specific.** An advisor is trying to conduct better client meetings,
and a firm is trying to help them. The alternative — a manager sitting in on meetings, or an
advisor writing up their own performance from memory — is more intrusive, less accurate, or both.

**The design is proportionate in four ways that were chosen deliberately, each at a cost:**

1. **No voice biometrics.** The transcription provider will identify speakers from stored reference
   recordings of their voices. **This design refuses to use that.** A stored voice sample held so
   software can recognise a person is biometric data — special-category under UK and EU law, in the
   same tier as health records. Instead the advisor is identified by being the one who reads the
   consent line first. *The legal foundation and the technical anchor are the same sentence.*
2. **The audio does not survive.** It exists to become text and then to stop existing. This is the
   single largest reduction in risk available, and it was taken.
3. **The report belongs to the advisor.** No manager at any tier reads a named individual's
   coaching notes unless that advisor sends it to them.
4. **The manager's view cannot resolve to a person.** Counts only, and nothing at all below 5
   advisors and 20 meetings — a threshold that is not lowered to make a screen look populated. A
   firm with four advisors sees no manager figures ever. That is the correct outcome.

**Where it is NOT minimal, stated plainly.** An hour of unstructured conversation is collected in
full, and there is no way to collect less of it and still have the feature — the thing being
assessed is what was said. The mitigation is that it is short-lived, that it does not leave the
firm, and that the client was told before a word of it was recorded.

---

## 4. The lawful basis

**New Zealand.** The Privacy Act does not work by "lawful basis" the way GDPR does. Collection must
be for a lawful purpose connected with a function of the agency, and necessary for it (IPP1). It
is: an accounting or advisory firm conducting client meetings. Consent is not the *basis* of
collection here, but it is what makes IPP2, IPP3 and IPP4 satisfiable, and it is what the client
was promised.

**UK/EU, where a firm operates there.** For the ordinary personal data, either **consent** (Art.
6(1)(a)) or **legitimate interests** (Art. 6(1)(f)) can support it, and the assessment favours
consent because it is what the client is actually asked for. For **special-category data** — which
will arise unbidden — Art. 9 requires a second and separate condition, and in practice that is
**explicit consent** under Art. 9(2)(a).

> 🔴 **A CONSEQUENCE A FIRM MUST UNDERSTAND, AND IT IS THE MOST IMPORTANT SENTENCE IN THIS SECTION.**
> Where consent is the basis, **it must be as easy to withdraw as to give**. The software supports
> this — "stop and delete" is available throughout the meeting and takes any transcript with it,
> and a meeting with no confirmed consent cannot be transcribed at all. **But a withdrawal that
> arrives a week later, by email, is a process the firm must run, and the software does not know
> about it.** See §9.

**For the advisor, employment law runs alongside privacy law and is not satisfied by the same
step.** Recording an employee and generating findings about their performance is monitoring. The
report belonging to the advisor (P2) makes the position far more defensible; it does not remove the
obligation to consult. See §9.

---

## 5. Sensitive information, and the one exception in our own rules

`CLAUDE.md` carries an absolute rule for this application: **strip internal database IDs and
personal information before sending anything to a language model.** A meeting transcript cannot
comply with that rule and still be a meeting transcript.

**Mike granted a written, scoped exception on 2026-09-01, and it is recorded in `CLAUDE.md`
itself** rather than assumed. Its conditions are the exception, not a preamble to it:

- the client gave the **recorded spoken consent**, which names AI transcription explicitly;
- **internal database IDs and firm/advisor identifiers are still stripped** — the exception covers
  the *spoken content only*, so the other half of the rule is untouched;
- **nothing derived from it leaves the firm**;
- **the audio is destroyed once transcribed**.

**It is named to this feature and sets no precedent.** Any other feature wanting to send personal
information to a model is a fresh decision, not an inference from this one.

---

## 6. The New Zealand Privacy Act 2020, principle by principle

*All fourteen information privacy principles, including **IPP3A**, which came into force on
**1 May 2026** and applies to information collected from that date. Assessed against the build as
it stands.*

| | Principle | Assessment |
|---|---|---|
| **IPP1** | Purpose — collect only for a lawful purpose connected with your functions, and only if necessary | ✅ **Met.** Conducting and improving client advisory meetings. The observation points state the purpose in advance and in the firm's own words, which is a stronger position than most systems can show |
| **IPP2** | Source — collect from the individual concerned | ✅ **Met for the client.** ⚠ **Not met for third parties the client discusses** — unavoidably, and see IPP3A |
| **IPP3** | Direct collection — tell them what, why, who gets it, and their rights | ✅ **Met, and unusually well.** The consent line is spoken aloud before recording begins and is captured **inside the recording itself**, so what the client was told is provable rather than asserted. It names AI transcription, the destruction of the audio, the retention period, and that nothing leaves the firm. ⚠ **The retention figure is rendered from the firm's own setting, never hardcoded** — a firm that changes the dial changes what future clients are told |
| **IPP3A** | 🔴 **Indirect collection — take reasonable steps to notify someone whose information you collected from another source** | 🔴 **NOT MET, AND THIS IS THE SHARPEST NEW-ZEALAND-SPECIFIC FINDING IN THIS DOCUMENT.** A client discussing a named employee's performance, a family member's health, or a partner's financial position is personal information collected from a source other than that individual. In force since 1 May 2026. **The software cannot solve this** — it cannot know who was mentioned or how to reach them. What is required is a firm-level position on what "reasonable steps" are for their practice, and the Act's exceptions (notification impossible, or would prejudice the purpose) are likely to carry much of it — **but that is a judgement a firm's lawyer must record, not one this software can make.** See §9 and §10 |
| **IPP4** | Manner — fair, lawful, not unreasonably intrusive | ✅ **Met.** Consent is spoken and answered before recording; no covert capture is possible; the recorder shows its state and treats an unexpected stop as an alarm rather than a silent condition |
| **IPP5** | Storage and security — reasonable safeguards | ✅ **Met by design, ⚠ conditional on deployment.** Audio is on the firm's own backend and lives minutes; transcripts are scoped to the firm and to the advisor who made the recording. **Whether the server is properly secured, patched and access-controlled is the deploying party's responsibility, not the software's** |
| **IPP6** | Access — an individual may ask for their information | ✅ **MET — BUILT 2026-09-10.** The **Client Copy Request** tab logs a request, finds every meeting this firm holds for that client whoever recorded it, and releases the transcript and the approved Meeting Summary. 🔴 **The recording advisor alone releases** (Mike's ruling), so a request spanning several advisors is answered by each in turn; a firm manager reaches an absent advisor's meeting only by declaring they can no longer act, and that declaration is permanent and named. **My Coaching Notes are never released** — the firm's training and quality-control record, covered by the advisor's terms of engagement. ⚠ An **unapproved** Meeting Summary is not released either: P7 makes it a draft until the advisor publishes it. [`mockups/client-record-request.html`](mockups/client-record-request.html) |
| **IPP7** | Correction — and to attach a statement if you refuse | ✅ **MET — BUILT 2026-09-10.** The advisor could always dispute an observation, which served IPP7 for the *advisor*. **A client's own statement now attaches too**, to the moment in the transcript they dispute, and travels with the record from then on. 🔴 **The transcript is NEVER edited** (Mike's ruling): it records what was said in a room rather than a claim about the world, and every coaching finding is verified against it before storage, so an edit would strand findings that still read as evidenced. The statement dies with the transcript, because it quotes it. ⚠ **Erasure is now served as well**, though New Zealand does not require it — see §7 |
| **IPP8** | Accuracy before use | ✅ **Met, and this is the design's strongest single feature.** Every finding must quote the transcript or declare the thing not found, and a quotation the transcript does not contain is discarded before display. The four measures are arithmetic, computed in code, and never asked of the model. ⚠ **Transcription itself can mishear**, and the residual risk is that a wrong word is quoted accurately |
| **IPP9** | Retention — no longer than necessary | ✅ **Met, and provable.** The audio goes as soon as a transcript exists. The transcript and both reports go on the period the firm set, swept daily. 🔴 **Each meeting expires on the period stored on its own record** — the promise the client actually heard — never the firm's current dial, which would silently extend a transcript someone was told would be gone. A meeting whose period was never recorded is **never purged, only reported**, because it cannot be expired against a promise nobody can produce |
| **IPP10** | Use — only for the purpose it was collected for | ✅ **Met.** Two prompts, two calls, two stores, so coaching language cannot reach the client's copy. The manager's aggregate is a count of the same purpose, not a second one |
| **IPP11** | Disclosure — limited | ✅ **Met, and stricter than the Act requires.** Nothing derived from a recorded meeting leaves the firm at all. The client summary is never sent automatically — it is a draft until the advisor approves it, and the advisor sends it from their own email |
| **IPP12** | 🔴 **Disclosure outside New Zealand — satisfy yourself the recipient has comparable safeguards** | ⚠ **UNRESOLVED, AND IT IS THE OTHER OPEN FINDING.** Audio is sent to OpenAI, whose processing regions we have not had confirmed in writing. The Act requires the *disclosing agency* to satisfy itself — an unnamed "processed globally" does not meet that test. **The letter asking for it is written and waiting to be sent:** [`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md), question 4. **Until it is answered this principle is not evidenced**, and that is a gap in the record rather than a proven breach |
| **IPP13** | Unique identifiers | ✅ **Not engaged.** No unique identifier is assigned to any individual, and internal database IDs are stripped before anything reaches the model |

### The notifiable breach scheme (Part 6)

Separate from the principles, and it applies here. A privacy breach causing **serious harm**, or
likely to, must be notified to the Privacy Commissioner **and to the people affected**, as soon as
practicable. A leaked transcript of a financial planning meeting would meet that bar without much
argument. **The software's job is to make a breach less likely and its scope smaller — both of
which the short audio life and the firm boundary do. Running the notification process is the
firm's**, and it needs to exist before it is needed, not after. See §9.

### Engagement with Māori

The Privacy Commissioner expects agencies deploying AI to engage with Māori and with affected
communities, and this is a live expectation rather than a formality. It is not something this
software can discharge on a firm's behalf. It is named here so that a New Zealand firm sees it in
the assessment rather than discovering it later.

---

## 7. Where UK/EU law goes further than New Zealand

*For firms selling into those markets. Nothing here weakens §6 — it is additional.*

| | What GDPR adds |
|---|---|
| **A DPIA is mandatory** | Under Art. 35. New Zealand only recommends it (§1) |
| **Special-category data needs a second condition** | Art. 9. Ordinary lawful basis is not enough on its own; in practice this means explicit consent (§4) |
| **Employee monitoring is separately regulated** | And in several member states requires works-council consultation before it starts, not after |
| **Erasure and portability are hard rights, with deadlines** | One month, extendable. New Zealand's IPP6/IPP7 are access and correction rather than erasure. ⚠ **This makes the §6 IPP6 gap materially more serious in a UK/EU market than in New Zealand** |
| **International transfers need a documented mechanism** | Art. 44–49 — adequacy, standard contractual clauses, or a derogation — where IPP12 asks for reasonable satisfaction. **The same letter serves both**, but the UK/EU answer must name the mechanism |
| **Breach notification is 72 hours to the regulator** | Where New Zealand says "as soon as practicable" |
| **Automated decision-making** | Art. 22. ✅ **Not engaged as built** — nothing in this feature makes a decision about a person. **A firm that started using coaching notes for performance management would engage it**, and that is a change of purpose under IPP10 as well |

---

## 8. Risks, and what the software does about each

| Risk | What the software does | Residual |
|---|---|---|
| The recording leaks | It exists for minutes, on the firm's own disk, and is destroyed in a `finally` so a failed transcription does not leave it behind | Server security is the deployer's |
| Speaker attribution is wrong, but reads as certain | Attribution comes from one pass over the assembled audio, never stitched from chunks, which would silently swap the two people over | Degraded audio. It must fail visibly rather than blur |
| The AI invents an observation | Every finding quotes the transcript or declares not found; an unverifiable quote is dropped and the drop is logged | A correctly-quoted mishearing |
| A manager's counts identify one advisor | Counts only; nothing below 5 advisors and 20 meetings; no advisor identifier exists in the aggregation code to leak | A firm may still infer from a small team, which is why the floor is not lowered |
| Coaching language reaches the client | Two prompts, two calls, two stores | Noticed only when a client reads it — which is why the separation is structural |
| The client's summary is sent before it is checked | It cannot be. The app has no mail channel; the advisor approves, copies, and sends it themselves | The advisor's own judgement |
| A transcript outlives its promise | Each meeting carries its own period; daily sweep; reports go with the transcript | A meeting with no recorded period is reported, never quietly purged |
| **A third party is discussed and never notified** | 🔴 **Nothing. The software cannot.** | 🔴 **The firm's, and it is IPP3A** |
| **A client asks for their transcript, or its deletion** | ⚠ **Nothing built.** The data is findable and it can be answered by hand | ⚠ **Ours to build, or ours to document** |

---

## 9. What a firm must satisfy itself of

**This is the all-care line, and it is the section to hand a lawyer if the firm chooses to use one.**
None of these is something the software can answer.

⚠ **Read this list as what the law asks of the firm, not as conditions Advisor-e imposes.** Points 1
to 8 are obligations that exist whether or not this software does — they are set out here so a firm
can see them in one place, which is the "identify best practice" half of the all-care basis. **Point
9 is the only one we ask for**, and it is a confirmation rather than a requirement to act.

1. **That it may lawfully record meetings in its jurisdiction.** The law on recording a
   conversation is not the same in every country this app is sold into.
2. 🔴 **What its reasonable steps under IPP3A are** — for people discussed in a meeting who are not
   in the room. New Zealand firms specifically, and in force since 1 May 2026. The Act's exceptions
   may carry most of it; the point is that a firm has *decided*, and can show it decided.
3. **That its staff have been consulted.** Recording employees and generating findings about their
   conduct is monitoring, whoever owns the report. In parts of the EU this must happen before the
   first recording, not after.
4. **How it handles a withdrawal of consent that arrives later** — by email, a week after the
   meeting. The software handles withdrawal *during* the meeting; it does not know about one that
   arrives afterwards.
5. **How it answers a client asking for a copy of their transcript, or its deletion.** ✅ **The
   software now serves this** — the **Client Copy Request** tab, built 2026-09-10 (§6 IPP6/IPP7,
   finding B). ⚠ **A firm still needs its own position on two things the software cannot decide:**
   whether a third party your client named should be removed before a transcript is handed over
   (ruling 8 warns and removes nothing), and **who at the firm confirms they are dealing with the
   right person** — the screen records that confirmation and cannot check it.
6. **That it has a privacy breach process** that can meet "as soon as practicable" — or 72 hours in
   UK/EU.
7. **That its own privacy statement and client engagement terms cover this.** The spoken consent
   line is not a substitute for a firm's own published position.
8. **That its deployment is secured** — the server, its access controls, and who at the firm can
   reach the transcript store.
9. 🔴 **That it has read and understands the law as it applies to it, in its own country.** ⚠ **This
   document is ours and it is not advice.** **This is the one point a firm confirms to us, and it is
   what makes Meeting Review active for that firm** (Mike's ruling, 2026-09-10). **We strongly
   suggest taking legal advice** and most firms sensibly will — but we do not require it, cannot
   make it a condition, and no part of the software checks whether they did.

---

## 10. Open — what stops this assessment being complete

**Two findings are open. One is the firm's and one is ours, and they should not be confused.**

| | What | Whose | State |
|---|---|---|---|
| **A** | **IPP12** — the transcription provider's processing regions, retention, training position and human review, confirmed in writing | **Ours to obtain** | 📧 **The letter is written and waiting to be sent** — [`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md). ⚠ **A "no" on training, or a long retention, falsifies the spoken consent line rather than being a detail to work around** |
| **B** | **IPP6 and IPP7** — a client's access to, and correction of, what was recorded about them | ✅ **CLOSED 2026-09-10** | **Built.** Ruled and built the day Mike asked for it — [`mockups/client-record-request.html`](mockups/client-record-request.html), eight rulings. Access, correction by **attached statement** (never an edit), and **early deletion**, on a clock the firm sets in its own unit. ⚠ **The UK/EU one-month deadline is what made deletion and the unit worth building now** rather than at the point of selling into a second market. 🔴 **One thing it does NOT do, said here so it is not read as covered:** nothing removes a third party your client named — ruling 8 is *warn, and remove nothing automatically*, because whether a name should come out depends on facts only the firm knows. That is the firm's judgement, passed through two ticks the route refuses without |

**Not open, and recorded here so they are not re-raised as findings:** the PII exception (settled,
§5), the consent wording (approved, and a lawyer's review per market is item 2 of the Brief's §4),
and the retention default of 18 months (Mike's ruling, 2026-09-01).

**What this document does not cover.** The lawyer's review per market and the staff consultation
are items 4 and 6 of the Brief's §4. They are real, they are outstanding, and they are not
assessment findings — they are actions.

---

## 11. Review

**This assessment describes the build as at 2026-09-10 and is not a permanent statement.** It must
be revisited when any of the following happens, and each is a real trigger rather than a formality:

- the transcription provider's terms, model or processing regions change — **including a change
  behind the undated model name**, which can happen without notice;
- anything derived from a meeting is made to travel outside the firm, **which would require new
  consent wording first, and the two ship together**;
- the coaching notes start being used for performance management, which changes the purpose;
- the business-entity level of the cascade is built, which introduces a new place decisions are
  stored;
- the law changes in any market the software is sold into.

**Sources consulted, 2026-09-10:** the Office of the Privacy Commissioner's statement of the
information privacy principles and its guidance on AI and the IPPs; the New Zealand Ministry of
Justice on IPP3A in force from 1 May 2026; and the OPC's Privacy Impact Assessment toolkit.
