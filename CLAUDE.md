# Agent Instructions

AI-powered spreadsheet app built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and Vercel AI SDK.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui `base-vega` style on Base UI (`@base-ui/react`, `render` prop — no Radix, no `asChild`)
- **AI**: Vercel AI SDK `ai@6` + `@ai-sdk/react` — two-agent split: `ToolLoopAgent` (table ops) + `generateObject` fan-out (cell enrichment); typed data parts stream server → client
- **Data Grid**: TanStack Table + TanStack Virtual
- **DnD**: dnd-kit
- **State**: zustand
- **Package Manager**: pnpm

## Project Structure

```
src/
├── app/          # Next.js App Router pages (+ api/chat route)
├── ai/           # gateway.ts (model), agents/, messages/ (data-part zod contract), response/
├── components/   # React components (ui/, chat/, data-grid/)
├── hooks/        # Custom React hooks
├── lib/          # Utilities, types, schemas, config.ts (siteConfig)
└── data/         # Seed data
```

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # oxlint
pnpm format:fix   # oxfmt
```

## Conventions

- Path alias: `@/*` -> `./src/*`
- UI components: add via `pnpm dlx shadcn@latest add <name>` (style base-vega); never hand-copy registry JSON
- Icons: lucide-react
- No `any`, no `!`, no `as` — zod-parse at boundaries (request body, onData payloads)
- Model/gateway: single source in `src/ai/gateway.ts`
- Demo mode: key "demo" swaps in `StaticChatTransport` (`src/components/chat/demo-transport.ts`) — no API key needed
