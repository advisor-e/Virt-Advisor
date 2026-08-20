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

## Action items

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
