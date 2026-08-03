# Wording — what each screen says when the distinction AI fails

**Six strings and one structural decision, awaiting Mike's ruling.** Written before the
decisions are asked for, per CLAUDE.md → *Save the Artefact*, so what he approves exists as
a committed file and the build can be checked against it afterwards by anyone.

**Why these strings are needed at all.** Until 2026-08-03 a failed AI call and a genuine
"none of your distinctions matched" were **the same value** in the code — an empty list — so
eight places on four screens reported a call that never completed as a finished reading.
The engine now tells the two apart (`aiFailed`); nothing on screen has changed yet, because
this app does not invent wording. Every "current" line below was read out of the code.

**How to rule:** for each string say "keep", or name the option, or give your own words.
Nothing is applied until you do.

---

## The eight places that are currently wrong

Six of them share wording, which is why six strings cover eight places.

| # | Screen | What it says today when the AI call FAILED | String |
|---|---|---|---|
| 1 | A live adviser session → decision trace | *"No distinction changed the scoring in this area."* | **S1** |
| 2 | Same trace → "Filed elsewhere — may belong here" | Nothing. The whole section silently disappears | **S2** |
| 3 | Firm Manager Hub → a **saved** case's trace | Nothing — a permanent record showing no distinction applied | **S1** |
| 4 | Logic-Lab → "Try a sentence" | *"No distinction matched these words. The AI read all 5 distinction(s) in this domain."* | **S3** |
| 5 | Logic-Lab diagnostic → the Distinctions line | *"None matched. The AI read all 5 in this area."* | **S4** |
| 6 | Logic-Lab diagnostic → score-sheet chip | *"no distinction of yours matched it +0"* | **S5** |
| 7 | Logic-Lab diagnostic → the gap explanation | *"No distinction of yours matched it"* | **S6** |
| 8 | Logic-Lab diagnostic → the Ideas lede | *"No distinction of yours matched this conversation — that is the biggest thing you can change."* | **S6** |

Rows 4 and 5 are the sentences you saw yourself with a broken certificate. Rows 2 and 3 are
the quietest and arguably the worst: nothing wrong appears, because nothing appears at all.

---

## Decision 0 — the structural one, and it is not about words

Rows 6, 7 and 8 sit **inside the score sheet**. When the distinction AI fails, that sheet was
worked out with the firm's biggest lever missing — so **the ranking it shows is not the
ranking a working engine would produce.** Changing three sentences does not fix that.

| | Option | Effect |
|---|---|---|
| **A** | **Show the sheet, with one banner above it** saying the distinction layer is missing and the ranking would differ. Rows 6–8 use **S5/S6** instead of their present claims | The deterministic half (logic tables, problem signals, domain) is still true and still worth reading. The reader is told exactly what is absent |
| **B** | **Refuse the diagnosis** — show the banner alone and no sheet | Nothing misleading can be read. Also gives a manager nothing at all for a fault that may clear on a retry |
| **C** | Leave the sheet exactly as it is and add the banner only | Smallest change. Rows 6–8 keep making claims about distinctions that were never checked |

**Recommendation: A.** B throws away a working half of the answer over a fault that is
usually transient, and C leaves three sentences saying "no distinction of yours matched"
when nothing read them. A is the only option where every part of the screen is true.

---

## S1 — a live adviser session, and a saved case

**Where:** [`VirtualAdvisor.vue`](../components/VirtualAdvisor.vue) line 411, and
[`FirmManagerHub.vue`](../components/FirmManagerHub.vue) line 479 (the saved copy).

**Current:** *"No distinction changed the scoring in this area."*

This is the one that matters most: it is the only surface an **adviser** sees, mid-session,
while acting on the advice.

| | Option | Effect |
|---|---|---|
| **A** | *"Your firm's distinctions could not be checked for this session — the advice below was built without them."* | States the fault and its consequence in one line. Does not explain why, which the adviser cannot fix anyway |
| **B** | *"Your firm's distinctions could not be checked — the AI that reads them did not answer. The advice below was built without them."* | Adds the cause. More honest, one clause longer |
| **C** | *"This session ran without your firm's distinctions — they could not be checked. Ask your administrator to look at it."* | Tells them what to do. Assumes an escalation route we have not defined (see the open question below) |

**Recommendation: B.** The adviser is about to use this advice with a client, and "could not
be checked" alone invites the reading "there weren't any". Naming the AI call makes it
unmistakably a fault in the machine rather than a fact about their firm.

---

## S2 — the "filed elsewhere" bridge, live session

**Where:** [`VirtualAdvisor.vue`](../components/VirtualAdvisor.vue) line 412. This is a
second, separate AI call: it can fail on its own while S1's succeeds, which is why the code
carries two flags rather than one.

**Current:** nothing — the section is hidden.

| | Option | Effect |
|---|---|---|
| **A** | *"Distinctions filed in your other areas could not be checked for this session."* | One line, appears only on failure, matches S1's voice |
| **B** | Say nothing, as now | The section is already invisible when there is genuinely nothing to show, so a reader learns nothing either way — which is precisely the silence that hid this defect |

**Recommendation: A.** Rule 8 of this app's own honesty standard is that an omission is
stated; B is the only option on this page that keeps a failure completely invisible.

---

## S3 — Logic-Lab, "Try a sentence"

**Where:** `locales/en.json` → `firmLogicLab.distNone` + `distConsidered`, shown together.

**Current:** *"No distinction matched these words."* + *"The AI read all 5 distinction(s) in
this domain."*

The second sentence is the false one — it names a number and asserts the model read them.

| | Option | Effect |
|---|---|---|
| **A** | *"Your distinctions could not be checked — the AI that reads them did not answer. This is a fault, not a result."* | Matches `dxDistUnavailable`, the sentence already on this page for the other kind of distinction fault. Drops the count |
| **B** | *"Your distinctions could not be checked — the AI that reads them did not answer. None of the {count} in this area were read. This is a fault, not a result."* | Keeps the count, correctly this time: the number is what was **sent**, not what was read |

**Recommendation: A.** The count is only interesting when something read them; here it
invites the same confusion the defect was made of. B is defensible if you would rather the
manager sees that the rows were found and sent — say so and I will use B.

---

## S4 — Logic-Lab diagnostic, the Distinctions line and the banner

**Where:** `locales/en.json` → `firmDecisionLogic.dxDistNone`, plus the new banner from
Decision 0.

**Current:** *"None matched. The AI read all 5 in this area."*

⚠ **A near-identical sentence already exists and is approved** — `dxDistUnavailable`: *"Your
distinctions could not be read, so none are counted below. This is a fault, not a result."*
That one covers a **different** fault: the firm's saved distinctions could not be loaded from
storage. Two faults, two sentences, and a reader should be able to tell which happened.

| | Option | Effect |
|---|---|---|
| **A** | *"The AI that reads your distinctions did not answer, so this ranking was worked out without them. A live session would rank these differently. This is a fault, not a result."* | Says what is missing, what it did to the numbers below, and that it is a fault. Serves as the banner too |
| **B** | *"Your distinctions could not be checked. This is a fault, not a result."* | Short, and matches its sibling closely. Says nothing about the ranking being affected — which is the thing a manager reading a score sheet most needs to know |
| **C** | Reuse `dxDistUnavailable` for both faults | One sentence to maintain. The two faults then look identical to whoever has to fix them |

**Recommendation: A.** This screen exists to explain a ranking; a fault that changes the
ranking has to say so, or the manager will act on the sheet as if it stood.

---

## S5 — the score-sheet chip

**Where:** `locales/en.json` → `firmDecisionLogic.dxChipNoDistinction`, one small tag inside
the ranking table.

**Current:** *"no distinction of yours matched it  +0"*

| | Option | Effect |
|---|---|---|
| **A** | *"distinctions not checked"* | Fits the chip row, which holds three short tags. Drops "+0", which was never a real zero |
| **B** | *"distinctions not checked  +0"* | Keeps the arithmetic column adding up visually |
| **C** | Show no chip at all | Silent — the reader cannot tell the layer is absent |

**Recommendation: A.** "+0" states a measured contribution of nothing, which is exactly the
claim we cannot make. The row's own total still balances because the other-factors figure is
unchanged.

---

## S6 — the gap explanation and the Ideas lede

**Where:** `locales/en.json` → `firmDecisionLogic.dxGapNoneA-D` (the gap) and `ideasLedeNoDist`
(the Ideas section). One replacement sentence covers both.

**Current, the gap:** *"…No distinction of yours matched it…"*
**Current, the Ideas lede:** *"No distinction of yours matched this conversation — that is the
biggest thing you can change."*

The lede is the most actively harmful of the eight: it sends a manager off to write a new
distinction to solve a problem that may not exist.

| | Option | Effect |
|---|---|---|
| **A** | *"Your distinctions were not checked, so the gap cannot be explained. They are the biggest single lever here, and it is not known whether one matched."* | Explains the hole without guessing what is in it. Stops the "write a new one" advice cleanly |
| **B** | *"Your distinctions were not checked, so the gap cannot be explained. Try again in a moment."* | Shorter, and tells them the useful thing — this fault is often transient |
| **C** | Combine: A's first sentence + *"Try again in a moment."* | Longest. Says both what is missing and what to do |

**Recommendation: C.** This section's whole job is to end in something the reader can do, and
with the layer missing the only true action left is to retry.

---

## ✅ The open question — RULED by Mike, 2026-08-03

**What should we tell someone to do when it keeps failing?** Mike:
*"contact your advisor-e coach - that's what they're here for!"*

Applied to the two sentences whose job is to tell the reader what to do:

- **S1** (live adviser session, and the saved case) now ends: *"If it keeps happening,
  contact your Advisor-e coach — that's what they're here for."*
- **S6** (the gap explanation and the Ideas lede) now ends: *"Try again in a moment — if it
  keeps happening, contact your Advisor-e coach; that's what they're here for."*

**Two deliberate deviations from his exact words, named rather than folded in** (CLAUDE.md →
Save the Artefact): the exclamation mark is dropped, because the sentence sits inside a
fault box where it would read as cheerful about a failure; and *"If it keeps happening"* is
prefixed, so a reader whose fault clears on a retry is not sent to a person for nothing.

✅ **Both deviations put to Mike and CONFIRMED, 2026-08-03** — *"they are fine"* — asked
before PR #35 merged, so the approval is recorded against the artefact rather than living
only in a conversation.

**Not added to S3, S4 or S5** — the two Logic-Lab diagnostic states and the table chip.
Those state a fact inside a diagnostic screen rather than instructing the reader, and S4
already sits above a sheet the manager is meant to keep reading. Tell me if a fault should
name the coach everywhere it appears and I will put it on all six.

---

## Not a wording question, asked separately

The live-session sentence at [`VirtualAdvisor.vue`](../components/VirtualAdvisor.vue) line 411
is **hardcoded English in the template**, which breaks the project's own translation rule —
every other string here lives in `locales/en.json`. Applying whatever is decided above is the
natural moment to move it. That is a code question, not a wording one.
