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

---

## 2. What this means in build terms

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
