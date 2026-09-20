import type { ExtractorManifest } from "@shared/types/extractors";
import { runJobicy } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "jobicy",
  displayName: "Jobicy",
  providesSources: ["jobicy"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { jobicy: { supportedCountryKeys: null } },
  run: runJobicy,
};

export default manifest;
