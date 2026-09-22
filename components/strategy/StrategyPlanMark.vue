<template lang="pug">
//- 🔴 THE WHITE PLATE IS THE GAP IN HIS BORDER, not a background.
//- On `Advance.6.Organisational Review.pdf` the bottom border is TWO segments —
//- a 45.61pt stub in the corner, then the logo, then the run from x=119.19. The
//- mark sits ON the border line with the page's own white behind it, which
//- reproduces both segments exactly and needs no second element.
span.spm(:class="{ 'is-big': big }")
  img.spm-logo(v-if="logo" :src="logo" :alt="name")
  template(v-else)
    span.spm-disc(:style="{ background: colour }") {{ initial }}
    span.spm-name {{ name }}
  //- The running foot the approved drawing carries on every page: who the document is
  //- for and what it is. It sits BESIDE the mark, because his border runs beneath it.
  span.spm-foot(v-if="!big && foot") {{ foot }}
</template>

<script>
/**
 * StrategyPlanMark — the advisor firm's mark on one sheet of a client's plan (item 16.2).
 *
 * The position and both sizes are Mike's own deck page, not ours:
 *   title page   202.8 x 110.1pt, CENTRED, at x=258.3 y=54.2 of a 720x405 page
 *   every other   69.4 x 37.7pt at x=49.5 y=364.6 — bottom left, over the border
 * Drawn and approved: `design/mockups/strategy-plan-firm-mark.html`.
 *
 * ⚠ THE DISC IS THE FALLBACK, NEVER THE DESIGN — Mike's ruling, 2026-09-22. A firm's
 * real uploaded logo fills the box; the initials disc appears ONLY where that firm
 * holds no logo on file. It fills the same box so nothing reflows between firms.
 */
export default {
  name: 'StrategyPlanMark',

  props: {
    /** The advisor firm's name, printed beside the disc. Empty prints nothing. */
    name: { type: String, default: '' },
    /** The firm's real logo as an absolute http(s) URL. Empty means use the disc. */
    logo: { type: String, default: '' },
    /** The firm's colour, as a CSS colour — the disc's fill. */
    colour: { type: String, default: '#0070c0' },
    /** The big, centred mark of the title page. */
    big: { type: Boolean, default: false },
    /**
     * The running foot beside the mark — who this document is for and what it is,
     * as the approved drawing carries on every page. Never shown on the title page.
     */
    foot: { type: String, default: '' }
  },

  computed: {
    /**
     * One letter for the disc.
     * @returns {string} blank where there is no firm, because a made-up initial is
     *   a made-up firm — the same rule `StrategyConceptGraphic` already applies.
     */
    initial () {
      return this.name.trim().charAt(0).toUpperCase()
    }
  }
}
</script>

<style scoped>
/* Every value is a share of the page, taken from his 720x405pt geometry, so the mark
   holds its place whatever size the sheet is rendered or printed at. */
/* 🔴 SIZES ARE A SHARE OF THE PAGE'S WIDTH, NEVER ITS HEIGHT. His deck page is 16:9 and
   the built document is A4, so a height taken as a percentage of the page came out 21%
   too big on every sheet and the title-page mark 21% too big again. `cqw` is 1% of the
   document's width (`.spd` is the container), which is the same basis his own 720pt-wide
   page uses. Measured, not assumed: this was 6.33%w against his 5.24%w before the fix. */
.spm {
  position: absolute;
  /* ⚠ A PERCENTAGE `left` RESOLVES AGAINST THE PADDING BOX, NOT THE SHEET. The page's
     own border sits outside that box, so 6.875% put the mark at 7.72% of the sheet.
     Solved back to his edge: border 0.986% + L x 0.98028 + plate padding 0.35% x 0.98028
     = 6.875%, so L = 5.658%. Measured after the change, not assumed. */
  left: 5.658%;            /* + border + the 0.35% plate padding = his 6.875% of the sheet */
  bottom: 0.42%;           /* his logo runs to y=402.3 of 405 */
  height: 5.236cqw;        /* 37.7 / 720 — the height of HIS logo box */
  display: flex;
  align-items: center;
  gap: 0.9%;
  padding: 0 0.35%;        /* the sliver of white either side of his gap */
  background: #fff;        /* THE GAP — see the template note */
  max-width: 78%;          /* stops short of the page number at 91.7% */
}

/* ⚠ THE PLATE IS ONLY A GAP ON A WHITE SHEET. On the navy step dividers it renders as a
   white rectangle floating over the dark page, so it is turned off there — the rule
   lives in StrategyPlanDocument, which owns `.is-divider`; a scoped rule here cannot
   see a class on the parent's element. */

.spm.is-big {
  left: 35.875%;           /* 258.3 / 720 */
  top: 13.383%;            /* 54.2 / 405 — a vertical POSITION, so a share of height */
  bottom: auto;
  height: 15.292cqw;       /* 110.1 / 720 — a SIZE, so a share of width */
  width: 28.167cqw;        /* 202.8 / 720 */
  max-width: none;
  justify-content: center;
  padding: 0;
  background: none;        /* the title page's border is not interrupted */
}

/* HIS logo box, exactly: 69.4 x 37.7pt of a 720-wide page. The image is fitted inside
   it whatever its own proportions are — "a real logo is an image of unknown proportion"
   was the reason for the disc, and a fixed box is the answer to it. */
.spm-logo {
  width: 9.639cqw;
  height: 100%;
  object-fit: contain;
  object-position: left center;
  display: block;
  flex: 0 0 auto;
}

.spm.is-big .spm-logo { width: 100%; object-position: center; margin: 0 auto; }

/* 🔴 THE DISC IS NOT THE HEIGHT OF THE LOGO BOX. His logo box is 37.7pt tall, but the
   fallback disc in the 33 concept drawings is r=22 on an 844-tall page — 5.2% of the
   page, a little over half the box. Sizing the disc to the full box makes it dominate
   the foot of the sheet; seen by opening the app, not by any assertion. */
.spm-disc {
  height: 56%;
  aspect-ratio: 1;
  flex: 0 0 auto;
  border-radius: 50%;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 11px;
  font-size: 1.33cqw;      /* the drawings' 20 on a 1500-wide page */
}

/* Sized against the PAGE, not the page's font-size: an `em` here rendered the name at
   about 7px beside the disc, which reads as a fault rather than as a firm. The
   drawings set it at 21 on a 1500-wide page. */
.spm-name {
  color: #002b64;
  font-weight: 600;
  font-size: 12px;
  font-size: 1.4cqw;
  white-space: nowrap;
  /* 🔴 NEVER TRUNCATED. This is the advisor firm's own name on a document their client
     keeps; "Advisor-e Ber…" is not a firm. The mark sits in open white space at the
     foot of the sheet, so there is nothing for it to collide with, and a name long
     enough to reach the page number is a better fault than a clipped one. */
  flex: 0 0 auto;
}

/* The title page's box is 202.8 x 110.1pt — a WIDE box for a real logo. A disc filling
   it is a 130px circle on a printed sheet, which is not a firm's mark, it is a blob.
   The fallback stays modest and lets the name carry the page. */
.spm-foot {
  color: #5b6f8a;
  font-size: 11px;
  font-size: 1.2cqw;
  white-space: nowrap;
  margin-left: 1.4%;
}

.spm.is-big .spm-disc { height: 38%; font-size: 2.1cqw; }
.spm.is-big .spm-name { font-size: 2.2cqw; }
</style>
