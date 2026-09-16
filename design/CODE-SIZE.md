# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-15 at commit `92c02ab4`.**

**Working code: 96,360 lines** across 464 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 151 | 47,572 | 14,688 |
| The Restify backend (`server`) | 219 | 43,430 | 32,159 |
| Front-end helpers (`utils`) | 30 | 2,089 | 1,789 |
| Pages (`pages`) | 41 | 1,701 | 858 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 92 | 123 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **464** | **96,360** | **50,281** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 270 | 47,068 |
| Vue screens and components | 194 | 49,292 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 50,281 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 540 files, 93,681 lines of test code.
- **Locale strings**: 6,044 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
