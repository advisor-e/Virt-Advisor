# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-14 at commit `d73bf86e`.**

**Working code: 95,711 lines** across 452 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 152 | 47,659 | 14,773 |
| The Restify backend (`server`) | 206 | 42,630 | 30,950 |
| Front-end helpers (`utils`) | 29 | 2,074 | 1,760 |
| Pages (`pages`) | 42 | 1,825 | 925 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 89 | 117 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **452** | **95,711** | **49,156** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 256 | 46,208 |
| Vue screens and components | 196 | 49,503 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 49,156 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 518 files, 90,004 lines of test code.
- **Locale strings**: 6,008 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
