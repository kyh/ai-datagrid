import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { ProsePageView } from "@/components/prose";
import { aboutPage } from "@/lib/agent/site-content";
import { buildProsePageGraph } from "@/lib/agent/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: aboutPage.path },
  description: aboutPage.description,
  title: aboutPage.title,
};

const AboutPage = () => (
  <>
    <JsonLd node={buildProsePageGraph(aboutPage)} />
    <ProsePageView page={aboutPage} />
  </>
);

export default AboutPage;
