# Release Notes — v0.11.1

**Tag:** `v0.11.1` · **Cut:** 2026-09-10 ·
**Previous release:** [`v0.11.0`](RELEASE-NOTES-v0.11.0.md) (`0f0fdab`, 2026-09-10) —
🔴 **withdrawn the same day. Do not pull it. See below.**

**6 commits since v0.11.0**, all from the laptop, merged to `master` by
[PR #78](https://github.com/advisor-e/Virt-Advisor/pull/78).

> 🔴 **v0.11.0 DOES NOT START. THIS RELEASE REPLACES IT.**
>
> `v0.11.0` was tagged, verified and offered a few hours before the fault was found. If it has
> already been pulled anywhere, **replace it with this tag** — there is nothing to salvage from
> a partial install, because nothing in it runs.
>
> **What was wrong.** One route handler in the compliance gate was written as an `async`
> function that also took Restify's `next` callback. Restify refuses to *mount* such a handler
> and asserts **at mount time**, so `server/restify-server.js` threw while registering routes
> and the process exited. Not one broken route — **no routes at all, and no backend.** The Nuxt
> front end starts normally and has nothing behind it, so every screen fails to load its data.
>
> **The fix is the shape of the function, not the check it performs.** Same read, same
> `403 NOT_DECLARED`, same fail-closed behaviour when storage is unavailable.

✅ **NO `npm install` — `package.json` differs from v0.11.0 only in `version`**, and
`package-lock.json` only in the same field. Nothing was added, removed or moved. The npm 8 /
Node 14.15 instructions in the [v0.11.0 notes](RELEASE-NOTES-v0.11.0.md) still apply to a fresh
clone; an existing v0.11.0 tree needs no reinstall.

✅ **No database table changed.** `config/db-schema.sql` is byte-identical to v0.11.0.

**Verified at tag time, on the tagged commit:** 9,749 tests green across 475 suites · lint
0 errors · critical-audit gate PASS · `nuxt build` exit 0 · **and the backend was started and
seen to listen**, which is new — see §3. Runtime target unchanged: **Node 14.15**, backend
CommonJS, Nuxt 2 / Vue 2 / Restify 9.1.0 per the Stack Constitution.

---

## 1. The fault, and how it survived every gate

Worth reading in full, because the interesting part is not the bug.

`requireDeclaration` is item 4.83's compliance gate — the check Mike asked for that stops a
firm recording a client meeting before it has declared it understands its obligations. It was
put on the **backend** deliberately, because a screen is not a control. That part was right.

It was written `async function requireDeclaration (req, res, next)`. Restify's rule
(`node_modules/restify/lib/chain.js`) is that a handler may be `async` **or** take `next`, never
both — and it checks when the route is **mounted**, not when it is called. So the failure is not
a 500 on one route. It is the server exiting during startup with every route unregistered.

**Every gate in this repository passed it:**

- **9,748 tests, all green.** Route tests call handlers directly, as plain functions. A
  signature Restify would reject is a signature a unit test never sees.
- **`nuxt build` exit 0.** The build assembles the front-end bundle. It never starts the API.
- **Lint 0 errors, coverage thresholds met, audit gate PASS.** None of them start anything.
- **`serverWiring.test.js`** — the one test that loads the server bootstrap — **mocks Restify
  away** so it can inspect the route table. A stub has no rules to break. Its own header names
  this exact failure shape, *"green suite, application that would not start"*, and it still
  could not catch this one.

It was found by **starting the app and looking at it**, roughly ten minutes after a green run.

## 2. What else is in this release

**Item 4.84 — notification dots on every hub tab.** Asked for by Mike: *"a red dot next to the
topic"*, *"put the dots in the left hand menu"*, *"every tab"*. Built from
[`mockups/hub-menu-dots.html`](mockups/hub-menu-dots.html), approved after all four of its
questions were ruled.

| Dot | What it means | The words beside it |
|---|---|---|
| 🔴 red | something new arrived in that tab | the tab's own sentence — Compliance: *"2 new items since you last declared"* |
| 🔵 blue | this manager has never opened it | *"Never opened"* |
| 🟠 orange | opened, but not in the last 21 days | *"Not opened in 3 weeks"* |

Red beats blue beats orange. The colour is never the only signal — every dot carries its
meaning in words, for the tooltip and for a screen reader. Under the menu sits a key to the
three and a count: *"6 tabs needing a look"*.

**What a tester should know:** on first sight **every tab will be blue**, at every tier. That is
correct rather than a fault — the app genuinely has no record of anyone opening anything until
this release starts keeping one. It clears itself as a manager goes round the hub.

Storage is one row per manager per tab, on the scope's own row, through the existing
configuration table. **No schema change**, and nothing about a tab's *contents* is stored — one
timestamp, per person, per tab.

## 3. What we changed about how we release

**A test that starts the server.** `tests/unit/serverMounts.test.js` mounts every route against
real Restify, exactly as `npm run backend` does, and fails if any handler cannot be mounted. One
assertion, about 1.5 seconds, no port bound and no database. It is **mutation-verified**:
restoring the async signature fails it with the same assertion the running server threw.

**And the honest limit of that test.** It answers one question — *does the server come up*. The
other thing found in the same ten minutes was a menu whose labels shifted sideways as dots
appeared and disappeared; the guard would have passed that without a murmur. **The lesson is not
"we added a test". It is that the app has to be run and looked at before a tag is cut**, and
that is now what happens here.

## 4. For whoever pulls this

- **Pull `v0.11.1`.** It contains the whole of v0.11.0 — every feature listed in
  [those notes](RELEASE-NOTES-v0.11.0.md) — plus the fix above and item 4.84.
- **No `npm install` needed** over a v0.11.0 tree; a fresh clone follows the v0.11.0
  instructions (npm 8, Node 14.15).
- **The first check after installing should be that the backend starts.** `npm run backend`
  should print `[restify] virt-advisor-api listening on …`. If it exits instead, something is
  wrong before any screen is worth opening.
- **Everything in §7 of the v0.11.0 notes still stands** — what is not in this release, said
  plainly, is unchanged by a patch.
