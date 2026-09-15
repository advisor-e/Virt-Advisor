# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-16 at commit `ebecef7b`.**

**Working code: 97,440 lines** across 463 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 154 | 48,194 | 15,072 |
| The Restify backend (`server`) | 214 | 43,763 | 32,216 |
| Front-end helpers (`utils`) | 30 | 2,116 | 1,819 |
| Pages (`pages`) | 42 | 1,842 | 971 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 91 | 121 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **463** | **97,440** | **50,830** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 265 | 47,385 |
| Vue screens and components | 198 | 50,055 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 50,830 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 535 files, 92,958 lines of test code.
- **Locale strings**: 6,081 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
