# AGENTS.md

**ai-datagrid** is a forkable Next.js 16 template: an Excel-like data grid (TanStack Table + Virtual) driven by an agent built on [eve](https://eve.dev), Vercel's agent framework. This is the tool-agnostic guide for coding agents — it's meant to be run, not just read. Claude also reads `CLAUDE.md`; both point back here.

## Quickstart (headless)

```sh
pnpm install
cp .env.example .env.local   # then fill AI_GATEWAY_API_KEY (see below)
pnpm dev                     # http://localhost:3000
```

One command, two runtimes: `next dev --turbopack` boots Next.js **and** eve's agent dev server, because `next.config.ts` wraps the config in `withEve()`. There is no database, no auth, no migration step, and no bootstrap script — `pnpm install` is the whole provisioning story apart from the API key.

Liveness (there is no `/api/health`):

```sh
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000   # 200
```

## The one manual step: `AI_GATEWAY_API_KEY`

Grid editing, filtering, sorting and paste all work with no key. **Every AI turn needs one.** Put a [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) key in `.env.local`:

```sh
AI_GATEWAY_API_KEY=vck_...
```

Key resolution (`agent/channels/eve.ts` → `agent/agent.ts`): a caller's own key arrives as `Authorization: Bearer <key>` and runs the whole session; otherwise Vercel OIDC; otherwise `localDev()` opens localhost and the agent falls back to the server's `AI_GATEWAY_API_KEY`.

**The failure mode is quiet, so know it up front.** `src/components/chat/chat.tsx` gates the key dialog on `!apiKey && process.env.NODE_ENV !== "development"`, so **in dev you are never prompted**. A keyless local run doesn't show the dialog — the turn just errors. If an AI turn fails and nothing explains why, check `.env.local` first.

## Fresh clone & remote sessions

```sh
gh repo create my-grid --template kyh/ai-datagrid --clone && cd my-grid
pnpm install && pnpm dev
```

Everything an agent needs is committed except `node_modules` and `.env.local`. The `.codex/environments/environment.toml` descriptor installs deps in a cloud sandbox. Without a gateway key a sandbox still runs `pnpm verify`, `pnpm build`, and the whole non-AI grid — only AI turns are blocked.

## There is no login

No auth, no database, no seeded user — nothing to sign in to. The known state is the **in-memory fixtures** in `src/data/seed.tsx`, pinned by `faker.seed(12345)`, so every route renders identical data on every boot and is directly assertable — regardless of which routes were visited first. Example: the first row of `/people` is always `Colton Mertz`.

Two invariants keep that true, and both are load-bearing:

- **Time-independence** — never reach for `faker.date.recent()`/`.soon()`/`.past()`; use `faker.date.between()` with fixed endpoints.
- **Order-independence** — `faker` is a module singleton, so every `get*Data()` calls `resetFixtureRng()` first. Without it, in-app `<Link>` navigation (`/people` → `/articles`) advances the shared RNG and shifts every subsequent fixture. Any new generator must re-seed too.

## Verify a change end-to-end

Static gate — run before every commit:

```sh
pnpm verify   # typecheck · lint · format · test
```

**There is no CI in this repo** (no `.github/workflows`). `pnpm verify` is the only gate that will ever run, so nothing catches you if you skip it.

Runtime — drive the real UI with [agent-browser](https://github.com/vercel-labs/agent-browser). Non-AI assertion against the deterministic fixtures:

```sh
agent-browser open http://localhost:3000/people
agent-browser snapshot -i -c        # accessibility tree with @eN refs
agent-browser get count '[data-slot="grid-cell-content"]'
agent-browser eval 'document.querySelector("[data-slot=grid-cell-content]").textContent'  # "Colton Mertz"
```

Full AI round-trip. `/generate-demo` and `/filter-sort-demo` preseed the chat composer with a fixed prompt (`initialChatInput`), which makes them repeatable smoke tests — submit the prompt already in the box and assert the grid changed:

```sh
agent-browser open http://localhost:3000/generate-demo
agent-browser click 'textarea[placeholder^="Generate"]'
agent-browser press Enter           # sends the preseeded prompt
agent-browser wait 30000
agent-browser eval 'Array.from(document.querySelectorAll("[data-slot=grid-header-cell]")).map(e => e.textContent.trim()).filter(Boolean).join(" | ")'
# Recipe Name | Cuisine Type | Difficulty Level | Prep Time (Minutes) | ...
```

`/enrich-demo` has **no** preseeded prompt — select cells in a column first, then type an enrichment request. Don't stop at typecheck/tests: exercise the flow and observe the grid.

Useful selectors: `[data-slot="grid-header-cell"]`, `[data-slot="grid-cell-content"]`, `textarea[placeholder^="Generate"]` (the chat composer, always mounted).

## Routes

| Route               | What it is                                                       |
| ------------------- | ---------------------------------------------------------------- |
| `/`                 | Empty 26-column × 1001-row spreadsheet (A–Z) — the blank surface |
| `/people`           | 50 people — the widest column-type coverage                      |
| `/companies`        | 50 companies                                                     |
| `/articles`         | 50 articles — exercises the **date** column type                 |
| `/generate-demo`    | `generate_columns` smoke test (preseeded prompt)                 |
| `/enrich-demo`      | `enrich_cells` demo (select cells, then ask)                     |
| `/filter-sort-demo` | `add_filters` / `add_sorts` smoke test (preseeded prompt)        |

## Platform matrix

| Surface             | Dev command | Agent-verifiable at runtime?                                        |
| ------------------- | ----------- | ------------------------------------------------------------------- |
| Web (Next.js)       | `pnpm dev`  | **Yes** — headless via agent-browser                                |
| Agent runtime (eve) | `pnpm dev`  | Indirectly — no stable port; drive it through the web chat composer |

## Rules that matter

- **NEVER run `eve build` while `pnpm dev` is running.** It corrupts eve's dev workflow cache. Recovery: delete `.eve/` and `.workflow-data/`, restart.
- **Anything reachable from `agent/` must use relative imports.** eve compiles `agent/**` without reading tsconfig `paths`, so a `@/lib/...` import in a file that `agent/` pulls in (`src/lib/assistant-schemas.ts`, `data-grid-schema.ts`, `gateway.ts`, `selection-context.ts`) breaks the **agent** build only — `pnpm build` stays green and you won't notice until a turn fails.
- **`agent/tools/*.ts` filenames are snake_case** — eve derives the model-facing tool name from the filename. Everything under `src/` is kebab-case.
- **No zod transforms in tool input schemas** — eve can't express them in the model-facing JSON Schema. Cleaning transforms belong in the client-side payload parse (`filterWireSchema` vs `filterSchema` in `src/lib/assistant-schemas.ts`).
- **No `any`, no non-null `!`, no `as` casts.** All three are `error` in `.oxlintrc.json`, so `pnpm lint` enforces them. Zod-parse at every boundary: stream events, tool payloads, localStorage. The handful of unavoidable widenings are funnelled through named helpers (`asRow`, `genericMemo`, `withColumnPatch`) that carry a disable comment and an explanation — add no new bare casts.
- **Add UI only via `pnpm dlx shadcn@latest add <name>`** (base-vega registry on Base UI — `render` prop, not `asChild`). Never hand-copy a component.
- **Grid cell dates render through `formatDateForDisplay`** (`src/lib/data-grid.ts`) — fixed locale and fixed zone, so a cell can't differ between server, client and visitor. Don't reintroduce bare `toLocaleDateString()` in a cell or in the paste path. Carve-out: the date-picker popover (`src/components/ui/utils.tsx` `formatDate`, and the vendored `src/components/ui/calendar.tsx`) stays on the **local** zone on purpose — its inputs are local-midnight dates, it is client-only and never prerendered, so pinning UTC there would show the wrong day east of UTC.

## Map

- `agent/agent.ts` — model + BYO-key dynamic resolver · `agent/instructions.md` — system prompt · `agent/channels/eve.ts` — auth walk · `agent/tools/*.ts` — one tool per file (plus `disableTool()` sentinels for built-ins this app doesn't want)
- `src/lib/assistant-schemas.ts` — the zod contract shared by tools and the chat bridge
- `src/components/chat/chat.tsx` — `useEveAgent` bridge: grid snapshot out as `clientContext`, `action.result` events in
- `src/components/data-grid/`, `src/hooks/use-data-grid.ts`, `src/stores/data-grid-store.ts` — the grid
- `src/data/seed.tsx` — every fixture, all routes
- `CLAUDE.md` — conventions + architecture (Claude-specific) · `README.md` — the human-facing tour

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
