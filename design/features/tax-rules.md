# Tax Rules — the Brief

> **The depreciation rates a firm's forecasts use, read from its tax authority's own
> documents.** Current rules only; the history is in
> [`tax-rules-history.md`](tax-rules-history.md).
>
> **Covers:** how a firm gets the right depreciation rates for a client's country, who may
> load a document, who may approve one, and how a rate proves where it came from.
> **Does not cover:** the Multiple Property Assessment's own tax settings, which are a
> separate block ruled on differently — see [`report-models.md`](report-models.md) and the
> Property Tax Rules tab. Nothing here changes those.

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

So the idea to hold is this: **this feature does not know any country's tax rules and never
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

**P8 · A document that cannot be read reliably is refused outright.** Nothing is proposed
from partially recovered text. Reading IR265 on 2026-09-08 with ordinary tooling silently
dropped about a dozen letters — *"diminishing value"* came through as *"diinisin alue"* — and
the damaged text still read as English, so a search for a missing term returned nothing and
the nothing looked like an answer. *Ignore this and garbled text produces confident, wrong
rates.*

**P9 · Where two documents disagree, the newer publication wins and the older is shown
beside it.** Never silently dropped. Where the dates are equal the incumbent is kept and the
newcomer still shown, because two documents published the same month do not rank and
inventing an order between them is the silent selection this rule forbids. *Ignore this and a
wrong rate becomes invisible.*

**P10 · The machine proposes a match; the manager confirms it.** A tax authority publishes
around 156 asset classes; the forecast has six categories. Where no published class is a
plausible match the system proposes none and names the category in the gaps list. *Ignore
this and a category is matched to a class nobody checked, producing a wrong rate that looks
perfectly well sourced.*

---

## 3. Design considerations

**Six categories, not 156 rates.** The approved table holds one rate for each of the
forecast's six asset categories, because a rate stored against a seventh could never reach a
forecast. Each rate keeps the tax authority's own wording for the class it came from, so the
manager's screen can show *"Motor vehicles (transporting people, up to 12 seats)"* above the
figure. **The manager's drawing shows a proposal of 41 rows and its gaps panel says "27 of
the app's asset categories"; both are illustrative and neither is buildable — there are six.**

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

---

## 4. For the coder

| Piece | Path |
|---|---|
| The store — validation, the newer-wins rule, the four-tier resolver | [`server/utils/taxRules.js`](../../server/utils/taxRules.js) |
| The app's own six rates — the floor under every country | [`data/tax-rules.json`](../../data/tax-rules.json) |
| Its tests | [`tests/unit/taxRules.test.js`](../../tests/unit/taxRules.test.js) |
| The tier seam every cascading block asks | [`server/utils/tierChain.js`](../../server/utils/tierChain.js) |
| The engine whose rate this sets | [`server/report/threeWayForecastModel.js`](../../server/report/threeWayForecastModel.js) |
| The screen the six rates are entered on today | [`components/ThreeWayForecastIntake.vue`](../../components/ThreeWayForecastIntake.vue) |
| The specification, with all three rulings of 2026-09-09 | [`specs/001-tax-rules-per-country/spec.md`](../../specs/001-tax-rules-per-country/spec.md) |
| The manager's screen, approved 2026-09-08 | [`design/mockups/tax-rules-upload.html`](../mockups/tax-rules-upload.html) |
| The advisor's screen, approved 2026-09-08 | [`design/mockups/tax-rules-advisor.html`](../mockups/tax-rules-advisor.html) |
| The country field, drawn 2026-09-09 | [`design/mockups/tax-rules-country-field.html`](../mockups/tax-rules-country-field.html) |
| The class match, drawn 2026-09-09 | [`design/mockups/tax-rules-class-match.html`](../mockups/tax-rules-class-match.html) |

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

**Known state.** **Only the store is built** — commit `d8621e9`, 2026-09-09. It has
validation, the cascade, the newer-wins rule and 41 tests, and **nothing calls it**. There is
no route, no screen, no upload, and no document has ever been read. The six defaults it ships
are pinned by test to the forecast engine's own, so the three declarations of those numbers
cannot drift.

**Not built, and not to be described as built:** the Firm Manager Hub tab, the upload, the
reading of a document, the approval action and its role gate, the gaps panel, the version
history, the advisor's badges, the country field, and every screen. The reading of a PDF is
unsolved — see the history file — and is the next real decision.

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

**History:** [`tax-rules-history.md`](tax-rules-history.md)
