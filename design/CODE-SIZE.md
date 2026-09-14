# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-14 at commit `5d862b74`.**

**Working code: 95,889 lines** across 461 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 151 | 47,485 | 14,586 |
| The Restify backend (`server`) | 216 | 43,047 | 31,759 |
| Front-end helpers (`utils`) | 30 | 2,089 | 1,789 |
| Pages (`pages`) | 41 | 1,701 | 858 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 91 | 121 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **461** | **95,889** | **49,777** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 267 | 46,684 |
| Vue screens and components | 194 | 49,205 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 49,777 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 533 files, 92,538 lines of test code.
- **Locale strings**: 6,025 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
