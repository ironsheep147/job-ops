import type { ExtractorManifest } from "@shared/types/extractors";
import { runHimalayas } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "himalayas",
  displayName: "Himalayas",
  providesSources: ["himalayas"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { himalayas: { supportedCountryKeys: null } },
  run: runHimalayas,
};

export default manifest;
