# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-22 at commit `e80cd803`.**

**Working code: 112,964 lines** across 552 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 210 | 57,486 | 17,910 |
| The Restify backend (`server`) | 240 | 48,795 | 36,121 |
| Pages (`pages`) | 46 | 2,659 | 1,713 |
| Front-end helpers (`utils`) | 33 | 2,408 | 2,132 |
| Mixins (`mixins`) | 11 | 1,067 | 405 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 96 | 136 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **552** | **112,964** | **58,727** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 295 | 52,904 |
| Vue screens and components | 257 | 60,060 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 58,727 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 598 files, 104,895 lines of test code.
- **Locale strings**: 6,760 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
