# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-24 · Laptop · branch `feat/advisor-progress`

**What happened.** Item **4.7 is DONE and closed.** `158ff4c` is pushed. The install ran and
verified: engine scan **0 offenders across 1,964 packages**, down from seven. Suite 6,283
green, lint 0 errors, backend `/api/health` 200, `nuxt build` exit 0.

✅ **The "DO NOT MERGE THIS BRANCH" warning from last session is LIFTED.** The install it was
waiting on has passed. The branch is 17 ahead, 0 behind `master`.

🔴 **THE ONE THING THE OTHER MACHINE MUST KNOW — `npm install` will now fail for you.**
`engine-strict=true` is live, and it checks the **root project too**. So:

- **npm 6** (bundled with Node 14.15) — ignores `overrides`, rewrites the v2 lockfile to v1.
  Never run it here.
- **npm 10** (Node 20) — refuses the repo outright: `package.json` declares `engines.node 14.15.x`.
- **npm 8 on Node 14.15.0 is the only combination that works.** Get it with
  `npm install npm@8.19.4` into a scratch folder, then call its `npm-cli.js` with Node 14.15’s
  `node.exe`. My copy is in this laptop’s temp folder and will not survive; you need your own.

The full reasoning is in [`../.npmrc`](../.npmrc), beside the settings — read it before any install.

**Four findings filed, none fixed:** 4.41 (`@types/node` is in the tree; req 2 bans it by name —
pre-existing, score 5 by the deviation rule), 4.42 (`to-do.md`’s hand-written half describes six
closed items and misses ten live ones), 4.43 (a flaky test mutating global `NODE_ENV`), 4.44 (the
engine scan `.npmrc` tells you to run does not exist). **17 live items now.**

**Still true from last session:** `v0.10.0` has awaited pull by the master team since 2026-08-22,
with three earlier releases also unpulled. Not ours to close.
