"""Render the deck pages the app serves, straight out of Mike's own decks.

WHY THIS EXISTS. Mike's ruling, 2026-09-18: *"continue the build - using the
graphics and tables you now have."* Every concept is to be presented AS IT
CURRENTLY APPEARS in his slides, and the most faithful way to do that is to show
his slide. This replaces Stage 4 of the Brief — twenty-one diagrams redrawn by
hand — with a rendering job, after a hand-drawn Porter's put three of its four
forces in the wrong place.

🔴 IT RENDERS ONLY WHAT THE DATA ASKS FOR. A concept's own page, and its response
page where one is recorded. A concept listed only on an agenda slide has no page
of its own, so it gets no image — showing it the agenda would be worse than
showing it nothing.

🔴 PYTHON IS A DEVIATION AND IS SAID SO OUT LOUD. Nothing else in this repository
uses it. It is here because rendering a PDF page needs a PDF engine, and the
alternative was hand-drawing his slides again. It runs when HIS DECKS CHANGE —
never on install, never in a test, never in the app. The images it writes are
committed, so no one else needs it to run the app.

Requires: pymupdf.  Usage:  python scripts/render-deck-slides.py [--check]
"""
import json
import os
import sys

try:
    import pymupdf
except ImportError:  # loud, not silent — a missing engine must not look like "no slides"
    sys.exit('pymupdf is not installed. `pip install pymupdf`, or leave the committed '
             'images alone — they are only rebuilt when Mike\'s decks change.')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, 'data', 'strategy-frameworks.json')
OUT = os.path.join(ROOT, 'static', 'planning-slides')

# Mike's decks, outside this repository — the same folder read-capture-tables.js
# takes the fill-in templates from.
SOURCE = r'C:\Documents\Visual Code Projects\Strategy Planner'
DECKS = {
    'business-targets': 'Advance.1.Bizz Targets.pdf',
    'strategic-orientation-1': 'Advance.2.Strategic Orientation.1.pdf',
    'strategic-orientation-2': 'Advance.2B.Strategic Orientation.2.pdf',
    'sales-marketing': 'Advance.5.Sales & Mktg Review.pdf',
    'organisational-review': 'Advance.6.Organisational Review.pdf',
}

# Wide enough for the plan document's slide-shaped page on a retina screen, and
# small enough that the whole set is a couple of megabytes.
WIDTH = 1100
QUALITY = 75

# A concept whose page came from an agenda slide has no page of its own.
AGENDA = 'agenda'


def wanted():
    """Every (deck, page) the app serves, from the data rather than a list."""
    with open(DATA, encoding='utf-8') as f:
        data = json.load(f)
    pages = set()
    for c in data['concepts']:
        if c.get('source') != AGENDA:
            pages.add((c['deck'], c['page']))
        if c.get('responsePage'):
            pages.add((c['deck'], c['responsePage']))
    return sorted(pages)


def name(deck, page):
    return '%s-p%02d.jpg' % (deck, page)


def main():
    check = '--check' in sys.argv
    pages = wanted()
    if not check:
        os.makedirs(OUT, exist_ok=True)

    missing = []
    written = 0
    opened = {}
    for deck, page in pages:
        target = os.path.join(OUT, name(deck, page))
        if check:
            if not os.path.exists(target):
                missing.append(name(deck, page))
            continue
        if deck not in opened:
            opened[deck] = pymupdf.open(os.path.join(SOURCE, DECKS[deck]))
        doc = opened[deck]
        if page > doc.page_count:
            sys.exit('%s has no page %d — the data is wrong, not the deck.' % (deck, page))
        slide = doc[page - 1]
        zoom = WIDTH / slide.rect.width
        pix = slide.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        pix.pil_save(target, format='JPEG', quality=QUALITY, optimize=True)
        written += 1

    if check:
        if missing:
            sys.exit('%d slide(s) the data asks for are not committed: %s'
                     % (len(missing), ', '.join(missing)))
        print('All %d slides the data asks for are present.' % len(pages))
        return

    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print('%d slides rendered to static/planning-slides (%d KB).' % (written, total / 1024))


main()
