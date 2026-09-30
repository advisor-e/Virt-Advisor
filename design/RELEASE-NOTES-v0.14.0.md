# Release notes — v0.14.0

**Cut 2026-09-30 from `master` at the merge commit of [PR #145](https://github.com/advisor-e/Virt-Advisor/pull/145).**
585 commits since `v0.13.0`, from both development machines — the laptop's work reached
`master` through [PR #146](https://github.com/advisor-e/Virt-Advisor/pull/146) the same day.

> **Pull the tag `v0.14.0`, not `master`.** Report any UAT bug against the tag number, so a
> report can be matched to exact code. **Reply with the tag you installed**, so both sides hold
> the same record ([`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md)).

> 🔴 **This release replaces every tag since `v0.7.0`.** `v0.8.0` to `v0.13.0` were each cut and
> none was pulled. Our records show UAT on `709bac5` (2026-07-14) and your own copy of `2beba9f`
> (`v0.7.0`, 2026-08-04). **The install steps below are cumulative from there** — the database
> section says exactly what is new since each.

---

## 🔴 1. Before you install

### 1a. `npm install` IS needed this time

Node **14.15**, npm **8.19.4**. `engines`, `overrides` and `.npmrc` are unchanged
(`engine-strict=true` still refuses anything that will not run on 14.15).

| Package | Where | Why | Runs where |
|---|---|---|---|
| `pdfjs-dist` **2.16.105** (exact) | `dependencies` | Add Concept (item 15.20): turns the PDFs a manager uploads into page drawings | **Backend only**, inside a separate child process (`server/utils/pdfConvertWorker.js`). No page or component loads it. Adds `dommatrix` 1.0.3 and `web-streams-polyfill` 3.3.3. |
| `sass` **1.32.13** (exact) | `devDependencies` | Rebuilds Buefy in the brand blue (`npm run brand-css`) | **Neither the running app nor `nuxt build`** — the compiled `assets/css/buefy-brand.css` is committed. |

🔴 **Security — for your sign-off (see §6).** `pdfjs-dist` carries **CVE-2024-4367 /
GHSA-wgrm-67xf-hhpq (high)**: a crafted PDF can run its own code. Every version that runs on
Node 14.15 has it; the fix (4.2.67) needs Node 18. It is contained on three conditions, recorded
in [`SECURITY-AUDIT-NOTES.md`](SECURITY-AUDIT-NOTES.md):

1. `isEvalSupported: false` on every load.
2. Each conversion runs in its **own child process with an empty environment** — no database
   password, no OpenAI key — a 256 MB memory ceiling, a 20-second kill and a 32 MB output cap.
3. Upload hygiene: manager-only route, 20 MB cap, `application/pdf` only, `%PDF-` magic bytes.
   Every drawing it returns is sanitised with `isomorphic-dompurify`.

It is high, not critical, so the critical-audit gate passes.

### 1b. Database — additive only, nothing altered or dropped

Every statement is `CREATE TABLE IF NOT EXISTS`. No existing table or column changes.

**Run in this order:**

1. **`config/db-schema.sql`** — the new blocks since your copy. Since `v0.13.0` it gains four tables:

   | Table | Holds |
   |---|---|
   | `strategy_sessions` | One planning session with one client (Strategy Planner) |
   | `strategy_session_entries` | One captured answer per box, with its audit trail (original text, source) |
   | `strategy_session_timeline` | Which box was open, and when — to match recorded speech to boxes |
   | `strategy_concept_sources` | The original PDFs behind a manager's imported concept (`LONGBLOB`). **Never sent to a model.** |

   *Cumulative:* since `2beba9f` the file also gained the `__platform__` row in `firms` and
   `advisor_model_choices` (from `v0.13.0`); since `709bac5`, the Collaborate tables,
   `va_courses`, `advisor_cpd_claims` and `audit_log` as well.

   The three `strategy_session*` tables must be created in that order (foreign keys).
   `strategy_concept_sources` is also in `config/db-migration-strategy-concept-sources.sql` for an
   existing database — **run one or the other, not both** (both are harmless if repeated).

2. **`config/db-migration-sales-tracker.sql` — required on every install, fresh or existing.**
   Its five tables (`va_sales_pipeline`, `va_sales_coi`, `va_sales_blog_input`,
   `va_sales_blog_post`, `va_sales_blog_reference`) are **not** in `db-schema.sql`. It needs the
   `firms` table and the `__platform__` row first.

3. 🔴 **Set MySQL `max_allowed_packet` to at least `32M`.** Each imported-concept PDF is one
   insert of up to 20 MB. The MySQL 5.7 default (4M) refuses it; 8.x's default (64M) is enough.
   *If you skip it:* a manager's "Save concept" fails loudly with a database error and nothing is
   half-saved — but nobody can add a concept.

4. **The reserved `firms` rows for each management tier** (`__global__:<brand>`,
   `__group__:<brand>:<country>`) before any global or group manager saves — see
   [`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md) Part 3. Not new, but it now
   covers imported concepts too. *Without the row, a tier's save is refused by the foreign key.*

Everything else new rides the existing `firm_framework_versions` store — no schema change.

### 1c. Environment variables — all new ones are optional

| Name | What it does | When unset |
|---|---|---|
| `FIRM_BRAND_LOGO_COLUMN` | The column on `firms` holding the firm's logo URL (question 8, §6) | Documents show the firm's name with an initials disc. A value that is not a plain column name is **refused with an error**, by design — it is never put into SQL. |
| `FIRM_BRAND_COLOUR_COLUMN` | The column holding the brand colour (`#rrggbb`) | As above |
| `AI_PRIMARY_MODEL_TRANSLATE` / `AI_FALLBACK_MODEL_TRANSLATE` | The model for the new UI-translation role | Primary `gpt-4o-mini`; no fallback, as for the other roles |

The seven new `*_DEV_FILE` names are for development and tests only; production never sets them.

`nuxt.config.js`: the stylesheet is now `assets/css/buefy-brand.css`, and four new proxy lines
forward `/api/ui-translation`, `/api/sales`, `/api/strategy` and `/api/owner-focus-tasks` to the
backend. **101 new backend routes** (366 → 466), every one behind sign-in except
`POST /api/report/owner-expectations`, which is figures-in, figures-out like the other report
calculators. `POST /api/translate/locale` now **requires** sign-in (it was open — §4).

## 🔴 2. First check after installing

```
npm run backend      # must print: [restify] virt-advisor-api listening on …
```

**If it exits instead, stop — no screen is worth opening.** Verified here on the exact code this
tag carries (§7).

---

## 3. What is new

### The Strategy Planner — a new advisor screen at `/strategy-planner`

The largest piece of this release. An advisor runs a client planning session inside the app, on
a five-stage rail: **Scope session, Build session, Run session, Objectives & actions, Produce plan.**

- Choose the topics from 48 concepts, each saying what it helps the client to do; name the steps,
  minutes per concept, breaks and a run sheet.
- Teach each concept from redrawn slides; type or dictate the client's answers into boxes that
  save as you go and survive leaving and coming back.
- **Suggest for this client** — the AI pre-ticks the scope. For a client with no saved
  conversation it first asks the Virtual Advisor's own intake questions.
- Bring in the **Business Performance Report**; print a **white-labelled plan** on A4 with the
  firm's mark.
- The mentor hands a **standard session** down the four tiers (new hub tab **Session Process**),
  and managers edit **Growth Aspect Questions** (98 questions).

🔴 **Nothing in the app links to `/strategy-planner`** — this app has no menu of its own. See §6.

### Add Concept — managers import their own concepts from PDF (item 15.20)

A manager drops a concept's teaching PDFs and its response form onto a new **Strategy Concepts**
hub tab (all four tiers). The app turns each page into a clean drawing, the manager marks the
answer boxes, and the concept appears in the planner and prints in the client's plan. The PDFs
are stored in `strategy_concept_sources` and **never sent to a model**.

### Wordsmith — client statements from what was said (item 15.14)

On the Alignment Statements card, the AI drafts the client's five statements from the recorded
Alignment Statements section of a **consented** Strategy Session. "Use this wording" needs the
client's tick and writes an audit record beside the transcript. Style, sources and room
questions cascade from a new **Wordsmith** hub tab. *Privacy:* this is the second named use of
consented speech with the model, ruled by Mike on 2026-09-28 — the Alignment Statements segment
only, under Meeting Review's conditions.

### Recording a strategy session concept by concept (item 8.4, first build)

A Strategy Session is a Meeting Review meeting type recorded **one section per concept**, with a
timed agenda, a summary per concept approved by advisor and client, and an automatic pause after
3 minutes of silence (measured in the browser, nothing sent). An unfinished recording's audio is
held **7 working days** and then destroyed. ⚠ **Not UAT-proven** — see §5.

### Sales Tracker — an advisor's own business development (item 17)

Eight screens: a landing page at **`/sales-tracker`**, **My pipeline**, **My referral partners**,
**My sales dashboard** and the **Sales Blog** (AI outline, then final post) for advisors; **Team**
and **Lists** hub tabs for the firm manager. Deals are **private to the advisor by default**; a
firm manager sees every deal in the firm. No manager reads another advisor's blog drafts.

### The Three-Way Forecast — checked against the standards, printed as a board paper

- **Reviewed against NZ IFRS and FRS-42.** 43 treatments recorded; term loans' current portion,
  shareholder accounts shown gross, and a cash business's opening debtors and creditors fixed.
  The profit and loss is laid out per IFRS 18 (operating surplus, then financing costs) and the
  cash flow per IAS 7 (operating, investing, financing).
- **Notes to the forecast** — a new tab and printed pages in every forecast: basis of
  preparation, its own assumptions, general assumptions, how the figures are worked out, where
  it differs from full NZ IFRS, and a **compilation report in the firm's name**.
- **Printed as a board paper:** a cover, contents and a one-page "forecast at a glance" (four
  figures, two charts), statements restyled with **negatives in brackets** on screen and in
  print, and the market research opening on a headline and up to six sourced key figures.
- **Foreign currency:** orders convert at the rate entered, amounts are taken in their own
  currency, and a "what if the rate moves" view is shown, not charged.

### Also new

- **Business Owner Expectations** — a two-step model at `/owner-expectations`, with a shared task
  list cascading from a new **Owner Focus Tasks** hub tab.
- **Currency per client** on the report header across 11 client reports, and a firm currency on
  a new **Currency** hub tab (firm tier).
- **The app really translates:** its own English is translated once per language by the new
  `translate` AI role and stored for every reader (German: 6,231 of 6,232 strings). It replaces a
  free public service that covered about a quarter of one language a day.
- **Dictation stays on the computer:** all nine microphone screens use Chrome's on-device
  recogniser; speech no longer goes to Google.
- **One Tax & Forecast Rates page** replaces four hub tabs; country rate schedules cascade from
  the mentor. New hub tabs: **Model Choices**, **Staff Register Retention** (18 months maximum,
  enforced).
- **Brand blue everywhere** — Buefy rebuilt with `#0070C0`; no violet remains.

### How the app now treats OpenAI — relevant to your data-protection review

- **Every request is moderated first** (`omni-moderation-latest`), checking only what a person
  typed, said or uploaded. Three categories block, and the screen names the sentence. 🔴 **If the
  moderation check cannot be reached, the AI request is refused.** A new AI call that does not
  declare what it moderates is refused.
- **`store: false`** on every Responses call — OpenAI no longer keeps replies.
- **Zero Data Retention:** the amendment was signed on 2026-09-23 and OpenAI confirmed it for the
  organisation on 2026-09-25. It is **not yet recorded as in force for the app's Project** — see §5.
- Twelve binding rules now govern every AI feature
  ([`OPENAI-ZDR-CONSTRAINTS.md`](OPENAI-ZDR-CONSTRAINTS.md)). Imported-concept PDFs are never sent
  to a model.

---

## 4. Faults fixed that a test suite could not see

Most were found by **running the app**:

- 🔴 `POST /api/translate/locale` was **open to the internet** — an unauthenticated proxy to a
  metered service. It now requires sign-in; a test fails the build if any route is left unguarded.
- The planner saved **once per keystroke**, unawaited, so a slow line could store a half-typed
  answer; save times showed **12 hours out**.
- The plan's **Print button printed a blank sheet**.
- Wordsmith could write one client's approved wording into **another client's plan** (found in a
  code read).
- A saved two- or three-year forecast **reopened as one year**, losing its growth percentages.
- The forecast's itemised profit and loss fell **91,650 short** of cost of sales with overseas
  trade on; a cash business's opening debtors and creditors were **never settled**.
- The first moderation build refused **every AI answer** — found live before it left the machine.
- Meeting Review transcription of browser recordings was refused by OpenAI.
- An advisor could close the prompt fence around their own words by typing `>>>`.
- AI replies showed `��` where a letter was split across two network chunks.
- The Sales pipeline screen could not load in a browser while 122 tests passed (a missing proxy line).

---

## 5. 🔴 Known before testing

- 🔴 **Meeting Review — including the new strategy-session recording and Wordsmith — must not be
  used on a real client** until Zero Data Retention shows as on for the app's Project in the
  OpenAI console. Mike confirms that (item 8.1).
- **Strategy-session recording (8.4) is not UAT-proven.** Its first build was walked with a
  test-tone microphone; its final screen is still to come. **An ordinary Meeting Review recording
  longer than about 27 minutes is too big for OpenAI's transcription, and its audio is still
  deleted** — near-certain, not yet proven.
- **Changing client in the Strategy Planner keeps the previous client's ticks and suggestion**
  (15.32, proved); whether an open session stays attached to the old client is not proved.
- **7 of the 48 planner concepts teach and capture nothing yet** (15.22).
- After a recorded strategy session, the next meeting's coaching notes have **no actions to follow
  up** (8.6).
- The forecast **assumes every debt is collected**, carries no deferred tax, expenses rent (no
  leases) and books overseas revenue at invoice — its Notes page says so (44.3).
- Translation can pick the wrong sense of business words ("stock" as shares); report figures keep
  English decimals in other languages ("1.0×").
- **The Adviser Network shows nine invented people**, and in production reads and writes nothing
  until question 7 is answered (item 11.1).
- **The middle-tier role values are still Advisor-e's to supply.** Global-group and group hubs fail
  closed by design; the mentor borrows `platform_admin` for now.
- **Not yet proved against a real database on our side:** saving an imported concept, the Owner
  Expectations save, Wordsmith's save, and the Sales Tracker against the Advisor-e database (it
  was proved on our local MySQL 8.4).

---

## 6. 🔴 What we need from you

**Eleven integration questions, none answered yet.** Each says what it unblocks and what the app
does meanwhile, so an unanswered question is a visible state, not a silence. The working detail
behind them is [`MASTER-TEAM-INTEGRATION-EMAIL.md`](MASTER-TEAM-INTEGRATION-EMAIL.md). Every
answer is one value in `config/integration.js`.

| # | The question | What it unblocks | Until it is answered |
|---|---|---|---|
| 1 | **The JWT claim names.** Confirm `firmId` (firm or branch id), `advisorId`, `role`, `email`, and optionally `name`. | Every signed-in screen | The app expects those names. Without `name`, the adviser id is shown. |
| 2 | **How the token is signed** — HS256 with a shared secret, or RS256 (send the public key)? | The whole backend | The signing secret is a placeholder. |
| 3 | **The two management role values** — global group manager and group manager. | The two middle-tier hubs | Both empty, and they **fail closed**: no token reaches those tiers. Mentor and firm work. |
| 4 | **Two extra claims** — the brand for a global group manager; brand and country for a group manager. We assume `globalGroup` (e.g. `BDO`) and `country` (e.g. `DE`). | A manager resolving their own scope | Those names are assumed, unconfirmed. |
| 5 | **Which group a firm belongs to** — a column on `firms`, a read-only endpoint, or a cached lookup. | Roll-ups above a firm | Content falls straight from mentor to firm. The app does not guess. |
| 6 | **Push the search-content export on publish:** `POST {module base URL}/api/integration/templates`, JSON array body, header `x-advisor-e-push-secret`, ≤10 MB; `201` means live within a minute. Agree the secret. | Removes Mike's manual download-and-upload | The endpoint answers **404** until `ADVISOR_E_PUSH_SECRET` is set. Mike uploads by hand. |
| 7 | **Where an adviser's identity lives** — name, title, firm, email, phone, location, for one id and for a list: table and columns, a read-only endpoint, or a view. | The Adviser Network shows real advisers (43 finished SQL seam points) | **Nine invented advisers**; in production nothing is read or written. |
| 8 | **Where a firm's logo and brand colour live** — two columns on `firms` (or a view). Logo as an absolute http(s) URL; colour as `#rrggbb`. Either alone helps. | The white-label mark on client documents (Strategy plan, Business Performance Report, concept drawings) | Firm name with an initials disc. |
| 9 | **The role value for a client's own login**, and the `businessEntityId` claim — which **must equal the id in our client register**. | A business reading its own reports | Fails closed. ⚠ A mismatched id fails **silently**: the client signs in and sees nothing. |
| 10 | **The database** — host, port, name, user, password; and do you run our schema yourselves, or should we hand you the SQL? | Every save in the app | Placeholders remain. |
| 11 | **How sign-ins to Advisor-e are protected** — for advisers, managers and clients: MFA, SSO, or user id and password with logins recorded (please confirm logging). An answer only. | Relying on OpenAI Zero Data Retention (amendment clause 4.2) | Recorded as outstanding. |

**Also for you, outside those eleven:**

- **Add two links wherever an advisor's tools are listed:** `/sales-tracker` (the Sales Tracker's
  front door) and `/strategy-planner` (the Strategy Planner). This app has no navigation of its
  own, so without them testers must type the address.
- **Sign off the `pdfjs-dist` runtime advisory** (§1a) — item 15.21 waits on you.
- **Run the database steps in §1b**, including `max_allowed_packet` ≥ 32M and the reserved
  `firms` rows per tier.
- **Point `AUTH.mentorRole`** in `config/integration.js` at your real mentor role; it borrows
  `platform_admin` in the meantime.

---

## 7. Verified before the tag

On the code this tag carries — the tree of `feat/firm-quiz-builder-ui` after `master` (with the
laptop's PR #146) was merged in, which is the tree PR #145 lands on `master`:

| Gate | Result |
|---|---|
| **Backend starts and mounts every route** | ✅ `[restify] virt-advisor-api listening on 127.0.0.1:4000`; health `200`; the forecast and Strategy Planner pages `200` |
| `npm test` | ✅ **14,762 passing / 682 suites** |
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ `Ready to run nuxt start` |
| Critical-audit gate | ✅ PASS |
