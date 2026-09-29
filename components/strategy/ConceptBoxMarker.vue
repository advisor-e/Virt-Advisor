<template lang="pug">
.cbm
  imported-concept-page(
    :svg="page.svg"
    :width="page.width"
    :height="page.height"
    :firm-name="firmName"
    :firm-colour="firmColour"
    :firm-logo="firmLogo")
    .cbm-layer(ref="layer" @mousedown.prevent="start" @mousemove="move" @mouseup="finish" @mouseleave="finish")
      .cbm-box(v-for="(b, i) in boxes" :key="i" :style="place(b)") {{ (i + 1) + ' · ' + b.label }}
      .cbm-box.is-drawing(v-if="drawing" :style="place(drawing)")

  table.table.is-fullwidth.is-narrow.mt-3
    thead
      tr
        th.cbm-n #
        th {{ $t('strategyConcepts.mark.list') }}
        th
    tbody
      tr(v-for="(b, i) in boxes" :key="i")
        td {{ i + 1 }}
        td
          b-input(
            :value="b.label"
            size="is-small"
            :maxlength="maxLabel"
            :placeholder="$t('strategyConcepts.mark.labelPlaceholder')"
            @input="v => relabel(i, v)")
        td.has-text-right
          b-button(size="is-small" type="is-light" @click="remove(i)") {{ $t('strategyConcepts.mark.remove') }}
</template>

<script>
import ImportedConceptPage from '~/components/strategy/ImportedConceptPage.vue'
import { pointOnPage, boxBetween } from '~/utils/conceptBoxes'

/**
 * ConceptBoxMarker — the manager drags a box over each space on an imported Response Form where
 * the client writes, and labels it (item 15.20, `design/mockups/add-concept.html` §5b, approved
 * 2026-09-24).
 *
 * 🔴 MARKED BY HAND, NEVER PROPOSED — Mike's ruling of 2026-09-23 that no AI touches an uploaded
 * PDF. Nothing here guesses where a box goes. Boxes are kept in the order they were drawn, which
 * is the order the advisor is taken through them, and each is a fraction of the page
 * (`utils/conceptBoxes.js`), so it is exactly what the backend's check accepts.
 *
 * ⚠ ONE DIFFERENCE FROM THE DRAWING: the box being drawn shows no caption. The drawing's
 * "being drawn…" illustrates the dashed state for Mike; it is not in the approved wording.
 */
export default {
  name: 'ConceptBoxMarker',

  components: { ImportedConceptPage },

  props: {
    /** The Response Form's converted page: `{ svg, width, height }`. */
    page: { type: Object, required: true },
    /** The boxes so far: `[{ label, x, y, w, h }]`. */
    boxes: { type: Array, required: true },
    maxLabel: { type: Number, default: 80 },
    maxBoxes: { type: Number, default: 30 },
    firmName: { type: String, default: '' },
    firmColour: { type: String, default: '#0070c0' },
    firmLogo: { type: String, default: '' }
  },

  data () {
    return {
      /** Where the drag began, as fractions of the page, or null. */
      anchor: null,
      /** The box being dragged, or null. */
      drawing: null
    }
  },

  methods: {
    place (b) {
      return { left: b.x * 100 + '%', top: b.y * 100 + '%', width: b.w * 100 + '%', height: b.h * 100 + '%' }
    },

    at (e) {
      return pointOnPage(e.clientX, e.clientY, this.$refs.layer.getBoundingClientRect())
    },

    start (e) {
      if (this.boxes.length >= this.maxBoxes) { return }
      this.anchor = this.at(e)
      this.drawing = null
    },

    move (e) {
      if (this.anchor) { this.drawing = boxBetween(this.anchor, this.at(e)) }
    },

    finish (e) {
      if (!this.anchor) { return }
      const box = boxBetween(this.anchor, this.at(e))
      this.anchor = null
      this.drawing = null
      // Payload: the whole list with the new, still unlabelled box last.
      if (box) { this.$emit('change', this.boxes.concat([Object.assign({ label: '' }, box)])) }
    },

    relabel (i, label) {
      // Payload: the whole list with box i relabelled.
      this.$emit('change', this.boxes.map((b, j) => (j === i ? Object.assign({}, b, { label }) : b)))
    },

    remove (i) {
      // Payload: the whole list without box i.
      this.$emit('change', this.boxes.filter((b, j) => j !== i))
    }
  }
}
</script>

<style scoped>
.cbm-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: crosshair; user-select: none; }
.cbm-box {
  position: absolute; border: 2px solid #00b1e0; background: rgba(0, 177, 224, 0.08);
  border-radius: 4px; font-size: 11px; font-weight: 600; color: #0070c0; padding: 4px 6px; overflow: hidden;
}
.cbm-box.is-drawing { border-style: dashed; background: rgba(0, 177, 224, 0.04); }
.cbm-n { width: 40px; }
</style>
