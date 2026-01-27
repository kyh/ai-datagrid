"use client";

import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getEmailContactsColumns, getEmailContactsData, type EmailContact } from "@/data/seed";

function createContact(): EmailContact {
  return { id: `contact-${Date.now()}`, email: "" };
}

function createContacts(count: number): EmailContact[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `contact-${Date.now()}-${i}`,
    email: "",
  }));
}

export default function EnrichDemoPage() {
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
}
