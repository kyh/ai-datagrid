export const siteConfig = {
  creator: "@kaiyuhsu",
  description:
    "Forkable Next.js template featuring an AI spreadsheet — generate columns, enrich cells, filter and sort in natural language.",
  name: "AI Datagrid",
  routes: [
    "",
    "/companies",
    "/people",
    "/articles",
    "/generate-demo",
    "/enrich-demo",
    "/filter-sort-demo",
  ],
  shortName: "AI Datagrid",
  url: process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://datagrid.kyh.io",
};
