import type { ExtractorManifest } from "@shared/types/extractors";
import { runThemuse } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "themuse",
  displayName: "The Muse",
  providesSources: ["themuse"],
  capabilities: { locationEvidence: true },
  locationCapabilities: {
    themuse: { supportedCountryKeys: ["united states"] },
  },
  run: runThemuse,
};

export default manifest;
