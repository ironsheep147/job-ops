import type { ExtractorManifest } from "@shared/types/extractors";
import { runRemotive } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "remotive",
  displayName: "Remotive",
  providesSources: ["remotive"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { remotive: { supportedCountryKeys: null } },
  run: runRemotive,
};

export default manifest;
