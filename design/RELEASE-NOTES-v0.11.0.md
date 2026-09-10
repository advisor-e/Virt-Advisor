# Release Notes — v0.11.0

**Tag:** `v0.11.0` · **Cut:** 2026-09-10 ·
**Previous release:** [`v0.10.0`](RELEASE-NOTES-v0.10.0.md) (`458cf9e`, 2026-08-22) —
cut and offered. Pulling v0.11.0 covers it either way.

**484 commits since v0.10.0** — about 190 code, about 240 documentation and design, the rest
merges between the two machines. Nineteen days of work from both the desktop and the laptop,
merged to `master` by pull request throughout.

> 🔴 **THIS ONE NEEDS `npm install`, AND IT MUST BE RUN WITH npm 8 ON Node 14.15.**
>
> **What changed:** `package-lock.json`, and five `overrides` in `package.json` that pin
> transitive packages to versions that run on Node 14.15 (`js-beautify` 1.14.0, `consola` under
> `@nuxt/telemetry`, `node-releases` 2.0.14, `@types/node` 14.18.63). No runtime dependency was
> added, removed or moved. **`engine-strict` is now ON in `.npmrc`**: the install hard-fails on
> any package whose declared Node range excludes 14.15, which is the point of it.
>
> **Which npm.** npm 6, bundled with Node 14, ignores `overrides` and rewrites the lockfile to
> an older format — do not use it. npm 10 rejects the project itself under `engine-strict`. Use
> **npm 8** (8.3 or later) on **Node 14.15.0**; verified with 8.19.4. If `npm install` fails
> with `EBADENGINE`, that is the guard doing its job — read the error, do not switch the guard
> off. `npm run check:engines` re-checks an installed tree at any time.
>
> ✅ **It downloads no browser.** `playwright_skip_browser_download=1` in `.npmrc` suppresses the
> 604 MB fetch; `npm ci --omit=dev` skips the developer tools entirely.
>
> **No database table changed.** `config/db-schema.sql` differs from v0.10.0 by one comment
> line. Every new feature stores through the existing configuration table or on the server's
> own disk, as each feature's Brief states.

**Verified at tag time, on the tagged commit:** 9,694 tests green across 471 suites · lint
0 errors · critical-audit gate PASS · `nuxt build` exit 0. Runtime target unchanged:
**Node 14.15**, backend CommonJS, Nuxt 2 / Vue 2 / Restify 9.1.0 per the Stack Constitution.

---

## What this release is about, in one paragraph

**v0.10.0 gave managers somewhere to see what the AI is told. v0.11.0 is the release where the
app starts doing the work an advisory firm actually sells.** A client gets a Business
Performance Report built from their own accounts. A meeting can be recorded with consent,
transcribed, and turned into a client summary and the advisor's private coaching notes, with the
list of what to watch for tailored down to the individual client. A forecast knows which
country its client is in, with depreciation and tax rates a manager approved from the tax
authority's own documents. A firm declares its compliance obligations before it records anyone.
And the master app can push the template library straight into this one, so the download step
disappears. Underneath, the two machines' work was integrated by pull request every day, and the
Handbook now carries its own code-size page and the founder's audit of what the product can
honestly claim.

---

## 1. Business Performance Report — the client's own report (item 4.70)

Eleven base pages built from the client's accounts, up to fifteen with the optional pages: the
eight-measure health score, the Stats NZ benchmark comparison with size bands, the stock export
read against the balance sheet, the monthly view and third year, the three accounts-only
optional pages, and an AI first draft of the three next steps behind a tick that is its
approval gate. Every figure carries where it came from; an unruled part shows no number. Mike
closed it after walking a real client's export through all six steps and the browser's print.

Beside it: the Stats NZ benchmarker and a mentor-tier **Industry Benchmarks** tab where the
release in force is replaced by a two-file upload; an inventory reader for Cin7 Core and
Unleashed exports; and the **Fixed Asset Schedule** reader (4.65), proven on Mike's real MYOB and
QuickBooks exports (4.60, 4.79).

## 2. Meeting Review — recorded, transcribed, reported, and tailored to the client (4.58)

The advisor's whole side is built: observation points that cascade from the mentor to the firm,
to the advisor's own level, and now to the **individual client** — one shared list per client
that anyone in the firm may edit, every entry naming who set it, with no separate manager
screen by Mike's ruling. Consent screens in the approved wording, recording with a wake-lock and
alarm, diarised transcription, audio destroyed once transcribed, two separate reports with every
quote verified against the transcript, follow-through across meetings matched on the client,
transcript expiry on each meeting's own promised period, the firm manager's aggregate above a
five-advisor and twenty-meeting floor, and a **client's right to a copy** with the recording
advisor alone releasing a meeting. A privacy impact assessment is written. The non-code items in
the Brief's §4 remain Mike's before a first real recording.

## 3. Compliance pages in the four manager hubs (4.83)

Compliance material the mentor publishes cascades to every tier, nothing below can edit it, and
a firm must make its declaration before Meeting Review becomes active for that firm. The
declaration wording is Mike's, verbatim and pinned. A completeness check runs on demand against
the impact assessment and never gates on its own.

## 4. A forecast that knows the client's country

- **Depreciation Rates** (4.78): a firm manager loads a tax authority's published schedule, the
  AI reads it and proposes a rate table, and only an approved table can reach a forecast. Every
  figure carries its source document and date. An advisor may load a document; only a manager
  may approve one. First-year rules such as New Zealand's Investment Boost are modelled against
  the asset's purchase date (4.77).
- **Tax Rates** (4.81): company tax, GST, filing cycle and accounting basis per country, a
  sibling tab to the one above, sharing one country table, one cascade and one approval gate.
  New Zealand's rates were hardcoded for every client before this.
- **Economic analysis** (4.66): the three-way forecast can ask the AI for global and local
  market research to support a funding request. The advisor writes the brief and sees the exact
  words sent, a citation guard refuses unsourced answers, the advisor sets the assessment date,
  and the pack prints only on explicit approval. Nine faults found by running it live are fixed,
  including the guard refusing half of all runs by reading web-address digits as figures.
- **Saved reports per client** (4.62) across all ten model screens, and the quick-fire forecast
  (4.71): three years from percentages rather than twelve months typed.

## 5. The template library moves into the database (Search-Content Cascade Plan)

All four phases on our side: a mentor-tier **Template Library** tab where the export is
uploaded with version history and restore; a loader that reads the nearest tier's library
whole; a firm's own Template Library tab with a searchable, read-only view of the library in
force; and **`POST /api/integration/templates`**, a push endpoint for Advisor-e that answers 404
until the shared secret is set. The master team's half is question 6 of the integration email,
which now also asks (question 7) where an adviser's identity lives.

## 6. Management, cascade and the Handbook

- **"Global manager" is gone from our prose and code** (4.80); the tier is the global group
  manager, and a test bans the old name outside Mike's quotes.
- Three cascade faults fixed: a removed observation point's id reissued to the next (4.72), a
  middle tier's rewording badged as Advisor-e's (4.76), and two advisors saving at once losing
  each other's work (4.75, one storage row per person).
- **AI Prompts** gained the depreciation-reading and next-steps prompts at all four tiers.
- The Handbook's To-Do page is a ranking control Mike saves from; a **Code Size** page is
  recomputed on every build; and one page holds the **Founder's Claims Audit** — three marketing
  claims read against the code — with the **Outcome Learning** task (4.87) that came out of it,
  specified and not built.
- The Course Builder's live click-through was completed for the first time: build, session,
  quiz, refresh, legacy migration and interruption, all against MySQL and the live model.

## 7. What is NOT in this release, said plainly

- ⚠ **This app has not been told which role values the two middle-tier managers' tokens carry.**
  `config/integration.js` ships `globalManagerRole` and `groupManagerRole` empty on purpose,
  fail-closed. Those managers log into Advisor-e today; the value is Advisor-e's to supply
  (integration email, question 3).
- **The Adviser Network runs on nine invented people** (4.86). Adviser identity belongs to
  Advisor-e, this app holds no advisers table, and the seam is the master team's to wire once
  question 7 of the email is answered. In production mode nothing in that network persists.
- 🔴 **Most of what the laptop built this month has not been opened in a browser.** The client
  register, Depreciation Rates and Tax Rates all need MySQL, and the laptop has none. They are
  proven by tests. **Opening them is the first thing to do in UAT**, and the laptop's PR #71
  says so at its foot.
- **18 logic-table recommendations still name pages the library does not hold** (4.15). The
  gate withholds them correctly; Mike settles the names in UAT.
- **Nothing caps how many paid AI readings of a tax document one advisor can trigger** (4.82).
- **Outcome learning across firms is a spec, not code** (4.87). The engine remembers each
  client; it does not yet learn across clients.
- **The AI can still be routed to the wrong coaching method.** What changed in v0.9.0 is that a
  wrong pick is visible and declined rather than invented; the routing itself is unchanged.

## 8. For whoever pulls this

1. `git fetch --tags && git checkout v0.11.0`
2. **`npm install` with npm 8 on Node 14.15** — see the banner at the top. It downloads no
   browser. `npm run check:engines` confirms the tree afterwards.
3. Environment: the values in [`UAT-LOAD-PACK.md`](UAT-LOAD-PACK.md), plus, if Meeting Review is
   to be exercised, a writable `MEETING_AUDIO_DIR` on the server's own disk. `ADVISOR_E_PUSH_SECRET`
   is optional; unset, the push endpoint answers 404.
4. Record the pull in [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md): the date, the
   environment, the exact commit hash, who pulled it, and any notes.
   **A deployment is not complete until its row is written.**
