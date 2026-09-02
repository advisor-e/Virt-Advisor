// ── Node version guard ────────────────────────────────────────────────────────
// The locked runtime is Node 14.15 (CLAUDE.md Stack Constitution req. 9) — warn
// when running on anything else so drift is visible, never recommended. Mirrors the
// backend guard in server/restify-server.js.
;(function checkNodeVersion () {
  const major = Number(process.version.slice(1).split('.')[0])
  if (major >= 22) {
    process.stderr.write(
      '\n[STARTUP ERROR] Node ' + process.version + ' is not supported.\n' +
      'Node 22+ breaks Restify via a missing spdy binding.\n' +
      'The locked runtime is Node 14.15 — run: nvm use 14.15.0\n\n'
    )
    process.exit(1)
  }
  if (major !== 14) {
    process.stderr.write(
      '\n[WARNING] Node ' + process.version + ' is not the locked runtime.\n' +
      'The team spec requires Node 14.15 — run: nvm use 14.15.0\n\n'
    )
  }
}())

export default {
  target: 'server',

  // Telemetry off — @nuxt/telemetry's bundled rc9 uses `node:`-prefixed requires
  // that the legacy esm loader can't resolve (crashes boot). Locked stack has no
  // need for it. See design/ACTIONS.md (dev-toolchain drift, P1).
  telemetry: false,

  server: {
    // Env-aware for the same reason as `host` below — this file is merged OVER
    // Nuxt's defaults, so Nuxt's own NUXT_PORT/PORT lookup never runs once the key
    // is set here. Number() because these arrive as strings; unset leaves 3000, the
    // port every runbook, proxy entry and note in this repo names.
    port: Number(process.env.NUXT_PORT || process.env.PORT) || 3000,
    // '::' — the DUAL-STACK wildcard, so BOTH http://localhost:3000 and
    // http://127.0.0.1:3000 answer. Node leaves ipv6Only off, so a `::` socket accepts
    // IPv4 connections as well; one listener therefore covers both names.
    //
    // 🔴 WHY NOT A SINGLE LOOPBACK — this has now bitten twice, in both directions.
    // 2026-07-21: bound IPv6-only, every server-side check hit ::1 and reported healthy
    // while the browser on IPv4 saw nothing. Fixed by pinning 127.0.0.1 — whose comment
    // claimed that is "what every browser tries first". 2026-08-12: that claim was wrong
    // on this machine. `ping localhost` here answers ::1, so the browser asked for IPv6
    // and was refused, and none of the three tier hubs would load. Node cannot bind two
    // specific addresses in one listen call, so pinning EITHER loopback breaks the other
    // name; the wildcard is the only binding that serves both.
    //
    // ⚠ '::' (the all-interfaces wildcard) WAS TRIED ON 2026-08-12 AND REVERTED THE SAME
    // HOUR. It did serve both names, but it also made the dev server network-facing, and
    // the browser then hit a wall of ERR_CONNECTION_RESET / ERR_CONNECTION_REFUSED on
    // API calls and on the HMR and loading-SSE streams — while curl, hitting the same
    // URLs, succeeded every time including 14 in parallel. Loopback traffic is exempt
    // from the local security software's filtering (this machine runs Avast, which the
    // repo already documents intercepting TLS); a service on every interface is not.
    // The server's own log named it: "[api-proxy] backend error: read ECONNRESET".
    //
    // So: loopback ONLY. '::1' rather than '127.0.0.1' because `ping localhost` on this
    // machine answers ::1, so the IPv6 loopback is the address the browser actually asks
    // for. http://127.0.0.1:3000 will NOT answer with this binding — use localhost.
    //
    // ⚠ AND THE LESSON THAT COST THE TIME BOTH TIMES: curl is NOT the browser. It falls
    // back to IPv4 when IPv6 refuses, so `curl http://localhost:3000` returns 200 against
    // an IPv4-only bind and proves nothing about what a browser will do. Check the stacks
    // explicitly — `curl -g http://[::1]:3000` and `curl http://127.0.0.1:3000` — never
    // the name alone.
    //
    // 🔴 THE ENV LOOKUP IS NOT REDUNDANT — Nuxt's own one never runs. Nuxt reads
    // NUXT_HOST/HOST only to build its DEFAULT server block, and then merges this file
    // OVER those defaults (`defaultsDeep(options, nuxtConfig)` — @nuxt/config). Because
    // `host` is set here, the default is discarded and the variables are ignored: a
    // deployment that sets HOST=0.0.0.0 would see no change and read it as a broken
    // build. Reading them here restores the documented behaviour without giving up the
    // loopback default this machine needs. Same pattern as the backend's own
    // `process.env.BACKEND_HOST || '127.0.0.1'` (server/restify-server.js).
    //
    // Unset (every developer machine) → '::1', exactly as before. Set deliberately by a
    // server that must answer other machines → that interface. Network exposure is
    // therefore always something someone asked for, never a default.
    host: process.env.NUXT_HOST || process.env.HOST || '::1'
  },

  head: {
    title: 'Virtual Advisor',
    htmlAttrs: { lang: 'en' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
      // 300 (Light) is Collaborate's unified weight (owner requirement,
      // 2026-07-02) — without it the collaborate-theme's font-weight:300
      // rules render as faux-light. Nothing outside .collab-scope uses it.
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap' }
    ]
  },

  css: [
    'buefy/dist/buefy.css',
    // Material Design Icons — the icon pack Buefy is built around (its default
    // `iconPack` is 'mdi'), so this completes the locked Bulma+Buefy stack rather
    // than adding a second UI library. Without it every `icon`, `icon-left` and
    // `<b-icon>` in the app renders as blank space: 29 of them across 10 files,
    // including the only cue that a case-study row expands. Added 2026-08-03 on
    // Mike's ruling; see design/ACTIONS.md → #no-icon-font.
    '@mdi/font/css/materialdesignicons.min.css'
  ],

  plugins: [
    '~/plugins/buefy.js',
    '~/plugins/i18n.js'
  ],

  components: true,

  buildModules: [],

  modules: [],

  // Proxy /api/advisor/* to the Restify backend
  serverMiddleware: [
    // MUST stay above '/api/advisor'. That entry is the SSE engine proxy, which
    // forwards only POSTs to /query and calls next() for anything else — so a plain
    // GET /api/advisor/staircase would fall through every handler to a Nuxt 404,
    // and the firm's staircase wording would never reach the selector.
    { path: '/api/advisor/staircase', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/advisor', handler: '~/server-middleware/advisor.js' },
    { path: '/api/translate', handler: '~/server-middleware/translate.js' },
    { path: '/api/course', handler: '~/server-middleware/course.js' },
    { path: '/api/report', handler: '~/server-middleware/report.js' },
    { path: '/api/cases', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/clients', handler: '~/server-middleware/apiProxy.js' },
    // NB '/api/course' (singular, the SSE engine) never prefix-matches
    // '/api/courses' — connect only mounts on a '/' boundary.
    { path: '/api/courses', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/activity', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/firm-manager', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/mentor', handler: '~/server-middleware/apiProxy.js' },
    // Collaborate's people layer + its template catalogue. Same thin proxy as the
    // groups above: the browser only ever talks to its own origin, and the single
    // Restify backend answers. Collaborate shipped its own near-identical proxy
    // (server-middleware/collaborate/api.js); ours is used because it also aborts
    // the upstream request when the client disconnects.
    { path: '/api/people', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/templates', handler: '~/server-middleware/apiProxy.js' },
    // 🔴 MEETING REVIEW — ADDED 2026-09-02, AND WITHOUT IT NONE OF THE FEATURE WORKS.
    // Found by opening the app for the first time: the advisor's pre-set answered
    // "Your meeting checklist could not be loaded: Not Found". The backend was serving
    // /api/meeting/observations with a 200 the whole time; the browser was never allowed
    // to ask for it, because this list is what decides that and no slice added the line.
    //
    // ⚠ IT BLOCKED ALL THREE SLICES, not one screen. Every Meeting Review call comes
    // through here: the observation points, the consent context, start / chunk / finish,
    // the transcript, both reports, the dispute and the delete.
    //
    // The prefix covers every sub-path — connect mounts on a '/' boundary — and
    // apiProxy.js is the same forwarder '/api/firm-manager' already uses for uploads,
    // so the multipart audio chunks need nothing of their own.
    { path: '/api/meeting', handler: '~/server-middleware/apiProxy.js' }
  ],

  // API_BASE_URL should point to the Restify backend server
  // e.g. http://your-restify-server:3001
  env: {
    apiBaseUrl: process.env.API_BASE_URL || ''
  },

  build: {
    cache: true,
    parallel: false,
    extend (config, { isDev }) {
      if (isDev) {
        config.optimization = config.optimization || {}
        config.optimization.splitChunks = { chunks: 'async' }
        // Use an incremental (eval-based) source map in dev. Nuxt 2's default
        // (cheap-module-source-map) regenerates the FULL map on every HMR rebuild,
        // which is the main driver of the dev server's memory climb -> OOM over a
        // long edit session. eval-cheap-module-source-map rebuilds far less and
        // still maps to source lines in the browser. Dev-only; no production effect.
        config.devtool = 'eval-cheap-module-source-map'
      }
    }
  },

  watchers: {
    webpack: {
      aggregateTimeout: 300,
      poll: false
    }
  }
}
