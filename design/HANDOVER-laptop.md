# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-05 · Laptop · branch `feat/advisor-progress`

Suite **7,878 green** (409 suites), lint 0 errors, everything pushed.

### 🔴 PR #59 IS MERGED — MASTER MOVED, AND `npm run build` WAS RUN FIRST

Seventeen commits landed on `master` (`8802ef4`). The branch is level with it, 0/0.
**Nothing is tagged**, so the master team has nothing new to pull and no
`DEPLOYED-VERSIONS.md` row is due. **DESKTOP: merge `master` in before you start** — it now
carries the whole forecast intake, the engine and the report screen.

### What changed today

**The two proper fixes are built** (facilities, stock in transit) from the ruled drawing.
A facility carries its balance instead of amortising; funding rows go to eight, not three;
deposits on stock in transit become stock when the container lands. **The drawing was wrong
by omission about GST** — it is triggered by goods arriving, not by paying for them, worth
~124,000 on the client it was found with. Rules now in `TAX-RULES-IMPORT-GST.md`.

**Five changes for junior advisors**, all Mike's ask: a glossary (`data/glossary.json` +
`base/GlossaryTerm.vue`), a collection profile that says what its gap *means*, an
opening-figure count on step 2, a purchases year total, and the report's **Summary / Every
line** setting. Summary is still the default and unchanged. **Facility interest finally has
a row**, having been engine-only that morning for want of anywhere to put it.

Detail is in `features/report-models.md`; closures in `to-do-done-and-parked.md` §2.

### 🔴 A trap that was found and fixed, worth knowing about

`resolveInputs` mapped over the three SAMPLE loans, so any caller sending fewer than three
silently inherited a fictional company's 1,000,000 of debt. It never bit only because the
screen always sent exactly three.

### Next

**4.67 is new and it is nobody's yet: none of today's four screens has been opened in a
browser.** ⚠ The API does not hot-reload — restart `npm run backend`, and it may need a
force-kill on port 4000.

**4.15, 4.58, 4.60, 4.65, 4.66 wait on Mike. 4.50 needs UAT.**

### DESKTOP

4.62's last screen — the Three-Way Forecast — is yours and unblocked. Its intake, model and
report files all changed today; take them from `master`, not from memory.
`shipmentTimer` in `ThreeWayForecastIntake.vue` is still never cleared on destroy, still
deliberately not filed.
