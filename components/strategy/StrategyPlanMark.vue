<template lang="pug">
//- 🔴 THE APPROVED DRAWING'S OWN MARK, PORTED — NOT RE-DERIVED.
//- `design/mockups/strategy-plan-firm-mark.html`, rules `.deck .mark.small`,
//- `.deck .mark.big`, `.mark`, `.mark.disc`. The box sits in the gap the frame leaves
//- in his bottom bar; it does not need a plate, because the gap is a real gap.
span.spm(:class="{ 'is-big': big }")
  img.spm-logo(v-if="logo" :src="logo" :alt="name")
  template(v-else)
    i.spm-disc(:style="{ background: colour }") {{ initial }}
    span.spm-name {{ name }}
</template>

<script>
/**
 * StrategyPlanMark — the advisor firm's mark on one sheet of a client's plan (item 16.2).
 *
 * ⚠ EVERY NUMBER IN THE STYLE BLOCK IS COPIED FROM THE APPROVED DRAWING, character for
 * character. Do not recompute them from the PDF: that is what produced six wrong
 * versions. The drawing already did that work and Mike signed it off on 2026-09-22.
 *
 * ⚠ THE DISC IS THE FALLBACK, NEVER THE DESIGN — his ruling of the same day. A firm's
 * real uploaded logo fills the box; the disc appears only where that firm holds none,
 * and it fills the SAME box, so nothing moves between one firm and another.
 */
export default {
  name: 'StrategyPlanMark',

  props: {
    /** The advisor firm's name. Empty prints nothing. */
    name: { type: String, default: '' },
    /** The firm's real logo as an absolute http(s) URL. Empty means use the disc. */
    logo: { type: String, default: '' },
    /** The firm's colour, as a CSS colour — the disc's fill. */
    colour: { type: String, default: '#0070c0' },
    /** The big, centred mark of the title page. */
    big: { type: Boolean, default: false }
  },

  computed: {
    /**
     * One letter for the disc.
     * @returns {string} blank where there is no firm, because a made-up initial is a
     *   made-up firm — the same rule `StrategyConceptGraphic` already applies.
     */
    initial () {
      return this.name.trim().charAt(0).toUpperCase()
    }
  }
}
</script>

<style scoped>
/* ── copied from design/mockups/strategy-plan-firm-mark.html ── */

/* .deck .mark.small — 49.5,364.6, 69.4 x 37.7 of a 720x405 page */
.spm {
  position: absolute;
  left: 6.875%;
  top: 90.025%;
  width: 9.639%;
  height: 9.309%;
  display: grid;
  place-items: center;
  border-radius: 2px;
  overflow: hidden;
}

/* .deck .mark.big — 258.3,54.2, 202.8 x 110.1 */
.spm.is-big {
  left: 35.875%;
  top: 13.383%;
  width: 28.167%;
  height: 27.185%;
}

.spm-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* .mark.disc — the fallback, inside the same box */
.spm-disc {
  border-radius: 50%;
  color: #fff;
  display: grid;
  place-items: center;
  font-style: normal;
  font-weight: 700;
  aspect-ratio: 1;
  height: 64%;
}

.spm-name { display: none; }

/* On the title page the box is large enough to carry the firm's name beside the disc,
   which is how the drawing renders the fallback there. */
.spm.is-big {
  display: flex;
  gap: 4%;
  align-items: center;
  justify-content: center;
  background: #f3edf6;
}

.spm.is-big .spm-disc { height: 62%; font-size: min(2.1cqw, 26px); }

.spm.is-big .spm-name {
  display: block;
  color: #002b64;
  font-weight: 600;
  font-size: min(2.1cqw, 26px);
  white-space: nowrap;
}

/* A firm with a real logo needs no tinted plate behind it. */
.spm.is-big:not(:has(.spm-disc)) { background: none; }
</style>
