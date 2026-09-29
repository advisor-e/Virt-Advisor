# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-29 at commit `3d8be9c4`.**

**Working code: 129,691 lines** across 639 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 248 | 65,921 | 21,231 |
| The Restify backend (`server`) | 269 | 55,432 | 40,355 |
| Pages (`pages`) | 51 | 3,354 | 2,332 |
| Front-end helpers (`utils`) | 44 | 3,195 | 2,744 |
| Mixins (`mixins`) | 15 | 1,227 | 527 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 120 | 193 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 98 | 141 |
| Plugins (`plugins`) | 2 | 88 | 54 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **639** | **129,691** | **67,671** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 339 | 60,671 |
| Vue screens and components | 300 | 69,020 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 67,671 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 677 files, 119,295 lines of test code.
- **Locale strings**: 8,949 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
