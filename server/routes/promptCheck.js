'use strict'

/**
 * Share a prompt — Restify route. Item 4.31, steps 1–3 of
 * `design/PROMPT-CONTRIBUTION-SAFETY.md` §7.
 *
 * A firm manager pastes a prompt they believe in and asks for it to be checked. This is
 * **Lane A**: nothing is stored, nothing is written to any firm's configuration, and
 * nothing here changes how the advising AI behaves. The lane that would change a firm's
 * advice is step 4 of the design and is **not built** — there is no route for it, on
 * purpose.
 *
 * Design: `design/PROMPT-CONTRIBUTION-SAFETY.md`.
 * Wording: `design/PROMPT-CONTRIBUTION-WORDING.md` (approved by Mike 2026-08-25).
 * Artefact: `design/mockups/prompt-contribution.html`.
 *
 * 🔴 THE REQUEST BODY IS NEVER LOGGED, AND NEVER PUT IN AN ERROR. It is the one payload
 * in this application that a person types by hand from their own working documents, so
 * it routinely contains real client names, addresses and tax numbers — that is what the
 * personal-data check exists for. Every `console.error` below carries the error's own
 * message and nothing from the body. A future edit that adds the text to a log line is a
 * privacy defect, not a debugging convenience.
 *
 * 🔴 THE ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT, and reads no
 * scope from the body or the query — `tier-cascade.md` P6, the same rule as every other
 * manager route. It stores nothing, so there is nothing here for one tier to read out of
 * another; the guard is on the door regardless, because "it does not store anything
 * today" is not a property a later edit preserves.
 *
 * ⚠ RATE LIMITED. This is the only manager route that will spend money per call once the
 * review is wired, and it is the only one that accepts free text. Both are reasons to cap
 * it well below what a person could ever type.
 *
 * Node 14, CommonJS.
 */

const { sendError } = require('../utils/sendError')
const { createLimiter } = require('../utils/rateLimit')
const { checkContribution, MAX_CHARACTERS } = require('../utils/promptContribution')
const { supportEmail } = require('../utils/supportContact')

/**
 * Ten checks a minute per address. A person pasting and correcting a prompt does maybe
 * five in that time; anything faster is not somebody reading the answers.
 */
const limiter = createLimiter(10)

/**
 * 🔴 THE DESIGN FORBIDS A REFUSAL WITH NO ROUTE BACK TO A HUMAN (§5), and until
 * 2026-08-25 this application had no support address anywhere in it — one `mailto:` in
 * the whole codebase, belonging to an advisor's own profile. Mike set one that day:
 * *"for now, they can send it to mike@advisor-e.com"*, and then asked that it be easy to
 * change. It lives in `data/support-contact.json`, is read fresh on every call, and the
 * screen renders whatever `supportEmail()` hands it — see `server/utils/supportContact.js`.
 *
 * ⚠ NOT IN THE LOCALE FILES. An address is configuration, not translation; eight copies
 * in eight languages is eight places for it to go stale.
 */

/**
 * POST /api/firm-manager/prompt-check  (manager)
 *
 * Runs the deterministic checks over a pasted prompt and reports the first thing that
 * would stop it, or reports that nothing would.
 *
 * A refusal is returned as a **200 with `ok: false`**, not as an HTTP error. Being told
 * "we will not take this, and here is why" is the route working exactly as designed — the
 * 4xx codes are kept for a request that was actually malformed, so the screen can tell a
 * refusal apart from a failure and say the right thing about each.
 *
 * @route POST /api/firm-manager/prompt-check
 * @param {object} req.body
 * @param {string} req.body.text - The pasted prompt. Never logged.
 * @param {boolean} [req.body.removeInvisible] - True when the manager has pressed
 *   *"Take them out and check it again"*. The one alteration this route will make, and
 *   only because a person asked for it.
 * @returns {{ok: boolean, refusal: (object|null), cleared: boolean, limit: number,
 *   contactEmail: string}}
 */
function check (req, res) {
  if (limiter(req, res) === false) { return }

  const body = req.body || {}

  if (typeof body.text !== 'string') {
    return sendError(res, 400, 'NO_PROMPT_TEXT', 'No prompt was sent to check')
  }
  if (body.text.trim() === '') {
    return sendError(res, 400, 'EMPTY_PROMPT_TEXT', 'The prompt was empty')
  }
  if (body.removeInvisible !== undefined && typeof body.removeInvisible !== 'boolean') {
    return sendError(res, 400, 'INVALID_OPTION', 'removeInvisible must be true or false')
  }

  try {
    const result = checkContribution(body.text, { removeInvisible: body.removeInvisible === true })

    if (!result.ok) {
      return res.send(200, {
        ok: false,
        refusal: result.refusal,
        cleared: false,
        limit: MAX_CHARACTERS,
        contactEmail: supportEmail()
      })
    }

    // Step 3 of the build order attaches the AI review here. Until it does, a clear
    // result is still a real answer: every check we run found nothing to refuse.
    return res.send(200, {
      ok: true,
      refusal: null,
      cleared: true,
      limit: MAX_CHARACTERS,
      contactEmail: supportEmail()
    })
  } catch (err) {
    console.error('[prompt-check] failed:', err.message)
    return sendError(res, 500, 'PROMPT_CHECK_FAILED', 'Could not check the prompt just now')
  }
}

module.exports = { check }
