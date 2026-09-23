# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-23 at commit `6c1025ff`.**

**Working code: 117,762 lines** across 570 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 216 | 59,881 | 19,123 |
| The Restify backend (`server`) | 248 | 50,703 | 37,409 |
| Pages (`pages`) | 50 | 3,114 | 2,202 |
| Front-end helpers (`utils`) | 33 | 2,420 | 2,146 |
| Mixins (`mixins`) | 11 | 1,091 | 432 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 118 | 192 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 96 | 136 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **570** | **117,762** | **61,785** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 303 | 54,896 |
| Vue screens and components | 267 | 62,866 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 61,785 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 620 files, 109,974 lines of test code.
- **Locale strings**: 7,000 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
