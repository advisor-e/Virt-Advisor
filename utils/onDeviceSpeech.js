/**
 * @file Speech recognition that stays on this computer — item 12.2.
 *
 * Every microphone in the app used the browser's own recogniser, and in Chrome that sends the
 * audio to Google by default, under no published retention terms. Setting `processLocally` makes
 * Chrome recognise on the computer and send nothing, so it is set on every recogniser the app
 * creates, before anything else touches it. 🔴 THAT ONE SETTING IS THE PRIVACY GUARANTEE: with it
 * on, a language Chrome cannot do locally fails to start rather than falling back to a server.
 * Everything else in this file is about telling the advisor why.
 *
 * Chrome answers `available()` with 'available', 'downloadable', 'downloading' or 'unavailable',
 * and `install()` fetches a language pack once. Checked against Chrome 153, 2026-09-24: the
 * setting is a plain attribute, `recognition.processLocally = true`, off by default — not the
 * `options` object the W3C explainer describes.
 *
 * Approved design: design/mockups/dictation-on-device.html (Mike, 2026-09-24). D1 ruled there:
 * a language Chrome cannot do locally has its microphone OFF — never Google.
 *
 * Browser-only: call from `mounted()` or a click handler, never during render.
 */

/** What a screen's microphone is doing. The status line words the last three. */
export const SPEECH_STATE = Object.freeze({
  NONE: 'none', // the browser has no speech recognition at all — as before 12.2, nothing shown
  CHECKING: 'checking', // asking Chrome whether this language works on the computer
  READY: 'ready',
  SETTING_UP: 'settingUp', // the one-off language download (W1)
  SETUP_FAILED: 'setupFailed', // the download failed (W2)
  UNAVAILABLE: 'unavailable' // this language cannot be recognised on this computer (W3)
})

/**
 * @param {Window} win
 * @returns {Function|null} the browser's SpeechRecognition class, or null
 */
export function recognitionClass (win) {
  return (win && (win.SpeechRecognition || win.webkitSpeechRecognition)) || null
}

/**
 * A recogniser that never sends speech off the computer.
 * @param {Function} SR - the SpeechRecognition class
 * @returns {Object} the recogniser, with processLocally already on
 */
export function createOnDeviceRecognition (SR) {
  const recognition = new SR()
  recognition.processLocally = true
  return recognition
}

/**
 * Can this language be recognised on this computer?
 *
 * A browser that cannot answer the question has no on-device mode, and is treated exactly like
 * an unsupported language: the microphone stays off rather than risk a server.
 *
 * @param {Function} SR
 * @param {string} lang - BCP-47, e.g. 'en-US'
 * @returns {Promise<'ready'|'needsInstall'|'unavailable'>}
 */
export async function checkOnDevice (SR, lang) {
  if (!SR || typeof SR.available !== 'function') { return 'unavailable' }
  try {
    const answer = await SR.available({ langs: [lang], processLocally: true })
    if (answer === 'available') { return 'ready' }
    if (answer === 'downloadable' || answer === 'downloading') { return 'needsInstall' }
    return 'unavailable'
  } catch (e) {
    return 'unavailable'
  }
}

/**
 * Fetch this language's pack onto the computer. Resolves false on any failure — the caller shows
 * W2 and never falls back to a server.
 *
 * @param {Function} SR
 * @param {string} lang
 * @returns {Promise<boolean>}
 */
export async function installOnDevice (SR, lang) {
  if (!SR || typeof SR.install !== 'function') { return false }
  try {
    return (await SR.install({ langs: [lang], processLocally: true })) === true
  } catch (e) {
    return false
  }
}
