# Wording decisions — 2026-08-03

**Twelve strings across four decisions, awaiting Mike's ruling.** Written before the
decisions are asked for, per CLAUDE.md → *Save the Artefact*: what he approves must exist as
a committed file, so the approved wording can be checked against the build afterwards by
anyone.

Every "current" line below was read out of the code, not from a session note. Where a
sentence is split across two locale keys (the page interpolates a template name in the
middle) both keys are shown joined, with `X` marking the insertion point.

**How to rule:** for each decision say "keep", or name the option, or give your own words.
Nothing is applied until you do.

---

## ✅ RULED BY MIKE — 2026-08-03. All twelve settled.

- **Decision 1 — option B applied.** `firmDecisionLogic.ledeBold` is now
  *"Nothing on this page changes anything until you choose it."*
- **Decisions 2, 3 and 4 — KEEP, all eleven strings as written**, including the optional
  2.1 tweak (not taken), the "Choose one…" placeholder and "Build my course →".

**How the ruling was reached, because it corrects this document.** Mike tested the live
Logic-Lab page and challenged why the questions were being asked at all. Every "current"
line here was re-read out of the code before answering — all twelve were still present and
still rendering, so the list was not stale. But the framing was wrong: this was **one
defect and eleven rubber stamps**, not twelve open questions of equal weight. Seven of the
eight gap sentences only appear in states a normal test of the page never reaches (a
template name absent from the library, words matching no area, a template scoring below
the ten rows shown), which is exactly why they read as unfamiliar. Only Decision 1 named a
sentence that was untrue on a screen he could see.

**The lesson for the next wording list: separate the defects from the approvals.** Twelve
equal-looking decisions cost more of the owner's attention than the one real problem
deserved.

---

## Decision 1 — the Logic-Lab lede claims the page changes nothing (1 string)

**Where:** `locales/en.json` → `firmDecisionLogic.ledeBold`, shown in bold at the top of the
Logic-Lab page.

**Current, shipped:**

> Nothing on this page changes anything.

**Why it is in question.** Section 3 of the same page gives every near-miss row a **Move it
to X** and a **Copy it there** button, and both write to the firm's live distinction
configuration. The page therefore says it changes nothing directly above two controls that
change something. The desktop shipped your approved copy unedited — changing it unasked is
the deviation the Save-the-Artefact rule exists to prevent — and raised it here instead.

Note the sentence before it is a separate key (`lede`) and is accurate as it stands:
*"…Everything here reads your firm's live configuration."*

| | Option | Effect |
|---|---|---|
| **A** | Keep as is | Reassurance stays absolute; it remains untrue at two buttons |
| **B** | *"Nothing on this page changes anything until you choose it."* | Keeps the reassurance, becomes true. The buttons already confirm before acting |
| **C** | *"Nothing changes until you press a button that says it will."* | Strongest version — tells the reader how to recognise the exception rather than that one exists |
| **D** | Delete the sentence | The `lede` key already says the page reads live configuration; the bold claim adds risk for little gain |

**Recommendation: B.** It is the smallest edit that makes the sentence true, and it keeps
the thing the sentence is for — a firm manager needs to know they can explore the page
without breaking anything. C is more useful but rewrites your line rather than correcting
it, which is your call to make, not mine.

---

## Decision 2 — eight gap-explanation sentences the mockup never covered (8 strings)

**Where:** `locales/en.json` → `firmDecisionLogic.*`, shown in the diagnostic when a firm
manager names the template they expected and it did not come top.

**Why they exist.** The approved mockup wrote **one** explanation: the case where no
distinction of the firm's matched. Seven other outcomes are reachable in the real data and
had no words at all. These were authored during the build and have never been approved.

The first line of the block (*"The gap is N points."*) and the *"→ Write a distinction in
…"* instruction are yours from the mockup, unchanged, and are not up for decision here.

| # | When it shows | Current wording | Key |
|---|---|---|---|
| 2.1 | A distinction of theirs did match | *"A distinction of yours did match **X**, so start by checking it points at the template you wanted."* | `dxGapMatchedA/B` |
| 2.2 | Nothing of theirs reached it | *"No lever of yours reached **X** at all — every point it scored came from the platform's own scoring."* | `dxGapNoLeverA/B` |
| 2.3 | It scored, but below the rows shown | *"It scored {score}, which placed it below the {shown} templates this sheet shows."* | `dxOutsideSheet` |
| 2.4 | It scored nothing | *"It scored nothing at all for these words — no part of the engine reached it."* | `dxUnscored` |
| 2.5 | The name is not in the library | *"There is no template with that name in your library."* | `dxNotInLibrary` |
| 2.6 | No area recognised from the words | *"No area was recognised from these words, so there is no ranking to explain. Start with the trigger phrases — the words above reached nothing."* | `dxNoScoring` |
| 2.7 | Their distinctions could not be read | *"Your distinctions could not be read, so none are counted below. This is a fault, not a result."* | `dxDistUnavailable` |
| 2.8 | It did come top | *"You got what you expected: it came top."* | `dxGapWon` |

**Recommendation: approve all eight as written.** They are plain, they each end in something
the reader can do, and 2.7 does the thing this app keeps getting right — it says a failure
is a fault rather than dressing it as a result.

**One optional tweak, 2.1.** *"checking it points at the template you wanted"* asks the
reader to hold two ideas at once. If you want it simpler: *"…so the next thing to check is
whether it points at the template you wanted."* Not a defect — a preference.

**Worth knowing about 2.3.** An earlier version of this line told you the engine had ignored
a template that had in fact scored. That was found by you on a live run and is already
fixed; the wording above is the corrected one.

---

## Decision 3 — the Course Builder session-fit chooser (2 strings)

**Where:** [`components/CourseBuilder.vue`](../components/CourseBuilder.vue) lines 89 and 91.
Shown when a named session length cannot be met exactly and the advisor picks between two
buildable plans.

### 3.1 The drop-down placeholder

**Current:** *"Choose one…"*

The options it sits above read like *"Six sessions of about 30 minutes"*.

| | Option | Effect |
|---|---|---|
| **A** | Keep — *"Choose one…"* | Shortest; says nothing about what is being chosen |
| **B** | *"Choose a session plan…"* | Names the thing. Reads well above the two option labels |
| **C** | *"Choose how to split the course…"* | Most explicit; longest, and repeats what the options already show |

**Recommendation: B.** A placeholder is the only label this control has — there is no
heading above it — so it should name what is being decided. "Choose one" makes the reader
look elsewhere for what "one" means.

### 3.2 The button

**Current:** *"Build my course →"*

| | Option | Effect |
|---|---|---|
| **A** | Keep — *"Build my course →"* | Active, first-person, says what happens next |
| **B** | *"Build my course"* (no arrow) | Matches buttons elsewhere that carry no arrow |
| **C** | *"Build it →"* | Shorter; loses the word "course" that ties it to the card above |

**Recommendation: A, keep it.** It is the clearest of the three and the arrow is doing
honest work — this button moves the advisor forward a step rather than saving something.

---

## Decision 4 — the estimated-time line (1 string)

**Where:** [`components/CourseBuilder.vue`](../components/CourseBuilder.vue) line 127. Shown
under a session whose length is the platform's standard allowance (video 15 / read 30 /
rehearse 30, your ruling of 2026-08-03) rather than a published figure.

**Current:** *"Estimated — the library publishes no time for this template."*

| | Option | Effect |
|---|---|---|
| **A** | Keep as is | Accurate. "Publishes" is a shade formal, and "template" is the internal word |
| **B** | *"Estimated — the library gives no length for this material."* | Same meaning in plainer words; "material" is what an advisor sees on screen elsewhere |
| **C** | *"Estimated time — no published length for this material."* | Shortest; drops the explanation of why |

**Recommendation: B.** It keeps the honesty — the reader must know this figure is an
estimate, because it is deliberately excluded from any CPD claim — while sounding like the
rest of the course screen.

---

## Not part of these decisions, flagged separately

The three Course Builder strings above are **hardcoded English in the template**, while
every Logic-Lab string is in `locales/en.json` as the i18n rule requires. Whatever is
decided here, applying it is the natural moment to move them into the locale file. That is
a code question, not a wording one, and is asked separately.
