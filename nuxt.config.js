// Node version guard — must run on Node 20 LTS.
// Node 22+ breaks Restify (missing spdy binding). Node 20 is the supported runtime.
;(function checkNodeVersion () {
  const major = Number(process.version.slice(1).split('.')[0])
  if (major >= 22) {
    process.stderr.write(
      '\n[STARTUP ERROR] Node ' + process.version + ' is not supported.\n' +
      'Node 22+ breaks Restify via a missing spdy binding.\n' +
      'Run: nvm use 20\n\n'
    )
    process.exit(1)
  }
  if (major !== 20) {
    process.stderr.write(
      '\n[WARNING] Node ' + process.version + ' is not the tested runtime.\n' +
      'Recommended: Node 20 LTS. Run: nvm use 20\n\n'
    )
  }
}())

export default {
  target: 'server',

  server: {
    port: 4001,
    host: 'localhost'
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
    { path: '/api/course', handler: '~/server-middleware/course.js' }
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
