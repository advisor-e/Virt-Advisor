# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean and pushed. Suite 13,445 green (606 suites)** at the last push, lint 0 errors,
audit gate clean. Merged your PR #114 on the way — item 16's stub, the 32 logo boxes and
15.1 stage 7 all came across; one conflict, `to-do.md`, **regenerated not hand-merged**.
Your note read from YOUR branch: dated 2026-09-22, current. **`activeOn` clear here.**

### 13.4 IS BUILT — a client's own currency, drawn and approved first

Cascade **client → firm → platform default**, resolved in one place (`readClientCurrency`).
**No schema change:** `client-currency:<clientId>` on the existing `firmOverlay`, IDOR-guarded
through `clientStore.getById`. **Advisor-level write**, unlike the manager-gated firm setting —
Mike's ruling. Artefact: `design/mockups/client-currency-picker.html`, approved before a line
was written; one deviation recorded in `ARTEFACTS.md` (a CSS class).

🔴 **THE ITEM'S OWN `touches` WOULD HAVE SENT ME TO THE WRONG SCREEN.** It named
`components/ModelLibrary.vue`. That screen is firm-wide and holds **no client at all** — no
`savedReport`, no `ReportHeader`, no `clientId`. The control went on the **report header**
(`ClientAccessSwitch.vue`), which already has the client, so it reached **all eleven**
client-aware reports at once instead of being built eleven times.

🔴 **A CLIENT'S CURRENCY IS NEVER CACHED — do not "optimise" that away.** `currencyMixin`
caches the firm's in ONE `advisor_e_currency` key for the whole app. Cache a client's there and
the next client paints with the previous one's symbol: figures correct, currency wrong,
invisible to anyone looking at one client at a time. Pinned by a test.

### Also closed: 13.1, and two stale records

**13.1 was already built** — the relabel line shipped in `9fe59f97` this morning and the list
still carried it as our work. Closed. **Items 16 and 16.2 corrected**: 16 said a place to hold
the brand was ours either way, which is the opposite of Mike's ruling — replaced, and it now
waits on the master team's two column names, not on him.

**LAPTOP — shared files I touched**: `locales/en.json` (a `clientReports.currency` block),
`design/features/to-do-items.json`, `to-do.md`, `to-do-done-and-parked.md`, `ARTEFACTS.md`,
`design/features/localisation-and-currency.md`, `server/routes/currency.js`,
`server/restify-server.js`, `mixins/currencyMixin.js`, `mixins/savedReport.js`,
`utils/clientReports.js`, `components/base/ClientAccessSwitch.vue`, `ReportHeader.vue`.
**Your strategy files untouched.**

⚠ **16.2 IS STILL OPEN AND ITS SECOND HALF IS NOT IN ITS TITLE:** `pages/strategy-planner.vue`
mounts `StrategyPlanDocument` with **no** `:firm-name`, `:firm-colour` or `:firm-logo`, so every
drawing in a printed plan renders the placeholder even now item 16 has merged. Your ground, not
mine — it is on the item.
