# Release Notes — v0.10.0

**Tag:** `v0.10.0` · **Cut:** 2026-08-22 ·
**Previous release:** [`v0.9.0`](RELEASE-NOTES-v0.9.0.md) (`d4284e6`, 2026-08-17) —
cut and offered. Pulling v0.10.0 covers it either way.

**59 commits since v0.9.0** — 23 code, 36 documentation and design.

> 🔴 **THIS ONE DOES NEED `npm install`.** The last two releases did not, and this note
> exists so the difference is not missed.
>
> **What changed:** one **devDependency** — `playwright`, pinned to exact `1.34.3` — plus
> `.npmrc` and `package-lock.json`. Nothing in the deployed runtime is affected: no
> runtime dependency was added, removed or moved, and playwright is a developer tool for
> checking that a screen renders correctly.
>
> ✅ **It downloads no browser.** `.npmrc` now carries `playwright_skip_browser_download=1`,
> so `npm install` prints *"Skipping browsers download"* and adds two small text packages
> instead of fetching Chromium, Firefox and WebKit (measured at **604 MB**). That line is
> there specifically so this release does not hand anybody a 604 MB surprise. A developer
> who wants to run a visual check opts in with `npm run visual:setup` (Chromium only).
>
> ⚠ If you deploy with `npm ci --omit=dev` (or `--production`), playwright is not installed
> at all and there is nothing to think about.
>
> *This is called out every release because v0.7.0 added `@mdi/font` and, without the
> install, the Hub's tab icons rendered blank — which reads as a broken build rather than a
> missing package.*

**Verified at tag time, on the tagged commit:** 6,037 tests green across 326 suites · lint
0 errors · critical-audit gate PASS. Runtime target unchanged: **Node 14.15**, backend
CommonJS, Nuxt 2 / Vue 2 / Restify 9.1.0 per the Stack Constitution.

---

## What this release is about, in one paragraph

**v0.9.0 filled the cascade with content the AI was not reading. v0.10.0 finishes the
tools that content is about, and gives managers somewhere to see and change what the AI is
told.** The Multiple Property Assessment becomes a five-property household portfolio; the
tax rules it rests on become settings a group sets and a firm corrects; the Firm Manager
Hub's menu becomes something a first-time manager can read; a new **AI Prompts** tab lets
four manager tiers see the instructions the AI works to; and the ten built calculators —
which the backend had never heard of — are now something the AI can point an advisor at.

---

## 1. Multiple Property Assessment — finished

The rental-property model now answers the question the source workbook was built for:
**does this household's portfolio work?** Up to five properties over ten years, with cash
flow, tax including ring-fenced losses carried forward, both loans amortised per property,
the family home, the loan-apportionment table that decides each mortgage, and the
consolidated report.

One route serves both shapes — a single property and the portfolio — so nothing that was
working before changed behaviour.

**Five defects were corrected from the source workbook rather than reproduced**, each on an
explicit owner ruling, and the golden tests hold the corrected numbers. The corrections are
listed in the model's own header and in `design/MULTIPLE-PROPERTY-ASSESSMENT.md` §6.

⚠ **Two defects in this screen were found by reading the rendered page, with 5,885 tests
green** — a scalar indexed as if it were a ten-year series, so a client's cash deposit
rendered as a row of dashes; and an input left blank beside a total that had visibly had
that money deducted from it. Neither is a maths error and neither is a layout error, so
neither the golden tests nor a mockup could see them.

## 2. The property tax rules became settings

What may be depreciated and how, whether rental losses ring-fence, interest deductibility
and its phasing schedule, the GST inside the management fee, which year-1 costs are added
back, and a **maximum loan-to-value ratio**.

**A group — normally a country — sets them, a firm may correct them, and an advisor types
over them on the report for one client.** Every value on the tab says whether it was set
there or inherited, because those are different decisions and look identical otherwise.

## 3. Firm Manager Hub — the menu is readable

Tabs are grouped under four headings, in the owner's own words. **One tab that appeared
twice at the middle tiers is gone** — above the firm, Team Case Studies and Case Reviews
were returning the identical list from the same store call, so a manager opened two
differently named tabs and found the same cases in both.

The Coaching Reference tab was **removed** after measurement showed what it was actually
contributing; the seven sentences worth keeping were folded into the block that reads them.

## 4. AI Prompts — a new tab at all four manager tiers

The instructions the AI is given when it builds a cash flow model, and the three settings a
manager may change: materiality threshold, reporting periods, and currency and units.

- **The method is shown in full and is read-only at every tier** — a manager can see the
  standard their firm is held to.
- 🔴 **The platform protocols are prepended on the backend at send time and are not in the
  editable document at all.** They cannot be edited away because they are not in the thing
  being edited. Marking text read-only would not have been enough.
- **A default that is applied announces itself**, and a value that cannot be safely guessed
  — the currency — stops the work rather than being invented.
- Written **for an accountant, not an engineer**: the security document is mentor-only, and
  below the mentor it is four plain sentences under *How your clients' information is
  protected*, each tied by a test to the code that performs it.

## 5. The AI now knows the ten calculators exist

`utils/reportModelCatalogue.js` was imported by one component and by nothing on the
backend, so an advisor describing a client's cash problem could not be pointed at Debtor
Drag — **the AI had never heard of it.**

Each live model now tells the AI what it answers, its key calculation output, what the
advisor must be able to supply, when to reach for it, and **what it does not cover**. Both
client-facing modes may name one, with its exact page path, when it genuinely fits — and
stay quiet when none does.

🔴 **A model with no page can never be named.** Eight catalogued models are *coming soon*
with no route. A guard holds the summaries to the catalogue **both ways**, so a summary for
an unbuilt model fails the build, and a built model with no summary fails it too.

---

## 6. Defects fixed in this release

| What | How it was found |
|---|---|
| Two editable boxes on the AI Prompts page that controlled nothing — thresholds for a step marked *does not apply here* | The owner, looking at a drawing. They validated, saved and cascaded perfectly; **no test could have caught it** |
| A safety sentence promising something the system does not enforce | Caught in build, replaced before shipping |
| Five phasing percentage boxes ~31px wide — holding correct values, rendering as empty | The owner, opening the tab |
| A scalar indexed as a ten-year series, rendering a deposit as dashes | Reading the rendered screen |
| The to-do control deleting the owner's own comments on save — three instructions unread for six days | Tracing why an item had sat twelve days |
| Two stale test counts that had drifted with nothing failing | Deriving the total instead of writing it down |

---

## 7. What is NOT in this release, said plainly

- ⚠ **This app has not been told which role values the two middle-tier managers' tokens carry**,
  so `config/integration.js` ships `globalManagerRole` and `groupManagerRole` **empty on purpose**,
  fail-closed, and their hubs are exercised in development rather than on a production login.
  Every cascading feature here is correct for four tiers. **That value is Advisor-e's to supply.**
  *(Corrected 2026-09-02 — this bullet used to say those managers "cannot be logged into", which
  is wrong: they log into Advisor-e and have for 18 months.)*
- **No prompt on the AI Prompts tab has ever been sent to a model.** No report model calls
  the AI, so assembly is proven against its own output — a weaker claim than a live screen,
  and stated as one.
- **Nothing checks that a screen LOOKS right.** The browser driver is now installed; no
  test uses it yet. Every visual defect this project has had was found by a person opening
  the page.
- **Invisible characters are stripped on the new prompt path only**, not yet on the live
  advisor screen.
- **The AI can be routed to the wrong coaching method and then invents content that reads
  as authored.** Known, reproduced, and open — it is on the to-do list, and it is here so
  UAT is not surprised by it.

---

## 8. For whoever pulls this

1. `git fetch --tags && git checkout v0.10.0`
2. **`npm install`** — see the banner at the top. It downloads no browser.
3. Record the pull in [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md): the date, the
   environment, the exact commit hash, who pulled it, and any notes.
   **A deployment is not complete until its row is written.**
