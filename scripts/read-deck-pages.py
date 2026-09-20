"""Read a page of Mike's own decks — the words, the shapes, the colours and the geometry.

WHY THIS EXISTS. `design/features/strategy-planner.md` §"HOW A CONCEPT IS DRAWN"
makes five steps mandatory before any concept is drawn, and every one of them is a
PDF read: his page rect, his text SPANS with their own size and colour, his vector
paths with their type and opacity, and a 150dpi render to sample his colours off.
Until this file existed the method lived only in prose and in one laptop's shell
history — so the desktop could not draw a concept at all, and the failure read as a
missing library rather than a missing tool. Item 15.5.

🔴 IT READS HIS PAGE. IT NEVER SHIPS HIS PAGE.
`scripts/render-deck-slides.py` (deleted, `065bff1e`) rendered his slides into
`static/planning-slides/` for the app to serve, and Mike undid it the same day:
*"they look cheap and more importantly, they lock in the Advisor-e logo and in
client dealings, Advisor-e ALWAYS clones and shows that ADVISORS firm logo - never
advisor-e."* Every page of his decks carries `advisor-e.com`, the cyan border and
his page number BURNED INTO THE PIXELS. So the renders this tool writes are for
LOOKING AT and SAMPLING FROM, on the way to a drawing that can carry the advisor's
own mark. `refuse_inside_repo()` below enforces that: the output directory must sit
outside the repository, and the tool exits rather than write one byte inside it.

🔴 PYTHON IS A DEVIATION AND IS SAID SO OUT LOUD, exactly as the deleted script did.
Nothing else here uses it. It is here because reading a PDF needs a PDF engine, and
the only alternative was an npm PDF engine in `package.json` — under `engine-strict`
and the Node 14.15 lock, which is a WORSE outcome for the Stack Constitution than a
file npm never sees. This runs when a concept is being DRAWN. Never on install,
never in a test, never in the app, and it adds no runtime surface whatsoever.

WHAT IS AUTHORED HERE: the deck id to filename map, and nothing else. Every number,
word and colour this emits is read off his page.

Requires: pymupdf.  Install: pip install -r scripts/requirements-deck-reader.txt

Usage:
  python scripts/read-deck-pages.py <deck> <page>   read one page, for drawing it
  python scripts/read-deck-pages.py --register      the 37 slides + deck-pages.json
  python scripts/read-deck-pages.py --list          the decks and their files
  python scripts/read-deck-pages.py --self-check    prove the reader against 5 known facts

  --out DIR   where to write (default: a folder in the system temp directory)
"""
import argparse
import json
import math
import os
import re
import sys
import tempfile

# A Windows console defaults to cp1252 and this file's own output carries the
# curly quotes and arrows of Mike's decks. Without this the tool dies on its
# closing line having done all its work — which reads as a failed read.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import pymupdf
except ImportError:  # loud, not silent — a missing engine must never look like "no content"
    sys.exit('pymupdf is not installed.\n'
             '  pip install -r scripts/requirements-deck-reader.txt\n'
             'Nothing in the app needs it: this tool runs only when a concept is drawn.')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, 'data', 'strategy-frameworks.json')

# Mike's decks, outside this repository — the same folder `read-capture-tables.js`
# takes the fill-in templates from. Override for another machine with ADVISOR_DECKS.
SOURCE = os.environ.get('ADVISOR_DECKS', r'C:\Documents\Visual Code Projects\Strategy Planner')

DECKS = {
    'business-targets': 'Advance.1.Bizz Targets.pdf',
    'strategic-orientation-1': 'Advance.2.Strategic Orientation.1.pdf',
    'strategic-orientation-2': 'Advance.2B.Strategic Orientation.2.pdf',
    'sales-marketing': 'Advance.5.Sales & Mktg Review.pdf',
    'organisational-review': 'Advance.6.Organisational Review.pdf',
}

# A concept whose page came from an agenda slide has no page of its own.
AGENDA = 'agenda'

# The drawings are authored on a 1500px-wide viewBox, so every measurement this
# tool reports is pre-multiplied into that space — Strategic Orientation 2 is
# 720x405pt, giving 2.0833. Step 3: the first Porter's attempt GUESSED 540pt and
# every text block overran the sheet.
VIEWBOX_WIDTH = 1500

# Step 4 samples colours off a 150dpi render. The register's slides are 1100px
# wide: enough for the plan document's slide-shaped page on a retina screen.
SAMPLE_DPI = 150
REGISTER_WIDTH = 1100
REGISTER_QUALITY = 75

# get_text span flags. Bit 1 is italic, bit 4 is bold; the rest (superscript,
# serifed, monospaced) do not change how a span is drawn.
FLAG_ITALIC = 1 << 1
FLAG_BOLD = 1 << 4


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def hex_from_int(value):
    """A get_text span colour (packed sRGB int) as #rrggbb."""
    if value is None:
        return None
    return '#%06X' % (int(value) & 0xFFFFFF)


def hex_from_floats(rgb):
    """A get_drawings colour (three 0..1 floats) as #rrggbb, or None."""
    if not rgb:
        return None
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(round(c * 255)))) for c in rgb)


def luminance(rgb):
    """Perceived brightness, for dropping the darkest samples in a ring."""
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def distance(a, b):
    """Straight-line distance between two 0-255 RGB triples."""
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def rounded(value, places=2):
    return round(float(value), places)


def refuse_inside_repo(out_dir):
    """Enforce Mike's white-label ruling in code, not in a comment.

    A render of his page carries advisor-e.com burned into the pixels. Nothing
    this tool writes may become a committed asset, so the output directory must
    sit outside the repository — and the tool stops rather than be talked into it.
    """
    resolved = os.path.abspath(out_dir)
    if resolved == ROOT or resolved.startswith(ROOT + os.sep):
        sys.exit('Refusing to write inside the repository: %s\n'
                 'A render of his page carries the advisor-e.com logo burned into it '
                 '(his ruling, 2026-09-18). These files are for looking at and sampling '
                 'from, never for committing. Choose a directory outside %s.' % (resolved, ROOT))
    return resolved


def open_deck(deck):
    if deck not in DECKS:
        sys.exit('Unknown deck "%s". Known: %s' % (deck, ', '.join(sorted(DECKS))))
    path = os.path.join(SOURCE, DECKS[deck])
    if not os.path.exists(path):
        sys.exit('Deck not found: %s\n'
                 'Set ADVISOR_DECKS to the folder holding Mike\'s decks.' % path)
    return pymupdf.open(path)


# ---------------------------------------------------------------------------
# Step 2 — the words, ONE ENTRY PER SPAN
# ---------------------------------------------------------------------------

def read_spans(page, scale):
    """Every text span with its own size, weight, italic and colour.

    🔴 ONE ENTRY PER SPAN, NEVER PER LINE. On the 8 Profit Levers page
    "= Total Revenue" is a small space followed by a 39.6pt bold navy phrase. A
    reader that takes a line's first span drew it at 20.8pt grey — the size of
    the space. Found 2026-09-18 in our own tooling.

    `pinWidth` is the measured advance width for `textLength` + `lengthAdjust`
    (step 3b), which reproduces his justified copy and makes the block immune to
    font-metric differences. It is DELIBERATELY None on rotated text: a rotated
    bbox is not an advance width.
    """
    out = []
    for block in page.get_text('dict')['blocks']:
        if block.get('type') != 0:  # 0 is text; 1 is an image
            continue
        for line in block.get('lines', []):
            direction = line.get('dir', (1.0, 0.0))
            rotated = abs(direction[1]) > 1e-6
            angle = -math.degrees(math.atan2(direction[1], direction[0])) if rotated else 0.0
            for span in line.get('spans', []):
                text = span.get('text', '')
                if not text.strip():
                    continue
                bbox = span['bbox']
                origin = span.get('origin', (bbox[0], bbox[3]))
                flags = int(span.get('flags', 0))
                out.append({
                    'text': text,
                    'x': rounded(bbox[0] * scale),
                    'y': rounded(origin[1] * scale),
                    'size': rounded(span.get('size', 0) * scale),
                    'font': span.get('font'),
                    'bold': bool(flags & FLAG_BOLD),
                    'italic': bool(flags & FLAG_ITALIC),
                    'colour': hex_from_int(span.get('color')),
                    'pinWidth': None if rotated else rounded((bbox[2] - bbox[0]) * scale),
                    'rotated': rotated,
                    'angle': rounded(angle) if rotated else 0,
                    'bbox': [rounded(v * scale) for v in bbox],
                })
    return out


def read_words(page, scale):
    """Every word with its own x — the primitive a table read needs.

    PyMuPDF merges some of the deck's blocks across columns, so filtering BLOCKS
    by x-position drops whole cells (Brief §8, rule 3 — it cost 8 of Sales &
    Marketing's 16 rows). Every word carries its own x, so a column can be found.
    """
    return [{
        'text': w[4],
        'x0': rounded(w[0] * scale), 'y0': rounded(w[1] * scale),
        'x1': rounded(w[2] * scale), 'y1': rounded(w[3] * scale),
    } for w in page.get_text('words')]


# ---------------------------------------------------------------------------
# The shapes — type and opacity read BEFORE any colour
# ---------------------------------------------------------------------------

def subpaths(items, scale):
    """Turn PyMuPDF's item list into SVG subpaths, CHAINING consecutive segments.

    🔴 A SHAPE IS ITS PATH, NEVER ITS BOUNDING BOX, and both ways of getting that
    wrong were found on Product Fit Review (2026-09-18). His "Resistance" marker
    is a rotated diagonal bar of FOUR separate line items forming one
    quadrilateral: drawn from its bbox it becomes a solid navy rectangle across a
    third of the page, and started as four subpaths it is unfillable and renders
    hollow. Consecutive segments whose endpoints meet are one subpath.
    """
    paths = []
    current = []
    last_point = None

    def flush():
        if current:
            paths.append(' '.join(current))

    def point(p):
        return '%s %s' % (rounded(p.x * scale), rounded(p.y * scale))

    def meets(p):
        return last_point is not None and abs(p.x - last_point.x) < 0.01 and abs(p.y - last_point.y) < 0.01

    for item in items:
        kind = item[0]
        if kind == 're':
            flush()
            current, last_point = [], None
            r = item[1]
            x0, y0 = rounded(r.x0 * scale), rounded(r.y0 * scale)
            x1, y1 = rounded(r.x1 * scale), rounded(r.y1 * scale)
            paths.append('M %s %s H %s V %s H %s Z' % (x0, y0, x1, y1, x0))
        elif kind == 'qu':
            flush()
            current, last_point = [], None
            q = item[1]
            corners = [q.ul, q.ur, q.lr, q.ll]
            paths.append('M ' + ' L '.join(point(c) for c in corners) + ' Z')
        elif kind == 'l':
            start, end = item[1], item[2]
            if not meets(start):
                flush()
                current = ['M ' + point(start)]
            current.append('L ' + point(end))
            last_point = end
        elif kind == 'c':
            start, c1, c2, end = item[1], item[2], item[3], item[4]
            if not meets(start):
                flush()
                current = ['M ' + point(start)]
            current.append('C %s %s %s' % (point(c1), point(c2), point(end)))
            last_point = end
    flush()
    return paths


def page_role(rect, page_rect):
    """Is this shape the page's own furniture rather than his content?

    🔴 DROP CHROME BY ROLE, NEVER BY COLOUR OR BY FILL. Two filters written the
    other way became faults of their own: "drop black fills" ate the A.I.D.C.R.A
    header row (white on black), and "drop #00B1E0" deleted column two of Price
    For Problem Solving. The page frame is a THIN BAR HARD AGAINST AN EDGE — that
    is what makes it chrome, and width is not part of the test, because the bottom
    rule is drawn in two segments either side of the logo, one only 95 wide.

    ⚠ BOTH THRESHOLDS ARE A FRACTION OF THE PAGE, NEVER A COUNT OF POINTS. Written
    as a flat 6pt this missed the frame on Strategic Orientation 2, which is 7.08pt
    thick — and a rule that works only on decks of one size is a rule that will be
    silently wrong on the next deck rather than loudly wrong on this one.
    """
    page_w = page_rect.x1 - page_rect.x0
    page_h = page_rect.y1 - page_rect.y0
    shorter = min(page_w, page_h)
    width, height = rect.x1 - rect.x0, rect.y1 - rect.y0

    # His whole-page white backing plate is furniture too. Left as content it
    # makes a page of photographs report vector artwork that is not there.
    if width >= page_w * 0.95 and height >= page_h * 0.95:
        return 'page-background'

    if min(width, height) > shorter * 0.025:
        return None
    margin = shorter * 0.02
    against = (rect.x0 <= page_rect.x0 + margin or rect.x1 >= page_rect.x1 - margin or
               rect.y0 <= page_rect.y0 + margin or rect.y1 >= page_rect.y1 - margin)
    return 'page-frame' if against else None


def looks_like_a_plate(rect, page_rect):
    """PowerPoint's invisible plates behind his title and his logo.

    Sampling reads the page THROUGH them: his logo came back as a blue block and
    his title got a cyan band lifted off the border behind it. The logo test is
    "low and to the left" AND A WIDTH GUARD — at position alone it also ate the
    grey "Other" cells on the persona table.
    """
    width = rect.x1 - rect.x0
    page_w, page_h = page_rect.x1 - page_rect.x0, page_rect.y1 - page_rect.y0
    low_and_left = rect.y0 > page_rect.y0 + page_h * 0.85 and rect.x1 < page_rect.x0 + page_w * 0.35
    return low_and_left and width < page_w * 0.25


def read_drawings(page, scale, sampler):
    """Every vector shape, with the three values that decide whether it paints.

    🔴 THE SAME TRAP THREE TIMES: A VALUE THAT IS DECLARED AND NEVER PAINTED.
    Read `type` AND opacity, never a colour on its own.

    - `type` decides whether a fill applies. PyMuPDF reports fill (0,0,0) on
      stroke-only paths, so a reader that trusts the colour treats every unfilled
      curve as a filled black shape and drops it. FOUR PAGES read as "no vector
      content" when they had plenty, the Sigmoid among them.
    - Opacity decides whether it paints at all. Pine's five staged boxes declare a
      black fill at opacity 0 with a gold stroke: the fill never appears.
      Ignoring it filled all five solid black.
    - A gradient is INVISIBLE to the reader — PyMuPDF cannot see one and reports
      the shape as stroke-only, indistinguishable from a genuinely hollow box.
      Left alone the Horizontal Integration banners render white. Those are the
      shapes handed to the sampler, and the flat colour it returns is a STATED
      deviation from his gradient, never a silent one.
    """
    page_rect = page.rect
    out = []
    for d in page.get_drawings():
        kind = d.get('type')
        fill_rgb, stroke_rgb = d.get('fill'), d.get('color')
        fill_opacity = d.get('fill_opacity', 1)
        stroke_opacity = d.get('stroke_opacity', 1)
        if fill_opacity is None:
            fill_opacity = 1
        if stroke_opacity is None:
            stroke_opacity = 1

        paints_fill = kind in ('f', 'fs') and fill_rgb is not None and fill_opacity > 0
        paints_stroke = kind in ('s', 'fs') and stroke_rgb is not None and stroke_opacity > 0
        rect = d['rect']
        items = d.get('items', [])

        shape = {
            'type': kind,
            'items': len(items),
            'closePath': d.get('closePath'),
            'fill': hex_from_floats(fill_rgb) if paints_fill else None,
            'stroke': hex_from_floats(stroke_rgb) if paints_stroke else None,
            'strokeWidth': rounded((d.get('width') or 0) * scale),
            'fillOpacity': rounded(fill_opacity, 3),
            'strokeOpacity': rounded(stroke_opacity, 3),
            'paints': paints_fill or paints_stroke,
            'declaredFill': hex_from_floats(fill_rgb),
            'declaredStroke': hex_from_floats(stroke_rgb),
            'role': page_role(rect, page_rect),
            'rect': [rounded(v * scale) for v in (rect.x0, rect.y0, rect.x1, rect.y1)],
            'paths': subpaths(items, scale),
            'sampledFill': None,
            'sampleNote': None,
        }

        # Only an outline with no readable fill is a candidate for sampling: that
        # is the gradient case. One item is a hatching stroke, not an outline —
        # a diagonal line has a wide bbox and no inside, which is how two of the
        # Sigmoid's strokes were handed fills. closePath is NOT the test; his
        # rounded banners report False and are plainly areas.
        if paints_stroke and not paints_fill and len(items) > 1:
            if looks_like_a_plate(rect, page_rect):
                shape['sampleNote'] = 'placeholder: a plate low and to the left, behind his logo'
            else:
                sampled, note = sampler['ring'](rect, hex_from_floats(stroke_rgb))
                shape['sampledFill'] = sampled
                shape['sampleNote'] = note
        elif not paints_fill and not paints_stroke:
            shape['sampleNote'] = 'declared but never painted — type %s, fill opacity %s' % (
                kind, rounded(fill_opacity, 3))

        out.append(shape)
    return out


# ---------------------------------------------------------------------------
# Step 4 — sample the colours off a 150dpi render
# ---------------------------------------------------------------------------

def make_sampler(pixmap, page_rect):
    """A sampler over the rendered page: `ring` for a shape, `dominant` for a picture.

    Step 4 of the method is "sample the colours off a 150dpi render, DOMINANT
    COLOUR PER SHAPE" — it does not say read the vector fills, and Porter's page
    is why. Its ring and its five circles are TEN IMAGES; the only vector fills on
    the page are the white backing plate and the five pieces of Advisor-e's cyan
    frame. A reader that reports fills reports `#FFFFFF #00B1E0` and loses every
    colour in the concept.

    `ring` is the narrower case below — a vector outline whose fill is a gradient
    the reader cannot see at all.

    1. AVERAGE the samples; never demand an identical repeat. A gradient never
       gives the same pixel twice, which is the one case sampling exists for.
       Asking for three matching pixels threw away 10 of 13 fills on Horizontal
       Integration.
    2. Sample a RING JUST INSIDE THE EDGE, not the middle, and DROP THE DARKEST
       QUARTER. His banners carry navy text across the centre; averaging it in
       dragged a pale lavender panel down to a mid slate.
    3. No outline and no readable fill means placeholder (handled by the caller).
    4. A SAMPLE THAT MATCHES THE OUTLINE IS THE OUTLINE. On a shallow box the ring
       lands on its own border: Pine's five staged boxes are white with a gold
       edge, and sampling filled all five solid gold.
    """
    scale = pixmap.width / (page_rect.x1 - page_rect.x0)
    stride, components = pixmap.stride, pixmap.n
    data = pixmap.samples

    def pixel(px, py):
        px = max(0, min(pixmap.width - 1, int(px)))
        py = max(0, min(pixmap.height - 1, int(py)))
        base = py * stride + px * components
        return (data[base], data[base + 1], data[base + 2])

    def sample(rect, outline_hex):
        width, height = rect.x1 - rect.x0, rect.y1 - rect.y0
        if width < 2 or height < 2:
            return None, 'too small to sample'

        # Rule 2 — a ring just inside the edge. 12% of the smaller side, held
        # between 1.5pt and 6pt so a deep banner is not sampled at its middle.
        inset = max(1.5, min(6.0, min(width, height) * 0.12))
        x0, y0 = (rect.x0 + inset) * scale, (rect.y0 + inset) * scale
        x1, y1 = (rect.x1 - inset) * scale, (rect.y1 - inset) * scale
        if x1 <= x0 or y1 <= y0:
            return None, 'too shallow for a ring inside its own border'

        steps = 16
        points = []
        for i in range(steps):
            t = i / float(steps - 1)
            points.append((x0 + (x1 - x0) * t, y0))
            points.append((x0 + (x1 - x0) * t, y1))
            points.append((x0, y0 + (y1 - y0) * t))
            points.append((x1, y0 + (y1 - y0) * t))

        samples = [pixel(px, py) for px, py in points]
        samples.sort(key=luminance)
        kept = samples[len(samples) // 4:]  # rule 2 — drop the darkest quarter
        if not kept:
            return None, 'nothing left after dropping the darkest quarter'

        # Rule 1 — average, never match.
        average = tuple(int(round(sum(s[i] for s in kept) / float(len(kept)))) for i in range(3))
        found = '#%02X%02X%02X' % average

        # Rule 4 — a sample that matches the outline IS the outline.
        if outline_hex:
            outline = tuple(int(outline_hex[i:i + 2], 16) for i in (1, 3, 5))
            if distance(average, outline) < 24:
                return None, 'the ring landed on its own border (%s) — not a fill' % outline_hex

        return found, 'flat colour standing in for a gradient the reader cannot see'

    def dominant(rect):
        """The dominant colour of a picture: a SYMMETRICALLY TRIMMED MEAN of its ink.

        PowerPoint exports a shape as a picture and shades it, so the region holds
        three things that are not the colour: near-white slide showing through the
        corners of a circle's square rect, a pale antialiased halo at its edge, and
        dark ink where a label or a shadow crosses it. Discarding the light and
        dark TAILS leaves the body of the shape.

        🔴 MEASURED, NOT CHOSEN — against the five colours in the Porter's drawing
        Mike approved (`design/mockups/strategy-concept-porters.html`), whose ring
        and circles are ten images:

            plain mean          average error 5.8 / 255
            modal bucket        worst of the three — a gradient has no mode
            trimmed 20/20       average error 3.9 / 255   ← this
            trimmed 30/30       average error 3.5 / 255

        20% is taken rather than 30% because the curve is flat from 20 to 30 and
        the flattest point is the least fitted to those five samples. ⚠ AND THE
        TRIM IS SYMMETRIC BECAUSE THE ASYMMETRIC ONES ARE FAR WORSE — 11.1 and
        16.1 — which is the evidence that it removes halo and ink rather than
        simply sliding the answer towards a known target.

        ⚠ ABOUT 1.5% OF RANGE REMAINS, AND IT IS NOT ZERO. A sampled colour is
        the starting point for a drawing that is approved beside his page, never
        the last word on it.
        """
        x0, y0 = max(0, int(rect.x0 * scale)), max(0, int(rect.y0 * scale))
        x1 = min(pixmap.width, int(math.ceil(rect.x1 * scale)))
        y1 = min(pixmap.height, int(math.ceil(rect.y1 * scale)))
        if x1 - x0 < 2 or y1 - y0 < 2:
            return None, 'too small to sample'

        # At most ~80 samples a side: a photograph does not need every pixel.
        step_x, step_y = max(1, (x1 - x0) // 80), max(1, (y1 - y0) // 80)
        ink = []
        for py in range(y0, y1, step_y):
            for px in range(x0, x1, step_x):
                rgb = pixel(px, py)
                if rgb[0] > 247 and rgb[1] > 247 and rgb[2] > 247:
                    continue  # the slide behind the artwork, not the artwork
                ink.append(rgb)

        if not ink:
            return None, 'nothing but white inside this region'
        ink.sort(key=luminance)
        cut = len(ink) * 20 // 100
        kept = ink[cut:len(ink) - cut] or ink
        average = tuple(int(round(sum(s[i] for s in kept) / float(len(kept)))) for i in range(3))
        return ('#%02X%02X%02X' % average,
                'trimmed mean of %d ink samples, %d%% of the region' % (
                    len(kept), round(100.0 * len(ink) / max(1, len(ink) + cut * 2))))

    return {'ring': sample, 'dominant': dominant}


# ---------------------------------------------------------------------------
# The pictures — and their OWN ink bounds, not the region they sit in
# ---------------------------------------------------------------------------

def ink_bounds(doc, xref, placement, scale):
    """The artwork's own ink bounds inside its placement rect.

    🔴 CLIP THE ARTWORK, NEVER THE PAGE REGION IT SITS IN. On Packaging/Bundling
    the tin's placement rect starts at x=549 while his text column runs to
    x=590.8, so clipping to the rect captured a strip of his own prose and pasted
    a photograph of his text on top of the rendered text — every line printed
    twice. The tin's own ink is x=604-690. The symptom reads as a font or
    justification bug and survives every experiment aimed at one.

    Returns None when the image fills its rect, which is the ordinary case.
    """
    try:
        pix = pymupdf.Pixmap(doc, xref)
    except Exception:
        return None
    while pix.width > 400 or pix.height > 400:
        pix.shrink(1)  # scanning a full-size photograph pixel by pixel is pointless
    if pix.n < 3:
        return None

    stride, components, data = pix.stride, pix.n, pix.samples
    has_alpha = pix.alpha
    min_x, min_y, max_x, max_y = pix.width, pix.height, -1, -1
    for py in range(pix.height):
        row = py * stride
        for px in range(pix.width):
            base = row + px * components
            if has_alpha and data[base + components - 1] < 16:
                continue  # transparent padding is not ink
            r, g, b = data[base], data[base + 1], data[base + 2]
            if r > 247 and g > 247 and b > 247:
                continue  # white padding is not ink either
            min_x, min_y = min(min_x, px), min(min_y, py)
            max_x, max_y = max(max_x, px), max(max_y, py)
    if max_x < 0:
        return None

    # Nothing to say when the ink reaches the edges — that is a full-bleed image.
    if min_x <= 1 and min_y <= 1 and max_x >= pix.width - 2 and max_y >= pix.height - 2:
        return None

    pw, ph = placement.x1 - placement.x0, placement.y1 - placement.y0
    return [
        rounded((placement.x0 + pw * (min_x / float(pix.width))) * scale),
        rounded((placement.y0 + ph * (min_y / float(pix.height))) * scale),
        rounded((placement.x0 + pw * ((max_x + 1) / float(pix.width))) * scale),
        rounded((placement.y0 + ph * ((max_y + 1) / float(pix.height))) * scale),
    ]


def read_images(doc, page, scale, sampler):
    """Every raster on the page: where it sits, its own ink bounds, its colour.

    🔴 THE COLOUR MATTERS AS MUCH AS THE POSITION. PowerPoint exports a shape as a
    picture more often than it looks like it — Porter's four ring quadrants and
    five circles are all images — so a reader that samples only vector shapes
    reports a page in Advisor-e cyan and white, and the concept's whole palette
    is lost. Step 4 is per SHAPE, and these are the shapes.

    `inkBounds` is None for an image whose artwork fills its rect, which is the
    ordinary case; it is set when his slide crops the artwork, and then it — not
    the placement rect — is what to clip to.
    """
    out = []
    for info in page.get_image_info(xrefs=True):
        xref = info.get('xref') or 0
        bbox = pymupdf.Rect(info['bbox'])
        colour, note = sampler['dominant'](bbox)
        out.append({
            'xref': xref,
            'pixels': [info.get('width'), info.get('height')],
            'placementRect': [rounded(v * scale) for v in (bbox.x0, bbox.y0, bbox.x1, bbox.y1)],
            'inkBounds': ink_bounds(doc, xref, bbox, scale) if xref else None,
            'dominantColour': colour,
            'colourNote': note,
        })
    return out


# ---------------------------------------------------------------------------
# One page, read
# ---------------------------------------------------------------------------

def read_page(doc, deck, number):
    """Everything the five-step method needs from one page, in one object."""
    if number < 1 or number > doc.page_count:
        sys.exit('%s has no page %d — the data is wrong, not the deck.' % (deck, number))
    page = doc[number - 1]
    rect = page.rect
    scale = VIEWBOX_WIDTH / float(rect.x1 - rect.x0)

    sample_pixmap = page.get_pixmap(matrix=pymupdf.Matrix(SAMPLE_DPI / 72.0, SAMPLE_DPI / 72.0))
    sampler = make_sampler(sample_pixmap, rect)

    drawings = read_drawings(page, scale, sampler)
    images = read_images(doc, page, scale, sampler)

    # The picture-vs-vector test, by the fill rule above rather than by eye.
    # "Check which you have before you start" — a concept whose graphic has no
    # vector content is a picture, and tracing a curve by eye is the one thing
    # this method exists to forbid.
    painting = [d for d in drawings if d['paints'] and d['role'] is None]
    verdict = 'vector' if painting else ('picture' if images else 'empty')

    return {
        'deck': deck,
        'page': number,
        'pageRect': {
            'widthPt': rounded(rect.x1 - rect.x0),
            'heightPt': rounded(rect.y1 - rect.y0),
            'viewBoxWidth': VIEWBOX_WIDTH,
            'scale': rounded(scale, 4),
        },
        'verdict': verdict,
        'counts': {
            'spans': None,  # filled below, after the spans are read
            'drawings': len(drawings),
            'painting': len(painting),
            'chrome': len([d for d in drawings if d['role'] == 'page-frame']),
            'images': len(images),
        },
        'spans': read_spans(page, scale),
        'words': read_words(page, scale),
        'drawings': drawings,
        'images': images,
    }, sample_pixmap


def write_page(out_dir, read, pixmap):
    """The JSON beside the render it was sampled from, so both can be looked at."""
    stem = '%s-p%02d' % (read['deck'], read['page'])
    read['counts']['spans'] = len(read['spans'])
    json_path = os.path.join(out_dir, stem + '.json')
    png_path = os.path.join(out_dir, stem + '@%ddpi.png' % SAMPLE_DPI)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(read, f, indent=1, ensure_ascii=False)
    pixmap.save(png_path)
    return json_path, png_path


# ---------------------------------------------------------------------------
# --register — what build-concept-register.js has been asking for
# ---------------------------------------------------------------------------

# How an instruction spoken to the client is told from a heading. The register
# treats these as a SUGGESTION Mike confirms, never an assignment, so the test is
# deliberately narrow: a page earns an `ask` only on an imperative he actually
# writes. `build-concept-register.js` §"How a RESPONSE page is told" is the caller.
ASKS = re.compile(r'\b(complete the|record your|list your|write down|note down|'
                  r'identify your|fill in the|describe your)\b', re.I)


def deck_pages(doc, deck):
    """Every page of one deck as {page, lines, asks} — the deck-pages.json row.

    `lines[0]` is the page title, which is how the register tells a response page
    from a teaching page; `asks` is the second signal, an instruction spoken to
    the client anywhere on the page.
    """
    pages = []
    for number in range(1, doc.page_count + 1):
        text = doc[number - 1].get_text('text')
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        pages.append({
            'page': number,
            'lines': lines,
            'asks': [ln for ln in lines if ASKS.search(ln)],
        })
    return pages


def register_pages():
    """Every (deck, page) the register needs, from the data rather than a list."""
    with open(DATA, encoding='utf-8') as f:
        data = json.load(f)
    pages = set()
    for c in data['concepts']:
        if c.get('source') != AGENDA:
            pages.add((c['deck'], c['page']))
        if c.get('responsePage'):
            pages.add((c['deck'], c['responsePage']))
    return sorted(pages)


def build_register(out_dir):
    """The slides and deck-pages.json `build-concept-register.js` requires.

    It reads `<dir>/*.jpg` and `<dir>/../deck-pages.json`, so the slides go in a
    `slides/` subfolder and the page index sits beside it. Neither is committed:
    a slide is his page, logo and all.
    """
    slides = os.path.join(out_dir, 'slides')
    os.makedirs(slides, exist_ok=True)

    opened = {}
    written = 0
    for deck, number in register_pages():
        if deck not in opened:
            opened[deck] = open_deck(deck)
        doc = opened[deck]
        if number > doc.page_count:
            sys.exit('%s has no page %d — the data is wrong, not the deck.' % (deck, number))
        page = doc[number - 1]
        zoom = REGISTER_WIDTH / float(page.rect.width)
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        pix.pil_save(os.path.join(slides, '%s-p%02d.jpg' % (deck, number)),
                     format='JPEG', quality=REGISTER_QUALITY, optimize=True)
        written += 1

    index = {}
    for deck in sorted(DECKS):
        if deck not in opened:
            opened[deck] = open_deck(deck)
        index[deck] = deck_pages(opened[deck], deck)

    index_path = os.path.join(out_dir, 'deck-pages.json')
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=1, ensure_ascii=False)

    asks = sum(len(p['asks']) for d in index.values() for p in d)
    print('')
    print('Register inputs built.')
    print('  %d slides written to %s' % (written, slides))
    print('  %d deck pages indexed, %d carrying an instruction to the client' % (
        sum(len(p) for p in index.values()), asks))
    print('  written to %s' % index_path)
    print('')
    print('  Next: node scripts/build-concept-register.js --images "%s"' % slides)
    print('')


# ---------------------------------------------------------------------------
# --self-check — prove the reader against facts recorded BEFORE it existed
# ---------------------------------------------------------------------------

# Porter's five colours, from the drawing Mike approved — NOT from this tool.
# `design/mockups/strategy-concept-porters.html`.
PORTERS = ['#F47D2F', '#474747', '#75A157', '#519AD9', '#3A6FC8']


def nearest(found, wanted):
    """The closest sampled colour to one of his, and how far off it is."""
    if not found:
        return None, None
    target = tuple(int(wanted[i:i + 2], 16) for i in (1, 3, 5))
    best = min(found, key=lambda h: distance(tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)), target))
    return best, distance(tuple(int(best[i:i + 2], 16) for i in (1, 3, 5)), target)


def self_check(out_dir):
    """Run the reader against the five recorded facts and print what it found.

    This prints rather than asserts, because the measure is a person comparing
    what came back with what the Brief says — the same side-by-side that caught
    every fault in the method. A test that pinned these numbers would pass on a
    reader that had memorised them.
    """
    print('')
    print('SELF-CHECK — the reader against five facts recorded before it existed.')
    print('Compare each line with design/features/strategy-planner.md, "HOW A CONCEPT IS DRAWN".')
    print('')

    doc = open_deck('strategic-orientation-2')

    read, _ = read_page(doc, 'strategic-orientation-2', 13)
    print('1. GEOMETRY   expected 720x405pt, scale 2.0833')
    print('   found      %sx%spt, scale %s' % (
        read['pageRect']['widthPt'], read['pageRect']['heightPt'], read['pageRect']['scale']))

    # Step 4 is "dominant colour per SHAPE", and on this page the shapes that
    # carry his palette are images, not vector fills.
    palette = []
    for d in read['drawings']:
        if d['role']:
            continue
        for colour in (d['fill'], d['sampledFill']):
            if colour and colour not in palette:
                palette.append(colour)
    for m in read['images']:
        if m['dominantColour'] and m['dominantColour'] not in palette:
            palette.append(m['dominantColour'])
    print('2. PALETTE    expected Porter\'s five, from the drawing Mike approved.')
    print('              Its ring and circles are TEN IMAGES, so these are sampled,')
    print('              never read off a vector fill.')
    worst = 0
    for wanted in PORTERS:
        best, gap = nearest(palette, wanted)
        worst = max(worst, gap or 0)
        print('   %s  ->  %s   %.1f of 255  (%.1f%%)' % (wanted, best, gap, 100 * gap / 255.0))
    print('   worst gap  %.1f%% of range — see `dominant()` on why it is not zero' %
          (100 * worst / 255.0))
    inks = sorted(set(s['colour'] for s in read['spans'] if s['colour']))
    print('   ink        expected #002B64 among the text colours')
    print('   found      %s' % ' '.join(inks[:8]))

    levers, _ = read_page(doc, 'strategic-orientation-2', 39)
    hits = [s for s in levers['spans'] if 'Total Revenue' in s['text']]
    print('3. SPAN       expected "= Total Revenue" at 39.6pt bold navy, not the')
    print('              20.8pt grey of the space before it')
    if hits:
        for s in hits:
            print('   found      %-17s %spt  bold=%s  %s' % (
                s['text'].strip(), s['size'], s['bold'], s['colour']))
    else:
        print('   found      NO span carrying "Total Revenue" on p39')

    # "FOUR PAGES read as 'no vector content' when they had plenty, the Sigmoid
    # among them — which would then have been traced by hand." The Sigmoid is
    # p30. A reader that treats PyMuPDF's (0,0,0) on a stroke-only path as a
    # filled black shape drops every one of them and reports a picture.
    sigmoid, _ = read_page(doc, 'strategic-orientation-2', 30)
    strokes = [d for d in sigmoid['drawings'] if d['stroke'] and not d['fill']]
    print('4. STROKE     expected the Sigmoid (p30) to report VECTOR — a reader that')
    print('              trusts fill colour over `type` reports no vector content')
    print('   found      %s, %d stroke-only paths among %d shapes' % (
        sigmoid['verdict'], len(strokes), sigmoid['counts']['drawings']))

    # "Pine's five staged boxes declare a BLACK FILL AT OPACITY 0 with a gold
    # stroke: the fill never appears. Ignoring opacity filled all five solid
    # black and blacked out his blue arrows with them."
    pine, _ = read_page(doc, 'strategic-orientation-2', 17)
    ghosts = [d for d in pine['drawings']
              if d['declaredFill'] and not d['fill'] and d['fillOpacity'] == 0]
    print('5. OPACITY    expected Progression of Economic Value (p17) to declare fills')
    print('              at opacity 0 that this reader refuses to paint')
    print('   found      %d declared fills never painted, of %d shapes' % (
        len(ghosts), pine['counts']['drawings']))
    for g in ghosts[:5]:
        print('              declared %s at opacity %s — not painted' % (
            g['declaredFill'], g['fillOpacity']))

    print('')
    print('⚠ Sizes and positions are in the %dpx viewBox the drawings are authored' % VIEWBOX_WIDTH)
    print('  in — divide by the scale above for points.')
    print('')
    print('⚠ A colour within a point or two of his is a STARTING POINT, not a verdict.')
    print('  Every fault in this method was caught by putting the drawing beside his')
    print('  page, and none was caught by a number.')
    print('')


# ---------------------------------------------------------------------------

def default_out():
    """Outside the repository by construction, and the same place every run.

    The handbook build already writes to the system temp directory; this follows
    it, so nothing has to remember a path and nothing can drift into `static/`.
    """
    return os.path.join(tempfile.gettempdir(), 'advisor-e-deck-reads')


def main():
    parser = argparse.ArgumentParser(
        description="Read a page of Mike's decks — words, shapes, colours, geometry.")
    parser.add_argument('deck', nargs='?', help='deck id (--list shows them)')
    parser.add_argument('page', nargs='?', type=int, help='1-based page number')
    parser.add_argument('--out', default=default_out(), help='output directory, outside the repo')
    parser.add_argument('--register', action='store_true',
                        help='build the slides and deck-pages.json the register needs')
    parser.add_argument('--list', action='store_true', help='the decks and their files')
    parser.add_argument('--self-check', action='store_true',
                        help='run the reader against five facts the Brief already records')
    args = parser.parse_args()

    if args.list:
        print('')
        for deck in sorted(DECKS):
            path = os.path.join(SOURCE, DECKS[deck])
            mark = ' ' if os.path.exists(path) else '  MISSING —'
            print('  %-26s%s %s' % (deck, mark, DECKS[deck]))
        print('')
        print('  decks read from %s' % SOURCE)
        print('')
        return

    out_dir = refuse_inside_repo(args.out)
    os.makedirs(out_dir, exist_ok=True)

    if args.self_check:
        self_check(out_dir)
        return

    if args.register:
        build_register(out_dir)
        return

    if not args.deck or not args.page:
        parser.error('give a deck and a page, or --register, --list or --self-check')

    doc = open_deck(args.deck)
    read, pixmap = read_page(doc, args.deck, args.page)
    json_path, png_path = write_page(out_dir, read, pixmap)

    print('')
    print('%s page %d read.' % (args.deck, args.page))
    print('  %spt x %spt — scale %s for a %dpx viewBox' % (
        read['pageRect']['widthPt'], read['pageRect']['heightPt'],
        read['pageRect']['scale'], VIEWBOX_WIDTH))
    print('  %s — %d spans, %d words, %d shapes (%d paint, %d chrome), %d images' % (
        read['verdict'].upper(), read['counts']['spans'], len(read['words']),
        read['counts']['drawings'], read['counts']['painting'],
        read['counts']['chrome'], read['counts']['images']))
    sampled = [d for d in read['drawings'] if d['sampledFill']]
    if sampled:
        print('  %d gradient fills sampled off the render — a STATED flat stand-in, '
              'not his gradient' % len(sampled))
    print('  %s' % json_path)
    print('  %s' % png_path)
    print('')
    print('  Step 1 is to LOOK at that render beside the drawing. Nothing below it')
    print('  substitutes for the side-by-side — every fault in this method was')
    print('  caught that way and none was caught by a test.')
    print('')


main()
