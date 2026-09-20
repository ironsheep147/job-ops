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

  it("follows redirects for public board feeds", async () => {
    const fetchMock = vi.fn(
      async () => new Response("<rss><channel /></rss>", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await runUsBoard(context);

    expect(response.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirect: "follow" }),
    );
  });

  it("sends the search term to IBM instead of fetching an unfiltered page", async () => {
    const fetchMock = vi.fn(async () => Response.json({ hits: { hits: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await runUsBoard({
      ...context,
      source: "ibm",
      selectedSources: ["ibm"],
      searchTerms: ["data engineer"],
    });

    expect(response.success).toBe(true);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));
    expect(body.query.bool.must[0].multi_match.query).toBe("data engineer");
    expect(body.sm.query).toBe("data engineer");
  });
});
