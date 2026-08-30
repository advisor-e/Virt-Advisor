# Security Audit Risk Acceptance

**Date:** May 2026
**Owner:** Mike Barnes
**Review cycle:** Quarterly, or when Nuxt 2 is retired from the stack

---

## Known High Vulnerabilities — Nuxt 2 Dependency Tree

Running `npm audit --audit-level=high` reports high-severity vulnerabilities, all
embedded in Nuxt 2's internal build toolchain. (As of the June 2026 reconciliation to
the locked Nuxt 2.14.0 there is also **one accepted *critical*** build-time advisory —
see "Accepted critical build-time advisories" below.)

### Affected packages

| Package | Issue | Location |
|---|---|---|
| `braces < 3.0.3` | Uncontrolled resource consumption | webpack → watchpack → chokidar (dev build tool) |
| `vue-template-compiler >= 2.0.0` | Client-side XSS | Build-time template compiler |
| `serialize-javascript` | Arbitrary code injection | webpack build pipeline |
| `cacache` | Prototype pollution | terser-webpack-plugin |

### Why these cannot be resolved

`npm audit fix --force` resolves them by upgrading to Nuxt 4. This project is
locked to Nuxt 2 (see governance framework §2). Nuxt 2 is end-of-life and its
internal dependencies will not receive security patches. Upgrading to Nuxt 3/4
is a full application rewrite, not a dependency bump.

### Why the risk is accepted

All affected packages are **build-time tools** (webpack, watchpack, template
compiler). They run during `npm run build` and `npm run dev` on developer
machines only. They are not present in, or reachable from, the deployed
application at runtime. The exploitability of these vulnerabilities in a
local build context is negligible.

---

## Accepted critical build-time advisories — Nuxt 2 dependency tree

Pinning the stack back to the locked **Nuxt 2.14.0** (stack reconciliation, June 2026)
surfaced critical advisories that the drifted-newer 2.18.1 had transitively patched.
After review, the following **critical** advisory is **risk-accepted** on the same basis
as the high-severity items above — build-time only, not runtime-reachable, unfixable
within the locked stack.

| GHSA | Package | Reaches runtime? | Fix path |
|---|---|---|---|
| `GHSA-phwq-j96m-2c2q` | `ejs` (template injection) | **No** — pulled in only by `webpack-bundle-analyzer` (a build-time bundle report). Not in, and not reachable from, the deployed app. | Only via `nuxt@4` (SemVer-major, **forbidden** by the Stack Constitution). Safe `npm audit fix` does nothing. |

This single root advisory is also why `@nuxt/webpack` and `webpack-bundle-analyzer`
report as critical (they depend on the vulnerable `ejs`). Accepting the one `ejs`
advisory covers all three package-level criticals.

### Pre-commit hook policy

The pre-commit hook runs **`node scripts/audit-gate.js`** (not a bare `npm audit`).
The gate blocks the commit on **any critical advisory** — a new install or an escalation —
**except** the specific GHSA ids in that script's `ALLOWLIST`, each of which is documented
in the table above. The gate never blanket-disables the critical check: a *new*, un-listed
critical still blocks. **Accepting a new critical requires two changes together** — a row
in the table above **and** its GHSA id in `scripts/audit-gate.js` — and a team sign-off.

Developers must not install new packages with high or critical vulnerabilities
without explicit team discussion (governance framework §5.6).

---

## Accepted high advisory — `playwright` 1.34.3 (dev-only, added 2026-08-21)

**GHSA-7mvr-c777-76hp · high · `playwright` < 1.55.1** — Playwright downloads and
installs browser binaries **without verifying the authenticity of the TLS
certificate**. An attacker able to intercept that download could serve a modified
browser binary.

### Why the published fix cannot be taken

The fix is `playwright` **1.55.1+**, which declares `engines.node >= 18`. Stack
Constitution requirement 9 locks the runtime to **Node 14.15**, and the
one-directional rule forbids raising a locked version to accommodate a package.
**1.34.3 is the last release declaring `node >= 14`** (1.35.0 moves to `>= 16`),
verified against the registry on 2026-08-21. So the compliant options were 1.34.3
with this advisory, or no browser driver at all.

### Why the risk is accepted, and what shrinks it

- **Dev-only.** It is a `devDependency`. It is never imported by the Nuxt app or the
  Restify backend, and never reaches UAT, production, or the master app.
- **The vulnerable step is disabled for everyone by default.** `.npmrc` sets
  `playwright_skip_browser_download=1`, so the browser download — the *only* thing
  this advisory concerns — **does not run on any machine as a side effect of
  `npm install`**. Verified: the install prints *"Skipping browsers download…"* and
  adds two text-only packages. The master team's install pulls no binaries.
- **Exposure is one deliberate command, on a developer machine.** A developer who
  wants to run a visual check runs `npm run visual:setup`, which fetches Chromium
  only (~265 MB, versus 604 MB for all three engines). That is the sole moment the
  advisory applies.
- ⚠ **The laptop's network runs Avast TLS interception** (`CN=Avast Web/Mail Shield
  Root`), which is exactly the interception condition the advisory describes. This
  is recorded rather than waved away: it is the reason the download is off by
  default rather than merely "unlikely to matter".

### 🔴 Outstanding — this needs the team sign-off the policy requires

The rule immediately above ("Developers must not install new packages with high or
critical vulnerabilities without explicit team discussion", governance §5.6) has
**not** been satisfied by a team discussion. This package was added on **Mike's
explicit instruction on 2026-08-21** to close to-do item **4.25** (nothing in the
project can see whether a screen renders correctly). That is the product owner's
call and it is recorded here as such — but it is **not** the same thing as the §5.6
team discussion, and this note exists so nobody later mistakes one for the other.

The gate is unaffected either way: this advisory is **high**, and
`scripts/audit-gate.js` blocks only on criticals, so no allowlist entry was added
and none is needed.

---

## Accepted high advisory — `defu` ≤ 6.1.4 in the Nuxt 2 tree (reviewed 2026-08-25)

**GHSA-737v-mqg7-c878 · high · `defu` <= 6.1.4** — prototype pollution through a
`__proto__` key supplied in the **defaults argument** of a `defu()` call.

### What is actually installed — the to-do item had this wrong

Item 4.40 recorded *"four copies inside that range"*. The lockfile holds **five physical
copies**, of which **three are vulnerable** and **two are already patched**:

| Copy | Version | State |
| --- | --- | --- |
| `node_modules/defu` (serves `@nuxt/config` + `@nuxt/static`) | 2.0.4 | vulnerable |
| `@nuxt/loading-screen/node_modules/defu` | 5.0.1 | vulnerable |
| `serve-placeholder/node_modules/defu` | 5.0.1 | vulnerable |
| `@nuxt/telemetry/node_modules/defu` | 6.1.7 | patched |
| `rc9/node_modules/defu` | 6.1.7 | patched |

The item counted four *dependency edges* as copies, and did not notice the two safe ones.

### 🔴 These are NOT build-time-only, and the item said they were

Item 4.40 recorded *"none of the four is reachable from the deployed runtime"*. **npm
classifies all five copies, and all four parent packages, as production dependencies — not
dev.** `@nuxt/config` loads the configuration when the SSR server starts, and
`serve-placeholder` is runtime 404 middleware. So the reasoning the general Nuxt 2
acceptance above rests on — *"build-time tools only … not present in or reachable from the
deployed runtime"* — **does not apply to these**, and this entry does not borrow it.

### Why the risk is accepted anyway

- **Nothing hostile reaches a `defu` call.** The advisory needs an attacker-supplied
  `__proto__` key in the *defaults argument*. All four call sites were traced on
  2026-08-25: `@nuxt/config` merges `nuxt.config` values, `@nuxt/static` and
  `@nuxt/loading-screen` merge module options, `serve-placeholder` merges its own
  options object. **Every one is our own configuration; none takes request data.** The code
  runs; the vulnerable path does not.
- **The fix is forbidden by our own policy, not merely inconvenient.** CLAUDE.md’s npm-audit
  policy permits a fix *"only for packages outside the Nuxt 2 build toolchain"*. Every copy
  arrives through the locked Nuxt 2.14.0 dependency chain.
- **The gate is unaffected.** This is **high**, and `scripts/audit-gate.js` blocks only on
  criticals, so no allowlist entry was added and none is needed.

### What a fix would have looked like, recorded so it is not re-derived

A single unscoped `"defu": "6.1.7"` override would remove the advisory from the tree
entirely, and the compatibility evidence is good: every consumer uses only the base
`defu(a, b)` call — none touches `.fn`, `.arrayFn` or `.extend`, the three
helpers renamed between 5 and 6. `@nuxt/config` and `@nuxt/static` use
`_interopDefault`, and defu 6 exports a `default` key that is the function itself.
6.1.7 already installs in this tree under `engine-strict`, and defu declares no
`engines` at any version. **It was not done**: Mike’s ruling, 2026-08-25 — *"we stick to
the rules"* — because it buys no real security here and disturbs a locked toolchain.

---

## Action items

- [ ] **Re-check `defu` when Nuxt 2 is retired.** The three vulnerable copies exist only
      because Nuxt 2.14.0 pins them. Nothing else can move them under the lock.
- [ ] **Put the `playwright` high advisory (GHSA-7mvr-c777-76hp) to the team for the
      §5.6 sign-off.** Added on the product owner's instruction; not yet team-reviewed.
- [ ] **Re-check the Playwright Node floor when the Node 14.15 lock is ever revisited.**
      If the runtime moves to Node 18+, `playwright` 1.55.1+ resolves this advisory
      outright and the `.npmrc` suppression can be reconsidered. Until then, 1.34.3
      is pinned exactly and must not be bumped.
- [ ] When Nuxt 2 is retired in favour of a modern framework, re-run a full
      audit and resolve all remaining issues before the first production deployment.
- [ ] If any vulnerability in this list is re-classified as critical by npm,
      escalate immediately and do not ship until resolved.
