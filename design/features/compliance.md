# Compliance — the Brief

> **A tab in all four manager hubs.** Read this before changing what a mentor publishes about a
> firm's legal obligations, or what a firm can do with it. Current rules only.
>
> **The nine rulings behind it live in the artefact**,
> [`../mockups/compliance-pages.html`](../mockups/compliance-pages.html) — approved by Mike
> 2026-09-10, every question ruled by him the same day. What was argued and settled on the way
> is in [`compliance-history.md`](compliance-history.md).
>
> **Covers:** what each tier publishes downward, what a firm may do with what it receives, and
> the declaration that will gate Meeting Review. **Does not cover:** Meeting Review itself
> ([`meeting-review.md`](meeting-review.md)), or the impact assessment whose findings this page
> exists to carry ([`../MEETING-REVIEW-DPIA.md`](../MEETING-REVIEW-DPIA.md)).

---

## 1. Design philosophy

**Advisor-e supplies software on an all-care basis, and this page is both halves of that in one
screen.** In Mike's words: *"Advisor-e provides software on an 'all-care' basis. Anyone using our
software is responsible for meeting legal requirements and is ultimately responsible for any
information given or received. We are required to identify best practice and take all reasonable
steps to comply but we can't be responsible for a user who chooses to ignore our suggestions."*

The mentor publishes what we assess and recommend; the firm evidences what it actually did. We
take all reasonable steps, they take their own legal opinion and comply thereafter — and the
record shows **both** happened.

**Legal advice is suggested and never required.** No screen asks whether a firm took it and no
route checks. Mike's ruling: *"we can't dictate or make it a condition for firms to seek legal
advice, we can only ask that they indicate that they have read and understand the law, as it
relates to them, in their country."*

---

## 2. Key principles — the non-negotiables

**P1 · The declaration gates. The completeness check never does.** A firm says it has read and
understands the law that applies to it, and Meeting Review opens. If an incomplete evidence pack
closed the recorder, Advisor-e would be deciding when a firm is compliant enough to proceed —
which is the responsibility the all-care basis places on the firm. *Do not let these collapse into
one.*

**P2 · Only the FIRST declaration gates.** A published update **notifies** and suspends nothing.
Mike's ruling: *"no, I publish an update - they get a notification such as a red dot next to the
topic"*. Advisors keep recording throughout.

**P3 · A tier may never edit what a tier above it published.** Mike's words: *"never edit ours."*
They read it and add their own material beside it. **This is a deliberate departure from every
other cascading block in this app**, which offers accept / edit / switch off / add — so a build
reaching for the usual overlay shape will offer an edit control by habit. The reason: a firm that
edits our assessment and later relies on the edited version has our name on words we did not
write, and the record no longer shows what we actually told them.

**P4 · Nor may a tier HIDE a published item.** Asked separately, because they are separate
mechanics. Hiding would clear the item's dot — the notification would defeat itself, and a firm
could switch off the one signal telling them to read something new. **A tier's OWN material stays
its own to manage.** Only what arrives from above is fixed.

**P5 · The drop zone takes a firm's own compliance EVIDENCE, never the text of the law.**
Uploading statutes for the AI to interpret was recommended against and Mike agreed: it would put
our software in the place of their lawyer, and a statute goes stale silently — a 2024 copy of the
Privacy Act would have the AI confidently reading law that IPP3A superseded on 1 May 2026.

**P6 · The completeness check runs on a button, never automatically.** Not on upload and not on
opening the page. Every AI reading is paid for and nothing anywhere caps how many a user may
trigger — **item 4.82, still open**. A build that "helpfully" re-checks on page load has undone
this ruling without noticing.

**P7 · The check reports completeness, never meaning.** A tick means a document appears to address
a point, never that it addresses it adequately. The AI never reads a statute and never says what
the law requires.

**P8 · A firm's evidence is the firm's.** A tier above sees **that** a document exists and when it
arrived — never the document.

**P9 · Nothing here is legal advice, and nothing here says a firm is compliant.** Every screen
that could be read as either says so in terms.

---

## 3. What is built

**All four slices, 2026-09-10.**

1. The tab at all four manager tiers; a tier publishes an item and every tier beneath receives
   it, read-only; the red dot in the hub's left-hand menu.
2. The firm's own evidence pack — upload, list, open, remove — on the document library's
   existing storage.
3. **The declaration, and the gate.** Until a firm records it, no advisor at that firm can start
   a recording; `/meeting-record` shows the locked state instead.
4. The completeness check, on a button, and the roll-up of who has declared.

🔴 **THE GATE IS LIVE, AND IT IS PER FIRM.** A firm that has recorded the declaration is
unaffected — its advisors record exactly as before, from the moment the tick goes in. A firm
that has not cannot start a recording, and only that firm is held up: one firm's state has no
bearing on another's, and two tests pin both halves.

⚠ **NO FIRM HAS TICKED YET**, in development or in UAT, so each one needs its own manager to do
it once. That is the feature working rather than a break, but somebody meeting a locked recorder
without knowing this landed will read it as one.

**None of this has been seen running.** The publishing, the declaration and the roll-up need
MySQL; the evidence pack needs Google Drive credentials as well; the completeness check needs
`OPENAI_API_KEY` and says so plainly rather than failing as though the pack were at fault. First
sight is UAT.

---

## 4. How the cascade works here, and how it differs

Every other cascading block folds the tiers into one value with `deepMerge`. **This one keeps every
layer.** A firm reads a LIST in which the mentor's platform assessment sits beside its global group
manager's Australian recording-law note, each naming the tier that published it. A merge would lose
whichever layer lost the fold, and would look entirely normal doing it.

A scope's published items live on that scope's own overlay row. Every write addresses the caller's
own scope and nothing else, and a republish refuses an id the caller does not already own — which
is how **P3** and **P4** are structural rather than a check somebody remembered to write.

**The dot counts against the DECLARATION, not against a visit.** Opening the page clears nothing;
recording a declaration does. With no declaration recorded — every firm today — every inherited
item is new, which is the correct answer for a firm that has declared nothing.

---

## 5. For the coder

| Piece | Path |
|---|---|
| The cascade, the declaration, the gate's rule, the dot's arithmetic | `server/utils/compliance.js` |
| The completeness check and its answer validation | `server/utils/complianceCheck.js` |
| The eight points | `data/compliance-checklist.json` — §9 of the assessment |
| The prompt | `compliance-check` in `data/ai-prompts.json` — readable on the AI Prompts tab |
| The routes | `server/routes/compliance.js` |
| Route registration, and **the gate on `POST /api/meeting/recordings`** | `server/restify-server.js` |
| The screen | `components/firm/FirmCompliance.vue` |
| The locked state an advisor meets | `pages/meeting-record.vue` |
| Tab tiers, menu heading, the menu dot | `components/FirmManagerHub.vue` |
| **The artefact** | `design/mockups/compliance-pages.html` — ruled 2026-09-10 |

**Traps.**

- The absence of an edit control and a hide control **is the feature**. Adding either undoes a
  ruling; see P3 and P4.
- 🔴 **The completeness check is sent DOCUMENT NAMES, never contents**, and the artefact says so
  three times. A session once proposed sending the documents and asked Mike to rule on the
  personal data in them; the drawing had already answered it. Attaching a file in
  `complianceCheck.js` breaks a promise printed on the screen the firm is reading.
- 🔴 **The gate has exactly one condition and it is the declaration.** Not the evidence pack,
  not the check, not a newer publication — each has a test that fails if it starts gating.
- 🔴 **The gate fails CLOSED**, which reverses this app's usual rule that a failed read degrades
  to the permissive answer. Here the permissive answer is "record a client meeting".
- The check runs **on a button only**. Re-checking on upload or on page load undoes a ruling,
  and item 4.82 — nothing caps how many paid readings a user can trigger — is still open.
- The **declaration wording is Mike's own, verbatim**, and is pinned in the artefact. No session
  rewords it, tidies it or improves it. It is the sentence a firm manager is held to.
- The menu heading is **"Compliance"**, not the artefact's *"Your firm"* — that was built first and
  found to break the menu's own rule that a heading must be true at every tier that sees it. Mike
  ruled for his pinned word on 2026-09-10.
- The dot in the left-hand menu is a **narrow, status-only exception** to the no-icons ruling of
  2026-08-19. A decorative icon does not return to that menu by this door.
- The three-state dot system across **every** hub tab is **item 4.84**, filed separately. Red alone
  needs no stored last-opened record, which is why this tab carries its own now.
- Published material is rendered as **text, never markup** — no `v-html` on this screen, so it
  needs no sanitiser to be safe. Keep it that way.

**Known deviations from the artefact**, recorded here rather than left in a commit message: the
published pack starts empty (seeding it would copy the impact assessment into a second home that
could drift); there is no withdraw or delete control on a published item, only republish; the
cascade strip is a count line rather than a chain of tiers; the "New" pill says *New* rather than
*New — not yet declared*; Adviser Network was not moved into the new menu group, because it would
move something already on a manager's screen; the drop zone takes **PDFs only** where the drawing
says *PDF, Word or text*, because that is a platform-wide security setting and widening it for one
tab is not a scope call; and the roll-up shows **how many documents** a firm holds rather than the
drawing's *"2 of 8 points covered"*, because a firm's own check result is the firm's.

**The evidence pack is the FIRM tier alone**, and that is a judgement stated rather than assumed:
the drawing calls it *"Your firm's compliance evidence"* and the check reads a firm's obligations.
**The declaration is every tier below the mentor**, because the dot counts against a declaration
and a tier that could never make one could never clear it — but only a firm's declaration opens
Meeting Review, since a firm's advisors are the only people who record anything.

---

## 6. Related briefs

[`meeting-review.md`](meeting-review.md) — what this gates ·
[`tier-cascade.md`](tier-cascade.md) — the four tiers and the chain ·
[`firm-manager-hub.md`](firm-manager-hub.md) — the hub this is a tab of ·
[`../MEETING-REVIEW-DPIA.md`](../MEETING-REVIEW-DPIA.md) — the first thing this page publishes,
and the source of the nine-point checklist slice 4 will check against.
