# Agent Instructions

AI-powered spreadsheet app built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and eve (Vercel's agent framework) + `ai@7`.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui `base-vega` style on Base UI (`@base-ui/react`, `render` prop — no Radix, no `asChild`)
- **AI**: `eve` (agent runtime, `withEve` Next integration, `useEveAgent` client hook) via Vercel AI Gateway (`openai/gpt-5.1-instant`); BYO-key via bearer auth + dynamic model resolver; one agent with 9 table tools + an `enrich_cells` `generateObject` fan-out tool
- **Data Grid**: TanStack Table + TanStack Virtual
- **DnD**: dnd-kit
- **State**: zustand
- **Package Manager**: pnpm

## Architecture

```
agent/agent.ts                  # defineAgent: model + step.started BYO-key resolver + limits
agent/instructions.md           # system prompt (documents the per-turn context JSON)
agent/channels/eve.ts           # auth walk: gatewayKeyBearer → vercelOidc → localDev
agent/tools/generate_columns.ts # defineTool; snake_case filename = tool name
agent/tools/{update,delete}_columns.ts
agent/tools/{add,remove,clear}_{filters,sorts}.ts
agent/tools/enrich_cells.ts     # per-cell generateObject fan-out (builds its own gateway model)
agent/tools/<builtin>.ts        # disableTool() sentinels (bash, web_fetch, …)
src/lib/assistant-schemas.ts    # zod contract: tool input/payload schemas (shared both sides)
src/lib/gateway.ts              # model id + gateway model builder (agent-side, relative imports)
src/lib/grid-context.ts         # per-turn clientContext (columns/filters/sorts/selection)
src/lib/selection-context.ts    # selection shape the grid produces for enrichment
src/components/chat/chat.tsx    # useEveAgent bridge: clientContext out, action.result in
src/components/chat/api-key-dialog.tsx
src/components/data-grid/       # Grid: columns, cells, controls (TanStack)
```

Flow: chat composer `send({ message, clientContext: gridSnapshot })` → eve channel authenticates (user bearer key / OIDC / localhost) → dynamic model resolver picks the user's gateway key from session auth (fallback: server `AI_GATEWAY_API_KEY`) → tools return structured payloads (`enrich_cells` runs the per-cell fan-out server-side and returns one batch) → client `onEvent` zod-parses `action.result` events → grid callback + sonner toast.

## Commands

```bash
pnpm dev          # dev server — boots Next.js AND the eve agent runtime
pnpm build        # production build (Next). Vercel builds the eve service via withEve
pnpm lint         # oxlint
pnpm format:fix   # oxfmt
pnpm test         # vitest (grid unit tests)
```

**NEVER run `eve build` while `pnpm dev` is running** — it corrupts the eve dev workflow cache. If dev breaks mysteriously: delete `.eve/` + `.workflow-data/` and restart.

## Conventions

- Path alias: `@/*` → `./src/*` — but files imported by `agent/` code MUST use relative imports (eve's compiler doesn't read tsconfig paths)
- kebab-case filenames for TS/TSX; `agent/tools/*` are snake_case (eve derives tool names from filenames)
- No `any`, no `!`, no `as` — zod-parse at boundaries (stream events, tool payloads, localStorage)
- Zod transforms are banned in tool schemas (eve can't express them in the model-facing JSON Schema) — cleaning transforms live in the client-side payload parse (`filterSchema` vs `filterWireSchema` in `assistant-schemas.ts`)
- Add ui components ONLY via `pnpm dlx shadcn@latest add <name>` (base-vega registry); never hand-copy
- Base UI idioms: `render` prop (not `asChild`), `data-open:`/`data-closed:` variants
