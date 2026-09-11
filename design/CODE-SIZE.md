# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-11 at commit `c6282ba`.**

**Working code: 86,780 lines** across 429 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 143 | 43,014 | 13,304 |
| The Restify backend (`server`) | 199 | 38,535 | 27,820 |
| Front-end helpers (`utils`) | 28 | 2,067 | 1,716 |
| Pages (`pages`) | 36 | 1,641 | 792 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 87 | 99 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **429** | **86,780** | **44,365** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 248 | 42,106 |
| Vue screens and components | 181 | 44,674 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 44,365 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 496 files, 83,035 lines of test code.
- **Locale strings**: 5,221 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
