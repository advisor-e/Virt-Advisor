# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-10-01 at commit `d4baff47`.**

**Working code: 133,105 lines** across 662 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 260 | 67,957 | 21,751 |
| The Restify backend (`server`) | 275 | 56,559 | 41,082 |
| Pages (`pages`) | 51 | 3,414 | 2,364 |
| Front-end helpers (`utils`) | 49 | 3,381 | 2,934 |
| Mixins (`mixins`) | 15 | 1,232 | 533 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 120 | 193 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 98 | 141 |
| Plugins (`plugins`) | 2 | 88 | 54 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **662** | **133,105** | **69,146** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 350 | 61,989 |
| Vue screens and components | 312 | 71,116 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 69,146 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 693 files, 121,285 lines of test code.
- **Locale strings**: 9,218 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
