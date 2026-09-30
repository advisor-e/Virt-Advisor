<template lang="pug">
span.rt
  template(v-for="(tok, ti) in tokens")
    b(v-if="tok.t === 'bold'" :key="ti") {{ tok.s }}
    //- On paper a citation is the source's NAME — there is nothing to click, and the full
    //- address is listed at the end. On screen it is a link.
    span.rt-cite(v-else-if="tok.t === 'link' && print" :key="ti") {{ tok.s }}
    a.rt-cite(
      v-else-if="tok.t === 'link'"
      :key="ti"
      :href="tok.url"
      target="_blank"
      rel="noopener noreferrer") {{ tok.s }}
    span(v-else :key="ti") {{ tok.s }}
</template>

<script>
/**
 * ResearchTokens — one run of the Economic Analysis's text / bold / link tokens
 * (`utils/researchText.js`), drawn the same way in a paragraph, a list item or a table
 * cell, on the advisor's screen and in the printed pack. No `v-html`: every token is text.
 *
 * @example
 *   research-tokens(:tokens="para.tokens" :print="true")
 */
export default {
  name: 'ResearchTokens',

  props: {
    /** `[{ t: 'text'|'bold'|'link', s, url }]` from `tokensOf`. */
    tokens: { type: Array, required: true },
    /** True in the printed pack, where a citation is a name, not a link. */
    print: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
a.rt-cite { color: var(--rs-accent); font-size: 12px; text-underline-offset: 2px; }
span.rt-cite { font-size: 11px; }
</style>
