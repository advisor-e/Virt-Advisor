# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-29 at commit `b6e61644`.**

**Working code: 127,778 lines** across 631 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 244 | 65,049 | 21,037 |
| The Restify backend (`server`) | 266 | 54,461 | 39,899 |
| Pages (`pages`) | 51 | 3,313 | 2,312 |
| Front-end helpers (`utils`) | 43 | 3,166 | 2,715 |
| Mixins (`mixins`) | 15 | 1,227 | 527 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 120 | 193 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 98 | 141 |
| Plugins (`plugins`) | 2 | 88 | 54 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **631** | **127,778** | **66,972** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 335 | 59,671 |
| Vue screens and components | 296 | 68,107 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 66,972 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 671 files, 118,259 lines of test code.
- **Locale strings**: 8,852 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
