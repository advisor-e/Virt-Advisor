# Session Notes — 2026-07-28 (C) · Laptop (Business Performance Report)

> **Cost of Capital phase 5 — the advisory layer — is built as far as it safely can be.**
> Two commits, **both pushed**. Suite **1,871 → 1,915 green / 132 suites**, lint 0 errors,
> tree clean, branch **69 ahead / 0 behind `origin/master`**, level with its own remote.
>
> Third session of 2026-07-28. The first built the Cost of Capital backend, the second the
> screen and the corrected workbook; this one turned the finished number into advice.
>
> **Desktop: `git fetch origin && git merge origin/master` first, as usual** — this work is
> on `feat/business-performance-report`, so it only reaches the desktop once this branch is
> merged by PR. **Nothing here touches any Course Builder file.**

---

## What shipped (2 commits, Mike-approved per change, both pushed)

1. `212bee9` — **the hurdle-rate test** (phase 5a) + 29 tests.
2. `34d33bc` — **adopt-a-beta with provenance** (5b) and **"what moves the answer most"**
   (5c) + 15 tests.

---

## 1 · The hurdle-rate test (phase 5a)

**Owner-verified in the running app** — 250,000 costing / 22,000 earning → *"Clears your
cost of capital by 2.64 percentage points"*, needs 15,407, ahead by 6,593. Exact match.

**Input shape RULED:** the advisor enters the **money** — cost and expected annual earnings
— and the return percentage is **derived**, over entering the percentage directly. The
percentage is the figure a client cannot easily produce, so calculating it is real help
rather than a data-entry chore.

**The hurdle is the WACC exactly as calculated, with NO risk margin** — and it says so on
screen, not just in a comment. An optional buffer is its own later ruling.

- Engine returns CODES (`CLEARS`/`MEETS`/`SHORT`); the English lives in the locale file.
  **`MEETS` exists so an investment landing exactly on the bar is forced into neither a
  pass nor a fail.**
- Returns **null** unless both figures are usable — *an advisor mid-typing is not an
  advisor in error*.
- Judged against the **same** `wacc` the response carries, pinned by strict equality (the
  `inUse` reasoning applied to a verdict).
- **The verdict is the only toned element on the screen.** The headline WACC deliberately
  has none. Tone is a second signal only — the sentence carries the meaning in words, so
  it survives greyscale and colour-blindness.

---

## 2 · Adopt-a-beta (5b) and "what moves the answer most" (5c)

**Adopt-a-beta** — a "Use this Beta" link on each of the two **suggestion** boxes, never on
the beta already in use. Takes the **full-precision** figure, not the two decimals on
display, so the answer matches the suggestion it credits. The provenance line clears the
moment the advisor types their own, compared against *the value it was adopted at* so an
unrelated field change cannot drop it.

**"What moves the answer most"** — each input raised on its own, WACC recomputed, ranked by
absolute effect. On the sample:

| Input | Change |
|---|---|
| Share index return +1 pt | **+0.36** |
| Beta +0.1 | **+0.35** |
| Government bond rate +1 pt | **+0.33** |
| Borrowing rate +1 pt | **+0.27** |
| Inflation +1 pt | +0.04 |
| Share funded by debt +1 pt | −0.03 |
| Company tax rate +1 pt | −0.02 |

> **That ranking is itself a finding:** the market inputs dominate and the tax rate barely
> registers. It tells an advisor where the client conversation belongs.

Sorted by **magnitude**, not signed value. The one-at-a-time rule is **stated on screen** —
a reader assuming the lines add up would badly overestimate changing two things at once.
Shown as signed percentage **POINTS**: the figures compared are themselves percentages.

---

## 3 · ⛔ The gearing curve is DROPPED — do not build it as specified

**Proved before writing any of it.** This model holds the cost of equity **fixed** as
gearing rises, so the WACC falls in a straight line:

```
0% debt → 7.27%   …   50% → 5.79%   …   100% debt → 4.32%
```

The "optimal" mix is **100% debt**. That is not advice — it is a wrong answer with a chart
around it. A real gearing curve needs **beta re-levering** (equity gets riskier as you
borrow) and some pricing of financial distress: finance theory the workbook does not
contain, and its own owner decision.

> **The lesson worth keeping:** the check that caught this took two minutes and happened
> *before* any code. Being asked to go fast is exactly when it is worth running.

---

## 4 · Static reference links — designed, mapped, worded, NOT built

**RULED: the links follow the FIRM'S SELECTED CURRENCY**, not a hardcoded country. Six
supported (`data/currencies.json`, default NZD). Agreed mapping: **NZD** RBNZ / S&P-NZX 50
· **AUD** RBA / S&P-ASX 200 · **GBP** Bank of England / FTSE 100 · **EUR** ECB / EURO STOXX
50 · **USD** US Treasury / S&P 500 · **CAD** Bank of Canada / S&P-TSX Composite.

**Stopped deliberately.** The approval was "verify the links resolve, then build", and
**verification is not possible from here**: of 12 URLs only **2 confirmed** (Bank of
Canada, ECB). RBNZ, RBA, Bank of England and S&P Global return **403 to an automated
request**; the US Treasury page timed out; the LSE page renders via script. That is bot
protection, not dead pages — but the **page paths** could not be confirmed, and confirming
them was the entire point of the check.

**On the table when this resumes:** point at each institution's **top-level statistics
section** rather than a deep page (shallow links survive site reorganisations; deep ones
are what rots), plus a booked human click-through of all twelve.

---

## Testing — and three real gaps that passing tests were hiding

**+44 tests this session. Mutation-verified outside the repo** (`scratchpad/mutate-hurdle.js`).
Final run: **21 mutants, control green, ALL KILLED, 0 harness errors** — the first clean
first pass on this model.

**Three gaps found, every one sitting under a passing test:**

1. **The currency test asserted digits only.** A hand-rolled `'$' + toLocaleString('en-US')`
   produced the same "15,407" and survived. Now switches the firm currency to GBP and
   asserts the figure follows — which a hardcoded formatter cannot.
2. **The break-even test used $250,000, which divides exactly in binary**, so it never
   exercised the tolerance it existed to test. **499 of the 2,000 round thousands from
   $1k–$2m do NOT round-trip exactly**; at $35,000 the margin lands at −6.9e-18 — *"falls
   short by 0.00 percentage points"* on an investment priced to break even to the cent.
3. **Nothing tested which input box fed which field.** Every test called methods directly,
   so two boxes bound to each other's field passed the whole suite. Four DOM tests added,
   located **by label, not position**. The second immediately caught a further class:
   **writing a value and displaying one are separate bindings** — a cost box *showing* the
   earnings figure passed the first three.

> ⚠ **The harness itself was wrong TWICE more before it was believed.** Jest writes its
> summary to **stderr**, and `execFileSync` returns only stdout on a passing run, so a
> healthy control read as "no tests ran". And **`$'` in a string `.replace()` is JS's
> "everything after the match" token**, which mangled one mutant into a compile error.
> Both were reported as verdicts. **Fifth time on this model.** The harness now refuses to
> call a run with zero passing tests a kill, and runs model mutants against the *model*
> suite — pointing them at the component suite made three read as survivors.

---

## Waiting on Mike

1. ⚠ **View 5b and 5c in the running app** — the adopt-a-beta button, its provenance line,
   and the sensitivity table. **Needs a backend restart.** Phase 5a was checked; these were
   not, and no test measures rendered pixels. *Twice today the owner's eye caught what tests
   could not.*
2. **The reference links** — build them against top-level statistics pages, or leave out?
3. **`v0.6.0`: which record is true?** `DEPLOYED-VERSIONS.md` says *offered*;
   `SESSION-2026-07-27-NOTES.md` says *"still not sent"*. **Third session carrying this.**
4. **The Lease vs Buy `.xlsx` contradiction** — `ACTIONS.md` records it done (`402c595`) and
   outstanding, two lines apart. **Third session carrying this.**
5. **Two visual checks from earlier sessions were confirmed good** — Model Library stays
   light in dark mode, and the stepped-page header spacing. Both now closed.

---

## Cost of Capital — where the model stands

**Backend, screen, corrected source workbook, hurdle test, adopt-a-beta and the sensitivity
view are all complete.** Remaining:

- 🚧 **Static reference links** — designed and ruled, blocked on the decision above.
- ⛔ **Gearing curve** — dropped; needs a finance ruling on beta re-levering before it could
  ever be built.
- ☐ **Open question (not a defect):** the growth rate is a TOTAL change across the window,
  not annualised, and the workbook applies it once as a plain multiplier on the cost of
  equity. That is the workbook's method, not standard CAPM. Ported faithfully; flagged.
- ☐ **P3 · DOC:** several cell references in our own comments are wrong (`K21` not `H21`,
  etc.). No figure is affected — only a future reader re-checking by hand.
- 🔒 **Live market-data feed** — still deferred; needs a licensing + cost ruling.

---

## Release position

**`v0.6.0` is NOT being chased; a fresh tag will supersede it** (ruled 2026-07-28).

> ⚠ **Watch item, and it grew again today.** The branch is now **69 commits ahead** of
> `master`, up from 66 this morning; UAT is further back still. Same shape as the
> 97-commit drift that prompted the Working Agreement — deliberate and slower, but not
> shrinking. **Worth a plan for getting this to the master team before it grows further.**

---

## Environment notes

- Node via the NVM symlink. **`npm` is not on PowerShell's PATH** — Mike's own terminal needs
  `$env:Path = "C:\nvm4w\nodejs;$env:Path"` first, and Bash needs
  `export PATH="$NVM_SYMLINK:$PATH"`. This cost time at the start of the session.
- **Dev servers are Mike's to start/restart — the AI never touches them.** `npm run dev:all`
  runs both; a **backend restart** is required after any change under `server/`.
- This laptop has no `OPENAI_API_KEY` — advisor-chat routes cannot be live-verified here.
