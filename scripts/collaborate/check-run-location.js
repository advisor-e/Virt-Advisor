'use strict'

/**
 * Run-location guard.
 *
 * Refuses to start the app when the project is sitting inside a file-sync folder
 * (Dropbox / OneDrive / Google Drive). Git repos inside those folders get
 * corrupted by background sync AND hide the fact that a copy is stale — exactly
 * the near-miss that prompted CONTRIBUTING.md. The canonical copy lives on the
 * C: drive, outside any sync folder.
 *
 * Wired as a `pre` hook on the run scripts (predev / prebackend / prestart /
 * predev:all) in package.json, so it fires whenever someone "turns the app on".
 *
 * Override (not recommended): set ALLOW_SYNC_FOLDER=true.
 *
 * Node 14.15 / CommonJS — no external dependencies.
 */

const SYNC_MARKERS = [
  { name: 'Dropbox', re: /[\\/]dropbox([\\/]|$)/i },
  { name: 'OneDrive', re: /[\\/]onedrive/i },
  { name: 'Google Drive', re: /[\\/]google ?drive/i }
]

/**
 * Detect whether a path lives inside a known file-sync folder.
 *
 * @param {string} dir - a filesystem path (e.g. process.cwd())
 * @returns {string|null} the sync service name (e.g. 'Dropbox'), or null if none
 */
function detectSyncFolder (dir) {
  const p = String(dir || '')
  for (const marker of SYNC_MARKERS) {
    if (marker.re.test(p)) { return marker.name }
  }
  return null
}

function main () {
  if (process.env.ALLOW_SYNC_FOLDER === 'true') { return }

  const here = process.cwd()
  const service = detectSyncFolder(here)
  if (!service) { return }

  process.stderr.write([
    '',
    '============================================================',
    '  WRONG COPY  —  the app is being started from ' + service + '.',
    '',
    '  Files in ' + service + ' get corrupted by sync and can hide a',
    '  stale copy. Work from the canonical copy on the C: drive:',
    '',
    '      C:\\Users\\Mike Barnes\\Projects\\Advisor Collaborate',
    '',
    '  Detected path: ' + here,
    '',
    '  See CONTRIBUTING.md. To override (not recommended):',
    '      set ALLOW_SYNC_FOLDER=true',
    '============================================================',
    ''
  ].join('\n') + '\n')

  process.exit(1)
}

if (require.main === module) { main() }

module.exports = { detectSyncFolder }
