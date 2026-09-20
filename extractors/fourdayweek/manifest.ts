import type { ExtractorManifest } from "@shared/types/extractors";
import { runFourdayweek } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "fourdayweek",
  displayName: "4 Day Week",
  providesSources: ["fourdayweek"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { fourdayweek: { supportedCountryKeys: null } },
  run: runFourdayweek,
};

export default manifest;
