import { siteConfig } from "../config";
import { absoluteUrl } from "./markdown";
import { siteSummary } from "./site-content";
import type { ProsePage } from "./site-content";

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export interface JsonLdNode {
  [key: string]: JsonLdValue;
}

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;
const APPLICATION_ID = `${siteConfig.url}/#application`;

/**
 * No `address` on purpose: this is a personal open-source project with no
 * premises, and a made-up PostalAddress would be worse than none.
 */
export const buildOrganization = (): JsonLdNode => ({
  "@id": ORGANIZATION_ID,
  "@type": "Organization",
  contactPoint: [
    {
      "@type": "ContactPoint",
      availableLanguage: ["en"],
      contactType: "customer support",
      email: siteConfig.email,
      url: absoluteUrl("/contact"),
    },
    {
      "@type": "ContactPoint",
      availableLanguage: ["en"],
      contactType: "technical support",
      email: siteConfig.email,
      url: `${siteConfig.repository}/issues`,
    },
  ],
  description: siteSummary,
  email: siteConfig.email,
  founder: { "@type": "Person", name: siteConfig.author.name, url: siteConfig.author.url },
  logo: absoluteUrl("/favicon/favicon-96x96.png"),
  name: siteConfig.name,
  sameAs: siteConfig.sameAs,
  url: siteConfig.url,
});

const buildWebSite = (): JsonLdNode => ({
  "@id": WEBSITE_ID,
  "@type": "WebSite",
  description: siteConfig.description,
  inLanguage: "en-US",
  name: siteConfig.name,
  publisher: { "@id": ORGANIZATION_ID },
  url: siteConfig.url,
});

const buildSoftwareApplication = (): JsonLdNode => ({
  "@id": APPLICATION_ID,
  "@type": "SoftwareApplication",
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "AI spreadsheet template",
  codeRepository: siteConfig.repository,
  description: siteSummary,
  featureList: [
    "Excel-like editable, virtualized data grid",
    "AI column generation from a prompt",
    "AI enrichment of selected cells",
    "Natural-language filtering and sorting",
  ],
  image: absoluteUrl("/og.jpg"),
  isAccessibleForFree: true,
  license: "https://opensource.org/licenses/MIT",
  name: siteConfig.name,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  operatingSystem: "Any",
  publisher: { "@id": ORGANIZATION_ID },
  url: siteConfig.url,
});

export const buildHomeGraph = (): JsonLdNode => ({
  "@context": "https://schema.org",
  "@graph": [buildOrganization(), buildWebSite(), buildSoftwareApplication()],
});

export const buildProsePageGraph = (page: ProsePage): JsonLdNode => ({
  "@context": "https://schema.org",
  "@graph": [
    buildOrganization(),
    {
      "@id": `${absoluteUrl(page.path)}#webpage`,
      "@type": page.schemaType,
      about: { "@id": ORGANIZATION_ID },
      description: page.description,
      isPartOf: { "@id": WEBSITE_ID },
      name: page.heading,
      url: absoluteUrl(page.path),
    },
  ],
});

/** Escapes `<` so no value can close the surrounding `<script>` early. */
export const serializeJsonLd = (node: JsonLdNode): string =>
  JSON.stringify(node).replaceAll("<", "\\u003c");
