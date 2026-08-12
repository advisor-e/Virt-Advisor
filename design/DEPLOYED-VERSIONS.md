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
| 2026-08-04 | Local (master-app team machine) | `2beba9f` — `v0.7.0` plus two documentation-only commits | Carl Allado (master-app team) | Reported to Mike by email 2026-08-09; backfilled the same day. **First uptake of any release tag from this repo.** Contains the whole `v0.7.0` release — the tagged commit is `015eed0`, and the only commits between it and `2beba9f` are `32a277f` + `2beba9f` itself, both release-notes documentation. ⚠ **`npm install` required and NOT yet confirmed with Carl** — `v0.7.0` adds the `@mdi/font` dependency, and without it the Hub's tab icons render blank, which reads as a broken build rather than a missing package. ⚠ Pulled from `master` at a point in time rather than from the `v0.7.0` tag (Working Agreement asks for the tag, because a branch keeps moving and a tag does not); content is identical here bar the two doc commits, so nothing is wrong — noted so the next pull is easier to trace. At the time of this pull `origin/master` was 2 commits further on (`6f44872`, `39c274a`). |

## Releases offered (not yet a deployment)

A tag existing is **not** a deployment. Rows go in the table above only when code is
actually pulled into an environment. This section records what has been cut and handed
over, so an unanswered release is visible rather than assumed.

| Tag | Commit | Cut | Offered to | Status |
|---|---|---|---|---|
| `v0.8.0` | ⏳ **filled at tag time** | 2026-08-13 | Master-app team | ⏳ **NOT YET CUT — this row is written ahead of the tag deliberately, and must not be read as a release that exists.** The tag goes on the merge commit on `master` once the pull request lands, and the hash is backfilled here in the same step. Nothing has been offered to anyone until that happens. 74 commits since v0.7.0: the management cascade reaching all six levels and its two new hub pages, every report rolling up one level, the Template Check screen, the 55 branches whose instruction reached the AI nowhere, and the storage fix below. ✅ **NO `npm install` — `package.json` is byte-identical to v0.7.0**, unlike v0.7.0 which needed one and confused the first pull. 🔴 **The line that matters for testing: a save the database REFUSED used to be written to a scratch file and reported as saved, in any environment not named exactly `production` — so a UAT test could pass having never written to the database.** Fixed. Notes: [`RELEASE-NOTES-v0.8.0.md`](RELEASE-NOTES-v0.8.0.md). Verified before the tag: 5,114 tests green / 300 suites, lint 0 errors, critical-audit gate PASS, `nuxt build` green on this machine. |
| `v0.7.0` | `015eed0` | 2026-08-04 | Master-app team | ~~Awaiting pull~~ **PULLED 2026-08-04 by Carl Allado — see the row above.** Taken as `2beba9f` (the tag plus two documentation-only commits) rather than as the tag itself. 379 commits since v0.6.0: Logic-Lab (incl. the accept button, live-proven), the silent-AI-failure honesty fixes, the Course Builder session slicer, the browser-trust security fix, trace i18n. **New dependency `@mdi/font` — `npm install` required.** Notes: [`RELEASE-NOTES-v0.7.0.md`](RELEASE-NOTES-v0.7.0.md). Verified at tag time: 4,597 tests green / 267 suites, lint 0 errors, critical-audit gate PASS. **Supersedes the unpulled v0.6.0** — pulling v0.7.0 covers both, so v0.6.0 will now never be pulled and that is correct. |
| `v0.6.0` | `9a29aee` | 2026-07-21 | Master-app team | ~~Awaiting pull~~ **Superseded by v0.7.0 before it was ever pulled.** First tag this repo carried. 174 commits ahead of the `709bac5` UAT build, first release containing Course Builder. Notes: [`RELEASE-NOTES-v0.6.0.md`](RELEASE-NOTES-v0.6.0.md). Verified at tag time: 1,456 tests green, lint clean, `nuxt build` green on Node 14.15. |

**Production: nothing has been deployed to production yet.** The app is in UAT testing
only. The first production row will be added when a production deployment actually
happens. Any earlier note in this repo describing a 2026-07-13 production go-live was
incorrect and is withdrawn (master-team clarification, 2026-07-21).
