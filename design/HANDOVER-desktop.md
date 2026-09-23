# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-23 (PM) · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean, pushed, 0 behind master. 617 suites / 13,538 green, lint 0 errors, audit gate PASS.**
**PR #126 is open and unmerged** — one commit, the Handbook guard fix. Merge it and the two
machines are exactly level. `activeOn` clear here; 15.1 is yours and I touched none of its files.

### 🔴 WE DELETED 7.13 AND YOU BUILT IT, 45 MINUTES APART — so the check now reads COMMITS

At 11:00 this machine deleted item 7.13 as unnecessary. At 11:45 the laptop pushed ~1,000 lines
building it. Both machines had a green light and both had obeyed every rule we own. **`activeOn`
did not fail — it was never set:** one item in twenty-nine carried it, so the claims box honestly
reported 7.13 unclaimed and free.

**`scripts/item-collisions.js` is the answer** — it reads the other branch's **commit subjects**
and names any item both machines have worked on. Commits cannot be forgotten. `npm run
check:branch` prints it as **SAME ITEM, BOTH MACHINES**, above the claims box, and
[`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md) and `/startup` both now say it **outranks
`activeOn`** — and that a silent claims box means only that nobody claimed anything, never that
nobody is working. Report only; it can never block a push.

**Mike ruled 7.13 dead in full.** You reverted your build (`59075e87`) and the merge came through
as a fast-forward with no conflicts. Nothing is outstanding on it.

### Item 5.1 is COMPLETE — the retention dial was the last piece

Built, browser-driven and wording-approved the same day: three routes
(`server/routes/registerRetentionRoutes.js`), the **Staff Register Retention** tab under
*Compliance*, and `components/firm/FirmRegisterRetention.vue`. **All four manager tiers**, in
Mike's own words.

🔴 **THE PERIOD IS NOW 18 MONTHS, AND THE OLD 84 WERE NEVER HIS.** `registerRetention.js`
attributed a seven-year default and a twelve-month floor to Decision 8 — **Decision 8 names no
period at all**, ruling only that the register is kept on a dial rather than deleted at deal-end.
We wrote those figures and later sessions read them back as his. Default **18**, range **1–18**,
enforced in `validateRetentionMonths` so no tier, route or pre-ruling stored value can exceed it.

⚠ **The item said "one component and one `TAB_TIERS` entry". The three routes did not exist
either** — the module was only ever *read*, so every firm sat on a default nobody could reach.

**Wording is Mike's, approved from a screenshot of the RUNNING page**, and pinned by
`tests/unit/registerRetentionWording.test.js` (the named exception to the no-asserting-wording
rule). Do not reword the five strings.

### Meeting Review — the ZDR gate reopened, and Mike sent the intake

A fourth OpenAI reply offers **Zero Data Retention on BOTH endpoints**, including the
`/v1/chat/completions` call carrying the whole transcript — the exposure the third reply could
not close. **Mike sent the intake the same day**; `design/ZDR-INTAKE-EMAIL.md` is what went out.
⚠ **Nothing is granted** — approval, amendment and enablement are three separate steps with no
quoted turnaround. **8.1 now has THREE gates, not two.**

🔴 **Two findings there are the lawyer's, not a setting:** in-region processing for **New Zealand
does not exist** (Australia is storage-only), and **ZDR does not exclude human access**. Never
write that no human can see it.

⚠ **`OPENAI-ZDR-REPLY-LETTER.md` still said "DRAFT. Not sent"** — it *was* sent, and it is the
letter that won the ZDR offer. Found only by sweeping for "not sent" after the intake went.

### LAPTOP — shared files I touched

`components/FirmManagerHub.vue` (TAB_TIERS, imports, one panel) · `locales/en.json` ·
`server/restify-server.js` (three route lines + one require) · `server/utils/registerRetention.js`
· `scripts/check-branch-state.js` · `tests/unit/hubTabTiers.test.js` ·
`mentorHubScope.component.test.js` · `buildHandbook.test.js` · `to-do-items.json` ·
`ARTEFACTS.md` · `features/report-models.md` · `features/meeting-review.md` ·
`OPENAI-AUDIO-TERMS-EMAIL.md`. **Your strategy files untouched.**

### ⚠ Two things worth knowing before you next run the suite here

**Your new Handbook reachability guard failed on THIS machine and passed on yours, from the same
commit.** Not code — a 72KB gitignored scenario-lab artefact this machine had run. It read the
Brief's backticked mention of the file (in a sentence saying it is *deliberately gitignored*) as
a citation. Fixed to scan `git ls-files` rather than `readdirSync`; **PR #126**. The rule is
untouched and still catches a tracked document nothing carries.

**Playwright is NOT installed here.** I drove the browser with `playwright-core` from the
Collaborate project plus the shared `ms-playwright` chromium — it works, and the driver is in the
scratchpad, not the repo.
