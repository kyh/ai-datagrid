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

Requests go through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). Key resolution:

- **Local dev**: set `AI_GATEWAY_API_KEY` in `.env.local` — the server uses it automatically.
- **Deployed**: visitors enter their own gateway key in the UI (stored in localStorage, sent per request). Optionally set `SECRET_KEY` — anyone entering that value uses your server-side `AI_GATEWAY_API_KEY` instead.
- **Demo mode**: enter `demo` as the key ("Use a demo key" in the dialog) — a scripted `StaticChatTransport` replays a canned generate-columns exchange with no API calls.

## Architecture

- `src/ai/gateway.ts` — single source for model id + gateway construction.
- `src/ai/agents/table-agent.ts` — `ToolLoopAgent` with 9 tools (generate/update/delete columns, add/remove/clear filters and sorts). Each tool streams a typed data part and returns a summary string to the model.
- `src/ai/agents/data-agent.ts` — per-cell `generateObject` fan-out for enrichment (5 concurrent), streams one data part per cell; failures surface via a `data-enrich-errors` part.
- `src/ai/messages/data-parts.ts` — zod schemas for every data part: the client↔server contract. `onData` parses each payload before touching state.
- Stateless server: the client ships current columns/filters/sorts (and selection for enrich) with each request; the server appends them to the agent instructions.

## Project Structure

```
src/
├── ai/              # AI integration, prompts, tools
├── app/             # Next.js app dir, API routes
├── components/
│   ├── chat/        # Chat interface
│   ├── data-grid/   # Grid: columns, cells, controls
│   └── ui/          # shadcn/ui components
├── data/            # Seed data
├── hooks/           # Shared hooks
└── lib/             # Utils, types, schemas
```

## Customization

**Add column types**

1. Define type in `src/lib/types.ts`
2. Create cell renderer in `src/components/data-grid/`
3. Add editor component for inline editing
4. Create filter logic if needed

**Customize AI**

- Model: `src/ai/gateway.ts`
- Prompts: `src/ai/response/stream-chat-response-prompt.ts` + tool descriptions in `src/ai/agents/table-agent.ts`
- Data-part contract: `src/ai/messages/data-parts.ts`

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
- Vercel AI SDK (ai@6)

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
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## License

MIT
