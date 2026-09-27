import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { prefersMarkdown, withVaryAccept } from "@/lib/agent/accept";

/**
 * Markdown content negotiation: one URL, two representations. Pages render
 * HTML unconditionally, so Markdown-preferring requests are rewritten to
 * `/api/markdown/*` before the page renders.
 */
export const proxy = (request: NextRequest) => {
  const response = prefersMarkdown(request.headers.get("accept"))
    ? NextResponse.rewrite(new URL(`/api/markdown${request.nextUrl.pathname}`, request.url))
    : NextResponse.next();
  response.headers.set("Vary", withVaryAccept(response.headers.get("Vary")));
  return response;
};

/**
 * Only requests whose Accept names markdown invoke the proxy, so browsers never
 * pay for it. Next and Vercel compile `has` to anchored, case-sensitive regexes,
 * hence the per-character case class. eve's agent routes (`/eve/*`,
 * `/_eve_internal/*`) and files with a single representation are excluded.
 */
export const config = {
  matcher: [
    {
      has: [{ key: "accept", type: "header", value: ".*[Mm][Aa][Rr][Kk][Dd][Oo][Ww][Nn].*" }],
      source:
        "/((?!api/|_next/|_vercel/|eve/|_eve_internal/|favicon/|robots\\.txt$|sitemap\\.xml$|llms\\.txt$|og\\.jpg$).*)",
    },
  ],
};
