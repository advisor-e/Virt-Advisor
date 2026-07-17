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

## Notes

- Semantic colours signal state (good / caution / danger) and are kept separate from the
  brand blues.
- Neutrals should bias toward navy/charcoal, not a pure grey.
- Both light and dark themes are supported; see `design/mockups/working-capital-cycle-mockup.html`
  for the working token set (light + dark).
