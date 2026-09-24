# Code Size — how much working code there is

> **Generated. Do not edit — the next Handbook build overwrites it.** Written by
> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,
> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on
> 2026-09-10; rolling means computed at build time, never typed.
>
> **Measured 2026-09-24 at commit `fce60560`.**

**Working code: 120,795 lines** across 588 files — blank lines and
comment lines stripped; tests, design documents, data, scripts and locale strings left out.

| Where | Files | Lines of code | Comment lines |
|---|---:|---:|---:|
| Screens and components (`components`) | 224 | 61,673 | 19,822 |
| The Restify backend (`server`) | 256 | 51,888 | 38,299 |
| Pages (`pages`) | 51 | 3,126 | 2,214 |
| Front-end helpers (`utils`) | 33 | 2,421 | 2,149 |
| Mixins (`mixins`) | 12 | 1,133 | 467 |
| Thin proxies to the backend (`server-middleware`) | 6 | 237 | 87 |
| Configuration (`config`) | 1 | 118 | 192 |
| Nuxt configuration (`nuxt.config.js`) | 1 | 97 | 138 |
| Plugins (`plugins`) | 2 | 83 | 51 |
| Layouts (`layouts`) | 2 | 19 | 7 |
| **Total working code** | **588** | **120,795** | **63,426** |

| By kind | Files | Lines of code |
|---|---:|---:|
| JavaScript | 312 | 56,209 |
| Vue screens and components | 276 | 64,586 |

**Beside the code, and not counted in it:**

- **Comments and documentation** inside those same files: 63,426 lines. The JSDoc rule asks for the *why*, and this is what it costs.
- **Tests**: 638 files, 112,461 lines of test code.
- **Locale strings**: 7,207 non-blank lines across the language files. Words on screens, not logic.
- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike's material, not code.

**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,
`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.
Pinned by `tests/unit/countCode.test.js`.
