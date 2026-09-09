# Depreciation Rates — the History

> **Read [`depreciation-rates.md`](depreciation-rates.md) first.** That page is the rules. If the
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
| Is this feature called Tax Rules or Depreciation Rates? | **Depreciation Rates.** The old name was wrong and was making the objective unreadable — §3b. | 2026-09-09 |

**Everything above was named `tax-rules-*` until 2026-09-09.** The four drawings, the Brief, the
History, the store, the data file, the tests and the specification were all renamed together with
`git mv`, so the history follows the files. **`design/TAX-RULES-IMPORT-GST.md` was NOT renamed** —
it is about GST on imports, which really is a tax rule, and it belongs to a different piece of work.

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
[`specs/001-depreciation-rates-per-country/spec.md`](../../specs/001-depreciation-rates-per-country/spec.md),
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

## 3b. The name was wrong, and it was the reason the objective would not come clear

Later the same day Mike read the summary again and said the confusion was still there:
*"Tax rates pertain to things like goods and sales tax, overall profit tax rates in bands for
individuals with flat rates for companies and trusts etc — depreciation rates pertain to the loss
in book value of an asset, a % of which is claimable as an 'offset' against overall profit … im not
sure this page is clear in its objective."*

He was right, and researching it found the sentence that settles it. **IR265's actual title is
"General depreciation rates".** It is a depreciation schedule that happens to be published *by* the
tax office, because the tax office sets the rates. *Published by Inland Revenue* had been sliding
into *about tax rules* in every summary written about this feature, including the name of the
feature itself. A tab called **Tax Rules** promises GST, company tax and provisional tax, and
delivers a depreciation schedule; nobody opening it could predict what was inside.

**The objective, as agreed 2026-09-09:** *so that a client's forecast writes assets down at the
rates that client's own tax authority publishes, with every rate traceable to the document and page
it came from — because the app's six built-in rates are a guess.* Nothing in that sentence is about
tax rates, and the feature was renamed the same day so that its name says it.

**Three things the research turned up, beyond the name:**

1. 🔴 **The forecast contains a real tax rate that nobody can set per country.**
   `threeWayForecastModel.js` holds `taxRate: 0.28` — the New Zealand company rate — and a GST rate
   beside it. An Australian client should be at 30% company tax and 10% GST. Every forecast for an
   overseas client is wrong on tax **whether or not it owns a single asset**.
   **It is filed as item 4.81**, and the way it got there is the lesson: this session recorded it
   as a gap Mike *had not asked for*, and told him so at shutdown. His reply — *"of course i want
   the tax rate made contry aware - i literally asked for that!"* — was correct. His request of
   2026-09-08 says **"accurate per country"**; finding that IR265 was a depreciation schedule
   justified renaming the feature, and did **not** justify shrinking the request to match the
   document. **A narrowed request looks exactly like a completed one.**
2. 🔴 **Investment Boost is real and now sourced**, closing the open question on item 4.77 where it
   had been cited from an AI session's own memory. From **22 May 2025** a business deducts **20% of a
   new asset's cost as an expense** and depreciates the remaining **80%** as normal
   ([Inland Revenue](https://www.ird.govt.nz/income-tax/income-tax-for-businesses-and-organisations/types-of-business-expenses/new-assets---investment-boost)).
   It does not increase the total deduction — it brings it forward.
   **⚠ AND IT CONTRADICTS THE FIRST RULING OF 2026-09-09.** Investment Boost is a deduction in the
   tax return, not a change to book value. With one depreciation rate doing both jobs there is
   nowhere for it to live, so item 4.77 needs the two numbers to be able to differ while FR-025 says
   they never do. **This is unresolved and is Mike's to settle.**
3. **The IRD guides in hand are three editions out of date.** IR265 has since been published in
   **August 2024**, **July 2025** and **March 2026**; the copy supplied is October 2023.
   Non-residential buildings also returned to a **0%** rate from the 2025 income year.

---

## 4. Reading a PDF — the problem, and how it was settled

**Nothing in this stack can extract text from a PDF, and the obvious fix is the thing that
already failed.** On 2026-09-08 a session read IR265 with ordinary tooling and about a dozen
letters were silently dropped: *"diminishing value"* came through as *"diinisin alue"*, and
the damaged text still read as English, so a search for a term containing a dropped letter
returned nothing and the nothing looked like an answer. That failure is reproduced in §5 of
both approved drawings.

**Ruled by Mike, 2026-09-09: the document is sent to the model and read there.** A local
text-extraction dependency was the alternative, and it was refused twice over — it is a new
dependency on a locked Node 14.15 runtime, and it is the same class of tooling that produced
the garble above.

**The ruling had a cost, and it was paid rather than hidden.** §5 of both approved drawings
refuses an unreadable document by quoting a measured damage figure — *"about 12% of the text
came through damaged"*. Once the model is the one reading, the application cannot measure that
and must not appear to. Mike settled the replacement wording verbatim the same day; it is
FR-049, it is what `UNREADABLE_MESSAGE` holds, and one test pins it because it is what a
manager is told happened to their document. He also **refused** showing the model's own
account of what defeated it (FR-050): unedited model text on a screen is the one thing this
feature is otherwise careful never to do.

**Built in slice 3a**, and the mechanism is worth recording because a later session would
reasonably reach for the other one. The file rides as a **base64 data URL on an `input_file`
part of `/v1/responses`** — no multipart, no Files API, no new machinery. Meeting Review's
audio path (`server/utils/transcriptionClient.js`) hand-builds a multipart upload because
`/v1/audio/transcriptions` demands one; this endpoint does not, so it does not get one. The
read **streams**, which is not a preference either: `openaiClient` guards every call with a
per-socket inactivity timeout, and a non-streamed read of a sixty-page schedule would spend
its whole duration with no bytes on the socket and be killed by that guard.

---

## 5. Where the raw material is

- [`design/mockups/depreciation-rates-upload.html`](../mockups/depreciation-rates-upload.html) — the firm
  manager's screen, drawn and ruled 2026-09-08. §7 holds the six rulings verbatim.
- [`design/mockups/depreciation-rates-advisor.html`](../mockups/depreciation-rates-advisor.html) — the advisor's
  screen, drawn and ruled the same day. §5 holds its three.
- [`design/mockups/depreciation-rates-country-field.html`](../mockups/depreciation-rates-country-field.html) and
  [`depreciation-rates-class-match.html`](../mockups/depreciation-rates-class-match.html) — the two addenda of
  2026-09-09.
- [`specs/001-depreciation-rates-per-country/spec.md`](../../specs/001-depreciation-rates-per-country/spec.md) —
  the specification, with the three rulings of 2026-09-09 in its Clarifications section.
- [`design/ARTEFACTS.md`](../ARTEFACTS.md) — all four drawings registered, with their status.
- Commit `d8621e9` — slice 1, the store. Its message records the two departures from the
  drawings and the question that was open when it was written.
- The IRD guides Mike supplied are outside the repository, at
  `C:\Documents\Visual Code Projects\Perf Report\Depreciation Rates nz` — **IR265 (October 2023)** and
  **IR260 (April 2024)**. Both were read in full on 2026-09-08; neither mentions Investment
  Boost, which postdates them, and that absence is why P3 of the Brief exists.
