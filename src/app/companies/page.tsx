"use client";

import { faker } from "@faker-js/faker";
import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getCompaniesColumns, getCompaniesData } from "@/data/seed";
import type { Company } from "@/data/seed";

const createCompany = (): Company => ({ id: faker.string.nanoid(8) });

const createCompanies = (count: number): Company[] =>
  Array.from({ length: count }, () => ({
    id: faker.string.nanoid(8),
  }));

const CompaniesPage = () => {
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
};

export default CompaniesPage;
