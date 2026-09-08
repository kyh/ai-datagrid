"use client";

import { faker } from "@faker-js/faker";
import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getTweetsColumns, getTweetsData } from "@/data/seed";
import type { Tweet } from "@/data/seed";

const createTweet = (): Tweet => ({ id: faker.string.nanoid(8) });

const createTweets = (count: number): Tweet[] =>
  Array.from({ length: count }, () => ({
    id: faker.string.nanoid(8),
  }));

const FilterSortDemoPage = () => {
  const data = getTweetsData();
  const columns = getTweetsColumns(getFilterFn());

  return (
    <DataGridContainer<Tweet>
      initialData={data}
      initialColumns={columns}
      getRowId={(row) => row.id}
      createNewRow={createTweet}
      createNewRows={createTweets}
      pinnedColumns={["select"]}
      defaultColumnId="url"
      initialChatInput="Show only bangers from @levelsio, sorted by date descending"
    />
  );
};

export default FilterSortDemoPage;
