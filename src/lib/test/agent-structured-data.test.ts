import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { privacyPage } from "@/lib/agent/site-content";
import {
  buildHomeGraph,
  buildOrganization,
  buildProsePageGraph,
  serializeJsonLd,
} from "@/lib/agent/structured-data";
import { siteConfig } from "@/lib/config";

describe("structured data", () => {
  test("home graph names the organization, website and application", () => {
    const parsed: unknown = JSON.parse(serializeJsonLd(buildHomeGraph()));
    const types = new Set(JSON.stringify(parsed).match(/"@type":"[A-Za-z]+"/gu));
    for (const type of ["Organization", "WebSite", "SoftwareApplication"]) {
      assert.ok(types.has(`"@type":"${type}"`), type);
    }
  });

  test("organization has contact points and no invented address", () => {
    const org = buildOrganization();
    assert.equal(org["email"], siteConfig.email);
    assert.ok(Array.isArray(org["contactPoint"]));
    assert.equal("address" in org, false);
  });

  test("prose page graph points at the page URL", () => {
    assert.ok(
      serializeJsonLd(buildProsePageGraph(privacyPage)).includes(`${siteConfig.url}/privacy`),
    );
  });

  test("serializer escapes < so the script tag can't close early", () => {
    assert.equal(serializeJsonLd({ name: "</script>" }).includes("<"), false);
  });
});
