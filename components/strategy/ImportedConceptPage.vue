<template lang="pug">
.icp(:style="{ paddingTop: ratio }")
  //- The converted page. Cleaned on the server and again here before it reaches the DOM.
  .icp-page(v-html="clean")
  //- 🔴 THE APP'S FRAME, PAINTED OVER THE PAGE'S OWN BORDER — question 1, ruled 2026-09-23 —
  //- and THE FIRM'S MARK IN THE GAP OF THE BOTTOM BAR — question 8, ruled 2026-09-24. Every
  //- coordinate is the drawn slides' own, copied from any generated drawing in
  //- components/strategy/concepts/ (the frame is pinned identical across all of them by
  //- tests/unit/conceptGraphics.test.js), so an imported page wears exactly their frame.
  svg.icp-frame(viewBox="0 0 1500 844" preserveAspectRatio="none" aria-hidden="true")
    g.firm-mark
      image(v-if="firmLogo" x="86" y="766" width="240" height="48" preserveAspectRatio="xMinYMid meet" :href="firmLogo")
      template(v-else)
        circle(cx="110" cy="790" r="24" :fill="firmColour")
        text(x="110" y="799" text-anchor="middle" fill="#fff" font-family="Open Sans, sans-serif" font-size="22" font-weight="700") {{ initial }}
        text(x="146" y="798" fill="#002B64" font-family="Open Sans, sans-serif" font-size="22.9" font-weight="600") {{ firmName }}
    rect(x="8.13" y="8.13" width="1483.74" height="14.8" :fill="firmColour")
    rect(x="8.13" y="22.92" width="14.16" height="798.16" :fill="firmColour")
    rect(x="1477.71" y="22.92" width="14.16" height="798.16" :fill="firmColour")
    rect(x="8.13" y="821.07" width="95.01" height="14.8" :fill="firmColour")
    rect(x="248.31" y="821.07" width="1243.56" height="14.8" :fill="firmColour")
  slot
</template>

<script>
import DOMPurify from 'isomorphic-dompurify'

/**
 * ImportedConceptPage — one page of a concept a manager imported from a PDF (item 15.20), drawn
 * as a client will see it: the converted page, in the app's frame, with the advisor firm's mark.
 *
 * 🔴 CLEANED TWICE. `server/utils/pdfConvert.js` already runs every converted page through
 * isomorphic-dompurify and strips any picture or font that is not embedded; the page is cleaned
 * again here with the same settings because the rule is that nothing reaches `v-html` unsanitised,
 * whatever the server promises.
 *
 * ⚠ THE BOX TAKES THE PAGE'S OWN SHAPE and the frame stretches to it. Mike's deck pages are
 * 16:9, the drawn slides' shape, so the frame lands exactly; a page of another shape shows its
 * frame visibly out of proportion at step 2, which is the per-import check question 1 relies on.
 *
 * A default slot sits over the page, so the box-marking screen can draw on it.
 */
export default {
  name: 'ImportedConceptPage',

  props: {
    /** The converted page's SVG. */
    svg: { type: String, required: true },
    /** The page's own width and height, in the units the converter reported. */
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    /** The advisor firm's name, beside the disc when there is no logo. */
    firmName: { type: String, default: '' },
    /** The firm's colour — the frame and the disc. */
    firmColour: { type: String, default: '#0070c0' },
    /** The firm's real logo, an absolute http(s) URL; empty shows the disc. */
    firmLogo: { type: String, default: '' }
  },

  computed: {
    clean () {
      return DOMPurify.sanitize(this.svg, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['style'] })
    },

    ratio () {
      return (this.width > 0 ? (this.height / this.width) * 100 : 56.27) + '%'
    },

    /** Blank where there is no firm: a made-up initial is a made-up firm. */
    initial () {
      return this.firmName.trim().charAt(0).toUpperCase()
    }
  }
}
</script>

<style scoped>
.icp { position: relative; width: 100%; background: #fff; }
.icp-page, .icp-frame { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.icp-page >>> svg { display: block; width: 100%; height: 100%; }
.icp-frame { pointer-events: none; }
</style>
