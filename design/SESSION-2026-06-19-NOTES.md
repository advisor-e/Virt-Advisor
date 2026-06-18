# Session 2026-06-19 — Shared Case-Study DB foundation BUILT (branch, pre-merge)

> Read-cold record + the live click-through checklist. Canonical task entries: [`ACTIONS.md`](ACTIONS.md).
> Design decision: memory `design-case-study-visibility-model`. This is **step (a)** of the
> case-study feedback loop (the firm's team-development engine) — the foundation that steps
> (b) manager review area and (c) one-click move sit on.

---

## 0. TL;DR — where things stand

- **Branch:** `feat/case-study-db` (5 commits, **NOT merged** to `master`). `master` untouched.
- **Tests:** 414 pass · lint clean (0 errors). Backend `/api/cases` routes **live-verified end-to-end on Node 14.15**.
- **What it is:** advisor case studies moved from browser localStorage → the firm database, behind secured `/api/cases` routes. "Shared" now genuinely means shared; the `cases.js` IDOR is closed.
- **Remaining before "done":** (1) live **browser click-through** (the checklist below), (2) **merge** to `master`, (3) **provision the `va_case_studies` table** in MySQL (dev runs on a dev-JSON fallback).

---

## 1. What shipped (commits on `feat/case-study-db`)

| Commit | What |
|---|---|
| `b37879a` | Schema — `va_case_studies` table in `config/db-schema.sql` (visibility default `private`, `updated_at` audit col, FK to `firms`) |
| `e1a07e4` | Backend — `server/utils/caseStore.js` (raw SQL + dev-JSON fallback) + secured `/api/cases` routes (list/create/review/visibility/delete) + 14 tests. **IDOR closed** (identity from JWT) |
| `cc2542a` | Frontend swap — `utils/cases.js` → API client; `caseMixin` loads async; `VirtualAdvisor` Save awaits the DB; list route echoes the authed `advisorId` |
| `afe76d4` | Visibility toggle — "Share with the firm" / "Make private" on each saved case |
| `65f8848` | One-time localStorage→DB migration + dev/prod parity fix (`_devCreate` now rejects duplicate ids) + 4 dev-fallback tests |

## 2. The privacy/visibility model (confirmed with Mike 2026-06-19)

- **Every case lives centrally** in the DB → follows the advisor across devices.
- **Private** = the owning advisor only, on any of their devices (access-controlled by JWT identity; team + manager cannot see it).
- **Shared** = the whole firm.
- **Two-way toggle** — an advisor can flip a case private↔shared at will.
- Stored once in `va_case_studies`; `visibility` is the entire access model (not split storage). Memory: `design-case-study-visibility-model`.

---

## 3. How to run the app for the click-through

Two processes (as per the standing dev setup):

**Backend** (Restify, port 4000, **Node 14.15** locked runtime) — the standalone backend does NOT auto-load `.env`, so export it first. A real client session needs `OPENAI_API_KEY` + `NODE_EXTRA_CA_CERTS` (the OpenAI TLS call):
```
set -a && . ./.env && set +a && "C:/Users/Mike Barnes/AppData/Local/nvm/v14.15.0/node.exe" server/restify-server.js
```
*(If port 4000 is already taken, an old backend is still running — stop it first, or it won't bind.)*

**Frontend** (Nuxt, port 3000, Node 20):
```
npm run dev
```
Open http://localhost:3000 (→ `/advisor`).

**Note on persistence in dev:** with no MySQL connected, the cases save to the **dev-JSON fallback** (`data/dev-cases.json`, gitignored). That proves persistence across page reloads, but true cross-device / firm-shared-across-advisors behaviour needs the real `va_case_studies` table provisioned.

---

## 4. Click-through checklist (the merge gate)

Run a real client session first so there's something to save:

1. **Run a client session** — "I have a client situation", answer the intake through to a delivered recommendation.
2. **Save** — click 💾 *Save as case study* → enter a title → choose **Private** → *Save case study*. → expect the success state.
3. **Open the panel** — click **Case Studies** → the case appears under *My Saved Cases*, tagged **🔒 Private**.
4. **Persistence** — **refresh the browser**, reopen the panel → the case is still there (proves it's server-side, not localStorage).
5. **Share** — expand the case → click **Share with the firm** → tag flips to **🏢 Shared**, the button becomes **Make private**.
6. **Un-share** — click **Make private** → flips back to 🔒 Private. (Both directions work.)
7. **Review** — fill in the *Post-Delivery Review* fields → *Save* → reopens cleanly; the "Feedback welcome" tag clears.
8. **Delete** — delete a case → confirm → it disappears from the list.

Throughout: **no console errors**, and the case survives a refresh. (Sharing across two different advisor accounts / devices can only be fully demonstrated once MySQL is provisioned.)

**Migration check (optional):** if this browser had cases saved under the old localStorage key `va_case_studies` from before today, they are lifted into the DB once, silently, on first load — they should simply appear in *My Saved Cases*. The old localStorage copy is kept as a backup (nothing deleted).

---

## 5. After the click-through

- **Merge** `feat/case-study-db` → `master` (a clean `nuxt build` + the walkthrough above).
- **Provision** `va_case_studies` in MySQL before production (`config/db-schema.sql`).
- Then the **next build pieces** (steps b + c): the **manager case-review area**, then the **manager-only one-click "Move it here."** Both now have their foundation. This DB also lights up the 3 blank Firm Manager tabs (need Drive/DB).

## 6. Related
- [`ACTIONS.md`](ACTIONS.md) — canonical backlog (updated today).
- [`HANDOFF.md`](HANDOFF.md) — Learning Loop / Case Studies section (updated today).
- Memory: `design-case-study-visibility-model`, `design-case-study-review-team-dev`, `north_star_vision`.
