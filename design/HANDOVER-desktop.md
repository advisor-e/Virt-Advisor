# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-30 · Desktop · branch `feat/firm-quiz-builder-ui`

**Released: `v0.14.0`** — on Mike's instruction, *"complete alignment with the laptop and then …
cut a new release, inclusive of all handover notes for the master coding team"*. The laptop's
branch reached `master` through PR #146, this branch through PR #145, and the tag sits on that
merge. Notes: [`RELEASE-NOTES-v0.14.0.md`](RELEASE-NOTES-v0.14.0.md); the load pack
[`UAT-LOAD-PACK.md`](UAT-LOAD-PACK.md) and [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md) updated
with it. Run tests, commits and pushes with the 14.15 folder first on PATH (item 22.2).

**Done today, all closed on Mike's word:** 13.6 (whole sentences, part one), 44.1 (the forecast
reviewed against NZ IFRS / FRS-42, and Notes to the forecast in every forecast), 44.2 (IFRS 18 /
IAS 7 layout), 44.4 (the printed forecast as a board paper, negatives in brackets, the research
headline and key-figure tiles — the research-prompt paragraph approved word for word). The
economic research's tables and lists now print as tables and lists. **Filed:** 13.8, 44.3.

**Next here: 44.3** — Mike's call proceed; the bad-debt slice first, as designed (the collection
shortfall charged as a bad debt, domestic and overseas).

### FOR THE LAPTOP

- **Merge `master` at startup** — nothing to resolve. Both machines then match `v0.14.0`.
- Shared files changed here today: `locales/en.json` (`report.threeWayForecast.pack`, `.notes`,
  `economicAnalysis.inShort`/`keyIndicators`), `mixins/currencyMixin.js` (`figure`, and
  `bracketNegatives`), `utils/currencyFormat.js` (`accountingMoney`/`accountingNum`),
  `utils/researchText.js` (lists and tables), `data/ai-prompts.json` (economic analysis §6).
- **8.4's note corrected here on Mike's word (the list entry only, none of your files).** It said
  the first build was "never yet run against real OpenAI or a microphone"; `b10854c5` records the
  walk with Chrome's test-tone microphone and real OpenAI calls. It now says so, and that it has
  never been run with a real person speaking.
