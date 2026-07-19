# Session Notes — 2026-07-20 · Version-Pull Recording Rule + branch working agreement

> **For the laptop session (and the master coding team).** Briefing on the decisions
> taken on the desktop 2026-07-20 and the logic behind them, so both machines share the
> same understanding. Docs only this session — no code, no behaviour change.

## What happened

- **The two-machine branches are merged on GitHub.** The laptop merged
  `feat/business-performance-report` into `master` (`0f9c9f6`), and that merge also
  folded in `feat/course-builder-v2` (`180618f`). The desktop fast-forwarded its local
  `master` and moved onto it; `feat/course-builder-v2` is retired (fully contained in
  master, left in place for history). Suite on merged master: **1,266 green**.
- **The laptop's branch stays active.** As of this note it carries **11 commits not yet
  in master** (the 2026-07-18 report review sweep + the Mike-approved R1–R12 fixes,
  three of them SEC). Nothing in this session touches report code, so there is no
  interference.
- **Shipped to master (`9f2f61a`, Mike-approved wording + locations):** the
  **Version-Pull Recording Rule** — see `design/DEPLOYED-VERSIONS.md` (the ledger),
  the README front-door notice, the rule in `CLAUDE.md`, and the backfill row in
  `design/ACTIONS.md` (`deployed-versions-backfill`). The same rule shipped the same
  day to the Advisor Collaborate repo (its PR #74).

## The logic (Mike-aligned working agreement)

1. **UAT runs a snapshot, not the tip.** Mike confirmed UAT has only the older "main
   Virt Advisor" code — the course-builder and report work is NOT in UAT. That is
   normal; the discipline that matters is knowing **exactly which commit** each
   environment runs. Today nobody has that recorded — hence the ledger, seeded with two
   honest "commit unknown" rows (production go-live 2026-07-13, UAT). Mike emailed the
   master-app team 2026-07-20 to establish both; when answered, fill the rows and
   consider a `uat-<date>` tag (tag wording to be approved by Mike first).
2. **Master = finished work only.** It is understood to be ahead of UAT. No direct
   development commits; every new piece of work starts on a fresh branch cut from
   master and merges back only when finished and signed off. (Docs/governance commits
   like today's `9f2f61a` are the accepted exception.)
3. **The rule itself:** any pull of this repo into any environment beyond a developer
   machine must be recorded at pull time in `design/DEPLOYED-VERSIONS.md` — date,
   environment, exact commit hash, who, notes. **A deployment is not complete until its
   row is written.**

## What the laptop should do next session

1. **Merge `master` into `feat/business-performance-report`** (settles things early and
   small): brings in the rule (its CLAUDE.md session-enforcement included) and today's
   ACTIONS.md row. Expect at most a trivial `design/ACTIONS.md` merge — both machines
   added lines to it in different regions; hand-merge keeps both.
2. Carry on with report work as normal; when the branch next merges to master it should
   arrive already reconciled.
