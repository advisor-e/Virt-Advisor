# Meeting Review — the History

> **Read [`meeting-review.md`](meeting-review.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.
>
> ⚠ **The feature is not built.** This History therefore records how the design was arrived at,
> not what happened to a running feature. Nothing below describes code.

---

## 1. Where this came from

**Mike, 2026-09-01, unprompted and in his own words:**

> *"i want you to design a new feature… a note taking feature - effectively records the voices and
> transcribes the meeting, then generates two reports. 1 is a summary of the meeting - key points,
> key actions etc. The 2nd is an advisor only report, which reports how the advisor performed. The
> advisor will have the ability to pre-determine the nature of the meeting, set objectives and or
> key points to be observed. The advisor report will highlight if they failed pre-set actions such
> as missing key sales scripts, failing to frame the meeting correctly, failing to use metaphor or
> drawings to explain technical issues etc… of course, as is the case all over this app, the back
> end must be editable so managers can modify the key observation points etc"*

It is recorded verbatim because the gate in `CLAUDE.md` — *"did Mike ask for this, in his own
words?"* — exists precisely so that a later session cannot mistake an AI-written summary for a
request. **This one passes the gate on its face.** He also named the Handbook page himself, so the
page is not an inference either.

The request was checked against the repository before any design work: no audio, transcription or
meeting feature existed, and none of the 36 feature Briefs covered one.

---

## 2. The four decisions taken the same day

All four were put to Mike as choices with their costs stated, and answered on 2026-09-01.

| Decision | Ruling | What was rejected, and why it mattered |
|---|---|---|
| Who sees the advisor's report | **The advisor alone; they choose to share** | Rejected: manager-visible immediately (unambiguous monitoring); visible after a delay; each firm choosing for itself. The chosen option is the safest legal position and the only one consistent with the existing tone rule. Its cost is named in §3 below. |
| How the audio is captured | **Recorded live in the app** | Rejected: uploading a Teams/Zoom file, which was the recommendation on the day. See §4. |
| What happens to the recording | **Audio deleted at transcription; transcript kept on a firm-set clock** | Rejected: keeping everything until deleted by hand (worst position to hold client recordings in); deleting the transcript too (kills the follow-through feature and makes a disputed observation uncheckable). |
| What it is called | **Meeting Review** | Rejected: Meeting Notes (his own phrase, but understates the second report), Meeting Companion, Meeting Record. |

**The names of the two reports were NOT settled** and remain open. *Meeting Summary* and *Advisor
Review* appear throughout the Brief as placeholders and carry no approval.

---

## 3. The tension inside the visibility ruling, and the answer proposed

Mike asked for manager-editable observation points **and** ruled that only the advisor sees their
own report. Taken literally, that means a manager sets a standard and can never learn whether it is
met — which would make the editing screen he asked for pointless within a month.

**The proposed resolution, accepted in the same exchange:** managers see the *pattern* with no names
attached — *"framing was missed in 11 of 28 meetings this month"* — and never an individual. This
gives a manager what they actually need (is the standard being met, and is my checklist any good?)
without any individual being exposed, and it keeps the feature on the coaching side of the line.

It is P3 in the Brief. The trap it creates — that in a small firm an aggregate is trivially
reversible to one person — is recorded as a design decision that must be settled before build, not
a constant to be tuned afterwards.

---

## 4. The recommendation that was overridden

**Recorded because the reasoning will not survive in anyone's memory, and the risk it names is
real.**

The recommendation on the day was to accept an uploaded recording first — the advisor records in
Teams, Zoom or on a phone as they already do — and add live capture later. It is materially simpler,
works identically for remote and in-person meetings, and cannot be defeated by a laptop going to
sleep.

**Mike chose live in-app capture.** That is his call and the design follows it without reservation.
Two things genuinely favour it, and both are now built into the Brief as principles rather than
notes: consent can be captured *inside the recording* (P1), and because audio must be chunked
anyway, the pieces can be transcribed as they arrive, so the transcript is ready when the meeting
ends rather than several minutes later.

**What was not resolved by the choice** is the failure mode that prompted the recommendation: an
operating system may throttle or suspend a backgrounded browser tab, and a screen locking mid-meeting
is ordinary. There is no second take with a real client. P10 (stream continuously) and P11 (fail
loudly) exist to contain it, and neither eliminates it.

---

## 5. The rule collision found at design time

`CLAUDE.md` requires: *"Strip internal DB IDs and PII before sending anything to an LLM."*

**A meeting transcript is PII from end to end**, so this feature cannot comply with that sentence as
written. This was surfaced to Mike before any file was created rather than being quietly worked
around, because a rule that a shipped feature silently breaks is worse than no rule.

It needs a written, scoped exception in `CLAUDE.md` itself, and that exception is listed in the
Brief §4 as a blocker rather than a formality. **No such exception has been written yet.**

The same section records six other things that must exist before a first recording — consent
wording in Mike's words, an impact assessment, staff consultation, the transcription provider's
written terms, the position in each jurisdiction, and an answer to a client asking for their data.
None is a coding task, which is exactly why they are the ones that get discovered late.

---

## 6. Why the design treats the pre-set as the product

The obvious reading of the request is that transcription and summarising are the feature and the
advisor report is an extra. The design takes the opposite view, and it is worth recording why.

Every meeting tool on the market records and summarises. What no competitor has is an advisor
declaring, in advance, what a meeting is supposed to achieve, against a checklist their firm wrote.
That is the sellable half under [`product-principles.md`](product-principles.md) P1 — *"something a
competitor cannot easily claim"*.

It is also what makes the second report technically possible. An open-ended request to grade a
person produces confident invention; a request to find a named thing and quote it, or answer NOT
FOUND, is a retrieval task with a citation. **The pre-set is not a convenience feature. It is the
mechanism that makes the advisor report trustworthy at all**, and any later change that weakens it
— a "just summarise how it went" mode, for instance — takes the reliability with it.

---

## 7. Where this page's sources will go stale

- **The 42 scenarios** in `data/logic_trees.json` were read on 2026-09-01 to establish that a
  meeting-type list already exists. The count and the ids will change; the principle (P12) does not.
- **The tone rule** quoted from [`advisor-progression.md`](advisor-progression.md) §1 is quoted as
  it stood on 2026-09-01. If that Brief changes, this design inherits the change, not the quote.
- **The four rulings in §2** are fixed points and do not go stale — but the *options rejected*
  beside them describe the alternatives as they were understood on the day.
- **Everything in the Brief is untested against code**, because there is no code. The first build
  will contradict some of it, and when it does, the Brief is corrected and the contradiction is
  recorded here.
