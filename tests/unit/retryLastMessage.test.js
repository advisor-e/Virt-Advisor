/**
 * @jest-environment jsdom
 */
'use strict'

const VirtualAdvisor = require('~/components/VirtualAdvisor.vue').default
const retryLastMessage = VirtualAdvisor.methods.retryLastMessage

/**
 * Retrying a failed answer must not leave the question in the thread twice.
 *
 * `sendMessage()` always pushes the user's turn. `retryLastMessage` popped only the
 * error reply, so the question was re-added on top of the one already there. The
 * duplicate showed on screen AND went to the model as conversation history
 * (`conversationHistory.slice(0, -1)`), so the AI saw the advisor asking the same thing
 * twice in a row — three times after a second retry — and read the repetition as
 * meaningful.
 *
 * The method is called against a hand-built `this`, the pattern used by
 * `reportRecompute.test.js`: VirtualAdvisor is ~2,500 lines with speech, streaming and
 * markdown in `mounted()`, none of which this rule depends on.
 */

const ERROR_TEXT = 'Something went wrong.'

function makeCtx (over) {
  return Object.assign({
    isStreaming: false,
    showRetry: true,
    inputText: '',
    lastQuery: 'how do I improve margin?',
    messages: [
      { role: 'user', content: 'how do I improve margin?' },
      { role: 'assistant', content: ERROR_TEXT }
    ],
    $t: () => ERROR_TEXT,
    sent: 0,
    sendMessage () { this.sent++ }
  }, over)
}

describe('retryLastMessage', () => {
  it('removes the failed reply AND the question, so sendMessage can re-add it once', () => {
    const ctx = makeCtx()
    retryLastMessage.call(ctx)

    expect(ctx.messages).toEqual([])
    expect(ctx.inputText).toBe('how do I improve margin?')
    expect(ctx.sent).toBe(1)
    expect(ctx.showRetry).toBe(false)
  })

  it('leaves earlier turns alone', () => {
    const earlier = [
      { role: 'user', content: 'what is EBITDA?' },
      { role: 'assistant', content: 'Earnings before…' }
    ]
    const ctx = makeCtx({ messages: earlier.concat(makeCtx().messages) })

    retryLastMessage.call(ctx)

    expect(ctx.messages).toEqual(earlier)
  })

  it('does nothing while a reply is still streaming', () => {
    const ctx = makeCtx({ isStreaming: true })
    retryLastMessage.call(ctx)

    expect(ctx.messages).toHaveLength(2)
    expect(ctx.sent).toBe(0)
  })

  it('does nothing when there is no question to retry', () => {
    const ctx = makeCtx({ lastQuery: null })
    retryLastMessage.call(ctx)

    expect(ctx.messages).toHaveLength(2)
    expect(ctx.sent).toBe(0)
  })

  it('never eats a real answer when the thread is not the shape it expects', () => {
    // The guard that matters: removal is decided by what each message IS, not by
    // counting back two. A successful reply sitting last must survive untouched.
    const ctx = makeCtx({
      messages: [
        { role: 'user', content: 'how do I improve margin?' },
        { role: 'assistant', content: 'Here is a real answer worth keeping.' }
      ]
    })

    retryLastMessage.call(ctx)

    expect(ctx.messages).toEqual([
      { role: 'user', content: 'how do I improve margin?' },
      { role: 'assistant', content: 'Here is a real answer worth keeping.' }
    ])
    expect(ctx.sent).toBe(1)
  })

  it('does not remove a user turn that is not the question being retried', () => {
    const ctx = makeCtx({
      lastQuery: 'how do I improve margin?',
      messages: [
        { role: 'user', content: 'a different question' },
        { role: 'assistant', content: ERROR_TEXT }
      ]
    })

    retryLastMessage.call(ctx)

    expect(ctx.messages).toEqual([{ role: 'user', content: 'a different question' }])
  })
})
