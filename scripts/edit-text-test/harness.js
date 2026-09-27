document.fonts.ready.then(function () {
  const svg = document.querySelector('#stage svg')
  const NS = 'http://www.w3.org/2000/svg'
  const vb = svg.viewBox.baseVal

  // ---- 1. Group the page's lines into blocks (a paragraph = consecutive lines sharing
  //         x, size, weight and colour, stepping down by about one line height).
  const inMark = t => t.closest('[class*="firm"],[id*="firm"],[class*="fm-"]')
  const lines = Array.from(svg.querySelectorAll('text')).filter(t => !inMark(t) && t.getAttribute('y'))
  const sig = (t) => {
    const cs = getComputedStyle(t)
    return [cs.fontSize, cs.fontWeight, cs.fontStyle, cs.fill, cs.textAnchor].join('|')
  }
  const num = (t, a) => parseFloat(t.getAttribute(a))
  const blocks = []
  lines.forEach((t) => {
    const fs = parseFloat(getComputedStyle(t).fontSize)
    const b = blocks[blocks.length - 1]
    const prev = b && b.lines[b.lines.length - 1]
    if (prev && sig(prev) === sig(t) && Math.abs(num(prev, 'x') - num(t, 'x')) < 2) {
      const gap = num(t, 'y') - num(prev, 'y')
      if (gap > fs * 0.8 && gap < fs * 1.8) { b.lines.push(t); return }
    }
    blocks.push({ lines: [t] })
  })

  const probe = (tpl) => {
    const p = tpl.cloneNode(false)
    p.removeAttribute('textLength'); p.removeAttribute('lengthAdjust')
    p.style.display = ''
    p.setAttribute('visibility', 'hidden')
    tpl.parentNode.appendChild(p)
    return p
  }
  const natural = (tpl, s) => { const p = probe(tpl); p.textContent = s; const w = p.getComputedTextLength(); p.remove(); return w }

  blocks.forEach((b, i) => {
    const first = b.lines[0]
    b.id = i
    b.fs = parseFloat(getComputedStyle(first).fontSize)
    b.x = num(first, 'x'); b.y0 = num(first, 'y')
    const gaps = b.lines.slice(1).map((l, k) => num(l, 'y') - num(b.lines[k], 'y')).sort((a, c) => a - c)
    b.lh = gaps.length ? gaps[Math.floor(gaps.length / 2)] : b.fs * 1.3
    b.width = Math.max.apply(null, b.lines.map(l => parseFloat(l.getAttribute('textLength')) || natural(l, l.textContent)))
    b.justified = b.lines.length > 1 && b.lines.slice(0, -1).every(l => l.hasAttribute('textLength'))
    b.pinned = b.lines.some(l => l.hasAttribute('textLength'))
    b.original = b.lines.map(l => l.textContent.trim()).join(' ').replace(/\s+/g, ' ')
    b.current = b.lines.slice()
    b.lines.forEach(l => { l.classList.add('blk'); l.dataset.block = i })
  })

  // ---- 2. Paint-level hit-testing: which painted things sit under a set of lines.
  const bg = el => el.tagName === 'rect' && +el.getAttribute('width') >= vb.width - 1 && +el.getAttribute('height') >= vb.height - 1
  function under (els) {
    const own = new Set(els)
    const hits = new Map(); let points = 0; const perPoint = []
    els.forEach((el) => {
      const r = el.getBoundingClientRect()
      for (let y = r.top + 2; y < r.bottom - 1; y += 4) {
        for (let x = r.left + 2; x < r.right - 1; x += 4) {
          points++
          const s = new Set()
          document.elementsFromPoint(x, y).forEach((h) => {
            if (!svg.contains(h) || h === svg || own.has(h) || bg(h) || h.tagName === 'g') { return }
            s.add(h); hits.set(h, (hits.get(h) || 0) + 1)
          })
          perPoint.push(s)
        }
      }
    })
    return { hits, points, perPoint }
  }
  const offPage = els => els.some((el) => { const bb = el.getBBox(); return bb.x < -1 || bb.y < -1 || bb.x + bb.width > vb.width + 1 || bb.y + bb.height > vb.height + 1 })
  const describe = h => h.tagName === 'text' ? '"' + h.textContent.trim().slice(0, 40) + '"' : h.tagName + (h.getAttribute('fill') && h.getAttribute('fill') !== 'none' ? ' ' + h.getAttribute('fill') : '') + (h.getAttribute('stroke') ? ' stroke ' + h.getAttribute('stroke') : '')

  blocks.forEach((b) => {
    const u = under(b.lines)
    b.base = new Set(u.hits.keys())
    // A box the block sits wholly inside (a label in a circle, text on a panel).
    b.containers = Array.from(u.hits.entries()).filter(([, n]) => n >= u.points * 0.95).map(([h]) => h)
  })

  // ---- 3. Re-wrap a block's text at its own font, size and column width.
  function wrap (b, text) {
    const out = []
    text.split(/\n+/).forEach((para) => {
      const words = para.trim().split(/\s+/).filter(Boolean)
      let line = ''
      words.forEach((w) => {
        const t = line ? line + ' ' + w : w
        if (line && natural(b.lines[0], t) > b.width + 0.5) { out.push({ s: line, full: true }); line = w } else { line = t }
      })
      if (line) out.push({ s: line, full: false })
    })
    return out
  }
  function render (b, text) {
    b.current.forEach(l => { if (!b.lines.includes(l)) { l.remove() } })
    b.lines.forEach(l => { l.style.display = 'none' })
    if (text === null) { b.lines.forEach(l => { l.style.display = '' }); b.current = b.lines.slice(); return b.current }
    const tpl = b.lines[0]
    b.current = wrap(b, text).map((ln, k) => {
      const e = tpl.cloneNode(false)
      e.style.display = ''
      e.removeAttribute('textLength'); e.removeAttribute('lengthAdjust')
      e.setAttribute('y', (b.y0 + k * b.lh).toFixed(1))
      e.textContent = ln.s
      if (b.justified && ln.full) { e.setAttribute('textLength', b.width.toFixed(1)); e.setAttribute('lengthAdjust', 'spacing') }
      e.classList.add('blk'); e.dataset.block = b.id
      tpl.parentNode.insertBefore(e, tpl)
      return e
    })
    return b.current
  }
  function check (b) {
    const els = b.current
    const u = under(els)
    const hitNew = Array.from(u.hits.keys()).filter(h => !b.base.has(h) && !(h.dataset && h.dataset.block === String(b.id)))
    const leftBox = b.containers.filter(c => u.perPoint.some(s => !s.has(c)))
    const reasons = []
    if (offPage(els)) { reasons.push('runs off the page') }
    if (hitNew.length) { reasons.push('runs into ' + hitNew.slice(0, 3).map(describe).join(', ')) }
    if (leftBox.length) { reasons.push('spills out of its ' + leftBox.map(describe).join(', ')) }
    return { fits: !reasons.length, lines: els.length, reasons }
  }

  // ---- 4. The click-to-edit panel.
  const ed = document.getElementById('ed'); const ta = document.getElementById('ta'); const st = document.getElementById('st')
  let open = null
  svg.addEventListener('click', (e) => {
    const t = e.target.closest('text.blk'); if (!t) { return }
    open = blocks[+t.dataset.block]
    ta.value = open.current.map(l => l.textContent.trim()).join(' ')
    st.textContent = 'Editing a ' + open.lines.length + '-line block. Change the words, then Apply.'; st.className = ''
    ed.style.display = 'block'; ta.focus()
  })
  document.getElementById('ap').onclick = () => {
    if (!open) { return }
    render(open, ta.value); const r = check(open)
    st.textContent = r.fits ? 'Fits — ' + r.lines + ' line(s).' : 'Does not fit: ' + r.reasons.join('; ') + '.'
    st.className = r.fits ? 'ok' : 'bad'
  }
  document.getElementById('rs').onclick = () => { if (open) { render(open, null); ta.value = open.original; st.textContent = 'Original put back.'; st.className = 'ok' } }
  document.getElementById('cl').onclick = () => { ed.style.display = 'none' }

  window.__dbg = { blocks, render, check, wrap, natural }
  // ---- 5. The measurement: grow each block a word at a time until it no longer fits.
  const FILLER = 'and we should also review how this affects our pricing, our people and our plans for the coming year'.split(' ')
  window.__measureAll = function () {
    return blocks.map((b) => {
      const words = b.original.split(' ')
      let fitWords = 0; let firstFail = null; let maxLines = b.lines.length
      const baseline = (render(b, b.original), check(b))
      for (let n = 1; n <= 120; n++) {
        const extra = []; for (let k = 0; k < n; k++) { extra.push(FILLER[k % FILLER.length]) }
        render(b, b.original + ' ' + extra.join(' '))
        const r = check(b)
        if (!r.fits) { firstFail = r.reasons.join('; '); break }
        fitWords = n; maxLines = r.lines
      }
      render(b, null)
      const extraChars = FILLER.slice(0).concat(FILLER, FILLER, FILLER, FILLER, FILLER).slice(0, fitWords).join(' ').length
      return {
        block: b.id, text: b.original.slice(0, 70), lines: b.lines.length, words: words.length, chars: b.original.length,
        pinned: b.pinned, justified: b.justified, baselineFits: baseline.fits, baselineIssue: baseline.reasons.join('; '),
        extraWordsThatFit: fitWords, extraCharsThatFit: fitWords ? extraChars + 1 : 0,
        headroomPct: Math.round(100 * (fitWords ? extraChars + 1 : 0) / Math.max(1, b.original.length)),
        maxLines, stoppedBecause: firstFail || 'still fitting at +120 words'
      }
    })
  }
})
