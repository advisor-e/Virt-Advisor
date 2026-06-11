# Stack-Drift Reconciliation Plan

> **Status: PLAN — env prep done 2026-06-11, install not yet executed.** Node 14.15.0 is now
> installed and ready (see Runbook step 2); the risky end-of-day dependency install still pending.
> Authored 2026-06-09. Captures the agreed approach for
> bringing the two drifting dependencies back into line with the Stack Constitution
> (`CLAUDE.md`). The risky step (the install) is **end-of-day work** — see Runbook.
>
> **Governing principle (non-negotiable):** Node **14.15** is fixed. We reconcile *toward* the
> Constitution — restify and Nuxt come back to the locked baseline; the drift is **never**
> ratified as the new normal. (Ref: `CLAUDE.md` → Stack Constitution; memory
> `feedback-stack-constitution-never-optional`.)

---

## 1. What is actually out of line

Only two dependencies drift from the Constitution. Everything else already complies
(`pug ^2`, `vue ^2.6`, `vue-i18n ^8`, `openai ^4`, JavaScript-only, no `.ts`).

| Dependency | Installed now | Target | Why |
|---|---|---|---|
| **restify** | `^11.1.0` | **`9.1.0`** (exact) | restify 11 is an **unauthorized version drift from the locked baseline** — reason enough on its own (see §2). 9.1.0 also declares Node ≥10, is the security-patched line, and is the version npm's own audit fix selects. |
| **nuxt** | `2.18.1` | **`2.14.0`** (exact) | Team baseline is 2.14.0; 2.18.1 is a silent bump away from spec. |
| **engines** | *(missing)* | add `"node": "14.15.x"` | Nothing currently stops the next session drifting again. |

---

## 2. Verified facts (npm registry, read-only — no installs were run)

```
restify@8  engines.node -> >=8.3.0
restify@9  engines.node -> >=10.0.0   (target — Node 14.15 is in range)
restify@10 engines.node -> >=10.0.0
restify@11 engines.node -> >=10.0.0

restify 11.1.0 pins find-my-way ^7.2.0  -> resolves 7.7.0, engines.node >=14
restify 9.1.0  pins find-my-way ^2.0.1
find-my-way 7.x and 8.x engines.node    -> >=14   (NOT >=16)
```

**Why the reconciliation rests on governance, not the runtime claim.** The binding reason to
move off restify 11 is simply that it is an **unauthorized version drift from the locked
baseline** (Stack Constitution: restify is locked to match the Advisor-e master app). That holds
regardless of any runtime question.

**On the "restify 11 needs Node 16+" claim — UNVERIFIED.** The `CLAUDE.md` drift box states this,
but nothing checked here substantiates it: restify 11 *declares* Node `>=10`, and the router it
pins (`find-my-way 7.7.0`) only requires Node `>=14` — both satisfied by Node 14.15. The precise
reason restify 11 was flagged as Node-16+ incompatible (another transitive dep, the `spdy` native
binding the HANDOFF notes, or an empirical boot failure) has **not been reproduced**. Proving it
either way needs a full transitive-`engines` trace or actually booting restify 11 on Node 14.15.

> **Therefore: `CLAUDE.md` is left UNCHANGED.** An earlier draft of this plan proposed
> "correcting" the drift-box wording; that proposal was withdrawn after the inference behind it
> (find-my-way 8.x / transitive deps forcing Node 16+) was disproven. We do not edit the
> governance source of truth on an unproven cause. The reconciliation does not depend on
> resolving this — we are moving off restify 11 on drift-from-baseline grounds either way.

**Why 9.1.0 over 10.x:** the earlier `npm audit` resolves the restify `find-my-way` ReDoS
vulnerability by installing **restify 9.1.0**, which means the 10.x line still carries that
vuln. So 9.1.0 wins on both Node-14 compatibility *and* security.

---

## 3. Restify API surface we depend on (breakage check)

`server/restify-server.js` uses a small, stable surface:

- `restify.createServer(...)`
- `restify.plugins.jsonBodyParser({ mapParams: false })`
- `restify.plugins.queryParser()`
- `server.use(...)`, `server.pre(...)`
- `server.get / post / put / del(...)`

**Action at execution time:** confirm `restify.plugins.jsonBodyParser` and `queryParser` exist
under the same names in restify 9.1.0 before relying on the boot test. (Plugin names are the
most likely breakage between majors.)

**Why the test suite will NOT catch a restify break:** the route tests call handlers directly
and never boot restify. A renamed/removed plugin would pass `npm test` but fail at server
start. The boot + `/api/health` check in the Runbook is the only reliable verification.

---

## 4. Engines pin — recommended value

Add to `package.json`:

```json
"engines": { "node": "14.15.x" }
```

`engines` is **advisory** by default (npm warns but proceeds). To make it actually *hold the
line* — which is the whole point, since "nothing currently holds the line" is one of the drift
items — also add an `.npmrc`:

```
engine-strict=true
```

This makes `npm install` **fail** on a non-matching Node version instead of silently
proceeding. Recommended, since the missing guard rail is exactly what let the drift happen.

---

## 5. Execution Runbook (END-OF-DAY — VS Code closed)

> The install churns Nuxt's large `@nuxt/*` tree. Per memory `feedback-node-modules`, this is
> overnight work with VS Code closed; **never wipe `node_modules`** — the scoped install below
> only touches the named packages and their subtrees.

1. **Branch first** (recommended for this one change — dependency downgrades carry real
   rollback risk; a branch lets us bail cleanly if the backend won't boot):
   `git checkout -b chore/stack-reconciliation`
2. **Confirm the runtime is on Node 14.15 before anything.**
   - **Node 14.15.0 is already installed** (done 2026-06-11). `nvm install 14.15.0` **fails on
     this machine** — a known nvm-windows bug where antivirus removes the bundled-npm temp zip
     mid-extract (`...npm-v6.14.8.zip: The system cannot find the file specified`), rolling the
     whole install back. It was instead **placed manually**: the official
     `node-v14.15.0-win-x64.zip` from nodejs.org was extracted into
     `…\AppData\Local\nvm\v14.15.0\`; nvm now lists `14.15.0` and it runs (node v14.15.0 /
     npm 6.14.8). **Do NOT re-run `nvm install 14.15.0` — it will fail; the version is already there.**
   - **A standalone `C:\Program Files\nodejs` (Node 20) shadows nvm on PATH**, so `nvm use 14.15.0`
     may NOT change `node -v` (it can still report 20). **Therefore do not rely on `nvm use`** for
     this task. Instead **invoke the 14.15 runtime directly** for the install + every verify step,
     e.g. `& "$env:LOCALAPPDATA\nvm\v14.15.0\node.exe" "$env:LOCALAPPDATA\nvm\v14.15.0\node_modules\npm\bin\npm-cli.js" …`,
     so the work genuinely runs on 14.15 regardless of PATH. (Fixing the shadowing is a machine-wide
     change affecting other projects — deliberately avoided.)
3. **Edit `package.json`:** pin `"nuxt": "2.14.0"`, `"restify": "9.1.0"` (exact, no `^`), add
   the `engines` block (§4). Add `.npmrc` with `engine-strict=true`.
4. **Scoped install (no wipe):**
   `npm install nuxt@2.14.0 restify@9.1.0 --save-exact`
5. **Verify, in order:**
   - `npm ls nuxt restify` → confirms 2.14.0 / 9.1.0 actually resolved.
   - `npm run backend` → server boots with no plugin/binding error.
   - `curl http://localhost:4000/api/health` → 200 (proves the restify API surface still works).
   - `npm test` → must stay **180/180**.
   - `npx nuxt build` → smoke check the frontend build (it is a CI gate).
6. **Update `design/ACTIONS.md`:** mark the three P1 stack-drift items resolved.
7. **Commit** (one logical change), push, and — if a branch was used — open for review/merge.

---

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Nuxt downgrade churns `node_modules` → machine lock-up | End-of-day, VS Code closed, scoped install only, never wipe `node_modules`. |
| restify plugin API renamed between v11 → v9.1.0 | Boot the server + hit `/api/health` (tests can't catch it). Confirm plugin names first (§3). |
| Dev machine not actually on Node 14.15 | Step 2 verifies `node -v` before touching anything; `engine-strict` enforces it thereafter. |
| Nuxt 2.14.0 build differs from 2.18.1 | `npx nuxt build` smoke check in step 5; branch allows clean rollback. |

---

## 7. What we will NOT do

- Will **not** raise the Node target (Node 14.15 is locked).
- Will **not** run `npm audit fix --force`.
- Will **not** wipe `node_modules`.
- Will **not** edit the `CLAUDE.md` governance doc — its "restify 11 needs Node 16+" line is
  unverified, not disproven, and we do not change the governance source of truth on an unproven
  cause (see §2).
