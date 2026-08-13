# The Handbook — the History

## Why it exists at all

`design/` had grown to 120 files and over 25,000 lines, more than half of it dated session notes.
Answering *"how is a report model built and formatted?"* meant reading across **22 files** and
discarding most of what you read — and the current rule and the historical argument that produced
it sat on the page with equal weight. That is how drift kept winning: they looked the same.

The split into a **Brief** (current rules) and a **History** (everything else) was made on
2026-08-13, 24 pages in one session. Six of the eleven Mentor Hub tabs had never had a page of
their own. Collaborate turned out to be a whole application rather than a feature and was split
into three.

## The rebuild that produced most of these rules

**2026-08-13.** The generator lived in a session-scoped temporary folder, and a note recorded that
it had been deleted when that session ended. It had not. It was still on the machine, and `find`
located it in four seconds — **after** a replacement had already been written from a prose
description of the page: a different palette, the History promoted out of its gate into a separate
page, and the reload-survival of edits lost entirely.

Every check passed throughout, because **every check compares the code to the note, and nothing
compared the build to the artefact.** The rule requiring an artefact to be committed before
approval already existed and did not fire, because the design had no footprint in the repository
at all — nothing referenced it, so nothing could notice it was missing.

Mike's reaction is the rule in §2.1: *"no point us going to all the work to develop a mockup if
you make up your own [design] anyway when it comes time to finish the task."*

**What was done instead of arguing:** the shell was restored byte-for-byte (matching MD5), and
the rebuild's value was kept where it was real — the index-driven navigation, the guards, the
tests. The restored build was then proven against the original's own output: identical 24 page
ids, identical 24 gates, byte-identical stylesheet.

## Three faults in the original generator, fixed rather than preserved

1. **It typed its 24 pages and their groups into the script by hand.** A new Brief stayed
   invisible until somebody remembered it — and the groups had *already* drifted from the index,
   showing "The tier model" and "Collaborate" where `README.md` said "Management" and "The adviser
   network". Hence rule 3: the index is the single source.
2. **It hardcoded `c:/Users/mb/Projects/Virt Advisor`.** It ran on the laptop and nowhere else.
3. **It substituted its slots with `String.replace`**, which fills the first match only. The
   rebuild put the placeholder names in the shell's own comment, so every article was substituted
   *into the comment*: a 412 KB page, no error, and nothing on screen. `substitute()` now counts
   occurrences and refuses to build otherwise.

## What was tried and rejected

- **Publishing the rebuilt design to a second link so the two could be compared.** Rejected: two
  Handbooks is the failure, not the comparison.
- **Fetching the published page to recover the design.** It would have pulled 400 KB of content
  back through the session and returned the text, not the stylesheet — the wrong tool for the
  question.
- **A document restating "always check the artefact".** That is what already existed. The
  register and the pin test replaced it, because a document is what failed.

## Two deliberate departures from the original's output

- **The nav link now carries its status dot.** The rail's own legend explains "never opened" and
  "not opened in 3 weeks", and the stylesheet styles them, but the original emitted no element —
  so neither mark could ever appear.
- **The two drifted group names now follow the index.**

## Known gap

`[../i18n-*](../)` in [`localisation-and-currency-history.md`](localisation-and-currency-history.md)
stays a dead relative link, because the rewrite needs at least one character after `../`.
Identical in the original. Pinned as a ⚠ CURRENT BEHAVIOUR test rather than quietly changed.

## Where the older records went stale

- [`SESSION-2026-08-13-B-NOTES.md`](../SESSION-2026-08-13-B-NOTES.md) and `to-do.md` §4.0 both
  stated the generator was gone. **It was not.** Accurate records of what was believed on their
  own date; not descriptions of what was true.
- The claim that the scratchpad "is deleted when a session ends" was never tested. It was not.

---

**Brief:** [`handbook.md`](handbook.md)
