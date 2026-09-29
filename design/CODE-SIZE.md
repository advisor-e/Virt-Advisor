# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-29 at commit `6baf4acd`.**

**Working code: 131,022 lines** across 649 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 253 | 66,508 | 21,367 |
| The Restify backend (`server`) | 272 | 56,103 | 40,752 |
| Pages (`pages`) | 51 | 3,354 | 2,332 |
| Front-end helpers (`utils`) | 46 | 3,268 | 2,817 |
| Mixins (`mixins`) | 15 | 1,227 | 527 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 120 | 193 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 98 | 141 |
| Plugins (`plugins`) | 2 | 88 | 54 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **649** | **131,022** | **68,277** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 344 | 61,415 |
| Vue screens and components | 305 | 69,607 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 68,277 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 681 files, 119,970 lines of test code.
- **Locale strings**: 9,041 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
