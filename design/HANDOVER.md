# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-24 · Laptop · branch `feat/advisor-progress`

**What happened.** Item **4.7** (engine-strict) — half done. `0a8d182` is pushed.

🔴 **DO NOT MERGE THIS BRANCH TO `master`.** It carries `engine-strict=true` in
`.npmrc` with three new `overrides` in `package.json`, and **no install has proved
they resolve**. engine-strict makes `npm install` hard-fail by design, and the master
team could not repair a broken install from their side. The branch is safe where it
is; it is not safe on `master` yet.

**First task next session — Mike's instruction.** Run the install and verify it.
Everything you need is in 4.7's note on [`features/to-do-items.json`](features/to-do-items.json):
dedicated branch, back up `package.json` + `package-lock.json`, VS Code closed, never
wipe `node_modules`, and **npm 6 must never run here** — use nvm's Node 20.20.2 / npm
10.8.2 with the Avast cert. Verify in order: lockfile diff → engine scan (expect zero)
→ lint → suite → backend boot + `/api/health` → `nuxt build`.

**What the job turned out to be.** Not two packages — **seven**. Five arrived
2026-07-21 with the component-test tooling (`bbc476e`) and were never logged as a
Stack Constitution deviation, so 4.7 understated itself for a month.

**Also filed: 4.40** — a HIGH `defu` prototype-pollution advisory affecting four
copies already in the Nuxt 2.14.0 tree. Found while checking 4.7, unrelated to it,
build-time only. 14 items on the list now.

**Still true from last session:** `v0.10.0` has awaited pull by the master team since
2026-08-22, with three earlier releases also unpulled. Not ours to close.
