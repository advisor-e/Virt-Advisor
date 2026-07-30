/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for components/shared/ConsoleNode.vue — the recursive console
 * roll-up row. The scale-critical behaviour (PERF-CONSOLE-TREE): a branch's advisers
 * are NOT inlined in the tree; they load on demand the first time the branch opens.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import ConsoleNode from '../../components/collaborate/shared/ConsoleNode.vue'

const localVue = createLocalVue()
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

// A leaf branch node: counts only, no `people` inlined.
const LEAF = { level: 'firm', value: 'Advisor-e Munich', label: 'Advisor-e Munich', advisers: 2, childLevel: 'advisor', childCount: 2 }
const PEOPLE = [
  { id: 'me', name: 'Mike Barnes', title: 'Partner', available: true, isMe: true },
  { id: 'priya-nair', name: 'Priya Nair', title: 'Adviser', available: false }
]

function factory (propsData, fetchImpl) {
  global.fetch = jest.fn(fetchImpl || (() => Promise.resolve({ ok: true, json: () => Promise.resolve({ advisers: PEOPLE, total: 2 }) })))
  return mount(ConsoleNode, { localVue, propsData, mocks: { $t: k => k } })
}

describe('console node (lazy branch load)', () => {
  afterEach(() => { delete global.fetch })

  test('a leaf branch lazy-loads its advisers on first open (real endpoint)', async () => {
    const w = factory({ node: LEAF })
    expect(w.vm.expandable).toBe(true)
    w.vm.toggle()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/console/advisers?firm=Advisor-e%20Munich')
    expect(w.vm.people).toHaveLength(2)
    expect(w.vm.loaded).toBe(true)
    expect(w.text()).toContain('Priya Nair')
  })

  test('preview mode targets the dev preview endpoint for the tier', async () => {
    const w = factory({ node: LEAF, preview: true, previewTier: 'group' })
    w.vm.toggle()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/console/preview/group/advisers?firm=Advisor-e%20Munich')
  })

  test('advisers are fetched once — reopening does not refetch', async () => {
    const w = factory({ node: LEAF })
    w.vm.toggle(); await flush() // open + load
    w.vm.toggle() // close
    w.vm.toggle(); await flush() // reopen
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  test('a failed load surfaces the error note', async () => {
    const w = factory({ node: LEAF }, () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    w.vm.toggle()
    await flush()
    expect(w.vm.loadError).toBe(true)
  })

  test('a grouping node expands to its children without fetching advisers', async () => {
    const GROUP = { level: 'country', value: 'DE', label: 'DE', advisers: 5, childLevel: 'firm', childCount: 1, children: [LEAF] }
    const w = factory({ node: GROUP })
    expect(w.vm.expandable).toBe(true)
    w.vm.toggle()
    await flush()
    expect(global.fetch).not.toHaveBeenCalled() // children are already in the tree
  })

  test('an empty branch (0 advisers) is not expandable', () => {
    const w = factory({ node: { level: 'firm', value: 'Empty Branch', advisers: 0, childLevel: 'advisor', childCount: 0 } })
    expect(w.vm.expandable).toBe(false)
  })
})
