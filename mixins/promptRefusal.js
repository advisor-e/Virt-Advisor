/**
 * Turns a refusal from the backend into the six strings a screen shows.
 *
 * Two screens refuse the same way — the paste box that checks a prompt, and the panel a
 * level types its own material into — and a refusal must read identically on both. The
 * mapping lives here so there is one of it.
 *
 * 🔴 A REFUSAL THIS BUILD CANNOT DESCRIBE RETURNS null, never a half-filled panel. An
 * empty red box is indistinguishable from a broken page, so a caller that gets null says
 * the check failed instead.
 *
 * The words themselves are `locales/*.json` → `promptCheck`. Nothing here hardcodes
 * English.
 */
export default {
  methods: {
    /**
     * Rounds a character count to something a person would say out loud.
     * @param {number} n
     * @returns {number}
     */
    approximateCount (n) {
      return n >= 10000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100
    },

    /**
     * @param {object|null} refusal - `{ kind, line, count, quote, characters, limit, variant }`
     * @returns {object|null} `{ tone, heading, found, quote, afterQuote, why, todo,
     *   againLabel, again }`
     */
    refusalView (refusal) {
      const r = refusal
      if (!r) { return null }
      const t = (k, params) => this.$t('promptCheck.' + k, params)

      if (r.kind === 'length') {
        return {
          tone: 'is-limit',
          heading: t('lengthHeading'),
          found: t('lengthFound', {
            characters: this.approximateCount(r.characters),
            limit: r.limit,
            pages: Math.max(1, Math.round(r.characters / 3000))
          }),
          quote: '',
          afterQuote: '',
          why: t('lengthWhy'),
          todo: t('lengthDo'),
          againLabel: t('lengthBack'),
          again: 'edit'
        }
      }

      const heading = t('refusedHeading')

      if (r.kind === 'link') {
        return {
          tone: 'is-stop',
          heading,
          found: t(r.variant === 'email' ? 'linkEmailFound' : 'linkWebFound', { line: r.line }),
          quote: r.quote,
          afterQuote: '',
          why: t('linkWhy'),
          todo: t('linkDo'),
          againLabel: t('linkAgain'),
          again: 'edit'
        }
      }

      if (r.kind === 'invisible') {
        return {
          tone: 'is-stop',
          heading,
          found: t('invisibleFound', { count: r.count, line: r.line }),
          quote: '',
          afterQuote: '',
          why: t('invisibleWhy'),
          todo: t('invisibleDo'),
          againLabel: t('invisibleAgain'),
          again: 'strip'
        }
      }

      if (r.kind === 'secret') {
        return {
          tone: 'is-stop',
          heading,
          found: t('secretFound', { line: r.line }),
          quote: r.quote,
          afterQuote: t('secretShortened'),
          why: t('secretWhy'),
          todo: t('secretDo'),
          againLabel: t('secretAgain'),
          again: 'edit'
        }
      }

      if (r.kind === 'fence') {
        return {
          tone: 'is-stop',
          heading,
          found: t('fenceFound', { line: r.line }),
          quote: r.quote,
          afterQuote: '',
          why: t('fenceWhy'),
          todo: t('fenceDo'),
          againLabel: t('fenceAgain'),
          again: 'edit'
        }
      }

      if (r.kind === 'personal') {
        const found = r.variant === 'taxNumber'
          ? 'personalTaxFound'
          : (r.variant === 'name' ? 'personalNameFound' : 'personalAddressFound')
        return {
          tone: 'is-stop',
          heading,
          found: t(found, { line: r.line }),
          quote: r.quote,
          afterQuote: '',
          why: t('personalWhy'),
          todo: t('personalDo'),
          againLabel: t('personalAgain'),
          again: 'edit'
        }
      }

      return null
    }
  }
}
