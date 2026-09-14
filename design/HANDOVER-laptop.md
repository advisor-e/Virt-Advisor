# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-14 (thirty-fourth session) · Laptop · branch `feat/advisor-progress`

Suite **10,743 green** (508 suites), lint 0 errors, audit PASS. Tree clean, everything
pushed, **38 ahead of `master`, 0 behind**. **Seven live items** — 4.96 and 4.102 closed today,
**4.103 filed** (the payroll reader, lifted out of 4.100 on Mike's instruction).

🔴 **NEW BINDING RULE, IN BOTH CHECKLISTS: FIND IT → SAY IT → ASK → FIX IT. NEVER PARK IT.**
Mike's ruling after a session named a stale note and then wrote *"I haven't touched it"*.
A problem found is the next thing you do, not a line in a report. **A handover note is not a
parking space** — if you are about to write *"still outstanding"* about something you could
have fixed today, put it to him instead.

**4.102 CLOSED — the Shutdown basis reported zero revenue and now bills.** The engine derives
wage and revenue from the ten typed cells of `Shutdown Inputs` instead of two pre-baked arrays
only the sample carried. `SHUTDOWN_SAMPLE` reproduces Cash Report R17 at **973,328.4208**;
seasonal unmoved at **1,362,740 / 288,935 / July −132**. Two workbook corrections came out of
it — the allowance counted twice (15,600/yr) and CL28's unanchored `CI28` reading another
month's cell. **Two of the four corrections are now the same mistake: read what a formula
ANCHORS, not what it says.**

**4.100 — still ours: the gated staff register.** **4.103 is the payroll reader, now its own
item** — it waits on **a real payroll export from Mike**, his one outstanding item, and per
`supportedPackages.js` no package is called supported until a real one has been read. Done today: the overtime declaration on step 2
(required, no default — the old blank cell silently refused every production worker 97.425
hrs/month, and declaring it paid costs 172,194/yr); **income tax bands as the fifth Tax Rates
figure**; and the **two rate converters on step 1** after Mike dropped the Rates tab. Artefact:
`design/mockups/wages-rates-converter.html`, five decisions ruled on it.

**DESKTOP:** 4.87 untouched — no file of its list was opened. Shared files changed today:
`server/utils/taxRates.js` + `data/tax-rates.json` (a FIFTH figure, `incomeTax`),
`components/firm/FirmTaxRates.vue`, `server/routes/report.js`, `locales/en.json`, four
`.claude/skills/*` and both `.claude/commands/` checklists. Merge `master` before touching any.

⚠ **One loose end, honestly: one test failed once in eight runs this morning and has passed
every run since (a dozen-plus, including four pre-push gates).** The suite name was lost before
it could be read and it has not reproduced. Not in the wages suites.
