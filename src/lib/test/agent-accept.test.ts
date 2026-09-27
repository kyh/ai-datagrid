import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { prefersMarkdown, withVaryAccept } from "@/lib/agent/accept";

describe("prefersMarkdown", () => {
  test("serves HTML when the client states no preference", () => {
    for (const header of [null, "", "  ", "*/*", "text/*", "garbage"]) {
      assert.equal(prefersMarkdown(header), false, String(header));
    }
  });

  test("serves HTML to a browser", () => {
    assert.equal(
      prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
      false,
    );
  });

  test("serves Markdown when asked for it", () => {
    for (const header of [
      "text/markdown",
      "TEXT/MARKDOWN",
      "text/markdown;charset=utf-8",
      "text/markdown, */*",
    ]) {
      assert.equal(prefersMarkdown(header), true, header);
    }
  });

  test("ranks by q-value, then by client order", () => {
    assert.equal(prefersMarkdown("text/html;q=0.5, text/markdown;q=0.9"), true);
    assert.equal(prefersMarkdown("text/markdown;q=0.2, text/html"), false);
    assert.equal(prefersMarkdown("text/markdown, text/html"), true);
    assert.equal(prefersMarkdown("text/html, text/markdown"), false);
  });

  test("honours q=0 as a rejection, even behind a wildcard", () => {
    assert.equal(prefersMarkdown("text/markdown;q=0, */*"), false);
    assert.equal(prefersMarkdown("text/html;q=0, text/markdown"), true);
  });
});

describe("withVaryAccept", () => {
  test("adds Accept while keeping Next's RSC tokens", () => {
    assert.equal(withVaryAccept(null), "Accept");
    assert.equal(
      withVaryAccept("rsc, next-router-state-tree"),
      "rsc, next-router-state-tree, Accept",
    );
  });

  test("never duplicates Accept", () => {
    assert.equal(withVaryAccept("accept, rsc"), "accept, rsc");
  });
});
