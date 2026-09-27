import { siteConfig } from "../config";

/**
 * The single description of the site for agents and crawlers. The homepage's
 * server-rendered intro, the trust pages, their Markdown twins, `/llms.txt`
 * and the JSON-LD all read from here so they can't drift apart.
 */

export interface ProseListItem {
  label: string;
  href?: string;
  text?: string;
}

export type ProseBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: ProseListItem[] };

export interface ProsePage {
  path: string;
  schemaType: "AboutPage" | "ContactPage" | "WebPage";
  title: string;
  heading: string;
  description: string;
  blocks: ProseBlock[];
}

export interface DemoRoute {
  path: string;
  title: string;
  description: string;
}

const paragraph = (text: string): ProseBlock => ({ kind: "paragraph", text });

export const siteSummary = `${siteConfig.name} is an open-source, forkable Next.js template for an Excel-like spreadsheet driven by an AI agent: generate columns, enrich cells, and filter or sort the grid in plain English.`;

export const siteIntroParagraphs: string[] = [
  `${siteConfig.name} is a working spreadsheet in the browser — inline cell editing, column resizing and reordering, sorting, filtering, copy and paste, keyboard navigation and virtual scrolling over thousands of rows — paired with a chat composer that edits the grid for you.`,
  "Ask the assistant to generate a set of columns for a new table, to enrich selected cells with values the model infers, or to filter and sort the data in natural language. Every change the agent makes lands in the grid as a normal edit you can inspect and change.",
  `It is a template, not a hosted product: clone it, run \`pnpm install && pnpm dev\`, and build your own Airtable, Notion database or Google Sheets alternative on top. It is built with Next.js 16, React 19, TanStack Table and Virtual, and eve, Vercel's agent framework, calling models through the Vercel AI Gateway. The source is MIT licensed at ${siteConfig.repository}.`,
];

export const whenToUse: ProseListItem[] = [
  {
    label: "Starting an AI-assisted spreadsheet or database UI",
    text: "fork AI Datagrid when you need an editable, virtualized grid with typed columns (short and long text, number, date, select, multi-select, checkbox, URL, file) and want an agent wired to it from day one",
  },
  {
    label: "Learning how to connect an agent to client-side UI state",
    text: "the repo shows a complete eve agent whose tools (generate_columns, enrich_cells, add_filters, add_sorts and more) return typed payloads the browser applies to the grid",
  },
  {
    label: "Prototyping bulk enrichment or natural-language filtering",
    text: "select cells and describe the values you want, or describe a filter in plain English, and see the tool calls applied live",
  },
  {
    label: "Not a fit",
    text: "AI Datagrid is not a hosted SaaS, a data store or a public API. There are no accounts, nothing is saved server-side, and AI features need your own Vercel AI Gateway key",
  },
];

/** What the grid does without any AI, so the page reads as a real product description. */
export const gridFeatures: ProseListItem[] = [
  {
    label: "Spreadsheet editing",
    text: "click or press Enter to edit a cell in place, Tab and the arrow keys to move, Shift and Cmd or Ctrl plus the arrows to extend a selection, and Cmd or Ctrl+Z to undo",
  },
  {
    label: "Copy, cut and paste",
    text: "move ranges between cells, or paste tab-separated data from Excel, Google Sheets or Numbers; the grid offers to add rows when a paste runs past the end",
  },
  {
    label: "Columns you can shape",
    text: "resize and reorder columns by dragging, and pin, hide, sort or configure any column from its header menu",
  },
  {
    label: "Filtering and sorting",
    text: "stack multiple filters and multi-column sorts per view, with operators matched to each column type",
  },
  {
    label: "Virtual scrolling",
    text: "rows and columns are virtualized with TanStack Virtual, so a thousand-row sheet scrolls as smoothly as ten rows",
  },
  {
    label: "Row height and density",
    text: "switch between short, medium, tall and extra-tall rows to fit long text",
  },
];

export const columnTypes: ProseListItem[] = [
  { label: "Short text", text: "names, titles and other single-line values" },
  { label: "Long text", text: "notes, descriptions and comments, edited in a larger popover" },
  { label: "Number", text: "prices, quantities and scores, with optional min, max and step" },
  { label: "Date", text: "deadlines and publish dates, picked from a calendar" },
  { label: "Select", text: "one option from a fixed list, such as status or priority" },
  { label: "Multi-select", text: "several options at once, such as tags or skills" },
  { label: "Checkbox", text: "true or false values like done, active or verified" },
  { label: "URL", text: "links to websites and resources" },
  { label: "File", text: "attachments such as documents and images" },
];

/** The agent's tools, named as the model sees them (`agent/tools/*.ts`). */
export const agentTools: ProseListItem[] = [
  {
    label: "generate_columns",
    text: 'designs a table from a description ("a sales pipeline", "a reading list") and adds typed columns with sensible options',
  },
  {
    label: "update_columns",
    text: "renames columns, changes their type, or edits their options and AI prompt",
  },
  { label: "delete_columns", text: "removes columns you no longer need" },
  {
    label: "enrich_cells",
    text: "fills the cells you selected with model-generated values, one structured call per cell, following each column's prompt",
  },
  {
    label: "add_filters, remove_filters, clear_filters",
    text: "turn a plain-English condition into grid filters and back",
  },
  {
    label: "add_sorts, remove_sorts, clear_sorts",
    text: "order rows by one or more columns from a spoken request",
  },
];

export const faq: ProseListItem[] = [
  {
    label: "Is it free?",
    text: "yes. The template is MIT licensed. AI requests are billed by Vercel AI Gateway to whichever key runs them — yours on the demo, or your server's when you deploy your own copy",
  },
  {
    label: "Do I need an account?",
    text: "no. The grid works without signing in or entering anything; only the AI assistant asks for a Vercel AI Gateway key",
  },
  {
    label: "Where is my data stored?",
    text: "only in your browser tab. There is no database, and reloading the page resets the sample data",
  },
  {
    label: "Which model does it use?",
    text: "an OpenAI model routed through Vercel AI Gateway; the model id lives in one file, so swapping providers is a one-line change",
  },
  {
    label: "Can I use it in my own product?",
    text: "yes — fork the repository, replace the sample data with your own source, and keep or drop the agent tools you need",
  },
];

/** Mirrors the in-app shortcut sheet (`data-grid-keyboard-shortcuts.tsx`); Cmd on macOS, Ctrl elsewhere. */
export const keyboardShortcuts: ProseListItem[] = [
  { label: "Arrow keys, Tab, Shift+Tab", text: "move between cells" },
  { label: "Home, End, Cmd+arrow", text: "jump to the first or last column or row" },
  {
    label: "Shift+arrow, Cmd+Shift+arrow",
    text: "extend the selection one cell or to the edge of the table",
  },
  { label: "Cmd+A", text: "select every cell" },
  {
    label: "Enter, F2 or double-click",
    text: "start editing a cell; Shift+Enter inserts a row below",
  },
  { label: "Cmd+C, Cmd+X, Cmd+V", text: "copy, cut and paste cell ranges" },
  {
    label: "Delete or Backspace",
    text: "clear the selected cells; with Cmd, delete the selected rows",
  },
  { label: "Cmd+Z, Cmd+Shift+Z", text: "undo and redo" },
  { label: "Cmd+F", text: "search the grid, with Enter and Shift+Enter to step through matches" },
  { label: "Cmd+Shift+F, Cmd+Shift+S", text: "open the filter or sort menu" },
];

export const howItWorks: string[] = [
  "Each chat message is sent to one agent built with eve. Along with your words, the browser sends a compact description of the grid — its columns and their types, the active filters and sorts, and any cells you have selected — so the model can reason about the sheet without reading every row.",
  "The agent answers by calling tools. Every tool returns a typed payload, validated with zod on both sides, and the browser applies it to the grid exactly as if you had made the edit yourself: new columns appear, filters narrow the rows, enriched values fill the selected cells.",
  "Because the grid state stays in the browser and the agent only ever proposes edits, nothing is lost if a model call fails, and the same pattern carries over to any client-side editor you want an agent to drive.",
];

export const demoRoutes: DemoRoute[] = [
  {
    description: "a blank 26-column spreadsheet to type into or generate from",
    path: "/",
    title: "Spreadsheet",
  },
  { description: "50 sample companies", path: "/companies", title: "Companies" },
  { description: "50 sample people covering every column type", path: "/people", title: "People" },
  { description: "50 sample articles with date columns", path: "/articles", title: "Articles" },
  {
    description: "the agent designs and adds columns from a prompt",
    path: "/generate-demo",
    title: "Generate demo",
  },
  {
    description: "select cells, then ask the agent to fill them in",
    path: "/enrich-demo",
    title: "Enrich demo",
  },
  {
    description: "the agent turns a plain-English request into filters and sorts",
    path: "/filter-sort-demo",
    title: "Filter and sort demo",
  },
];

const trustLinks: ProseListItem[] = [
  { href: "/about", label: "About", text: "what AI Datagrid is and who maintains it" },
  { href: "/contact", label: "Contact", text: "how to reach the maintainer" },
  { href: "/privacy", label: "Privacy", text: "what the demo collects and where your data goes" },
];

export const agentLinks: ProseListItem[] = [
  { href: "/llms.txt", label: "/llms.txt", text: "this overview for language models" },
  { href: "/sitemap.xml", label: "/sitemap.xml", text: "every indexable URL" },
  { href: siteConfig.repository, label: "Source on GitHub", text: "clone, fork or file an issue" },
];

export const aboutPage: ProsePage = {
  blocks: [
    ...siteIntroParagraphs.map(paragraph),
    { kind: "heading", text: "Who makes it" },
    {
      kind: "paragraph",
      text: `${siteConfig.name} is built and maintained by ${siteConfig.author.name}, an independent developer who publishes a family of open-source AI app templates. It is a personal open-source project: there is no company, no paid tier and no sales team behind it.`,
    },
    { kind: "heading", text: "What you can try here" },
    {
      items: demoRoutes.map((route) => ({
        href: route.path,
        label: route.title,
        text: route.description,
      })),
      kind: "list",
    },
    { kind: "heading", text: "More" },
    {
      items: [...agentLinks, ...trustLinks.filter((link) => link.href !== "/about")],
      kind: "list",
    },
  ],
  description: `What ${siteConfig.name} is, how it works, and who maintains it.`,
  heading: `About ${siteConfig.name}`,
  path: "/about",
  schemaType: "AboutPage",
  title: "About",
};

export const contactPage: ProsePage = {
  blocks: [
    {
      kind: "paragraph",
      text: `${siteConfig.name} is maintained by ${siteConfig.author.name}. There is no support desk and no account system, so the fastest route depends on what you need.`,
    },
    {
      items: [
        {
          href: `mailto:${siteConfig.email}`,
          label: siteConfig.email,
          text: "email for anything private: security reports, licensing questions, or collaboration",
        },
        {
          href: `${siteConfig.repository}/issues`,
          label: "GitHub issues",
          text: "bug reports, feature requests and questions about running or forking the template",
        },
        {
          href: siteConfig.repository,
          label: "GitHub repository",
          text: "the full source; pull requests are welcome",
        },
        { href: siteConfig.author.url, label: "kyh.io", text: "the maintainer's other projects" },
      ],
      kind: "list",
    },
    {
      kind: "paragraph",
      text: "Replies are best-effort — this is an open-source side project. When reporting a bug, include the page URL, what you asked the assistant, and what the grid did, so the problem can be reproduced against the deterministic sample data.",
    },
  ],
  description: `How to reach the maintainer of ${siteConfig.name}.`,
  heading: `Contact ${siteConfig.name}`,
  path: "/contact",
  schemaType: "ContactPage",
  title: "Contact",
};

export const privacyPage: ProsePage = {
  blocks: [
    {
      kind: "paragraph",
      text: `${siteConfig.name} has no accounts, no sign-in and no database. Nothing you type into the grid is saved on our side: the spreadsheet lives in your browser's memory and is gone when you reload.`,
    },
    { kind: "heading", text: "What leaves your browser" },
    {
      items: [
        {
          label: "AI requests",
          text: "when you send a chat message, the message plus a snapshot of the grid context the agent needs (column definitions, active filters and sorts, and any cells you selected) goes to the agent running on this site, which forwards it to an OpenAI model through the Vercel AI Gateway. Those providers process it under their own terms",
        },
        {
          label: "Your AI Gateway key",
          text: "if you enter one, it is stored in your browser's localStorage and sent with each AI request as a bearer token so the model runs on your key. It is held only for the duration of the agent session and is never written to a database. Clear it from the key dialog or your browser storage at any time",
        },
        {
          label: "Usage analytics",
          text: "Vercel Web Analytics and Speed Insights record anonymous page views and performance metrics. They use no cookies and do not identify you",
        },
        {
          label: "Hosting logs",
          text: "Vercel, which hosts the site, keeps standard request logs (such as IP address, user agent and URL) for operating and securing the service",
        },
      ],
      kind: "list",
    },
    { kind: "heading", text: "What we don't do" },
    {
      kind: "paragraph",
      text: "No advertising, no tracking cookies, no selling or sharing of data, and no training on your prompts by us. The sample people, companies and articles are generated with Faker and describe no real person.",
    },
    {
      kind: "paragraph",
      text: `Questions or deletion requests: ${siteConfig.email}. If you fork and deploy the template yourself, you are the operator and this policy no longer describes your deployment.`,
    },
  ],
  description: `What ${siteConfig.name} collects, and where your prompts and API key go.`,
  heading: `${siteConfig.name} privacy policy`,
  path: "/privacy",
  schemaType: "WebPage",
  title: "Privacy",
};

export const prosePages: ProsePage[] = [aboutPage, contactPage, privacyPage];

export const demoLinks: ProseListItem[] = demoRoutes.map((route) => ({
  href: route.path,
  label: route.title,
  text: route.description,
}));

export const pageLinks: ProseListItem[] = prosePages.map((page) => ({
  href: page.path,
  label: page.title,
  text: page.description,
}));

/** The homepage outline, rendered as hidden HTML on `/` and as its Markdown twin. */
export const homeSections: { heading: string; items: ProseListItem[] }[] = [
  { heading: `When to use ${siteConfig.name}`, items: whenToUse },
  { heading: "What the grid does", items: gridFeatures },
  { heading: "Column types", items: columnTypes },
  { heading: "What the AI assistant can do", items: agentTools },
  { heading: "Keyboard shortcuts", items: keyboardShortcuts },
  { heading: "Demos", items: demoLinks },
  { heading: "Questions", items: faq },
  { heading: "More", items: [...pageLinks, ...agentLinks] },
];
