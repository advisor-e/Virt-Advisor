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
> **Runs 1–4 were made by a throwaway script outside the repository**, calling
> `/v1/responses` directly. That script is gone, which is why those four can never name the
> model that produced them — the single thing this page most needed to record and did not.
>
> ✅ **Run 5 (2026-09-06) is the first through the built path**, on committed code, and it
> records everything the four before it could not.
>
> ✅ **Runs 6–12 (2026-09-07) are the first driven through the SCREEN**, in a real browser —
> tick, brief, wait, research, approval, Ctrl+P. See §"Runs 6–12" at the foot of this page.
> They are why the citation guard no longer refuses half of everything it is shown.

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

⚠ **It rested on a single run.** Runs 1–3 established the fault across three; one clean result
was strong evidence the fix works, not proof. ✅ **Re-checked on run 5** — a different model, a
different country and a different sector, and section 4 again came back with no figures at all.

### Length, across all five runs

| | Target | Actual (all sections) |
|---|---|---|
| Run 1 | 800–1,200 | 1,602 |
| Run 2 | 1,200–1,600 | 2,301 |
| Run 3 | 1,200–1,600 | 2,070 |
| Run 4 | 1,200–1,600 | 2,276 |
| Run 5 | 1,200–1,600 | 2,013 |

**The number in the prompt does not control the length.** Five runs, five overshoots, across
**two different models**, and raising the target raised the output. A screen must accommodate
roughly 1,500–2,500 words and must not assume otherwise.

---

## Run 5 — 2026-09-06 · the first run through the built path

> 🔴 **This run exists because runs 1–4 could not name their model.** It was made through
> `server/routes/economicAnalysis.js` on committed code, not a throwaway script.

**Brief given:** *a family-owned commercial bakery in Hamilton, New Zealand, employing 22
staff, supplying supermarkets and independent cafés across the Waikato region; imports wheat
flour and packaging materials; seeking NZ$900,000 over five years to install a second
production line and buy a delivery vehicle; assess the economic outlook over the next three
years.* **Fictional**, like the four before it.

| Measure | Result |
|---|---|
| **Model** | **`gpt-6-astra`** — the first run whose model is on record |
| Wall-clock | 141.3 s |
| Web searches | 10 |
| Citations | 29, across **22 unique sources** |
| Length | 2,013 words |
| Tokens | 99,024 in (includes retrieved page content), 5,422 out |
| Cost | **not recorded.** The published rate could not be retrieved; the token and search counts above are what a bill should be checked against, rather than an estimate nobody verified |

**Settings, and both are load-bearing:** `tools: [{ type: 'web_search' }]` with
**`tool_choice: 'required'`**.

### 🔴 The first attempt proved the search is optional unless you demand it

`gpt-4o` — the value the build had guessed — was tried first. It came back **in 10 seconds
having made no search at all** (1,760 input tokens, against the 99,024 above) and wrote a
confident, correctly numbered, entirely unsourced outlook. **The validator refused it:**
`SECTION_UNSOURCED {"sections":[1,2,3]}`.

Two things follow, neither visible before a live call:

- **§3's instruction to search is not a control.** OpenAI's guide states the model chooses
  whether to search unless `tool_choice: 'required'` is set. This is the citation fix's lesson
  again: an instruction the model may decline is not a guardrail. **Do not remove it.**
- **The guard holds on fresh output.** This is the re-check run 4 asked for. Plausible,
  professional, sourceless text was stopped before it could reach a lender.

### What run 5 settles

- **The no-restatement rule survives a change of model.** Section 4 came back with no figures
  at all, on a different model, country and sector from run 4.
- **All five numbered headings were found**, which is what makes the numbering sentence in the
  prompt's §6 load-bearing rather than cosmetic.
- **Sources are official and unprompted:** IMF (two), FAO, Stats NZ (five), the Reserve Bank of
  New Zealand, the Commerce Commission (two), MBIE (two), Hamilton City Council (two), REINZ,
  Waikato Regional Council, Tenancy Services, Foodstuffs, and a maritime trade title.
- **It handled a source disagreement exactly as §3 asks**, on freight: *"A secondary account
  described an increase for the week ending 3 September 2026, while Drewry's own dated summary
  described stability. The discrepancy was not reconciled, so no weekly freight trend was
  adopted."*

### The streamed event shapes — captured, not assumed

The build read the search phrase off `response.output_item.added`, where it does not exist.
Both sightings of the same `web_search_call` were captured:

| Event | `status` | `action` |
|---|---|---|
| `response.output_item.added` | `in_progress` | **absent entirely** |
| `response.output_item.done` | `completed` | `{ type: 'search', query: 'site.rbnz.govt.nz official cash rate August 2026 OCR' }` |

**All ten phrases arrived empty** until `readEvent` was changed to read `.done`. The API also
emits `response.web_search_call.in_progress` / `.searching` / `.completed`; none carries a
query, so nothing reads them.

⚠ **The tests had encoded the same assumption.** A fixture invented an `.added` event carrying
a query — a shape the API never sends — and an assertion insisted a `.done` event be ignored.
All 67 tests passed throughout, which is why they proved nothing here. They now use the shapes
in the table above.

---

## Runs 6–12 — 2026-09-07 · driven through the SCREEN, in a real browser

**Brief given (fictional):** *a family-owned commercial bakery in Christchurch, New Zealand,
supplying supermarkets and cafes across Canterbury; seeking bank finance for a second
production oven and a delivery van; research the New Zealand food manufacturing and wholesale
baking outlook, ingredient and energy costs, interest rates and business lending conditions,
and Canterbury consumer food spending, over 12 to 24 months.*

**The point of these runs was not the prompt. It was the screen** — the tick, the brief, the
wait, the research, the approval tick and Ctrl+P, in a real Chromium against the real backend
and the real API. Nobody had ever done that.

### 🔴 What they found: the guard refused half of everything, and was wrong every time

| | Live runs | Refused | Code |
|---|---|---|---|
| Runs 6–9, before the fix | 4 | **2** | `SECTION_4_RESTATED` |
| Runs 10–12, after it | 3 | **0** | — |

The refusals named `3000820`, `10808` and `2026`. **None is an economic figure.** The first two
are document ids inside the web addresses of cited sources; the third is a year. `figuresIn`
was reading the digits out of a citation's URL, so a §4 that returned to a source used in
§§1–3 — which §3 of the prompt asks it to do — looked like a restatement, and 1,900 words of
correctly sourced research were thrown away.

It was reproduced exactly before anything was changed: a five-section document whose §4
contains **no figure at all**, citing one source twice, refused as
`SECTION_4_RESTATED {"figures":["10808"]}`.

**Why no test caught it:** every fixture was prose, and not one contained a citation URL.

### What the accepted runs returned

| Run | Sources | Inline citations | Words | Latency |
|---|---|---|---|---|
| 10 | 17 | 28 | 1,969 | 174s |
| 11 | 15 | 26 | 1,787 | 179s |
| 12 | 16 | 21 | 1,927 | 153s |

Zero console errors and zero page errors across all three. The approval tick recorded and
rendered without throwing, and the pack printed as its own section after the statements in a
real PDF — the first time either has been seen outside a test.

### Two things seen and left open

- **The date sent to the model is UTC**, so an advisor at UTC+12 sends yesterday. It reaches
  the client's pack verbatim: *"The assessment starts on 6 September 2026"*, written on the 7th.
- **One run in eight came back truncated** (`SECTIONS_MISSING`, §§4–5 absent). It was the run
  whose browser was killed mid-flight, so nothing is concluded from it until it recurs.

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

---

## Run 4 in full — the baseline for re-checking the fix

> 🔴 **THIS IS HERE FOR ONE REASON.** The citation fix rests on this single run, and
> [`ECONOMIC-ANALYSIS-PROMPT.md`](ECONOMIC-ANALYSIS-PROMPT.md) §5 says it must be re-checked
> when the feature is built. **That check needs something to check against**, and re-running
> the prompt would not reproduce it — the web has moved on, and a fresh run returns different
> text. Kept verbatim, headings demoted, tracking parameters stripped from the links.
>
> **Read section 4 first.** It carries no figures and no citations, and that absence *is* the
> fix. Sections 1 to 3 carry a source per figure, including two paragraphs that cite two
> different releases separately — the behaviour runs 1 to 3 could not produce.

#### 1. Global economic outlook

**Assessment period:** 6 September 2026 to 5 September 2027. This assessment uses information published by 6 September 2026. Where forecasts are cited, they are external forecasts rather than forecasts of the business.

International conditions are relevant principally through the cost and availability of imported treatment equipment, energy, insurance, finance and household spending. The immediate backdrop is less stable than it was at the start of 2026. The International Monetary Fund's April 2026 baseline projected global output growth of **3.1% in 2026** and **3.2% in 2027**, with downside risks predominating because of conflict-related commodity-price, financial-condition and trade effects. The IMF stated that its April forecast was based on information available to **1 April 2026**, so it predates some subsequent energy-market developments. ([imf.org](https://www.imf.org/en/publications/weo/issues/2026/04/14/world-economic-outlook-april-2026))

World trade remains positive but is slowing. The World Trade Organization forecast merchandise-trade volume growth of **1.9% in 2026**, down from **4.6% in 2025**, and commercial-services trade growth of **4.8% in 2026**, down from **5.3% in 2025**. Its high-energy-price scenario reduced projected merchandise-trade growth to **1.4% in 2026**. These forecasts were published in **March 2026**. ([wto.org](https://www.wto.org/english/res_e/booksp_e/gtos0326_e.pdf)) The WTO subsequently reported that merchandise-trade volume had risen **3.2% year on year in the first quarter of 2026**, but cautioned that disruption to shipping through the Strait of Hormuz was expected to become more visible in trade data after that quarter. ([wto.org](https://www.wto.org/english/news_e/news26_e/rese_31jul26_469_e.htm))

Energy remains the principal global cost risk. The International Energy Agency reported on **12 August 2026** that North Sea Dated crude ended July 2026 at **US$96.80 per barrel** and was trading around **US$92 per barrel** when the report was prepared. It forecast global oil supply to decline by **4.3 million barrels per day in 2026**, following disruption to Middle Eastern and Russian supply. ([iea.org](https://www.iea.org/reports/oil-market-report-august-2026)) This matters to an Irish service business through electricity, heating, patient travel, staff commuting, delivery charges and the manufacturing and transport cost embedded in equipment.

Freight prices have also been elevated and volatile. Drewry's World Container Index was **US$4,465 per forty-foot container on 3 September 2026**, unchanged from the preceding week. The index is a global composite rather than an Ireland-specific import cost, and it does not establish the freight charge that any particular equipment supplier would quote. ([reddit.com](https://www.reddit.com/r/zim/comments/1w682lq/drewry_world_container_index_excerpt_wci_holds/)) It nevertheless supports the conclusion that imported capital equipment may face a less predictable landed-cost environment than in a low-freight-rate period.

For the euro area, activity is expanding slowly. Eurostat's first estimate recorded quarter-on-quarter GDP growth of **0.4% in the euro area in the second quarter of 2026** and annual growth of **1.0%**. ([ec.europa.eu](https://ec.europa.eu/eurostat/statistics-explained/SEPDF/cache/102206.pdf)) Euro-area annual HICP inflation was estimated at **3.3% in August 2026**, rising from **2.9% in July 2026**; energy inflation was estimated at **14.3%** in August. ([ec.europa.eu](https://ec.europa.eu/eurostat/en/web/products-euro-indicators/w/2-01092026-ap)) Euro-area unemployment was **6.4% in July 2026**, unchanged from June and above **6.3% in July 2025**. ([ec.europa.eu](https://ec.europa.eu/eurostat/web/products-euro-indicators/w/3-01092026-bp))

The ECB interest-rate structure remains materially above the near-zero-rate period. From **17 June 2026**, the ECB deposit-facility rate was **2.25%**, the main refinancing rate was **2.40%**, and the marginal-lending rate was **2.65%**. ([centralbank.ie](https://www.centralbank.ie/statistics/interest-rates-exchange-rates/ecb-interest-rates)) For a clinic seeking equipment and fit-out finance, this means that finance costs are influenced by a still-restrictive, though lower than peak-cycle, euro-area policy environment. The main external risks over the assessment period are sustained energy disruption, higher equipment and freight costs, and weaker household confidence if living costs increase further.

#### 2. Local and regional outlook

Ireland's domestic economy remains more resilient than the global traded-sector outlook, although inflation and housing costs are relevant constraints on household budgets and recruitment. The ESRI's Summer 2026 Quarterly Economic Commentary forecast growth in modified domestic demand of **2.6% in 2026** and **2.8% in 2027**. It forecast Irish CPI inflation of **3.7% in 2026** and **3.1% in 2027**. Those are forecasts published on **25 June 2026**, not observed outcomes. ([esri.ie](https://www.esri.ie/publications/quarterly-economic-commentary-summer-2026))

The latest observed Irish consumer-price data available at the assessment date were the CSO's flash HICP estimates for **August 2026**. All-items HICP was estimated to be **3.4% higher than August 2025**, with a **0.6%** monthly increase. Energy prices were estimated to be **11.8% higher year on year**, while services prices were **3.7% higher year on year**. These estimates were explicitly subject to revision, with final August data scheduled for publication on **10 September 2026**. ([cso.ie](https://www.cso.ie/en/csolatestnews/pressreleases/2026pressreleases/pressstatementflashestimatefortheharmonisedindexofconsumerpricesaugust2026/)) The latest final CPI release, for **July 2026**, showed Irish CPI inflation of **3.4%**, including a **7.7%** annual increase in the housing, water, electricity, gas and other fuels category. ([cso.ie](https://www.cso.ie/en/releasesandpublications/ep/p-cpi/consumerpriceindexjuly2026/))

Labour-market conditions are relatively tight, though there are signs of moderation. The CSO Labour Force Survey recorded an unemployment rate of **5.1% in the second quarter of 2026**, compared with **4.8% in the second quarter of 2025**. The number unemployed was **151,000**, up **10,100** over the year. ([cso.ie](https://www.cso.ie/en/releasesandpublications/ep/p-lfs/labourforcesurveyquarter22026/unemployment/)) Eurostat's harmonised monthly measure was higher, at **5.3% for Ireland in July 2026**. ([ec.europa.eu](https://ec.europa.eu/eurostat/web/products-euro-indicators/w/3-01092026-bp)) These are not contradictory in themselves: they have different reference periods and seasonal-adjustment approaches. For the clinic, both measures indicate that hiring suitably qualified clinical and administrative staff is unlikely to be costless or immediate.

Average weekly earnings across all Irish sectors were **€1,046.88 in the second quarter of 2026**, up **3.9%** from **€1,007.58** in the second quarter of 2025, according to CSO preliminary estimates. ([cso.ie](https://www.cso.ie/en/releasesandpublications/ep/p-elcq/earningsandlabourcostsq12026finalq22026preliminaryestimates/)) The CSO recorded **338,300 employees** in human health and social-work activities in the second quarter of 2026. ([cso.ie](https://www.cso.ie/en/releasesandpublications/ep/p-elcq/earningsandlabourcostsq12026finalq22026preliminaryestimates/)) That category is broader than physiotherapy and includes public and private health and social-care activity; it should not be treated as a measure of available physiotherapists. It does, however, confirm that the proposed clinic competes for labour in a large healthcare employment market.

Borrowing costs are a direct consideration for the proposed finance. The Central Bank of Ireland reported that the weighted average interest rate on new lending to Irish non-financial corporations was **5.22% in June 2026**, up **33 basis points** from June 2025 and above the euro-area equivalent of **3.72%**. ([centralbank.ie](https://www.centralbank.ie/statistics/data-and-analysis/credit-and-banking-statistics/retail-interest-rates)) This is an aggregate rate across loan sizes, terms, collateral and borrowers. It is not evidence of the rate available to this clinic, but it provides an observable benchmark for the domestic financing environment.

Housing affordability matters both to private-pay demand and to recruitment. The CSO residential property price index rose **5.6% nationally** in the year to **June 2026**; prices outside Dublin rose **6.4%**. ([cso.ie](https://www.cso.ie/en/releasesandpublications/ep/p-rppi/residentialpropertypriceindexjune2026/)) The Residential Tenancies Board/ESRI Rent Index reported that, in **Q1 2026**, the standardised average rent for new tenancies in County Galway was **€1,718 per month**, while the corresponding rent for existing tenancies was **€1,303 per month**. ([rtb.ie](https://rtb.ie/wp-content/uploads/2026/09/RTB-Rent-Index-Q1-2026.pdf)) The RTB describes these as mix-adjusted market indicators, not asking rents for a particular property or a measure of commercial premises rent. ([rtb.ie](https://rtb.ie/data-insights/rtb-research-reports/rtb-esri-rent-index/))

Household income in Galway was close to, but below, the national average on the latest county measure. CSO estimates put Galway's disposable income per person at **1.1% below the State average in 2024**. The CSO cautions that county disposable-income estimates involve uncertainty. ([cso.ie](https://www.cso.ie/en/releasesandpublications/ep/p-cirgdp/countyincomesandgdp2024/disposableincomebycounty/)) That position should be read alongside rising housing and energy costs, which may constrain discretionary private-pay healthcare spending for some households.

The local population base is expanding. The CSO estimated the West region—Galway, Mayo and Roscommon—at **531,100 people in April 2026**, an annual increase of **11,500 people**, or **2.2%**. ([cso.ie](https://www.cso.ie/en/releasesandpublications/ep/p-pme/populationandmigrationestimatesapril2026/keyfindings/)) Nationally, the population aged 65 and over was **891,100 in April 2026**, up **30,000** in the year and representing **16.1%** of the population. ([cso.ie](https://www.cso.ie/en/releasesandpublications/ep/p-pme/populationandmigrationestimatesapril2026/keyfindings/)) The national figure does not demonstrate the age structure of Galway specifically, but it supports a broader increase in demand for rehabilitation, mobility and musculoskeletal services.

#### 3. Sector outlook

The clinic operates in a healthcare market with three identified payment routes: private-pay, private health insurance and public referrals. Each is exposed to different conditions.

Private health insurance provides a substantial, but not universal, source of access to private care. The Health Insurance Authority reported **2.55 million people** insured at **31 December 2025**, an annual increase of **1.2%**. The average adult premium was **€1,902 at 1 March 2026**, following a **9%** increase during 2025. ([hia.ie](https://www.hia.ie/sites/default/files/2026-03/q4_market_bulletin.pdf)) The HIA's Q1 2026 bulletin reported the same insured population of **2.55 million**, after a quarterly increase of **2,936 people**, and an average adult premium of **€1,960**. ([hia.ie](https://www.hia.ie/news-and-research/market-reports-and-bulletins)) The difference reflects a later reporting point and premium measure. Rising premiums may preserve insurer-funded demand while also increasing household sensitivity to the out-of-pocket cost of policies and any physiotherapy excesses, limits or approved-provider rules.

Public-system capacity remains relevant to referral flows and to the wider demand for timely rehabilitation. Government approved HSE capital plans for 2026 totalling **€1.327 billion** for building and equipment and **€263 million** for digital care. The plans include completion of a surgical hub in Galway and progression of an elective treatment centre in Galway. ([gov.ie](https://www.gov.ie/en/department-of-health/press-releases/minister-for-health-approves-publication-of-hses-capital-plans/)) The Department of Health's health-sector plan allocates **€9.25 billion** to health infrastructure for **2026-2030**, including **€1.56 billion in 2026**. ([gov.ie](https://www.gov.ie/en/department-of-health/press-releases/minister-for-health-publishes-ndp-sectoral-plan-for-health-2026-2030/)) These plans show policy and capital commitment, but they do not confirm referral volumes, contractual terms or payment rates for an independent physiotherapy clinic.

There is evidence of capacity pressure in primary-care therapies. The HSE reported in a parliamentary response that the longest recorded wait for a physiotherapy assessment in Galway was **256 weeks at August 2025**. ([hse.ie](https://www.hse.ie/eng/about/personalpq/pq/2025-pq-responses/september-2025/pq-48155-25-liam-quaide.pdf)) This is a dated maximum waiting-time measure, not a current average wait, patient count, referral pipeline or measure of the clinic's addressable demand. It should therefore be treated as evidence of historical pressure rather than a current volume forecast.

The availability of qualified practitioners is a sector constraint. CORU recorded **6,390 registered physiotherapists at 31 December 2024**. ([coru.ie](https://coru.ie/public-protection/publications/annual-reports/coru-annual-report-and-financial-statements-2024.pdf)) That is the latest directly sourced national registration figure located. It does not identify how many registrants work in Galway, in private practice, full-time, or are available to be recruited. Continuing public investment in healthcare training is intended to address workforce shortages: Government announced a **€75 million** healthcare education capital programme on **24 February 2026** to expand capacity in health disciplines. ([gov.ie](https://www.gov.ie/en/department-of-further-and-higher-education-research-innovation-and-science/press-releases/minister-lawless-unveils-75m-capital-programme-under-project-ireland-2040-for-healthcare-education-and-training-capacity-expansion/)) Its effect is likely to be longer-term rather than a near-term addition to local physiotherapy supply.

Public feedback was reviewed as a qualitative rather than quantitative source. A Galway discussion forum in **July 2026** contained recommendations for multiple named physiotherapy providers across the city and county. ([reddit.com](https://www.reddit.com/r/galway/comments/1uxxuhx/good_physio_in_city/)) A separate Ireland-focused discussion in **May 2026** included comments about demand for private physiotherapy in Galway where public routes were perceived to offer group or delayed services. ([reddit.com](https://www.reddit.com/r/PregnancyIreland/comments/1tpzf29/physio_referrals/)) These posts are self-selected anecdotes. They cannot establish clinical quality, waiting times, market share, patient numbers or demand, but they do indicate that patients can identify several alternative providers and that local competition should not be assumed to be limited.

#### 4. What this means for the business under review

> ⚠ **No figures. No citations. This is the fix.** Every number above lives exactly once,
> beside the source it came from, and this section refers to them in words instead of
> repeating them.

The planned third site would open during a period of positive domestic demand but persistent cost pressure. Inflation in Ireland is being influenced materially by energy, while service-price inflation remains elevated. This is relevant to utilities, cleaning, insurance, supplies, travel and household purchasing capacity.

The finance requirement has two separate economic exposures: a one-off fit-out and equipment purchase, and an ongoing lease commitment. International energy and freight disruption may affect supplier lead times and landed equipment costs. Domestic commercial borrowing conditions remain relatively expensive by euro-area comparison. Actual supplier quotations, lease terms and lender pricing are not known.

The clinic's mixed payor base provides exposure to private-pay, insurer-funded and public-referral channels rather than reliance on one route. Insurance coverage remains widespread and public therapy capacity has shown pressure, but premiums are rising and public investment may gradually increase capacity. Neither factor establishes the clinic's likely patient volumes, reimbursement levels or referral flow.

Galway's housing costs and a relatively tight labour market create recruitment and retention considerations for a third location. The available data support caution around staff availability and employment costs, particularly for regulated clinical roles. They do not show the staffing requirement for the new site, the clinic's current capacity, or whether it can recruit from existing applicants.

The regional population base is growing and national ageing is increasing rehabilitation need. At the same time, local consumer income is slightly below the State average and household housing and energy costs are increasing. The balance between those factors will affect private-pay affordability over the assessment period.

#### 5. What could not be sourced

The following figures were sought but could not be reliably sourced from public material available by 6 September 2026:

- **Commercial medical/clinic rent in Galway**, including current asking rents, achieved rents, rent-free periods, service charges and vacancy for suitable healthcare premises. These would have been used to assess local lease-market conditions for the proposed third site. Residential-rent data are available but are not a substitute for commercial lease evidence.
- **A current County Galway physiotherapy waiting-list count, average wait and referral volumes.** The identified official Galway figure was a historical longest wait at August 2025. Current counts and average waiting times would have been used to assess public-referral capacity pressure.
- **Private-insurer physiotherapy reimbursement rates, annual treatment limits, excesses and approved-provider requirements** for the clinic's likely patient mix. These would have been used to assess the economic conditions of insurer-funded treatment, not the clinic's revenue.
- **The number of physiotherapists practising in County Galway**, their employment status, vacancies, pay rates and local turnover. National registration and broad healthcare employment data are available, but they do not measure the recruitable local physiotherapy workforce.
- **Prices, lead times, warranty terms, country of origin and freight costs for the proposed treatment equipment.** No equipment list or supplier quotations were provided, so no defensible imported-equipment cost assessment can be made.
- **The business's own current site capacity, appointment utilisation, referral sources, patient mix by payment route, fee schedule, staffing model, lease commitments or financial performance.** These are not public economic indicators and were not provided. They are therefore outside this assessment.
