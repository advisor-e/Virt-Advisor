# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-14 at commit `431fc0d6`.**

**Working code: 96,193 lines** across 456 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 153 | 47,818 | 14,835 |
| The Restify backend (`server`) | 208 | 42,917 | 31,254 |
| Front-end helpers (`utils`) | 30 | 2,102 | 1,789 |
| Pages (`pages`) | 42 | 1,832 | 941 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 90 | 119 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **456** | **96,193** | **49,569** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 259 | 46,524 |
| Vue screens and components | 197 | 49,669 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 49,569 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 522 files, 90,800 lines of test code.
- **Locale strings**: 6,025 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
