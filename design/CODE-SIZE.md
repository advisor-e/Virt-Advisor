# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-10-02 at commit `e6ba0ef8`.**

**Working code: 134,197 lines** across 668 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 262 | 68,337 | 21,890 |
| The Restify backend (`server`) | 277 | 57,070 | 41,408 |
| Pages (`pages`) | 51 | 3,514 | 2,418 |
| Front-end helpers (`utils`) | 50 | 3,463 | 3,018 |
| Mixins (`mixins`) | 16 | 1,247 | 556 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 120 | 193 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 98 | 141 |
| Plugins (`plugins`) | 2 | 92 | 56 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **668** | **134,197** | **69,774** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 354 | 62,601 |
| Vue screens and components | 314 | 71,596 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 69,774 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 701 files, 122,541 lines of test code.
- **Locale strings**: 9,358 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
