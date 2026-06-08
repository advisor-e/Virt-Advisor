# Security Audit Risk Acceptance

**Date:** May 2026
**Owner:** Mike Barnes
**Review cycle:** Quarterly, or when Nuxt 2 is retired from the stack

---

## Known High Vulnerabilities — Nuxt 2 Dependency Tree

Running `npm audit --audit-level=high` reports 30 high-severity vulnerabilities.
**None are critical. All are embedded in Nuxt 2's internal build toolchain.**

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

### Pre-commit hook policy

The pre-commit hook runs `npm audit --audit-level=critical`.
Any **critical** vulnerability — whether from a new package install or an
escalation of an existing issue — blocks the commit until resolved.

Developers must not install new packages with high or critical vulnerabilities
without explicit team discussion (governance framework §5.6).

---

## Action items

- [ ] When Nuxt 2 is retired in favour of a modern framework, re-run a full
      audit and resolve all remaining issues before the first production deployment.
- [ ] If any vulnerability in this list is re-classified as critical by npm,
      escalate immediately and do not ship until resolved.
