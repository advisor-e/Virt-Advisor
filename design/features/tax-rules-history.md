# Tax Rules — the History

> **Read [`tax-rules.md`](tax-rules.md) first.** That page is the rules. If the
> two disagree, **the Brief wins**.

---

## 1. Why this was built

**It came out of a different item.** On 2026-09-08 Mike was ruling on the asset-schedule
drawing for item 4.65 when he raised the tax cost of a large purchase himself — *"it might
make a difference if it is a large purchase - like an $800,000 truck/tractor unit in terms of
tax to pay and working capital balance year 2"* — which became item **4.77**. Working that
through exposed the larger problem: the engine's six depreciation rates are not any country's
rules. Vehicles is 20% where New Zealand's IRD gives 50% diminishing value on a passenger
vehicle.

He then asked the question this feature answers: *"is it worth having a field in the firm
manager hub where tax pdfs can be loaded to be read by the AI so it can be accurate per
country?"*

**The recommendation was AGAINST it, and he overturned it.** The objection was the uploader:
a document loaded by the wrong person, read by a machine, becomes a rate in a funding
document. His answer was that the uploader is an accountant who should be encouraged to check
their own sources. **The concern that survived was not who uploads but who checks the
extraction** — which is what the approve-before-use gate answers, and it is why that gate is
structural rather than a flag.

---

## 2. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Should firms load their own tax documents at all? | **Yes** — against the recommendation. The uploader is an accountant who should check their sources. | 2026-09-08 |
| Who owns the tab — the group manager (tax is per country) or the firm? | **The firm**, with full cascade across all four tiers. A firm may have specific requirements and cannot be made to wait on the tier above. | 2026-09-08 |
| Two documents give one asset class different rates | **Newer publication wins, older shown beside it.** Silent selection is how a wrong rate becomes invisible. | 2026-09-08 |
| A firm has loaded nothing | **Inherits the nearest approved table above it**, badged with the tier. App defaults only when no tier has one. | 2026-09-08 |
| A client's country has no table | **Carry on with today's defaults, badged, and never block the advisor.** | 2026-09-08 |
| Scope of an approved table | **Tagged with its country; applies only to clients in that country.** | 2026-09-08 |
| Who may load, who may approve | **An advisor may LOAD; only the firm manager APPROVES.** Raised by Mike as a sixth question — *"does the advisor have the ability to enter a tax doc for the client with the different country?"* — when the answer as first drawn was no, leaving the advisor stuck. | 2026-09-08 |
| May an advisor type a rate? | **Yes** — against the recommendation that the boxes stay read-only. The app already tags every figure *from file* or *entered*, so a typed rate is an entered figure, badged *entered by you* on screen and in print, for that client alone. | 2026-09-08 |
| Does an approved table set the accounting rate, the tax deduction, or both? | **One rate.** The forecast keeps a single depreciation rate per category and the approved table sets it, so approving changes reported profit as well as tax. | 2026-09-09 |
| Where does a client's country come from? | **Asked once per forecast, defaulting to the firm's own country** — and saved with the forecast. | 2026-09-09 |
| Who matches a published asset class to a forecast category? | **The system proposes, the manager confirms.** No plausible match means no proposal. | 2026-09-09 |

---

## 3. How the 2026-09-09 rulings came about

**Mike stopped a build that was going the wrong way.** Slice 1 had been written and committed
and the Brief did not yet exist, so the design lived in two mockup files and in chat. Reading
a session summary he asked: *"can you tell me the difference between a tax rate and a
depreciation rate?"*

The answer matters and had been glossed. A **tax rate** turns profit into tax payable — 28%,
already an input, untouched by this feature. A **depreciation rate** writes an asset down, and
there are two of those: the **accounting** rate, which is the entity's own judgement and sets
the profit a lender reads, and the **tax** rate, which is the deduction a tax authority
allows. **IR265 publishes the second.** The build had been treating an IRD table as though it
set the first, without anybody deciding that it should.

He then asked why the design was not visible in the Handbook. It was not: no Brief existed,
and the Handbook builds its pages from `design/features/`. **The two questions are the same
question.** A Brief must state in one sentence what an approved rate does to a forecast, and
there is no way to write that sentence without confronting which rate it is. The design had
been carried in drawings and conversation, where it never had to be answered.

**Spec Kit was used for the first time in this repository** on his instruction, to put the
question properly rather than assume it. `/speckit-specify` wrote
[`specs/001-tax-rules-per-country/spec.md`](../../specs/001-tax-rules-per-country/spec.md),
which surfaced three questions; he took them one at a time. Each answer forced a requirement
nobody had written down:

- **one rate** → the origin of every rate must be visible in the finished report, not only on
  the screen where it was set (FR-028), since a rate that moves reported profit is a claim a
  lender is entitled to trace;
- **country asked per forecast** → it is saved with the forecast (FR-029), and changing it
  never silently moves a rate (FR-030);
- **the system proposes the class** → where it is unsure it proposes nothing and says so
  (FR-032), rather than carrying a real page number into a lender's document behind a guess.

The last two also created screen that neither approved drawing contained, so two addendum
drawings were made rather than the approved files being amended.

---

## 4. The unsolved problem — reading a PDF

**Nothing in this stack can extract text from a PDF, and the obvious fix is the thing that
already failed.** On 2026-09-08 a session read IR265 with ordinary tooling and about a dozen
letters were silently dropped: *"diminishing value"* came through as *"diinisin alue"*, and
the damaged text still read as English, so a search for a term containing a dropped letter
returned nothing and the nothing looked like an answer. That failure is reproduced in §5 of
both approved drawings.

The options, as they stand:

- **Send the document to the model and let it read the PDF natively.** No new dependency, Node
  14 safe, and the app already hand-builds a multipart upload to OpenAI for Meeting Review's
  audio (`server/utils/transcriptionClient.js`), so the path is proven here. **The cost is
  that the refusal notice can no longer quote a damage percentage**, because we would not be
  the one doing the reading — a difference from both drawings that has been named to Mike and
  is not yet ruled on.
- **Add a PDF text-extraction dependency.** A new dependency on a locked Node 14.15 runtime,
  and it is the same class of tooling that produced the garble above.

**This is the next real decision and it belongs to slice 3.**

---

## 5. Where the raw material is

- [`design/mockups/tax-rules-upload.html`](../mockups/tax-rules-upload.html) — the firm
  manager's screen, drawn and ruled 2026-09-08. §7 holds the six rulings verbatim.
- [`design/mockups/tax-rules-advisor.html`](../mockups/tax-rules-advisor.html) — the advisor's
  screen, drawn and ruled the same day. §5 holds its three.
- [`design/mockups/tax-rules-country-field.html`](../mockups/tax-rules-country-field.html) and
  [`tax-rules-class-match.html`](../mockups/tax-rules-class-match.html) — the two addenda of
  2026-09-09.
- [`specs/001-tax-rules-per-country/spec.md`](../../specs/001-tax-rules-per-country/spec.md) —
  the specification, with the three rulings of 2026-09-09 in its Clarifications section.
- [`design/ARTEFACTS.md`](../ARTEFACTS.md) — all four drawings registered, with their status.
- Commit `d8621e9` — slice 1, the store. Its message records the two departures from the
  drawings and the question that was open when it was written.
- The IRD guides Mike supplied are outside the repository, at
  `C:\Documents\Visual Code Projects\Perf Report\tax rules nz` — **IR265 (October 2023)** and
  **IR260 (April 2024)**. Both were read in full on 2026-09-08; neither mentions Investment
  Boost, which postdates them, and that absence is why P3 of the Brief exists.
