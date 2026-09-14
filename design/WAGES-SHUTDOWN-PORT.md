# The Wages/Salary Review — the Shutdown basis, and why it reports zero

> **Written 2026-09-14 so a fresh session can start cold.** Everything here was traced out
> of `design/report-source-models/Wages Model.xlsx` by reading the stored XML. It is the
> build spec for item **4.102**. The Brief
> ([`features/report-models.md`](features/report-models.md) § *Wages/Salary Review*) says
> how the product works **now**; this page says what is wrong with the shutdown half and
> exactly what to build. When the port lands, the durable parts move to the Brief and this
> page goes.

---

## 1. The fault, in one table

A firm runs on **one of two bases**, never a blend (Mike's decision 3). Seasonal is built
and correct. Shutdown is not.

| Basis | The workbook's own team | A team built on our step 1 |
|---|---|---|
| Seasonal | revenue 1,362,740 · margin 288,935 | **identical** ✅ |
| **Shutdown** | revenue 973,328 · margin −97,157 | **revenue 0** · margin −15,600 |

**Why.** `computeWages` takes two ready-made twelve-month arrays per person —
`shutdownWage[]` and `shutdownRevenue[]` — and uses them as given. The sample carries them
because the porting session lifted them from the workbook's cached values. **Step 1 never
collects them**, so a real client's team arrives with neither and the shutdown path totals
zero revenue.

🔴 **This is reachable today.** The Shutdown button is live on step 2, and the model has been
in the Model Library since 2026-09-14. An advisor who picks Shutdown for a real client gets
a report saying the business earned nothing, with no warning. Mike was offered the option of
disabling the button until the port lands and declined it — *"nope - plan the fix properly
then get it done"* — so it stays live and the port is the fix.

---

## 2. What the shutdown basis actually is

All of this is on the **`Shutdown Inputs`** sheet (408 typed cells against 2,504 calculated).

⚠ **Read the column map from the sheet's own header row, never by eye.** Like `Seasonal
Inputs`, this sheet uses **1.88-wide spacer columns** — here at F, H, J, L, N, P, R, V, X,
Z, AB and more. A reading that skips empty cells shifts every field one to the left and then
answers confidently about the wrong column. Headers are on **row 6**, people from **row 7**.

### 2.1 The ten typed cells per person

| Col | Header (the workbook's own words) | Mary G | In step 1 today? |
|---|---|---|---|
| E | `Hrly Charge Rate` | 35 | ✅ |
| G | `Hrly Pay Rate` | 19 | ✅ |
| **K** | **`Weekly 'Base' Hrs`** | 32 | ❌ **new** |
| **O** | **`Weekly Overtime Hours`** | 0 | ❌ **new** |
| Q | `Annual + Sick Leave (Days)` | 20 | ✅ |
| **S** | **`Productivity (Chargeable) %`** | 0.5 | ❌ **new** |
| Y | `Overnight/ Meals + Accom' Allowance` | 0 | ✅ |
| AA | `Avg Number of Nights/ Meals` | 0 | ✅ |
| AC | `Wkly Tools Allowance` | 0 | ✅ |
| AE | `Employer Contribution to Retirement` | 0.03 | ✅ |

**Three genuinely new fields**: weekly base hours, weekly overtime hours, productivity.

🔴 **This settles something recorded wrongly.** `Weekly base hours` and `Weekly overtime
hours` were dropped from step 1 because on `Seasonal Inputs` they are **typed but read by
nothing**. That is true *of that sheet*. On `Shutdown Inputs` they are **live inputs** — the
whole wage and revenue chain runs off them. The drawing's step-1 inventory was mixing the
two sheets. The Brief's step-1 table is correct for the seasonal basis and must not be
"corrected" on the strength of this page.

### 2.2 Sheet-level settings

| Cell | Meaning | Value |
|---|---|---|
| `M5` | overtime uplift | 0.5 |
| `Q5` | `Stat Holidays` | 11 |
| `U5` | `Sick Days` | 10 |
| `AC50` | total production days in the year — `sum(E50:AA50)` | 231 |
| `BY5` | production days in months where overtime applies — `sumif(E52:AA52,"Yes",E50:AA50)` | 116 |

### 2.3 The derived chain, per person

```
M  = G*(1+M5)                      overtime pay rate          19 → 28.5
U  = G*K*52                        annualised base wages      31,616
BE = K*52                          annual base hours          1,664
BF = BE*S                          chargeable annual hours    832
BX = if(S=0,0, K/5*S)              chargeable base hrs/day    3.2
BW = if(S=0,0, O/5*S)              chargeable overtime hrs/day 0
BG = (Q + Q5 + U5) * BX            hours lost to leave/stat/sick  131.2
BH = BF - BG                       net chargeable hours       700.8
BJ = BH*E                          annual revenue             24,528
BL = BJ / AC50                     revenue per production day 106.18
BT = if(BY5=0, 0, BS/BY5)          overtime revenue per overtime-day
```

### 2.4 The two monthly figures

```
monthly revenue  DB7 = if(overtimeApplies, days*BL + days*BT, days*BL)

monthly wage     CL7 = if(overtimeApplies, (CA + CB + CE)*4.33 + CG + CI/12,
                                           (CA      + CE)*4.33 + CG + CI/12)
   CA = K*G        weekly base wage         608
   CB = O*M        weekly overtime wage     0
   CE = Y*AA       the overnight allowance  0     ← see §3
   CG = (AC*52)/12 monthly tools allowance  0
   CI = (U+AG)*AE  employer retirement      948.48
```

`days` is that month's production days (`Cash Report` row 5) and `overtimeApplies` is that
month's switch (`Cash Report` row 11).

### 2.5 The per-month switch — the button Mike remembered

**`Cash Report` row 11 is one typed Yes/No per month**, and the workbook labels the same
cell two different ways: *"Overnight/ Allowances Apply"* where it is typed, and **"Overtime
Applies"** on `Shutdown Inputs` row 52, which mirrors it. Exactly three formulas read it:

| Reader | Effect |
|---|---|
| `Cash Report` E13:P13 | adds the allowance (1,400 seasonal / 2,600 shutdown) |
| `Cash Report` E20:P20 | adds that allowance into Total Projected Wages Cost |
| `Shutdown Inputs` row 52 (×12) | the overtime gate above |

⚠ **It means different things on each basis.** On **seasonal** it drives the allowance
only — overtime there is gated by the separate global flag `Seasonal Inputs` J4. On
**shutdown** it drives the allowance *and* the overtime. So step 3's row must keep the
Cash Report's label; a rename to "Overtime & allowances apply" was proposed and **withdrawn**
because it would be wrong for seasonal firms.

---

## 3. 🔴 Two things to settle BEFORE writing engine code

### 3.1 Is the allowance counted twice on the shutdown basis?

`CE = Y*AA` sits **inside** each person's monthly wage (`CL`, ×4.33). The Cash Report then
adds `$AH$7` (2,600) **again** on row 20 for any ticked month. Either the workbook
double-counts, or `CE` and `AH7` are different things.

Our engine currently does `wageCost = shutdownWages + allowances.shutdown` — so if `CL`
already contains the allowance, **we double-count it too**.

**Resolve this first.** It decides whether `allowances.shutdown` survives at all. The
cheapest check: total `CL7:CL38` for one month against `Cash Report` row 20 with `C5="Yes"`.

### 3.2 The overtyped allowance cells — a real workbook defect

`CE` is a formula (`Y*AA`) on most rows. On **rows 18, 19, 20, 21 and 36** it has been
**typed over with stray label text** — *"Cost of Leave, Sick Leave, Sta…"*, *"Custm 2"*. Those
people's monthly wage therefore reads text where a number belongs.

This is the same defect family as the two already corrected in this port (the row-offset
base wage, and the season card dropping employer retirement), and Mike's standing rulings
cover it — *"fix it - always"* and *"NEVER allow a mistake to remain"*. **Correct it to
`Y*AA` and pin it beside the workbook's own figure, mutation-verified**, exactly as the other
two are in `tests/unit/wagesModel.test.js`.

⚠ This is also the true cause of the earlier finding that "the shutdown allowance column
interleaves label text and cannot be read safely." It is not a labelling quirk. It is
overtyped formulas.

---

## 4. The build, in order

1. **Settle §3.1** (the double-count) and report the answer before writing engine code.
2. **Correct §3.2**, pinned and mutation-verified.
3. **Port the shutdown model into `server/report/wagesModel.js`** — compute wage and revenue
   per person per month from the typed fields in §2.1, replacing the two pre-baked arrays.
   Keep `DEFAULT_INPUTS` reproducing the workbook.
4. **Golden test** against the workbook's cached values, the corrections pinned beside the
   originals — the standard this port has held throughout.
5. **Step 1 gains the three new fields** (weekly base hours, weekly overtime hours,
   productivity), shown when the Shutdown basis is chosen.
6. **Prove it end to end**: a team built on our screens, on Shutdown, reproducing the
   workbook instead of reporting zero. The seasonal figures must not move — 1,362,740 /
   288,935 / July −132 are pinned and are the regression guard.

## 5. What must NOT change

- **The seasonal basis.** It is correct, golden-tested and live. Every seasonal figure stays
  where it is.
- **The engine is backend-only and pure.** No model call, no I/O, CommonJS, Node 14.15.
- **Step 3's monthly row keeps the Cash Report's label** (§2.5).
- **The Brief's step-1 deviation table stays as it is** — it is right for the seasonal
  sheet (§2.1).
