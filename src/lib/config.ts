export const siteConfig = {
  name: "AI Datagrid",
  shortName: "AI Datagrid",
  description:
    "Forkable Next.js template featuring an AI spreadsheet — generate columns, enrich cells, filter and sort in natural language.",
  url:
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://ai-datagrid.kyh.io",
  creator: "@kaiyuhsu",
  routes: [
    "",
    "/companies",
    "/people",
    "/articles",
    "/generate-demo",
    "/enrich-demo",
    "/filter-sort-demo",
  ],
};
