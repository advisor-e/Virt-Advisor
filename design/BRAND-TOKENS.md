# Advisor-e — Brand Tokens (design system)

> Brand rules for the Business Performance Report feature, to match the master app
> **Advisor-e.com**. Set by the owner 2026-07-09. Apply to every screen, mockup, chart, and
> the eventual built UI.

## Typography

- **Open Sans, Light (weight 300) is the default** for all text.
- Use **600** only where data legibility needs it (large figures, pills, emphasis).
- In the artifact/mockups the font is embedded as a base64 `@font-face`; in the built app,
  add Open Sans as a proper asset.

## Brand palette (use in this order of preference)

| Token | Hex | Typical use |
| --- | --- | --- |
| Navy | `#002B64` | Headings, primary text (ink), dark grounds, node/centre fills |
| Cyan | `#00B1E0` | Bright accent, highlights, eyebrows, dark-theme accent |
| Sky | `#7FD3F1` | Soft fills, light accents |
| Blue | `#0070C0` | Primary interactive (buttons, sliders, links) on light |
| Pure blue | `#0000FF` | Strong accent, sparing |
| Charcoal | `#3A3A3A` | Neutral text / grounds where a warm-neutral is needed |

## Semantic (strong — signal only, not the accent)

| Meaning | Hex |
| --- | --- |
| Good | `#4CA52D` |
| Caution | `#FF9900` |
| Danger | `#FF0000` |

## Journey stages — for multi-stage feature screens, NOT for reports

*(Added 2026-09-01 on Mike's ruling: "colours can still be consistent — they should be listed
in the design handbook.")*

Some features are a **sequence a person moves through** rather than a report they read. On those
screens a reader needs to see at a glance which part of the journey they are in, and three shades
of the same blue cannot carry that. These three hues do, and they are **the only three** — a
feature needing stage colours uses this set rather than inventing its own.

| Stage | Token | Hex | Meaning |
| --- | --- | --- | --- |
| 1 | Navy | `#002B64` | **Setup.** Configuration done once, before anyone uses the feature. The existing brand Navy, unchanged. |
| 2 | Teal | `#00857A` | **Live.** The thing actually happening — a meeting in progress, a session being run. |
| 3 | Violet | `#5B4B9E` | **Afterwards.** Output, results, and what a manager may see. |

**The rules, so this set stays three and does not become six:**

- **Reports do not use it.** Every screen governed by `REPORT-VISUAL-STANDARD.md` stays on the
  brand blues above. This set exists for feature journeys, and the first is Meeting Review.
- **Navy is reused, not replaced.** Stage 1 *is* the brand Navy, so the palette grows by two
  hues rather than three.
- **Interactive controls stay brand.** Buttons, links and sliders remain Blue `#0070C0` / Cyan
  `#00B1E0`; a stage hue colours the *band and rail* that say where you are, never the control
  that says what you can do.
- **A fourth stage is a design problem, not a colour problem.** If a feature seems to need one,
  the journey is probably drawn wrong — say so rather than adding a hue.
- **Semantic colours are unaffected** and still outrank a stage hue: good / caution / danger
  always read as state.

**First use:** [`mockups/meeting-review.html`](mockups/meeting-review.html) — Setup (the firm sets
its standard) · Live (the advisor's meeting) · Afterwards (the two reports and the manager's
patterns). Recording uses Danger `#FF0000` from the table above, and nothing else on that page does.

## Notes

- Semantic colours signal state (good / caution / danger) and are kept separate from the
  brand blues.
- Neutrals should bias toward navy/charcoal, not a pure grey.
- Both light and dark themes are supported; see `design/mockups/working-capital-cycle-mockup.html`
  for the working token set (light + dark).
