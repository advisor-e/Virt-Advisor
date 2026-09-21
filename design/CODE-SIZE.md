# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-21 at commit `139aa3fb`.**

**Working code: 108,923 lines** across 533 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 201 | 55,030 | 17,141 |
| The Restify backend (`server`) | 234 | 47,652 | 35,403 |
| Pages (`pages`) | 43 | 2,496 | 1,487 |
| Front-end helpers (`utils`) | 32 | 2,136 | 1,884 |
| Mixins (`mixins`) | 11 | 1,061 | 401 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 114 | 165 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 95 | 130 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **533** | **108,923** | **56,756** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 288 | 51,482 |
| Vue screens and components | 245 | 57,441 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 56,756 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 584 files, 101,559 lines of test code.
- **Locale strings**: 6,534 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
