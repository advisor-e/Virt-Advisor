# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-11 at commit `3f3f474`.**

**Working code: 89,574 lines** across 441 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 146 | 43,760 | 13,661 |
| The Restify backend (`server`) | 207 | 40,566 | 29,330 |
| Front-end helpers (`utils`) | 29 | 2,080 | 1,735 |
| Pages (`pages`) | 36 | 1,641 | 792 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 91 | 121 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **441** | **89,574** | **46,273** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 257 | 44,154 |
| Vue screens and components | 184 | 45,420 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 46,273 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 509 files, 86,682 lines of test code.
- **Locale strings**: 5,264 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
