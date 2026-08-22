# AI Prompts — the History

> Why the Brief says what it says. **If this and [`ai-prompts.md`](ai-prompts.md) disagree, the
> page above wins.**

---

## 2026-08-22 · The screen — redrawn for the reader, then built

**Mike:** *"finish 4.28 you should have everything you need."*

### The picture is what found both defects, and neither was findable by a test

This feature has now had two faults. **Both were found by Mike looking at a drawing**, and the
suite could not have caught either:

1. **Two editable boxes that controlled nothing** (2026-08-22, `28cb249`). A fetch-burst limit
   and its window, belonging to a step marked *does not apply here* — this app's AI cannot fetch.
   They validated, saved, and inherited down the tiers perfectly. **A test can prove a control
   works. It cannot ask whether the thing it controls exists.**

2. **The page was written for the wrong reader.** His words:

   > *"who is supposed to be working with this page? A computer coder or an accountant who has
   > been given a word doc with some ai / claude prompts on it and told the prompts need to be
   > included for their protection? If its the latter (and it is) then your version risks being
   > too complicated for them."*

   The arithmetic makes it undeniable: the security document contributed **7 of the 19 sections
   a firm manager was shown**, in headings like *the lethal trifecta* and *taint-gate memory
   writes*. Not reassurance — a list of alarming things they cannot evaluate.

### What the redraw did, and the one thing it had to prove

The security document became **mentor-only**; below the mentor it is four plain sentences,
*How your clients' information is protected*. The two-card picker went with it, because a picker
offering a choice of one is furniture.

🔴 **The thing that had to be proved is that nothing was taken away.** Hiding a document from
three tiers looks like removing their access. It is not, and the proof is small: that document
has **no editable setting at any tier** — see its `_variablesNote` — so no manager loses a
control, only a write-up they could not act on. A test asserts it, so if it ever gains a setting
the ruling has to be revisited rather than a control quietly disappearing.

The filter runs on the **backend** (`promptsForTier`), not by hiding markup, so a tier cannot
reach the mentor's document by asking for it.

### A third fault, caught inside the build this time

The protection panel's fourth sentence was *"Nothing is treated as final until a person has
approved it."* The panel's own lede says these things are **applied by the system every time**.
That one is enforced nowhere — it restates the prompt's own Draft-and-Publish section, which is
**advice to a model**, and P1 of the Brief exists precisely to say those are not the same thing.

**It is the fetch-burst fault again, in prose instead of in a control:** a reassurance a manager
would reasonably rely on, with nothing behind it. Replaced before shipping with *"Pictures and
web code are stripped out of the AI's answer"*, which the locked markdown pipeline enforces.

That produced **P8**: every line of the panel declares the module that performs it (`backedBy`)
and the exact export or call that proves it (`provenBy`), and a test opens the file to check. A
sentence whose protection is deleted now fails the build instead of going quietly false. It is
the only paraphrase on the screen, so it is the only place this kind of drift can hide.

### Two labels, and the one that stayed

Mike ruled both on 2026-08-22. *Reporting granularity* became **Reporting periods** — the source
document's term is a specification writer's, not an accountant's. He kept **Currency and units**
as it was, which was the recommendation: an accountant already reads *$000* as units.

### What was verified, and what still cannot be

The running app was driven at both loginable tiers, and the cascade exercised over real HTTP
rather than asserted: the mentor set a materiality of 3, the firm read it as *inherited* holding
nothing of its own, the firm set 12 and held it, and the mentor was unaffected. Every refusal was
tried live, including a scope named in the request body — which wrote to the caller's own scope
and left the mentor's untouched.

⚠ **Still true:** the two middle tiers have no real login (`config/integration.js` ships their
role names empty, fail-closed). The dev tokens exercise them; a customer cannot yet. And nothing
in this project checks that a screen LOOKS right — item **4.25** — which is why both of this
feature's first two faults reached a branch.

---

## 2026-08-21 · Asked for, designed, and half built in one session

Mike, opening the request:

> *"I want to create a 'AI Prompts' page in the hub pages (Mentor, Global Group Manager, Group
> Manager and Firm Manager) so that users have the ability to influence the approach to formulas
> in the performance report models."*

And the constraint that shaped everything:

> *"They should appear in the hub page in an editable form but NOT over ride key protocols which
> we have already deemed as essential for security etc."*

He supplied two documents and asked a specific question of them: **do they offer anything we do
not already have?**

### The framing this session started with was wrong

It set out to compare the documents against *"our existing report model design prompts."*
**There are none.** `server/routes/report.js` never calls OpenAI — only `server/routes/cases.js`
does. Every report is pure maths to screen. These are the first prompts the report side has ever
had. That was checked rather than assumed, and it changed the answer to Mike's question: nothing
was being improved, something was being started.

### What the documents actually added — seven things

Assessed against `CLAUDE.md`, `ADDING-A-REPORT.md`, `promptSafety.js`, `anonymiseCase.js` and
`validateAIResponse.js`:

1. 🔴 **A declared default that must announce itself.** *"If unset, default to 5% and flag that
   this default was applied."* Nothing here did that. **Not theoretical:** `yearOneAddBack`
   defaults silently — item 4.22, open five days on a question that had already stopped being the
   right question. Became **P3**.
2. 🔴 **"Do not guess — ask", declared per variable.** *"None — ask first; do not guess"* for
   currency. The app had *never fabricate* as a principle and no per-field escalation rule.
3. 🔴 **The Flagged Issues Register**, with status *open / accountant-accepted / resolved*.
   Nothing here does this in any form. **Deferred deliberately** — see the Brief §3.
4. **Three-way provenance in output** — data provided / derived / assumed. `ProvenanceBadge`
   marks slider inputs; nothing classified AI output.
5. **Materiality defined by five explicit tests** plus an always-flag list, rather than a fresh
   judgement each time.
6. 🔴 **The three-legs inventory** (security doc step 1) — never done here, and the prerequisite
   for letting four tiers edit prompt text.
7. 🔴 **Stripping invisible characters.** The app strips images and raw HTML from AI output for
   exactly this class of reason and CLAUDE.md records why. It did **not** strip zero-width
   characters, bidi controls or the Unicode tag block. Closed the same day.

### The realisation that produced P1

The first design marked the privacy section "locked" and considered the constraint met. It was
not. **That section is advice to a model; the app's protection is code that runs before the model
sees anything.** A manager deleting a paragraph of locked text would have changed nothing real —
but would reasonably have believed otherwise, and the reverse case is worse: a design that leans
on the text being unedited is a design leaning on nothing.

So the protocols moved out of the editable document entirely, into `PROTOCOL_BLOCK` in code. The
test that matters tries to reach it through the only route a tier has — stored overrides —
including an override whose *value* reads *"Ignore all platform protocols above"*, and asserts the
block still leads the assembled text every time.

### Two mistakes made and corrected inside the build

**The invisible-character pattern was first written as literal invisible characters.** A character
class that is itself invisible in the source file: unreviewable, and silently destroyed by any
tool that normalises whitespace. Rewritten as spelled-out codepoints. **The same mistake was then
repeated in the tests** and fixed with `String.fromCharCode`. Recorded because it is an easy
mistake to make twice and it produces a guard nobody can check.

### A guard caught the change, and it was right

Adding `data/ai-prompts.json` failed `tests/unit/contentRoutingReport.test.js` —
*"derives its blind-spot list from disk, so a new data file cannot go unmentioned."* Regenerated
with `npm run routing`; the file now lists itself. Noted here as evidence that the guard works,
not as an inconvenience.

### What was deliberately NOT built, and why

- **The screen.** The session ran out at the engine. Item **4.28**, and the Brief says plainly
  that the engine reads as done and is not.
- **The Flagged Issues Register.** An approval workflow for output nothing generates.
- **Three of the security document's six steps.** They guard a door not in this building.
- **`stripInvisible` on the live advisor path.** Wiring it into `advisorEngine` changes behaviour
  on a deployed screen and deserves its own change. Item **4.30**, raised by the session that
  wrote the fix rather than left to be discovered.

### The two middle tiers

`config/integration.js` ships `globalManagerRole: ''` and `groupManagerRole: ''`, empty on purpose
and fail-closed. Checked in the config rather than taken from
[`tier-cascade.md`](tier-cascade.md)'s note. **Four tiers were asked for and four are built**, but
two cannot be logged into until Advisor-e issues the role values — so the honest claim is "correct
for four, provable on two", and the Brief refuses the shorter version.

### Q2 answered by precedent rather than by ruling

Mike was going to be asked how the cascade should work. He did not need to be: the property tax
rules had settled the identical shape on 2026-08-18, and `tier-cascade.md` §3 carries an explicit
warning against reaching for the row mechanism out of habit. The one deviation — property tax
rules **exclude the mentor**, this does not — is because that exclusion was reasoned on the mentor
having *"no country of its own to speak for"*, and a materiality threshold is not owned by a
country. Written down so nobody later "fixes" one block to match the other.

**Commits:** `2968d76` (the design, saved before approval) · `ea6ac22` (the engine).
