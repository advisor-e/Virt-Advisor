# Meeting Review — Consent Wording, approved

> ## ✅ THE WORDING IS APPROVED. NOTHING IS BUILT.
>
> **Mike approved the spoken line (candidate B) and the screen (candidate 1, split into two steps)
> on 2026-09-01.** This file is the artefact those words live in, and it is registered in
> [`ARTEFACTS.md`](ARTEFACTS.md). Anything built from them is checked against **this page**, never
> against a paraphrase of it.
>
> **What is NOT settled:** the legal work in §6, and the build itself — there is no screen, no route
> and no locale string for any of this. **The retention period is settled at 18 months** (Mike's
> ruling, 2026-09-01); `[period]` now survives only inside candidate C, which was not chosen.
>
> **The wording is fixed and a firm cannot edit it.** *(Mike's ruling, 2026-09-01.)* These are the
> only words in the app that are a promise made aloud to someone outside the firm, and they need a
> lawyer's reading per market — so there is no firm-level override, and the clause most likely to be
> trimmed for being awkward (the AI sentence) is the one that must never be.
>
> ⚠ **ONE VALUE INSIDE THE FIXED WORDING IS NOT FIXED, AND A BUILD MUST NOT HARDCODE IT.** P8 lets a
> firm set its own retention clock, and the screen quotes that figure back to the client. **18 months
> is the platform default, not a constant** — the sentence must render the firm's current setting. A
> build that types "18 months" into the string has advisors telling clients something untrue the day
> a firm changes the dial, and nothing on screen would ever say so. *(Found while recording the
> 2026-09-01 rulings: the fixed-wording ruling and the firm-set clock are both correct and they meet
> in this one number.)*
>
> **None of this text is in a locale file yet.** When it is built it goes through `$t()` into all
> eight locales like every other string — but read §5 first. These are not ordinary strings to
> translate.
>
> ⚠ **I am not a lawyer and this is not legal advice.** The wording is drafted to be honest and
> complete, which is a different thing from being legally sufficient. §6 lists what still has to
> happen before a first recording.

---

## 1. What any wording has to do

Six constraints. The first three are settled rulings, not opinions; the last three follow from the
law this feature sits under. **They are recorded because they are what a future change has to be
checked against** — a reworded screen that still satisfies all six is fine; one that quietly drops
number 4 or number 6 is not, however much better it reads.

1. **The advisor speaks it, and speaks it first.** *(Ruling of 2026-09-01.)* The consent line is
   also the technical anchor that tells the app which voice is the advisor's — see the Brief §3. A
   version that the client reads, or that arrives thirty seconds in, breaks attribution silently.
2. **It is spoken inside the recording, not only ticked on a screen.** *(P1.)* The tick records
   that the advisor *claims* consent. The audio records that it was *given*. Only the second
   survives a dispute. **This is the constraint that dictates the two-step screen in §3** — see the
   correction recorded there.
3. **The audio is destroyed once transcribed; the text lives on a clock the firm sets.** *(Ruling
   of 2026-09-01, P8.)* This is a promise made to a client out loud, so it must be one the deletion
   job can actually keep.
4. **It must invite an audible answer.** Silence is not consent — the standard is a clear
   affirmative act. A line ending "…is that alright?" gets one. A line ending "…just so you know"
   does not. *(This also gives the app the client's voice early, which helps the speaker separation
   settle, but the reason it is required is the first one.)*
5. **It must cover everyone in the room, not just the client.** A colleague, a spouse, a business
   partner sitting in — each is a person being recorded.
6. **It must say that software reads it.** This is the clause most likely to be cut for being
   awkward, and it is the one that must not be. "I'm recording this for my notes" is a materially
   different proposition from "this is transcribed and analysed by AI", and a client who later
   learns the difference was misled, whatever the tick-box said.

---

## 2. The spoken line

**Three candidates were put to Mike on 2026-09-01. The two he did not choose are kept below, not
deleted** — an artefact records what was rejected as well as what was chosen, so a later session can
see the alternatives were weighed rather than missed.

### ✅ Candidate B — APPROVED 2026-09-01

> *"Before we begin — I'd like to record our meeting. The recording is turned into a written
> transcript by AI, and the recording itself is deleted as soon as that's done. It gives you a
> written summary of what we agree today, and it helps me review how I did. Nothing is shared
> outside our firm. Is everyone here happy for me to record?"*

**~65 words, about 25 seconds.** It meets all six constraints in §1. Three phrases earn their
place: *"turned into a written transcript by AI"* satisfies constraint 6 in words a client will
understand; *"it helps me review how I did"* discloses the second report without dwelling on it,
removing the nastiest available surprise; and *"nothing is shared outside our firm"* is a promise
the design can keep and is the sentence most likely to get a yes.

⚠ **"Nothing is shared outside our firm" is now a constraint on the code.** It is accurate under the
current design. Because a client hears it spoken aloud, it has been promoted to **P13 in the
Brief** — a rule a developer reads — rather than left as a caution in a wording document. If a
future change sends transcripts or observations to Advisor-e, as
[`features/case-reviews.md`](features/case-reviews.md) already does for cases under a separate
double consent, **this sentence becomes a lie told to a named person out loud.** It is the one
sentence in this feature that a later change can silently falsify.

### ❌ Candidate A — short, not chosen

> *"Before we start — I'm going to record this so I get accurate notes. The recording is
> transcribed by our software and then deleted, and only the written notes are kept. Is everyone
> happy for me to do that?"*

**~45 words.** Natural to say and unlikely to be resented. It meets constraints 1–5 but **not 6**:
"transcribed by our software" is honest and understates that AI produces a summary and a review.
The weakest of the three on transparency, the strongest on actually being used as written.

### ❌ Candidate C — formal, not chosen

> *"For the record: it is [date] and I am recording this meeting with your permission. The audio is
> transcribed automatically and then deleted; the transcript is retained by the firm for [period].
> It will be used to produce a summary of this meeting and to review my own conduct of it. Please
> confirm that you agree to being recorded."*

**~65 words.** Strongest evidentially — it timestamps itself and speaks in the register a dispute
would be argued in. Its cost is the meeting: it opens a client conversation in a way that signals
jeopardy, and some clients will decline this who would have agreed to B. **Revisit only if a lawyer
asks for it** (§6).

---

## 3. The screen — approved, in two steps

**A correction is recorded here because it nearly reached the register.** The screen was first
drafted as a single panel whose tick read *"I have read the consent line aloud and everyone present
agreed"* — past tense, which puts the spoken consent **before** recording starts and therefore
outside the audio. That defeats constraint 2, defeats P1, and defeats the speaker anchor of the
2026-09-01 diarization ruling all at once. **Mike caught it while checking the flow back**, before
anything was written down. The words did not change; where they sit did.

**The order is: record, then speak, then confirm.** The tick is the advisor's undertaking; the
audio is the evidence. They are not interchangeable.

### Step 1 — before recording starts

> **Before you record**
>
> Read these words aloud as soon as recording starts. The recording is your evidence that you asked.
>
> > *"Before we begin — I'd like to record our meeting. The recording is turned into a written
> > transcript by AI, and the recording itself is deleted as soon as that's done. It gives you a
> > written summary of what we agree today, and it helps me review how I did. Nothing is shared
> > outside our firm. Is everyone here happy for me to record?"*
>
> The audio is transcribed and then deleted. The transcript is kept for **18 months** and is visible
> to you and your firm — never to Advisor-e.
>
> `[ Start recording ]`  `[ Cancel ]`

### Step 2 — while recording is running

> **Recording — read the words aloud now**
>
> *(the approved line repeats here, so the advisor is reading rather than remembering)*
>
> **Did everyone agree to be recorded?**
>
> `[ Yes — continue ]`  `[ No — stop and delete ]`

**Repeating the line on step 2 is deliberate.** It removes the main way this goes wrong in practice:
an advisor paraphrasing from memory in the first seconds of a meeting, and paraphrasing the AI
clause out of existence.

### Throughout the meeting

**"Stop and delete" stays available for the whole recording**, not only at step 2. *(Approved
2026-09-01.)* It is the answer to a client who says *"actually, can you turn that off?"* — see §4.

---

## 4. What happens when someone says no

**Both branches are now answered.** *(Approved 2026-09-01.)*

- **Refused at the start** — step 2's `[ No — stop and delete ]`. Recording stops and what was
  captured is destroyed rather than kept as a half-meeting the client asked to end. The meeting then
  proceeds unrecorded, and **the pre-set observation list is still shown**, because it is useful on
  its own: the Brief §3 makes the point that the list pays before a word is recorded.
- **Withdrawn part-way** — the same control, still on screen. Same outcome: stop, and destroy what
  was captured.

⚠ **"Delete" here means the audio *and* any transcript already derived from it.** A meeting the
client withdrew consent to must not survive as text because the chunks happened to be transcribed
early. This is a build requirement, not a nicety, and it interacts with the chunked capture of P10.

---

## 5. The jurisdiction flag

The app ships **eight locales** — English, German, Spanish, French, Italian, Dutch, Polish,
Portuguese. The Brief §4 item 6 lists jurisdiction as an open question; this is what makes it
concrete rather than theoretical.

**The law on recording a private conversation is not uniform across those countries, and at least
one treats it more seriously than the others.** Germany protects the confidentiality of the spoken
word under criminal law, not merely data-protection law — the exposure there is not a fine to the
firm but a personal offence by the person who pressed record. This flags **the shape of the risk and
does not state the law**; that needs a lawyer in each market.

**The practical consequence:** the approved wording must be **translated by someone competent in the
local law**, never machine-translated from English like an ordinary interface string. It is the one
set of strings in this app where a translation that reads well but lands differently is a legal
problem rather than a cosmetic one.

---

## 6. What still has to happen before a first recording

The wording is settled. These are not, and none is a coding task:

1. **A lawyer reads the approved wording**, in each market the feature is sold into.
2. **The impact assessment** (Brief §4 item 3) — recording identifiable third parties, and material
   that will sometimes be special-category data: health, family, bereavement.
3. **Staff consultation** (item 4) — this generates findings about employees, which is monitoring in
   employment-law terms however carefully P2 confines who reads it.
4. **An answer for a client who asks for their data, or its deletion** (item 7).

---

## 7. Decision record

| Decision | Ruling | Date |
|---|---|---|
| The spoken line | ✅ **Candidate B** — A and C considered and not chosen | 2026-09-01 |
| The screen | ✅ **Candidate 1's wording, in two steps** — corrected from one panel so consent is spoken inside the recording | 2026-09-01 |
| Consent refused at the start | ✅ **Stop and delete; meeting proceeds unrecorded, pre-set list still shown** | 2026-09-01 |
| Consent withdrawn mid-meeting | ✅ **Same control, available throughout; audio and any derived transcript destroyed** | 2026-09-01 |
| Transcript retention — the `[period]` above | ✅ **18 months**, as the platform default. The firm's dial (P8) still moves it, and the spoken line renders the firm's current figure rather than a hardcoded one | 2026-09-01 |
| Whether a firm may edit this wording | ✅ **No.** One lawyer-checked version per market; no firm-level override. The retention figure above is the single value that varies | 2026-09-01 |

**Related:** [`features/meeting-review.md`](features/meeting-review.md) §2 P1 and P13, §4 ·
[`features/meeting-review-history.md`](features/meeting-review-history.md) §2 ·
[`features/case-reviews.md`](features/case-reviews.md) — the app's existing consent chain, and the
source of the house voice used above · [`ARTEFACTS.md`](ARTEFACTS.md) — where this page is
registered.
