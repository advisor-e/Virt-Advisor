# Nuxt Minimal Starter

## 📁 Where everything lives

Project documentation is in the **[`design/`](design/)** folder:

| Document | What it is |
|---|---|
| [`design/virt-advisor-registry.md`](design/virt-advisor-registry.md) | **The system registry** — the authoritative map of how the whole app works (the 8 functions, the decision pipeline, every asset). **Start here.** |
| [`design/ACTIONS.md`](design/ACTIONS.md) | **The action backlog** — the single prioritised list of open tasks. Triage from here. |
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
