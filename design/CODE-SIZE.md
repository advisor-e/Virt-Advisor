# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-26 at commit `9d6631f6`.**

**Working code: 121,821 lines** across 595 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 226 | 62,014 | 19,961 |
| The Restify backend (`server`) | 258 | 52,324 | 38,545 |
| Pages (`pages`) | 51 | 3,175 | 2,236 |
| Front-end helpers (`utils`) | 36 | 2,618 | 2,294 |
| Mixins (`mixins`) | 12 | 1,129 | 441 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 120 | 193 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 98 | 141 |
| Plugins (`plugins`) | 2 | 87 | 53 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **595** | **121,821** | **63,958** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 317 | 56,845 |
| Vue screens and components | 278 | 64,976 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 63,958 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 647 files, 113,579 lines of test code.
- **Locale strings**: 8,592 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
