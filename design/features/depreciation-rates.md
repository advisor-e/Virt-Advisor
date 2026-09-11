# Depreciation Rates — the Brief

> **The depreciation rates a firm's forecasts use, read from its tax authority's own
> documents.** Current rules only; the history is in
> [`depreciation-rates-history.md`](depreciation-rates-history.md).
>
> **Covers:** how a firm gets the right depreciation rates for a client's country, who may
> load a document, who may approve one, and how a rate proves where it came from.
> 🔴 **Does not cover TAX RATES, and the distinction is the whole point of the name.** A tax
> rate turns something into tax owed — GST, the flat company rate, personal rates in bands. A
> depreciation rate writes down an asset's book value, and the write-down is claimable against
> profit. This feature only ever sets the second. **The forecast's own `taxRate` (0.28) and its
> GST rate are untouched by it, and cannot be set per country at all — that is item 4.81**, a
> sibling of this one under the same request of Mike's, riding the same country table and the
> same approval gate (history §3b). It also does not cover the Multiple Property
> Assessment's tax settings, a separate block ruled on differently — see
> [`report-models.md`](report-models.md) and the Property Tax Rules tab.

---

## 1. Design philosophy

**The Three-Way Forecast has always depreciated assets at six rates that nobody chose.**
Vehicles at 20%, plant at 22%, and so on down a list of six. They are not any country's tax
rules and never were — New Zealand's IRD gives 50% diminishing value on a passenger vehicle,
two and a half times what the app applies. An advisor who leaves a default produces a
forecast whose depreciation, tax and closing cash are all wrong, **and which balances
perfectly**, and it goes to a lender.

The obvious fix — hardcode New Zealand's rates — fails on the second client. Rates are
published by a tax authority, a tax authority is national, and a firm may advise clients in
more than one country. The fix that works is the one Mike asked for on 2026-09-08: *"a field
in the firm manager hub where tax pdfs can be loaded to be read by the AI so it can be
accurate per country"*. **The firm supplies its own source; the machine reads it; the
manager approves what it read.**

So the idea to hold is this: **this feature does not know any country's Depreciation Rates and never
will.** It knows how to read a document a firm gave it, show a person what it found, show
them equally plainly what it could not find, and refuse to act until that person says yes.
Its value is not the rates. It is that every rate in a funding document can name the
publication it came from — and that the ones which cannot are labelled as guesses.

---

## 2. Key principles — the non-negotiables

**P1 · Nothing unapproved reaches a forecast, and it is structural rather than a check.**
The store cannot hold a table that fails to name its approver and the date; such a value
fails validation and the resolver drops it like any other malformed input. There is no flag
to forget to test and no state in which an unapproved rate is resolvable. *Ignore this and
an AI-read rate reaches a lender with nobody having agreed to it — the exact risk the item
was filed against.*

**P2 · Every approved rate names its document, page and publication date, and cannot be
stored without one.** *Ignore this and an unsourced number sits in an approved table looking
exactly like a sourced one, on the page a bank reads.*

**P3 · The screen states what was NOT found, and the date of the newest document held.**
On 2026-09-08 a session read IR260 and IR265 in full and concluded New Zealand had no
first-year depreciation regime. It was wrong: Investment Boost postdates both, so the gap
was invisible from inside the files. *Ignore this and a screen showing only what it found
will confidently mislead, because an absence looks identical to a negative.*

**P4 · A table belongs to one country and reaches no client outside it.** *Ignore this and a
New Zealand rate quietly depreciates an Australian client's assets, in a forecast that
balances.*

**P5 · A missing table never blocks an advisor.** Mike's words: *"Never block the advisor."*
The app's six defaults apply, labelled as defaults. *Ignore this and someone is stopped
mid-report because a manager elsewhere has not loaded a document — which punishes the wrong
person.*

**P6 · An advisor may LOAD a document; only a firm manager may APPROVE one.** Approving
changes every forecast the firm produces, so it stays on the same role gate as the hub's
other editable blocks, refused by the route rather than hidden on the screen. *Ignore this
and several advisors each extract the same country's rates, ending with different tables and
no second pair of eyes on a number a bank reads.*

**P7 · Approving a table moves the profit a lender reads, not only the tax.** Ruled by Mike
on 2026-09-09: the forecast holds **one** depreciation rate per category, charged as a P&L
expense, with tax computed on the profit after it, and the approved table sets that one rate.
This is the ordinary treatment for owner-managed accounts, which are commonly prepared on the
tax rates so the two agree and no deferred tax arises. *Because it moves reported profit,
every rate's origin must be visible in the finished report and not only on the screen where
it was set.*

**P8 · A document that cannot be READ is refused outright — but a document that disagrees with
ITSELF is not.** Nothing is proposed from partially recovered text. Reading IR265 on 2026-09-08
with ordinary tooling silently dropped about a dozen letters — *"diminishing value"* came
through as *"diinisin alue"* — and the damaged text still read as English, so a search for a
missing term returned nothing and the nothing looked like an answer.

**Legibility is the test, and only legibility (Mike, 2026-09-11).** A published schedule repeats
a heading across a page break and prints the same class twice for different bands of remaining
life; IR265 does exactly that on pages 39 and 40, for capacity in the Southern Cross Cable
Network. Under the older rule the model met that one pair of rows, judged the document
contradictory and refused **all 52 pages** — nothing about vehicles, plant or computers was ever
attempted. Now an entry that cannot be settled is left out, listed on the review screen with the
pages it appears on, and everything else is read as normal. *Ignore this and garbled text
produces confident, wrong rates — or one odd line about undersea cable discards an entire
schedule.*

**P9 · Where two documents disagree, the newer publication wins and the older is shown
beside it.** Never silently dropped. Where the dates are equal the incumbent is kept and the
newcomer still shown, because two documents published the same month do not rank and
inventing an order between them is the silent selection this rule forbids. *Ignore this and a
wrong rate becomes invisible.*

**P10 · The machine proposes a match; the manager confirms it.** A tax authority publishes
thousands of asset classes — IR265 publishes about 2,800, see section 3 — and the forecast has
six. Where no published class is a plausible match the system proposes none and names the
category in the gaps list. *Ignore
this and a category is matched to a class nobody checked, producing a wrong rate that looks
perfectly well sourced.*

**P11 · A firm may have 20 documents read in any rolling 24 hours, and the 21st is refused
before the model is called** (item 4.82). Mike's rulings of 2026-09-11, each answered on its
own: the count is **per firm**, because the firm is what pays and its id is the one identity
every route here has already verified; the number is **20**, because the proposal store only
ever *keeps* 20, so a firm paying for more is paying for readings it cannot keep; advisors and
managers **share one count**, because two pools of 20 would let a firm spend 40; the window
**rolls**, because every fixed reset needs a clock and midnight UTC lands at midday in New
Zealand, which would hand a firm 20 before lunch and 20 after; and it **fails closed**, because
a store we cannot read is exactly when we cannot know what has already been spent. A reading
the model answers badly still spends one — it was still paid for — while a file refused before
that point, a non-PDF among them, costs nothing. His approved wording, at the moment a person
is stopped:

> **Your firm has used all 20 document readings for today. Nothing has been lost — you can
> load this document again tomorrow.**

It names the firm rather than the person, because the advisor in front of it may not be the
one who used it up, and it deliberately does not say *ask your manager* — no manager can raise
it, and promising that sends someone on an errand that goes nowhere. When the count itself
cannot be reached, a separate sentence, because we cannot claim a firm has used all 20 when
the truth is that we do not know:

> **Document readings can't be checked right now. Please try again shortly.**

*Ignore this and one advisor re-loading the same PDF runs up a bill nobody sees until it
arrives.*

**P12 · A COUNTRY's whole schedule is loaded ONCE, at the global group manager tier** (item
4.92, Mike's ruling of 2026-09-11). One person loads the schedules for every country their
group operates in, each tagged with its country; group managers and firms inherit the one
matching their client and load none. **This overrides the default-is-mentor-alone rule of
2026-08-24 for this feature**, and it is the layer P10's picker chooses from: a firm's own
document offers 250 classes, and a country's schedule offers all of them. *Ignore this and
every firm pays to re-read the same published document, and an advisor's client is depreciated
at the nearest of six buckets rather than the class the tax authority publishes.*

**P13 · A schedule is read a few pages at a time, and a page range that will not read is
NAMED** (Mike's second ruling, 2026-09-11). One model answer cannot carry a 52-page schedule —
proved on 2026-09-11, when IR265 was read, named, dated, and proposed nothing at all. A failed
pass is retried once and then recorded as unread; everything else is kept, and **the gap is
shown wherever the table is used, not only where the schedule was loaded**. *Ignore this and
"there is no such class" and "those pages were never read" are the same empty list on screen.*

**P14 · A failed read can be DELETED, and it is the only row that can** (item 4.88, Mike's
words of 2026-09-11 after four identical failures piled up with no way to clear them: *"it
does not give us a chance to delete past failed attempts"*). A **Delete** button appears on an
`unreadable` row alone, asks *"Delete this failed attempt? Nothing else on this screen
changes."*, and the route refuses every other status against the **stored** record — a
pending, approved or rejected document cannot be deleted by any request, because which
document a rate came from, who approved it and when is the audit trail behind every figure in
force. **It deletes rather than adding a fifth status**, deliberately: the store keeps 20
records newest-first, so a row marked "dismissed" would still hold its place and twenty
failures would still push a firm's real documents off the end. *Ignore this and a manager who
cannot clear four dead rows loses the record of the documents their approved rates came from —
the rates themselves survive in their own store; the provenance does not.*

**P15 · A read that found NOTHING is refused, not filed for approval** (item 4.91, Mike's
ruling of 2026-09-11). A document opened, named and dated that then offers no rate for any of
the six **and** no class for the picker was stored as `pending` — a row reading *"Needs your
approval · 0 of 6 categories read"*, which no approval could ever empty and which P14 would not
let a manager delete, because only a failed row may be deleted. IR265 came back in exactly that
shape on 2026-09-11. **Both lists, never either one:** a document matching none of the six but
publishing a hundred classes is entirely actionable under P10, so an empty gaps list alone is a
success; and the unsettled entries of P8 do not count either, because nothing is ever taken
from them. **The whole-schedule reader of P13 already refused its own version of this**, and the
two now share one wording — a manager who loads a schedule and one who loads a single document
have had the same thing happen to them. *Ignore this and a manager is asked to approve an empty
document, and cannot clear it off the screen either.*

⚠ **THE PAGE-RANGE PASSES OF P13 WERE DELIBERATELY NOT PORTED HERE**, and that is the rest of
4.91's answer. The country schedule reads a national document properly, at the tier P12 puts it
at, with its own reading allowance; per-document passes would spend seven or more of a firm's
twenty daily readings (P11) on one file, to build a class list the picker already reaches
through P12. A 52-page national schedule loaded here now fails **visibly** instead of quietly,
which is the correct answer: its home is the country schedule screen.

**P16 · A SERVICE that refuses is not a DOCUMENT that failed** (item 4.89, 2026-09-11). Every
other failure message here is about the file. This one says the opposite in as many words —
*"This is not a problem with your document"* — because when the AI service refuses, the file is
irrelevant and retrying cannot work. **The provider's own sentence is logged and never shown**,
the same rule as `whyUnreadable` (P8) and for the same reason, made concrete the day this was
found: the message carried a billing URL. **The message names no cause**, because an exhausted
account, an expired key, a rate limit and a content refusal arrive identically and only whoever
administers the account can tell them apart — the logged code is what does that. Three further
consequences follow and each is a decision: a refusal is **not recorded against the document**,
because filing it would blame a manager's PDF for an empty account; it **stops a country read**
rather than retrying, since a service refusing this pass refuses the next thirty-nine; and
**nothing partial is offered for approval**, because half a country's rates approved as though
they were the whole is the silent shortfall of item 4.90. *Ignore this and a manager re-loads the
same document forever, paying each time, while the one sentence explaining why is thrown away.*

---

## 3. Design considerations

**Six categories, not thousands of rates.** The approved table holds one rate for each of the
forecast's six asset categories, because a rate stored against a seventh could never reach a
forecast. Each rate keeps the tax authority's own wording for the class it came from, so the
manager's screen can show *"Motor vehicles (transporting people, up to 12 seats)"* above the
figure. **The manager's drawing shows a proposal of 41 rows and its gaps panel says "27 of
the app's asset categories"; both are illustrative and neither is buildable — there are six.**

⚠ **THE FIGURE "ABOUT 156 CLASSES" WAS WRONG AND IS CORRECTED HERE (item 4.90).** It appeared
in this section, in **P10** above, and in the code comment on `MAX_CLASSES`, agreeing with
itself and with nothing else. *P10's copy was the last one in this Brief and was corrected
2026-09-11, while 4.91 was being closed; the code comment is still 4.90's own to settle.* **IR265's table pages number 52, at roughly 54 classes a page — about 2,800.**
The per-document cap of 250 therefore held a tenth of the document, silently. The country
schedule of P12 is what removes the consequence; the stale figure in
`server/utils/depreciationExtract.js` is still 4.90's own to settle.

**✅ THE COUNTRY READ HAS NOW BEEN RUN AGAINST A REAL DOCUMENT, AND THIS IS WHAT IT PRODUCED**
(2026-09-11, the real IR265 October 2023, on a developer machine):

```
read "IR265 — General depreciation rates" NZ · pages=62
  · passes planned=7 read=6 unread=1
  · classes=2303 unresolved=4 refused=12 outOfRange=0
```

Correctly named and dated; **2,303 classes**; four contradictions listed rather than dropped; 12
rows refused by our own validator, about half of one per cent; and no class reported from another
pass's pages. **One pass failed twice and the other six survived it** — P13 holding under real
conditions, where the rule it replaced would have discarded all 62 pages. The same document sent
as ONE request, the day before, proposed nothing at all.

⚠ **Approval has still never been exercised against a real table**, and no figure read this way
has reached a forecast. That needs UAT.

⚠ **AND IT HAD NEVER BEEN RUN AT ALL UNTIL THAT DAY, FOR A REASON WORTH RECORDING.** The country
routes carried the dev-storage guard from their sibling and not the store behind it, so on a
machine without MySQL a read returned nothing and a write was swallowed: the first real reading
of IR265 was discarded in full, after its allowance had been spent. The schedules screen answered
500 for the same reason. Nothing in the suite could see it — those tests replace the storage
layer with mocks, so none had ever reached it. **A feature that cannot be run on a developer
machine will not be run**, and this one was built, tested and merged without anybody seeing it
work once.

**Rates are stored as decimals, never percentages.** 50% is `0.5`. That is the forecast
engine's own convention — it multiplies book value by the number directly — and the backend's
everywhere else. A `50` accepted here would depreciate an asset by 5000% a year, so it is
refused rather than clamped: a rate typed in the wrong unit is not a bad rate, it is a
different number.

**Resolution walks DOWN the tier chain, unlike its three siblings.** Property Tax Rules,
Trend Thresholds and the Sell-Down Ladder recurse upward and `deepMerge`, which is right for
them and loses which layer supplied which key. The advisor's approved drawing badges each row
with its own origin — *your firm · IR265*, *group manager · NZ*, *app default*, three origins
in one table — so this walks `scopeChain` from the mentor down and records the origin as it
overwrites. Same inheritance, same result, plus the provenance the screen needs. **A newcomer
would reasonably "harmonise" this with its siblings and must not.**

**The client's country did not exist before this feature.** There was no country field on the
forecast intake and no mixin supplied one, so every rule that says "a client in that country"
was pointing at nothing. It is now asked once per forecast, defaulting to the firm's own
country (Mike, 2026-09-09) — and **saved with the forecast**, so reopening an old one
resolves the rates it was built on rather than whatever is approved by then.

**Nothing changes under someone who is mid-report.** An approval, or a change of country on
an open forecast, tells the advisor and waits. Applying fills only rates still on defaults
and leaves a rate the advisor typed alone: a typed rate is a decision, not a gap.

**An advisor's typed rate is not a new concept.** The app already tags every figure *from
file* or *entered*; a typed rate is an entered figure, badged **entered by you** on screen
and in the print, applying to that client alone and never touching the firm's table. The
recommendation had been that rate boxes stay read-only and Mike overturned it: an advisor who
knows the right rate can use it, and a reader can still see whose figure it is.

**Per-advisor and per-client tables are deliberately absent.** The cascade ends at the firm.
An advisor's own rate lives on their client's forecast, not in a table of their own.

**A country's first-year rule rides the same table, and is approved separately.** New
Zealand's Investment Boost — 20% of a qualifying new asset expensed in the year of purchase,
the remaining 80% capitalised and depreciated as normal — is held beside the rates, carries its
own approver and date, and is adopted and withdrawn through its own route. Two decisions, two
buttons, and on the backend two handlers that cannot reach each other's field, so confirming a
rate table can never adopt a tax scheme by accident.

**Asset purchases become a dated list, and that is what makes the rule answerable.** Mike's
own point: the boost begins on 22 May 2025, part-way through a month, and the forecast records
only the month a purchase falls in. So each purchase carries its date, and the twelve monthly
totals the engine works to are **derived** from that list — the engine's input shape does not
change, and the golden set that pins the workbook stays valid. **Item 4.77 asked for this same
asset model and was closed into this feature on Mike's ruling of 2026-09-09**, so the work lives
here and nowhere else; its closure, with his own $800,000 tractor costing, is on
[`to-do-done-and-parked.md`](to-do-done-and-parked.md) §2.

---

## 4. For the coder

| Piece | Path |
|---|---|
| The store — validation, the newer-wins rule, the four-tier resolver | [`server/utils/depreciationRates.js`](../../server/utils/depreciationRates.js) |
| The app's own six rates — the floor under every country | [`data/depreciation-rates.json`](../../data/depreciation-rates.json) |
| Its tests | [`tests/unit/depreciationRates.test.js`](../../tests/unit/depreciationRates.test.js) |
| The routes — read, approve rates, adopt or withdraw the rule, history, restore, and load / list / approve / reject a document. **Load is the one an advisor may call too** | [`server/routes/depreciationRates.js`](../../server/routes/depreciationRates.js) · [`tests`](../../tests/unit/depreciationRates.routes.test.js) |
| Which routes are manager-only, pinned against the registration | [`server/restify-server.js`](../../server/restify-server.js) · [`tests`](../../tests/unit/forecastCountryDepreciation.component.test.js) |
| Sending a document to the model, and refusing to trust what comes back | [`server/utils/depreciationExtract.js`](../../server/utils/depreciationExtract.js) · [`tests`](../../tests/unit/depreciationExtract.test.js) |
| The reading instruction itself, on the AI Prompts page at all four tiers | [`data/ai-prompts.json`](../../data/ai-prompts.json) — `depreciation-read` |
| The cap on paid readings — 20 per firm per rolling 24 hours, spent one line before the model (P11) | [`server/utils/aiLoadBudget.js`](../../server/utils/aiLoadBudget.js) · [`tests`](../../tests/unit/aiLoadBudget.test.js) |
| Where a PROPOSAL lives — a store the rate resolver never reads | [`server/utils/depreciationProposals.js`](../../server/utils/depreciationProposals.js) · [`tests`](../../tests/unit/depreciationProposals.test.js) |
| The manager's tab — what is in force, the documents loaded, and the upload | [`components/firm/FirmDepreciationRates.vue`](../../components/firm/FirmDepreciationRates.vue) · [`tests`](../../tests/unit/firmDepreciationRates.component.test.js) |
| Reviewing one document — the class match, the picker, the rates, the gaps | [`components/firm/DepreciationDocumentReview.vue`](../../components/firm/DepreciationDocumentReview.vue) · [`tests`](../../tests/unit/depreciationDocumentReview.component.test.js) |
| Where the tab is gated and named | [`components/FirmManagerHub.vue`](../../components/FirmManagerHub.vue) — `TAB_TIERS.depreciationRates` |
| The tier seam every cascading block asks | [`server/utils/tierChain.js`](../../server/utils/tierChain.js) |
| The engine whose rate this sets | [`server/report/threeWayForecastModel.js`](../../server/report/threeWayForecastModel.js) |
| The screen the six rates are entered on, where the advisor meets the gap | [`components/ThreeWayForecastIntake.vue`](../../components/ThreeWayForecastIntake.vue) · [`tests`](../../tests/unit/forecastCountryDepreciation.component.test.js) |
| **The country schedule (item 4.92)** — one country's whole published table, approved once at the global group tier, with the tier resolver and the server-side search | [`server/utils/countrySchedules.js`](../../server/utils/countrySchedules.js) · [`tests`](../../tests/unit/countrySchedules.test.js) |
| Reading one in passes — a survey, then a request per eight pages, added up here | [`server/utils/countryScheduleRead.js`](../../server/utils/countryScheduleRead.js) · [`tests`](../../tests/unit/countryScheduleRead.test.js) |
| Where a schedule PROPOSAL lives while it is read and until it is approved | [`server/utils/countryScheduleProposals.js`](../../server/utils/countryScheduleProposals.js) · [`tests`](../../tests/unit/countryScheduleProposals.test.js) |
| Its six routes — load, list, watch, approve, reject, and the class SEARCH every tier calls | [`server/routes/countrySchedules.js`](../../server/routes/countrySchedules.js) · [`tests`](../../tests/unit/countrySchedules.routes.test.js) |
| Its two reading instructions, on the AI Prompts page at all four tiers | [`data/ai-prompts.json`](../../data/ai-prompts.json) — `country-schedule-survey`, `country-schedule-pass` |
| Its own reading allowance — 10 schedules per scope per rolling 24 hours, apart from the firm's 20 | [`server/utils/aiLoadBudget.js`](../../server/utils/aiLoadBudget.js) — `consumeScheduleLoad` |
| The global group manager's screen | [`components/firm/CountryRateSchedules.vue`](../../components/firm/CountryRateSchedules.vue) · [`tests`](../../tests/unit/countryRateSchedules.component.test.js) |
| The specification, with all twelve rulings and 50 requirements | [`specs/001-depreciation-rates-per-country/spec.md`](../../specs/001-depreciation-rates-per-country/spec.md) |
| The country schedule's screen, approved 2026-09-11 | [`design/mockups/depreciation-rates-country-schedules.html`](../mockups/depreciation-rates-country-schedules.html) |
| The manager's screen, approved 2026-09-08 | [`design/mockups/depreciation-rates-upload.html`](../mockups/depreciation-rates-upload.html) |
| The advisor's screen, approved 2026-09-08 | [`design/mockups/depreciation-rates-advisor.html`](../mockups/depreciation-rates-advisor.html) |
| The country field, drawn 2026-09-09 | [`design/mockups/depreciation-rates-country-field.html`](../mockups/depreciation-rates-country-field.html) |
| The class match, drawn 2026-09-09 | [`design/mockups/depreciation-rates-class-match.html`](../mockups/depreciation-rates-class-match.html) |
| Investment Boost — the rule, the dated purchase list, the report line | [`design/mockups/depreciation-rates-investment-boost.html`](../mockups/depreciation-rates-investment-boost.html) |

**Traps.**

- **A tax rate and a depreciation rate are not the same thing, and neither are the two kinds
  of depreciation rate.** A tax authority publishes *tax* depreciation — the deduction
  allowed in a return — which is not automatically the rate a business uses in its own
  accounts. This app deliberately uses one rate for both (P7). That is a ruling, not an
  oversight, and it is the single thing most likely to be got wrong here.
- **Decimals, not percentages.** See §3.
- **The resolver walks down, not up.** See §3.
- **`normaliseCountry` refuses a country NAME.** "New Zealand", "NZL" and "nz" are three
  spellings of one country and a store holding all three has three tables where a firm
  approved one. Two letters, upper case, or nothing.
- **A rate must never appear in its own superseded list.** Reloading the same document twice
  would otherwise show a document disagreeing with itself.

**Known state, 2026-09-09.** **Built: the store, the manager's screen, the reading, and the
advisor's rates.** The
store (`d8621e9`) holds the rates and each country's first-year rule, resolves both through the
four tiers with an origin per rate, and refuses a rate or a share typed in the wrong unit.
Slice 2 (`af54bcb`) adds the six routes, the **Depreciation Rates** tab at all four manager
tiers, and the two pure functions the forecast will need — `ruleAppliesOn` and
`splitQualifyingPurchase`. The six defaults are pinned by test to the forecast engine's own, so
the three declarations of those numbers cannot drift.

**Slice 3a adds the whole of the reading, and no screen.** The document is sent to the model
and every field of the answer is validated before it is kept; a proposal lives in its own store
that the resolver never reads; and four routes load, list, approve and reject a document. The
prompt the model is given is on the **AI Prompts** page at all four tiers, so a manager whose
rates come back wrong can read what the machine was told.

**Slice 3b adds the manager's screen, and with it the last of the manager's side.** A manager
loads a schedule, sees the documents this level holds, confirms or changes which published
class each of the six categories takes its rate from, corrects any figure, reads what the
document did not cover, and approves or rejects. **Approve is disabled until every matched
class has been confirmed** — the check P10 exists for. The reading gained the document's own
class list to make the picker possible: the model is asked for every class the schedule
publishes (prompt section 6, capped at 250), each held to the same bar as a proposed rate, and
a class that could not carry a rate and a page is never offered. Every difference between this
build and the two approved drawings is named in the history, §5.

**Slice 4 gives the advisor the rates and where each one came from, and no upload.** The
Assets card reads the client's country's approved table and badges every rate with its own
origin — `app default`, the tier that approved it beside the document it came from, or
`entered by you`. A named country with nothing approved says so in a band above the table.
**An approved table is OFFERED, never applied:** taking it fills only the rates still on
platform defaults, so a rate the advisor typed survives, and until they take it the badge
still reads `app default`, because that is what the forecast would compute with.

**Slice 5 lets the advisor LOAD a document, and approve nothing.** The panel sits beside the
rates, on the step where the advisor meets the gap — not on the client record and not in a
menu. They pick a PDF, it goes to the model, and what comes back is a proposal their firm
manager decides on. The refusal is theirs to see immediately rather than after their manager
has wasted time on it. **It is the same backend handler as the manager's**, on
`POST /api/report/depreciation-rates/documents` behind `firmAuth` alone; approve and reject
keep the manager guard, and a test pins both halves against the registration itself.

> ⚠ **It widens who can spend an AI call, from managers to every advisor.** The file must be a
> real PDF of 20 MB or less and the store keeps 20 documents — but the cap trims *after* the
> model has been paid, so nothing limits how many readings an advisor can trigger. **Raised
> with Mike on 2026-09-09; no rate limit was added without his word.**

**Not built, and not to be described as built:** the dated purchase list, and the report's
Investment Boost line. **No document has been read in earnest yet** — that needs a
real schedule, a key and a manager — so no rate in this app has yet come from a tax authority,
and the first thing to watch on a live run is whether the model picks the right published class
for each of the six.

**Known state, 2026-09-11 — THE COUNTRY SCHEDULE (item 4.92) IS BUILT, ALL FIVE SLICES.** The
store, the sectioned read and its two prompts, six routes with their own 10-a-day allowance,
the global group manager's screen, and the firm's class picker searching the whole country
table instead of one document's first 250 classes. Mike approved the drawing on 2026-09-11
after ruling all three of its decisions.

**What it does NOT do, and must not be described as doing.** No real schedule has been read
through it — that needs a model key, a manager and a live store, which is UAT. So no country
table in this app has yet come from a tax authority, and the first thing to watch on a live
run is whether the survey names the table pages correctly: get that wrong and the passes read
the wrong part of the document, thoroughly and confidently.

**How a document is read was settled by Mike on 2026-09-09** — sent to the model, never
extracted locally — and is now built that way. **Nothing about this feature is undecided.**

---

## 5. Related briefs

- [`report-models.md`](report-models.md) — the Three-Way Forecast whose depreciation this
  sets, and the Multiple Property Assessment whose separate tax settings this must not touch.
- [`firm-manager-hub.md`](firm-manager-hub.md) — the hub the manager's tab lives on, and the
  role gate approval rides.
- [`tier-cascade.md`](tier-cascade.md) — the four tiers this inherits through, and why a
  scope is always the caller's own verified one.
- [`ai-prompts.md`](ai-prompts.md) — the sibling pattern for AI content a manager can see and
  change rather than have buried in a data file.

---

**History:** [`depreciation-rates-history.md`](depreciation-rates-history.md)
