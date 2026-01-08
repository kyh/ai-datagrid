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

## Issue Tracking

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

