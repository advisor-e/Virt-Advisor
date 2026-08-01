# Session Notes — 2026-07-29 · Laptop (Business Performance Report)

> **Cost of Capital is FINISHED and owner-signed-off — and the model's answer CHANGED
> today.** The headline WACC moved **6.16% → 5.71%**. Two commits, **both pushed**. Suite
> **1,915 → 1,917 green / 132 suites**, lint 0 errors, tree clean, branch **72 ahead /
> 0 behind `origin/master`**, level with its own remote.
>
> **Desktop: `git fetch origin && git merge origin/master` first, as usual** — this work is
> on `feat/business-performance-report`, so it only reaches the desktop once this branch is
> merged by PR. **Nothing here touches any Course Builder file.**

---

## The headline: the model was giving an indefensible answer, and now doesn't

Mike ruled: *"Growth rate calculations are wrong, then fix it… put it to standard
practice."*

**Investigating it proved the fix was not to recalculate growth but to REMOVE it — and
that the step sitting beside it was wrong the same way, and larger.** The workbook did not
stop at the CAPM figure; it applied two further multipliers before the cost of equity was
weighted into the WACC:

| Cell | Formula | Result |
|---|---|---|
| `K21` | `E6 + E8*(E7−E6)` | **6.5468%** ← textbook CAPM, correct |
| `L20` "Post Inflation" | `K21 × (1 + E9)` | 6.9723% |
| `M19` "Post Real Growth" | `L20 × (1 + E10)` | **7.2684%** ← what the WACC used |

**a. Inflation was double-counted.** `E6` is a government bond rate and `E7` a share index
return — both quoted in **nominal** terms, so expected inflation is already inside them. A
model works entirely in nominal terms or entirely in real ones. The sheet's own label,
*"Expected **REAL** Inflation Rate"*, shows a real-terms model was intended — but the
inputs feeding it were never converted.

**b. Growth is not a component of a discount rate.** Cost of equity is what investors
*require* for bearing risk, and under CAPM risk is carried entirely by beta. Growth belongs
in the cash flows being discounted, never in the rate they are discounted at.

> **It also ran backwards as an incentive: the faster a company grew, the higher its hurdle
> became — so a good year made every future investment look worse.** That is the argument
> that settles it, not the arithmetic.

*(The annualisation defect that raised the question — a TOTAL change across the window used
as a per-year rate — is now moot for the WACC. The figure still feeds the ROI beta, so it
still matters there.)*

**Corrected:** `I23 = H23 × K21`. **WACC 6.1627% → 5.7117%.** The hurdle test moves with it:
required annual return on the worked sample **$15,407 → $14,279**, verdict *"clears by
2.64 points"* → **"clears by 3.09 points"**.

---

## Scope — the ruling covered the whole screen, not just the maths

`E9`/`E10` are gone from **everywhere**: the model, the route contract, the request payload,
both input boxes, the "use the calculated figure" link, two build-up rows, and the
sensitivity table's inflation row.

> **A control that no longer moves the answer is worse than no control** — an advisor would
> type into it, watch nothing happen, and reasonably conclude the screen was broken.

**The change invents NO new user-facing wording.** It only removes: four dead locale keys
deleted, nothing added. That is why it could be done in one pass without a wording ruling.

**The growth rate is NOT gone from the app.** It is still derived by the Beta helper, where
it legitimately drives "Beta from growth". A fix that killed the ROI suggestion too would
have overshot; a test pins that it did not.

---

## Testing — 24 failures on the first run, every one a golden that moved

Beyond re-baselining, **three guards were added that did not exist before**:

1. **`SUPERSEDED_*` sentinels** pinning the 6.16% answer **this model itself published until
   today**. Re-adding either multiplier leaves the arithmetic internally consistent, so
   nothing but a pinned value would catch it. (These are not source defects — they are our
   own superseded answers, and the distinction is recorded in the test file.)
2. **A stale-caller test** — a caller still sending `inflationRate`/`growthRate` gets the
   identical answer. The ruling must hold for un-updated callers, not only updated ones.
3. **DOM tests locating the absent fields BY LABEL, never by position** — removing a control
   leaves nothing behind to fail, so only an assertion of absence notices it returning.

> ⚠ **A trap caught, and it is the same trap as last session.** The break-even test
> deliberately uses an investment cost that does NOT round-trip exactly in binary. The old
> figure — **$35,000 — divides exactly at the NEW WACC**, so the test would have kept
> passing while proving nothing: *the exact failure its own comment warns about.* Re-chosen
> to **$7,000** (gap 6.9e-18), with a note in the test that it must be re-chosen **whenever
> the WACC changes**. This is now the second time this test has silently disarmed itself.

---

## The source workbook — corrected, with one thing I could not verify

`WACC Calcs` only; **`Beta Calcs` deliberately untouched** (growth still drives the ROI beta
there — only its path *into* the WACC was wrong).

- `I23` `=H23*M19` → **`=H23*K21`**, cached 0.04542727725 → 0.0409175
- `E26` cached 0.06162727725 → **0.0571175**
- **Eight cells deleted:** the `E9`/`E10` inputs, the `L20`/`M19` stages, and their four labels
- `D9` now carries a note where the old label was, so a reader of the SHEET learns why those
  rows are empty rather than assuming someone deleted them by accident
- `fullCalcOnLoad="1"` set, so Excel rebuilds anything downstream instead of trusting a cache
  that predates the edit

**Verified BEFORE installing, not after** — rebuilt on a scratchpad copy, then re-read:
archive integrity clean, `sheet1.xml` well-formed with all 26,045 cells balanced and no empty
`<row>` left behind, and `sheet2.xml` / `sharedStrings.xml` / `styles.xml` / `comments1.xml`
**byte-identical** to the original.

> ⚠ **Two notes for whoever edits an `.xlsx` next.**
> 1. A first pass **dropped `I23`'s style index** (`s="27"` → `s="0"`). That selects the
>    number format: the maths would have been perfect and the cell would have rendered a
>    percentage as a raw decimal. Caught by verifying the rebuilt file rather than trusting
>    the script — which now carries the original style over and **refuses to invent one**.
> 2. This machine has **no `zip` binary and the repo no zip library**, so the archive was
>    rewritten by a purpose-written zip writer (`scratchpad/rezip.js`, entry order taken from
>    the original). **PowerShell's `Compress-Archive` was rejected deliberately** — no control
>    over entry order, and an `.xlsx` Excel dislikes fails at OPEN time, long after the script
>    reports success.

---

## Also done (three small approved items)

1. **All six wrong spreadsheet cell references corrected** in our comments — `K21`/`K22`/
   `K24`/`P62`/`P29`/`I8`/`K8`. **Each was re-proved against the raw workbook XML, not taken
   from our own note**: the whole point is that a future reader can re-check by hand, so a
   wrong correction would be worse than a wrong label. (Confirmed: `H21`/`H22`/`J24`/`O62`/
   `O29`/`H8`/`J8` are all EMPTY cells.)
2. **Phases 5b and 5c owner-signed-off** — Mike ran the app and confirmed all four checks:
   the "Use this Beta" links on the two suggestion tiles only, the provenance line clearing
   on a typed beta but surviving an unrelated edit, the sensitivity ranking and its negative
   rows, and the screen sitting in the shared frame.
3. **The stale Model Library dark-mode line closed** — `ACTIONS.md` said "check outstanding"
   while the session notes recorded it confirmed. The two documents contradicted each other.

---

## Waiting on Mike

1. ⚠ **Open `design/report-source-models/Cost of Capital.xlsx` in Excel once.** Everything
   above verifies it as a ZIP and as XML; **it does not prove Excel accepts it**, and no tool
   on this machine can. Low risk, but a real gap — not reported as done. The original is safe
   in git if it complains.
2. **The reference links** — designed, worded and mapped to the firm's currency, but blocked:
   10 of 12 institution URLs refuse an automated check, so the page paths cannot be confirmed
   from here. Build against top-level statistics pages, or leave out?
3. **`v0.6.0`: which record is true?** `DEPLOYED-VERSIONS.md` says *offered*;
   `SESSION-2026-07-27-NOTES.md` says *"still not sent"*. **Fourth session carrying this.**
4. **The Lease vs Buy `.xlsx` contradiction** — `ACTIONS.md` records it done (`402c595`) and
   outstanding, two lines apart. **Fourth session carrying this.**

---

## Cost of Capital — where the model stands

**COMPLETE and signed off.** Backend, screen, corrected source workbook, hurdle test,
adopt-a-beta, sensitivity view — all done and owner-verified. Remaining:

- 🚧 **Static reference links** — blocked on the decision above.
- ⛔ **Gearing curve** — dropped 2026-07-28 (it would recommend 100% debt; needs beta
  re-levering, a finance ruling of its own).
- 🔒 **Live market-data feed** — deferred; needs a licensing + cost ruling.

---

## Release position

**`v0.6.0` is NOT being chased; a fresh tag will supersede it** (ruled 2026-07-28).

> ⚠ **Watch item, and it grew again.** The branch is now **72 commits ahead** of `master`,
> up from 69 yesterday; UAT is further back still. Same shape as the 97-commit drift that
> prompted the Working Agreement — deliberate and slower, but **not shrinking**. Cost of
> Capital is now finished, which makes this a natural moment to get the batch to the master
> team before it grows further.

---

## Environment notes

- Node via the NVM symlink. **`npm` is not on PowerShell's PATH** — Mike's own terminal needs
  `$env:Path = "C:\nvm4w\nodejs;$env:Path"` first, and Bash needs
  `export PATH="$NVM_SYMLINK:$PATH"`.
- **Dev servers are Mike's to start/restart — the AI never touches them.** `npm run dev:all`
  runs both; a **backend restart** is required after any change under `server/`.
- This laptop has no `OPENAI_API_KEY`, no MySQL password and a placeholder `JWT_SECRET`. None
  of the three affects the report calculators — those routes are anonymous. Visible effect:
  the firm currency cannot be looked up, so money shows in the **NZD default**.
- **No `zip` binary on this machine and no zip library in the repo** — see the `.xlsx` note
  above before attempting another workbook correction.
