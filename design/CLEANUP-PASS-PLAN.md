# Planned Cleanup Pass — i18n strings + JSDoc

> **STATUS: PLANNED — NOT STARTED. Gated. No code has been touched.**
> Recorded 2026-06-30 so the master coding team has full visibility of intended work
> before any of it begins. This is a notice of intent, not work in progress.

## For the master coding team — please read

A code-tidy pass is **planned but deliberately not started**, because it would touch the
same front-end files you are working in for the database + login wiring. To avoid merge
collisions, the sequence is **you first, this cleanup second**.

**Release condition (no guessing):**
1. The master team finishes wiring the **real database persistence** (Firm-Manager config +
   case studies → MySQL) and the **real mentor login/role** (replacing the interim
   `platform_admin` stand-in and placeholder auth keys in `pages/mentor.vue`).
2. The master team **emails Mike** to confirm it is safe to proceed.
3. **Mike gives the explicit go-ahead.** Only then does this pass begin.

Until all three happen, nothing in this plan is executed. If you back out or change the
plan, this document is the record that the cleanup is already scoped and waiting — you do
not need to do it, and you control when it starts via the email to Mike.

## Measured scope (taken 2026-06-30)

- **12** `.vue` screens total; only **2** currently use the translation system
  (`VirtualAdvisor.vue`, `CourseBuilder.vue`). **10 have no translated strings**, including
  the firm-manager and the new mentor screens.
- **8** locale files exist (`en, de, es, fr, it, nl, pl, pt`).
- **3** mixin files need JSDoc; routes (`advisor.js`, `course.js`) are sparsely documented.

## In scope

- Wrap the hardcoded English in the **10 untranslated screens** through `$t()` and add the
  **English** keys to `en.json`.
- Add missing JSDoc (`@param` / `@returns` / route shape) to the **3 mixins** and the routes.

## Explicitly OUT of scope

- **Translating into the other 7 languages.** Routing a string through the system is the
  mechanical half; producing correct professional advisory wording in German, Polish, etc.
  is a **human-translator** job and will not be auto-generated.
- **Splitting the oversized components** (`VirtualAdvisor.vue` ~2,700 lines, etc.). That is a
  higher-risk refactor that gets its own separate, carefully-tested task — not this pass.

## How it will run (when released)

- On a dedicated branch: **`chore/i18n-jsdoc-cleanup`** off `master`. It never blocks anyone.
- **Verification gate before merge** (same bar the mentor work passed): every screen
  re-rendered and visually checked (Pug + Buefy), full test suite green, `nuxt build` green.
- Merged in small, reviewable increments.

## Why sequenced this way

The most likely collision files are `components/FirmManagerHub.vue` and `pages/mentor.vue` —
exactly where the login wiring lands. Running the cleanup afterwards means we are never in the
same files at the same time, so the master team is never blocked and there are no avoidable
merge conflicts.

*Backlog cross-reference: `design/ACTIONS.md` → the P3 · I18N and P3 · DOC items.*
