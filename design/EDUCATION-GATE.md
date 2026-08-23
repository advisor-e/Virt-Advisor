# The Education Gate

> **The artefact for item 2.9.** Wording, triggers, and screen structure — written before the
> build, so the build can be put beside it and every difference named.
>
> **Approved by Mike 2026-08-24** from three drafts shown side by side. He chose the draft below
> ("plain, offers to hand back") and ruled the mentor screen ships in the same change.
>
> ⚠ **The wording was approved from a preview rendered in chat, and this file was written
> immediately afterwards rather than before.** That is the `save-the-artefact` rule half-met, and
> it is recorded rather than smoothed over. What the rule protects — a checkable original that
> outlives the conversation — exists from here on.

---

## 1. What this is, in one sentence

When the engine can see that a client is not comfortable reading their own numbers, the advisor is
**asked** — before any recommendation — whether to lead with education or go straight to what is
technically needed, and is told why the question appeared whichever way they answer.

## 2. The two rulings behind it

| Date | Ruled | What it settled |
|---|---|---|
| 2026-07-16 | Mike | **The behaviour.** Not silently wired, not display-only: a pre-recommendation prompt asks the advisor to choose, with the reasoning shown either way. Fits guide-don't-replace. |
| 2026-08-16 | Mike | **The reach.** The gate fires **wherever poor financial literacy shows up**, not only where the app can already see it. |
| 2026-08-24 | Mike | **The wording** (§3) and **the mentor screen ships in the same change** (§6). |

## 3. 🔴 THE APPROVED WORDING — verbatim

**The question the advisor is asked:**

```
From what you've described, this client may not yet be comfortable
reading their own numbers.

Do you want me to put education first, or show what's technically
needed and leave the teaching to you?
```

**The two options:**

| Value | Label |
|---|---|
| `education_first` | **Education first** |
| `technical` | **What's technically needed** |

**Why this draft and not the other two.** The rejected alternatives named the triggering phrase
inside the question ("*I'm picking up signs … 'chasing turnover'*") or cut it to two neutral lines.
This one states the observation in the app's existing conversational voice and — the reason Mike
picked it — **makes clear the advisor keeps the teaching either way**. The gate advises; it never
takes the judgement off the advisor.

## 4. 🔴 "REASONING SHOWN EITHER WAY" — where it actually appears

The 2026-07-16 ruling requires the reasoning to be shown **whichever branch is taken**. In the
approved wording the question itself carries no evidence, so the reasoning belongs in the
**acknowledgement after the choice**, not the question. Both branches get one:

| Choice | Shown back to the advisor |
|---|---|
| Education first | *"Education first. I'll lead with the material that builds the client's understanding, then the technical work. This came up because you mentioned **"{phrase}"**."* |
| What's technically needed | *"Straight to what's technically needed. I'll show the technical recommendation and leave the teaching to you. This came up because you mentioned **"{phrase}"**."* |

`{phrase}` is the matched trigger text. **If no phrase can be named, the sentence is dropped
rather than replaced with a vague one** — a gate that cannot say why it fired should say nothing,
not something woolly.

## 5. What raises the gate

### 5a. The gap this closes

Three pieces of literacy content exist today. **None of them can fire outside one domain.**

| Where | Live? | Scope | Raised by |
|---|---|---|---|
| `data/primary-issues.json` — *"Poor financial literacy"* | ❌ **read by no code** | — | nothing; the selector was retired from intake 2026-06-10 |
| `data/advisory-distinctions.json` **pd-35** — *"Poor financial literacy — owner focused on wrong numbers"*, boost 5 | ✅ live, AI-matched | **`forecasting` only** — distinctions are evaluated only within the detected domain (`advisorEngine.js`) | AI classification of all advisor text |
| `server/utils/signals.js` `FINANCIAL_FOUNDATIONS_GAP` → `financial_literacy` category | ✅ live | **`data-systems` only** | one chart-of-accounts intake question |
| `data/signal-dictionary.json` | — | — | **no literacy signal at all** — this is the gap |

**So a client who plainly cannot read their numbers, but came about staffing or profitability,
trips nothing.** That is precisely what the 2026-08-16 ruling says must change.

### 5b. The new signal

A `financial_literacy_gap` entry in **`data/signal-dictionary.json`** — already the
domain-independent free-text matcher, already data-driven ("add phrases, no code change").

🔴 **Its trigger phrases are NOT newly authored.** They are taken from **pd-35's six authored
triggers**, which are Mike's own content, plus the vocabulary already inside
`FINANCIAL_FOUNDATIONS_GAP`'s regex. Inventing a fourth vocabulary for the same idea is how the
first three drifted apart.

### 5c. 🔴 THE SIGNAL MUST NOT CHANGE WHAT IS RECOMMENDED

The entry carries **no domain scope on purpose**. In `templateResolver.getSignalWeight`, a signal
out of scope in a mapped domain scores `outOfDomainWeight` — **zero**. That is the intended and
required behaviour:

> **The gate changes whether the advisor is ASKED something. It never changes what the engine
> SELECTS.**

Two reasons, both binding:
1. `advisory-staircase.json`'s own `ruleGuard`: *"Must never couple staircase step → engagement
   type. Staircase stays ceiling-only; the education decision lives in the acumen lens."*
2. pd-35 **already** boosts templates in forecasting. A second scoring lever for the same idea
   would double-count it there and change existing advice — which this item was never asked to do.

⚠ **A future maintainer will read the empty scope as a bug and "fix" it.** That is why it is
pinned by a test, and why this section exists to be quoted at them.

## 6. Where it fires

`advisorEngine.js` has a question queue where every entry may declare `skip()`. The sequencer asks
the first unanswered, non-skipped question and stops.

The gate is **one entry at the end of that queue** — after every domain question, immediately
before recommendations begin:

```
… domain questions …
  ↓
[ education gate ]   skip: no literacy gap detected  ← fires here
  ↓
recommendations
```

**This is the "pre-recommendation prompt" the 2026-07-16 ruling asked for.** The earlier note that
it had to be modelled on a *"pattern that does not exist"* was looking for a screen; the mechanism
was a queue entry all along.

**It asks once.** Once answered, the field is set and `skip()` is never re-evaluated against it —
an advisor is not asked the same question twice in one case.

## 7. What the answer does

The choice sets the **sequencing rule** that `server/utils/strategyResolver.js` already computes
(`education_first` vs `standard`) — directly, not by altering the engagement type. Engagement type
continues to set sequencing when no gate answer exists; a gate answer takes precedence.

| Gate answer | Sequencing |
|---|---|
| Education first | `education_first` |
| What's technically needed | `standard` |
| Not asked / not answered | unchanged — whatever engagement type already decided |

## 8. The mentor screen

Mike's ruling, 2026-08-24: **the screen ships in the same change**, at the mentor tier, cascading
down. Per the binding 2026-08-16 hub-page rule — content that shapes AI output does not get to live
only in `data/*.json`.

**Structure** — one page, three blocks:

```
┌─ The Education Gate ─────────────────────────────────────────────┐
│ When a client cannot read their own numbers, the advisor is      │
│ asked how to pitch the advice. This is what they see.            │
│                                                                  │
│ ── The question ───────────────────────────────────────────────  │
│ [ multi-line text — the question the advisor is asked ]          │
│                                                                  │
│ ── The two answers ────────────────────────────────────────────  │
│ Education first          [ text ]                                │
│ What's technically needed[ text ]                                │
│                                                                  │
│ ── What makes it appear ───────────────────────────────────────  │
│ Phrases that suggest a client is not comfortable with their      │
│ numbers. One per line.                                           │
│ [ chasing turnover                        ]  [ remove ]          │
│ [ doesn't understand their numbers        ]  [ remove ]          │
│ … + Add a phrase                                                 │
│                                                                  │
│ [ Save ]   [ Version history ]   [ Restore a version ]           │
└──────────────────────────────────────────────────────────────────┘
```

**Mechanism** — the proven one, not a new one: stored through `firmOverlay` under a new
`config_key`, which gives version history and restore for free; resolved down the tier chain the
way `aiPrompts` and `propertyTaxRules` already do. Mentor authors the platform default; lower tiers
inherit and may override.

**Cascade** — stated rather than assumed, as the hub rule requires:

| Tier | Gets it | Why |
|---|---|---|
| Mentor | ✅ authors the platform default | Platform content is the mentor's |
| Global group / group manager | ✅ inherits, may override | Same shape as every other cascading block |
| Firm manager | ✅ inherits, may override | A firm's advisors may need its own phrasing |
| Advisor | ❌ read-only, sees it in the conversation | It is a platform decision, not a per-case one |

## 9. 🔴 EVERY DIFFERENCE BETWEEN THIS DRAWING AND THE BUILD — 2026-08-24

Required by the `save-the-artefact` rule: the artefact is opened, put beside the build, and every
difference named. **A deliberate deviation is fine; an unrecorded one is not.** Four, all in the
mentor screen — the advisor-facing gate matches the drawing exactly, wording included.

| # | Drawing (§8, `mockups/education-gate.html`) | Build (`components/firm/FirmEducationGate.vue`) | Why |
|---|---|---|---|
| 1 | Three editable blocks: the question, the two answers, the phrases. | **Four.** A *"Why they were asked"* block was added, making the reason line editable. | The drawing showed the reason sentence only inside the advisor's acknowledgement (§4) and gave no way to change it. Leaving it uneditable would have made the one line the 2026-07-16 ruling actually requires the only thing on the screen a mentor could not touch. It carries a warning if `{phrase}` is removed. |
| 2 | No inherited/own marking. | Each block carries a **Set here** or **Inherited** badge. | Every other cascading block on this hub distinguishes the two, and they are different things: an inherited field keeps receiving the level above's corrections, one set here does not. Its absence from the drawing was an omission in the drawing. |
| 3 | Buttons: `Save` · `Version history` · `Restore a version`. | `Save` · **`Go back to inherited`** · `Version history`, with **restore inside the history table**. | "Restore a version" as a top-level button has nothing to act on until a version is chosen. Restoring from the row you are looking at is how `FirmAiPrompts` already does it. `Go back to inherited` is the third button the drawing lacked — without it a tier that overrides something can never stop. |
| 4 | Footer: *"Last saved by Mike Barnes — 24 Aug 2026, 10:14"*. | **Not built.** Who and when appear in the version-history table instead. | The same information, one click away, with no second place for it to go stale. Cheap to add later if it is wanted on the face of the screen. |

**Not a difference, but worth stating:** the drawing's phrase list shows six rows and the build
ships the same six, in the same order, because both come from `pd-35`.

## 10. What would make this wrong

Written down so it can be checked later rather than argued about:

- The gate fires and the advisor cannot tell why. (§4 — the reason line is not optional.)
- The gate changes which templates are recommended. (§5c — it must not.)
- The gate fires in only one domain. (§5a — that is the defect being fixed.)
- The wording can only be changed by a developer. (§8 — that is the 2026-08-16 rule broken.)
- The advisor is asked twice in one case. (§6.)
