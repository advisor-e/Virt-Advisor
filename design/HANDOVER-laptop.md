# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-05 · Laptop · branch `feat/advisor-progress`

Suite **7,889 green** (409 suites), lint 0 errors, everything pushed.

### 🔴 PR #59 IS MERGED — BUT TWO LATER COMMITS ARE NOT

`master` is at `8802ef4` (17 commits). **`7669979` and `d453327` came after it and are on
this branch only.** `d453327` holds two layout fixes to the forecast report, and the desktop
needs them: 4.62's last screen is that file. **They want a second PR.** Nothing is tagged, so
the master team has nothing to pull and no `DEPLOYED-VERSIONS.md` row is due.

### What changed today

**The two proper fixes are built** (facilities, stock in transit) from the ruled drawing, and
**the drawing was wrong by omission about GST** — it is triggered by goods arriving, not by
paying for them, worth ~124,000 on the client it was found with. Rules now in
`TAX-RULES-IMPORT-GST.md`.

**Five changes for junior advisors**, all Mike's ask: a glossary, a collection profile that
says what its gap *means*, an opening-figure count on step 2, a purchases year total, and the
report's **Summary / Every line** setting — drawn, ruled question by question, then built.

**Then the app was opened, and it found two layout faults older than all of it.** The report
dragged the whole page sideways (a grid item with no `min-width: 0`, so the table's own
scrollbar never engaged) and drew its title banner **twice** (the page and the component each
rendered one). Both fixed and re-measured in a real browser. **Neither was reachable by a
mount test** — jsdom has no layout engine, and both headers rendered perfectly.

Detail is in `features/report-models.md`; closures in `to-do-done-and-parked.md` §2.

### Next

**4.62's last screen is now this machine's** — see the box below. Quick Position is the
template; `mixins/savedReport.js` is the shared half.

**4.67 is narrowed and is nobody's yet:** the report screen has been eyeballed, **step 2 has
not** — the Type column, the stock-in-transit block and the glossary marks. ⚠ The API does not
hot-reload; restart `npm run backend`.

**4.15, 4.58, 4.60, 4.65, 4.66 wait on Mike. 4.50 needs UAT.**

⚠ One push was refused by the pre-push hook with the whole suite green, and the identical
retry passed — most likely `npm audit` failing to reach the network. Not chased.

### 🔴 DESKTOP — 4.62'S LAST SCREEN IS NO LONGER YOURS

**Mike moved it to the laptop on 2026-09-05, and `activeOn` on 4.62 now says `laptop`.** This
breaks the machine-that-started-it convention on purpose: you built all ten other screens, but
the forecast's three files are the laptop's entire recent work and the seam changed under them
today. **Do not start it.** Nothing else about 4.62 moves — slices 1 and 2 are yours and stay
closed.

**Why it changed hands, and the trap in it either way:** the saved-report wiring follows the
header. Screens whose header is in the PAGE — Quick Position, EBITDA-DCF, Loan Estimator —
wire it at the page; the rest wire it in the component. The forecast **joined the page group
today** (`d453327`), and the `client` prop went with it. So **Quick Position is the template,
not the other ten**, and anyone looking for the seam where the ten have it will not find it.

`shipmentTimer` in `ThreeWayForecastIntake.vue` is still never cleared on destroy, still
deliberately not filed.
