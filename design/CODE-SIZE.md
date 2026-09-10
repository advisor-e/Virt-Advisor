# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-10 at commit `e46c36c`.**

**Working code: 84,918 lines** across 419 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 141 | 42,130 | 12,917 |
| The Restify backend (`server`) | 191 | 37,561 | 27,181 |
| Front-end helpers (`utils`) | 28 | 2,065 | 1,710 |
| Pages (`pages`) | 36 | 1,641 | 792 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 87 | 99 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **419** | **84,918** | **43,330** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 240 | 41,128 |
| Vue screens and components | 179 | 43,790 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 43,330 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 481 files, 80,493 lines of test code.
- **Locale strings**: 5,082 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
