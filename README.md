# Nuxt Minimal Starter

> **📌 Taking a version of this code into UAT or production? Start with
> [`design/UAT-LOAD-PACK.md`](design/UAT-LOAD-PACK.md)** — one page covering the runtime,
> the environment variables, the database rows that must exist, the screen addresses
> (nothing in the app links to them), and how to prove the app really started.
>
> **Pull a release **tag** (`v0.6.0`, `v0.6.1`, …), never the moving `master` branch — and
> reply to us with the tag you installed.** A tag is immutable, so "UAT is on `v0.6.0`"
> stays true and checkable forever. Please also report UAT bugs against the tag number, so
> a report can be matched to the exact code that produced it.
>
> The full hand-off process is in **[`design/WORKING-AGREEMENT.md`](design/WORKING-AGREEMENT.md)**,
> and what is running where is recorded in
> **[`design/DEPLOYED-VERSIONS.md`](design/DEPLOYED-VERSIONS.md)** — which we maintain on
> this side, so you do not need commit access to keep it accurate.

## 📁 Where everything lives

Project documentation is in the **[`design/`](design/)** folder:

| Document | What it is |
|---|---|
| [`design/UAT-LOAD-PACK.md`](design/UAT-LOAD-PACK.md) | **Loading a release into UAT** — runtime, environment variables, database rows, screen addresses, and how to prove it started. Read this before deploying anything. |
| [`design/virt-advisor-registry.md`](design/virt-advisor-registry.md) | **The system registry** — the authoritative map of how the whole app works (the 8 functions, the decision pipeline, every asset). **Start here.** |
| [`design/features/to-do.md`](design/features/to-do.md) | **The live list** — the whole of the open work, generated from [`to-do-items.json`](design/features/to-do-items.json). Triage from here. If it is not on it, nobody is doing it. |
| [`design/ACTIONS.md`](design/ACTIONS.md) | ⛔ **Frozen archive** (2026-08-24) — the historical action backlog. Searchable history, not a work list; nothing is added to it and nothing is triaged from it. |
| [`design/HANDOFF.md`](design/HANDOFF.md) | Integration / handover checklist (auth, DB, Google Drive wiring). |
| [`design/SECURITY-AUDIT-NOTES.md`](design/SECURITY-AUDIT-NOTES.md) | Security audit notes + formally accepted risks. |
| [`design/archive/`](design/archive/) | Superseded docs — reference only, never authoritative. |

Repo rules for AI assistants (Claude Code) live in [`CLAUDE.md`](CLAUDE.md) at the root — it is auto-loaded and must stay there.

---

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
