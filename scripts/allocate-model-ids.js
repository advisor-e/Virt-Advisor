'use strict'

/**
 * @file Give every calculation model a permanent identifier of its own.
 * @module scripts/allocate-model-ids
 *
 * Asked for by Mike, 2026-09-23: *"allocate each model an ID and make sure any new model
 * added gets an ID allocated automatically"*.
 *
 * 🔴 THE FAULT THIS CLOSES. Every row of the master template library carries an id
 * (`link: "id-9678770136"`), and `server/utils/outlineResources.js` builds a template's
 * real page address from it — the AI names a template and the APP resolves the address.
 * The nineteen calculation models were never in that scheme: fourteen of them exist
 * nowhere but inside this app, so no library row ever gave them one. Having no identity
 * to resolve, the only way left to get a model's address in front of an advisor was to
 * write it into the prompt as prose and ask the AI to copy it across
 * (`data/prompts/discover.txt`, "Use the model's EXACT page path from that list"). It is
 * one line inside a 51,450-character block and it is dropped about half the time — the
 * advisor is told about a model and given nothing to click. An id is what the app needs
 * to own that address itself.
 *
 * 🔴 AN ID IS ALLOCATED ONCE AND NEVER CHANGES. This script only ever FILLS a gap. It
 * cannot rewrite, renumber or reorder an id that is already in the file, because the
 * whole value of an identifier is that it outlives the name and the route above it.
 * `tests/unit/reportModelIds.test.js` pins that, and pins the shipped file as already
 * fully allocated — so a model added without one fails the suite with the command to run.
 *
 * ⚠ THE PREFIX IS `model-`, NOT `id-`, AND THAT IS DELIBERATE. The master library owns
 * the `id-` namespace and a future export may allocate any number in it; a model of ours
 * carrying `id-…` could one day collide with a real template row. Worse, it would be
 * indistinguishable from one — and a model being mistaken for a same-named template is
 * the exact confusion this work exists to end (Sales Dashboard, Quick Position, Lease vs
 * Buy, High-Level Budget and Working Capital Cycle are all in both lists).
 *
 * Usage:
 *   node scripts/allocate-model-ids.js           allocate any missing ids, write the file
 *   node scripts/allocate-model-ids.js --check   exit 1 if any model has no id, write nothing
 *
 * Node 14, CommonJS.
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')

/** The one file that holds a model's identity. */
const DATA_PATH = 'data/report-model-summaries.json'

/** What an allocated id looks like. Ten digits, so the band below can never under-run. */
const ID_RE = /^model-\d{10}$/

/** The ten-digit band ids are drawn from. */
const ID_FLOOR = 1000000000
const ID_CEILING = 9999999999

/**
 * FNV-1a, 32-bit, unsigned.
 *
 * Used so a first allocation is reproducible and reviewable rather than random — run the
 * script twice on the same empty file and the same ids come out, which is what makes the
 * guard test below able to assert the shipped file is already correct. It is a spreading
 * function, never a security one.
 *
 * @param {string} text
 * @returns {number} an unsigned 32-bit integer
 */
function fnv1a (text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    // The 32-bit FNV prime, by shifts, because Math.imul on the prime overflows a double.
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

/**
 * The id a model would be given, before any collision is resolved.
 *
 * Derived from the model's NAME rather than its route: a route is a page address and may
 * be re-pointed, whereas this only ever seeds the first allocation of a value that is
 * then frozen in the file for good.
 *
 * @param {string} name
 * @returns {string}
 */
function seedIdFor (name) {
  return 'model-' + String(ID_FLOOR + fnv1a(String(name || '')))
}

/**
 * Fill in the ids that are missing, leaving every existing one exactly as it stands.
 *
 * Pure — it returns a new object and touches nothing on disk, so the guard test can run
 * it against the shipped data and assert that it finds nothing left to do.
 *
 * @param {{models: object[]}} data - the parsed summaries file
 * @returns {{data: object, allocated: Array<{name: string, id: string}>}}
 */
function allocateIds (data) {
  const models = (data && data.models) || []

  // Every id already spoken for, so a new one can never land on top of it.
  const taken = new Set()
  models.forEach((m) => {
    if (m && typeof m.id === 'string' && m.id) { taken.add(m.id) }
  })

  const allocated = []
  const next = models.map((m) => {
    if (!m || (typeof m.id === 'string' && m.id)) { return m }

    // Probe forward from the seed until the band yields an id nobody holds. Nineteen
    // models against a nine-billion-wide band, so this settles on the first try in
    // practice; the loop is here because "in practice" is not a guarantee.
    let candidate = seedIdFor(m.name)
    while (taken.has(candidate)) {
      const n = Number(candidate.slice('model-'.length))
      const rolled = n >= ID_CEILING ? ID_FLOOR : n + 1
      candidate = 'model-' + String(rolled)
    }
    taken.add(candidate)
    allocated.push({ name: m.name, id: candidate })

    // `id` first, so a reader meets the model's identity before its page address.
    return Object.assign({ id: candidate }, m)
  })

  return { data: Object.assign({}, data, { models: next }), allocated }
}

/**
 * Models in the file that carry no usable id.
 *
 * @param {{models: object[]}} data
 * @returns {string[]} their names
 */
function missingIds (data) {
  return ((data && data.models) || [])
    .filter(m => !m || typeof m.id !== 'string' || !ID_RE.test(m.id))
    .map(m => (m && m.name) || '(unnamed)')
}

/**
 * Read the summaries file, keeping what is needed to write it back unchanged.
 *
 * ⚠ THE FILE IS CRLF AND ENDS IN A NEWLINE. Serialising it any other way rewrites all
 * 1,086 lines and buries a nineteen-line change in a whole-file diff.
 *
 * @returns {{data: object, write: function(object): void}}
 */
function openDataFile () {
  const full = resolve(process.cwd(), DATA_PATH)
  const raw = readFileSync(full, 'utf8')
  const crlf = raw.indexOf('\r\n') !== -1
  return {
    data: JSON.parse(raw),
    write (next) {
      let out = JSON.stringify(next, null, 2)
      if (crlf) { out = out.replace(/\n/g, '\r\n') }
      writeFileSync(full, out + (crlf ? '\r\n' : '\n'), 'utf8')
    }
  }
}

/* istanbul ignore next — the CLI shell; allocateIds and missingIds carry the logic. */
function main () {
  const check = process.argv.indexOf('--check') !== -1
  const file = openDataFile()

  if (check) {
    const missing = missingIds(file.data)
    if (missing.length) {
      console.error('✘ ' + missing.length + ' calculation model(s) have no id:')
      missing.forEach(n => console.error('    ' + n))
      console.error('\n  Run `npm run models:ids` to allocate one to each.')
      process.exit(1)
    }
    console.log('✔ every calculation model carries an id.')
    return
  }

  const { data, allocated } = allocateIds(file.data)
  if (!allocated.length) {
    console.log('✔ nothing to do — every calculation model already carries an id.')
    return
  }
  file.write(data)
  console.log('✔ allocated ' + allocated.length + ' model id(s):')
  allocated.forEach(a => console.log('    ' + a.id + '  ' + a.name))
}

if (require.main === module) { main() }

module.exports = { allocateIds, missingIds, seedIdFor, ID_RE, DATA_PATH }
