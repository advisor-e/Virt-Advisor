# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-13 at commit `f03a3d32`.**

**Working code: 92,856 lines** across 445 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 147 | 46,322 | 14,130 |
| The Restify backend (`server`) | 205 | 41,237 | 30,476 |
| Front-end helpers (`utils`) | 29 | 2,073 | 1,755 |
| Pages (`pages`) | 41 | 1,701 | 858 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 89 | 117 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **445** | **92,856** | **47,967** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 255 | 44,814 |
| Vue screens and components | 190 | 48,042 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 47,967 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 510 files, 88,247 lines of test code.
- **Locale strings**: 5,825 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
