'use strict'

/**
 * Guards design/ARTEFACTS.md — the register of everything Mike has approved.
 *
 * WHY. On 2026-08-13 the Handbook was rebuilt from a written description of
 * itself because a note said the original had been deleted. It had not; it was
 * in a temporary folder on this machine. Every existing check passed, because
 * THE ARTEFACT HAD NO FOOTPRINT IN THE REPOSITORY — nothing referenced it, so
 * nothing could notice it was missing, and "I cannot find it" became permission
 * to design a replacement.
 *
 * The register closes that hole, and these tests are what make the register
 * binding rather than decorative:
 *
 *   - a listed artefact that is missing fails the build
 *   - an artefact added to design/mockups/ without a row fails the build
 *   - a path that leaves the repository fails the build
 *   - a mockup referenced by any design document but absent fails the build
 *
 * The last one is the Logic-Lab failure of 2026-08-01/02: a mockup approved in
 * chat, never saved, and paraphrased a day later.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const DESIGN_DIR = path.join(ROOT, 'design')
const MOCKUPS_DIR = path.join(DESIGN_DIR, 'mockups')
const REGISTER_PATH = path.join(DESIGN_DIR, 'ARTEFACTS.md')

/**
 * Documents that are FROZEN HISTORY rather than live design.
 *
 * 🔴 WHY THEY ARE SKIPPED, and it is not to make a test pass. This check exists so a LIVE
 * design document can never point at a mockup that does not exist — "an approved mockup is
 * never a paraphrase". A frozen archive is a different thing: it records what was true on
 * the day it was written, and a link in it is a historical fact, not a claim that a file is
 * on disk today. Holding history to a live document's standard would mean either restoring
 * artefacts for deleted features or editing a file that is explicitly closed to edits.
 *
 * `ACTIONS.md` was frozen 2026-08-24 (see its own header, and CLAUDE.md). The
 * `SESSION-*.md` notes stopped being written the same day; 85 remain as history.
 *
 */
function isFrozenHistory (name) {
  return name === 'ACTIONS.md' || name === 'ACTIONS-ARCHIVE.md' || name.startsWith('SESSION-')
}

/** Every markdown file under design/, recursively, that is not frozen history. */
function designDocs (dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((all, entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return all.concat(designDocs(full))
    }
    if (!entry.name.endsWith('.md') || isFrozenHistory(entry.name)) { return all }
    return all.concat([full])
  }, [])
}

describe('the artefact register', () => {
  let register

  beforeAll(() => {
    register = fs.readFileSync(REGISTER_PATH, 'utf8')
  })

  /** Markdown links in the register, as written. */
  function linkedPaths () {
    const links = register.match(/\]\(`?([^`)]+)`?\)/g) || []
    return links
      .map(link => link.replace(/^\]\(`?/, '').replace(/`?\)$/, ''))
      .filter(target => !target.startsWith('http') && !target.startsWith('#'))
  }

  it('exists, because a register nobody wrote is the state we started from', () => {
    expect(fs.existsSync(REGISTER_PATH)).toBe(true)
  })

  it('points at nothing outside the repository', () => {
    // A drive letter, a UNC path or a temp folder means the artefact is not
    // versioned — which is precisely how the Handbook's design went missing.
    linkedPaths().forEach((target) => {
      expect(target).not.toMatch(/^[a-z]:/i)
      expect(target).not.toMatch(/^\\\\/)
      expect(target).not.toMatch(/scratchpad|Local[/\\]Temp|AppData/i)
    })
  })

  it('lists only files that exist', () => {
    const missing = linkedPaths().filter((target) => {
      const resolved = path.resolve(DESIGN_DIR, target)
      return !fs.existsSync(resolved)
    })

    expect(missing).toEqual([])
  })

  it('lists every artefact in design/mockups/', () => {
    // Add a mockup and this fails until it has a row. That is the ratchet: the
    // register cannot silently fall behind the folder.
    const unregistered = fs.readdirSync(MOCKUPS_DIR)
      .filter(name => name.endsWith('.html'))
      .filter(name => !register.includes(name))

    expect(unregistered).toEqual([])
  })

  it('names the Handbook shell, which is an approved design and not a mockup', () => {
    expect(register).toContain('scripts/handbook-shell.html')
  })
})

describe('artefacts referenced by design documents', () => {
  it('all exist — an approved mockup is never a paraphrase', () => {
    const referenced = new Set()

    designDocs(DESIGN_DIR).forEach((file) => {
      const text = fs.readFileSync(file, 'utf8')
      const hits = text.match(/mockups\/[A-Za-z0-9._-]+\.html/g) || []
      hits.forEach(hit => referenced.add(hit.replace(/^.*mockups\//, '')))
    })

    const missing = Array.from(referenced)
      .filter(name => !fs.existsSync(path.join(MOCKUPS_DIR, name)))
      .sort()

    expect(missing).toEqual([])
    expect(referenced.size).toBeGreaterThan(0)
  })
})
