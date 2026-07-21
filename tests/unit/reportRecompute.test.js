import reportRecompute from '../../mixins/reportRecompute'

// The mixin is a plain object; call its methods against a hand-built `this`.
const recompute = reportRecompute.methods.recompute

function makeCtx (over = {}) {
  return {
    ...reportRecompute.methods, // recompute + queueRecompute + _flagRecomputeError
    _reqSeq: 0,
    error: false,
    result: null,
    applyResult (data) { this.result = data },
    recomputeRequest: () => ({ url: '/api/report/x', body: { a: 1 } }),
    ...over
  }
}

const jsonResponse = payload => Promise.resolve({ json: () => Promise.resolve(payload) })

afterEach(() => { delete global.fetch })

describe('reportRecompute.recompute', () => {
  test('applies a successful result and clears the stale flag', async () => {
    global.fetch = jest.fn(() => jsonResponse({ success: true, data: { ev: 42 } }))
    const ctx = makeCtx({ error: true })
    await recompute.call(ctx)
    expect(ctx.result).toEqual({ ev: 42 })
    expect(ctx.error).toBe(false)
  })

  test('a { success: false } response sets the stale flag and does not apply', async () => {
    global.fetch = jest.fn(() => jsonResponse({ success: false }))
    const ctx = makeCtx()
    await recompute.call(ctx)
    expect(ctx.result).toBeNull()
    expect(ctx.error).toBe(true)
  })

  test('a network error sets the stale flag', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const ctx = makeCtx()
    await recompute.call(ctx)
    expect(ctx.error).toBe(true)
  })

  test('skips the request when recomputeRequest() is falsy — no fetch', async () => {
    global.fetch = jest.fn()
    const ctx = makeCtx({ recomputeRequest: () => null })
    await recompute.call(ctx)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('calls onRecomputeError() (if defined) on failure — for toast-style reports', async () => {
    global.fetch = jest.fn(() => jsonResponse({ success: false }))
    const onRecomputeError = jest.fn()
    const ctx = makeCtx({ onRecomputeError })
    await recompute.call(ctx)
    expect(ctx.error).toBe(true)
    expect(onRecomputeError).toHaveBeenCalledTimes(1)
  })

  test('RACE: a slow OLDER response never overwrites a newer one', async () => {
    let resolveA, resolveB
    const respA = new Promise((resolve) => { resolveA = resolve })
    const respB = new Promise((resolve) => { resolveB = resolve })
    global.fetch = jest.fn().mockReturnValueOnce(respA).mockReturnValueOnce(respB)

    const ctx = makeCtx()
    const pA = recompute.call(ctx) // seq 1 (older)
    const pB = recompute.call(ctx) // seq 2 (newer)

    // Newer request resolves FIRST with the correct figures.
    resolveB({ json: () => Promise.resolve({ success: true, data: { v: 'NEW' } }) })
    await pB
    expect(ctx.result).toEqual({ v: 'NEW' })

    // Older request resolves LATER — must be discarded, not applied.
    resolveA({ json: () => Promise.resolve({ success: true, data: { v: 'OLD' } }) })
    await pA
    expect(ctx.result).toEqual({ v: 'NEW' }) // unchanged — stale response ignored
    expect(ctx.error).toBe(false)
  })
})
