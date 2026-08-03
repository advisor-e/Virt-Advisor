# Release Notes — v0.7.0

**Tag:** `v0.7.0` · **Commit:** `015eed0` · **Cut:** 2026-08-04 ·
**Previous release:** [`v0.6.0`](RELEASE-NOTES-v0.6.0.md) (`9a29aee`, 2026-07-21) — still awaiting pull

**379 commits since v0.6.0.** Coming from the `709bac5` UAT build (2026-07-14), read the
v0.6.0 notes first, then these — the two together cover everything since that build.

**Verified at tag time, on the tagged commit:** 4,597 tests green across 267 suites ·
lint 0 errors · critical-audit gate PASS. Runtime target unchanged: **Node 14.15**,
backend CommonJS, Nuxt 2 / Vue 2 / Restify 9.1.0 per the Stack Constitution.

---

## What's new since v0.6.0, by theme

### 1. Logic-Lab — the Firm Manager's decision-logic workbench (PRs #31, #34, #38)

A new Firm Manager Hub tab. A manager types a client sentence, names the template they
expected, and the page shows what the engine actually did — the real detector, the real
distinction classifier, the real score sheet — and why their configuration did or did
not deliver. The "filed elsewhere" probe answers the commonest confusion: a distinction
filed under one area is never read when the words are detected as another, and the page
now says so in plain English.

**The accept button (PR #38):** when the manager names the template they wanted, one
click files a distinction of the firm's own that delivers it — strength computed from
the live gap, outcome PROVED by re-running the phrase through the real engine before
success is reported, automatically reverted if it did not deliver, and every accept
logged (the future mentor-rollup feed). Two guardrails shipped with it: it can only
file into the 14 areas the Advisory Distinctions screen shows (flagged in
`data/domains.json`, held by a locking test), and the row's description is wording the
manager approved in an editable confirm dialog — the app authors none of the firm's IP.

### 2. Honesty when the AI fails (PR #35)

A failed distinction-classifier call (dead key, broken certificate, network) used to
return the same empty result as a genuine "nothing matched", and eight surfaces told
advisers the AI had read their distinctions when it had not. The engine now returns an
explicit ok/failed flag, the saved decision trace records it, and all eight surfaces
state the fault honestly — including withholding advice that would otherwise send a
manager to fix a problem nobody measured. Scenario-Lab measurements count failed
classifications instead of silently averaging them in.

### 3. Course Builder — the session slicer (PRs #31, #33)

Course sessions are now sliced from activity minutes rather than echoed template
counts: a session's length is measured, session counts accept ranges, untimed templates
are taught on an explicit allowance, and "Request changes" no longer discards a course.

### 4. Security and correctness (PR #36)

The AI no longer takes the browser's word for a firm's past cases (server re-resolves
them — closes a trust-the-client hole in the prompt path); a firm's promoted lessons no
longer grow the prompt indefinitely; icons render from a real icon font instead of
blank space (**new dependency: `@mdi/font` 7.4.47** — run `npm install`).

### 5. Internationalisation (PR #37)

The decision-trace panel is translated end-to-end, and its "Why" column explains every
scoring reason from one reason-code table (26 codes, English wording ruled on
2026-08-04) instead of hardcoded strings.

### 6. Environment and tooling

The start scripts no longer force a machine-specific TLS certificate bundle
(`NODE_EXTRA_CA_CERTS` is now respected from the machine's own environment — the forced
bundle was the cause of a full OpenAI outage on machines running antivirus HTTPS
scanning). Production-build (`npm run serve`) is the standard test-session runway.

---

## Upgrade instructions (from `709bac5` or `v0.6.0`)

1. `git fetch --tags && git checkout v0.7.0`
2. `npm install` on **Node 14.15** — dependencies have changed since both baselines
   (notably `@mdi/font` since v0.6.0; `isomorphic-dompurify` pinned `1.3.0`, `restify`
   `9.1.0`, `engines` field since `709bac5`).
3. **Restart the backend process.** A running Restify server holds the old engine in
   memory and the release will look as though it did nothing.
4. `NODE_EXTRA_CA_CERTS`: set per machine if your environment intercepts TLS; the
   scripts no longer override it.
5. Still outstanding from v0.6.0: the client-knowledge-base **database migration** —
   the feature ships inert until it is run (see the v0.6.0 notes).
6. **Record the pull** in [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md): date,
   environment, exact commit, who pulled. A deployment is not complete until its row
   is written.
