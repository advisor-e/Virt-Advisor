# Release v0.6.0 — notes for the master coding team

> **Tag:** `v0.6.0` · **Commit:** `9a29aee` · **Cut:** 2026-07-21
>
> **Pull the tag, not `master`.** `master` keeps moving; the tag does not. Report any UAT
> bug against `v0.6.0` so it can be matched to exact code.
>
> **Please reply with the tag you installed**, so [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md)
> can record it. Per the binding Version-Pull Recording Rule, a deployment is not complete
> until its row is written — and we maintain that ledger on our side, because you have no
> commit access here.

## What this supersedes

UAT has been running `709bac5` since 2026-07-14. **This tag is 174 commits ahead of it** —
47 fixes, 42 features, plus tests and documentation. That gap is the reason this is the
first tagged release: it should never be allowed to grow that far again.

Verified at tag time on the locked **Node 14.15**: **1,456 tests / 99 suites green**,
lint 0 errors, `nuxt build` green.

## The headline: Course Builder is now testable

`709bac5` did not contain the Course Builder work. **It does now** — this is the first
release you can actually exercise it in. Quiz banks bind by permanent template ID rather
than typed title, orphaned banks are reported rather than silently dropped, quiz dictation
and post-grading model answers are in, and a real 0% score displays as 0% instead of
hiding.

## New since UAT

**Business Performance Report (six report screens).** A full file-intake pipeline —
Xero/CSV/XLSX parsing with an assembler — feeding Quick Position and EBITDA & DCF, plus
the four earlier models. Every figure carries its provenance on screen: *from file* or
*entered*.

**Firm preferred currency.** A firm picks one currency; every report formats money in it,
grouped by the reader's language. Manager-only to change, everyone sees it read-only.

**Firm quiz overlay + authored-text fencing** in Firm Manager.

**Component scaffolding.** The six report screens now share a headline banner, a slider and
a race-safe recompute mixin instead of six hand-rolled copies.

## Fixes that matter for UAT

- **A slider race** could show figures from a superseded calculation — a stale number
  presented as live. Fixed across all six report screens.
- **A failed recalculation** used to leave stale figures on screen with no warning. It now
  greys them and says so.
- **Silent data defects in file intake**: CSV accounting negatives `(1,234)` were dropped,
  real accounts named "Total …" were discarded, multi-column exports were read
  first-column-only, and fiscal periods were matched on year alone. All now either parse
  correctly or refuse with a message — **none of them fail silently any more.**
- **Sample numbers could substitute for missing figures.** Defaults may still be used, but
  every substitution is now declared back to the screen.
- **Security**: an unbounded XLSX row index (a ~1 KB file could exhaust memory), an intake
  error path that could echo a server file path, and a JSON body parser with no size limit.
  All closed.
- **Translation** silently fell back to English for a whole locale when a payload exceeded
  a URL length limit. Fixed.

## What has NOT changed

- **The stack is unchanged and re-verified**: Nuxt 2.14.0, Vue 2, Restify 9.1.0, raw MySQL,
  Pug, Buefy/Bulma, vue-i18n 8, Node 14.15. No TypeScript, no ORM, no second UI library.
- **No database migrations.** Nothing in this release requires a schema change.
- **No new environment variables are required.** `TRUST_PROXY=true` is available and
  **should be set if you run this behind a reverse proxy** — without it, rate limiting keys
  on the socket peer and all users share one bucket. That is the one deployment-affecting
  setting in this release.

## Known limitations — please do not raise these as bugs

- **Three report screens are English-only.** Their labels do not yet route through the
  translation files, so a non-English advisor sees English on those screens. Known, logged,
  and scheduled as its own task.
- **The Team Dashboard shows mock advisors.** A deliberate development stub, not wired to
  the live endpoint yet.
- **No automated component tests.** The tooling landed in this release but the tests
  themselves are not written, so screen-level behaviour has been verified by hand.
- Full detail on every known item is in [`ACTIONS.md`](ACTIONS.md).

## If something is wrong

Report it against **`v0.6.0`**, not "the latest version". If you have already pulled and
the tag was not recorded, tell us the commit hash from `git rev-parse HEAD` and we will
backfill the ledger row.
