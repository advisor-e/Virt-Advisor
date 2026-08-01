'use strict'
/* eslint-env jest */

/**
 * pages/messages.vue is RETIRED (Phase 4 of FEAT-CONNECTING) — it now only
 * redirects to the unified /connecting screen, preserving any ?thread= deep-link.
 * The conversation logic it used to hold lives in components/shared/
 * ConversationPane (tests/conversationPane.test.js).
 */

import Messages from '../../components/collaborate/screens/messages.vue'

describe('messages redirect', () => {
  test('redirects to /connecting, carrying a thread deep-link', () => {
    const redirect = jest.fn()
    Messages.middleware({ redirect, query: { thread: 't-bob' } })
    expect(redirect).toHaveBeenCalledWith('/connecting?thread=t-bob')
  })

  test('redirects to /connecting when there is no thread query', () => {
    const redirect = jest.fn()
    Messages.middleware({ redirect, query: {} })
    expect(redirect).toHaveBeenCalledWith('/connecting')
  })
})
