# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-11 at commit `9ba9a17`.**

**Working code: 88,708 lines** across 437 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 144 | 43,486 | 13,574 |
| The Restify backend (`server`) | 205 | 39,976 | 28,883 |
| Front-end helpers (`utils`) | 29 | 2,080 | 1,735 |
| Pages (`pages`) | 36 | 1,641 | 792 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 89 | 103 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **437** | **88,708** | **45,721** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 255 | 43,562 |
| Vue screens and components | 182 | 45,146 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 45,721 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 505 files, 85,641 lines of test code.
- **Locale strings**: 5,222 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
