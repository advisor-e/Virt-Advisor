# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-23 · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean and pushed at `2c885f59`. 614 suites / 13,501 tests green, lint 0 errors, audit gate
PASS.** Merged your PR #118 on the way in — 4 ahead, 0 behind. **`activeOn` clear here**; 15.1
is yours and I touched none of its files. Your note read from the check's OTHER BRANCHES box,
not my working tree.

### 7.5 IS BUILT — the Model Choices tab, at all four manager tiers

The screen half finally shipped: it was blocked on `FirmManagerHub.vue` (9.1's `touches`), and
9.1 released it on 2026-09-12. A manager can now read which calculator the AI named, and the
declines band — the gap map, nineteen models against twenty-two domains.

🔴 **TWO DEVIATIONS, BOTH NAMED ON THE DRAWING BEFORE ANY CODE** and both in `ARTEFACTS.md`: no
period selector (the route takes no date range), and **three count tiles, not four** — band 1's
conversations-count lives in `advisor_va_sessions`, a second read. Whether either is worth
building is Mike's call, on the item.

### 13.3 CLOSED — the currency is set in the hub, still shown on the Model Library

Mike ruled BOTH, not move (2026-09-23): the Hub sets it, the Model Library keeps it read-only
so a reader can still tell which currency a report is in. Firm tier alone. **No backend change
— the write route was already manager-gated.**

🔴 **13.1'S RELABEL SENTENCE NEARLY WENT WITH THE OLD PICKER.** Deleting the save confirmation
would have taken *"Figures are relabelled, not converted"* with it. The wording guard caught
it; the guard was updated to follow the string, never relaxed to fit.

### 🔴 THE INTEGRATION EMAIL HAS NEVER BEEN SENT — it is Mike's, and two score-4 items wait on it

Found while checking 11.1, which records itself as waiting on *Outside* for question 7. Nothing
in the repo records the email going out and its header still reads *"Draft for Mike to send."*
It is now verified against today's code: **v0.13.0** (was v0.8.0), a **ninth question** added
for the client login built 2026-09-03, and the database request numbered. **11.1 and 16 both
unblock on it.** Also: the master team has pulled nothing since **v0.7.0 on 4 August** — six
releases offered, all "awaiting pull."

**LAPTOP — shared files I touched**: `components/FirmManagerHub.vue` (three edits),
`components/ModelLibrary.vue`, `locales/en.json`, `tests/unit/hubTabTiers.test.js`,
`tests/unit/mentorHubScope.component.test.js`, `tests/unit/currencyRelabelWording.test.js`,
`to-do-items.json`, `to-do.md`, `to-do-done-and-parked.md`, `ARTEFACTS.md`,
`features/report-models.md`, `features/localisation-and-currency.md`. **Your strategy files
untouched.**

⚠ **PLAYWRIGHT IS NOT INSTALLED HERE** — only the Collaborate project has it, so the
`run-the-app` skill's browser driver cannot run on this machine. I stood in with a jsdom render
mounted against the REAL locale file: the shared test helper's `$t` returns the KEY, not
English, so a plain component mount shows a page of raw keys and reads as a fault that is not
there. It nearly cost me an hour. Both new screens have a `*.manual.test.js` that does this.
