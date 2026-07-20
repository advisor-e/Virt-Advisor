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

**Production: nothing has been deployed to production yet.** The app is in UAT testing
only. The first production row will be added when a production deployment actually
happens. Any earlier note in this repo describing a 2026-07-13 production go-live was
incorrect and is withdrawn (master-team clarification, 2026-07-21).
