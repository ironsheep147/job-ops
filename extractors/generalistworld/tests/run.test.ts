import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runGeneralistworld } from "../src/run-local";

const context: ExtractorRuntimeContext = {
  source: "generalistworld",
  selectedSources: ["generalistworld"],
  settings: { jobspyResultsWanted: "1" },
  searchTerms: [],
  selectedCountry: "worldwide",
};

describe("Generalist World extractor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("parses the server-rendered job cards", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            `<a class="gw-job-card" data-region="remote" href="/jobs/chief-of-staff-acme/"><div class="gw-job-company">Acme</div><div class="gw-job-title">Chief of Staff</div><p class="gw-job-description">Run the operating system.</p><div class="gw-job-meta"><span class="gw-location">Remote (work from anywhere)</span></div></a>`,
            { status: 200 },
          ),
      ),
    );

    const result = await runGeneralistworld(context);

    expect(result.success).toBe(true);
    expect(result.jobs[0]).toMatchObject({
      source: "generalistworld",
      title: "Chief of Staff",
      employer: "Acme",
      jobUrl: "https://generalist.world/jobs/chief-of-staff-acme/",
      location: "Remote (work from anywhere)",
    });
  });
});
