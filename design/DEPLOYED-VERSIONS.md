# Deployed Versions — the ledger

> **Version-Pull Recording Rule (binding).** Any time this repository's code is pulled,
> installed, or updated in any environment beyond a developer's own machine — UAT,
> production, a demo, or inside the Advisor-e master app — the person doing it must
> record it **at that moment** in the table below: the date, the environment, the exact
> commit hash pulled, who pulled it, and any notes. **A deployment is not complete until
> its row is written.** This is how everyone always knows which version is running
> where, and in what state.

How to find the commit hash you are pulling: `git rev-parse HEAD` immediately after the
pull, or read it from the GitHub commits page. Record the full state honestly — if the
hash wasn't captured at the time, add the row anyway with "commit unknown" and backfill
it as soon as it can be established (see the open rows below).

| Date | Environment | Commit | Pulled by | Notes |
|---|---|---|---|---|
| 2026-07-14 | UAT (inside Advisor-e master app) | `709bac5` — PR #2, `feat/client-knowledge-base` | Master-app team | Confirmed by the master team 2026-07-21. 97 commits behind `origin/master` at the time of confirmation. |

## Releases offered (not yet a deployment)

A tag existing is **not** a deployment. Rows go in the table above only when code is
actually pulled into an environment. This section records what has been cut and handed
over, so an unanswered release is visible rather than assumed.

| Tag | Commit | Cut | Offered to | Status |
|---|---|---|---|---|
| `v0.6.0` | `9a29aee` | 2026-07-21 | Master-app team | **Awaiting pull.** First tag this repo has ever carried. 174 commits ahead of the `709bac5` UAT build, and the first release containing Course Builder. Notes: [`RELEASE-NOTES-v0.6.0.md`](RELEASE-NOTES-v0.6.0.md). Verified at tag time: 1,456 tests green, lint clean, `nuxt build` green on Node 14.15. **When they confirm the pull, add a row to the table above and mark this row deployed.** |

**Production: nothing has been deployed to production yet.** The app is in UAT testing
only. The first production row will be added when a production deployment actually
happens. Any earlier note in this repo describing a 2026-07-13 production go-live was
incorrect and is withdrawn (master-team clarification, 2026-07-21).
