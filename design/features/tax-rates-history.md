# Tax Rates — the history

> **[`tax-rates.md`](tax-rates.md) is the Brief and says how the feature works now.** This
> page is why it works that way: how the rulings came about, and where the build differs from
> the drawing Mike approved.

---

## 1. How the item came to exist at all

**Mike asked for it on 2026-09-08**, in one sentence covering both this feature and its
sibling:

> *"is it worth having a field in the firm manager hub where tax pdfs can be loaded to be read
> by the AI so it can be accurate per country?"*

The recommendation put to him was **against** it, and he overturned it: the uploader is an
accountant who should be encouraged to check their sources. The concern that survived was not
*who uploads* but *who checks the extraction*, which the approve-before-use gate answers.

**Then it was nearly lost.** A session researching the sibling found that IR265 is a
*depreciation* schedule, correctly renamed that feature — and then narrowed the whole request
to depreciation alone, treating the tax rates as something Mike had not asked for. It reported
them to him at shutdown as a gap. His reply, 2026-09-09:

> *"of course i want the tax rate made contry aware - i literally asked for that!"*

He had. His request says **"accurate per country"**. Finding that one document was a
depreciation schedule justified renaming a feature; it did not justify shrinking the request to
match the document. **A narrowed request looks exactly like a completed one** — which is why
this is written down rather than left as a correction in a chat log.

---

## 2. Why it is a separate tab, decided before anything was drawn

Hours before this item was drawn, Mike had renamed the sibling **because** a tab called *Tax
Rules* promised GST and company tax and delivered a depreciation schedule. The item's own filed
note then proposed putting tax rates **inside** that same country table.

That was put to him as one recommendation: **a separate tab, sharing the machinery underneath
and nothing on screen.** He approved it before the drawing was made. The reasoning is in the
Brief §2 and it is his own from the day before — a tab's name should predict what is inside it.

---

## 3. Three things the drawing found that the item did not say

Drawing a screen forces questions that a one-line item can leave closed. All three were raised
with him before any code was written, and all three are in the approved artefact.

**1 · The item overstated the fault, and the correction changed the fix.** It said the rates
*"cannot be changed"*. Both were already editable boxes on the intake screen. The real fault is
that they are **silently New Zealand's** — no badge, no source, no country, and no manager able
to set what a country's figures should be. That moves the fix from *add a field* to *give the
field a country and a source*, which is a different piece of work.

**2 · Four figures, not two.** The GST section also fixes the **filing cycle** and the
**accounting basis**, both New Zealand's. A right rate on a wrong filing cycle is still a wrong
cash flow.

**3 · One box may not be enough for a company tax rate.** Australia has two, behind a turnover
and passive-income test the engine has no concept of. Drawn as one sourced figure plus a
free-text line in the manager's own words, and **flagged rather than pretended solved** — see
Brief §6.

---

## 4. The engine change, and why it was ordered first

The drawing lists the manager's screen next and the engine later. That order was changed
deliberately and Mike was told why: **if the advisor's side were built first, a manager could
approve "Quarterly" and the forecast would silently keep filing two-monthly.** An approved
figure that nothing honours is worse than no approval at all, and it is the same class of
silent falsehood the whole feature exists to end.

**The generalisation was not invented; it was read out of the workbook.** All three of its
cycles are `calendarMonth % months === 3 % months`, anchored on New Zealand's 31 March balance
date. Setting that to three months produced March, June, September and December — the
Australian BAS and UK VAT quarters — **without those months being typed in anywhere**. That is
the evidence it is a rule rather than a constant fitted to three cases.

**The proof it changed nothing is the golden set**: 3,385 workbook cells, passing unchanged,
with no existing test edited.

---

## 5. Where the build differs from the approved drawing

Two differences, both deliberate, both stated in the Brief §7 as well:

1. 🔴 **The document upload is drawn (§4) and is not built.** A manager types each figure and
   its source by hand. Everything an extraction would need is already there — the store, the
   approval gate, the source-per-figure rule — so what is missing is the reading step alone.
   It is named rather than quietly omitted.

   🔴 **IT STAYS INSIDE ITEM 4.81 — Mike's ruling, 2026-09-09.** It was put to him as a
   possible item of its own and he kept it here, for the reason the sibling was kept whole a
   day earlier: it is part of the drawing he approved, so filing it separately would let 4.81
   read as finished while a piece of its approved scope was not built. **A narrowed request
   looks exactly like a completed one.**

   ⚠ **AND READ THIS BEFORE BUILDING IT, because the record otherwise makes it sound like
   easy leftover work.** The AI reading buys far less here than it does next door, and the
   difference is arithmetic rather than opinion: **IR265 publishes about 156 asset classes to
   be matched against the forecast's six, and a tax document publishes FOUR figures.** For
   depreciation the reading *is* the feature — nobody hand-matches 156 classes. Here a
   manager types four numbers and the page each came from, on a screen that already refuses
   any figure which cannot name its source.

   The consequence is worth stating plainly: **an extraction would still have to be checked
   against the document, figure by figure, because nothing may be believed until a manager
   approves it.** So it saves the typing and none of the checking — while adding an untrusted
   file upload, a second extraction prompt, a proposals store and an entry on the AI Prompts
   page to the surface that has to be looked after. That may still be worth it. It is not
   obviously worth it, and whoever picks this up should meet that question at the start rather
   than at the end.
2. **The country is not saved with the forecast.** The drawing requires that reopening an old
   forecast resolves the figures it was built on rather than whatever has been approved since.
   That needs this screen's saved shape, which is item 4.62's last unbuilt screen. The code
   says so in terms rather than implying otherwise.

---

## 6. Two things the tests corrected rather than confirmed

**A test told the truth about the offer.** Applying Australia's table changes **three** figures,
not four. Its approved accounting basis is the canonical `invoice` the forecast is already on;
only the *word* differs — *Accruals* against *Invoice*. Nothing the engine computes would move,
so offering it would tell an advisor a figure was about to move when none was. Pinned with the
reason, because it is not obvious from reading either side.

**The word-cap guard on the live list caught three fields at once.** The build's own note ran
to 171 words against a cap of 120. That cap exists because on 2026-09-03 one item's comment had
grown to 1,388 words across seven sessions and Mike could not read his own list. The detail
belongs here and on the Brief, which is where it went.

---

## 7. One standard this tab meets that four of its siblings do not

`FirmTaxRates.vue` puts every user-facing string through `$t()`. Four of its six siblings in
`components/firm/` hardcode English — a deviation recorded in `FirmDepreciationRates.vue`'s own
header and raised with Mike on 2026-09-09.

**This file did not join them.** `CLAUDE.md` requires the standard, most `firm*` locale
sections already meet it, and adding a fifth hardcoded tab would have made an open deviation
larger while it was still open. The cost is that the folder now holds two styles rather than
one; the alternative was to make the wrong one harder to reverse.
