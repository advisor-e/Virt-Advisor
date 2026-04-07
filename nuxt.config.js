export default {
  target: 'server',

  head: {
    title: 'Virtual Advisor',
    htmlAttrs: { lang: 'en' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
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
    { path: '/api/translate', handler: '~/server-middleware/translate.js' }
  ],

  // API_BASE_URL should point to the Restify backend server
  // e.g. http://your-restify-server:3001
  env: {
    apiBaseUrl: process.env.API_BASE_URL || ''
  },

  build: {}
}
