# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-22 at commit `0e3e0ff6`.**

**Working code: 116,774 lines** across 567 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 214 | 59,375 | 18,732 |
| The Restify backend (`server`) | 247 | 50,616 | 37,298 |
| Pages (`pages`) | 50 | 2,755 | 1,791 |
| Front-end helpers (`utils`) | 33 | 2,408 | 2,132 |
| Mixins (`mixins`) | 11 | 1,067 | 405 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 118 | 192 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 96 | 136 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **567** | **116,774** | **60,831** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 302 | 54,729 |
| Vue screens and components | 265 | 62,045 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 60,831 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 611 files, 108,807 lines of test code.
- **Locale strings**: 6,970 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
