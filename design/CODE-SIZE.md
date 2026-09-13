# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-13 at commit `5fa658d9`.**

**Working code: 89,493 lines** across 433 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 144 | 44,249 | 13,500 |
| The Restify backend (`server`) | 200 | 39,991 | 29,149 |
| Front-end helpers (`utils`) | 28 | 2,065 | 1,716 |
| Pages (`pages`) | 38 | 1,665 | 819 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 89 | 117 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **433** | **89,493** | **45,932** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 249 | 43,560 |
| Vue screens and components | 184 | 45,933 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 45,932 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 498 files, 85,130 lines of test code.
- **Locale strings**: 5,431 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
