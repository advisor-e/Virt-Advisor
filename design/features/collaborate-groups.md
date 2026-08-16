# Groups, Marketplace & Messaging — the Brief

> **Read this before touching the adviser-facing social side of Collaborate.** Current rules
> only. The history is in [`collaborate-groups-history.md`](collaborate-groups-history.md).
>
> **Covers:** how advisers find each other, form specialty groups, share pages and talk. **Does
> not cover:** the manager's console ([`adviser-network.md`](adviser-network.md)) or the data
> layer ([`collaborate-data-layer.md`](collaborate-data-layer.md)).

---

## 1. Design philosophy

**A place for advisers to find others to work with on developing new content.**

Most users of this platform are learning, often alone, often the only person in their branch
doing advisory work at all. This side of the app exists so they can find someone further along,
join a group working on the same thing, and build something together.

**Co-development raises a question compliance software usually ducks: who owns what they
build?** The answer here is explicit and structural, not a footnote in a contract. Every
co-developable tool carries an ownership tier, and some are locked so that editing or re-listing
cannot quietly turn protected material into shared property. **Ownership is checked at the point
of listing, not argued about afterwards.**

**A group is social, not managerial.** A special interest group has nothing to do with the
management hierarchy. Confusing the two — and the schema makes it easy — puts a social club in an
authorisation path.

---

## 2. Key principles — the non-negotiables

**P1 · A special interest group is NOT a management tier.** The `group` table in the schema is
social. Reading it as a tier would be a correctness bug, and the two words look identical in
conversation.

**P2 · Cross-organisation collaboration is capped from above.** A manager sets whether their
people may work with advisers outside the firm, and a stricter level above caps what a level
below may open. An adviser's reach is the resolved ceiling, never their own preference alone.

**P3 · Ownership tier is enforced at creation, not on trust.** A locked, non-derivable tool
cannot be listed or re-listed into shared or group ownership. The guard lives in the create path.

**P4 · The source catalogue is never edited.** Ownership classification is a **separate layer
keyed by the catalogue's page id** — it reads the id, it does not touch the master data.

**P5 · Identity comes from the verified token**, and every membership or messaging action is
checked against the caller's own scope.

**P6 · Untrusted input is sanitised, and AI output is validated before use.** Both have their own
seam; neither is optional because the content is adviser-written and adviser-read.

**P7 · Every string goes through the wording files.** Collaborate's wording is merged with this
app's by a merge that **refuses a section-name collision** rather than letting one file silently
win.

---

## 3. Design considerations

**Four ways advisers come together**, and they are deliberately different doors: **discover**
(find an adviser by strength, industry or topic), **connecting** (reach out and open a thread),
**marketplace** (list and find co-developable tools), and **groups** (join a standing specialty
group).

**Joining a group is a request, not an action, when the manager says so.** Requests queue for
approval; a manager can also bulk-invite. Both paths exist because the social graph and the
management graph are not the same thing.

**Shared pages attach to both groups and threads.** That is the mechanism by which a conversation
turns into shared work — and it is also the point where ownership classification matters, because
a page attached is a page circulated.

**The advertised profile is ours; the identity is not.** Availability, about, strengths,
industries and topics belong to this app. Name, title, firm, email, phone and location belong to
Advisor-e and are read from there.

**There is an audit feed, and it is scoped.** A manager reads activity for their own scope only.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| Screens | `components/collaborate/screens/` — `discover` · `connecting` · `marketplace` · `groups/_id` · `groups/new` · `profile` · `messages` |
| Conversation pane | `components/collaborate/shared/ConversationPane.vue` |
| Tool picker | `components/collaborate/shared/ToolPicker.vue` |
| Routes | `server/collaborate/routes/people.js`, `routes/templates.js` |
| Ownership classification | `server/collaborate/data/ipClassification.js` |
| Tool catalogue | `server/collaborate/data/advisoryTemplates.js` |
| Input sanitising | `server/collaborate/utils/sanitiseInput.js` |
| AI response validation | `server/collaborate/utils/validateAIResponse.js` |
| Production safety checks | `server/collaborate/utils/productionGuard.js` |

### The four ownership tiers

1. **Platform-owned (base)** — the default for catalogue tools.
2. **Protected / locked** — platform only, **non-derivable, not listable**.
3. **Co-developed (shared)** — the platform and the co-developers.
4. **Group-owned (net-new)** — the group owns it; this is what marketplace listings create.

Today the tier and lock come from a small in-code map with a platform-owned default. **For the
master team:** replace the classifier with a lookup against the real ownership register, keeping
the return shape identical — the create-guard and the tool picker then need no changes.

### Traps that have actually bitten

1. **"Group" means two different things in this codebase.** Social group, and management tier.
   The schema has a table for the first. Never wire the second to it.
2. **A wording-file section name collided on merge.** Exactly one section clashed between the two
   apps. It is handled by a merge that refuses a collision loudly — do not replace it with a
   silent overwrite.
3. **An alias in the import paths failed silently** during the code move, so files resolved to
   nothing without an error. Namespacing everything under its own directory is what kept the merge
   to zero edits in this app's files.

### Known state

The whole people layer runs in memory and **resets on restart**. Nothing here has been proven
against a database.

---

## 5. Related briefs

[`adviser-network.md`](adviser-network.md) — the manager's view of the same data ·
[`collaborate-data-layer.md`](collaborate-data-layer.md) — what everything here reads through ·
[`tier-cascade.md`](tier-cascade.md).

**History:** [`collaborate-groups-history.md`](collaborate-groups-history.md)
