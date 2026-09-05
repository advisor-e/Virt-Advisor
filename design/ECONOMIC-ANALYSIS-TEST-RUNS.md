# Economic Analysis — what the prompt actually produced

> **Evidence, not a design.** The prompt being tested is
> [`ECONOMIC-ANALYSIS-PROMPT.md`](ECONOMIC-ANALYSIS-PROMPT.md); this page is what came back
> when it was run, so that a decision about length, depth or cost rests on output somebody
> has read rather than on an opinion.
>
> **Mike's instruction, 2026-09-06:** *"doing a couple of test examples will give us some
> ideas i suspect."* He was right, and §1's faults below are what the tests bought.
>
> 🔴 **Both businesses are FICTIONAL.** No client, real or prospective, has been sent to any
> model. Run 1 was written to exercise imported goods, sea freight and working capital; run 2
> to exercise services, a different country and capital expenditure.
>
> **Nothing here is built.** These runs were made by a throwaway script outside the
> repository, calling `/v1/responses` directly. `server/utils/openaiClient.js` is untouched.

---

## Run 1 — 2026-09-06 · imported goods, New Zealand

**Brief given:** *a specialist importer and wholesaler of European kitchen fittings and
cabinetry hardware, 14 staff, Nelson, New Zealand; sells to kitchen manufacturers and
building firms across the upper South Island; stock arrives by sea container from Italy and
Germany, 10–14 weeks order to landing; seeking a working capital facility to cover the gap
between paying suppliers on order and being paid on 60-day terms; forecast period 12 months.*

| Measure | Result |
|---|---|
| Wall-clock | **82.8 s** |
| Web searches | 8 |
| Citations | 16, across **12 unique sources** |
| Length | 1,602 words total; **~1,300 in sections 1–4** against the then-target of 800–1,200 |
| Tokens | 68,457 in (includes retrieved page content), 5,710 out |
| Cost | **≈ US$0.29** — tokens at model rate plus 8 search calls |

**Sources it chose, unprompted:** Reserve Bank of New Zealand (two), Stats NZ (three,
including the Nelson City area profile and the 2025 housing report), Eurostat, UNCTAD's
Review of Maritime Transport, MBIE's National Construction Pipeline, Tasman District
Council's monitoring report, and the NZ Kitchen and Bathroom Association. **Eleven of twelve
are primary or official**; the twelfth is an industry association, which §3 permits and
Mike's own source list named.

### What it got right

**It refused to advise on the lending.** Section 4 closes: *"no conclusion is drawn about the
business's own funding requirement."* Throughout, it separates public evidence from the
business — *"does not establish the business's own wage costs"*. §5 of the prompt holds.

**It was current.** It used the Reserve Bank's OCR decision of **2 September 2026** — four
days before the run — and June 2026 quarter CPI and labour figures.

**It was local.** Nelson City median personal income, Nelson/Tasman dwelling consents, and a
regional housing-affordability grouping — not national filler dressed up as local knowledge.

**Section 5 is the most valuable part of the document.** Seven gaps, each naming what it
would have been used for: local rents, Nelson-specific labour data, Europe–NZ lane freight
rates, product-specific import values, sector sales series. It also declined to use forum
posts as evidence, recording them as anecdotal — an honesty nobody asked for by name.

### The three faults, and what each changed

**🔴 1 · A citation was misfiled.** Section 4 discussed the euro exchange rate and attributed
it to Stats NZ's inflation release; the rate came from the Reserve Bank. **The figure was
right and the source beside it was wrong.** This is the important one: the planned code check
tests that a citation *exists*, and cannot test that it is the *correct* one.
→ **Recorded as a limitation in the prompt file §5, not instructed away.** It would be worse
to add a line telling the model to file citations correctly and then believe it had.

**2 · It ran long** — ~1,300 words in sections 1–4 against a target of 800–1,200.
→ **Target raised to 1,200–1,600** rather than squeezed. The overspend was caveats, and the
caveats are what make it defensible to a lender. Cutting them would buy brevity with honesty.

**3 · It flagged the brief as undated**, writing *"the undated advisor brief"*, and inferred
an assessment start date.
→ **`{{today}}` added** as a second variable, supplied by the server. It is not client data.

### What run 1 settled

- **Deep research is not needed.** Twelve primary sources, current to four days before the
  run, with genuine local granularity. `o3-deep-research` would add tens of minutes and a
  much larger bill for output already fit for a credit assessor.
- **A polling screen is enough.** 83 seconds is far past the 2000 ms page rule, but nowhere
  near needing webhooks — the pattern `server/routes/meetingReview.js` already uses twice.
- **The cost is not a constraint.** Pennies per run.

The full output of run 1 is reproduced at the end of this page.

---

## Run 2 — 2026-09-06 · a service business, Ireland, capital expenditure

**Deliberately unlike run 1**: services rather than imported goods, Ireland rather than New
Zealand, and money for a fit-out rather than working capital. One run proves the prompt
works; two test whether it *generalises*. **It ran the revised prompt**, so the two fixes
from run 1 were exercised at the same time.

**Brief given:** *a physiotherapy and rehabilitation clinic, 9 staff, two sites in Galway,
Ireland; patients a mix of private-pay, private health insurance and public referrals;
seeking finance to fit out and equip a third site in the same county, including treatment
equipment and a lease on new premises; forecast period 12 months.*

| Measure | Run 1 | Run 2 |
|---|---|---|
| Wall-clock | 82.8 s | **93.4 s** |
| Web searches | 8 | **12** |
| Unique sources | 12 | **22** |
| Words (all sections) | 1,602 | **2,301** |
| Cost | ≈ US$0.29 | **≈ US$0.41** |

**It found the right sources for a sector it had never been told about.** IMF, UNCTAD,
Eurostat, the ECB, the Central Bank of Ireland, the CSO (four separate releases), gov.ie,
the Residential Tenancies Board rent index, the SCSI commercial property monitor, **CORU**
(the health-professions regulator), the **HSE** (waiting lists), the **Health Insurance
Authority**, Fáilte Ireland and Galway City Council's rates multiplier. Nobody named a
physiotherapy regulator in the prompt; it went and found one.

### The two fixes worked

**The date fix worked exactly.** Run 2 opens *"This assessment covers 6 September 2026 to
5 September 2027."* No complaint about an undated brief, no inferred date.

**Local depth improved.** Galway City new-tenancy rents (€2,004/month, Q1 2026, +13.3%) and
the city's 2026 commercial-rates multiplier — **precisely the class of local cost data run 1
had to list as unsourceable.** It is country data availability, not model capability, that
sets the floor.

### Section 4 held the line again, and Section 5 got better

No view on the lending, in either run. Run 2 closes section 4: *"Neither figure indicates the
rate available to this business. They establish only that finance costs should be assessed
against a rate environment that remains uncertain."*

**Section 5's first bullet is unexpectedly useful to the advisor**, listing everything about
the business it was not given — turnover, existing debt, security, lease obligations, the
proposed borrowing amount, the repayment profile. That is a preparation checklist for a
funding pack, produced as a by-product.

### 🔴 The misfiled citation is SYSTEMATIC, not a one-off

**It happened again, in the same shape.** Run 2, section 4: Galway residential rents rising
13.3% are attributed to the CSO's *earnings and labour costs* release. The rent figure came
from the RTB rent index, correctly cited earlier in section 2.

**Two runs, two misfilings, and the pattern is identical: a paragraph carrying two figures
from two sources gets one citation, and the wrong one sticks.** Neither claim was false —
both times the number was right and the source beside it was not.

This is the one defect standing between the output and a lender's desk, and it cannot be
caught by the planned code check, which tests only that a citation exists.

### ⚠ The word target is advisory at best

Run 1 overshot 800–1,200 by roughly 100 words in sections 1–4. **Run 2 overshot the raised
1,200–1,600 target by roughly 200**, at about 1,800 words. Raising the number moved the
output up with it.

**Length appears to be driven by how much the model finds, not by the number it is given.**
Ireland published more usable local data than New Zealand, and the document grew. Treat the
figure as a steer, and do not build a screen that assumes a predictable length.

### What run 2 settled

- **It generalises.** A different sector, country, currency and financing purpose produced
  the same structure and the same discipline, with better local data.
- **Cost scales with what is available, not with the business.** $0.29 → $0.41 as searches
  went 8 → 12. Still pennies.
- **93 seconds.** Polling remains the right shape; webhooks remain unnecessary.

---

## Run 3 — 2026-09-06 · the citation fix, tested as a clean A/B

**Same brief as run 2, same model, one change:** §4 of the prompt gained *"Attach the
citation to the figure, not to the paragraph… Never let a single citation stand for a
paragraph drawing on two sources. If you restate a figure cited earlier, cite it again."*

Holding the brief constant was the point — anything that moved is the instruction's doing.

| Measure | Run 2 | Run 3 |
|---|---|---|
| Wall-clock | 93.4 s | 82.5 s |
| Web searches | 12 | 9 |
| Unique sources | 22 | 20 |
| Words | 2,301 | 2,070 |
| Cost | ≈ US$0.41 | ≈ US$0.31 |

### It half worked, and the half tells us where the fault actually lives

**In sections 1–3 the fix took, cleanly.** Each paragraph now carries a source per figure,
and where a paragraph draws on two releases it cites both separately — the labour-market
paragraph cites the Labour Force Survey for the quarterly rate and the monthly unemployment
release for the July estimate, each beside its own number. **That is exactly the behaviour
asked for, and it was absent in runs 1 and 2.**

**In section 4 it failed, and failed the same way three times now.** Its opening synthesis
paragraph carries three figures — domestic demand 4.2%, private insurance covering
2.55 million people, HSE physiotherapy activity up 15.0% — under **one** citation, the ESRI
nowcast, which is the source of only the first. The next paragraph does the same with three
cost figures under a single CSO earnings citation, when two came from the CPI and wholesale
price releases.

🔴 **THE PATTERN IS NOW PRECISE, AND IT IS NOT RANDOM. Attribution is reliable where a figure
is FIRST INTRODUCED, and unreliable where it is RESTATED.** Sections 1–3 introduce; section 4
recalls. The instruction to re-cite on restatement is the half that does not take.

### What that means, and it is not a prompt problem any more

Three attempts have now been made at instruction level. **Do not make a fourth on the same
lines.** The finding to carry forward is:

- **Sections 1–3 are the evidence, and their citations can be relied on.**
- **Section 4 is synthesis, and its citations cannot be.**
- The API cannot rescue this. `url_citation` annotations record where the model *put* a
  citation, so a misplacement is upstream of the annotation and arrives inside it.

**The structural fix, untested, is to remove the surface rather than police it:** §4's own
brief already says *"conditions and their implications only"*. Extending that to forbid
restating figures at all — refer to what §2 or §3 established, without repeating the number —
leaves every figure living exactly once, beside the source it came from, with nothing left to
misattribute. **This has not been run and is a proposal, not a result.**

### One more thing run 3 did, unprompted and correctly

It used a **public forum thread** — Galway discussions from May and August 2026 — and handled
it exactly as it should: labelled qualitative, *"self-selected, unverified and unsuitable for
quantifying demand, pricing or waiting times"*, used only to indicate what patients care
about. Mike's source list named feedback forums; this is what good use of one looks like.

---

## Run 4 — 2026-09-06 · the fix that worked

**Same Galway brief again, run 3's per-figure rule kept, one change added:** §4 of the
output may no longer restate a figure given in §§1–3 — refer in words to what those sections
established, and introduce a genuinely new figure with its own source like any other.

**Removing the surface rather than policing it.** Three attempts had told the model to cite
restatements properly. This one stops the restatement.

| Measure | Run 3 | Run 4 |
|---|---|---|
| Wall-clock | 82.5 s | 102.0 s |
| Web searches | 9 | 12 |
| Unique sources | 20 | **30** |
| Words | 2,070 | 2,276 |
| Cost | ≈ US$0.31 | ≈ US$0.40 |

### 🔴 It worked. Section 4 came back with ZERO figures and ZERO citations

Nothing restated, therefore nothing to misattribute. **The fault has no surface left.** And
the section did not become vague — it reads as an economist's summary rather than a table:

> *"The planned third site would open during a period of positive domestic demand but
> persistent cost pressure… The finance requirement has two separate economic exposures: a
> one-off fit-out and equipment purchase, and an ongoing lease commitment… Actual supplier
> quotations, lease terms and lender pricing are not known."*

It still refuses the lending question, and still separates public evidence from the business.

### Sections 1–3 did not degrade — they improved

**30 unique sources**, the most of any run, with a citation per figure throughout. Where a
paragraph draws on two releases, both are cited separately — the insurance paragraph cites two
HIA bulletins, the public-capacity paragraph two gov.ie releases, the workforce paragraph CORU
and a Department release.

**It also handled a genuine source disagreement exactly as §3 asks.** Two HIA bulletins gave
different average adult premiums (€1,902 and €1,960); it reported both and explained the
difference as *"a later reporting point and premium measure"* rather than silently choosing.

**And its forum handling produced the one commercially useful judgement in the document**:
after reading two Galway threads and labelling them *"self-selected anecdotes"* that cannot
establish quality or market share, it concluded they *"do indicate that patients can identify
several alternative providers and that local competition should not be assumed to be
limited."* That is a real finding for a lender, drawn honestly from a weak source.

### What run 4 settles, and the one caveat

**Settled:** the no-restatement rule in §6 is **load-bearing and must not be relaxed** to let
§4 quote numbers again. Every figure now lives exactly once, beside the source it came from.

⚠ **It rests on a single run.** Runs 1–3 established the fault across three; one clean result
is strong evidence the fix works, not proof. **Re-check it when the feature is built.**

### Length, across all four runs

| | Target | Actual (all sections) |
|---|---|---|
| Run 1 | 800–1,200 | 1,602 |
| Run 2 | 1,200–1,600 | 2,301 |
| Run 3 | 1,200–1,600 | 2,070 |
| Run 4 | 1,200–1,600 | 2,276 |

**The number in the prompt does not control the length.** Four runs, four overshoots, and
raising the target raised the output. A screen must accommodate roughly 1,500–2,500 words and
must not assume otherwise.

---

## Run 1 in full — the model's own words

> Reproduced verbatim, headings demoted so they sit inside this page. **Bold figures, inline
> links and section numbering are the model's.** Read section 5 first: it is the part a
> credit assessor would weigh the rest against.

#### 1. Global economic outlook

**Scope.** This assessment covers the next 12 months from **5 September 2026**. The business imports fittings and cabinetry hardware from Italy and Germany by sea, so its operating environment is influenced by European supply conditions, ocean freight, exchange rates and New Zealand construction demand. The business-specific operating facts in this paragraph are from the **undated advisor brief**.

International container shipping remains a source of cost and timing risk. UN Trade and Development reported that container freight rates were volatile and elevated through 2024 and 2025, following Red Sea disruption, longer routes around the Cape of Good Hope and changing trade policy. Its Shanghai Containerized Freight Index averaged **2,496 points in 2024**, **149% above 2023**. The same report expected seaborne trade-volume growth of only **0.5% in 2025**, following **2.2% in 2024**. These are global measures rather than Europe–New Zealand lane rates, but they indicate that ocean freight and schedule reliability remain exposed to geopolitical disruption. ([unctad.org](https://unctad.org/publication/review-maritime-transport-2025))

European supplier-market conditions are mixed. Eurostat reported that euro-area construction production was **0.7% lower in June 2026 than in June 2025**, after a **1.3% monthly fall** in June 2026. Lower construction activity in supplier markets may reduce demand pressure on some European manufacturers, but it does not remove the risk of freight interruption, energy-price movements or supplier-specific capacity constraints. ([ec.europa.eu](https://ec.europa.eu/eurostat/web/products-euro-indicators/w/4-20082026-ap))

Currency exposure is material because purchases from Italy and Germany are ordinarily euro-denominated. The Reserve Bank of New Zealand recorded the New Zealand dollar at **€0.50935 per NZ$1 on 1 September 2026**. This is a point-in-time rate, not a forecast. Any fall in the New Zealand dollar against the euro between ordering and supplier payment would increase New Zealand-dollar purchase costs; a rise would have the opposite effect. ([rbnz.govt.nz](https://www.rbnz.govt.nz/en/statistics/series/exchange-and-interest-rates/exchange-rates-and-the-trade-weighted-index))

The Reserve Bank's assessment on **2 September 2026** was that global activity had remained resilient despite conflict and trade disruption, but that energy prices and supply-chain effects had increased inflation risks. This creates a mixed import environment: international demand is not uniformly weak, while transport, fuel and exchange-rate conditions can change during the business's stated **10–14-week** order-to-landing period. ([rbnz.govt.nz](https://www.rbnz.govt.nz/news-and-events/news/2026/09/ocr-increased-by-25-basis-points-to-2-75))

#### 2. Local and regional outlook

New Zealand's inflation and interest-rate settings have become less benign for discretionary household spending and for financing costs. The Consumers Price Index increased **4.1% in the year to the June 2026 quarter**, including a **1.5% increase in that quarter**. Tradeables inflation was **4.9% annually** and non-tradeables inflation was **3.4% annually** in the June 2026 quarter. Petrol prices were **27.5% higher** and electricity prices **12.0% higher** than a year earlier. ([stats.govt.nz](https://www.stats.govt.nz/information-releases/consumers-price-index-june-2026-quarter/))

On **2 September 2026**, the Reserve Bank increased the Official Cash Rate to **2.75%**, from **2.50% on 8 July 2026**. It said inflation was expected to remain above **3%** for the rest of calendar **2026**, with the return to the **1–3%** target range expected during **2027**. The Reserve Bank also said flat house prices, weak income growth and job insecurity were still weighing on household spending and residential investment. ([rbnz.govt.nz](https://www.rbnz.govt.nz/monetary-policy/monetary-policy-decisions))

The national labour market has spare capacity. In the **June 2026 quarter**, the unemployment rate was **5.6%**, up **0.2 percentage points** from the preceding quarter; the underutilisation rate was **13.8%**. Average ordinary-time hourly earnings were **$44.62**, **2.8%** higher than a year earlier, while the Labour Cost Index recorded annual wage inflation of **2.0%**. These are national measures and do not establish the business's own wage costs. ([stats.govt.nz](https://www.stats.govt.nz/information-releases/labour-market-statistics-june-2026-quarter/))

Nelson's household-income base is below the national median on the latest local data available. The **2023 Census** recorded median personal income for Nelson City adults at **$38,800**, compared with **$41,500** nationally. Nelson City's estimated resident population was **54,300 at 30 June 2025**. This provides context for the local discretionary-renovation market, but it does not measure the incomes or expenditure capacity of the business's customers. ([tools.summaries.stats.govt.nz](https://tools.summaries.stats.govt.nz/places/TA/nelson-city))

Housing affordability remains a structural constraint. Stats NZ's *Housing in Aotearoa New Zealand: 2025* reported that, for the combined **Tasman/Nelson/Marlborough/West Coast** grouping in **2024**, the median house price was **$642,000** and median equivalised disposable income after housing costs was **$36,036**. On the report's assumption that households save **20%** of income, a **10%** deposit represented about **9 years** of saving. This is older, regional-grouped data and should be treated as context rather than a current measure of kitchen-renovation demand. ([stats.govt.nz](https://www.stats.govt.nz/assets/Reports/Housing-in-Aotearoa-New-Zealand-2025/Housing-in-aotearoa-new-zealand-2025.pdf))

Local dwelling-consent data showed a recovery before the current period. Nelson City and Tasman District together recorded **541 new dwellings consented in the year ended 30 June 2025**, a **10%** annual increase. Nationally, the seasonally adjusted number of residential dwellings consented was **11,165 in the June 2026 quarter**, up **10.5%** on the March 2026 quarter. Consents are an indicator of future construction work, not completed projects or immediate hardware purchases. ([tasman.govt.nz](https://www.tasman.govt.nz/document/serve/NPS%20UD%20Monitoring%20Report%20YE%20June%202025.pdf?DocID=36917))

#### 3. Sector outlook

The relevant sector is residential construction and renovation, alongside kitchen manufacturing and building firms. Official MBIE research forecasts a recovery in national residential activity from **2026**, after total construction activity was estimated to fall from **$58.1 billion in 2024** to **$55.7 billion in 2025**. It forecasts new dwelling consents rising from **33,500 in 2025** to **40,000 in 2030**. This is a sector forecast, not an observed result, and it is national rather than Nelson-specific. ([mbie.govt.nz](https://www.mbie.govt.nz/building-and-energy/building/supporting-a-skilled-and-productive-workforce/national-construction-pipeline-report))

The New Zealand Kitchen and Bathroom Association's member survey gives a more direct, though non-statistical, view of the kitchen market. Its **2024 survey**, published **24 June 2026**, found that **58%** of respondents identified renovations as their largest line of work. It also found that **35%** said they could be busier, while **25%** described themselves as busy but keeping up with demand. Respondents identified material supply, skilled trades, affordability and clients sourcing finance among the sector's major issues. This supports the view that renovations are an important demand source, but the survey is not a measure of national sales volumes or of Upper South Island conditions. ([nkba.org.nz](https://nkba.org.nz/trends-infographic-2024/))

The sector therefore has two offsetting influences. Rising dwelling consents support prospective new-build demand, while weak household spending, slow residential investment and affordability constraints may defer renovation decisions or favour lower-cost specifications. Imported premium fittings are additionally exposed to freight, foreign-exchange and supplier lead-time movements.

#### 4. What this means for the business under review

The advisor brief states that stock is ordered from Europe **10–14 weeks** before landing, suppliers are paid on order, and customers are allowed **60-day** terms. That combination makes the business exposed to a timing gap between supplier payment, physical delivery, sale and customer collection. It also means that changes in freight cost, freight timing and the New Zealand dollar against the euro can affect the period for which cash is committed to inventory. These are operating implications of the brief and external conditions; no conclusion is drawn about the business's own funding requirement.

Demand conditions over the assessment period appear uneven rather than uniformly weak or strong. National consenting has strengthened and the Nelson–Tasman area had already shown an annual increase in dwelling consents to June 2025. This can support activity among kitchen manufacturers and builders. However, the Reserve Bank's September 2026 assessment still identified weak household spending, job insecurity and flat house prices as constraints on residential investment. Demand could therefore differ materially between committed new-build work, renovation work and discretionary upgrades.

Cost conditions remain important. Fuel-driven inflation was elevated in the June 2026 quarter, while global container freight has remained volatile. The business may therefore face changes in landed cost and arrival timing after an order is placed. The published euro exchange rate of **€0.50935 per NZ$1 on 1 September 2026** confirms that euro exposure exists at the time of review, but public data cannot establish whether the business hedges currency, passes through cost changes, or has fixed supplier pricing.

⚠ *This is the paragraph carrying the misfiled citation described above: in the original it credited the Stats NZ inflation release for the Reserve Bank's exchange rate. The link has been removed here rather than silently corrected, so the fault is not lost.*

National labour-market data indicate less labour-market tightness than in earlier years, with unemployment at **5.6%** in June 2026 and annual wage inflation at **2.0%**. This may moderate general labour-cost pressure, but it does not establish labour availability, pay rates or retention conditions for the business's 14 staff in Nelson. ([stats.govt.nz](https://www.stats.govt.nz/information-releases/labour-market-statistics-june-2026-quarter/))

#### 5. What could not be sourced

* **Current Nelson/Tasman unemployment, underutilisation and wage rates.** National figures were available for the June 2026 quarter, but no sufficiently current, comparable official series was found for Nelson and Tasman. These would have been used to assess local labour availability and wage pressure.
* **Current Nelson commercial warehouse, showroom and industrial rental costs.** No consistent public official series was found. This would have been used to assess local occupancy-cost pressure.
* **A current official median private-market rent for Nelson City and the Upper South Island.** National rental-price measures were available, but a current, comparable regional figure was not retrieved. This would have supplemented the household-disposable-income assessment.
* **Europe-to-New Zealand container rates, sailing frequency and on-time performance for the precise routes used by the business.** UNCTAD supplied global freight evidence only. Lane-specific data would have been used to assess the likely variability around the brief's stated 10–14-week lead time.
* **The value and volume of kitchen-fittings and cabinetry-hardware imports from Italy and Germany specifically.** Public trade data exist at broad commodity classifications, but a reliable classification matching the business's product range was not established. This would have been used to quantify import-market scale and supplier-country dependence.
* **New Zealand kitchen-hardware market sales, market growth and average trade credit terms.** The industry association survey provides sentiment and project-type information but not a representative sales series or verified debtor-day data. These would have been used to benchmark sector demand and the stated 60-day customer terms.
* **Public forum feedback was reviewed only as anecdotal context and was not used as evidence.** It did not provide a representative, dated or auditable numerical series suitable for a lender-facing assessment.
