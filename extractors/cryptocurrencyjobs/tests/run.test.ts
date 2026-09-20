import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCryptocurrencyjobs } from "../src/run-local";

const context: ExtractorRuntimeContext = {
  source: "cryptocurrencyjobs",
  selectedSources: ["cryptocurrencyjobs"],
  settings: { jobspyResultsWanted: "1" },
  searchTerms: [],
  selectedCountry: "worldwide",
};

describe("CryptocurrencyJobs extractor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("maps the public RSS feed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            `<rss><channel><item><title>Rust Engineer</title><link>https://cryptocurrencyjobs.co/rust-engineer/</link><description>Build crypto infrastructure.</description><pubDate>Tue, 20 Sep 2026 10:00:00 GMT</pubDate><creator>Acme Crypto</creator></item></channel></rss>`,
            { status: 200 },
          ),
      ),
    );

    const result = await runCryptocurrencyjobs(context);

    expect(result.success).toBe(true);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      source: "cryptocurrencyjobs",
      title: "Rust Engineer",
      employer: "Acme Crypto",
      jobUrl: "https://cryptocurrencyjobs.co/rust-engineer/",
    });
  });
});
