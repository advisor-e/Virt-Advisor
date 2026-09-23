---
name: run-the-app
description: >-
  Use when you need to SEE the app rather than trust the test suite — "open the app", "run it",
  "start the dev server", "screenshot that screen", "does this actually work", "eyeball it before
  we tag", or any check that a screen renders, a tab loads, a badge shows the right word. Covers
  launching Nuxt + Restify, signing in without Advisor-e, driving the pages with Playwright, and
  what each page is for and how to reach the part that matters. Keywords: nuxt build, npm run start, localhost:3000,
  dev-local-mentor, dev-local-bypass, isDevHost, Playwright, screenshot, Mentor Hub, Model Library,
  skipManual, browser, eyeball, UAT.
---

# Run the app and look at it

**This exists because green tests do not mean a working screen.** On 2026-09-09 the suite was
8,977 green while the Mentor Hub's Template Check screen displayed the raw string
`templateCheck.filter.all (62)` to the user, where a word should have been. Ten minutes in a
browser found it. Mike's ruling of 2026-08-24 deliberately stopped us asserting on label wording
— *a person in UAT sees a wrong word instantly, and an assertion costs a rewrite every time a
word changes*. **That ruling is not in question. Its consequence is: this class of fault is found
by looking, so look.**

Governance (CLAUDE.md, absolute): starting the app changes nothing and needs no approval.
**Anything you then want to fix does** — one change, one explicit yes, every time.

---

## 1. Launch

🔴 **TO LOOK AT OR TEST THE APP, BUILD IT AND SERVE THE BUILD — never the dev server.** Mike's
ruling of 2026-08-02: the Nuxt 2 dev server leaks to ~12 GB and wedges, which looks exactly like
hung code (it fell over five times in one session). `npm run dev:all` is for actively iterating
on code only, and expect to bounce it. Stop any dev server before building — they share `.nuxt`.

**Proven on the desktop 2026-09-24** (PowerShell), each in the background:

```powershell
npx nuxt build                  # ~2–4 min; exit 0 is also the Integration step-2 build check
npm run start                   # serves the build on http://localhost:3000

# The backend: Node 14.15 BY EXACT PATH (the Node 20 on PATH crashes restify 9.1.0), dev sign-in
# on, and the antivirus root so OpenAI calls verify (§6):
$env:ALLOW_DEV_AUTH = "true"
$env:NODE_EXTRA_CA_CERTS = "C:\Users\Mike Barnes\avast-root-ca.pem"
& "C:\Users\Mike Barnes\AppData\Local\nvm\v14.15.0\node.exe" server/restify-server.js
```

⚠ **The certificate file goes stale** — Avast rotates its root. If OpenAI calls fail in ~20 ms
with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, re-export it from the Windows store (`Cert:\LocalMachine\Root`,
subject `*Avast*`) into that file; the live-chain export did NOT work on 2026-09-24. **Never** set
`NODE_TLS_REJECT_UNAUTHORIZED=0`. *(The paths above are the desktop's; the laptop's differ.)*

A build does not hot-reload at all: after changing a `.vue` file, build again.

### 🔴 NUXT HOT-RELOADS. RESTIFY DOES NOT. Restart it after ANY change under `server/`

**This inverts the usual diagnosis, which is why it costs so much time.** Change a route or a
backend utility and the browser keeps showing the OLD answer — so the screen looks broken, every
clue points at the new frontend code, and there is nothing wrong with it.

Found 2026-09-16 building the Strategy Planner: two new cards were missing from a screen and a
list came back empty, for twenty minutes, because the backend was still serving the version it
booted with. **The tests were green throughout — they load the module directly and never went
near the running server.**

**Check it in one call before debugging anything else**, and compare against what the code says:

```bash
curl -s -H "Authorization: Bearer dev-local-bypass" http://127.0.0.1:4000/api/<your-route>
```

Restart both (restarting one means restarting the pair — ⚠ **and a stale Nuxt CAN be the
problem; this line used to say it never is. See the section below, which cost three restarts
to write**):

```bash
# PowerShell — stop whatever holds the two ports, then relaunch
Get-NetTCPConnection -LocalPort 4000,3000 -State Listen | Select -Expand OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

A healthy boot prints three lines worth reading:

| Line | What it means |
|---|---|
| `MYSQL_PASSWORD is placeholder — no MySQL` | Expected on the laptop. Stores fall back to `data/dev-*.json`. Nothing persists like production. |
| `firm membership seeded … 27 INVENTED firms` | The two middle-tier hubs will show **test data, not real firms**. Never report seeded firms as real. |
| `OPENAI_API_KEY present=true` | AI routes will really call OpenAI **and really cost money**. See §6. |

### 🔴 NUXT CAN RELOAD HALF A CHANGE — the template compiles, the `<script>` does not

**This is nastier than the Restify case above, because the app looks updated.** The section above
warns you when NOTHING has reloaded. Here the screen visibly changes and still misbehaves, so every
clue points at the code you just wrote — and the code is correct.

**What it looks like.** Add a prop and use it in the same `.vue` file, and the browser console says:

```
[Vue warn]: Property or method "clientChosen" is not defined on the instance but referenced
during render.
found in ---> <StrategyScopeMenu>
```

The template's new `!clientChosen` is live. The `props` block that declares it is not. So the
binding evaluates against `undefined` — a disabled button stays disabled, a `v-if` never fires —
while the file on disk is right and **the unit tests pass**, because Jest compiles the file fresh
and never touches the dev server's cache.

🔴 **A FULL RESTART OF BOTH SERVERS DOES NOT CLEAR IT.** The stale copy is on disk, not in memory.
That is the detail that turns ten minutes into an hour: the one thing you would reach for does
nothing, which reads as confirmation that the code really is broken.

**Prove it in one call instead of guessing** — ask the running page what it actually loaded:

```js
await page.evaluate(() => {
  const vm = document.querySelector('.ssm').__vue__        // any root element of the component
  return { declared: Object.keys(vm.$options.props), live: vm.$props }
})
```

If your new prop is missing from `declared`, the file is fine and the server is stale. **Nothing in
the source can explain it and no amount of reading will.**

**The fix is to change the file's timestamp, then restart the pair:**

```powershell
(Get-Item "components\strategy\StrategyScopeMenu.vue").LastWriteTime = Get-Date
```

Then re-run the probe and see the prop appear before you touch anything else.

*Found 2026-09-22 building the Strategy Planner's AI pre-tick (item 15.1 stage 6). A one-line fix
to a button's `:disabled` was correct, committed, unit-tested green — and the screen behaved for
three restarts as though it had never been written.*

### 🔴 The address gotcha — `127.0.0.1:3000` does not answer

`nuxt.config.js` binds the dev server to the **IPv6 loopback only** (`host: '::1'`), a deliberate
choice with its own long note there. So:

- ✅ `http://localhost:3000` — use this
- ❌ `http://127.0.0.1:3000` — nothing is listening; it hangs with no error to read
- ⚠ `curl http://localhost:3000` **falls back to IPv4 and can lie.** To test an address for real,
  be explicit: `curl -g http://[::1]:3000`.

The **backend is the opposite** — Restify listens on `127.0.0.1:4000`, so curl it there directly.

---

## 2. Signing in — you do not need Advisor-e

All login is the master app's, never ours. Locally, every gated page auto-signs-in **because the
hostname is a loopback address** ([`utils/devHost.js`](../../../utils/devHost.js)), and the
backend accepts the resulting magic token **only** while `ALLOW_DEV_AUTH=true` — two gates, and
production sets neither.

| Open this page | You become | Token handed to the backend |
|---|---|---|
| `/mentor` | the mentor (platform_admin) | `dev-local-mentor` |
| `/global-group-manager` | a global group manager | `dev-local-global` |
| `/group-manager` | a group manager | `dev-local-group` |
| `/firm-manager` | a firm manager | `dev-local-bypass` |
| `/advisor`, the reports, the meeting pages | an advisor in `dev-firm-001` | `dev-local-bypass` |

**Curl the backend as any of them** by passing the token yourself:

```bash
curl -s -H "Authorization: Bearer dev-local-mentor" http://127.0.0.1:4000/api/report/tax-rates
```

**The two middle tiers open and work locally.** They log into Advisor-e in real life and have for
years (Mike, 2026-08-31). Only the *role value* their tokens carry is still unknown to us, which
is why real deployments fail closed. Never write that these managers cannot log in.

---

## 3. Driving it with Playwright

⚠ **`playwright` is declared in `package.json` but is NOT in `node_modules` on the desktop**
(checked 2026-09-24 — `Cannot find module 'playwright'`). Do not install it; borrow the copy the
sibling Collaborate app already has, and point at the Chromium that is already downloaded:

```js
const { chromium } = require('C:/Users/Mike Barnes/Projects/Advisor Collaborate/node_modules/playwright-core')
const browser = await chromium.launch({
  executablePath: 'C:/Users/Mike Barnes/AppData/Local/ms-playwright/chromium-1064/chrome-win/chrome.exe'
})
```

If that path has moved, find it with
`Get-ChildItem "$env:LOCALAPPDATA\ms-playwright" -Recurse -Filter chrome.exe`. Keep the driver
script in the scratchpad, never in the repo. Three more things cost time every session:

### 🔴 The three gotchas

1. **The Virtual Advisor asks "Who is this session for?" first.** Click `Skip this session`, or
   every message waits behind the client picker and the conversation never moves. Choice
   questions (Growth Curve, Staircase) are radios plus **Confirm selection**; meeting length is
   `.session-length-opt` buttons. Advisor replies are `.message-bubble.bubble-advisor`.
2. **`waitUntil: 'networkidle'` NEVER FIRES.** Nuxt's dev server holds an open hot-reload
   connection (`__webpack_hmr`, `_loading/sse`), so the page is never idle and `goto` times out.
   Use `domcontentloaded` plus an explicit wait of ~6s.
3. **Hidden hub panels STAY IN THE DOM.** `FirmManagerHub` renders panels with
   `v-if="showsTab(...)"` **and** `v-show="activeTab === ..."`, so an inactive tab's inputs and
   buttons are still queryable. A bare `.first()` silently grabs the wrong tab's control and you
   debug a disabled button that was never the one on screen. **Always scope to what is visible:**
   ```js
   page.locator('input[placeholder="NZ"]:visible').first()
   page.locator('button:visible:has-text("Show")').first()
   ```

### A driver that works

```js
const { chromium } = require('C:/Users/Mike Barnes/Projects/Advisor Collaborate/node_modules/playwright-core')
const browser = await chromium.launch({ executablePath: 'C:/Users/Mike Barnes/AppData/Local/ms-playwright/chromium-1064/chrome-win/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })

// Catch what a screenshot cannot show you
page.on('pageerror', e => console.log('[pageerror]', e.message))
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()) })
page.on('response', r => { if (r.status() >= 400) console.log(`[http ${r.status()}]`, r.url()) })

await page.goto('http://localhost:3000/mentor', { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForTimeout(6000)
await page.locator('text="Tax Rates"').first().click()   // hub tabs are plain text links
await page.screenshot({ path: 'out.png', fullPage: true })
```

**`fullPage: true` and then actually read the image.** A blank frame is a failed launch, not a
passing check. Dumping the visible panel's `innerText` alongside the screenshot is often faster to
scan than the picture:

```js
await page.evaluate(() => [...document.querySelectorAll('.hub-panel')]
  .filter(p => p.offsetParent !== null)[0].innerText.slice(0, 2000))
```

### Noise you can ignore

`__webpack_hmr` and `_loading/sse` aborting are the dev server, not faults. So is
`403 NOT_FIRM_TIER` on `/api/firm-manager/meeting-patterns` from a manager hub above the firm —
that is Meeting Review P13 keeping meeting figures inside the firm, working correctly.

---

## 4. How to use this page

### The four manager hubs

`/mentor` · `/global-group-manager` · `/group-manager` · `/firm-manager`

**All four are the same component** — `FirmManagerHub` at a different `scope`. Mike's ruling of
2026-07-30: *"all of the functionality that you see at firm manager is simply repeated at group
manager or global manager… there's no new functionality."* So there is one screen to learn.

Tabs are plain text in the left rail; click the label. **Which tabs a tier shows is `TAB_TIERS`
in [`components/FirmManagerHub.vue`](../../../components/FirmManagerHub.vue)** — a tab missing
from a tier is a stated judgement pinned by `tests/unit/hubTabTiers.test.js`, never a gap in the
platform. Check that list before reporting a tab as missing.

| Tab | Where it appears | How to get past the empty state |
|---|---|---|
| **Tax Rates**, **Depreciation Rates** | all four tiers | Type a 2-letter country (`NZ`) → **Show**. Nothing renders until you do — the empty state says so. |
| **Template Check** | mentor only | Loads on open. Filter chips across the top; the list paginates. |
| **AI Prompts**, **Meeting Review** | all four tiers | Load on open. |
| **Case Reviews**, **How firms are using the app**, **Logic Lab Report** | mentor + two middle tiers | Roll-ups from below; thin without seeded data. |
| **Property Tax Rules** | the two middle tiers + firm — **not** the mentor | — |
| **Team Case Studies** | firm only | — |
| **Forecast Trend Thresholds**, **Imported Stock Prices**, **Template Library** | mentor only | — |

**The rate tabs are the pattern worth understanding.** Both answer *"what does a client in this
country get, and who decided it?"* Every figure carries a **provenance badge** — `app default`
until a manager approves a real table, then the tier that approved it. A manager loads a published
PDF, the AI proposes a table, and **nothing reaches a forecast until a manager approves it** — the
proposal lives in its own store, so the gate is structural rather than a flag.

⚠ **On a fresh machine no country has an approved table**, so you only ever see the *app default*
path. To exercise the approve-and-offer path you must approve one as a manager first — say so
rather than reporting the feature untested.

### The Model Library and the report screens

`/model-library` is the front door; every report links back to it, so nothing is a dead end.
`/model-guide` explains what each model is for. Individual reports (`/cost-of-capital`,
`/lease-vs-buy`, `/volatility`, `/debtor-drag`, `/margin-breakeven`, `/eight-levers`,
`/multiple-property`, `/loan-estimator`) are thin pages: `ReportShell` plus a screen component,
**with the maths always on the backend**. Most compute anonymously — numbers in, numbers out — so
they need no token and open straight up.

### 🔴 The three intake reports — and the upload wall

`/quick-position` · `/ebitda-dcf` · `/three-way-forecast`

These open on **"drop the accounting exports"**, and **there are no sample exports in this repo.**
Do not go looking for a fixture `.xlsx`; there is none.

**Every one of them offers a way through — but the three word it differently**, so match on the
`skipManual` handler rather than on one phrase:

| Page | The escape reads |
|---|---|
| `/three-way-forecast` | **"Enter everything by hand instead"** (a button) |
| `/quick-position`, `/ebitda-dcf` | **"No exports handy? Skip and enter everything manually →"** (a link) |

Clicking it lands you on the confirm-the-figures step with everything at zero, which is where
nearly everything worth looking at lives.

The **Three-Way Forecast** is the big one — five steps: drop exports → confirm the opening
position → set the assumptions → the live forecast → **optional** economic analysis. Step 5 is
optional and reachable from anywhere (Mike, 2026-09-06); the forecast is complete and printable at
step 4. **The advisor's half of the rate work is on step 2**: the *Country* field, and the
`FIXED ASSETS AND HOW FAST THEY DEPRECIATE` card where each of the six rates carries its
`WHERE THE RATE COMES FROM` badge.

### Meeting Review

`/meeting-preset` (the checklist an advisor sees before walking in) → `/meeting-record` (consent,
capture, transcription, deletion) → `/meeting-review` (the two reports). The manager's half is the
hub's **Meeting Review** tab.

🔴 **Do not record a real person to test this.** The banner on `/meeting-record` is not
boilerplate: Brief §4 lists four non-coding items — an impact assessment, staff consultation, the
provider's written terms for submitted audio, and a lawyer per market — that gate a first real
recording. The code being finished is not permission.

### The rest

`/advisor` is the Virtual Advisor chat. `/collaborate` is the adviser network's front door;
`/discover`, `/connections`, `/messages`, `/groups/*`, `/marketplace`, `/profile`, `/firm` and
`/audit` are route shells around `components/collaborate/screens/`. `/my-reports` is the business
entity's own page.

---

## 5. What you cannot prove locally

Say these plainly rather than implying a screen was verified when it was not:

- **No MySQL on the laptop** (Mike declined it). Every store falls back to gitignored
  `data/dev-*.json`. Nothing about real persistence is tested here.
- 🔴 **The client picker does not render on ANY report page locally — and the reason is the
  TOKEN, not the database.** `ClientAccessSwitch` returns early unless `advisor_e_token` is in
  `localStorage`, and **no report page writes it in dev**; in production Advisor-e puts it there
  before our pages load. Proved 2026-09-15 on `/wages-review`, `/quick-position` and `/volatility`
  — all three, token `null`, no picker. *(This line used to read "client pickers are empty — they
  need the database", which is wrong in both halves and cost a session an afternoon.)* **To drive
  a client-aware screen**, seed the token the way the master app would, before the page loads:
  ```js
  await page.addInitScript(() => {
    window.localStorage.setItem('advisor_e_token', 'dev-local-bypass')
    window.localStorage.setItem('advisor_e_role', 'advisor')
  })
  ```
  Then the picker renders and lists the firm's clients. **Say that you stood in for the sign-in** —
  the screen behind the picker is proven, the picker appearing at all is not.
- **The middle-tier hubs show 27 invented firms**, seeded so their layout can be reviewed at all.
- **Nothing in this repo builds the app.** A green suite says nothing about whether `nuxt build`
  succeeds; that is `npm run build`, and it is step 2 of Integration before tagging.

---

## 6. ⚠ Two things that cost real money or real trust

- **`OPENAI_API_KEY present=true` means the AI routes really call OpenAI.** Loading a document
  into the depreciation or tax screens is a **paid** reading, and **nothing caps how many an
  advisor can trigger** (live item 4.82). Do not loop a document load while testing.
- **Seeded firms are invented.** Reporting them as real firms is how a screen full of fabricated
  data gets believed.

---

## 7. Finishing

Leave the server running if the person you are working with may want to click around — say so.
Otherwise stop the background task. Scratchpad driver scripts and screenshots stay in the
scratchpad; **never write a driver into the repo** to dodge the `NODE_PATH` step.

If you found something, follow the **Debugging and Fix Protocol** in CLAUDE.md: prove it in the
code, show the proof, propose the fix, **get a yes**, then fix it.
