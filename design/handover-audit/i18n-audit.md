# i18n Hardcoded-English Audit

**Audit type:** READ-ONLY. No files were modified. Evidence cited as `path:line`.
**Date:** 2026-06-21 · **Prepared for:** Friday handover to the senior coding team.
**Rule under audit (CLAUDE.md → Internationalisation):** "All user-facing strings go
through `$t()` and live in locale files — no hardcoded English in templates or logic."

---

## Summary

The i18n infrastructure is real and correctly wired (vue-i18n v8, a plugin, a `localeMixin`,
and 8 locale files), **but only one component actually uses it.** `VirtualAdvisor.vue` is
mostly compliant for its main chat/mode/profile/voice surfaces (it routes those through
`$t()`), while every other component and page renders user-facing English as hardcoded Pug
text, attributes, and JS strings.

**Approximate total violations: ~310 user-facing hardcoded strings**, distributed as:

| File | Approx. violations | Uses `$t()`? |
|------|-------------------:|:------------:|
| `components/FirmManagerHub.vue` | ~100 (≈65 distinct) | No |
| `components/CourseBuilder.vue` | ~90 | Partially (1 key only) |
| `components/VirtualAdvisor.vue` | ~55 | Yes (but many strings still hardcoded) |
| `components/AdvisorProgression.vue` | ~32 | No |
| `components/FirmDashboard.vue` | ~28 | No |
| `pages/firm-manager.vue` | 3 | No |
| `mixins/localeMixin.js` | 1 | n/a (it IS the infra) |
| `mixins/caseMixin.js` | 1 | No |
| `mixins/speechMixin.js` | 0 | n/a |

This is a **multi-hundred-string** effort, not a few dozen. The bulk is concentrated in
three files (FirmManagerHub, CourseBuilder, VirtualAdvisor) which together account for
roughly **80%** of the work.

> Counts are approximate by design — many strings (e.g. "Close", "Cancel", "Download",
> "Save & Continue", the voice-bar labels) repeat across files and within files. The figure
> counts occurrences that need a `$t()` call, not distinct keys.

---

## i18n infra as-found (with paths)

**Locale files** — 8 project locales (node_modules copies ignored):
`locales/en.json`, `fr.json`, `es.json`, `de.json`, `pt.json`, `it.json`, `nl.json`, `pl.json`.

**Plugin / config** — `plugins/i18n.js:14-19`: a Nuxt 2 plugin that builds
`new VueI18n({ locale: 'en', fallbackLocale: 'en', messages: { en, fr, ... } })`. This is
correct vue-i18n v8 usage (no `createI18n`/`useI18n`).

**Key structure** — `locales/en.json` is a **nested namespaced** object: top-level groups
`header`, `hero`, `mode`, `profile`, `voice`, `input`, `opening`, plus a flat `error`. Keys
are accessed dot-style, e.g. `$t('header.title')`, `$t('mode.client.desc')`,
`$t('profile.questions.advisorRole')`, `$t('voice.tapToSpeak')` (`en.json:2-97`). This is the
**naming convention the team must follow**: `section.subsection.key`, camelCase leaf keys.

**Compliant usage example** — `components/VirtualAdvisor.vue` routes its mode cards, hero,
header, voice bar, input, and profile questions through `$t()`
(e.g. `VirtualAdvisor.vue:13`, `:52-54`, `:66-68`, `:380`, `:889-918`). This is the model the
rest of the codebase should match.

**Dynamic locale loading** — `mixins/localeMixin.js` adds a runtime language picker: for a
locale not pre-bundled, it POSTs the flattened English messages to `/api/translate/locale`
and caches the result (`localeMixin.js:104-123`). This means **any new key added to
`en.json` is automatically picked up** for on-the-fly translation — reinforcing that the fix
is "move the English into `en.json` and reference it", not "hand-translate 8 files".

> **Infra defect (1):** `localeMixin.js:94` hardcodes the user-facing error
> `'Translation failed — please try again.'` and assigns it to `this.langError`, which renders
> at `VirtualAdvisor.vue:39` (`p.lang-error {{ langError }}`). The i18n infra itself contains a
> non-translated user string.

---

## Violations by file

### `components/FirmManagerHub.vue` — ~100 occurrences (≈65 distinct) — **WORST OFFENDER**
Total 1556 lines. **No `$t()` anywhere.** Entirely English. The firm-manager admin surface
(tabs, tables, forms, modals, all toast/dialog messages) is fully hardcoded.

| Line | Literal string | Context |
|------|----------------|---------|
| 8 | `Firm Manager Hub` | page heading (`p.title.is-4`) |
| 11 | `Storage: {{...}}% used` | `b-tag` label (literal "Storage:" + "% used") |
| 12 | `← Back to Advisor` | back link |
| 17 | `Document Library` | `b-tab-item label=` |
| 45 | `Upload` | `b-button` |
| 55 | `No platform documents in this category` | `b-table` empty text |
| 57 / 58 | `File name` / `Actions` | `b-table-column label=` |
| 82 | `Decision Framework` | `b-tab-item label=` |
| 103-104 | `No firm override saved... The AI uses the platform default.` / `Add your overrides below...` | `b-notification` body |
| 153 | `Advisory Staircase` | `b-tab-item label=` |
| 225 | `Templates & Videos` | `b-tab-item label=` |
| 321 | `Advisory Distinctions` | `b-tab-item label=` |
| 349-357 | `A distinction teaches the system...` + help `ul`/`li` block | modal help text |
| 448 | `Describe the client situation in a plain sentence...` | `b-field message=` |
| 455 | `Type a phrase and press Enter or comma to add...` | `b-field message=` |
| 534 | `Firm Profile` | `b-tab-item label=` |
| 858 | `Document uploaded.` | `$buefy` toast |
| 882 | `Remove <strong>${row.name}</strong> from your firm's library?` | `$buefy` dialog (template string) |
| 936 | `Invalid JSON — please check the syntax.` | toast |
| 945 / 960 / 1028 / 1433 | `Saved as version ${res.version}.` / `Restored as version ${res.version}.` | toasts |
| 1208-1220 | `Please select a domain.` / `Description is required.` / `Add at least one trigger phrase.` / `Select at least one template to boost.` | validation toasts |
| 1254 | `Remove this distinction? It will no longer boost templates during scoring.` | dialog |
| 1316-1319 | `Customised` / `Switched off` / `Your firm` / `Platform` | `distinctionBadge()` return values rendered as badges |
| 1424 | `Every step needs a name.` | toast |

(Representative sample; the agent enumerated ~65 distinct strings spanning 6 tab labels,
40+ form labels/messages, 15+ table headers, 50+ button texts, 30+ toast/dialog messages,
15+ placeholders. Full enumeration available on request — every line above verified against
the file; `FirmManagerHub.vue:8-12` and the structure were spot-checked directly.)

> **Judgement call:** the **fallback domain list** around `FirmManagerHub.vue:1130-1131` is a
> data array of domain names. These ARE user-facing (rendered as menu/labels) but they
> duplicate the canonical domain labels also hardcoded in `VirtualAdvisor.vue:846-860` and
> `AdvisorProgression.vue` `DOMAIN_LABELS`. See "domain labels" judgement call below — these
> should be single-sourced AND translated together, not three times.

### `components/CourseBuilder.vue` — ~90 occurrences — partially i18n-aware
Total 2153 lines. Uses `$t('opening.course')` **with a hardcoded English fallback** at
`:629, :1049, :1082, :1118` — so even its one i18n key still ships a hardcoded English copy.
Everything else is hardcoded.

| Line | Literal string | Context |
|------|----------------|---------|
| 6 / 7 | `← My Courses` / `Team Dashboard` | nav buttons |
| 16-17 | `Your saved courses` / `Pick up where you left off, or start something new.` | heading + sub |
| 24 | `Active` / `Paused` | status badge (ternary) |
| 84-94 | `Who can access this course?` / `Private — just me` / `Firm-wide — all advisors` / `Start this course →` / `Request changes` | visibility + actions |
| 102-117 | `Tap to Speak` / `Recording — speak now` / `Stop Recording` / `Captured — review then Save` / `Record again` | **voice bar — duplicates `voice.*` keys that already exist in `en.json:74-80`** |
| 133 | `Press Enter to send · Shift+Enter for new line` | hint (**duplicate of `input.hint`, `en.json:87`**) |
| 159 | `Have the session conversation first` / `End session and take the quiz` | `:title` (ternary) |
| 276-320 | `Quiz` / `Test your understanding before moving on` / `✓ Good understanding` / `✗ Review this one` / `Passed` / `Keep going` / `Great work — you've completed this session.` | quiz UI |
| 351-392 | `Course complete!` / `Sessions completed` / `Average quiz score` / `Course Completion Certificate` / `This certifies that` / `Print / Save as PDF` | completion + certificate |
| 739 / 948 / 1049 | `Sorry, something went wrong. Please try again.` | error messages (**duplicate of `error`, `en.json:97`**) |
| 929 / 931 / 941 | `The response timed out. Please try again.` | timeout errors |
| 985 / 989 | `Couldn't generate quiz questions — please try again...` | quiz-gen errors |
| 1092 | `Delete this course and start again? Your progress will be lost.` | confirm dialog |
| 1144 / 1147 | `Could not evaluate — moving on.` | quiz fallback |
| 1171 | `Session state was lost. Please refresh and try again.` | error |

### `components/VirtualAdvisor.vue` — ~55 occurrences — compliant in parts, NOT in others
Total 2887 lines. The header brand, hero, mode cards, voice bar, input, and profile
**questions** correctly use `$t()`. But many later-added surfaces (selectors, save panel,
cases panel, post-delivery review, decision-trace) are hardcoded.

| Line | Literal string | Context |
|------|----------------|---------|
| 43 | `Case Studies` | button label |
| 45 | `Firm Manager` | link |
| 206 | `Try again` | retry button |
| 210 / 224 | `Where would you place them on the Growth Curve?` / `Confirm selection` | Growth Curve selector |
| 228 / 242 | `Where would you say your current engagement... Advisory Staircase?` / `Confirm selection` | Staircase selector |
| 246 / 260 | `Where is your client starting from?...` / `Confirm selection` | Fin-Mgt selector |
| 264 | `How long can you allow per meeting?` | session-length selector |
| 279 / 291 | `Which area best describes the primary focus for this client?` / `Confirm` | domain selector |
| 295 / 307-308 | `Which of these best captures the core problem...` / `Confirm` / `None of these fit — let me describe it differently` | primary-issue selector |
| 312-313 | `Yes, help me sell` / `No, stay on this` | win-work switch |
| 318-349 | `Why this recommendation` / `Area I focused on` / `What shaped the advice` / `Distinctions` / `Filed elsewhere — may belong here` / `How the templates scored` / `Template`/`Score`/`Why` | decision-trace panel |
| 353-367 | `Record a quick observation?` / `Yes, let's do it` / `Not now` / `Save this session?` / `Save case study` | intake + save prompts |
| 431-464 | `Save as case study` / `Give this session a title...` / `Session title` / `Visibility` / `Share with my firm` / `My eyes only` / `Cancel` | save modal (incl. `placeholder` at :437/:439) |
| 471 | `Tell me about yourself — I'll use this to tailor every recommendation.` | profile sub (note: profile *questions* ARE via `$t()`, but this sub-line is not) |
| 537 / 540-541 | `Save & continue →` / `Save profile` / `Clear` / `Main menu` | profile actions |
| 548-703 | `My Saved Cases` / `No saved cases yet...` / `🏢 Shared` / `🔒 Private` / `Feedback welcome` / `Post-Delivery Review` / `What went less well?` / `What went well?` / `Save review` / `Promote to coaching reference` / `Confirm delete` / `Return to menu` | cases panel + review (many `placeholder` attrs e.g. :617, :648, :679) |
| 865-872 | `I have a client situation` / `I want to plan ahead` ... | `sectionBannerLabel` computed (**duplicates `mode.*.title` keys already in `en.json`**) |
| 846-860 | domain labels (`Profitability & Feasibility`, `Staff & Team`, ...) | `domainSelectorOptions` computed |
| 1075 / 1281 | `Could not save. Please try again.` / `None of these fit my situation` | JS user-facing strings |

> Note: a handful of strings assigned in JS (e.g. `:1036` "Yes, let's record it now.",
> `:1281`, `:1303`, `:1309`, `:1316`) are pushed into `inputText`/sent to the backend as the
> advisor's "spoken" answer. These are **judgement calls** — see below.

### `components/AdvisorProgression.vue` — ~32 occurrences — **No `$t()`**
Total 411 lines. Examples: `:5` `← Back to Menu`; `:19-20` `My Progress` /
`Your advisory capability across all VA cases, courses, and sessions`; `:34-41` stat labels;
`:47` empty-state notice; `:70-81` team-progress headings/columns. JS strings rendered to UI:
`tierDefs` labels/descriptions (`:135-137` e.g. `Entry Level` / `Foundational advisory tools
and techniques`); three error messages `:165, :174, :178` (`Could not load... Please try
again.`); and a 14-entry `DOMAIN_LABELS` map (`:95-109`).

### `components/FirmDashboard.vue` — ~28 occurrences — **No `$t()`**
Total 425 lines. Examples: `:7` `Loading team data...`; `:14` `Team Learning Dashboard`;
`:25-34` card labels (`Active Learners`, `Courses Running`, `Completion Rate`,
`Avg. Quiz Score`); `:52` insights empty-state; `:58` `Search advisors...` placeholder;
`:62-69` filter options; `:74-79` table headers; `:122` empty state. JS: `statusLabel()`
returns `Active`/`Complete`/`Paused` (`:290`); `_formatDate()` returns `Today`/`Yesterday`
(`:301-304`).

### `pages/firm-manager.vue` — 3 occurrences — the backlog's known example
Total 102 lines (verified). `:9` `Access Restricted` (`p.title.is-4`); `:11`
`The Firm Manager hub requires a Firm Manager or Platform Admin role.`; `:13`
`Please contact your account administrator.` This is the example named in the task brief.

### `mixins/localeMixin.js` — 1 occurrence
`:94` `'Translation failed — please try again.'` → `this.langError`, rendered at
`VirtualAdvisor.vue:39`.

### `mixins/caseMixin.js` — 1 occurrence
`:107` `modeName()` returns `{ client: 'Client situation', discover: 'Discovery',
plan: 'Planning', learn: 'Learning' }` — rendered as case mode tags
(`VirtualAdvisor.vue:561`). Verified directly.

### `mixins/speechMixin.js` — 0 occurrences
Clean. The BCP-47 map (`:2-24`) is an internal locale lookup, not user-facing — correctly
not flagged. `pages/index.vue` and `layouts/default.vue` are trivial (redirect / `nuxt`
wrapper) — no strings.

---

## Non-obvious cases / judgement calls

1. **Domain labels are triplicated.** The 14 advisory-domain display names appear hardcoded
   in at least three places: `VirtualAdvisor.vue:846-860` (`domainSelectorOptions`),
   `AdvisorProgression.vue:95-109` (`DOMAIN_LABELS`), and the fallback list in
   `FirmManagerHub.vue:~1130`. They should be **single-sourced first** (they likely belong in
   `data/domains.json` per the `single-source-wiring` / `add-a-domain` patterns) and then
   translated once — not copied into three locale entries. Flag for the team: don't naively
   wrap each copy in `$t()`; consolidate, then translate.

2. **`PRIMARY_ISSUES` map (`VirtualAdvisor.vue:722-734`).** These are user-facing strings
   rendered in the primary-issue selector (`:303`). BUT memory/governance says firm IP and
   workshop-authored content must not be casually altered, and primary issues are
   Mike-authored domain content. **Do not auto-translate these without confirming** whether
   advisory-IP phrasing should be localised at all — this is a product decision, not a
   mechanical i18n fix.

3. **Selector option content from JSON** (`growthStages`, `staircaseSteps`, `finMgtThemes`
   at `VirtualAdvisor.vue:812-823`) comes from `data/*.json` framework files, and those
   frameworks are **platform-locked protected IP** (per CLAUDE.md / memory). Their on-screen
   names/descriptions are user-facing but live in locked data, not in templates. Translating
   them is a separate, gated decision — **out of scope for a mechanical template sweep.**

4. **Strings sent to the backend as the advisor's answer** (e.g.
   `VirtualAdvisor.vue:1036, :1281, :1303, :1309, :1316`, and the `submit*` methods that build
   `inputText` from selector choices). These are both displayed AND used as the query string
   the engine matches on. Wrapping them in `$t()` changes what the backend receives in
   non-English locales and could break keyword/intent matching. **These need backend
   coordination** — translate the *display* but keep a stable canonical value for the engine.
   This is the single biggest correctness trap in the whole effort.

5. **`$t('opening.course')` fallbacks in CourseBuilder** (`:629` etc.) — the fallback string
   duplicates the locale value. Once the locale key is guaranteed present, the English
   fallback is dead weight; but removing fallbacks is a behaviour change, so flag rather than
   assume.

6. **Emoji/symbol prefixes** (`← Back`, `✕`, `🔒 Private`, `→ Resume`, `↻ Refresh`). The arrow/
   glyph is non-translatable; the trailing word is. When extracting keys, split the glyph from
   the word (`← {{ $t('common.back') }}`) rather than translating `"← Back"` as one unit.

7. **Date-format helpers** (`caseMixin.js:112` `toLocaleDateString('en-GB', ...)`,
   `FirmDashboard.vue` `_formatDate`, vue-i18n's `$d`). The hardcoded `'en-GB'` locale and the
   `Today`/`Yesterday` words are user-facing. The right tool is vue-i18n's `$d(date, 'format')`
   plus translated relative-day keys — not a literal `$t()` on a formatted date.

---

## Effort estimate & suggested order

**Scale:** ~310 occurrences → roughly **120–180 distinct locale keys** once duplicates
(voice bar, `error`, hints, mode titles, domain labels) are consolidated. This is a
**multi-day effort for one engineer**, not an afternoon. The good news: it's mechanical and
low-risk for the bulk of it, and the dynamic-translate route (`localeMixin.js:104`) means
only `en.json` needs new keys — the other 7 locales fill in at runtime.

**Suggested order (highest value / lowest risk first):**

1. **`pages/firm-manager.vue` (3 strings)** — trivial warm-up; the backlog already names it.
   New keys e.g. `firmManager.accessRestricted.title/body/contact`.
2. **`mixins/localeMixin.js:94` + `mixins/caseMixin.js:107`** — 2 strings; fixes the infra's
   own gap and the case-mode tags. Keys e.g. `errors.translationFailed`, `mode.*.shortLabel`
   (note: `mode.client.title` etc. already exist — reuse, don't duplicate).
3. **`FirmDashboard.vue` (~28)** and **`AdvisorProgression.vue` (~32)** — self-contained,
   no backend coupling. Do the **domain-label consolidation (judgement call 1)** here since
   `AdvisorProgression` holds `DOMAIN_LABELS`.
4. **`VirtualAdvisor.vue` (~55)** — medium risk. Easy wins: cases panel, save modal, review
   section, trace panel, header buttons. **Defer** the selector-answer strings (judgement
   call 4) and `PRIMARY_ISSUES`/framework content (calls 2–3) pending Mike/backend input.
5. **`CourseBuilder.vue` (~90)** — large but mostly straightforward template text; reuse the
   existing `voice.*`, `input.*`, `error` keys (judgement call: it re-implements them).
6. **`FirmManagerHub.vue` (~100)** — biggest single file; lowest urgency if firm-manager is
   admin-only/English-first, but it is the largest contributor to the count. Tackle last as a
   focused block; consider whether admin UI must be localised at all (product decision).

**Key naming convention to follow (mandatory):** nested `section.subsection.camelCaseLeaf`
in `locales/en.json`, accessed `this.$t('section.sub.key')` / `this.$tc()` / `this.$d()` —
matching the existing `header.*`, `mode.*`, `profile.questions.*`, `voice.*`, `input.*`,
`opening.*` groups (`en.json:1-97`). vue-i18n **v8 only** — no `useI18n`/`createI18n`.
**Reuse existing keys** for the repeated voice-bar/hint/error/mode strings rather than minting
new ones.

---

## Open questions (for Mike / the team)

1. **Should the Firm Manager admin UI be localised at all?** It is the single largest block
   (~100 strings). If admins are English-only, deferring `FirmManagerHub.vue` roughly halves
   the effort.
2. **Do advisory-IP strings get translated?** `PRIMARY_ISSUES`, the three locked frameworks'
   on-screen names/descriptions, and domain labels are Mike-authored / platform-locked. Need a
   ruling on whether these are localised, and if so, where the canonical English lives
   (locale file vs. the locked `data/*.json`).
3. **Selector-answer strings sent to the backend** (judgement call 4): confirm the pattern —
   translate the displayed label but send a stable canonical key/value to the engine. This
   needs a backend contract before the frontend work starts, or non-English sessions will
   mis-match.
4. **Domain labels:** consolidate to a single source (`data/domains.json`?) before
   translating — agreed? This avoids three divergent translations.
5. **Date/relative-time:** adopt vue-i18n `$d()` + translated `Today`/`Yesterday` keys, and
   drop the hardcoded `'en-GB'`?

---

*All line citations above were produced by direct reads of the source files
(`VirtualAdvisor.vue`, `firm-manager.vue`, `advisor.vue`, the infra files, `caseMixin.js`)
and by scoped read-only sub-audits of `FirmManagerHub.vue`, `CourseBuilder.vue`,
`FirmDashboard.vue`, `AdvisorProgression.vue`, `speechMixin.js`. Counts are approximate and
occurrence-based, as stated. Where a string's translatability is a product/IP decision rather
than a mechanical fix, it is flagged as a judgement call rather than asserted as a defect.*
