import type { ExtractorManifest } from "@shared/types/extractors";
import { runGeneralistworld } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "generalistworld",
  displayName: "Generalist World",
  providesSources: ["generalistworld"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { generalistworld: { supportedCountryKeys: null } },
  run: runGeneralistworld,
};

export default manifest;
