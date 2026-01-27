"use client";

import { faker } from "@faker-js/faker";
import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getPeopleColumns, getPeopleData, type Person } from "@/data/seed";

function createPerson(): Person {
  return { id: faker.string.nanoid(8) };
}

function createPeople(count: number): Person[] {
  return Array.from({ length: count }, () => ({
    id: faker.string.nanoid(8),
  }));
}

export default function PeoplePage() {
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
}
