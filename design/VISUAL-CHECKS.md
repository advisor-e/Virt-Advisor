# Visual Checks — what a screen must look like

> The standards a rendered page must meet. Item **4.25**.
> Run them with **`npm run visual`**, with the app up.

Jest runs under jsdom, which has no layout engine — it cannot measure a width, a gap or an
overflow. A screen whose boxes are squashed or whose table runs off the page passes all
6,101 tests. Every visual defect this product has had was found by Mike, by opening the
page, after it shipped.

**Width: 1440px.** One width. The 768px breakpoint is not checked.

---

## The rules

### Rule 1 — a box you type into is wide enough to show what you typed

Enforced in two parts:

1. **A floor on every control** — its own furniture (number spinner, dropdown arrow) plus
   two characters, measured on inner width after padding and border. Content-independent,
   so it cannot cry wolf. This is what catches the phasing boxes: ~13px of inner width,
   less than a spinner needs on its own.
2. **The full "shows its value" test on `number` inputs and `select`s only.** Their values
   are bounded and chosen, so a value that does not fit is always a fault.

**Not a failure:** a free-text `input` or `textarea` whose typed value overflows. Those are
built to scroll, and a long firm name in a correctly sized box is not a defect.

⚠ The dropdown arrow is charged for **once**. Buefy reserves it in `padding-right`, which
the inner-width measurement has already removed.

### Rule 2 — no text is cut off

Content bigger than its box is a fault **only where the box is set to hide the overflow**,
and only on elements that directly contain text.

**Not a failure:** `overflow: auto`/`scroll` (the ten-year tables), `text-overflow:
ellipsis` (the property address), or anything the user can scroll to reveal.

This distinction is the whole design. On 2026-08-21 a naive "does anything overflow?" sweep
flagged 10 elements and 51 cells on `/multiple-property` and **every one was deliberate** —
they were declaring their intent in CSS and the sweep was not reading it.

### Rule 3 — the page does not scroll sideways

The document must not exceed the viewport width.

**Not a failure:** a container within the page that scrolls sideways.

### Rule 4 — the page loaded without a JavaScript error

No uncaught error, no failed script or stylesheet. Gathered by the driver, not the page.

### Not rules, deliberately

**"Nothing is collapsed to zero size"** — the rule most likely to produce noise (hidden
panels, unopened tabs). A noisy rule takes the trustworthy ones down with it.

**Per-screen expectations** (*"ten cards, two to a row"*) — rejected as the default because
they rot: every ordinary wording change fails a test that is not broken. Available for a
screen whose arrangement genuinely carries meaning.

---

## Which screens

The report and model screens, and all four manager hubs. Settled by Mike, 2026-08-23 — the
defect that created this item is on a manager screen.

**A hub is not one screen.** The driver opens every menu item the tier shows, reading them
from `[data-tab]` rather than a list kept here, so a new tab is covered automatically.

**A screen that did not render fails.** Not a fifth rule — the precondition the others rest
on. On the first run all four hubs were served at an IPv6 literal that `checkAuth()` does
not recognise, rendered *"Access Restricted"*, and **passed** — an error page has no
squashed boxes on it.

---

## How they run

- `tests/visual/**/*.visual.js`, never `*.test.js`. **The naming is the enforcement:** the
  main suite matches `*.test.js`, so the pre-commit hook cannot collect these wherever they
  are put. `jest.config.js` needs no ignore rule.
- Own config, `jest.visual.config.js`, so no coverage thresholds are inherited.
- `npm run visual`, on demand. Not on commit — they need the app up.
- Fails loudly when the app is not running, naming the command to start it.

**The address is probed, not assumed, and `localhost` is tried first over both address
families.** `nuxt start` announced `http://::1:3000/` on 2026-08-23 and 127.0.0.1 did not
answer at all. The manager pages' dev auto-login keys on the hostname being `localhost` or
`127.0.0.1`, so the order matters.

Screenshots are written to `visual-screenshots/` (git-ignored) on every run.

*`@playwright/test` was rejected — a different package from the approved `playwright`, so a
new dependency for no benefit these checks need.*

---

## First run — 2026-08-23

Sixteen screens plus every hub panel. Two real defects, both confirmed by eye, both fixed:

- `/multiple-property` — a dropdown read **"Convert to Principal &"**, the last word cut
  off. The 150px control column could not hold a ~200px option.
- Group Manager › Team Progress — the page scrolled sideways; fixed column widths totalled
  5px more than the panel. The table now scrolls inside itself.

Three faults in the checks themselves were caught by looking rather than trusting the
output: the arrow double-count, the address probe order, and the did-not-render
precondition. All three would have shipped a check that appeared to work.
