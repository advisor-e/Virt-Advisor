/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The blog screen — item 17 stage 5, repainted from the source app's 843-line
 * `pages/index.vue`.
 *
 * WHAT IS WORTH ASSERTING HERE, AND WHAT IS NOT.
 *
 * Mike's rule of 2026-08-24: a test earns its place when it catches what UAT
 * cannot. The labels, the colours and the layout are judged better by a person
 * in five seconds, so none of that is pinned. What a tester CANNOT see:
 *
 *   1. 🔴 That model output is SANITISED before it reaches `v-html`. The source
 *      app renders it with `marked()` and sanitises nothing. A model that
 *      emitted a `<script>` or an off-site `<img>` would have it run or fetched,
 *      and the screen would look completely normal either way.
 *   2. 🔴 That a TEMPLATE result is labelled as one. It is a thinner article, not
 *      a broken one — unlabelled, an advisor would publish it believing the AI
 *      wrote it.
 *   3. That restoring a saved brief CLONES its principles. Sharing the array
 *      would make editing the form silently rewrite the saved row beside it, and
 *      nothing on screen would say so until a reload.
 *   4. That every destructive button is disabled while a call is in flight. The
 *      source app's `busy` flag did not cover its deletes.
 *   5. That a failed call leaves the advisor's text alone. Losing an article to
 *      a network blip is invisible right up until it happens.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const SalesBlog = require('../../components/sales/SalesBlog.vue').default

/** The component's source, exactly as written. */
function componentSource () {
  return require('fs').readFileSync(
    require.resolve('../../components/sales/SalesBlog.vue'), 'utf8'
  )
}

/**
 * The component's CODE, with every comment removed — this file and the component
 * both NAME the patterns they forbid in order to explain them, so an assertion
 * about code must read the code and not the prose around it.
 */
function componentCode () {
  return componentSource()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !/^\s*(\/\/|\/\/-)/.test(l))
    .join('\n')
}

/** A saved post. */
function post (over) {
  return Object.assign({
    id: 'p1',
    kind: 'draft',
    title: 'Draft: Cash flow',
    topic: 'Cash flow',
    outlineText: '# Outline',
    finalText: '',
    isPinned: false,
    updatedAt: '2026-09-22T10:00:00.000Z'
  }, over || {})
}

/**
 * Mount with every startup call answered, so `mounted()` is deterministic.
 * `answers` maps a URL fragment to the body that call should return.
 */
async function mountWith (answers) {
  const map = answers || {}
  global.fetch = jest.fn((url) => {
    const key = Object.keys(map).find(k => String(url).includes(k))
    const body = key
      ? map[key]
      : { success: true, items: [], lists: {} }
    if (body instanceof Error) { return Promise.reject(body) }
    return Promise.resolve({
      ok: body.success !== false,
      json: () => Promise.resolve(body)
    })
  })
  const w = mountWithBuefy(SalesBlog)
  await w.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await w.vm.$nextTick()
  return w
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('🔴 model output is sanitised before it is rendered', () => {
  test('a script tag in the model text never reaches the HTML', async () => {
    const w = await mountWith()
    w.vm.draftText = 'Fine text\n\n<script>window.stolen = 1</script>'
    await w.vm.$nextTick()

    expect(w.vm.draftHtml).not.toContain('<script')
    expect(w.vm.draftHtml).toContain('Fine text')
  })

  test('🔴 an image is stripped — it is an outbound-request channel', async () => {
    // The same call the locked VirtualAdvisor pipeline makes: a model that emits
    // an <img> pointing off-site turns a rendered article into a beacon.
    const w = await mountWith()
    w.vm.draftText = '![x](https://evil.example/track.png)'
    await w.vm.$nextTick()

    expect(w.vm.draftHtml).not.toContain('<img')
  })

  test('raw HTML in the model text is not rendered as HTML', async () => {
    const w = await mountWith()
    w.vm.finalText = '<iframe src="https://evil.example"></iframe>'
    await w.vm.$nextTick()

    expect(w.vm.finalHtml).not.toContain('<iframe')
  })

  test('ordinary markdown still renders', async () => {
    const w = await mountWith()
    w.vm.draftText = '# Heading\n\nA **bold** point.\n\n- one\n- two'
    await w.vm.$nextTick()

    expect(w.vm.draftHtml).toContain('<h1>')
    expect(w.vm.draftHtml).toContain('<strong>')
    expect(w.vm.draftHtml).toContain('<li>')
  })

  test('empty and missing text render as empty, not "undefined"', async () => {
    const w = await mountWith()
    expect(w.vm.renderMarkdown('')).toBe('')
    expect(w.vm.renderMarkdown(null)).toBe('')
    expect(w.vm.renderMarkdown(undefined)).toBe('')
  })

  test('🔴 the screen does not use `marked`, and every v-html is the sanitiser', () => {
    // `marked` is what the source app used, with no sanitising at all, and it is
    // not a dependency here.
    const code = componentCode()
    expect(code).not.toMatch(/from ['"]marked['"]/)
    expect(code).toContain('DOMPurify.sanitize')
    // Both v-html bindings read a computed that goes through renderMarkdown.
    const vHtml = code.match(/v-html="([^"]+)"/g) || []
    expect(vHtml).toHaveLength(2)
    for (const binding of vHtml) {
      expect(binding).toMatch(/draftHtml|finalHtml/)
    }
  })
})

describe('🔴 the advisor is told when the AI did not write it', () => {
  test('a template result sets the source, and the banner says so', async () => {
    const w = await mountWith({
      'generate/draft': { success: true, text: '# Built from your brief', source: 'template', error: 'no key' }
    })
    w.vm.form.topic = 'Cash flow'
    await w.vm.generateDraft()
    await w.vm.$nextTick()

    expect(w.vm.aiSource).toBe('template')
    expect(w.find('.sb-source').classes()).toContain('is-template')
  })

  test('an AI result is marked as AI', async () => {
    const w = await mountWith({
      'generate/draft': { success: true, text: '# Real', source: 'ai' }
    })
    w.vm.form.topic = 'Cash flow'
    await w.vm.generateDraft()
    await w.vm.$nextTick()

    expect(w.vm.aiSource).toBe('ai')
    expect(w.find('.sb-source').classes()).toContain('is-ai')
  })

  test('🔴 a template reply is NOT treated as a failure — the text is kept', async () => {
    // The backend answers 200 with a usable outline when the model is down.
    // Discarding it would throw away exactly what the fallback exists to give.
    const w = await mountWith({
      'generate/draft': { success: true, text: '# Usable outline', source: 'template', error: 'timeout' }
    })
    w.vm.form.topic = 'Cash flow'
    await w.vm.generateDraft()

    expect(w.vm.draftText).toBe('# Usable outline')
    expect(w.vm.errorText).toBe('')
  })

  test('nothing is shown before anything has been generated', async () => {
    const w = await mountWith()
    expect(w.vm.aiSource).toBe('')
    expect(w.find('.sb-source').exists()).toBe(false)
  })
})

describe('🔴 restoring a saved brief does not alias the saved row', () => {
  test('editing the form after a restore leaves the saved brief untouched', async () => {
    const saved = {
      id: 'b1',
      topic: 'Cash flow',
      principles: [{ title: 'Original', details: ['Original detail'] }]
    }
    const w = await mountWith({ 'blog/inputs': { success: true, items: [saved] } })

    w.vm.restoreBrief(saved)
    w.vm.principles[0].title = 'Edited in the form'
    w.vm.principles[0].details[0] = 'Edited detail'

    expect(saved.principles[0].title).toBe('Original')
    expect(saved.principles[0].details[0]).toBe('Original detail')
  })

  test('a brief with no principles leaves the current ones alone', async () => {
    const w = await mountWith()
    const before = w.vm.principles.length
    w.vm.restoreBrief({ topic: 'T' })

    expect(w.vm.principles).toHaveLength(before)
  })

  test('a malformed principle does not crash the restore', async () => {
    const w = await mountWith()
    w.vm.restoreBrief({ topic: 'T', principles: [{ title: null, details: 'not a list' }] })

    expect(w.vm.principles[0].title).toBe('')
    expect(Array.isArray(w.vm.principles[0].details)).toBe(true)
  })
})

describe('🔴 a failed call never destroys what the advisor has written', () => {
  test('a failed generation leaves the existing text in place', async () => {
    const w = await mountWith({
      'generate/draft': { success: false, error: { message: 'nope' } }
    })
    w.vm.draftText = 'Work in progress the advisor typed'
    w.vm.form.topic = 'Cash flow'
    await w.vm.generateDraft()

    expect(w.vm.draftText).toBe('Work in progress the advisor typed')
    expect(w.vm.errorText).toBeTruthy()
  })

  test('a network failure says so rather than emptying the screen', async () => {
    const w = await mountWith({ 'generate/final': new Error('offline') })
    w.vm.draftText = '# Outline'
    w.vm.finalText = 'An article in progress'
    await w.vm.generateFinal()

    expect(w.vm.finalText).toBe('An article in progress')
    expect(w.vm.errorText).toBeTruthy()
  })

  test('a failed load leaves empty lists and a message, not a blank screen', async () => {
    const w = await mountWith({ 'blog/inputs': { success: false, error: { message: 'down' } } })

    expect(w.vm.inputs).toEqual([])
    expect(w.vm.errorText).toBeTruthy()
  })

  test('a failed delete does not remove the row from the screen', async () => {
    const w = await mountWith({
      'blog/inputs': { success: true, items: [{ id: 'b1', topic: 'Keep me' }] }
    })
    expect(w.vm.inputs).toHaveLength(1)

    global.fetch = jest.fn(() => Promise.resolve({
      ok: false, json: () => Promise.resolve({ success: false, error: { message: 'no' } })
    }))
    await w.vm.deleteInput({ id: 'b1' })

    expect(w.vm.inputs).toHaveLength(1)
  })
})

describe('🔴 nothing is clickable twice while a call is in flight', () => {
  test('every action button is bound to `busy`', () => {
    // The source app's busy flag did not cover its deletes, so a double-click
    // fired two of them.
    const code = componentCode()
    const buttons = code.match(/b-button\([^)]*\)/gs) || []
    const actionable = buttons.filter(b => /@click="(save|delete|generate|restore|toggle|copy)/.test(b))

    expect(actionable.length).toBeGreaterThan(5)
    for (const b of actionable) {
      expect(b).toMatch(/:disabled="[^"]*busy|:loading="generating/)
    }
  })

  test('busy is cleared after a failure, or the screen would stay locked', async () => {
    const w = await mountWith({ 'generate/draft': new Error('offline') })
    w.vm.form.topic = 'Cash flow'
    await w.vm.generateDraft()

    expect(w.vm.busy).toBe(false)
    expect(w.vm.generating).toBe('')
  })
})

describe('what the screen computes', () => {
  test('the word counts count words, not characters', async () => {
    const w = await mountWith()
    w.vm.draftText = 'one two three'
    w.vm.finalText = ''

    expect(w.vm.draftWordCount).toBe(3)
    expect(w.vm.finalWordCount).toBe(0)
  })

  test('🔴 "shorter than target" compares against the number the advisor asked for', async () => {
    const w = await mountWith()
    w.vm.form.wordCount = '400-600'
    w.vm.finalText = new Array(100).fill('word').join(' ')
    expect(w.vm.isShort).toBe(true)

    w.vm.finalText = new Array(450).fill('word').join(' ')
    expect(w.vm.isShort).toBe(false)
  })

  test('no target, or no article, says nothing rather than "short"', async () => {
    const w = await mountWith()
    w.vm.form.wordCount = ''
    w.vm.finalText = 'a few words'
    expect(w.vm.isShort).toBe(false)

    w.vm.form.wordCount = '400-600'
    w.vm.finalText = ''
    expect(w.vm.isShort).toBe(false)
  })

  test('a target with no digits is not treated as a target', async () => {
    const w = await mountWith()
    w.vm.form.wordCount = 'as long as it needs'
    w.vm.finalText = 'three words here'
    expect(w.vm.isShort).toBe(false)
  })

  test('the saved-list filters match title, topic and the named person', async () => {
    const w = await mountWith()
    // Each row is distinctive in ONE field, so a match proves which field was
    // searched rather than which fixture happened to share a default.
    w.vm.draftPosts = [
      post({ id: '1', title: 'Cash flow piece', topic: 'Liquidity' }),
      post({ id: '2', title: 'Other', topic: 'Tax year' }),
      post({ id: '3', title: 'Third', topic: 'Pricing', selectedPerson: 'Jane Doe' })
    ]

    w.vm.draftSearch = 'cash'
    expect(w.vm.filteredDrafts).toHaveLength(1)
    w.vm.draftSearch = 'TAX'
    expect(w.vm.filteredDrafts).toHaveLength(1)
    w.vm.draftSearch = 'jane'
    expect(w.vm.filteredDrafts).toHaveLength(1)
    w.vm.draftSearch = ''
    expect(w.vm.filteredDrafts).toHaveLength(3)
  })

  test('the pinned filter keeps only pinned posts', async () => {
    const w = await mountWith()
    w.vm.finalPosts = [post({ id: '1' }), post({ id: '2', isPinned: true })]
    w.vm.finalPinnedOnly = true

    expect(w.vm.filteredFinals).toHaveLength(1)
    expect(w.vm.filteredFinals[0].id).toBe('2')
  })

  test('the author list follows the author TYPE', async () => {
    const w = await mountWith({
      'sales/lists': { success: true, lists: { partner: ['A Partner'], leadStaff: ['A Lead'] } }
    })

    w.vm.form.authorType = 'Partner'
    expect(w.vm.authorOptions).toEqual(['A Partner'])
    w.vm.form.authorType = 'Lead Staff'
    expect(w.vm.authorOptions).toEqual(['A Lead'])
  })

  test('a missing list is an empty dropdown, not a crash', async () => {
    const w = await mountWith({ 'sales/lists': { success: true, lists: {} } })
    expect(w.vm.authorOptions).toEqual([])
  })

  test('🔴 changing the author type clears the chosen name', async () => {
    // A partner's name is not a lead staff name. Carrying it over would send the
    // model an author who does not hold that role.
    const w = await mountWith({
      'sales/lists': { success: true, lists: { partner: ['A Partner'], leadStaff: ['A Lead'] } }
    })
    w.vm.form.author = 'A Lead'
    w.vm.form.authorType = 'Partner'
    await w.vm.$nextTick()

    expect(w.vm.form.author).toBe('')
  })

  test('a stored timestamp renders as a date, and a bad one does not crash', async () => {
    const w = await mountWith()
    expect(w.vm.whenText('2026-09-22T10:00:00.000Z')).toMatch(/2026/)
    expect(w.vm.whenText('')).toBe('')
    expect(w.vm.whenText('not a date')).toBe('not a date')
  })
})

describe('what is sent to the backend', () => {
  test('🔴 only the TICKED source material is sent to the model', async () => {
    const w = await mountWith({
      'blog/references': {
        success: true,
        items: [
          { id: 'r1', title: 'Used', type: 'document', content: 'The used text' },
          { id: 'r2', title: 'Ignored', type: 'document', content: 'The ignored text' }
        ]
      }
    })
    w.vm.selectedReferenceIds = ['r1']

    const text = w.vm.selectedReferencesText()
    expect(text).toContain('The used text')
    expect(text).not.toContain('The ignored text')
  })

  test('a URL reference sends its address, a document sends its text', async () => {
    const w = await mountWith()
    w.vm.references = [
      { id: 'r1', title: 'A link', type: 'url', url: 'https://example.com' },
      { id: 'r2', title: 'A doc', type: 'document', content: 'Body text' }
    ]
    w.vm.selectedReferenceIds = ['r1', 'r2']

    const text = w.vm.selectedReferencesText()
    expect(text).toContain('https://example.com')
    expect(text).toContain('Body text')
  })

  test('the brief signature is stable for the same brief and changes with it', async () => {
    const w = await mountWith()
    w.vm.form.topic = 'Cash flow'
    const first = w.vm.signature()
    expect(w.vm.signature()).toBe(first)

    w.vm.form.tone = 'Friendly'
    expect(w.vm.signature()).not.toBe(first)
  })

  test('the signature stays within the column width', async () => {
    const w = await mountWith()
    w.vm.form.topic = 'x'.repeat(500)
    expect(w.vm.signature().length).toBeLessThanOrEqual(191)
  })

  test('🔴 generating a draft also saves the brief that produced it', async () => {
    // Otherwise an advisor who closes the tab loses the inputs behind the text
    // in front of them.
    const w = await mountWith({
      'generate/draft': { success: true, text: '# Out', source: 'ai' }
    })
    w.vm.form.topic = 'Cash flow'
    await w.vm.generateDraft()

    const posted = global.fetch.mock.calls
      .filter(c => c[1] && c[1].method === 'POST')
      .map(c => String(c[0]))
    expect(posted).toContain('/api/sales/blog/inputs')
  })

  test('a generation with no topic asks for one instead of calling the model', async () => {
    const w = await mountWith()
    w.vm.form.topic = '   '
    global.fetch.mockClear()
    await w.vm.generateDraft()

    expect(w.vm.errorText).toBeTruthy()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('an article cannot be requested before there is an outline', async () => {
    const w = await mountWith()
    w.vm.draftText = ''
    global.fetch.mockClear()
    await w.vm.generateFinal()

    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('an empty editor is not saved as a post', async () => {
    const w = await mountWith()
    w.vm.draftText = '   '
    global.fetch.mockClear()
    await w.vm.savePost('draft')

    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('copying an article to the outline clears the article', async () => {
    const w = await mountWith()
    w.vm.finalText = 'The old article'
    w.vm.copyToDraft(post({ finalText: 'The published piece', topic: 'Cash flow' }))

    expect(w.vm.draftText).toBe('The published piece')
    expect(w.vm.finalText).toBe('')
  })

  test('🔴 the screen sends no advisor or firm id — the token decides', () => {
    // Identity is the backend's from the verified JWT. A screen that sent one
    // would imply it could choose.
    const code = componentCode()
    expect(code).not.toMatch(/advisorId:/)
    expect(code).not.toMatch(/firmId:/)
  })

  test('every call goes to an /api/sales/blog address or the shared lists', () => {
    const code = componentCode()
    const urls = (code.match(/'\/api\/[^']+'/g) || []).map(u => u.replace(/'/g, ''))

    expect(urls.length).toBeGreaterThan(5)
    for (const u of urls) {
      expect(u).toMatch(/^\/api\/sales\/(blog|lists)/)
    }
  })
})
