# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-24 at commit `59c4198f`.**

**Working code: 121,023 lines** across 590 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 225 | 61,775 | 19,842 |
| The Restify backend (`server`) | 256 | 51,891 | 38,309 |
| Pages (`pages`) | 51 | 3,126 | 2,214 |
| Front-end helpers (`utils`) | 34 | 2,456 | 2,197 |
| Mixins (`mixins`) | 12 | 1,221 | 486 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 118 | 192 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 97 | 138 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **590** | **121,023** | **63,523** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 313 | 56,335 |
| Vue screens and components | 277 | 64,688 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 63,523 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 639 files, 112,717 lines of test code.
- **Locale strings**: 7,208 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
