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

## 1a. 🔴 HOW LANGUAGES ARE DEALT WITH — the whole policy, in one place

**Ruled settled by Mike, 2026-09-22.** This section exists because the position was correct in the
code and written down nowhere, so each session re-derived it from the locale folder and **two in a
row got it backwards.** Read this before concluding anything about translation.

**ONE FILE IS AUTHORED. EVERY LANGUAGE COMES FROM IT.**

| | |
|---|---|
| **Authored by us** | `locales/en.json` — English, and **only** English |
| **Shipped as static files** | 8 (`de en es fr it nl pl pt`) — a head start for common languages, **not** a list of what is supported |
| **Offered to a reader** | **28** (`data/languages.json`) |
| **Translated on demand** | the other **20** — `ar az ca cs da el eo fi he hi hu id ja ko ru sk sv tr uk zh` |

**The mechanism** (`mixins/localeMixin.js`): a reader picks a language we do not ship, the whole
English locale is POSTed to `/api/translate/locale`, translated once, and cached in `localStorage`
under `va_locale_<code>`. The cost is paid **once per browser**, not once per visit.

### What this means for anyone writing code here

🔴 **A string in `en.json` can become any of 28 languages. A string hardcoded in a template stays
English for ever.** That is why hardcoded UI text is a **defect**, not untidiness — it is the one
way to make a screen permanently monolingual, and no test can see it as anything but a passing
string.

✅ **You do not translate anything by hand, and you do not add locale files.** Write the English,
put it in `en.json`, and all 28 languages follow. Adding a 29th language is a row in
`data/languages.json` — not a translation project.

### ⚠ The two wrong conclusions this section exists to stop

**"The other seven locale files are nearly empty — translation is unfinished."** They hold 8
top-level keys against English's 54, which looks alarming and is not. Those files are a partial
head start; everything missing from them is translated on demand like the other twenty. **Nothing
is unfinished and there is no backlog of translation work.** *(Read exactly this way twice —
2026-09-22 being the second.)*

**"The app cannot translate, so it needs a translation tool."** It can, it does, and it has since
before item 17. This is why **stage 6 of the Sales Tracker was skipped** (Mike's ruling,
2026-09-22): its language admin would have stood a **second** translation system beside a working
one. If a future port arrives carrying its own translation machinery, the answer is the same.

### Where it can genuinely go wrong — and these are real

- **The quota is shared and metered.** 20 languages depend on one third-party allowance.
  Exhausting it **silently reverts those readers to English** with nothing on screen to say why.
  This is why `/api/translate/locale` is signed-in-only (P5a) — the guard is about who may spend
  the quota, not about scoping.
- **A failure must never blank a label.** Falling back to the key, or to English, always beats an
  empty string on a screen an advisor is holding in front of a client.
- **Chunking is load-bearing, not tidiness** — see §3. An oversized request once reverted an entire
  language to English.

**Language is the reader's, currency is the firm's, and they never move together** — §1. An advisor
in Auckland reading in Spanish still reports in New Zealand dollars.

---

## 2. Key principles — the non-negotiables

**P1 · All user-facing text goes through the wording layer.** No hardcoded English in a template
or in logic. This is a stack requirement, not a preference.

**P1a · 🔴 It is the ONLY thing you do.** English into `en.json`, and 28 languages follow from it
— see §1a. Never hand-translate, never add a locale file, never build a second translation path.

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

**P6 · Currency: read by any signed-in firm user, the FIRM's value written by managers only.** A
read must never require a manager role and must never break a report — on any failure it degrades
to the default.

⚠ **A client-level override is Mike's ruling of 2026-09-22 and is NOT yet built** (`13.4`). When it
lands, the manager-only write still governs the **firm's** value; the advisor's is the **client's**,
and the resolution order is client → firm → platform default. See §3.

**P7 · The supported currency list has one source**, shared by the backend and the picker, so
the two cannot drift.

**P8 · Never write a local money formatter.** The shared mixin gives every variant needed, in the
firm's currency and the reader's language. Delete the local one you were about to write.

**P9 · 🔴 CHANGING THE FIRM'S CURRENCY RELABELS THE FIGURES. IT DOES NOT CONVERT THEM.** `money(v,
currency, locale)` formats and nothing more. Switch a firm from GBP to EUR and `£46,170` becomes
`€46,170` — the same number wearing a different symbol.

That is **correct** for a firm entering figures in its own money, which is every firm. It is a
**wrong reading** the moment anyone takes the change for a conversion — so ✅ **since 2026-09-22 the
screen says which it is** (item 13.1): *"Figures are relabelled, not converted — the amounts do not
change."* stands at the picker for both roles, closes the confirmation, and repeats at the
client-level picker, where the wrong reading is likelier still.

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
| **Currency** | The **firm** (`/api/report/currency`), overridable per **client** (`/api/report/currency/client/:clientId`) | Which money a report is denominated in |
| **Conversion** | **Inside a model**, per model | What a foreign leg costs once a primary currency is known |

🔴 **AND THE FIRM'S CURRENCY CASCADES TO THE CLIENT, WHERE THE ADVISOR MAY EDIT IT — Mike, 2026-09-22.**
In his words:

> *"currency is selected at firm manager level and cascades down to the client level model library
> but at client level (which is where the advisor uses it - for the benefit of their clients) the
> currency can again be edited by the advisor - if required"*

So there are **three levels, not two** — the firm sets one, it cascades to every client, and the
advisor overrides it for a client that needs it. ✅ **BUILT 2026-09-22** to the approved drawing
[`client-currency-picker.html`](../mockups/client-currency-picker.html).

**How it resolves: client → firm → platform default**, in one place — `readClientCurrency` in
[`server/routes/currency.js`](../../server/routes/currency.js) — so the screen, the report and any
backend caller can never disagree. A read never throws: every failure degrades one step outward,
because a display setting must not be able to break a report.

**The control is on the report header, not the Model Library.** The Model Library is firm-wide and
carries no client at all, so a per-client control could not work there;
[`ClientAccessSwitch.vue`](../../components/base/ClientAccessSwitch.vue) already holds the chosen
client, so the picker sits beside it and reaches **all eleven client-aware reports at once**. The
other ~37 report screens are stateless calculators with no client and keep the firm's currency.
**Any advisor may set it** — deliberately unlike the manager-gated firm-wide setting.

**Storage is `client-currency:<clientId>` on the existing `firmOverlay`** — no schema change, version
history for free, and every call IDOR-guarded through `clientStore.getById(id, firmId)`. A client of
another firm resolves to the firm's currency rather than erroring, so a display setting cannot leak
the existence of another firm's client.

🔴 **A CLIENT'S CURRENCY IS NEVER CACHED, AND THAT IS LOAD-BEARING.** `currencyMixin` caches the
firm's in **one** `advisor_e_currency` key for the whole app. Cache a client's there and the *next*
client paints with the previous one's symbol — figures correct, currency wrong, and invisible to
anyone looking at one client at a time. Pinned by `tests/unit/clientCurrencyMixin.component.test.js`.

⚠ **THIS DOES NOT REOPEN THE RULING BELOW, AND A READER MUST NOT TAKE IT THAT WAY.** What he
rejected earlier the same day was a per-client currency **as a second firm-level setting**, with the
conversion maths that implies. This is a **label** — which money this client's reports are
denominated in — defaulting to the firm's. **Conversion still lives inside a model on
`fxAllowancePct`, exactly as ruled.** The two are compatible because one is what a figure is
*called* and the other is what a figure is *worth*.

🔴 **It also made `13.1` load-bearing, and that shipped first.** A firm-wide relabel is defensible:
every figure was entered in the firm's own money. **An advisor switching one client to Euro is far
likelier to believe the figures converted** — so *"Figures are relabelled, not converted — the
amounts do not change."* appears at **both** pickers, the firm's and the client's.

✅ **THE APP ALREADY WORKS THIS WAY, which is why this is a principle rather than a build.**
`server/report/threeWayForecastModel.js` takes an **`fxAllowancePct`** the advisor enters and applies
it exactly where foreign money arises — `fxOnPurchases` on imported stock, `fxOnSales` on overseas
collections, and off the debtor too. `server/report/importShipmentModel.js` states the boundary in
its own header: *"It does not apply the exchange allowance… Those are the forecast engine's, they are
built, tested and approved, and computing them twice is how two models start disagreeing."*

**Checked 2026-09-22 against all 30 files in `server/report/`: no model has a foreign leg without an
fx input.** (`multiplePropertyModel.js` matches a search for *"imported"* only on the Google Sheets
function `Import Range`.) **There is no wrong number today.**

⚠ **So a per-client currency is NOT the answer TO CONVERSION, and an earlier version of this section
said it was** — filed then as a schema change touching `va_clients` and ~40 report components. An
Italian firm reports its Swiss client in Euro because **Euro is the firm's currency**, and the Swiss
leg of any model is a conversion input, not a second firm setting. **No model converts: every
figure is entered and shown in the report's one currency, and the exchange allowance is a margin on
top — so there is nothing to label. The rule is in `ADDING-A-REPORT.md`'s checklist** (item 13.2,
closed 2026-09-25).

🔴 **DO NOT READ THIS AS CONTRADICTING `13.4` ABOVE, WHICH SHIPPED.** The rejected thing was a
per-client currency carrying **conversion maths** — a second firm-level setting in disguise. What was
built is a **label** saying which money this client's reports are denominated in, defaulting to the
firm's, with conversion still inside a model on `fxAllowancePct`. One is what a figure is *called*;
the other is what a figure is *worth*. Both rulings are Mike's, both stand, and they are about
different things.

✅ **THE FIRM'S CURRENCY IS SET ON THE FIRM MANAGER HUB, AND SHOWN ON THE MODEL LIBRARY — item
`13.3`, built 2026-09-23.** It was the one manager-owned setting living outside the hub, so a
manager looking for it where every comparable setting lives did not find it.

🔴 **IT APPEARS IN BOTH PLACES, AND THAT IS MIKE'S RULING OF 2026-09-23 RATHER THAN A COMPROMISE.**
The question put to him was move-or-mirror. **The Hub's Currency tab is where a manager SETS it**
([`components/firm/FirmCurrency.vue`](../../components/firm/FirmCurrency.vue), under *Model Inputs*,
**firm tier alone** — the mentor has no currency of its own and neither a brand nor a country has
one value to hold for firms that may report differently). **The Model Library keeps showing it,
read-only, for every role** — moving it outright would have removed the one cue telling a reader
which currency the reports in front of them are in.

**The two screens say different things to different people, deliberately.** A manager reads
*"Change it on the Currency tab of your Firm Manager Hub"*; an advisor reads *"Set by your firm
manager"*. Telling an advisor to visit a hub they cannot open would be worse than saying nothing.

**No backend change was needed** — `POST /api/report/currency` was already manager-gated, so
nothing about who may write the setting moved with the control.

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
