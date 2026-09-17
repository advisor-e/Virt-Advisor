# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-17 at commit `2ec39599`.**

**Working code: 101,625 lines** across 484 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 159 | 49,959 | 15,784 |
| The Restify backend (`server`) | 229 | 46,122 | 34,089 |
| Front-end helpers (`utils`) | 31 | 2,132 | 1,853 |
| Pages (`pages`) | 42 | 1,842 | 971 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 94 | 127 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **484** | **101,625** | **53,488** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 281 | 49,805 |
| Vue screens and components | 203 | 51,820 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 53,488 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 567 files, 98,828 lines of test code.
- **Locale strings**: 6,372 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
