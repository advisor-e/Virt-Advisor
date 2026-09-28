'use strict'

/**
 * Meeting Review — the transcript expiry sweep.
 *
 * @module server/utils/meetingPurge
 *
 * A firm sets how long meeting transcripts are kept, and the client is shown that figure on the
 * consent screen before they agree to anything. This is the job that makes the number true.
 *
 * Asked for by Mike 2026-09-07 — *"finish the meeting review"*, then *"yes"* to building this
 * next. He had deliberately deferred it on 2026-09-01, and correctly: destroying the AUDIO is the
 * promise the spoken consent line makes and it shipped in slice 2. Expiring the TEXT is this.
 * Design `design/features/meeting-review.md` **P8**; artefact
 * `design/MEETING-CONSENT-WORDING.md`, whose step 1 screen reads *"The transcript is kept for
 * 18 months"* — with the firm's own figure rendered in place of the default.
 *
 * 🔴 THE CLOCK IS THE ONE THE CLIENT WAS SHOWN, NOT THE FIRM'S CURRENT DIAL. Every meeting record
 * stores `retentionMonths` as it stood on the day, and `meetingAudioStore.createMeeting` says why
 * in its own comment: *"a firm that later moves its dial must not retrospectively change what a
 * client was told at this meeting."* Resolving the firm's live setting here would quietly extend
 * a transcript a client was promised would be gone — the one direction this must never move.
 *
 * ⚠ EXCEPT DOWNWARD, WHICH IS SAFE AND IS NOT DONE EITHER. A firm shortening its dial does not
 * pull existing transcripts in early. That would be more protective, but it would also mean two
 * different rules deciding one deletion, and the record of what was promised is the only one that
 * can be checked against a client's memory of the conversation. One clock, and it is theirs.
 *
 * 🔴 IT REPORTS WHAT IT DID. P8: *"Deletion is a scheduled job that must be provable, not a best
 * effort."* Every sweep returns counts and every failure is named, so a firm can be told what was
 * removed rather than assured that something probably was.
 *
 * ⚠ A MEETING WITH NO RECORDED PERIOD IS NEVER PURGED, and that is deliberate. It cannot be
 * expired against a promise nobody can produce, and guessing a period would delete a client's
 * record on a number nobody ever said aloud. It is reported instead — see `unclocked`.
 *
 * Node 14, CommonJS.
 */

const store = require('./meetingAudioStore')
const { addWorkingDays } = require('./workingDays')

/** How often the sweep runs once the server is up. Daily is well inside any month-long clock. */
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000

/**
 * The moment a meeting's text expires: its creation stamp plus the months it was promised.
 *
 * Month arithmetic is done in UTC and lets `Date` normalise the overflow — 31 January plus one
 * month is 3 March in a non-leap year, which is later than the promise rather than earlier, and
 * erring later by two days is the safe direction for a deletion nobody can undo.
 *
 * @param {object} meta - the meeting record
 * @returns {Date|null} when the text expires, or null when this meeting has no promised period
 */
function expiryOf (meta) {
  if (!meta || typeof meta.createdAt !== 'string') { return null }
  const months = meta.retentionMonths
  if (typeof months !== 'number' || !isFinite(months) || months <= 0) { return null }

  const born = new Date(meta.createdAt)
  if (isNaN(born.getTime())) { return null }

  const out = new Date(born.getTime())
  out.setUTCMonth(out.getUTCMonth() + months)
  return out
}

/**
 * Has this meeting's text outlived what the client was told?
 *
 * @param {object} meta
 * @param {Date} now
 * @returns {boolean}
 */
function isExpired (meta, now) {
  const due = expiryOf(meta)
  if (!due) { return false }
  return now.getTime() >= due.getTime()
}

/**
 * Sweep every meeting and destroy the text of those past their promised period.
 *
 * Nothing is deleted for a meeting whose text is already gone, so a second sweep over the same
 * store is a no-op rather than a pile of failed unlinks.
 *
 * @param {Date} [now] - injectable so a test can stand at any date without touching the clock
 * @returns {{
 *   scanned: number,
 *   expired: number,
 *   purged: number,
 *   filesRemoved: number,
 *   bytesRemoved: number,
 *   unclocked: number,
 *   failures: Array<string>
 * }}
 */
function purgeExpired (now) {
  const at = now instanceof Date ? now : new Date()
  const result = {
    scanned: 0,
    expired: 0,
    purged: 0,
    filesRemoved: 0,
    bytesRemoved: 0,
    unclocked: 0,
    failures: []
  }

  store.listMeetingIds().forEach((id) => {
    let meta = null
    try {
      meta = store.readMeta(id)
    } catch (_e) {
      // A directory this store did not mint. `listMeetingIds` filters those, so this is a
      // record that became unreadable — named rather than skipped in silence.
      result.failures.push(id)
      return
    }
    if (!meta) { return }

    result.scanned += 1

    if (expiryOf(meta) === null) {
      // No promised period on the record. Never guessed at — see the module note.
      result.unclocked += 1
      return
    }
    if (!isExpired(meta, at)) { return }

    result.expired += 1

    // Nothing left to remove: already swept, or the meeting was stopped and deleted.
    // ⚠ A strategy session's segment text counts (item 8.4): a session abandoned before "End
    // recording" holds segment text and no joined transcript, and must still expire.
    if (!store.readTranscript(id) &&
        !store.readReport(id, 'summary') &&
        !store.readReport(id, 'coaching') &&
        !store.hasSegmentText(id)) {
      return
    }

    let outcome
    try {
      outcome = store.destroyTranscript(id)
    } catch (err) {
      result.failures.push(id)
      return
    }

    if (outcome.textRemains) {
      // P8 is a promise made to a firm's clients. A chunk that will not delete has to surface.
      result.failures.push(id)
      return
    }

    result.purged += 1
    result.filesRemoved += outcome.removed
    result.bytesRemoved += outcome.bytesRemoved
    try {
      store.updateMeta(id, { transcriptPurgedAt: at.toISOString() })
    } catch (_e) {
      // The text is gone, which is the promise. A stamp that would not write is not a reason
      // to report the deletion as failed.
    }
  })

  return result
}

/**
 * How long an unfinished recording's audio is held. Mike's ruling, 2026-09-28 (item 8.5):
 * *"hold it for 7 working days in case the parties are trying to work through an issue"* —
 * Monday to Friday, weekends skipped, public holidays counted as ordinary days.
 */
const ABANDONED_HOLD_WORKING_DAYS = 7

/**
 * When an unfinished recording's audio will be destroyed: 7 working days after audio last
 * arrived. Meetings recorded before item 8.5 have no `lastActivityAt` and count from creation,
 * the earlier of the two — which only ever brings a long-abandoned recording's deletion forward.
 *
 * @param {object} meta
 * @returns {Date|null}
 */
function audioDeleteAfter (meta) {
  if (!meta) { return null }
  return addWorkingDays(meta.lastActivityAt || meta.createdAt, ABANDONED_HOLD_WORKING_DAYS)
}

/**
 * Destroy the audio of every recording that was never finished, once its hold has run out.
 *
 * 🔴 WHY THIS EXISTS. Audio was destroyed in only two places — when a recording is finished
 * and transcribed, and on "Stop and delete". A closed tab, a flat laptop or an advisor who
 * walked away left a client's audio on this server with no end date, while the consent line
 * promises *"the recording itself is deleted as soon as that's done"*. Found 2026-09-28 while
 * building item 8.4; it was true of single-file recordings too.
 *
 * ⚠ AUDIO ONLY. Any text already made from it keeps its own clock (`purgeExpired`). The rule is
 * "audio still on disk past its hold", not a list of states, so a transcription job lost to a
 * server restart is caught by it as surely as an abandoned tab.
 *
 * @param {Date} [now]
 * @returns {{scanned: number, abandoned: number, filesRemoved: number, bytesRemoved: number,
 *   failures: Array<string>}}
 */
function purgeAbandoned (now) {
  const at = now instanceof Date ? now : new Date()
  const result = { scanned: 0, abandoned: 0, filesRemoved: 0, bytesRemoved: 0, failures: [] }

  store.listMeetingIds().forEach((id) => {
    let meta = null
    try {
      meta = store.readMeta(id)
    } catch (_e) {
      result.failures.push(id)
      return
    }
    if (!meta || !store.hasAudio(id)) { return }
    result.scanned += 1

    const due = audioDeleteAfter(meta)
    if (!due || at.getTime() < due.getTime()) { return }

    let proof
    try {
      proof = store.destroyAudio(id)
    } catch (_e) {
      result.failures.push(id)
      return
    }
    if (proof.audioRemains) {
      result.failures.push(id)
      try { store.updateMeta(id, { audioDeletionFailed: true }) } catch (_e) { /* named above */ }
      return
    }

    result.abandoned += 1
    result.filesRemoved += proof.removed
    result.bytesRemoved += proof.bytesRemoved
    try {
      store.updateMeta(id, {
        state: meta.state === 'transcribed' ? meta.state : 'abandoned',
        audioDeletedAt: at.toISOString()
      })
    } catch (_e) {
      // The audio is gone, which is the promise. A stamp that would not write is not a failure.
    }
  })

  return result
}

/**
 * Run the sweep now, and then daily, logging what each pass did.
 *
 * ⚠ THE TIMER IS `unref`'d, so it never holds the process open. A scheduled sweep that kept a
 * test runner or a shutting-down server alive would be found by somebody hunting a hang, and
 * "provable deletion" is not worth a mystery.
 *
 * @param {object} [options]
 * @param {number} [options.intervalMs]
 * @returns {object} the timer, so a caller can stop it
 */
function startSweeping (options) {
  const every = (options && options.intervalMs) || SWEEP_INTERVAL_MS

  const run = () => {
    try {
      const r = purgeExpired()
      if (r.purged || r.failures.length) {
        // eslint-disable-next-line no-console
        console.log('[meeting-purge] scanned=' + r.scanned + ' expired=' + r.expired +
          ' purged=' + r.purged + ' files=' + r.filesRemoved + ' bytes=' + r.bytesRemoved +
          ' unclocked=' + r.unclocked + ' failures=' + r.failures.length)
      }
      if (r.failures.length) {
        // eslint-disable-next-line no-console
        console.error('[meeting-purge] COULD NOT EXPIRE ' + r.failures.length +
          ' meeting(s): ' + r.failures.join(', '))
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[meeting-purge] sweep failed:', err.message)
    }
    try {
      const a = purgeAbandoned()
      if (a.abandoned || a.failures.length) {
        // eslint-disable-next-line no-console
        console.log('[meeting-purge] unfinished recordings: scanned=' + a.scanned +
          ' abandoned=' + a.abandoned + ' files=' + a.filesRemoved + ' bytes=' + a.bytesRemoved +
          ' failures=' + a.failures.length)
      }
      if (a.failures.length) {
        // eslint-disable-next-line no-console
        console.error('[meeting-purge] COULD NOT DESTROY AUDIO of ' + a.failures.length +
          ' meeting(s): ' + a.failures.join(', '))
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[meeting-purge] unfinished-recording sweep failed:', err.message)
    }
  }

  run()
  const timer = setInterval(run, every)
  if (typeof timer.unref === 'function') { timer.unref() }
  return timer
}

module.exports = {
  SWEEP_INTERVAL_MS,
  ABANDONED_HOLD_WORKING_DAYS,
  expiryOf,
  isExpired,
  purgeExpired,
  audioDeleteAfter,
  purgeAbandoned,
  startSweeping
}
