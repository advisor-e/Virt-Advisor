# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-10-04 at commit `73b3f45f`.**

**Working code: 136,704 lines** across 686 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 278 | 70,447 | 22,443 |
| The Restify backend (`server`) | 278 | 57,406 | 41,809 |
| Pages (`pages`) | 51 | 3,566 | 2,458 |
| Front-end helpers (`utils`) | 50 | 3,463 | 3,018 |
| Mixins (`mixins`) | 17 | 1,256 | 570 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 120 | 193 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 98 | 141 |
| Plugins (`plugins`) | 2 | 92 | 56 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **686** | **136,704** | **70,782** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 356 | 62,994 |
| Vue screens and components | 330 | 73,710 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 70,782 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 710 files, 123,983 lines of test code.
- **Locale strings**: 9,529 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
