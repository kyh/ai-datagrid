# Agent Instructions

AI-powered spreadsheet app built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and Vercel AI SDK.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui (new-york style)
- **AI**: Vercel AI SDK (`ai`, `@ai-sdk/react`)
- **Data Grid**: TanStack Table + TanStack Virtual
- **DnD**: dnd-kit
- **Package Manager**: pnpm

## Project Structure

```
src/
├── app/          # Next.js App Router pages
├── ai/           # AI tools, prompts, response streaming
├── components/   # React components (ui/, chat/, data-grid/)
├── hooks/        # Custom React hooks
├── lib/          # Utilities, types, schemas
└── data/         # Seed data
```

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint
```

## Conventions

- Path alias: `@/*` -> `./src/*`
- UI components: shadcn/ui in `src/components/ui/`
- Icons: lucide-react
