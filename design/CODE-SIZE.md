# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-25 at commit `8c56acde`.**

**Working code: 121,456 lines** across 592 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 226 | 62,000 | 19,927 |
| The Restify backend (`server`) | 256 | 51,971 | 38,389 |
| Pages (`pages`) | 51 | 3,175 | 2,236 |
| Front-end helpers (`utils`) | 35 | 2,535 | 2,242 |
| Mixins (`mixins`) | 12 | 1,221 | 486 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 118 | 192 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 97 | 138 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **592** | **121,456** | **63,755** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 314 | 56,494 |
| Vue screens and components | 278 | 64,962 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 63,755 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 642 files, 113,061 lines of test code.
- **Locale strings**: 7,225 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
