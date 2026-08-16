# Case Studies & Clients — the Brief

> **Read this before touching case storage, sharing, or anything a manager reads about real
> client work.** Current rules only. The history is in
> [`cases-and-clients-history.md`](cases-and-clients-history.md).
>
> **Covers:** an advisor's record of real client work, who may see it, and how it becomes
> improvement material. **Does not cover:** what the engine does with the lessons
> ([`advisory-engine.md`](advisory-engine.md)).

---

## 1. Design philosophy

**Real client work is how the system gets better — and it is also the most sensitive thing in
the app.** Both halves of that sentence have to hold at once, and every rule here comes from
holding them together.

A case study is an advisor's own record of a real engagement. It follows them across devices,
because it is theirs. It can be shown to their firm, if they choose. And a firm manager can
separately decide that an **anonymised** version goes further up, for accuracy review — so the
people improving the system can see where it is failing real advisors with real clients.

**The improvement loop is the point.** The system will never predict every combination of
domains, issues and natural advisor language through pre-emptive testing. Real sessions and real
corrections are the improvement engine. Cases are how that reaches the people who can act on it.

**Two separate decisions, two separate owners.** The advisor decides whether their firm sees a
case. The **firm manager** decides, separately, whether an anonymised copy goes above. Neither
can make the other's decision. Collapsing those two into one switch would mean an advisor's
private note reaching people they never agreed to show it to.

---

## 2. Key principles — the non-negotiables

**P1 · Identity comes from the verified token. Always.** Reads are scoped to the caller's own
identity; mutations carry an ownership check, so an advisor can only ever change a row they own.
Ids in the request body are never trusted for ownership.

**P2 · Sharing upward is double opt-in.** The advisor sets visibility; the firm manager
separately approves the share above. Two axes, two owners.

**P3 · The level above only ever sees the anonymised copy** — written at the moment of approval —
**never the raw text.**

**P4 · Every cross-firm row carries its origin, as a path.** A report saying something is wrong
without saying where is an alarm with no address. The level immediately below the viewer comes
first, the firm last. **Naming a firm to the manager above it is not a disclosure** — what stays
hidden is the adviser and the client.

**P5 · The personal-field guard throws; it does not filter.** A silent filter would hide the day
the payload shape changed. Loud is the feature.

**P6 · Strip internal ids and personal detail before anything reaches the AI**, and validate the
shape of whatever comes back before saving it.

**P7 · An empty roll-up and a broken one must never look alike.**

---

## 3. Design considerations

**Visibility and mentor-sharing are different fields for a reason.** Visibility is the advisor's
privacy model — private means the owning advisor only, on any device; shared means the whole
firm, and they can flip it either way. Mentor-sharing is a per-case flag owned by the manager.
Treating them as one field is the mistake to avoid.

**Cases live centrally, not on a device.** They follow the advisor. The earlier browser-storage
model was replaced precisely because it both lost work and leaked.

**The client record is separate from the case.** A saved client is the intake context an advisor
returns to; a case is the record of the work. They are related but not the same thing, and
conflating them puts client identity where case text is.

**Anonymisation happens once, at approval**, and the anonymised copy is what is stored for the
level above. It is not re-derived on every read, so a change to the anonymiser does not silently
rewrite history.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| Case routes | `server/routes/cases.js` |
| Case storage | `server/utils/caseStore.js` |
| Client storage | `server/utils/clientStore.js` |
| Anonymisation | `server/utils/anonymiseCase.js` |
| Roll-up with origin | `server/utils/caseRollup.js` |
| Tier resolution | `server/utils/tierChain.js` |
| Coaching capture | `server/utils/coaching.js` |
| Screen-side helper | `mixins/caseMixin.js` |
| Table | `config/db-schema.sql` — `va_case_studies` |

### The two axes, stated exactly

**`visibility`** — the advisor's own control. `private` = the owning advisor only, on any
device. `shared` = the whole firm. The advisor may flip it either way at any time.

**`mentorShared`** — a separate, manager-owned, per-case double-opt-in flag that surfaces a
firm-shared case upward for accuracy review. The level above sees only the anonymised copy
written on that approval.

### Traps that have actually bitten

1. **The legacy browser-storage model was an authorisation hole.** Ownership came from a
   client-held id. Every route now derives it from the token, and the authenticated advisor id is
   echoed back so the screen can tell which cases are its own **without relying on a client-held
   value**.
2. **A save can be refused by the database while the screen reports success.** Fixed by
   discriminating on the SQL state rather than "are we in production".
3. ⚠ **One read checks for development mode *before* trying the database rather than after.** It
   is a read, it behaves exactly as before, and it was left alone deliberately — changing it is a
   different job. Do not "tidy" it in passing.

### Known state

MySQL has never been provisioned. Cases run on the dev-file fallback so the screens work; nothing
has been proven against a real database.

---

## 5. Related briefs

[`virtual-advisor.md`](virtual-advisor.md) — where the work happens ·
[`firm-manager-hub.md`](firm-manager-hub.md) — where Case Reviews and Team Case Studies are read
· [`tier-cascade.md`](tier-cascade.md) — how far a case travels ·
[`advisory-distinctions.md`](advisory-distinctions.md) — what the lessons become.

**History:** [`cases-and-clients-history.md`](cases-and-clients-history.md)
