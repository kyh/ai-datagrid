"use client";

import { faker } from "@faker-js/faker";
import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getPeopleColumns, getPeopleData } from "@/data/seed";
import type { Person } from "@/data/seed";

const createPerson = (): Person => ({ id: faker.string.nanoid(8) });

const createPeople = (count: number): Person[] =>
  Array.from({ length: count }, () => ({
    id: faker.string.nanoid(8),
  }));

const PeoplePage = () => {
  const data = getPeopleData();
  const columns = getPeopleColumns(getFilterFn());

  return (
    <DataGridContainer<Person>
      initialData={data}
      initialColumns={columns}
      getRowId={(row) => row.id}
      createNewRow={createPerson}
      createNewRows={createPeople}
      pinnedColumns={["select"]}
      defaultColumnId="name"
    />
  );
};

export default PeoplePage;
