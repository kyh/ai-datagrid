"use client";

import { faker } from "@faker-js/faker";
import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getArticlesColumns, getArticlesData, type Article } from "@/data/seed";

function createArticle(): Article {
  return { id: faker.string.nanoid(8) };
}

function createArticles(count: number): Article[] {
  return Array.from({ length: count }, () => ({
    id: faker.string.nanoid(8),
  }));
}

export default function ArticlesPage() {
  const data = getArticlesData();
  const columns = getArticlesColumns(getFilterFn());

  return (
    <DataGridContainer<Article>
      initialData={data}
      initialColumns={columns}
      getRowId={(row) => row.id}
      createNewRow={createArticle}
      createNewRows={createArticles}
      pinnedColumns={["select"]}
      defaultColumnId="title"
    />
  );
}
