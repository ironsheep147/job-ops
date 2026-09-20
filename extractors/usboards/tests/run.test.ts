import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseHigherEdJobsFeed, runUsBoard } from "../src/run-local";

const context = {
  source: "higheredjobs",
  selectedSources: ["higheredjobs"],
  settings: { jobspyResultsWanted: "10" },
  searchTerms: [],
  selectedCountry: "united states",
};

describe("US board extractors", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("parses HigherEdJobs RSS items into normalized jobs", () => {
    const jobs = parseHigherEdJobsFeed(`
      <rss><channel><item>
        <guid>123</guid>
        <title><![CDATA[Assistant Professor]]></title>
        <description><![CDATA[Acme University (Boston, MA)]]></description>
        <link>https://www.higheredjobs.com/fake/123</link>
        <pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
      </item></channel></rss>
    `);

    expect(jobs[0]).toMatchObject({
      source: "higheredjobs",
      sourceJobId: "123",
      title: "Assistant Professor",
      employer: "Acme University",
      location: "Boston, MA",
    });
  });

  it("fetches and filters HigherEdJobs listings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {},
          {
            status: 200,
            headers: { "content-type": "application/rss+xml" },
          },
        ),
      ),
    );
    const response = await runUsBoard(context);
    expect(response.success).toBe(true);
    expect(response.jobs).toEqual([]);
  });
});
