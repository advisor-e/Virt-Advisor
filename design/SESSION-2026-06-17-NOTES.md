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

## 9. ✅ RESOLVED 2026-06-18 — template inclusion-field semantics

**Outcome:** the inclusion fields each govern a *different* Advisor-e surface and none belongs in
advisor selection — `includedInClient` = whether a CLIENT self-serving in Advisor-e can see the
template; `cpd.isHidden` = CPD log widget; `growth.isHidden` = Growth framework. The advisor engine
was wrongly using `includedInClient` as a proxy for "advisor-recommendable." Fix was engine-side only
(no new field, no master-app change): removed the `includedInClient` filter from the selection path
([`templateResolver.js:173`](../server/utils/templateResolver.js#L173)) and the copy path
([`summaries.js:40`](../server/utils/summaries.js#L40)), with why-comments at both sites. The
`menuSection` (do-the-job-only) gate, the staircase ceiling, the `subSection` logic and scoring were
already correct and were left untouched. Recommendable library widens **131 → ~208** `do-the-job`
templates. 375 tests pass. (Original finding kept below for the record.)

---

### (original finding, 2026-06-17)

**Found while Mike tested EOY:** only 2 of the 4 EOY templates appeared as options. Cause: the
recommendation engine hard-filters the candidate pool to `includedInClient === true`
([`templateResolver.js:172`](../server/utils/templateResolver.js#L172)). E.O.Y Meeting and EOY Quiz
are `includedInClient: false`, so they're excluded before scoring.

**Mike's clarification — the field does NOT mean what the engine assumes:**
- **`includedInClient`** = whether a **CLIENT**, self-serving in Advisor-e **without an advisor**, may SEE
  the template in their own search. It is **NOT** a statement about whether the template is useful for an
  advisor to use *with* a client.
- **`cpd.isHidden`** = whether the template appears in the **CPD log widget**.
- **`growth.isHidden`** = whether it appears in the **Growth framework**.
- These fields exist because some tools are for **advisor benefit** vs **client benefit** in different
  surfaces of Advisor-e. (All 278 templates carry `cpd.isHidden` and `growth.isHidden`.)

**The problem:** the Virt Advisor advisor-recommendation engine is using `includedInClient`
("can a client self-serve see it") as a proxy for "can an advisor recommend it to use with a client" —
the **wrong semantic**. Scale: **147 of 278 templates (53%) are `includedInClient: false`** and therefore
**cannot be recommended by the engine today**. Some are legitimately advisor-only (e.g. "Get the Job"
marketing/pricing — though those are *also* excluded by the `menuSection` get-the-job/get-organised
filter), but others are genuine **advisor-with-client** tools being wrongly excluded — e.g. **E.O.Y Meeting,
5 Layers Questionnaire, Advisory Proposal, Client Onboarding, Capacity/Capability/Opportunity**.

**The meaning + intended use of these JSON fields has never been discussed/specified** for the Virt Advisor
engine. To sort tomorrow:
1. **Specify what each inclusion field means** (`includedInClient`, `cpd.isHidden`, `growth.isHidden`) and
   what advisor-vs-client context each governs.
2. **Decide which field(s) the advisor-recommendation engine should filter on.** Options: (a) a different
   existing field; (b) a **new** Virt-Advisor-specific "recommendable by advisor" flag; (c) drop the
   `includedInClient` filter and rely on the section filters + scoring; (d) a combination.
3. **Governance:** the `search_content` JSON is generated by the **Advisor-e master app** and is **never
   hand-edited here**. So any new/changed field is a **master-app** change (then re-export + re-upload); the
   *engine filter* change is the only part that happens in this repo. Both sides need to line up.

**Why it matters:** this potentially widens the recommendable library well beyond 131 and fixes systematic
under-recommendation across every domain (EOY was just the symptom Mike happened to spot). DECISION-gated —
do not change the filter before the field semantics are agreed.

---

## 8. Related docs / memory
- [`DISTINCTIONS-CASCADE-PLAN.md`](DISTINCTIONS-CASCADE-PLAN.md) — the original cascade model (now largely built).
- [`ACTIONS.md`](ACTIONS.md) — canonical task list (updated with today's outcomes).
- Memory: `design-case-study-review-team-dev`, `design-distinctions-cascade`, `north_star_vision`, `session-2026-06-17`.
