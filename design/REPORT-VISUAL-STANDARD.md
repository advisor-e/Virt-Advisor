# Report Visual Standard — one look, locked in

> **Status: COMPLETE (2026-07-27).** The numbers below are RULED, the shell-and-guard
> approach is approved, and **all six steps are built, tested and pushed** (Step 1 shell
> `20be0e2` → Step 6 recipe `29fac32`). Every report/model screen in the Model Library now
> renders inside the shared `ReportShell` frame + `--rs-*` tokens, the ruled numbers come
> from that one source, and `tests/unit/reportShellFrame.test.js` fails the build if a live
> report page ever ships without the shell. This document remains the single agreed
> description of how the screens look and how that look is *enforced* so it can never drift
> one screen at a time again. Suite 1,784 green / 127 suites.
>
> **Companion to** [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md) (the build recipe). Where the
> two overlap, this file owns the *visual* numbers; the recipe owns the *steps*.

---

## Why we are writing this (the honest history)

The rule "every model in this section looks the same" was **already agreed on 2026-07-22**
and it is real — it is written at the top of `ADDING-A-REPORT.md`. Last week's work also
did the hardest part: it extracted the **banner** into one shared component (`HeroStrip`)
and the **header** into `ReportHeader`. That is exactly why those two are identical on
every screen today.

**But the job stopped halfway.** Three things were never finished, and that is why the
look drifted again on Lease vs Buy:

1. **The shared "shell" was referenced but never built.** The tests still mention a
   `ReportShell` component that would make the frame + palette + card "identical by
   construction" — it does not exist. So everything *outside* the banner and header (the
   page frame, the colours, the cards, the buttons, the fonts) is still **copy-pasted into
   each screen**, under a different naming scheme each time.
2. **The guard only checks the banner.** The three consistency tests assert the shared
   *banner/header* are present and behave — they say nothing about the frame, palette,
   card radius, font or dark mode. So a screen can ship with none of those and the build
   stays green (this is exactly how Lease vs Buy shipped with no frame at all).
3. **No agreed list of the actual numbers.** There was a rule ("look the same") but no
   single sheet saying *340 or 360? 1120 or 1180? dark mode on or off?* — so each new
   screen guessed, and the guesses diverged.

This document closes all three: it fixes the numbers, it moves them to one source, and it
adds the guard that makes divergence a build failure.

---

## Part 1 — The agreed numbers (the standard)

> Proposed values are marked **(PROPOSED)** until Mike signs off. Values already ruled by
> the owner are marked **(RULED)** with the date.

### Layout
| Dial | Standard | Notes |
|---|---|---|
| Left input column | **360px** (RULED 2026-07-27) | Was 340px on 4 models, 320px on 2. |
| Right (results) column | **`1fr`** (already uniform) | Flexes to fill the rest. |
| Gap between columns | **20px** (RULED 2026-07-27) | Was 20px / 18px. |
| Total content width | **1120px**, centred (RULED 2026-07-27) | Was 1120px / 1180px. |
| Collapse to one column below | **860px** (already ~uniform) | Eight Levers used 900px. |

### Frame (the page canvas)
| Dial | Standard |
|---|---|
| Page background | **`#eef3f8`** light / **`#05132a`** dark |
| Content padding | **`28px 22px 64px`** |
| Min height | **`100vh`** |
| **Where it lives** | **ONE place** (the shared shell) — never "on the component for some, the page for others" |

### Banner (already locked — do not change)
Shared `HeroStrip` component: solid **`#002b64`**, 14px radius, 20px padding, 12px/32px
shadow (RULED 2026-07-22). Cells are `HeroFigure`. **3 or 4 cells is a per-model choice.**

**Placement — RULED 2026-07-27: the banner is a FULL-WIDTH band.** It spans the whole
1120px content column, sitting *above* the two-column input/results layout — a direct child
of the screen's root element, **never nested inside the results column**. Lease vs Buy
shipped with its HeroStrip tucked in the `1fr` results column, so it rendered ~740px while
EBITDA-DCF and the Loan Estimator spanned the full width; the old guards passed it because
they checked the banner *existed*, not *where*. Fixed 2026-07-27 (all six in-column screens
lifted their band to the top) and now guarded — `reportHeadlineConsistency.component.test.js`
asserts the HeroStrip's DOM parent is the screen root, so an in-column banner fails the build.

### Cards
| Dial | Standard |
|---|---|
| Background | `#ffffff` light / `#0a1f3d` dark |
| Border | `1px solid #d5e1ee` light / `#1a3559` dark |
| Top edge | `3px solid #00b1e0` (the cyan signature) |
| Corner radius | **14px** (RULED 2026-07-27) — Loan Estimator currently uses 10px |
| Padding | **`16px 18px`** |
| Title | navy `#002b64`, uppercase, **12px, letter-spacing .1em, weight 600** (RULED 2026-07-27 — one size everywhere) |

### Brand palette (single source)
Light: bg `#eef3f8` · panel `#ffffff` · panel-2 `#f1f6fb` · ink `#002b64` · muted `#5b6f8a`
· line `#d5e1ee` · accent `#0070c0` · accent-bright `#00b1e0` · good `#4ca52d` · warn
`#ff9900` · crit `#ff0000`.
Dark: bg `#05132a` · panel `#0a1f3d` · panel-2 `#07182f` · ink `#e6f0fa` · muted `#9fb4d0`
· line `#1a3559` · accent `#00b1e0` · accent-bright `#7fd3f1`.

> These values already match across the four "full-palette" models — but each redefines
> them under its own prefix (`--mbk-*`, `--lev-*`, `--ddg-*`, `--bpr-*`), and the other
> four screens use raw hex. They have **already drifted once**: the dark `panel-2` is
> `#07182f` in three models but `#0e2440` in Eight Levers. One source ends this.

### Fonts
`'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
base **weight 300**, `-webkit-font-smoothing: antialiased`. Set **once** in the shell —
today 4 screens set it explicitly and 4 only inherit it.

### Buttons (primary CTA)
weight 600, 13.5px, padding `11px 18px`, radius 10px, accent background, contrast text.
One shared style — today re-declared as `.mbk-cta` / `.ddg-cta` / `.bpr-cta` etc.

### Dark mode — **RULED 2026-07-27: ALL LIGHT**
Mike ruled **one light look on every model, regardless of the laptop's theme.** The
partial dark styling that four models carry (`@media (prefers-color-scheme: dark)` in
Margin Breakeven, Debtor Drag, Eight Levers and Working Capital) is **removed** in the
migration — no screen responds to the OS dark setting. This ends the current half-and-half
where four models went dark and four stayed light.

---

## Part 2 — What stays per-model (uniformity, not exactness)

These differ **because the content differs**, and that is correct:
- **Number of headline figures** — 3 or 4.
- **The chart/diagram** — the Working Capital cycle wheel, the break-even curve, the
  debtor-drag bars, the EBITDA valuation bars. Each is model-specific.
- **Inputs: sliders vs typed number fields** — content-driven. Margin Breakeven has 5
  sliders; Lease vs Buy genuinely needs ~28 typed inputs and the Loan Estimator more.
- **The figures, labels and verdict wording.**
- **A single model-specific accent** where it earns its place (e.g. the amber "what-if"
  slider on Margin Breakeven).

If a new model wants anything else outside this list, it is a design decision for the
owner — not something the screen decides for itself.

---

## Part 3 — How it is enforced (so it never drifts again)

Values in a document still rely on remembering. These two moves make the standard
*structural* — the banner already proves the approach works:

1. **One source — the shared shell + tokens.**
   - Define the palette, frame, card, button and font **once** (CSS custom properties +
     a `ReportShell` base component that renders the canvas/centred column/padding and
     slots the screen inside). Every page wraps in `<report-shell>`; every screen reads
     the tokens. No screen re-declares a colour, radius or font.
   - This is the `ReportShell` the tests already expect but that was never built.
2. **A guard that fails the build on divergence.**
   - Extend the consistency guard so a shipped model missing the shell/frame/tokens
     **fails `npm test`**, using the same "explicit list, unmapped = failure" pattern the
     badge guard already uses. Then a future model literally cannot ship frameless and
     green — the exact hole that let Lease vs Buy through.

---

## Part 4 — Migration plan (each step its own approval, tests stay green)

1. ✅ **Shell + tokens** — `components/base/ReportShell.vue` added with the tokens declared
   once; no screen changed. **DONE 2026-07-27, commit `20be0e2`** (+ `reportShell.component.test.js`
   pinning the five numbers and the all-light ruling; suite 1,761 green).
2. ✅ **Adopt, one screen per commit** — all 8 screens moved onto the shell, each deleting
   its copy-pasted frame/palette/card/button. First five earlier 2026-07-27; last three
   Quick Position (`9d41582`), EBITDA-DCF (`ebd6ab8`), Loan Estimator (`b927395`).
3. ✅ **Standardise the numbers** — the two-column layouts read `var(--rs-col-input)` /
   `var(--rs-col-gap)` (→ 360px / 20px), the Loan Estimator input cards read
   `var(--rs-card-radius)` (10px → 14px) and the standard 12px/600 title; Eight Levers'
   900px breakpoint fell to 860px. One source, so a future change lands everywhere. `ff549b6`.
4. ✅ **Dark mode** — all-light. No code change was needed: the 8 screens carry no
   `prefers-color-scheme` block (removed on migration) and the shell has none (pinned by
   `reportShell.component.test.js`). *(The Model Library catalogue's own `--mlb-*` dark
   block is a separate screen, outside this standard — flagged for a separate owner call.)*
5. ✅ **The guard** — `tests/unit/reportShellFrame.test.js` fails the build if a ready
   report's page does not wrap its screen in `<report-shell>`; the guarded list is derived
   from the catalogue's ready routes, so new reports are covered automatically.
   Mutation-verified (shell → plain div fails). `264bdb9`.
6. ✅ **Recipe update** — `ADDING-A-REPORT.md` steps 6/7/8 + checklist + the "three guards"
   section now teach the shell-first flow and the `--rs-*` tokens. `29fac32`.

Ran on `feat/business-performance-report`; each step a separate Mike-approved change under
the LIVE-APP rule. **All six steps complete 2026-07-27.**

---

## Open decisions for Mike — ALL RESOLVED 2026-07-27
1. ~~Dark mode: all-on or all-off?~~ **RULED: all light** (see Dark mode above).
2. ~~Confirm the proposed numbers.~~ **RULED: 360px / 20px gap / 1120px / 14px card radius / 12px card title.**
3. ~~Approve the shell-and-guard approach (Part 3) vs a one-off hand-edit.~~ **APPROVED — shell + guard.**
4. ~~Give the go to start building — step 1 (the shell).~~ **DONE — step 1 built + committed (`20be0e2`).**

Next up: **Step 2** — move the first of the eight screens onto the shell (its own approved change).
