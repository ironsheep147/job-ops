import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runHimalayas } from "../src/run-local";

const context: ExtractorRuntimeContext = {
  source: "himalayas",
  selectedSources: ["himalayas"],
  settings: { jobspyResultsWanted: "1" },
  searchTerms: [],
  selectedCountry: "worldwide",
};

describe("Himalayas extractor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("maps the cursor-feed job shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          jobs: [
            {
              title: "Operations Analyst",
              companyName: "Acme",
              locationRestrictions: ["United States"],
              applicationLink:
                "https://himalayas.app/companies/acme/jobs/operations-analyst",
              pubDate: 1789919436,
              description: "Improve business operations.",
            },
          ],
        }),
      ),
    );

    const result = await runHimalayas(context);

    expect(result.success).toBe(true);
    expect(result.jobs[0]).toMatchObject({
      source: "himalayas",
      title: "Operations Analyst",
      employer: "Acme",
      jobUrl: "https://himalayas.app/companies/acme/jobs/operations-analyst",
      location: "United States",
    });
  });
});
