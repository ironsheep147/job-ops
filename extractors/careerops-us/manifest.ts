import type { ExtractorManifest, ExtractorProgressEvent } from "@shared/types/extractors";
import { runCareerOpsUs } from "./src/run";

function progress(detail: string): ExtractorProgressEvent {
  return { phase: "list", detail };
}

export const manifest: ExtractorManifest = {
  id: "careerops-us",
  displayName: "CareerOps US Sources",
  providesSources: [
    "builtin", "themuse", "hackernews", "remoteok", "remotive",
    "weworkremotely", "jobicy", "himalayas", "nodesk", "fourdayweek",
    "cryptocurrencyjobs", "pythonorg", "a16zspeedrun", "agenticjobs",
    "generalistworld",
  ],
  capabilities: { locationEvidence: true },
  locationCapabilities: {
    builtin: { supportedCountryKeys: ["united states"] },
    themuse: { supportedCountryKeys: ["united states"] },
    hackernews: { supportedCountryKeys: null },
    remoteok: { supportedCountryKeys: null },
    remotive: { supportedCountryKeys: null },
    weworkremotely: { supportedCountryKeys: null },
    jobicy: { supportedCountryKeys: null },
    himalayas: { supportedCountryKeys: null },
    nodesk: { supportedCountryKeys: null },
    fourdayweek: { supportedCountryKeys: null },
    cryptocurrencyjobs: { supportedCountryKeys: null },
    pythonorg: { supportedCountryKeys: null },
    a16zspeedrun: { supportedCountryKeys: null },
    agenticjobs: { supportedCountryKeys: null },
    generalistworld: { supportedCountryKeys: null },
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
