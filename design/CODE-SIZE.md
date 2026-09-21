# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-22 at commit `af45da5a`.**

**Working code: 116,054 lines** across 566 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 214 | 59,068 | 18,137 |
| The Restify backend (`server`) | 246 | 50,291 | 36,905 |
| Pages (`pages`) | 50 | 2,671 | 1,697 |
| Front-end helpers (`utils`) | 33 | 2,408 | 2,132 |
| Mixins (`mixins`) | 11 | 1,067 | 405 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 96 | 136 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **566** | **116,054** | **59,722** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 301 | 54,400 |
| Vue screens and components | 265 | 61,654 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 59,722 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 605 files, 107,715 lines of test code.
- **Locale strings**: 6,961 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
