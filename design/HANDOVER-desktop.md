# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-10-01 · Desktop · branch `feat/firm-quiz-builder-ui`

**0 behind master, 6 ahead once this shutdown's commit lands; pushed; suite green:
682 suites / 14,772 tests on Node 14.15, audit PASS.**

**44.3 — bad debts BUILT, Mike's call PROCEED, `activeOn` desktop.** A short collection
profile, local or overseas, is charged as a bad debt in the month of the sale: the P&L's
Bad debts line, step 3 and the Notes, in Mike's approved wording
([`THREE-WAY-FORECAST-BAD-DEBT-WORDING.md`](THREE-WAY-FORECAST-BAD-DEBT-WORDING.md)).
Walked on a production build; the walk found the step-4 "month after" lever stretching
every profile back to 100% (fixed, `e3686275`). Step 3 now refuses overseas "Then they
pay" over 100% and a supplier balance that is not exactly 100%; a short profile shows
amber. **Left in 44.3:** deferred tax, leases, shipping terms — each needs Mike's drawing
and wording first.

**8.6 marked `activeOn` laptop** on Mike's yes — your 30 Sep handover says it is in hand there.

### FOR THE LAPTOP

- **Merge `master` at startup** once this reaches it (the check showed you 32 behind today).
- Shared files changed here: `locales/en.json` (`assume.debtorShort`; `notes.method.badDebt*`;
  `notes.differs.badDebtsShort`; `report.line.badDebts` — `collectedOverseasGap` and
  `badDebtsOverseasGap` removed), `design/features/to-do-items.json`,
  `design/features/README.md` (the report-models row).
