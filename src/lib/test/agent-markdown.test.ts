import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { renderLlmsTxt, renderMarkdownFor } from "@/lib/agent/markdown";
import { siteConfig } from "@/lib/config";

describe("renderLlmsTxt — llmstxt.org shape", () => {
  const body = renderLlmsTxt();
  const lines = body.split("\n");

  test("opens with one H1 and a blockquote summary", () => {
    assert.equal(lines[0], `# ${siteConfig.name}`);
    assert.equal(lines.filter((line) => line.startsWith("# ")).length, 1);
    assert.ok(lines[2]?.startsWith("> "));
  });

  test("keeps when-to-use guidance above the first H2", () => {
    const preamble = body.slice(0, body.indexOf("\n## "));
    assert.match(preamble, /\*\*When to use AI Datagrid:\*\*/u);
    assert.match(preamble, /Not a fit/u);
  });

  test("keeps every H2 section a link list", () => {
    for (const section of body.split(/^## /mu).slice(1)) {
      const items = section.split("\n").slice(1).filter(Boolean);
      assert.ok(items.length > 0);
      for (const item of items) {
        assert.match(item, /^- \[/u);
      }
    }
  });

  test("links the trust pages and sitemap with absolute URLs", () => {
    for (const path of ["/about", "/contact", "/privacy", "/sitemap.xml"]) {
      assert.ok(body.includes(`](${siteConfig.url}${path})`), path);
    }
  });
});

describe("renderMarkdownFor", () => {
  test("renders the home page", () => {
    const { body, status } = renderMarkdownFor("/");
    assert.equal(status, 200);
    assert.ok(body.startsWith(`# ${siteConfig.name}\n`));
  });

  test("renders trust pages with at least 500 characters", () => {
    for (const path of ["/about", "/contact", "/privacy"]) {
      const { body, status } = renderMarkdownFor(path);
      assert.equal(status, 200, path);
      assert.ok(body.length >= 500, `${path} is ${body.length} chars`);
    }
  });

  test("renders a demo route", () => {
    assert.equal(renderMarkdownFor("/people").status, 200);
  });

  test("answers unknown paths with a 404 that points at recovery surfaces", () => {
    const { body, status } = renderMarkdownFor("/nope");
    assert.equal(status, 404);
    assert.ok(body.includes("`/nope`"));
    assert.ok(body.includes(`${siteConfig.url}/llms.txt`));
    assert.ok(body.includes(`${siteConfig.url}/sitemap.xml`));
  });
});
