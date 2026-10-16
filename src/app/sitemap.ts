import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";

import { siteConfig } from "@/lib/config";

// Cached so the sitemap stays prerendered under cacheComponents, where a bare
// `new Date()` would render it on every request.
// oxlint-disable-next-line require-await -- "use cache" requires an async function
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  "use cache";
  cacheLife("max");
  const routes = siteConfig.routes.map((route) => ({
    lastModified: new Date().toISOString(),
    url: `${siteConfig.url}${route}`,
  }));

  return [...routes];
};

export default sitemap;
