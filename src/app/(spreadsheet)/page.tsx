import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { SiteIntro } from "@/components/site-intro";
import { buildHomeGraph } from "@/lib/agent/structured-data";

import { SpreadsheetGrid } from "./spreadsheet-grid";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SpreadsheetPage = () => (
  <>
    <JsonLd node={buildHomeGraph()} />
    <SiteIntro />
    <SpreadsheetGrid />
  </>
);

export default SpreadsheetPage;
