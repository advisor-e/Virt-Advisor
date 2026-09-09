# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-09 (third session) · Desktop · branch `feat/firm-quiz-builder-ui`

Suite **8,800 green** at push; 50 ahead, 0 behind master; nothing uncommitted. Four commits
pushed: `4a44b94` (radio registered, three print faults), `7c46f8a` (a loaded report keeps its
bands), `8688151` (a pick ends the search), `59f410a` (4.70 closed).

**4.70 CLOSED by Mike** after his own walk on a real client's export and print. Five faults the
suite could not see were found and fixed the same day; the print was eyeballed page by page on
A4 landscape. Closure on `features/to-do-done-and-parked.md` §2; the Brief's Known state names
the faults.

**Two lessons that generalise:** an unregistered Buefy tag renders nothing and no test notices
(third time — register it in `plugins/buefy.js` and look); and Chrome lays an A4 landscape sheet
out at 842px, so any `max-width` phone breakpoint must be `screen and`.

**Desktop tooling:** PyMuPDF is installed in the machine's Python, so a PDF Mike prints can be
rendered to images and read page by page.

**LAPTOP:** 4.78 untouched; the Handbook was republished from there four times today. Shared
files changed here: `plugins/buefy.js` (Radio added) and the dashboard-report components only.

**Next:** 4.80 (the "global manager" rename) is the only open desktop-sized job. Six live items;
four wait on Mike.
