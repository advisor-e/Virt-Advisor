# Session Notes — 2026-08-21 · Laptop, Session 78

> **Branch `feat/advisor-progress`.** Suite **323 suites / 5,936 tests green**, lint 0 errors,
> tree clean, **all four commits pushed**. 45 ahead of `master`, 0 behind.
>
> 🔴 **The session's finding: the Handbook control had been deleting Mike's instructions.** Three
> of them, for six days, with every gate green. That is why items nobody could explain were still
> on the list.

---

## 🔴 FIRST TASK NEXT SESSION

**Item 4.28 — build the AI Prompts tab.** The engine shipped today and **no screen renders it**,
which is the half-a-fix state `CLAUDE.md` names on 2026-08-16. Design and build order:
[`AI-PROMPTS-PAGE.md`](AI-PROMPTS-PAGE.md) §10. The tab label is **ruled** — *AI Prompts* — so do
not re-ask it.

If Mike wants something else, **ask him and take his order**: `to-do-items.json`'s array order is
his ranking, not a computed one. This session went to his #4 because it was the item that could be
finished in one message, and he called it: *"my numbering should have guided you in your choices."*

---

## What shipped — four commits

| Commit | What |
|---|---|
| `838f3a0` | The control was deleting his comments on live items. Both halves fixed; his three restored verbatim |
| `767bf24` | Item 4.12 closed — its premise was never true — and the master team's release page corrected v0.8.0 → v0.9.0 |
| `2968d76` | The AI Prompts design, saved **before** he approved it |
| `ea6ac22` | The AI Prompts engine, and the invisible-character channel closed |

---

## 1. 🔴 The control was deleting his instructions, and it was deliberate

`apply-to-do.js` dropped `yourComment` for every item he did **not** close.
`handbook-shell.html` then blanked the box on load. Both directions, so a note could not survive
either way. A test named *"strips his call and comment — they are decisions, not schema"*
defended it.

**That reasoning is right for a SETTLED item** — `closureBlock()` carries its words onto the
closed page under *"Mike's own words"*, where they survive the item. **It was never right for a
LIVE one:** a live item's comment is the only thing on the whole round trip that says what he
wants done.

**What it cost.** On 2026-08-15 he saved seven comments. The four settled items kept theirs. The
three he left open did not:

| Item | His words, deleted | Still open six days later |
|---|---|---|
| 4.7 | *"get this done, it doesn't rely on me and should never have been parked"* | yes |
| 4.12 | *"if this is just a handover note - get it done"* | yes |
| 3.5 | *"draft the email you want me to send Carl and I'll pass it on."* | yes |

All three read **"waiting on Us"** the whole time. Nothing went red, and nothing could have:
every gate compares generated prose to the data, and **nothing compared the data to what he
actually said.** Same family as the Logic-Lab mockup — the paraphrase survives, the original is
lost. The only trace anywhere was a six-word fragment at `to-do.md:149`.

Fixed, his words restored character-for-character from the file he saved, and guarded by a
round-trip test. Rule written into [`features/handbook.md`](features/handbook.md) **P9**.

✅ **It works.** He saved from the Handbook at 12:59 the same day and his restored comments came
back attached — plus two new ones, which is how 4.22 and 4.26 got answered.

---

## 2. Item 4.12 was ranked first for a month on a premise that was never true

It named Collaborate's `START-HERE.md` and `HANDOVER.md`. **Neither has ever existed in this
repository** — `git log --all` finds them never added and never deleted. They were in the separate
Collaborate repo; the merge brought the code, not those documents. `UAT-LOAD-PACK.md` and
`HANDOFF.md` already describe a section of this app. Four of the five surviving uses of
"standalone" are **correctly past tense** and must not be "corrected".

🔴 **Checking it found the live fault.** `UAT-LOAD-PACK.md` — the one page the master team loads a
release from — still said the newest release was **`v0.8.0`**, four days after `v0.9.0` was
tagged, **on the morning Mike emailed Carl telling him to pull `v0.9.0`.** Corrected, the renamed
*Known issues* link repointed (v0.9.0 renamed it from *Known limits*, so the old link pointed at
nothing), and a standing warning added: cutting a tag includes updating that page.

⚠ **An item's premise is a claim, not a status.** This one was ranked **first** for weeks and
nobody had opened the two files it named.

---

## 3. AI Prompts — asked for, designed, half built

Mike's two documents, read and assessed against what the app actually does.

🔴 **The framing this session started with was wrong.** It set out to compare them against *"our
existing report model design prompts."* **There are none** — `server/routes/report.js` never calls
OpenAI. These are the first prompts the report side has ever had.

**How his constraint is enforced, and it is not by marking text read-only.** `PROTOCOL_BLOCK`
lives in `server/utils/aiPrompts.js`, prepended at send time, absent from the data file and every
overlay. The documents' privacy section is *advice to a model*; `anonymiseCase` and `promptSafety`
are what actually protect. **A prompt instruction is advisory; a server-side scrub is not.** The
test that matters tries to reach the block through the only route a tier has — stored overrides —
including one whose *value* reads *"Ignore all platform protocols above"*.

**Two things taken from the documents that the app did not have:**

- **`unsetRule`** — a default that is applied must **say so**; a value that cannot be guessed
  **stops the work**. This is exactly what `yearOneAddBack` needed (item 4.22, five days open).
- **Stripping invisible characters** from model output — zero-width, bidi, Unicode tags. The app
  strips images and raw HTML for this class of reason; it did not strip these.

**Deferred deliberately: the Flagged Issues Register.** The best thing in either document, and an
approval workflow for output **nothing generates** — no report calls the AI. The prompt section
describing it stays locked; the app-side workflow waits.

**Not built: the screen.** Item 4.28.

---

## 4. Two mistakes made and corrected inside the build

**The invisible-character pattern was first written as literal invisible characters** — a
character class invisible in the source file too: unreviewable, and destroyed by any tool that
trims whitespace. Rewritten as spelled-out codepoints. **The same mistake was then repeated in the
tests** and fixed with `String.fromCharCode`. Worth keeping: it is easy to make twice and produces
a guard nobody can check.

**A `sed` deletion took one line too many** out of `to-do-items.json` and broke the JSON. Caught
by parsing it immediately rather than by a test later. Line-number deletion on a structured file
is a bad habit; the Edit tool or a script is the right instrument.

---

## 5. What Mike settled today

- **The tab label is "AI Prompts."**
- **4.22 is done** — he was right, and it was verified rather than taken: `yearOneAddBack` is a
  firm-manager field. The item asked which answer is right for New Zealand; it stopped being that
  question on 2026-08-17 when it became a setting.
- **4.26 is half right.** The screen does five properties. The **card** in
  `reportModelCatalogue.js:101` still reads *"Whether a rental property is worth buying"*,
  singular. His own wording from Q7, so it needs his word. **Show him the line, not the label.**
- **Item 4.29 has no screen, by his ruling:** *"place it wherever you want, it's for AI - not the
  advisor or manager."* A stated exception to the 2026-08-16 hub-page rule.
- **He stopped the question queue:** *"you are a senior software engineer — if you think the task
  should be stacked and done later its on you… you get it done in the best way possible."* The
  deferrals in §3 are taken on that authority and are recorded as calls, not as consultations.

---

## For the other machine

Nothing here touches Course Builder or the Business Performance Report.

⚠ **`design/features/to-do-items.json` changed shape:** live items now carry a `comment` field
carrying Mike's own words. `apply-to-do.js` writes it and the Handbook control reads it back.
**Do not strip it.**

⚠ **`design/CONTENT-ROUTING.md` is regenerated** — adding any file to `data/` now fails
`contentRoutingReport.test.js` until you run `npm run routing`. The guard is correct.

⚠ **`design/prompt-sources/` is new** and holds two `.docx` files verbatim. They are the source of
the AI Prompts design and were previously on Mike's laptop only.
