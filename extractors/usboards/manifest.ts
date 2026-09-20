import type { ExtractorManifest } from "@shared/types/extractors";
import { runUsBoard } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "usboards",
  displayName: "US Job Boards",
  providesSources: ["amazon", "ibm", "higheredjobs"],
  capabilities: { locationEvidence: true },
  locationCapabilities: {
    amazon: { supportedCountryKeys: ["united states"] },
    ibm: { supportedCountryKeys: ["united states"] },
    higheredjobs: { supportedCountryKeys: ["united states"] },
  },
  run: runUsBoard,
};

export default manifest;
