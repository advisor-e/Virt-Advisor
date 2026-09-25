const path = require('path')
// Measures how much longer each text block on two drawings can grow before it collides.
// Run build.js first, then: node scripts/edit-text-test/run.js
const os = require('os')
const { chromium } = require('playwright')
const REPO = path.resolve(__dirname, '..', '..')
const fileFor = name => name === 'Porters5Forces' ? path.join(REPO, 'design/mockups/strategy-edit-text-test.html') : path.join(os.tmpdir(), name + '-edit-test.html')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  for (const name of ['Porters5Forces', 'BlueOceanStrategy']) {
    await page.goto('file:///' + fileFor(name).split(path.sep).join('/'))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => typeof window.__measureAll === 'function')
    const fonts = await page.evaluate(() => Array.from(document.fonts).filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight))
    const rows = await page.evaluate(() => window.__measureAll())
    console.log('\n=== ' + name + '  (fonts loaded: ' + (fonts.join(', ') || 'none') + ')')
    rows.forEach(r => console.log(JSON.stringify(r)))
  }
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
