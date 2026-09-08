# Virt Advisor Constitution

This project's constitution already exists and has one home. Spec Kit reads this file; the
rules live elsewhere and are not restated here, so they cannot drift.

## Where the rules are

- **[`CLAUDE.md`](../../CLAUDE.md)** — the Stack Constitution (Nuxt 2, Vue 2 Options API, Pug,
  Buefy, raw MySQL on Restify, OpenAI by REST from the backend only, vue-i18n 8, Node 14.15),
  the engineering standards, the live-app rule that every change needs Mike's explicit
  approval, the debugging protocol, and the rule that AI content surfaces on a hub page.
- **[`design/WORKING-AGREEMENT.md`](../../design/WORKING-AGREEMENT.md)** — how the two
  machines and the master team share the repository: `master` is releasable and reached by
  pull request only, branches merge from `master` at the start of each session, the
  `/startup` and `/shutdown` checklists, and the three write-targets at the end of a session.
- **[`design/features/to-do-items.json`](../../design/features/to-do-items.json)** — the whole
  live list. A feature not on it is not being built; a feature on it names who asked for it.

## How Spec Kit fits

- A Spec Kit feature is one item on the live list, requested by Mike in his own words. The
  specification, plan and tasks are working papers for that item; the feature's Brief in
  `design/features/` remains the record of how the product works.
- Every artefact shown for approval is a committed file before it is approved
  (`CLAUDE.md`, "Save the Artefact"). A spec or plan is such a file.
- The implement step never runs unattended here. Each change it proposes is put to Mike as one
  recommendation and one yes/no question, and the two Husky gates run as they always do.
- Branches are not created by Spec Kit. Work stays on this machine's own branch and reaches
  `master` by pull request.

## Governance

Amendments are made to the documents above, never to this file, which only points at them.

**Version**: 1.0.0 | **Ratified**: 2026-09-08 | **Last Amended**: 2026-09-08
