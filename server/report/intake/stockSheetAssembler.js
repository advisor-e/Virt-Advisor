'use strict'

/**
 * Stock-sheet assembler — a Cin7 Core or Unleashed stock-on-hand export turned into the inputs
 * the Stock Purchasing model reads (item 4.94).
 *
 * Mike, 2026-09-13: *"the point of the stock purchasing model is to help identify the existing
 * stock in relation to pre determined criteria - we need to be able to import a stock sheet"*.
 *
 * It reads through `inventoryReader.readInventoryUpload`, which already knows both packages'
 * layouts (4.70 stage 4) and refuses a file by the columns it lacks. Nothing about the file
 * formats is re-implemented here; this module only decides what a stock sheet can honestly say
 * about the five scoring criteria, and says nothing about the rest.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * 🔴 A STOCK SHEET CARRIES TWO OF THE FIVE CRITERIA. THE OTHER THREE ARE NOT IN THE FILE.
 *
 *   ✅ Unit cost risk      — the export prints a unit cost per line. Cin7 gives a unit cost and
 *                            Unleashed an average cost; the reader records which, and the result
 *                            carries `costBasis` so the screen can say so.
 *   ✅ Share of stock held — this line's units over every unit in the file. COMPUTED HERE; the
 *                            workbook has it typed in by hand.
 *   ❌ How many sold       — a stock-on-hand export is what is HELD, not what SOLD.
 *   ❌ Margin achieved     — there is no sale price in it, only a cost.
 *   ❌ Days on hand        — neither package exports a date. `inventoryReader`'s own header says
 *                            so: "NOTHING here is an age".
 *
 * The three missing ones live in a sales report, which is what the workbook's own step 1 reads —
 * so the workbook always assumed two files even though it never says so.
 *
 * 🔴 **`quantity` IS LEFT NULL, DELIBERATELY, AND THIS IS THE WHOLE POINT OF THE MODULE.** The
 * model reads `quantity` as UNITS SOLD. A stock export's `onHand` is units HELD. Passing one as
 * the other would score a warehouse full of unsold stock as though every unit had walked out of
 * the door — the exact inversion the model exists to catch. `unitsHeld` carries it instead, under
 * a name that cannot be mistaken, and the model never scores from it.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * Node 14, CommonJS. Processes untrusted uploads → tested to the report standard.
 */

const { readInventoryUpload } = require('./inventoryReader')

/** The two criteria a stock sheet can honestly score, and the three it cannot. */
const SCORED_FROM_STOCK = Object.freeze(['unitCostRisk', 'shareOfStock'])
const NOT_IN_A_STOCK_SHEET = Object.freeze(['margin', 'sold', 'daysOnHand'])

/**
 * Turn a parsed stock export into Stock Purchasing inputs.
 *
 * Share of stock is each line's units over the file's total units. Where a line has no `onHand`
 * the share is null rather than zero — unknown is not "none", and the model scores a null 0 and
 * says it was not scored, which is the honest reading. Where the file's units total zero, every
 * share is null: the alternative is dividing by zero and calling the result a criterion.
 *
 * @param {{package: string, costBasis: string, hasOnOrder: boolean, lines: Array<Object>}} parsed
 *   the output of `readInventoryUpload`
 * @returns {{lines: Array<Object>, shelf: {onHand: number, inTransit: number},
 *   package: string, costBasis: string, hasOnOrder: boolean, carries: Array<string>,
 *   missing: Array<string>, unitsTotal: number, valueTotal: number}}
 */
function assembleStockSheet (parsed) {
  const src = parsed && Array.isArray(parsed.lines) ? parsed.lines : []

  let unitsTotal = 0
  let valueTotal = 0
  let onOrderTotal = 0
  for (let i = 0; i < src.length; i++) {
    unitsTotal += src[i].onHand || 0
    valueTotal += src[i].value || 0
    onOrderTotal += src[i].onOrder || 0
  }

  const lines = src.map(function (line) {
    return {
      code: line.code || line.name || null,
      name: line.name || null,
      category: line.category || null,
      location: line.location || null,
      // Units HELD. Never `quantity` — see the header.
      unitsHeld: line.onHand,
      allocated: line.allocated,
      available: line.available,
      onOrder: line.onOrder,
      value: line.value,
      // The two the model can score from this file.
      avgUnitCost: line.unitCost,
      shareOfStock: line.onHand === null || unitsTotal === 0 ? null : line.onHand / unitsTotal,
      // The three that are not in it. Stated rather than omitted, so a line reaching the model
      // from an import looks exactly like one reaching it from a sales export with these blank.
      quantity: null,
      sales: null,
      cost: null,
      entryDate: null,
      saleDate: null
    }
  })

  return {
    lines,
    // Step 2 comes out of this file whole. On order is the in-transit half that causes the
    // double-order; Cin7 prints it and Unleashed does not, which `hasOnOrder` records.
    shelf: { onHand: unitsTotal, inTransit: onOrderTotal },
    package: parsed ? parsed.package : null,
    costBasis: parsed ? parsed.costBasis : null,
    hasOnOrder: Boolean(parsed && parsed.hasOnOrder),
    carries: SCORED_FROM_STOCK,
    missing: NOT_IN_A_STOCK_SHEET,
    unitsTotal,
    valueTotal
  }
}

/**
 * Read an uploaded stock sheet and assemble it in one step.
 *
 * @param {Buffer} buf  the uploaded file
 * @returns {Object} as `assembleStockSheet`
 * @throws {Error} with a `code` — the reader's own `UNRECOGNISED_INVENTORY` and friends
 */
function readStockSheet (buf) {
  return assembleStockSheet(readInventoryUpload(buf))
}

module.exports = {
  SCORED_FROM_STOCK,
  NOT_IN_A_STOCK_SHEET,
  assembleStockSheet,
  readStockSheet
}
