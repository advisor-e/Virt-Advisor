# Tax Rates — the Brief

> **The tax figures a client's forecast is computed on, for the country that client trades
> in, read from that country's own published documents.** Current rules only.
>
> **Covers:** the company tax rate, the GST or VAT rate, how often a return is filed, and
> whether GST follows the invoice or the payment — where each comes from, who may approve one,
> and how each figure proves its source.
> 🔴 **Does not cover DEPRECIATION RATES.** A tax rate turns something into tax owed; a
> depreciation rate writes an asset's book value down. That is
> [`depreciation-rates.md`](depreciation-rates.md), a sibling of this one under the same
> request of Mike's. The two share one country table, one four-tier cascade and one
> approve-before-use gate in the code, **and nothing on screen** — see §2.

---

## 1. Design philosophy

**The forecast has always applied New Zealand's tax figures to every client on earth.** 28%
company tax, 15% GST, a two-monthly filing cycle, the invoice basis. An Australian company is
at 30% and 10% and files a quarterly BAS.

The fault is not that these could not be changed — an advisor could always type over the two
rates. It is that **nothing said they were New Zealand's**. No badge, no source, no country,
and no manager anywhere could set what a country's figures should be. An advisor working on an
Australian client saw 28% and had no reason to doubt it, and the finished forecast added up
perfectly while being wrong on tax **whether or not the client owned a single asset**.

So the idea to hold is the sibling's: **this feature does not know any country's tax rates and
never will.** It knows how to hold what a firm approved, show a person where each figure came
from, and use the app's own only when nobody has said otherwise.

---

## 2. Why it is a separate tab

**Ruled by Mike, 2026-09-09, before the drawing was drawn.** Earlier that same day he renamed
Depreciation Rates *because* a tab called **Tax Rules** promised GST and company tax and
delivered a depreciation schedule. Folding these figures back into that tab would have
recreated the confusion he had just paid to remove.

**They share their machinery and nothing else.** One country table, one cascade, one approval
gate — in the code, where nobody has to read it. The tab name is what a manager reads, and it
should predict what is inside.

---

## 3. The five figures

The item was filed as *"the tax rate and the GST rate"*. Drawing the screen found the GST
section fixes three things, not one. A fifth joined on 2026-09-14.

| Figure | What it does | Was |
|---|---|---|
| **Company tax rate** | Applied to profit before tax, every month | 28%, New Zealand's |
| **GST / VAT rate** | Charged on sales, reclaimed on purchases | 15%, New Zealand's |
| **Filing cycle** | Decides which months a return falls due | Two-monthly, New Zealand's |
| **Accounting basis** | Whether GST follows the invoice or the payment | Invoice, New Zealand's |
| **Income tax bands** | The progressive table a **person's** income is taxed through | *(new)* |

🔴 **A right rate on a wrong filing cycle is still a wrong cash flow.** The cycle decides which
months money actually leaves the bank; the year's total is unchanged. That is precisely the
kind of error a balanced set of statements hides.

### 3a. The fifth figure — income tax bands *(added 2026-09-14)*

Decision 5 of the Wages/Salary Review, ruled by Mike: **a fifth figure here, New Zealand's
badged `app default`, never withheld.** The first four serve the Three-Way Forecast, which
taxes company profit; the fifth serves the Wages/Salary Review's rates tab, which taxes a
person's income. They share this store because they share what matters — **one country table,
one cascade, one approve-before-use gate** — not because they serve one screen.

🔴 **IT IS THE ONLY FIGURE HERE THAT IS A TABLE, AND THAT CHANGES WHAT VALIDATION HAS TO DO.**
The other four are single values: type one wrong and it looks wrong. A band table does not.
**A gap between two bands leaves a slice of income untaxed; an overlap taxes it twice**; and
either way the total looks entirely plausible to the manager approving it and to anyone in UAT
reading the screen. Nobody re-adds a tax table by hand, so nobody catches it.

So `cleanIncomeTax` checks the shape rather than trusting it:

- at least one band, at most **12** — generous against reality, and a cap a malformed upload
  cannot exceed;
- every rate a decimal 0..1, the store's convention everywhere (39% is `0.39`, never `39`);
- the **first band starts at 0 or 1**, so a tax-free threshold is written as an explicit **0%
  band** rather than left as a silent hole below the first one;
- each later band starts at the previous ceiling **plus one** — the convention every real table
  uses, and what makes a gap or an overlap *impossible* rather than merely unlikely;
- **exactly one open-ended band, and it is the last**, because income above the top ceiling has
  to be taxed at something.

⚠ **It does NOT require rates to rise.** A flat or falling band is legal somewhere, and refusing
one would be this app inventing tax policy. Contiguity is arithmetic; the direction of the rates
is the country's business.

`incomeTaxOn(income, bands)` computes the tax and is pinned against the source workbook: on
New Zealand's bands **145,000 owes 38,770** and a separate **25,000 owes 3,395** — the
`Hrly Rate & Tax Calculator` sheet's own AH8 and AH12. The manager's screen shows the table in
force as a **summary** (*"5 bands, 10.5% to 39%"*) and the whole table in the editor, because
five rows would crush a row that holds four one-line figures beside it.

---

## 4. The rules that hold it together

- **A figure cannot be approved unsourced.** Every stored figure names its document, its
  publication date and its page. On the manager's screen the source doubles as the include
  flag: a figure is only sent for approval once it names a document, so there is no path to an
  approved figure nobody can trace. A value typed with no document is **reported, never
  silently dropped**.
- **Nothing unapproved can reach a forecast**, and it is structural rather than a flag: the
  store holds approved tables only, so a table that cannot name its approver and date fails
  validation and is dropped by the resolver like any other malformed value.
- **The approver is the signed-in manager**, taken from the verified token and never from a
  request body. It is the name that sits beside a tax rate on a document a lender reads.
- **A partial table is the common case.** A document publishing the company tax rate and
  nothing else approves one figure; the other three keep coming from the tier above.
- **A rate is refused in the wrong unit, never clamped.** `30` is not a bad 30% — it is a
  number in the wrong unit that would tax a company at 3000% in a forecast that still balances.
- **Naming a country moves no figure on its own.** The advisor is told how many would change
  and which, and chooses. Mike's ruling, 2026-09-09.
- **The advisor is never blocked.** Any failure resolves to the app's own four figures, which
  are exactly what every forecast uses today.

---

## 5. The filing cycle is a number of months

**The engine held three hardcoded branches — one-monthly, two-monthly, six-monthly — and all
three are New Zealand's.** Australia's quarterly BAS and the United Kingdom's quarterly VAT
could not be expressed at all.

One formula replaced them. A return is due when `calendarMonth % months === 3 % months`, which
reproduces all three of the workbook's cycles exactly:

| Cycle | The rule gives | Which is |
|---|---|---|
| 1 month | every month | as before |
| 2 months | January, March, May, July, September, November | as before |
| 6 months | March and September | as before |
| **3 months** | **March, June, September, December** | **the BAS and VAT quarters** |

**The anchor is March because that is New Zealand's 31 March balance date**, which the
workbook's cycles were aligned to. The quarterly months were derived by the same formula, not
typed in — which is the evidence it is a rule rather than a fit.

**Only divisors of twelve are allowed.** A cycle that does not divide into a twelve-month
forecast leaves a return falling due outside it, so the last filing is either dropped or paid
early, and both are wrong in a way that still balances.

⚠ **The workbook's `#REF!` is preserved, for six-monthly alone.** Correction R5: its
six-monthly formula reads six columns back and falls off the sheet in the first month of a
March-start year. Two-monthly has always clamped instead. That asymmetry is the workbook's own,
and **a new cycle must not inherit it** — reproducing it for a quarterly return would drop a
real filing out of an Australian forecast.

**The proof is the golden set.** All 3,385 workbook cells pass unchanged, and no existing test
was edited.

---

## 6. Company tax is one flat rate, and the app says so

**Australia has two company rates** behind a turnover and passive-income test; New Zealand has
one for companies and another for trusts. The forecast applies **one flat rate** to monthly
profit and has no concept of bands, entity types or eligibility.

So the manager writes a free-text line — *"base rate entities, turnover under $50m"* — in their
own words, and the advisor reads it beside the rate. **It is a sentence, not a rule engine.**
One sourced, manager-approved figure is a large improvement on one unsourced hardcoded figure;
pretending to model eligibility would be worse than either.

**Tax bands for individuals are out of scope and stated as such.** Mike's own wording of
2026-09-09 names them; the Three-Way Forecast models a trading entity, not a person.

---

## 7. What is built, and what is not

**Built** — the country table and its validation, the four-tier cascade, five Restify routes,
the **Tax Rates** tab at all four manager tiers, the engine's filing cycle, and the advisor's
side: a country field on the forecast, each figure naming its source, and the offer an advisor
accepts or ignores.

**Not built:**

- 🔴 **Loading a tax PDF for the model to read.** The approved drawing shows it (§4) and it is
  not there. **Today a manager types each figure and its source by hand.** Everything an
  extraction would need already exists — the store, the approval gate, the source-per-figure
  rule — so this is the reading step alone. ⚠ **It stays inside item 4.81 on Mike's ruling of
  2026-09-09, and whether it is worth building at all is genuinely open — read
  [the history §5](tax-rates-history.md) first.** A tax document publishes four figures where a
  depreciation schedule publishes about 2,800, so an extraction here saves the typing and
  none of the checking.
- **The country saved with the forecast.** The drawing requires that reopening an old forecast
  resolves the figures it was built on rather than whatever has been approved since. That needs
  this screen's saved shape, which is item 4.62's last unbuilt screen. Until then the country
  lives on the form for the session and no further.
- **The country field is shared with [`depreciation-rates.md`](depreciation-rates.md) and only
  the tax half is wired to it.** Wiring the six depreciation rates to the same field is that
  item's own work.

⚠ **No screen here has been opened in a browser.** Every path is proven against stubs. The
Economic Analysis threw up nine live faults that green tests had all missed, so treat the first
real run as the real test.

---

## 8. The artefact

[`design/mockups/tax-rates.html`](../mockups/tax-rates.html), approved by Mike 2026-09-09.
Every difference between it and the build is named in §7 above: the document upload is drawn
and not built, and the saved country is drawn and not built.
