"use client";

import { faker } from "@faker-js/faker";
import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getArticlesColumns, getArticlesData } from "@/data/seed";
import type { Article } from "@/data/seed";

const createArticle = (): Article => ({ id: faker.string.nanoid(8) });

const createArticles = (count: number): Article[] =>
  Array.from({ length: count }, () => ({
    id: faker.string.nanoid(8),
  }));

const ArticlesPage = () => {
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
};

export default ArticlesPage;
