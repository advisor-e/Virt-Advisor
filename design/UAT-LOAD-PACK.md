# UAT Load Pack

**For the Advisor-e master coding team.** How to get a release of this repository running in
UAT, and how to know it is *really* running. It is deliberately short and links rather than
repeats: what a release **contains** is in its own release note, and this page is only how you
**load** it.

Updated at the `v0.14.0` cut, 2026-09-30. **The newest cut release is
[`v0.14.0`](RELEASE-NOTES-v0.14.0.md)**, tagged on the merge commit of PR #145 (the hash is in
[`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md)). It supersedes `v0.8.0` to `v0.13.0`, none of which
was pulled — taking `v0.14.0` gets you all of them, and its install steps are written cumulatively
from `v0.7.0`.

⚠ **This line goes stale the moment a tag is cut and nothing makes it go red.** It said `v0.8.0`
for four days after `v0.9.0` existed, while the release email sent to the master team named
`v0.9.0` — so the announcement and the loading instructions disagreed. **Cutting a tag includes
updating this page.**

---

## 1. Pull the tag, then write the ledger row

Pull a **tag** (`v0.14.0`, …), never the `master` branch — a tag is immutable, a branch keeps
moving, so "UAT is on v0.14.0" stays true and checkable forever.

The moment it is pulled, add a row to [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md): date,
environment, exact commit hash (`git rev-parse HEAD`), who pulled it. **A deployment is not
complete until its row is written.** You have no commit access here, so send us the four values
and we will write it — but send them the same day, or nobody can say what UAT is running.

Please also report any bug against the tag number, so a report can be matched to the exact code
that produced it.

## 2. Runtime

**Node.js 14.15** — locked, and enforced by `engines` in `package.json`. Do not substitute a
newer Node: both the frontend and the backend print a startup warning on anything else, and
Node 22+ refuses to start at all.

**`npm install`** — read §1a of the release note. 🔴 **`v0.14.0` needs one:** it adds
`pdfjs-dist` (backend only, for managers' imported concepts) and `sass` (a developer tool the
running app does not use). `v0.7.0` needed one too (it added an icon font, and without the
install the Hub's tab icons rendered blank, which reads as a broken build). It is stated
explicitly in every release note for exactly this reason.

## 3. Environment variables

Copy [`.env.example`](../.env.example) to `.env` and work through it — it lists every variable
the app reads, grouped by whether you need it, with the consequences of leaving each unset.

**The five that are genuinely required:** `OPENAI_API_KEY`, `JWT_SECRET`, the `MYSQL_*` block,
`NODE_ENV`, and `API_BASE_URL`.

`OPENAI_API_KEY` is the one most often missed, because it is absent from the integration table
in [`HANDOFF.md`](HANDOFF.md) and appears only in a side note there. Without it the backend
treats the condition as fatal.

`OUTCOME_POOL_SECRET` (item 4.87) keys the anonymous tokens in the Outcome Learning pool.
**Optional until the first firm switches sharing on; required from that moment, and never
changed once set** (Mike's ruling, 2026-09-14 — item 4.97 makes the backend refuse to start
when a firm is sharing and this is missing, because rows written under a lost value can never
be withdrawn and the consent screen promises they can). Set it once to a long random string
and keep it. With no firm sharing and no secret the app runs normally, and the Outcome Sharing
tab refuses to switch on rather than pooling under a value nobody can reproduce.

**A second AI provider (optional, item 4.97).** `AI_FALLBACK_NAME`, `AI_FALLBACK_HOST` and
`AI_FALLBACK_KEY` name a backup that answers when the first provider is down, out of credit or
rate-limited — the situation that stopped every AI feature on 11 September 2026. Leave them
unset and nothing changes. 🔴 **`AI_FALLBACK_PERSONAL_DATA_CLEARED` must be exactly `true`
before a meeting transcript or a client's words may reach the backup**; unset, those calls fail
as they do today rather than routing personal data to a provider nobody has cleared. Four calls
can have no backup at all — the economic analysis, the two PDF schedule readers and the meeting
transcription — because no second provider offers the features they use. See `.env.example`.

**New in `v0.14.0`, all optional:** `FIRM_BRAND_LOGO_COLUMN` / `FIRM_BRAND_COLOUR_COLUMN`
(integration question 8) and `AI_PRIMARY_MODEL_TRANSLATE` / `AI_FALLBACK_MODEL_TRANSLATE` —
the release note's §1c says what each does when unset.

## 4. Database

Run [`config/db-schema.sql`](../config/db-schema.sql) against the Advisor-e MySQL instance.

**Including the reserved `firms` rows.** Each management scope stores against a reserved id —
`__platform__`, `__global__:<brand>`, `__group__:<brand>:<country>` — and each needs its own row
in `firms`, or every save at that scope is refused by a foreign key. The insert instructions are
in the schema file beside the `__platform__` insert.

If Advisor-e already has a `firms` table, skip that `CREATE TABLE` block and repoint the foreign
keys in the other tables — see [`HANDOFF.md`](HANDOFF.md) step 2.

🔴 **Then [`config/db-migration-sales-tracker.sql`](../config/db-migration-sales-tracker.sql) —
on every install, fresh or existing.** Its five tables are not in `db-schema.sql`.

🔴 **And set MySQL `max_allowed_packet` to at least `32M`** — a manager's imported concept is one
insert of up to 20 MB. The release note's §1b gives the order and what is new since each earlier
version.

## 5. 🔴 The one decision only you can make

**`NODE_ENV=production` and `ALLOW_DEV_AUTH=true` cannot both be set.** The server exits rather
than boots (`server/collaborate/utils/productionGuard.js`). You must pick, knowingly:

| | Storage | Which screens can be opened |
|---|---|---|
| **`NODE_ENV=production`** | Honest. A failed write fails. Placeholder secrets stop the boot. | Advisor + Firm Manager. **Not** the mentor, global-group or group hubs. |
| **Anything else** | ⚠ A write that cannot reach MySQL is saved to a local JSON file and **reported as success**. | All of them, via the dev tokens. |

The second row is why this section exists. A tester can exercise the whole cascade, watch it
work, and sign it off having proved nothing — the database was never written to, and the file
disappears on the next deploy.

The reason the middle tiers need a dev token here is not a defect in this app, and not a
missing login: global group and group managers **do** sign into Advisor-e. **This app has not yet
been told which role values their tokens carry** (integration question 3 in the release note), so
it fails closed rather than guess. See
[`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md).

**Our recommendation:** run UAT with `NODE_ENV=production` so storage is honest, and demonstrate
the two middle tiers separately on a non-production host with the dev tokens, treating that as a
demo rather than a test.

## 6. Network

Both servers bind to **loopback only** by default — they answer on the machine itself and nowhere
else. That is deliberate: exposing the app to a network is always something someone asks for.

| Variable | Default | Set it when |
|---|---|---|
| `HOST` / `PORT` | `::1` / `3000` | The frontend must answer other machines (`0.0.0.0` for all interfaces) |
| `BACKEND_HOST` / `BACKEND_PORT` | `127.0.0.1` / `4000` | The backend runs on a different host from the frontend |
| `TRUST_PROXY` | unset | The app sits behind a reverse proxy or load balancer |

⚠ **`HOST` and `PORT` were silently ignored before this release.** `nuxt.config.js` set both
explicitly, and Nuxt merges that file over the defaults its own `HOST`/`PORT` lookup produces —
so setting the variable did nothing, which reads as a broken build rather than a config that
never applied. Fixed 2026-08-14; on any earlier tag use `nuxt start -H 0.0.0.0` instead.

## 7. Where the screens are

**Nothing in the app links to these.** `/` redirects to `/advisor`; there is no menu entry
anywhere for the four hubs. Give testers the addresses, not a path through a menu.

| Screen | Address |
|---|---|
| Advisor (the default screen) | `/advisor` |
| Firm Manager Hub | `/firm-manager` |
| Mentor Hub | `/mentor` |
| Global Group Manager Hub | `/global-group-manager` |
| Group Manager Hub | `/group-manager` |
| Strategy Planner (new in `v0.14.0`) | `/strategy-planner` |
| Sales Tracker (new in `v0.14.0`) | `/sales-tracker` |
| Business Owner Expectations (new in `v0.14.0`) | `/owner-expectations` |
| Three-Way Forecast | `/three-way-forecast` |

Inside Advisor-e this repo surfaces at three places — firm manager → *Manage AI Coach*; adviser →
*AI help*; adviser → *Performance Reports*. The three tier hubs are not among them yet, which is
why the addresses matter. **`v0.14.0` asks for two more links** — `/strategy-planner` and
`/sales-tracker` — wherever an adviser's tools are listed (release note §6).

## 8. Prove it actually started

🔴 **A green test suite does not prove the app boots.** The route tests call their handlers
directly and never start the server, so a broken plugin or binding passes every test and fails at
startup. This is recorded in [`STACK-RECONCILIATION-PLAN.md`](STACK-RECONCILIATION-PLAN.md) §3.
Three checks, in order:

1. **Backend up** — start it, then `curl http://127.0.0.1:4000/api/health` → **200**
   `{"ok":true,"timestamp":"…"}`. Nothing else proves the server surface still works.
2. **Frontend up** — load `/advisor` in a browser. Not `curl`: curl falls back to IPv4 when IPv6
   refuses, so it can return 200 against a binding no browser can reach.
3. **Storage real** — save something (a case study, or a Firm Manager setting) and confirm the
   row in MySQL. If it appears in `data/dev-*.json` instead, re-read section 5.

Read the startup output rather than skipping past it. It announces, loudly and on purpose, when
the JWT secret is a placeholder, when there is no MySQL, and when the hubs are showing invented
firms rather than real ones.

## 9. Known limits

Not repeated here — they are stated in the release note you are loading
([`v0.14.0`](RELEASE-NOTES-v0.14.0.md) → *§5 Known before testing*), and the tier/login handover
is [`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md). 🔴 **Meeting Review,
strategy-session recording and Wordsmith must not be used on a real client** until Zero Data
Retention is confirmed for the app's OpenAI Project.

## 10. Tell us three things

1. **The tag you installed** — so the ledger row can be written.
2. **Whether `npm install` was needed and worked** — one earlier pull was left uncertain on this.
3. **Which `NODE_ENV` you chose** (section 5) — because it decides what your testing proves.
