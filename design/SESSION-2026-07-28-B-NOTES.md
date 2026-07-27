# Session Notes — 2026-07-28 (B) · Laptop (Business Performance Report)

> **Cost of Capital (WACC) FINISHED — the screen is live in the Model Library and the
> source workbook is corrected.** Two commits, **both pushed**. Suite **1,848 → 1,871
> green / 132 suites**, lint 0 errors, tree clean, branch **66 ahead / 0 behind
> `origin/master`**, level with its own remote.
>
> This is the second session of 2026-07-28. The first
> ([`SESSION-2026-07-28-NOTES.md`](SESSION-2026-07-28-NOTES.md)) built the Cost of Capital
> **backend**; this one built everything else and closed the model out.
>
> **Desktop: `git fetch origin && git merge origin/master` first, as usual** — but this
> work is on `feat/business-performance-report`, **not** on `master`, so it only reaches
> the desktop once this branch is merged via PR. **Nothing here touches any Course Builder
> file.**

---

## What shipped (2 commits, Mike-approved per change, both pushed)

1. `955507a` — **the screen**, the catalogue row, and all three manual guard entries.
2. `3d7995b` — **the source `.xlsx` corrected**, 72 cells; code and spreadsheet now agree.

---

## 1 · The screen (phase 3)

**9th ready model in the Model Library; 3rd Decision-class build.** Catalogue row, page,
screen, three guard entries and the catalogue census all in **ONE commit** — three build
guards derive their work list from the catalogue's ready routes, so flipping a row to
`ready` before its page exists fails the build looking for a page that isn't there (the
Lease vs Buy lesson).

**A visual artifact was built and owner-approved BEFORE any layout code**, showing real
backend output rather than mock figures. This is now the way to open a screen build — it
is what the post-Lease-vs-Buy rule asks for, and it settled three layout questions in one
round trip instead of three.

### Layout decisions worth keeping

- **The banner carries four figures**, with the funding split as value + sub-line, so all
  five approved output labels fit four cells.
- **The Beta helper runs periods DOWN the page, not across.** Twelve columns of
  seven-figure shareholders' equity will not fit the results column; twelve rows do.
- **The build-up is shown line by line** so an advisor can walk a client down it.
- **The WACC hero deliberately carries no `tone`.** A WACC is neither good nor bad on its
  own, and colouring it green would assert a judgement the model cannot make. The hurdle
  test that *can* judge it is a later phase.

### The growth rate — RULED 2026-07-28

Mike asked whether changing one figure re-works the whole model. It does — `reportRecompute`
watches the form, debounces, and re-asks the backend; **there is no Recalculate button
anywhere**, and a slow older response can never overwrite a newer one.

The one loose end was the derived growth rate. **Ruled: editable, with a "use the calculated
figure" link** — over locking the field, and over leaving a typed value to silently stop
tracking. `form.growthRatePct === null` means follow the Beta helper, and `growthRate` is
**omitted from the request entirely**, so the backend reports `growthSource` honestly rather
than being handed back a figure it derived itself. Clearing the field hands it back too.

**Beta stays advisory** — the workbook hand-enters `E8`, and the human's 0.52 sits between
the helper's 0.47 and 0.36. The one-click adopt button is still a later phase.

### Tests — 16, covering only what the SCREEN can get wrong

The maths, the route and the shared look are already covered elsewhere. These cover the
display→decimal conversion, the single field driving both market-return cells, R8 (the
seeded screen defaults nothing), all five growth-override behaviours, blank-vs-zero in the
series, reactivity, beta never auto-adopted, and the guard-rail wording.

> **The headline sentinel is asserted on the HeroFigure's `value` prop, NOT on
> `wrapper.text()`** — because **"1.6200%" legitimately appears further down the page** as
> the debt's share of the cost. That coincidence is exactly what made the original defect so
> hard to see, and a page-text sentinel would have been permanently red for the wrong reason.

A coverage test derives from the engine's own `WARN` map, so a new guard-rail added without
wording fails the build instead of showing an advisor `ROI_BETA_ATYPICAL`.

**Mutation-verified outside the repo** (8 mutants, control green). **Two initially read as
survivors and were REAL gaps in the tests, now closed:**

1. Reading a series value back after an edit proves nothing about **reactivity** — the array
   does change under a direct index assignment; the *watcher firing* is the subject.
2. Beta auto-adoption is invisible before the first response lands, so that test now mounts
   **with** a result.

> ⚠ **The harness itself was wrong twice before it was believed** — a shell-mangled
> `--moduleNameMapper` made every run fail identically, then a `Tests: N failed` regex
> reported a *compile failure* as a survivor. **Third time this model has taught the same
> lesson: a mutation verdict, killed or survived, is worth double-checking before it is
> trusted.**

---

## 2 · The source workbook (phase 4) — 72 cells

Deliberately opened **once**, after every ruling, rather than edited per defect.

### Five formula corrections

| Cell | Was | Now |
|---|---|---|
| `Beta Calcs!AE40` | `X40-M40` | `LOOKUP(2,1/(M40:X40<>""),M40:X40)-M40` — reach the last **filled** period, not the last slot |
| `Beta Calcs!M43` | `if(M40=0,0,…)` | `if(M40="","",…)` — a blank period stays blank instead of entering as a share price of nothing |
| `Beta Calcs!M52` | `if(M43=0,0,$Y$17-M43)` | `if(M43="","",$Y$50-M43)` — measure the company against its **own** mean |
| `Beta Calcs!M54` | `power(M52,2)` | `if(M52="","",power(M52,2))` — matching blank guard so the squares row cannot `#VALUE!` |
| `WACC Calcs!K21` | `E6+E7*E8` | `E6+E8*(E7-E6)` — CAPM multiplies beta by the **premium** |

`M43` is the **root** of defect 1 and fixes both of its halves at once. **Headline `E26`:
1.62% → 6.16%.**

### Two further instances found in the same pass

`M46`/`M48` — the company chart band — also read the **market** mean and spread where they
should read the company's. Display-only and not ported, so no code change. Corrected under
the standing ruling that a correction covers the **whole section**, not just the cell already
known to be wrong; found by inventorying *every* company-block formula referencing a market
figure rather than fixing only the known one.

### Verified four ways, and the verification is the point

1. **Parses with the repo's own `xlsxReader`** (both sheets, 26 + 70 rows) — re-checked from
   the **installed repo copy**, not only the scratchpad build.
2. **All 14 untouched zip entries are BYTE-IDENTICAL.**
3. **Exactly 72 cells differ**; none added, none removed.
4. **Every corrected cached value agrees with the ported model to 1e-9**, and every
   previously-correct anchor (`Y10` `Y17` `M29` `Y43` `Y50` `K22` `I24` `K24` `L24`) is
   unmoved.

The edit **refuses to run** if any target cell's existing formula is not the exact text
expected.

> **Two cross-checks fell out on their own, and are the strongest evidence the fix is right:**
> `Y52` now sums to **exactly 0** — as the market row `Y19` always did, the arithmetic
> signature of measuring against your own mean, where it read 47,490 before. And `M56` (the
> spread the long way, `sqrt(Y54/M37)`) now **equals** `M62` (`STDEV.P`) at 4.510057035, two
> independent routes agreeing where they previously gave 4,317 and 94.9.
>
> **Look for this kind of self-consistency proof — it beats any single assertion.**

### Tooling worth rebuilding next time

A **zero-dependency ZIP writer** was written for this (session scratchpad, `coc/zipwriter.js`)
that copies unchanged entries' **compressed bytes verbatim**, which is what makes "all 14
other parts are byte-identical" a checkable property. `Compress-Archive` and Python's
`zipfile` both re-compress everything and destroy that proof.

- **Caveat: this archive uses data descriptors** (flag bit 3). Read the crc/sizes from the
  **central directory** (still authoritative) and clear the bit on write.
- ⚠ **File grew 130,337 → 165,730 bytes.** The XML itself grew ~200 bytes; Node's zlib
  compresses this repetitive XML ~37% worse than Excel's encoder and no
  `level`/`memLevel`/`strategy` combination closes the gap. Accepted — git stores a new
  binary blob either way.
- A pristine backup of the original is in the session scratchpad (outside the repo, so it
  will not survive indefinitely).

---

## Waiting on Mike

1. ⚠ **View the screen in the running app** — restart the backend first, or
   `/api/report/cost-of-capital` will not answer. This is the only thing left unverified:
   **no test can measure rendered pixels.** Look at the four banner figures
   (6.16% / 6.55% / 4.32% / 62.5%), the build-up reading down to the same 6.16%, and the
   growth field — type over it and the "use the calculated figure" link should appear.
2. **The six guard-rail warning strings are MINE, not approved wording** (e.g. *"Beta from
   growth falls outside the usual range of 0.3 to 2.5. Check the figures before relying on
   it."*). They appear only when the entered figures cannot produce a sensible beta.
   Everything else on screen is the approved list.
3. **Model Library in dark mode** — still outstanding from the previous session: switch
   Windows to dark, confirm the catalogue stays light.
4. **`v0.6.0`: which record is true?** `DEPLOYED-VERSIONS.md` says it was *offered* to the
   master team; `SESSION-2026-07-27-NOTES.md` says it was *"still not sent"*. Both cannot be
   true, and the ledger is the binding document. **Unchanged from this morning.**
5. **The Lease vs Buy `.xlsx` contradiction** — `ACTIONS.md` records the source correction as
   **done** (`402c595`) in one line and **outstanding** two lines below. One is stale.
   **Unchanged from this morning.**

---

## Logged, not fixed

☐ **P3 · DOC — several cell references in our own notes and code comments are WRONG.** Cost
of equity is **`K21`** (not `H21`), cost of debt after tax **`K22`** (not `H22`), the tax
shield **`K24`** (not `J24`), company volatility % **`P62`** (not `O62`), market volatility %
**`P29`** (not `O29`), and the two displayed betas are **`I8`/`K8`** (not `H8`/`J8`).
Affects the header comment in `server/report/costOfCapitalModel.js`, the cell-ref comments in
`costOfCapitalModel.test.js`, and the `ACTIONS.md` entries. **Nothing is computed wrongly** —
every figure and test still matches the workbook; only the labels a future reader would use to
re-check by hand are off, which is precisely when a wrong reference costs an hour.

> **Why it was missed until now:** two ad-hoc regexes over the sheet XML each lied — one
> matched across cell boundaries, the other assumed `r` was the first attribute on `<c>`.
> **When reading raw sheet XML, write a real tokeniser, not a regex.** The parser that found
> this is in the session scratchpad (`coc/cells.js`).

---

## Cost of Capital — where the model now stands

**Backend, screen and source workbook are all complete.** Remaining, each its own approval:

- **The interactive advisory layer Mike ruled in:** hurdle-rate test (does a proposed
  investment clear the WACC?), gearing curve (which debt/equity mix minimises it — advice the
  workbook cannot give), sensitivity view, helper-to-calculator adopt button with provenance,
  and static reference links to where the bond rate and index return are published.
- ☐ **Open question for a later ruling (not a defect):** the growth rate is a TOTAL change
  across the supplied window, not annualised, and the workbook applies it once as a plain
  multiplier on the cost of equity. Using a company's own recent growth to inflate its cost of
  equity is the workbook's method, not standard CAPM. Ported faithfully; flagged.
- 🔒 **Deferred, needs its own ruling — a LIVE market-data feed.** Static reference links are
  in scope above and carry no risk. A live feed needs a backend-only API key, costs money, and
  market data is typically **licensed with redistribution to clients restricted**; it can also
  fail mid-client-meeting. No client-privacy exposure (only a ticker leaves the building).

---

## Release position (unchanged, ruled 2026-07-28)

**`v0.6.0` is NOT being chased; a fresh tag will supersede it.** Build more models first so
the master team pulls **once**, then release.

> ⚠ **Watch item.** The branch is now **66 commits ahead** of `master` and UAT is further back
> still. This is the same shape as the 97-commit drift that prompted the Working Agreement —
> slowed down and deliberate, but not eliminated.

---

## Environment notes (unchanged)

- Node via the NVM symlink; `npm`/`node` are **not** on the default session PATH — export it
  first (`export PATH="$NVM_SYMLINK:$PATH"`). npm 6 there is READ-ONLY use; installs need the
  npm 10 + `--legacy-peer-deps` route.
- **Dev servers are Mike's to start/restart — the AI never touches them.** A backend restart is
  needed before `/api/report/cost-of-capital` will serve.
- This laptop has no `OPENAI_API_KEY` — advisor-chat routes cannot be live-verified here.
