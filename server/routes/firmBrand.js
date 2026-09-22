'use strict'

/**
 * THE ADVISOR FIRM'S BRAND, for the document a client is handed — item 16.2.
 *
 * Mike's ruling, 2026-09-18: *"in client dealings, Advisor-e ALWAYS clones and shows
 * that ADVISORS firm logo - never advisor-e."* Item 16 built `firmBrand()` to read the
 * firm's row; it was on no route, so no screen could ask for it and every printed plan
 * rendered the placeholder. This is that route and nothing more.
 *
 * 🔴 NO SCREEN IS BUILT FOR THIS, and that is a ruling, not an omission. The values live
 * on the firm profile page in the Advisor-e master app — Mike, 2026-09-22: *"Advisor-e
 * already picks up the colour and brands the border to suit"* — so our side is a stub
 * connection to it, exactly as his 2026-08-15 ruling describes.
 *
 * ⚠ IT NEVER FAILS A DOCUMENT. A brand is decoration on a page whose figures matter, so
 * every failure answers 200 with nulls and lets the renderer fall back to the initials
 * disc. A thrown brand would take a client's whole plan down over a logo.
 */

const { firmBrand } = require('../utils/firmsDirectory')

/**
 * The shape returned when nothing can be read. `name` null makes the renderer fall back
 * to the placeholder; `logo`/`colour` null make it fall back to the initials disc and
 * the platform border colour. Never an error body — see the note above.
 * @returns {{name: null, logo: null, colour: null, isDefault: true}}
 */
function empty () {
  return { name: null, logo: null, colour: null, isDefault: true }
}

/**
 * GET /api/report/firm/brand  (firmAuth)
 *
 * @route GET /api/report/firm/brand
 * @param {Object} req Restify request; `req.firmId` comes from the verified JWT, never
 *   from the query string — a firm may only ever read its own brand.
 * @param {Object} res Restify response.
 * @returns {{name: (string|null), logo: (string|null), colour: (string|null), isDefault: boolean}}
 *   `isDefault` is true when no firm brand could be read at all, so a caller can tell
 *   "this firm has no logo on file" from "we could not look".
 *
 * ⚠ `firmBrand()`'s query is `SELECT id, name` ALWAYS and only adds the logo and colour
 * columns once the master team names them (seam Q-FIRM-BRAND, `config/integration.js`).
 * So a firm's real NAME resolves today and the image and colour arrive later with no
 * further work here — which is why this shipped without waiting for them.
 */
async function get (req, res) {
  try {
    const brand = await firmBrand(req.firmId)
    if (!brand) {
      res.send(200, empty())
      return
    }
    res.send(200, {
      name: brand.name || null,
      logo: brand.logo || null,
      colour: brand.colour || null,
      isDefault: !brand.name && !brand.logo && !brand.colour
    })
  } catch (err) {
    // Log in full server-side; answer with nulls so the document still prints.
    console.error('[firmBrand] read failed:', err.message)
    res.send(200, empty())
  }
}

module.exports = { get, empty }
