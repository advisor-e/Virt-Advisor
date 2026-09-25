'use strict'

// Item 22.1. The case that blocked pushes: another process holds the file open while a test
// clears it, and the next test recreates it. Plain unlinkSync fails that on Windows with
// EPERM; removeFile must not. The holder is a real second process, because a handle in this
// one does not reproduce it.

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { removeFile } = require('../helpers/removeFile')

const FILE = path.join(os.tmpdir(), `va-test-remove-file-${process.pid}.json`)

/** Start a process that opens `file` and holds it until killed; resolves once it holds. */
function holdOpen (file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e',
      `require('fs').openSync(${JSON.stringify(file)}, 'r'); console.log('held'); setInterval(() => {}, 1000)`])
    child.once('error', reject)
    child.stdout.once('data', () => resolve(child))
  })
}

afterEach(() => { try { removeFile(FILE) } catch (_e) { /* best effort */ } })

test('clears a file another process holds open, and the path can be written straight away', async () => {
  fs.writeFileSync(FILE, '{"a":1}')
  const holder = await holdOpen(FILE)
  try {
    removeFile(FILE)
    expect(fs.existsSync(FILE)).toBe(false)
    fs.writeFileSync(FILE, '{"b":2}')
    expect(fs.readFileSync(FILE, 'utf8')).toBe('{"b":2}')
  } finally {
    // Wait for the exit: until the handle closes, the aside copy is still listed.
    const gone = new Promise(resolve => holder.once('exit', resolve))
    holder.kill()
    await gone
  }
})

test('an absent file is not an error', () => {
  expect(() => removeFile(path.join(os.tmpdir(), `va-never-written-${process.pid}.json`))).not.toThrow()
})

test('leaves no aside copy behind when nothing holds the file', () => {
  const own = path.join(os.tmpdir(), `va-test-remove-free-${process.pid}.json`)
  fs.writeFileSync(own, '{}')
  removeFile(own)
  const strays = fs.readdirSync(os.tmpdir()).filter(n => n.startsWith(path.basename(own)) && n.endsWith('.del'))
  expect(strays).toEqual([])
})
