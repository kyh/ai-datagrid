"use client";

import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getEmailContactsColumns, getEmailContactsData } from "@/data/seed";
import type { EmailContact } from "@/data/seed";

const createContact = (): EmailContact => ({ email: "", id: `contact-${Date.now()}` });

const createContacts = (count: number): EmailContact[] =>
  Array.from({ length: count }, (_, i) => ({
    email: "",
    id: `contact-${Date.now()}-${i}`,
  }));

const EnrichDemoPage = () => {
  const data = getEmailContactsData();
  const columns = getEmailContactsColumns(getFilterFn());

  return (
    <DataGridContainer<EmailContact>
      initialData={data}
      initialColumns={columns}
      getRowId={(row) => row.id}
      createNewRow={createContact}
      createNewRows={createContacts}
      pinnedColumns={["select"]}
      defaultColumnId="email"
    />
  );
};

export default EnrichDemoPage;
