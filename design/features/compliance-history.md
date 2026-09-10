# Compliance — the History

> **Read [`compliance.md`](compliance.md) first.** That page is the rules. If the two disagree,
> **the Brief wins**.

---

## 1. The nine rulings, all given on 2026-09-10

Mike ruled every open question on the drawing the day it was drawn, one at a time. **The
artefact holds them in full**, in his words, beside the screens they govern —
[`../mockups/compliance-pages.html`](../mockups/compliance-pages.html) §7. The table below is
the index to them, not a replacement.

| Decision | Ruling |
|---|---|
| Does the tick GATE the feature? | **Yes** — *"they have to tick a box before the feature becomes active."* |
| What is the tab called? | **Compliance.** *Privacy & Compliance* and *Legal* both rejected. Pinned. |
| Does a published update suspend the recorder? | **No** — it notifies with a dot and suspends nothing. |
| The declaration's wording | **Written by Mike, verbatim, and pinned.** |
| May a firm edit what a tier above published? | **No** — *"never edit ours."* |
| May a firm hide it? | **No** — asked separately, because hiding would clear the dot. |
| When does the completeness check run? | **On a button only.** Never on upload, never on page load. |
| Who may record the declaration? | **Any firm manager** — a judgement stated, not his ruling; the platform decides it for us. |
| Where do the dots go? | **The hub's left-hand menu, on every tab.** |

---

## 2. Two recommendations of ours that he overturned, and both improved the design

**The gate.** The first drawing recommended **no gate**, and he ruled the other way. The
recommendation was not simply wrong — it was answering a different question. It objected to
gating on the **evidence pack**, which would make Advisor-e the judge of a firm's compliance.
Gating on the firm's **own declaration** judges nothing. Both halves stand: the declaration
gates, the completeness check never does.

**Screen C exists because of that ruling.** A gate needs a locked state, or an advisor at a firm
that has not declared clicks Meeting Review and meets something that either does nothing or
throws — *"a tidy page that looks like a failure"*, which Meeting Review's own P11 forbids.

**The declaration's wording.** It replaced a draft of ours and improved on it twice: it is
**first person**, so an individual attests rather than a firm attesting through nobody in
particular, and it carries an **authority clause** — *"I act for and on behalf of my firm"* — so
the person ticking states they can bind the firm. Neither was in our draft.

---

## 3. One proposal of his that was recommended against, and he agreed

He proposed uploading privacy **statutes** for the AI to read. Recommended against on two
grounds: it puts our software in the place of a firm's lawyer, and a statute goes stale silently
— a 2024 copy of the Privacy Act would have the AI confidently reading law that **IPP3A**
superseded on 1 May 2026. He agreed, and the drop zone takes a firm's own **evidence** instead.

---

## 4. Where the feature came from

It grew out of **Meeting Review** ([`meeting-review.md`](meeting-review.md)) §4, whose impact
assessment was written the same morning and is the first thing this page publishes. That
assessment found **IPP3A** — in force since 1 May 2026, and unanswerable by software, because
nothing can know who was mentioned in a meeting but not present. A firm needs a recorded position
on what reasonable steps mean in its practice, and there was nowhere to record one.

---

## 5. The build, and what it changed

**Slice 1, 2026-09-10 (laptop).** Putting the drawing beside the code found four things the
drawing did not settle, and one of them changed a ruling of his:

- **The menu heading.** Built as the drawing had it, *"Your firm"*, then found to break the
  menu's own written rule — a heading has to be true at every tier that sees it, and a mentor has
  no firm. The drawing showed that sidebar on the firm's screen alone, so the conflict was
  invisible in it. **He ruled for "Compliance"**, his own pinned word, the same day.
- **The gate has to be enforced on the backend.** `pages/meeting-record.vue` says in its own
  comment that its access check is UI-only because the server re-checks every route. A gate that
  lived only on that page would be no gate at all. Screen C explains; the route enforces.
- **The drop zone accepts more file types than the app does.** The drawing says *PDF, Word or
  text*; `config/integration.js` allows PDFs only, platform-wide. Kept as it is rather than
  loosening a security setting for one tab.
- 🔴 **A question was put to Mike that the artefact had already answered, and it should not have
  been.** A session proposed sending the firm's documents to the model to be read, and asked him
  to rule on the personal data in them. **The drawing says three times that we do not read
  them** — *"we do not read them"*, *"we do not read your documents for meaning"*, *"neither the
  AI nor anyone at Advisor-e reads it"* — and its own examples of a covered point are **file
  names**: *"Covered by: Legal opinion — Harrow & Tait, 3 Sep 2026"*. The check matches what a
  document **is**, as the firm titled it, against the eight points. **No document content leaves
  the server, so no ruling was ever needed.** The lesson is the one this repository already
  keeps: the artefact is the specification, and a question it answers is not an open question.

**The other deviations from the artefact** — the empty starting pack, no withdraw control, the
simplified cascade strip, the shortened *New* pill, and Adviser Network staying where it is — are
listed in the Brief §5, where a coder meets them.

**Slices 2, 3 and 4, the same day.** Three decisions worth recording, because each could
reasonably have gone the other way:

- **The evidence pack reuses the document library's storage** rather than a store of its own —
  the firm's Drive folder, its `firm_documents` row, the 500 MB quota and the cross-firm gate
  that was already proven. A new store would have meant writing those protections again under a
  new name.
- **The gate sits on one route**, the one that starts a recording. Consent, chunks, finish and
  both reports all address a meeting that already exists, so nothing can come into being without
  passing it; guarding all seven would have added six places for the check to drift.
- **The declaration is stored with the words the signer saw.** A record naming only a date and a
  person is a record of a click. If the wording is ever changed, older records still show what
  was actually agreed to.

---

## 6. Where the raw material is

**The artefact:** [`../mockups/compliance-pages.html`](../mockups/compliance-pages.html) — **keep
on file.** It is the specification, and it holds the ruled wording.

**In-code:** the header block of `server/utils/compliance.js` explains why this cascade keeps
every layer where every other one merges, and is maintained with the code.

**Permanent companions:** [`../MEETING-REVIEW-DPIA.md`](../MEETING-REVIEW-DPIA.md) — the first
published item, and the source of the nine-point checklist ·
[`../MEETING-CONSENT-WORDING.md`](../MEETING-CONSENT-WORDING.md) — the second ·
[`tier-cascade.md`](tier-cascade.md) — the four tiers this cascades through.
