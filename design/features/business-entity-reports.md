# Business Entity Reports — the Brief

> **Status: ☐ DESIGN FOR APPROVAL. Nothing here is built.** Written 2026-09-03 on Mike's
> instruction, in his words:
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

## 3. Decisions for Mike — each with a recommendation

Put one at a time. Nothing below is ruled.

| # | Decision | Recommendation, and why |
|---|---|---|
| D1 | **Default state of a model for a new client** | **Hidden.** Fail closed: a client sees nothing they have not been walked through. The forecast example in the request is exactly this case. |
| D2 | **What a client sees of a hidden model** | **A greyed card that cannot open**, with *"Your advisor will open this with you."* It sells the service without letting anyone start. The alternative — not listed at all — hides what the firm offers. |
| D3 | **Where the advisor flips the switch** | **On the report screen's header**, for the client the report is for. That is where the advisor is when terms are agreed. The client record lists the result read-only. |
| D4 | **How a client edit is made clear** | **Three ways at once:** a `client` provenance badge on each figure they changed, a banner on the report naming who and when, and the advisor's last version kept beside it with *Restore*. |
| D5 | **Can the client close the switch themselves?** | **No.** Only the advisor opens or hides; the client edits inside what is open. Nobody edits a level above their own (P14). |
| D6 | **Scope of "edit"** | **Inputs only.** A client changes figures and sliders; they cannot change which model, the client it is for, or the advisor's notes. |

## 4. What the stub is — part 1, buildable now

1. **Role wiring, fail-closed**, exactly as the middle tiers: `businessEntityRole: ''` and a
   `businessEntityIdClaim` in `config/integration.js`; empty until the master team supplies
   the value. A dev token `dev-local-entity` so the screen can be seen on a developer machine.
2. **A page, `/my-reports`**, the client's view of the Model Library: every catalogued model
   as a card, open or greyed per D2, driven by the per-client switch table.
3. **The switch table** — a new per-firm config key read through the existing `firmOverlay`
   helpers (version history and restore for free), keyed `client id → model name → state`.
4. **The advisor's control** on the report header, and the read-only list on the client record.

**What the stub does NOT do:** save a report. Until §5 exists, an open model shows the client
the calculator with sample figures, same as an advisor sees it today. The card says so.

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
