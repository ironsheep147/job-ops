import type { ExtractorManifest } from "@shared/types/extractors";
import { runAgenticjobs } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "agenticjobs",
  displayName: "Agentic Engineering Jobs",
  providesSources: ["agenticjobs"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { agenticjobs: { supportedCountryKeys: null } },
  run: runAgenticjobs,
};

export default manifest;
