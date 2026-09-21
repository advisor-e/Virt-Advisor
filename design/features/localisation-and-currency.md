# Language & Currency — the Brief

> **Read this before adding user-facing text, formatting money, or touching translation.**
> Current rules only. The history is in
> [`localisation-and-currency-history.md`](localisation-and-currency-history.md).
>
> **Covers:** how the app speaks the reader's language and formats the firm's money. **Applies
> to every screen**, so it is worth reading once even if you are working elsewhere.

---

## 1. Design philosophy

**The reader's language and the firm's money are two separate settings, and conflating them is
the classic mistake.**

An advisor in Auckland reading in Spanish still reports in New Zealand dollars. A firm's currency
is an **account-wide** decision made once by a manager; the language is a **personal** one. Money
formatting therefore takes the firm's currency and the reader's language — a number formatted in
the wrong one of those is not a cosmetic error, it is a wrong figure in front of a client.

**Nothing user-facing is written in a component.** Every string lives in the wording files, so
the people who own the words can change them without a developer, and so a second language is a
data problem rather than a code problem.

**And translation is a third-party call, which means it is a backend job.** Text leaving this
system for an outside service is sanitised, capped, and validated on the way back — because
adviser-written text is untrusted input and a third party's reply is untrusted output.

---

## 2. Key principles — the non-negotiables

**P1 · All user-facing text goes through the wording layer.** No hardcoded English in a template
or in logic. This is a stack requirement, not a preference.

**P2 · Version 8 of the wording library only.** The reader-facing calls are the version-8 ones.
Do not reach for a version-9 API — this is a Vue 2 application and they do not exist here.

**P3 · The third-party translation call lives on the backend.** The Nuxt middleware is a thin
proxy. A third-party integration in a frontend file is an architecture breach.

**P4 · Use the built-in HTTPS module, not the global fetch.** The global does not exist before
Node 18 and would throw on the locked runtime.

**P5 · Sanitise and cap untrusted text before it leaves for a third party, and validate the shape
of the reply before using it.**

**P5a · 🔴 THE TRANSLATION ROUTE IS SIGNED-IN-ONLY, because it spends a metered quota that twenty
languages depend on.** `POST /api/translate/locale` carries `firmAuth` — not a manager role, since
every caller is an ordinary reader choosing a language, and the route itself reads no identity. The
guard is about **who may spend the quota**, not about scoping.

⚠ **It was open to the whole internet until 2026-09-22**, sitting between `/api/health` and the
first guarded route with no auth at all. The cost is not only the bill: **20 of our 28 languages are
translated through it on demand**, so exhausting the daily allowance silently reverts those readers
to English with nothing on screen to explain it. Pinned by `tests/unit/serverWiring.test.js`, which
also asserts that **nothing but `/api/health` and the anonymous report maths is unguarded** — the
report routes are figures-in-figures-out and hold no identity, which is why they are the one stated
exception.

**Every caller sends the token** (`mixins/localeMixin.js`, `mixins/collaborate/localeMixin.js`,
`components/collaborate/shared/ConversationPane.vue`). None did before, so guarding the route without
changing them would have broken language switching everywhere.

**P6 · Currency: read by any signed-in firm user, written by managers only.** A read must never
require a manager role and must never break a report — on any failure it degrades to the default.

**P7 · The supported currency list has one source**, shared by the backend and the picker, so
the two cannot drift.

**P8 · Never write a local money formatter.** The shared mixin gives every variant needed, in the
firm's currency and the reader's language. Delete the local one you were about to write.

**P9 · 🔴 CHANGING THE FIRM'S CURRENCY RELABELS THE FIGURES. IT DOES NOT CONVERT THEM.** `money(v,
currency, locale)` formats and nothing more. Switch a firm from GBP to EUR and `£46,170` becomes
`€46,170` — the same number wearing a different symbol.

That is **correct** for a firm entering figures in its own money, which is every firm. It is a
**wrong reading** the moment anyone takes the change for a conversion — and nothing on screen says
which it is. The selector's own confirmation, *"Reports now show Euro (€). This applies to every
model in your account."*, is silent on the point.

⚠ **This does NOT mean the app cannot convert.** It can, in the one place that makes sense — inside a
model, from a rate the advisor enters, once a primary currency is known. See §3's ruling on firm-level
currency versus in-model conversion. **The firm setting is a label; `fxAllowancePct` is the maths.**
Keeping those two apart is the whole of this principle.

**On the live list as item 13.1** (found 2026-09-22 while answering Mike's *"what if I'm in Italy but
want the currency to be in Euro?"* — the split held up, this did not). ⚠ **The fix is one short line
of Mike's own wording at the selector**, and nothing else: applying a rate to a whole report is not
this item and is not wanted.

---

## 3. Design considerations

**Requests are chunked for a real reason.** A run of short strings once piled into a single
oversized request that the translation service rejected outright — and the failure mode was that
**an entire language silently reverted to English**. Chunking is what fixed it; it is not
tidiness.

**Translating out of a language, not only into one.** A message written in Spanish being read in
English needs a source language, not an assumption that everything starts in English.

**Currency persistence rides the shared firm-config store**, so version history and restore come
free — the same mechanism as every other firm setting.

**A missing translation must not produce a blank.** Falling back to the key, or to English, is
always better than an empty label on a screen an advisor is using in front of someone.

**🔴 CURRENCY IS SET AT FIRM LEVEL. CONVERSION LIVES INSIDE A MODEL. — Mike's ruling, 2026-09-22,
and it is the answer to "what about a client who trades in something else".** In his words:

> *"currency would be needed at firm level — conversion would only be required in a specific model
> where a primary currency had already been entered"*

So there are **two separate things**, and conflating them is how this went wrong once already:

| | Where it lives | What it does |
|---|---|---|
| **Currency** | The **firm**, one value (`/api/report/currency`) | Which money every report is denominated in |
| **Conversion** | **Inside a model**, per model | What a foreign leg costs once a primary currency is known |

✅ **THE APP ALREADY WORKS THIS WAY, which is why this is a principle rather than a build.**
`server/report/threeWayForecastModel.js` takes an **`fxAllowancePct`** the advisor enters and applies
it exactly where foreign money arises — `fxOnPurchases` on imported stock, `fxOnSales` on overseas
collections, and off the debtor too. `server/report/importShipmentModel.js` states the boundary in
its own header: *"It does not apply the exchange allowance… Those are the forecast engine's, they are
built, tested and approved, and computing them twice is how two models start disagreeing."*

**Checked 2026-09-22 against all 30 files in `server/report/`: no model has a foreign leg without an
fx input.** (`multiplePropertyModel.js` matches a search for *"imported"* only on the Google Sheets
function `Import Range`.) **There is no wrong number today.**

⚠ **So a per-CLIENT currency is NOT the answer, and an earlier version of this section said it was** —
filed as a schema change touching `va_clients` and ~40 report components. An Italian firm reports its
Swiss client in Euro because **Euro is the firm's currency**, and the Swiss leg of any model is a
conversion input, not a second firm setting. **What remains is item `13.2`: write this rule where a
new model will meet it, and say on screen which currency a converted figure is in.**

**The currency picker sits on the Model Library screen, not the Firm Manager Hub — 🔴 ON THE LIST AS
`13.3`.** Manager-gated by `requireManagerRole`, but beside the reports it governs rather than with
the firm's other settings. It is the one manager-owned setting outside the hub.

> ⚠ **Both were written here as *"recorded boundaries, not filed"* and that was wrong.** They were
> surfaced to Mike as things we had noticed and deliberately not turned into tasks. His answer:
> ***"lets be clear - BOTH those issues must be fixed, add them to the to do list."***
>
> **The lesson is narrow and worth keeping.** Recording a limit in a Brief is not the same as
> handling it. `CLAUDE.md`'s rule — *a fault ends fixed now or on the list with his yes* — has no
> third ending called "written down in the design document", and that is exactly what this section
> had invented. The rule was followed in surfacing them and then quietly broken in filing them
> nowhere.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| Wording files | `locales/`, plus `locales/collaborate/` |
| Wording setup and merge | `plugins/i18n.js` |
| Language helper | `mixins/localeMixin.js` |
| Money formatting | `mixins/currencyMixin.js` |
| Translation route | `server/routes/translate.js` |
| Currency routes | `server/routes/currency.js` |
| Supported lists | `data/languages.json`, `data/currencies.json` |

### The wording merge

Two applications' wording files are joined at setup by a merge that **refuses a section-name
collision** rather than letting one file silently win. If you add a top-level section, check it
does not already exist on the other side.

### Traps that have actually bitten

1. **A whole locale silently reverted to English** because a request grew past the service's URL
   limit. Chunking fixed it; do not remove it.
2. **Two copies of the translation route existed**, hardened in different directions. They were
   **folded together** rather than one being picked, because each held something the other did
   not — chunking from one side, sanitisation, validation and the source-language option from the
   other. If you find two implementations of the same thing, read both before choosing.
3. **The hardcoded-English breach is CLOSED (2026-08-14)** — and the item that described it was
   wrong: it named the report screens, which never had the problem. The whole item was one file,
   and **87 strings** moved out of `VirtualAdvisor.vue` into `advisor.*`. **Measure before
   believing a backlog title.**
4. **🔴 An unresolved wording key does NOT throw — vue-i18n renders the key itself.** So a button
   reads `advisor.save.confirm` on screen while every test passes. This is the one failure mode in
   this area that no ordinary test can see, and the only guard is a test that walks the component's
   `$t()` calls against the real locale file — `tests/unit/i18nMessages.test.js`. **Any screen that
   moves its strings into the wording layer adds itself to that walk in the same change.**
5. **Keys built by joining text (`$t('advisor.domains.' + id)`) need their own check** — a missing
   entry becomes a raw key offered as a selectable option, not an error.
6. **The free translation tier has a daily limit.** An environment variable raises it; without it,
   translation quietly stops working at volume.

---

## 5. Related briefs

[`model-library.md`](model-library.md) — where currency is set ·
[`report-models.md`](report-models.md) — the money formatting rules in practice ·
[`collaborate-groups.md`](collaborate-groups.md) — the other side of the wording merge.

**History:** [`localisation-and-currency-history.md`](localisation-and-currency-history.md)
