export const siteConfig = {
  author: { name: "Kaiyu Hsu", url: "https://kyh.io" },
  creator: "@kaiyuhsu",
  description:
    "Forkable Next.js template featuring an AI spreadsheet — generate columns, enrich cells, filter and sort in natural language.",
  email: "im.kaiyu@gmail.com",
  name: "AI Datagrid",
  repository: "https://github.com/kyh/ai-datagrid",
  routes: [
    "",
    "/companies",
    "/people",
    "/articles",
    "/generate-demo",
    "/enrich-demo",
    "/filter-sort-demo",
    "/about",
    "/contact",
    "/privacy",
  ],
  sameAs: ["https://github.com/kyh/ai-datagrid", "https://x.com/kaiyuhsu", "https://kyh.io"],
  shortName: "AI Datagrid",
  url: process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://datagrid.kyh.io",
};
