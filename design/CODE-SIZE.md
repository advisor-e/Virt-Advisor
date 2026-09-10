# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-10 at commit `291bf3d`.**

**Working code: 85,134 lines** across 421 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 141 | 42,209 | 13,011 |
| The Restify backend (`server`) | 193 | 37,698 | 27,389 |
| Front-end helpers (`utils`) | 28 | 2,065 | 1,710 |
| Pages (`pages`) | 36 | 1,641 | 792 |
| Mixins (`mixins`) | 11 | 1,021 | 351 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 87 | 99 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **421** | **85,134** | **43,632** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 242 | 41,265 |
| Vue screens and components | 179 | 43,869 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 43,632 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 485 files, 80,996 lines of test code.
- **Locale strings**: 5,082 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
