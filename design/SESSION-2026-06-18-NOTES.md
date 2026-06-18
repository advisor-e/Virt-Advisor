# Session 2026-06-18 — Template-selection engine repaired + distinctions group targets (MERGED TO MASTER)

> Read-cold record of a big session. Everything below is **shipped and merged to `master`**
> (`a1c7635`), pushed to GitHub. Canonical task list: [`ACTIONS.md`](ACTIONS.md).

---

## 0. TL;DR
- Started from the EOY/`includedInClient` finding; ended with the **whole template-selection
  engine repaired** behind a **new cross-domain regression harness**, plus a new
  **revenue-model group-target** for distinctions. **All merged to `master`.**
- **392 tests pass · lint clean · `nuxt build` clean.**
- The café test case now leads with the right tools (costing/revenue model + pricing + sales),
  not generic ones — verified live on Node 14.15 backend + prod frontend.

---

## 1. The root pattern we killed (why it had been ~20 rounds)
Two recurring classes, both "a scoring input reads a stale/duplicated source":
1. **`includedInClient` used as a selection gate.** That field only governs whether a *client*
   self-serving in Advisor-e can SEE a template — NOT whether an advisor can recommend it. It
   was filtering the resolver, the summaries copy, the semantic-profile builder, the firm-manager
   picker, and two dev scripts. **Removed everywhere** (full-codebase sweep) → pool is now
   `menuSection === 'do-the-job'`.
2. **Hand-maintained duplicates of the signal dictionary that had drifted.** `DOMAIN_SIGNAL_SCOPE`
   and `PURPOSE_FALLBACK_KEYWORDS` were second copies of the dictionary's per-signal `domains`,
   out of sync — they omitted `revenue_modelling` from `profit` (silently zeroing the dominant
   semantic lever — the café bug), carried a phantom `profit_plateau`, and lacked the 8 newer
   domains. **Now derived from `signal-dictionary.json` (single source).**

**The fix that ends it:** a committed **regression harness** (`tests/unit/selectionHarness.test.js`)
that asserts OUTCOMES — "this kind of advisor case → these templates surface" — across every
domain. Nothing asserted outcomes before, so a dead scoring input never turned a test red. Now it
does.

---

## 2. What shipped (commits, in order)
| Commit | What |
|---|---|
| `9884bd6` | Stop filtering recommendations on `includedInClient` (resolver + summaries copy) |
| `abf1265` | docs: close the duplicate inclusion-field ACTIONS entry |
| `c5b5e9d` | Meeting-count parser reads hedged ranges to the upper bound ("two possibly three" → 3) |
| `b53796b` | **Cross-domain selection regression harness** (the safety net) |
| `5110c75` | **Single-source `DOMAIN_SIGNAL_SCOPE`** (fixes café `revenue_modelling`) + **industry scoring** + wrong-industry **hold-back** |
| `0f6ea00` | Build semantic profiles over **all** do-the-job templates (127 → 198) |
| `3cf823a` | Dictionary catches the **opportunity** framing of selling (upsell/cross-sell/sell more) |
| `05f0c8c` | Dictionary catches **cost-transparency** language ("don't understand their costs", poor costings, cost drivers) |
| `d08ac63` | **Firm distinctions can target a revenue-model GROUP** (`@rf-industry` / `@rf-general`), auto-matched to client industry |
| `09cd6b4` | Distinctions picker shows the full recommendable pool (do-the-job, not includedInClient) — full-codebase sweep |
| `ba5de35` | De-flood the picker (exclude the 87 individual R&F models → group options; drop admin/plumbing shelves) |
| `d5c31ee` | Picker opens focused on an area (General Tools) instead of dumping all ~106 |
| `a1c7635` | **Merge → master** |

---

## 3. How the café case behaves now (the canary)
Advisor: *"café… struggling with profitability… they don't understand their costs… poor costings…
frightened to put prices up until they know what it costs… not upselling."* Two meetings, possibly 3.
- Budget = **3** (parser fix).
- Signals fired: `revenue_modelling` + `pricing_issue` + `sales_volume`.
- Surfaces: **Cafe** (industry revenue model, auto-matched) + pricing tools (Margin vs Markup,
  Price Rise) + **Sales Session** — instead of the old generic 8 Profit Levers / Working Capital.

---

## 4. Key design decisions made today
1. **Industry is a first-class scorer**, not just an AI relevance gate. Right-industry model wins
   (+8 title match); a wrong-industry "pure industry" model (fingerprint == `{revenue_modelling}`)
   is **held back (−15)** when the client's industry is stated. Generic feasibility tools untouched.
2. **`line-198` profit reorder kept** (NOT a bug): with the semantic lever working it's a benign
   weak-prior guard. Left in place.
3. **Distinctions can target a group, revenue-models only** — `@rf-industry` / `@rf-general`. The
   firm picks the group; the engine auto-matches the specific model. Labels confirmed with Mike.
4. **Picker scope = `do-the-job` minus R&F (group-handled) minus plumbing shelves** (Help, Firm
   Manager/Risk Advisor Access, External Advisors, untitled), opening focused on General Tools.

---

## 5. Deliberately NOT done (flagged, not bugs)
- **Urgency wiring** (`deriveUrgency` computed, no stage consumes it) — an unbuilt *feature*.
- **Deterministic Q14 down-weight** — currently handled in the AI prompt; making it deterministic
  is a separate design choice.
- **Dead-but-inert code:** the primary-issue keyword scoring branch (primaryIssue is always null
  now) and the reports-in-use penalty (reads a removed battery field). Harmless; tidy later.
- **`solutionCategories` ← live lever** — low value now that the semantic lever (the intended 77%
  path) does the work; not done.

---

## 6. Ops / how to run (unchanged from 06-17, plus a gotcha)
- **Backend** (Restify :4000, Node 14.15): `set -a && . ./.env && set +a && "<nvm 14.15 node>" server/restify-server.js`
- **Frontend** for testing: production build is more stable than `nuxt dev` (dev OOMs on recompiles,
  exit 134). `nuxt build` then **`npx nuxt start -H 0.0.0.0 -p 3000`**.
  - **⚠ GOTCHA (cost us time today):** `nuxt start` binds to **IPv6 `[::1]` only** by default, so an
    incognito window hitting IPv4 `127.0.0.1` gets "page can't be found." **Always start with
    `-H 0.0.0.0`** so both stacks work. Also: prod bundles cache hard — hard-refresh (Ctrl+Shift+R)
    or incognito after a rebuild.

---

## 7. Where things stand / next
- `master` = `a1c7635`, all shipped. `feat/distinctions-cascade` merged (can keep using it or branch fresh).
- **The case-study feedback loop** (the team-dev engine) is still the big next build — foundation-first:
  shared case-study DB (localStorage → MySQL, also closes `cases.js` IDOR + lights the 3 blank Firm
  Manager tabs), then manager case-review area, then manager-only one-click "Move it here." See
  [`SESSION-2026-06-17-NOTES.md`](SESSION-2026-06-17-NOTES.md) §3.
- Optional tidy: remove the two inert dead-code spots (§5); wire urgency if wanted.
