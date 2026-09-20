import type { ExtractorManifest, ExtractorProgressEvent } from "@shared/types/extractors";
import { runCareerOpsUs } from "./src/run";

function progress(detail: string): ExtractorProgressEvent {
  return { phase: "list", detail };
}

export const manifest: ExtractorManifest = {
  id: "careerops-us",
  displayName: "CareerOps US Sources",
  providesSources: ["builtin", "themuse", "hackernews"],
  capabilities: { locationEvidence: true },
  locationCapabilities: {
    builtin: { supportedCountryKeys: ["united states"] },
    themuse: { supportedCountryKeys: ["united states"] },
    hackernews: { supportedCountryKeys: null },
  },
  async run(context) {
    if (context.shouldCancel?.()) return { success: true, jobs: [] };
    const result = await runCareerOpsUs({
      searchTerms: context.searchTerms,
      selectedCountry: context.selectedCountry,
      workplaceTypes: context.settings.workplaceTypes
        ? JSON.parse(context.settings.workplaceTypes)
        : undefined,
      maxJobs: Number.parseInt(context.settings.jobspyResultsWanted ?? "50", 10),
      shouldCancel: context.shouldCancel,
      onProgress: (detail) => context.onProgress?.(progress(detail)),
    });
    return result;
  },
};

export default manifest;
