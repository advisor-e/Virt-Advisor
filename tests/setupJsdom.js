'use strict'

/**
 * Globals jsdom does not provide, but the app's dependencies expect.
 *
 * `isomorphic-dompurify` (imported by VirtualAdvisor for the v-html sanitising the
 * Markdown pipeline depends on) pulls in jsdom's URL parser, which reaches for
 * `TextEncoder`/`TextDecoder`. Node has had both since v11, but jsdom's window does not
 * expose them, so importing the component under test dies with
 * "ReferenceError: TextEncoder is not defined" before a single test runs.
 *
 * Defined here rather than in each test file so the next person testing anything that
 * touches the Markdown pipeline does not have to rediscover it. Harmless under the
 * default 'node' environment, where these already exist.
 */
const { TextEncoder, TextDecoder } = require('util')

if (typeof global.TextEncoder === 'undefined') { global.TextEncoder = TextEncoder }
if (typeof global.TextDecoder === 'undefined') { global.TextDecoder = TextDecoder }
