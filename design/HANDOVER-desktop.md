# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-10 (second session) · Desktop · branch `feat/firm-quiz-builder-ui`

**Built and closed today: 4.85 — the Handbook is built from `origin/master`.** Both
machines now publish the same page, neither can erase the other's features, and the line
under the title names the master commit and how many commits each machine holds beyond it.
`npm run handbook -- --working-tree` previews unmerged pages and says so on the page.
Closure on [`to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2.

**The consequence for both machines:** a feature shows on the Handbook once its pull
request has landed, not when it is pushed. Read the banner's counts out at startup.

Suite **9,700 green** (471 suites). Tree clean once this commit lands. Nine live items.
Nothing active on this machine except 4.87's flag (below).

**v0.11.0** is cut on `0f0fdab`, awaiting the master team's pull; the ledger row is the next
thing to write when it lands.

**Next session, bring to Mike first** (his instruction of 2026-09-10): the two open decisions
on **4.87 Outcome Learning** — the evidence floor, and hold-back only or both directions —
then `/speckit-clarify` on his yes. Its `activeOn` is the desktop. Then **4.84**, the hub
notification dots, which is unblocked and waits on us.

**LAPTOP:** none of your files were touched. `scripts/build-handbook.js`,
`scripts/handbook-shell.html`, the Handbook Brief, `.claude/commands/startup.md` and
`WORKING-AGREEMENT.md` changed; merge `master` in at startup and your next
`npm run handbook` will carry the banner.
