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

# Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

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
- Prompts: `src/ai/`
- Tools: `src/ai/tools/`

**Theming**
- Colors: `src/app/globals.css`
- Components follow shadcn/ui patterns

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- TanStack Table
- TanStack Virtual
- dnd-kit
- Radix UI + shadcn/ui
- Tailwind CSS 4
- Vercel AI SDK

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
