# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-17 at commit `efdfd5bc`.**

**Working code: 104,500 lines** across 495 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 165 | 51,136 | 16,259 |
| The Restify backend (`server`) | 233 | 47,322 | 34,963 |
| Pages (`pages`) | 43 | 2,339 | 1,236 |
| Front-end helpers (`utils`) | 31 | 2,132 | 1,853 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 95 | 130 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **495** | **104,500** | **55,105** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 285 | 51,006 |
| Vue screens and components | 210 | 53,494 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 55,105 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 573 files, 100,225 lines of test code.
- **Locale strings**: 6,475 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
