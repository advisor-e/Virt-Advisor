# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-21 at commit `86bb4712`.**

**Working code: 110,030 lines** across 538 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 203 | 55,670 | 17,307 |
| The Restify backend (`server`) | 236 | 48,105 | 35,717 |
| Pages (`pages`) | 44 | 2,509 | 1,502 |
| Front-end helpers (`utils`) | 32 | 2,136 | 1,884 |
| Mixins (`mixins`) | 11 | 1,061 | 401 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 96 | 136 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **538** | **110,030** | **57,257** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 290 | 51,936 |
| Vue screens and components | 248 | 58,094 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 57,257 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 588 files, 102,682 lines of test code.
- **Locale strings**: 6,621 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
