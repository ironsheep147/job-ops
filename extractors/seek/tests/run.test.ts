import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const call = vi.fn();
const listItems = vi.fn();

vi.mock("apify-client", () => ({
  ApifyClient: class {
    actor() {
      return { call };
    }

    dataset() {
      return { listItems };
    }
  },
}));

const { runSeek } = await import("../src/run");

const context: ExtractorRuntimeContext = {
  source: "seek",
  selectedSources: ["seek"],
  settings: { seekMaxJobsPerTerm: "1" },
  searchTerms: ["software engineer"],
  selectedCountry: "australia",
};

describe("Seek extractor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.APIFY_TOKEN = "test-token";
    call.mockResolvedValue({ defaultDatasetId: "dataset-1" });
    listItems.mockResolvedValue({
      items: [
        {
          id: "seek-1",
          title: "Software Engineer",
          company: "Acme",
          url: "https://www.seek.com.au/job/seek-1",
          location: "Sydney",
          applyUrl: "https://www.seek.com.au/job/seek-1/apply",
          workArrangement: "remote",
        },
      ],
    });
  });

  it("maps an Apify dataset item into a job-ops job", async () => {
    const result = await runSeek({
      searchTerms: context.searchTerms,
      locations: ["All Australia"],
      country: context.selectedCountry,
      maxJobsPerTerm: 1,
    });

    expect(result.success).toBe(true);
    expect(result.jobs[0]).toMatchObject({
      source: "seek",
      sourceJobId: "seek-1",
      title: "Software Engineer",
      employer: "Acme",
      jobUrl: "https://www.seek.com.au/job/seek-1",
      applicationLink: "https://www.seek.com.au/job/seek-1/apply",
      location: "Sydney, Australia",
      isRemote: true,
    });
    expect(call).toHaveBeenCalledWith({
      searchQuery: "software engineer",
      location: "All Australia",
      maxResults: 1,
      fetchDetails: true,
    });
  });
});
