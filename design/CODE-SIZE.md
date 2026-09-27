# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-28 at commit `17040863`.**

**Working code: 124,165 lines** across 612 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 236 | 63,405 | 20,520 |
| The Restify backend (`server`) | 260 | 52,837 | 38,897 |
| Pages (`pages`) | 51 | 3,212 | 2,261 |
| Front-end helpers (`utils`) | 40 | 2,999 | 2,574 |
| Mixins (`mixins`) | 13 | 1,151 | 470 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 120 | 193 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 98 | 141 |
| Plugins (`plugins`) | 2 | 87 | 53 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **612** | **124,165** | **65,203** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 324 | 57,797 |
| Vue screens and components | 288 | 66,368 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 65,203 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 656 files, 114,865 lines of test code.
- **Locale strings**: 8,641 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
