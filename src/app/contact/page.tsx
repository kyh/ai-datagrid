import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { ProsePageView } from "@/components/prose";
import { contactPage } from "@/lib/agent/site-content";
import { buildProsePageGraph } from "@/lib/agent/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: contactPage.path },
  description: contactPage.description,
  title: contactPage.title,
};

const ContactPage = () => (
  <>
    <JsonLd node={buildProsePageGraph(contactPage)} />
    <ProsePageView page={contactPage} />
  </>
);

export default ContactPage;
