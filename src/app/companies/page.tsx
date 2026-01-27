"use client";

import { faker } from "@faker-js/faker";
import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getCompaniesColumns, getCompaniesData, type Company } from "@/data/seed";

function createCompany(): Company {
  return { id: faker.string.nanoid(8) };
}

function createCompanies(count: number): Company[] {
  return Array.from({ length: count }, () => ({
    id: faker.string.nanoid(8),
  }));
}

export default function CompaniesPage() {
  const data = getCompaniesData();
  const columns = getCompaniesColumns(getFilterFn());

  return (
    <DataGridContainer<Company>
      initialData={data}
      initialColumns={columns}
      getRowId={(row) => row.id}
      createNewRow={createCompany}
      createNewRows={createCompanies}
      pinnedColumns={["select"]}
      defaultColumnId="name"
    />
  );
}
