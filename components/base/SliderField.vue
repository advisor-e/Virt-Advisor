<template lang="pug">
.sl-field
  .sl-row
    label {{ label }}
    output {{ display }}
  input(
    type="range"
    :class="{ 'is-warn': tone === 'warn' }"
    :min="min"
    :max="max"
    :step="step"
    :value="value"
    :aria-label="label"
    :style="{ '--sl-fill': fill }"
    @input="$emit('input', Number($event.target.value))"
  )
</template>

<script>
/**
 * SliderField — one labelled slider in a report's left-hand control panel: the label,
 * the current value, and the range input with its filled track.
 *
 * It does no formatting. The report screen passes `display` in already formatted (its
 * own `fmtField`, which routes money through currencyMixin), because the six screens
 * use genuinely different vocabularies — one screen's "pct" is a fraction to multiply,
 * another's is already a percentage. Merging those would invent a shared vocabulary
 * that reconciles nothing and risks showing a wrong number.
 *
 * Colours come from CSS custom properties so each screen keeps its own palette *and*
 * its dark-mode overrides; the fallbacks below are the light-theme values. A screen
 * maps them once on its root, e.g. `--sl-accent: var(--mbk-accent);`.
 *
 * Extracted 2026-07-21 (report-scaffolding Phase 2).
 *
 * @example
 *   slider-field(
 *     :label="fld.label" :display="fmtField(fld)" :value="f[fld.k]"
 *     :min="fld.min" :max="fld.max" :step="fld.step"
 *     @input="v => setField(fld, v)")
 */
export default {
  name: 'SliderField',

  props: {
    /** Text shown beside the slider; also its accessible name. */
    label: { type: String, required: true },
    /** The current value, already formatted for display. */
    display: { type: [String, Number], required: true },
    /** The current value as a number — drives both the input and the track fill. */
    value: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, default: 1 },
    /**
     * 'default' accent-coloured, or 'warn' amber — used where a slider models a
     * what-if change rather than the client's actual position.
     */
    tone: {
      type: String,
      default: 'default',
      validator: t => ['default', 'warn'].includes(t)
    }
  },

  computed: {
    /** How much of the track is filled, as a CSS percentage. */
    fill () {
      if (this.max === this.min) { return '0%' }
      const pct = (this.value - this.min) / (this.max - this.min) * 100
      return Math.min(100, Math.max(0, pct)) + '%'
    }
  }
}
</script>

<style scoped>
.sl-field { margin: 11px 0; }
.sl-row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 5px; }
.sl-row label { font-size: 12.5px; color: var(--sl-ink, #002b64); font-weight: 300; }
.sl-row output { font-size: 13px; font-weight: 600; color: var(--sl-accent, #0070c0); }
input[type=range] {
  -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 4px; outline: none;
  background:
    linear-gradient(var(--sl-accent, #0070c0), var(--sl-accent, #0070c0)) 0/var(--sl-fill, 50%) 100% no-repeat,
    var(--sl-line, #d5e1ee);
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
  background: var(--sl-panel, #fff); border: 2px solid var(--sl-accent, #0070c0);
  box-shadow: 0 1px 3px #0003; cursor: pointer;
}
input[type=range]::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--sl-panel, #fff); border: 2px solid var(--sl-accent, #0070c0); cursor: pointer;
}
input[type=range]:focus-visible { box-shadow: 0 0 0 3px var(--sl-accent-soft, #0070c018); }
input.is-warn {
  background:
    linear-gradient(var(--sl-warn, #ff9900), var(--sl-warn, #ff9900)) 0/var(--sl-fill, 50%) 100% no-repeat,
    var(--sl-line, #d5e1ee);
}
input.is-warn::-webkit-slider-thumb { border-color: var(--sl-warn, #ff9900); }
input.is-warn::-moz-range-thumb { border-color: var(--sl-warn, #ff9900); }
</style>
