import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runFourdayweek } from "../src/run-local";

const context: ExtractorRuntimeContext = {
  source: "fourdayweek",
  selectedSources: ["fourdayweek"],
  settings: { jobspyResultsWanted: "1" },
  searchTerms: [],
  selectedCountry: "worldwide",
};

describe("4 Day Week extractor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("maps the current API shape to a detail URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          jobs: [
            {
              id: "job-1",
              slug: "rust-engineer-at-acme",
              title: "Rust Engineer",
              company_name: "Acme",
              locations: [{ city: "Riyadh", country: "Saudi Arabia" }],
              posted: 1789791914,
              category: "Engineering",
            },
          ],
        }),
      ),
    );

    const result = await runFourdayweek(context);

    expect(result.success).toBe(true);
    expect(result.jobs[0]).toMatchObject({
      source: "fourdayweek",
      title: "Rust Engineer",
      employer: "Acme",
      jobUrl: "https://4dayweek.io/job/rust-engineer-at-acme",
      location: "Riyadh, Saudi Arabia",
    });
  });
});
