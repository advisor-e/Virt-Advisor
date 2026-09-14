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

| Basis | The workbook's own team | Ours | A team built on our step 1 |
|---|---|---|---|
| Seasonal | revenue 1,362,740 · margin 288,935 | identical ✅ | **identical** ✅ |
| **Shutdown** | revenue 973,328 · margin −97,157 | margin **−81,557** (§3.1) | **revenue 0 · margin 0** |

*(The step-1 column read "margin −15,600" until 2026-09-14. That figure was the
double-counted allowance of §3.1 and nothing else; with it removed the fault shows as the
flat zero it actually is.)*

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
**shutdown** it drives **the overtime only**. So step 3's row must keep the Cash Report's
label; a rename to "Overtime & allowances apply" was proposed and **withdrawn** because it
would be wrong for seasonal firms.

🔴 **CORRECTED 2026-09-14.** This section used to say the switch drove "the allowance *and*
the overtime" on the shutdown basis. It does not. `CE` appears in **both** branches of `CL7`,
so each person's allowance is charged every month whatever the switch says; the only thing
the tick gates on that basis is the flat `AH7` on the Cash Report — which is itself the
double count settled in §3.1 and now removed from the engine.

---

## 3. ✅ Both settled, 2026-09-14 — no engine code was written before they were

### 3.1 Is the allowance counted twice on the shutdown basis? — **YES. Corrected.**

The two sheets build a person's monthly wage differently, and only one leaves the allowance
out:

```
Seasonal Inputs CM7 = BK7+BW7+CH7+CC7                 ← CF7 (the allowance) is ABSENT
Shutdown Inputs CL7 = (CA7+CB7+CE7)*4.33+CG7+CI7/12   ← CE7 (the allowance) is INSIDE
```

`Cash Report` row 20 adds one to both anyway — `AG7` (= `Seasonal Inputs` CF40 = 1,400),
which is seasonal's **only** count, and `AH7` (= `Shutdown Inputs` CE40 = 2,600), which is
shutdown's **second**. The two shutdown additions are not even the same quantity: inside the
wage it is each employed person's `Y*AA*4.33`; on the Cash Report it is the raw **weekly**
column total across the whole 28-row roster, employed or not, added as though monthly.

Proof it is `CL` that row 20 sums: `AL8` = `Annual Hiring Plan` AN82 = `sum(AN49:AN80)`,
each row `if(F<n>=True, ('Shutdown Inputs'!CL<n>*F<r>) + CL<n>, 0)`. April's AN82 caches
**55,704.7515** — reproduced to the cent — and **3,031.00 of it is allowance** before `AH7`
adds 2,600 on top.

**Corrected.** `computeWages` adds the allowance on the seasonal basis only; `allowances`
carries one key, not two. Over the sample year that removes **15,600** of allowance the team
never received (six ticked months × 2,600) and lifts the shutdown margin from the workbook's
**−97,157 to −81,557**. Pinned with the workbook's own figure beside ours and
mutation-verified in `tests/unit/wagesModel.test.js` → *"the ruled deviation — the allowance
counted twice on the shutdown basis"*. The report screen drops the allowance line entirely on
that basis, because *"Overnight allowances for the year: $0"* would be false.

### 3.2 The overtyped allowance cells — **THERE IS NO SUCH DEFECT. Nothing was corrected.**

🔴 **This section was wrong and is withdrawn.** It claimed `CE` on rows 18, 19, 20, 21 and 36
had been typed over with stray label text. It has not. `CE` is a clean shared formula `Y*AA`
on **every** row 7–38:

```xml
CE17  <f t="shared" ref="CE17:CE33" si="144">Y17*AA17</f><v>70</v>
CE18  <f t="shared" si="144"/><v>70</v>      ← a FOLLOWER, not a typed constant
CE21  <f t="shared" si="144"/><v>140</v>     ← 35 × 4 nights, correct
```

**Excel stores a shared formula once, on the master cell, and leaves the followers empty.**
A reader that takes each cell's own `<f>` text sees blanks and calls them typed constants.
That is the whole of it — the same reading-artefact family as the spacer-column trap in §2,
and it also produced the phantom "three of the four allowance cells are overtyped" note that
stood in `components/WagesTeam.vue` and `tests/unit/wagesTeam.component.test.js` until the
same day (the seasonal `CF17:CF20` block is shared too, and equally clean).

⚠ **This section was also offered as the "true cause" of the earlier finding that the
shutdown allowance column could not be read safely. It was not.** The real reason that column
resisted reading is §3.1: there is no separate shutdown allowance to read, because it lives
inside the wage.

**Check a shared formula before calling a cell overtyped.** A follower carries `si` and no
text; an overtype carries neither.

---

## 4. The build — ✅ COMPLETE 2026-09-14

**All six steps are done and the fault is closed.** The durable record is the Brief,
[`features/report-models.md`](features/report-models.md) § *Wages/Salary Review*; this page
now exists only for the trace in §2 and §3 and can be deleted once that is no longer wanted.

1. ✅ **§3.1 settled and corrected.** The allowance was counted twice; the engine adds it on
   the seasonal basis only, pinned and mutation-verified.
2. ~~**Correct §3.2**~~ — **STRUCK. There is no defect there** (§3.2). One step fewer.
3. ✅ **Ported.** `shutdownFigures`, `shutdownRetirement`, `shutdownMonthlyWage` and
   `shutdownMonthlyRevenue` derive wage and revenue per person per month from the ten typed
   cells. The two pre-baked arrays are deleted. The reading was checked against **768 cached
   cells first**: all 384 revenue cells exact, 379 of 384 wage cells — the five exceptions
   being a fourth workbook defect (below).
4. ✅ **Golden test.** `SHUTDOWN_SAMPLE` reproduces `Cash Report` R17 at **973,328.4208**, to
   the cent. Seasonal unmoved at 1,362,740 / 288,935 / July −132.
5. ✅ **Step 1 gained the three fields** — weekly base hours, weekly overtime hours,
   productivity. Shown to everyone and starting empty, on Mike's yes: the basis is chosen on
   step 2 and this is step 1 (his decision 9, not reordered), so the screen cannot know which
   basis applies, and a column that appears only after a trip to step 2 and back is one
   somebody fills in by accident or never finds.
6. ✅ **Proved end to end**, and the guard is non-vacuous: one person with the three fields
   filled bills **88,651.20**; the same person without them bills **0.00** — the original
   fault, reproduced on demand.

### 🔴 A FOURTH WORKBOOK DEFECT, found during step 3 and corrected

`Shutdown Inputs` **CL28** is a shared formula across the twelve month columns. Every other
row anchors the retirement contribution as `$CI$<row>` in **both** branches. Row 28 writes it
as **`CI28` — unanchored — in the "Yes" branch alone**, so each month shifts it one column
right: May reads `CJ28` (blank), July reads `CL28` (April's own wage), January reads `CR28`
(October's). Bevis is charged a twelfth of another month's total instead of a twelfth of his
retirement contribution — **237.42 a month dearer, 712.25 across the three ticked months he is
actually employed for.** April is correct only because it holds the master cell.

⚠ **This is correction 1's cousin**: both are shared formulas whose unanchored reference
drifts as the block fills — down a column there, across a row here. **When checking this
workbook, read what a formula ANCHORS, not only what it says.**

### ⚠ The two sheets are not the same team

Of the 29 rows the **pay rate differs on 24**, the leave split on 27 and the overnight
allowance on 25; the seasonal sheet carries four production staff this one does not, and one
manager is Natalie there and Shirley here. One team cannot reproduce both sheets, so the
shutdown basis has **its own sample**, generated from the sheet rather than typed, and the
route serves the sample matching the basis asked for. *(The leave difference is not a
disagreement: seasonal writes 30 days, shutdown writes 20 with 10 as the sheet-level sick-day
setting. 20 + 10 = 30.)*

---

### What each step was, as originally written

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
