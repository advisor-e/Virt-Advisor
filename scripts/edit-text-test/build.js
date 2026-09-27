// Item 15.25 — the editing test Mike tried and approved on 2026-09-25. Rebuilds
// design/mockups/strategy-edit-text-test.html (Porter's 5 Forces) and a Blue Ocean
// Strategy copy in the system temp folder, for run.js to measure. Run: node scripts/edit-text-test/build.js
// Extracts two approved drawings, fills the firm mark with a sample firm, and writes a
// page where clicking a text block lets you edit it. The block re-wraps at the drawing's
// own font, size and column width, and paint-level hit-testing reports any collision.
const fs = require('fs')
const path = require('path')
const REPO = path.resolve(__dirname, '..', '..')
const os = require('os')
const outFor = name => name === 'Porters5Forces' ? path.join(REPO, 'design/mockups/strategy-edit-text-test.html') : path.join(os.tmpdir(), name + '-edit-test.html')

function extract (name) {
  const src = fs.readFileSync(path.join(REPO, 'components/strategy/concepts', name + '.vue'), 'utf8')
  let svg = src.slice(src.indexOf('<svg'), src.indexOf('</svg>') + 6)
  svg = svg
    .replace(/ :fill="firmColour"/g, ' fill="#0070c0"')
    .replace(/ v-if="firmLogo"/g, ' style="display:none"')
    .replace(/ v-if="!firmLogo"/g, '')
    .replace(/ :href="firmLogo"/g, '')
    .replace(/\{\{\s*firmInitial\s*\}\}/g, 'H')
    .replace(/\{\{\s*firmName\s*\}\}/g, 'Hartley &amp; Co')
  return svg
}

const harness = fs.readFileSync(path.join(__dirname, 'harness.js'), 'utf8')
const pages = ['Porters5Forces', 'BlueOceanStrategy']
pages.forEach((name) => {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edit Text Test</title>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>:root{--bg:#f1f6fb;--ink:#002b64;--muted:#6b7f99;--panel:#fff}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0d1726;--ink:#cfe3ff;--muted:#8ea3bd;--panel:#16263a}}
:root[data-theme="dark"]{--bg:#0d1726;--ink:#cfe3ff;--muted:#8ea3bd;--panel:#16263a}
body{margin:0;font-family:'Open Sans',sans-serif;background:var(--bg);color:var(--ink);padding:0 16px 160px}
.intro{max-width:900px;margin:20px auto 0;font-size:14.5px;line-height:1.55}.intro h1{font-size:22px;margin:0 0 6px}.intro p{margin:0 0 8px}.intro .m{color:var(--muted);font-size:13px}
#ed{color:#23405f}
#stage{max-width:1200px;margin:16px auto;background:#fff;box-shadow:0 2px 12px #0002}
#stage svg{display:block;width:100%;height:auto}
text.blk{cursor:text} text.blk:hover{fill-opacity:.75}
#ed{position:fixed;left:16px;right:16px;bottom:16px;max-width:900px;margin:auto;background:#fff;border:2px solid #0070c0;border-radius:10px;padding:12px;display:none;box-shadow:0 6px 24px #0003}
#ed textarea{width:100%;min-height:90px;font:15px 'Open Sans',sans-serif;box-sizing:border-box}
#st{font-weight:700;margin:6px 0}.ok{color:#2e7d32}.bad{color:#c0392b}
button{font:600 14px 'Open Sans',sans-serif;padding:6px 12px;margin-right:6px}</style></head>
<body><div class="intro"><h1>Try it: edit the text on a concept page</h1>
<p><b>Click any piece of text on the page below</b> (a question, a heading, a label in a circle). Change the words in the box that opens, then press <b>Apply</b>. The text re-wraps in the page's own font and size, and the box tells you whether it <b>fits</b> or what it <b>runs into</b>. <b>Put back the original</b> undoes it.</p>
<p class="m">A throwaway test, 25 Sep 2026. It isn't part of the app and nothing you type is saved anywhere. The firm shown is a sample (Hartley &amp; Co). Try adding a sentence to the "New Entrants" question on the left, which has the most room, and to a label inside a circle, which has the least.</p></div>
<div id="stage">${extract(name)}</div>
<div id="ed"><textarea id="ta"></textarea><p id="st"></p>
<button id="ap">Apply</button><button id="rs">Put back the original</button><button id="cl">Close</button></div>
<script>${harness}</script></body></html>`
  fs.writeFileSync(outFor(name), html)
  console.log('wrote', outFor(name), html.length)
})
