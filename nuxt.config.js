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
    port: 3000,
    // 127.0.0.1, NOT 'localhost'. On a dual-stack Windows machine 'localhost' resolves to
    // ::1 first, so Node binds IPv6-only and http://127.0.0.1:3000 is refused — while
    // http://localhost:3000 may or may not work depending on the browser's own resolution
    // order. That cost an afternoon on 2026-07-21: every server-side check hit ::1 and
    // reported healthy while the browser, on IPv4, saw nothing at all. Binding the IPv4
    // loopback explicitly is what every browser tries first, and stays local-only.
    host: '127.0.0.1'
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
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap' }
    ]
  },

  css: [
    'buefy/dist/buefy.css'
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
    { path: '/api/advisor', handler: '~/server-middleware/advisor.js' },
    { path: '/api/translate', handler: '~/server-middleware/translate.js' },
    { path: '/api/course', handler: '~/server-middleware/course.js' },
    { path: '/api/report', handler: '~/server-middleware/report.js' },
    { path: '/api/cases', handler: '~/server-middleware/apiProxy.js' },
    // NB '/api/course' (singular, the SSE engine) never prefix-matches
    // '/api/courses' — connect only mounts on a '/' boundary.
    { path: '/api/courses', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/activity', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/firm-manager', handler: '~/server-middleware/apiProxy.js' },
    { path: '/api/mentor', handler: '~/server-middleware/apiProxy.js' }
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
