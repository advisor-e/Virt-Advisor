# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-11 at commit `79fc117`.**

**Working code: 86,933 lines** across 427 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 142 | 42,616 | 13,237 |
| The Restify backend (`server`) | 198 | 39,090 | 28,372 |
| Front-end helpers (`utils`) | 28 | 2,065 | 1,710 |
| Pages (`pages`) | 36 | 1,641 | 792 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 87 | 99 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **427** | **86,933** | **44,841** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 247 | 42,657 |
| Vue screens and components | 180 | 44,276 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 44,841 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 491 files, 83,345 lines of test code.
- **Locale strings**: 5,082 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
