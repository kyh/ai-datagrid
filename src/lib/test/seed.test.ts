import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getArticlesData, getCompaniesData, getPeopleData, getTweetsData } from "@/data/seed";

/**
 * AGENTS.md tells agents to assert against these fixtures as the repo's "known
 * state" (there is no login and no database). That contract only holds if the
 * fixtures are both time-independent and order-independent — `faker` is a module
 * singleton, so without a re-seed per generator, visiting `/articles` before
 * `/people` would silently shift every row.
 */
describe("fixture determinism", () => {
  test("renders the documented first row of /people", () => {
    assert.strictEqual(getPeopleData()[0]?.name, "Colton Mertz");
  });

  test("is order-independent across generators", () => {
    getArticlesData();
    getCompaniesData();
    getTweetsData();
    assert.strictEqual(getPeopleData()[0]?.name, "Colton Mertz");
  });

  test("returns identical data on repeat calls", () => {
    assert.deepEqual(getArticlesData(), getArticlesData());
    assert.deepEqual(getCompaniesData(), getCompaniesData());
    assert.deepEqual(getTweetsData(), getTweetsData());
  });
});
