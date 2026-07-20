# Firm Quiz Builder — Build Plan (DRAFT for review)

> **Status:** proposal, 2026-07-21. No code written against it yet. Author: Claude,
> for Mike + the master-app team. This supersedes the earlier "wire quiz-bank matching
> into the backend" step (CB-30/CB-31 direction) and realises **CB-31** as a full
> feature. The template-name **resolver** (CB-34 pt 1, committed `dc37d3c`) is the reusable
> core it builds on.

## 1. Purpose

Give a firm a no-code page inside **Firm Manager** to own its quiz material: start
from the quizzes we provide, edit them, and add their own — so a firm can build
quizzes that support how *they* teach, not just the platform defaults.

## 2. The model (as Mike described it — please confirm)

- **Nothing is free-standing.** Every quiz topic is backed by a **real template that
  exists in that firm's search-content JSON**. In Advisor-e a firm starts from a *blank*
  template, edits it, and on save it is recorded in the search content and becomes a
  real (firm-level) template.
- **Templates cascade and clone down:** global → group → firm (the same cascade the
  [user-level cascade work](USER-LEVEL-CASCADE-HANDOVER.md) models). A firm's quiz can
  attach to a platform template, a cloned-down group/global template, or its own
  firm-custom template.
- **Template creation stays in Advisor-e** (the master app), which records it in the
  search content. The Firm Quiz Builder authors **quizzes against templates that already
  exist in the firm's search content** — it does not mint templates itself.
- **The search-content JSON is the north star and is never modified here** (read-only).

> **Open — needs your ruling (§7):** when a firm "adds a topic" in the quiz page, they
> are *selecting a template that exists in their search content* (platform / cloned /
> firm-custom) and authoring its quiz — correct? Or is there a case where the quiz page
> itself needs to trigger template creation upstream?

## 3. What a quiz is (data shape — already in use)

Each quiz **topic** is bound to a template and holds an ordered list of entries:

```
topic  ->  { templateRef (resolved from the template title), title (label),
             source (provenance), entries: [ { id, question, answer, keyPoint } ] }
```

This matches today's `data/course-quizzes.json` `banks` shape (`{ source, transcribed,
entries[] }`), so the seed content and the existing 2 shipped banks carry straight over.

## 4. Seed content — the three provided quizzes

Import these (in `Course Builder Quiz/`) as the **platform base** every firm starts from:

| Source PDF | Notes |
| --- | --- |
| `E.O.Y Meeting Quiz.pdf` | already a shipped bank |
| `General Section Quiz.pdf` | 18 topics / 180 Q&As; all 18 resolve via the resolver (incl. the two near-miss headings) |
| `Lite Fundamentals Quiz.pdf` | new — not yet read/transcribed |

Import is a **transcription** step (the Q&A text is Mike's IP): each topic heading is run
through the **resolver** to bind it to its template; anything the resolver can't place
uniquely is surfaced for a human decision, never guessed.

## 5. Storage & editing — the firm-overlay pattern (reuse, don't reinvent)

Reuse the **layered-override** machinery already behind Advisory Distinctions
(`server/utils/firmOverlay.js`, the `firm-manager-edit-target` skill):

- **Platform base** = the seed quizzes (read-only baseline, same for all firms).
- **Firm overlay** = a firm's edits and additions, layered on top per firm.
- **Free with the pattern:** version history + restore, and the IDOR-safe auth guard.
- **A firm never edits the base** — it overrides. "Reset to platform version" is possible
  because the base is untouched.

**Capabilities the page gives a firm:**
1. **Edit** any provided topic's questions / answers / key points.
2. **Add a topic** (bound to a template in their search content) and author its Q&A&points.
3. **Add / edit / reorder / remove entries** within a topic.
4. **Version history / restore** per topic.

## 6. Build phases (each its own reviewable, tested unit — same rhythm as CB-23/CB-34)

- **Phase 0 — read + transcribe the Lite Fundamentals quiz** (and re-confirm EOY/General
  against the resolver). Mike signs off the transcription (his IP).
- **Phase 1 — seed model + loader.** Land the three quizzes as the platform base in the
  quiz data file, each topic resolver-bound to its template; a locking test proves every
  topic resolves to exactly one template (replaces the brittle exact-title test).
- **Phase 2 — backend: firm-overlay quiz store.** Read (base ⊕ firm overlay) and write
  (firm overlay only) via `firmOverlay`, IDOR-guarded, versioned. Restify routes.
- **Phase 3 — Firm Manager UI.** A "Quizzes" area in `FirmManagerHub.vue`: list topics,
  edit entries, add a topic (template picker from the firm's search content), add/reorder
  entries, version history/restore. Buefy + Pug, Options API, `$t()`.
- **Phase 4 — feed the course engine.** Point quiz generation/grading at the resolved,
  firm-overlaid topics (this is where the old "wire the banks" step lands, now sourced
  from firm-editable content).

## 7. Open decisions (need Mike / master team before the affected phase)

1. **Topic = select-existing-template** (§2) — confirm the firm picks a template that
   already exists in their search content, rather than the quiz page creating templates.
2. **Do quizzes cascade** (global/group/firm) like templates, or are they always a
   firm-level overlay on the platform base? (Affects Phase 2's storage keying.)
3. **Can a firm edit the *platform* quizzes' content**, or only add on top and edit their
   own additions? (Recommended: edit-as-overlay, base always restorable.)
4. **Template picker source** — the page needs the firm's search content to list
   selectable templates; confirm how Virt Advisor obtains the *firm-specific* export.

## 8. Dependencies

- **Firm-Manager MySQL persistence is not provisioned** (master-team item). Everything
  runs on the **dev-file fallback** until then — buildable and demoable, but firm edits
  won't persist to a real DB yet. Same position as all current Firm Manager features.
- **Resolver** (`server/utils/resolveTemplateName.js`) — done, committed `dc37d3c`.
- **Per-firm search content** — needed for the template picker (open decision #4).

## 9. Related records

- Backlog: **CB-30** (quiz content model), **CB-31** (firm-editable quiz banks — this
  plan), **CB-34** (resolver + the "no stable unique ID in the export; `page` is a
  deliberately shared page grouping" finding).
- Memory: `firm_manager_hub`, `design_user_level_cascade`, `design_distinctions_cascade`.
- Skill: `firm-manager-edit-target`.
