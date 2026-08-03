# Logic-Lab — "Accept and push to my distinctions"

**Raised by Mike, 2026-08-03, while testing the newly built Logic-Lab page.
NOT BUILT. No code exists for this.**

This file exists because of the Save-the-Artefact rule (CLAUDE.md): a design
discussed and agreed in chat, and never written to a file, survives one day as a
paraphrase and then not at all. **The conversation is recorded here verbatim
first, and the analysis after it** — so the original can always be read back, not
just somebody's later summary of it.

---

## 1. The conversation, verbatim

### Mike, 2026-08-03 — the idea

> this gave rise to an idea - as a firm manager - i want to be able to push the
> 'ideas' offered to me to that section. meaning - if it tells me i should add a
> sentence into the advisory distinction in the governance and leadership
> section, i should be able to "accept and push to my distinctions" - this makes
> it much easier for the firm manager who "knows what they want, not sure how to
> get it" - same for logic table or domain support - ypur thoughts?

### The reply, in full

> Good idea, and worth building. But the three are not equal, and the difference
> matters — pushing all three the same way would break a rule this app has for
> good reason.
>
> **One is a genuine one-click**
>
> *"Poor decision quality matched, but Governance Introduction is not attached to
> it. Add it."*
>
> That change is **fully determined**. The system knows the distinction, the
> template, and the field. Nothing is invented. That is a real "Accept and add
> it" button, and it's the case you hit today — the one where a manager knows
> what they want and the fiddly bit is finding where to click.
>
> **One must prefill, not push**
>
> When *no* distinction matched, the idea says "write one describing this
> situation". The system has no idea what you'd write. It could only paste your
> advisor's raw sentence in as your firm's wording — and that crosses the line
> this app holds everywhere else: **it never drafts your IP.** The Ideas section
> quotes your sentence back precisely so *you* write the distinction, not the AI.
>
> So the right affordance is **"Start a distinction from this"** — open the form
> in Governance & Leadership, sentence sitting in the box as raw material,
> Governance Introduction already attached, cursor in the wording field. You do
> the thinking; it does the clicking. Same for logic tables: it doesn't know
> which table *should* have opened (that's your judgment) or which words to add,
> but it can open the right tab with the phrases that reached nothing offered as
> candidates — and the trigger workbench already tells you what adding them would
> take from other tables.
>
> **One shouldn't have a button at all**
>
> Domain support's own card says *"editing it will not change which template
> comes back."* A push button there would contradict the sentence above it. That
> one gets "take me there", which the router rows already do.
>
> **The part I'd flag before you decide**
>
> This changes what Logic-Lab **is**. Today it's a read-only map with two small
> exceptions; this makes it a place where config gets written. That's fine — but
> every push needs a confirmation naming the exact change, and it must land in
> the firm's version history so it can be undone. The good news is that mechanism
> already exists and gives you history and restore for free.
>
> **And it feeds your mentor page better than anything else could**
>
> You asked me to plan for the mentor rollup. Counting config tells you *what
> firms have*. An accepted idea tells you **what a firm was trying to achieve and
> what they had to do to get there** — the sentence, what the engine did with it,
> the template they expected, and the change they chose. That is a far stronger
> signal than any count, and it's exactly the material for revising platform
> defaults: *"nine firms had to attach Governance Introduction to a
> decision-quality distinction"* is a platform gap, not nine firm gaps.
>
> If we build push, we should log accepted ideas from day one. Retrofitting that
> later means the first months of the most valuable data are simply gone.
>
> **What I'd do, in order**
>
> Finish the three arithmetic fixes from your last test first — the page
> currently gives advice that contradicts its own table, and adding an "Accept"
> button to advice that's wrong makes a small problem into a config change. Then
> build push, starting with the fully-determined case, because it's the one with
> no judgment call in it.
>
> Shall I fix the three arithmetic problems first, then come back with a plan for
> the push feature?

### Mike's answer

> yes

**So the order is settled: arithmetic fixes first (done, 2026-08-03), then this.**

### The mentor page this feeds — Mike, 2026-08-03, opening the session

Recorded here because the two features are related and the connection was made in
conversation, not in any file:

> AFTER the logic lab page has been built and tested, i will like to create
> another feature. I assume you are aware of the Mentor, Global Group Manager,
> Group Manager, Firm Manager, Advisor and Business Entity (client) cascading
> hierarchy - on this basis - as A mentor, I want a page the reports by pulling
> the logic lab data from every firm managers 'firm manager hub' page. This is
> NOT client data so there will be no privacy breach, just the phrases,
> templtaes preferred, basically all the editable functions so I can see what
> gets used, most often etc This will benefit the entire users groups as I will
> use it to modify content and the AI engine as required. In time, my changes
> will cascade down for the benefit of everyone in the form of revised logic
> tables, domain supoport docs and advisor distinctions defaults. Plan for this -
> when building the logic lab page please

### The correction — Mike, 2026-08-03, after testing the first build

**This section supersedes the build shape in §2 below.** It is recorded verbatim,
before the analysis, because the first build was made from a *paraphrase* of §1 and
got the feature backwards twice in one afternoon.

He ran a diagnosis, named **Governance Introduction** as the template he expected,
and pressed the attach button. It bolted his template onto **Poor decision
quality** — a PLATFORM distinction whose triggers are *"decisions never stick",
"analysis paralysis", "going in circles"* and whose template is **6 Hats**:

> as a firm manager, I fucking told you that I wanted to see governance
> introduction under that scenario as a distinction. Instead of adding an
> additional distinction or adding particular material that could help render
> toward the template that I told you I wanted, it fucks off in some unknown
> idea, now add sentences and steers me with a wrong fucking template.

The next build direction — "then just create a new distinction from his sentence"
— was **also wrong**, and he stopped it:

> We need to stop and think. This is turning into a giant fucker. we've gone from
> doing an analysis of why something failed. We then said, give me some ideas.
> Your ideas said, hey. This is why your search original distinction didn't work.
> The assumption being, of course, that the adviser distinction is the only lever.
> Well, it isn't because you've got the logic table triggers and perhaps domain
> support depending on the circumstance. I then said when you come up with a
> suggestion where you can make it clear then that should be added. So it has to
> be an extension of the ideas are telling me why what I had didn't work, and then
> I can accept that idea, and then that idea gets posted in. Otherwise, I might as
> well just go and rewrite my own advisory distinctions. The reason I'm using the
> search function is because I've already written my version, and it didn't work.
> And I wanna know why it didn't work.

**The three sentences that decide the whole feature:**

1. *"it has to be an extension of the ideas ... and then I can accept that idea"* —
   the button APPLIES the reasoning the page just gave. It never invents
   configuration of its own.
2. *"Otherwise I might as well just go and rewrite my own advisory distinctions"* —
   a button that writes a fresh distinction from scratch has no value. He can
   already do that.
3. *"the adviser distinction is the only lever. Well, it isn't"* — the ideas span
   distinctions, logic-table triggers and domain support, so accept spans the ideas
   as given, not distinctions alone.

**Everything downstream follows from those, and §2 below is kept only as the
record of the superseded shape.**

---

## 1a. THE PLAN (2026-08-03, approved by Mike) — this is what to build

### The failure that produced this plan, in one paragraph

The page told Mike a distinction called *Poor decision quality* had matched, and
offered to attach his template to it. That row is the **platform's**, not his.
Meanwhile **his own** distinction — *"Clients not on same page or haven't defined
what each wants from the business"* — reads almost word-for-word like the sentence
he typed, and **never entered the running at all**: it is filed under `conflict`,
his sentence was detected as `governance`, and
[`phraseProbe.js`](../server/utils/phraseProbe.js) scores distinctions only inside
the detected domain (`rows.filter(r => r.domain === domain)`).

**"Yours is filed under Conflict, so it was never read" is the answer to his
question, and the page cannot currently say it.** Every button built on top of a
diagnosis that cannot see that is going to point at the wrong thing — which is
exactly what happened.

### Step 1 — FIX THE DIAGNOSIS. Nothing else until this is right.

"Why didn't mine work?" must resolve to a NAMED cause. The honest list, and the
idea each one produces:

| What actually happened | The idea that follows | Button? |
|---|---|---|
| **Yours exists, filed in another area** — never considered | Move or copy it into the area this reads as | Yes |
| **Yours is in the right area, but the AI did not match it** — the wording does not cover how the advisor spoke | Add the advisor's phrasing to YOUR distinction | Yes |
| **Yours matched, but does not name the template you wanted** | Add that template to YOUR distinction | Yes |
| **No logic table opened on those words** | Add the phrases to the table that should have opened | Yes |
| **You have nothing for this situation** | Write one | **No** — the wording is the firm's IP |

### The rule that stops 2026-08-03 repeating

**An accept only ever changes the firm's OWN material.** When a platform
distinction matched and the firm's did not, the fact worth reporting is that
*theirs* did not — and the fix belongs to theirs. Attaching a firm's template to a
platform row is not a determined change: it silently re-points a row the firm did
not write, in every future conversation that row matches. That is precisely the
6 Hats / Governance Introduction damage.

### Step 2 — each idea carries its own accept

Applying that named change and nothing else, naming the consequence before it
writes. The idea and its button are one thing; there is no general-purpose "accept"
that exists apart from a specific reasoned idea.

### Step 3 — the accepted-idea log stays as built

It is the mentor-rollup feed and it captures the REASONING, not just the result.
See §2's "Log every accepted idea" — that part is unchanged and already built.

### Status of the 2026-08-03 build

- **The accept route and button exist** (`server/utils/logicLabAccept.js`,
  `POST /api/firm-manager/logic-lab/accept`, the button in
  `DecisionLogicDiagnostic.vue`). They implement **row 3 only**, and wrongly allow it
  on **platform** rows — the defect above. Not committed.
- **Separately: a Logic-Lab write now refreshes the Advisory Distinctions tab.**
  The tab loads once on hub mount, so a write from the Logic-Lab page left it showing
  stale data — Mike hit this first. That fix is independent of everything above and
  is worth keeping regardless. It also closes the same hole in the near-miss
  Move/Copy buttons, which shipped with it on 2026-08-03.
- **Mike's configuration was reverted** — `pd-40` is back to `6 Hats` only.

---

## 2. What this means in build terms

> ⚠ **SUPERSEDED by §1a above (2026-08-03).** Kept because it is the record of what
> was reasoned first and built from, and because its guardrails and the
> accepted-idea log survive unchanged. Its three-tier table is what produced the
> wrong build: it treats "a distinction matched" as grounds to attach, without asking
> WHOSE distinction matched or why the firm's own one did not.

### The three tiers, and why they are not the same button

| Idea card | Affordance | Why |
|---|---|---|
| **Advisory Distinction** — a distinction matched, but the expected template is not attached to it | **True one-click.** "Accept and add it" | Fully determined: the row, the template and the field are all known. Nothing is authored |
| **Advisory Distinction** — nothing of theirs matched | **Prefill only.** "Start a distinction from this" | The wording is the firm's IP. Pasting the advisor's raw sentence in as their distinction is the AI drafting their content, which this app must never do |
| **Logic table trigger phrases** | **Prefill only.** Open the table with the unmatched phrases offered | The system does not know which table *should* have opened — that is the manager's judgment — nor which words belong in it |
| **Domain support** | **No push button.** Navigation only | Its own card states that editing it changes no recommendation. A button there would contradict the sentence above it |

### Guardrails, all required

1. **Confirm first, naming the exact change** — the same pattern the near-miss
   Move/Copy already uses.
2. **Land in version history** so it can be undone. The firm-overlay mechanism
   (`firm_framework_versions`) gives history and restore for free — see the
   `firm-manager-edit-target` skill.
3. **Never author the firm's wording.** The line that separates tier 1 from
   tier 2, and the reason they cannot be the same control.
4. **The page's own description must change.** The lede currently reads *"Nothing
   on this page changes anything"* — already flagged as wrong for the near-miss
   buttons (see [`LOGIC-LAB-BUILD-VS-MOCKUP.md`](LOGIC-LAB-BUILD-VS-MOCKUP.md)
   §1). Push makes it decisively wrong.

### Log every accepted idea — from the first commit

Not an optimisation to add later. An accepted idea records:

- the advisor's sentence as typed,
- what the engine did with it (domain, tables, distinctions matched),
- the template the manager expected,
- the change they chose, and which tier it was.

That is the raw material for the mentor rollup, and it captures **intent**, which
no count of configuration can. Retrofitting it means the first months of the most
valuable data never existed.

It must carry the same privacy property as
[`logicLabSummary.js`](../server/utils/logicLabSummary.js): configuration and
counts only — no client name, no advisor name, no session narrative — which is
what makes a mentor reading across firms a content question rather than a privacy
one.

---

## 3. Still open — Mike's to decide

- **Immediate write, or staged?** The near-miss Move/Copy writes immediately
  behind a confirm; consistency argues for the same, but push will be used more
  often and by less certain hands.
- **Every button label.** Wording is never invented (CLAUDE.md). "Accept and add
  it", "Start a distinction from this" and "Push to my distinctions" are
  placeholders from the conversation, not decisions.
- **Whether tier 2 and tier 3 ship at all in the first pass**, or whether the
  first release is only the fully-determined case.

## 4. Status

☐ **NOT BUILT.** Next task after the Logic-Lab page itself
(ACTIONS `#logic-lab-accept-and-push`).
