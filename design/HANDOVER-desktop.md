# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Desktop · branch `feat/firm-quiz-builder-ui`

**PR #104 MERGED.** Item 17 **stages 1 and 2 complete, stage 3's backend built**. Suite **12,618
green** (578 suites), lint 0 errors, `npm run build` seen to succeed. Tree clean, all pushed.

### 🔴 THE SECURITY HOLE THAT NEARLY BECAME A HANDOVER LINE

`POST /api/translate/locale` had **no auth guard at all** — it sat between `/api/health` and the
first guarded route, an open proxy to a metered third-party service. **20 of our 28 languages are
translated through it on demand**, so exhausting the quota reverts those readers to English with
nothing on screen to say why.

I found it in the morning, asked, and the conversation moved on before the answer came. **It only
surfaced again because the shutdown checklist audits every fault against "fixed or filed".** Now
guarded, with all three callers sending the token (none did — guarding alone would have broken
language switching). Proven live both ways: anonymous refused, signed-in returns `"Bonjour"`.

`serverWiring.test.js` now asserts **nothing but `/api/health` and the anonymous report maths is
unguarded**, so the next one fails the build. Writing that test found 22 report routes that are
open *by design* — figures in, figures out, no identity — and the exception is now stated rather
than assumed.

### What is built (item 17)

| | |
|---|---|
| Stage 1 | 5 tables (`db-migration-sales-tracker.sql`), proven on real MySQL |
| Stage 2 | Pipeline store, routes and **screen** — driven in a browser |
| Stage 3 | COI store and routes, dashboard maths — **screens outstanding** |
| Tests | **252**, all mutation-verified |

**The rule throughout:** an advisor sees their own rows at any visibility plus their firm's shared
ones, and may change **only their own**. Enforced in SQL; the dashboard aggregates the stores and
never queries the tables, so it cannot widen it.

### Two faults found by LOOKING, not by testing

1. **The missing `/api/sales` proxy line** — the screen rendered perfectly and loaded nothing.
   **The fourth time**; `nuxt.config.js` already carried a warning naming the other three.
   ⚠ **Add a backend route's proxy line in the same change, and open the page before calling it
   done.**
2. **The privacy control sat below the fold** of the add form (y=942, scroll area ends 909). Moved
   to the top on Mike's ruling.

### Two harness gaps that made SECURITY tests pass while asserting nothing

`process.client` is undefined under jest, and jsdom's `window.localStorage` is read-only — a plain
assignment is ignored. Both commented where they are set up.

### Mike's rulings today

- A firm manager **does** see their advisors' pipelines — stage 4's Team roll-up, behind a manager
  guard. Deliberately not in these routes.
- **Currency is the firm's; conversion lives inside a model** where a primary currency is already
  entered. Parent **13 renamed to Language, Tax & Currency**; `13.1`/`13.2`/`13.3` filed.
- **"Put the screens on the Firm Manager Hub" was wrong** — he caught it by asking to see the
  instruction. Diagnosed in `sales-tracker-history.md` §5.

### NEXT

**The COI and Dashboard screens.** COI is Pipeline again with different columns; the dashboard is
**redrawn on `components/base/`'s six SVG charts**, not ported — that is the largest screen job left.

🔴 **Waiting on Mike, blocking nothing:** `13.3` — does the currency picker MOVE to the hub or
appear in BOTH? And `13.1`'s one-line wording is his to give.

**LAPTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `ITEM-NUMBERING.md`,
`localisation-and-currency.md`, `nuxt.config.js`, `locales/en.json`, `.gitignore`,
`server/restify-server.js`, and the two locale mixins + `ConversationPane.vue` for the token.
**Your 7.5, 15.1 and 15.7 are untouched.**
