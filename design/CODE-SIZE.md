# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-14 at commit `452d5e6a`.**

**Working code: 95,795 lines** across 461 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 151 | 47,451 | 14,556 |
| The Restify backend (`server`) | 216 | 42,988 | 31,656 |
| Front-end helpers (`utils`) | 30 | 2,088 | 1,780 |
| Pages (`pages`) | 41 | 1,701 | 858 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 91 | 121 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **461** | **95,795** | **49,635** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 267 | 46,624 |
| Vue screens and components | 194 | 49,171 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 49,635 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 532 files, 92,194 lines of test code.
- **Locale strings**: 6,011 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
