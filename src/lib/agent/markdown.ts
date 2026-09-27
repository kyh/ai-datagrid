import { siteConfig } from "../config";
import {
  agentLinks,
  demoLinks,
  demoRoutes,
  homeSections,
  howItWorks,
  pageLinks,
  prosePages,
  siteIntroParagraphs,
  siteSummary,
  whenToUse,
} from "./site-content";
import type { DemoRoute, ProseBlock, ProseListItem, ProsePage } from "./site-content";

export const absoluteUrl = (href: string): string =>
  href.startsWith("/") ? `${siteConfig.url}${href === "/" ? "" : href}` : href;

const listItem = (item: ProseListItem): string => {
  const label = item.href ? `[${item.label}](${absoluteUrl(item.href)})` : `**${item.label}**`;
  return item.text ? `- ${label}: ${item.text}` : `- ${label}`;
};

const renderBlock = (block: ProseBlock): string => {
  if (block.kind === "heading") {
    return `## ${block.text}`;
  }
  if (block.kind === "list") {
    return block.items.map(listItem).join("\n");
  }
  return block.text;
};

const finish = (sections: string[]): string => `${sections.join("\n\n").trim()}\n`;

export const renderHomeMarkdown = (): string =>
  finish([
    `# ${siteConfig.name}`,
    `> ${siteSummary}`,
    ...siteIntroParagraphs,
    "## How it works",
    ...howItWorks,
    ...homeSections.flatMap((section) => [
      `## ${section.heading}`,
      section.items.map(listItem).join("\n"),
    ]),
  ]);

export const renderProsePageMarkdown = (page: ProsePage): string =>
  finish([`# ${page.heading}`, `> ${page.description}`, ...page.blocks.map(renderBlock)]);

const renderDemoMarkdown = (route: DemoRoute): string =>
  finish([
    `# ${route.title} — ${siteConfig.name}`,
    `> ${route.description}.`,
    `This page is an interactive spreadsheet that renders in the browser. Open ${absoluteUrl(route.path)} in a browser to use it; ${siteConfig.name}'s overview is at ${absoluteUrl("/llms.txt")}.`,
  ]);

export const renderNotFoundMarkdown = (pathname: string): string =>
  finish([
    "# 404 — page not found",
    `Nothing lives at \`${pathname}\` on ${siteConfig.name}.`,
    "## Try instead",
    [{ href: "/", label: siteConfig.name, text: "the home page" }, ...agentLinks, ...pageLinks]
      .map(listItem)
      .join("\n"),
  ]);

export interface MarkdownResponse {
  body: string;
  status: 200 | 404;
}

/** The Markdown twin of a page, or a 404 body that points at the recovery surfaces. */
export const renderMarkdownFor = (pathname: string): MarkdownResponse => {
  if (pathname === "/" || pathname === "") {
    return { body: renderHomeMarkdown(), status: 200 };
  }
  const prose = prosePages.find((page) => page.path === pathname);
  if (prose) {
    return { body: renderProsePageMarkdown(prose), status: 200 };
  }
  const demo = demoRoutes.find((route) => route.path === pathname);
  if (demo) {
    return { body: renderDemoMarkdown(demo), status: 200 };
  }
  return { body: renderNotFoundMarkdown(pathname), status: 404 };
};

/**
 * `/llms.txt` in the llmstxt.org shape: H1, blockquote summary, free prose,
 * then H2 sections that are link lists only — which is why the when-to-use
 * guidance sits above the first H2 as bold-labelled prose.
 */
export const renderLlmsTxt = (): string =>
  finish([
    `# ${siteConfig.name}`,
    `> ${siteSummary}`,
    ...siteIntroParagraphs,
    `**When to use ${siteConfig.name}:**`,
    whenToUse.map(listItem).join("\n"),
    `How to use it: send \`Accept: text/markdown\` to any page URL to get this kind of Markdown instead of HTML. To run it yourself, \`git clone ${siteConfig.repository}\`, add an \`AI_GATEWAY_API_KEY\` to \`.env.local\`, and run \`pnpm dev\`; the repo's AGENTS.md is written for coding agents.`,
    "## Demos",
    demoLinks.map(listItem).join("\n"),
    "## About",
    pageLinks.map(listItem).join("\n"),
    "## Optional",
    [
      { href: "/sitemap.xml", label: "Sitemap", text: "every indexable URL" },
      { href: "/robots.txt", label: "robots.txt", text: "crawler policy; AI agents are welcome" },
      { href: siteConfig.repository, label: "Source on GitHub", text: "MIT licensed" },
      {
        href: `${siteConfig.repository}/blob/main/AGENTS.md`,
        label: "AGENTS.md",
        text: "how to run and verify the template headlessly",
      },
    ]
      .map(listItem)
      .join("\n"),
  ]);
