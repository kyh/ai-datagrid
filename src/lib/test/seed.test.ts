import { describe, expect, it } from "vitest";

import { getArticlesData, getCompaniesData, getPeopleData, getTweetsData } from "@/data/seed";

/**
 * AGENTS.md tells agents to assert against these fixtures as the repo's "known
 * state" (there is no login and no database). That contract only holds if the
 * fixtures are both time-independent and order-independent — `faker` is a module
 * singleton, so without a re-seed per generator, visiting `/articles` before
 * `/people` would silently shift every row.
 */
describe("fixture determinism", () => {
  it("renders the documented first row of /people", () => {
    expect(getPeopleData()[0]?.name).toBe("Clinton Mertz");
  });

  it("is order-independent across generators", () => {
    getArticlesData();
    getCompaniesData();
    getTweetsData();
    expect(getPeopleData()[0]?.name).toBe("Clinton Mertz");
  });

  it("returns identical data on repeat calls", () => {
    expect(getArticlesData()).toStrictEqual(getArticlesData());
    expect(getCompaniesData()).toStrictEqual(getCompaniesData());
    expect(getTweetsData()).toStrictEqual(getTweetsData());
  });
});
