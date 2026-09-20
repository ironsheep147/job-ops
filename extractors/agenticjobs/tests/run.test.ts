import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAgenticjobs } from "../src/run-local";

const context: ExtractorRuntimeContext = {
  source: "agenticjobs",
  selectedSources: ["agenticjobs"],
  settings: { jobspyResultsWanted: "1" },
  searchTerms: [],
  selectedCountry: "worldwide",
};

describe("Agentic Engineering Jobs extractor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("falls back to the server-rendered listings page when the API is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/v1/jobs"))
          return new Response("upstream error", { status: 500 });
        return new Response(
          `<a class="block" href="/jobs/acme-agent-engineer-abc123"><div><span class="font-semibold">Agent Engineer</span><p class="text-sm text-muted truncate">Acme</p></div><span>Remote</span><div class="text-sm text-muted lg:text-right">2026-09-20</div></a>`,
          { status: 200 },
        );
      }),
    );

    const result = await runAgenticjobs(context);

    expect(result.success).toBe(true);
    expect(result.jobs[0]).toMatchObject({
      source: "agenticjobs",
      title: "Agent Engineer",
      employer: "Acme",
      jobUrl:
        "https://agentic-engineering-jobs.com/jobs/acme-agent-engineer-abc123",
    });
  });
});
