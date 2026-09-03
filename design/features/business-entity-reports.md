# Business Entity Reports — the Brief

> **Status: ☑ PART 1 (THE STUB) IS BUILT — 2026-09-03. Part 2 (saved reports) is item 4.62
> on the live list.** Designed and approved the same day on Mike's instruction, in his words:
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
   advisor route (`BUSINESS_ENTITY_NOT_ALLOWED`), and a new `entityAuth` admits only a client
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

## 5. Saved reports — part 2, the prerequisite for "edit thereafter"

A **saved report** is `{ firm, client, model, inputs, savedBy: { tier, name }, savedAt }`, one
current row per client per model plus its history, through `firmOverlay` so nothing new is
invented for storage. The advisor saves from the report header; the client's edits save the
same way with `tier: 'business_entity'`. The report screen loads the current row when a client
is chosen and stamps provenance per figure: `file`, `entered`, `seeded` today, plus `client`.

**Off limits while it is built:** the Three-Way Forecast intake files, active on the laptop
under item 4.61 (`server/routes/report.js`, `threeWayForecastAssembler.js`,
`ThreeWayForecastIntake.vue`, `xeroReportParser.js`). This feature's routes live in their own
file, `server/routes/clientReports.js`, and the header control is a shared component, so the
forecast picks it up without its own files changing.

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
