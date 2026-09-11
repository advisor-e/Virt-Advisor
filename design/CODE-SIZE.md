# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-11 at commit `39e4c0d`.**

**Working code: 88,990 lines** across 438 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 144 | 43,549 | 13,597 |
| The Restify backend (`server`) | 206 | 40,193 | 29,003 |
| Front-end helpers (`utils`) | 29 | 2,080 | 1,735 |
| Pages (`pages`) | 36 | 1,641 | 792 |
| Mixins (`mixins`) | 11 | 1,023 | 354 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 91 | 121 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Configuration (`config`) | 1 | 74 | 135 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **438** | **88,990** | **45,882** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 256 | 43,781 |
| Vue screens and components | 182 | 45,209 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 45,882 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 507 files, 85,972 lines of test code.
- **Locale strings**: 5,226 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
