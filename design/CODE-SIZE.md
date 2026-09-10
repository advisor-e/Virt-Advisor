# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-10 at commit `b1466ef`.**

**Working code: 83,407 lines** across 415 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 140 | 41,447 | 12,592 |
| The Restify backend (`server`) | 188 | 36,782 | 26,518 |
| Front-end helpers (`utils`) | 28 | 2,065 | 1,710 |
| Pages (`pages`) | 36 | 1,593 | 764 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 87 | 99 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 73 | 126 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **415** | **83,407** | **42,305** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 237 | 40,348 |
| Vue screens and components | 178 | 43,059 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 42,305 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 478 files, 79,470 lines of test code.
- **Locale strings**: 5,082 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
