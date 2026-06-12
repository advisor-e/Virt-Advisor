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

## Action items

- [ ] When Nuxt 2 is retired in favour of a modern framework, re-run a full
      audit and resolve all remaining issues before the first production deployment.
- [ ] If any vulnerability in this list is re-classified as critical by npm,
      escalate immediately and do not ship until resolved.
