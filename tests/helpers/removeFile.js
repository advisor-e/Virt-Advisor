'use strict'

/**
 * Delete a test's scratch file so the next test can create it again — on Windows too.
 *
 * WHY NOT `fs.unlinkSync` (item 22.1). If any other process holds the file open when it is
 * deleted — a virus scanner or the search indexer, reading a file just written — Windows
 * only marks it for deletion, and creating the same path again fails with EPERM until that
 * handle closes. That is what blocked pushes at random: the full suite with coverage writes
 * the most files, so a scanner has the most to look at. Proved 2026-09-25 on Node 14.15.
 *
 * Moving the file aside first frees its path at once, so the next write succeeds while the
 * aside copy is deleted whenever Windows is ready. An absent file is not an error.
 *
 * @param {string} file - absolute path of the scratch file
 * @returns {void}
 */
const fs = require('fs')

let counter = 0

function removeFile (file) {
  const aside = `${file}.${process.pid}.${++counter}.del`
  try {
    fs.renameSync(file, aside)
  } catch (e) {
    if (e.code === 'ENOENT') { return }
    throw e
  }
  try { fs.unlinkSync(aside) } catch (_e) { /* delete-pending under a name nobody reuses */ }
}

module.exports = { removeFile }
