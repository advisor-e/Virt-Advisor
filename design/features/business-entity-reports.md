# Business Entity Reports — the Brief

> **Status: ☑ PART 1 (THE STUB) IS BUILT — 2026-09-03. ☑ PART 2 (saved reports, item 4.62) IS
> BUILT AND WIRED ON ALL TWELVE ROUTED SCREENS — §5, the Three-Way Forecast last, 2026-09-05.**
> Designed and approved the same day on Mike's instruction, in his words:
>
> > *"we have a performance report feature — these reports/models are editable and viewable at
> > the business entity level (or at least they should be). Your job is in 2 parts. 1, make sure
> > a 'stub' exists for this feature to be seen at business entity level and then, we need to
> > build the ability for the advisor to 'hide' models within that section so that clients don't
> > commence work on items they don't understand. For example, we are in middle of building a
> > 3 way forecast — we can't have clients (business entities) start doing their own 3 way
> > forecast. HOWEVER, once advisor has been involved and secured terms, we DO want them to be
> > involved and can edit thereafter — so long as any changes are made clear they are edited by
> > the client."*
>
> The screens: [`../mockups/business-entity-reports.html`](../mockups/business-entity-reports.html),
> registered in [`../ARTEFACTS.md`](../ARTEFACTS.md).
> **History:** [`business-entity-reports-history.md`](business-entity-reports-history.md) — the
> alternatives rejected behind each ruling, and how the day went.

---

## 1. Two facts the design stands on

**There is no business-entity login today.** `business_entity` is one of the six tier names
(`server/collaborate/data/roles.js`) and appears nowhere else: no role value from the master
app, no route, no storage scope. It is in exactly the position the two middle manager tiers
were in — the app names it, the token cannot yet carry it.

**No report is saved anywhere.** Every model under the Model Library is a stateless calculator:
figures are typed or loaded, computed, and gone when the page closes. Nothing links a report
to a client. For a client to "edit thereafter", and for anyone to see that a client edited it,
a report's figures must first be **kept, per client, per model**. That is the prerequisite for
both halves of the request, and it is new.

**One earlier sentence is overtaken by this request.** `tier-cascade.md` §2 says the business
entity "is a recipient" that "authors nothing" and gets no storage. Mike's instruction above
gives it storage of one kind — its own edits to a report an advisor has opened to it. That
sentence is corrected in the same change that builds this.

## 2. What is proposed — the shape

```
Firm
 └─ Advisor
     └─ Client (business entity)  ← sees only the models the advisor has opened to it
          └─ a saved report per model, with every edit stamped: advisor or client
```

**Per client, per model, one switch, held by the advisor: `hidden` (the default) or `open`.**

- **Hidden** — the client cannot open the model. The card is on their screen, greyed, with one
  line: *"Your advisor will open this with you."* Nothing can be started from it.
- **Open** — the client opens the model, sees the figures the advisor left, and may change
  them. Every figure the client changes carries a **`client` provenance badge**, the report
  shows a banner *"Edited by [client name] on [date]"*, and the advisor's own last version is
  kept, so a wrong client edit is one click to restore.

**The advisor opens a model to a client from the report screen itself**, where they are
already working in front of that client: a control in the report header, *Client access:
hidden / open*, active only once a client is chosen for the report. The client's record
shows the list of what is open to them, read-only.

## 3. Decisions — put to Mike one at a time

| # | Decision | Recommendation, and why |
|---|---|---|
| D1 | **Default state of a model for a new client** | ☑ **RULED BY MIKE 2026-09-03: hidden** — *"yes - hidden by default"*. Fail closed: a client sees nothing they have not been walked through. |
| D2 | **What a client sees of a hidden model** | ☑ **RULED BY MIKE 2026-09-03: a greyed card that cannot open**, with *"Your advisor will open this with you."* It sells the service without letting anyone start. |
| D3 | **Where the advisor flips the switch** | ☑ **RULED BY MIKE 2026-09-03: on the report screen's header**, for the client the report is for. That is where the advisor is when terms are agreed. The client record lists the result read-only. |
| D4 | **How a client edit is made clear** | ☑ **RULED BY MIKE 2026-09-03: three ways at once** — a `client` provenance badge on each figure they changed, a banner on the report naming who and when, and the advisor's last version kept beside it with *Restore*. |
| D5 | **Can the client close the switch themselves?** | ☑ **RULED BY MIKE 2026-09-03: no — "advisor only".** Only the advisor opens or hides; the client edits inside what is open. Nobody edits a level above their own (P14). |
| D6 | **Scope of "edit"** | ☑ **RULED BY MIKE 2026-09-03: inputs only.** A client changes figures and sliders; they cannot change which model, the client it is for, or the advisor's notes. |

All six ruled on 2026-09-03, each as recommended, one at a time.

## 4. What the stub is — part 1, BUILT 2026-09-03

1. **Role wiring, fail-closed**, exactly as the middle tiers: `businessEntityRole: ''` and
   `businessEntityIdClaim` in `config/integration.js`, empty until the master team supplies
   the value. `server/middleware/firmAuth.js` now refuses a client token by name on every
   advisor route (`BUSINESS_ENTITY_NOT_ALLOWED`) except three firm-level reads a client's
   report page also needs — the currency, the property tax rules and the imported-stock
   sell-down prices — which sit behind `firmOrEntityAuth`, admitting either an advisor or a
   client of the firm, the client still scoped to its own firm by its token, and never a
   write (item 4.68, 2026-09-07). A new `entityAuth` admits only a client
   whose token names its firm and its register id. Dev token `dev-local-entity` (client
   `dev-client-001` of `dev-firm-001`), honoured on the same terms as every dev token.
2. **A page, `/my-reports`** (`components/ClientReportLibrary.vue`): every routed catalogue
   model as a card; open ones link to the report, the rest are greyed and carry no link at
   all (D2). A 403 is a message, never an empty list. A foot note says figures are
   illustrative until part 2.
3. **The switch table** — `server/utils/clientReportAccess.js`, one firm-scoped config key
   (`client-report-access`) through `firmOverlay`, so version history and restore are free.
   Hidden is the ABSENCE of a row (D1): hiding deletes, and a fresh client is closed by
   construction. Routes in `server/routes/clientReports.js`: the advisor reads and flips
   (`firmAuth`; a client of another firm is 404, as if absent), the client reads its own row
   (`entityAuth`; firm and client id from the token, nothing from the request).
4. **The advisor's control** — `components/base/ClientAccessSwitch.vue`, rendered by
   `ReportHeader` on every report: choose the client, then *Hidden / Open* (D3, D5). It
   renders nothing without an advisor sign-in or off a catalogue route, so no report page
   changed — including the Three-Way Forecast, which is the laptop's under 4.61.

**Three named deviations from the artefact.** *(a)* **The read-only list on the client record
is not built, because no client record screen exists** — the register is a picker at session
start, not a page. It comes with the first client screen, or with part 2. *(b)* The model is
keyed by its **route** (`/volatility`), not its name: the catalogue is an ES module the Node
14 backend cannot read, and the route is the identity both sides share. *(c)* The header
control offers a client **picker**, which the drawing assumed was already chosen — no report
knows its client today.

**What the stub does NOT do:** save a report. Until §5 exists, an open model shows the client
the calculator with sample figures, same as an advisor sees it today. The page says so.

**What proves it:** `tests/unit/clientReportAccess.test.js` (the table — hidden by absence,
refusals, no cross-client writes), `clientReports.routes.test.js` (identity from the token,
404 across firms, 403 for a non-client read), `entityAuth.test.js` (the client sign-in fails
closed; a client token never passes `firmAuth`), `clientReportsProxyWiring.test.js`,
`clientReportLibrary.component.test.js` (no link on a hidden card) and
`clientAccessSwitch.component.test.js` (advisor only; the flip sends `{ route, state }`).

## 5. Saved reports — part 2, BUILT 2026-09-03/04; every routed screen wired, the forecast to follow

A **saved report** is one `firmOverlay` key per client per model —
`client-report:<clientId>:<route>` — holding
`{ inputs, savedBy: { tier, name }, savedAt, advisorVersion }`, so version history and restore
ride the store every firm setting uses (`server/utils/savedReports.js`). `advisorVersion` is
the advisor's **last** save, carried forward untouched through every client save. That is what
makes D4 possible without stamping a figure at a time: a figure the client changed is one whose
value **differs from the advisor's version** (`changedKeys`), the banner reads `savedBy`, and
Restore writes the advisor's version back as a fresh advisor save.

**Who may write.** An advisor of the firm, for a client the route checks belongs to it. A
client, **only for a model the advisor has opened to it** — checked in the store against the
switch table, not only on the screen, so a client whose access was hidden again cannot keep
saving. A client's figures are hostile: `validateInputs` admits a flat object of finite
numbers, booleans, short strings or number arrays under a size cap, with `null` as a blank
(an optional figure not yet typed, or an empty month in a series), and refuses anything else
rather than trimming it.

**Routes**, all in `server/routes/clientReports.js`: the advisor reads, saves and restores for
a client (`GET`/`PUT /api/client-reports/saved/:clientId`, `POST …/restore`, `firmAuth`); the
client reads and saves its own (`GET`/`PUT /api/client-reports/mine/saved`, `entityAuth`,
identity from the token). `NOT_OPEN` is a 403; `NO_ADVISOR_VERSION` a 409.

**The seam a screen adopts** is `mixins/savedReport.js`: the screen supplies `reportInputs()`
and `applyReportInputs(inputs)`, passes `savedReport` to `ReportHeader` and listens for its
`save`, `restore` and `client-change` events. The header renders the Save control (*Save for
client* / *Save my changes* — labels ruled by Mike 2026-09-03), the "saved by" line, and the
client-edited banner with *Restore my version* (D4), so no report page changes beyond those
four attributes. `ProvenanceBadge` gained the `client` state; `SliderField` a badge slot.

**All twelve are wired:** Debtor Business Drag, Margin, Mark-up & Break-even, Working Capital
Cycle, Eight Levers, Cost of Capital, Lease vs Buy, Multiple Property (its three blocks and up
to five property records flattened under dotted names with a `propertyCount`), the Loan
Estimator, Quick Position, EBITDA/DCF, Volatility, and — last, on 2026-09-05 — the Three-Way
Forecast. Screens without SliderField show the badge in the label through
`components/base/ClientChangedBadge.vue`.

**A stepped screen saves from its page.** The Loan Estimator is four steps whose figures
meet only on `pages/loan-estimator.vue`, so the page adopts the mixin and
`utils/loanEstimatorSavedShape.js` holds the two rules. A save carries the steps the
advisor has **confirmed with Continue** plus the calculator, each figure under a dotted
name in the model's own shape (`security.boat.value`, `serviceability.loans.newPropertyLoans.balance`,
`repayment.ratePct`); a step still being typed is not in it. Loading rebuilds each step
**whole or not at all** — one missing or malformed figure leaves that step unconfirmed and
the page lands on it, so nothing is ever filled in from the sample — and a complete row
opens on the report. The business step is optional (a personal-only enquiry) but a broken
one is re-entered, never dropped. In the two grids, whose cells have no labels, the badge
sits on the row name when any figure in the row changed.

**A file-fed screen saves each figure's provenance beside it** (Quick Position;
`utils/quickPositionSavedShape.js`). The row holds every input, `source.<figure>` for
each balance-sheet figure and the fixed-costs figure, the service-business switch, and
the Profit and Loss expense lines as two lists (`expenseNames`, `expenseAmounts`) — the
store admits a list of short names for this. **A file-sourced figure the client changed
shows `client` in place of `from file`, never beside it** (ruled by Mike 2026-09-04): the
number is no longer the file's. The saved source is untouched, so Restore brings the
advisor's version back with its file tags. Where the client can change only a factor
against a file figure (the asset rows), the value keeps its file tag and the factor is
badged on its own. **A client never sees the upload steps**: the upload needs the
advisor's sign-in, so the client's page is the report alone, and a saved row opens on it.
Nothing a file alone knows (the company name, the income total) is in a saved row.

**EBITDA/DCF saves its figures as one block** (`utils/ebitdaDcfSavedShape.js`): the years,
and for each of the twenty-four rows two lists of the same length, `fig.<row>` and
`src.<row>`. Loading takes that block **whole or not at all** — one bad cell refuses it and
the page keeps what it held — because a partial set would put saved years beside sample
ones with nothing on screen to say so. The dials (`dcf.*`, `listed.*`) are taken one at a
time, each in its own shape, with the listed history always one cell per year. No file
figure is editable after the intake on this screen, so the file-badge rule has no site
here; a client change is badged on the dial, or on the dial row.

**Volatility saves its 24-month buffer month by month with its source** (`month.<i>`,
`source.<i>` — sample, file or entered — plus `window`, `startMonth`, `startYear`), because
the screen's one structural invariant, *a workbook figure is on screen only with the sample
notice*, is only true if the sources travel with the figures. Loading takes the 24 months
as **one block or not at all**, takes a window only where the loaded sources allow it, and
clears the accounts files on screen so nothing credits a file that did not supply the
figures. A client changing a file month makes it `entered`, as the advisor's own edit does,
and the month is badged on its label. The accounts upload is hidden from a client.

**Wording proposed and not yet ruled** (`locales/en.json`, `clientReports.saved.*`): the
"saved by" lines, the banner sentence, the badge word `client`, and the four failure messages.

**The Three-Way Forecast carries the WHOLE intake, on Mike's ruling of 2026-09-05:** *"anything
an advisor can edit, the client can edit."* So the saved row is the confirmed opening balance
sheet, the six asset categories, the funding lines, the shareholder accounts, the 23 overheads,
every rate and monthly series, the overseas panel and the capital rows — plus the report's four
levers and its Summary / Every setting (`utils/threeWayForecastSavedShape.js`). **The one thing
it does not carry is step 1, the file upload**, and that is mechanical rather than a policy
against the ruling: dropping an export is not editing a figure, and the intake route refuses a
client token by name (§4). Every figure that upload produces is on steps 2 and 3, where the
client edits it like any other, so **a client opens on step 2** — the first step that is theirs,
with the forecast one chip away.

Two consequences worth stating, both in that file's own notes. **The row is lists, not one name
per figure**, because the store admits 200 named values and one name per figure would be over
300; each block travels with its own names beside it (`opening.keys`) so a saved row can never
be read positionally onto a form that has changed. **The badges are still per figure** — the
screen compares the row against the advisor's version that travels with it (`changedFigures`),
so one changed opening line badges that line and not the table. **The four levers are omitted
when the report has not reported them**: two of them are derived from the confirmed intake, so a
zero saved before step 4 was ever opened would reload as a 0% mark-up — a forecast that
recomputes cleanly and is wrong.

**What proves it:** `tests/unit/savedReports.test.js` (the store — refused when not open, the
advisor version untouched by a client save, the badge list as a comparison, hostile inputs),
`clientReports.routes.test.js` (identity from the token, 404 across firms, NOT_OPEN as 403, a
safe 500), `savedReport.mixin.test.js` (mode from the sign-in, load on mount for a client and
on client-pick for an advisor, the right route with the token, restore advisor-only),
`reportHeader.component.test.js` (Save only with someone to save as; the banner and Restore
only on a client edit, never for the client's own sign-in), `loanEstimatorSavedShape.test.js`
(a full row round-trips figure for figure and sits under the cap; one malformed figure
drops its step and lands the page on it; nothing is filled from the sample),
`quickPositionSavedShape.test.js` (a row carries every source and the expense lines and
the store admits it; a bad figure keeps what the screen held; a restored state drives the
request; a client-changed file figure shows `client` in place of `from file`),
`ebitdaDcfSavedShape.test.js` (the row list is pinned to the intake's rows; the figures
block round-trips whole and one bad cell refuses it; a dial is its own shape; restored
dials drive the request), `volatilitySavedReport.test.js` (the buffer round-trips with its
sources; one bad month refuses the series; the invariant holds on load; a loaded row clears
the files; the badge sits on the changed month alone), and
`threeWayForecastSavedShape.test.js` (the whole intake round-trips figure for figure against
the REAL component's own form, never a fixture; the row passes the store's own
`validateInputs`; a broken block is refused whole while the rest still lands; a word outside
its set is refused; the badge names `opening.<line>` rather than the table, and a row the
client added is named as a row).

## 6. What is deliberately not in this design

- No client notifications, email, or messaging. The advisor sees a client edit when they next
  open the report; the banner and the history are the record.
- No client-side calculation changes. A model computes the same whoever typed the figure.
- No client access to any manager screen, the Model Guide's editing, or another client's report.
  Every route is scoped to the caller's verified client id; there is no route that reads across.
- No AI narrative changes. The AI is not told who typed a figure.

## 7. Rules of this page

This is a design for approval. When it is built, this page becomes the Brief — how the feature
works *now* — and the decisions in §3 move to `business-entity-reports-history.md` with the
date they were ruled. A sentence overtaken by a ruling is replaced, never left above a new one.
