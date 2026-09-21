# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Desktop · branch `feat/firm-quiz-builder-ui`

**Item 17 stages 1 AND 2 BUILT, proven in a real browser, and offered to `master` by pull
request.** Suite **12,516 green** (575 suites), lint 0 errors, coverage and audit gates passed.
Tree clean, everything pushed.

### 🔴 THE PLAN WAS WRONG IN FOUR PLACES AND WAS CORRECTED BEFORE ANY CODE

Mike asked for the hub code, the stack rules and the colour/font rules to be read before
building, then for the plan to be re-checked against them. It did not survive that. All four are
in [`features/sales-tracker.md`](features/sales-tracker.md):

1. **The screens are a REPAINT, not a port** — 93 distinct colours, 3 on brand, **no
   `font-family` at all**, against `BRAND-TOKENS.md`'s *"every screen"* (§4a).
2. **Their dashboard needs Chart.js.** We have six hand-built SVG charts and no chart library,
   by design. Stage 3 is the hardest screen, not *"the easiest"*.
3. ✅ **`va_courses` already answered multi-tenancy**, better than `firm_id` alone.
4. 🔴 **"Add the screens to the Firm Manager Hub" was WRONG and nobody asked for it.**
   `HUB_SCOPES` has no advisor scope and the hub is behind `requireManagerRole`, so it would
   have built the tool where its own users cannot open it. **An AI session wrote it into the
   Brief and a session was an hour from building from it**; Mike caught it by asking to see the
   instruction. The mechanism is diagnosed in
   [`features/sales-tracker-history.md`](features/sales-tracker-history.md) §5 — **freshness is
   not authority.**

**Estimate re-priced 12–21 → 16–25 days.**

### What is built

| | |
|---|---|
| `config/db-migration-sales-tracker.sql` | **5 tables**, not the plan's 8 |
| `server/utils/salesPipelineStore.js` · `server/routes/salesPipeline.js` | Raw `mysql2`, 4 routes |
| `components/sales/SalesPipeline.vue` · `pages/sales-pipeline.vue` | The screen, repainted |
| 4 test files | **154 tests**; routes 99% / store 97% coverage |

**Two tables dropped beyond the `user`/`session` recommendation** — their `auditlog` and
`appconfig` duplicate our `audit_log` and `firm_framework_versions`, and ours are better.

**The access rule:** an advisor sees their own deals at any visibility plus their firm's shared
ones, and may change **only their own**. Mutation-verified seven ways across the schema, store
and screen.

### 🔴 THE FAULT THE 12,000 TESTS COULD NOT CATCH — AND IT IS THE FOURTH TIME

The screen rendered perfectly and said *"Could not load your pipeline"*. The backend was serving
(curl proved it), but **`nuxt.config.js` had no proxy line for `/api/sales`**. Every test either
calls the handler directly or stubs `fetch`; none goes through the running Nuxt server.

**That file already carried a warning naming the three previous times.** Being written was not
enough. ⚠ **When you add a backend route, add its proxy line in the same change** — and open the
page before calling it done. [[feedback_walk_the_conversation]].

**Also found by looking, not by testing:** the "Who can see this" control sat **below the fold**
of the add form (measured y=942, scroll area ends 909). Moved to the top on Mike's ruling; now
y=118. Nothing leaked — the default is private — but a privacy choice nobody sees is not a choice.

### Two harness gaps that made a SECURITY test pass while asserting nothing

Both commented where they are set up, because this is the dangerous kind of green:

1. **`process.client` is undefined under jest** — Nuxt sets it in the browser. The component's
   SSR guard refused to read the token, so every row looked like the caller's own.
2. **jsdom's `window.localStorage` is READ-ONLY.** A plain assignment is silently ignored and the
   real, empty store answers. `defineProperty` replaces it — and re-defining per test does not
   take, so the token lives in a variable the getter reads.

### Mike's rulings today, all recorded

- **A firm manager DOES see their advisors' pipelines** — stage 4's Team roll-up, behind a
  manager guard. Deliberately not in these routes.
- **Currency is the FIRM's; conversion lives inside a model** where a primary currency is already
  entered. The forecast already works that way via `fxAllowancePct`. Parent **13 renamed to
  Language, Tax & Currency**, and `5.4` moved to `13.1` before the freeze could set.
- **Both currency limits must be fixed** — now `13.2` and `13.3`, not "recorded boundaries".

### NEXT

**Stage 3 — COI + Dashboard.** COI is Pipeline again with different columns; the **dashboard is
the hard one** and is redrawn on `components/base/`'s six SVG charts, not ported.

🔴 **Waiting on Mike, and it blocks nothing:** does the currency picker MOVE to the Firm Manager
Hub or appear in BOTH (13.3), and the wording for 13.1's one-line notice.

**LAPTOP — shared files I changed:** `to-do-items.json` (13.1/13.2/13.3 and item 17), `to-do.md`,
`ITEM-NUMBERING.md`, `localisation-and-currency.md`, `nuxt.config.js` (one proxy line),
`locales/en.json` (a new `salesPipeline` block), `.gitignore`. **Your 7.5, 15.1 and 15.7 are
untouched**, and so is every other item's `activeOn`.
