# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-24 at commit `f5aa82fc`.**

**Working code: 118,772 lines** across 577 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 222 | 60,775 | 19,660 |
| The Restify backend (`server`) | 249 | 50,819 | 37,575 |
| Pages (`pages`) | 50 | 3,114 | 2,202 |
| Front-end helpers (`utils`) | 33 | 2,420 | 2,146 |
| Mixins (`mixins`) | 11 | 1,091 | 432 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 118 | 192 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 96 | 136 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **577** | **118,772** | **62,488** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 304 | 55,096 |
| Vue screens and components | 273 | 63,676 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 62,488 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 627 files, 110,859 lines of test code.
- **Locale strings**: 7,072 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
