# AI Datagrid

<img width="3024" height="1522" alt="Preview" src="https://github.com/user-attachments/assets/1531ddbe-ae24-4e18-84b2-6b6ce28f55a7" />

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkyh%2Fai-datagrid)

A forkable Next.js template featuring an Excel-like UI with AI integration. Build your own Airtable, Notion database, or Google Sheets alternative.

## Features

**Data Grid**

- Excel-like editing with inline cell editing
- Column resizing, reordering, sorting, filtering
- Virtual scrolling for large datasets
- Multi-select, copy/paste, keyboard navigation

**Column Types**

- Text, number, date, select, multi-select
- Checkbox, URL, email
- Custom column definitions

**AI**

- Natural language data manipulation
- Auto-generate rows and columns
- Data analysis and insights
- Formula suggestions

## Quick Start

```bash
# Clone
git clone https://github.com/kyh/ai-datagrid.git
cd ai-datagrid

# Install
pnpm install

# Configure (optional — see AI setup below)
echo "AI_GATEWAY_API_KEY=vck_..." > .env.local

# Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## AI Setup

The assistant runs on [eve](https://eve.dev), Vercel's agent framework, through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). Key resolution:

- **Local dev**: set `AI_GATEWAY_API_KEY` in `.env.local` — the agent's fallback model uses it automatically.
- **Deployed**: visitors enter their own gateway key in the UI (stored in localStorage). It rides each request as a bearer token; an eve channel verifier stashes it in session auth, and a dynamic model resolver runs the whole session on the visitor's key.

`pnpm dev` boots both runtimes: the Next.js dev server and eve's agent dev server (proxied same-origin by `withEve`). Never run `eve build` while `pnpm dev` is running — it corrupts eve's dev cache (fix: delete `.eve/` + `.workflow-data/` and restart).

## Architecture

```
agent/
├── agent.ts             # defineAgent: gateway model + BYO-key dynamic model resolver
├── instructions.md      # system prompt (incl. the per-turn context contract)
├── channels/eve.ts      # HTTP auth: user bearer key → Vercel OIDC → localhost dev
└── tools/
    ├── generate_columns.ts   # defineTool — filename = tool name the model sees
    ├── update_columns.ts / delete_columns.ts
    ├── add_filters.ts / remove_filters.ts / clear_filters.ts
    ├── add_sorts.ts / remove_sorts.ts / clear_sorts.ts
    ├── enrich_cells.ts       # per-cell generateObject fan-out (5 concurrent)
    └── *.ts                  # disableTool() sentinels for the built-in harness tools
next.config.ts           # withEve(nextConfig) — mounts eve behind the Next.js origin
src/lib/assistant-schemas.ts  # zod contract shared by agent tools + chat bridge
src/lib/grid-context.ts  # per-turn app state (columns, filters, sorts, selection)
src/components/chat/     # chat composer (useEveAgent bridge), api key dialog
src/components/data-grid/ # Grid: columns, cells, controls
```

The streaming contract: the client sends the grid snapshot as eve `clientContext` on every turn (`send({ message, clientContext })`); each tool returns a structured payload the chat bridge receives as an `action.result` stream event, zod-parses against `assistant-schemas.ts`, and applies to the grid via callbacks — the server stays stateless.

**Enrichment UX note**: cell enrichment is now a single `enrich_cells` tool call — the server fans out one `generateObject` per cell (5 concurrent, respecting each column's type, options, and prompt) and returns all updates in one batch. The old per-cell streaming progress is gone: the UI shows cell spinners + a shimmer while the tool runs, then applies the whole batch (failed cells surface as an error toast).

## Customization

**Add column types**

1. Define type in `src/lib/types.ts`
2. Create cell renderer in `src/components/data-grid/`
3. Add editor component for inline editing
4. Create filter logic if needed

**Customize AI**

- Model: `src/lib/gateway.ts` (`MODEL_ID`)
- Prompts: `agent/instructions.md` + tool descriptions in `agent/tools/*.ts`
- Tool payload contract: `src/lib/assistant-schemas.ts`

**Theming**

- Colors: `src/app/globals.css`
- Components follow shadcn/ui (base-vega) patterns

**Metadata**

- Site config: `src/lib/config.ts` (name, url, routes for the sitemap)
- Replace `public/og.jpg` with your own 1920x1080 image

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- TanStack Table
- TanStack Virtual
- dnd-kit
- Base UI + shadcn/ui (base-vega style)
- Tailwind CSS 4
- eve (Vercel's agent framework) + Vercel AI SDK (ai@7)

## Use Cases

- Database interfaces (Airtable alternative)
- Admin dashboards
- Data entry apps
- Inventory management
- CRM systems

## Resources

- [Next.js](https://nextjs.org/docs)
- [TanStack Table](https://tanstack.com/table)
- [shadcn/ui](https://ui.shadcn.com/)
- [eve](https://eve.dev)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## License

MIT
