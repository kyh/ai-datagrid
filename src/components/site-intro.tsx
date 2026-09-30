import { ProseList, ProseParagraph } from "@/components/prose";
import {
  homeSections,
  howItWorks,
  siteIntroParagraphs,
  siteSummary,
} from "@/lib/agent/site-content";
import { siteConfig } from "@/lib/config";

/**
 * The homepage is a client-rendered spreadsheet, so crawlers and agents that
 * don't run JavaScript would see an empty shell. This server-rendered,
 * visually hidden outline is the same content as the Markdown twin of `/`.
 */
export const SiteIntro = () => (
  <section className="sr-only" aria-labelledby="site-intro-heading">
    <h2 id="site-intro-heading">{siteConfig.name}: an AI spreadsheet template</h2>
    <ProseParagraph text={siteSummary} />
    {siteIntroParagraphs.map((text) => (
      <ProseParagraph key={text} text={text} />
    ))}
    <h3>How it works</h3>
    {howItWorks.map((text) => (
      <ProseParagraph key={text} text={text} />
    ))}
    {homeSections.map((section) => (
      <section key={section.heading}>
        <h3>{section.heading}</h3>
        <ProseList items={section.items} focus="untabbable" />
      </section>
    ))}
  </section>
);
