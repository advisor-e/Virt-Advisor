/**
 * Locale assembly for the merged application.
 *
 * Collaborate arrived with its own wording file (locales/collaborate/en.json).
 * Rather than copy its sections into locales/en.json — where the two would drift
 * apart and nobody would know which was authoritative — the files stay separate
 * and are joined here, section by section, at the point the i18n instance is built.
 *
 * The named-section list is deliberate. Collaborate has 19 top-level sections and
 * only some of its screens are surfaced in this app so far; pulling in wording for
 * a screen that is not reachable would put dead keys in front of translators.
 *
 * ONE of its sections, `profile`, collides with ours and is NOT merged below. That
 * clash has to be settled by renaming, not by letting one file quietly win — which
 * is exactly what mergeSections() refuses to allow.
 */

/**
 * Merge named top-level sections of `extra` into `base`, refusing any collision.
 *
 * A collision means two files both claim a section name: whichever is applied
 * second wins, every label under the loser changes, and no error is raised
 * anywhere. That is a silent wrong-wording bug, so it throws instead.
 *
 * @param {Object} base     - the app's own messages for one locale
 * @param {Object} extra    - the messages being merged in
 * @param {string[]} sections - top-level section names to take from `extra`
 * @returns {Object} a NEW object; neither input is modified
 * @throws {Error} when a section already exists in `base`, or is absent from `extra`
 */
export function mergeSections (base, extra, sections) {
  const merged = Object.assign({}, base)

  sections.forEach((section) => {
    if (Object.prototype.hasOwnProperty.call(base, section)) {
      throw new Error(
        `i18n: section '${section}' exists in both locale files. Rename one — ` +
        'merging would silently replace every label under it.'
      )
    }
    if (!Object.prototype.hasOwnProperty.call(extra, section)) {
      throw new Error(`i18n: section '${section}' was requested but is not in the merged locale file.`)
    }
    merged[section] = extra[section]
  })

  return merged
}

/**
 * The Collaborate sections this app currently surfaces.
 *
 * `common`, `console` and `firm` are what the Adviser Network tab renders
 * (components/collaborate/shared/ManagerConsole.vue + ConsoleNode.vue). Add to
 * this list as more Collaborate screens are surfaced — and expect mergeSections()
 * to stop you the day `profile` is one of them.
 */
export const COLLABORATE_SECTIONS = ['common', 'console', 'firm']
