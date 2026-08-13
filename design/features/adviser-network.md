# The Adviser Network — the Brief

> **Read this before touching the manager console or anything scoped by tier.** Current rules
> only. The history is in [`adviser-network-history.md`](adviser-network-history.md).
>
> **Covers:** the manager-facing console — who a manager can see, what they can set, and how the
> roll-up is scoped. **Does not cover:** the adviser-facing social side
> ([`collaborate-groups.md`](collaborate-groups.md)) or the data layer beneath it
> ([`collaborate-data-layer.md`](collaborate-data-layer.md)).

---

## 1. Design philosophy

**This is the roll-up that already works, and it is the model for every other one.**

One component renders the console for **every** manager tier. The backend returns the correctly
scoped payload and the component labels itself from what it is given. The firm tier sees a flat
table of its advisers; the tiers above see a tree — brand, then country, then firm, then
adviser — and each tier gets the summary tiles that make sense for it.

Everything the rest of the app is trying to achieve with the tier cascade, this already does and
has tests for. **When a new roll-up is being designed, the honest first question is: how does the
Adviser Network do it?**

**A manager's reach is a server-side fact, never a client-side one.** Scope is re-derived from
the verified token on every request. The button is never the gate.

**And the console is about helping, not policing.** A manager sees their people so they can
support them — approve a request, make an introduction, notice someone has gone quiet. The
quiet-firm threshold is deliberately generous because a badge here means *act*, not *glance*.

---

## 2. Key principles — the non-negotiables

**P1 · One component, every tier.** Not a screen per tier. The backend scopes; the component
labels itself from the scope it is handed.

**P2 · Scope is re-derived server-side on every request.** Never trusted from the client, never
inferred from a parameter.

**P3 · A manager sees the level immediately below, summarised** — their firms, not a flat roster
of every adviser beneath them. Drill-down to a named person exists and is itself tier-resolved.

**P4 · The role resolver is an authorisation surface.** It answers two questions — what tier is
this advisor, and may this manager act on that one — and it is pure and re-evaluated per
request. Treat any change to it as a security change.

**P5 · The interim role-override table must never let a user promote themselves.** Only the
mentor writes it, and it is temporary scaffolding until the master app's role claim is wired.

**P6 · A tier with nothing to show says so on screen.** An empty roll-up and a broken one must
never look alike.

**P7 · Advisor identity belongs to Advisor-e.** Name, title, firm, email, phone and location are
read from there. This app owns only the *advertised* fields — availability, about, strengths,
industries, topics.

---

## 3. Design considerations

**What a manager can actually do:** see every adviser in their scope with availability and last
activity; set the **cross-org collaboration posture** — whether their people may work with
advisers outside the firm; approve or decline requests to join specialty groups; bulk-invite
selected advisers into one of their groups; view the app as one of their advisers; and read an
activity and audit feed for their scope.

**The cross-org posture is a ceiling, and it cascades.** A stricter level above caps what a level
below may open. That is a working cascade in its own right and predates the rest of the app's.

**View-as is not treated as a significant risk**, by ruling: the adviser generates and submits
their own record and would see anything stray. *One cheap suggestion remains open — stamp each
claim with who was signed in when it was made, so a stray entry can be explained rather than
argued about.*

**In production there is one page, not four.** A single role-gated route serves every tier from
the login. The per-tier routes that exist are **development previews** so each tier can be seen
without a real login — a few lines each, all rendering the same component.

**Performance was already thought about.** A higher tier does not ship every adviser; they load
lazily per node and are paginated. Do not undo that by fetching the tree eagerly.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The console | `components/collaborate/shared/ManagerConsole.vue` |
| The tree node | `components/collaborate/shared/ConsoleNode.vue` |
| The Hub wrapper | `components/firm/FirmAdviserNetwork.vue` |
| Audit viewer | `components/collaborate/shared/AuditViewer.vue` |
| View-as banner | `components/collaborate/ViewAsBanner.vue` |
| Routes | `server/collaborate/routes/people.js` |
| Role and tier resolver | `server/collaborate/data/roles.js` |
| Audit log | `server/collaborate/data/auditLog.js` |
| Data access | `server/collaborate/data/repository.js` |

### How it reaches the Hub

The console takes an `embedded` prop that drops the page frame, the banner and the development
tier-switcher, and a wrapper puts it in the Hub's own style. Collaborate's wording is joined to
this app's through a merge that **refuses a section-name collision** rather than letting one file
silently win.

### Where the tier comes from

A hybrid, by owner decision: the **firm** tier from the advisor's branch, the **group** from
their country, and the manager and mentor **designations** from the role claim in the login
token — with an interim local override table standing in until that claim is wired. Anything
unknown resolves to `advisor`.

### Traps that have actually bitten

1. **Two database pools onto one database.** Collaborate arrived with its own identical pool; it
   was deleted, and there is now one for the whole app. The commented-out line in the data layer
   points at the right one — a latent bug waiting for whoever uncommented the wrong one.
2. **The `group` table in the schema is a special interest group, not a management tier.**
   Reading it as one would be a correctness bug.
3. **Identity fields are not ours to store.** Writing a copy of a name or an email into this
   app's tables creates a second, drifting record of something Advisor-e owns.

### Known state

Everything runs against the in-memory store, which resets on restart. No real login exists for
the middle tiers, so they cannot be demonstrated by signing in as one — they are evidenced by
tests against a seeded map, which is a weaker claim than a live screen and should be stated as
one.

---

## 5. Related briefs

[`collaborate-groups.md`](collaborate-groups.md) · [`collaborate-data-layer.md`](collaborate-data-layer.md)
· [`tier-cascade.md`](tier-cascade.md) · [`firm-manager-hub.md`](firm-manager-hub.md)

**History:** [`adviser-network-history.md`](adviser-network-history.md)
