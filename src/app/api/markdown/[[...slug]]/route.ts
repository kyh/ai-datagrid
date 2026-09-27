import { MARKDOWN_CONTENT_TYPE } from "@/lib/agent/accept";
import { renderMarkdownFor } from "@/lib/agent/markdown";

interface MarkdownParams {
  params: Promise<{ slug?: string[] }>;
}

/**
 * The Markdown half of content negotiation; `src/proxy.ts` rewrites here.
 * Not a public contract — agents request the page URL with `Accept: text/markdown`.
 */
export const GET = async (_request: Request, { params }: MarkdownParams) => {
  const { slug = [] } = await params;
  const { body, status } = renderMarkdownFor(`/${slug.join("/")}`);

  return new Response(body, {
    headers: {
      "Cache-Control":
        status === 200
          ? "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
          : "no-store",
      "Content-Type": MARKDOWN_CONTENT_TYPE,
      Vary: "Accept",
    },
    status,
  });
};
