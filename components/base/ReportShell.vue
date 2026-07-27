<template lang="pug">
.report-shell
  .report-shell__wrap
    slot
</template>

<script>
/**
 * ReportShell — the single source of the Model Library's visual standard.
 *
 * Every report/model page wraps its screen in `<report-shell>`. This component owns two
 * things that were, until now, copy-pasted into all eight screens (and drifted screen by
 * screen — see `design/REPORT-VISUAL-STANDARD.md`):
 *
 *   1. THE FRAME — the light page canvas, full-height, and the centred, padded content
 *      column. Previously each page hand-wrote `min-height/background/max-width/padding`
 *      in its own `<style scoped>`; that is what let Lease vs Buy ship with no frame and
 *      the build stay green.
 *   2. THE TOKENS — the palette, layout numbers, card, button and font, declared once as
 *      CSS custom properties on `.report-shell`. Because CSS variables inherit down the
 *      DOM tree, every screen rendered inside the slot reads them with `var(--rs-*)` —
 *      no screen re-declares a colour, radius or font. This is the mechanism the banner
 *      (`HeroStrip`) already proved: one definition, identical by construction.
 *
 * The numbers here are the owner-confirmed standard (2026-07-27): left input column
 * 360px, column gap 20px, content width 1120px, card radius 14px, card title 12px.
 * There is deliberately NO `prefers-color-scheme: dark` rule — Mike ruled one light look
 * on every model regardless of the OS/laptop theme (2026-07-27). Reintroducing a dark
 * media query here is a defect, and `reportShell.component.test.js` fails the build on it.
 *
 * Presentational only: no data, no lifecycle, no `window`/DOM access — SSR-safe.
 *
 * Adoption is staged (one screen per commit, see the migration plan): this file ships
 * first, changing no existing screen, then each screen moves onto it and deletes its own
 * frame/palette/card/button copy.
 */
export default {
  name: 'ReportShell'
}
</script>

<style scoped>
.report-shell {
  /* ─── Layout (owner-confirmed 2026-07-27) ─────────────────────────────────
     `--rs-collapse` (860px) is documented here as the agreed single-column
     breakpoint, but a CSS media query cannot read a custom property, so the
     screens hardcode `@media (max-width: 860px)`; keep the two in step. */
  --rs-col-input: 360px;
  --rs-col-gap: 20px;
  --rs-content-width: 1120px;
  --rs-collapse: 860px;
  --rs-frame-pad: 28px 22px 64px;

  /* ─── Brand palette — single source (light only) ──────────────────────── */
  --rs-bg: #eef3f8;
  --rs-panel: #ffffff;
  --rs-panel-2: #f1f6fb;
  --rs-ink: #002b64;
  --rs-muted: #5b6f8a;
  --rs-line: #d5e1ee;
  --rs-accent: #0070c0;
  --rs-accent-bright: #00b1e0;
  --rs-good: #4ca52d;
  --rs-warn: #ff9900;
  --rs-crit: #ff0000;

  /* ─── Cards ───────────────────────────────────────────────────────────── */
  --rs-card-bg: var(--rs-panel);
  --rs-card-border: var(--rs-line);
  --rs-card-top: var(--rs-accent-bright);
  --rs-card-radius: 14px;
  --rs-card-pad: 16px 18px;
  --rs-card-title-size: 12px;
  --rs-card-title-color: var(--rs-ink);

  /* ─── Primary CTA button ──────────────────────────────────────────────── */
  --rs-btn-weight: 600;
  --rs-btn-size: 13.5px;
  --rs-btn-pad: 11px 18px;
  --rs-btn-radius: 10px;

  /* ─── Font ────────────────────────────────────────────────────────────── */
  --rs-font: 'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --rs-font-weight: 300;

  /* The frame itself, drawn from the tokens above. */
  min-height: 100vh;
  background: var(--rs-bg);
  font-family: var(--rs-font);
  font-weight: var(--rs-font-weight);
  -webkit-font-smoothing: antialiased;
}

.report-shell__wrap {
  max-width: var(--rs-content-width);
  margin: 0 auto;
  padding: var(--rs-frame-pad);
}
</style>
