import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { ProsePageView } from "@/components/prose";
import { privacyPage } from "@/lib/agent/site-content";
import { buildProsePageGraph } from "@/lib/agent/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: privacyPage.path },
  description: privacyPage.description,
  title: privacyPage.title,
};

const PrivacyPage = () => (
  <>
    <JsonLd node={buildProsePageGraph(privacyPage)} />
    <ProsePageView page={privacyPage} />
  </>
);

export default PrivacyPage;
