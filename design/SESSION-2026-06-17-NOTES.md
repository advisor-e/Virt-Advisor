# Session 2026-06-17 — Distinctions Cascade SHIPPED + Case-Study Feedback Loop plan

> **Purpose:** a complete, read-cold record of everything done and decided on 2026-06-17, plus
> the plan for the next (clean) session. Nothing here should be lost. Canonical task entries live
> in [`ACTIONS.md`](ACTIONS.md); this is the richer narrative + roadmap. Design decision also in
> memory `design-case-study-review-team-dev`.

---

## 0. TL;DR — where things stand

- **Branch:** `feat/distinctions-cascade` (all of today's work; **NOT yet merged to `master`**). Pushed to GitHub.
- **`master`** now contains the stack reconciliation (merged early in this session).
- **Tests:** 375 pass · lint clean · client+server compile clean.
- **The Advisory Distinctions cascade is built end-to-end** (edit / decline / move + the cascade engine) and **live-tested** on Node 14.15.
- **The case-study feedback loop is half-built:** the *report* (decision trace + "Why this recommendation" panel + cross-domain bridge) is done; the *firm-manager review area + one-click move* is **planned, not built** — it needs the shared case-study database first.

---

## 1. What SHIPPED this session (all committed + pushed on `feat/distinctions-cascade`)

| # | Commit | What |
|---|---|---|
| dev | `6019451` | Lift Nuxt dev heap cap 8GB→12GB |
| 1 | `ccaca96` | Stable `pd-N` IDs on all 67 platform distinctions (cascade Stage 1 prereq) |
| 2 | `2003b79` | Effective-list resolver — override **replaces** (no double-boost), decline **wins** |
| 3 | `61b2595` | Engine reads through the resolver (one read path: `firmDistinctions.js`) |
| 4 | `9ec67a4` | Firm-manager routes: edit / reset / decline / read-state (firm-scoped, validated) |
| 5 | `a0ddefd` | Unified, badged, fully-editable distinctions list UI |
| trace | `89d6132` | Decision trace emitted with each recommendation (case-study loop, Part 1 backend) |
| dev | `1717953` | `eval-cheap-module-source-map` in dev (curbs HMR memory growth) |
| panel | `2bfa03c` | "Why this recommendation" panel (renders the trace) |
| Part 2 | `c7249e1` | **Move a distinction to a better domain** — backend route |
| budget | `cef9cc0` | **Recommendations lean to the upper-end budget; above-range items offered as *extending*** |
| Part 2 UI | `f384386` | "Move to…" UI (domain-picker modal) |
| fix #1 | `34e9b2a` | Move guard — block a **second** move of an already-moved row (no duplicate / lost edit) |
| bridge | `7d57549` | **Cross-domain "near-miss" bridge** — surface firm distinctions filed under the wrong domain |

### Plain-English of each big piece
- **Distinctions cascade:** a firm manager can now **edit**, **switch off**, and **move** any distinction (platform or their own) in one unified list. A firm's edits *replace* the platform version and *stick* (the firm closest to the client wins). All firm-scoped + IDOR-safe.
- **"Why this recommendation" panel:** after a session, the advisor sees an honest breakdown — detected domain, the lenses (engagement/ceiling/budget), which distinctions fired (and by how much, e.g. `firm distinction +10`), the full template scores, and the recommendation. This is the *report* half of the feedback loop.
- **Cross-domain bridge:** distinctions only fire within the *detected* domain. The bridge flags when one of the firm's OWN distinctions is filed under a **different** domain yet matched this session — i.e. it's in the wrong place. Shown in the panel as "Filed elsewhere — may belong here." (Informational only for now — see decisions.)
- **Upper-end budget:** a 2–3 meeting engagement now fills toward the upper end (e.g. budget 3 → 3 templates: 1 stretch above-range + 2 in-range), instead of stopping at 2. Quality floor (R17 genuine-fit) kept, so no padding.

---

## 2. Product decisions made today

1. **Case-study review = the firm's team-development engine** *(saved to memory `design-case-study-review-team-dev`)*.
   - Advisors **see** the reasoning (the trace); only the **firm manager** has authority to **move** a distinction.
   - Two jobs at once: **quality control** (only the owner re-files the firm's IP) + **education** (the team's practice rises to the owner/manager's skill, because the manager curates what fires and where).
2. **The one-click "Move it here"** belongs in the **firm-manager case-review area (manager-only)** — NOT on the advisor's session panel. The advisor panel surfaces the near-miss informationally only. *(Why: advisor-vs-manager authority + the advisor screen shouldn't reach across to firm-manager endpoints.)*
3. **`systems` vs `data-systems` are two REAL, distinct domains** (operational systems/process/tech vs data-integrity/financial-data-quality; different engagement types — facilitation vs education). **Decision: keep both + the cross-domain bridge** (built today). Do NOT merge them.
4. **The "Decision Framework" tab is a raw-JSON developer tool** — the friendly versions are the Advisory Staircase + Advisory Distinctions tabs. Open question (below): should an ordinary firm manager even see it?

---

## 3. ROADMAP — the Case-Study Feedback Loop (next session)

This is the build that realises the team-development vision. **Foundation-first, three steps:**

1. **Shared case-study database** (localStorage → MySQL). *The foundation.* Today a saved case study only lives on the advisor's own machine, so a manager can't see their team's sessions. Moving cases into the firm DB makes them firm-wide and reviewable. **Also closes the last security gap — the `cases.js` IDOR.** *(This is the existing ACTIONS.md P2 "Case-study DB migration" item, now the keystone.)*
2. **Manager case-review area** — a screen where the firm manager browses advisors' saved case studies, opens each one's reasoning (the "Why this recommendation" trace + near-misses), and judges it ("agree" / "fix that").
3. **One-click move (manager-only)** — lives in that review area, where moving a distinction is genuinely the right person doing the right job. Reuses today's move endpoint + the firm-own domain-change.

**The DB is the heavy lift; steps 2–3 are lighter once it exists.** Connecting MySQL locally *also* lights up several Firm Manager tabs that are blank today (see §5).

**Mike's open choice for tomorrow:** start building toward this (begin with the DB), or keep testing what shipped / pick something lighter first.

---

## 4. The "step 6" close-out for the cascade branch (when ready)
Before merging `feat/distinctions-cascade` → `master`: a clean `nuxt build`, a final click-through (edit / move / switch-off / the panel / the bridge), and confirm the labels. Then merge. *(Not done yet — branch is feature-complete and green, but a deliberate merge gate remains.)*

---

## 5. The three "mysterious" Firm Manager tabs (explained)

All three are **fully built but blank in dev** because they need infrastructure that isn't wired locally.

- **Document Library** — a per-firm PDF store (firm's logic tables, playbooks), shown to that firm's advisors. **Needs Google Drive** connected (service-account key + folder). Blank in dev = no Drive.
- **Decision Framework** — the *raw-JSON* firm-override editor (version history + restore). It's the technical/catch-all version of "override the firm's config"; the **friendly** versions are Advisory Staircase + Advisory Distinctions. **Needs the database**. Open question: hide it / make it admin-only, since a domain-expert manager would never hand-edit JSON.
- **Templates & Videos** — (a) import the firm's **own** master template export (`search_content` JSON from the Advisor-e master app) vs the shared default, with version history; (b) add **training video URLs tagged to a domain** that surface to advisors. **Needs the database** (+ the export file for templates).

**Net:** connecting **MySQL** (and Google Drive) is what makes Document Library, Decision Framework, Templates & Videos, *and* the case-study review all work. They're not broken — they're disconnected in dev.

---

## 6. Dev environment — how to run + current state

**Run the app (two processes):**
- **Backend** (Restify, port 4000, **Node 14.15** locked runtime): export `.env` into the shell, then run with the exact-path binary:
  `set -a && . ./.env && set +a && "C:/Users/Mike Barnes/AppData/Local/nvm/v14.15.0/node.exe" server/restify-server.js`
  (The standalone backend does NOT auto-load `.env`; it needs `OPENAI_API_KEY`, `JWT_SECRET`, `NODE_EXTRA_CA_CERTS` exported.)
- **Frontend** (Nuxt, port 3000, Node 20): `npm run dev`. Dev URL `http://localhost:3000` (→ `/advisor`); Firm Manager at `/firm-manager` (localhost dev-bypass auto-logs in as `dev-firm-001`, manager role).

**Dev-server OOM note:** Nuxt 2 dev leaks memory across **recompiles**. A *burst of edits* can still push it past 12GB → crash (exit 134). It does **not** leak while you just *use* the app (no recompiles). Fix: a fresh `npm run dev` restart clears it. `build.cache` is the next lever if it keeps biting.

**Dev data state (gitignored JSON, dev-firm-001):**
- `pd-39` reset to **pristine** (the earlier stray copies cleaned up).
- **One seeded test distinction left in place on purpose:** a firm-own row in the **`systems`** domain — *"Lack of financial controls and approvals"* → Financial Systems Review. It exists so the **bridge** demonstrates live: run a data/financial-controls session (detects `data-systems`) and the panel shows it as a near-miss "currently in systems." **Remove it via Firm Manager → Advisory Distinctions (systems domain) if you want a clean slate.**

---

## 7. Open questions / decisions for Mike

1. **Tomorrow's direction:** start the case-study DB foundation, or keep testing / something lighter?
2. **Decision Framework tab:** hide it / make it admin-only (since the friendly Staircase + Distinctions tabs cover the real need)?
3. **Merge `feat/distinctions-cascade` → `master`?** (after the step-6 close-out walkthrough.)
4. **Bridge wording:** does "Filed elsewhere — may belong here" read well on screen? (first-pass labels throughout — confirm.)

---

## 8. Related docs / memory
- [`DISTINCTIONS-CASCADE-PLAN.md`](DISTINCTIONS-CASCADE-PLAN.md) — the original cascade model (now largely built).
- [`ACTIONS.md`](ACTIONS.md) — canonical task list (updated with today's outcomes).
- Memory: `design-case-study-review-team-dev`, `design-distinctions-cascade`, `north_star_vision`, `session-2026-06-17`.
